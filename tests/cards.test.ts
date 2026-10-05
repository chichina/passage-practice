import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AGAIN_MS, DAY_MS, MAX_INTERVAL_DAYS, CardValidationError, applyRating, createCard, dueCards, normalizeData} from '../src/cards';
import type {Card, Rating} from '../src/cards';

const NOW = Date.parse('2026-10-02T23:57:42.123Z');
const makeCard = (overrides: Partial<Card> = {}): Card => ({...createCard('问题', '答案', '笔记/来源.md', NOW, 'card-1'), ...overrides});
const data = (cards: unknown[]) => ({version: 2, cards});
const invalid = (raw: unknown) => assert.throws(() => normalizeData(raw, NOW), CardValidationError);

test('v0.1.1 no-data cases migrate to separate empty v2 decks', () => {
 for (const raw of [null, undefined, {}, Object.create(null)]) {
  assert.deepEqual(normalizeData(raw, NOW), {version: 2, cards: []});
 }
 const a = normalizeData(null, NOW), b = normalizeData(null, NOW);
 a.cards.push(makeCard());
 assert.equal(b.cards.length, 0);
});

test('v2 persistence round-trips every field without mutating or aliasing inputs', () => {
 const card = makeCard({front: '  # 中文 🪴\n  ', back: '\n```\n<script>literal</script>\n  ', reviews: 5, lapses: 2, revision: 8,
  dueAt: NOW - DAY_MS, updatedAt: NOW - 500, lastReviewedAt: NOW - 500, intervalDays: 3, suspended: true});
 const raw = data([card]);
 const result = normalizeData(JSON.parse(JSON.stringify(raw)), NOW);
 assert.deepEqual(result, raw);
 const direct = normalizeData(raw, NOW);
 assert.notEqual(direct, raw);
 assert.notEqual(direct.cards, raw.cards);
 assert.notEqual(direct.cards[0], card);
 direct.cards[0].front = 'changed';
 assert.notEqual(card.front, 'changed');
});

test('unsupported versions never silently downgrade or discard saved data', () => {
 for (const version of [0, 1, 3, 999, '2', null, undefined]) {
  const raw = {version, cards: [makeCard()]};
  const before = JSON.stringify(raw);
  assert.throws(() => normalizeData(raw, NOW), /Unsupported flashcard data version/);
  assert.equal(JSON.stringify(raw), before);
 }
});

test('malformed roots, missing schema fields, sparse arrays and partial cards are rejected', () => {
 for (const raw of [false, true, 0, 'text', [], new Date(), {cards: []}, {version: 2}, {version: 2, cards: null},
  {version: 2, cards: {}}, {settings: {}}, data([null]), data([{}]), data([42]), data([[]]), data(new Array(1))]) invalid(raw);
 for (const key of Object.keys(makeCard())) {
  const card: Record<string, unknown> = {...makeCard()};
  delete card[key];
  invalid(data([card]));
 }
});

test('one malformed card invalidates the whole deck instead of silently dropping it', () => {
 const raw = data([makeCard(), makeCard({id: 'card-2', back: ' '})]);
 const before = JSON.stringify(raw);
 invalid(raw);
 assert.equal(JSON.stringify(raw), before);
});

test('duplicate IDs reject the whole deck, including prototype-shaped IDs', () => {
 invalid(data([makeCard(), makeCard()]));
 invalid(data([makeCard({id: '__proto__'}), makeCard({id: '__proto__'})]));
 const valid = normalizeData(data([makeCard({id: '__proto__'}), makeCard({id: 'constructor'}), makeCard({id: 'toString'})]), NOW);
 assert.equal(valid.cards.length, 3);
});

test('normalization cannot pollute prototypes through unknown JSON fields', () => {
 const raw = JSON.parse(JSON.stringify(data([makeCard()])));
 Object.defineProperty(raw, '__proto__', {value: {polluted: true}, enumerable: true});
 Object.defineProperty(raw.cards[0], '__proto__', {value: {polluted: true}, enumerable: true});
 raw.cards[0].constructor = {prototype: {polluted: true}};
 const result = normalizeData(raw, NOW);
 assert.equal(Object.getPrototypeOf(result), Object.prototype);
 assert.equal(Object.getPrototypeOf(result.cards[0]), Object.prototype);
 assert.equal(Object.prototype.hasOwnProperty.call(result.cards[0], '__proto__'), false);
 assert.equal(Object.prototype.hasOwnProperty.call(result.cards[0], 'constructor'), false);
 assert.equal(({} as {polluted?: boolean}).polluted, undefined);
});

test('inherited fields and getters are not consumed during normalization', () => {
 invalid(Object.create({version: 2, cards: [makeCard()]}));
 invalid(data([Object.create(makeCard())]));
 let getterCalls = 0;
 const raw = {cards: []};
 Object.defineProperty(raw, 'version', {get() {getterCalls++; return 2;}, enumerable: true});
 invalid(raw);
 const card = {...makeCard()};
 Object.defineProperty(card, 'front', {get() {getterCalls++; return 'secret';}, enumerable: true});
 invalid(data([card]));
 const cards = [makeCard()];
 Object.defineProperty(cards, '0', {get() {getterCalls++; return makeCard();}, enumerable: true});
 invalid(data(cards));
 assert.equal(getterCalls, 0);
});

test('saved card text, paths, IDs and booleans are strictly validated', () => {
 const bad: Array<Record<string, unknown>> = [
  {id: ''}, {id: ' '}, {id: 2}, {id: 'x'.repeat(257)},
  {front: ''}, {front: '\n\t '}, {front: null}, {front: 'x'.repeat(4001)},
  {back: ''}, {back: '  '}, {back: []}, {back: 'x'.repeat(50001)},
  {sourcePath: null}, {sourcePath: 0}, {sourcePath: 'x'.repeat(4097)},
  {suspended: 0}, {suspended: 'false'},
 ];
 for (const changes of bad) invalid(data([{...makeCard(), ...changes}]));
});

test('saved timestamps, counters and interval bounds reject NaN, coercions and overflow', () => {
 for (const key of ['createdAt', 'updatedAt', 'dueAt', 'lastReviewedAt']) {
  for (const value of [-1, NaN, Infinity, '0', 0.5, 8_640_000_000_000_001]) invalid(data([{...makeCard(), [key]: value}]));
 }
 for (const key of ['reviews', 'lapses', 'revision', 'intervalDays']) {
  for (const value of [-1, NaN, Infinity, '0', 0.5, Number.MAX_SAFE_INTEGER + 1]) invalid(data([{...makeCard(), [key]: value}]));
 }
 invalid(data([makeCard({intervalDays: 366})]));
 assert.equal(normalizeData(data([makeCard({dueAt: 0, lastReviewedAt: null, intervalDays: 365})]), NOW).cards[0].dueAt, 0);
});

test('new card preserves exact snapshots and starts due now with zero scheduling history', () => {
 const card = createCard('  问题\n', '\n答案 👩🏽‍💻\n', '笔记/来源.md', NOW, 'card-1');
 assert.deepEqual(card, {id: 'card-1', front: '  问题\n', back: '\n答案 👩🏽‍💻\n', sourcePath: '笔记/来源.md',
  createdAt: NOW, updatedAt: NOW, dueAt: NOW, intervalDays: 0, reviews: 0, lapses: 0, suspended: false, lastReviewedAt: null, revision: 0});
 assert.equal(createCard('question', 'answer', '', 0, 'zero').dueAt, 0);
});

test('new card validates inclusive front/back limits without truncation', () => {
 const front = '题'.repeat(4000), back = '答'.repeat(50000);
 const card = createCard(front, back, '', NOW, 'limits');
 assert.equal(card.front, front);
 assert.equal(card.back, back);
 for (const [f, b] of [['', 'answer'], [' \n\t', 'answer'], ['q', ''], ['q', ' \n'], ['q'.repeat(4001), 'a'], ['q', 'a'.repeat(50001)]]) {
  assert.throws(() => createCard(f, b, '', NOW, 'bad'), CardValidationError);
 }
 // Limits match textarea/string lengths: this emoji occupies two UTF-16 units.
 assert.equal(createCard('🪴'.repeat(2000), 'a', '', NOW, 'unicode').front.length, 4000);
 assert.throws(() => createCard('🪴'.repeat(2001), 'a', '', NOW, 'unicode'), CardValidationError);
});

test('first ratings use exact 10-minute, 1-day, 3-day and 5-day elapsed intervals', () => {
 const cases: Array<[Rating, number, number]> = [['again', AGAIN_MS, 0], ['hard', DAY_MS, 1], ['good', 3 * DAY_MS, 3], ['easy', 5 * DAY_MS, 5]];
 for (const [rating, delay, interval] of cases) {
  const original = Object.freeze(makeCard());
  const card = applyRating(original, rating, NOW);
  assert.equal(card.dueAt, NOW + delay);
  assert.equal(card.intervalDays, interval);
  assert.equal(card.reviews, 1);
  assert.equal(card.lapses, rating === 'again' ? 1 : 0);
  assert.equal(card.revision, 1);
  assert.equal(card.lastReviewedAt, NOW);
  assert.equal(card.updatedAt, NOW);
  assert.equal(card.createdAt, original.createdAt);
  assert.equal(original.reviews, 0);
 }
});

test('existing intervals grow with upward rounding and rating-specific minimums', () => {
 const cases: Array<[number, Rating, number]> = [
  [10, 'hard', 12], [3, 'hard', 4], [1, 'hard', 2], [10, 'good', 20], [10, 'easy', 30],
  [1, 'good', 3], [1, 'easy', 5], [0, 'hard', 1], [0, 'good', 3], [0, 'easy', 5],
 ];
 for (const [previous, rating, expected] of cases) {
  const card = applyRating(makeCard({intervalDays: previous, reviews: 2, revision: 9, lapses: 1, lastReviewedAt: NOW - DAY_MS}), rating, NOW);
  assert.equal(card.intervalDays, expected);
  assert.equal(card.dueAt, NOW + expected * DAY_MS);
  assert.equal(card.reviews, 3);
  assert.equal(card.lapses, 1);
  assert.equal(card.revision, 10);
 }
});

test('all positive intervals cap at 365 days without capping review counts', () => {
 for (const rating of ['hard', 'good', 'easy'] as const) {
  const card = applyRating(makeCard({intervalDays: 365, reviews: 400}), rating, NOW);
  assert.equal(card.intervalDays, MAX_INTERVAL_DAYS);
  assert.equal(card.dueAt, NOW + 365 * DAY_MS);
  assert.equal(card.reviews, 401);
 }
 assert.equal(applyRating(makeCard({intervalDays: 304}), 'hard', NOW).intervalDays, 365);
});

test('Again resets the interval and repeated lapses restart successful minimums', () => {
 const original = makeCard({intervalDays: 100, reviews: 20, lapses: 2, revision: 30, lastReviewedAt: NOW - 100 * DAY_MS});
 const first = applyRating(original, 'again', NOW);
 const second = applyRating(first, 'again', NOW + AGAIN_MS);
 assert.equal(second.intervalDays, 0);
 assert.equal(second.dueAt, NOW + 2 * AGAIN_MS);
 assert.equal(second.reviews, 22);
 assert.equal(second.lapses, 4);
 assert.equal(second.revision, 32);
 assert.equal(applyRating(second, 'good', NOW + 2 * AGAIN_MS).intervalDays, 3);
 assert.equal(original.intervalDays, 100);
});

test('review timing is measured from actual review, including overdue cards and DST dates', () => {
 const reviewTimes = [NOW, Date.parse('2026-03-08T01:30:00-05:00'), Date.parse('2026-11-01T01:30:00-04:00')];
 for (const reviewAt of reviewTimes) {
  const card = applyRating(makeCard({dueAt: reviewAt - 7 * DAY_MS}), 'good', reviewAt);
  assert.equal(card.dueAt - reviewAt, 72 * 60 * 60 * 1000);
  assert.equal(new Date(card.dueAt).getUTCMilliseconds(), new Date(reviewAt).getUTCMilliseconds());
 }
});

test('rating preserves source, text and suspension and accepts a safe clock rollback', () => {
 const original = makeCard({front: ' literal front ', back: '\nliteral back\n', suspended: true});
 const card = applyRating(original, 'hard', NOW - 1000);
 for (const key of ['id', 'front', 'back', 'sourcePath', 'createdAt', 'suspended'] as const) assert.equal(card[key], original[key]);
 assert.equal(card.lastReviewedAt, NOW - 1000);
 assert.equal(card.updatedAt, NOW - 1000);
});

test('invalid ratings, counter overflow and date overflow throw without changing the card', () => {
 const card = makeCard();
 assert.throws(() => applyRating(card, 'wrong' as Rating, NOW), /Unknown flashcard rating/);
 for (const key of ['reviews', 'revision', 'lapses'] as const) {
  const original = makeCard({[key]: Number.MAX_SAFE_INTEGER});
  assert.throws(() => applyRating(original, 'again', NOW), CardValidationError);
  assert.equal(original[key], Number.MAX_SAFE_INTEGER);
 }
 assert.throws(() => applyRating(card, 'easy', 8_640_000_000_000_000), CardValidationError);
 assert.throws(() => applyRating({...card, back: ''}, 'good', NOW), CardValidationError);
 assert.equal(card.reviews, 0);
});

test('due queue includes the exact boundary and excludes future or paused cards', () => {
 const deck = [makeCard({id: 'future', dueAt: NOW + 1}), makeCard({id: 'paused', dueAt: 0, suspended: true}),
  makeCard({id: 'exact'}), makeCard({id: 'overdue', dueAt: NOW - 1})];
 assert.deepEqual(dueCards(deck, NOW).map(c => c.id), ['overdue', 'exact']);
 assert.deepEqual(dueCards([], NOW), []);
});

test('due queue sorting is deterministic by dueAt, createdAt, then ID without reordering the deck', () => {
 const deck = [makeCard({id: 'b'}), makeCard({id: 'a'}), makeCard({id: 'oldest-created', createdAt: NOW - 1}),
  makeCard({id: 'oldest-due', dueAt: NOW - 1})];
 const before = [...deck];
 Object.freeze(deck);
 const queue = dueCards(deck, NOW);
 assert.deepEqual(queue.map(c => c.id), ['oldest-due', 'oldest-created', 'a', 'b']);
 assert.deepEqual(deck, before);
 assert.notEqual(queue, deck);
 assert.equal(queue[0], deck[3]);
});

test('invalid current times are rejected consistently by all time-dependent entry points', () => {
 for (const now of [NaN, Infinity, -1, 0.25, Number.MAX_SAFE_INTEGER]) {
  assert.throws(() => normalizeData(null, now), CardValidationError);
  assert.throws(() => createCard('q', 'a', '', now, 'id'), CardValidationError);
  assert.throws(() => applyRating(makeCard(), 'good', now), CardValidationError);
  assert.throws(() => dueCards([], now), CardValidationError);
 }
});
