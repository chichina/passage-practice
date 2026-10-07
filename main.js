/* Passage Practice 1.5.1 | Copyright 2026 Passage Practice contributors | MIT License */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  CardStore: () => CardStore,
  CardsModal: () => CardsModal,
  PracticeModal: () => PracticeModal,
  StudyView: () => StudyView,
  default: () => PassagePractice
});
module.exports = __toCommonJS(main_exports);

// src/settings.ts
var import_obsidian = require("obsidian");
var PracticeSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, host) {
    super(app, host);
    this.host = host;
  }
  display() {
    const root = this.containerEl;
    root.empty();
    root.createEl("h2", { text: "\u56DE\u60F3\u7EC3\u4E60" });
    const store = this.host.store;
    if (!store) {
      root.createEl("p", { text: this.host.storageError || "\u5361\u7247\u5B58\u50A8\u5C1A\u672A\u5C31\u7EEA" });
      return;
    }
    new import_obsidian.Setting(root).setName("\u590D\u4E60\u7B97\u6CD5").setDesc("\u5207\u6362\u53EA\u4FDD\u5B58\u504F\u597D\uFF0C\u73B0\u6709\u5230\u671F\u65F6\u95F4\u548C\u8BC4\u5206\u5386\u53F2\u4FDD\u7559\u3002\u4E0B\u6B21\u771F\u5B9E\u8BC4\u5206\u624D\u5F00\u59CB\u6240\u9009\u7B97\u6CD5\u7684\u65B0\u8C03\u5EA6\u9636\u6BB5\u3002").addDropdown((drop) => {
      drop.addOption("fsrs", "FSRS \xB7 \u8BB0\u5FC6\u6A21\u578B").addOption("sm2-osr", "Spaced Repetition \xB7 \u6309\u5929").setValue(store.schedulingAlgorithm).onChange(async (value) => {
        drop.setDisabled(true);
        try {
          await store.setSchedulingAlgorithm(value);
          this.host.refreshStudyViews();
          new import_obsidian.Notice("\u5DF2\u4FDD\u5B58\u590D\u4E60\u7B97\u6CD5\uFF0C\u539F\u5230\u671F\u65F6\u95F4\u548C\u5386\u53F2\u4FDD\u7559");
        } catch (error) {
          new import_obsidian.Notice(error instanceof Error ? error.message : "\u7B97\u6CD5\u4FDD\u5B58\u5931\u8D25");
        } finally {
          drop.setValue(store.schedulingAlgorithm);
          drop.setDisabled(false);
        }
      });
    });
    root.createEl("p", { text: "FSRS \u4F7F\u7528\u8BB0\u5FC6\u6A21\u578B\uFF1BSpaced Repetition \u4F7F\u7528 SM-2-OSR \u9ED8\u8BA4\u516C\u5F0F\uFF0C\u6309\u672C\u5730\u65E5\u671F\u8BA1\u7B97\u5230\u671F\u3002\u6309\u5929\u6A21\u5F0F\u300C\u5FD8\u4E86\u300D\u4ECA\u5929\u5230\u671F\uFF1B\u53EF\u5728\u4FA7\u680F\u5B66\u4E60\u9009\u9879\u4E2D\u542F\u7528\u672C\u8F6E\u518D\u7EC3\u4E00\u6B21\u3002" });
  }
};

// src/vault-storage.ts
var VAULT_STORAGE_DIRECTORY = "Passage Practice";
var VAULT_STATE_PATH = `${VAULT_STORAGE_DIRECTORY}/state.json`;
var VAULT_LEGACY_ARCHIVE_PATH = `${VAULT_STORAGE_DIRECTORY}/migration/legacy-data.json`;
var VAULT_STORAGE_MARKER_PATH = `${VAULT_STORAGE_DIRECTORY}/storage-info.json`;
var VAULT_TRANSACTION_PATH = `${VAULT_STORAGE_DIRECTORY}/.transaction.json`;
var MARKER = JSON.stringify({ owner: "passage-practice", storageVersion: 1 }) + "\n";
var ROOT = VAULT_STORAGE_DIRECTORY;
var HISTORY = `${ROOT}/history`;
var VaultStorageError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "VaultStorageError";
  }
};
var errorText = (error) => error instanceof Error ? error.message : String(error);
var token = () => {
  var _a2, _b, _c;
  return (_c = (_b = (_a2 = globalThis.crypto) == null ? void 0 : _a2.randomUUID) == null ? void 0 : _b.call(_a2)) != null ? _c : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
var nextPath = (id) => `${ROOT}/.pending-${id}.json`;
var backupPath = (id) => `${HISTORY}/state-${id}.json`;
var VaultJsonStorage = class _VaultJsonStorage {
  constructor(adapter, legacyRawText, validate) {
    this.adapter = adapter;
    this.legacyRawText = legacyRawText;
    this.validate = validate;
    __publicField(this, "value", null);
    __publicField(this, "raw", null);
    __publicField(this, "origin", "empty");
    __publicField(this, "locked", false);
    __publicField(this, "issue", null);
    __publicField(this, "initialized", false);
    __publicField(this, "pending", Promise.resolve());
  }
  static async open(adapter, legacyRawText, validate) {
    const storage = new _VaultJsonStorage(adapter, legacyRawText, validate);
    try {
      if (await adapter.exists(ROOT)) {
        storage.origin = "vault";
        await storage.assertOwned();
        storage.initialized = true;
        if (await adapter.exists(VAULT_TRANSACTION_PATH)) await storage.recover();
        const raw = await storage.readOptional(VAULT_STATE_PATH);
        if (raw === null) throw new Error(`Missing committed state: ${VAULT_STATE_PATH}. Restore it from a known-good backup; no empty deck was created.`);
        storage.accept(raw);
      } else if (legacyRawText !== null) {
        storage.origin = "legacy";
        storage.accept(legacyRawText);
      }
    } catch (error) {
      storage.lock(`Storage is read-only: ${errorText(error)}`);
    }
    return storage;
  }
  get data() {
    return this.value === null ? null : structuredClone(this.value);
  }
  get rawText() {
    return this.raw;
  }
  get source() {
    return this.origin;
  }
  get readOnly() {
    return this.locked;
  }
  get problem() {
    return this.issue;
  }
  /** Serialized in this instance; rejected saves do not publish new memory state. */
  persist(data) {
    let raw;
    try {
      const json = JSON.stringify(data, null, 2);
      if (json === void 0) throw new Error("The deck is not JSON serializable.");
      raw = json + "\n";
      this.decode(raw);
    } catch (error) {
      return Promise.reject(new VaultStorageError(`Invalid deck: ${errorText(error)}`, "invalid"));
    }
    const work = this.pending.then(async () => {
      var _a2;
      if (this.locked) throw new VaultStorageError((_a2 = this.issue) != null ? _a2 : "Storage is read-only.", "read-only");
      if (!this.initialized) await this.initialize(raw);
      else await this.commit(raw);
    });
    this.pending = work.catch(() => {
    });
    return work;
  }
  decode(raw) {
    return this.validate(JSON.parse(raw));
  }
  accept(raw) {
    const value = this.decode(raw);
    this.value = value;
    this.raw = raw;
  }
  lock(message) {
    this.locked = true;
    this.issue = message;
  }
  conflict(message) {
    this.lock(message);
    throw new VaultStorageError(message, "conflict");
  }
  async readOptional(path) {
    return await this.adapter.exists(path) ? await this.adapter.read(path) : null;
  }
  async assertOwned() {
    if (await this.readOptional(VAULT_STORAGE_MARKER_PATH) !== MARKER) {
      throw new Error(`\u201C${ROOT}\u201D already exists without the expected Passage Practice ownership marker. Its contents were not changed. Rename that folder or choose another vault before trying again.`);
    }
  }
  async writeVerified(path, raw) {
    if (await this.adapter.exists(path)) this.conflict(`Refusing to overwrite an existing staging file: ${path}`);
    await this.adapter.write(path, raw);
    if (await this.adapter.read(path) !== raw) throw new Error(`Write verification failed: ${path}`);
  }
  async assertCurrent() {
    try {
      await this.assertOwned();
    } catch (error) {
      this.conflict(errorText(error));
    }
    if (await this.readOptional(VAULT_STATE_PATH) !== this.raw) {
      this.conflict(`The vault deck changed outside this window. Reload Passage Practice before saving; ${VAULT_STATE_PATH} was not overwritten.`);
    }
    if (await this.adapter.exists(VAULT_TRANSACTION_PATH)) {
      this.conflict("Another or interrupted save is present. Reload Passage Practice to recover it before saving.");
    }
  }
  async initialize(raw) {
    if (await this.adapter.exists(ROOT)) this.conflict(`\u201C${ROOT}\u201D appeared after loading. Reload before saving; the existing folder was not changed.`);
    const staging = `.passage-practice-init-${token()}`;
    if (await this.adapter.exists(staging)) throw new VaultStorageError("Initialization staging path already exists. Try again.", "io");
    try {
      await this.adapter.mkdir(staging);
      await this.writeVerified(`${staging}/storage-info.json`, MARKER);
      await this.adapter.mkdir(`${staging}/history`);
      if (this.legacyRawText !== null) {
        await this.adapter.mkdir(`${staging}/migration`);
        await this.writeVerified(`${staging}/migration/legacy-data.json`, this.legacyRawText);
      }
      await this.writeVerified(`${staging}/state.json`, raw);
      if (await this.adapter.exists(ROOT)) this.conflict(`\u201C${ROOT}\u201D appeared during initialization. Its contents were not changed.`);
      try {
        await this.adapter.rename(staging, ROOT);
      } catch (error) {
        if (!await this.isPublishedInitialization(raw, staging)) throw error;
      }
      if (!await this.isPublishedInitialization(raw, staging)) this.conflict("Initialized storage could not be verified. Reload before making more changes.");
      this.initialized = true;
      this.origin = "vault";
      this.accept(raw);
    } catch (error) {
      if (error instanceof VaultStorageError) throw error;
      throw new VaultStorageError(`Could not initialize vault storage: ${errorText(error)}`, "io");
    }
  }
  async isPublishedInitialization(raw, staging) {
    return !await this.adapter.exists(staging) && await this.readOptional(VAULT_STORAGE_MARKER_PATH) === MARKER && await this.readOptional(VAULT_STATE_PATH) === raw && (this.legacyRawText === null || await this.readOptional(VAULT_LEGACY_ARCHIVE_PATH) === this.legacyRawText);
  }
  async commit(raw) {
    await this.assertCurrent();
    if (raw === this.raw) return;
    const id = token();
    const next = nextPath(id);
    const backup = backupPath(id);
    const transaction = { owner: "passage-practice", version: 1, id, previousRaw: this.raw, nextRaw: raw };
    const journal = JSON.stringify(transaction) + "\n";
    const journalStaging = `${ROOT}/.pending-${id}.transaction.json`;
    let journalPublished = false;
    try {
      await this.writeVerified(next, raw);
      await this.writeVerified(journalStaging, journal);
      await this.assertCurrent();
      if (await this.adapter.exists(backup)) this.conflict(`Refusing to replace an existing backup: ${backup}`);
      await this.adapter.rename(journalStaging, VAULT_TRANSACTION_PATH);
      journalPublished = true;
      await this.requireJournal(journal);
      if (await this.readOptional(VAULT_STATE_PATH) !== this.raw) this.conflict("The deck changed while preparing this save. All versions have been retained; reload to inspect the conflict.");
      if (await this.adapter.read(next) !== raw) this.conflict("The staged deck changed before commit. The current deck was retained; reload before saving.");
      await this.adapter.rename(VAULT_STATE_PATH, backup);
      if (await this.adapter.read(backup) !== this.raw) {
        if (!await this.adapter.exists(VAULT_STATE_PATH)) await this.adapter.rename(backup, VAULT_STATE_PATH);
        this.conflict("The deck changed during the save. The external version was retained; reload before saving.");
      }
      await this.requireJournal(journal);
      if (await this.adapter.read(next) !== raw) throw new Error("The staged deck changed during commit.");
      if (await this.adapter.exists(VAULT_STATE_PATH)) this.conflict("Another writer created a deck during this save. Its file and the previous version were retained.");
      await this.adapter.rename(next, VAULT_STATE_PATH);
      if (await this.adapter.read(VAULT_STATE_PATH) !== raw) this.conflict("The committed deck changed before verification. Reload before saving.");
      this.accept(raw);
      await this.cleanupCommittedJournal(journal);
    } catch (error) {
      try {
        const foundJournal = await this.readOptional(VAULT_TRANSACTION_PATH);
        if (foundJournal === journal) {
          journalPublished = true;
          const current = await this.readOptional(VAULT_STATE_PATH);
          const previous = await this.readOptional(backup);
          if (current === raw && previous === transaction.previousRaw && !this.locked) {
            this.accept(raw);
            await this.cleanupCommittedJournal(journal);
            return;
          }
          if (!this.locked && current === null && previous === transaction.previousRaw) {
            await this.adapter.rename(backup, VAULT_STATE_PATH);
            if (await this.adapter.read(VAULT_STATE_PATH) !== transaction.previousRaw) throw new Error("Rollback verification failed.");
            await this.removeExactJournal(journal);
          } else if (!this.locked && current === transaction.previousRaw) {
            await this.removeExactJournal(journal);
          } else if (!this.locked) {
            this.lock("Save outcome conflicts with the files on disk. All available versions were retained; reload to recover.");
          }
        } else if (journalPublished) {
          this.lock("The recovery journal changed during a save. Reload before saving again.");
        }
      } catch (recoveryError) {
        this.lock(`A save was interrupted and automatic recovery could not finish: ${errorText(recoveryError)}. Reload to recover from the retained journal and backup.`);
      }
      if (error instanceof VaultStorageError) throw error;
      throw new VaultStorageError(`The deck was not saved: ${errorText(error)}`, "io");
    }
  }
  async requireJournal(expected) {
    if (await this.readOptional(VAULT_TRANSACTION_PATH) !== expected) this.conflict("The recovery journal changed during a save. All available files were retained.");
  }
  async removeExactJournal(expected) {
    await this.requireJournal(expected);
    await this.adapter.remove(VAULT_TRANSACTION_PATH);
  }
  async cleanupCommittedJournal(journal) {
    try {
      await this.removeExactJournal(journal);
    } catch (error) {
      if (await this.adapter.exists(VAULT_TRANSACTION_PATH)) this.lock(`The deck was saved, but recovery-journal cleanup failed: ${errorText(error)}. Reload before the next save.`);
    }
  }
  async recover() {
    const journal = await this.adapter.read(VAULT_TRANSACTION_PATH);
    let transaction;
    try {
      const parsed = JSON.parse(journal);
      if (!parsed || typeof parsed !== "object") throw new Error("Not an object.");
      const t = parsed;
      if (t.owner !== "passage-practice" || t.version !== 1 || typeof t.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(t.id) || typeof t.previousRaw !== "string" || typeof t.nextRaw !== "string" || t.previousRaw === t.nextRaw) throw new Error("Unexpected recovery-journal format.");
      this.decode(t.previousRaw);
      this.decode(t.nextRaw);
      transaction = t;
    } catch (error) {
      throw new Error(`Invalid recovery journal; no deck files were replaced: ${errorText(error)}`);
    }
    const current = await this.readOptional(VAULT_STATE_PATH);
    const previous = await this.readOptional(backupPath(transaction.id));
    if (current === transaction.nextRaw) {
      if (previous !== transaction.previousRaw) throw new Error("The committed save has a missing or conflicting previous backup. All files were retained.");
      this.accept(current);
      await this.removeExactJournal(journal);
    } else if (current === transaction.previousRaw) {
      this.accept(current);
      await this.removeExactJournal(journal);
    } else if (current === null && previous === transaction.previousRaw) {
      await this.requireJournal(journal);
      if (await this.adapter.exists(VAULT_STATE_PATH)) throw new Error("A concurrent writer appeared during recovery.");
      await this.adapter.rename(backupPath(transaction.id), VAULT_STATE_PATH);
      if (await this.adapter.read(VAULT_STATE_PATH) !== transaction.previousRaw) throw new Error("Recovery verification failed.");
      this.accept(transaction.previousRaw);
      await this.removeExactJournal(journal);
    } else {
      throw new Error("Interrupted save conflicts with the current deck or its backup. No file was replaced; inspect the retained files before reloading.");
    }
  }
};

// src/spaced-repetition.ts
var SR_VERSION = "sm2-osr-v1";
var SR_MAX_INTERVAL = 36525;
var SR_PARAMETERS = { baseEase: 250, hardMultiplier: 0.5, easyBonus: 1.3, maximumInterval: 36525, loadBalance: true };
function emptySR(now, reviews = 0, lapses = 0) {
  return { algorithm: "SM-2-OSR", version: SR_VERSION, parameters: { ...SR_PARAMETERS }, card: { interval: 1, ease: 250, due: now }, logs: [], baseline: { at: now, reviews, lapses } };
}
function srDelay(memory2, now) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - memory2.due) / 864e5));
}
function scheduleSR(memory2, rating, now, histogram = {}, delayDays = srDelay(memory2, now)) {
  let interval = Math.max(1, memory2.interval), ease = memory2.ease;
  const delay = delayDays;
  if (rating === "again") {
    ease = Math.max(130, ease - 20);
    interval = 0;
  } else if (rating === "hard") {
    ease = Math.max(130, ease - 20);
    interval = Math.max(1, (interval + delay / 4) * 0.5);
  } else if (rating === "good") interval = (interval + delay / 2) * ease / 100;
  else if (rating === "easy") {
    ease += 20;
    interval = (interval + delay) * ease / 100 * 1.3;
  } else throw new Error("Unknown SM-2-OSR rating");
  interval = Math.round(interval);
  if (interval > 7 && Object.hasOwn(histogram, String(interval))) {
    const fuzz = interval <= 21 ? 1 : interval <= 180 ? Math.min(3, Math.floor(interval * 0.05)) : Math.min(7, Math.floor(interval * 0.025));
    const original = interval;
    let count = histogram[String(interval)], found = false;
    for (let offset = 1; offset <= fuzz && !found; offset++) for (const candidate of [original - offset, original + offset]) {
      if (!Object.hasOwn(histogram, String(candidate))) {
        interval = candidate;
        found = true;
        break;
      }
      if (histogram[String(candidate)] < count) {
        interval = candidate;
        count = histogram[String(candidate)];
      }
    }
  }
  interval = Math.round(Math.min(interval, SR_MAX_INTERVAL) * 10) / 10;
  const due = new Date(now);
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + Math.round(interval));
  return { interval, ease, due: due.getTime() };
}

// node_modules/ts-fsrs/dist/index.mjs
var FSRSError = class _FSRSError extends Error {
  constructor(message = "FSRS Error") {
    var _a2;
    super(message);
    this.name = "FSRSError";
    (_a2 = Error.captureStackTrace) == null ? void 0 : _a2.call(Error, this, _FSRSError);
  }
};
var FSRSValidationError = class _FSRSValidationError extends FSRSError {
  constructor(message) {
    var _a2;
    super(message);
    this.name = "FSRSValidationError";
    (_a2 = Error.captureStackTrace) == null ? void 0 : _a2.call(Error, this, _FSRSValidationError);
  }
};
var State = /* @__PURE__ */ ((State2) => {
  State2[State2["New"] = 0] = "New";
  State2[State2["Learning"] = 1] = "Learning";
  State2[State2["Review"] = 2] = "Review";
  State2[State2["Relearning"] = 3] = "Relearning";
  return State2;
})(State || {});
var Rating = /* @__PURE__ */ ((Rating22) => {
  Rating22[Rating22["Manual"] = 0] = "Manual";
  Rating22[Rating22["Again"] = 1] = "Again";
  Rating22[Rating22["Hard"] = 2] = "Hard";
  Rating22[Rating22["Good"] = 3] = "Good";
  Rating22[Rating22["Easy"] = 4] = "Easy";
  return Rating22;
})(Rating || {});
var TypeConvert = class _TypeConvert {
  static card(card) {
    return {
      ...card,
      state: _TypeConvert.state(card.state),
      due: _TypeConvert.time(card.due),
      last_review: card.last_review ? _TypeConvert.time(card.last_review) : void 0
    };
  }
  static rating(value) {
    if (typeof value === "string") {
      const firstLetter = value.charAt(0).toUpperCase();
      const restOfString = value.slice(1).toLowerCase();
      const ret = Rating[`${firstLetter}${restOfString}`];
      if (ret === void 0) {
        throw new FSRSValidationError(`Invalid rating:[${value}]`);
      }
      return ret;
    } else if (typeof value === "number") {
      return value;
    }
    throw new FSRSValidationError(`Invalid rating:[${value}]`);
  }
  static state(value) {
    if (typeof value === "string") {
      const firstLetter = value.charAt(0).toUpperCase();
      const restOfString = value.slice(1).toLowerCase();
      const ret = State[`${firstLetter}${restOfString}`];
      if (ret === void 0) {
        throw new FSRSValidationError(`Invalid state:[${value}]`);
      }
      return ret;
    } else if (typeof value === "number") {
      return value;
    }
    throw new FSRSValidationError(`Invalid state:[${value}]`);
  }
  static time(value) {
    if (value instanceof Date) {
      return value;
    }
    const date3 = new Date(value);
    if (typeof value === "object" && value !== null && !Number.isNaN(Date.parse(value) || +date3)) {
      return date3;
    } else if (typeof value === "string") {
      const timestamp2 = Date.parse(value);
      if (!Number.isNaN(timestamp2)) {
        return new Date(timestamp2);
      } else {
        throw new FSRSValidationError(`Invalid date:[${value}]`);
      }
    } else if (typeof value === "number") {
      return new Date(value);
    }
    throw new FSRSValidationError(`Invalid date:[${value}]`);
  }
  static review_log(log) {
    return {
      ...log,
      due: _TypeConvert.time(log.due),
      rating: _TypeConvert.rating(log.rating),
      state: _TypeConvert.state(log.state),
      review: _TypeConvert.time(log.review)
    };
  }
};
function date_scheduler(now, t, isDay) {
  return new Date(
    isDay ? TypeConvert.time(now).getTime() + t * 24 * 60 * 60 * 1e3 : TypeConvert.time(now).getTime() + t * 60 * 1e3
  );
}
function date_diff(now, pre, unit) {
  if (!now || !pre) {
    throw new FSRSValidationError("Invalid date");
  }
  const diff = TypeConvert.time(now).getTime() - TypeConvert.time(pre).getTime();
  let r = 0;
  switch (unit) {
    case "days":
      r = Math.floor(diff / (24 * 60 * 60 * 1e3));
      break;
    case "minutes":
      r = Math.floor(diff / (60 * 1e3));
      break;
  }
  return r;
}
var Grades = Object.freeze([
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy
]);
var FUZZ_RANGES = [
  {
    start: 2.5,
    end: 7,
    factor: 0.15
  },
  {
    start: 7,
    end: 20,
    factor: 0.1
  },
  {
    start: 20,
    end: Infinity,
    factor: 0.05
  }
];
function get_fuzz_range(interval, elapsed_days, maximum_interval) {
  let delta = 1;
  for (const range of FUZZ_RANGES) {
    delta += range.factor * Math.max(Math.min(interval, range.end) - range.start, 0);
  }
  interval = Math.min(interval, maximum_interval);
  let min_ivl = Math.max(2, Math.round(interval - delta));
  const max_ivl = Math.min(Math.round(interval + delta), maximum_interval);
  if (interval > elapsed_days) {
    min_ivl = Math.max(min_ivl, elapsed_days + 1);
  }
  min_ivl = Math.min(min_ivl, max_ivl);
  return { min_ivl, max_ivl };
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function roundTo(num, decimals) {
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}
function dateDiffInDays(last, cur) {
  const utc1 = Date.UTC(
    last.getUTCFullYear(),
    last.getUTCMonth(),
    last.getUTCDate()
  );
  const utc2 = Date.UTC(
    cur.getUTCFullYear(),
    cur.getUTCMonth(),
    cur.getUTCDate()
  );
  return Math.floor(
    (utc2 - utc1) / 864e5
    /** 1000 * 60 * 60 * 24*/
  );
}
var ConvertStepUnitToMinutes = (step) => {
  const unit = step.slice(-1);
  const value = parseInt(step.slice(0, -1), 10);
  if (Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw new FSRSValidationError(`Invalid step value: ${step}`);
  }
  switch (unit) {
    case "m":
      return value;
    case "h":
      return value * 60;
    case "d":
      return value * 1440;
    default:
      throw new FSRSValidationError(
        `Invalid step unit: ${step}, expected m/h/d`
      );
  }
};
var BasicLearningStepsStrategy = (params, state, cur_step) => {
  const learning_steps = state === State.Relearning || state === State.Review ? params.relearning_steps : params.learning_steps;
  const steps_length = learning_steps.length;
  if (steps_length === 0 || cur_step >= steps_length) return {};
  const firstStep = learning_steps[0];
  const toMinutes = ConvertStepUnitToMinutes;
  const getAgainInterval = () => {
    return toMinutes(firstStep);
  };
  const getHardInterval = () => {
    if (steps_length === 1) return Math.round(toMinutes(firstStep) * 1.5);
    const nextStep = learning_steps[1];
    return Math.round((toMinutes(firstStep) + toMinutes(nextStep)) / 2);
  };
  const getStepInfo = (index) => {
    if (index < 0 || index >= steps_length) {
      return null;
    } else {
      return learning_steps[index];
    }
  };
  const getGoodMinutes = (step) => {
    return toMinutes(step);
  };
  const result = {};
  const step_info = getStepInfo(Math.max(0, cur_step));
  if (state === State.Review) {
    result[Rating.Again] = {
      scheduled_minutes: toMinutes(step_info),
      next_step: 0
    };
    return result;
  } else {
    result[Rating.Again] = {
      scheduled_minutes: getAgainInterval(),
      next_step: 0
    };
    result[Rating.Hard] = {
      scheduled_minutes: getHardInterval(),
      next_step: cur_step
    };
    const next_info = getStepInfo(cur_step + 1);
    if (next_info) {
      const nextMin = getGoodMinutes(next_info);
      if (nextMin) {
        result[Rating.Good] = {
          scheduled_minutes: Math.round(nextMin),
          next_step: cur_step + 1
        };
      }
    }
  }
  return result;
};
function DefaultInitSeedStrategy() {
  const time = this.review_time.getTime();
  const reps = this.current.reps;
  const mul = this.current.difficulty * this.current.stability;
  return `${time}_${reps}_${mul}`;
}
var StrategyMode = /* @__PURE__ */ ((StrategyMode2) => {
  StrategyMode2["SCHEDULER"] = "Scheduler";
  StrategyMode2["LEARNING_STEPS"] = "LearningSteps";
  StrategyMode2["SEED"] = "Seed";
  return StrategyMode2;
})(StrategyMode || {});
var AbstractScheduler = class {
  // init
  constructor(card, now, algorithm, strategies) {
    __publicField(this, "last");
    __publicField(this, "current");
    __publicField(this, "review_time");
    __publicField(this, "next", /* @__PURE__ */ new Map());
    __publicField(this, "algorithm");
    __publicField(this, "strategies");
    __publicField(this, "elapsed_days", 0);
    this.algorithm = algorithm;
    this.last = TypeConvert.card(card);
    this.current = TypeConvert.card(card);
    this.review_time = TypeConvert.time(now);
    this.strategies = strategies;
    this.init();
  }
  checkGrade(grade) {
    if (!Number.isFinite(grade) || grade < 1 || grade > 4) {
      throw new FSRSValidationError(`Invalid grade "${grade}",expected 1-4`);
    }
  }
  init() {
    const { state, last_review } = this.current;
    let interval = 0;
    if (state !== State.New && last_review) {
      interval = dateDiffInDays(last_review, this.review_time);
    }
    this.current.last_review = this.review_time;
    this.elapsed_days = interval;
    this.current.elapsed_days = interval;
    this.current.reps += 1;
    let seed_strategy = DefaultInitSeedStrategy;
    if (this.strategies) {
      const custom_strategy = this.strategies.get(StrategyMode.SEED);
      if (custom_strategy) {
        seed_strategy = custom_strategy;
      }
    }
    this.algorithm.seed = seed_strategy.call(this);
  }
  preview() {
    return {
      [Rating.Again]: this.review(Rating.Again),
      [Rating.Hard]: this.review(Rating.Hard),
      [Rating.Good]: this.review(Rating.Good),
      [Rating.Easy]: this.review(Rating.Easy),
      [Symbol.iterator]: this.previewIterator.bind(this)
    };
  }
  *previewIterator() {
    for (const grade of Grades) {
      yield this.review(grade);
    }
  }
  review(grade) {
    const { state } = this.last;
    let item;
    this.checkGrade(grade);
    switch (state) {
      case State.New:
        item = this.newState(grade);
        break;
      case State.Learning:
      case State.Relearning:
        item = this.learningState(grade);
        break;
      case State.Review:
        item = this.reviewState(grade);
        break;
    }
    return item;
  }
  buildLog(rating) {
    const { last_review, due, elapsed_days } = this.last;
    return {
      rating,
      state: this.current.state,
      due: last_review || due,
      stability: this.current.stability,
      difficulty: this.current.difficulty,
      elapsed_days: this.elapsed_days,
      last_elapsed_days: elapsed_days,
      scheduled_days: this.current.scheduled_days,
      learning_steps: this.current.learning_steps,
      review: this.review_time
    };
  }
};
var Alea = class {
  constructor(seed) {
    __publicField(this, "c");
    __publicField(this, "s0");
    __publicField(this, "s1");
    __publicField(this, "s2");
    const mash = Mash();
    this.c = 1;
    this.s0 = mash(" ");
    this.s1 = mash(" ");
    this.s2 = mash(" ");
    if (seed == null) seed = Date.now();
    this.s0 -= mash(seed);
    if (this.s0 < 0) this.s0 += 1;
    this.s1 -= mash(seed);
    if (this.s1 < 0) this.s1 += 1;
    this.s2 -= mash(seed);
    if (this.s2 < 0) this.s2 += 1;
  }
  next() {
    const t = 2091639 * this.s0 + this.c * 23283064365386963e-26;
    this.s0 = this.s1;
    this.s1 = this.s2;
    this.c = t | 0;
    this.s2 = t - this.c;
    return this.s2;
  }
  set state(state) {
    this.c = state.c;
    this.s0 = state.s0;
    this.s1 = state.s1;
    this.s2 = state.s2;
  }
  get state() {
    return {
      c: this.c,
      s0: this.s0,
      s1: this.s1,
      s2: this.s2
    };
  }
};
function Mash() {
  let n = 4022871197;
  return function mash(data) {
    data = String(data);
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 4294967296;
    }
    return (n >>> 0) * 23283064365386963e-26;
  };
}
function alea(seed) {
  const xg = new Alea(seed);
  const prng = () => xg.next();
  prng.int32 = () => xg.next() * 4294967296 | 0;
  prng.double = () => prng() + (prng() * 2097152 | 0) * 11102230246251565e-32;
  prng.state = () => xg.state;
  prng.importState = (state) => {
    xg.state = state;
    return prng;
  };
  return prng;
}
var version = "5.4.2";
var default_request_retention = 0.9;
var default_maximum_interval = 36500;
var default_enable_fuzz = false;
var default_enable_short_term = true;
var default_learning_steps = Object.freeze([
  "1m",
  "10m"
]);
var default_relearning_steps = Object.freeze([
  "10m"
]);
var FSRSVersion = `v${version} using FSRS-6.0`;
var S_MIN = 1e-3;
var S_MAX = 36500;
var INIT_S_MAX = 100;
var FSRS5_DEFAULT_DECAY = 0.5;
var FSRS6_DEFAULT_DECAY = 0.1542;
var default_w = Object.freeze([
  0.212,
  1.2931,
  2.3065,
  8.2956,
  6.4133,
  0.8334,
  3.0194,
  1e-3,
  1.8722,
  0.1666,
  0.796,
  1.4835,
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912,
  0.0658,
  FSRS6_DEFAULT_DECAY
]);
var W17_W18_Ceiling = 2;
var CLAMP_PARAMETERS = (w17_w18_ceiling, enable_short_term = default_enable_short_term) => [
  [S_MIN, INIT_S_MAX],
  [S_MIN, INIT_S_MAX],
  [S_MIN, INIT_S_MAX],
  [S_MIN, INIT_S_MAX],
  [1, 10],
  [1e-3, 4],
  [1e-3, 4],
  [1e-3, 0.75],
  [0, 4.5],
  [0, 0.8],
  [1e-3, 3.5],
  [1e-3, 5],
  [1e-3, 0.25],
  [1e-3, 0.9],
  [0, 4],
  [0, 1],
  [1, 6],
  [0, w17_w18_ceiling],
  [0, w17_w18_ceiling],
  [
    enable_short_term ? 0.01 : 0,
    0.8
  ],
  [0.1, 0.8]
];
var clipParameters = (parameters, numRelearningSteps, enableShortTerm = default_enable_short_term) => {
  const clip = CLAMP_PARAMETERS(W17_W18_Ceiling, enableShortTerm).slice(
    0,
    parameters.length
  );
  if (Math.max(0, numRelearningSteps) > 1) {
    const w11 = clamp(parameters[11] || 0, clip[11][0], clip[11][1]);
    const w13 = clamp(parameters[13] || 0, clip[13][0], clip[13][1]);
    const w14 = clamp(parameters[14] || 0, clip[14][0], clip[14][1]);
    const value = -(Math.log(w11) + Math.log(Math.pow(2, w13) - 1) + w14 * 0.3) / numRelearningSteps;
    const w17_w18_ceiling = clamp(
      roundTo(Math.sqrt(Math.max(value, 0)), 8),
      0.01,
      W17_W18_Ceiling
    );
    if (clip[17]) clip[17] = [clip[17][0], w17_w18_ceiling];
    if (clip[18]) clip[18] = [clip[18][0], w17_w18_ceiling];
  }
  return clip.map(
    ([min, max], index) => clamp(parameters[index] || 0, min, max)
  );
};
var migrateParameters = (parameters, numRelearningSteps = 0, enableShortTerm = default_enable_short_term) => {
  if (parameters === void 0) {
    return [...default_w];
  }
  switch (parameters.length) {
    case 21:
      return clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      );
    case 19:
      console.debug("[FSRS-6]auto fill w from 19 to 21 length");
      return clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      ).concat([0, FSRS5_DEFAULT_DECAY]);
    case 17: {
      const w = clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      );
      w[4] = +(w[5] * 2 + w[4]).toFixed(8);
      w[5] = +(Math.log(w[5] * 3 + 1) / 3).toFixed(8);
      w[6] = +(w[6] + 0.5).toFixed(8);
      console.debug("[FSRS-6]auto fill w from 17 to 21 length");
      return w.concat([0, 0, 0, FSRS5_DEFAULT_DECAY]);
    }
    default:
      console.warn("[FSRS]Invalid parameters length, using default parameters");
      return [...default_w];
  }
};
var generatorParameters = (props) => {
  var _a2, _b;
  const learning_steps = Array.isArray(props == null ? void 0 : props.learning_steps) ? props.learning_steps : default_learning_steps;
  const relearning_steps = Array.isArray(props == null ? void 0 : props.relearning_steps) ? props.relearning_steps : default_relearning_steps;
  const enable_short_term = (_a2 = props == null ? void 0 : props.enable_short_term) != null ? _a2 : default_enable_short_term;
  const w = migrateParameters(
    props == null ? void 0 : props.w,
    relearning_steps.length,
    enable_short_term
  );
  return {
    request_retention: (props == null ? void 0 : props.request_retention) || default_request_retention,
    maximum_interval: (props == null ? void 0 : props.maximum_interval) || default_maximum_interval,
    w,
    enable_fuzz: (_b = props == null ? void 0 : props.enable_fuzz) != null ? _b : default_enable_fuzz,
    enable_short_term,
    learning_steps,
    relearning_steps
  };
};
function createEmptyCard(now, afterHandler) {
  const emptyCard = {
    due: now ? TypeConvert.time(now) : /* @__PURE__ */ new Date(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    state: State.New,
    last_review: void 0
  };
  if (afterHandler && typeof afterHandler === "function") {
    return afterHandler(emptyCard);
  } else {
    return emptyCard;
  }
}
var computeDecayFactor = (decayOrParams) => {
  const decay = typeof decayOrParams === "number" ? -decayOrParams : -decayOrParams[20];
  const factor = Math.exp(Math.pow(decay, -1) * Math.log(0.9)) - 1;
  return { decay, factor: roundTo(factor, 8) };
};
function forgetting_curve(decayOrParams, elapsed_days, stability) {
  const { decay, factor } = computeDecayFactor(decayOrParams);
  return roundTo(Math.pow(1 + factor * elapsed_days / stability, decay), 8);
}
var FSRSAlgorithm = class {
  constructor(params) {
    __publicField(this, "param");
    __publicField(this, "intervalModifier");
    __publicField(this, "_seed");
    __publicField(this, "prepare_parameters", (params) => {
      const generated = generatorParameters(params);
      generated.w = clipParameters(
        Array.from(generated.w),
        generated.relearning_steps.length,
        generated.enable_short_term
      );
      return generated;
    });
    /**
     * The formula used is :
     * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{9 \cdot S})^{\text{DECAY}}$$
     * @param {number} elapsed_days t days since the last review
     * @param {number} stability Stability (interval when R=90%)
     * @return {number} r Retrievability (probability of recall)
     */
    __publicField(this, "forgetting_curve");
    this.param = new Proxy(
      this.prepare_parameters(params),
      this.params_handler_proxy()
    );
    this.intervalModifier = this.calculate_interval_modifier(
      this.param.request_retention
    );
    this.forgetting_curve = forgetting_curve.bind(this, this.param.w);
  }
  get interval_modifier() {
    return this.intervalModifier;
  }
  set seed(seed) {
    this._seed = seed;
  }
  /**
   * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-5
   *
   * The formula used is: $$I(r,s) = (r^{\frac{1}{DECAY}} - 1) / FACTOR \times s$$
   * @param request_retention 0<request_retention<=1,Requested retention rate
   * @throws {Error} Requested retention rate should be in the range (0,1]
   */
  calculate_interval_modifier(request_retention) {
    if (request_retention <= 0 || request_retention > 1) {
      throw new FSRSValidationError(
        "Requested retention rate should be in the range (0,1]"
      );
    }
    const { decay, factor } = computeDecayFactor(this.param.w);
    return roundTo((Math.pow(request_retention, 1 / decay) - 1) / factor, 8);
  }
  /**
   * Get the parameters of the algorithm.
   */
  get parameters() {
    return this.param;
  }
  /**
   * Set the parameters of the algorithm.
   * @param params Partial<FSRSParameters>
   */
  set parameters(params) {
    this.update_parameters(params);
  }
  params_handler_proxy() {
    const _this = this;
    return {
      set: function(target, prop, value) {
        if (prop === "request_retention" && Number.isFinite(value)) {
          _this.intervalModifier = _this.calculate_interval_modifier(
            Number(value)
          );
        } else if (prop === "w") {
          value = migrateParameters(
            value,
            target.relearning_steps.length,
            target.enable_short_term
          );
          value = clipParameters(
            Array.from(value),
            target.relearning_steps.length,
            target.enable_short_term
          );
          _this.forgetting_curve = forgetting_curve.bind(this, value);
          _this.intervalModifier = _this.calculate_interval_modifier(
            Number(target.request_retention)
          );
        }
        Reflect.set(target, prop, value);
        return true;
      }
    };
  }
  update_parameters(params) {
    const _params = this.prepare_parameters(params);
    for (const key in _params) {
      const paramKey = key;
      this.param[paramKey] = _params[paramKey];
    }
  }
  /**
     * The formula used is :
     * $$ S_0(G) = w_{G-1}$$
     * $$S_0 = \max \lbrace S_0,0.1\rbrace $$
  
     * @param g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
     * @return Stability (interval when R=90%)
     */
  init_stability(g) {
    return Math.max(this.param.w[g - 1], 0.1);
  }
  /**
   * The formula used is :
   * $$D_0(G) = w_4 - e^{(G-1) \cdot w_5} + 1 $$
   * $$D_0 = \min \lbrace \max \lbrace D_0(G),1 \rbrace,10 \rbrace$$
   * where the $$D_0(1)=w_4$$ when the first rating is good.
   *
   * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return {number} Difficulty $$D \in [1,10]$$
   */
  init_difficulty(g) {
    const w = this.param.w;
    const d = w[4] - Math.exp((g - 1) * w[5]) + 1;
    return roundTo(d, 8);
  }
  /**
   * If fuzzing is disabled or ivl is less than 2.5, it returns the original interval.
   * @param {number} ivl - The interval to be fuzzed.
   * @param {number} elapsed_days t days since the last review
   * @return {number} - The fuzzed interval.
   **/
  apply_fuzz(ivl, elapsed_days) {
    if (!this.param.enable_fuzz || ivl < 2.5) return Math.round(ivl);
    const generator = alea(this._seed);
    const fuzz_factor = generator();
    const { min_ivl, max_ivl } = get_fuzz_range(
      ivl,
      elapsed_days,
      this.param.maximum_interval
    );
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl);
  }
  /**
   *   @see The formula used is : {@link FSRSAlgorithm.calculate_interval_modifier}
   *   @param {number} s - Stability (interval when R=90%)
   *   @param {number} elapsed_days t days since the last review
   */
  next_interval(s, elapsed_days) {
    const newInterval = Math.min(
      Math.max(1, Math.round(s * this.intervalModifier)),
      this.param.maximum_interval
    );
    return this.apply_fuzz(newInterval, elapsed_days);
  }
  /**
   * @see https://github.com/open-spaced-repetition/fsrs4anki/issues/697
   */
  linear_damping(delta_d, old_d) {
    return roundTo(delta_d * (10 - old_d) / 9, 8);
  }
  /**
   * The formula used is :
   * $$\text{delta}_d = -w_6 \cdot (g - 3)$$
   * $$\text{next}_d = D + \text{linear damping}(\text{delta}_d , D)$$
   * $$D^\prime(D,R) = w_7 \cdot D_0(4) +(1 - w_7) \cdot \text{next}_d$$
   * @param {number} d Difficulty $$D \in [1,10]$$
   * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return {number} $$\text{next}_D$$
   */
  next_difficulty(d, g) {
    const delta_d = -this.param.w[6] * (g - 3);
    const next_d = d + this.linear_damping(delta_d, d);
    return clamp(
      this.mean_reversion(this.init_difficulty(Rating.Easy), next_d),
      1,
      10
    );
  }
  /**
   * The formula used is :
   * $$w_7 \cdot \text{init} +(1 - w_7) \cdot \text{current}$$
   * @param {number} init $$w_2 : D_0(3) = w_2 + (R-2) \cdot w_3= w_2$$
   * @param {number} current $$D - w_6 \cdot (R - 2)$$
   * @return {number} difficulty
   */
  mean_reversion(init, current) {
    const w = this.param.w;
    return roundTo(w[7] * init + (1 - w[7]) * current, 8);
  }
  /**
   * The formula used is :
   * $$S^\prime_r(D,S,R,G) = S\cdot(e^{w_8}\cdot (11-D)\cdot S^{-w_9}\cdot(e^{w_{10}\cdot(1-R)}-1)\cdot w_{15}(\text{if} G=2) \cdot w_{16}(\text{if} G=4)+1)$$
   * @param {number} d Difficulty D \in [1,10]
   * @param {number} s Stability (interval when R=90%)
   * @param {number} r Retrievability (probability of recall)
   * @param {Grade} g Grade (Rating[0.again,1.hard,2.good,3.easy])
   * @return {number} S^\prime_r new stability after recall
   */
  next_recall_stability(d, s, r, g) {
    const w = this.param.w;
    const hard_penalty = Rating.Hard === g ? w[15] : 1;
    const easy_bound = Rating.Easy === g ? w[16] : 1;
    return roundTo(
      clamp(
        s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard_penalty * easy_bound),
        S_MIN,
        36500
      ),
      8
    );
  }
  /**
   * The formula used is :
   * $$S^\prime_f(D,S,R) = w_{11}\cdot D^{-w_{12}}\cdot ((S+1)^{w_{13}}-1) \cdot e^{w_{14}\cdot(1-R)}$$
   * enable_short_term = true : $$S^\prime_f \in \min \lbrace \max \lbrace S^\prime_f,0.01\rbrace, \frac{S}{e^{w_{17} \cdot w_{18}}} \rbrace$$
   * enable_short_term = false : $$S^\prime_f \in \min \lbrace \max \lbrace S^\prime_f,0.01\rbrace, S \rbrace$$
   * @param {number} d Difficulty D \in [1,10]
   * @param {number} s Stability (interval when R=90%)
   * @param {number} r Retrievability (probability of recall)
   * @return {number} S^\prime_f new stability after forgetting
   */
  next_forget_stability(d, s, r) {
    const w = this.param.w;
    return roundTo(
      clamp(
        w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]),
        S_MIN,
        36500
      ),
      8
    );
  }
  /**
   * The formula used is :
   * $$S^\prime_s(S,G) = S \cdot e^{w_{17} \cdot (G-3+w_{18})}$$
   * @param {number} s Stability (interval when R=90%)
   * @param {Grade} g Grade (Rating[0.again,1.hard,2.good,3.easy])
   */
  next_short_term_stability(s, g) {
    const w = this.param.w;
    const sinc = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
    const maskedSinc = g >= Rating.Hard ? Math.max(sinc, 1) : sinc;
    return roundTo(clamp(s * maskedSinc, S_MIN, 36500), 8);
  }
  /**
   * Calculates the next state of memory based on the current state, time elapsed, and grade.
   *
   * @param memory_state - The current state of memory, which can be null.
   * @param t - The time elapsed since the last review.
   * @param {Rating} g Grade (Rating[0.Manual,1.Again,2.Hard,3.Good,4.Easy])
   * @param r - Optional retrievability value. If not provided, it will be calculated.
   * @returns The next state of memory with updated difficulty and stability.
   */
  next_state(memory_state, t, g, r) {
    const { difficulty: d, stability: s } = memory_state != null ? memory_state : {
      difficulty: 0,
      stability: 0
    };
    if (t < 0) {
      throw new FSRSValidationError(`Invalid delta_t "${t}"`);
    }
    if (g < 0 || g > 4) {
      throw new FSRSValidationError(`Invalid grade "${g}"`);
    }
    if (d === 0 && s === 0) {
      return {
        difficulty: clamp(this.init_difficulty(g), 1, 10),
        stability: this.init_stability(g)
      };
    }
    if (g === 0) {
      return {
        difficulty: d,
        stability: s
      };
    }
    if (d < 1 || s < S_MIN) {
      throw new FSRSValidationError(
        `Invalid memory state { difficulty: ${d}, stability: ${s} }`
      );
    }
    const w = this.param.w;
    r = typeof r === "number" ? r : this.forgetting_curve(t, s);
    let new_s;
    if (t === 0 && this.param.enable_short_term) {
      new_s = this.next_short_term_stability(s, g);
    } else if (g === 1) {
      const s_after_fail = this.next_forget_stability(d, s, r);
      let [w_17, w_18] = [0, 0];
      if (this.param.enable_short_term) {
        w_17 = w[17];
        w_18 = w[18];
      }
      const next_s_min = s / Math.exp(w_17 * w_18);
      new_s = clamp(roundTo(next_s_min, 8), S_MIN, s_after_fail);
    } else {
      new_s = this.next_recall_stability(d, s, r, g);
    }
    const new_d = this.next_difficulty(d, g);
    return { difficulty: new_d, stability: new_s };
  }
};
var BasicScheduler = class extends AbstractScheduler {
  constructor(card, now, algorithm, strategies) {
    super(card, now, algorithm, strategies);
    __publicField(this, "learningStepsStrategy");
    let learningStepStrategy = BasicLearningStepsStrategy;
    if (this.strategies) {
      const custom_strategy = this.strategies.get(StrategyMode.LEARNING_STEPS);
      if (custom_strategy) {
        learningStepStrategy = custom_strategy;
      }
    }
    this.learningStepsStrategy = learningStepStrategy;
  }
  getLearningInfo(card, grade) {
    var _a2, _b, _c, _d;
    const parameters = this.algorithm.parameters;
    card.learning_steps = card.learning_steps || 0;
    const steps_strategy = this.learningStepsStrategy(
      parameters,
      card.state,
      card.learning_steps
    );
    const scheduled_minutes = Math.max(
      0,
      (_b = (_a2 = steps_strategy[grade]) == null ? void 0 : _a2.scheduled_minutes) != null ? _b : 0
    );
    const next_steps = Math.max(0, (_d = (_c = steps_strategy[grade]) == null ? void 0 : _c.next_step) != null ? _d : 0);
    return {
      scheduled_minutes,
      next_steps
    };
  }
  /**
   * @description This function applies the learning steps based on the current card's state and grade.
   */
  applyLearningSteps(nextCard, grade, to_state) {
    const { scheduled_minutes, next_steps } = this.getLearningInfo(
      this.current,
      grade
    );
    if (scheduled_minutes > 0 && scheduled_minutes < 1440) {
      nextCard.learning_steps = next_steps;
      nextCard.scheduled_days = 0;
      nextCard.state = to_state;
      nextCard.due = date_scheduler(
        this.review_time,
        Math.round(scheduled_minutes),
        false
        /** true:days false: minute */
      );
    } else {
      nextCard.state = State.Review;
      if (scheduled_minutes >= 1440) {
        nextCard.learning_steps = next_steps;
        nextCard.due = date_scheduler(
          this.review_time,
          Math.round(scheduled_minutes),
          false
          /** true:days false: minute */
        );
        nextCard.scheduled_days = Math.floor(scheduled_minutes / 1440);
      } else {
        nextCard.learning_steps = 0;
        const interval = this.algorithm.next_interval(
          nextCard.stability,
          this.elapsed_days
        );
        nextCard.scheduled_days = interval;
        nextCard.due = date_scheduler(this.review_time, interval, true);
      }
    }
  }
  newState(grade) {
    const exist = this.next.get(grade);
    if (exist) {
      return exist;
    }
    const next = this.next_ds(this.elapsed_days, grade);
    this.applyLearningSteps(next, grade, State.Learning);
    const item = {
      card: next,
      log: this.buildLog(grade)
    };
    this.next.set(grade, item);
    return item;
  }
  learningState(grade) {
    const exist = this.next.get(grade);
    if (exist) {
      return exist;
    }
    const next = this.next_ds(this.elapsed_days, grade);
    this.applyLearningSteps(
      next,
      grade,
      this.last.state
      /** Learning or Relearning */
    );
    const item = {
      card: next,
      log: this.buildLog(grade)
    };
    this.next.set(grade, item);
    return item;
  }
  reviewState(grade) {
    const exist = this.next.get(grade);
    if (exist) {
      return exist;
    }
    const interval = this.elapsed_days;
    const retrievability = this.algorithm.forgetting_curve(
      interval,
      this.current.stability
    );
    const next_again = this.next_ds(interval, Rating.Again, retrievability);
    const next_hard = this.next_ds(interval, Rating.Hard, retrievability);
    const next_good = this.next_ds(interval, Rating.Good, retrievability);
    const next_easy = this.next_ds(interval, Rating.Easy, retrievability);
    this.next_interval(next_hard, next_good, next_easy, interval);
    this.next_state(next_hard, next_good, next_easy);
    this.applyLearningSteps(next_again, Rating.Again, State.Relearning);
    next_again.lapses += 1;
    const item_again = {
      card: next_again,
      log: this.buildLog(Rating.Again)
    };
    const item_hard = {
      card: next_hard,
      log: super.buildLog(Rating.Hard)
    };
    const item_good = {
      card: next_good,
      log: super.buildLog(Rating.Good)
    };
    const item_easy = {
      card: next_easy,
      log: super.buildLog(Rating.Easy)
    };
    this.next.set(Rating.Again, item_again);
    this.next.set(Rating.Hard, item_hard);
    this.next.set(Rating.Good, item_good);
    this.next.set(Rating.Easy, item_easy);
    return this.next.get(grade);
  }
  /**
   * Review next_ds
   */
  next_ds(t, g, r) {
    const next_state = this.algorithm.next_state(
      {
        difficulty: this.current.difficulty,
        stability: this.current.stability
      },
      t,
      g,
      r
    );
    const card = TypeConvert.card(this.current);
    card.difficulty = next_state.difficulty;
    card.stability = next_state.stability;
    return card;
  }
  /**
   * Review next_interval
   */
  next_interval(next_hard, next_good, next_easy, interval) {
    let hard_interval, good_interval;
    hard_interval = this.algorithm.next_interval(next_hard.stability, interval);
    good_interval = this.algorithm.next_interval(next_good.stability, interval);
    hard_interval = Math.min(hard_interval, good_interval);
    good_interval = Math.max(good_interval, hard_interval + 1);
    const easy_interval = Math.max(
      this.algorithm.next_interval(next_easy.stability, interval),
      good_interval + 1
    );
    next_hard.scheduled_days = hard_interval;
    next_hard.due = date_scheduler(this.review_time, hard_interval, true);
    next_good.scheduled_days = good_interval;
    next_good.due = date_scheduler(this.review_time, good_interval, true);
    next_easy.scheduled_days = easy_interval;
    next_easy.due = date_scheduler(this.review_time, easy_interval, true);
  }
  /**
   * Review next_state
   */
  next_state(next_hard, next_good, next_easy) {
    next_hard.state = State.Review;
    next_hard.learning_steps = 0;
    next_good.state = State.Review;
    next_good.learning_steps = 0;
    next_easy.state = State.Review;
    next_easy.learning_steps = 0;
  }
};
var LongTermScheduler = class extends AbstractScheduler {
  newState(grade) {
    const exist = this.next.get(grade);
    if (exist) {
      return exist;
    }
    this.current.scheduled_days = 0;
    this.current.elapsed_days = 0;
    const first_interval = 0;
    const next_again = this.next_ds(first_interval, Rating.Again);
    const next_hard = this.next_ds(first_interval, Rating.Hard);
    const next_good = this.next_ds(first_interval, Rating.Good);
    const next_easy = this.next_ds(first_interval, Rating.Easy);
    this.next_interval(
      next_again,
      next_hard,
      next_good,
      next_easy,
      first_interval
    );
    this.next_state(next_again, next_hard, next_good, next_easy);
    this.update_next(next_again, next_hard, next_good, next_easy);
    return this.next.get(grade);
  }
  next_ds(t, g, r) {
    const next_state = this.algorithm.next_state(
      {
        difficulty: this.current.difficulty,
        stability: this.current.stability
      },
      t,
      g,
      r
    );
    const card = TypeConvert.card(this.current);
    card.difficulty = next_state.difficulty;
    card.stability = next_state.stability;
    return card;
  }
  /**
   * @see https://github.com/open-spaced-repetition/ts-fsrs/issues/98#issuecomment-2241923194
   */
  learningState(grade) {
    return this.reviewState(grade);
  }
  reviewState(grade) {
    const exist = this.next.get(grade);
    if (exist) {
      return exist;
    }
    const interval = this.elapsed_days;
    const retrievability = this.algorithm.forgetting_curve(
      interval,
      this.current.stability
    );
    const next_again = this.next_ds(interval, Rating.Again, retrievability);
    const next_hard = this.next_ds(interval, Rating.Hard, retrievability);
    const next_good = this.next_ds(interval, Rating.Good, retrievability);
    const next_easy = this.next_ds(interval, Rating.Easy, retrievability);
    this.next_interval(next_again, next_hard, next_good, next_easy, interval);
    this.next_state(next_again, next_hard, next_good, next_easy);
    next_again.lapses += 1;
    this.update_next(next_again, next_hard, next_good, next_easy);
    return this.next.get(grade);
  }
  /**
   * Review/New next_interval
   */
  next_interval(next_again, next_hard, next_good, next_easy, interval) {
    let again_interval, hard_interval, good_interval, easy_interval;
    again_interval = this.algorithm.next_interval(
      next_again.stability,
      interval
    );
    hard_interval = this.algorithm.next_interval(next_hard.stability, interval);
    good_interval = this.algorithm.next_interval(next_good.stability, interval);
    easy_interval = this.algorithm.next_interval(next_easy.stability, interval);
    again_interval = Math.min(again_interval, hard_interval);
    hard_interval = Math.max(hard_interval, again_interval + 1);
    good_interval = Math.max(good_interval, hard_interval + 1);
    easy_interval = Math.max(easy_interval, good_interval + 1);
    next_again.scheduled_days = again_interval;
    next_again.due = date_scheduler(this.review_time, again_interval, true);
    next_hard.scheduled_days = hard_interval;
    next_hard.due = date_scheduler(this.review_time, hard_interval, true);
    next_good.scheduled_days = good_interval;
    next_good.due = date_scheduler(this.review_time, good_interval, true);
    next_easy.scheduled_days = easy_interval;
    next_easy.due = date_scheduler(this.review_time, easy_interval, true);
  }
  /**
   * Review/New next_state
   */
  next_state(next_again, next_hard, next_good, next_easy) {
    next_again.state = State.Review;
    next_again.learning_steps = 0;
    next_hard.state = State.Review;
    next_hard.learning_steps = 0;
    next_good.state = State.Review;
    next_good.learning_steps = 0;
    next_easy.state = State.Review;
    next_easy.learning_steps = 0;
  }
  update_next(next_again, next_hard, next_good, next_easy) {
    const item_again = {
      card: next_again,
      log: this.buildLog(Rating.Again)
    };
    const item_hard = {
      card: next_hard,
      log: super.buildLog(Rating.Hard)
    };
    const item_good = {
      card: next_good,
      log: super.buildLog(Rating.Good)
    };
    const item_easy = {
      card: next_easy,
      log: super.buildLog(Rating.Easy)
    };
    this.next.set(Rating.Again, item_again);
    this.next.set(Rating.Hard, item_hard);
    this.next.set(Rating.Good, item_good);
    this.next.set(Rating.Easy, item_easy);
  }
};
var Reschedule = class {
  /**
   * Creates an instance of the `Reschedule` class.
   * @param fsrs - An instance of the FSRS class used for scheduling.
   */
  constructor(fsrs2) {
    __publicField(this, "fsrs");
    this.fsrs = fsrs2;
  }
  /**
   * Replays a review for a card and determines the next review date based on the given rating.
   * @param card - The card being reviewed.
   * @param reviewed - The date the card was reviewed.
   * @param rating - The grade given to the card during the review.
   * @returns A `RecordLogItem` containing the updated card and review log.
   */
  replay(card, reviewed, rating) {
    return this.fsrs.next(card, reviewed, rating);
  }
  /**
   * Processes a manual review for a card, allowing for custom state, stability, difficulty, and due date.
   * @param card - The card being reviewed.
   * @param state - The state of the card after the review.
   * @param reviewed - The date the card was reviewed.
   * @param elapsed_days - The number of days since the last review.
   * @param stability - (Optional) The stability of the card.
   * @param difficulty - (Optional) The difficulty of the card.
   * @param due - (Optional) The due date for the next review.
   * @returns A `RecordLogItem` containing the updated card and review log.
   * @throws Will throw an error if the state or due date is not provided when required.
   */
  handleManualRating(card, state, reviewed, elapsed_days, stability, difficulty, due) {
    if (typeof state === "undefined") {
      throw new FSRSValidationError(
        "reschedule: state is required for manual rating"
      );
    }
    let log;
    let next_card;
    if (state === State.New) {
      log = {
        rating: Rating.Manual,
        state,
        due: due != null ? due : reviewed,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days,
        last_elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        learning_steps: card.learning_steps,
        review: reviewed
      };
      next_card = createEmptyCard(reviewed);
      next_card.last_review = reviewed;
    } else {
      if (typeof due === "undefined") {
        throw new FSRSValidationError(
          "reschedule: due is required for manual rating"
        );
      }
      const scheduled_days = date_diff(due, reviewed, "days");
      log = {
        rating: Rating.Manual,
        state: card.state,
        due: card.last_review || card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days,
        last_elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        learning_steps: card.learning_steps,
        review: reviewed
      };
      next_card = {
        ...card,
        state,
        due,
        last_review: reviewed,
        stability: stability || card.stability,
        difficulty: difficulty || card.difficulty,
        elapsed_days,
        scheduled_days,
        reps: card.reps + 1
      };
    }
    return { card: next_card, log };
  }
  /**
   * Reschedules a card based on its review history.
   *
   * @param current_card - The card to be rescheduled.
   * @param reviews - An array of review history objects.
   * @returns An array of record log items representing the rescheduling process.
   */
  reschedule(current_card, reviews) {
    const collections = [];
    let cur_card = createEmptyCard(current_card.due);
    for (const review of reviews) {
      let item;
      review.review = TypeConvert.time(review.review);
      if (review.rating === Rating.Manual) {
        let interval = 0;
        if (cur_card.state !== State.New && cur_card.last_review) {
          interval = date_diff(review.review, cur_card.last_review, "days");
        }
        item = this.handleManualRating(
          cur_card,
          review.state,
          review.review,
          interval,
          review.stability,
          review.difficulty,
          review.due ? TypeConvert.time(review.due) : void 0
        );
      } else {
        item = this.replay(cur_card, review.review, review.rating);
      }
      collections.push(item);
      cur_card = item.card;
    }
    return collections;
  }
  calculateManualRecord(current_card, now, record_log_item, update_memory) {
    if (!record_log_item) {
      return null;
    }
    const { card: reschedule_card, log } = record_log_item;
    const cur_card = TypeConvert.card(current_card);
    if (cur_card.due.getTime() === reschedule_card.due.getTime()) {
      return null;
    }
    cur_card.scheduled_days = date_diff(
      reschedule_card.due,
      cur_card.due,
      "days"
    );
    return this.handleManualRating(
      cur_card,
      reschedule_card.state,
      TypeConvert.time(now),
      log.elapsed_days,
      update_memory ? reschedule_card.stability : void 0,
      update_memory ? reschedule_card.difficulty : void 0,
      reschedule_card.due
    );
  }
};
function applyAfterHandler(value, afterHandler) {
  return typeof afterHandler === "function" ? afterHandler(value) : value;
}
var FSRS = class extends FSRSAlgorithm {
  constructor(param) {
    super(param);
    __publicField(this, "strategyHandler", /* @__PURE__ */ new Map());
    __publicField(this, "Scheduler");
    const { enable_short_term } = this.parameters;
    this.Scheduler = enable_short_term ? BasicScheduler : LongTermScheduler;
  }
  params_handler_proxy() {
    const _this = this;
    return {
      set: function(target, prop, value) {
        if (prop === "request_retention" && Number.isFinite(value)) {
          _this.intervalModifier = _this.calculate_interval_modifier(
            Number(value)
          );
        } else if (prop === "enable_short_term") {
          _this.Scheduler = value === true ? BasicScheduler : LongTermScheduler;
        } else if (prop === "w") {
          value = migrateParameters(
            value,
            target.relearning_steps.length,
            target.enable_short_term
          );
          value = clipParameters(
            Array.from(value),
            target.relearning_steps.length,
            target.enable_short_term
          );
          _this.forgetting_curve = forgetting_curve.bind(this, value);
          _this.intervalModifier = _this.calculate_interval_modifier(
            Number(target.request_retention)
          );
        }
        Reflect.set(target, prop, value);
        return true;
      }
    };
  }
  useStrategy(mode, handler) {
    this.strategyHandler.set(mode, handler);
    return this;
  }
  clearStrategy(mode) {
    if (mode) {
      this.strategyHandler.delete(mode);
    } else {
      this.strategyHandler.clear();
    }
    return this;
  }
  getScheduler(card, now) {
    const schedulerStrategy = this.strategyHandler.get(
      StrategyMode.SCHEDULER
    );
    const Scheduler = schedulerStrategy || this.Scheduler;
    const instance = new Scheduler(card, now, this, this.strategyHandler);
    return instance;
  }
  /**
   * Display the collection of cards and logs for the four scenarios after scheduling the card at the current time.
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```typescript
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLog = f.repeat(card, new Date());
   * ```
   * @example
   * ```typescript
   * interface RevLogUnchecked
   *   extends Omit<ReviewLog, "due" | "review" | "state" | "rating"> {
   *   cid: string;
   *   due: Date | number;
   *   state: StateType;
   *   review: Date | number;
   *   rating: RatingType;
   * }
   *
   * interface RepeatRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked;
   * }
   *
   * function repeatAfterHandler(recordLog: RecordLog) {
   *     const record: { [key in Grade]: RepeatRecordLog } = {} as {
   *       [key in Grade]: RepeatRecordLog;
   *     };
   *     for (const grade of Grades) {
   *       record[grade] = {
   *         card: {
   *           ...(recordLog[grade].card as Card & { cid: string }),
   *           due: recordLog[grade].card.due.getTime(),
   *           state: State[recordLog[grade].card.state] as StateType,
   *           last_review: recordLog[grade].card.last_review
   *             ? recordLog[grade].card.last_review!.getTime()
   *             : null,
   *         },
   *         log: {
   *           ...recordLog[grade].log,
   *           cid: (recordLog[grade].card as Card & { cid: string }).cid,
   *           due: recordLog[grade].log.due.getTime(),
   *           review: recordLog[grade].log.review.getTime(),
   *           state: State[recordLog[grade].log.state] as StateType,
   *           rating: Rating[recordLog[grade].log.rating] as RatingType,
   *         },
   *       };
   *     }
   *     return record;
   * }
   * const card: Card = createEmptyCard(new Date(), cardAfterHandler); //see method:  createEmptyCard
   * const f = fsrs();
   * const recordLog = f.repeat(card, new Date(), repeatAfterHandler);
   * ```
   */
  repeat(card, now, afterHandler) {
    const instance = this.getScheduler(card, now);
    const recordLog = instance.preview();
    return applyAfterHandler(recordLog, afterHandler);
  }
  /**
   * Display the collection of cards and logs for the card scheduled at the current time, after applying a specific grade rating.
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param grade Rating of the review (Again, Hard, Good, Easy)
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```typescript
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLogItem = f.next(card, new Date(), Rating.Again);
   * ```
   * @example
   * ```typescript
   * interface RevLogUnchecked
   *   extends Omit<ReviewLog, "due" | "review" | "state" | "rating"> {
   *   cid: string;
   *   due: Date | number;
   *   state: StateType;
   *   review: Date | number;
   *   rating: RatingType;
   * }
   *
   * interface NextRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked;
   * }
   *
  function nextAfterHandler(recordLogItem: RecordLogItem) {
    const recordItem = {
      card: {
        ...(recordLogItem.card as Card & { cid: string }),
        due: recordLogItem.card.due.getTime(),
        state: State[recordLogItem.card.state] as StateType,
        last_review: recordLogItem.card.last_review
          ? recordLogItem.card.last_review!.getTime()
          : null,
      },
      log: {
        ...recordLogItem.log,
        cid: (recordLogItem.card as Card & { cid: string }).cid,
        due: recordLogItem.log.due.getTime(),
        review: recordLogItem.log.review.getTime(),
        state: State[recordLogItem.log.state] as StateType,
        rating: Rating[recordLogItem.log.rating] as RatingType,
      },
    };
    return recordItem
  }
   * const card: Card = createEmptyCard(new Date(), cardAfterHandler); //see method:  createEmptyCard
   * const f = fsrs();
   * const recordLogItem = f.repeat(card, new Date(), Rating.Again, nextAfterHandler);
   * ```
   */
  next(card, now, grade, afterHandler) {
    const instance = this.getScheduler(card, now);
    const g = TypeConvert.rating(grade);
    if (g === Rating.Manual) {
      throw new FSRSValidationError("Cannot review a manual rating");
    }
    const recordLogItem = instance.review(g);
    return applyAfterHandler(recordLogItem, afterHandler);
  }
  /**
   * Get the retrievability of the card
   * @param card  Card to be processed
   * @param now  Current time or scheduled time
   * @param format  default:true , Convert the result to another type. (Optional)
   * @returns  The retrievability of the card,if format is true, the result is a string, otherwise it is a number
   */
  get_retrievability(card, now, format = true) {
    const processedCard = TypeConvert.card(card);
    now = now ? TypeConvert.time(now) : /* @__PURE__ */ new Date();
    const t = processedCard.state !== State.New ? Math.max(date_diff(now, processedCard.last_review, "days"), 0) : 0;
    const r = processedCard.state !== State.New ? this.forgetting_curve(t, +processedCard.stability.toFixed(8)) : 0;
    return format ? `${(r * 100).toFixed(2)}%` : r;
  }
  /**
   *
   * @param card Card to be processed
   * @param log last review log
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```typescript
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now);
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now);
   * const { card, log } = repeatFormAfterHandler[Rating.Hard];
   * const rollbackFromAfterHandler = f.rollback(card, log);
   * ```
   *
   * @example
   * ```typescript
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);  //see method: createEmptyCard
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler); //see method: fsrs.repeat()
   * const { card, log } = repeatFormAfterHandler[Rating.Hard];
   * const rollbackFromAfterHandler = f.rollback(card, log, cardAfterHandler);
   * ```
   */
  rollback(card, log, afterHandler) {
    const processedCard = TypeConvert.card(card);
    const processedLog = TypeConvert.review_log(log);
    if (processedLog.rating === Rating.Manual) {
      throw new FSRSValidationError("Cannot rollback a manual rating");
    }
    let last_due;
    let last_review;
    let last_lapses;
    switch (processedLog.state) {
      case State.New:
        last_due = processedLog.due;
        last_review = void 0;
        last_lapses = 0;
        break;
      case State.Learning:
      case State.Relearning:
      case State.Review:
        last_due = processedLog.review;
        last_review = processedLog.due;
        last_lapses = processedCard.lapses - (processedLog.rating === Rating.Again && processedLog.state === State.Review ? 1 : 0);
        break;
    }
    const prevCard = {
      ...processedCard,
      due: last_due,
      stability: processedLog.stability,
      difficulty: processedLog.difficulty,
      elapsed_days: processedLog.last_elapsed_days,
      scheduled_days: processedLog.scheduled_days,
      reps: Math.max(0, processedCard.reps - 1),
      lapses: Math.max(0, last_lapses),
      learning_steps: processedLog.learning_steps,
      state: processedLog.state,
      last_review
    };
    return applyAfterHandler(prevCard, afterHandler);
  }
  /**
   *
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param reset_count Should the review count information(reps,lapses) be reset. (Optional)
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```typescript
   * const now = new Date();
   * const f = fsrs();
   * const emptyCard = createEmptyCard(now);
   * const scheduling_cards = f.repeat(emptyCard, now);
   * const { card, log } = scheduling_cards[Rating.Hard];
   * const forgetCard = f.forget(card, new Date(), true);
   * ```
   *
   * @example
   * ```typescript
   * interface RepeatRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked; //see method: fsrs.repeat()
   * }
   *
   * function forgetAfterHandler(recordLogItem: RecordLogItem): RepeatRecordLog {
   *     return {
   *       card: {
   *         ...(recordLogItem.card as Card & { cid: string }),
   *         due: recordLogItem.card.due.getTime(),
   *         state: State[recordLogItem.card.state] as StateType,
   *         last_review: recordLogItem.card.last_review
   *           ? recordLogItem.card.last_review!.getTime()
   *           : null,
   *       },
   *       log: {
   *         ...recordLogItem.log,
   *         cid: (recordLogItem.card as Card & { cid: string }).cid,
   *         due: recordLogItem.log.due.getTime(),
   *         review: recordLogItem.log.review.getTime(),
   *         state: State[recordLogItem.log.state] as StateType,
   *         rating: Rating[recordLogItem.log.rating] as RatingType,
   *       },
   *     };
   * }
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler); //see method:  createEmptyCard
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler); //see method: fsrs.repeat()
   * const { card } = repeatFormAfterHandler[Rating.Hard];
   * const forgetFromAfterHandler = f.forget(card, date_scheduler(now, 1, true), false, forgetAfterHandler);
   * ```
   */
  forget(card, now, reset_count = false, afterHandler) {
    const processedCard = TypeConvert.card(card);
    now = TypeConvert.time(now);
    const scheduled_days = processedCard.state === State.New ? 0 : date_diff(now, processedCard.due, "days");
    const forget_log = {
      rating: Rating.Manual,
      state: processedCard.state,
      due: processedCard.due,
      stability: processedCard.stability,
      difficulty: processedCard.difficulty,
      elapsed_days: 0,
      last_elapsed_days: processedCard.elapsed_days,
      scheduled_days,
      learning_steps: processedCard.learning_steps,
      review: now
    };
    const forget_card = {
      ...processedCard,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: reset_count ? 0 : processedCard.reps,
      lapses: reset_count ? 0 : processedCard.lapses,
      learning_steps: 0,
      state: State.New,
      last_review: processedCard.last_review
    };
    const recordLogItem = { card: forget_card, log: forget_log };
    return applyAfterHandler(recordLogItem, afterHandler);
  }
  /**
   * Reschedules the current card and returns the rescheduled collections and reschedule item.
   *
   * @template T - The type of the record log item.
   * @param {CardInput | Card} current_card - The current card to be rescheduled.
   * @param {Array<FSRSHistory>} reviews - The array of FSRSHistory objects representing the reviews.
   * @param {Partial<RescheduleOptions<T>>} options - The optional reschedule options.
   * @returns {IReschedule<T>} - The rescheduled collections and reschedule item.
   *
   * @example
   * ```typescript
   * const f = fsrs()
   * const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
   * const reviews_at = [
   *   new Date(2024, 8, 13),
   *   new Date(2024, 8, 13),
   *   new Date(2024, 8, 17),
   *   new Date(2024, 8, 28),
   * ]
   *
   * const reviews: FSRSHistory[] = []
   * for (let i = 0; i < grades.length; i++) {
   *   reviews.push({
   *     rating: grades[i],
   *     review: reviews_at[i],
   *   })
   * }
   *
   * const results_short = scheduler.reschedule(
   *   createEmptyCard(),
   *   reviews,
   *   {
   *     skipManual: false,
   *   }
   * )
   * console.log(results_short)
   * ```
   */
  reschedule(current_card, reviews = [], options = {}) {
    const {
      recordLogHandler,
      reviewsOrderBy,
      skipManual = true,
      now = /* @__PURE__ */ new Date(),
      update_memory_state: updateMemoryState = false
    } = options;
    if (reviewsOrderBy && typeof reviewsOrderBy === "function") {
      reviews.sort(reviewsOrderBy);
    }
    if (skipManual) {
      reviews = reviews.filter((review) => review.rating !== Rating.Manual);
    }
    const rescheduleSvc = new Reschedule(this);
    const collections = rescheduleSvc.reschedule(
      options.first_card || createEmptyCard(),
      reviews
    );
    const len = collections.length;
    const cur_card = TypeConvert.card(current_card);
    const manual_item = rescheduleSvc.calculateManualRecord(
      cur_card,
      now,
      len ? collections[len - 1] : void 0,
      updateMemoryState
    );
    return {
      collections: typeof recordLogHandler === "function" ? collections.map(recordLogHandler) : collections,
      reschedule_item: manual_item ? applyAfterHandler(manual_item, recordLogHandler) : null
    };
  }
};
var fsrs = (params) => {
  return new FSRS(params || {});
};

// src/cards.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
var AGAIN_MS = 60 * 1e3;
var FSRS_IMPLEMENTATION_VERSION = "5.4.2";
var FSRS_PARAMETER_VERSION = "fsrs-6-defaults-v1";
var defaults = fsrs({ enable_fuzz: false }).parameters;
var FSRS_PARAMETERS = Object.freeze({
  ...defaults,
  w: Object.freeze([...defaults.w]),
  learning_steps: Object.freeze([...defaults.learning_steps]),
  relearning_steps: Object.freeze([...defaults.relearning_steps])
});
var MAX_INTERVAL_DAYS = FSRS_PARAMETERS.maximum_interval + 2;
var MAX_FRONT_LENGTH = 4e3;
var MAX_BACK_LENGTH = 5e4;
var MAX_DATE_MS = 864e13;
var MAX_ID_LENGTH = 256;
var MAX_SOURCE_PATH_LENGTH = 4096;
var GRADES = Object.freeze({ again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy });
var CardValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CardValidationError";
  }
};
function fail(message) {
  throw new CardValidationError(message);
}
function isRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function field(value, key, label2 = key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) fail(`Missing or invalid ${label2}.`);
  return descriptor.value;
}
function record(value, label2, keys) {
  if (!isRecord(value)) fail(`${label2} must be an object.`);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !keys.includes(key))) {
    fail(`Unsupported ${label2} fields. Keep this data read-only and use a compatible plugin version.`);
  }
  return value;
}
function array(value, label2, parse) {
  if (!Array.isArray(value)) fail(`${label2} must be an array.`);
  const result = [];
  for (let i = 0; i < value.length; i++) result.push(parse(field(value, String(i), `${label2}[${i}]`), `${label2}[${i}]`));
  return result;
}
function text(value, label2, maximum, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum || !allowEmpty && !value.trim()) {
    fail(`${label2} must be ${allowEmpty ? "text" : "nonblank text"} of at most ${maximum} characters.`);
  }
  return value;
}
function timestamp(value, label2) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > MAX_DATE_MS) {
    fail(`${label2} must be a valid nonnegative millisecond timestamp.`);
  }
  return value;
}
function integer(value, label2, maximum = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
    fail(`${label2} must be an integer between 0 and ${maximum}.`);
  }
  return value;
}
function decimal(value, label2, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) fail(`${label2} must be a finite number between ${minimum} and ${maximum}.`);
  return value;
}
function boolean(value, label2) {
  if (typeof value !== "boolean") fail(`${label2} must be true or false.`);
  return value;
}
function parameterCopy() {
  return { ...FSRS_PARAMETERS, w: [...FSRS_PARAMETERS.w], learning_steps: [...FSRS_PARAMETERS.learning_steps], relearning_steps: [...FSRS_PARAMETERS.relearning_steps] };
}
function normalizeParameters(raw, label2) {
  const value = record(raw, label2, Object.keys(FSRS_PARAMETERS));
  for (const key of ["request_retention", "maximum_interval", "enable_fuzz", "enable_short_term"]) {
    if (field(value, key, `${label2}.${key}`) !== FSRS_PARAMETERS[key]) fail(`Unsupported FSRS parameter ${key}. Keep this data read-only.`);
  }
  for (const key of ["w", "learning_steps", "relearning_steps"]) {
    const actual = array(field(value, key), `${label2}.${key}`, (item) => item);
    const expected = FSRS_PARAMETERS[key];
    if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) fail(`Unsupported FSRS parameter ${key}. Keep this data read-only.`);
  }
  return parameterCopy();
}
var MEMORY_FIELDS = ["state", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps"];
function memory(value, label2) {
  const state = integer(field(value, "state"), `${label2}.state`, State.Relearning);
  const result = {
    state,
    stability: decimal(field(value, "stability"), `${label2}.stability`, state === State.New ? 0 : S_MIN, S_MAX),
    difficulty: decimal(field(value, "difficulty"), `${label2}.difficulty`, state === State.New ? 0 : 1, 10),
    elapsed_days: integer(field(value, "elapsed_days"), `${label2}.elapsed_days`),
    scheduled_days: integer(field(value, "scheduled_days"), `${label2}.scheduled_days`, MAX_INTERVAL_DAYS),
    learning_steps: integer(field(value, "learning_steps"), `${label2}.learning_steps`, state === State.Learning ? FSRS_PARAMETERS.learning_steps.length - 1 : 0)
  };
  if (state === State.New && (result.stability !== 0 || result.difficulty !== 0 || result.scheduled_days !== 0 || result.learning_steps !== 0)) fail(`Invalid new-card memory in ${label2}.`);
  if (state === State.Review && result.scheduled_days < 1) fail(`Invalid review interval in ${label2}.`);
  if ((state === State.Learning || state === State.Relearning) && result.scheduled_days !== 0) fail(`Invalid short-term interval in ${label2}.`);
  return result;
}
function normalizeFSRSCard(raw, label2) {
  const value = record(raw, label2, ["due", ...MEMORY_FIELDS, "reps", "lapses", "last_review"]);
  const result = {
    due: timestamp(field(value, "due"), `${label2}.due`),
    ...memory(value, label2),
    reps: integer(field(value, "reps"), `${label2}.reps`),
    lapses: integer(field(value, "lapses"), `${label2}.lapses`)
  };
  if (Object.getOwnPropertyDescriptor(value, "last_review")) result.last_review = timestamp(field(value, "last_review"), `${label2}.last_review`);
  if (result.state === State.New) {
    if (result.reps !== 0 || result.lapses !== 0 || result.elapsed_days !== 0 || result.last_review !== void 0) fail(`Invalid fresh FSRS state in ${label2}.`);
  } else if (result.reps < 1 || result.last_review === void 0 || result.due <= result.last_review) fail(`Incomplete reviewed FSRS state in ${label2}.`);
  if (result.lapses > result.reps) fail(`Invalid FSRS lapse count in ${label2}.`);
  return result;
}
function normalizeLog(raw, label2) {
  const value = record(raw, label2, ["rating", "due", "review", "last_elapsed_days", ...MEMORY_FIELDS]);
  const rating = integer(field(value, "rating"), `${label2}.rating`, Rating.Easy);
  if (rating < Rating.Again) fail(`${label2} must record an actual rating.`);
  return {
    rating,
    ...memory(value, label2),
    due: timestamp(field(value, "due"), `${label2}.due`),
    review: timestamp(field(value, "review"), `${label2}.review`),
    last_elapsed_days: integer(field(value, "last_elapsed_days"), `${label2}.last_elapsed_days`)
  };
}
function normalizeFSRS(raw, label2) {
  const value = record(raw, label2, ["schemaVersion", "algorithm", "implementation", "implementationVersion", "parameterVersion", "parameters", "card", "logs", "baseline"]);
  if (field(value, "schemaVersion") !== 1 || field(value, "algorithm") !== "FSRS-6" || field(value, "implementation") !== "ts-fsrs" || field(value, "implementationVersion") !== FSRS_IMPLEMENTATION_VERSION || field(value, "parameterVersion") !== FSRS_PARAMETER_VERSION) {
    fail("Unsupported FSRS version. Keep this data read-only and use a compatible plugin version.");
  }
  const parameters = normalizeParameters(field(value, "parameters"), `${label2}.parameters`);
  const card = normalizeFSRSCard(field(value, "card"), `${label2}.card`);
  const logs = array(field(value, "logs"), `${label2}.logs`, normalizeLog);
  const source = record(field(value, "baseline"), `${label2}.baseline`, ["kind", "at", "reviews", "lapses", "logIndex"]);
  const kind = field(source, "kind");
  if (kind !== "new" && kind !== "legacy" && kind !== "relearn") fail("Unknown FSRS baseline.");
  const baseline = { kind, at: timestamp(field(source, "at"), "FSRS baseline time"), reviews: integer(field(source, "reviews"), "FSRS baseline reviews"), lapses: integer(field(source, "lapses"), "FSRS baseline lapses"), logIndex: integer(field(source, "logIndex"), "FSRS baseline log index", logs.length) };
  if (baseline.logIndex > baseline.reviews || kind === "new" && (baseline.reviews !== 0 || baseline.lapses !== 0 || baseline.logIndex !== 0) || kind === "legacy" && baseline.logIndex !== 0) fail("Invalid FSRS baseline counters.");
  if (logs.length - baseline.logIndex !== card.reps) fail("FSRS state and review log count do not agree.");
  let lastTime = 0;
  for (const [index, log] of logs.entries()) {
    if (log.review < lastTime || index >= baseline.logIndex && log.review < baseline.at) fail("FSRS review history is out of order.");
    if (log.due > log.review || log.elapsed_days !== (log.state === State.New ? 0 : dateDiffInDays(new Date(log.due), new Date(log.review)))) fail("FSRS review timing is inconsistent.");
    lastTime = log.review;
  }
  if (baseline.logIndex > 0 && logs[baseline.logIndex - 1].review > baseline.at) fail("FSRS reset predates its review history.");
  if (card.reps === 0) {
    if (card.state !== State.New || card.due !== baseline.at) fail("FSRS baseline does not match its fresh state.");
  } else {
    const first = logs[baseline.logIndex], last = logs[logs.length - 1];
    if (first.state !== State.New || first.due !== baseline.at || last.review !== card.last_review) fail("FSRS state and review history do not agree.");
    if (card.elapsed_days !== last.elapsed_days) fail("FSRS elapsed time does not match its latest review.");
    const activeLapses = logs.slice(baseline.logIndex).filter((log) => log.state === State.Review && log.rating === Rating.Again).length;
    if (card.lapses !== activeLapses) fail("FSRS lapse count does not match its review history.");
  }
  return { schemaVersion: 1, algorithm: "FSRS-6", implementation: "ts-fsrs", implementationVersion: FSRS_IMPLEMENTATION_VERSION, parameterVersion: FSRS_PARAMETER_VERSION, parameters, card, logs, baseline };
}
function normalizeSR(raw, label2) {
  const value = record(raw, label2, ["algorithm", "version", "parameters", "card", "logs", "baseline"]);
  if (field(value, "algorithm") !== "SM-2-OSR" || field(value, "version") !== SR_VERSION) fail("Unsupported SM-2-OSR version");
  const params = record(field(value, "parameters"), label2 + ".parameters", Object.keys(SR_PARAMETERS));
  for (const key of Object.keys(SR_PARAMETERS)) if (field(params, key) !== SR_PARAMETERS[key]) fail("Unsupported SM-2-OSR parameters");
  const parseMemory = (raw2, label3) => {
    const m = record(raw2, label3, ["interval", "ease", "due"]);
    return { interval: integer(field(m, "interval"), label3 + ".interval", SR_MAX_INTERVAL), ease: integer(field(m, "ease"), label3 + ".ease"), due: timestamp(field(m, "due"), label3 + ".due") };
  };
  const card = parseMemory(field(value, "card"), label2 + ".card");
  if (card.ease < 130) fail("Invalid SM-2-OSR ease");
  const b = record(field(value, "baseline"), label2 + ".baseline", ["at", "reviews", "lapses"]);
  const baseline = { at: timestamp(field(b, "at"), label2 + ".at"), reviews: integer(field(b, "reviews"), label2 + ".reviews"), lapses: integer(field(b, "lapses"), label2 + ".lapses") };
  const logs = array(field(value, "logs"), label2 + ".logs", (raw2, label3) => {
    const l = record(raw2, label3, ["rating", "review", "delayDays", "before", "after", "histogram"]), rating = field(l, "rating");
    if (!["again", "hard", "good", "easy"].includes(rating)) fail("Invalid SM-2-OSR rating");
    const h = field(l, "histogram");
    if (!isRecord(h)) fail("Invalid due histogram");
    const histogram = {};
    for (const key of Object.keys(h)) {
      if (!/^-?\d+$/.test(key)) fail("Invalid due histogram day");
      histogram[key] = integer(field(h, key), "Histogram count");
    }
    return { rating, delayDays: integer(field(l, "delayDays"), label3 + ".delayDays"), review: timestamp(field(l, "review"), label3 + ".review"), before: parseMemory(field(l, "before"), label3 + ".before"), after: parseMemory(field(l, "after"), label3 + ".after"), histogram };
  });
  let previous = emptySR(baseline.at).card, lastTime = baseline.at;
  for (const log of logs) {
    if (log.review < lastTime || JSON.stringify(log.before) !== JSON.stringify(previous)) fail("SM-2-OSR history is inconsistent");
    const expected = scheduleSR(log.before, log.rating, log.review, log.histogram, log.delayDays);
    if (expected.interval !== log.after.interval || expected.ease !== log.after.ease || Math.abs(log.after.due - (log.review + expected.interval * DAY_MS)) > 27 * 60 * 60 * 1e3) fail("SM-2-OSR scheduling result is inconsistent");
    previous = log.after;
    lastTime = log.review;
  }
  if (JSON.stringify(previous) !== JSON.stringify(card)) fail("SM-2-OSR state does not match its history");
  return { algorithm: "SM-2-OSR", version: SR_VERSION, parameters: { ...SR_PARAMETERS }, card, logs, baseline };
}
function srHistogram(cards, now) {
  const result = {};
  for (const c of cards) {
    if (c.suspended || !c.sr) continue;
    const day = String(Math.ceil((c.dueAt - now) / DAY_MS));
    result[day] = (result[day] || 0) + 1;
  }
  return result;
}
function activeAlgorithm(card) {
  return card.sr ? "sm2-osr" : "fsrs";
}
function archiveSchedule(card) {
  var _a2;
  return [...(_a2 = card.schedulingHistory) != null ? _a2 : [], ...card.fsrs ? [{ fsrs: card.fsrs }] : [], ...card.sr ? [{ sr: card.sr }] : []];
}
function normalizeCard(raw, label2) {
  if (!isRecord(raw)) fail(`${label2} must be a card object.`);
  const get = (key) => field(raw, key, `${label2}.${key}`);
  const lastReviewedAt = get("lastReviewedAt");
  const ref = Object.getOwnPropertyDescriptor(raw, "sourceRef");
  let sourceRef;
  if (ref) {
    if (!("value" in ref) || !isRecord(ref.value)) fail("Invalid source evidence");
    const r = ref.value;
    const kindProperty = Object.getOwnPropertyDescriptor(r, "kind");
    const kind = kindProperty ? field(r, "kind") : void 0;
    if (kindProperty && kind === void 0) fail("Unsupported source evidence kind");
    if (kind !== void 0 && kind !== "selection" && kind !== "passage") fail("Unsupported source evidence kind");
    const headingPath = Object.getOwnPropertyDescriptor(r, "headingPath") ? array(field(r, "headingPath"), "source heading path", (value, label3) => text(value, label3, 4e3)) : void 0;
    if (headingPath && headingPath.length > 6) fail("Invalid source heading path");
    const question = kind === "passage" ? text(field(r, "question"), "source question", 4e3) : void 0;
    const passageKind = kind === "passage" ? field(r, "passageKind") : void 0;
    if (kind === "passage" && (typeof passageKind !== "string" || !["section", "intro", "preamble", "document"].includes(passageKind) || !headingPath)) fail("Invalid source passage evidence");
    sourceRef = { line: integer(field(r, "line"), "source line"), endLine: integer(field(r, "endLine"), "source end line"), heading: text(field(r, "heading"), "source heading", 4e3, true), excerpt: text(field(r, "excerpt"), "source excerpt", 5e4), fingerprint: text(field(r, "fingerprint"), "source fingerprint", 100), ...kind ? { kind } : {}, ...headingPath ? { headingPath } : {}, ...kind === "passage" ? { question, passageKind } : {} };
    if (sourceRef.endLine < sourceRef.line) fail("Invalid source line range");
  }
  const sr = Object.getOwnPropertyDescriptor(raw, "sr") ? normalizeSR(get("sr"), `${label2}.sr`) : void 0;
  const history = Object.getOwnPropertyDescriptor(raw, "schedulingHistory") ? array(get("schedulingHistory"), `${label2}.history`, (item, label3) => {
    const value = record(item, label3, ["fsrs", "sr"]);
    if (Object.keys(value).length !== 1) fail("Invalid archived scheduler");
    return Object.hasOwn(value, "fsrs") ? { fsrs: normalizeFSRS(field(value, "fsrs"), label3) } : { sr: normalizeSR(field(value, "sr"), label3) };
  }) : void 0;
  const schedule = Object.getOwnPropertyDescriptor(raw, "fsrs");
  const scheduling = schedule ? normalizeFSRS(get("fsrs"), `${label2}.fsrs`) : void 0;
  const result = {
    ...sourceRef ? { sourceRef } : {},
    ...scheduling ? { fsrs: scheduling } : {},
    ...sr ? { sr } : {},
    ...history ? { schedulingHistory: history } : {},
    id: text(get("id"), `${label2}.id`, MAX_ID_LENGTH),
    front: text(get("front"), `${label2}.front`, MAX_FRONT_LENGTH),
    back: text(get("back"), `${label2}.back`, MAX_BACK_LENGTH),
    sourcePath: text(get("sourcePath"), `${label2}.sourcePath`, MAX_SOURCE_PATH_LENGTH, true),
    createdAt: timestamp(get("createdAt"), `${label2}.createdAt`),
    updatedAt: timestamp(get("updatedAt"), `${label2}.updatedAt`),
    dueAt: timestamp(get("dueAt"), `${label2}.dueAt`),
    intervalDays: integer(get("intervalDays"), `${label2}.intervalDays`, sr ? SR_MAX_INTERVAL : MAX_INTERVAL_DAYS),
    reviews: integer(get("reviews"), `${label2}.reviews`),
    lapses: integer(get("lapses"), `${label2}.lapses`),
    suspended: boolean(get("suspended"), `${label2}.suspended`),
    lastReviewedAt: lastReviewedAt === null ? null : timestamp(lastReviewedAt, `${label2}.lastReviewedAt`),
    revision: integer(get("revision"), `${label2}.revision`)
  };
  if (sr && scheduling) fail("A card cannot have two active schedulers");
  if (sr) {
    const last = sr.logs.at(-1);
    if (result.dueAt !== sr.card.due || result.intervalDays !== (last ? sr.card.interval : 0) || result.reviews !== sr.baseline.reviews + sr.logs.length || result.lapses !== sr.baseline.lapses + sr.logs.filter((l) => l.rating === "again").length || last && result.lastReviewedAt !== last.review) fail("Card summary and SM-2-OSR state do not agree");
  }
  if (scheduling) {
    const state = scheduling.card, base = scheduling.baseline;
    if (result.dueAt !== state.due || result.intervalDays !== state.scheduled_days || result.reviews !== integer(base.reviews + state.reps, "Cumulative reviews") || result.lapses !== integer(base.lapses + state.lapses, "Cumulative lapses") || state.last_review !== void 0 && result.lastReviewedAt !== state.last_review) fail("Card summary and FSRS state do not agree. Keep this data read-only.");
    if (base.kind === "new" && state.reps === 0 && result.lastReviewedAt !== null) fail("A new FSRS card cannot have an earlier review.");
  }
  return result;
}
function normalizeData(raw, now) {
  timestamp(now, "Current time");
  if (raw === null || raw === void 0) return { version: 2, cards: [] };
  if (!isRecord(raw)) fail("Saved flashcard data must be an object.");
  if (Reflect.ownKeys(raw).length === 0) return { version: 2, cards: [] };
  const version2 = field(raw, "version", "flashcard data version");
  if (version2 !== 2 && version2 !== 3) fail("Unsupported flashcard data version. Keep this data read-only and use a compatible plugin version.");
  const cards = array(field(raw, "cards", "flashcard cards array"), "Saved flashcard cards", normalizeCard);
  const ids = /* @__PURE__ */ new Set();
  for (const card of cards) {
    if (ids.has(card.id)) fail("Duplicate flashcard ID.");
    ids.add(card.id);
  }
  return { version: version2 === 3 || cards.some((c) => c.sr || c.schedulingHistory) ? 3 : 2, cards };
}
function serializeCard(card) {
  const { due, last_review, ...memory2 } = card;
  return { ...memory2, due: timestamp(due.getTime(), "FSRS due time"), ...last_review === void 0 ? {} : { last_review: timestamp(last_review.getTime(), "FSRS last review") } };
}
function serializeLog(log) {
  return { ...log, due: timestamp(log.due.getTime(), "FSRS log due"), review: timestamp(log.review.getTime(), "FSRS log review") };
}
function emptySchedule(kind, now, reviews = 0, lapses = 0, logs = []) {
  return { schemaVersion: 1, algorithm: "FSRS-6", implementation: "ts-fsrs", implementationVersion: FSRS_IMPLEMENTATION_VERSION, parameterVersion: FSRS_PARAMETER_VERSION, parameters: parameterCopy(), card: serializeCard(createEmptyCard(new Date(now))), logs, baseline: { kind, at: now, reviews, lapses, logIndex: logs.length } };
}
function createCard(front, back, sourcePath, now, id) {
  const createdAt = timestamp(now, "Current time");
  return {
    id: text(id, "Card ID", MAX_ID_LENGTH),
    front: text(front, "Card front", MAX_FRONT_LENGTH),
    back: text(back, "Card back", MAX_BACK_LENGTH),
    sourcePath: text(sourcePath, "Source path", MAX_SOURCE_PATH_LENGTH, true),
    createdAt,
    updatedAt: createdAt,
    dueAt: createdAt,
    intervalDays: 0,
    reviews: 0,
    lapses: 0,
    suspended: false,
    lastReviewedAt: null,
    revision: 0,
    fsrs: emptySchedule("new", createdAt)
  };
}
function applyRating(card, rating, now, algorithm = activeAlgorithm(card), histogram = {}) {
  var _a2, _b, _c, _d;
  let current = normalizeCard(card, "Card");
  const reviewedAt = timestamp(now, "Review time");
  if (rating !== "again" && rating !== "hard" && rating !== "good" && rating !== "easy") fail("Unknown flashcard rating.");
  if (algorithm !== "fsrs" && algorithm !== "sm2-osr") fail("Unsupported scheduling algorithm");
  if ((algorithm === "sm2-osr" || activeAlgorithm(current) !== algorithm) && reviewedAt < ((_a2 = current.lastReviewedAt) != null ? _a2 : current.createdAt)) fail("Review time predates the latest rating");
  if (activeAlgorithm(current) !== algorithm) {
    const history = archiveSchedule(current);
    delete current.fsrs;
    delete current.sr;
    current.schedulingHistory = history;
  }
  if (algorithm === "sm2-osr") {
    const schedule2 = (_b = current.sr) != null ? _b : emptySR(reviewedAt, current.reviews, current.lapses), next = scheduleSR(schedule2.card, rating, reviewedAt, histogram);
    return normalizeCard({ ...current, sr: { ...schedule2, card: next, logs: [...schedule2.logs, { rating, review: reviewedAt, delayDays: srDelay(schedule2.card, reviewedAt), before: { ...schedule2.card }, after: { ...next }, histogram: { ...histogram } }] }, updatedAt: reviewedAt, dueAt: next.due, intervalDays: next.interval, reviews: current.reviews + 1, lapses: current.lapses + (rating === "again" ? 1 : 0), lastReviewedAt: reviewedAt, revision: current.revision + 1 }, "Rated card");
  }
  const schedule = (_c = current.fsrs) != null ? _c : emptySchedule("legacy", reviewedAt, current.reviews, current.lapses);
  if (reviewedAt < ((_d = schedule.card.last_review) != null ? _d : schedule.baseline.at)) fail("Review time predates the FSRS state. Check the system clock before rating.");
  try {
    const input = { ...schedule.card, due: new Date(schedule.card.due), ...schedule.card.last_review === void 0 ? {} : { last_review: new Date(schedule.card.last_review) } };
    const result = fsrs(schedule.parameters).next(input, new Date(reviewedAt), GRADES[rating]);
    const next = serializeCard(result.card);
    return normalizeCard({
      ...current,
      fsrs: { ...schedule, card: next, logs: [...schedule.logs, serializeLog(result.log)] },
      updatedAt: reviewedAt,
      dueAt: next.due,
      intervalDays: next.scheduled_days,
      reviews: integer(current.reviews + 1, "Review count"),
      lapses: integer(schedule.baseline.lapses + next.lapses, "Lapse count"),
      lastReviewedAt: reviewedAt,
      revision: integer(current.revision + 1, "Revision")
    }, "Rated card");
  } catch (error) {
    if (error instanceof CardValidationError) throw error;
    fail(`FSRS scheduling failed: ${error instanceof Error ? error.message : "invalid scheduler result"}`);
  }
}
function resetScheduling(card, now) {
  var _a2, _b, _c, _d;
  const current = normalizeCard(card, "Card");
  const resetAt = timestamp(now, "Reset time");
  if (current.sr) {
    if (resetAt < ((_a2 = current.lastReviewedAt) != null ? _a2 : current.createdAt)) fail("Reset predates review");
    return normalizeCard({ ...current, schedulingHistory: archiveSchedule(current), sr: emptySR(resetAt, current.reviews, current.lapses), dueAt: resetAt, intervalDays: 0, suspended: false, updatedAt: resetAt, revision: current.revision + 1 }, "Reset card");
  }
  if (current.fsrs && resetAt < ((_b = current.fsrs.card.last_review) != null ? _b : current.fsrs.baseline.at)) fail("Reset time predates the FSRS state. Check the system clock.");
  return normalizeCard({
    ...current,
    fsrs: emptySchedule("relearn", resetAt, current.reviews, current.lapses, (_d = (_c = current.fsrs) == null ? void 0 : _c.logs) != null ? _d : []),
    dueAt: resetAt,
    intervalDays: 0,
    suspended: false,
    updatedAt: resetAt,
    revision: integer(current.revision + 1, "Revision")
  }, "Reset card");
}
function dueCards(cards, now) {
  timestamp(now, "Current time");
  return cards.filter((card) => !card.suspended && card.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt || a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// src/decks.ts
var DEFAULT_DECK = "default";
function fail2(s) {
  throw new CardValidationError(s);
}
var own = (o, k) => {
  const d = Object.getOwnPropertyDescriptor(o, k);
  if (!d || !("value" in d)) fail2("\u7F3A\u5C11\u5361\u7EC4\u5B57\u6BB5\uFF1A" + k);
  return d.value;
};
function normalizeStudyData(raw, now = Date.now()) {
  const cards = normalizeData(raw, now);
  const object = raw;
  const algorithm = object && Object.hasOwn(object, "schedulingAlgorithm") ? own(object, "schedulingAlgorithm") : void 0;
  if (algorithm !== void 0 && algorithm !== "fsrs" && algorithm !== "sm2-osr") fail2("\u4E0D\u652F\u6301\u7684\u590D\u4E60\u7B97\u6CD5");
  const preference = algorithm ? { schedulingAlgorithm: algorithm } : {};
  if (!object || !Object.prototype.hasOwnProperty.call(object, "format")) return { ...cards, ...preference, format: "passage-practice-vault", storageVersion: 1, decks: [{ id: DEFAULT_DECK, name: "\u9ED8\u8BA4\u5361\u7EC4", cardIds: cards.cards.map((c) => c.id), createdAt: now, updatedAt: now, revision: 0 }] };
  if (own(object, "format") !== "passage-practice-vault" || ![1, 2].includes(own(object, "storageVersion"))) fail2("\u4E0D\u652F\u6301\u7684\u5361\u7EC4\u5B58\u50A8\u7248\u672C");
  const decksRaw = own(object, "decks");
  if (!Array.isArray(decksRaw) || !decksRaw.length || decksRaw.length > 1e4) fail2("\u5361\u7EC4\u5217\u8868\u635F\u574F");
  const ids = /* @__PURE__ */ new Set(), cardIds = new Set(cards.cards.map((c) => c.id));
  const decks = decksRaw.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail2("\u5361\u7EC4\u6570\u636E\u635F\u574F");
    const o = value;
    const id = own(o, "id"), name = own(o, "name"), members = own(o, "cardIds"), createdAt = own(o, "createdAt"), updatedAt = own(o, "updatedAt"), revision = own(o, "revision");
    if (typeof id !== "string" || !id || id.length > 256 || ids.has(id)) fail2("\u5361\u7EC4\u7F16\u53F7\u91CD\u590D\u6216\u635F\u574F");
    ids.add(id);
    if (typeof name !== "string" || !name.trim() || name.length > 100) fail2("\u5361\u7EC4\u540D\u79F0\u635F\u574F");
    if (!Array.isArray(members) || new Set(members).size !== members.length || members.some((x) => typeof x !== "string" || !cardIds.has(x))) fail2("\u5361\u7EC4\u5361\u7247\u5173\u8054\u635F\u574F");
    for (const n of [createdAt, updatedAt, revision]) if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) fail2("\u5361\u7EC4\u65F6\u95F4\u6216\u7248\u672C\u635F\u574F");
    return { id, name, cardIds: [...members], createdAt, updatedAt, revision };
  });
  if (!ids.has(DEFAULT_DECK)) fail2("\u7F3A\u5C11\u9ED8\u8BA4\u5361\u7EC4");
  return { ...cards, ...preference, format: "passage-practice-vault", storageVersion: cards.version === 3 || algorithm || own(object, "storageVersion") === 2 ? 2 : 1, decks };
}

// src/practice-location.ts
function parseLocations(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1) throw new Error("\u7EC3\u4E60\u4F4D\u7F6E\u6587\u4EF6\u683C\u5F0F\u4E0D\u652F\u6301\uFF0C\u5DF2\u505C\u6B62\u5199\u5165\u4F4D\u7F6E");
  const result = { version: 1 };
  for (const mode of ["passage", "outline"]) {
    const p = raw[mode];
    if (p === void 0) continue;
    if (!p || p.mode !== mode || typeof p.path !== "string" || !p.path || p.path.length > 4096 || !Number.isSafeInteger(p.line) || p.line < 0 || typeof p.identity !== "string" || p.identity.length > 1e4 || typeof p.sourceFingerprint !== "string" || !/^[a-f0-9]{16}$/.test(p.sourceFingerprint) || !p.scope || !["all", "current", "folder", "tag"].includes(p.scope.kind) || typeof p.scope.value !== "string" || typeof p.currentPath !== "string" || !Array.isArray(p.excludedPaths) || p.excludedPaths.some((x) => typeof x !== "string")) throw new Error("\u7EC3\u4E60\u4F4D\u7F6E\u6587\u4EF6\u635F\u574F\uFF0C\u5DF2\u505C\u6B62\u5199\u5165\u4F4D\u7F6E");
    result[mode] = { mode, path: p.path, line: p.line, identity: p.identity, sourceFingerprint: p.sourceFingerprint, scope: { kind: p.scope.kind, value: p.scope.value }, currentPath: p.currentPath, excludedPaths: [...p.excludedPaths] };
  }
  return result;
}
var LocationStore = class {
  constructor(raw, persist) {
    this.persist = persist;
    __publicField(this, "state");
    __publicField(this, "pending", Promise.resolve());
    this.state = parseLocations(raw);
  }
  get(mode) {
    return this.state[mode] ? structuredClone(this.state[mode]) : void 0;
  }
  save(location) {
    const captured = structuredClone(location);
    const job = this.pending.then(async () => {
      const next = parseLocations({ ...this.state, [captured.mode]: captured });
      await this.persist(next);
      this.state = next;
    });
    this.pending = job.catch(() => {
    });
    return job;
  }
};

// src/markdown-preview.ts
var import_obsidian2 = require("obsidian");

// node_modules/entities/dist/esm/generated/decode-data-html.js
var htmlDecodeTree = /* @__PURE__ */ new Uint16Array(
  // prettier-ignore
  /* @__PURE__ */ '\u1D41<\xD5\u0131\u028A\u049D\u057B\u05D0\u0675\u06DE\u07A2\u07D6\u080F\u0A4A\u0A91\u0DA1\u0E6D\u0F09\u0F26\u10CA\u1228\u12E1\u1415\u149D\u14C3\u14DF\u1525\0\0\0\0\0\0\u156B\u16CD\u198D\u1C12\u1DDD\u1F7E\u2060\u21B0\u228D\u23C0\u23FB\u2442\u2824\u2912\u2D08\u2E48\u2FCE\u3016\u32BA\u3639\u37AC\u38FE\u3A28\u3A71\u3AE0\u3B2E\u0800EMabcfglmnoprstu\\bfms\x7F\x84\x8B\x90\x95\x98\xA6\xB3\xB9\xC8\xCFlig\u803B\xC6\u40C6P\u803B&\u4026cute\u803B\xC1\u40C1reve;\u4102\u0100iyx}rc\u803B\xC2\u40C2;\u4410r;\uC000\u{1D504}rave\u803B\xC0\u40C0pha;\u4391acr;\u4100d;\u6A53\u0100gp\x9D\xA1on;\u4104f;\uC000\u{1D538}plyFunction;\u6061ing\u803B\xC5\u40C5\u0100cs\xBE\xC3r;\uC000\u{1D49C}ign;\u6254ilde\u803B\xC3\u40C3ml\u803B\xC4\u40C4\u0400aceforsu\xE5\xFB\xFE\u0117\u011C\u0122\u0127\u012A\u0100cr\xEA\xF2kslash;\u6216\u0176\xF6\xF8;\u6AE7ed;\u6306y;\u4411\u0180crt\u0105\u010B\u0114ause;\u6235noullis;\u612Ca;\u4392r;\uC000\u{1D505}pf;\uC000\u{1D539}eve;\u42D8c\xF2\u0113mpeq;\u624E\u0700HOacdefhilorsu\u014D\u0151\u0156\u0180\u019E\u01A2\u01B5\u01B7\u01BA\u01DC\u0215\u0273\u0278\u027Ecy;\u4427PY\u803B\xA9\u40A9\u0180cpy\u015D\u0162\u017Aute;\u4106\u0100;i\u0167\u0168\u62D2talDifferentialD;\u6145leys;\u612D\u0200aeio\u0189\u018E\u0194\u0198ron;\u410Cdil\u803B\xC7\u40C7rc;\u4108nint;\u6230ot;\u410A\u0100dn\u01A7\u01ADilla;\u40B8terDot;\u40B7\xF2\u017Fi;\u43A7rcle\u0200DMPT\u01C7\u01CB\u01D1\u01D6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01E2\u01F8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020FoubleQuote;\u601Duote;\u6019\u0200lnpu\u021E\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6A74\u0180git\u022F\u0236\u023Aruent;\u6261nt;\u622FourIntegral;\u622E\u0100fr\u024C\u024E;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6A2Fcr;\uC000\u{1D49E}p\u0100;C\u0284\u0285\u62D3ap;\u624D\u0580DJSZacefios\u02A0\u02AC\u02B0\u02B4\u02B8\u02CB\u02D7\u02E1\u02E6\u0333\u048D\u0100;o\u0179\u02A5trahd;\u6911cy;\u4402cy;\u4405cy;\u440F\u0180grs\u02BF\u02C4\u02C7ger;\u6021r;\u61A1hv;\u6AE4\u0100ay\u02D0\u02D5ron;\u410E;\u4414l\u0100;t\u02DD\u02DE\u6207a;\u4394r;\uC000\u{1D507}\u0100af\u02EB\u0327\u0100cm\u02F0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031Ccute;\u40B4o\u0174\u030B\u030D;\u42D9bleAcute;\u42DDrave;\u4060ilde;\u42DCond;\u62C4ferentialD;\u6146\u0470\u033D\0\0\0\u0342\u0354\0\u0405f;\uC000\u{1D53B}\u0180;DE\u0348\u0349\u034D\u40A8ot;\u60DCqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03CF\u03E2\u03F8ontourIntegra\xEC\u0239o\u0274\u0379\0\0\u037B\xBB\u0349nArrow;\u61D3\u0100eo\u0387\u03A4ft\u0180ART\u0390\u0396\u03A1rrow;\u61D0ightArrow;\u61D4e\xE5\u02CAng\u0100LR\u03AB\u03C4eft\u0100AR\u03B3\u03B9rrow;\u67F8ightArrow;\u67FAightArrow;\u67F9ight\u0100AT\u03D8\u03DErrow;\u61D2ee;\u62A8p\u0241\u03E9\0\0\u03EFrrow;\u61D1ownArrow;\u61D5erticalBar;\u6225n\u0300ABLRTa\u0412\u042A\u0430\u045E\u047F\u037Crrow\u0180;BU\u041D\u041E\u0422\u6193ar;\u6913pArrow;\u61F5reve;\u4311eft\u02D2\u043A\0\u0446\0\u0450ightVector;\u6950eeVector;\u695Eector\u0100;B\u0459\u045A\u61BDar;\u6956ight\u01D4\u0467\0\u0471eeVector;\u695Fector\u0100;B\u047A\u047B\u61C1ar;\u6957ee\u0100;A\u0486\u0487\u62A4rrow;\u61A7\u0100ct\u0492\u0497r;\uC000\u{1D49F}rok;\u4110\u0800NTacdfglmopqstux\u04BD\u04C0\u04C4\u04CB\u04DE\u04E2\u04E7\u04EE\u04F5\u0521\u052F\u0536\u0552\u055D\u0560\u0565G;\u414AH\u803B\xD0\u40D0cute\u803B\xC9\u40C9\u0180aiy\u04D2\u04D7\u04DCron;\u411Arc\u803B\xCA\u40CA;\u442Dot;\u4116r;\uC000\u{1D508}rave\u803B\xC8\u40C8ement;\u6208\u0100ap\u04FA\u04FEcr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65FBerySmallSquare;\u65AB\u0100gp\u0526\u052Aon;\u4118f;\uC000\u{1D53C}silon;\u4395u\u0100ai\u053C\u0549l\u0100;T\u0542\u0543\u6A75ilde;\u6242librium;\u61CC\u0100ci\u0557\u055Ar;\u6130m;\u6A73a;\u4397ml\u803B\xCB\u40CB\u0100ip\u056A\u056Fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058D\u05B2\u05CCy;\u4424r;\uC000\u{1D509}lled\u0253\u0597\0\0\u05A3mallSquare;\u65FCerySmallSquare;\u65AA\u0370\u05BA\0\u05BF\0\0\u05C4f;\uC000\u{1D53D}All;\u6200riertrf;\u6131c\xF2\u05CB\u0600JTabcdfgorst\u05E8\u05EC\u05EF\u05FA\u0600\u0612\u0616\u061B\u061D\u0623\u066C\u0672cy;\u4403\u803B>\u403Emma\u0100;d\u05F7\u05F8\u4393;\u43DCreve;\u411E\u0180eiy\u0607\u060C\u0610dil;\u4122rc;\u411C;\u4413ot;\u4120r;\uC000\u{1D50A};\u62D9pf;\uC000\u{1D53E}eater\u0300EFGLST\u0635\u0644\u064E\u0656\u065B\u0666qual\u0100;L\u063E\u063F\u6265ess;\u62DBullEqual;\u6267reater;\u6AA2ess;\u6277lantEqual;\u6A7Eilde;\u6273cr;\uC000\u{1D4A2};\u626B\u0400Aacfiosu\u0685\u068B\u0696\u069B\u069E\u06AA\u06BE\u06CARDcy;\u442A\u0100ct\u0690\u0694ek;\u42C7;\u405Eirc;\u4124r;\u610ClbertSpace;\u610B\u01F0\u06AF\0\u06B2f;\u610DizontalLine;\u6500\u0100ct\u06C3\u06C5\xF2\u06A9rok;\u4126mp\u0144\u06D0\u06D8ownHum\xF0\u012Fqual;\u624F\u0700EJOacdfgmnostu\u06FA\u06FE\u0703\u0707\u070E\u071A\u071E\u0721\u0728\u0744\u0778\u078B\u078F\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803B\xCD\u40CD\u0100iy\u0713\u0718rc\u803B\xCE\u40CE;\u4418ot;\u4130r;\u6111rave\u803B\xCC\u40CC\u0180;ap\u0720\u072F\u073F\u0100cg\u0734\u0737r;\u412AinaryI;\u6148lie\xF3\u03DD\u01F4\u0749\0\u0762\u0100;e\u074D\u074E\u622C\u0100gr\u0753\u0758ral;\u622Bsection;\u62C2isible\u0100CT\u076C\u0772omma;\u6063imes;\u6062\u0180gpt\u077F\u0783\u0788on;\u412Ef;\uC000\u{1D540}a;\u4399cr;\u6110ilde;\u4128\u01EB\u079A\0\u079Ecy;\u4406l\u803B\xCF\u40CF\u0280cfosu\u07AC\u07B7\u07BC\u07C2\u07D0\u0100iy\u07B1\u07B5rc;\u4134;\u4419r;\uC000\u{1D50D}pf;\uC000\u{1D541}\u01E3\u07C7\0\u07CCr;\uC000\u{1D4A5}rcy;\u4408kcy;\u4404\u0380HJacfos\u07E4\u07E8\u07EC\u07F1\u07FD\u0802\u0808cy;\u4425cy;\u440Cppa;\u439A\u0100ey\u07F6\u07FBdil;\u4136;\u441Ar;\uC000\u{1D50E}pf;\uC000\u{1D542}cr;\uC000\u{1D4A6}\u0580JTaceflmost\u0825\u0829\u082C\u0850\u0863\u09B3\u09B8\u09C7\u09CD\u0A37\u0A47cy;\u4409\u803B<\u403C\u0280cmnpr\u0837\u083C\u0841\u0844\u084Dute;\u4139bda;\u439Bg;\u67EAlacetrf;\u6112r;\u619E\u0180aey\u0857\u085C\u0861ron;\u413Ddil;\u413B;\u441B\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087E\u08A9\u08B1\u08E0\u08E6\u08FC\u092F\u095B\u0390\u096A\u0100nr\u0883\u088FgleBracket;\u67E8row\u0180;BR\u0899\u089A\u089E\u6190ar;\u61E4ightArrow;\u61C6eiling;\u6308o\u01F5\u08B7\0\u08C3bleBracket;\u67E6n\u01D4\u08C8\0\u08D2eeVector;\u6961ector\u0100;B\u08DB\u08DC\u61C3ar;\u6959loor;\u630Aight\u0100AV\u08EF\u08F5rrow;\u6194ector;\u694E\u0100er\u0901\u0917e\u0180;AV\u0909\u090A\u0910\u62A3rrow;\u61A4ector;\u695Aiangle\u0180;BE\u0924\u0925\u0929\u62B2ar;\u69CFqual;\u62B4p\u0180DTV\u0937\u0942\u094CownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61BFar;\u6958ector\u0100;B\u0965\u0966\u61BCar;\u6952ight\xE1\u039Cs\u0300EFGLST\u097E\u098B\u0995\u099D\u09A2\u09ADqualGreater;\u62DAullEqual;\u6266reater;\u6276ess;\u6AA1lantEqual;\u6A7Dilde;\u6272r;\uC000\u{1D50F}\u0100;e\u09BD\u09BE\u62D8ftarrow;\u61DAidot;\u413F\u0180npw\u09D4\u0A16\u0A1Bg\u0200LRlr\u09DE\u09F7\u0A02\u0A10eft\u0100AR\u09E6\u09ECrrow;\u67F5ightArrow;\u67F7ightArrow;\u67F6eft\u0100ar\u03B3\u0A0Aight\xE1\u03BFight\xE1\u03CAf;\uC000\u{1D543}er\u0100LR\u0A22\u0A2CeftArrow;\u6199ightArrow;\u6198\u0180cht\u0A3E\u0A40\u0A42\xF2\u084C;\u61B0rok;\u4141;\u626A\u0400acefiosu\u0A5A\u0A5D\u0A60\u0A77\u0A7C\u0A85\u0A8B\u0A8Ep;\u6905y;\u441C\u0100dl\u0A65\u0A6FiumSpace;\u605Flintrf;\u6133r;\uC000\u{1D510}nusPlus;\u6213pf;\uC000\u{1D544}c\xF2\u0A76;\u439C\u0480Jacefostu\u0AA3\u0AA7\u0AAD\u0AC0\u0B14\u0B19\u0D91\u0D97\u0D9Ecy;\u440Acute;\u4143\u0180aey\u0AB4\u0AB9\u0ABEron;\u4147dil;\u4145;\u441D\u0180gsw\u0AC7\u0AF0\u0B0Eative\u0180MTV\u0AD3\u0ADF\u0AE8ediumSpace;\u600Bhi\u0100cn\u0AE6\u0AD8\xEB\u0AD9eryThi\xEE\u0AD9ted\u0100GL\u0AF8\u0B06reaterGreate\xF2\u0673essLes\xF3\u0A48Line;\u400Ar;\uC000\u{1D511}\u0200Bnpt\u0B22\u0B28\u0B37\u0B3Areak;\u6060BreakingSpace;\u40A0f;\u6115\u0680;CDEGHLNPRSTV\u0B55\u0B56\u0B6A\u0B7C\u0BA1\u0BEB\u0C04\u0C5E\u0C84\u0CA6\u0CD8\u0D61\u0D85\u6AEC\u0100ou\u0B5B\u0B64ngruent;\u6262pCap;\u626DoubleVerticalBar;\u6226\u0180lqx\u0B83\u0B8A\u0B9Bement;\u6209ual\u0100;T\u0B92\u0B93\u6260ilde;\uC000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0BB6\u0BB7\u0BBD\u0BC9\u0BD3\u0BD8\u0BE5\u626Fqual;\u6271ullEqual;\uC000\u2267\u0338reater;\uC000\u226B\u0338ess;\u6279lantEqual;\uC000\u2A7E\u0338ilde;\u6275ump\u0144\u0BF2\u0BFDownHump;\uC000\u224E\u0338qual;\uC000\u224F\u0338e\u0100fs\u0C0A\u0C27tTriangle\u0180;BE\u0C1A\u0C1B\u0C21\u62EAar;\uC000\u29CF\u0338qual;\u62ECs\u0300;EGLST\u0C35\u0C36\u0C3C\u0C44\u0C4B\u0C58\u626Equal;\u6270reater;\u6278ess;\uC000\u226A\u0338lantEqual;\uC000\u2A7D\u0338ilde;\u6274ested\u0100GL\u0C68\u0C79reaterGreater;\uC000\u2AA2\u0338essLess;\uC000\u2AA1\u0338recedes\u0180;ES\u0C92\u0C93\u0C9B\u6280qual;\uC000\u2AAF\u0338lantEqual;\u62E0\u0100ei\u0CAB\u0CB9verseElement;\u620CghtTriangle\u0180;BE\u0CCB\u0CCC\u0CD2\u62EBar;\uC000\u29D0\u0338qual;\u62ED\u0100qu\u0CDD\u0D0CuareSu\u0100bp\u0CE8\u0CF9set\u0100;E\u0CF0\u0CF3\uC000\u228F\u0338qual;\u62E2erset\u0100;E\u0D03\u0D06\uC000\u2290\u0338qual;\u62E3\u0180bcp\u0D13\u0D24\u0D4Eset\u0100;E\u0D1B\u0D1E\uC000\u2282\u20D2qual;\u6288ceeds\u0200;EST\u0D32\u0D33\u0D3B\u0D46\u6281qual;\uC000\u2AB0\u0338lantEqual;\u62E1ilde;\uC000\u227F\u0338erset\u0100;E\u0D58\u0D5B\uC000\u2283\u20D2qual;\u6289ilde\u0200;EFT\u0D6E\u0D6F\u0D75\u0D7F\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uC000\u{1D4A9}ilde\u803B\xD1\u40D1;\u439D\u0700Eacdfgmoprstuv\u0DBD\u0DC2\u0DC9\u0DD5\u0DDB\u0DE0\u0DE7\u0DFC\u0E02\u0E20\u0E22\u0E32\u0E3F\u0E44lig;\u4152cute\u803B\xD3\u40D3\u0100iy\u0DCE\u0DD3rc\u803B\xD4\u40D4;\u441Eblac;\u4150r;\uC000\u{1D512}rave\u803B\xD2\u40D2\u0180aei\u0DEE\u0DF2\u0DF6cr;\u414Cga;\u43A9cron;\u439Fpf;\uC000\u{1D546}enCurly\u0100DQ\u0E0E\u0E1AoubleQuote;\u601Cuote;\u6018;\u6A54\u0100cl\u0E27\u0E2Cr;\uC000\u{1D4AA}ash\u803B\xD8\u40D8i\u016C\u0E37\u0E3Cde\u803B\xD5\u40D5es;\u6A37ml\u803B\xD6\u40D6er\u0100BP\u0E4B\u0E60\u0100ar\u0E50\u0E53r;\u603Eac\u0100ek\u0E5A\u0E5C;\u63DEet;\u63B4arenthesis;\u63DC\u0480acfhilors\u0E7F\u0E87\u0E8A\u0E8F\u0E92\u0E94\u0E9D\u0EB0\u0EFCrtialD;\u6202y;\u441Fr;\uC000\u{1D513}i;\u43A6;\u43A0usMinus;\u40B1\u0100ip\u0EA2\u0EADncareplan\xE5\u069Df;\u6119\u0200;eio\u0EB9\u0EBA\u0EE0\u0EE4\u6ABBcedes\u0200;EST\u0EC8\u0EC9\u0ECF\u0EDA\u627Aqual;\u6AAFlantEqual;\u627Cilde;\u627Eme;\u6033\u0100dp\u0EE9\u0EEEuct;\u620Fortion\u0100;a\u0225\u0EF9l;\u621D\u0100ci\u0F01\u0F06r;\uC000\u{1D4AB};\u43A8\u0200Ufos\u0F11\u0F16\u0F1B\u0F1FOT\u803B"\u4022r;\uC000\u{1D514}pf;\u611Acr;\uC000\u{1D4AC}\u0600BEacefhiorsu\u0F3E\u0F43\u0F47\u0F60\u0F73\u0FA7\u0FAA\u0FAD\u1096\u10A9\u10B4\u10BEarr;\u6910G\u803B\xAE\u40AE\u0180cnr\u0F4E\u0F53\u0F56ute;\u4154g;\u67EBr\u0100;t\u0F5C\u0F5D\u61A0l;\u6916\u0180aey\u0F67\u0F6C\u0F71ron;\u4158dil;\u4156;\u4420\u0100;v\u0F78\u0F79\u611Cerse\u0100EU\u0F82\u0F99\u0100lq\u0F87\u0F8Eement;\u620Builibrium;\u61CBpEquilibrium;\u696Fr\xBB\u0F79o;\u43A1ght\u0400ACDFTUVa\u0FC1\u0FEB\u0FF3\u1022\u1028\u105B\u1087\u03D8\u0100nr\u0FC6\u0FD2gleBracket;\u67E9row\u0180;BL\u0FDC\u0FDD\u0FE1\u6192ar;\u61E5eftArrow;\u61C4eiling;\u6309o\u01F5\u0FF9\0\u1005bleBracket;\u67E7n\u01D4\u100A\0\u1014eeVector;\u695Dector\u0100;B\u101D\u101E\u61C2ar;\u6955loor;\u630B\u0100er\u102D\u1043e\u0180;AV\u1035\u1036\u103C\u62A2rrow;\u61A6ector;\u695Biangle\u0180;BE\u1050\u1051\u1055\u62B3ar;\u69D0qual;\u62B5p\u0180DTV\u1063\u106E\u1078ownVector;\u694FeeVector;\u695Cector\u0100;B\u1082\u1083\u61BEar;\u6954ector\u0100;B\u1091\u1092\u61C0ar;\u6953\u0100pu\u109B\u109Ef;\u611DndImplies;\u6970ightarrow;\u61DB\u0100ch\u10B9\u10BCr;\u611B;\u61B1leDelayed;\u69F4\u0680HOacfhimoqstu\u10E4\u10F1\u10F7\u10FD\u1119\u111E\u1151\u1156\u1161\u1167\u11B5\u11BB\u11BF\u0100Cc\u10E9\u10EEHcy;\u4429y;\u4428FTcy;\u442Ccute;\u415A\u0280;aeiy\u1108\u1109\u110E\u1113\u1117\u6ABCron;\u4160dil;\u415Erc;\u415C;\u4421r;\uC000\u{1D516}ort\u0200DLRU\u112A\u1134\u113E\u1149ownArrow\xBB\u041EeftArrow\xBB\u089AightArrow\xBB\u0FDDpArrow;\u6191gma;\u43A3allCircle;\u6218pf;\uC000\u{1D54A}\u0272\u116D\0\0\u1170t;\u621Aare\u0200;ISU\u117B\u117C\u1189\u11AF\u65A1ntersection;\u6293u\u0100bp\u118F\u119Eset\u0100;E\u1197\u1198\u628Fqual;\u6291erset\u0100;E\u11A8\u11A9\u6290qual;\u6292nion;\u6294cr;\uC000\u{1D4AE}ar;\u62C6\u0200bcmp\u11C8\u11DB\u1209\u120B\u0100;s\u11CD\u11CE\u62D0et\u0100;E\u11CD\u11D5qual;\u6286\u0100ch\u11E0\u1205eeds\u0200;EST\u11ED\u11EE\u11F4\u11FF\u627Bqual;\u6AB0lantEqual;\u627Dilde;\u627FTh\xE1\u0F8C;\u6211\u0180;es\u1212\u1213\u1223\u62D1rset\u0100;E\u121C\u121D\u6283qual;\u6287et\xBB\u1213\u0580HRSacfhiors\u123E\u1244\u1249\u1255\u125E\u1271\u1276\u129F\u12C2\u12C8\u12D1ORN\u803B\xDE\u40DEADE;\u6122\u0100Hc\u124E\u1252cy;\u440By;\u4426\u0100bu\u125A\u125C;\u4009;\u43A4\u0180aey\u1265\u126A\u126Fron;\u4164dil;\u4162;\u4422r;\uC000\u{1D517}\u0100ei\u127B\u1289\u01F2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128E\u1298kSpace;\uC000\u205F\u200ASpace;\u6009lde\u0200;EFT\u12AB\u12AC\u12B2\u12BC\u623Cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uC000\u{1D54B}ipleDot;\u60DB\u0100ct\u12D6\u12DBr;\uC000\u{1D4AF}rok;\u4166\u0AE1\u12F7\u130E\u131A\u1326\0\u132C\u1331\0\0\0\0\0\u1338\u133D\u1377\u1385\0\u13FF\u1404\u140A\u1410\u0100cr\u12FB\u1301ute\u803B\xDA\u40DAr\u0100;o\u1307\u1308\u619Fcir;\u6949r\u01E3\u1313\0\u1316y;\u440Eve;\u416C\u0100iy\u131E\u1323rc\u803B\xDB\u40DB;\u4423blac;\u4170r;\uC000\u{1D518}rave\u803B\xD9\u40D9acr;\u416A\u0100di\u1341\u1369er\u0100BP\u1348\u135D\u0100ar\u134D\u1350r;\u405Fac\u0100ek\u1357\u1359;\u63DFet;\u63B5arenthesis;\u63DDon\u0100;P\u1370\u1371\u62C3lus;\u628E\u0100gp\u137B\u137Fon;\u4172f;\uC000\u{1D54C}\u0400ADETadps\u1395\u13AE\u13B8\u13C4\u03E8\u13D2\u13D7\u13F3rrow\u0180;BD\u1150\u13A0\u13A4ar;\u6912ownArrow;\u61C5ownArrow;\u6195quilibrium;\u696Eee\u0100;A\u13CB\u13CC\u62A5rrow;\u61A5own\xE1\u03F3er\u0100LR\u13DE\u13E8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13F9\u13FA\u43D2on;\u43A5ing;\u416Ecr;\uC000\u{1D4B0}ilde;\u4168ml\u803B\xDC\u40DC\u0480Dbcdefosv\u1427\u142C\u1430\u1433\u143E\u1485\u148A\u1490\u1496ash;\u62ABar;\u6AEBy;\u4412ash\u0100;l\u143B\u143C\u62A9;\u6AE6\u0100er\u1443\u1445;\u62C1\u0180bty\u144C\u1450\u147Aar;\u6016\u0100;i\u144F\u1455cal\u0200BLST\u1461\u1465\u146A\u1474ar;\u6223ine;\u407Ceparator;\u6758ilde;\u6240ThinSpace;\u600Ar;\uC000\u{1D519}pf;\uC000\u{1D54D}cr;\uC000\u{1D4B1}dash;\u62AA\u0280cefos\u14A7\u14AC\u14B1\u14B6\u14BCirc;\u4174dge;\u62C0r;\uC000\u{1D51A}pf;\uC000\u{1D54E}cr;\uC000\u{1D4B2}\u0200fios\u14CB\u14D0\u14D2\u14D8r;\uC000\u{1D51B};\u439Epf;\uC000\u{1D54F}cr;\uC000\u{1D4B3}\u0480AIUacfosu\u14F1\u14F5\u14F9\u14FD\u1504\u150F\u1514\u151A\u1520cy;\u442Fcy;\u4407cy;\u442Ecute\u803B\xDD\u40DD\u0100iy\u1509\u150Drc;\u4176;\u442Br;\uC000\u{1D51C}pf;\uC000\u{1D550}cr;\uC000\u{1D4B4}ml;\u4178\u0400Hacdefos\u1535\u1539\u153F\u154B\u154F\u155D\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417D;\u4417ot;\u417B\u01F2\u1554\0\u155BoWidt\xE8\u0AD9a;\u4396r;\u6128pf;\u6124cr;\uC000\u{1D4B5}\u0BE1\u1583\u158A\u1590\0\u15B0\u15B6\u15BF\0\0\0\0\u15C6\u15DB\u15EB\u165F\u166D\0\u1695\u169B\u16B2\u16B9\0\u16BEcute\u803B\xE1\u40E1reve;\u4103\u0300;Ediuy\u159C\u159D\u15A1\u15A3\u15A8\u15AD\u623E;\uC000\u223E\u0333;\u623Frc\u803B\xE2\u40E2te\u80BB\xB4\u0306;\u4430lig\u803B\xE6\u40E6\u0100;r\xB2\u15BA;\uC000\u{1D51E}rave\u803B\xE0\u40E0\u0100ep\u15CA\u15D6\u0100fp\u15CF\u15D4sym;\u6135\xE8\u15D3ha;\u43B1\u0100ap\u15DFc\u0100cl\u15E4\u15E7r;\u4101g;\u6A3F\u0264\u15F0\0\0\u160A\u0280;adsv\u15FA\u15FB\u15FF\u1601\u1607\u6227nd;\u6A55;\u6A5Clope;\u6A58;\u6A5A\u0380;elmrsz\u1618\u1619\u161B\u161E\u163F\u164F\u1659\u6220;\u69A4e\xBB\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163A\u163C\u163E;\u69A8;\u69A9;\u69AA;\u69AB;\u69AC;\u69AD;\u69AE;\u69AFt\u0100;v\u1645\u1646\u621Fb\u0100;d\u164C\u164D\u62BE;\u699D\u0100pt\u1654\u1657h;\u6222\xBB\xB9arr;\u637C\u0100gp\u1663\u1667on;\u4105f;\uC000\u{1D552}\u0380;Eaeiop\u12C1\u167B\u167D\u1682\u1684\u1687\u168A;\u6A70cir;\u6A6F;\u624Ad;\u624Bs;\u4027rox\u0100;e\u12C1\u1692\xF1\u1683ing\u803B\xE5\u40E5\u0180cty\u16A1\u16A6\u16A8r;\uC000\u{1D4B6};\u402Amp\u0100;e\u12C1\u16AF\xF1\u0288ilde\u803B\xE3\u40E3ml\u803B\xE4\u40E4\u0100ci\u16C2\u16C8onin\xF4\u0272nt;\u6A11\u0800Nabcdefiklnoprsu\u16ED\u16F1\u1730\u173C\u1743\u1748\u1778\u177D\u17E0\u17E6\u1839\u1850\u170D\u193D\u1948\u1970ot;\u6AED\u0100cr\u16F6\u171Ek\u0200ceps\u1700\u1705\u170D\u1713ong;\u624Cpsilon;\u43F6rime;\u6035im\u0100;e\u171A\u171B\u623Dq;\u62CD\u0176\u1722\u1726ee;\u62BDed\u0100;g\u172C\u172D\u6305e\xBB\u172Drk\u0100;t\u135C\u1737brk;\u63B6\u0100oy\u1701\u1741;\u4431quo;\u601E\u0280cmprt\u1753\u175B\u1761\u1764\u1768aus\u0100;e\u010A\u0109ptyv;\u69B0s\xE9\u170Cno\xF5\u0113\u0180ahw\u176F\u1771\u1773;\u43B2;\u6136een;\u626Cr;\uC000\u{1D51F}g\u0380costuvw\u178D\u179D\u17B3\u17C1\u17D5\u17DB\u17DE\u0180aiu\u1794\u1796\u179A\xF0\u0760rc;\u65EFp\xBB\u1371\u0180dpt\u17A4\u17A8\u17ADot;\u6A00lus;\u6A01imes;\u6A02\u0271\u17B9\0\0\u17BEcup;\u6A06ar;\u6605riangle\u0100du\u17CD\u17D2own;\u65BDp;\u65B3plus;\u6A04e\xE5\u1444\xE5\u14ADarow;\u690D\u0180ako\u17ED\u1826\u1835\u0100cn\u17F2\u1823k\u0180lst\u17FA\u05AB\u1802ozenge;\u69EBriangle\u0200;dlr\u1812\u1813\u1818\u181D\u65B4own;\u65BEeft;\u65C2ight;\u65B8k;\u6423\u01B1\u182B\0\u1833\u01B2\u182F\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183E\u184D\u0100;q\u1843\u1846\uC000=\u20E5uiv;\uC000\u2261\u20E5t;\u6310\u0200ptwx\u1859\u185E\u1867\u186Cf;\uC000\u{1D553}\u0100;t\u13CB\u1863om\xBB\u13CCtie;\u62C8\u0600DHUVbdhmptuv\u1885\u1896\u18AA\u18BB\u18D7\u18DB\u18EC\u18FF\u1905\u190A\u1910\u1921\u0200LRlr\u188E\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18A1\u18A2\u18A4\u18A6\u18A8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18B3\u18B5\u18B7\u18B9;\u655D;\u655A;\u655C;\u6559\u0380;HLRhlr\u18CA\u18CB\u18CD\u18CF\u18D1\u18D3\u18D5\u6551;\u656C;\u6563;\u6560;\u656B;\u6562;\u655Fox;\u69C9\u0200LRlr\u18E4\u18E6\u18E8\u18EA;\u6555;\u6552;\u6510;\u650C\u0280;DUdu\u06BD\u18F7\u18F9\u18FB\u18FD;\u6565;\u6568;\u652C;\u6534inus;\u629Flus;\u629Eimes;\u62A0\u0200LRlr\u1919\u191B\u191D\u191F;\u655B;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193B\u6502;\u656A;\u6561;\u655E;\u653C;\u6524;\u651C\u0100ev\u0123\u1942bar\u803B\xA6\u40A6\u0200ceio\u1951\u1956\u195A\u1960r;\uC000\u{1D4B7}mi;\u604Fm\u0100;e\u171A\u171Cl\u0180;bh\u1968\u1969\u196B\u405C;\u69C5sub;\u67C8\u016C\u1974\u197El\u0100;e\u1979\u197A\u6022t\xBB\u197Ap\u0180;Ee\u012F\u1985\u1987;\u6AAE\u0100;q\u06DC\u06DB\u0CE1\u19A7\0\u19E8\u1A11\u1A15\u1A32\0\u1A37\u1A50\0\0\u1AB4\0\0\u1AC1\0\0\u1B21\u1B2E\u1B4D\u1B52\0\u1BFD\0\u1C0C\u0180cpr\u19AD\u19B2\u19DDute;\u4107\u0300;abcds\u19BF\u19C0\u19C4\u19CA\u19D5\u19D9\u6229nd;\u6A44rcup;\u6A49\u0100au\u19CF\u19D2p;\u6A4Bp;\u6A47ot;\u6A40;\uC000\u2229\uFE00\u0100eo\u19E2\u19E5t;\u6041\xEE\u0693\u0200aeiu\u19F0\u19FB\u1A01\u1A05\u01F0\u19F5\0\u19F8s;\u6A4Don;\u410Ddil\u803B\xE7\u40E7rc;\u4109ps\u0100;s\u1A0C\u1A0D\u6A4Cm;\u6A50ot;\u410B\u0180dmn\u1A1B\u1A20\u1A26il\u80BB\xB8\u01ADptyv;\u69B2t\u8100\xA2;e\u1A2D\u1A2E\u40A2r\xE4\u01B2r;\uC000\u{1D520}\u0180cei\u1A3D\u1A40\u1A4Dy;\u4447ck\u0100;m\u1A47\u1A48\u6713ark\xBB\u1A48;\u43C7r\u0380;Ecefms\u1A5F\u1A60\u1A62\u1A6B\u1AA4\u1AAA\u1AAE\u65CB;\u69C3\u0180;el\u1A69\u1A6A\u1A6D\u42C6q;\u6257e\u0261\u1A74\0\0\u1A88rrow\u0100lr\u1A7C\u1A81eft;\u61BAight;\u61BB\u0280RSacd\u1A92\u1A94\u1A96\u1A9A\u1A9F\xBB\u0F47;\u64C8st;\u629Birc;\u629Aash;\u629Dnint;\u6A10id;\u6AEFcir;\u69C2ubs\u0100;u\u1ABB\u1ABC\u6663it\xBB\u1ABC\u02EC\u1AC7\u1AD4\u1AFA\0\u1B0Aon\u0100;e\u1ACD\u1ACE\u403A\u0100;q\xC7\xC6\u026D\u1AD9\0\0\u1AE2a\u0100;t\u1ADE\u1ADF\u402C;\u4040\u0180;fl\u1AE8\u1AE9\u1AEB\u6201\xEE\u1160e\u0100mx\u1AF1\u1AF6ent\xBB\u1AE9e\xF3\u024D\u01E7\u1AFE\0\u1B07\u0100;d\u12BB\u1B02ot;\u6A6Dn\xF4\u0246\u0180fry\u1B10\u1B14\u1B17;\uC000\u{1D554}o\xE4\u0254\u8100\xA9;s\u0155\u1B1Dr;\u6117\u0100ao\u1B25\u1B29rr;\u61B5ss;\u6717\u0100cu\u1B32\u1B37r;\uC000\u{1D4B8}\u0100bp\u1B3C\u1B44\u0100;e\u1B41\u1B42\u6ACF;\u6AD1\u0100;e\u1B49\u1B4A\u6AD0;\u6AD2dot;\u62EF\u0380delprvw\u1B60\u1B6C\u1B77\u1B82\u1BAC\u1BD4\u1BF9arr\u0100lr\u1B68\u1B6A;\u6938;\u6935\u0270\u1B72\0\0\u1B75r;\u62DEc;\u62DFarr\u0100;p\u1B7F\u1B80\u61B6;\u693D\u0300;bcdos\u1B8F\u1B90\u1B96\u1BA1\u1BA5\u1BA8\u622Arcap;\u6A48\u0100au\u1B9B\u1B9Ep;\u6A46p;\u6A4Aot;\u628Dr;\u6A45;\uC000\u222A\uFE00\u0200alrv\u1BB5\u1BBF\u1BDE\u1BE3rr\u0100;m\u1BBC\u1BBD\u61B7;\u693Cy\u0180evw\u1BC7\u1BD4\u1BD8q\u0270\u1BCE\0\0\u1BD2re\xE3\u1B73u\xE3\u1B75ee;\u62CEedge;\u62CFen\u803B\xA4\u40A4earrow\u0100lr\u1BEE\u1BF3eft\xBB\u1B80ight\xBB\u1BBDe\xE4\u1BDD\u0100ci\u1C01\u1C07onin\xF4\u01F7nt;\u6231lcty;\u632D\u0980AHabcdefhijlorstuwz\u1C38\u1C3B\u1C3F\u1C5D\u1C69\u1C75\u1C8A\u1C9E\u1CAC\u1CB7\u1CFB\u1CFF\u1D0D\u1D7B\u1D91\u1DAB\u1DBB\u1DC6\u1DCDr\xF2\u0381ar;\u6965\u0200glrs\u1C48\u1C4D\u1C52\u1C54ger;\u6020eth;\u6138\xF2\u1133h\u0100;v\u1C5A\u1C5B\u6010\xBB\u090A\u016B\u1C61\u1C67arow;\u690Fa\xE3\u0315\u0100ay\u1C6E\u1C73ron;\u410F;\u4434\u0180;ao\u0332\u1C7C\u1C84\u0100gr\u02BF\u1C81r;\u61CAtseq;\u6A77\u0180glm\u1C91\u1C94\u1C98\u803B\xB0\u40B0ta;\u43B4ptyv;\u69B1\u0100ir\u1CA3\u1CA8sht;\u697F;\uC000\u{1D521}ar\u0100lr\u1CB3\u1CB5\xBB\u08DC\xBB\u101E\u0280aegsv\u1CC2\u0378\u1CD6\u1CDC\u1CE0m\u0180;os\u0326\u1CCA\u1CD4nd\u0100;s\u0326\u1CD1uit;\u6666amma;\u43DDin;\u62F2\u0180;io\u1CE7\u1CE8\u1CF8\u40F7de\u8100\xF7;o\u1CE7\u1CF0ntimes;\u62C7n\xF8\u1CF7cy;\u4452c\u026F\u1D06\0\0\u1D0Arn;\u631Eop;\u630D\u0280lptuw\u1D18\u1D1D\u1D22\u1D49\u1D55lar;\u4024f;\uC000\u{1D555}\u0280;emps\u030B\u1D2D\u1D37\u1D3D\u1D42q\u0100;d\u0352\u1D33ot;\u6251inus;\u6238lus;\u6214quare;\u62A1blebarwedg\xE5\xFAn\u0180adh\u112E\u1D5D\u1D67ownarrow\xF3\u1C83arpoon\u0100lr\u1D72\u1D76ef\xF4\u1CB4igh\xF4\u1CB6\u0162\u1D7F\u1D85karo\xF7\u0F42\u026F\u1D8A\0\0\u1D8Ern;\u631Fop;\u630C\u0180cot\u1D98\u1DA3\u1DA6\u0100ry\u1D9D\u1DA1;\uC000\u{1D4B9};\u4455l;\u69F6rok;\u4111\u0100dr\u1DB0\u1DB4ot;\u62F1i\u0100;f\u1DBA\u1816\u65BF\u0100ah\u1DC0\u1DC3r\xF2\u0429a\xF2\u0FA6angle;\u69A6\u0100ci\u1DD2\u1DD5y;\u445Fgrarr;\u67FF\u0900Dacdefglmnopqrstux\u1E01\u1E09\u1E19\u1E38\u0578\u1E3C\u1E49\u1E61\u1E7E\u1EA5\u1EAF\u1EBD\u1EE1\u1F2A\u1F37\u1F44\u1F4E\u1F5A\u0100Do\u1E06\u1D34o\xF4\u1C89\u0100cs\u1E0E\u1E14ute\u803B\xE9\u40E9ter;\u6A6E\u0200aioy\u1E22\u1E27\u1E31\u1E36ron;\u411Br\u0100;c\u1E2D\u1E2E\u6256\u803B\xEA\u40EAlon;\u6255;\u444Dot;\u4117\u0100Dr\u1E41\u1E45ot;\u6252;\uC000\u{1D522}\u0180;rs\u1E50\u1E51\u1E57\u6A9Aave\u803B\xE8\u40E8\u0100;d\u1E5C\u1E5D\u6A96ot;\u6A98\u0200;ils\u1E6A\u1E6B\u1E72\u1E74\u6A99nters;\u63E7;\u6113\u0100;d\u1E79\u1E7A\u6A95ot;\u6A97\u0180aps\u1E85\u1E89\u1E97cr;\u4113ty\u0180;sv\u1E92\u1E93\u1E95\u6205et\xBB\u1E93p\u01001;\u1E9D\u1EA4\u0133\u1EA1\u1EA3;\u6004;\u6005\u6003\u0100gs\u1EAA\u1EAC;\u414Bp;\u6002\u0100gp\u1EB4\u1EB8on;\u4119f;\uC000\u{1D556}\u0180als\u1EC4\u1ECE\u1ED2r\u0100;s\u1ECA\u1ECB\u62D5l;\u69E3us;\u6A71i\u0180;lv\u1EDA\u1EDB\u1EDF\u43B5on\xBB\u1EDB;\u43F5\u0200csuv\u1EEA\u1EF3\u1F0B\u1F23\u0100io\u1EEF\u1E31rc\xBB\u1E2E\u0269\u1EF9\0\0\u1EFB\xED\u0548ant\u0100gl\u1F02\u1F06tr\xBB\u1E5Dess\xBB\u1E7A\u0180aei\u1F12\u1F16\u1F1Als;\u403Dst;\u625Fv\u0100;D\u0235\u1F20D;\u6A78parsl;\u69E5\u0100Da\u1F2F\u1F33ot;\u6253rr;\u6971\u0180cdi\u1F3E\u1F41\u1EF8r;\u612Fo\xF4\u0352\u0100ah\u1F49\u1F4B;\u43B7\u803B\xF0\u40F0\u0100mr\u1F53\u1F57l\u803B\xEB\u40EBo;\u60AC\u0180cip\u1F61\u1F64\u1F67l;\u4021s\xF4\u056E\u0100eo\u1F6C\u1F74ctatio\xEE\u0559nential\xE5\u0579\u09E1\u1F92\0\u1F9E\0\u1FA1\u1FA7\0\0\u1FC6\u1FCC\0\u1FD3\0\u1FE6\u1FEA\u2000\0\u2008\u205Allingdotse\xF1\u1E44y;\u4444male;\u6640\u0180ilr\u1FAD\u1FB3\u1FC1lig;\u8000\uFB03\u0269\u1FB9\0\0\u1FBDg;\u8000\uFB00ig;\u8000\uFB04;\uC000\u{1D523}lig;\u8000\uFB01lig;\uC000fj\u0180alt\u1FD9\u1FDC\u1FE1t;\u666Dig;\u8000\uFB02ns;\u65B1of;\u4192\u01F0\u1FEE\0\u1FF3f;\uC000\u{1D557}\u0100ak\u05BF\u1FF7\u0100;v\u1FFC\u1FFD\u62D4;\u6AD9artint;\u6A0D\u0100ao\u200C\u2055\u0100cs\u2011\u2052\u03B1\u201A\u2030\u2038\u2045\u2048\0\u2050\u03B2\u2022\u2025\u2027\u202A\u202C\0\u202E\u803B\xBD\u40BD;\u6153\u803B\xBC\u40BC;\u6155;\u6159;\u615B\u01B3\u2034\0\u2036;\u6154;\u6156\u02B4\u203E\u2041\0\0\u2043\u803B\xBE\u40BE;\u6157;\u615C5;\u6158\u01B6\u204C\0\u204E;\u615A;\u615D8;\u615El;\u6044wn;\u6322cr;\uC000\u{1D4BB}\u0880Eabcdefgijlnorstv\u2082\u2089\u209F\u20A5\u20B0\u20B4\u20F0\u20F5\u20FA\u20FF\u2103\u2112\u2138\u0317\u213E\u2152\u219E\u0100;l\u064D\u2087;\u6A8C\u0180cmp\u2090\u2095\u209Dute;\u41F5ma\u0100;d\u209C\u1CDA\u43B3;\u6A86reve;\u411F\u0100iy\u20AA\u20AErc;\u411D;\u4433ot;\u4121\u0200;lqs\u063E\u0642\u20BD\u20C9\u0180;qs\u063E\u064C\u20C4lan\xF4\u0665\u0200;cdl\u0665\u20D2\u20D5\u20E5c;\u6AA9ot\u0100;o\u20DC\u20DD\u6A80\u0100;l\u20E2\u20E3\u6A82;\u6A84\u0100;e\u20EA\u20ED\uC000\u22DB\uFE00s;\u6A94r;\uC000\u{1D524}\u0100;g\u0673\u061Bmel;\u6137cy;\u4453\u0200;Eaj\u065A\u210C\u210E\u2110;\u6A92;\u6AA5;\u6AA4\u0200Eaes\u211B\u211D\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6A8Arox\xBB\u2124\u0100;q\u212E\u212F\u6A88\u0100;q\u212E\u211Bim;\u62E7pf;\uC000\u{1D558}\u0100ci\u2143\u2146r;\u610Am\u0180;el\u066B\u214E\u2150;\u6A8E;\u6A90\u8300>;cdlqr\u05EE\u2160\u216A\u216E\u2173\u2179\u0100ci\u2165\u2167;\u6AA7r;\u6A7Aot;\u62D7Par;\u6995uest;\u6A7C\u0280adels\u2184\u216A\u2190\u0656\u219B\u01F0\u2189\0\u218Epro\xF8\u209Er;\u6978q\u0100lq\u063F\u2196les\xF3\u2088i\xED\u066B\u0100en\u21A3\u21ADrtneqq;\uC000\u2269\uFE00\xC5\u21AA\u0500Aabcefkosy\u21C4\u21C7\u21F1\u21F5\u21FA\u2218\u221D\u222F\u2268\u227Dr\xF2\u03A0\u0200ilmr\u21D0\u21D4\u21D7\u21DBrs\xF0\u1484f\xBB\u2024il\xF4\u06A9\u0100dr\u21E0\u21E4cy;\u444A\u0180;cw\u08F4\u21EB\u21EFir;\u6948;\u61ADar;\u610Firc;\u4125\u0180alr\u2201\u220E\u2213rts\u0100;u\u2209\u220A\u6665it\xBB\u220Alip;\u6026con;\u62B9r;\uC000\u{1D525}s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223A\u223E\u2243\u225E\u2263rr;\u61FFtht;\u623Bk\u0100lr\u2249\u2253eftarrow;\u61A9ightarrow;\u61AAf;\uC000\u{1D559}bar;\u6015\u0180clt\u226F\u2274\u2278r;\uC000\u{1D4BD}as\xE8\u21F4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xBB\u1C5B\u0AE1\u22A3\0\u22AA\0\u22B8\u22C5\u22CE\0\u22D5\u22F3\0\0\u22F8\u2322\u2367\u2362\u237F\0\u2386\u23AA\u23B4cute\u803B\xED\u40ED\u0180;iy\u0771\u22B0\u22B5rc\u803B\xEE\u40EE;\u4438\u0100cx\u22BC\u22BFy;\u4435cl\u803B\xA1\u40A1\u0100fr\u039F\u22C9;\uC000\u{1D526}rave\u803B\xEC\u40EC\u0200;ino\u073E\u22DD\u22E9\u22EE\u0100in\u22E2\u22E6nt;\u6A0Ct;\u622Dfin;\u69DCta;\u6129lig;\u4133\u0180aop\u22FE\u231A\u231D\u0180cgt\u2305\u2308\u2317r;\u412B\u0180elp\u071F\u230F\u2313in\xE5\u078Ear\xF4\u0720h;\u4131f;\u62B7ed;\u41B5\u0280;cfot\u04F4\u232C\u2331\u233D\u2341are;\u6105in\u0100;t\u2338\u2339\u621Eie;\u69DDdo\xF4\u2319\u0280;celp\u0757\u234C\u2350\u235B\u2361al;\u62BA\u0100gr\u2355\u2359er\xF3\u1563\xE3\u234Darhk;\u6A17rod;\u6A3C\u0200cgpt\u236F\u2372\u2376\u237By;\u4451on;\u412Ff;\uC000\u{1D55A}a;\u43B9uest\u803B\xBF\u40BF\u0100ci\u238A\u238Fr;\uC000\u{1D4BE}n\u0280;Edsv\u04F4\u239B\u239D\u23A1\u04F3;\u62F9ot;\u62F5\u0100;v\u23A6\u23A7\u62F4;\u62F3\u0100;i\u0777\u23AElde;\u4129\u01EB\u23B8\0\u23BCcy;\u4456l\u803B\xEF\u40EF\u0300cfmosu\u23CC\u23D7\u23DC\u23E1\u23E7\u23F5\u0100iy\u23D1\u23D5rc;\u4135;\u4439r;\uC000\u{1D527}ath;\u4237pf;\uC000\u{1D55B}\u01E3\u23EC\0\u23F1r;\uC000\u{1D4BF}rcy;\u4458kcy;\u4454\u0400acfghjos\u240B\u2416\u2422\u2427\u242D\u2431\u2435\u243Bppa\u0100;v\u2413\u2414\u43BA;\u43F0\u0100ey\u241B\u2420dil;\u4137;\u443Ar;\uC000\u{1D528}reen;\u4138cy;\u4445cy;\u445Cpf;\uC000\u{1D55C}cr;\uC000\u{1D4C0}\u0B80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248D\u2491\u250E\u253D\u255A\u2580\u264E\u265E\u2665\u2679\u267D\u269A\u26B2\u26D8\u275D\u2768\u278B\u27C0\u2801\u2812\u0180art\u2477\u247A\u247Cr\xF2\u09C6\xF2\u0395ail;\u691Barr;\u690E\u0100;g\u0994\u248B;\u6A8Bar;\u6962\u0963\u24A5\0\u24AA\0\u24B1\0\0\0\0\0\u24B5\u24BA\0\u24C6\u24C8\u24CD\0\u24F9ute;\u413Amptyv;\u69B4ra\xEE\u084Cbda;\u43BBg\u0180;dl\u088E\u24C1\u24C3;\u6991\xE5\u088E;\u6A85uo\u803B\xAB\u40ABr\u0400;bfhlpst\u0899\u24DE\u24E6\u24E9\u24EB\u24EE\u24F1\u24F5\u0100;f\u089D\u24E3s;\u691Fs;\u691D\xEB\u2252p;\u61ABl;\u6939im;\u6973l;\u61A2\u0180;ae\u24FF\u2500\u2504\u6AABil;\u6919\u0100;s\u2509\u250A\u6AAD;\uC000\u2AAD\uFE00\u0180abr\u2515\u2519\u251Drr;\u690Crk;\u6772\u0100ak\u2522\u252Cc\u0100ek\u2528\u252A;\u407B;\u405B\u0100es\u2531\u2533;\u698Bl\u0100du\u2539\u253B;\u698F;\u698D\u0200aeuy\u2546\u254B\u2556\u2558ron;\u413E\u0100di\u2550\u2554il;\u413C\xEC\u08B0\xE2\u2529;\u443B\u0200cqrs\u2563\u2566\u256D\u257Da;\u6936uo\u0100;r\u0E19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694Bh;\u61B2\u0280;fgqs\u258B\u258C\u0989\u25F3\u25FF\u6264t\u0280ahlrt\u2598\u25A4\u25B7\u25C2\u25E8rrow\u0100;t\u0899\u25A1a\xE9\u24F6arpoon\u0100du\u25AF\u25B4own\xBB\u045Ap\xBB\u0966eftarrows;\u61C7ight\u0180ahs\u25CD\u25D6\u25DErrow\u0100;s\u08F4\u08A7arpoon\xF3\u0F98quigarro\xF7\u21F0hreetimes;\u62CB\u0180;qs\u258B\u0993\u25FAlan\xF4\u09AC\u0280;cdgs\u09AC\u260A\u260D\u261D\u2628c;\u6AA8ot\u0100;o\u2614\u2615\u6A7F\u0100;r\u261A\u261B\u6A81;\u6A83\u0100;e\u2622\u2625\uC000\u22DA\uFE00s;\u6A93\u0280adegs\u2633\u2639\u263D\u2649\u264Bppro\xF8\u24C6ot;\u62D6q\u0100gq\u2643\u2645\xF4\u0989gt\xF2\u248C\xF4\u099Bi\xED\u09B2\u0180ilr\u2655\u08E1\u265Asht;\u697C;\uC000\u{1D529}\u0100;E\u099C\u2663;\u6A91\u0161\u2669\u2676r\u0100du\u25B2\u266E\u0100;l\u0965\u2673;\u696Alk;\u6584cy;\u4459\u0280;acht\u0A48\u2688\u268B\u2691\u2696r\xF2\u25C1orne\xF2\u1D08ard;\u696Bri;\u65FA\u0100io\u269F\u26A4dot;\u4140ust\u0100;a\u26AC\u26AD\u63B0che\xBB\u26AD\u0200Eaes\u26BB\u26BD\u26C9\u26D4;\u6268p\u0100;p\u26C3\u26C4\u6A89rox\xBB\u26C4\u0100;q\u26CE\u26CF\u6A87\u0100;q\u26CE\u26BBim;\u62E6\u0400abnoptwz\u26E9\u26F4\u26F7\u271A\u272F\u2741\u2747\u2750\u0100nr\u26EE\u26F1g;\u67ECr;\u61FDr\xEB\u08C1g\u0180lmr\u26FF\u270D\u2714eft\u0100ar\u09E6\u2707ight\xE1\u09F2apsto;\u67FCight\xE1\u09FDparrow\u0100lr\u2725\u2729ef\xF4\u24EDight;\u61AC\u0180afl\u2736\u2739\u273Dr;\u6985;\uC000\u{1D55D}us;\u6A2Dimes;\u6A34\u0161\u274B\u274Fst;\u6217\xE1\u134E\u0180;ef\u2757\u2758\u1800\u65CAnge\xBB\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277C\u2785\u2787r\xF2\u08A8orne\xF2\u1D8Car\u0100;d\u0F98\u2783;\u696D;\u600Eri;\u62BF\u0300achiqt\u2798\u279D\u0A40\u27A2\u27AE\u27BBquo;\u6039r;\uC000\u{1D4C1}m\u0180;eg\u09B2\u27AA\u27AC;\u6A8D;\u6A8F\u0100bu\u252A\u27B3o\u0100;r\u0E1F\u27B9;\u601Arok;\u4142\u8400<;cdhilqr\u082B\u27D2\u2639\u27DC\u27E0\u27E5\u27EA\u27F0\u0100ci\u27D7\u27D9;\u6AA6r;\u6A79re\xE5\u25F2mes;\u62C9arr;\u6976uest;\u6A7B\u0100Pi\u27F5\u27F9ar;\u6996\u0180;ef\u2800\u092D\u181B\u65C3r\u0100du\u2807\u280Dshar;\u694Ahar;\u6966\u0100en\u2817\u2821rtneqq;\uC000\u2268\uFE00\xC5\u281E\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288E\u2893\u28A0\u28A5\u28A8\u28DA\u28E2\u28E4\u0A83\u28F3\u2902Dot;\u623A\u0200clpr\u284E\u2852\u2863\u287Dr\u803B\xAF\u40AF\u0100et\u2857\u2859;\u6642\u0100;e\u285E\u285F\u6720se\xBB\u285F\u0100;s\u103B\u2868to\u0200;dlu\u103B\u2873\u2877\u287Bow\xEE\u048Cef\xF4\u090F\xF0\u13D1ker;\u65AE\u0100oy\u2887\u288Cmma;\u6A29;\u443Cash;\u6014asuredangle\xBB\u1626r;\uC000\u{1D52A}o;\u6127\u0180cdn\u28AF\u28B4\u28C9ro\u803B\xB5\u40B5\u0200;acd\u1464\u28BD\u28C0\u28C4s\xF4\u16A7ir;\u6AF0ot\u80BB\xB7\u01B5us\u0180;bd\u28D2\u1903\u28D3\u6212\u0100;u\u1D3C\u28D8;\u6A2A\u0163\u28DE\u28E1p;\u6ADB\xF2\u2212\xF0\u0A81\u0100dp\u28E9\u28EEels;\u62A7f;\uC000\u{1D55E}\u0100ct\u28F8\u28FDr;\uC000\u{1D4C2}pos\xBB\u159D\u0180;lm\u2909\u290A\u290D\u43BCtimap;\u62B8\u0C00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297E\u2989\u2998\u29DA\u29E9\u2A15\u2A1A\u2A58\u2A5D\u2A83\u2A95\u2AA4\u2AA8\u2B04\u2B07\u2B44\u2B7F\u2BAE\u2C34\u2C67\u2C7C\u2CE9\u0100gt\u2947\u294B;\uC000\u22D9\u0338\u0100;v\u2950\u0BCF\uC000\u226B\u20D2\u0180elt\u295A\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61CDightarrow;\u61CE;\uC000\u22D8\u0338\u0100;v\u297B\u0C47\uC000\u226A\u20D2ightarrow;\u61CF\u0100Dd\u298E\u2993ash;\u62AFash;\u62AE\u0280bcnpt\u29A3\u29A7\u29AC\u29B1\u29CCla\xBB\u02DEute;\u4144g;\uC000\u2220\u20D2\u0280;Eiop\u0D84\u29BC\u29C0\u29C5\u29C8;\uC000\u2A70\u0338d;\uC000\u224B\u0338s;\u4149ro\xF8\u0D84ur\u0100;a\u29D3\u29D4\u666El\u0100;s\u29D3\u0B38\u01F3\u29DF\0\u29E3p\u80BB\xA0\u0B37mp\u0100;e\u0BF9\u0C00\u0280aeouy\u29F4\u29FE\u2A03\u2A10\u2A13\u01F0\u29F9\0\u29FB;\u6A43on;\u4148dil;\u4146ng\u0100;d\u0D7E\u2A0Aot;\uC000\u2A6D\u0338p;\u6A42;\u443Dash;\u6013\u0380;Aadqsx\u0B92\u2A29\u2A2D\u2A3B\u2A41\u2A45\u2A50rr;\u61D7r\u0100hr\u2A33\u2A36k;\u6924\u0100;o\u13F2\u13F0ot;\uC000\u2250\u0338ui\xF6\u0B63\u0100ei\u2A4A\u2A4Ear;\u6928\xED\u0B98ist\u0100;s\u0BA0\u0B9Fr;\uC000\u{1D52B}\u0200Eest\u0BC5\u2A66\u2A79\u2A7C\u0180;qs\u0BBC\u2A6D\u0BE1\u0180;qs\u0BBC\u0BC5\u2A74lan\xF4\u0BE2i\xED\u0BEA\u0100;r\u0BB6\u2A81\xBB\u0BB7\u0180Aap\u2A8A\u2A8D\u2A91r\xF2\u2971rr;\u61AEar;\u6AF2\u0180;sv\u0F8D\u2A9C\u0F8C\u0100;d\u2AA1\u2AA2\u62FC;\u62FAcy;\u445A\u0380AEadest\u2AB7\u2ABA\u2ABE\u2AC2\u2AC5\u2AF6\u2AF9r\xF2\u2966;\uC000\u2266\u0338rr;\u619Ar;\u6025\u0200;fqs\u0C3B\u2ACE\u2AE3\u2AEFt\u0100ar\u2AD4\u2AD9rro\xF7\u2AC1ightarro\xF7\u2A90\u0180;qs\u0C3B\u2ABA\u2AEAlan\xF4\u0C55\u0100;s\u0C55\u2AF4\xBB\u0C36i\xED\u0C5D\u0100;r\u0C35\u2AFEi\u0100;e\u0C1A\u0C25i\xE4\u0D90\u0100pt\u2B0C\u2B11f;\uC000\u{1D55F}\u8180\xAC;in\u2B19\u2B1A\u2B36\u40ACn\u0200;Edv\u0B89\u2B24\u2B28\u2B2E;\uC000\u22F9\u0338ot;\uC000\u22F5\u0338\u01E1\u0B89\u2B33\u2B35;\u62F7;\u62F6i\u0100;v\u0CB8\u2B3C\u01E1\u0CB8\u2B41\u2B43;\u62FE;\u62FD\u0180aor\u2B4B\u2B63\u2B69r\u0200;ast\u0B7B\u2B55\u2B5A\u2B5Flle\xEC\u0B7Bl;\uC000\u2AFD\u20E5;\uC000\u2202\u0338lint;\u6A14\u0180;ce\u0C92\u2B70\u2B73u\xE5\u0CA5\u0100;c\u0C98\u2B78\u0100;e\u0C92\u2B7D\xF1\u0C98\u0200Aait\u2B88\u2B8B\u2B9D\u2BA7r\xF2\u2988rr\u0180;cw\u2B94\u2B95\u2B99\u619B;\uC000\u2933\u0338;\uC000\u219D\u0338ghtarrow\xBB\u2B95ri\u0100;e\u0CCB\u0CD6\u0380chimpqu\u2BBD\u2BCD\u2BD9\u2B04\u0B78\u2BE4\u2BEF\u0200;cer\u0D32\u2BC6\u0D37\u2BC9u\xE5\u0D45;\uC000\u{1D4C3}ort\u026D\u2B05\0\0\u2BD6ar\xE1\u2B56m\u0100;e\u0D6E\u2BDF\u0100;q\u0D74\u0D73su\u0100bp\u2BEB\u2BED\xE5\u0CF8\xE5\u0D0B\u0180bcp\u2BF6\u2C11\u2C19\u0200;Ees\u2BFF\u2C00\u0D22\u2C04\u6284;\uC000\u2AC5\u0338et\u0100;e\u0D1B\u2C0Bq\u0100;q\u0D23\u2C00c\u0100;e\u0D32\u2C17\xF1\u0D38\u0200;Ees\u2C22\u2C23\u0D5F\u2C27\u6285;\uC000\u2AC6\u0338et\u0100;e\u0D58\u2C2Eq\u0100;q\u0D60\u2C23\u0200gilr\u2C3D\u2C3F\u2C45\u2C47\xEC\u0BD7lde\u803B\xF1\u40F1\xE7\u0C43iangle\u0100lr\u2C52\u2C5Ceft\u0100;e\u0C1A\u2C5A\xF1\u0C26ight\u0100;e\u0CCB\u2C65\xF1\u0CD7\u0100;m\u2C6C\u2C6D\u43BD\u0180;es\u2C74\u2C75\u2C79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2C8F\u2C94\u2C99\u2C9E\u2CA3\u2CB0\u2CB6\u2CD3\u2CE3ash;\u62ADarr;\u6904p;\uC000\u224D\u20D2ash;\u62AC\u0100et\u2CA8\u2CAC;\uC000\u2265\u20D2;\uC000>\u20D2nfin;\u69DE\u0180Aet\u2CBD\u2CC1\u2CC5rr;\u6902;\uC000\u2264\u20D2\u0100;r\u2CCA\u2CCD\uC000<\u20D2ie;\uC000\u22B4\u20D2\u0100At\u2CD8\u2CDCrr;\u6903rie;\uC000\u22B5\u20D2im;\uC000\u223C\u20D2\u0180Aan\u2CF0\u2CF4\u2D02rr;\u61D6r\u0100hr\u2CFA\u2CFDk;\u6923\u0100;o\u13E7\u13E5ear;\u6927\u1253\u1A95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2D2D\0\u2D38\u2D48\u2D60\u2D65\u2D72\u2D84\u1B07\0\0\u2D8D\u2DAB\0\u2DC8\u2DCE\0\u2DDC\u2E19\u2E2B\u2E3E\u2E43\u0100cs\u2D31\u1A97ute\u803B\xF3\u40F3\u0100iy\u2D3C\u2D45r\u0100;c\u1A9E\u2D42\u803B\xF4\u40F4;\u443E\u0280abios\u1AA0\u2D52\u2D57\u01C8\u2D5Alac;\u4151v;\u6A38old;\u69BClig;\u4153\u0100cr\u2D69\u2D6Dir;\u69BF;\uC000\u{1D52C}\u036F\u2D79\0\0\u2D7C\0\u2D82n;\u42DBave\u803B\xF2\u40F2;\u69C1\u0100bm\u2D88\u0DF4ar;\u69B5\u0200acit\u2D95\u2D98\u2DA5\u2DA8r\xF2\u1A80\u0100ir\u2D9D\u2DA0r;\u69BEoss;\u69BBn\xE5\u0E52;\u69C0\u0180aei\u2DB1\u2DB5\u2DB9cr;\u414Dga;\u43C9\u0180cdn\u2DC0\u2DC5\u01CDron;\u43BF;\u69B6pf;\uC000\u{1D560}\u0180ael\u2DD4\u2DD7\u01D2r;\u69B7rp;\u69B9\u0380;adiosv\u2DEA\u2DEB\u2DEE\u2E08\u2E0D\u2E10\u2E16\u6228r\xF2\u1A86\u0200;efm\u2DF7\u2DF8\u2E02\u2E05\u6A5Dr\u0100;o\u2DFE\u2DFF\u6134f\xBB\u2DFF\u803B\xAA\u40AA\u803B\xBA\u40BAgof;\u62B6r;\u6A56lope;\u6A57;\u6A5B\u0180clo\u2E1F\u2E21\u2E27\xF2\u2E01ash\u803B\xF8\u40F8l;\u6298i\u016C\u2E2F\u2E34de\u803B\xF5\u40F5es\u0100;a\u01DB\u2E3As;\u6A36ml\u803B\xF6\u40F6bar;\u633D\u0AE1\u2E5E\0\u2E7D\0\u2E80\u2E9D\0\u2EA2\u2EB9\0\0\u2ECB\u0E9C\0\u2F13\0\0\u2F2B\u2FBC\0\u2FC8r\u0200;ast\u0403\u2E67\u2E72\u0E85\u8100\xB6;l\u2E6D\u2E6E\u40B6le\xEC\u0403\u0269\u2E78\0\0\u2E7Bm;\u6AF3;\u6AFDy;\u443Fr\u0280cimpt\u2E8B\u2E8F\u2E93\u1865\u2E97nt;\u4025od;\u402Eil;\u6030enk;\u6031r;\uC000\u{1D52D}\u0180imo\u2EA8\u2EB0\u2EB4\u0100;v\u2EAD\u2EAE\u43C6;\u43D5ma\xF4\u0A76ne;\u660E\u0180;tv\u2EBF\u2EC0\u2EC8\u43C0chfork\xBB\u1FFD;\u43D6\u0100au\u2ECF\u2EDFn\u0100ck\u2ED5\u2EDDk\u0100;h\u21F4\u2EDB;\u610E\xF6\u21F4s\u0480;abcdemst\u2EF3\u2EF4\u1908\u2EF9\u2EFD\u2F04\u2F06\u2F0A\u2F0E\u402Bcir;\u6A23ir;\u6A22\u0100ou\u1D40\u2F02;\u6A25;\u6A72n\u80BB\xB1\u0E9Dim;\u6A26wo;\u6A27\u0180ipu\u2F19\u2F20\u2F25ntint;\u6A15f;\uC000\u{1D561}nd\u803B\xA3\u40A3\u0500;Eaceinosu\u0EC8\u2F3F\u2F41\u2F44\u2F47\u2F81\u2F89\u2F92\u2F7E\u2FB6;\u6AB3p;\u6AB7u\xE5\u0ED9\u0100;c\u0ECE\u2F4C\u0300;acens\u0EC8\u2F59\u2F5F\u2F66\u2F68\u2F7Eppro\xF8\u2F43urlye\xF1\u0ED9\xF1\u0ECE\u0180aes\u2F6F\u2F76\u2F7Approx;\u6AB9qq;\u6AB5im;\u62E8i\xED\u0EDFme\u0100;s\u2F88\u0EAE\u6032\u0180Eas\u2F78\u2F90\u2F7A\xF0\u2F75\u0180dfp\u0EEC\u2F99\u2FAF\u0180als\u2FA0\u2FA5\u2FAAlar;\u632Eine;\u6312urf;\u6313\u0100;t\u0EFB\u2FB4\xEF\u0EFBrel;\u62B0\u0100ci\u2FC0\u2FC5r;\uC000\u{1D4C5};\u43C8ncsp;\u6008\u0300fiopsu\u2FDA\u22E2\u2FDF\u2FE5\u2FEB\u2FF1r;\uC000\u{1D52E}pf;\uC000\u{1D562}rime;\u6057cr;\uC000\u{1D4C6}\u0180aeo\u2FF8\u3009\u3013t\u0100ei\u2FFE\u3005rnion\xF3\u06B0nt;\u6A16st\u0100;e\u3010\u3011\u403F\xF1\u1F19\xF4\u0F14\u0A80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30E0\u310E\u312B\u3147\u3162\u3172\u318E\u3206\u3215\u3224\u3229\u3258\u326E\u3272\u3290\u32B0\u32B7\u0180art\u3047\u304A\u304Cr\xF2\u10B3\xF2\u03DDail;\u691Car\xF2\u1C65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307F\u308F\u3094\u30CC\u0100eu\u306D\u3071;\uC000\u223D\u0331te;\u4155i\xE3\u116Emptyv;\u69B3g\u0200;del\u0FD1\u3089\u308B\u308D;\u6992;\u69A5\xE5\u0FD1uo\u803B\xBB\u40BBr\u0580;abcfhlpstw\u0FDC\u30AC\u30AF\u30B7\u30B9\u30BC\u30BE\u30C0\u30C3\u30C7\u30CAp;\u6975\u0100;f\u0FE0\u30B4s;\u6920;\u6933s;\u691E\xEB\u225D\xF0\u272El;\u6945im;\u6974l;\u61A3;\u619D\u0100ai\u30D1\u30D5il;\u691Ao\u0100;n\u30DB\u30DC\u6236al\xF3\u0F1E\u0180abr\u30E7\u30EA\u30EEr\xF2\u17E5rk;\u6773\u0100ak\u30F3\u30FDc\u0100ek\u30F9\u30FB;\u407D;\u405D\u0100es\u3102\u3104;\u698Cl\u0100du\u310A\u310C;\u698E;\u6990\u0200aeuy\u3117\u311C\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xEC\u0FF2\xE2\u30FA;\u4440\u0200clqs\u3134\u3137\u313D\u3144a;\u6937dhar;\u6969uo\u0100;r\u020E\u020Dh;\u61B3\u0180acg\u314E\u315F\u0F44l\u0200;ips\u0F78\u3158\u315B\u109Cn\xE5\u10BBar\xF4\u0FA9t;\u65AD\u0180ilr\u3169\u1023\u316Esht;\u697D;\uC000\u{1D52F}\u0100ao\u3177\u3186r\u0100du\u317D\u317F\xBB\u047B\u0100;l\u1091\u3184;\u696C\u0100;v\u318B\u318C\u43C1;\u43F1\u0180gns\u3195\u31F9\u31FCht\u0300ahlrst\u31A4\u31B0\u31C2\u31D8\u31E4\u31EErrow\u0100;t\u0FDC\u31ADa\xE9\u30C8arpoon\u0100du\u31BB\u31BFow\xEE\u317Ep\xBB\u1092eft\u0100ah\u31CA\u31D0rrow\xF3\u0FEAarpoon\xF3\u0551ightarrows;\u61C9quigarro\xF7\u30CBhreetimes;\u62CCg;\u42DAingdotse\xF1\u1F32\u0180ahm\u320D\u3210\u3213r\xF2\u0FEAa\xF2\u0551;\u600Foust\u0100;a\u321E\u321F\u63B1che\xBB\u321Fmid;\u6AEE\u0200abpt\u3232\u323D\u3240\u3252\u0100nr\u3237\u323Ag;\u67EDr;\u61FEr\xEB\u1003\u0180afl\u3247\u324A\u324Er;\u6986;\uC000\u{1D563}us;\u6A2Eimes;\u6A35\u0100ap\u325D\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6A12ar\xF2\u31E3\u0200achq\u327B\u3280\u10BC\u3285quo;\u603Ar;\uC000\u{1D4C7}\u0100bu\u30FB\u328Ao\u0100;r\u0214\u0213\u0180hir\u3297\u329B\u32A0re\xE5\u31F8mes;\u62CAi\u0200;efl\u32AA\u1059\u1821\u32AB\u65B9tri;\u69CEluhar;\u6968;\u611E\u0D61\u32D5\u32DB\u32DF\u332C\u3338\u3371\0\u337A\u33A4\0\0\u33EC\u33F0\0\u3428\u3448\u345A\u34AD\u34B1\u34CA\u34F1\0\u3616\0\0\u3633cute;\u415Bqu\xEF\u27BA\u0500;Eaceinpsy\u11ED\u32F3\u32F5\u32FF\u3302\u330B\u330F\u331F\u3326\u3329;\u6AB4\u01F0\u32FA\0\u32FC;\u6AB8on;\u4161u\xE5\u11FE\u0100;d\u11F3\u3307il;\u415Frc;\u415D\u0180Eas\u3316\u3318\u331B;\u6AB6p;\u6ABAim;\u62E9olint;\u6A13i\xED\u1204;\u4441ot\u0180;be\u3334\u1D47\u3335\u62C5;\u6A66\u0380Aacmstx\u3346\u334A\u3357\u335B\u335E\u3363\u336Drr;\u61D8r\u0100hr\u3350\u3352\xEB\u2228\u0100;o\u0A36\u0A34t\u803B\xA7\u40A7i;\u403Bwar;\u6929m\u0100in\u3369\xF0nu\xF3\xF1t;\u6736r\u0100;o\u3376\u2055\uC000\u{1D530}\u0200acoy\u3382\u3386\u3391\u33A0rp;\u666F\u0100hy\u338B\u338Fcy;\u4449;\u4448rt\u026D\u3399\0\0\u339Ci\xE4\u1464ara\xEC\u2E6F\u803B\xAD\u40AD\u0100gm\u33A8\u33B4ma\u0180;fv\u33B1\u33B2\u33B2\u43C3;\u43C2\u0400;deglnpr\u12AB\u33C5\u33C9\u33CE\u33D6\u33DE\u33E1\u33E6ot;\u6A6A\u0100;q\u12B1\u12B0\u0100;E\u33D3\u33D4\u6A9E;\u6AA0\u0100;E\u33DB\u33DC\u6A9D;\u6A9Fe;\u6246lus;\u6A24arr;\u6972ar\xF2\u113D\u0200aeit\u33F8\u3408\u340F\u3417\u0100ls\u33FD\u3404lsetm\xE9\u336Ahp;\u6A33parsl;\u69E4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341C\u341D\u6AAA\u0100;s\u3422\u3423\u6AAC;\uC000\u2AAC\uFE00\u0180flp\u342E\u3433\u3442tcy;\u444C\u0100;b\u3438\u3439\u402F\u0100;a\u343E\u343F\u69C4r;\u633Ff;\uC000\u{1D564}a\u0100dr\u344D\u0402es\u0100;u\u3454\u3455\u6660it\xBB\u3455\u0180csu\u3460\u3479\u349F\u0100au\u3465\u346Fp\u0100;s\u1188\u346B;\uC000\u2293\uFE00p\u0100;s\u11B4\u3475;\uC000\u2294\uFE00u\u0100bp\u347F\u348F\u0180;es\u1197\u119C\u3486et\u0100;e\u1197\u348D\xF1\u119D\u0180;es\u11A8\u11AD\u3496et\u0100;e\u11A8\u349D\xF1\u11AE\u0180;af\u117B\u34A6\u05B0r\u0165\u34AB\u05B1\xBB\u117Car\xF2\u1148\u0200cemt\u34B9\u34BE\u34C2\u34C5r;\uC000\u{1D4C8}tm\xEE\xF1i\xEC\u3415ar\xE6\u11BE\u0100ar\u34CE\u34D5r\u0100;f\u34D4\u17BF\u6606\u0100an\u34DA\u34EDight\u0100ep\u34E3\u34EApsilo\xEE\u1EE0h\xE9\u2EAFs\xBB\u2852\u0280bcmnp\u34FB\u355E\u1209\u358B\u358E\u0480;Edemnprs\u350E\u350F\u3511\u3515\u351E\u3523\u352C\u3531\u3536\u6282;\u6AC5ot;\u6ABD\u0100;d\u11DA\u351Aot;\u6AC3ult;\u6AC1\u0100Ee\u3528\u352A;\u6ACB;\u628Alus;\u6ABFarr;\u6979\u0180eiu\u353D\u3552\u3555t\u0180;en\u350E\u3545\u354Bq\u0100;q\u11DA\u350Feq\u0100;q\u352B\u3528m;\u6AC7\u0100bp\u355A\u355C;\u6AD5;\u6AD3c\u0300;acens\u11ED\u356C\u3572\u3579\u357B\u3326ppro\xF8\u32FAurlye\xF1\u11FE\xF1\u11F3\u0180aes\u3582\u3588\u331Bppro\xF8\u331Aq\xF1\u3317g;\u666A\u0680123;Edehlmnps\u35A9\u35AC\u35AF\u121C\u35B2\u35B4\u35C0\u35C9\u35D5\u35DA\u35DF\u35E8\u35ED\u803B\xB9\u40B9\u803B\xB2\u40B2\u803B\xB3\u40B3;\u6AC6\u0100os\u35B9\u35BCt;\u6ABEub;\u6AD8\u0100;d\u1222\u35C5ot;\u6AC4s\u0100ou\u35CF\u35D2l;\u67C9b;\u6AD7arr;\u697Bult;\u6AC2\u0100Ee\u35E4\u35E6;\u6ACC;\u628Blus;\u6AC0\u0180eiu\u35F4\u3609\u360Ct\u0180;en\u121C\u35FC\u3602q\u0100;q\u1222\u35B2eq\u0100;q\u35E7\u35E4m;\u6AC8\u0100bp\u3611\u3613;\u6AD4;\u6AD6\u0180Aan\u361C\u3620\u362Drr;\u61D9r\u0100hr\u3626\u3628\xEB\u222E\u0100;o\u0A2B\u0A29war;\u692Alig\u803B\xDF\u40DF\u0BE1\u3651\u365D\u3660\u12CE\u3673\u3679\0\u367E\u36C2\0\0\0\0\0\u36DB\u3703\0\u3709\u376C\0\0\0\u3787\u0272\u3656\0\0\u365Bget;\u6316;\u43C4r\xEB\u0E5F\u0180aey\u3666\u366B\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uC000\u{1D531}\u0200eiko\u3686\u369D\u36B5\u36BC\u01F2\u368B\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369B\u43B8ym;\u43D1\u0100cn\u36A2\u36B2k\u0100as\u36A8\u36AEppro\xF8\u12C1im\xBB\u12ACs\xF0\u129E\u0100as\u36BA\u36AE\xF0\u12C1rn\u803B\xFE\u40FE\u01EC\u031F\u36C6\u22E7es\u8180\xD7;bd\u36CF\u36D0\u36D8\u40D7\u0100;a\u190F\u36D5r;\u6A31;\u6A30\u0180eps\u36E1\u36E3\u3700\xE1\u2A4D\u0200;bcf\u0486\u36EC\u36F0\u36F4ot;\u6336ir;\u6AF1\u0100;o\u36F9\u36FC\uC000\u{1D565}rk;\u6ADA\xE1\u3362rime;\u6034\u0180aip\u370F\u3712\u3764d\xE5\u1248\u0380adempst\u3721\u374D\u3740\u3751\u3757\u375C\u375Fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65B5own\xBB\u1DBBeft\u0100;e\u2800\u373E\xF1\u092E;\u625Cight\u0100;e\u32AA\u374B\xF1\u105Aot;\u65ECinus;\u6A3Alus;\u6A39b;\u69CDime;\u6A3Bezium;\u63E2\u0180cht\u3772\u377D\u3781\u0100ry\u3777\u377B;\uC000\u{1D4C9};\u4446cy;\u445Brok;\u4167\u0100io\u378B\u378Ex\xF4\u1777head\u0100lr\u3797\u37A0eftarro\xF7\u084Fightarrow\xBB\u0F5D\u0900AHabcdfghlmoprstuw\u37D0\u37D3\u37D7\u37E4\u37F0\u37FC\u380E\u381C\u3823\u3834\u3851\u385D\u386B\u38A9\u38CC\u38D2\u38EA\u38F6r\xF2\u03EDar;\u6963\u0100cr\u37DC\u37E2ute\u803B\xFA\u40FA\xF2\u1150r\u01E3\u37EA\0\u37EDy;\u445Eve;\u416D\u0100iy\u37F5\u37FArc\u803B\xFB\u40FB;\u4443\u0180abh\u3803\u3806\u380Br\xF2\u13ADlac;\u4171a\xF2\u13C3\u0100ir\u3813\u3818sht;\u697E;\uC000\u{1D532}rave\u803B\xF9\u40F9\u0161\u3827\u3831r\u0100lr\u382C\u382E\xBB\u0957\xBB\u1083lk;\u6580\u0100ct\u3839\u384D\u026F\u383F\0\0\u384Arn\u0100;e\u3845\u3846\u631Cr\xBB\u3846op;\u630Fri;\u65F8\u0100al\u3856\u385Acr;\u416B\u80BB\xA8\u0349\u0100gp\u3862\u3866on;\u4173f;\uC000\u{1D566}\u0300adhlsu\u114B\u3878\u387D\u1372\u3891\u38A0own\xE1\u13B3arpoon\u0100lr\u3888\u388Cef\xF4\u382Digh\xF4\u382Fi\u0180;hl\u3899\u389A\u389C\u43C5\xBB\u13FAon\xBB\u389Aparrows;\u61C8\u0180cit\u38B0\u38C4\u38C8\u026F\u38B6\0\0\u38C1rn\u0100;e\u38BC\u38BD\u631Dr\xBB\u38BDop;\u630Eng;\u416Fri;\u65F9cr;\uC000\u{1D4CA}\u0180dir\u38D9\u38DD\u38E2ot;\u62F0lde;\u4169i\u0100;f\u3730\u38E8\xBB\u1813\u0100am\u38EF\u38F2r\xF2\u38A8l\u803B\xFC\u40FCangle;\u69A7\u0780ABDacdeflnoprsz\u391C\u391F\u3929\u392D\u39B5\u39B8\u39BD\u39DF\u39E4\u39E8\u39F3\u39F9\u39FD\u3A01\u3A20r\xF2\u03F7ar\u0100;v\u3926\u3927\u6AE8;\u6AE9as\xE8\u03E1\u0100nr\u3932\u3937grt;\u699C\u0380eknprst\u34E3\u3946\u394B\u3952\u395D\u3964\u3996app\xE1\u2415othin\xE7\u1E96\u0180hir\u34EB\u2EC8\u3959op\xF4\u2FB5\u0100;h\u13B7\u3962\xEF\u318D\u0100iu\u3969\u396Dgm\xE1\u33B3\u0100bp\u3972\u3984setneq\u0100;q\u397D\u3980\uC000\u228A\uFE00;\uC000\u2ACB\uFE00setneq\u0100;q\u398F\u3992\uC000\u228B\uFE00;\uC000\u2ACC\uFE00\u0100hr\u399B\u399Fet\xE1\u369Ciangle\u0100lr\u39AA\u39AFeft\xBB\u0925ight\xBB\u1051y;\u4432ash\xBB\u1036\u0180elr\u39C4\u39D2\u39D7\u0180;be\u2DEA\u39CB\u39CFar;\u62BBq;\u625Alip;\u62EE\u0100bt\u39DC\u1468a\xF2\u1469r;\uC000\u{1D533}tr\xE9\u39AEsu\u0100bp\u39EF\u39F1\xBB\u0D1C\xBB\u0D59pf;\uC000\u{1D567}ro\xF0\u0EFBtr\xE9\u39B4\u0100cu\u3A06\u3A0Br;\uC000\u{1D4CB}\u0100bp\u3A10\u3A18n\u0100Ee\u3980\u3A16\xBB\u397En\u0100Ee\u3992\u3A1E\xBB\u3990igzag;\u699A\u0380cefoprs\u3A36\u3A3B\u3A56\u3A5B\u3A54\u3A61\u3A6Airc;\u4175\u0100di\u3A40\u3A51\u0100bg\u3A45\u3A49ar;\u6A5Fe\u0100;q\u15FA\u3A4F;\u6259erp;\u6118r;\uC000\u{1D534}pf;\uC000\u{1D568}\u0100;e\u1479\u3A66at\xE8\u1479cr;\uC000\u{1D4CC}\u0AE3\u178E\u3A87\0\u3A8B\0\u3A90\u3A9B\0\0\u3A9D\u3AA8\u3AAB\u3AAF\0\0\u3AC3\u3ACE\0\u3AD8\u17DC\u17DFtr\xE9\u17D1r;\uC000\u{1D535}\u0100Aa\u3A94\u3A97r\xF2\u03C3r\xF2\u09F6;\u43BE\u0100Aa\u3AA1\u3AA4r\xF2\u03B8r\xF2\u09EBa\xF0\u2713is;\u62FB\u0180dpt\u17A4\u3AB5\u3ABE\u0100fl\u3ABA\u17A9;\uC000\u{1D569}im\xE5\u17B2\u0100Aa\u3AC7\u3ACAr\xF2\u03CEr\xF2\u0A01\u0100cq\u3AD2\u17B8r;\uC000\u{1D4CD}\u0100pt\u17D6\u3ADCr\xE9\u17D4\u0400acefiosu\u3AF0\u3AFD\u3B08\u3B0C\u3B11\u3B15\u3B1B\u3B21c\u0100uy\u3AF6\u3AFBte\u803B\xFD\u40FD;\u444F\u0100iy\u3B02\u3B06rc;\u4177;\u444Bn\u803B\xA5\u40A5r;\uC000\u{1D536}cy;\u4457pf;\uC000\u{1D56A}cr;\uC000\u{1D4CE}\u0100cm\u3B26\u3B29y;\u444El\u803B\xFF\u40FF\u0500acdefhiosw\u3B42\u3B48\u3B54\u3B58\u3B64\u3B69\u3B6D\u3B74\u3B7A\u3B80cute;\u417A\u0100ay\u3B4D\u3B52ron;\u417E;\u4437ot;\u417C\u0100et\u3B5D\u3B61tr\xE6\u155Fa;\u43B6r;\uC000\u{1D537}cy;\u4436grarr;\u61DDpf;\uC000\u{1D56B}cr;\uC000\u{1D4CF}\u0100jn\u3B85\u3B87;\u600Dj;\u600C'.split("").map((c) => c.charCodeAt(0))
);

// node_modules/entities/dist/esm/decode-codepoint.js
var _a;
var decodeMap = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
var fromCodePoint = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/es-builtins
  (_a = String.fromCodePoint) !== null && _a !== void 0 ? _a : function(codePoint) {
    let output = "";
    if (codePoint > 65535) {
      codePoint -= 65536;
      output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    output += String.fromCharCode(codePoint);
    return output;
  }
);
function replaceCodePoint(codePoint) {
  var _a2;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== void 0 ? _a2 : codePoint;
}

// node_modules/entities/dist/esm/decode.js
var CharCodes;
(function(CharCodes2) {
  CharCodes2[CharCodes2["NUM"] = 35] = "NUM";
  CharCodes2[CharCodes2["SEMI"] = 59] = "SEMI";
  CharCodes2[CharCodes2["EQUALS"] = 61] = "EQUALS";
  CharCodes2[CharCodes2["ZERO"] = 48] = "ZERO";
  CharCodes2[CharCodes2["NINE"] = 57] = "NINE";
  CharCodes2[CharCodes2["LOWER_A"] = 97] = "LOWER_A";
  CharCodes2[CharCodes2["LOWER_F"] = 102] = "LOWER_F";
  CharCodes2[CharCodes2["LOWER_X"] = 120] = "LOWER_X";
  CharCodes2[CharCodes2["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes2[CharCodes2["UPPER_A"] = 65] = "UPPER_A";
  CharCodes2[CharCodes2["UPPER_F"] = 70] = "UPPER_F";
  CharCodes2[CharCodes2["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
function isNumber(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
}
function isAsciiAlphaNumeric(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber(code);
}
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
var EntityDecoder = class {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
  }
  /** Resets the instance to make it reusable. */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(input, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (input.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(input, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(input, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(input, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(input, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(input, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(input, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(input, offset) {
    if (offset >= input.length) {
      return -1;
    }
    if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(input, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(input, offset);
  }
  addToNumericResult(input, start, end, base) {
    if (start !== end) {
      const digitCount = end - start;
      this.result = this.result * Math.pow(base, digitCount) + Number.parseInt(input.substr(start, digitCount), base);
      this.consumed += digitCount;
    }
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(input, offset) {
    const startIndex = offset;
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(input, startIndex, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(input, startIndex, offset, 16);
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(input, offset) {
    const startIndex = offset;
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(input, startIndex, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(input, startIndex, offset, 10);
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    var _a2;
    if (this.consumed <= expectedLength) {
      (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(input, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    for (; offset < input.length; offset++, this.excess++) {
      const char = input.charCodeAt(offset);
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === DecodingMode.Attribute && // We shouldn't have consumed any characters after the entity,
        (valueLength === 0 || // And there should be no invalid characters.
        isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var _a2;
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var _a2;
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
};
function getDecoder(decodeTree) {
  let returnValue = "";
  const decoder = new EntityDecoder(decodeTree, (data) => returnValue += fromCodePoint(data));
  return function decodeWithTrie(input, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = input.indexOf("&", offset)) >= 0) {
      returnValue += input.slice(lastIndex, offset);
      decoder.startEntity(decodeMode);
      const length = decoder.write(
        input,
        // Skip the "&"
        offset + 1
      );
      if (length < 0) {
        lastIndex = offset + decoder.end();
        break;
      }
      lastIndex = offset + length;
      offset = length === 0 ? lastIndex + 1 : lastIndex;
    }
    const result = returnValue + input.slice(lastIndex);
    returnValue = "";
    return result;
  };
}
function determineBranch(decodeTree, current, nodeIndex, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIndex + value] - 1;
  }
  let lo = nodeIndex;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const midValue = decodeTree[mid];
    if (midValue < char) {
      lo = mid + 1;
    } else if (midValue > char) {
      hi = mid - 1;
    } else {
      return decodeTree[mid + branchCount];
    }
  }
  return -1;
}
var htmlDecoder = /* @__PURE__ */ getDecoder(htmlDecodeTree);
function decodeHTML(htmlString, mode = DecodingMode.Legacy) {
  return htmlDecoder(htmlString, mode);
}

// node_modules/entities/dist/esm/escape.js
var getCodePoint = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  String.prototype.codePointAt == null ? (c, index) => (c.charCodeAt(index) & 64512) === 55296 ? (c.charCodeAt(index) - 55296) * 1024 + c.charCodeAt(index + 1) - 56320 + 65536 : c.charCodeAt(index) : (
    // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
    (input, index) => input.codePointAt(index)
  )
);

// node_modules/entities/dist/esm/index.js
var EntityLevel;
(function(EntityLevel2) {
  EntityLevel2[EntityLevel2["XML"] = 0] = "XML";
  EntityLevel2[EntityLevel2["HTML"] = 1] = "HTML";
})(EntityLevel || (EntityLevel = {}));
var EncodingMode;
(function(EncodingMode2) {
  EncodingMode2[EncodingMode2["UTF8"] = 0] = "UTF8";
  EncodingMode2[EncodingMode2["ASCII"] = 1] = "ASCII";
  EncodingMode2[EncodingMode2["Extensive"] = 2] = "Extensive";
  EncodingMode2[EncodingMode2["Attribute"] = 3] = "Attribute";
  EncodingMode2[EncodingMode2["Text"] = 4] = "Text";
})(EncodingMode || (EncodingMode = {}));

// src/markdown-safety.ts
var raster = /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i;
var tags = new Set("p div span strong em b i u s del ins mark small sub sup kbd samp code pre blockquote ul ol li dl dt dd table thead tbody tfoot tr th td caption h1 h2 h3 h4 h5 h6 hr br a img".split(" "));
var voidTags = /* @__PURE__ */ new Set(["hr", "br", "img"]);
var unsafeTex = new Set("bbox mmltoken require autoload href url style class cssId htmlId htmlClass htmlStyle htmlData htmlHref includegraphics input include def gdef edef xdef let futurelet csname newcommand renewcommand providecommand newenvironment renewenvironment".toLowerCase().split(" "));
var html = (text2) => text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var literal = (text2) => html(text2).replace(/[!\[\]`*_~\\$]/g, (c) => `&#${c.charCodeAt(0)};`);
var codeText = (text2) => literal(/^[\s]*\$?=/.test(text2) ? "\u2060" + text2 : text2);
var label = (text2) => decodeHTML(text2.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1"));
var referenceKey = (text2) => label(text2).trim().replace(/\s+/g, " ").toLocaleLowerCase();
var maxTokenLength = 16384;
function prepareSafeMarkdown(source, options = {}) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const text2 = source.replace(/\r\n?/g, "\n"), references = /* @__PURE__ */ new Map(), brackets = /* @__PURE__ */ new Map(), openBrackets = [];
  for (let position = 0; position < text2.length; position++) {
    if (text2[position] === "\\") {
      position++;
      continue;
    }
    if (text2[position] === "[") openBrackets.push(position);
    else if (text2[position] === "]" && openBrackets.length) {
      const opening = openBrackets.pop();
      if (position - opening <= maxTokenLength) brackets.set(opening, position);
    }
  }
  for (const row of text2.split("\n")) {
    const match = row.match(/^ {0,3}\[((?:\\.|[^\]\\])+)\]:[ \t]*(?:<([^<>\n]*)>|(\S+))/);
    if (match && !references.has(referenceKey(match[1]))) references.set(referenceKey(match[1]), (_a2 = match[2]) != null ? _a2 : match[3]);
  }
  const asset = (raw) => {
    var _a3, _b2;
    let path = label(raw).trim();
    try {
      path = decodeURIComponent(path);
    } catch (e) {
      return null;
    }
    if (!path || /[\u0000-\u001f\u007f\\:#?]/.test(path) || path.startsWith("/") || !raster.test(path)) return null;
    let resolved = null;
    try {
      resolved = (_b2 = (_a3 = options.resolveLocalAsset) == null ? void 0 : _a3.call(options, path)) != null ? _b2 : null;
    } catch (e) {
      return null;
    }
    if (!resolved || !/^app:\/\/[^\s"'<>]+$/i.test(resolved)) return null;
    return resolved;
  };
  const image = (path, alt, attrs = {}) => {
    var _a3;
    const src = asset(path);
    if (!src) return `<span>${literal(alt ? "\u56FE\u7247\u672A\u52A0\u8F7D\uFF1A" + alt : "\u56FE\u7247\u672A\u52A0\u8F7D")}</span>`;
    let out2 = `<img src="${html(src)}" alt="${html(alt)}"`;
    for (const name of ["width", "height"]) if (/^\d{1,4}$/.test((_a3 = attrs[name]) != null ? _a3 : "") && Number(attrs[name]) > 0) out2 += ` ${name}="${Number(attrs[name])}"`;
    return out2 + ">";
  };
  const safeTag = (raw) => {
    var _a3, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2;
    const match = raw.match(/^<(\/?)\s*([a-z][a-z0-9-]*)([\s\S]*?)>$/i);
    if (!match) return literal(raw);
    const name = match[2].toLowerCase();
    if (!tags.has(name)) return literal(raw);
    if (match[1]) return /^\s*$/.test(match[3]) && !voidTags.has(name) ? `</${name}>` : literal(raw);
    const attrs = /* @__PURE__ */ Object.create(null);
    let rest = match[3];
    while (rest.trim() && rest.trim() !== "/") {
      const attr = rest.match(/^\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/);
      if (!attr) return literal(raw);
      const key = attr[1].toLowerCase();
      if (!(key in attrs)) attrs[key] = decodeHTML((_c2 = (_b2 = (_a3 = attr[2]) != null ? _a3 : attr[3]) != null ? _b2 : attr[4]) != null ? _c2 : "");
      rest = rest.slice(attr[0].length);
    }
    if (name === "img") return image((_d2 = attrs.src) != null ? _d2 : "", (_e2 = attrs.alt) != null ? _e2 : "", attrs);
    let out2 = "<" + name;
    if (/^(?:p|div|th|td)$/.test(name) && /^(?:left|right|center|justify)$/i.test((_f2 = attrs.align) != null ? _f2 : "")) out2 += ` align="${attrs.align.toLowerCase()}"`;
    if (attrs.title) out2 += ` title="${html(attrs.title)}"`;
    for (const key of ["colspan", "rowspan"]) if (/^(?:th|td)$/.test(name) && /^\d{1,3}$/.test((_g2 = attrs[key]) != null ? _g2 : "")) out2 += ` ${key}="${Number(attrs[key])}"`;
    if (name === "ol" && /^-?\d{1,6}$/.test((_h2 = attrs.start) != null ? _h2 : "")) out2 += ` start="${Number(attrs.start)}"`;
    if (name === "a" && safeLink((_i2 = attrs.href) != null ? _i2 : "")) out2 += ` href="${html(attrs.href.trim())}" rel="noopener noreferrer"`;
    return out2 + ">" + (name === "code" ? "\u2060" : "");
  };
  let out = "", i = 0, nextWikiEnd = -2;
  while (i < text2.length) {
    if (i === 0 || text2[i - 1] === "\n") {
      const lineEnd = text2.indexOf("\n", i), end = lineEnd < 0 ? text2.length : lineEnd, row = text2.slice(i, end);
      const fence = row.match(/^([ \t]*(?:(?:>[ \t]*)|(?:(?:[-+*]|\d{1,9}[.)])[ \t]+))*)(`{3,}|~{3,})([^\n]*)$/);
      if (fence) {
        let cursor = end < text2.length ? end + 1 : end, body = "", after = text2.length;
        const quotePrefix = (_c = (_b = fence[1].match(/^(?:[ \t]*>[ \t]*)+/)) == null ? void 0 : _b[0]) != null ? _c : "";
        const contentIndent = fence[1].slice(quotePrefix.length).replace(/\t/g, "    ").length;
        const nestedList = /[-+*]|\d[.)]/.test(fence[1].slice(quotePrefix.length));
        const closing = new RegExp("^[ \\t]*(?:>[ \\t]*)*" + fence[2][0] + "{" + fence[2].length + ",}[ \\t]*$");
        while (cursor < text2.length) {
          const next = text2.indexOf("\n", cursor), stop = next < 0 ? text2.length : next, line = text2.slice(cursor, stop);
          const unquoted = quotePrefix ? line.replace(/^(?:[ \t]*>[ \t]*)+/, "") : line;
          if (line.trim() && (quotePrefix && !/^[ \t]*>/.test(line) || nestedList && ((_e = (_d = unquoted.match(/^[ \t]*/)) == null ? void 0 : _d[0].replace(/\t/g, "    ").length) != null ? _e : 0) < contentIndent)) {
            after = cursor;
            break;
          }
          if (closing.test(line)) {
            after = stop < text2.length ? stop + 1 : stop;
            break;
          }
          body += (nestedList ? unquoted.replace(new RegExp("^ {0," + contentIndent + "}"), "") : unquoted) + (stop < text2.length ? "\n" : "");
          cursor = stop < text2.length ? stop + 1 : stop;
        }
        out += fence[1] + "<pre><code>" + codeText(body).replace(/\n/g, "&#10;") + "</code></pre>" + (after <= text2.length && text2[after - 1] === "\n" ? "\n" : "");
        i = after;
        continue;
      }
    }
    if (text2.startsWith("<!--", i)) {
      const end = text2.indexOf("-->", i + 4);
      out += " ";
      i = end < 0 ? text2.length : end + 3;
      continue;
    }
    if (text2[i] === "`") {
      const run = text2.slice(i).match(/^`+/)[0], limit = Math.min(text2.length, i + maxTokenLength);
      let end = text2.indexOf(run, i + run.length);
      while (end >= 0 && end < limit && (text2[end - 1] === "`" || text2[end + run.length] === "`")) end = text2.indexOf(run, end + run.length);
      if (end >= limit) end = -1;
      if (end >= 0) {
        let value = text2.slice(i + run.length, end).replace(/\n/g, " ");
        if (/^ .* $/.test(value) && /\S/.test(value)) value = value.slice(1, -1);
        out += "<code>" + codeText(value) + "</code>";
        i = end + run.length;
        continue;
      }
      out += "&#96;".repeat(run.length);
      i += run.length;
      continue;
    }
    if (text2[i] === "~" && text2.startsWith("~~~", i)) {
      const run = text2.slice(i).match(/^~+/)[0];
      out += "&#126;".repeat(run.length);
      i += run.length;
      continue;
    }
    if (text2.startsWith("![[", i)) {
      if (nextWikiEnd !== -1 && nextWikiEnd < i + 3) nextWikiEnd = text2.indexOf("]]", i + 3);
      let end = nextWikiEnd;
      if (end - i > maxTokenLength) end = -1;
      if (end >= 0 && !text2.slice(i, end).includes("\n")) {
        const [path, ...parts] = text2.slice(i + 3, end).split("|"), last = (_f = parts.at(-1)) != null ? _f : "", size = last.match(/^(\d{1,4})(?:x(\d{1,4}))?$/);
        out += image(path, size ? "" : parts.join("|"), size ? { width: size[1], height: (_g = size[2]) != null ? _g : "" } : {});
        i = end + 2;
        continue;
      }
    }
    if (text2.startsWith("![", i)) {
      const end = (_h = brackets.get(i + 1)) != null ? _h : -1;
      if (end >= 0) {
        const alt = label(text2.slice(i + 2, end));
        let cursor = end + 1, path;
        if (text2[cursor] === "(") {
          const destination = readDestination(text2, cursor);
          if (destination) {
            path = destination.path;
            cursor = destination.end;
          }
        } else if (text2[cursor] === "[") {
          const refEnd = (_i = brackets.get(cursor)) != null ? _i : -1;
          if (refEnd >= 0) {
            path = references.get(referenceKey(text2.slice(cursor + 1, refEnd) || alt));
            cursor = refEnd + 1;
          }
        } else path = references.get(referenceKey(alt));
        if (path !== void 0) {
          out += image(path, alt);
          i = cursor;
          continue;
        }
      }
    }
    if (text2[i] === "<") {
      const auto = text2.slice(i).match(/^<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+|[^\s<>@]+@[^\s<>@]+)>/i);
      if (auto) {
        out += auto[0];
        i += auto[0].length;
        continue;
      }
      let cursor = i + 1, quote = "";
      for (; cursor < Math.min(text2.length, i + maxTokenLength); cursor++) {
        const c = text2[cursor];
        if (quote) {
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">" || c === "<") break;
      }
      if (text2[cursor] === ">") {
        out += safeTag(text2.slice(i, cursor + 1));
        i = cursor + 1;
        continue;
      }
      out += "&lt;";
      i++;
      continue;
    }
    if (text2[i] === "!") {
      out += "&#33;";
      i++;
      continue;
    }
    if (text2[i] === "\\") {
      const command = text2.slice(i + 1).match(/^[a-zA-Z]+/);
      if (command && unsafeTex.has(command[0].toLowerCase())) {
        out += "\\text{" + command[0] + " disabled}";
        i += command[0].length + 1;
        continue;
      }
      if (/[!<`~]/.test((_j = text2[i + 1]) != null ? _j : "")) {
        out += literal(text2[i + 1]);
        i += 2;
        continue;
      }
      if (text2[i + 1] === "\\") {
        out += "\\\\";
        i += 2;
        continue;
      }
    }
    if (text2.startsWith("^^", i)) {
      out += "&#94;&#94;";
      i += 2;
      continue;
    }
    out += text2[i++];
  }
  return out;
}
function safeLink(raw) {
  const value = decodeHTML(raw).trim();
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  return /^(?:https?:\/\/|mailto:|#)/i.test(value) || !/[<>:]/.test(value) && !value.startsWith("//");
}
function readDestination(text2, start) {
  var _a2;
  text2 = text2.slice(0, start + maxTokenLength);
  let i = start + 1;
  while (/[ \t\n]/.test((_a2 = text2[i]) != null ? _a2 : "") && i < text2.length) i++;
  let path = "";
  if (text2[i] === "<") {
    const end = text2.indexOf(">", i + 1);
    if (end < 0 || text2.slice(i, end).includes("\n")) return null;
    path = text2.slice(i + 1, end);
    i = end + 1;
  } else {
    let depth = 0;
    for (; i < text2.length; i++) {
      const c = text2[i];
      if (c === "\\" && i + 1 < text2.length) {
        path += text2.slice(i, i + 2);
        i++;
        continue;
      }
      if (c === "(") depth++;
      if (c === ")") {
        if (!depth) break;
        depth--;
      }
      if (/\s/.test(c) && !depth) break;
      path += c;
    }
    if (depth) return null;
  }
  while (i < text2.length && /\s/.test(text2[i])) i++;
  if (text2[i] === '"' || text2[i] === "'") {
    const quote = text2[i++];
    for (; i < text2.length; i++) {
      if (text2[i] === "\\") {
        i++;
        continue;
      }
      if (text2[i] === quote) {
        i++;
        break;
      }
    }
    while (i < text2.length && /\s/.test(text2[i])) i++;
  }
  return text2[i] === ")" ? { path, end: i + 1 } : null;
}

// src/markdown-preview.ts
var PreviewOwner = class extends import_obsidian2.Component {
  constructor() {
    super(...arguments);
    __publicField(this, "disposed", false);
  }
  unload() {
    this.disposed = true;
    super.unload();
  }
  addChild(child) {
    if (this.disposed) {
      child.unload();
      return child;
    }
    return super.addChild(child);
  }
  register(cleanup) {
    if (this.disposed) cleanup();
    else super.register(cleanup);
  }
};
var MarkdownPreviewScope = class {
  constructor(app) {
    this.app = app;
    __publicField(this, "active", /* @__PURE__ */ new Set());
  }
  reset() {
    for (const cancel of [...this.active]) cancel();
    this.active.clear();
  }
  mount(parent, markdown, sourcePath, onReady) {
    const doc = parent.ownerDocument, host = doc.createElement("div");
    host.className = "pp-markdown markdown-rendered";
    host.setAttribute("aria-busy", "true");
    parent.append(host);
    const loading = doc.createElement("p");
    loading.className = "pp-muted";
    loading.textContent = "\u6B63\u5728\u6392\u7248\u2026";
    host.append(loading);
    const staging = doc.createElement("div");
    staging.className = "pp-markdown-content";
    const owner = new PreviewOwner();
    owner.load();
    let current = true;
    const cancel = () => {
      if (!current) return;
      current = false;
      owner.unload();
      staging.replaceChildren();
      host.replaceChildren();
      host.remove();
      this.active.delete(cancel);
    };
    this.active.add(cancel);
    const safe = prepareSafeMarkdown(markdown, { resolveLocalAsset: (path) => {
      try {
        const link = decodeURIComponent(path.split("#")[0]);
        const file = this.app.metadataCache.getFirstLinkpathDest(link, sourcePath);
        return file instanceof import_obsidian2.TFile && /^(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.extension) ? this.app.vault.getResourcePath(file) : null;
      } catch (e) {
        return null;
      }
    } });
    void import_obsidian2.MarkdownRenderer.render(this.app, safe, staging, sourcePath, owner).then(() => {
      if (!current) {
        owner.unload();
        staging.replaceChildren();
        return;
      }
      host.replaceChildren(staging);
      host.setAttribute("aria-busy", "false");
      for (const table of Array.from(staging.querySelectorAll("table"))) {
        const scroll = doc.createElement("div");
        scroll.className = "pp-table-scroll";
        table.replaceWith(scroll);
        scroll.append(table);
      }
      for (const input of Array.from(staging.querySelectorAll("input"))) input.disabled = true;
      const links = (event) => {
        var _a2;
        const anchor = (_a2 = event.target) == null ? void 0 : _a2.closest("a.internal-link");
        if (!anchor || !host.contains(anchor)) return;
        event.preventDefault();
        event.stopPropagation();
        const target = anchor.getAttribute("data-href") || anchor.getAttribute("href");
        if (target) void this.app.workspace.openLinkText(target, sourcePath, event.ctrlKey || event.metaKey);
      };
      owner.registerDomEvent(host, "click", links);
      onReady == null ? void 0 : onReady(staging);
    }).catch(() => {
      if (!current) {
        owner.unload();
        staging.replaceChildren();
        return;
      }
      owner.unload();
      staging.replaceChildren();
      host.replaceChildren();
      const error = doc.createElement("p");
      error.className = "pp-error";
      error.textContent = "\u8FD9\u6BB5\u5185\u5BB9\u6682\u65F6\u65E0\u6CD5\u6392\u7248\uFF0C\u8BF7\u6253\u5F00\u6765\u6E90\u67E5\u770B\uFF0C\u6216\u5207\u6362 Markdown \u6E90\u7801\u5DEE\u5F02\u3002";
      host.append(error);
      host.setAttribute("aria-busy", "false");
    });
    return cancel;
  }
};

// src/main.ts
var import_obsidian5 = require("obsidian");

// src/core.ts
var Session = class {
  constructor(source, fallback) {
    this.source = source;
    this.fallback = fallback;
    __publicField(this, "stage", "question");
    __publicField(this, "question", "");
    __publicField(this, "recall", "");
    __publicField(this, "missed", "");
    __publicField(this, "rounds", []);
    __publicField(this, "target");
    this.target = source;
    this.question = fallback;
  }
  start(question) {
    if (this.stage !== "question") return;
    this.question = question.trim() || this.fallback;
    this.stage = "recall";
  }
  reveal() {
    if (this.stage !== "recall") return;
    this.stage = "compare";
  }
  points() {
    return this.missed.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  }
  snapshot() {
    return { target: this.target, recall: this.recall, missed: this.points() };
  }
  retry() {
    if (this.stage !== "compare" || !this.points().length) return false;
    this.rounds.push(this.snapshot());
    this.target = this.points().join("\n");
    this.recall = "";
    this.missed = "";
    this.stage = "recall";
    return true;
  }
};
function defaultQuestion(text2, line, title) {
  let heading = "";
  let fence = "";
  for (const row of text2.split("\n").slice(0, line + 1)) {
    const f = row.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = "";
      continue;
    }
    if (!fence) {
      const h = row.match(/^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/);
      if (h) heading = h[1];
    }
  }
  return heading || title || "\u56DE\u5FC6\u8FD9\u6BB5\u5185\u5BB9";
}
function literal2(text2) {
  const runs = text2.match(/`+/g) || [];
  const fence = "`".repeat(Math.max(3, ...runs.map((x) => x.length + 1)));
  return `${fence}text
${text2}
${fence}`;
}
function reviewNote(session, path, date3) {
  const link = path.split("/").map((x) => encodeURIComponent(x).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16))).join("/");
  const rounds = [...session.rounds, session.snapshot()];
  return `# \u9009\u6BB5\u5373\u7EC3 \xB7 \u590D\u4E60\u8BB0\u5F55

\u65F6\u95F4\uFF1A${date3}

\u6765\u6E90\uFF1A[\u6253\u5F00\u6765\u6E90\u7B14\u8BB0](<${link}>)

\u672C\u6B21\u4F7F\u7528\u542F\u52A8\u65F6\u7684\u9009\u6BB5\u5FEB\u7167\uFF1B\u539F\u7B14\u8BB0\u672A\u88AB\u4FEE\u6539\u3002\u6F0F\u70B9\u7531\u81EA\u5DF1\u586B\u5199\uFF0C\u65E0\u81EA\u52A8\u8BC4\u5206\u3002

## \u9898\u76EE
${literal2(session.question)}

## \u539F\u59CB\u9009\u6BB5
${literal2(session.source)}

` + rounds.map((r, i) => `## \u7B2C ${i + 1} \u8F6E

### \u672C\u8F6E\u5BF9\u7167
${literal2(r.target)}

### \u6211\u7684\u56DE\u5FC6
${literal2(r.recall || "\uFF08\u672A\u586B\u5199\uFF09")}

### \u81EA\u8BB0\u6F0F\u70B9
${literal2(r.missed.join("\n") || "\uFF08\u672A\u8BB0\u5F55\uFF09")}`).join("\n\n") + "\n";
}
async function createReview(create, exists, text2, stamp = Date.now()) {
  for (let n = 0; n < 100; n++) {
    const path = `\u9009\u6BB5\u5373\u7EC3-${stamp}-${n + 1}.md`;
    if (exists(path)) continue;
    try {
      await create(path, text2);
      return path;
    } catch (e) {
      if (exists(path)) continue;
      throw e;
    }
  }
  throw new Error("\u65E0\u6CD5\u627E\u5230\u53EF\u7528\u7684\u65B0\u6587\u4EF6\u540D");
}

// src/diff.ts
var MAX_CELLS = 1e6;
var MAX_INPUT_UNITS = 1e5;
function graphemes(text2) {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(text2), (x) => x.segment);
  }
  const result = [];
  let regional = 0;
  for (const point of text2) {
    const last = result.at(-1);
    const isRegional = /[\u{1F1E6}-\u{1F1FF}]/u.test(point);
    const joins = last !== void 0 && (/^[\p{Mark}\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]$/u.test(point) || point === "\u200D" || last.endsWith("\u200D") || point === "\n" && last === "\r" || isRegional && regional % 2 === 1);
    if (joins) result[result.length - 1] += point;
    else result.push(point);
    regional = isRegional ? regional + 1 : 0;
  }
  return result;
}
function tokens(text2) {
  const result = [];
  let word = "";
  const flush = () => {
    if (word) {
      result.push(word);
      word = "";
    }
  };
  for (const part of graphemes(text2)) {
    if (/^[\p{Script=Latin}\p{Number}\p{Mark}_]+$/u.test(part)) word += part;
    else {
      flush();
      result.push(part);
    }
  }
  flush();
  return result;
}
function append(spans, text2, changed) {
  if (!text2) return;
  const last = spans.at(-1);
  if (last && last.changed === changed) last.text += text2;
  else spans.push({ text: text2, changed });
}
function compareText(original, recall) {
  const out = { original: [], recall: [], simplified: false };
  if (original === recall) {
    append(out.original, original, false);
    append(out.recall, recall, false);
    return out;
  }
  if (!original || !recall) {
    append(out.original, original, true);
    append(out.recall, recall, true);
    return out;
  }
  if (original.length + recall.length > MAX_INPUT_UNITS) {
    append(out.original, original, true);
    append(out.recall, recall, true);
    out.simplified = true;
    return out;
  }
  const a = tokens(original), b = tokens(recall);
  const pending = [{ a0: 0, a1: a.length, b0: 0, b1: b.length }];
  let budget = MAX_CELLS;
  while (pending.length) {
    const task = pending.pop();
    if ("common" in task) {
      append(out.original, task.common, false);
      append(out.recall, task.common, false);
      continue;
    }
    let { a0, a1, b0, b1 } = task;
    const prefix = a0;
    while (a0 < a1 && b0 < b1 && a[a0] === b[b0]) {
      a0++;
      b0++;
    }
    const common = a.slice(prefix, a0).join("");
    append(out.original, common, false);
    append(out.recall, common, false);
    const suffix = a1;
    while (a1 > a0 && b1 > b0 && a[a1 - 1] === b[b1 - 1]) {
      a1--;
      b1--;
    }
    if (a1 < suffix) pending.push({ common: a.slice(a1, suffix).join("") });
    const n = a1 - a0, m = b1 - b0;
    if (!n || !m) {
      append(out.original, a.slice(a0, a1).join(""), true);
      append(out.recall, b.slice(b0, b1).join(""), true);
      continue;
    }
    const cells = n * m;
    if (cells > budget) {
      append(out.original, a.slice(a0, a1).join(""), true);
      append(out.recall, b.slice(b0, b1).join(""), true);
      out.simplified = true;
      continue;
    }
    budget -= cells;
    const row = new Uint32Array(m + 1);
    let length = 0, anchorA = a0, anchorB = b0;
    for (let i = a0; i < a1; i++) for (let j = m; j > 0; j--) {
      row[j] = a[i] === b[b0 + j - 1] ? row[j - 1] + 1 : 0;
      const size = row[j], atA = i - size + 1, atB = b0 + j - size;
      if (size > length || size === length && size > 0 && (atA < anchorA || atA === anchorA && atB < anchorB)) {
        length = size;
        anchorA = atA;
        anchorB = atB;
      }
    }
    if (!length) {
      append(out.original, a.slice(a0, a1).join(""), true);
      append(out.recall, b.slice(b0, b1).join(""), true);
      continue;
    }
    pending.push({ a0: anchorA + length, a1, b0: anchorB + length, b1 });
    pending.push({ common: a.slice(anchorA, anchorA + length).join("") });
    pending.push({ a0, a1: anchorA, b0, b1: anchorB });
  }
  return out;
}

// src/rendered-diff.ts
function readingParts(root) {
  const parts = [];
  const visit = (node) => {
    var _a2;
    if (node.nodeType === 3) {
      parts.push({ node, text: node.textContent || "" });
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    if (el.style.display === "none" || el.style.visibility === "hidden") return;
    if (el.matches('script,style,svg,button,input,[hidden],[aria-hidden="true"],.copy-code-button')) return;
    if (el.matches(".math,.katex, mjx-container")) {
      parts.push({ node: el, text: ((_a2 = el.querySelector("annotation")) == null ? void 0 : _a2.textContent) || el.getAttribute("aria-label") || el.textContent || "" });
      return;
    }
    if (el.matches("img")) {
      parts.push({ node: el, text: el.getAttribute("alt") || "\u3014\u56FE\u7247\u3015" });
      return;
    }
    if (el.matches("br")) {
      parts.push({ node: null, text: "\n" });
      return;
    }
    for (const child of Array.from(el.childNodes)) visit(child);
    if (el.matches("p,li,h1,h2,h3,h4,h5,h6,pre,blockquote,tr,td,th")) parts.push({ node: null, text: "\n" });
  };
  visit(root);
  return parts;
}
function decorate(parts, spans, side) {
  var _a2;
  let start = 0;
  const ranges = spans.map((span) => {
    const range = { start, end: start + span.text.length, changed: span.changed };
    start = range.end;
    return range;
  });
  let offset = 0, index = 0;
  for (const part of parts) {
    const end = offset + part.text.length;
    while (index < ranges.length && ranges[index].end <= offset) index++;
    const hits = [];
    for (let j = index; j < ranges.length && ranges[j].start < end; j++) if (ranges[j].changed && ranges[j].end > offset) hits.push(ranges[j]);
    if (part.node && hits.length) {
      const title = side === "original" ? "\u9057\u6F0F\u6216\u4E0D\u540C\uFF1A\u539F\u6587\u5185\u5BB9" : "\u65B0\u589E\u6216\u4E0D\u540C\uFF1A\u56DE\u5FC6\u5185\u5BB9";
      if (part.node.nodeType === 1) {
        const el = part.node;
        el.classList.add("pp-diff-mark", "pp-diff-" + side);
        el.title = title;
      } else {
        const doc = part.node.ownerDocument, frag = doc.createDocumentFragment();
        let at = 0;
        for (const hit of hits) {
          const a = Math.max(hit.start - offset, 0), b = Math.min(hit.end - offset, part.text.length);
          frag.append(doc.createTextNode(part.text.slice(at, a)));
          const mark = doc.createElement("mark");
          mark.className = "pp-diff-mark pp-diff-" + side;
          mark.title = title;
          mark.textContent = part.text.slice(a, b);
          frag.append(mark);
          at = b;
        }
        frag.append(doc.createTextNode(part.text.slice(at)));
        (_a2 = part.node.parentNode) == null ? void 0 : _a2.replaceChild(frag, part.node);
      }
    }
    offset = end;
  }
}
function highlightRenderedComparison(original, recall) {
  const a = readingParts(original), b = readingParts(recall), diff = compareText(a.map((p) => p.text).join(""), b.map((p) => p.text).join(""));
  decorate(a, diff.original, "original");
  decorate(b, diff.recall, "recall");
  return diff;
}

// src/comparison.ts
function mountComparison(parent, original, recall, originalTitle, highlighted = true, onToggle = () => {
}, renderMarkdown) {
  const doc = parent.ownerDocument;
  const el = (tag, cls, text2) => {
    const node = doc.createElement(tag);
    node.className = cls;
    if (text2 !== void 0) node.textContent = text2;
    return node;
  };
  const diff = compareText(original, recall);
  const tools = el("div", "pp-compare-tools");
  const legend = el("div", "pp-diff-legend");
  legend.append(el("span", "pp-diff-key pp-diff-original", "\u9057\u6F0F / \u4E0D\u540C\uFF08\u539F\u6587\uFF09"), el("span", "pp-diff-key pp-diff-recall", "\u65B0\u589E / \u4E0D\u540C\uFF08\u56DE\u5FC6\uFF09"));
  const label2 = el("label", "pp-diff-toggle");
  const toggle = el("input", "");
  toggle.type = "checkbox";
  toggle.checked = highlighted;
  label2.append(toggle, doc.createTextNode("\u6807\u51FA\u6587\u5B57\u5DEE\u5F02"));
  tools.append(legend, label2);
  parent.append(tools);
  let rich = !!renderMarkdown;
  let cleanups = [];
  const switcher = el("button", "pp-secondary pp-compare-mode");
  switcher.type = "button";
  if (renderMarkdown) tools.prepend(switcher);
  const grid = el("div", "pp-compare");
  parent.append(grid);
  const panes = [];
  for (const [title, text2, spans, side] of [
    [originalTitle, original, diff.original, "original"],
    ["\u6211\u7684\u56DE\u5FC6", recall, diff.recall, "recall"]
  ]) {
    const card = el("div", "pp-card"), pre = el("pre", "");
    card.append(el("h2", "", title), pre);
    grid.append(card);
    panes.push({ pre, text: text2, spans, side });
  }
  let generation = 0;
  const draw = () => {
    const current = ++generation;
    let finished = false;
    const ready = [];
    const finish = (index, host) => {
      if (current !== generation || finished) return;
      ready[index] = host;
      if (toggle.checked && ready[0] && ready[1]) {
        finished = true;
        highlightRenderedComparison(ready[0], ready[1]);
      }
    };
    for (const cleanup of cleanups) cleanup();
    cleanups = [];
    switcher.textContent = rich ? "\u67E5\u770B Markdown \u6E90\u7801\u5DEE\u5F02" : "\u8FD4\u56DE\u9605\u8BFB\u683C\u5F0F";
    label2.hidden = false;
    legend.hidden = !toggle.checked;
    for (const [index, pane] of panes.entries()) {
      const { text: text2, spans, side } = pane;
      const target = rich ? el("div", "pp-rich-content") : el("pre", "pp-literal-diff");
      pane.pre.replaceWith(target);
      pane.pre = target;
      if (!text2) {
        target.append(el("span", "pp-empty-answer", "\uFF08\u672C\u8F6E\u672A\u586B\u5199\uFF09"));
        if (rich) finish(index, el("div", ""));
        continue;
      }
      if (rich) {
        cleanups.push(renderMarkdown(target, text2, (host) => finish(index, host)));
        continue;
      }
      if (!toggle.checked) {
        target.textContent = text2;
        continue;
      }
      for (const span of spans) {
        if (span.changed) {
          const mark = el("mark", `pp-diff-mark pp-diff-${side}`, span.text);
          mark.title = side === "original" ? "\u539F\u6587\u4E2D\u7684\u4E0D\u540C\u6587\u5B57" : "\u56DE\u7B54\u4E2D\u7684\u4E0D\u540C\u6587\u5B57";
          target.append(mark);
        } else target.append(doc.createTextNode(span.text));
      }
    }
    legend.hidden = !toggle.checked;
  };
  switcher.addEventListener("click", () => {
    rich = !rich;
    draw();
  });
  toggle.addEventListener("change", () => {
    draw();
    onToggle(toggle.checked);
  });
  draw();
  parent.append(el("p", "pp-diff-note", renderMarkdown ? "\u9ED8\u8BA4\u5728\u9605\u8BFB\u683C\u5F0F\u4E2D\u6807\u51FA\u6587\u5B57\u5DEE\u5F02\uFF1B\u9EC4\u8272\u662F\u9057\u6F0F\u6216\u4E0D\u540C\uFF0C\u84DD\u8272\u662F\u65B0\u589E\u6216\u4E0D\u540C\u3002\u989C\u8272\u4E0D\u5224\u65AD\u8BED\u4E49\u5BF9\u9519\uFF1B\u516C\u5F0F\u3001\u56FE\u7247\u53CA\u683C\u5F0F\u7EC6\u8282\u8BF7\u7ED3\u5408\u6E90\u7801\u6838\u5BF9" : "\u989C\u8272\u4EC5\u6807\u51FA\u6587\u5B57\u5DEE\u5F02\uFF0C\u662F\u5426\u8868\u8FBE\u6B63\u786E\u7531\u4F60\u5224\u65AD"));
  if (diff.simplified) parent.append(el("p", "pp-diff-note pp-diff-simplified", "\u6587\u672C\u8F83\u957F\uFF0C\u90E8\u5206\u5DEE\u5F02\u5DF2\u5408\u5E76\u6807\u6CE8\uFF1B\u53EF\u53D6\u6D88\u9AD8\u4EAE\u67E5\u770B\u539F\u6837\u6587\u5B57\u3002"));
}

// src/card-management.ts
var NO_SOURCE = "\0";
function filterCards(cards, filter, now) {
  const query = filter.query.trim().toLocaleLowerCase();
  return cards.filter((c) => (!query || `${c.front}
${c.back}
${c.sourcePath}`.toLocaleLowerCase().includes(query)) && (filter.type === "all" || (c.id.startsWith("note:") ? "authored" : "snapshot") === filter.type) && (!filter.source || (filter.source === NO_SOURCE ? !c.sourcePath : c.sourcePath === filter.source)) && (filter.status === "all" || filter.status === "suspended" && c.suspended || filter.status === "active" && !c.suspended || filter.status === "due" && !c.suspended && c.dueAt <= now || filter.status === "scheduled" && !c.suspended && c.dueAt > now || filter.status === "new" && !c.suspended && c.reviews === 0));
}
function sameCard(a, b) {
  return a.id === b.id && a.revision === b.revision && a.front === b.front && a.back === b.back && a.sourcePath === b.sourcePath && a.suspended === b.suspended;
}

// src/knowledge.ts
var EXTRACTOR_VERSION = 3;
var MAX_NOTE_BYTES = 2 * 1024 * 1024;
function fingerprint(value) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(i);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}
function plainText(value) {
  const code = [];
  const protectedText = value.replace(/(`+)([^`]*?)\1/g, (_, f, body) => {
    code.push(body);
    return `\0${code.length - 1}\0`;
  });
  return protectedText.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, p, label2) => label2 || p).replace(/<[^>]+>/g, "").replace(/[*_`~]/g, "").replace(/^\s*(?:[-+*>]|\d+[.)])\s+/gm, "").replace(/\u0000(\d+)\u0000/g, (_, i) => code[Number(i)]).trim();
}
function contentKey(value) {
  return value.replace(/\r\n/g, "\n").trim();
}
var caption = /^(?:图解步骤\s*\d+|图\s*\d+(?:[.－-]\d+)*(?:[：:\s].*)?|(?:Python|Java|C\+\+|C|JavaScript|TypeScript|Go|Rust|Swift|Kotlin|Dart|C#)?\s*(?:参考实现|源码|代码文件)[：:].*|[\w.-]+\.(?:py|js|ts|java|cpp|c|go|rs))$/i;
var exerciseHeading = /(?:^|\s)(?:练习|知识巩固|编程练习|习题|Exercises?)$/i;
var answerLabel = /^(?:参考答案|答案(?:解析)?|解析|解答|解题提示|正确性证明)$/;
var promptLabel = /^(?:问题|题目|题干|输入|输出|要求|(?:练习|习题|题目|问题)[一二三四五六七八九十0-9]+(?:[：:].*)?)$/;
function contentRole(labels2) {
  for (const label2 of [...labels2].reverse()) {
    if (answerLabel.test(label2)) return "answer";
    if (promptLabel.test(label2) || exerciseHeading.test(label2)) return "prompt";
  }
  return "";
}
var navigation = /(?:^(?:\d+[.、]\s*)?(?:目录|导航|阅读顺序|建议阅读顺序|适合谁看|文章推荐|延伸资料|网站历史|资料推荐|阅读推荐|推荐阅读|参考(?:资料|文献|链接)?|相关(?:链接|阅读)|延伸阅读|资源|链接|致谢|版权|免责声明|许可证|contents|table of contents|references?|resources?|links?|see also|further reading|license|acknowledg(?:e)?ments?)(?:[：:\s].*)?$)/i;
var promotional = /(?:扫码|扫描.{0,5}二维码|关注.{0,12}(?:公众号|我)|知识星球|优惠券|优惠码|限时福利|付费加入|购买.{0,12}(?:专栏|课程)|微信.{0,5}(?:联系|加我)|公众号.{0,12}(?:回复|领取|获取))/;
var misconception = /(?:很多人.{0,12}(?:觉得|认为|误以为)|有人(?:认为|误以为)|可能会(?:觉得|误以为)|看了这个.{0,15}觉得|误以为)/;
var correction = /^(?:实际上|事实上|其实|但(?:是)?|然而|并非如此|并不是)/;
var hasCorrection = /(?:实际上|事实上|但(?:是)?|然而|并非如此|并不是)/;
var discourse = /^(?:下面(?:是|我们|来看|给出|的)|如下(?:图|所示)|如(?:上|下)所示|上述|下图|上图|接下来(?:我们|看)|代码如下|运行结果|输出结果|这里(?:我们|以|给出)|今天我|最近我|我(?:自己|当时|的文章|们来看)|这本书|这是什么世道|现在本身|不知不觉|前几天|出于不想|看了一下|好家伙)/;
function definitionTerm(value, heading) {
  const first = value.split("\n")[0], match = first.match(/^([^。.!?？：:，,]{1,65}?)(?:是(?:一种|指|一个|用来|用于)|指的是|定义为|被称为|\s+(?:is|are)\s+(?:an? |the ))/i);
  if (match && !misconception.test(first) && !/(?:并?不|并非|而不)$/.test(match[1]) && !discourse.test(first) && !/[我你他她它这那]/.test(match[1].slice(0, 1))) return match[1].trim().replace(/(?:也常|通常|一般|也|又|还|常)$/, "").trim();
  return void 0;
}
function extractKnowledge(text2, path) {
  var _a2, _b;
  const result = { points: [], skipped: 0, warnings: [] };
  if (text2.length > MAX_NOTE_BYTES) {
    result.warnings.push("\u7B14\u8BB0\u8D85\u8FC7 2 MiB \u5B57\u7B26\u4E0A\u9650\uFF0C\u672A\u63D0\u70BC\uFF1B\u8BF7\u9009\u62E9\u8F83\u5C0F\u7B14\u8BB0\u6216\u9009\u6BB5");
    return result;
  }
  const sourceFingerprint = fingerprint(text2.replace(/\r\n/g, "\n"));
  const rows = text2.replace(/\r\n/g, "\n").split("\n"), name = path.split("/").pop().replace(/\.md$/i, "");
  let start = 0, fence = "", fenceSize = 0, comment = false, mathClose = "", subheading = "", title = name, buffer = [], begin = 0, subRole = "";
  const headings = [], seen = /* @__PURE__ */ new Set();
  if (((_a2 = rows[0]) == null ? void 0 : _a2.trim()) === "---") {
    const end = rows.findIndex((r, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(r));
    if (end < 0) {
      result.warnings.push("\u672A\u95ED\u5408\u7684\u5C5E\u6027\u533A\uFF0C\u672A\u63D0\u70BC");
      return result;
    }
    start = end + 1;
    const declared = (_b = rows.slice(1, end).find((r) => /^title:\s*[^|>]/.test(r))) == null ? void 0 : _b.replace(/^title:\s*/, "").replace(/^["']|["']$/g, "");
    if (declared) title = declared;
  }
  const flush = () => {
    var _a3, _b2;
    if (!buffer.length) return;
    const raw = buffer.join("\n").trim(), endLine = begin + buffer.length - 1;
    buffer = [];
    const heading = subheading || ((_a3 = headings.at(-1)) == null ? void 0 : _a3.text) || title, readable = plainText(raw), han = (readable.match(/[\u3400-\u9fff]/g) || []).length;
    const meaningful = han >= 12 ? readable.length >= 20 : readable.length >= 65;
    const linkCount = (raw.match(/\[[^\]]+\]\([^)]*\)|\[\[[^\]]+\]\]/g) || []).length;
    const contentWithoutLinks = raw.replace(/!?\[[^\]]*\]\([^)]*\)|\[\[[^\]]+\]\]/g, "").replace(/[\s\-*#\d.():：]/g, "");
    const lines = raw.split("\n"), bulletRows = lines.filter((r) => /^\s*(?:[-+*]|\d+[.)])\s+/.test(r)), list = bulletRows.length, bulletText = bulletRows.map(plainText), linkedBullets = bulletRows.filter((r) => /\[[^\]]+\]\([^)]*\)|\[\[[^\]]+\]\]/.test(r)).length;
    const questionOnly = list >= 2 && bulletText.every((t) => /[?？]$/.test(t) && !/[：:]/.test(t));
    const structuredList = list >= 2 && !questionOnly && bulletText.some((t) => /[：:。.!;；]/.test(t) || t.length > 35);
    if (list >= 2 && linkedBullets / list >= 0.6) {
      result.skipped++;
      return;
    }
    if (!meaningful || readable.length > 1800 || raw.length > 3e3 || navigation.test(heading) || promotional.test(readable) || discourse.test(readable) || /^\s*(?:https?:\/\/|#\S+\s*$)/.test(raw) || linkCount > 0 && contentWithoutLinks.length < 40 || lines.some((r) => /^\s*\|/.test(r)) || !/[。！？.!?:：;]/.test(readable) && list < 2) {
      result.skipped++;
      return;
    }
    const key = contentKey(raw);
    if (seen.has(key)) {
      result.skipped++;
      return;
    }
    seen.add(key);
    if (misconception.test(readable) && !hasCorrection.test(readable)) {
      result.skipped++;
      return;
    }
    const promptContext = (subRole || contentRole(headings.map((h) => h.text))) === "prompt";
    const named = readable.match(/(?:两|二|三|四|[234])种[^。！？\n：:]{0,25}[：:]([^。！？\n]+)[。.]?$/), names = named == null ? void 0 : named[1].split(/[、，,]/).map((x) => x.trim());
    const namedList = !!names && names.length >= 2 && names.length <= 4 && names.every((x) => x.length > 0 && x.length <= 24);
    const term = promptContext ? void 0 : definitionTerm(readable, heading), isDefinition = !!term, kind = isDefinition ? "definition" : !promptContext && (structuredList || namedList) ? "list" : "explanation";
    const headingTrail = [...headings.map((h) => h.text), ...subheading ? [subheading] : []], bareHeading = heading.replace(/^\d+(?:\.\d+)*[.、]?\s*/, ""), role = /^(?:优点|缺点|特点|优势|劣势|前提|适用条件|适用场景|使用场景|原理|步骤|流程|注意事项|限制|主要参数)$/.test(bareHeading);
    const subject = role ? headingTrail.at(-2) || title : heading;
    let question = role ? `\u300C${subject}\u300D\u7684${bareHeading}\u6709\u54EA\u4E9B\uFF1F` : /[?？]$/.test(heading) ? heading : `\u300C${heading}\u300D${kind === "definition" ? "\u662F\u4EC0\u4E48\uFF0C\u6709\u54EA\u4E9B\u5173\u952E\u7279\u5F81\uFF1F" : kind === "list" ? "\u6709\u54EA\u4E9B\u8981\u70B9\uFF1F" : "\u8BF4\u660E\u4E86\u4EC0\u4E48\uFF1F"}`;
    if (term && term.length <= 45) question = `${term}\u662F\u4EC0\u4E48\uFF1F`;
    if (answerLabel.test(subheading)) question = `\u300C${((_b2 = headings.at(-1)) == null ? void 0 : _b2.text) || title}\u300D\u7684${subheading}\u662F\u4EC0\u4E48\uFF1F`;
    const exact = rows.slice(begin, endLine + 1).join("\n").trim(), hash = fingerprint(exact), contextLine = Math.max(start, begin - 6), context = rows.slice(contextLine, Math.min(rows.length, endLine + 8)).join("\n");
    const caveats = [];
    if (promptContext) caveats.push("\u8FD9\u662F\u7EC3\u4E60\u9898\u5E72\u3001\u6761\u4EF6\u6216\u8981\u6C42\uFF0C\u5C1A\u4E0D\u662F\u7B54\u6848\uFF1B\u8BF7\u7ED3\u5408\u53C2\u8003\u7B54\u6848\u6838\u5BF9\u540E\u518D\u5236\u5361");
    if (/^(?:这|它|其|因此|所以|也就是说|实际上|对于(?:这个|该)|该)/.test(readable)) caveats.push("\u53EF\u80FD\u4F9D\u8D56\u524D\u6587\u6307\u4EE3\uFF0C\u8BF7\u5C55\u5F00\u4E0A\u4E0B\u6587");
    if (/(?:两(?:个|项)|任意.{0,3}两|总是|绝对|一定|所有|必然)/.test(readable)) caveats.push("\u5305\u542B\u8303\u56F4\u6216\u6761\u4EF6\u5224\u65AD\uFF0C\u8BF7\u6838\u5BF9\u9002\u7528\u524D\u63D0");
    if (misconception.test(readable)) caveats.push("\u5305\u542B\u5148\u63D0\u51FA\u8BEF\u89E3\u518D\u6F84\u6E05\u7684\u8868\u8FBE\uFF0C\u8BF7\u4FDD\u7559\u5B8C\u6574\u4E0A\u4E0B\u6587");
    result.points.push({ id: fingerprint(path + "\n" + heading + "\n" + exact), path, heading, headingPath: [...headings.map((h) => h.text), ...subheading ? [subheading] : []], line: begin, endLine, excerpt: exact, question, kind, confidence: !promptContext && (isDefinition || structuredList || namedList) ? "structured" : "review", reason: promptContext ? "\u7EC3\u4E60\u9898\u5E72\u6216\u6761\u4EF6\uFF0C\u672A\u4F5C\u4E3A\u7ED3\u6784\u660E\u786E\u7684\u7B54\u6848" : isDefinition ? "\u53D1\u73B0\u5B9A\u4E49\u53E5\uFF1B\u8BF7\u68C0\u67E5\u95EE\u9898\u662F\u5426\u8DB3\u591F\u5177\u4F53" : structuredList || namedList ? "\u53D1\u73B0\u6210\u7EC4\u8981\u70B9\uFF1B\u8BF7\u68C0\u67E5\u662F\u5426\u5C5E\u4E8E\u540C\u4E00\u4E2A\u95EE\u9898" : "\u6309\u6807\u9898\u6574\u7406\u7684\u539F\u6587\u6BB5\u843D\uFF0C\u9700\u8981\u4F60\u5224\u65AD\u662F\u5426\u503C\u5F97\u8BB0\u5FC6", fingerprint: hash, sourceFingerprint, context, contextLine, caveats });
  };
  for (let i = start; i < rows.length; i++) {
    const row = rows[i], f = row.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (f && f[1][0] === fence && f[1].length >= fenceSize && !f[2].trim()) fence = "";
      continue;
    }
    if (f) {
      flush();
      fence = f[1][0];
      fenceSize = f[1].length;
      continue;
    }
    if (comment) {
      if (row.includes("-->")) comment = false;
      continue;
    }
    if (row.includes("<!--")) {
      flush();
      if (!row.slice(row.indexOf("<!--") + 4).includes("-->")) comment = true;
      continue;
    }
    if (mathClose) {
      if (row.includes(mathClose)) mathClose = "";
      continue;
    }
    if (/^\s*(?:\$\$|\\\[)/.test(row)) {
      flush();
      const delimiter = row.trim().startsWith("$$") ? "$$" : "\\]";
      const rest = row.trim().slice(2);
      if (!rest.includes(delimiter)) mathClose = delimiter;
      continue;
    }
    const h = row.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/);
    if (h) {
      flush();
      subheading = "";
      subRole = "";
      while (headings.length && headings.at(-1).level >= h[1].length) headings.pop();
      headings.push({ level: h[1].length, text: plainText(h[2]) });
      continue;
    }
    const example = row.match(/^\s*\*\*(例[一二三四五六七八九十0-9]+[：:][^*]{1,60})\*\*/);
    if (example) {
      flush();
      subheading = plainText(example[1]);
    }
    const strong = row.match(/^\s*\*\*([^*\n]{1,80})\*\*\s*$/);
    if (strong && !/[。！!]|\.\s|\.$/.test(strong[1])) {
      flush();
      const label2 = plainText(strong[1]);
      if (caption.test(label2)) {
        continue;
      }
      subheading = label2;
      if (answerLabel.test(label2)) subRole = "answer";
      else if (promptLabel.test(label2) || exerciseHeading.test(label2)) subRole = "prompt";
      continue;
    }
    if (!row.trim() && buffer.length && misconception.test(plainText(buffer.join("\n")))) {
      const next = rows.slice(i + 1).find((r) => r.trim());
      if (next && correction.test(plainText(next))) {
        buffer.push("");
        continue;
      }
    }
    const nestedList = /^\s+\S/.test(row) && buffer.some((r) => /^\s*(?:[-+*]|\d+[.)])\s+/.test(r));
    if (!row.trim() || !nestedList && /^ {4}|^\t/.test(row) || /^\s*(?:<|!\[|\[\^[^\]]+\]:|\[[^\]]+\]:|[-*_]{3,}\s*$)/.test(row)) {
      flush();
      continue;
    }
    if (!buffer.length) begin = i;
    buffer.push(row);
  }
  flush();
  if (fence) result.warnings.push("\u8DF3\u8FC7\u672A\u95ED\u5408\u4EE3\u7801\u5757");
  return result;
}
function uniqueKnowledge(points) {
  const seen = /* @__PURE__ */ new Set(), unique = [];
  for (const point of points) {
    const key = contentKey(point.excerpt);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(point);
    }
  }
  return { points: unique, duplicates: points.length - unique.length };
}

// src/backup.ts
var MAX_BACKUP_BYTES = 10 * 1024 * 1024;
function assertBackupSize(text2, exporting = false) {
  if (text2.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text2).byteLength > MAX_BACKUP_BYTES) {
    throw new Error(exporting ? "\u5907\u4EFD\u8D85\u8FC7 10 MiB\uFF0C\u672A\u751F\u6210 JSON \u5907\u4EFD\u3002\u8BF7\u5B8C\u6574\u5907\u4EFD\u77E5\u8BC6\u5E93\u6587\u4EF6\u4EE5\u4FDD\u7559\u5168\u90E8\u6570\u636E" : "\u5907\u4EFD\u8D85\u8FC7 10 MiB\uFF08UTF-8\uFF09\uFF0C\u8BF7\u5148\u68C0\u67E5\u6587\u4EF6");
  }
}
function fitsBackup(text2) {
  return text2.length <= MAX_BACKUP_BYTES && new TextEncoder().encode(text2).byteLength <= MAX_BACKUP_BYTES;
}
function serializeBackup(data, now, part) {
  return JSON.stringify({ format: "passage-practice-backup", formatVersion: "decks" in data ? 2 : 1, pluginVersion: "1.5.1", exportedAt: new Date(now).toISOString(), ...part ? { part } : {}, data }, null, 2);
}
function backupData(input, now) {
  return Array.isArray(input) ? normalizeData({ version: 2, cards: input }, now) : normalizeStudyData(input, now);
}
function exportBackupParts(input, now = Date.now()) {
  const data = backupData(input, now), single = serializeBackup(data, now);
  if (fitsBackup(single)) return [single];
  const id = crypto.randomUUID(), parts = [];
  const reserve = { id, index: Number.MAX_SAFE_INTEGER, total: Number.MAX_SAFE_INTEGER };
  const partition = (cards) => {
    const ids = new Set(cards.map((card) => card.id));
    const subset = "decks" in data ? { ...data, cards, decks: data.decks.map((deck) => ({ ...deck, cardIds: deck.cardIds.filter((cardId) => ids.has(cardId)) })) } : { ...data, cards };
    if (fitsBackup(serializeBackup(subset, now, reserve))) {
      parts.push(subset);
      if (parts.length > 1e4) throw new Error("\u5907\u4EFD\u9700\u8981\u8D85\u8FC7 10000 \u4E2A\u5206\u5377\uFF0C\u672A\u751F\u6210\u5907\u4EFD\uFF1B\u8BF7\u5B8C\u6574\u5907\u4EFD\u77E5\u8BC6\u5E93\u6587\u4EF6");
      return;
    }
    if (cards.length <= 1) throw new Error("\u5355\u5F20\u5361\u7247\u53CA\u5176\u590D\u4E60\u8BB0\u5F55\u6216\u5361\u7EC4\u5B9A\u4E49\u8D85\u8FC7 10 MiB\uFF0C\u65E0\u6CD5\u5206\u5377\uFF0C\u672A\u751F\u6210\u5907\u4EFD\uFF1B\u8BF7\u5B8C\u6574\u5907\u4EFD\u77E5\u8BC6\u5E93\u6587\u4EF6");
    const middle = Math.ceil(cards.length / 2);
    partition(cards.slice(0, middle));
    partition(cards.slice(middle));
  };
  partition(data.cards);
  return parts.map((part, index) => {
    const text2 = serializeBackup(part, now, { id, index: index + 1, total: parts.length });
    assertBackupSize(text2, true);
    return text2;
  });
}
function parsePart(raw) {
  if (raw === void 0) return;
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id || raw.id.length > 128 || !Number.isSafeInteger(raw.index) || !Number.isSafeInteger(raw.total) || raw.index < 1 || raw.total < 1 || raw.total > 1e4 || raw.index > raw.total) throw new Error("\u5907\u4EFD\u5206\u5377\u4FE1\u606F\u635F\u574F");
  return { id: raw.id, index: raw.index, total: raw.total };
}
function parseBackup(text2, now = Date.now()) {
  assertBackupSize(text2);
  let raw;
  try {
    raw = JSON.parse(text2);
  } catch (e) {
    throw new Error("\u4E0D\u662F\u6709\u6548\u7684 JSON \u5907\u4EFD\u6587\u4EF6");
  }
  if ((raw == null ? void 0 : raw.format) === "passage-practice-backup") {
    if (raw.formatVersion !== 1 && raw.formatVersion !== 2) throw new Error("\u4E0D\u652F\u6301\u7684\u5907\u4EFD\u7248\u672C");
    const backupPart = parsePart(raw.part);
    const data = raw.formatVersion === 2 ? normalizeStudyData(raw.data, now) : normalizeData(raw.data, now);
    return backupPart ? { ...data, backupPart } : data;
  }
  return (raw == null ? void 0 : raw.format) === "passage-practice-vault" ? normalizeStudyData(raw, now) : normalizeData(raw, now);
}
function deckFingerprint(cards) {
  return fingerprint(JSON.stringify(cards));
}
function planImport(current, incoming, choice) {
  var _a2;
  if (choice !== void 0 && choice !== "keep-local" && choice !== "use-backup") throw new Error("\u8BF7\u9009\u62E9\u4FDD\u7559\u672C\u5730\u7B97\u6CD5\u6216\u4F7F\u7528\u5907\u4EFD\u7B97\u6CD5");
  const full = !Array.isArray(current), local = full ? current.cards : current;
  const localData = full ? current : void 0, defaultDeck = localData == null ? void 0 : localData.decks[0];
  const empty = !!localData && local.length === 0 && localData.schedulingAlgorithm === void 0 && localData.decks.length === 1 && (defaultDeck == null ? void 0 : defaultDeck.id) === DEFAULT_DECK && defaultDeck.name === "\u9ED8\u8BA4\u5361\u7EC4" && defaultDeck.revision === 0 && defaultDeck.createdAt === defaultDeck.updatedAt;
  const byId = new Map(local.map((c) => [c.id, c])), contents = new Set(local.map((c) => JSON.stringify([c.front, c.back, c.sourcePath]))), add = [], conflicts = [];
  let identical = 0, duplicates = 0;
  for (const card of incoming.cards) {
    const existing = byId.get(card.id);
    if (existing) {
      if (JSON.stringify(existing) === JSON.stringify(card)) identical++;
      else conflicts.push(card.id);
      continue;
    }
    const key = JSON.stringify([card.front, card.back, card.sourcePath]);
    if (contents.has(key)) {
      duplicates++;
      continue;
    }
    add.push(structuredClone(card));
    contents.add(key);
  }
  const plan = { incoming: structuredClone(incoming), add, identical, duplicates, conflicts, base: deckFingerprint(current), requiresAlgorithmChoice: false, ...incoming.backupPart ? { backupPart: { ...incoming.backupPart } } : {}, ...full ? { decks: [], deckConflicts: [], deckMemberships: [] } : {} };
  if (full) {
    const data = current;
    plan.localSchedulingAlgorithm = (_a2 = data.schedulingAlgorithm) != null ? _a2 : "fsrs";
    plan.savedSchedulingAlgorithm = "decks" in incoming ? incoming.schedulingAlgorithm : void 0;
    if (plan.savedSchedulingAlgorithm) {
      plan.algorithmChoice = choice != null ? choice : empty ? "use-backup" : void 0;
      plan.requiresAlgorithmChoice = plan.algorithmChoice === void 0;
      if (plan.algorithmChoice) plan.schedulingAlgorithm = plan.algorithmChoice === "use-backup" ? plan.savedSchedulingAlgorithm : plan.localSchedulingAlgorithm;
    } else {
      if (choice === "use-backup") throw new Error("\u6B64\u5907\u4EFD\u672A\u4FDD\u5B58\u7B97\u6CD5\u504F\u597D\uFF0C\u8BF7\u4FDD\u7559\u672C\u5730\u7B97\u6CD5");
      plan.algorithmChoice = "keep-local";
      plan.schedulingAlgorithm = plan.localSchedulingAlgorithm;
    }
  } else if (choice === "use-backup") {
    throw new Error("\u6062\u590D\u7B97\u6CD5\u504F\u597D\u9700\u8981\u5B8C\u6574\u7684\u672C\u5730\u6570\u636E\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u5907\u4EFD");
  }
  if (full && "decks" in incoming) {
    const localDecks = current.decks, available = new Set([...local, ...add].map((c) => c.id));
    for (const deck of incoming.decks) {
      const existing = localDecks.find((d) => d.id === deck.id || d.name === deck.name);
      if (existing) {
        if ((incoming.backupPart || empty) && existing.id === deck.id && existing.name === deck.name) {
          const members = new Set(existing.cardIds), missing = deck.cardIds.filter((id) => available.has(id) && !members.has(id));
          if (missing.length) plan.deckMemberships.push({ id: existing.id, cardIds: missing });
          if (existing.id !== DEFAULT_DECK && JSON.stringify({ ...existing, cardIds: [] }) !== JSON.stringify({ ...deck, cardIds: [] })) plan.deckConflicts.push(deck.name);
        } else if (JSON.stringify(existing) !== JSON.stringify(deck)) plan.deckConflicts.push(deck.name);
        continue;
      }
      plan.decks.push({ ...structuredClone(deck), cardIds: deck.cardIds.filter((id) => available.has(id)) });
    }
  }
  return plan;
}

// src/card-store.ts
var copy = (card) => structuredClone(card);
var CardStore = class {
  constructor(raw, persist, now = Date.now()) {
    this.persist = persist;
    __publicField(this, "state");
    __publicField(this, "pending", Promise.resolve());
    this.state = normalizeStudyData(raw, now);
  }
  get data() {
    return structuredClone(this.state);
  }
  get schedulingAlgorithm() {
    var _a2;
    return (_a2 = this.state.schedulingAlgorithm) != null ? _a2 : "fsrs";
  }
  setSchedulingAlgorithm(algorithm) {
    return this.transact((_cards, data) => {
      if (algorithm !== "fsrs" && algorithm !== "sm2-osr") throw new Error("\u4E0D\u652F\u6301\u7684\u7B97\u6CD5");
      data.schedulingAlgorithm = algorithm;
      data.version = 3;
      data.storageVersion = 2;
    });
  }
  get decks() {
    return structuredClone(this.state.decks);
  }
  get cards() {
    return this.state.cards.map(copy);
  }
  get(id) {
    const c = this.state.cards.find((c2) => c2.id === id);
    return c ? copy(c) : void 0;
  }
  transact(edit, beforeCommit, assignUnclaimed = true) {
    const work = this.pending.then(async () => {
      const draft = structuredClone(this.state), next = draft.cards;
      const oldIds = new Set(next.map((c) => c.id));
      const result = edit(next, draft);
      const defaultDeck = draft.decks.find((d) => d.id === DEFAULT_DECK);
      for (const card of next) if (assignUnclaimed && !oldIds.has(card.id) && draft.decks.every((d) => !d.cardIds.includes(card.id))) defaultDeck.cardIds.push(card.id);
      const data = normalizeStudyData(draft, Date.now());
      beforeCommit == null ? void 0 : beforeCommit();
      await this.persist(data);
      this.state = data;
      return result;
    });
    this.pending = work.catch(() => {
    });
    return work;
  }
  /** One atomic persistence for an explicitly reviewed batch; duplicates are skipped. */
  addMany(seeds, now = Date.now(), beforeCommit, deckId = DEFAULT_DECK) {
    if (!seeds.length || seeds.length > 100) throw new Error("\u6BCF\u6279\u8BF7\u9009\u62E9 1 \u81F3 100 \u6761\u5019\u9009");
    seeds = structuredClone(seeds);
    return this.transact((cards, data) => {
      const deck = this.requireDeck(data, deckId);
      let added = 0, duplicates = 0;
      const keys = new Set(cards.map((c) => JSON.stringify([c.front, c.back, c.sourcePath])));
      for (const seed of seeds) {
        const card = createCard(seed.front.trim(), seed.back.trim(), seed.sourcePath, now, crypto.randomUUID()), key = JSON.stringify([card.front, card.back, card.sourcePath]);
        if (keys.has(key)) {
          duplicates++;
          continue;
        }
        if (seed.sourceRef) card.sourceRef = structuredClone(seed.sourceRef);
        cards.push(card);
        deck.cardIds.push(card.id);
        keys.add(key);
        added++;
      }
      return { added, duplicates };
    }, beforeCommit);
  }
  importBackup(plan) {
    return this.transact((cards, data) => {
      const current = plan.decks !== void 0 ? data : cards;
      if (deckFingerprint(current) !== plan.base) throw new Error("\u672C\u5730\u5361\u7247\u6216\u5361\u7EC4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u5907\u4EFD");
      const latest = planImport(current, plan.incoming, plan.algorithmChoice);
      if (latest.requiresAlgorithmChoice) throw new Error("\u8BF7\u9009\u62E9\u6062\u590D\u540E\u4F7F\u7528\u7684\u590D\u4E60\u7B97\u6CD5");
      cards.push(...latest.add);
      if (latest.decks) data.decks.push(...latest.decks);
      for (const membership of latest.deckMemberships || []) {
        const deck = this.requireDeck(data, membership.id);
        deck.cardIds = [.../* @__PURE__ */ new Set([...deck.cardIds, ...membership.cardIds])];
      }
      if (latest.algorithmChoice === "use-backup" && latest.schedulingAlgorithm) {
        data.schedulingAlgorithm = latest.schedulingAlgorithm;
        data.version = 3;
        data.storageVersion = 2;
      }
      return latest.add.length;
    }, void 0, !("decks" in plan.incoming));
  }
  /** All selected identities must still match; failure never publishes a partial deck. */
  suspendMany(selected, suspended, now = Date.now(), beforeCommit) {
    if (!selected.length || selected.length > 1e3 || new Set(selected.map((c) => c.id)).size !== selected.length) throw new Error("\u6BCF\u6279\u8BF7\u9009\u62E9 1 \u81F3 1000 \u5F20\u4E0D\u540C\u5361\u7247");
    const snapshots = selected.map(copy);
    return this.transact((cards) => {
      let changed = 0;
      for (const snapshot of snapshots) {
        const i = cards.findIndex((c) => c.id === snapshot.id), old = i < 0 ? void 0 : cards[i];
        if (old && (old.id.startsWith("note:") ? old.revision !== snapshot.revision : !sameCard(old, snapshot))) throw new Error("\u6240\u9009\u5361\u7247\u5DF2\u53D8\u5316\uFF0C\u672C\u6279\u672A\u4FDD\u5B58\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
        if (!old && (!snapshot.id.startsWith("note:") || snapshot.reviews !== 0)) throw new Error("\u6240\u9009\u5361\u7247\u5DF2\u79FB\u9664\uFF0C\u672C\u6279\u672A\u4FDD\u5B58");
        if (snapshot.suspended === suspended) continue;
        const updated = { ...snapshot, suspended, updatedAt: now, revision: snapshot.revision + 1 };
        if (i < 0) cards.push(updated);
        else cards[i] = updated;
        changed++;
      }
      return changed;
    }, beforeCommit);
  }
  setAuthoredSuspended(card, suspended, now = Date.now()) {
    if (!card.id.startsWith("note:")) throw new Error("\u4E0D\u662F\u7B14\u8BB0\u6807\u8BB0\u5361\u7247");
    return this.transact((cards) => {
      const i = cards.findIndex((c) => c.id === card.id);
      if (i >= 0 && cards[i].revision !== card.revision) throw new Error("\u5361\u7247\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00");
      const updated = { ...card, suspended, updatedAt: now, revision: card.revision + 1 };
      if (i < 0) cards.push(updated);
      else cards[i] = updated;
    });
  }
  rateAuthored(card, rating, now = Date.now(), beforeCommit) {
    if (!card.id.startsWith("note:")) throw new Error("\u4E0D\u662F\u7B14\u8BB0\u6807\u8BB0\u5361\u7247");
    return this.transact((cards) => {
      const i = cards.findIndex((c) => c.id === card.id);
      if (i >= 0 && cards[i].revision !== card.revision) throw new Error("\u5361\u7247\u5DF2\u6539\u53D8\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
      if (i < 0 && card.reviews !== 0) throw new Error("\u590D\u4E60\u8BB0\u5F55\u5DF2\u6539\u53D8");
      if (card.suspended) throw new Error("\u5361\u7247\u5DF2\u6682\u505C");
      const next = applyRating(card, rating, now, this.schedulingAlgorithm, srHistogram(cards, now));
      if (i < 0) cards.push(next);
      else cards[i] = next;
      return copy(next);
    }, beforeCommit);
  }
  relocate(oldPath, newPath) {
    return this.transact((cards) => {
      for (const c of cards) if (c.sourcePath === oldPath || c.sourcePath.startsWith(oldPath + "/")) {
        c.sourcePath = newPath + c.sourcePath.slice(oldPath.length);
        c.revision++;
      }
    });
  }
  add(front, back, sourcePath, now = Date.now(), deckId = DEFAULT_DECK, sourceRef) {
    sourceRef = sourceRef ? structuredClone(sourceRef) : void 0;
    return this.transact((cards, data) => {
      const deck = this.requireDeck(data, deckId);
      const duplicate = cards.find((c) => c.front === front && c.back === back && c.sourcePath === sourcePath);
      if (duplicate) throw new Error("\u76F8\u540C\u9898\u76EE\u4E0E\u7B54\u6848\u7684\u5361\u7247\u5DF2\u5B58\u5728\uFF0C\u53EF\u5728\u5361\u7247\u5E93\u7F16\u8F91\u6216\u6062\u590D\u3002");
      const card = createCard(front, back, sourcePath, now, crypto.randomUUID());
      if (sourceRef) card.sourceRef = structuredClone(sourceRef);
      cards.push(card);
      deck.cardIds.push(card.id);
      return copy(card);
    });
  }
  edit(id, revision, front, back, now = Date.now(), relearn = false) {
    return this.transact((cards) => {
      const i = this.index(cards, id, revision), old = cards[i];
      const content = createCard(front, back, old.sourcePath, now, old.id);
      cards[i] = { ...relearn ? resetScheduling(old, now) : old, front: content.front, back: content.back, updatedAt: now, revision: old.revision + 1 };
      return copy(cards[i]);
    });
  }
  rate(id, revision, rating, now = Date.now()) {
    return this.transact((cards) => {
      const i = this.index(cards, id, revision);
      if (cards[i].suspended) throw new Error("\u5361\u7247\u5DF2\u6682\u505C\uFF0C\u8BF7\u5237\u65B0\u961F\u5217\u3002");
      cards[i] = applyRating(cards[i], rating, now, this.schedulingAlgorithm, srHistogram(cards, now));
      return copy(cards[i]);
    });
  }
  suspend(id, revision, suspended, now = Date.now()) {
    return this.transact((cards) => {
      const i = this.index(cards, id, revision);
      cards[i] = { ...cards[i], suspended, updatedAt: now, revision: cards[i].revision + 1 };
      return copy(cards[i]);
    });
  }
  restoreRating(previous, expectedRevision, now = Date.now()) {
    return this.transact((cards) => {
      const i = this.index(cards, previous.id, expectedRevision);
      cards[i] = { ...previous, updatedAt: now, revision: expectedRevision + 1 };
      return copy(cards[i]);
    });
  }
  createDeck(name, selected = [], now = Date.now()) {
    const snapshots = selected.map(copy);
    return this.transact((cards, data) => {
      name = name.trim();
      if (!name || name.length > 100) throw new Error("\u5361\u7EC4\u540D\u79F0\u9700\u4E3A 1 \u81F3 100 \u4E2A\u5B57\u7B26");
      if (data.decks.some((d) => d.name === name)) throw new Error("\u540C\u540D\u5361\u7EC4\u5DF2\u5B58\u5728");
      this.materialize(cards, snapshots);
      const deck = { id: crypto.randomUUID(), name, cardIds: snapshots.map((c) => c.id), createdAt: now, updatedAt: now, revision: 0 };
      data.decks.push(deck);
      return structuredClone(deck);
    });
  }
  assignDeck(deckId, selected, now = Date.now()) {
    const snapshots = selected.map(copy);
    return this.transact((cards, data) => {
      const deck = data.decks.find((d) => d.id === deckId);
      if (!deck) throw new Error("\u5361\u7EC4\u4E0D\u5B58\u5728");
      this.materialize(cards, snapshots);
      let added = 0;
      for (const c of snapshots) if (!deck.cardIds.includes(c.id)) {
        deck.cardIds.push(c.id);
        added++;
      }
      deck.updatedAt = now;
      deck.revision++;
      return added;
    });
  }
  renameDeck(id, revision, name, now = Date.now()) {
    return this.transact((_cards, data) => {
      const deck = this.requireDeck(data, id);
      if (deck.revision !== revision) throw new Error("\u5361\u7EC4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      name = name.trim();
      if (!name || name.length > 100) throw new Error("\u5361\u7EC4\u540D\u79F0\u9700\u4E3A 1 \u81F3 100 \u4E2A\u5B57\u7B26");
      if (data.decks.some((d) => d.id !== id && d.name === name)) throw new Error("\u540C\u540D\u5361\u7EC4\u5DF2\u5B58\u5728");
      deck.name = name;
      deck.revision++;
      deck.updatedAt = now;
    });
  }
  removeFromDeck(id, revision, selected, now = Date.now()) {
    const snapshots = selected.map(copy);
    return this.transact((cards, data) => {
      const deck = this.requireDeck(data, id);
      if (deck.revision !== revision) throw new Error("\u5361\u7EC4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      for (const c of snapshots) {
        const old = cards.find((x) => x.id === c.id);
        if (!old || !sameCard(old, c)) throw new Error("\u6240\u9009\u5361\u7247\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      }
      const ids = new Set(snapshots.map((c) => c.id)), count = deck.cardIds.filter((x) => ids.has(x)).length;
      deck.cardIds = deck.cardIds.filter((x) => !ids.has(x));
      deck.revision++;
      deck.updatedAt = now;
      return count;
    });
  }
  deleteEmptyDeck(id, revision) {
    return this.transact((_cards, data) => {
      const deck = this.requireDeck(data, id);
      if (id === DEFAULT_DECK) throw new Error("\u9ED8\u8BA4\u5361\u7EC4\u4E0D\u80FD\u5220\u9664");
      if (deck.revision !== revision) throw new Error("\u5361\u7EC4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      if (deck.cardIds.length) throw new Error("\u53EA\u80FD\u5220\u9664\u7A7A\u5361\u7EC4\uFF0C\u8BF7\u5148\u79FB\u51FA\u5361\u7247");
      data.decks = data.decks.filter((d) => d.id !== id);
    });
  }
  requireDeck(data, id) {
    const deck = data.decks.find((d) => d.id === id);
    if (!deck) throw new Error("\u5361\u7EC4\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
    return deck;
  }
  materialize(cards, selected) {
    if (selected.length > 1e4 || new Set(selected.map((c) => c.id)).size !== selected.length) throw new Error("\u5361\u7247\u9009\u62E9\u65E0\u6548");
    for (const c of selected) {
      const old = cards.find((x) => x.id === c.id);
      if (old && !sameCard(old, c)) throw new Error("\u6240\u9009\u5361\u7247\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
      if (!old) {
        if (!c.id.startsWith("note:") || c.reviews !== 0) throw new Error("\u5361\u7247\u5DF2\u79FB\u9664");
        cards.push(copy(c));
      }
    }
  }
  index(cards, id, revision) {
    const i = cards.findIndex((c) => c.id === id);
    if (i < 0) throw new Error("\u5361\u7247\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u5361\u7247\u5E93\u3002");
    if (cards[i].revision !== revision) throw new Error("\u5361\u7247\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u540E\u91CD\u8BD5\u3002");
    return i;
  }
};

// src/review-order.ts
function sessionOrder(items, order, random = Math.random) {
  const result = [...items];
  if (order === "random") for (let i = result.length - 1; i > 0; i--) {
    const n = random();
    if (!Number.isFinite(n) || n < 0 || n >= 1) throw new Error("Invalid shuffle source");
    const j = Math.floor(n * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function sessionFrom(items, item, order) {
  if (!items.includes(item)) throw new Error("Starting item is outside the selected scope");
  return order === "random" ? { queue: [item, ...sessionOrder(items.filter((x) => x !== item), order)], position: 0 } : { queue: [...items], position: items.indexOf(item) };
}

// src/sections.ts
function markdownStructure(text2) {
  var _a2;
  const rows = text2.replace(/\r\n/g, "\n").split("\n"), result = { rows, start: 0, headings: [], fences: [], warnings: [], visibleRows: [], opaqueRanges: [] };
  if (((_a2 = rows[0]) == null ? void 0 : _a2.replace(/^\uFEFF/, "")) === "---") {
    const end = rows.findIndex((row, i) => i > 0 && (row === "---" || row === "..."));
    if (end < 0) {
      result.start = rows.length;
      result.warnings.push("YAML \u5C5E\u6027\u533A\u5C1A\u672A\u95ED\u5408\uFF0C\u672A\u4F5C\u4E3A\u6B63\u6587\u590D\u4E60");
      return result;
    }
    result.start = end + 1;
  }
  let comment = "", paragraphStart = -1, inTable = false;
  const stack = [];
  const lists = [];
  const indentation = (row) => {
    let width = 0;
    for (const char of row) {
      if (char === " ") width++;
      else if (char === "	") width += 4 - width % 4;
      else break;
    }
    return width;
  };
  const visible = (row) => {
    let out = "", i = 0;
    while (i < row.length) {
      if (comment) {
        const token2 = comment === "html" ? "-->" : "%%", end = row.indexOf(token2, i);
        if (end < 0) return out + " ".repeat(row.length - i);
        out += " ".repeat(end + token2.length - i);
        i = end + token2.length;
        comment = "";
      } else if (row[i] === "\\" && i + 1 < row.length) {
        out += row.slice(i, i + 2);
        i += 2;
      } else if (row[i] === "`") {
        const run = row.slice(i).match(/^`+/)[0];
        let end = row.indexOf(run, i + run.length);
        while (end >= 0 && (row[end - 1] === "`" || row[end + run.length] === "`")) end = row.indexOf(run, end + run.length);
        if (end >= 0) {
          out += row.slice(i, end + run.length);
          i = end + run.length;
        } else {
          out += run;
          i += run.length;
        }
      } else if (row.startsWith("<!--", i)) {
        comment = "html";
        out += "    ";
        i += 4;
      } else if (row.startsWith("%%", i)) {
        comment = "obsidian";
        out += "  ";
        i += 2;
      } else {
        out += row[i];
        i++;
      }
    }
    return out;
  };
  const add = (line, contentLine, level, title) => {
    while (stack.length && stack.at(-1).level >= level) stack.pop();
    const heading = { line, contentLine, level, title: title || "\uFF08\u7A7A\u6807\u9898\uFF09", path: [...stack.map((h) => h.title), title || "\uFF08\u7A7A\u6807\u9898\uFF09"] };
    result.headings.push(heading);
    stack.push(heading);
    paragraphStart = -1;
  };
  for (let i = result.start; i < rows.length; i++) {
    const raw = rows[i], indent = indentation(raw);
    let nested = false, fenceRow = raw, baseIndent = 0;
    const marker = !comment ? raw.match(/^([ \t]*)([-+*]|\d{1,9}[.)])([ \t]+)(.*)$/) : null;
    if (!comment && raw.trim()) {
      if (marker && (indent < 4 || lists.some((list) => indent >= list.contentIndent))) {
        while (lists.length && indent <= lists.at(-1).indent) lists.pop();
        baseIndent = indent + marker[2].length + marker[3].length;
        lists.push({ indent, contentIndent: baseIndent });
        nested = true;
        fenceRow = marker[4];
      } else {
        while (lists.length && indent < lists.at(-1).contentIndent) lists.pop();
        if (lists.length) {
          nested = true;
          baseIndent = lists.at(-1).contentIndent;
          fenceRow = raw.replace(/^[ \t]*/, (spaces) => " ".repeat(Math.max(0, indent - baseIndent)));
        }
      }
    }
    if (!comment && (!nested && /^(?: {4}|\t)/.test(raw) || nested && !marker && indent >= baseIndent + 4)) {
      paragraphStart = -1;
      result.visibleRows[i] = "";
      continue;
    }
    const fence = (!comment ? fenceRow : "").match(/^ {0,3}(`{3,}|~{3,})([^\n]*)$/);
    if (fence && !(fence[1][0] === "`" && fence[2].includes("`"))) {
      const character = fence[1][0], close = new RegExp(`^ {0,3}${character}{${fence[1].length},}\\s*$`);
      let end = i + 1, closed = false;
      while (end < rows.length) {
        const row2 = rows[end], width = indentation(row2);
        if (nested && row2.trim() && width < baseIndent) break;
        const candidate = nested ? row2.replace(/^[ \t]*/, (spaces) => " ".repeat(Math.max(0, width - baseIndent))) : row2;
        if (close.test(candidate)) {
          closed = true;
          break;
        }
        end++;
      }
      result.fences.push({ line: i, endLine: closed ? end + 1 : end, info: fence[2].trim(), closed, indent, nested });
      paragraphStart = -1;
      i = closed ? end : end - 1;
      continue;
    }
    const html2 = !comment ? fenceRow.match(/^ {0,3}<(pre|script|style|textarea)(?:[ \t>]|$)/i) : null;
    if (html2) {
      const close = new RegExp("</" + html2[1] + "\\s*>", "i");
      let end = i, closed = false;
      while (end < rows.length) {
        if (end > i && nested && rows[end].trim() && indentation(rows[end]) < baseIndent) break;
        if (close.test(rows[end])) {
          closed = true;
          break;
        }
        end++;
      }
      const endLine = closed ? end + 1 : end;
      result.opaqueRanges.push([i, endLine]);
      paragraphStart = -1;
      i = endLine - 1;
      continue;
    }
    const row = visible(raw);
    result.visibleRows[i] = row;
    if (nested) {
      paragraphStart = -1;
      continue;
    }
    const atx = row.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/);
    if (atx) {
      add(i, i + 1, atx[1].length, (atx[2] || "").replace(/(?:^|[ \t]+)#+[ \t]*$/, "").trim());
      continue;
    }
    if (!row.trim()) inTable = false;
    const cells = row.trim().replace(/^\||\|$/g, "").split("|");
    if (row.includes("|") && cells.length > 1 && cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell))) {
      inTable = true;
      paragraphStart = -1;
      continue;
    }
    if (inTable && row.includes("|")) {
      paragraphStart = -1;
      continue;
    }
    const setext = row.match(/^ {0,3}(=+|-+)[ \t]*$/);
    if (setext && paragraphStart >= 0) {
      add(paragraphStart, i + 1, setext[1][0] === "=" ? 1 : 2, result.visibleRows.slice(paragraphStart, i).join("\n").trim());
      continue;
    }
    if (!row.trim() || /^(?: {4}|\t| {0,3}(?:>|[-+*][ \t]|\d+[.)][ \t]|(?:\*\s*){3,}$|(?:_\s*){3,}$|(?:-\s*){3,}$|<))/.test(row) || comment) paragraphStart = -1;
    else if (paragraphStart < 0) paragraphStart = i;
  }
  return result;
}

// src/outline.ts
var MAX_CHARACTERS = 2 * 1024 * 1024;
var MAX_NODES = 1e4;
var MAX_LIST_DEPTH = 128;
var MAX_PATH_LENGTH = 4096;
function columns(whitespace, start = 0) {
  let column = start;
  for (const character of whitespace) column += character === "	" ? 4 - column % 4 : 1;
  return column;
}
function parseOutline(text2, path, warnings = []) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const reject = (reason) => {
    warnings.push(`\u5927\u7EB2\u53EC\u56DE\u672A\u751F\u6210\uFF1A${reason}`);
    return [];
  };
  if (text2.length > MAX_CHARACTERS) return reject("\u7B14\u8BB0\u8D85\u8FC7 2 MiB \u5B57\u7B26\u4E0A\u9650\uFF0C\u8BF7\u9009\u62E9\u8F83\u5C0F\u7B14\u8BB0");
  if (path.length > MAX_PATH_LENGTH) return reject("\u7B14\u8BB0\u8DEF\u5F84\u8D85\u8FC7 4,096 \u5B57\u7B26\u4E0A\u9650");
  const structure = markdownStructure(text2);
  const { rows, start, headings, fences, visibleRows } = structure;
  if (start >= rows.length) return [];
  const headingAt = new Map(headings.map((heading) => [heading.line, heading]));
  const fenceAt = new Map(fences.map((fence) => [fence.line, fence]));
  const opaqueAt = new Map(((_a2 = structure.opaqueRanges) != null ? _a2 : []).map(([begin, end]) => [begin, end]));
  const branches = [], ancestors = /* @__PURE__ */ new WeakMap();
  let count = 0;
  const make = (label2, line, kind, headingPath, parent) => {
    var _a3;
    const node = { id: JSON.stringify(["outline", path, kind, line]), label: label2, line, path, kind, children: [] };
    const ancestorPath = [...parent ? (_a3 = ancestors.get(parent)) != null ? _a3 : [] : [], label2];
    ancestors.set(node, ancestorPath);
    branches.push({ id: node.id, label: label2, line, path, headingPath: [...headingPath], ancestorPath, children: node.children });
    count++;
    return node;
  };
  const root = make(path.split(/[\\/]/).pop().replace(/\.md$/i, "") || "\uFF08\u672A\u547D\u540D\u7B14\u8BB0\uFF09", 0, "document", []);
  const headingStack = [], listStack = [];
  let comment = "";
  const maskComments = (row) => {
    let output = "", index = 0;
    while (index < row.length) {
      if (comment) {
        const token2 = comment === "html" ? "-->" : "%%", end = row.indexOf(token2, index);
        if (end < 0) return output + " ".repeat(row.length - index);
        output += " ".repeat(end + token2.length - index);
        index = end + token2.length;
        comment = "";
      } else if (row[index] === "\\" && index + 1 < row.length) {
        output += row.slice(index, index + 2);
        index += 2;
      } else if (row[index] === "`") {
        const run = row.slice(index).match(/^`+/)[0];
        let end = row.indexOf(run, index + run.length);
        while (end >= 0 && (row[end - 1] === "`" || row[end + run.length] === "`")) end = row.indexOf(run, end + run.length);
        if (end >= 0) {
          output += row.slice(index, end + run.length);
          index = end + run.length;
        } else {
          output += run;
          index += run.length;
        }
      } else if (row.startsWith("<!--", index)) {
        comment = "html";
        output += "    ";
        index += 4;
      } else if (row.startsWith("%%", index)) {
        comment = "obsidian";
        output += "  ";
        index += 2;
      } else {
        output += row[index];
        index++;
      }
    }
    return output;
  };
  for (let line = start; line < rows.length; line++) {
    const raw = rows[line], whitespace = raw.match(/^[ \t]*/)[0], indent = columns(whitespace);
    const fence = fenceAt.get(line), opaqueEnd = opaqueAt.get(line);
    if (fence || opaqueEnd !== void 0) {
      if (fence && !fence.nested) listStack.length = 0;
      else while (listStack.length && indent < listStack.at(-1).contentIndent) listStack.pop();
      line = ((_b = fence == null ? void 0 : fence.endLine) != null ? _b : opaqueEnd) - 1;
      comment = "";
      continue;
    }
    let parentIndex = listStack.length - 1;
    while (parentIndex >= 0 && indent < listStack[parentIndex].contentIndent) parentIndex--;
    const listParent = listStack[parentIndex];
    if (!comment && indent >= 4 && (!listParent || indent >= listParent.contentIndent + 4)) continue;
    const row = maskComments(raw);
    if (!row.trim()) continue;
    const heading = headingAt.get(line);
    if (heading && ((_c = visibleRows[line]) == null ? void 0 : _c.trim()) && row.trim()) {
      listStack.length = 0;
      while (headingStack.length && headingStack.at(-1).level >= heading.level) headingStack.pop();
      const trail = [...headingStack.map((entry) => entry.node.label), heading.title];
      const parent = (_e = (_d = headingStack.at(-1)) == null ? void 0 : _d.node) != null ? _e : root, node = make(heading.title, line, "heading", trail, parent);
      parent.children.push(node);
      headingStack.push({ level: heading.level, node });
      line = heading.contentLine - 1;
      if (count > MAX_NODES) return reject("\u7ED3\u6784\u8D85\u8FC7 10,000 \u4E2A\u8282\u70B9\u4E0A\u9650\uFF0C\u8BF7\u62C6\u5206\u7B14\u8BB0");
      continue;
    }
    const marker = row.match(/^([ \t]*)([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/);
    const rule = /^[ \t]*(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(row);
    if (marker && !rule && columns(marker[1]) === indent) {
      const markerEnd = indent + marker[2].length, padding = columns((_f = marker[3]) != null ? _f : " ", markerEnd) - markerEnd;
      const contentIndent = markerEnd + (padding <= 4 ? padding : 1);
      const label2 = ((_g = marker[4]) != null ? _g : "").replace(/^\[[ xX]\](?:[ \t]+|$)/, "").trim();
      if (!label2) {
        listStack.length = parentIndex + 1;
        continue;
      }
      const parent = (_j = (_i = listParent == null ? void 0 : listParent.node) != null ? _i : (_h = headingStack.at(-1)) == null ? void 0 : _h.node) != null ? _j : root;
      const node = make(label2, line, "list", headingStack.map((entry) => entry.node.label), parent);
      parent.children.push(node);
      listStack.length = parentIndex + 1;
      listStack.push({ node, contentIndent });
      if (count > MAX_NODES) return reject("\u7ED3\u6784\u8D85\u8FC7 10,000 \u4E2A\u8282\u70B9\u4E0A\u9650\uFF0C\u8BF7\u62C6\u5206\u7B14\u8BB0");
      if (listStack.length > MAX_LIST_DEPTH) return reject("\u5217\u8868\u5D4C\u5957\u8D85\u8FC7 128 \u5C42\u4E0A\u9650\uFF0C\u8BF7\u7B80\u5316\u5927\u7EB2");
    } else if (rule || !listParent) {
      listStack.length = 0;
    }
  }
  return branches.filter((branch) => branch.children.length > 0);
}

// src/study-source.ts
function selectionSourceRef(source, selectedText, path, line) {
  var _a2;
  const text2 = source.replace(/\r\n/g, "\n"), excerpt = selectedText.replace(/\r\n/g, "\n"), structure = markdownStructure(text2);
  if (!excerpt.trim() || !Number.isInteger(line) || line < 0 || line >= structure.rows.length) throw new Error("\u9009\u6BB5\u6765\u6E90\u4F4D\u7F6E\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u539F\u6587\u540E\u5236\u5361\u3002");
  const offset = structure.rows.slice(0, line).reduce((sum, row) => sum + row.length + 1, 0), at = text2.indexOf(excerpt, offset);
  if (at < offset || at > offset + structure.rows[line].length) throw new Error("\u9009\u6BB5\u4E0E\u6765\u6E90\u5185\u5BB9\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u539F\u6587\u540E\u5236\u5361\u3002");
  const headingPath = ((_a2 = structure.headings.filter((heading) => heading.line <= line).at(-1)) == null ? void 0 : _a2.path) || [];
  return { kind: "selection", line, endLine: line + excerpt.split("\n").length - 1, heading: headingPath.join(" \u203A ") || path.split("/").pop().replace(/\.md$/i, ""), headingPath: [...headingPath], excerpt, fingerprint: fingerprint(excerpt) };
}
function passageSourceRef(passage) {
  var _a2, _b;
  if (passage.sourceRef) return { ...passage.sourceRef, ...passage.sourceRef.headingPath ? { headingPath: [...passage.sourceRef.headingPath] } : {} };
  const excerpt = passage.text.replace(/\r\n/g, "\n"), selection = passage.kind === "selection" || !passage.kind;
  return { kind: selection ? "selection" : "passage", line: passage.line, endLine: selection ? passage.line + excerpt.split("\n").length - 1 : Math.max(passage.line, ((_a2 = passage.endLine) != null ? _a2 : passage.line + excerpt.split("\n").length) - 1), heading: ((_b = passage.headingPath) == null ? void 0 : _b.join(" \u203A ")) || passage.question, excerpt, fingerprint: fingerprint(excerpt), ...selection ? passage.headingPath ? { headingPath: [...passage.headingPath] } : {} : { question: passage.question, passageKind: passage.kind, headingPath: [...passage.headingPath || []] } };
}
function matchesScope(path, tags2, scope, current) {
  if (scope.kind === "all") return true;
  if (scope.kind === "current") return !!current && path === current;
  if (scope.kind === "folder") return scope.value === "/" || !!scope.value && path.startsWith(scope.value.replace(/\/$/, "") + "/");
  const tag = scope.value.replace(/^#/, "").toLocaleLowerCase();
  return !!tag && tags2.some((t) => {
    const normalized = t.replace(/^#/, "").toLocaleLowerCase();
    return normalized === tag || normalized.startsWith(tag + "/");
  });
}
function parseCardBlock(block, path = "", line = 0) {
  var _a2, _b, _c;
  const rows = block.replace(/\r\n/g, "\n").split("\n");
  const id = (_b = (_a2 = rows[0]) == null ? void 0 : _a2.match(/^id: ([A-Za-z0-9_-]{6,100})\s*$/)) == null ? void 0 : _b[1];
  if (!id || ((_c = rows[1]) == null ? void 0 : _c.trim()) !== "\u95EE\u9898\uFF1A") throw new Error("\u5361\u7247\u9700\u5305\u542B\u81EA\u52A8\u751F\u6210\u7684 id\u3001\u95EE\u9898\uFF1A\u548C\u7B54\u6848\uFF1A\u6807\u8BB0");
  const answer = rows.findIndex((x, i) => i > 1 && x.trim() === "\u7B54\u6848\uFF1A");
  if (answer < 0) throw new Error("\u7F3A\u5C11\u5355\u72EC\u4E00\u884C\u7684\u300C\u7B54\u6848\uFF1A\u300D");
  const front = rows.slice(2, answer).join("\n").trim(), back = rows.slice(answer + 1).join("\n").trim();
  if (!front || !back) throw new Error("\u95EE\u9898\u548C\u7B54\u6848\u90FD\u9700\u8981\u586B\u5199");
  if (front.length > 4e3 || back.length > 5e4) throw new Error("\u95EE\u9898\u9650 4,000 \u5B57\u7B26\uFF1B\u7B54\u6848\u9650 50,000 \u5B57\u7B26");
  return { id: "note:" + id, front, back, sourcePath: path, line };
}
function parseNote(text2, path, tags2 = []) {
  var _a2;
  const name = path.split("/").pop().replace(/\.md$/i, ""), note = { sourceFingerprint: fingerprint(text2.replace(/\r\n/g, "\n")), path, name, tags: [...new Set(tags2)], passages: [], cards: [], warnings: [], knowledge: [], outline: [] };
  const structure = markdownStructure(text2), { rows, start, headings, fences } = structure;
  note.warnings.push(...structure.warnings);
  const omitted = /* @__PURE__ */ new Set();
  for (const fence of fences) {
    if (fence.info !== "practice-card" || fence.nested) continue;
    for (let i = fence.line; i < fence.endLine; i++) omitted.add(i);
    if (!fence.closed) note.warnings.push(`\u7B2C ${fence.line + 1} \u884C\u5361\u7247\u672A\u95ED\u5408`);
    else try {
      note.cards.push(parseCardBlock(rows.slice(fence.line + 1, fence.endLine - 1).map((row) => row.replace(new RegExp("^ {0," + fence.indent + "}"), "")).join("\n"), path, fence.line));
    } catch (e) {
      note.warnings.push(`\u7B2C ${fence.line + 1} \u884C\uFF1A${e.message}`);
    }
  }
  const add = (begin, end, question, kind, headingPath = [], headingLine) => {
    while (begin < end && (!rows[begin].trim() || omitted.has(begin))) begin++;
    while (end > begin && (!rows[end - 1].trim() || omitted.has(end - 1))) end--;
    const content = rows.slice(begin, end).filter((_, i) => !omitted.has(begin + i));
    while (content.length && !content[0].trim()) content.shift();
    while (content.length && !content.at(-1).trim()) content.pop();
    const value = content.join("\n");
    if (!value.trim()) return;
    note.passages.push({ text: value, question, line: begin, endLine: end, headingLine, headingPath, kind, path });
  };
  if (!headings.length) add(start, rows.length, `${name} \xB7 \u5168\u6587\uFF08\u65E0\u6807\u9898\uFF09`, "document");
  else {
    add(start, headings[0].line, `${name} \xB7 \u7B14\u8BB0\u5F15\u8A00\uFF08\u9996\u4E2A\u6807\u9898\u524D\uFF09`, "preamble");
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i], next = headings[i + 1], intro = !!next && next.level > heading.level;
      add(heading.contentLine, (_a2 = next == null ? void 0 : next.line) != null ? _a2 : rows.length, heading.title + (intro ? " \xB7 \u5F15\u8A00\uFF08\u5B50\u6807\u9898\u524D\uFF09" : ""), intro ? "intro" : "section", heading.path, heading.line);
    }
  }
  note.outline = parseOutline(text2, path, note.warnings);
  const extracted = extractKnowledge(text2, path);
  note.knowledge = extracted.points;
  note.warnings.push(...extracted.warnings.filter((w) => !(w === "\u8DF3\u8FC7\u672A\u95ED\u5408\u4EE3\u7801\u5757" && note.warnings.some((x) => x.includes("\u5361\u7247\u672A\u95ED\u5408")))));
  return note;
}
function studyCards(notes, saved, scope, current, now) {
  const found = /* @__PURE__ */ new Map();
  for (const n of notes) for (const c of n.cards) found.set(c.id, [...found.get(c.id) || [], c]);
  const warnings = [], cards = [], byPath = new Map(notes.map((n) => [n.path, n]));
  for (const [id, occurrences] of found) {
    if (occurrences.length !== 1) {
      warnings.push(`\u5361\u7247 ID \u91CD\u590D\uFF0C\u5DF2\u8DF3\u8FC7\uFF1A${occurrences.map((c2) => c2.sourcePath + ":" + (c2.line + 1)).join("\u3001")}\u3002\u8BF7\u68C0\u67E5\u539F\u6709\u6807\u8BB0\u7F16\u53F7\uFF1B\u65B0\u5361\u7247\u8BF7\u4F7F\u7528\u72EC\u7ACB\u300C\u65B0\u5EFA\u5361\u7247\u300D\u3002`);
      continue;
    }
    const c = occurrences[0], n = byPath.get(c.sourcePath);
    if (!matchesScope(c.sourcePath, n.tags, scope, current)) continue;
    const previous = saved.find((x) => x.id === id);
    cards.push(previous ? { ...previous, front: c.front, back: c.back, sourcePath: c.sourcePath } : createCard(c.front, c.back, c.sourcePath, now, id));
  }
  for (const c of saved) {
    if (c.id.startsWith("note:") && found.has(c.id)) continue;
    if (c.id.startsWith("note:")) warnings.push("\u6765\u6E90\u6807\u8BB0\u7F3A\u5931\uFF0C\u4FDD\u7559\u6700\u540E\u5FEB\u7167\u4E0E\u8FDB\u5EA6\uFF1A" + c.sourcePath);
    const n = byPath.get(c.sourcePath);
    if (matchesScope(c.sourcePath, (n == null ? void 0 : n.tags) || [], scope, current)) cards.push({ ...c });
  }
  return { cards, warnings };
}

// src/source-location.ts
function resolvePassageSourceLine(text2, passage) {
  if (!passage.path) throw new Error("\u8FD9\u6BB5\u7EC3\u4E60\u6CA1\u6709\u6765\u6E90\u7B14\u8BB0\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7B14\u8BB0\u6216\u9009\u6BB5\u3002");
  const source = normalize(text2), target = normalize(passage.text);
  if (passage.sourceRef) return resolveReference(source, passage.path, passage.sourceRef);
  const missing = "\u6765\u6E90\u5185\u5BB9\u5DF2\u53D8\u5316\u6216\u5DF2\u79FB\u9664\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u672C\u8282\u3002\u8BF7\u5237\u65B0\u5185\u5BB9\u540E\u91CD\u65B0\u9009\u62E9\u7EC3\u4E60\u3002";
  const ambiguous = "\u6765\u6E90\u4E2D\u6709\u591A\u5904\u76F8\u540C\u7684\u6BB5\u843D\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u3002\u8BF7\u6253\u5F00\u7B14\u8BB0\u6838\u5BF9\u540E\u91CD\u65B0\u9009\u62E9\u7EC3\u4E60\u3002";
  if (!target.trim()) throw new Error(missing);
  if (passage.kind === "selection" || !passage.kind && !passage.headingPath && !Number.isInteger(passage.headingLine)) {
    return uniqueLine(literalOccurrences(source, target, false).map((match) => match.line), missing, ambiguous);
  }
  const candidates = parseNote(source, passage.path).passages.filter((current) => normalize(current.text) === target && current.question === passage.question && (!passage.kind || current.kind === passage.kind) && (!passage.headingPath || samePath(current.headingPath || [], passage.headingPath)));
  return uniqueLine(candidates.map((current) => current.line), missing, ambiguous);
}
function resolveCardSourceLine(text2, card) {
  if (!card.sourcePath) throw new Error("\u8FD9\u5F20\u5361\u7247\u6CA1\u6709\u6765\u6E90\u7B14\u8BB0\uFF0C\u8BF7\u5148\u5728\u5361\u7247\u4E2D\u586B\u5199\u6765\u6E90\u8DEF\u5F84\u3002");
  const source = normalize(text2);
  if (card.id.startsWith("note:")) {
    const cards = parseNote(source, card.sourcePath).cards.filter((current2) => current2.id === card.id);
    if (!cards.length) throw new Error("\u6765\u6E90\u4E2D\u7684\u5361\u7247\u6807\u8BB0\u5DF2\u79FB\u9664\u6216\u683C\u5F0F\u5DF2\u53D8\u5316\u3002\u8BF7\u6253\u5F00\u7B14\u8BB0\u68C0\u67E5 practice-card \u6807\u8BB0\uFF0C\u518D\u5237\u65B0\u5361\u7247\u3002");
    if (cards.length !== 1) throw new Error("\u6765\u6E90\u4E2D\u6709\u91CD\u590D\u7684\u5361\u7247 ID\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u3002\u8BF7\u4E3A\u7B14\u8BB0\u5361\u7247\u4FDD\u7559\u72EC\u7ACB\u7F16\u53F7\uFF0C\u518D\u5237\u65B0\u5361\u7247\u3002");
    const current = cards[0];
    if (normalize(current.front) !== normalize(card.front) || normalize(current.back) !== normalize(card.back)) throw new Error("\u6765\u6E90\u4E2D\u7684\u95EE\u9898\u6216\u7B54\u6848\u5DF2\u53D8\u5316\u3002\u8BF7\u5237\u65B0\u5361\u7247\u540E\u91CD\u65B0\u6253\u5F00\u6765\u6E90\u3002");
    return current.line;
  }
  if (card.sourceRef) return resolveReference(source, card.sourcePath, card.sourceRef);
  throw new Error("\u8FD9\u5F20\u5361\u7247\u672A\u4FDD\u5B58\u72EC\u7ACB\u7684\u539F\u6587\u6765\u6E90\u4FE1\u606F\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u3002\u8BF7\u6253\u5F00\u6765\u6E90\u7B14\u8BB0\u6838\u5BF9\uFF0C\u6216\u91CD\u65B0\u4ECE\u5BF9\u5E94\u539F\u6587\u4FDD\u5B58\u5361\u7247\uFF1B\u73B0\u6709\u7B54\u6848\u4E0E\u5B66\u4E60\u8FDB\u5EA6\u4ECD\u4FDD\u7559\u3002");
}
function resolveReference(source, path, ref) {
  var _a2;
  const missing = "\u4FDD\u5B58\u65F6\u7684\u539F\u6587\u6216\u6807\u9898\u5DF2\u53D8\u5316\u3001\u79FB\u9664\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u3002\u8BF7\u5728\u6765\u6E90\u7B14\u8BB0\u4E2D\u6838\u5BF9\u540E\u91CD\u65B0\u4FDD\u5B58\u5361\u7247\u3002";
  const ambiguous = "\u6765\u6E90\u4E2D\u6709\u591A\u5904\u76F8\u540C\u7684\u539F\u6587\u548C\u6807\u9898\uFF0C\u65E0\u6CD5\u51C6\u786E\u5B9A\u4F4D\u3002\u8BF7\u6838\u5BF9\u5BF9\u5E94\u6BB5\u843D\u540E\u91CD\u65B0\u4FDD\u5B58\u5361\u7247\u3002";
  if (ref.kind === "passage") {
    if (!ref.question || !ref.passageKind || !ref.headingPath) throw new Error(missing);
    return resolvePassageSourceLine(source, { path, text: ref.excerpt, question: ref.question, line: ref.line, endLine: ref.endLine + 1, kind: ref.passageKind, headingPath: [...ref.headingPath] });
  }
  if (ref.kind === "selection") {
    const excerpt2 = normalize(ref.excerpt);
    if (!excerpt2.trim()) throw new Error(missing);
    const structure2 = markdownStructure(source);
    const candidates2 = literalOccurrences(source, excerpt2, false).filter((match) => {
      var _a3;
      return !ref.headingPath || samePath(((_a3 = structure2.headings.filter((heading) => heading.line <= match.line).at(-1)) == null ? void 0 : _a3.path) || [], ref.headingPath);
    });
    return uniqueLine(candidates2.map((match) => match.line), missing, ambiguous);
  }
  const excerpt = normalize(ref.excerpt).trim();
  if (!excerpt) throw new Error(missing);
  const structure = markdownStructure(source);
  const candidates = literalOccurrences(source, excerpt, true).filter((match) => visibleEvidence(structure, match) && (!ref.heading || headingAliases(structure, path, match.line).has(ref.heading)));
  const saved = candidates.find((match) => match.line === ref.line && match.endLine === ref.endLine && structure.rows.slice(ref.line, ref.endLine + 1).join("\n").trim() === excerpt);
  const line = uniqueLine(candidates.map((match) => match.line), missing, ambiguous);
  return (_a2 = saved == null ? void 0 : saved.line) != null ? _a2 : line;
}
function normalize(text2) {
  return text2.replace(/\r\n/g, "\n");
}
function samePath(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function uniqueLine(lines, missing, ambiguous) {
  if (!lines.length) throw new Error(missing);
  if (lines.length !== 1) throw new Error(ambiguous);
  return lines[0];
}
function literalOccurrences(source, value, wholeLines) {
  if (!value.trim()) return [];
  const matches = [];
  let from = 0, line = 0, countedTo = 0;
  while (from <= source.length) {
    const at = source.indexOf(value, from);
    if (at < 0) break;
    for (let i = countedTo; i < at; i++) if (source[i] === "\n") line++;
    countedTo = at;
    const end = at + value.length, startOfLine = source.lastIndexOf("\n", at - 1) + 1, nextNewline = source.indexOf("\n", end), endOfLine = nextNewline < 0 ? source.length : nextNewline;
    if (!wholeLines || !source.slice(startOfLine, at).trim() && !source.slice(end, endOfLine).trim()) {
      matches.push({ line, endLine: line + value.split("\n").length - 1 });
    }
    from = at + 1;
  }
  return matches;
}
function visibleEvidence(structure, match) {
  if (match.line < structure.start) return false;
  for (let line = match.line; line <= match.endLine; line++) {
    const visible = structure.visibleRows[line];
    if (visible === void 0 || visible !== structure.rows[line]) return false;
  }
  return true;
}
function headingAliases(structure, path, line) {
  var _a2, _b, _c, _d;
  const heading = structure.headings.filter((h) => h.contentLine <= line).at(-1);
  const name = path.split("/").pop().replace(/\.md$/i, "");
  const declared = structure.start ? (_a2 = structure.rows.slice(1, structure.start - 1).find((row) => /^title:\s*[^|>]/.test(row))) == null ? void 0 : _a2.replace(/^title:\s*/, "").replace(/^["']|["']$/g, "") : void 0;
  const aliases = /* @__PURE__ */ new Set();
  const addTrail = (trail, start) => {
    let label2 = "";
    const caption2 = /^(?:图解步骤\s*\d+|图\s*\d+(?:[.－-]\d+)*(?:[：:\s].*)?|(?:Python|Java|C\+\+|C|JavaScript|TypeScript|Go|Rust|Swift|Kotlin|Dart|C#)?\s*(?:参考实现|源码|代码文件)[：:].*|[\w.-]+\.(?:py|js|ts|java|cpp|c|go|rs))$/i;
    for (let i = start; i <= line; i++) {
      const row = structure.visibleRows[i];
      if (row === void 0) continue;
      const example = row.match(/^\s*\*\*(例[一二三四五六七八九十0-9]+[：:][^*]{1,60})\*\*/);
      if (example) label2 = plainText(example[1]);
      const strong = row.match(/^\s*\*\*([^*\n]{1,80})\*\*\s*$/);
      if (strong && !/[。！!]|\.\s|\.$/.test(strong[1]) && !caption2.test(plainText(strong[1]))) label2 = plainText(strong[1]);
    }
    if (label2) trail.push(label2);
    if (!trail.length) aliases.add(declared || name);
    else {
      aliases.add(trail.join(" \u203A "));
      aliases.add(trail.at(-1));
    }
  };
  addTrail((heading == null ? void 0 : heading.path.map(plainText)) || [], (_b = heading == null ? void 0 : heading.contentLine) != null ? _b : structure.start);
  const extracted = [];
  for (const current of structure.headings) {
    if (current.contentLine > line) break;
    const row = structure.rows[current.line], atx = row.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/);
    if (!atx || row.includes("<!--")) continue;
    while (extracted.length && extracted.at(-1).level >= atx[1].length) extracted.pop();
    extracted.push({ level: atx[1].length, text: plainText(atx[2]), contentLine: current.contentLine });
  }
  addTrail(extracted.map((h) => h.text), (_d = (_c = extracted.at(-1)) == null ? void 0 : _c.contentLine) != null ? _d : structure.start);
  return aliases;
}

// src/interval.ts
function intervalLabel(dueAt, now) {
  const minutes = Math.max(1, Math.round((dueAt - now) / 6e4));
  if (minutes < 60) return `${minutes} \u5206\u949F`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} \u5C0F\u65F6`;
  return `${Math.round(minutes / 1440)} \u5929`;
}

// src/study-health.ts
function studyStats(cards, now) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return { active: cards.filter((c) => !c.suspended).length, new: cards.filter((c) => !c.suspended && c.reviews === 0).length, reviewed: cards.filter((c) => c.reviews > 0).length, paused: cards.filter((c) => c.suspended).length, today: cards.filter((c) => c.lastReviewedAt !== null && c.lastReviewedAt >= midnight.getTime() && c.lastReviewedAt <= now).length, due: cards.filter((c) => !c.suspended && c.dueAt <= now).length, nextWeek: cards.filter((c) => !c.suspended && c.dueAt > now && c.dueAt <= now + 7 * DAY_MS).length };
}
function locateEvidence(text2, excerpt) {
  const normalized = text2.replace(/\r\n/g, "\n"), index = normalized.indexOf(excerpt);
  return index < 0 ? { status: "changed", line: 0 } : { status: "present", line: normalized.slice(0, index).split("\n").length - 1 };
}

// src/cloze.ts
function protectedSpans(text2) {
  const spans = [];
  let offset = 0, fence = "", size = 0, begin = 0;
  for (const row of text2.split("\n")) {
    const f = row.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence && f) {
      fence = f[1][0];
      size = f[1].length;
      begin = offset;
    } else if (fence && f && f[1][0] === fence && f[1].length >= size && !f[2].trim()) {
      spans.push([begin, offset + row.length]);
      fence = "";
    }
    offset += row.length + 1;
  }
  if (fence) spans.push([begin, text2.length]);
  const patterns = [/(`+)[\s\S]*?\1/g, /\$\$[\s\S]*?\$\$/g, /(?<!\\)\$(?:\\.|[^$\n])+?(?<!\\)\$/g, /\\\([\s\S]*?\\\)/g, /\\\[[\s\S]*?\\\]/g, /<!--(?:[\s\S]*?-->|[\s\S]*$)/g];
  for (const pattern of patterns) for (const match of text2.matchAll(pattern)) spans.push([match.index, match.index + match[0].length]);
  return spans;
}
function keywordSuggestions(text2) {
  const spans = protectedSpans(text2), terms = [];
  for (const m of text2.matchAll(/\*\*([^*\n]{1,60})\*\*/g)) {
    if (!spans.some(([a, b]) => m.index < b && m.index + m[0].length > a) && !/[。！？.!?：:]/.test(m[1])) terms.push(m[1].trim());
  }
  return [...new Set(terms)].slice(0, 6);
}
function makeCloze(text2, keyword, heading = "\u5173\u952E\u8BCD\u56DE\u5FC6") {
  const term = keyword.trim();
  if (!term || term.length > 80 || /\n/.test(term)) throw new Error("\u8BF7\u8F93\u5165 1 \u81F3 80 \u5B57\u7B26\u7684\u5355\u884C\u5173\u952E\u8BCD");
  const positions = [];
  let i = 0;
  while ((i = text2.indexOf(term, i)) >= 0) {
    positions.push(i);
    i += term.length;
  }
  if (!positions.length) throw new Error("\u539F\u6587\u4E2D\u6CA1\u6709\u5B8C\u5168\u76F8\u540C\u7684\u5173\u952E\u8BCD\uFF0C\u8BF7\u76F4\u63A5\u590D\u5236\u539F\u6587\u5B57\u8BCD");
  const spans = protectedSpans(text2);
  if (positions.some((i2) => spans.some(([a, b]) => i2 < b && i2 + term.length > a))) throw new Error("\u5173\u952E\u8BCD\u51FA\u73B0\u5728\u4EE3\u7801\u3001\u516C\u5F0F\u6216\u6CE8\u91CA\u4E2D\uFF0C\u8BF7\u9009\u62E9\u666E\u901A\u6B63\u6587\u91CC\u7684\u5173\u952E\u8BCD");
  if (positions.length > 12) throw new Error("\u5173\u952E\u8BCD\u51FA\u73B0\u8D85\u8FC7 12 \u6B21\uFF0C\u8303\u56F4\u8FC7\u5BBD\uFF1B\u8BF7\u9009\u62E9\u66F4\u5177\u4F53\u7684\u8BCD");
  let masked = text2;
  for (const at of [...positions].reverse()) masked = masked.slice(0, at) + "\uFF3B\u2026\uFF3D" + masked.slice(at + term.length);
  const safeHeading = heading.split(term).join("\uFF3B\u2026\uFF3D");
  const front = `${safeHeading} \xB7 \u8865\u5168\u5173\u952E\u8BCD

${masked}`;
  if (front.length > 4e3) throw new Error("\u6316\u7A7A\u95EE\u9898\u8FC7\u957F\uFF0C\u8BF7\u9009\u62E9\u8F83\u77ED\u7684\u6BB5\u843D");
  return { front, back: `\u5173\u952E\u8BCD\uFF1A${term}

\u539F\u6587\uFF1A${text2}`, matches: positions.length };
}

// src/catalog.ts
function excluded(path, entries) {
  return entries.some((raw) => {
    const value = raw.trim().replace(/^\/+|\/+$/g, "");
    return !!value && (path === value || path.startsWith(value + "/"));
  });
}
function parseExclusions(value) {
  return [...new Set(value.split("\n").map((x) => x.trim().replace(/^\/+|\/+$/g, "")).filter((x) => x && !x.split("/").some((p) => p === "." || p === "..")))];
}
function paginate(items, page, size = 24) {
  const pages = Math.max(1, Math.ceil(items.length / size)), current = Math.max(0, Math.min(Number.isFinite(page) ? Math.floor(page) : 0, pages - 1));
  return { items: items.slice(current * size, (current + 1) * size), page: current, pages, total: items.length };
}
function matchesQuery(values, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), haystack = values.join("\n").toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}
function noteTags(native, frontmatter) {
  const result = [...native];
  const legacy = frontmatter == null ? void 0 : frontmatter.tag;
  const values = typeof legacy === "string" ? legacy.split(/[,，]/) : Array.isArray(legacy) ? legacy : [];
  for (const value of values) if (typeof value === "string") {
    const tag = value.trim().replace(/^#+/, "");
    if (tag && tag.length <= 200 && !/[\r\n]/.test(tag)) result.push("#" + tag);
  }
  return [...new Set(result)].sort();
}

// src/study-view.ts
var import_obsidian3 = require("obsidian");
var STUDY_VIEW = "passage-practice-study";
var ratingLabels = { again: "\u5FD8\u4E86", hard: "\u56F0\u96BE", good: "\u8BB0\u4F4F\u4E86", easy: "\u8F7B\u677E" };
var date = (n) => new Date(n).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
var StudyView = class extends import_obsidian3.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    __publicField(this, "previews", new MarkdownPreviewScope(this.app));
    __publicField(this, "renderedScreen", "");
    __publicField(this, "clockTimer");
    __publicField(this, "relearn", false);
    __publicField(this, "visibilityObserver", null);
    __publicField(this, "selectedDeck", "");
    __publicField(this, "deckName", "");
    __publicField(this, "reviewOrder", "sequential");
    __publicField(this, "mode", "passage");
    __publicField(this, "screen", "home");
    __publicField(this, "studyScope", { kind: "current", value: "" });
    __publicField(this, "notes", []);
    __publicField(this, "scanWarnings", []);
    __publicField(this, "loading", false);
    __publicField(this, "scanId", 0);
    __publicField(this, "closed", false);
    __publicField(this, "busy", false);
    __publicField(this, "message", "");
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "indexedFiles", []);
    __publicField(this, "scanProgress", { done: 0, total: 0, reads: 0, cached: 0, milliseconds: 0 });
    __publicField(this, "session", null);
    __publicField(this, "passage", null);
    __publicField(this, "passageSaved", false);
    __publicField(this, "compare", true);
    __publicField(this, "passageQueue", []);
    __publicField(this, "passagePosition", 0);
    __publicField(this, "passageDrafts", /* @__PURE__ */ new Map());
    __publicField(this, "retryAgain", false);
    __publicField(this, "againCandidates", /* @__PURE__ */ new Set());
    __publicField(this, "repeatPass", false);
    __publicField(this, "deckDeleteConfirm", "");
    __publicField(this, "configOpen", false);
    __publicField(this, "outline", null);
    __publicField(this, "outlineQueue", []);
    __publicField(this, "outlinePosition", 0);
    __publicField(this, "outlineRevealed", 0);
    __publicField(this, "outlineRecall", "");
    __publicField(this, "outlineQuery", "");
    __publicField(this, "outlinePage", 0);
    __publicField(this, "outlineHistory", []);
    __publicField(this, "queue", []);
    __publicField(this, "current");
    __publicField(this, "revealed", false);
    __publicField(this, "recall", "");
    __publicField(this, "reviewed", 0);
    __publicField(this, "sessionTotal", 0);
    __publicField(this, "undo");
    __publicField(this, "draft", { front: "", back: "", sourcePath: "" });
    __publicField(this, "editCard");
    __publicField(this, "insert", false);
    __publicField(this, "returnScreen", "home");
    __publicField(this, "query", "");
    __publicField(this, "backupText", "");
    __publicField(this, "previewedBackupText", "");
    __publicField(this, "importPlan", null);
    __publicField(this, "cardStatus", "all");
    __publicField(this, "cardType", "all");
    __publicField(this, "cardSource", "");
    __publicField(this, "selectedCards", /* @__PURE__ */ new Map());
    __publicField(this, "bulkReview", null);
    __publicField(this, "selectedCandidates", /* @__PURE__ */ new Map());
    __publicField(this, "batch", []);
    __publicField(this, "candidateEditing", false);
    __publicField(this, "clozeTerm", "");
    __publicField(this, "candidate", null);
    __publicField(this, "knowledgeQuery", "");
    __publicField(this, "knowledgePage", 0);
    __publicField(this, "knowledgeKind", "structured");
    __publicField(this, "hideSaved", true);
    __publicField(this, "passageQuery", "");
    __publicField(this, "passagePage", 0);
    __publicField(this, "cardPage", 0);
    __publicField(this, "excludedPaths", []);
    __publicField(this, "knowledgeMemo", null);
  }
  getViewType() {
    return STUDY_VIEW;
  }
  getDisplayText() {
    return "\u56DE\u60F3\u7EC3\u4E60";
  }
  getIcon() {
    return "book-open-check";
  }
  async onOpen() {
    this.contentEl.addClass("pp-study");
    this.visibilityObserver = new MutationObserver(() => this.visibilityChanged());
    this.visibilityObserver.observe(this.app.workspace.containerEl, { attributes: true, subtree: true, attributeFilter: ["class", "style"] });
    this.addAction("refresh-cw", "\u5237\u65B0\u5B66\u4E60\u5185\u5BB9", () => {
      if (!this.busy) void this.refresh(true);
    });
    await this.refresh();
    this.clockTimer = window.setInterval(() => {
      var _a2;
      if (this.screen === "home" && this.mode === "cards" && !this.configOpen && !this.busy && !this.loading && !(this.contentEl.contains(document.activeElement) && ((_a2 = document.activeElement) == null ? void 0 : _a2.matches("input,textarea,select,[contenteditable=true]")))) this.render();
    }, 3e4);
  }
  async onClose() {
    var _a2;
    window.clearInterval(this.clockTimer);
    (_a2 = this.visibilityObserver) == null ? void 0 : _a2.disconnect();
    this.visibilityObserver = null;
    this.closed = true;
    this.passageDrafts.clear();
    this.previews.reset();
    this.scanId++;
    this.host.shield(false);
    this.contentEl.empty();
  }
  getState() {
    return { reviewOrder: this.reviewOrder, mode: this.mode, selectedDeck: this.selectedDeck, scope: this.studyScope, excludedPaths: this.excludedPaths, knowledgeKind: this.knowledgeKind, hideSaved: this.hideSaved };
  }
  async setState(state, result) {
    if ((state == null ? void 0 : state.reviewOrder) === "random" || (state == null ? void 0 : state.reviewOrder) === "sequential") this.reviewOrder = state.reviewOrder;
    if (typeof (state == null ? void 0 : state.selectedDeck) === "string") this.selectedDeck = state.selectedDeck;
    if ((state == null ? void 0 : state.mode) === "cards" || (state == null ? void 0 : state.mode) === "passage" || (state == null ? void 0 : state.mode) === "outline" || (state == null ? void 0 : state.mode) === "knowledge") this.mode = state.mode;
    if ((state == null ? void 0 : state.scope) && ["all", "current", "folder", "tag"].includes(state.scope.kind) && typeof state.scope.value === "string") this.studyScope = state.scope;
    if (Array.isArray(state == null ? void 0 : state.excludedPaths)) this.excludedPaths = parseExclusions(state.excludedPaths.filter((x) => typeof x === "string").join("\n"));
    if (["all", "structured", "definition", "list", "explanation"].includes(state == null ? void 0 : state.knowledgeKind)) this.knowledgeKind = state.knowledgeKind;
    if (typeof (state == null ? void 0 : state.hideSaved) === "boolean") this.hideSaved = state.hideSaved;
    await super.setState(state, result);
    if (!this.closed) void this.refresh();
  }
  remember() {
    this.app.workspace.requestSaveLayout();
  }
  visible() {
    var _a2;
    const parents = /* @__PURE__ */ new Set();
    let parent = (_a2 = this.leaf) == null ? void 0 : _a2.parent;
    while (parent && !parents.has(parent)) {
      parents.add(parent);
      if (parent === this.app.workspace.rightSplit && this.app.workspace.rightSplit.collapsed || parent === this.app.workspace.leftSplit && this.app.workspace.leftSplit.collapsed) return false;
      parent = parent.parent;
    }
    const rect = this.containerEl.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  visibilityChanged() {
    if (this.closed || this.visible()) return;
    this.host.shield(false);
    if (this.busy || !["passage", "outline", "card"].includes(this.screen)) return;
    this.screen = "home";
    this.current = void 0;
    this.session = null;
    this.passageDrafts.clear();
    this.message = "\u79BB\u5F00\u5B66\u4E60\u4FA7\u680F\uFF0C\u672A\u8BC4\u5206\u7684\u7EC3\u4E60\u4E0E\u4E34\u65F6\u8349\u7A3F\u5DF2\u7ED3\u675F";
    this.render();
  }
  notifyChanged() {
    if (this.screen === "home" || this.screen === "library") void this.refresh();
  }
  async refresh(force = false, retry = 0) {
    const token2 = ++this.scanId, started = performance.now();
    this.loading = true;
    this.scanProgress = { done: 0, total: 0, reads: 0, cached: 0, milliseconds: 0 };
    const notes = [], warnings = [], files = this.app.vault.getMarkdownFiles().filter((file) => !excluded(file.path, ["Passage Practice", "Passage Practice backups", ...this.excludedPaths]));
    this.scanProgress.total = files.length;
    const initialFiles = files.map((file) => ({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size }));
    if (this.screen === "home") this.render();
    let changedDuringRead = false, lastPaint = started;
    for (let i = 0; i < files.length; i += 12) {
      await Promise.all(files.slice(i, i + 12).map(async (file) => {
        const path = file.path, mtime = file.stat.mtime, size = file.stat.size;
        try {
          if (size > MAX_NOTE_BYTES) {
            warnings.push(`\u8D85\u8FC7 2 MiB\uFF0C\u5DF2\u8DF3\u8FC7\uFF1A${path}`);
            return;
          }
          const metadata = this.app.metadataCache.getFileCache(file) || {}, tags2 = noteTags((0, import_obsidian3.getAllTags)(metadata) || [], metadata.frontmatter), key = JSON.stringify(tags2), cached = this.cache.get(path);
          let note;
          if (!force && cached && cached.mtime === mtime && cached.size === size && cached.tags === key && cached.version === EXTRACTOR_VERSION) {
            note = cached.note;
            this.scanProgress.cached++;
          } else {
            const text2 = await (force ? this.app.vault.read(file) : this.app.vault.cachedRead(file));
            if (token2 !== this.scanId || this.closed) return;
            if (file.path !== path || file.stat.mtime !== mtime || file.stat.size !== size) {
              changedDuringRead = true;
              return;
            }
            note = parseNote(text2, path, tags2);
            this.cache.set(path, { mtime, size, tags: key, version: EXTRACTOR_VERSION, note });
            this.scanProgress.reads++;
          }
          notes.push(note);
        } catch (e) {
          if (token2 === this.scanId) warnings.push(`\u65E0\u6CD5\u8BFB\u53D6\uFF1A${path}`);
        }
      }));
      if (token2 !== this.scanId || this.closed) return false;
      this.scanProgress.done = Math.min(i + 12, files.length);
      if (performance.now() - lastPaint > 80 && this.screen === "home") {
        this.render();
        lastPaint = performance.now();
      }
      if (i + 12 < files.length) await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (token2 !== this.scanId || this.closed) return false;
    }
    const latest = this.app.vault.getMarkdownFiles().filter((file) => !excluded(file.path, ["Passage Practice", "Passage Practice backups", ...this.excludedPaths])), latestSet = new Set(latest);
    if (latest.length !== initialFiles.length || initialFiles.some((item) => !latestSet.has(item.file) || item.file.path !== item.path || item.file.stat.mtime !== item.mtime || item.file.stat.size !== item.size)) changedDuringRead = true;
    if (changedDuringRead) {
      if (retry < 2) return this.refresh(false, retry + 1);
      this.loading = false;
      this.message = "\u7B14\u8BB0\u4ECD\u5728\u8FDE\u7EED\u53D8\u5316\uFF0C\u5DF2\u6682\u505C\u626B\u63CF\u3002\u8BF7\u7A0D\u540E\u5237\u65B0\uFF1B\u672C\u6B21\u7ED3\u679C\u672A\u66FF\u6362\u4E0A\u6B21\u5B8C\u6574\u7D22\u5F15\u3002";
      if (this.screen === "home") this.render();
      return false;
    }
    const existing = new Set(files.map((f) => f.path));
    for (const path of this.cache.keys()) if (!existing.has(path)) this.cache.delete(path);
    this.indexedFiles = initialFiles;
    this.notes = notes.sort((a, b) => a.path.localeCompare(b.path, "zh-CN", { numeric: true }) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    this.scanWarnings = warnings;
    this.loading = false;
    this.scanProgress.milliseconds = Math.round(performance.now() - started);
    const valid = new Set(this.notes.flatMap((n) => n.knowledge || []).map((p) => p.id));
    for (const id of this.selectedCandidates.keys()) if (!valid.has(id)) this.selectedCandidates.delete(id);
    if (this.screen === "home" || this.screen === "library") this.render();
    return true;
  }
  cancelScan() {
    this.scanId++;
    this.loading = false;
    this.message = "\u626B\u63CF\u5DF2\u53D6\u6D88\uFF0C\u4FDD\u7559\u4E0A\u6B21\u5B8C\u6574\u7ED3\u679C\uFF1B\u70B9\u51FB\u5237\u65B0\u53EF\u7EE7\u7EED";
    this.render();
  }
  cards() {
    var _a2, _b, _c;
    const result = studyCards(this.notes, (((_a2 = this.host.store) == null ? void 0 : _a2.cards) || []).filter((c) => !excluded(c.sourcePath, this.excludedPaths)), this.studyScope, this.host.currentPath, Date.now());
    const deck = (_c = (_b = this.host.store) == null ? void 0 : _b.decks) == null ? void 0 : _c.find((d) => d.id === this.selectedDeck);
    if (this.selectedDeck && !deck) this.selectedDeck = "";
    if (deck) {
      const members = new Set(deck.cardIds);
      result.cards = result.cards.filter((c) => members.has(c.id));
    }
    return result;
  }
  selectedNotes() {
    return this.notes.filter((n) => matchesScope(n.path, n.tags, this.studyScope, this.host.currentPath));
  }
  button(el, text2, action, primary = false) {
    const b = el.createEl("button", { text: text2, cls: primary ? "pp-primary" : "pp-secondary" });
    b.type = "button";
    b.disabled = this.busy;
    b.addEventListener("click", () => {
      if (!this.busy && !this.closed) action();
    });
    return b;
  }
  field(el, label2, value, set, placeholder = "", max = 5e4) {
    const w = el.createEl("label", { cls: "pp-field" });
    w.createEl("span", { text: label2 });
    const input = w.createEl("textarea", { attr: { "aria-label": label2, placeholder, maxlength: String(max) } });
    input.value = value;
    input.disabled = this.busy;
    input.addEventListener("input", () => set(input.value));
    return input;
  }
  async run(action, success) {
    var _a2;
    if (this.busy || this.closed) return;
    this.busy = true;
    this.message = "";
    this.contentEl.setAttribute("aria-busy", "true");
    this.contentEl.querySelectorAll("button,textarea,select,input").forEach((e) => e.disabled = true);
    try {
      await action();
      if (!this.closed) {
        this.busy = false;
        success();
      }
    } catch (e) {
      this.message = e instanceof Error ? e.message : "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5";
      if (this.closed) new import_obsidian3.Notice("\u4FDD\u5B58\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u56DE\u60F3\u7EC3\u4E60\u68C0\u67E5\u3002");
    } finally {
      this.busy = false;
      if (!this.closed) {
        this.visibilityChanged();
        this.render();
        if (this.screen === "card" && !this.revealed || this.screen === "passage" && ((_a2 = this.session) == null ? void 0 : _a2.stage) === "recall" || this.screen === "outline") this.focusRecall();
      }
    }
  }
  home() {
    this.passageDrafts.clear();
    this.passageQueue = [];
    this.againCandidates.clear();
    this.selectedCards.clear();
    this.bulkReview = null;
    this.screen = "home";
    this.current = void 0;
    this.session = null;
    this.host.shield(false);
    this.message = "";
    void this.refresh();
  }
  render() {
    if (this.closed) return;
    this.previews.reset();
    const root = this.contentEl;
    if (this.renderedScreen !== this.screen) {
      root.scrollTop = 0;
      this.renderedScreen = this.screen;
    }
    root.empty();
    root.setAttribute("aria-busy", String(this.busy));
    const top = root.createDiv({ cls: "pp-study-heading" });
    const title = top.createDiv();
    title.createEl("span", { text: "\u56DE\u60F3\u7EC3\u4E60", cls: "pp-study-title" });
    title.createEl("span", { text: "\u7559\u4E00\u70B9\u65F6\u95F4\uFF0C\u7ED9\u8BB0\u5FC6", cls: "pp-study-subtitle" });
    if (this.screen === "home") {
      const mode = root.createDiv({ cls: "pp-mode-tabs", attr: { role: "tablist", "aria-label": "\u5B66\u4E60\u6A21\u5F0F" } });
      for (const [key, name, description] of [["passage", "\u6BB5\u843D\u590D\u4E60", "\u6309\u6807\u9898\u56DE\u5FC6\u6574\u8282"], ["outline", "\u5927\u7EB2\u56DE\u5FC6", "\u7236\u8282\u70B9 \u2192 \u5B50\u5206\u652F"], ["cards", "\u95EE\u7B54\u5361\u7247", "\u95EE\u9898\u4E0E\u7B54\u6848"], ["knowledge", "\u77E5\u8BC6\u63D0\u70BC", "\u9884\u89C8\u518D\u5236\u5361"]]) {
        const b = this.button(mode, "", () => {
          if (this.screen !== "home") return;
          this.mode = key;
          this.selectedCandidates.clear();
          this.remember();
          this.render();
        });
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(this.mode === key));
        b.tabIndex = this.mode === key ? 0 : -1;
        b.addEventListener("keydown", (event) => {
          var _a2;
          if (this.screen !== "home" || this.busy || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const keys = ["passage", "outline", "cards", "knowledge"], index = keys.indexOf(this.mode);
          this.mode = event.key === "Home" ? "passage" : event.key === "End" ? "knowledge" : keys[(index + (event.key === "ArrowRight" ? 1 : 3)) % 4];
          this.selectedCandidates.clear();
          this.remember();
          this.render();
          (_a2 = this.contentEl.querySelector("[role=tab][aria-selected=true]")) == null ? void 0 : _a2.focus();
        });
        b.createEl("strong", { text: name });
        b.createEl("span", { text: description });
        if (this.mode === key) b.addClass("is-active");
        b.disabled = this.busy || this.screen !== "home";
      }
    }
    if (this.message) {
      const positive = /^(?:已|卡片已|离开)/.test(this.message);
      root.createEl("p", { text: this.message, cls: positive ? "pp-notice" : "pp-error", attr: { role: positive ? "status" : "alert" } });
    }
    if (this.screen === "home") {
      if (this.mode === "cards" && !this.loading) this.renderCardPrimary(root);
      const config = root.createEl("details", { cls: "pp-home-config" });
      config.open = this.configOpen;
      config.addEventListener("toggle", () => {
        if (config.isConnected) this.configOpen = config.open;
      });
      config.createEl("summary", { text: "\u5B66\u4E60\u8303\u56F4\u3001\u5361\u7EC4\u4E0E\u987A\u5E8F \xB7 " + (this.studyScope.kind === "current" ? "\u5F53\u524D\u7B14\u8BB0" : this.studyScope.kind === "all" ? "\u6574\u4E2A\u77E5\u8BC6\u5E93" : this.studyScope.value) });
      this.renderScope(config);
      if (this.mode === "cards" || this.mode === "knowledge") this.renderDecks(config);
      if (["passage", "outline", "cards"].includes(this.mode)) this.renderReviewOptions(config);
      this.renderHome(root);
    } else {
      const bar = root.createDiv({ cls: "pp-session-bar" });
      bar.createEl("span", { text: this.screen === "passage" ? "\u6BB5\u843D\u590D\u4E60" : this.screen === "outline" ? "\u5927\u7EB2\u56DE\u5FC6" : this.screen === "card" ? "\u95EE\u7B54\u5361\u7247" : this.screen === "library" ? "\u5361\u7247\u7BA1\u7406" : "\u660E\u786E\u95EE\u9898\u4E0E\u7B54\u6848" });
      this.button(bar, this.screen === "edit" ? "\u53D6\u6D88\u7F16\u8F91" : "\u8FD4\u56DE\u5B66\u4E60", () => {
        if (this.screen === "edit") this.cancelEdit();
        else this.home();
      });
      if (this.screen === "passage") this.renderPassage(root);
      else if (this.screen === "outline") this.renderOutline(root);
      else if (this.screen === "card") this.renderCard(root);
      else if (this.screen === "edit") this.renderEditor(root);
      else if (this.screen === "candidate") this.renderCandidate(root);
      else if (this.screen === "batch") this.renderBatch(root);
      else if (this.screen === "backup") this.renderBackup(root);
      else this.renderLibrary(root);
    }
  }
  renderReviewOptions(root) {
    const box = root.createDiv({ cls: "pp-scope pp-review-options" });
    box.createEl("label", { text: "\u590D\u4E60\u987A\u5E8F" });
    const order = box.createEl("select", { attr: { "aria-label": "\u590D\u4E60\u987A\u5E8F" } });
    order.createEl("option", { text: "\u987A\u5E8F\u590D\u4E60", attr: { value: "sequential" } });
    order.createEl("option", { text: "\u4E71\u5E8F\u590D\u4E60", attr: { value: "random" } });
    order.value = this.reviewOrder;
    order.addEventListener("change", () => {
      this.reviewOrder = order.value;
      this.remember();
      this.render();
    });
    if (this.mode === "cards") {
      const row = box.createEl("label", { cls: "pp-relearn" }), check = row.createEl("input", { attr: { type: "checkbox", "aria-label": "\u672C\u8F6E\u518D\u7EC3\u5FD8\u4E86\u7684\u5361\u7247" } });
      check.checked = this.retryAgain;
      check.addEventListener("change", () => this.retryAgain = check.checked);
      row.createEl("span", { text: "\u672C\u8F6E\u7ED3\u675F\u540E\uFF0C\u518D\u7EC3\u4E00\u6B21\u300C\u5FD8\u4E86\u300D\u4E14\u5DF2\u5230\u671F\u7684\u5361\u7247" });
      box.createEl("p", { text: "\u6BCF\u5F20\u6700\u591A\u8FFD\u52A0\u4E00\u6B21\uFF0C\u4E0D\u63D0\u524D\u7EC3\u672A\u5230\u671F\u5361\u7247\uFF1B\u7B97\u6CD5\u5728 Obsidian \u8BBE\u7F6E \u2192 Passage Practice\uFF08\u56DE\u60F3\u7EC3\u4E60\uFF09\u4E2D\u9009\u62E9\u3002", cls: "pp-footnote" });
    }
    box.createEl("p", { text: this.mode === "cards" ? "\u53EA\u590D\u4E60\u5DF2\u5230\u671F\u5361\u7247\uFF1B\u4E71\u5E8F\u4F1A\u6253\u4E71\u672C\u8F6E\u987A\u5E8F\u3002" : this.reviewOrder === "random" ? "\u672C\u8F6E\u968F\u673A\u6392\u5217\uFF0C\u4E0A\u4E00\u8282\u4E0E\u4E0B\u4E00\u8282\u4FDD\u6301\u540C\u4E00\u987A\u5E8F\u3002" : "\u6309\u7B14\u8BB0\u3001\u5C0F\u8282\u7684\u539F\u6709\u987A\u5E8F\u590D\u4E60\u3002", cls: "pp-footnote" });
  }
  renderDecks(root) {
    const store = this.host.store;
    if (!store) return;
    const box = root.createDiv({ cls: "pp-scope" });
    box.createEl("label", { text: "\u5361\u7EC4", attr: { for: "pp-deck" } });
    const select = box.createEl("select", { attr: { id: "pp-deck", "aria-label": "\u9009\u62E9\u5361\u7EC4" } });
    select.createEl("option", { text: "\u5168\u90E8\u5361\u7EC4", attr: { value: "" } });
    for (const deck2 of store.decks || []) select.createEl("option", { text: `${deck2.name} \xB7 ${deck2.cardIds.length} \u5F20`, attr: { value: deck2.id } });
    select.value = this.selectedDeck;
    select.addEventListener("change", () => {
      this.selectedDeck = select.value;
      this.selectedCards.clear();
      this.remember();
      this.render();
    });
    const controls = box.createEl("details");
    controls.createEl("summary", { text: "\u65B0\u5EFA\u5361\u7EC4" });
    const name = controls.createEl("input", { attr: { "aria-label": "\u65B0\u5361\u7EC4\u540D\u79F0", maxlength: "100", placeholder: "\u4F8B\u5982\uFF1A\u6570\u636E\u7ED3\u6784" } });
    name.value = this.deckName;
    name.addEventListener("input", () => this.deckName = name.value);
    this.button(controls, "\u521B\u5EFA\u7A7A\u5361\u7EC4", () => void this.run(async () => {
      const deck2 = await store.createDeck(this.deckName);
      this.selectedDeck = deck2.id;
      this.deckName = "";
    }, () => {
      this.remember();
      this.message = "\u5DF2\u521B\u5EFA\u5361\u7EC4";
    }));
    box.createEl("p", { text: "\u65B0\u5361\u7247\u4FDD\u5B58\u5230\u6240\u9009\u5361\u7EC4\uFF1B\u9009\u300C\u5168\u90E8\u5361\u7EC4\u300D\u65F6\u4FDD\u5B58\u5230\u9ED8\u8BA4\u5361\u7EC4\u3002", cls: "pp-footnote" });
    const deck = store.decks.find((d) => d.id === this.selectedDeck);
    if (deck) {
      const manage = box.createEl("details");
      manage.createEl("summary", { text: "\u7BA1\u7406\u5F53\u524D\u5361\u7EC4" });
      const rename = manage.createEl("input", { attr: { "aria-label": "\u5361\u7EC4\u65B0\u540D\u79F0", maxlength: "100" } });
      rename.value = deck.name;
      this.button(manage, "\u4FDD\u5B58\u5361\u7EC4\u540D\u79F0", () => void this.run(() => store.renameDeck(deck.id, deck.revision, rename.value), () => {
        this.message = "\u5DF2\u91CD\u547D\u540D\u5361\u7EC4";
      }));
      if (deck.id !== DEFAULT_DECK) {
        const del = this.button(manage, "\u5220\u9664\u7A7A\u5361\u7EC4", () => {
          this.deckDeleteConfirm = deck.id;
          this.render();
        });
        del.disabled = !!deck.cardIds.length || this.busy;
        if (deck.cardIds.length) manage.createEl("p", { text: "\u53EA\u80FD\u5220\u9664\u7A7A\u5361\u7EC4\uFF0C\u53EF\u5728\u7BA1\u7406\u5361\u7247\u4E2D\u79FB\u51FA\u6210\u5458\uFF1B\u5361\u7247\u548C\u8BC4\u5206\u4E0D\u4F1A\u5220\u9664\u3002", cls: "pp-footnote" });
      }
      if (this.deckDeleteConfirm === deck.id) {
        manage.open = true;
        const confirm = manage.createDiv({ cls: "pp-bulk-confirm" });
        confirm.createEl("p", { text: `\u786E\u8BA4\u5220\u9664\u7A7A\u5361\u7EC4\u300C${deck.name}\u300D\uFF1F\u53EA\u5220\u9664\u5361\u7EC4\u5B9A\u4E49\uFF0C\u5361\u7247\u548C\u8BC4\u5206\u4FDD\u7559\u3002` });
        this.button(confirm, "\u53D6\u6D88\u5220\u9664\u5361\u7EC4", () => {
          this.deckDeleteConfirm = "";
          this.render();
        });
        this.button(confirm, "\u786E\u8BA4\u5220\u9664\u7A7A\u5361\u7EC4", () => void this.run(() => store.deleteEmptyDeck(deck.id, deck.revision), () => {
          this.selectedDeck = "";
          this.deckDeleteConfirm = "";
          this.remember();
          this.message = "\u5DF2\u5220\u9664\u7A7A\u5361\u7EC4\uFF0C\u5361\u7247\u4E0E\u8BC4\u5206\u4FDD\u7559";
        }));
      }
    }
  }
  renderScope(root) {
    const box = root.createDiv({ cls: "pp-scope" });
    box.createEl("label", { text: "\u5B66\u4E60\u8303\u56F4", attr: { for: "pp-scope-kind" } });
    const select = box.createEl("select", { attr: { id: "pp-scope-kind", "aria-label": "\u5B66\u4E60\u8303\u56F4" } });
    for (const [k, v] of [["current", "\u5F53\u524D\u7B14\u8BB0"], ["folder", "\u6309\u6587\u4EF6\u5939"], ["tag", "\u6309\u6807\u7B7E"], ["all", "\u6574\u4E2A\u77E5\u8BC6\u5E93"]]) select.createEl("option", { text: v, attr: { value: k } });
    select.value = this.studyScope.kind;
    select.addEventListener("change", () => {
      this.selectedCandidates.clear();
      this.knowledgePage = 0;
      this.passagePage = 0;
      this.studyScope = { kind: select.value, value: "" };
      if (this.studyScope.kind === "folder") this.studyScope.value = "/";
      if (this.studyScope.kind === "tag") this.studyScope.value = this.tags()[0] || "";
      this.remember();
      this.render();
    });
    if (this.studyScope.kind === "folder" || this.studyScope.kind === "tag") {
      const sub = box.createEl("select", { attr: { "aria-label": this.studyScope.kind === "folder" ? "\u9009\u62E9\u6587\u4EF6\u5939" : "\u9009\u62E9\u6807\u7B7E" } });
      const values = this.studyScope.kind === "folder" ? this.folders() : this.tags();
      if (!values.includes(this.studyScope.value)) values.unshift(this.studyScope.value);
      for (const value of values) sub.createEl("option", { text: value ? value === "/" ? "\u6839\u76EE\u5F55\uFF08\u5305\u542B\u5168\u90E8\u5B50\u6587\u4EF6\u5939\uFF09" : (this.studyScope.kind === "tag" ? "#" : "") + value : "\u6682\u65E0\u6807\u7B7E", attr: { value } });
      sub.value = this.studyScope.value;
      sub.addEventListener("change", () => {
        this.selectedCandidates.clear();
        this.knowledgePage = 0;
        this.passagePage = 0;
        this.studyScope.value = sub.value;
        this.remember();
        this.render();
      });
      box.createEl("p", { text: this.studyScope.kind === "folder" ? "\u5305\u542B\u9009\u4E2D\u6587\u4EF6\u5939\u4E0B\u7684\u6240\u6709\u5B50\u6587\u4EF6\u5939" : "\u540C\u65F6\u5305\u542B\u5B50\u6807\u7B7E\uFF0C\u4F8B\u5982 #\u5B66\u4E60 \u4E5F\u5305\u542B #\u5B66\u4E60/\u7B97\u6CD5", cls: "pp-footnote" });
    } else box.createEl("p", { text: this.studyScope.kind === "current" ? this.host.currentPath || "\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0\uFF0C\u6216\u9009\u62E9\u5176\u4ED6\u8303\u56F4" : "\u5305\u542B\u6240\u6709 Markdown \u7B14\u8BB0\u548C\u672C\u5730\u5FEB\u7167\u5361\u7247", cls: "pp-source-path" });
    const options = root.createEl("details", { cls: "pp-options" });
    options.createEl("summary", { text: this.excludedPaths.length ? `\u7D22\u5F15\u9009\u9879 \xB7 \u5DF2\u6392\u9664 ${this.excludedPaths.length} \u5904` : "\u7D22\u5F15\u9009\u9879" });
    const input = this.field(options, "\u4E0D\u53C2\u4E0E\u5B66\u4E60\u7684\u6587\u4EF6\u5939\u6216\u6587\u4EF6\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09", this.excludedPaths.join("\n"), () => {
    }, "\u4F8B\u5982\uFF1A\u6A21\u677F\n\u5F52\u6863\n\u67D0\u7BC7\u7B14\u8BB0.md", 4e3);
    this.button(options, "\u5E94\u7528\u6392\u9664\u8303\u56F4", () => {
      this.excludedPaths = parseExclusions(input.value);
      this.selectedCandidates.clear();
      this.remember();
      void this.refresh();
    });
    options.createEl("p", { text: "\u6309\u5B8C\u6574\u8DEF\u5F84\u8FB9\u754C\u6392\u9664\uFF0C\u5305\u542B\u5B50\u6587\u4EF6\u5939\uFF1B\u6392\u9664\u5185\u5BB9\u4E0D\u4F1A\u8BFB\u53D6\u6216\u8FDB\u5165\u63D0\u70BC\uFF0C\u4E0D\u5220\u9664\u4EFB\u4F55\u6587\u4EF6\u3002", cls: "pp-footnote" });
  }
  folders() {
    var _a2, _b;
    const set = /* @__PURE__ */ new Set(["/"]);
    for (const item of ((_b = (_a2 = this.app.vault).getAllLoadedFiles) == null ? void 0 : _b.call(_a2)) || []) if ("children" in item && item.path !== "/") set.add(item.path);
    for (const n of this.notes) {
      const parts = n.path.split("/");
      parts.pop();
      while (parts.length) {
        set.add(parts.join("/"));
        parts.pop();
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }
  tags() {
    const set = /* @__PURE__ */ new Set();
    for (const n of this.notes) for (const t of n.tags) {
      const parts = t.replace(/^#/, "").split("/");
      while (parts.length) {
        set.add(parts.join("/"));
        parts.pop();
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }
  renderCardPrimary(root) {
    if (!this.host.store) return;
    const cards = this.cards().cards, due = dueCards(cards, Date.now()), row = root.createDiv({ cls: "pp-primary-actions" });
    const start = this.button(row, due.length ? `\u5F00\u59CB\u590D\u4E60 ${due.length} \u5F20` : "\u6682\u65E0\u5230\u671F\u5361\u7247", () => this.startCards(due), true);
    start.disabled = !due.length || this.busy;
    this.button(row, "\u65B0\u5EFA\u5361\u7247", () => this.openEditor(), true);
    this.renderScopeCount(root, cards.length);
  }
  renderScopeCount(root, count) {
    var _a2;
    const deck = (_a2 = this.host.store) == null ? void 0 : _a2.decks.find((d) => d.id === this.selectedDeck);
    if (!deck) {
      root.createEl("p", { text: `\u672C\u8303\u56F4 ${count} \u5F20 \xB7 \u5168\u90E8\u5361\u7EC4`, cls: "pp-footnote" });
      return;
    }
    root.createEl("p", { text: `${deck.name}\uFF1A\u672C\u8303\u56F4 ${count} \u5F20 / \u5168\u7EC4 ${deck.cardIds.length} \u5F20 \xB7 \u540C\u65F6\u5E94\u7528\u5B66\u4E60\u8303\u56F4\u4E0E\u5361\u7EC4`, cls: "pp-footnote" });
    if (this.studyScope.kind !== "all") this.button(root, "\u67E5\u770B\u5168\u7EC4\uFF08\u5207\u5230\u6574\u4E2A\u77E5\u8BC6\u5E93\uFF09", () => {
      this.studyScope = { kind: "all", value: "" };
      this.selectedCards.clear();
      this.remember();
      this.render();
    });
  }
  renderHome(root) {
    if (this.loading) {
      root.createEl("p", { text: `\u6B63\u5728\u8BFB\u53D6 ${this.scanProgress.done} / ${this.scanProgress.total} \u7BC7\u7B14\u8BB0\u2026`, cls: "pp-muted", attr: { role: "status" } });
      const progress = root.createEl("progress", { attr: { max: String(this.scanProgress.total || 1), value: String(this.scanProgress.done), "aria-label": "\u7B14\u8BB0\u626B\u63CF\u8FDB\u5EA6" } });
      progress.addClass("pp-scan-progress");
      this.button(root, "\u53D6\u6D88\u626B\u63CF", () => this.cancelScan());
      return;
    }
    if (this.host.locationError) root.createEl("p", { text: this.host.locationError, cls: "pp-footnote" });
    if (this.mode === "passage" || this.mode === "outline") this.renderResume(root, this.mode);
    if (this.mode === "knowledge") {
      this.renderKnowledge(root);
      return;
    }
    if (this.mode === "outline") {
      this.renderOutlineHome(root);
      return;
    }
    const notes = this.selectedNotes(), passages = notes.flatMap((n) => n.passages), deck = this.cards(), due = dueCards(deck.cards, Date.now());
    const counts = root.createDiv({ cls: "pp-study-stats" });
    for (const [count, label2] of this.mode === "passage" ? [[notes.length, "\u7BC7\u7B14\u8BB0"], [passages.length, "\u4E2A\u5C0F\u8282"]] : [[deck.cards.length, "\u5F20\u5361\u7247"], [due.length, "\u5F20\u5230\u671F"]]) {
      const tile = counts.createDiv();
      tile.createEl("strong", { text: String(count) });
      tile.createEl("span", { text: label2 });
    }
    const intro = root.createDiv({ cls: "pp-mode-intro" });
    intro.createEl("h2", { text: this.mode === "passage" ? "\u4E00\u4E2A\u6807\u9898\uFF0C\u56DE\u5FC6\u5B8C\u6574\u4E00\u8282" : "\u4E00\u4E2A\u95EE\u9898\uFF0C\u4E00\u5F20\u5361\u7247" });
    intro.createEl("p", { text: this.mode === "passage" ? this.reviewOrder === "random" ? "\u6253\u4E71\u719F\u6089\u7684\u987A\u5E8F\uFF0C\u9010\u8282\u56DE\u5FC6\u5E76\u6838\u5BF9\u3002" : "\u6309\u7B14\u8BB0\u987A\u5E8F\u9010\u8282\u56DE\u5FC6\uFF0C\u518D\u63ED\u6653\u539F\u6587\u6838\u5BF9\u3002" : "\u5148\u56DE\u5FC6\uFF0C\u518D\u63ED\u6653\u7B54\u6848\uFF0C\u9009\u62E9\u4E0B\u6B21\u590D\u4E60\u65F6\u95F4\u3002" });
    if (this.mode === "passage") {
      const row = root.createDiv({ cls: "pp-actions" });
      const pool = passages.filter((p) => matchesQuery([p.question, p.text, p.path], this.passageQuery));
      if (pool.length) this.button(row, this.reviewOrder === "random" ? "\u5F00\u59CB\u4E71\u5E8F\u590D\u4E60" : "\u5F00\u59CB\u987A\u5E8F\u590D\u4E60", () => {
        const pool2 = passages.filter((p) => matchesQuery([p.question, p.text, p.path], this.passageQuery));
        if (!pool2.length) {
          this.message = "\u6CA1\u6709\u5339\u914D\u7684\u5C0F\u8282\uFF0C\u8BF7\u8C03\u6574\u641C\u7D22";
          this.render();
          return;
        }
        this.passageQueue = sessionOrder(pool2, this.reviewOrder);
        this.passagePosition = 0;
        this.beginPassage(this.passageQueue[0]);
      }, true);
      const selected = this.button(row, "\u7EC3\u4E60\u7F16\u8F91\u5668\u9009\u6BB5", () => this.selection(), true);
      selected.disabled = !this.currentEditor() || this.busy;
      this.button(row, "\u5237\u65B0\u5185\u5BB9", () => void this.refresh(true));
      if (!passages.length) root.createEl("p", { text: "\u8FD9\u4E2A\u8303\u56F4\u8FD8\u6CA1\u6709\u53EF\u7EC3\u4E60\u7684\u5C0F\u8282\u3002\u53EF\u5207\u6362\u8303\u56F4\uFF0C\u6216\u6253\u5F00\u7B14\u8BB0\u9009\u62E9\u6587\u5B57\u3002\u5C5E\u6027\u548C\u72EC\u7ACB\u5361\u7247\u6807\u8BB0\u4E0D\u4F5C\u4E3A\u5C0F\u8282\u7B54\u6848\u3002", cls: "pp-empty" });
      else {
        root.createEl("h3", { text: "\u9009\u62E9\u4E00\u4E2A\u6807\u9898\u5F00\u59CB", cls: "pp-list-heading" });
        const search = root.createEl("input", { cls: "pp-search", attr: { type: "search", "aria-label": "\u641C\u7D22\u5C0F\u8282", placeholder: "\u641C\u7D22\u6B63\u6587\u3001\u6807\u9898\u6216\u8DEF\u5F84" } });
        search.value = this.passageQuery;
        const list = root.createDiv({ cls: "pp-passage-list" });
        const draw = () => {
          var _a2;
          list.empty();
          const filtered = passages.filter((p) => matchesQuery([p.question, p.text, p.path], this.passageQuery)), page = paginate(filtered, this.passagePage);
          this.passagePage = page.page;
          for (const p of page.items) {
            const b = this.button(list, "", () => {
              const session = sessionFrom(filtered, p, this.reviewOrder);
              this.passageQueue = session.queue;
              this.passagePosition = session.position;
              this.beginPassage(p);
            });
            b.addClass("pp-passage-choice");
            b.createEl("span", { text: p.question, cls: "pp-item-title" });
            b.createEl("span", { text: ((_a2 = p.headingPath) == null ? void 0 : _a2.join(" \u203A ")) || "\u65E0\u6807\u9898 \xB7 \u5168\u6587\u590D\u4E60", cls: "pp-item-preview" });
            b.createEl("span", { text: `${p.text.length.toLocaleString()} \u5B57\u7B26`, cls: "pp-footnote" });
            b.createEl("span", { text: p.path, cls: "pp-source-path" });
          }
          this.pager(list, page, (change) => {
            this.passagePage = change;
            draw();
          });
        };
        search.addEventListener("input", () => {
          this.passageQuery = search.value;
          this.passagePage = 0;
          draw();
        });
        draw();
      }
    } else {
      if (!this.host.store) {
        root.createEl("p", { text: this.host.storageError, cls: "pp-error" });
        return;
      }
      const statistics = studyStats(deck.cards, Date.now()), detail = root.createEl("details", { cls: "pp-study-overview" });
      detail.createEl("summary", { text: `\u4ECA\u5929\u590D\u4E60\u8FC7 ${statistics.today} \u5F20 \xB7 \u6682\u505C ${statistics.paused} \u5F20` });
      detail.createEl("p", { text: `\u5C1A\u672A\u590D\u4E60 ${statistics.new} \u5F20 \xB7 \u6709\u8FC7\u590D\u4E60 ${statistics.reviewed} \u5F20 \xB7 \u672A\u6765 7 \u5929\u5230\u671F ${statistics.nextWeek} \u5F20` });
      detail.createEl("p", { text: "\u6839\u636E\u4F60\u7684\u8BC4\u5206\u5B89\u6392\u4E0B\u6B21\u590D\u4E60\u3002\u4ECA\u5929\u7684\u6570\u91CF\u6309\u6700\u8FD1\u4E00\u6B21\u8BC4\u5206\u7EDF\u8BA1\u3002" });
      const row = root.createDiv({ cls: "pp-actions" });
      this.button(row, `\u7BA1\u7406\u5361\u7247 \xB7 ${deck.cards.length}`, () => {
        this.screen = "library";
        this.render();
      });
      this.button(row, "\u5907\u4EFD\u4E0E\u6062\u590D", () => {
        this.screen = "backup";
        this.importPlan = null;
        this.backupText = "";
        this.render();
      });
      const next = deck.cards.filter((c) => !c.suspended && c.dueAt > Date.now()).sort((a, b) => a.dueAt - b.dueAt)[0];
      if (next) root.createEl("p", { text: `\u4E0B\u6B21\u5230\u671F ${date(next.dueAt)} \xB7 \u81EA\u52A8\u66F4\u65B0\u5230\u671F\u6570\u91CF`, cls: "pp-footnote" });
      if (!deck.cards.length) root.createEl("p", { text: "\u8FD9\u4E2A\u8303\u56F4\u6CA1\u6709\u5361\u7247\u3002\u53EF\u4EE5\u65B0\u5EFA\u5361\u7247\uFF0C\u6216\u4ECE\u77E5\u8BC6\u63D0\u70BC\u4E2D\u5236\u5361\u3002", cls: "pp-empty" });
      const create = root.createEl("details", { cls: "pp-create-box" });
      create.createEl("summary", { text: "\u600E\u6837\u521B\u5EFA\u4E00\u5F20\u5361\u7247\uFF1F" });
      const sample = create.createDiv({ cls: "pp-qa-example" });
      sample.createEl("span", { text: "\u6B63\u9762 \xB7 \u95EE\u9898", cls: "pp-face-label" });
      sample.createEl("p", { text: "\u6808\u7684\u51FA\u5165\u987A\u5E8F\u662F\u4EC0\u4E48\uFF1F" });
      sample.createEl("span", { text: "\u80CC\u9762 \xB7 \u7B54\u6848", cls: "pp-face-label" });
      sample.createEl("p", { text: "\u540E\u8FDB\u5148\u51FA\uFF08LIFO\uFF09\u3002\u6700\u540E\u5165\u6808\u7684\u5143\u7D20\u6700\u5148\u51FA\u6808\u3002" });
    }
    const warnings = [...this.scanWarnings, ...notes.flatMap((n) => n.warnings.map((w) => n.path + " \xB7 " + w)), ...deck.warnings];
    if (warnings.length) {
      const detail = root.createEl("details", { cls: "pp-warnings" });
      detail.createEl("summary", { text: `${warnings.length} \u6761\u5185\u5BB9\u63D0\u793A` });
      for (const w of warnings) detail.createEl("p", { text: w });
    }
  }
  knowledge() {
    var _a2;
    const key = JSON.stringify([this.studyScope, this.host.currentPath]);
    if (((_a2 = this.knowledgeMemo) == null ? void 0 : _a2.notes) === this.notes && this.knowledgeMemo.key === key) return this.knowledgeMemo.result;
    const result = uniqueKnowledge(this.selectedNotes().flatMap((n) => n.knowledge || []));
    this.knowledgeMemo = { notes: this.notes, key, result };
    return result;
  }
  renderKnowledge(root) {
    if (this.scanWarnings.length) {
      const detail = root.createEl("details", { cls: "pp-warnings" });
      detail.createEl("summary", { text: `${this.scanWarnings.length} \u6761\u626B\u63CF\u63D0\u793A` });
      for (const warning of this.scanWarnings) detail.createEl("p", { text: warning });
    }
    const found = this.knowledge(), visiblePool = found.points.filter((p) => this.knowledgeKind === "all" || this.knowledgeKind === "structured" && p.confidence === "structured" || p.kind === this.knowledgeKind), intro = root.createDiv({ cls: "pp-mode-intro" });
    intro.createEl("h2", { text: "\u4ECE\u7B14\u8BB0\u91CC\uFF0C\u53D1\u73B0\u503C\u5F97\u8BB0\u4F4F\u7684\u5185\u5BB9" });
    intro.createEl("p", { text: "\u5148\u770B\u5B9A\u4E49\u4E0E\u8981\u70B9\uFF0C\u6838\u5BF9\u539F\u6587\u540E\u5236\u6210\u5361\u7247\u3002" });
    const count = root.createDiv({ cls: "pp-study-stats" });
    for (const [n, label2] of [[this.selectedNotes().length, "\u7BC7\u7B14\u8BB0"], [visiblePool.length, "\u6761\u5019\u9009"]]) {
      const item = count.createDiv();
      item.createEl("strong", { text: String(n) });
      item.createEl("span", { text: label2 });
    }
    if (found.duplicates) root.createEl("p", { text: `\u5DF2\u6298\u53E0 ${found.duplicates} \u6761\u5185\u5BB9\u76F8\u540C\u7684\u5019\u9009\uFF0C\u4FDD\u7559\u7B2C\u4E00\u5904\u6765\u6E90`, cls: "pp-footnote" });
    const search = root.createEl("input", { cls: "pp-search", attr: { type: "search", "aria-label": "\u641C\u7D22\u77E5\u8BC6\u5019\u9009", placeholder: "\u641C\u7D22\u5185\u5BB9\u3001\u6807\u9898\u6216\u6765\u6E90" } });
    search.value = this.knowledgeQuery;
    const filters = root.createDiv({ cls: "pp-knowledge-filters" });
    const kind = filters.createEl("select", { attr: { "aria-label": "\u5019\u9009\u7C7B\u578B" } });
    for (const [value, label2] of [["structured", "\u5B9A\u4E49\u4E0E\u8981\u70B9"], ["all", "\u5168\u90E8\uFF08\u542B\u539F\u6587\u6BB5\u843D\uFF09"], ["definition", "\u5B9A\u4E49"], ["list", "\u8981\u70B9\u5217\u8868"], ["explanation", "\u539F\u6587\u6BB5\u843D"]]) kind.createEl("option", { text: label2, attr: { value } });
    kind.value = this.knowledgeKind;
    const hide = filters.createEl("label");
    const toggle = hide.createEl("input", { attr: { type: "checkbox" } });
    toggle.checked = this.hideSaved;
    hide.createEl("span", { text: "\u9690\u85CF\u5DF2\u5236\u5361" });
    const actions = root.createDiv({ cls: "pp-actions" });
    const review = this.button(actions, `\u6838\u5BF9\u6240\u9009 ${this.selectedCandidates.size} \u6761`, () => {
      this.batch = [...this.selectedCandidates.values()];
      this.screen = "batch";
      this.render();
    }, true);
    review.disabled = !this.selectedCandidates.size;
    this.button(actions, "\u6E05\u7A7A\u9009\u62E9", () => {
      this.selectedCandidates.clear();
      this.render();
    });
    const list = root.createDiv({ cls: "pp-knowledge-list" });
    let previewCleanups = [];
    const draw = () => {
      var _a2;
      for (const cleanup of previewCleanups) cleanup();
      previewCleanups = [];
      list.empty();
      const saved = new Set((((_a2 = this.host.store) == null ? void 0 : _a2.cards) || []).filter((c) => c.sourceRef).map((c) => c.sourcePath + "\n" + c.sourceRef.fingerprint));
      const points = found.points.filter((p) => matchesQuery([p.question, p.excerpt, p.path], this.knowledgeQuery) && (this.knowledgeKind === "all" || this.knowledgeKind === "structured" && p.confidence === "structured" || p.kind === this.knowledgeKind) && (!this.hideSaved || !saved.has(p.path + "\n" + p.fingerprint))).sort((a, b) => ({ definition: 0, list: 1, explanation: 2 })[a.kind] - { definition: 0, list: 1, explanation: 2 }[b.kind]);
      const page = paginate(points, this.knowledgePage);
      this.knowledgePage = page.page;
      list.createEl("p", { text: `${points.length} \u6761\u5339\u914D\u5019\u9009 \xB7 ${this.hideSaved ? "\u9690\u85CF\u5DF2\u4FDD\u5B58\u5185\u5BB9" : "\u5305\u542B\u5DF2\u4FDD\u5B58\u5185\u5BB9"}`, cls: "pp-footnote" });
      for (const p of page.items) {
        const item = list.createDiv({ cls: "pp-knowledge-item" });
        const choose = item.createEl("label", { cls: "pp-select-candidate" });
        const check = choose.createEl("input", { attr: { type: "checkbox", "aria-label": "\u9009\u62E9\u5019\u9009\uFF1A" + p.question } });
        check.checked = this.selectedCandidates.has(p.id);
        choose.createEl("span", { text: "\u9009\u62E9" });
        check.addEventListener("change", () => {
          if (check.checked) {
            if (this.selectedCandidates.size >= 100) {
              check.checked = false;
              new import_obsidian3.Notice("\u6BCF\u6279\u6700\u591A 100 \u6761\uFF0C\u8BF7\u5148\u6838\u5BF9\u4FDD\u5B58");
              return;
            }
            this.selectedCandidates.set(p.id, p);
          } else this.selectedCandidates.delete(p.id);
          review.textContent = `\u6838\u5BF9\u6240\u9009 ${this.selectedCandidates.size} \u6761`;
          review.disabled = !this.selectedCandidates.size;
        });
        item.createEl("span", { text: p.kind === "definition" ? "\u5B9A\u4E49\u5019\u9009 \xB7 \u5F85\u6838\u5BF9" : p.kind === "list" ? "\u8981\u70B9\u5019\u9009 \xB7 \u5F85\u6838\u5BF9" : "\u539F\u6587\u6BB5\u843D \xB7 \u5F85\u5224\u65AD", cls: "pp-candidate-label" });
        const question = item.createDiv({ cls: "pp-candidate-question" });
        previewCleanups.push(this.previews.mount(question, p.question, p.path));
        const answer = item.createDiv({ cls: "pp-item-preview pp-candidate-excerpt" });
        previewCleanups.push(this.previews.mount(answer, p.excerpt, p.path));
        item.createEl("p", { text: `${p.path} \xB7 \u7B2C ${p.line + 1} \u884C`, cls: "pp-source-path" });
        this.button(item, "\u9884\u89C8\u4E0E\u7F16\u8F91", () => {
          this.candidate = p;
          this.candidateEditing = false;
          this.clozeTerm = "";
          this.draft = { front: p.question, back: p.excerpt, sourcePath: p.path };
          this.screen = "candidate";
          this.render();
        });
      }
      this.pager(list, page, (change) => {
        this.knowledgePage = change;
        draw();
      });
      if (!points.length) list.createEl("p", { text: "\u8FD9\u4E2A\u8303\u56F4\u6682\u672A\u627E\u5230\u53EF\u63D0\u70BC\u7684\u5185\u5BB9\u3002\u89C4\u5219\u4F1A\u8DF3\u8FC7\u4EE3\u7801\u3001\u5BFC\u822A\u3001\u8868\u683C\u3001\u56FE\u7247\u548C\u8FC7\u77ED\u6587\u5B57\uFF1B\u53EF\u5207\u6362\u8303\u56F4\uFF0C\u6216\u624B\u52A8\u4ECE\u6BB5\u843D\u5236\u5361\u3002", cls: "pp-empty" });
    };
    search.addEventListener("input", () => {
      this.knowledgeQuery = search.value;
      this.knowledgePage = 0;
      draw();
    });
    kind.addEventListener("change", () => {
      this.knowledgeKind = kind.value;
      this.knowledgePage = 0;
      this.remember();
      this.render();
    });
    toggle.addEventListener("change", () => {
      this.hideSaved = toggle.checked;
      this.knowledgePage = 0;
      this.remember();
      draw();
    });
    draw();
  }
  renderCandidate(root) {
    const p = this.candidate;
    root.createEl("h2", { text: "\u5148\u6838\u5BF9\uFF0C\u518D\u7559\u4E0B", cls: "pp-stage-title" });
    root.createEl("p", { text: p.reason + "\u3002\u8BF7\u7ED3\u5408\u4E0A\u4E0B\u6587\u6838\u5BF9\u3002", cls: "pp-muted" });
    const evidence = root.createDiv({ cls: "pp-source-evidence" });
    evidence.createEl("span", { text: "\u9010\u5B57\u539F\u6587 \xB7 " + (p.headingPath.join(" \u203A ") || p.heading), cls: "pp-face-label" });
    this.previews.mount(evidence, p.excerpt, p.path);
    this.button(evidence, `\u6253\u5F00\u6765\u6E90 \xB7 \u7B2C ${p.line + 1} \u884C`, () => void this.openKnowledgeSource(p));
    const context = evidence.createEl("details", { cls: "pp-context" });
    context.createEl("summary", { text: "\u5C55\u5F00\u9644\u8FD1\u4E0A\u4E0B\u6587" });
    this.previews.mount(context, p.context, p.path);
    context.createEl("span", { text: `\u4ECE\u7B2C ${p.contextLine + 1} \u884C\u5F00\u59CB \xB7 \u5305\u542B\u5019\u9009\u524D\u540E\u6700\u591A\u7EA6 6 \u884C`, cls: "pp-footnote" });
    for (const caveat of p.caveats || []) root.createEl("p", { text: caveat, cls: "pp-caveat" });
    const cloze = root.createEl("details", { cls: "pp-cloze-editor" });
    cloze.createEl("summary", { text: "\u4E5F\u53EF\u4EE5\uFF1A\u628A\u5173\u952E\u8BCD\u6316\u7A7A" });
    cloze.createEl("p", { text: "\u660E\u786E\u9009\u62E9\u5173\u952E\u8BCD\uFF0C\u751F\u6210\u540E\u518D\u6838\u5BF9\u3002\u53EA\u6316\u666E\u901A\u6B63\u6587\uFF1B\u4E0D\u4F1A\u6316\u4EE3\u7801\u6216\u516C\u5F0F\u3002\u91CD\u590D\u51FA\u73B0\u7684\u540C\u8BCD\u5168\u90E8\u906E\u4F4F\u3002", cls: "pp-footnote" });
    const term = cloze.createEl("input", { cls: "pp-search", attr: { type: "text", "aria-label": "\u8981\u6316\u7A7A\u7684\u5173\u952E\u8BCD", placeholder: "\u590D\u5236\u539F\u6587\u4E2D\u7684\u4E00\u4E2A\u5173\u952E\u8BCD", maxlength: "80" } });
    term.value = this.clozeTerm;
    term.addEventListener("input", () => this.clozeTerm = term.value);
    const suggestions = keywordSuggestions(p.excerpt);
    if (suggestions.length) {
      const options = cloze.createDiv({ cls: "pp-actions" });
      for (const word of suggestions) this.button(options, word, () => {
        this.clozeTerm = word;
        term.value = word;
      });
    }
    this.button(cloze, "\u751F\u6210\u6316\u7A7A\u8349\u7A3F", () => {
      try {
        const draft2 = makeCloze(this.draft.back, this.clozeTerm, p.heading);
        this.draft = { front: draft2.front, back: draft2.back, sourcePath: p.path };
        this.message = `\u5DF2\u751F\u6210 ${draft2.matches} \u5904\u6316\u7A7A\uFF0C\u8BF7\u6838\u5BF9\u540E\u4FDD\u5B58`;
        this.render();
      } catch (e) {
        this.message = e.message;
        this.render();
      }
    });
    const draft = root.createDiv({ cls: "pp-candidate-draft" });
    const modes = draft.createDiv({ cls: "pp-actions" });
    this.button(modes, this.candidateEditing ? "\u5207\u6362\u5230 Markdown \u9884\u89C8" : "\u7F16\u8F91 Markdown \u6E90\u7801", () => {
      this.candidateEditing = !this.candidateEditing;
      this.render();
    });
    draft.createEl("p", { text: this.candidateEditing ? "\u7F16\u8F91\u6A21\u5F0F \xB7 \u8F93\u5165 Markdown \u6E90\u7801\uFF0C\u5207\u6362\u9884\u89C8\u6838\u5BF9\u6392\u7248" : "\u9884\u89C8\u6A21\u5F0F \xB7 \u4FDD\u5B58\u5185\u5BB9\u4E0E\u4E0B\u65B9\u9884\u89C8\u4E00\u81F4", cls: "pp-footnote" });
    if (this.candidateEditing) {
      this.field(draft, "\u5019\u9009\u95EE\u9898", this.draft.front, (v) => this.draft.front = v, "\u6539\u6210\u80FD\u72EC\u7ACB\u7406\u89E3\u7684\u95EE\u9898", 4e3);
      this.field(draft, "\u5019\u9009\u7B54\u6848", this.draft.back, (v) => this.draft.back = v, "\u4FDD\u7559\u5FC5\u8981\u4E0A\u4E0B\u6587");
    } else {
      for (const [label2, value] of [["\u5019\u9009\u95EE\u9898", this.draft.front], ["\u5019\u9009\u7B54\u6848", this.draft.back]]) {
        const face = draft.createDiv({ cls: "pp-candidate-face" });
        face.createEl("h3", { text: label2 });
        this.previews.mount(face, value, p.path);
      }
    }
    root.createEl("p", { text: "\u8BF7\u6838\u5BF9\u95EE\u9898\u3001\u7B54\u6848\u548C\u4E0A\u4E0B\u6587\uFF0C\u518D\u786E\u8BA4\u4FDD\u5B58\u3002", cls: "pp-footnote" });
    this.button(root, "\u786E\u8BA4\u4FDD\u5B58\u4E3A\u5361\u7247", () => {
      const d = { ...this.draft };
      void this.run(async () => {
        const current = await this.validateCandidate(p);
        if (!this.host.store) throw new Error(this.host.storageError);
        const outcome = await this.host.store.addMany([{ ...d, sourceRef: this.sourceRef(current.point) }], Date.now(), () => this.assertSources([current]), this.selectedDeck || DEFAULT_DECK);
        if (!outcome.added) throw new Error("\u76F8\u540C\u95EE\u9898\u4E0E\u7B54\u6848\u7684\u5361\u7247\u5DF2\u5B58\u5728\uFF0C\u6CA1\u6709\u91CD\u590D\u4FDD\u5B58\u3002\u8BF7\u8FD4\u56DE\u95EE\u7B54\u5361\u7247\u67E5\u770B\u3002");
      }, () => {
        this.selectedCandidates.delete(p.id);
        const saved = this.host.store.cards.find((c) => c.front === d.front.trim() && c.back === d.back.trim() && c.sourcePath === d.sourcePath);
        if (saved) this.startCards([saved]);
        this.message = "\u5DF2\u4FDD\u5B58 1 \u5F20\u5361\u7247\uFF0C\u5F00\u59CB\u56DE\u5FC6";
      });
    }, true).addClass("pp-wide");
  }
  invalidateBackup() {
    var _a2;
    this.importPlan = null;
    this.previewedBackupText = "";
    (_a2 = this.contentEl.querySelector(".pp-import-preview")) == null ? void 0 : _a2.remove();
  }
  renderBackup(root) {
    var _a2, _b, _c;
    root.createEl("h2", { text: "\u7ED9\u5B66\u4E60\u8FDB\u5EA6\u7559\u4E00\u4EFD\u5907\u4EFD", cls: "pp-stage-title" });
    root.createEl("p", { text: "\u5305\u62EC\u5168\u90E8\u672C\u5730\u5361\u7247\u3001\u5DF2\u8BB0\u5F55\u7684\u6807\u8BB0\u5361\u7247\u8BC4\u5206\u548C\u6765\u6E90\u8BC1\u636E\u3002\u5907\u4EFD\u5305\u542B\u4F60\u7684\u95EE\u9898\u4E0E\u7B54\u6848\uFF0C\u8BF7\u50CF\u7B14\u8BB0\u4E00\u6837\u4FDD\u7BA1\u3002", cls: "pp-muted" });
    this.button(root, "\u5BFC\u51FA JSON \u5230\u672C\u5730\u77E5\u8BC6\u5E93", () => void this.run(async () => {
      const parts = exportBackupParts(this.host.store.data), folder = "Passage Practice backups";
      if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
      const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), paths = [];
      try {
        for (let i = 0; i < parts.length; i++) {
          const suffix = parts.length > 1 ? `-part-${i + 1}-of-${parts.length}` : "";
          let path = `${folder}/progress-${stamp}${suffix}.json`, n = 1;
          while (this.app.vault.getAbstractFileByPath(path)) path = `${folder}/progress-${stamp}-${n++}${suffix}.json`;
          await this.app.vault.create(path, parts[i]);
          paths.push(path);
        }
      } catch (error) {
        throw new Error(`\u5907\u4EFD\u5199\u5165\u4E2D\u65AD\uFF0C\u5DF2\u5199 ${paths.length} / ${parts.length} \u5377\uFF1B\u8FD9\u4E0D\u662F\u5B8C\u6574\u5907\u4EFD\uFF0C\u8BF7\u4FDD\u7559\u6E90\u6570\u636E\u5E76\u91CD\u65B0\u5BFC\u51FA\u3002`);
      }
      this.message = parts.length === 1 ? "\u5DF2\u4FDD\u5B58\u5907\u4EFD\uFF1A" + paths[0] : `\u5DF2\u4FDD\u5B58\u5168\u90E8 ${parts.length} \u5377\u5230 ${folder}\uFF1B\u6062\u590D\u65F6\u8BF7\u9010\u5377\u5BFC\u5165\uFF0C\u7F3A\u4E00\u5377\u5C31\u4E0D\u5B8C\u6574`;
    }, () => {
    }), true);
    root.createEl("h3", { text: "\u6062\u590D\u7F3A\u5931\u7684\u5361\u7247", cls: "pp-list-heading" });
    root.createEl("p", { text: "\u5148\u9884\u89C8\uFF0C\u518D\u786E\u8BA4\u3002\u4EC5\u5408\u5E76\u672C\u5730\u7F3A\u5C11\u7684\u5361\u7247\uFF1B\u540C\u7F16\u53F7\u51B2\u7A81\u548C\u76F8\u540C\u5185\u5BB9\u4FDD\u7559\u672C\u5730\u7248\u672C\uFF0C\u4E0D\u8986\u76D6\u73B0\u6709\u8FDB\u5EA6\u3002", cls: "pp-footnote" });
    const file = root.createEl("input", { attr: { type: "file", accept: ".json,application/json", "aria-label": "\u9009\u62E9\u8FDB\u5EA6\u5907\u4EFD" } });
    file.addEventListener("change", () => {
      var _a3;
      const selected = (_a3 = file.files) == null ? void 0 : _a3[0];
      if (!selected) return;
      this.invalidateBackup();
      if (selected.size > MAX_BACKUP_BYTES) {
        this.message = "\u5907\u4EFD\u8D85\u8FC7 10 MiB";
        this.render();
        return;
      }
      void this.run(async () => {
        this.backupText = await selected.text();
        this.importPlan = planImport(this.host.store.data, parseBackup(this.backupText));
        this.previewedBackupText = this.backupText;
      }, () => {
      });
    });
    this.field(root, "\u6216\u7C98\u8D34 JSON \u5907\u4EFD", this.backupText, (value) => {
      this.backupText = value;
      this.invalidateBackup();
    }, "\u652F\u6301\u5BFC\u51FA\u7684\u5907\u4EFD\u6216\u65E7\u7248\u63D2\u4EF6 data.json", MAX_BACKUP_BYTES);
    this.button(root, "\u9884\u89C8\u5408\u5E76\u7ED3\u679C", () => {
      try {
        this.importPlan = planImport(this.host.store.data, parseBackup(this.backupText));
        this.previewedBackupText = this.backupText;
        this.message = "";
      } catch (e) {
        this.importPlan = null;
        this.message = e.message;
      }
      this.render();
    });
    const plan = this.importPlan;
    if (plan) {
      const summary = root.createDiv({ cls: "pp-import-preview" });
      summary.createEl("h3", { text: "\u5408\u5E76\u9884\u89C8" });
      if (plan.backupPart) summary.createEl("p", { text: `\u5206\u5377 ${plan.backupPart.index} / ${plan.backupPart.total} \xB7 \u8BF7\u5BFC\u5165\u540C\u4E00\u5907\u4EFD\u7684\u5168\u90E8\u5206\u5377\u3002\u91CD\u590D\u5BFC\u5165\u4E0D\u4F1A\u91CD\u590D\u5361\u7247\u3002`, cls: "pp-notice" });
      const memberships = (plan.deckMemberships || []).reduce((n, d) => n + d.cardIds.length, 0);
      if (memberships) summary.createEl("p", { text: `\u6062\u590D ${memberships} \u6761\u7F3A\u5931\u5361\u7EC4\u5173\u8054\uFF0C\u5DF2\u6709\u6210\u5458\u4FDD\u7559` });
      if (plan.savedSchedulingAlgorithm) {
        const label2 = (v) => v === "sm2-osr" ? "Spaced Repetition \xB7 \u6309\u5929" : "FSRS \xB7 \u8BB0\u5FC6\u6A21\u578B";
        summary.createEl("p", { text: `\u5907\u4EFD\u7B97\u6CD5\uFF1A${label2(plan.savedSchedulingAlgorithm)}\uFF1B\u672C\u5730\u7B97\u6CD5\uFF1A${label2(plan.localSchedulingAlgorithm)}` });
        const select = summary.createEl("select", { attr: { "aria-label": "\u6062\u590D\u540E\u7684\u590D\u4E60\u7B97\u6CD5" } });
        select.createEl("option", { text: "\u8BF7\u9009\u62E9\u6062\u590D\u540E\u7684\u7B97\u6CD5", attr: { value: "" } });
        select.createEl("option", { text: "\u4FDD\u7559\u672C\u5730\u7B97\u6CD5", attr: { value: "keep-local" } });
        select.createEl("option", { text: "\u4F7F\u7528\u5907\u4EFD\u7B97\u6CD5", attr: { value: "use-backup" } });
        select.value = plan.algorithmChoice || "";
        select.addEventListener("change", () => {
          this.importPlan = planImport(this.host.store.data, plan.incoming, select.value || void 0);
          this.render();
        });
        summary.createEl("p", { text: "\u53EA\u9009\u62E9\u4EE5\u540E\u8BC4\u5206\u7684\u7B97\u6CD5\uFF1B\u73B0\u6709\u5361\u7247\u5230\u671F\u4E0E\u5386\u53F2\u4E0D\u91CD\u6392\u3002", cls: "pp-footnote" });
      }
      summary.createEl("p", { text: `\u65B0\u589E ${plan.add.length} \u5F20 \xB7 \u5B8C\u5168\u76F8\u540C ${plan.identical} \u5F20 \xB7 \u5185\u5BB9\u91CD\u590D ${plan.duplicates} \u5F20 \xB7 \u7F16\u53F7\u51B2\u7A81 ${plan.conflicts.length} \u5F20 \xB7 \u65B0\u589E\u5361\u7EC4 ${((_a2 = plan.decks) == null ? void 0 : _a2.length) || 0} \u4E2A \xB7 \u5361\u7EC4\u51B2\u7A81 ${((_b = plan.deckConflicts) == null ? void 0 : _b.length) || 0} \u4E2A` });
      if (plan.conflicts.length) summary.createEl("p", { text: "\u51B2\u7A81\u4FDD\u7559\u672C\u5730\u7248\u672C\uFF1A" + plan.conflicts.slice(0, 20).join("\u3001") + (plan.conflicts.length > 20 ? "\u2026" : ""), cls: "pp-footnote" });
      summary.createEl("p", { text: "\u65B0\u589E\u5361\u7247\u4FDD\u7559\u5907\u4EFD\u7684\u539F\u8BC4\u5206\u548C\u5230\u671F\u65F6\u95F4\u3002\u539F\u6587\u4ECD\u9700\u5BF9\u5E94\u7B14\u8BB0\u5B58\u5728\uFF1B\u6B64\u64CD\u4F5C\u4E0D\u6062\u590D\u7B14\u8BB0\u6587\u4EF6\u3002", cls: "pp-footnote" });
      let added = 0;
      const accept = this.button(summary, `\u786E\u8BA4\u5408\u5E76 ${plan.add.length} \u5F20\u5361\u7247`, () => void this.run(async () => {
        if (this.importPlan !== plan || this.backupText !== this.previewedBackupText) throw new Error("\u5907\u4EFD\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8");
        added = await this.host.store.importBackup(plan);
      }, () => {
        this.importPlan = null;
        this.backupText = "";
        this.message = `\u5DF2\u6062\u590D ${added} \u5F20\u5361\u7247\uFF0C\u73B0\u6709\u5361\u7247\u672A\u8986\u76D6`;
      }), true);
      accept.disabled = plan.requiresAlgorithmChoice || !plan.add.length && !((_c = plan.decks) == null ? void 0 : _c.length) && !memberships && plan.schedulingAlgorithm === plan.localSchedulingAlgorithm || this.busy;
    }
  }
  sourceRef(p) {
    return { line: p.line, endLine: p.endLine, heading: p.headingPath.join(" \u203A ") || p.heading, excerpt: p.excerpt, fingerprint: p.fingerprint };
  }
  renderBatch(root) {
    root.createEl("h2", { text: `\u6838\u5BF9 ${this.batch.length} \u6761\u5019\u9009`, cls: "pp-stage-title" });
    root.createEl("p", { text: "\u9010\u6761\u5C55\u5F00\u67E5\u770B\u5B8C\u6574\u539F\u6587\u548C\u95EE\u9898\u3002\u4E0D\u5408\u9002\u7684\u5019\u9009\u53EF\u79FB\u9664\uFF1B\u95EE\u9898\u9700\u8981\u6539\u5199\u65F6\uFF0C\u8BF7\u8FD4\u56DE\u5355\u6761\u9884\u89C8\u3002\u786E\u8BA4\u540E\u624D\u4E00\u6B21\u6027\u4FDD\u5B58\u4E3A\u5FEB\u7167\u5361\u7247\u3002", cls: "pp-muted" });
    for (const p of this.batch) {
      const box = root.createEl("details", { cls: "pp-batch-item" });
      if (this.batch.filter((x) => x.question === p.question).length > 1) box.createEl("p", { text: "\u672C\u6279\u6709\u76F8\u540C\u9898\u76EE\uFF0C\u539F\u6587\u53EF\u80FD\u5305\u542B\u4E0D\u540C\u6761\u4EF6\uFF1B\u8BF7\u5206\u522B\u6838\u5BF9\u6216\u5355\u6761\u6539\u5199\u3002", cls: "pp-caveat" });
      const summary = box.createEl("summary");
      this.previews.mount(summary, p.question, p.path);
      box.createEl("p", { text: p.path + " \xB7 \u7B2C " + (p.line + 1) + " \u884C", cls: "pp-source-path" });
      this.previews.mount(box, p.excerpt, p.path);
      this.button(box, "\u4ECE\u672C\u6279\u79FB\u9664", () => {
        this.batch = this.batch.filter((x) => x.id !== p.id);
        this.selectedCandidates.delete(p.id);
        this.render();
      });
    }
    let outcome = { added: 0, duplicates: 0 };
    const save = this.button(root, `\u786E\u8BA4\u4FDD\u5B58 ${this.batch.length} \u5F20\u5361\u7247`, () => void this.run(async () => {
      if (!this.host.store) throw new Error(this.host.storageError);
      const verified = [];
      for (const p of this.batch) verified.push(await this.validateCandidate(p));
      outcome = await this.host.store.addMany(verified.map(({ point: p }) => ({ front: p.question, back: p.excerpt, sourcePath: p.path, sourceRef: this.sourceRef(p) })), Date.now(), () => this.assertSources(verified), this.selectedDeck || DEFAULT_DECK);
    }, () => {
      this.selectedCandidates.clear();
      this.batch = [];
      this.screen = "home";
      this.message = `\u5DF2\u4FDD\u5B58 ${outcome.added} \u5F20\u5361\u7247${outcome.duplicates ? "\uFF0C\u8DF3\u8FC7 " + outcome.duplicates + " \u5F20\u5DF2\u6709\u5361\u7247" : ""}`;
    }), true);
    save.addClass("pp-wide");
    save.disabled = !this.batch.length || this.busy;
  }
  assertSources(sources) {
    for (const source of sources) if (this.app.vault.getAbstractFileByPath(source.path) !== source.file || source.file.path !== source.path || source.file.stat.mtime !== source.mtime || source.file.stat.size !== source.size) throw new Error("\u6765\u6E90\u5728\u786E\u8BA4\u671F\u95F4\u53D8\u5316\uFF0C\u672C\u6B21\u672A\u4FDD\u5B58\u3002\u8BF7\u5237\u65B0\u5E76\u91CD\u65B0\u6838\u5BF9\u5019\u9009\u3002");
  }
  async validateCandidate(p) {
    const file = this.app.vault.getAbstractFileByPath(p.path);
    if (!(file instanceof import_obsidian3.TFile)) throw new Error("\u6765\u6E90\u7B14\u8BB0\u5DF2\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u5237\u65B0\u5019\u9009");
    const snapshot = { point: p, file, path: p.path, mtime: file.stat.mtime, size: file.stat.size };
    const text2 = await this.app.vault.read(file);
    this.assertSources([snapshot]);
    if (fingerprint(text2.replace(/\r\n/g, "\n")) !== p.sourceFingerprint) throw new Error("\u6765\u6E90\u5185\u5BB9\u6216\u4E0A\u4E0B\u6587\u5DF2\u53D8\u5316\uFF0C\u672C\u6B21\u672A\u4FDD\u5B58\u3002\u8BF7\u5237\u65B0\u5E76\u91CD\u65B0\u6838\u5BF9\u5019\u9009\u3002");
    const current = extractKnowledge(text2, p.path).points.find((x) => x.id === p.id && x.fingerprint === p.fingerprint && x.excerpt === p.excerpt);
    if (!current) throw new Error("\u6765\u6E90\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u672C\u6B21\u672A\u4FDD\u5B58\u3002\u8BF7\u5237\u65B0\u5E76\u91CD\u65B0\u6838\u5BF9\u5019\u9009\u3002");
    return { ...snapshot, point: current };
  }
  async openKnowledgeSource(p) {
    const f = this.app.vault.getAbstractFileByPath(p.path);
    if (!(f instanceof import_obsidian3.TFile)) {
      new import_obsidian3.Notice("\u6765\u6E90\u7B14\u8BB0\u5DF2\u79FB\u52A8\u6216\u5220\u9664");
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(f, { eState: { line: p.line } });
  }
  pager(root, page, change) {
    const bar = root.createDiv({ cls: "pp-pagination" });
    const prev = this.button(bar, "\u4E0A\u4E00\u9875", () => change(page.page - 1));
    prev.disabled = page.page === 0;
    bar.createEl("span", { text: `${page.page + 1} / ${page.pages} \xB7 ${page.total} \u6761` });
    const next = this.button(bar, "\u4E0B\u4E00\u9875", () => change(page.page + 1));
    next.disabled = page.page + 1 >= page.pages;
  }
  currentEditor() {
    return this.host.activeEditor();
  }
  selection() {
    const view = this.currentEditor();
    if (!view) {
      new import_obsidian3.Notice("\u8BF7\u5148\u6253\u5F00\u53EF\u7F16\u8F91\u7684\u7B14\u8BB0");
      return;
    }
    const editor = view.editor, text2 = editor.getSelection();
    if (!text2.trim() || editor.listSelections().length !== 1 || text2.length > 5e4) {
      new import_obsidian3.Notice("\u8BF7\u5728\u7B14\u8BB0\u4E2D\u9009\u62E9\u4E00\u6BB5\u8FDE\u7EED\u6587\u5B57\uFF0C\u6700\u591A 50,000 \u5B57\u7B26");
      return;
    }
    this.passageQueue = [];
    this.beginPassage({ text: text2, question: view.file.basename, line: editor.getCursor("from").line, path: view.file.path, kind: "selection", sourceRef: selectionSourceRef(editor.getValue(), text2, view.file.path, editor.getCursor("from").line) });
  }
  startSelection(p) {
    if (this.screen !== "home") {
      new import_obsidian3.Notice("\u8BF7\u5148\u8FD4\u56DE\u5B66\u4E60\uFF0C\u518D\u5F00\u59CB\u65B0\u7EC3\u4E60");
      return;
    }
    this.mode = "passage";
    this.passageQueue = [];
    this.beginPassage(p);
  }
  focusRecall() {
    var _a2;
    this.contentEl.scrollTop = 0;
    (_a2 = this.contentEl.querySelector("textarea")) == null ? void 0 : _a2.focus({ preventScroll: true });
  }
  outlineBranches(note) {
    return note.outline.filter((b) => {
      const root = b.id === JSON.stringify(["outline", note.path, "document", 0]);
      return !(root && b.children.length === 1 && b.children[0].kind === "heading");
    });
  }
  saveLocation(mode, item) {
    if (!this.host.locations || "text" in item && (!item.kind || item.kind === "selection")) return;
    const note = this.notes.find((n) => n.path === item.path);
    if (!(note == null ? void 0 : note.sourceFingerprint)) return;
    const location = { mode, path: item.path, line: item.line, identity: "text" in item ? fingerprint(item.question + "\n" + item.text) : item.id, sourceFingerprint: note.sourceFingerprint, scope: { ...this.studyScope }, currentPath: this.host.currentPath, excludedPaths: [...this.excludedPaths] };
    void this.host.locations.save(location).catch(() => {
      this.message = "\u7EC3\u4E60\u4F4D\u7F6E\u672A\u80FD\u4FDD\u5B58\uFF1B\u5361\u7247\u8FDB\u5EA6\u4E0D\u53D7\u5F71\u54CD\uFF0C\u53EF\u91CD\u8BD5\u5F00\u59CB\u672C\u9898";
      if (!this.closed) this.render();
    });
  }
  renderResume(root, mode) {
    var _a2;
    const saved = (_a2 = this.host.locations) == null ? void 0 : _a2.get(mode);
    if (!saved) return;
    const matching = JSON.stringify(saved.scope) === JSON.stringify(this.studyScope) && JSON.stringify(saved.excludedPaths) === JSON.stringify(this.excludedPaths) && (this.studyScope.kind !== "current" || saved.currentPath === this.host.currentPath);
    if (!matching) return;
    this.button(root, mode === "passage" ? "\u7EE7\u7EED\u4E0A\u6B21\u5C0F\u8282" : "\u7EE7\u7EED\u4E0A\u6B21\u5927\u7EB2\u8282\u70B9", () => void this.run(async () => {
      if (!await this.refresh(true)) throw new Error("\u5237\u65B0\u672A\u5B8C\u6210\uFF0C\u672A\u6062\u590D\u7EC3\u4E60");
      const note = this.selectedNotes().find((n) => n.path === saved.path);
      if (!note || note.sourceFingerprint !== saved.sourceFingerprint) throw new Error("\u4E0A\u6B21\u6765\u6E90\u5DF2\u53D8\u5316\u6216\u4E0D\u5728\u5F53\u524D\u8303\u56F4\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7EC3\u4E60");
      if (mode === "passage") {
        const queue = this.selectedNotes().flatMap((n) => n.passages), at = queue.findIndex((p) => p.path === saved.path && p.line === saved.line && fingerprint(p.question + "\n" + p.text) === saved.identity);
        if (at < 0) throw new Error("\u4E0A\u6B21\u5C0F\u8282\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
        const session = sessionFrom(queue, queue[at], this.reviewOrder);
        this.passageQueue = session.queue;
        this.passagePosition = session.position;
        this.beginPassage(queue[at]);
      } else {
        const queue = this.selectedNotes().flatMap((n) => this.outlineBranches(n)), at = queue.findIndex((b) => b.id === saved.identity);
        if (at < 0) throw new Error("\u4E0A\u6B21\u5927\u7EB2\u8282\u70B9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
        const session = sessionFrom(queue, queue[at], this.reviewOrder);
        this.outlineQueue = session.queue;
        this.outlinePosition = session.position;
        this.outlineHistory = [];
        this.beginOutline(queue[at]);
      }
    }, () => {
    }));
  }
  beginPassage(p, reset = false) {
    if (this.passage && this.session) this.passageDrafts.set(this.passage, { session: this.session, saved: this.passageSaved });
    this.message = "";
    this.passage = p;
    const cached = reset ? void 0 : this.passageDrafts.get(p);
    this.session = (cached == null ? void 0 : cached.session) || new Session(p.text, p.question);
    if (!cached && p.kind && p.kind !== "selection") this.session.start(p.question);
    this.passageSaved = (cached == null ? void 0 : cached.saved) || false;
    this.screen = "passage";
    this.host.shield(this.session.stage === "recall" && this.visible());
    this.saveLocation("passage", p);
    this.render();
    this.focusRecall();
  }
  renderPassage(root) {
    var _a2;
    const s = this.session, p = this.passage;
    const nav = root.createDiv({ cls: "pp-practice-nav" });
    nav.createEl("span", { text: this.passageQueue.length ? `\u7B2C ${this.passagePosition + 1} / ${this.passageQueue.length} \u8282` : "\u9009\u6BB5\u7EC3\u4E60" });
    if (this.passageQueue.length) {
      const previous = this.button(nav, "\u4E0A\u4E00\u8282", () => {
        if (this.session !== s || this.passagePosition <= 0) return;
        this.passagePosition--;
        this.beginPassage(this.passageQueue[this.passagePosition]);
      });
      previous.disabled = this.busy || this.passagePosition === 0;
      const next = this.button(nav, "\u4E0B\u4E00\u8282", () => {
        if (this.session !== s || this.passagePosition + 1 >= this.passageQueue.length) return;
        this.passagePosition++;
        this.beginPassage(this.passageQueue[this.passagePosition]);
      });
      next.disabled = this.busy || this.passagePosition + 1 >= this.passageQueue.length;
    }
    root.createEl("p", { text: p.path, cls: "pp-source-path" });
    if ((_a2 = p.headingPath) == null ? void 0 : _a2.length) root.createEl("p", { text: p.headingPath.join(" \u203A "), cls: "pp-heading-path" });
    if (p.kind && p.kind !== "selection") root.createEl("p", { text: p.kind === "intro" ? "\u7236\u6807\u9898\u5F15\u8A00 \xB7 \u4EC5\u5B50\u6807\u9898\u524D\u7684\u6B63\u6587" : p.kind === "preamble" ? "\u7B14\u8BB0\u5F15\u8A00 \xB7 \u9996\u4E2A\u6807\u9898\u524D\u7684\u6B63\u6587" : p.kind === "document" ? "\u65E0 Markdown \u6807\u9898 \xB7 \u5168\u6587\u4F5C\u4E3A\u4E00\u4E2A\u7B54\u6848" : "\u6807\u9898\u5C0F\u8282 \xB7 \u542B\u672C\u8282\u5168\u90E8\u6B63\u6587", cls: "pp-footnote" });
    root.createEl("h2", { text: s.stage === "question" ? "01 \xB7 \u9605\u8BFB\u4E0E\u51C6\u5907" : s.stage === "recall" ? "02 \xB7 \u4E0D\u770B\u539F\u6587\uFF0C\u8BD5\u7740\u56DE\u5FC6" : "03 \xB7 \u5BF9\u7167\u4E0E\u6F0F\u70B9", cls: "pp-stage-title" });
    if (s.stage === "question") {
      const source = root.createDiv({ cls: "pp-reading" });
      source.createEl("span", { text: "\u539F\u6587 \xB7 \u672C\u6B21\u5BF9\u7167\u7B54\u6848", cls: "pp-face-label" });
      this.previews.mount(source, s.source, p.path);
      this.field(root, "\u81EA\u95EE\u7684\u95EE\u9898", s.question, (v) => s.question = v, "\u7528\u4E00\u4E2A\u95EE\u9898\u6982\u62EC\u8FD9\u6BB5\u5185\u5BB9", 4e3);
      this.button(root, "\u906E\u4F4F\u539F\u6587\uFF0C\u5F00\u59CB\u56DE\u5FC6", () => {
        s.start(s.question);
        this.host.shield(true);
        this.render();
      }, true).addClass("pp-wide");
      root.createEl("p", { text: "\u56DE\u5FC6\u65F6\u6682\u65F6\u906E\u4F4F\u5DE5\u4F5C\u533A\u7684\u7B14\u8BB0\u5185\u5BB9\uFF1B\u63ED\u6653\u6216\u8FD4\u56DE\u540E\u6062\u590D\u3002", cls: "pp-footnote" });
    } else if (s.stage === "recall") {
      root.createEl("p", { text: s.question, cls: "pp-question" });
      this.field(root, "\u6211\u7684\u56DE\u5FC6", s.recall, (v) => s.recall = v, "\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u4E0B\u8BB0\u5F97\u7684\u5185\u5BB9\u2026\u2026");
      this.button(root, "\u63ED\u6653\u5E76\u5BF9\u7167", () => {
        if (this.session !== s || s.stage !== "recall") return;
        s.reveal();
        this.host.shield(false);
        this.render();
        void this.revealSource(p, () => this.screen === "passage" && this.session === s && s.stage === "compare");
      }, true).addClass("pp-wide");
      root.createEl("p", { text: "\u60F3\u4E0D\u8D77\u6765\u4E5F\u53EF\u4EE5\u63ED\u6653\u3002", cls: "pp-footnote" });
    } else {
      root.createEl("p", { text: s.question, cls: "pp-question" });
      mountComparison(root.createDiv(), s.target, s.recall, s.rounds.length ? "\u672C\u8F6E\u6F0F\u70B9\u7B54\u6848" : p.kind && p.kind !== "selection" ? "\u672C\u8282\u5B8C\u6574\u7B54\u6848" : "\u539F\u59CB\u9009\u6BB5", this.compare, (value) => this.compare = value, (parent, text2, onReady) => this.previews.mount(parent, text2, p.path, onReady));
      let retry;
      this.field(root, "\u6211\u6F0F\u6389\u7684\u8981\u70B9\uFF08\u6BCF\u884C\u4E00\u6761\uFF09", s.missed, (v) => {
        s.missed = v;
        retry.disabled = !s.points().length;
      }, "\u81EA\u5DF1\u5224\u65AD\u6F0F\u6389\u4E86\u54EA\u4E9B\u8981\u70B9");
      const actions = root.createDiv({ cls: "pp-actions" });
      retry = this.button(actions, "\u53EA\u7EC3\u8FD9\u4E9B\u6F0F\u70B9", () => {
        if (s.retry()) {
          this.host.shield(true);
          this.render();
        }
      }, true);
      retry.disabled = !s.points().length || this.busy;
      const save = this.button(actions, this.passageSaved ? "\u590D\u4E60\u8BB0\u5F55\u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58\u65B0\u590D\u4E60\u8BB0\u5F55", () => void this.run(() => createReview((path, text2) => this.app.vault.create(path, text2), (path) => !!this.app.vault.getAbstractFileByPath(path), reviewNote(s, p.path, (/* @__PURE__ */ new Date()).toISOString())), () => {
        this.passageSaved = true;
        this.message = "\u5DF2\u65B0\u5EFA\u590D\u4E60\u8BB0\u5F55\uFF0C\u539F\u7B14\u8BB0\u672A\u6539\u52A8";
      }));
      save.disabled = this.passageSaved || this.busy;
      this.button(actions, "\u628A\u6F0F\u70B9\u5236\u6210\u5361\u7247", () => this.openEditor(void 0, false, { front: s.question, back: s.points().join("\n") || s.target, sourcePath: p.path, sourceRef: passageSourceRef(p) }));
      this.button(actions, p.kind && p.kind !== "selection" ? "\u91CD\u65B0\u56DE\u5FC6\u672C\u8282" : "\u91CD\u65B0\u7EC3\u4E60\u9009\u6BB5", () => {
        if (this.session === s) this.beginPassage(p, true);
      });
      this.button(actions, "\u628A\u672C\u8282\u5236\u6210\u5361\u7247", () => this.openEditor(void 0, false, { front: p.question, back: p.text, sourcePath: p.path, sourceRef: passageSourceRef(p) }));
    }
  }
  renderOutlineHome(root) {
    const notes = this.selectedNotes(), branches = notes.flatMap((n) => this.outlineBranches(n)), stats = root.createDiv({ cls: "pp-study-stats" });
    for (const [count, label2] of [[notes.length, "\u7BC7\u7B14\u8BB0"], [branches.length, "\u4E2A\u5206\u652F\u9898"]]) {
      const tile = stats.createDiv();
      tile.createEl("strong", { text: String(count) });
      tile.createEl("span", { text: label2 });
    }
    const intro = root.createDiv({ cls: "pp-mode-intro" });
    intro.createEl("h2", { text: "\u770B\u7236\u8282\u70B9\uFF0C\u56DE\u5FC6\u5B50\u5206\u652F" });
    intro.createEl("p", { text: "\u652F\u6301 Markdown \u6807\u9898\u6811\u548C\u7F29\u8FDB\u5217\u8868\uFF0C\u53EA\u6709\u5173\u952E\u8BCD\u4E5F\u80FD\u7EC3\u3002\u5148\u56DE\u60F3\u76F4\u5C5E\u5B50\u8282\u70B9\uFF0C\u518D\u9010\u9879\u63ED\u6653\u3001\u7EE7\u7EED\u6DF1\u5165\u4E0B\u4E00\u5C42\u3002" });
    root.createEl("p", { text: "\u8FD9\u91CC\u590D\u4E60\u5DF2\u6709\u7ED3\u6784\uFF0C\u4E0D\u81EA\u52A8\u6982\u62EC\u6B63\u6587\uFF1BXMind \u6587\u4EF6\u548C\u56FE\u7247\u601D\u7EF4\u5BFC\u56FE\u6682\u4E0D\u89E3\u6790\u3002", cls: "pp-footnote" });
    this.button(root, "\u5237\u65B0\u5185\u5BB9", () => void this.refresh(true));
    const warnings = [...this.scanWarnings, ...notes.flatMap((n) => n.warnings.map((w) => n.path + " \xB7 " + w))];
    if (warnings.length) {
      const details = root.createEl("details", { cls: "pp-warnings" });
      details.createEl("summary", { text: `${warnings.length} \u6761\u7ED3\u6784\u63D0\u793A` });
      for (const warning of warnings) details.createEl("p", { text: warning });
    }
    if (!branches.length) {
      root.createEl("p", { text: "\u8FD9\u4E2A\u8303\u56F4\u6CA1\u6709\u6807\u9898\u6811\u6216\u5217\u8868\u5206\u652F\u3002\u53EF\u4F7F\u7528\u591A\u7EA7\u6807\u9898\uFF0C\u6216\u300C- \u7236\u8282\u70B9\u300D\u4E0B\u7F29\u8FDB\u5217\u51FA\u5B50\u8282\u70B9\u3002", cls: "pp-empty" });
      return;
    }
    const search = root.createEl("input", { cls: "pp-search", attr: { type: "search", "aria-label": "\u641C\u7D22\u5927\u7EB2\u8282\u70B9", placeholder: "\u641C\u7D22\u7236\u8282\u70B9\u3001\u6807\u9898\u8DEF\u5F84\u6216\u7B14\u8BB0\u8DEF\u5F84" } });
    search.value = this.outlineQuery;
    const list = root.createDiv({ cls: "pp-passage-list" });
    const draw = () => {
      list.empty();
      const filtered = branches.filter((p) => matchesQuery([p.label, p.path, p.ancestorPath.join(" ")], this.outlineQuery)), page = paginate(filtered, this.outlinePage);
      this.outlinePage = page.page;
      for (const p of page.items) {
        const button = this.button(list, "", () => {
          const session = sessionFrom(filtered, p, this.reviewOrder);
          this.outlineQueue = session.queue;
          this.outlinePosition = session.position;
          this.outlineHistory = [];
          this.beginOutline(p);
        });
        button.addClass("pp-outline-choice");
        button.createEl("span", { text: p.label, cls: "pp-item-title" });
        button.createEl("span", { text: p.ancestorPath.join(" \u203A "), cls: "pp-item-preview" });
        button.createEl("span", { text: `${p.children.length} \u4E2A\u76F4\u5C5E\u5B50\u8282\u70B9 \xB7 \u7B54\u6848\u5C1A\u672A\u63ED\u6653`, cls: "pp-footnote" });
        button.createEl("span", { text: p.path, cls: "pp-source-path" });
      }
      this.pager(list, page, (change) => {
        this.outlinePage = change;
        draw();
      });
    };
    search.addEventListener("input", () => {
      this.outlineQuery = search.value;
      this.outlinePage = 0;
      draw();
    });
    draw();
  }
  beginOutline(branch) {
    this.outline = branch;
    this.outlineRevealed = 0;
    this.outlineRecall = "";
    this.screen = "outline";
    this.host.shield(this.visible());
    this.saveLocation("outline", branch);
    this.render();
    this.focusRecall();
  }
  renderOutline(root) {
    const branch = this.outline, complete = this.outlineRevealed >= branch.children.length;
    root.createEl("p", { text: branch.path, cls: "pp-source-path" });
    if (branch.ancestorPath.length) root.createEl("p", { text: branch.ancestorPath.join(" \u203A "), cls: "pp-heading-path" });
    root.createEl("h2", { text: "\u5B83\u6709\u54EA\u4E9B\u5B50\u5206\u652F\uFF1F", cls: "pp-stage-title" });
    const parent = root.createDiv({ cls: "pp-outline-parent" });
    parent.createEl("span", { text: "\u7236\u8282\u70B9 \xB7 \u672C\u8F6E\u63D0\u793A", cls: "pp-face-label" });
    parent.createEl("p", { text: branch.label, cls: "pp-question" });
    root.createEl("p", { text: `\u5DF2\u63ED\u6653 ${Math.min(this.outlineRevealed, branch.children.length)} / ${branch.children.length} \u4E2A\u76F4\u5C5E\u5B50\u8282\u70B9`, cls: "pp-progress", attr: { role: "status" } });
    if (!complete) this.field(root, "\u6211\u8BB0\u5F97\u7684\u5206\u652F\uFF08\u53EF\u9009\uFF09", this.outlineRecall, (value) => this.outlineRecall = value, "\u53EF\u4EE5\u53EA\u5199\u5173\u952E\u8BCD\uFF0C\u6BCF\u884C\u4E00\u4E2A\u2026\u2026");
    else if (this.outlineRecall) {
      const recall = root.createDiv({ cls: "pp-reading" });
      recall.createEl("span", { text: "\u6211\u7684\u56DE\u5FC6", cls: "pp-face-label" });
      this.previews.mount(recall, this.outlineRecall, branch.path);
    }
    const tree = root.createEl("ol", { cls: "pp-outline-tree", "attr": { "aria-label": "\u672C\u8F6E\u5B50\u5206\u652F" } });
    branch.children.forEach((node, index) => {
      const item = tree.createEl("li", { cls: index < this.outlineRevealed ? "is-revealed" : "is-hidden" });
      if (index >= this.outlineRevealed) {
        item.createEl("span", { text: "\u5C1A\u672A\u63ED\u6653", cls: "pp-outline-placeholder" });
        return;
      }
      item.createEl("span", { text: node.label, cls: "pp-outline-node" });
      if (node.children.length) {
        const child = { id: node.id, label: node.label, line: node.line, path: node.path, headingPath: node.kind === "heading" ? [...branch.headingPath, node.label] : [...branch.headingPath], ancestorPath: [...branch.ancestorPath, node.label], children: node.children };
        this.button(item, `\u7EE7\u7EED\u56DE\u5FC6\u4E0B\u4E00\u7EA7\uFF08${node.children.length}\uFF09`, () => {
          if (this.outline !== branch) return;
          this.outlineHistory.push(branch);
          this.beginOutline(child);
        });
      }
    });
    const actions = root.createDiv({ cls: "pp-actions" });
    if (!complete) {
      this.button(actions, "\u63ED\u6653\u4E0B\u4E00\u4E2A\u5206\u652F", () => {
        if (this.outline !== branch) return;
        this.outlineRevealed++;
        this.host.shield(this.outlineRevealed < branch.children.length && this.visible());
        this.render();
      }, true);
      this.button(actions, "\u5168\u90E8\u63ED\u6653", () => {
        if (this.outline !== branch) return;
        this.outlineRevealed = branch.children.length;
        this.host.shield(false);
        this.render();
      });
    } else this.button(actions, "\u91CD\u65B0\u56DE\u5FC6\u672C\u8282\u70B9", () => {
      if (this.outline === branch) this.beginOutline(branch);
    }, true);
    if (this.outlineHistory.length) this.button(actions, "\u8FD4\u56DE\u4E0A\u4E00\u7EA7\u8282\u70B9", () => {
      if (this.outline === branch) this.beginOutline(this.outlineHistory.pop());
    });
    if (complete && this.outlineQueue.length > this.outlinePosition + 1) this.button(actions, "\u4E0B\u4E00\u5206\u652F\u9898", () => {
      if (this.outline !== branch) return;
      this.outlinePosition++;
      this.outlineHistory = [];
      this.beginOutline(this.outlineQueue[this.outlinePosition]);
    });
    root.createEl("p", { text: complete ? "\u6838\u5BF9\u540E\u53EF\u7EE7\u7EED\u6DF1\u5165\u4E0B\u4E00\u5C42\u3002" : "\u5148\u56DE\u60F3\uFF0C\u518D\u9010\u9879\u63ED\u6653\u3002", cls: "pp-footnote" });
  }
  startCards(cards) {
    this.againCandidates.clear();
    this.repeatPass = false;
    this.queue = sessionOrder(cards, this.reviewOrder);
    this.reviewed = 0;
    this.sessionTotal = cards.length;
    this.undo = void 0;
    this.screen = "card";
    this.advance();
  }
  advance() {
    if (!this.queue.length && this.retryAgain && !this.repeatPass) {
      this.repeatPass = true;
      const now = Date.now();
      this.queue = [...this.againCandidates].map((id) => {
        var _a2;
        return (_a2 = this.host.store) == null ? void 0 : _a2.get(id);
      }).filter((c) => !!c && !c.suspended && c.dueAt <= now);
      this.sessionTotal += this.queue.length;
    }
    this.current = this.queue[0];
    this.revealed = false;
    this.recall = "";
    this.host.shield(!!this.current && this.visible());
    this.render();
    this.focusRecall();
  }
  renderCard(root) {
    var _a2, _b, _c, _d, _e, _f, _g, _h;
    const c = this.current;
    root.createEl("p", { text: `\u672C\u8F6E\u5DF2\u5B8C\u6210 ${this.reviewed} / ${this.sessionTotal}${this.repeatPass ? " \xB7 \u518D\u7EC3\u6700\u591A\u4E00\u6B21" : ""}`, cls: "pp-progress" });
    if (!c) {
      root.createEl("h2", { text: "\u8FD9\u4E00\u8F6E\uFF0C\u5B8C\u6210\u4E86", cls: "pp-stage-title" });
      root.createEl("p", { text: `\u5DF2\u4FDD\u5B58 ${this.reviewed} \u6B21\u8BC4\u5206\uFF0C\u4E0B\u6B21\u590D\u4E60\u5DF2\u5B89\u6392\u3002`, cls: "pp-muted" });
      const upcoming = this.cards().cards.filter((c2) => !c2.suspended).sort((a, b) => a.dueAt - b.dueAt)[0];
      if (upcoming) root.createEl("p", { text: upcoming.dueAt <= Date.now() ? "\u8FD8\u6709\u5361\u7247\u5230\u671F\uFF0C\u53EF\u8FD4\u56DE\u5F00\u59CB\u65B0\u4E00\u8F6E" : `\u4E0B\u6B21\u5230\u671F ${date(upcoming.dueAt)}`, cls: "pp-footnote" });
      this.undoButton(root);
      this.button(root, "\u8FD4\u56DE\u5B66\u4E60\u8303\u56F4", () => this.home(), true);
      return;
    }
    if (((_b = (_a2 = this.host.store) == null ? void 0 : _a2.schedulingAlgorithm) != null ? _b : "fsrs") === "sm2-osr") root.createEl("p", { text: "\u6309\u5929\u590D\u4E60 \xB7 \u5FD8\u4E86\u4F1A\u5728\u4ECA\u5929\u5230\u671F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u53EF\u518D\u7EC3", cls: "pp-footnote" });
    if (activeAlgorithm(c) !== ((_d = (_c = this.host.store) == null ? void 0 : _c.schedulingAlgorithm) != null ? _d : "fsrs")) root.createEl("p", { text: "\u672C\u6B21\u8BC4\u5206\u5C06\u521D\u59CB\u5316\u6240\u9009\u7B97\u6CD5\uFF0C\u4E4B\u524D\u7684\u590D\u4E60\u5386\u53F2\u4FDD\u7559", cls: "pp-footnote" });
    root.createEl("p", { text: c.sourcePath || "\u672C\u5730\u5FEB\u7167 \xB7 \u65E0\u6765\u6E90\u7B14\u8BB0", cls: "pp-source-path" });
    if (c.id.startsWith("note:") && !this.notes.some((n) => n.cards.some((x) => x.id === c.id))) root.createEl("p", { text: "\u6765\u6E90\u6807\u8BB0\u7F3A\u5931\uFF1A\u672C\u6B21\u4F7F\u7528\u5DF2\u4FDD\u5B58\u7684\u6700\u540E\u5FEB\u7167\uFF0C\u8BC4\u5206\u7EE7\u7EED\u72EC\u7ACB\u4FDD\u5B58\u3002", cls: "pp-footnote" });
    const front = root.createDiv({ cls: "pp-front" });
    front.createEl("span", { text: "\u6B63\u9762 \xB7 \u95EE\u9898", cls: "pp-face-label" });
    this.previews.mount(front, c.front, c.sourcePath);
    if (!this.revealed) {
      this.field(root, "\u6211\u7684\u56DE\u5FC6\uFF08\u53EF\u9009\uFF09", this.recall, (v) => this.recall = v, "\u53EF\u4EE5\u9ED8\u60F3\uFF0C\u4E5F\u53EF\u4EE5\u5199\u4E0B\u6765\u2026\u2026");
      this.button(root, "\u7FFB\u5230\u80CC\u9762 \xB7 \u63ED\u6653\u7B54\u6848", () => {
        if (this.current !== c || this.revealed) return;
        this.revealed = true;
        this.host.shield(false);
        this.render();
        if (c.sourcePath) void this.revealSource(c, () => this.screen === "card" && this.current === c && this.revealed);
      }, true).addClass("pp-wide");
      this.undoButton(root);
      root.createEl("p", { text: "\u9000\u51FA\u4E0D\u4F1A\u8BB0\u5F55\u8BC4\u5206\u3002", cls: "pp-footnote" });
    } else {
      const back = root.createDiv({ cls: "pp-flash-answer" });
      back.createEl("h2", { text: "\u80CC\u9762 \xB7 \u7B54\u6848" });
      this.previews.mount(back, c.back, c.sourcePath);
      if (this.recall) {
        const own2 = root.createDiv({ cls: "pp-own-recall" });
        own2.createEl("h2", { text: "\u6211\u7684\u56DE\u5FC6" });
        this.previews.mount(own2, this.recall, c.sourcePath);
      }
      const corrections = root.createDiv({ cls: "pp-actions" });
      if (!c.id.startsWith("note:")) this.button(corrections, "\u5C31\u5730\u4FEE\u6539\u5361\u7247", () => this.openEditor(c));
      else this.button(corrections, "\u6253\u5F00\u7B14\u8BB0\u4FEE\u6539", () => void this.openSource(c));
      this.button(corrections, "\u6682\u505C\u5E76\u8DF3\u8FC7", () => void this.run(() => c.id.startsWith("note:") ? this.host.store.setAuthoredSuspended(c, true) : this.host.store.suspend(c.id, c.revision, true), () => {
        this.queue.shift();
        this.sessionTotal = Math.max(this.reviewed, this.sessionTotal - 1);
        this.undo = void 0;
        this.advance();
      }));
      const ratings = root.createDiv({ cls: "pp-ratings" }), now = Date.now();
      for (const rating of ["again", "hard", "good", "easy"]) {
        const next = applyRating(c, rating, now, (_f = (_e = this.host.store) == null ? void 0 : _e.schedulingAlgorithm) != null ? _f : "fsrs", srHistogram((_h = (_g = this.host.store) == null ? void 0 : _g.cards) != null ? _h : [], now)), interval = next.sr ? next.intervalDays === 0 ? "\u4ECA\u5929" : `${next.intervalDays} \u5929` : intervalLabel(next.dueAt, now);
        const b = this.button(ratings, "", () => void this.rate(c, rating), rating === "good");
        b.setAttribute("aria-label", `${ratingLabels[rating]} \xB7 ${interval}${next.sr && next.intervalDays === 0 ? "" : "\u540E"}`);
        b.createEl("strong", { text: ratingLabels[rating] });
        b.createEl("span", { text: `${interval}${next.sr && next.intervalDays === 0 ? "" : "\u540E"}` });
      }
      root.createEl("p", { text: "\u9009\u62E9\u540E\u4FDD\u5B58\u8FDB\u5EA6\u5E76\u7EE7\u7EED\u4E0B\u4E00\u5F20\u3002", cls: "pp-footnote" });
    }
  }
  assertIndexCurrent(indexedFiles, exclusions) {
    const files = this.app.vault.getMarkdownFiles().filter((f) => !excluded(f.path, ["Passage Practice", "Passage Practice backups", ...exclusions])), set = new Set(files);
    if (files.length !== indexedFiles.length || indexedFiles.some((x) => !set.has(x.file) || x.file.path !== x.path || x.file.stat.mtime !== x.mtime || x.file.stat.size !== x.size)) throw new Error("\u8BC4\u5206\u63D0\u4EA4\u524D\u7B14\u8BB0\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u65B0\u590D\u4E60");
  }
  async rate(c, rating) {
    const before = { queue: [...this.queue], reviewed: this.reviewed, total: this.sessionTotal, again: [...this.againCandidates], repeatPass: this.repeatPass };
    await this.run(async () => {
      if (c.id.startsWith("note:")) {
        if (!await this.refresh()) throw new Error("\u5185\u5BB9\u5237\u65B0\u88AB\u4E2D\u65AD\uFF0C\u672C\u6B21\u672A\u8BC4\u5206\uFF0C\u8BF7\u8FD4\u56DE\u540E\u91CD\u65B0\u5F00\u59CB");
        const current = studyCards(this.notes, this.host.store.cards, { kind: "all", value: "" }, "", Date.now()).cards.find((x) => x.id === c.id);
        if (!current || current.front !== c.front || current.back !== c.back || current.revision !== c.revision) throw new Error("\u6765\u6E90\u5361\u7247\u5DF2\u4FEE\u6539\u3001\u79FB\u9664\u6216\u7F16\u53F7\u91CD\u590D\u3002\u672C\u6B21\u672A\u8BC4\u5206\uFF0C\u8BF7\u8FD4\u56DE\u5B66\u4E60\u5E76\u91CD\u65B0\u5F00\u59CB\u3002");
        const verifiedFiles = this.indexedFiles.map((x) => ({ ...x })), exclusions = [...this.excludedPaths];
        return this.host.store.rateAuthored({ ...c, sourcePath: current.sourcePath }, rating, Date.now(), () => this.assertIndexCurrent(verifiedFiles, exclusions));
      }
      return this.host.store.rate(c.id, c.revision, rating);
    }, () => {
      if (rating === "again" && !this.repeatPass) this.againCandidates.add(c.id);
      else this.againCandidates.delete(c.id);
      this.undo = { previous: c, revision: c.revision + 1, ...before };
      this.queue.shift();
      this.reviewed++;
      this.advance();
    });
  }
  undoButton(root) {
    const undo = this.undo;
    if (!undo) return;
    this.button(root, "\u64A4\u9500\u4E0A\u6B21\u8BC4\u5206", () => void this.run(() => this.host.store.restoreRating(undo.previous, undo.revision), () => {
      const restored = this.host.store.get(undo.previous.id);
      this.queue = undo.queue.map((c) => c.id === restored.id ? restored : c);
      this.reviewed = undo.reviewed;
      this.sessionTotal = undo.total;
      this.againCandidates = new Set(undo.again);
      this.repeatPass = undo.repeatPass;
      this.undo = void 0;
      this.advance();
    }));
  }
  openSeed(seed) {
    if (this.screen !== "home") {
      new import_obsidian3.Notice("\u8BF7\u5148\u8FD4\u56DE\u5B66\u4E60\uFF0C\u518D\u521B\u5EFA\u65B0\u5361\u7247");
      return;
    }
    this.mode = "cards";
    this.openEditor(void 0, false, seed);
  }
  openEditor(card, insert = false, seed) {
    if (!this.host.store) {
      new import_obsidian3.Notice(this.host.storageError);
      return;
    }
    this.returnScreen = this.screen === "library" ? "library" : this.screen === "card" ? "card" : this.screen === "passage" ? "passage" : "home";
    this.draft = seed ? { ...seed } : card ? { front: card.front, back: card.back, sourcePath: card.sourcePath, sourceRef: card.sourceRef } : { front: "", back: "", sourcePath: "" };
    this.editCard = card;
    this.clozeTerm = "";
    this.relearn = false;
    this.insert = false;
    this.screen = "edit";
    this.render();
  }
  cancelEdit() {
    this.screen = this.returnScreen;
    this.message = "";
    this.render();
  }
  renderEditor(root) {
    root.createEl("h2", { text: this.editCard ? "\u7F16\u8F91\u5361\u7247" : "\u65B0\u5EFA\u5361\u7247", cls: "pp-stage-title" });
    root.createEl("p", { text: "\u4FEE\u6539\u539F\u7B14\u8BB0\u540E\uFF0C\u5DF2\u4FDD\u5B58\u7684\u5361\u7247\u7B54\u6848\u4E0D\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002", cls: "pp-muted" });
    this.field(root, "\u6B63\u9762 \xB7 \u95EE\u9898", this.draft.front, (v) => this.draft.front = v, "\u4F8B\u5982\uFF1A\u6808\u7684\u51FA\u5165\u987A\u5E8F\u662F\u4EC0\u4E48\uFF1F", 4e3);
    this.field(root, "\u80CC\u9762 \xB7 \u7B54\u6848", this.draft.back, (v) => this.draft.back = v, "\u4F8B\u5982\uFF1A\u540E\u8FDB\u5148\u51FA\uFF08LIFO\uFF09\u3002");
    root.createEl("p", { text: `\u6765\u6E90\uFF1A${this.draft.sourcePath || "\u65E0\u6765\u6E90\u7B14\u8BB0"}`, cls: "pp-source-path" });
    if (!this.insert) {
      const cloze = root.createEl("details", { cls: "pp-cloze-editor" });
      cloze.createEl("summary", { text: "\u628A\u5F53\u524D\u7B54\u6848\u4E2D\u7684\u5173\u952E\u8BCD\u6316\u7A7A" });
      const term = cloze.createEl("input", { attr: { "aria-label": "\u8981\u6316\u7A7A\u7684\u5173\u952E\u8BCD", maxlength: "80", placeholder: "\u8F93\u5165\u7B54\u6848\u4E2D\u539F\u6709\u7684\u5173\u952E\u8BCD" } });
      term.value = this.clozeTerm;
      term.addEventListener("input", () => this.clozeTerm = term.value);
      this.button(cloze, "\u751F\u6210\u6316\u7A7A\u8349\u7A3F", () => {
        try {
          const result = makeCloze(this.draft.back, this.clozeTerm, this.draft.front);
          this.draft.front = result.front;
          this.draft.back = result.back;
          this.message = "\u5DF2\u751F\u6210\u6316\u7A7A\u8349\u7A3F\uFF0C\u8BF7\u6838\u5BF9\u540E\u4FDD\u5B58";
        } catch (e) {
          this.message = e.message;
        }
        this.render();
      });
    }
    if (this.editCard) {
      const row = root.createEl("label", { cls: "pp-relearn" }), check = row.createEl("input", { attr: { type: "checkbox" } });
      check.checked = this.relearn;
      check.addEventListener("change", () => this.relearn = check.checked);
      row.createEl("span", { text: "\u7ACB\u5373\u91CD\u65B0\u5B66\u4E60\uFF08\u5230\u671F\u8BBE\u4E3A\u73B0\u5728\uFF0C\u4FDD\u7559\u7D2F\u8BA1\u8BC4\u5206\u6B21\u6570\uFF09" });
    }
    if (this.insert) {
      const syntax = root.createEl("details", { cls: "pp-syntax" });
      syntax.createEl("summary", { text: "\u67E5\u770B\u6807\u8BB0\u65B9\u5F0F" });
      syntax.createEl("pre", { text: "```practice-card\nid: \u81EA\u52A8\u751F\u6210\uFF0C\u65E0\u9700\u624B\u5199\n\u95EE\u9898\uFF1A\n\u8FD9\u91CC\u662F\u6B63\u9762\u7684\u95EE\u9898\n\u7B54\u6848\uFF1A\n\u8FD9\u91CC\u662F\u80CC\u9762\u7684\u7B54\u6848\n```" });
      syntax.createEl("p", { text: "\u4FDD\u7559 id\uFF0C\u95EE\u9898\u4E0E\u7B54\u6848\u53EF\u968F\u65F6\u7F16\u8F91\u3002\u9605\u8BFB\u89C6\u56FE\u4F1A\u663E\u793A\u53CC\u9762\u6807\u7B7E\u3002\u590D\u5236\u5361\u7247\u65F6\u8BF7\u91CD\u65B0\u63D2\u5165\uFF0C\u907F\u514D\u91CD\u590D\u7F16\u53F7\u3002" });
    }
    this.button(root, "\u4FDD\u5B58\u5361\u7247", () => {
      const d = { ...this.draft }, c = this.editCard;
      if (!d.front.trim() || !d.back.trim()) {
        this.message = "\u8BF7\u586B\u5199\u95EE\u9898\u548C\u7B54\u6848";
        this.render();
        return;
      }
      let saved;
      void this.run(async () => {
        saved = c ? await this.host.store.edit(c.id, c.revision, d.front, d.back, Date.now(), this.relearn) : await this.host.store.add(d.front, d.back, d.sourcePath, Date.now(), this.selectedDeck || DEFAULT_DECK, d.sourceRef);
      }, () => {
        this.screen = this.returnScreen;
        if (saved) {
          if (this.returnScreen === "card" && c) {
            this.queue = this.queue.map((x) => x.id === c.id ? saved : x);
            this.undo = void 0;
            this.advance();
          } else if (!c) this.startCards([saved]);
        }
        this.message = "\u5361\u7247\u5DF2\u4FDD\u5B58";
        void this.refresh(true);
      });
    }, true).addClass("pp-wide");
  }
  renderLibrary(root) {
    var _a2, _b, _c;
    const pool = this.cards().cards;
    const known = new Set(this.notes.flatMap((n) => n.cards).map((c) => c.id)), orphaned = (((_a2 = this.host.store) == null ? void 0 : _a2.cards) || []).filter((c) => c.id.startsWith("note:") && !known.has(c.id));
    if (orphaned.length) root.createEl("p", { text: `${orphaned.length} \u6761\u6807\u8BB0\u5361\u7247\u8BB0\u5F55\u4E0D\u5728\u5F53\u524D\u7D22\u5F15\uFF0C\u8BC4\u5206\u4ECD\u4FDD\u7559\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u5220\u9664\u3002`, cls: "pp-footnote" });
    root.createEl("h2", { text: "\u8FD9\u4E2A\u8303\u56F4\u7684\u5361\u7247", cls: "pp-stage-title" });
    this.renderScopeCount(root, pool.length);
    root.createEl("p", { text: "\u6BCF\u6279\u6700\u591A 1,000 \u5F20\u3002\u66F4\u6539\u641C\u7D22\u6216\u7B5B\u9009\u4F1A\u6E05\u7A7A\u9009\u62E9\uFF1B\u7FFB\u9875\u4FDD\u7559\u9009\u62E9\u3002", cls: "pp-footnote" });
    const filters = root.createDiv({ cls: "pp-card-filters" }), search = filters.createEl("input", { cls: "pp-search", attr: { type: "search", "aria-label": "\u641C\u7D22\u5361\u7247", placeholder: "\u641C\u7D22\u95EE\u9898\u3001\u7B54\u6848\u6216\u6765\u6E90" } });
    search.value = this.query;
    const choose = (label2, value, options, change) => {
      const wrap = filters.createEl("label");
      wrap.createEl("span", { text: label2 });
      const select = wrap.createEl("select", { attr: { "aria-label": label2 } });
      for (const [v, name] of options) select.createEl("option", { text: name, attr: { value: v } });
      select.value = value;
      select.addEventListener("change", () => {
        change(select.value);
        this.selectedCards.clear();
        this.bulkReview = null;
        this.cardPage = 0;
        draw();
      });
      return select;
    };
    choose("\u5361\u7247\u72B6\u6001", this.cardStatus, [["all", "\u5168\u90E8\u72B6\u6001"], ["active", "\u590D\u4E60\u4E2D"], ["due", "\u5DF2\u5230\u671F"], ["scheduled", "\u672A\u5230\u671F"], ["suspended", "\u5DF2\u6682\u505C"], ["new", "\u5C1A\u672A\u590D\u4E60"]], (v) => this.cardStatus = v);
    choose("\u5361\u7247\u7C7B\u578B", this.cardType, [["all", "\u5168\u90E8\u7C7B\u578B"], ["snapshot", "\u672C\u5730\u5FEB\u7167"], ["authored", "\u7B14\u8BB0\u6807\u8BB0"]], (v) => this.cardType = v);
    const sources = [...new Set(pool.map((c) => c.sourcePath))].sort();
    if (this.cardSource && !sources.includes(this.cardSource === NO_SOURCE ? "" : this.cardSource)) {
      this.cardSource = "";
      this.selectedCards.clear();
      this.bulkReview = null;
    }
    choose("\u5361\u7247\u6765\u6E90", this.cardSource, [["", "\u5168\u90E8\u6765\u6E90"], ...sources.map((path) => [path || NO_SOURCE, path || "\u65E0\u6765\u6E90\u7B14\u8BB0"])], (v) => this.cardSource = v);
    const membership = root.createDiv({ cls: "pp-actions" }), target = membership.createEl("select", { attr: { "aria-label": "\u52A0\u5165\u5361\u7EC4" } });
    for (const deck of ((_b = this.host.store) == null ? void 0 : _b.decks) || []) target.createEl("option", { text: deck.name, attr: { value: deck.id } });
    this.button(membership, "\u5C06\u6240\u9009\u5361\u7247\u52A0\u5165\u5361\u7EC4", () => {
      const selected = [...this.selectedCards.values()];
      if (!selected.length) {
        this.message = "\u8BF7\u5148\u9009\u62E9\u5361\u7247";
        this.render();
        return;
      }
      void this.run(() => this.host.store.assignDeck(target.value, selected), () => {
        this.selectedCards.clear();
        this.message = "\u5DF2\u4FDD\u5B58\u5361\u7EC4\u5173\u8054";
      });
    });
    const selectedDeck = (_c = this.host.store) == null ? void 0 : _c.decks.find((d) => d.id === this.selectedDeck);
    if (selectedDeck) this.button(membership, "\u4ECE\u5F53\u524D\u5361\u7EC4\u79FB\u51FA\u6240\u9009\u5361\u7247", () => {
      const selected = [...this.selectedCards.values()];
      if (!selected.length) {
        this.message = "\u8BF7\u5148\u9009\u62E9\u5361\u7247";
        this.render();
        return;
      }
      void this.run(() => this.host.store.removeFromDeck(selectedDeck.id, selectedDeck.revision, selected), () => {
        this.selectedCards.clear();
        this.message = "\u5DF2\u79FB\u51FA\u5F53\u524D\u5361\u7EC4\uFF1B\u5361\u7247\u548C\u8BC4\u5206\u4FDD\u7559\uFF0C\u53EF\u5728\u5168\u90E8\u5361\u7EC4\u4E2D\u91CD\u65B0\u52A0\u5165";
      });
    });
    const list = root.createDiv({ cls: "pp-library" });
    const draw = () => {
      list.empty();
      const cards = filterCards(this.cards().cards, { query: this.query, status: this.cardStatus, type: this.cardType, source: this.cardSource }, Date.now()), allowed = new Map(cards.map((c) => [c.id, c]));
      for (const [id, c] of this.selectedCards) if (!allowed.has(id) || !sameCard(c, allowed.get(id))) {
        this.selectedCards.delete(id);
        this.bulkReview = null;
      }
      const page = paginate(cards, this.cardPage);
      this.cardPage = page.page;
      list.createEl("p", { text: `${cards.length} \u5F20\u5339\u914D \xB7 \u5DF2\u9009 ${this.selectedCards.size} \u5F20\uFF08\u8DE8\u9875\uFF09`, cls: "pp-selection-count", attr: { role: "status" } });
      const selectItems = (items) => {
        if (items.length > 1e3) {
          this.message = "\u6BCF\u6279\u6700\u591A 1000 \u5F20\uFF0C\u8BF7\u7F29\u5C0F\u7B5B\u9009\u8303\u56F4";
          this.render();
          return;
        }
        for (const c of items) {
          if (this.selectedCards.size >= 1e3 && !this.selectedCards.has(c.id)) {
            this.message = "\u6BCF\u6279\u6700\u591A 1000 \u5F20";
            break;
          }
          this.selectedCards.set(c.id, c);
        }
        this.bulkReview = null;
        draw();
      };
      const actions = list.createDiv({ cls: "pp-actions" });
      this.button(actions, "\u5168\u9009\u672C\u9875", () => selectItems(page.items)).disabled = !page.items.length || this.busy;
      this.button(actions, `\u9009\u62E9\u5168\u90E8\u5339\u914D ${cards.length} \u5F20`, () => selectItems(cards)).disabled = !cards.length || cards.length > 1e3 || this.busy;
      this.button(actions, "\u6E05\u7A7A\u9009\u62E9", () => {
        this.selectedCards.clear();
        this.bulkReview = null;
        draw();
      }).disabled = !this.selectedCards.size || this.busy;
      for (const [suspended, label2] of [[true, "\u6279\u91CF\u6682\u505C"], [false, "\u6279\u91CF\u6062\u590D"]]) {
        const button = this.button(actions, label2, () => {
          const selected = [...this.selectedCards.values()].filter((c) => c.suspended !== suspended);
          this.bulkReview = { cards: selected, suspended };
          draw();
        });
        button.disabled = ![...this.selectedCards.values()].some((c) => c.suspended !== suspended) || this.busy;
      }
      const review = this.bulkReview;
      if (review) {
        const confirm = list.createDiv({ cls: "pp-bulk-confirm", attr: { role: "region", "aria-label": "\u6838\u5BF9\u6279\u91CF\u64CD\u4F5C" } });
        confirm.createEl("h3", { text: `\u786E\u8BA4${review.suspended ? "\u6682\u505C" : "\u6062\u590D"} ${review.cards.length} \u5F20\uFF1F` });
        confirm.createEl("p", { text: "\u53EA\u5904\u7406\u4E0B\u9762\u5217\u51FA\u7684\u5DF2\u9009\u5361\u7247\uFF1B\u8BC4\u5206\u6B21\u6570\u3001\u95F4\u9694\u548C\u5230\u671F\u65F6\u95F4\u4FDD\u6301\u539F\u503C\u3002\u6062\u590D\u540E\u5DF2\u5230\u671F\u7684\u5361\u7247\u4F1A\u8FDB\u5165\u961F\u5217\u3002" });
        const details = confirm.createEl("details");
        details.createEl("summary", { text: "\u67E5\u770B\u5168\u90E8\u64CD\u4F5C\u5BF9\u8C61\u4E0E\u6765\u6E90" });
        for (const c of review.cards) details.createEl("p", { text: `${c.front} \xB7 ${c.sourcePath || "\u65E0\u6765\u6E90"}` });
        this.button(confirm, "\u53D6\u6D88\u6279\u91CF\u64CD\u4F5C", () => {
          this.bulkReview = null;
          draw();
        });
        this.button(confirm, `\u786E\u8BA4${review.suspended ? "\u6682\u505C" : "\u6062\u590D"} ${review.cards.length} \u5F20`, () => void this.commitBulk(review), true);
      }
      for (const c of page.items) {
        const item = list.createDiv({ cls: "pp-library-card" }), selection = item.createEl("label", { cls: "pp-card-select" }), check = selection.createEl("input", { attr: { type: "checkbox", "aria-label": "\u9009\u62E9\u5361\u7247\uFF1A" + c.front } });
        check.checked = this.selectedCards.has(c.id);
        selection.createEl("span", { text: c.id.startsWith("note:") ? "\u7B14\u8BB0\u6807\u8BB0\u5361\u7247" : "\u672C\u5730\u5FEB\u7167\u5361\u7247" });
        check.addEventListener("change", () => {
          if (this.busy) return;
          if (check.checked) {
            if (this.selectedCards.size >= 1e3) {
              check.checked = false;
              new import_obsidian3.Notice("\u6BCF\u6279\u6700\u591A 1000 \u5F20");
              return;
            }
            this.selectedCards.set(c.id, c);
          } else this.selectedCards.delete(c.id);
          this.bulkReview = null;
          draw();
        });
        item.createEl("h3", { text: c.front });
        item.createEl("p", { text: `${c.suspended ? "\u5DF2\u6682\u505C" : c.dueAt <= Date.now() ? "\u5DF2\u5230\u671F" : "\u5230\u671F " + date(c.dueAt)} \xB7 \u590D\u4E60 ${c.reviews} \u6B21`, cls: "pp-muted" });
        item.createEl("p", { text: c.sourcePath || "\u65E0\u6765\u6E90", cls: "pp-source-path" });
        const row = item.createDiv({ cls: "pp-actions" });
        if (c.id.startsWith("note:")) this.button(row, "\u6253\u5F00\u7B14\u8BB0\u4FEE\u6539", () => void this.openSource(c));
        else {
          this.button(row, "\u7F16\u8F91\u5361\u7247", () => this.openEditor(c));
          if (c.sourcePath) this.button(row, "\u6253\u5F00\u6765\u6E90", () => void this.openSource(c));
          if (c.sourceRef) {
            const status = item.createEl("p", { text: "\u53EF\u6838\u5BF9\u4FDD\u5B58\u65F6\u7684\u6765\u6E90", cls: "pp-footnote" });
            this.button(row, "\u6838\u5BF9\u6765\u6E90", () => void this.checkEvidence(c, status));
          }
        }
        this.button(row, c.suspended ? "\u6062\u590D\u590D\u4E60" : "\u6682\u505C\u590D\u4E60", () => void this.run(() => c.id.startsWith("note:") ? this.host.store.setAuthoredSuspended(c, !c.suspended) : this.host.store.suspend(c.id, c.revision, !c.suspended), () => {
          this.selectedCards.delete(c.id);
          this.bulkReview = null;
        }));
      }
      this.pager(list, page, (change) => {
        this.cardPage = change;
        draw();
      });
      if (!cards.length) list.createEl("p", { text: "\u6CA1\u6709\u5339\u914D\u7684\u5361\u7247\u3002", cls: "pp-empty" });
    };
    search.addEventListener("input", () => {
      this.query = search.value;
      this.cardPage = 0;
      this.selectedCards.clear();
      this.bulkReview = null;
      draw();
    });
    draw();
  }
  async commitBulk(review) {
    let changed = 0;
    await this.run(async () => {
      if (this.bulkReview !== review || !review.cards.length) throw new Error("\u9009\u62E9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      const hasAuthored = review.cards.some((c) => c.id.startsWith("note:"));
      if (hasAuthored && !await this.refresh(true)) throw new Error("\u6765\u6E90\u5237\u65B0\u88AB\u4E2D\u65AD\uFF0C\u672C\u6279\u672A\u4FDD\u5B58");
      const visible = filterCards(this.cards().cards, { query: this.query, status: this.cardStatus, type: this.cardType, source: this.cardSource }, Date.now()), byId = new Map(visible.map((c) => [c.id, c]));
      for (const c of review.cards) if (!byId.has(c.id) || !sameCard(c, byId.get(c.id))) throw new Error("\u6240\u9009\u5361\u7247\u6216\u7B5B\u9009\u7ED3\u679C\u5DF2\u53D8\u5316\uFF0C\u672C\u6279\u672A\u4FDD\u5B58\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");
      const files = this.indexedFiles.map((x) => ({ ...x })), exclusions = [...this.excludedPaths];
      changed = await this.host.store.suspendMany(review.cards, review.suspended, Date.now(), hasAuthored ? () => this.assertIndexCurrent(files, exclusions) : void 0);
    }, () => {
      this.selectedCards.clear();
      this.bulkReview = null;
      this.message = `\u5DF2${review.suspended ? "\u6682\u505C" : "\u6062\u590D"} ${changed} \u5F20\u5361\u7247\uFF0C\u539F\u8BC4\u5206\u4FDD\u7559`;
    });
  }
  async checkEvidence(c, el) {
    const file = this.app.vault.getAbstractFileByPath(c.sourcePath);
    if (!(file instanceof import_obsidian3.TFile)) {
      el.textContent = "\u6765\u6E90\u5DF2\u79FB\u52A8\u6216\u4E0D\u5B58\u5728\uFF1B\u5361\u7247\u548C\u5B66\u4E60\u8FDB\u5EA6\u4ECD\u7136\u4FDD\u7559";
      return;
    }
    try {
      const found = locateEvidence(await this.app.vault.read(file), c.sourceRef.excerpt);
      el.textContent = found.status === "present" ? `\u4FDD\u5B58\u65F6\u7684\u539F\u6587\u4ECD\u5728 \xB7 \u5F53\u524D\u7B2C ${found.line + 1} \u884C` : "\u539F\u6587\u5DF2\u53D8\u5316\uFF0C\u6216\u539F\u53E5\u5DF2\u79FB\u9664\u3002\u8BF7\u6253\u5F00\u6765\u6E90\u6838\u5BF9\uFF1B\u672C\u5361\u7B54\u6848\u4E0E\u5B66\u4E60\u8FDB\u5EA6\u4FDD\u6301\u4E0D\u53D8\u3002";
    } catch (e) {
      el.textContent = "\u6765\u6E90\u8BFB\u53D6\u5931\u8D25\uFF0C\u5361\u7247\u548C\u8FDB\u5EA6\u672A\u6539\u52A8";
    }
  }
  async revealSource(source, current) {
    await this.run(async () => {
      if (!current()) return;
      await this.locateSource(source, () => !this.closed && current());
    }, () => {
    });
  }
  async locateSource(source, current = () => !this.closed) {
    const path = "sourcePath" in source ? source.sourcePath : source.path, file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile)) throw new Error("\u6765\u6E90\u7B14\u8BB0\u5DF2\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u8FD4\u56DE\u5B66\u4E60\u540E\u5237\u65B0\u3002");
    const mtime = file.stat.mtime, size = file.stat.size, text2 = await this.app.vault.read(file);
    if (!current()) return;
    if (this.app.vault.getAbstractFileByPath(path) !== file || file.path !== path || file.stat.mtime !== mtime || file.stat.size !== size) throw new Error("\u6765\u6E90\u6B63\u5728\u53D8\u5316\uFF0C\u8BF7\u7A0D\u540E\u91CD\u65B0\u63ED\u6653\u3002");
    const line = "sourcePath" in source ? resolveCardSourceLine(text2, source) : resolvePassageSourceLine(text2, source);
    const leaves = this.app.workspace.getLeavesOfType("markdown").filter((leaf2) => leaf2.view.containerEl.closest(".mod-root"));
    const leaf = leaves.find((l) => {
      var _a2;
      return ((_a2 = l.view.file) == null ? void 0 : _a2.path) === path;
    }) || leaves.find((l) => {
      var _a2;
      return ((_a2 = l.view.file) == null ? void 0 : _a2.path) === this.host.currentPath;
    }) || leaves[0] || this.app.workspace.getLeaf("tab");
    if (!current()) return;
    await leaf.openFile(file, { active: true, eState: { line } });
    if (current()) leaf.setEphemeralState({ line });
  }
  async openSource(c) {
    try {
      await this.locateSource(c);
    } catch (e) {
      new import_obsidian3.Notice(e instanceof Error ? e.message : "\u65E0\u6CD5\u6253\u5F00\u6765\u6E90\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
    }
  }
};

// src/card-modal.ts
var import_obsidian4 = require("obsidian");
var labels = { again: "\u5FD8\u4E86", hard: "\u56F0\u96BE", good: "\u8BB0\u4F4F\u4E86", easy: "\u8F7B\u677E" };
var date2 = (n) => new Date(n).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
var CardsModal = class extends import_obsidian4.Modal {
  constructor(app, store, done, seed) {
    super(app);
    this.store = store;
    this.done = done;
    this.seed = seed;
    __publicField(this, "previews", new MarkdownPreviewScope(this.app));
    __publicField(this, "mode");
    __publicField(this, "busy", false);
    __publicField(this, "closed", false);
    __publicField(this, "message", "");
    __publicField(this, "revealed", false);
    __publicField(this, "recall", "");
    __publicField(this, "query", "");
    __publicField(this, "reviewOrder", "sequential");
    __publicField(this, "queue", []);
    __publicField(this, "reviewed", 0);
    __publicField(this, "sessionTotal", 0);
    __publicField(this, "current");
    __publicField(this, "editCard");
    __publicField(this, "draft");
    __publicField(this, "returnMode", "home");
    __publicField(this, "undo");
    this.mode = seed ? "edit" : "home";
    this.draft = seed ? { ...seed, ...seed.sourceRef ? { sourceRef: structuredClone(seed.sourceRef) } : {} } : { front: "", back: "", sourcePath: "" };
  }
  onOpen() {
    this.containerEl.addClass("pp-screen");
    this.modalEl.addClass("pp-modal");
    this.modalEl.addClass("pp-cards-modal");
    this.render();
  }
  close() {
    if (this.busy) {
      new import_obsidian4.Notice("\u6B63\u5728\u4FDD\u5B58\uFF0C\u8BF7\u7A0D\u5019\uFF1B\u5B8C\u6210\u540E\u53EF\u4EE5\u5173\u95ED\u3002");
      return;
    }
    super.close();
  }
  closeForUnload() {
    super.close();
  }
  onClose() {
    this.closed = true;
    this.previews.reset();
    this.contentEl.empty();
    this.done();
  }
  button(el, text2, action, primary = false) {
    const b = el.createEl("button", { text: text2, cls: primary ? "pp-primary" : "pp-secondary" });
    b.type = "button";
    b.disabled = this.busy;
    b.addEventListener("click", () => {
      if (!this.busy && !this.closed) action();
    });
    return b;
  }
  field(el, label2, value, set, max) {
    const wrap = el.createEl("label", { cls: "pp-field" });
    wrap.createEl("span", { text: label2 });
    const input = wrap.createEl("textarea", { attr: { "aria-label": label2, maxlength: String(max) } });
    input.value = value;
    input.disabled = this.busy;
    input.addEventListener("input", () => set(input.value));
    return input;
  }
  async run(action, success) {
    if (this.busy || this.closed) return;
    this.busy = true;
    this.message = "";
    this.contentEl.querySelectorAll("button,textarea,input").forEach((b) => b.disabled = true);
    this.contentEl.setAttribute("aria-busy", "true");
    try {
      await action();
      this.busy = false;
      if (!this.closed) success();
    } catch (e) {
      this.message = e instanceof Error ? e.message : "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u4ED3\u5E93\u5199\u5165\u6743\u9650\u540E\u91CD\u8BD5\u3002";
      if (this.closed) new import_obsidian4.Notice("\u5361\u7247\u4FDD\u5B58\u5931\u8D25\u3002\u8BF7\u91CD\u65B0\u542F\u7528\u63D2\u4EF6\u5E76\u68C0\u67E5\u5199\u5165\u6743\u9650\u3002", 1e4);
    } finally {
      this.busy = false;
      if (!this.closed) this.render();
    }
  }
  navigation(mode) {
    this.mode = mode;
    this.message = "";
    this.current = void 0;
    this.revealed = false;
    this.recall = "";
    this.render();
  }
  render() {
    this.previews.reset();
    const root = this.contentEl;
    root.empty();
    root.setAttribute("aria-busy", String(this.busy));
    const top = root.createDiv({ cls: "pp-top" });
    top.createEl("span", { text: "\u56DE\u60F3\u7EC3\u4E60 / \u590D\u4E60\u5361\u7247", cls: "pp-brand" });
    top.createEl("span", { text: "\u672C\u5730\u4FDD\u5B58 \xB7 \u95F4\u9694\u590D\u4E60", cls: "pp-step" });
    const body = root.createDiv({ cls: "pp-body pp-flash-body" });
    if (this.message) body.createEl("p", { text: this.message, cls: "pp-error", attr: { role: "alert" } });
    if (this.mode === "home") this.home(body);
    else if (this.mode === "library") this.library(body);
    else if (this.mode === "edit") this.editor(body);
    else this.review(body);
    const bottom = root.createDiv({ cls: "pp-bottom" });
    bottom.createEl("span", { text: "\u539F\u7B14\u8BB0\u4E0D\u6539\u52A8 \xB7 \u624B\u5DE5\u81EA\u8BC4 \xB7 \u95F4\u9694\u590D\u4E60" });
    this.button(bottom, "\u5173\u95ED\u5361\u7247", () => this.close());
    const heading = body.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  home(body) {
    const cards = this.store.cards, now = Date.now(), due = dueCards([...cards], now), active = cards.filter((c) => !c.suspended), today = new Date(now).toDateString(), reviewed = cards.filter((c) => c.lastReviewedAt !== null && new Date(c.lastReviewedAt).toDateString() === today).length;
    body.createEl("p", { text: "\u6BCF\u5929\u4E00\u70B9\uFF0C\u7559\u4F4F\u8BB0\u5FC6", cls: "pp-eyebrow" });
    body.createEl("h1", { text: due.length ? "\u5230\u65F6\u95F4\uFF0C\u60F3\u4E00\u60F3" : cards.length ? "\u8FD9\u4E00\u523B\uFF0C\u6CA1\u6709\u5230\u671F\u5361\u7247" : "\u4ECE\u7B2C\u4E00\u5F20\u5361\u7247\u5F00\u59CB" });
    body.createEl("p", { text: cards.length ? "\u5148\u56DE\u5FC6\uFF0C\u518D\u63ED\u6653\uFF0C\u6700\u540E\u6309\u771F\u5B9E\u611F\u53D7\u5B89\u6392\u4E0B\u4E00\u6B21\u3002" : "\u5728\u7B14\u8BB0\u91CC\u9009\u4E2D\u4E00\u6BB5\uFF0C\u53F3\u952E\u300C\u5236\u6210\u590D\u4E60\u5361\u7247\u300D\uFF1B\u4E5F\u53EF\u4EE5\u5728\u8FD9\u91CC\u624B\u52A8\u521B\u5EFA\u3002", cls: "pp-muted" });
    const stats = body.createDiv({ cls: "pp-stats" });
    for (const [count, label2] of [[due.length, "\u5F53\u524D\u5230\u671F"], [reviewed, "\u4ECA\u5929\u590D\u4E60\u8FC7"], [active.length, "\u542F\u7528\u5361\u7247"]]) {
      const tile = stats.createDiv();
      tile.createEl("strong", { text: String(count) });
      tile.createEl("span", { text: label2 });
    }
    const order = body.createEl("select", { attr: { "aria-label": "\u590D\u4E60\u987A\u5E8F" } });
    for (const [value, text2] of [["sequential", "\u987A\u5E8F\u590D\u4E60"], ["random", "\u4E71\u5E8F\u590D\u4E60"]]) order.createEl("option", { text: text2, attr: { value } });
    order.value = this.reviewOrder;
    order.addEventListener("change", () => this.reviewOrder = order.value);
    const row = body.createDiv({ cls: "pp-actions" });
    if (due.length) this.button(row, `\u5F00\u59CB\u590D\u4E60 ${due.length} \u5F20`, () => {
      this.queue = sessionOrder(due, this.reviewOrder).map((c) => c.id);
      this.reviewed = 0;
      this.sessionTotal = due.length;
      this.undo = void 0;
      this.mode = "review";
      this.advance();
    }, true);
    else this.button(row, "\u5237\u65B0\u5230\u671F\u961F\u5217", () => this.render());
    this.button(row, "\u65B0\u5EFA\u5361\u7247", () => this.edit());
    this.button(row, `\u5361\u7247\u5E93 \xB7 ${cards.length}`, () => this.navigation("library"));
    const next = active.filter((c) => c.dueAt > now).sort((a, b) => a.dueAt - b.dueAt)[0];
    if (next) body.createEl("p", { text: `\u4E0B\u6B21\u5230\u671F\uFF1A${date2(next.dueAt)}\u3002\u5230\u671F\u540E\u70B9\u51FB\u5237\u65B0\u6216\u91CD\u65B0\u6253\u5F00\u3002`, cls: "pp-footnote" });
    if (cards.some((c) => c.suspended)) body.createEl("p", { text: `${cards.filter((c) => c.suspended).length} \u5F20\u5DF2\u6682\u505C\uFF0C\u53EF\u5728\u5361\u7247\u5E93\u6062\u590D\u3002`, cls: "pp-footnote" });
  }
  edit(card) {
    this.returnMode = this.mode === "review" ? "review" : this.mode === "library" ? "library" : "home";
    this.editCard = card;
    this.draft = card ? { front: card.front, back: card.back, sourcePath: card.sourcePath } : { front: "", back: "", sourcePath: "" };
    this.mode = "edit";
    this.message = "";
    this.render();
  }
  editor(body) {
    body.createEl("p", { text: this.editCard ? "\u4FDD\u7559\u539F\u6709\u590D\u4E60\u8FDB\u5EA6" : "\u4E00\u5F20\u5361\u7247\uFF0C\u4E00\u4E2A\u8981\u70B9", cls: "pp-eyebrow" });
    body.createEl("h1", { text: this.editCard ? "\u7F16\u8F91\u590D\u4E60\u5361\u7247" : "\u5236\u6210\u590D\u4E60\u5361\u7247" });
    body.createEl("p", { text: "\u6B63\u9762\u53EA\u653E\u95EE\u9898\uFF0C\u80CC\u9762\u653E\u5B8C\u6574\u7B54\u6848\u3002\u4FDD\u5B58\u7684\u662F\u5FEB\u7167\uFF0C\u4E4B\u540E\u4FEE\u6539\u7B14\u8BB0\u4E0D\u4F1A\u81EA\u52A8\u540C\u6B65\u3002", cls: "pp-muted" });
    const f = this.field(body, "\u6B63\u9762 \xB7 \u95EE\u9898", this.draft.front, (v) => this.draft.front = v, 4e3);
    f.classList.add("pp-question-input");
    this.field(body, "\u80CC\u9762 \xB7 \u7B54\u6848", this.draft.back, (v) => this.draft.back = v, 5e4);
    if (this.draft.sourcePath) body.createEl("p", { text: `\u6765\u6E90\uFF1A${this.draft.sourcePath}`, cls: "pp-footnote" });
    const row = body.createDiv({ cls: "pp-actions" });
    this.button(row, "\u4FDD\u5B58\u5361\u7247", () => {
      const d = { ...this.draft }, c = this.editCard;
      if (!d.front.trim() || !d.back.trim()) {
        this.message = "\u8BF7\u586B\u5199\u95EE\u9898\u548C\u7B54\u6848\u540E\u518D\u4FDD\u5B58\u3002";
        this.render();
        return;
      }
      if (d.front.length > 4e3 || d.back.length > 5e4) {
        this.message = "\u95EE\u9898\u6700\u591A 4,000 \u5B57\u7B26\uFF0C\u7B54\u6848\u6700\u591A 50,000 \u5B57\u7B26\u3002";
        this.render();
        return;
      }
      void this.run(() => c ? this.store.edit(c.id, c.revision, d.front, d.back) : this.store.add(d.front, d.back, d.sourcePath, Date.now(), void 0, d.sourceRef), () => {
        if (this.seed) {
          this.close();
          return;
        }
        if (this.returnMode === "review") {
          this.current = this.current ? this.store.get(this.current.id) : void 0;
          this.revealed = false;
          this.recall = "";
        }
        this.mode = this.returnMode;
        this.message = "\u5361\u7247\u5DF2\u4FDD\u5B58";
      });
    }, true);
    this.button(row, "\u53D6\u6D88", () => {
      if (this.seed) this.close();
      else {
        this.mode = this.returnMode;
        this.message = "";
        this.render();
      }
    });
    body.createEl("p", { text: this.editCard ? "\u7F16\u8F91\u4E0D\u4F1A\u91CD\u7F6E\u5230\u671F\u65F6\u95F4\uFF1B\u5982\u679C\u6682\u65F6\u4E0D\u60F3\u590D\u4E60\uFF0C\u53EF\u5728\u5361\u7247\u5E93\u6682\u505C\u3002" : "\u65B0\u5361\u4FDD\u5B58\u540E\u7ACB\u5373\u8FDB\u5165\u5230\u671F\u961F\u5217\u3002\u76F8\u540C\u6765\u6E90\u3001\u95EE\u9898\u4E0E\u7B54\u6848\u4E0D\u4F1A\u91CD\u590D\u521B\u5EFA\u3002", cls: "pp-footnote" });
  }
  library(body) {
    body.createEl("p", { text: "\u6574\u7406\u95EE\u9898\uFF0C\u4E5F\u6574\u7406\u8BB0\u5FC6", cls: "pp-eyebrow" });
    body.createEl("h1", { text: "\u5361\u7247\u5E93" });
    const search = body.createEl("input", { cls: "pp-search", attr: { type: "search", "aria-label": "\u641C\u7D22\u5361\u7247", placeholder: "\u641C\u7D22\u95EE\u9898\u6216\u7B54\u6848" } });
    search.value = this.query;
    const list = body.createDiv({ cls: "pp-library" });
    const draw = () => {
      list.empty();
      const query = this.query.trim().toLocaleLowerCase(), cards = this.store.cards.filter((c) => !query || `${c.front}
${c.back}`.toLocaleLowerCase().includes(query));
      list.createEl("p", { text: `${cards.length} \u5F20\u5361\u7247`, cls: "pp-muted" });
      if (!cards.length) list.createEl("p", { text: query ? "\u6CA1\u6709\u5339\u914D\u7684\u5361\u7247\uFF0C\u6362\u4E00\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002" : "\u8FD8\u6CA1\u6709\u5361\u7247\uFF0C\u70B9\u51FB\u4E0B\u65B9\u300C\u65B0\u5EFA\u5361\u7247\u300D\u3002", cls: "pp-muted" });
      for (const card of cards) {
        const item = list.createDiv({ cls: "pp-library-card" });
        item.createEl("h2", { text: card.front });
        item.createEl("p", { text: card.suspended ? "\u5DF2\u6682\u505C \xB7 \u968F\u65F6\u53EF\u6062\u590D" : `${card.dueAt <= Date.now() ? "\u5DF2\u5230\u671F" : "\u5230\u671F " + date2(card.dueAt)} \xB7 \u5DF2\u590D\u4E60 ${card.reviews} \u6B21`, cls: "pp-muted" });
        const row2 = item.createDiv({ cls: "pp-actions" });
        this.button(row2, "\u7F16\u8F91", () => this.edit(card));
        this.button(row2, card.suspended ? "\u6062\u590D\u590D\u4E60" : "\u6682\u505C\u590D\u4E60", () => void this.run(() => this.store.suspend(card.id, card.revision, !card.suspended), () => {
          this.message = card.suspended ? "\u5DF2\u6062\u590D\uFF0C\u5230\u671F\u5361\u7247\u53EF\u91CD\u65B0\u590D\u4E60" : "\u5DF2\u6682\u505C\uFF0C\u590D\u4E60\u8FDB\u5EA6\u4FDD\u7559";
        }));
      }
    };
    search.addEventListener("input", () => {
      this.query = search.value;
      draw();
    });
    draw();
    const row = body.createDiv({ cls: "pp-actions" });
    this.button(row, "\u8FD4\u56DE\u4ECA\u65E5\u590D\u4E60", () => this.navigation("home"));
    this.button(row, "\u65B0\u5EFA\u5361\u7247", () => this.edit(), true);
  }
  advance() {
    this.current = void 0;
    while (this.queue.length) {
      const c = this.store.get(this.queue[0]);
      if (c && !c.suspended && c.dueAt <= Date.now()) {
        this.current = c;
        break;
      }
      this.queue.shift();
    }
    this.revealed = false;
    this.recall = "";
    this.render();
  }
  review(body) {
    const c = this.current;
    body.createEl("p", { text: `\u672C\u8F6E\u5DF2\u5B8C\u6210 ${this.reviewed} / ${this.sessionTotal}`, cls: "pp-eyebrow" });
    if (!c) {
      body.createEl("h1", { text: "\u8FD9\u4E00\u8F6E\uFF0C\u5B8C\u6210\u4E86" });
      body.createEl("p", { text: `\u5DF2\u5B89\u6392 ${this.reviewed} \u5F20\u5361\u7247\u7684\u4E0B\u6B21\u590D\u4E60\u3002\u53EF\u4EE5\u5B89\u5FC3\u505C\u5728\u8FD9\u91CC\u3002`, cls: "pp-muted" });
      const next = this.store.cards.filter((c2) => !c2.suspended && c2.dueAt > Date.now()).sort((a, b) => a.dueAt - b.dueAt)[0];
      if (next) body.createEl("p", { text: `\u4E0B\u6B21\u5230\u671F\uFF1A${date2(next.dueAt)}`, cls: "pp-footnote" });
      const row2 = body.createDiv({ cls: "pp-actions" });
      this.button(row2, "\u8FD4\u56DE\u4ECA\u65E5\u590D\u4E60", () => this.navigation("home"), true);
      this.undoButton(row2);
      return;
    }
    body.createEl("h1", { text: this.revealed ? "\u5BF9\u7167\u7B54\u6848\uFF0C\u8BDA\u5B9E\u81EA\u8BC4" : "\u5148\u56DE\u5FC6\uFF0C\u518D\u63ED\u6653" });
    this.previews.mount(body, c.front, c.sourcePath);
    if (!this.revealed) {
      const input = this.field(body, "\u6211\u7684\u56DE\u5FC6\uFF08\u53EF\u9009\uFF09", this.recall, (v) => this.recall = v, 5e4);
      input.placeholder = "\u53EF\u4EE5\u9ED8\u60F3\uFF0C\u4E5F\u53EF\u4EE5\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u4E0B\u6765\u2026\u2026";
      const row2 = body.createDiv({ cls: "pp-actions" });
      this.button(row2, "\u63ED\u6653\u7B54\u6848", () => {
        this.revealed = true;
        this.render();
      }, true);
      this.undoButton(row2);
      body.createEl("p", { text: "\u7B54\u6848\u63ED\u6653\u524D\u4E0D\u4F1A\u663E\u793A\u3002\u60F3\u4E0D\u8D77\u6765\u4E5F\u53EF\u4EE5\u7EE7\u7EED\u3002", cls: "pp-footnote" });
    } else {
      const card = body.createDiv({ cls: "pp-flash-answer" });
      card.createEl("h2", { text: "\u80CC\u9762 \xB7 \u7B54\u6848" });
      this.previews.mount(card, c.back, c.sourcePath);
      if (this.recall) {
        const own2 = body.createDiv({ cls: "pp-own-recall" });
        own2.createEl("h2", { text: "\u6211\u7684\u56DE\u5FC6" });
        this.previews.mount(own2, this.recall, c.sourcePath);
      }
      const row2 = body.createDiv({ cls: "pp-ratings" }), now = Date.now();
      for (const rating of ["again", "hard", "good", "easy"]) {
        const next = applyRating(c, rating, now, this.store.schedulingAlgorithm, srHistogram(this.store.cards, now));
        const b = this.button(row2, "", () => {
          void this.run(() => this.store.rate(c.id, c.revision, rating), () => {
            this.undo = { previous: c, revision: c.revision + 1 };
            this.queue.shift();
            this.reviewed++;
            this.advance();
          });
        }, rating === "good");
        const label2 = next.sr ? next.intervalDays === 0 ? "\u4ECA\u5929" : `${next.intervalDays} \u5929\u540E` : `${intervalLabel(next.dueAt, now)}\u540E`;
        b.setAttribute("aria-label", `${labels[rating]} \xB7 ${label2}`);
        b.createEl("strong", { text: labels[rating] });
        b.createEl("span", { text: label2 });
      }
      body.createEl("p", { text: "\u6309\u8BB0\u5FC6\u611F\u53D7\u9009\u62E9\uFF1B\u8FD9\u4E0D\u662F\u6B63\u786E\u6027\u81EA\u52A8\u8BC4\u5206\u3002\u53EA\u6709\u9009\u62E9\u540E\u624D\u4FDD\u5B58\u672C\u6B21\u8FDB\u5EA6\u3002", cls: "pp-footnote" });
    }
    const row = body.createDiv({ cls: "pp-actions pp-review-secondary" });
    if (this.revealed) this.button(row, "\u7F16\u8F91\u8FD9\u5F20\u5361\u7247", () => this.edit(c));
    this.button(row, "\u6682\u505C\u8FD9\u5F20\u5361\u7247", () => void this.run(() => this.store.suspend(c.id, c.revision, true), () => {
      this.queue.shift();
      this.sessionTotal--;
      this.advance();
    }));
    this.button(row, "\u7ED3\u675F\u672C\u8F6E", () => this.navigation("home"));
  }
  undoButton(row) {
    const undo = this.undo;
    if (!undo) return;
    this.button(row, "\u64A4\u9500\u4E0A\u6B21\u8BC4\u5206", () => void this.run(() => this.store.restoreRating(undo.previous, undo.revision), () => {
      this.queue = this.queue.filter((id) => id !== undo.previous.id);
      this.queue.unshift(undo.previous.id);
      this.reviewed = Math.max(0, this.reviewed - 1);
      this.undo = void 0;
      this.advance();
    }));
  }
};

// src/main.ts
var PracticeModal = class extends import_obsidian5.Modal {
  constructor(app, source, fallback, sourceFile, sourcePath, done, makeCard) {
    super(app);
    this.sourceFile = sourceFile;
    this.sourcePath = sourcePath;
    this.done = done;
    this.makeCard = makeCard;
    __publicField(this, "previews", new MarkdownPreviewScope(this.app));
    __publicField(this, "session");
    __publicField(this, "saving", false);
    __publicField(this, "saved", false);
    __publicField(this, "closed", false);
    __publicField(this, "compareHighlights", true);
    this.session = new Session(source, fallback);
  }
  onOpen() {
    this.containerEl.addClass("pp-screen");
    this.modalEl.addClass("pp-modal");
    this.render();
  }
  onClose() {
    this.closed = true;
    this.previews.reset();
    this.contentEl.empty();
    this.done();
  }
  button(parent, text2, action, primary = false) {
    const b = parent.createEl("button", { text: text2, cls: primary ? "pp-primary" : "pp-secondary" });
    b.type = "button";
    b.addEventListener("click", action);
    return b;
  }
  textArea(parent, label2, value, onInput, placeholder = "") {
    const wrap = parent.createEl("label", { cls: "pp-field" });
    wrap.createEl("span", { text: label2 });
    const input = wrap.createEl("textarea", { attr: { placeholder, "aria-label": label2 } });
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }
  render() {
    this.previews.reset();
    const s = this.session, root = this.contentEl;
    root.empty();
    const top = root.createDiv({ cls: "pp-top" });
    top.createEl("span", { text: "\u56DE\u60F3\u7EC3\u4E60", cls: "pp-brand" });
    top.createEl("span", { text: `${String(s.rounds.length + 1).padStart(2, "0")} / ${s.stage === "question" ? "\u51C6\u5907" : s.stage === "recall" ? "\u56DE\u5FC6" : "\u5BF9\u7167"}`, cls: "pp-step" });
    const body = root.createDiv({ cls: "pp-body" });
    body.createEl("p", { text: s.stage === "question" ? "\u4ECE\u4E00\u5C0F\u6BB5\u5F00\u59CB" : s.stage === "recall" ? "\u7ED9\u8BB0\u5FC6\u4E00\u70B9\u7A7A\u95F4" : "\u770B\u89C1\u5DEE\u8DDD\uFF0C\u518D\u7EC3\u4E00\u6B21", cls: "pp-eyebrow" });
    body.createEl("h1", { text: s.stage === "question" ? "\u4F60\u60F3\u95EE\u81EA\u5DF1\u4EC0\u4E48\uFF1F" : s.stage === "recall" ? s.rounds.length ? "\u53EA\u56DE\u5FC6\u521A\u624D\u7684\u6F0F\u70B9" : "\u5148\u4E0D\u770B\uFF0C\u8BD5\u7740\u56DE\u5FC6" : "\u81EA\u5DF1\u5BF9\u7167\uFF0C\u81EA\u5DF1\u5224\u65AD" });
    body.createEl("p", { text: s.stage === "question" ? "\u9898\u76EE\u5DF2\u53D6\u81EA\u6700\u8FD1\u6807\u9898\uFF0C\u53EF\u76F4\u63A5\u5F00\u59CB\u3002\u9898\u76EE\u4E2D\u82E5\u542B\u7B54\u6848\uFF0C\u5EFA\u8BAE\u6539\u5199\u3002" : s.stage === "recall" ? `\u539F\u6587\u5DF2\u906E\u4F4F${s.rounds.length ? ` \xB7 \u672C\u8F6E ${s.rounds.at(-1).missed.length} \u4E2A\u6F0F\u70B9` : ""}\u3002\u4E0D\u5FC5\u5B8C\u6574\uFF0C\u5148\u5199\u4E0B\u8BB0\u5F97\u7684\u3002` : "\u4E0D\u81EA\u52A8\u8BC4\u5206\u3002\u628A\u9700\u8981\u518D\u7EC3\u7684\u8981\u70B9\u5199\u5728\u4E0B\u9762\uFF0C\u6BCF\u884C\u4E00\u6761\u3002", cls: "pp-muted" });
    if (s.stage === "question") {
      const q = this.textArea(body, "\u81EA\u95EE\u7684\u95EE\u9898", s.question, (v) => s.question = v);
      q.classList.add("pp-question-input");
      const row = body.createDiv({ cls: "pp-actions" });
      this.button(row, "\u906E\u4F4F\u539F\u6587\uFF0C\u5F00\u59CB\u56DE\u5FC6", () => {
        s.start(s.question);
        this.render();
      }, true);
      this.button(row, "\u8DF3\u8FC7\uFF0C\u4F7F\u7528\u6807\u9898", () => {
        s.start(s.fallback);
        this.render();
      });
    } else if (s.stage === "recall") {
      body.createEl("p", { text: s.question, cls: "pp-question" });
      const a = this.textArea(body, "\u6211\u7684\u56DE\u5FC6", s.recall, (v) => s.recall = v, "\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u4E0B\u6765\u2026\u2026");
      a.classList.add("pp-recall");
      const row = body.createDiv({ cls: "pp-actions" });
      this.button(row, "\u63ED\u6653\u5E76\u5BF9\u7167", () => {
        s.reveal();
        this.render();
      }, true);
      body.createEl("p", { text: "\u60F3\u4E0D\u8D77\u6765\u4E5F\u53EF\u4EE5\u63ED\u6653\uFF1B\u7A7A\u767D\u4E0D\u4F1A\u88AB\u5224\u9519\u3002", cls: "pp-footnote" });
      a.focus();
    } else {
      body.createEl("p", { text: s.question, cls: "pp-question" });
      mountComparison(
        body.createDiv({ cls: "pp-comparison" }),
        s.target,
        s.recall,
        s.rounds.length ? "\u672C\u8F6E\u6F0F\u70B9\u7B54\u6848" : "\u539F\u59CB\u9009\u6BB5",
        this.compareHighlights,
        (value) => this.compareHighlights = value,
        (parent, text2, onReady) => {
          var _a2;
          return this.previews.mount(parent, text2, ((_a2 = this.sourceFile) == null ? void 0 : _a2.path) || this.sourcePath, onReady);
        }
      );
      const m = this.textArea(body, "\u6211\u6F0F\u6389\u7684\u8981\u70B9\uFF08\u6BCF\u884C\u4E00\u6761\uFF09", s.missed, (v) => {
        s.missed = v;
        retry.disabled = !s.points().length;
      }, "\u53EF\u4EE5\u590D\u5236\u4E0A\u65B9\u539F\u6587\u4E2D\u7684\u8981\u70B9\uFF0C\u4E5F\u53EF\u4EE5\u81EA\u5DF1\u6982\u62EC\u3002");
      m.classList.add("pp-missed");
      const row = body.createDiv({ cls: "pp-actions" });
      const retry = this.button(row, "\u53EA\u7EC3\u8FD9\u4E9B\u6F0F\u70B9", () => {
        if (s.retry()) this.render();
      }, true);
      retry.disabled = !s.points().length;
      const save = this.button(row, this.saved ? "\u5DF2\u4FDD\u5B58\u65B0\u590D\u4E60\u7B14\u8BB0" : "\u4FDD\u5B58\u4E3A\u65B0\u590D\u4E60\u7B14\u8BB0", () => void this.save(save));
      save.disabled = this.saving || this.saved;
      if (this.makeCard) this.button(row, "\u5236\u6210\u590D\u4E60\u5361\u7247", () => {
        var _a2, _b;
        return this.makeCard({ front: s.question, back: s.target, sourcePath: ((_a2 = this.sourceFile) == null ? void 0 : _a2.path) || this.sourcePath, sourceRef: passageSourceRef({ text: s.source, question: s.fallback, path: ((_b = this.sourceFile) == null ? void 0 : _b.path) || this.sourcePath, line: 0, kind: "selection" }) });
      });
      body.createEl("p", { text: "\u4FDD\u5B58\u7B14\u8BB0\u6216\u5361\u7247\u624D\u4F1A\u5199\u5165\uFF1B\u7ED3\u675F\u6216 Esc \u4E0D\u4FDD\u5B58\u4E34\u65F6\u7EC3\u4E60\u3002\u4F7F\u7528\u672C\u6B21\u5F00\u59CB\u65F6\u7684\u5FEB\u7167\u3002", cls: "pp-footnote" });
    }
    const bottom = root.createDiv({ cls: "pp-bottom" });
    bottom.createEl("span", { text: "\u4E34\u65F6\u7EC3\u4E60 \xB7 \u624B\u5DE5\u81EA\u6D4B \xB7 \u539F\u7B14\u8BB0\u4E0D\u6539\u52A8" });
    this.button(bottom, "\u7ED3\u675F\u7EC3\u4E60", () => this.close());
  }
  async save(button) {
    var _a2;
    if (this.saving || this.saved || this.closed) return;
    this.saving = true;
    button.disabled = true;
    button.textContent = "\u6B63\u5728\u4FDD\u5B58\u2026";
    try {
      const sourcePath = ((_a2 = this.sourceFile) == null ? void 0 : _a2.path) || this.sourcePath;
      const path = await createReview((p, t) => this.app.vault.create(p, t), (p) => !!this.app.vault.getAbstractFileByPath(p), reviewNote(this.session, sourcePath, (/* @__PURE__ */ new Date()).toISOString()));
      this.saved = true;
      new import_obsidian5.Notice(`\u5DF2\u65B0\u5EFA\uFF1A${path}`);
    } catch (e) {
      new import_obsidian5.Notice("\u4FDD\u5B58\u5931\u8D25\uFF0C\u7EC3\u4E60\u4ECD\u5728\u3002\u8BF7\u68C0\u67E5\u4ED3\u5E93\u5199\u5165\u6743\u9650\u540E\u91CD\u8BD5\u3002");
    } finally {
      this.saving = false;
      if (!this.closed) this.render();
    }
  }
};
var PassagePractice = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "store", null);
    __publicField(this, "locations", null);
    __publicField(this, "locationError", "");
    __publicField(this, "storageError", "");
    __publicField(this, "currentPath", "");
    __publicField(this, "lastMarkdown", null);
    __publicField(this, "opening", null);
    __publicField(this, "refreshTimer");
  }
  async onload() {
    var _a2;
    const locationPath = `${this.manifest.dir}/practice-location.json`;
    try {
      const raw = await this.app.vault.adapter.exists(locationPath) ? JSON.parse(await this.app.vault.adapter.read(locationPath)) : { version: 1 };
      this.locations = new LocationStore(raw, (value) => this.app.vault.adapter.write(locationPath, JSON.stringify(value, null, 2)));
    } catch (e) {
      this.locationError = "\u4E0A\u6B21\u4F4D\u7F6E\u65E0\u6CD5\u5B89\u5168\u8BFB\u53D6\uFF0C\u4F4D\u7F6E\u4FDD\u5B58\u5DF2\u505C\u7528\uFF1B\u8BF7\u4FDD\u7559\u539F\u6587\u4EF6\u540E\u68C0\u67E5\u3002\u5361\u7247\u4E0E\u4E34\u65F6\u7EC3\u4E60\u4E0D\u53D7\u5F71\u54CD\u3002";
      new import_obsidian5.Notice(this.locationError, 1e4);
    }
    try {
      const legacyPath = `${this.manifest.dir}/data.json`, adapter = this.app.vault.adapter;
      const legacy = await adapter.exists("Passage Practice") ? null : await adapter.exists(legacyPath) ? await adapter.read(legacyPath) : null;
      const storage = await VaultJsonStorage.open(adapter, legacy, (value) => normalizeStudyData(value));
      if (storage.readOnly) throw new Error(storage.problem || "\u5B58\u50A8\u53EA\u8BFB");
      const initial = storage.data || normalizeStudyData(null);
      if (storage.source !== "vault") await storage.persist(initial);
      this.store = new CardStore(initial, (data) => storage.persist(data));
    } catch (e) {
      this.storageError = "\u5361\u7247\u5199\u5165\u5DF2\u505C\u7528\uFF1A" + (e instanceof Error ? e.message : String(e)) + "\u3002\u8BF7\u4FDD\u7559 Passage Practice \u76EE\u5F55\u548C\u65E7 data.json \u540E\u68C0\u67E5\uFF1B\u6BB5\u843D\u590D\u4E60\u4ECD\u53EF\u4F7F\u7528\u3002";
      new import_obsidian5.Notice(this.storageError, 1e4);
    }
    this.addSettingTab(new PracticeSettingTab(this.app, this));
    this.currentPath = ((_a2 = this.app.workspace.getActiveFile()) == null ? void 0 : _a2.path) || "";
    this.lastMarkdown = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      var _a3;
      if ((leaf == null ? void 0 : leaf.view) instanceof import_obsidian5.MarkdownView) {
        this.lastMarkdown = leaf.view;
        this.currentPath = ((_a3 = leaf.view.file) == null ? void 0 : _a3.path) || "";
        this.notify();
      }
    }));
    this.registerView(STUDY_VIEW, (leaf) => new StudyView(leaf, this));
    this.addRibbonIcon("book-open-check", "\u56DE\u60F3\u7EC3\u4E60\uFF1A\u6BB5\u843D\u4E0E\u95EE\u7B54\u5361\u7247", () => void this.openStudy());
    this.addCommand({ id: "review-cards", name: "\u6253\u5F00\u5B66\u4E60\u4FA7\u680F", callback: () => void this.openStudy() });
    this.addCommand({ id: "practice-selection", name: "\u5728\u4FA7\u680F\u7EC3\u4E60\u6240\u9009\u6587\u5B57", editorCallback: (editor, view) => this.start(editor, view.file) });
    this.addCommand({ id: "card-from-selection", name: "\u5C06\u9009\u6BB5\u5236\u6210\u95EE\u7B54\u5361\u7247", editorCallback: (editor, view) => this.cardFromSelection(editor, view.file) });
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      for (const leaf of this.app.workspace.getLeavesOfType(STUDY_VIEW)) leaf.view.visibilityChanged();
    }));
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      if (file) {
        this.currentPath = file.path;
        const active = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
        if (active) this.lastMarkdown = active;
        this.notify();
      }
    }));
    this.registerEvent(this.app.vault.on("modify", () => this.notify()));
    this.registerEvent(this.app.vault.on("create", () => this.notify()));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file.path === this.currentPath) this.currentPath = "";
      this.notify();
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.notify()));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      var _a3;
      if (this.currentPath === oldPath || this.currentPath.startsWith(oldPath + "/")) this.currentPath = file.path + this.currentPath.slice(oldPath.length);
      if ((_a3 = this.store) == null ? void 0 : _a3.cards.some((c) => c.sourcePath === oldPath || c.sourcePath.startsWith(oldPath + "/"))) void this.store.relocate(oldPath, file.path).then(() => this.notify()).catch(() => new import_obsidian5.Notice("\u6765\u6E90\u8DEF\u5F84\u66F4\u65B0\u5931\u8D25\uFF0C\u5361\u7247\u8FDB\u5EA6\u4FDD\u7559\uFF1B\u8BF7\u91CD\u65B0\u6253\u5F00\u5B66\u4E60\u4FA7\u680F\u68C0\u67E5"));
      else this.notify();
    }));
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
      if (editor.getSelection().trim()) {
        menu.addItem((item) => item.setTitle("\u5728\u4FA7\u680F\u590D\u4E60\u9009\u6BB5").setIcon("book-open-check").onClick(() => this.start(editor, view.file)));
        menu.addItem((item) => item.setTitle("\u5236\u6210\u95EE\u7B54\u5361\u7247").setIcon("gallery-vertical-end").onClick(() => this.cardFromSelection(editor, view.file)));
      }
    }));
    this.registerMarkdownCodeBlockProcessor("practice-card", (source, el, ctx) => {
      try {
        const card = parseCardBlock(source);
        const box = el.createDiv({ cls: "pp-authored-card" });
        box.createEl("span", { text: "\u95EE\u7B54\u5361\u7247", cls: "pp-authored-label" });
        for (const [label2, value] of [["\u6B63\u9762 \xB7 \u95EE\u9898", card.front], ["\u80CC\u9762 \xB7 \u7B54\u6848", card.back]]) {
          const face = box.createDiv();
          face.createEl("span", { text: label2, cls: "pp-face-label" });
          const previews = new MarkdownPreviewScope(this.app);
          const child = new import_obsidian5.MarkdownRenderChild(face);
          child.onunload = () => previews.reset();
          ctx.addChild(child);
          previews.mount(face, value, ctx.sourcePath);
        }
        box.createEl("p", { text: "\u70B9\u5DE6\u4FA7\u300C\u56DE\u60F3\u7EC3\u4E60\u300D\u56FE\u6807\uFF0C\u6309\u95EE\u9898\u81EA\u6D4B", cls: "pp-footnote" });
      } catch (e) {
        el.createEl("p", { text: "\u5361\u7247\u6807\u8BB0\u672A\u5B8C\u6210\uFF1A" + e.message, cls: "pp-error" });
        el.createEl("pre", { text: source });
      }
    });
  }
  refreshStudyViews() {
    this.notify();
  }
  notify() {
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(STUDY_VIEW)) leaf.view.notifyChanged();
    }, 200);
  }
  async openStudy() {
    if (this.opening) return this.opening;
    this.opening = (async () => {
      let leaf = this.app.workspace.getLeavesOfType(STUDY_VIEW)[0];
      if (!leaf) {
        leaf = this.app.workspace.getRightLeaf(false);
        if (!leaf) throw new Error("\u65E0\u6CD5\u521B\u5EFA\u4FA7\u680F");
        await leaf.setViewState({ type: STUDY_VIEW, active: true });
      }
      this.app.workspace.rightSplit.expand();
      this.app.workspace.revealLeaf(leaf);
      return leaf.view;
    })();
    try {
      return await this.opening;
    } finally {
      this.opening = null;
    }
  }
  shield(on) {
    const el = this.app.workspace.containerEl;
    if (el.classList.contains("pp-recall-shield") !== on) el.toggleClass("pp-recall-shield", on);
  }
  activeEditor() {
    var _a2, _b;
    if (((_b = (_a2 = this.lastMarkdown) == null ? void 0 : _a2.file) == null ? void 0 : _b.path) === this.currentPath && this.lastMarkdown.getMode() === "source" && this.app.workspace.getLeavesOfType("markdown").some((l) => l.view === this.lastMarkdown)) return this.lastMarkdown;
    const matches = this.app.workspace.getLeavesOfType("markdown").map((l) => l.view).filter((v) => {
      var _a3;
      return v instanceof import_obsidian5.MarkdownView && ((_a3 = v.file) == null ? void 0 : _a3.path) === this.currentPath && v.getMode() === "source";
    });
    return matches.length === 1 ? matches[0] : null;
  }
  start(editor, file) {
    const text2 = editor.getSelection();
    if (!text2.trim() || editor.listSelections().length !== 1 || text2.length > 5e4) {
      new import_obsidian5.Notice("\u8BF7\u5148\u9009\u62E9\u4E00\u6BB5\u8FDE\u7EED\u6587\u5B57\uFF0C\u6700\u591A 50,000 \u5B57\u7B26");
      return;
    }
    const path = (file == null ? void 0 : file.path) || "", line = editor.getCursor("from").line, question = defaultQuestion(editor.getValue(), line, (file == null ? void 0 : file.basename) || "\u56DE\u5FC6\u8FD9\u6BB5\u5185\u5BB9");
    const sourceRef = selectionSourceRef(editor.getValue(), text2, path, line);
    this.currentPath = path;
    void this.openStudy().then((view) => view.startSelection({ text: text2, question, path, line, kind: "selection", sourceRef }));
  }
  cardFromSelection(editor, file) {
    const text2 = editor.getSelection();
    if (!text2.trim() || editor.listSelections().length !== 1 || text2.length > 5e4) {
      new import_obsidian5.Notice("\u8BF7\u5148\u9009\u62E9\u4E00\u6BB5\u8FDE\u7EED\u6587\u5B57\uFF0C\u6700\u591A 50,000 \u5B57\u7B26");
      return;
    }
    const sourcePath = (file == null ? void 0 : file.path) || "", front = defaultQuestion(editor.getValue(), editor.getCursor("from").line, (file == null ? void 0 : file.basename) || "\u56DE\u5FC6\u8FD9\u6BB5\u5185\u5BB9");
    const sourceRef = selectionSourceRef(editor.getValue(), text2, sourcePath, editor.getCursor("from").line);
    this.currentPath = sourcePath;
    void this.openStudy().then((view) => view.openSeed({ front, back: text2, sourcePath, sourceRef }));
  }
  async insertCard(seed) {
    if (!this.store) throw new Error(this.storageError || "\u5361\u7247\u5B58\u50A8\u4E0D\u53EF\u7528");
    await this.store.add(seed.front, seed.back, seed.sourcePath, Date.now(), void 0, seed.sourceRef);
    this.notify();
  }
  onunload() {
    window.clearTimeout(this.refreshTimer);
    this.shield(false);
    this.app.workspace.detachLeavesOfType(STUDY_VIEW);
  }
};
/*! Bundled license information:

ts-fsrs/dist/index.mjs:
ts-fsrs/dist/index.mjs:
ts-fsrs/dist/index.mjs:
ts-fsrs/dist/index.mjs:
  (* istanbul ignore next -- @preserve *)
*/
