// Original implementation. MIT; see LICENSE.
// All timestamps are Unix milliseconds; a day is exactly 24 hours, never a
// calendar-day boundary. This module performs no filesystem or application I/O.
export const DAY_MS = 24 * 60 * 60 * 1000;
export const AGAIN_MS = 10 * 60 * 1000;
export const MAX_INTERVAL_DAYS = 365;
export const MAX_FRONT_LENGTH = 4000;
export const MAX_BACK_LENGTH = 50000;
const MAX_DATE_MS = 8_640_000_000_000_000;
const MAX_ID_LENGTH = 256;
const MAX_SOURCE_PATH_LENGTH = 4096;

export interface SourceRef {line:number;endLine:number;heading:string;excerpt:string;fingerprint:string}
export interface Card {
 sourceRef?:SourceRef;
 id: string;
 front: string;
 back: string;
 sourcePath: string;
 createdAt: number;
 updatedAt: number;
 dueAt: number;
 intervalDays: number;
 reviews: number;
 lapses: number;
 suspended: boolean;
 lastReviewedAt: number | null;
 revision: number;
}
export interface CardData { version: 2; cards: Card[] }
export type Rating = 'again' | 'hard' | 'good' | 'easy';

/** Invalid saved data must stay read-only: never catch this by saving an empty deck. */
export class CardValidationError extends Error {
 constructor(message: string) { super(message); this.name = 'CardValidationError'; }
}

function fail(message: string): never { throw new CardValidationError(message); }
function isRecord(value: unknown): value is Record<string, unknown> {
 if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
 const prototype: unknown = Object.getPrototypeOf(value);
 return prototype === Object.prototype || prototype === null;
}
/** Read only an own, ordinary data property, never an inherited value or getter. */
function field(value: object, key: string, label = key): unknown {
 const descriptor = Object.getOwnPropertyDescriptor(value, key);
 if (!descriptor || !('value' in descriptor)) fail(`Missing or invalid ${label}.`);
 return descriptor.value;
}
function text(value: unknown, label: string, maximum: number, allowEmpty = false): string {
 if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && !value.trim())) {
  fail(`${label} must be ${allowEmpty ? 'text' : 'nonblank text'} of at most ${maximum} characters.`);
 }
 return value;
}
function timestamp(value: unknown, label: string): number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX_DATE_MS) {
  fail(`${label} must be a valid nonnegative millisecond timestamp.`);
 }
 return value;
}
function integer(value: unknown, label: string, maximum = Number.MAX_SAFE_INTEGER): number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
  fail(`${label} must be an integer between 0 and ${maximum}.`);
 }
 return value;
}
function boolean(value: unknown, label: string): boolean {
 if (typeof value !== 'boolean') fail(`${label} must be true or false.`);
 return value;
}
function normalizeCard(raw: unknown, label: string): Card {
 if (!isRecord(raw)) fail(`${label} must be a card object.`);
 const get = (key: string) => field(raw, key, `${label}.${key}`);
 const lastReviewedAt = get('lastReviewedAt');
 // Copy a fixed allowlist, rather than merging unknown keys into a live object.
 const ref=Object.getOwnPropertyDescriptor(raw,'sourceRef');
 let sourceRef:SourceRef|undefined;
 if(ref){if(!('value' in ref)||!isRecord(ref.value))fail('Invalid source evidence');const r=ref.value;sourceRef={line:integer(field(r,'line'),'source line'),endLine:integer(field(r,'endLine'),'source end line'),heading:text(field(r,'heading'),'source heading',4000,true),excerpt:text(field(r,'excerpt'),'source excerpt',50000),fingerprint:text(field(r,'fingerprint'),'source fingerprint',100)};if(sourceRef.endLine<sourceRef.line)fail('Invalid source line range');}
 return {
  ...(sourceRef?{sourceRef}:{}),
  id: text(get('id'), `${label}.id`, MAX_ID_LENGTH),
  front: text(get('front'), `${label}.front`, MAX_FRONT_LENGTH),
  back: text(get('back'), `${label}.back`, MAX_BACK_LENGTH),
  sourcePath: text(get('sourcePath'), `${label}.sourcePath`, MAX_SOURCE_PATH_LENGTH, true),
  createdAt: timestamp(get('createdAt'), `${label}.createdAt`),
  updatedAt: timestamp(get('updatedAt'), `${label}.updatedAt`),
  dueAt: timestamp(get('dueAt'), `${label}.dueAt`),
  intervalDays: integer(get('intervalDays'), `${label}.intervalDays`, MAX_INTERVAL_DAYS),
  reviews: integer(get('reviews'), `${label}.reviews`),
  lapses: integer(get('lapses'), `${label}.lapses`),
  suspended: boolean(get('suspended'), `${label}.suspended`),
  lastReviewedAt: lastReviewedAt === null ? null : timestamp(lastReviewedAt, `${label}.lastReviewedAt`),
  revision: integer(get('revision'), `${label}.revision`),
 };
}

/**
 * v0.1.1 saved no plugin data: only null, undefined, or an empty object migrate.
 * v2 is validated all-or-nothing. Missing fields, duplicate IDs, invalid values,
 * and unknown versions throw instead of allowing the next save to lose cards.
 * Extra object fields are ignored; no getters or inherited data are consumed.
 * Text and valid timestamps are preserved exactly, including overdue cards.
 */
export function normalizeData(raw: unknown, now: number): CardData {
 timestamp(now, 'Current time');
 if (raw === null || raw === undefined) return {version: 2, cards: []};
 if (!isRecord(raw)) fail('Saved flashcard data must be an object.');
 if (Reflect.ownKeys(raw).length === 0) return {version: 2, cards: []};
 const version = field(raw, 'version', 'flashcard data version');
 if (version !== 2) fail('Unsupported flashcard data version. Keep this data read-only and use a compatible plugin version.');
 const savedCards = field(raw, 'cards', 'flashcard cards array');
 if (!Array.isArray(savedCards)) fail('Saved flashcard cards must be an array.');
 const cards: Card[] = [];
 const ids = new Set<string>();
 for (let index = 0; index < savedCards.length; index++) {
  const card = normalizeCard(field(savedCards, String(index), `card ${index + 1}`), `Card ${index + 1}`);
  if (ids.has(card.id)) fail(`Duplicate flashcard ID in card ${index + 1}.`);
  ids.add(card.id);
  cards.push(card);
 }
 return {version: 2, cards};
}

/** New cards are immediately due. Limits count JavaScript UTF-16 characters. */
export function createCard(front: string, back: string, sourcePath: string, now: number, id: string): Card {
 const createdAt = timestamp(now, 'Current time');
 return {
  id: text(id, 'Card ID', MAX_ID_LENGTH),
  front: text(front, 'Card front', MAX_FRONT_LENGTH),
  back: text(back, 'Card back', MAX_BACK_LENGTH),
  sourcePath: text(sourcePath, 'Source path', MAX_SOURCE_PATH_LENGTH, true),
  createdAt,
  updatedAt: createdAt,
  dueAt: createdAt,
  intervalDays: 0,
  reviews: 0,
  lapses: 0,
  suspended: false,
  lastReviewedAt: null,
  revision: 0,
 };
}

/**
 * Every rating is one review and one revision. Again adds a lapse, clears the
 * interval, and schedules exactly ten minutes from now. Other ratings start at
 * 1/3/5 days, or multiply the existing interval by 1.2/2/3, round upward, and cap
 * at 365 days. After Again, the cleared interval uses those same minimums.
 * Both the supplied card and its text snapshots remain untouched.
 */
export function applyRating(card: Card, rating: Rating, now: number): Card {
 const current = normalizeCard(card, 'Card');
 const reviewedAt = timestamp(now, 'Review time');
 if (rating !== 'again' && rating !== 'hard' && rating !== 'good' && rating !== 'easy') fail('Unknown flashcard rating.');
 const minimum = rating === 'hard' ? 1 : rating === 'good' ? 3 : 5;
 const multiplier = rating === 'hard' ? 1.2 : rating === 'good' ? 2 : 3;
 const intervalDays = rating === 'again' ? 0 : Math.min(MAX_INTERVAL_DAYS, Math.max(minimum, Math.ceil(current.intervalDays * multiplier)));
 const dueAt = timestamp(reviewedAt + (rating === 'again' ? AGAIN_MS : intervalDays * DAY_MS), 'Next due time');
 return {
  ...current,
  updatedAt: reviewedAt,
  dueAt,
  intervalDays,
  reviews: integer(current.reviews + 1, 'Review count'),
  lapses: integer(current.lapses + (rating === 'again' ? 1 : 0), 'Lapse count'),
  lastReviewedAt: reviewedAt,
  revision: integer(current.revision + 1, 'Revision'),
 };
}

/** Due is inclusive; paused cards are excluded. This never reorders the deck. */
export function dueCards(cards: readonly Card[], now: number): Card[] {
 timestamp(now, 'Current time');
 return cards.filter(card => !card.suspended && card.dueAt <= now).sort((a, b) =>
  a.dueAt - b.dueAt || a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
