import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AGAIN_MS, DAY_MS, MAX_INTERVAL_DAYS, FSRS_PARAMETERS, FSRS_IMPLEMENTATION_VERSION, CardValidationError, applyRating, createCard, dueCards, normalizeData, resetScheduling} from '../src/cards';
import {createEmptyCard, fsrs, State} from 'ts-fsrs';
import type {Card as OfficialCard, ReviewLog, Grade} from 'ts-fsrs';
import {execFileSync} from 'node:child_process';
import type {Card, Rating} from '../src/cards';

const NOW = Date.parse('2026-10-02T23:57:42.123Z');
const fresh = (): Card => createCard('问题', '答案', '笔记/来源.md', NOW, 'card-1');
// Old summary-only cards are deliberate migration fixtures.
const makeCard = (overrides: Partial<Card> = {}): Card => {const {fsrs: _schedule, ...legacy} = fresh(); return {...legacy, ...overrides};};
const serializedCard = (card: OfficialCard) => {const {due, last_review, ...rest} = card; return {...rest, due: due.getTime(), ...(last_review ? {last_review: last_review.getTime()} : {})};};
const serializedLog = (log: ReviewLog) => ({...log, due: log.due.getTime(), review: log.review.getTime()});
function freezeDeep<T>(value: T): T {if (value && typeof value === 'object') {for (const item of Object.values(value)) freezeDeep(item); Object.freeze(value);} return value;}
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
 for (const version of [0, 1, 4, 999, '2', null, undefined]) {
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
 invalid(data([makeCard({intervalDays: MAX_INTERVAL_DAYS + 1})]));
 assert.equal(normalizeData(data([makeCard({dueAt: 0, lastReviewedAt: null, intervalDays: 365})]), NOW).cards[0].dueAt, 0);
});

test('new card preserves exact snapshots and starts due now with zero scheduling history', () => {
 const card = createCard('  问题\n', '\n答案 👩🏽‍💻\n', '笔记/来源.md', NOW, 'card-1');
 const {fsrs: schedule, ...summary} = card;
 assert.deepEqual(summary, {id: 'card-1', front: '  问题\n', back: '\n答案 👩🏽‍💻\n', sourcePath: '笔记/来源.md',
  createdAt: NOW, updatedAt: NOW, dueAt: NOW, intervalDays: 0, reviews: 0, lapses: 0, suspended: false, lastReviewedAt: null, revision: 0});
 assert.deepEqual(schedule!.card, serializedCard(createEmptyCard(new Date(NOW))));
 assert.deepEqual(schedule!.logs, []);
 assert.deepEqual(schedule!.baseline, {kind: 'new', at: NOW, reviews: 0, lapses: 0, logIndex: 0});
 assert.equal(schedule!.algorithm, 'FSRS-6');
 assert.equal(schedule!.implementationVersion, FSRS_IMPLEMENTATION_VERSION);
 assert.deepEqual(schedule!.parameters, FSRS_PARAMETERS);
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

test('fresh ratings use the pinned official FSRS learning steps and complete logs', () => {
 const cases: Array<[Rating, Grade, number, number]> = [['again', 1, 60_000, 0], ['hard', 2, 6 * 60_000, 0], ['good', 3, 10 * 60_000, 0], ['easy', 4, 8 * DAY_MS, 8]];
 for (const [rating, grade, delay, interval] of cases) {
  const original = freezeDeep(fresh());
  const expected = fsrs({enable_fuzz: false}).next(createEmptyCard(new Date(NOW)), new Date(NOW), grade);
  const card = applyRating(original, rating, NOW);
  assert.equal(card.dueAt, NOW + delay);
  assert.equal(card.intervalDays, interval);
  assert.equal(card.reviews, 1);
  assert.equal(card.lapses, 0);
  assert.equal(card.revision, 1);
  assert.equal(card.lastReviewedAt, NOW);
  assert.equal(card.updatedAt, NOW);
  assert.equal(card.createdAt, original.createdAt);
  assert.deepEqual(card.fsrs!.card, serializedCard(expected.card));
  assert.deepEqual(card.fsrs!.logs, [serializedLog(expected.log)]);
  assert.deepEqual(applyRating(original, rating, NOW), card, 'repeated previews must be identical');
  assert.equal(original.reviews, 0);
  assert.equal(original.fsrs!.logs.length, 0);
 }
});

test('legacy import preserves exact schedule and counters without fabricating FSRS state or history', () => {
 const original = makeCard({intervalDays: 100, reviews: 23, lapses: 4, revision: 31, dueAt: NOW - 4 * DAY_MS, lastReviewedAt: NOW - 104 * DAY_MS});
 const before = JSON.stringify(original);
 const loaded = normalizeData(data([original]), NOW).cards[0];
 assert.deepEqual(loaded, original);
 assert.equal(Object.hasOwn(loaded, 'fsrs'), false);
 const next = applyRating(loaded, 'good', NOW);
 assert.equal(next.dueAt, NOW + 10 * 60_000);
 assert.equal(next.reviews, 24);
 assert.equal(next.lapses, 4);
 assert.equal(next.revision, 32);
 assert.equal(next.fsrs!.card.reps, 1);
 assert.equal(next.fsrs!.card.lapses, 0);
 assert.deepEqual(next.fsrs!.baseline, {kind: 'legacy', at: NOW, reviews: 23, lapses: 4, logIndex: 0});
 assert.equal(next.fsrs!.logs.length, 1);
 assert.equal(next.fsrs!.logs[0].state, State.New);
 assert.equal(JSON.stringify(original), before);
});

test('a new card first reviewed much later keeps a zero-elapsed initial FSRS log', () => {
 const reviewedAt = NOW + 21 * DAY_MS;
 const result = applyRating(fresh(), 'good', reviewedAt);
 assert.equal(result.dueAt, reviewedAt + 10 * 60_000);
 assert.equal(result.fsrs!.logs[0].due, NOW);
 assert.equal(result.fsrs!.logs[0].elapsed_days, 0);
 assert.deepEqual(normalizeData(data([result]), reviewedAt).cards[0], result);
});

test('FSRS progression and overdue reviews exactly match the official implementation after every reload', () => {
 const scheduler = fsrs({enable_fuzz: false});
 let card = fresh(), reference = createEmptyCard(new Date(NOW));
 const ratings: Array<[Rating, Grade, number]> = [['good', 3, 0], ['good', 3, 0], ['hard', 2, 3 * DAY_MS], ['good', 3, 30 * DAY_MS], ['again', 1, DAY_MS], ['again', 1, 0], ['good', 3, 0], ['easy', 4, 60 * DAY_MS]];
 for (const [rating, grade, overdue] of ratings) {
  const reviewedAt = card.dueAt + overdue;
  const expected = scheduler.next(reference, new Date(reviewedAt), grade);
  card = applyRating(card, rating, reviewedAt);
  assert.deepEqual(card.fsrs!.card, serializedCard(expected.card));
  assert.deepEqual(card.fsrs!.logs.at(-1), serializedLog(expected.log));
  assert.equal(card.dueAt, expected.card.due.getTime());
  assert.equal(card.lapses, expected.card.lapses);
  const restored = normalizeData(JSON.parse(JSON.stringify(data([card]))), reviewedAt).cards[0];
  assert.deepEqual(restored, card);
  card = restored;
  reference = expected.card;
 }
 assert.equal(card.fsrs!.logs.length, ratings.length);
 assert.ok(card.fsrs!.logs.some(log => log.elapsed_days >= 30));
});

test('same-day and exact-same-time reviews are supported and use FSRS short-term state', () => {
 let card = applyRating(fresh(), 'good', NOW);
 const firstStability = card.fsrs!.card.stability;
 card = applyRating(card, 'good', NOW);
 assert.equal(card.fsrs!.card.elapsed_days, 0);
 assert.equal(card.fsrs!.card.state, State.Review);
 assert.ok(card.fsrs!.card.stability >= firstStability);
 card = applyRating(card, 'again', NOW + 30_000);
 assert.equal(card.fsrs!.card.elapsed_days, 0);
 assert.equal(card.fsrs!.card.state, State.Relearning);
 assert.equal(card.lapses, 1);
 assert.equal(card.fsrs!.logs.length, 3);
});

test('crossing UTC midnight uses official UTC-day elapsed time even within ten minutes', () => {
 const first = applyRating(fresh(), 'good', NOW);
 const second = applyRating(first, 'good', first.dueAt);
 assert.equal(first.dueAt - NOW, 10 * 60_000);
 assert.equal(second.fsrs!.card.elapsed_days, 1);
 assert.equal(second.fsrs!.logs[1].elapsed_days, 1);
 assert.deepEqual(normalizeData(data([second]), second.lastReviewedAt!).cards[0], second);
});

test('Again counts a lapse in Review, not during initial learning or repeated relearning', () => {
 let card = applyRating(fresh(), 'again', NOW);
 card = applyRating(card, 'again', card.dueAt);
 assert.equal(card.lapses, 0);
 card = applyRating(card, 'good', card.dueAt);
 card = applyRating(card, 'good', card.dueAt);
 assert.equal(card.fsrs!.card.state, State.Review);
 card = applyRating(card, 'again', card.dueAt);
 assert.equal(card.fsrs!.card.state, State.Relearning);
 assert.equal(card.lapses, 1);
 const lapseDue = card.dueAt;
 card = applyRating(card, 'again', lapseDue);
 assert.equal(card.lapses, 1);
 assert.equal(card.dueAt, lapseDue + 10 * 60_000);
 assert.equal(card.reviews, 6);
});

test('mature intervals retain official cap-ordering outputs instead of applying custom bounds', () => {
 let card = fresh();
 for (let index = 0; index < 40 && card.intervalDays < MAX_INTERVAL_DAYS; index++) card = applyRating(card, 'easy', card.dueAt);
 assert.equal(FSRS_PARAMETERS.maximum_interval, 36500);
 assert.equal(MAX_INTERVAL_DAYS, 36502);
 assert.equal(card.intervalDays, MAX_INTERVAL_DAYS);
 assert.equal(card.dueAt - card.lastReviewedAt!, MAX_INTERVAL_DAYS * DAY_MS);
 assert.ok(card.reviews > 1);
 assert.ok(card.fsrs!.card.stability > 365);
});

test('relearn preserves all actual history and cumulative counts while resetting memory', () => {
 let card = applyRating(makeCard({reviews: 20, lapses: 3}), 'easy', NOW);
 card = applyRating(card, 'again', card.dueAt);
 const snapshot = structuredClone(card);
 const resetAt = card.dueAt + 1000;
 const reset = resetScheduling(freezeDeep(card), resetAt);
 assert.equal(reset.fsrs!.card.state, State.New);
 assert.equal(reset.fsrs!.card.reps, 0);
 assert.equal(reset.fsrs!.card.stability, 0);
 assert.equal(reset.fsrs!.card.difficulty, 0);
 assert.equal(reset.fsrs!.card.last_review, undefined);
 assert.equal(reset.dueAt, resetAt);
 assert.equal(reset.intervalDays, 0);
 assert.equal(reset.reviews, 22);
 assert.equal(reset.lapses, 4);
 assert.equal(reset.lastReviewedAt, snapshot.lastReviewedAt);
 assert.equal(reset.revision, snapshot.revision + 1);
 assert.deepEqual(reset.fsrs!.logs, snapshot.fsrs!.logs);
 assert.notEqual(reset.fsrs!.logs, card.fsrs!.logs);
 assert.deepEqual(reset.fsrs!.baseline, {kind: 'relearn', at: resetAt, reviews: 22, lapses: 4, logIndex: 2});
 const next = applyRating(reset, 'again', resetAt);
 assert.equal(next.reviews, 23);
 assert.equal(next.lapses, 4);
 assert.equal(next.fsrs!.logs.length, 3);
 assert.equal(next.fsrs!.logs[2].state, State.New);
 assert.equal(next.fsrs!.card.reps, 1);
 assert.deepEqual(normalizeData(data([next]), resetAt).cards[0], next);
 assert.deepEqual(card, snapshot);
});

test('relearn of a legacy card preserves its historical summaries without making log entries', () => {
 const legacy = makeCard({reviews: 17, lapses: 2, lastReviewedAt: NOW - DAY_MS, intervalDays: 100, dueAt: NOW + DAY_MS, suspended: true});
 const reset = resetScheduling(legacy, NOW);
 assert.equal(reset.suspended, false);
 assert.equal(reset.reviews, 17);
 assert.equal(reset.lapses, 2);
 assert.equal(reset.lastReviewedAt, legacy.lastReviewedAt);
 assert.equal(reset.fsrs!.logs.length, 0);
 assert.equal(reset.fsrs!.baseline.kind, 'relearn');
});

test('ratings preserve content/source/suspension but reject rollback before established memory', () => {
 const original = {...fresh(), front: ' literal front ', back: '\nliteral back\n', suspended: true};
 const card = applyRating(original, 'hard', NOW);
 for (const key of ['id', 'front', 'back', 'sourcePath', 'createdAt', 'suspended'] as const) assert.equal(card[key], original[key]);
 const before = JSON.stringify(card);
 assert.throws(() => applyRating(card, 'good', NOW - 1), /predates the FSRS state/);
 assert.throws(() => resetScheduling(card, NOW - 1), /predates the FSRS state/);
 assert.equal(JSON.stringify(card), before);
});

test('normalization, previews and reset do not alias nested FSRS data or source evidence', () => {
 const card = applyRating({...fresh(), sourceRef: {line: 1, endLine: 1, heading: 'H', excerpt: 'E', fingerprint: 'F'}}, 'easy', NOW);
 const snapshot = structuredClone(card);
 const normalized = normalizeData(data([freezeDeep(card)]), NOW).cards[0];
 assert.notEqual(normalized.fsrs, card.fsrs);
 assert.notEqual(normalized.fsrs!.card, card.fsrs!.card);
 assert.notEqual(normalized.fsrs!.logs[0], card.fsrs!.logs[0]);
 assert.notEqual(normalized.fsrs!.baseline, card.fsrs!.baseline);
 assert.notEqual(normalized.fsrs!.parameters.w, card.fsrs!.parameters.w);
 const next = applyRating(card, 'good', card.dueAt);
 next.fsrs!.logs[0].review = 0;
 (next.fsrs!.parameters.w as number[])[0] = 999;
 next.fsrs!.card.stability = 999;
 next.sourceRef!.heading = 'changed';
 normalized.fsrs!.baseline.reviews = 900;
 assert.deepEqual(card, snapshot);
 assert.equal(FSRS_PARAMETERS.w[0], 0.212);
});

test('invalid ratings, counter overflow and date overflow throw without changing the card', () => {
 const card = fresh();
 assert.throws(() => applyRating(card, 'wrong' as Rating, NOW), /Unknown flashcard rating/);
 for (const key of ['reviews', 'revision'] as const) {
  const original = makeCard({[key]: Number.MAX_SAFE_INTEGER});
  assert.throws(() => applyRating(original, 'again', NOW), CardValidationError);
  assert.equal(original[key], Number.MAX_SAFE_INTEGER);
 }
 const lapseOverflow = applyRating(makeCard({lapses: Number.MAX_SAFE_INTEGER}), 'easy', NOW);
 assert.throws(() => applyRating(lapseOverflow, 'again', lapseOverflow.dueAt), CardValidationError);
 assert.throws(() => applyRating(card, 'easy', 8_640_000_000_000_000), CardValidationError);
 assert.throws(() => applyRating({...card, back: ''}, 'good', NOW), CardValidationError);
 assert.equal(card.reviews, 0);
});

test('unknown or malformed FSRS metadata, parameters, state and logs fail closed', () => {
 const card = applyRating(fresh(), 'easy', NOW);
 const bad: Array<(value: any) => void> = [
  c => {c.fsrs = null;}, c => {c.fsrs = undefined;}, c => {c.fsrs = {};},
  c => {c.fsrs.schemaVersion = 2;}, c => {c.fsrs.algorithm = 'SM-2';}, c => {c.fsrs.implementation = 'other';},
  c => {c.fsrs.implementationVersion = '6.0.0';}, c => {c.fsrs.parameterVersion = 'future';}, c => {c.fsrs.futureField = true;},
  c => {c.fsrs.parameters.enable_fuzz = true;}, c => {c.fsrs.parameters.enable_short_term = false;},
  c => {c.fsrs.parameters.request_retention = 0.8;}, c => {c.fsrs.parameters.maximum_interval = 100;},
  c => {c.fsrs.parameters.w[0] += 0.01;}, c => {c.fsrs.parameters.w = new Array(21);},
  c => {c.fsrs.parameters.learning_steps = ['5m'];}, c => {c.fsrs.parameters.relearning_steps = [];},
  c => {c.fsrs.card.stability = NaN;}, c => {c.fsrs.card.difficulty = 0;}, c => {c.fsrs.card.difficulty = 11;},
  c => {c.fsrs.card.due = '2026-01-01';}, c => {c.fsrs.card.last_review = null;}, c => {delete c.fsrs.card.last_review;},
  c => {c.fsrs.card.state = 4;}, c => {c.fsrs.card.learning_steps = 1;}, c => {c.fsrs.card.reps = 0;},
  c => {c.fsrs.card.lapses = 2;}, c => {c.fsrs.card.scheduled_days = 0;}, c => {c.fsrs.card.extra = true;},
  c => {c.fsrs.logs = [];}, c => {c.fsrs.logs = new Array(1);}, c => {c.fsrs.logs[0].rating = 0;},
  c => {c.fsrs.logs[0].review += 1;}, c => {c.fsrs.logs[0].due -= 1;}, c => {c.fsrs.logs[0].stability = 1;},
  c => {delete c.fsrs.logs[0].last_elapsed_days;}, c => {c.fsrs.logs[0].scheduled_days = -1;},
  c => {c.fsrs.baseline.kind = 'inferred';}, c => {c.fsrs.baseline.reviews = 1;}, c => {c.fsrs.baseline.logIndex = 1;},
  c => {c.dueAt += 1;}, c => {c.intervalDays += 1;}, c => {c.reviews += 1;}, c => {c.lapses += 1;}, c => {c.lastReviewedAt += 1;},
 ];
 for (const mutate of bad) {
  const raw = structuredClone(card); mutate(raw);
  assert.throws(() => normalizeData(data([raw]), NOW), CardValidationError, mutate.toString());
 }
 for (const key of Object.keys(card.fsrs!)) {const raw = structuredClone(card); delete (raw.fsrs as any)[key]; invalid(data([raw]));}
 for (const key of Object.keys(card.fsrs!.card)) {const raw = structuredClone(card); delete (raw.fsrs!.card as any)[key]; invalid(data([raw]));}
});

test('nested FSRS getters and inherited properties are never consumed', () => {
 let calls = 0;
 const getter = {get() {calls++; return 0;}, enumerable: true};
 const mutations: Array<(c: Card) => void> = [
  c => Object.defineProperty(c, 'fsrs', getter),
  c => Object.defineProperty(c.fsrs!, 'card', getter),
  c => Object.defineProperty(c.fsrs!.card, 'stability', getter),
  c => Object.defineProperty(c.fsrs!.parameters.w, '0', getter),
  c => Object.defineProperty(c.fsrs!.logs, '0', getter),
  c => Object.defineProperty(c.fsrs!.logs[0], 'rating', getter),
  c => Object.defineProperty(c.fsrs!.baseline, 'at', getter),
  c => {c.fsrs!.card = Object.create(c.fsrs!.card);},
 ];
 for (const mutate of mutations) {const card = applyRating(fresh(), 'easy', NOW); mutate(card); invalid(data([card]));}
 assert.equal(calls, 0);
});

test('review and learning schedules are identical across local timezone and DST boundaries', () => {
 const script = `import {createCard,applyRating,DAY_MS} from './src/cards.ts';
 const runs=[];for(const start of ['2026-03-08T06:30:00.123Z','2026-11-01T05:30:00.123Z']) {
 let card=createCard('q','a','',Date.parse(start),'id');
 for(const [rating,late] of [['good',0],['good',0],['easy',3],['again',7],['good',0]]) card=applyRating(card,rating,card.dueAt+late*DAY_MS);
 runs.push(card); } console.log(JSON.stringify(runs));`;
 const outputs = ['UTC', 'America/New_York', 'Asia/Shanghai'].map(TZ => execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {encoding: 'utf8', env: {...process.env, TZ}}));
 assert.equal(outputs[1], outputs[0]);
 assert.equal(outputs[2], outputs[0]);
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
  assert.throws(() => resetScheduling(makeCard(), now), CardValidationError);
  assert.throws(() => dueCards([], now), CardValidationError);
 }
});
