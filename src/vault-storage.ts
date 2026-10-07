/**
 * Vault storage deliberately has no Obsidian runtime dependency. Only this small
 * subset of DataAdapter is needed (and can be fault-injected in tests).
 *
 * The adapter must implement rename as an indivisible move, as Obsidian's local
 * filesystem adapter does. An adapter without atomic rename cannot provide an
 * atomic file commit. There is no compare-and-swap in DataAdapter: byte checks
 * provide optimistic conflict detection, not a cross-process lock. Sync clients
 * should finish syncing before two devices edit the same deck.
 */
export interface VaultStorageAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export const VAULT_STORAGE_DIRECTORY = 'Passage Practice';
export const VAULT_STATE_PATH = `${VAULT_STORAGE_DIRECTORY}/state.json`;
export const VAULT_LEGACY_ARCHIVE_PATH = `${VAULT_STORAGE_DIRECTORY}/migration/legacy-data.json`;
// The durable ownership marker must not be a dotfile: Obsidian Sync excludes
// dotfiles outside its configuration folder. JSON syncing must still be enabled.
export const VAULT_STORAGE_MARKER_PATH = `${VAULT_STORAGE_DIRECTORY}/storage-info.json`;
export const VAULT_TRANSACTION_PATH = `${VAULT_STORAGE_DIRECTORY}/.transaction.json`;

const MARKER = JSON.stringify({ owner: 'passage-practice', storageVersion: 1 }) + '\n';
const ROOT = VAULT_STORAGE_DIRECTORY;
const HISTORY = `${ROOT}/history`;

type Validator<T> = (value: unknown) => T;
type Source = 'vault' | 'legacy' | 'empty';
interface Transaction {
  owner: 'passage-practice';
  version: 1;
  id: string;
  previousRaw: string;
  nextRaw: string;
}

export class VaultStorageError extends Error {
  constructor(message: string, readonly code: 'read-only' | 'conflict' | 'io' | 'invalid') {
    super(message);
    this.name = 'VaultStorageError';
  }
}

const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);
const token = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const nextPath = (id: string): string => `${ROOT}/.pending-${id}.json`;
const backupPath = (id: string): string => `${HISTORY}/state-${id}.json`;

/**
 * Open does not migrate or create files. Call persist with the validated deck to
 * migrate. On a damaged/conflicting vault it returns readOnly=true, never silently
 * falls back to legacy/empty, and persist always rejects. A valid current deck can
 * still be exposed read-only if interrupted-transaction cleanup is unavailable.
 *
 * validate must throw on invalid input. It can also upgrade a legacy schema; the
 * exact original bytes are archived independently of its returned value.
 * Successful saves retain full, immutable snapshots in history. They are never
 * automatically pruned: this intentionally favors recovery over bounded storage.
 */
export class VaultJsonStorage<T> {
  private value: T | null = null;
  private raw: string | null = null;
  private origin: Source = 'empty';
  private locked = false;
  private issue: string | null = null;
  private initialized = false;
  private pending: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly adapter: VaultStorageAdapter,
    private readonly legacyRawText: string | null,
    private readonly validate: Validator<T>,
  ) {}

  static async open<T>(adapter: VaultStorageAdapter, legacyRawText: string | null, validate: Validator<T>): Promise<VaultJsonStorage<T>> {
    const storage = new VaultJsonStorage(adapter, legacyRawText, validate);
    try {
      if (await adapter.exists(ROOT)) {
        storage.origin = 'vault';
        await storage.assertOwned();
        storage.initialized = true;
        if (await adapter.exists(VAULT_TRANSACTION_PATH)) await storage.recover();
        const raw = await storage.readOptional(VAULT_STATE_PATH);
        if (raw === null) throw new Error(`Missing committed state: ${VAULT_STATE_PATH}. Restore it from a known-good backup; no empty deck was created.`);
        storage.accept(raw);
      } else if (legacyRawText !== null) {
        storage.origin = 'legacy';
        storage.accept(legacyRawText);
      }
    } catch (error) {
      storage.lock(`Storage is read-only: ${errorText(error)}`);
    }
    return storage;
  }

  get data(): T | null { return this.value === null ? null : structuredClone(this.value); }
  get rawText(): string | null { return this.raw; }
  get source(): Source { return this.origin; }
  get readOnly(): boolean { return this.locked; }
  get problem(): string | null { return this.issue; }

  /** Serialized in this instance; rejected saves do not publish new memory state. */
  persist(data: T): Promise<void> {
    // Snapshot at invocation so queued calls cannot be changed by their caller.
    let raw: string;
    try {
      const json = JSON.stringify(data, null, 2);
      if (json === undefined) throw new Error('The deck is not JSON serializable.');
      raw = json + '\n';
      this.decode(raw);
    } catch (error) {
      return Promise.reject(new VaultStorageError(`Invalid deck: ${errorText(error)}`, 'invalid'));
    }
    const work = this.pending.then(async () => {
      if (this.locked) throw new VaultStorageError(this.issue ?? 'Storage is read-only.', 'read-only');
      if (!this.initialized) await this.initialize(raw);
      else await this.commit(raw);
    });
    this.pending = work.catch(() => {});
    return work;
  }

  private decode(raw: string): T { return this.validate(JSON.parse(raw)); }

  private accept(raw: string): void {
    const value = this.decode(raw);
    this.value = value;
    this.raw = raw;
  }

  private lock(message: string): void {
    this.locked = true;
    this.issue = message;
  }

  private conflict(message: string): never {
    this.lock(message);
    throw new VaultStorageError(message, 'conflict');
  }

  private async readOptional(path: string): Promise<string | null> {
    return await this.adapter.exists(path) ? await this.adapter.read(path) : null;
  }

  private async assertOwned(): Promise<void> {
    if (await this.readOptional(VAULT_STORAGE_MARKER_PATH) !== MARKER) {
      throw new Error(`“${ROOT}” already exists without the expected Passage Practice ownership marker. Its contents were not changed. Rename that folder or choose another vault before trying again.`);
    }
  }

  private async writeVerified(path: string, raw: string): Promise<void> {
    if (await this.adapter.exists(path)) this.conflict(`Refusing to overwrite an existing staging file: ${path}`);
    await this.adapter.write(path, raw);
    if (await this.adapter.read(path) !== raw) throw new Error(`Write verification failed: ${path}`);
  }

  private async assertCurrent(): Promise<void> {
    try { await this.assertOwned(); }
    catch (error) { this.conflict(errorText(error)); }
    if (await this.readOptional(VAULT_STATE_PATH) !== this.raw) {
      this.conflict(`The vault deck changed outside this window. Reload Passage Practice before saving; ${VAULT_STATE_PATH} was not overwritten.`);
    }
    if (await this.adapter.exists(VAULT_TRANSACTION_PATH)) {
      this.conflict('Another or interrupted save is present. Reload Passage Practice to recover it before saving.');
    }
  }

  private async initialize(raw: string): Promise<void> {
    if (await this.adapter.exists(ROOT)) this.conflict(`“${ROOT}” appeared after loading. Reload before saving; the existing folder was not changed.`);
    // Prepare a complete owned directory, then publish it with one rename. An
    // interrupted preparation leaves a uniquely named, ignored sibling directory.
    const staging = `.passage-practice-init-${token()}`;
    if (await this.adapter.exists(staging)) throw new VaultStorageError('Initialization staging path already exists. Try again.', 'io');
    try {
      await this.adapter.mkdir(staging);
      await this.writeVerified(`${staging}/storage-info.json`, MARKER);
      await this.adapter.mkdir(`${staging}/history`);
      if (this.legacyRawText !== null) {
        await this.adapter.mkdir(`${staging}/migration`);
        // Archive verbatim *before* any new deck file is written. The original
        // plugin data.json is not even part of this adapter API's input paths.
        await this.writeVerified(`${staging}/migration/legacy-data.json`, this.legacyRawText);
      }
      await this.writeVerified(`${staging}/state.json`, raw);
      if (await this.adapter.exists(ROOT)) this.conflict(`“${ROOT}” appeared during initialization. Its contents were not changed.`);
      try { await this.adapter.rename(staging, ROOT); }
      catch (error) {
        // A transport can throw after a successful rename. Only acknowledge it
        // when the exact complete candidate exists at the committed destination.
        if (!await this.isPublishedInitialization(raw, staging)) throw error;
      }
      if (!await this.isPublishedInitialization(raw, staging)) this.conflict('Initialized storage could not be verified. Reload before making more changes.');
      this.initialized = true;
      this.origin = 'vault';
      this.accept(raw);
    } catch (error) {
      if (error instanceof VaultStorageError) throw error;
      throw new VaultStorageError(`Could not initialize vault storage: ${errorText(error)}`, 'io');
    }
  }

  private async isPublishedInitialization(raw: string, staging: string): Promise<boolean> {
    return !await this.adapter.exists(staging)
      && await this.readOptional(VAULT_STORAGE_MARKER_PATH) === MARKER
      && await this.readOptional(VAULT_STATE_PATH) === raw
      && (this.legacyRawText === null || await this.readOptional(VAULT_LEGACY_ARCHIVE_PATH) === this.legacyRawText);
  }

  private async commit(raw: string): Promise<void> {
    await this.assertCurrent();
    if (raw === this.raw) return;
    const id = token();
    const next = nextPath(id);
    const backup = backupPath(id);
    const transaction: Transaction = { owner: 'passage-practice', version: 1, id, previousRaw: this.raw!, nextRaw: raw };
    const journal = JSON.stringify(transaction) + '\n';
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
      if (await this.readOptional(VAULT_STATE_PATH) !== this.raw) this.conflict('The deck changed while preparing this save. All versions have been retained; reload to inspect the conflict.');
      if (await this.adapter.read(next) !== raw) this.conflict('The staged deck changed before commit. The current deck was retained; reload before saving.');
      await this.adapter.rename(VAULT_STATE_PATH, backup);
      if (await this.adapter.read(backup) !== this.raw) {
        // A change between the last comparison and rename is retained, never
        // overwritten with our stale snapshot. Restore its stable path if safe.
        if (!await this.adapter.exists(VAULT_STATE_PATH)) await this.adapter.rename(backup, VAULT_STATE_PATH);
        this.conflict('The deck changed during the save. The external version was retained; reload before saving.');
      }
      await this.requireJournal(journal);
      if (await this.adapter.read(next) !== raw) throw new Error('The staged deck changed during commit.');
      if (await this.adapter.exists(VAULT_STATE_PATH)) this.conflict('Another writer created a deck during this save. Its file and the previous version were retained.');
      await this.adapter.rename(next, VAULT_STATE_PATH);
      if (await this.adapter.read(VAULT_STATE_PATH) !== raw) this.conflict('The committed deck changed before verification. Reload before saving.');
      this.accept(raw);
      await this.cleanupCommittedJournal(journal);
    } catch (error) {
      // A rename may have completed even when its promise rejected. Reconcile
      // from durable files, never guess based on whether a promise fulfilled.
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
            if (await this.adapter.read(VAULT_STATE_PATH) !== transaction.previousRaw) throw new Error('Rollback verification failed.');
            await this.removeExactJournal(journal);
          } else if (!this.locked && current === transaction.previousRaw) {
            await this.removeExactJournal(journal);
          } else if (!this.locked) {
            this.lock('Save outcome conflicts with the files on disk. All available versions were retained; reload to recover.');
          }
        } else if (journalPublished) {
          this.lock('The recovery journal changed during a save. Reload before saving again.');
        }
      } catch (recoveryError) {
        this.lock(`A save was interrupted and automatic recovery could not finish: ${errorText(recoveryError)}. Reload to recover from the retained journal and backup.`);
      }
      if (error instanceof VaultStorageError) throw error;
      throw new VaultStorageError(`The deck was not saved: ${errorText(error)}`, 'io');
    }
  }

  private async requireJournal(expected: string): Promise<void> {
    if (await this.readOptional(VAULT_TRANSACTION_PATH) !== expected) this.conflict('The recovery journal changed during a save. All available files were retained.');
  }

  private async removeExactJournal(expected: string): Promise<void> {
    await this.requireJournal(expected);
    await this.adapter.remove(VAULT_TRANSACTION_PATH);
  }

  private async cleanupCommittedJournal(journal: string): Promise<void> {
    try { await this.removeExactJournal(journal); }
    catch (error) {
      // The new state is already committed. Reporting the save as failed would
      // leave CardStore stale. Lock subsequent writes if cleanup really failed.
      if (await this.adapter.exists(VAULT_TRANSACTION_PATH)) this.lock(`The deck was saved, but recovery-journal cleanup failed: ${errorText(error)}. Reload before the next save.`);
    }
  }

  private async recover(): Promise<void> {
    const journal = await this.adapter.read(VAULT_TRANSACTION_PATH);
    let transaction: Transaction;
    try {
      const parsed: unknown = JSON.parse(journal);
      if (!parsed || typeof parsed !== 'object') throw new Error('Not an object.');
      const t = parsed as Partial<Transaction>;
      if (t.owner !== 'passage-practice' || t.version !== 1 || typeof t.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(t.id)
        || typeof t.previousRaw !== 'string' || typeof t.nextRaw !== 'string' || t.previousRaw === t.nextRaw) throw new Error('Unexpected recovery-journal format.');
      this.decode(t.previousRaw);
      this.decode(t.nextRaw);
      transaction = t as Transaction;
    } catch (error) { throw new Error(`Invalid recovery journal; no deck files were replaced: ${errorText(error)}`); }
    const current = await this.readOptional(VAULT_STATE_PATH);
    const previous = await this.readOptional(backupPath(transaction.id));
    if (current === transaction.nextRaw) {
      if (previous !== transaction.previousRaw) throw new Error('The committed save has a missing or conflicting previous backup. All files were retained.');
      this.accept(current);
      await this.removeExactJournal(journal);
    } else if (current === transaction.previousRaw) {
      // Journal publication is not the commit point. A pending candidate alone
      // never becomes current, even if it has complete, valid JSON.
      this.accept(current);
      await this.removeExactJournal(journal);
    } else if (current === null && previous === transaction.previousRaw) {
      await this.requireJournal(journal);
      if (await this.adapter.exists(VAULT_STATE_PATH)) throw new Error('A concurrent writer appeared during recovery.');
      await this.adapter.rename(backupPath(transaction.id), VAULT_STATE_PATH);
      if (await this.adapter.read(VAULT_STATE_PATH) !== transaction.previousRaw) throw new Error('Recovery verification failed.');
      this.accept(transaction.previousRaw);
      await this.removeExactJournal(journal);
    } else {
      throw new Error('Interrupted save conflicts with the current deck or its backup. No file was replaced; inspect the retained files before reloading.');
    }
  }
}
