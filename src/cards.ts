import {SchedulingAlgorithm,SRSchedule,SRMemory,SR_PARAMETERS,SR_VERSION,SR_MAX_INTERVAL,emptySR,scheduleSR,srDelay} from './spaced-repetition';
// Original persistence adapter. MIT; see LICENSE and THIRD_PARTY_NOTICES.md.
// Scheduling is performed by the official, pinned ts-fsrs implementation.
// All persisted dates are Unix milliseconds. This module performs no I/O.
import {createEmptyCard, fsrs, Rating as FSRSRating, State, S_MIN, S_MAX, dateDiffInDays} from 'ts-fsrs';
import type {Card as OfficialCard, ReviewLog, FSRSParameters, Grade} from 'ts-fsrs';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Initial Again learning step only; other states may have a different delay. */
export const AGAIN_MS = 60 * 1000;
export const FSRS_IMPLEMENTATION_VERSION = '5.4.2' as const;
export const FSRS_PARAMETER_VERSION = 'fsrs-6-defaults-v1' as const;
const defaults = fsrs({enable_fuzz: false}).parameters;
export const FSRS_PARAMETERS: Readonly<FSRSParameters> = Object.freeze({
 ...defaults,
 w: Object.freeze([...defaults.w]),
 learning_steps: Object.freeze([...defaults.learning_steps]),
 relearning_steps: Object.freeze([...defaults.relearning_steps]),
});
// ts-fsrs preserves Hard < Good < Easy after applying maximum_interval,
// so official Good/Easy outputs at the cap can be 36501/36502 days.
export const MAX_INTERVAL_DAYS = FSRS_PARAMETERS.maximum_interval + 2;
export const MAX_FRONT_LENGTH = 4000;
export const MAX_BACK_LENGTH = 50000;
const MAX_DATE_MS = 8_640_000_000_000_000;
const MAX_ID_LENGTH = 256;
const MAX_SOURCE_PATH_LENGTH = 4096;

export type SourcePassageKind='section'|'intro'|'preamble'|'document';
/** Original source evidence, independent of the editable card front/back. */
export interface SourceRef {
 readonly line:number;readonly endLine:number;readonly heading:string;readonly excerpt:string;readonly fingerprint:string;
 /** Missing kind is the original, whole-line knowledge-excerpt format. */
 readonly kind?:'selection'|'passage';
 readonly question?:string;readonly passageKind?:SourcePassageKind;readonly headingPath?:readonly string[];
}
export interface SerializedFSRSCard extends Omit<OfficialCard, 'due' | 'last_review'> {
 due: number;
 last_review?: number;
}
export interface SerializedReviewLog extends Omit<ReviewLog, 'due' | 'review'> {
 due: number;
 review: number;
}
/** Baseline counts are preserved facts, never synthetic FSRS reviews. */
export interface FSRSBaseline {
 kind: 'new' | 'legacy' | 'relearn';
 at: number;
 reviews: number;
 lapses: number;
 /** First log belonging to the current scheduler state, after the last reset. */
 logIndex: number;
}
export interface FSRSSchedule {
 schemaVersion: 1;
 algorithm: 'FSRS-6';
 implementation: 'ts-fsrs';
 implementationVersion: typeof FSRS_IMPLEMENTATION_VERSION;
 parameterVersion: typeof FSRS_PARAMETER_VERSION;
 parameters: FSRSParameters;
 card: SerializedFSRSCard;
 /** Complete, unmodified official review logs for actual user ratings only. */
 logs: SerializedReviewLog[];
 baseline: FSRSBaseline;
}
export interface Card {
 sourceRef?: SourceRef;
 /** Absent means an untouched legacy schedule; initialize at its next real rating. */
 fsrs?: FSRSSchedule;
 sr?: SRSchedule;
 schedulingHistory?: Array<{fsrs:FSRSSchedule}|{sr:SRSchedule}>;
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
export interface CardData {version: 2|3; cards: Card[]}
export type Rating = 'again' | 'hard' | 'good' | 'easy';
const GRADES: Readonly<Record<Rating, Grade>> = Object.freeze({again: FSRSRating.Again, hard: FSRSRating.Hard, good: FSRSRating.Good, easy: FSRSRating.Easy});

/** Invalid saved data must stay read-only: never catch this by saving an empty deck. */
export class CardValidationError extends Error {
 constructor(message: string) {super(message); this.name = 'CardValidationError';}
}
function fail(message: string): never {throw new CardValidationError(message);}
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
function record(value: unknown, label: string, keys: readonly string[]): Record<string, unknown> {
 if (!isRecord(value)) fail(`${label} must be an object.`);
 if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) {
  fail(`Unsupported ${label} fields. Keep this data read-only and use a compatible plugin version.`);
 }
 return value;
}
function array<T>(value: unknown, label: string, parse: (item: unknown, label: string) => T): T[] {
 if (!Array.isArray(value)) fail(`${label} must be an array.`);
 const result: T[] = [];
 for (let i = 0; i < value.length; i++) result.push(parse(field(value, String(i), `${label}[${i}]`), `${label}[${i}]`));
 return result;
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
function decimal(value: unknown, label: string, minimum: number, maximum: number): number {
 if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) fail(`${label} must be a finite number between ${minimum} and ${maximum}.`);
 return value;
}
function boolean(value: unknown, label: string): boolean {
 if (typeof value !== 'boolean') fail(`${label} must be true or false.`);
 return value;
}
function parameterCopy(): FSRSParameters {
 return {...FSRS_PARAMETERS, w: [...FSRS_PARAMETERS.w], learning_steps: [...FSRS_PARAMETERS.learning_steps], relearning_steps: [...FSRS_PARAMETERS.relearning_steps]};
}
function normalizeParameters(raw: unknown, label: string): FSRSParameters {
 const value = record(raw, label, Object.keys(FSRS_PARAMETERS));
 for (const key of ['request_retention', 'maximum_interval', 'enable_fuzz', 'enable_short_term'] as const) {
  if (field(value, key, `${label}.${key}`) !== FSRS_PARAMETERS[key]) fail(`Unsupported FSRS parameter ${key}. Keep this data read-only.`);
 }
 for (const key of ['w', 'learning_steps', 'relearning_steps'] as const) {
  const actual = array(field(value, key), `${label}.${key}`, item => item);
  const expected = FSRS_PARAMETERS[key];
  if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) fail(`Unsupported FSRS parameter ${key}. Keep this data read-only.`);
 }
 return parameterCopy();
}
const MEMORY_FIELDS = ['state', 'stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps'] as const;
function memory(value: Record<string, unknown>, label: string) {
 const state = integer(field(value, 'state'), `${label}.state`, State.Relearning) as State;
 const result = {
  state,
  stability: decimal(field(value, 'stability'), `${label}.stability`, state === State.New ? 0 : S_MIN, S_MAX),
  difficulty: decimal(field(value, 'difficulty'), `${label}.difficulty`, state === State.New ? 0 : 1, 10),
  elapsed_days: integer(field(value, 'elapsed_days'), `${label}.elapsed_days`),
  scheduled_days: integer(field(value, 'scheduled_days'), `${label}.scheduled_days`, MAX_INTERVAL_DAYS),
  learning_steps: integer(field(value, 'learning_steps'), `${label}.learning_steps`, state === State.Learning ? FSRS_PARAMETERS.learning_steps.length - 1 : 0),
 };
 if (state === State.New && (result.stability !== 0 || result.difficulty !== 0 || result.scheduled_days !== 0 || result.learning_steps !== 0)) fail(`Invalid new-card memory in ${label}.`);
 if (state === State.Review && result.scheduled_days < 1) fail(`Invalid review interval in ${label}.`);
 if ((state === State.Learning || state === State.Relearning) && result.scheduled_days !== 0) fail(`Invalid short-term interval in ${label}.`);
 return result;
}
function normalizeFSRSCard(raw: unknown, label: string): SerializedFSRSCard {
 const value = record(raw, label, ['due', ...MEMORY_FIELDS, 'reps', 'lapses', 'last_review']);
 const result: SerializedFSRSCard = {
  due: timestamp(field(value, 'due'), `${label}.due`),
  ...memory(value, label),
  reps: integer(field(value, 'reps'), `${label}.reps`),
  lapses: integer(field(value, 'lapses'), `${label}.lapses`),
 };
 if (Object.getOwnPropertyDescriptor(value, 'last_review')) result.last_review = timestamp(field(value, 'last_review'), `${label}.last_review`);
 if (result.state === State.New) {
  if (result.reps !== 0 || result.lapses !== 0 || result.elapsed_days !== 0 || result.last_review !== undefined) fail(`Invalid fresh FSRS state in ${label}.`);
 } else if (result.reps < 1 || result.last_review === undefined || result.due <= result.last_review) fail(`Incomplete reviewed FSRS state in ${label}.`);
 if (result.lapses > result.reps) fail(`Invalid FSRS lapse count in ${label}.`);
 return result;
}
function normalizeLog(raw: unknown, label: string): SerializedReviewLog {
 const value = record(raw, label, ['rating', 'due', 'review', 'last_elapsed_days', ...MEMORY_FIELDS]);
 const rating = integer(field(value, 'rating'), `${label}.rating`, FSRSRating.Easy) as FSRSRating;
 if (rating < FSRSRating.Again) fail(`${label} must record an actual rating.`);
 return {
  rating,
  ...memory(value, label),
  due: timestamp(field(value, 'due'), `${label}.due`),
  review: timestamp(field(value, 'review'), `${label}.review`),
  last_elapsed_days: integer(field(value, 'last_elapsed_days'), `${label}.last_elapsed_days`),
 };
}
function normalizeFSRS(raw: unknown, label: string): FSRSSchedule {
 const value = record(raw, label, ['schemaVersion', 'algorithm', 'implementation', 'implementationVersion', 'parameterVersion', 'parameters', 'card', 'logs', 'baseline']);
 if (field(value, 'schemaVersion') !== 1 || field(value, 'algorithm') !== 'FSRS-6' || field(value, 'implementation') !== 'ts-fsrs' || field(value, 'implementationVersion') !== FSRS_IMPLEMENTATION_VERSION || field(value, 'parameterVersion') !== FSRS_PARAMETER_VERSION) {
  fail('Unsupported FSRS version. Keep this data read-only and use a compatible plugin version.');
 }
 const parameters = normalizeParameters(field(value, 'parameters'), `${label}.parameters`);
 const card = normalizeFSRSCard(field(value, 'card'), `${label}.card`);
 const logs = array(field(value, 'logs'), `${label}.logs`, normalizeLog);
 const source = record(field(value, 'baseline'), `${label}.baseline`, ['kind', 'at', 'reviews', 'lapses', 'logIndex']);
 const kind = field(source, 'kind');
 if (kind !== 'new' && kind !== 'legacy' && kind !== 'relearn') fail('Unknown FSRS baseline.');
 const baseline: FSRSBaseline = {kind, at: timestamp(field(source, 'at'), 'FSRS baseline time'), reviews: integer(field(source, 'reviews'), 'FSRS baseline reviews'), lapses: integer(field(source, 'lapses'), 'FSRS baseline lapses'), logIndex: integer(field(source, 'logIndex'), 'FSRS baseline log index', logs.length)};
 if (baseline.logIndex > baseline.reviews || (kind === 'new' && (baseline.reviews !== 0 || baseline.lapses !== 0 || baseline.logIndex !== 0)) || (kind === 'legacy' && baseline.logIndex !== 0)) fail('Invalid FSRS baseline counters.');
 if (logs.length - baseline.logIndex !== card.reps) fail('FSRS state and review log count do not agree.');
 let lastTime = 0;
 for (const [index, log] of logs.entries()) {
  if (log.review < lastTime || (index >= baseline.logIndex && log.review < baseline.at)) fail('FSRS review history is out of order.');
  if (log.due > log.review || log.elapsed_days !== (log.state === State.New ? 0 : dateDiffInDays(new Date(log.due), new Date(log.review)))) fail('FSRS review timing is inconsistent.');
  lastTime = log.review;
 }
 if (baseline.logIndex > 0 && logs[baseline.logIndex - 1].review > baseline.at) fail('FSRS reset predates its review history.');
 if (card.reps === 0) {
  if (card.state !== State.New || card.due !== baseline.at) fail('FSRS baseline does not match its fresh state.');
 } else {
  const first = logs[baseline.logIndex], last = logs[logs.length - 1];
  if (first.state !== State.New || first.due !== baseline.at || last.review !== card.last_review) fail('FSRS state and review history do not agree.');
  if (card.elapsed_days !== last.elapsed_days) fail('FSRS elapsed time does not match its latest review.');
  const activeLapses = logs.slice(baseline.logIndex).filter(log => log.state === State.Review && log.rating === FSRSRating.Again).length;
  if (card.lapses !== activeLapses) fail('FSRS lapse count does not match its review history.');
 }
 return {schemaVersion: 1, algorithm: 'FSRS-6', implementation: 'ts-fsrs', implementationVersion: FSRS_IMPLEMENTATION_VERSION, parameterVersion: FSRS_PARAMETER_VERSION, parameters, card, logs, baseline};
}
function normalizeSR(raw:unknown,label:string):SRSchedule{
 const value=record(raw,label,['algorithm','version','parameters','card','logs','baseline']);
 if(field(value,'algorithm')!=='SM-2-OSR'||field(value,'version')!==SR_VERSION)fail('Unsupported SM-2-OSR version');
 const params=record(field(value,'parameters'),label+'.parameters',Object.keys(SR_PARAMETERS));for(const key of Object.keys(SR_PARAMETERS) as Array<keyof typeof SR_PARAMETERS>)if(field(params,key)!==SR_PARAMETERS[key])fail('Unsupported SM-2-OSR parameters');
 const parseMemory=(raw:unknown,label:string):SRMemory=>{const m=record(raw,label,['interval','ease','due']);return{interval:integer(field(m,'interval'),label+'.interval',SR_MAX_INTERVAL),ease:integer(field(m,'ease'),label+'.ease'),due:timestamp(field(m,'due'),label+'.due')};};
 const card=parseMemory(field(value,'card'),label+'.card');if(card.ease<130)fail('Invalid SM-2-OSR ease');
 const b=record(field(value,'baseline'),label+'.baseline',['at','reviews','lapses']);const baseline={at:timestamp(field(b,'at'),label+'.at'),reviews:integer(field(b,'reviews'),label+'.reviews'),lapses:integer(field(b,'lapses'),label+'.lapses')};
 const logs=array(field(value,'logs'),label+'.logs',(raw,label)=>{const l=record(raw,label,['rating','review','delayDays','before','after','histogram']),rating=field(l,'rating');if(!['again','hard','good','easy'].includes(rating as string))fail('Invalid SM-2-OSR rating');const h=field(l,'histogram');if(!isRecord(h))fail('Invalid due histogram');const histogram:Record<string,number>={};for(const key of Object.keys(h)){if(!/^-?\d+$/.test(key))fail('Invalid due histogram day');histogram[key]=integer(field(h,key),'Histogram count');}return{rating:rating as Rating,delayDays:integer(field(l,'delayDays'),label+'.delayDays'),review:timestamp(field(l,'review'),label+'.review'),before:parseMemory(field(l,'before'),label+'.before'),after:parseMemory(field(l,'after'),label+'.after'),histogram};});
 let previous=emptySR(baseline.at).card,lastTime=baseline.at;
 for(const log of logs){if(log.review<lastTime||JSON.stringify(log.before)!==JSON.stringify(previous))fail('SM-2-OSR history is inconsistent');const expected=scheduleSR(log.before,log.rating,log.review,log.histogram,log.delayDays);// Local-day timestamps are historical facts: do not reinterpret them in a later time zone.
 if(expected.interval!==log.after.interval||expected.ease!==log.after.ease||Math.abs(log.after.due-(log.review+expected.interval*DAY_MS))>27*60*60*1000)fail('SM-2-OSR scheduling result is inconsistent');previous=log.after;lastTime=log.review;}
 if(JSON.stringify(previous)!==JSON.stringify(card))fail('SM-2-OSR state does not match its history');
 return{algorithm:'SM-2-OSR',version:SR_VERSION,parameters:{...SR_PARAMETERS},card,logs,baseline};
}
/** Only SM-2-OSR cards participate in its load balancing. FSRS due dates are never changed. */
export function srHistogram(cards:readonly Card[],now:number):Record<string,number>{const result:Record<string,number>={};for(const c of cards){if(c.suspended||!c.sr)continue;const day=String(Math.ceil((c.dueAt-now)/DAY_MS));result[day]=(result[day]||0)+1;}return result;}
export function activeAlgorithm(card:Card):SchedulingAlgorithm{return card.sr?'sm2-osr':'fsrs';}
function archiveSchedule(card:Card):NonNullable<Card['schedulingHistory']>{return [...(card.schedulingHistory??[]),...(card.fsrs?[{fsrs:card.fsrs}]:[]),...(card.sr?[{sr:card.sr}]:[])];}
function normalizeCard(raw: unknown, label: string): Card {
 if (!isRecord(raw)) fail(`${label} must be a card object.`);
 const get = (key: string) => field(raw, key, `${label}.${key}`);
 const lastReviewedAt = get('lastReviewedAt');
 // Copy a fixed allowlist, rather than merging unknown keys into a live object.
 const ref = Object.getOwnPropertyDescriptor(raw, 'sourceRef');
 let sourceRef: SourceRef | undefined;
 if (ref) {
  if (!('value' in ref) || !isRecord(ref.value)) fail('Invalid source evidence');
  const r = ref.value;
  const kindProperty=Object.getOwnPropertyDescriptor(r,'kind');
  const kind=kindProperty?field(r,'kind'):undefined;
  if(kindProperty&&kind===undefined)fail('Unsupported source evidence kind');
  if(kind!==undefined&&kind!=='selection'&&kind!=='passage')fail('Unsupported source evidence kind');
  const headingPath=Object.getOwnPropertyDescriptor(r,'headingPath')?array(field(r,'headingPath'),'source heading path',(value,label)=>text(value,label,4000)):undefined;
  if(headingPath&&headingPath.length>6)fail('Invalid source heading path');
  const question=kind==='passage'?text(field(r,'question'),'source question',4000):undefined;
  const passageKind=kind==='passage'?field(r,'passageKind'):undefined;
  if(kind==='passage'&&(typeof passageKind!=='string'||!['section','intro','preamble','document'].includes(passageKind)||!headingPath))fail('Invalid source passage evidence');
  sourceRef = {line: integer(field(r, 'line'), 'source line'), endLine: integer(field(r, 'endLine'), 'source end line'), heading: text(field(r, 'heading'), 'source heading', 4000, true), excerpt: text(field(r, 'excerpt'), 'source excerpt', 50000), fingerprint: text(field(r, 'fingerprint'), 'source fingerprint', 100),...(kind?{kind}:{}),...(headingPath?{headingPath}:{}),...(kind==='passage'?{question:question!,passageKind:passageKind as SourcePassageKind}:{})};
  if (sourceRef.endLine < sourceRef.line) fail('Invalid source line range');
 }
 const sr=Object.getOwnPropertyDescriptor(raw,'sr')?normalizeSR(get('sr'),`${label}.sr`):undefined;
 const history=Object.getOwnPropertyDescriptor(raw,'schedulingHistory')?array(get('schedulingHistory'),`${label}.history`,(item,label)=>{const value=record(item,label,['fsrs','sr']);if(Object.keys(value).length!==1)fail('Invalid archived scheduler');return Object.hasOwn(value,'fsrs')?{fsrs:normalizeFSRS(field(value,'fsrs'),label)}:{sr:normalizeSR(field(value,'sr'),label)};}):undefined;
 const schedule = Object.getOwnPropertyDescriptor(raw, 'fsrs');
 const scheduling = schedule ? normalizeFSRS(get('fsrs'), `${label}.fsrs`) : undefined;
 const result: Card = {
  ...(sourceRef ? {sourceRef} : {}),
  ...(scheduling ? {fsrs: scheduling} : {}),
  ...(sr?{sr}:{}),...(history?{schedulingHistory:history}:{}),
  id: text(get('id'), `${label}.id`, MAX_ID_LENGTH),
  front: text(get('front'), `${label}.front`, MAX_FRONT_LENGTH),
  back: text(get('back'), `${label}.back`, MAX_BACK_LENGTH),
  sourcePath: text(get('sourcePath'), `${label}.sourcePath`, MAX_SOURCE_PATH_LENGTH, true),
  createdAt: timestamp(get('createdAt'), `${label}.createdAt`),
  updatedAt: timestamp(get('updatedAt'), `${label}.updatedAt`),
  dueAt: timestamp(get('dueAt'), `${label}.dueAt`),
  intervalDays: integer(get('intervalDays'), `${label}.intervalDays`, (sr?SR_MAX_INTERVAL:MAX_INTERVAL_DAYS)),
  reviews: integer(get('reviews'), `${label}.reviews`),
  lapses: integer(get('lapses'), `${label}.lapses`),
  suspended: boolean(get('suspended'), `${label}.suspended`),
  lastReviewedAt: lastReviewedAt === null ? null : timestamp(lastReviewedAt, `${label}.lastReviewedAt`),
  revision: integer(get('revision'), `${label}.revision`),
 };
 if(sr&&scheduling)fail('A card cannot have two active schedulers');
 if(sr){const last=sr.logs.at(-1);if(result.dueAt!==sr.card.due||result.intervalDays!==(last?sr.card.interval:0)||result.reviews!==sr.baseline.reviews+sr.logs.length||result.lapses!==sr.baseline.lapses+sr.logs.filter(l=>l.rating==='again').length||(last&&result.lastReviewedAt!==last.review))fail('Card summary and SM-2-OSR state do not agree');}
 if (scheduling) {
  const state = scheduling.card, base = scheduling.baseline;
  if (result.dueAt !== state.due || result.intervalDays !== state.scheduled_days || result.reviews !== integer(base.reviews + state.reps, 'Cumulative reviews') || result.lapses !== integer(base.lapses + state.lapses, 'Cumulative lapses') || (state.last_review !== undefined && result.lastReviewedAt !== state.last_review)) fail('Card summary and FSRS state do not agree. Keep this data read-only.');
  if (base.kind === 'new' && state.reps === 0 && result.lastReviewedAt !== null) fail('A new FSRS card cannot have an earlier review.');
 }
 return result;
}

/**
 * v0.1.1 saved no plugin data: only null, undefined, or an empty object migrate.
 * v2 is validated all-or-nothing. Unknown FSRS versions/parameters fail closed.
 * Untouched legacy timestamps/counters are preserved exactly, without inventing
 * stability, difficulty or rating history. All accepted nested data is cloned.
 */
export function normalizeData(raw: unknown, now: number): CardData {
 timestamp(now, 'Current time');
 if (raw === null || raw === undefined) return {version: 2, cards: []};
 if (!isRecord(raw)) fail('Saved flashcard data must be an object.');
 if (Reflect.ownKeys(raw).length === 0) return {version: 2, cards: []};
 const version = field(raw, 'version', 'flashcard data version');
 if (version !== 2 && version !== 3) fail('Unsupported flashcard data version. Keep this data read-only and use a compatible plugin version.');
 const cards = array(field(raw, 'cards', 'flashcard cards array'), 'Saved flashcard cards', normalizeCard);
 const ids = new Set<string>();
 for (const card of cards) {
  if (ids.has(card.id)) fail('Duplicate flashcard ID.');
  ids.add(card.id);
 }
 return {version: version===3||cards.some(c=>c.sr||c.schedulingHistory)?3:2, cards};
}
function serializeCard(card: OfficialCard): SerializedFSRSCard {
 const {due, last_review, ...memory} = card;
 return {...memory, due: timestamp(due.getTime(), 'FSRS due time'), ...(last_review === undefined ? {} : {last_review: timestamp(last_review.getTime(), 'FSRS last review')})};
}
function serializeLog(log: ReviewLog): SerializedReviewLog {
 return {...log, due: timestamp(log.due.getTime(), 'FSRS log due'), review: timestamp(log.review.getTime(), 'FSRS log review')};
}
function emptySchedule(kind: FSRSBaseline['kind'], now: number, reviews = 0, lapses = 0, logs: SerializedReviewLog[] = []): FSRSSchedule {
 return {schemaVersion: 1, algorithm: 'FSRS-6', implementation: 'ts-fsrs', implementationVersion: FSRS_IMPLEMENTATION_VERSION, parameterVersion: FSRS_PARAMETER_VERSION, parameters: parameterCopy(), card: serializeCard(createEmptyCard(new Date(now))), logs, baseline: {kind, at: now, reviews, lapses, logIndex: logs.length}};
}
/** New cards are immediately due and have no fabricated review history. */
export function createCard(front: string, back: string, sourcePath: string, now: number, id: string): Card {
 const createdAt = timestamp(now, 'Current time');
 return {
  id: text(id, 'Card ID', MAX_ID_LENGTH),
  front: text(front, 'Card front', MAX_FRONT_LENGTH),
  back: text(back, 'Card back', MAX_BACK_LENGTH),
  sourcePath: text(sourcePath, 'Source path', MAX_SOURCE_PATH_LENGTH, true),
  createdAt, updatedAt: createdAt, dueAt: createdAt, intervalDays: 0, reviews: 0,
  lapses: 0, suspended: false, lastReviewedAt: null, revision: 0,
  fsrs: emptySchedule('new', createdAt),
 };
}

/**
 * Pure deterministic preview/commit: one real rating appends one official log.
 * Legacy cards start an explicit fresh FSRS baseline at this first rating,
 * retaining their cumulative review/lapse counts. No legacy rating is inferred.
 * Lapses use FSRS semantics: Again in Review, not an initial learning failure.
 */
export function applyRating(card: Card, rating: Rating, now: number, algorithm:SchedulingAlgorithm=activeAlgorithm(card), histogram:Record<string,number>={}): Card {
 let current = normalizeCard(card, 'Card');
 const reviewedAt = timestamp(now, 'Review time');
 if (rating !== 'again' && rating !== 'hard' && rating !== 'good' && rating !== 'easy') fail('Unknown flashcard rating.');
 if(algorithm!=='fsrs'&&algorithm!=='sm2-osr')fail('Unsupported scheduling algorithm');
 if((algorithm==='sm2-osr'||activeAlgorithm(current)!==algorithm)&&reviewedAt<(current.lastReviewedAt??current.createdAt))fail('Review time predates the latest rating');
 if(activeAlgorithm(current)!==algorithm){const history=archiveSchedule(current);delete current.fsrs;delete current.sr;current.schedulingHistory=history;}
 if(algorithm==='sm2-osr'){
  const schedule=current.sr??emptySR(reviewedAt,current.reviews,current.lapses),next=scheduleSR(schedule.card,rating,reviewedAt,histogram);
  return normalizeCard({...current,sr:{...schedule,card:next,logs:[...schedule.logs,{rating,review:reviewedAt,delayDays:srDelay(schedule.card,reviewedAt),before:{...schedule.card},after:{...next},histogram:{...histogram}}]},updatedAt:reviewedAt,dueAt:next.due,intervalDays:next.interval,reviews:current.reviews+1,lapses:current.lapses+(rating==='again'?1:0),lastReviewedAt:reviewedAt,revision:current.revision+1},'Rated card');
 }
 const schedule = current.fsrs ?? emptySchedule('legacy', reviewedAt, current.reviews, current.lapses);
 if (reviewedAt < (schedule.card.last_review ?? schedule.baseline.at)) fail('Review time predates the FSRS state. Check the system clock before rating.');
 try {
  const input: OfficialCard = {...schedule.card, due: new Date(schedule.card.due), ...(schedule.card.last_review === undefined ? {} : {last_review: new Date(schedule.card.last_review)})} as OfficialCard;
  const result = fsrs(schedule.parameters).next(input, new Date(reviewedAt), GRADES[rating]);
  const next = serializeCard(result.card);
  return normalizeCard({
   ...current,
   fsrs: {...schedule, card: next, logs: [...schedule.logs, serializeLog(result.log)]},
   updatedAt: reviewedAt, dueAt: next.due, intervalDays: next.scheduled_days,
   reviews: integer(current.reviews + 1, 'Review count'),
   lapses: integer(schedule.baseline.lapses + next.lapses, 'Lapse count'),
   lastReviewedAt: reviewedAt, revision: integer(current.revision + 1, 'Revision'),
  }, 'Rated card');
 } catch (error) {
  if (error instanceof CardValidationError) throw error;
  fail(`FSRS scheduling failed: ${error instanceof Error ? error.message : 'invalid scheduler result'}`);
 }
}

/** Relearn resets only the current memory state; cumulative counts/logs survive. */
export function resetScheduling(card: Card, now: number): Card {
 const current = normalizeCard(card, 'Card');
 const resetAt = timestamp(now, 'Reset time');
 if(current.sr){if(resetAt<(current.lastReviewedAt??current.createdAt))fail('Reset predates review');return normalizeCard({...current,schedulingHistory:archiveSchedule(current),sr:emptySR(resetAt,current.reviews,current.lapses),dueAt:resetAt,intervalDays:0,suspended:false,updatedAt:resetAt,revision:current.revision+1},'Reset card');}
 if (current.fsrs && resetAt < (current.fsrs.card.last_review ?? current.fsrs.baseline.at)) fail('Reset time predates the FSRS state. Check the system clock.');
 return normalizeCard({...current,
  fsrs: emptySchedule('relearn', resetAt, current.reviews, current.lapses, current.fsrs?.logs ?? []),
  dueAt: resetAt, intervalDays: 0, suspended: false, updatedAt: resetAt,
  revision: integer(current.revision + 1, 'Revision'),
 }, 'Reset card');
}

/** Due is inclusive; paused cards are excluded. This never reorders the deck. */
export function dueCards(cards: readonly Card[], now: number): Card[] {
 timestamp(now, 'Current time');
 return cards.filter(card => !card.suspended && card.dueAt <= now).sort((a, b) =>
  a.dueAt - b.dueAt || a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
