import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VaultJsonStorage, VaultStorageAdapter, VAULT_STATE_PATH, VAULT_LEGACY_ARCHIVE_PATH, VAULT_STORAGE_DIRECTORY, VAULT_STORAGE_MARKER_PATH, VAULT_TRANSACTION_PATH } from '../src/vault-storage';

type Deck = { version: number; cards: string[] };
const oldDeck: Deck = { version: 2, cards: ['existing review history'] };
const newDeck: Deck = { version: 2, cards: ['existing review history', 'new card'] };
const legacy = ' { "cards" : ["existing review history"], "version": 2 }\r\n';
const raw = (deck: Deck): string => JSON.stringify(deck, null, 2) + '\n';
const validate = (value: unknown): Deck => {
  const d = value as Deck;
  if (!d || d.version !== 2 || !Array.isArray(d.cards) || d.cards.some(c => typeof c !== 'string')) throw new Error('Invalid test deck');
  return structuredClone(d);
};

/** Non-overwriting, atomic rename with controllable before/after interruption. */
class MemoryAdapter implements VaultStorageAdapter {
  files = new Map<string, string>();
  directories = new Set<string>();
  operations: Array<{ kind: string; path: string; to?: string }> = [];
  mutationCount = 0;
  breakAt: number | null = null;
  breakAfter = false;
  dead = false;
  once: ((kind: string, path: string, to?: string) => void) | null = null;

  clone(): MemoryAdapter {
    const a = new MemoryAdapter();
    a.files = new Map(this.files);
    a.directories = new Set(this.directories);
    return a;
  }

  private check(): void { if (this.dead) throw new Error('Process interrupted'); }
  private mutate(kind: string, path: string, work: () => void, to?: string): void {
    this.check();
    this.operations.push({ kind, path, to });
    this.mutationCount++;
    const stop = this.breakAt === this.mutationCount;
    if (stop && !this.breakAfter) { this.dead = true; throw new Error('Process interrupted'); }
    this.once?.(kind, path, to);
    work();
    if (stop && this.breakAfter) { this.dead = true; throw new Error('Process interrupted'); }
  }
  async exists(path: string): Promise<boolean> { this.check(); return this.files.has(path) || this.directories.has(path); }
  async read(path: string): Promise<string> { this.check(); const value = this.files.get(path); if (value === undefined) throw new Error(`Missing file ${path}`); return value; }
  async write(path: string, value: string): Promise<void> { this.mutate('write', path, () => { const parent = path.slice(0, path.lastIndexOf('/')); if (parent && !this.directories.has(parent)) throw new Error('Missing parent'); this.files.set(path, value); }); }
  async mkdir(path: string): Promise<void> { this.mutate('mkdir', path, () => { if (this.files.has(path) || this.directories.has(path)) throw new Error('Path exists'); this.directories.add(path); }); }
  async rename(from: string, to: string): Promise<void> {
    this.mutate('rename', from, () => {
      if (this.files.has(to) || this.directories.has(to)) throw new Error('Destination exists');
      if (this.files.has(from)) { this.files.set(to, this.files.get(from)!); this.files.delete(from); }
      else if (this.directories.has(from)) {
        for (const directory of [...this.directories]) if (directory === from || directory.startsWith(from + '/')) { this.directories.delete(directory); this.directories.add(to + directory.slice(from.length)); }
        for (const [path, value] of [...this.files]) if (path.startsWith(from + '/')) { this.files.delete(path); this.files.set(to + path.slice(from.length), value); }
      } else throw new Error('Source missing');
    }, to);
  }
  async remove(path: string): Promise<void> { this.mutate('remove', path, () => { if (!this.files.delete(path)) throw new Error('Missing file'); }); }
}

async function initialized(): Promise<MemoryAdapter> {
  const a = new MemoryAdapter();
  const storage = await VaultJsonStorage.open(a, legacy, validate);
  await storage.persist(oldDeck);
  a.operations = [];
  a.mutationCount = 0;
  return a;
}

test('migration archives exact legacy bytes before the first state write and never addresses plugin data.json', async () => {
  const a = new MemoryAdapter();
  a.files.set('.obsidian/plugins/passage-practice/data.json', legacy);
  const storage = await VaultJsonStorage.open(a, legacy, validate);
  assert.deepEqual(storage.data, oldDeck);
  assert.equal(storage.source, 'legacy');
  assert.equal(a.operations.length, 0, 'open is read-only before migration');
  await storage.persist(oldDeck);
  assert.equal(a.files.get(VAULT_LEGACY_ARCHIVE_PATH), legacy);
  assert.equal(a.files.get('.obsidian/plugins/passage-practice/data.json'), legacy);
  const archive = a.operations.findIndex(o => o.path.endsWith('/migration/legacy-data.json'));
  const state = a.operations.findIndex(o => o.path.endsWith('/state.json'));
  assert.ok(archive >= 0 && archive < state);
  assert.ok(a.operations.every(o => !o.path.startsWith('.obsidian/')));
  assert.equal(storage.source, 'vault');
  assert.equal(storage.readOnly, false);
  const reloaded = await VaultJsonStorage.open(a, '{broken legacy ignored', validate);
  assert.deepEqual(reloaded.data, oldDeck);
  assert.equal(reloaded.readOnly, false);
  await reloaded.persist(newDeck);
  assert.equal(a.files.get(VAULT_LEGACY_ARCHIVE_PATH), legacy);
  assert.deepEqual(JSON.parse(a.files.get(VAULT_STATE_PATH)!), newDeck);
});

test('empty fresh vault starts empty but does not create storage until persist', async () => {
  const a = new MemoryAdapter();
  const storage = await VaultJsonStorage.open(a, null, validate);
  assert.equal(storage.data, null);
  assert.equal(storage.source, 'empty');
  assert.equal(storage.readOnly, false);
  assert.equal(a.operations.length, 0);
  await storage.persist({ version: 2, cards: [] });
  assert.equal(a.files.has(VAULT_LEGACY_ARCHIVE_PATH), false);
});

test('existing unowned directory or file is never claimed or overwritten', async () => {
  for (const fileInstead of [false, true]) {
    const a = new MemoryAdapter();
    if (fileInstead) a.files.set(VAULT_STORAGE_DIRECTORY, 'user file');
    else { a.directories.add(VAULT_STORAGE_DIRECTORY); a.files.set(`${VAULT_STORAGE_DIRECTORY}/personal.md`, 'private user note'); }
    const before = a.clone();
    const storage = await VaultJsonStorage.open(a, legacy, validate);
    assert.equal(storage.readOnly, true);
    assert.match(storage.problem!, /ownership marker/);
    await assert.rejects(storage.persist(oldDeck), /read-only/);
    assert.deepEqual(a.files, before.files);
    assert.deepEqual(a.directories, before.directories);
    assert.equal(a.operations.length, 0);
  }
});

test('invalid legacy or current JSON never becomes an empty writable deck', async () => {
  for (const bad of ['{', '{"version":2,"cards":[42]}']) {
    const fresh = new MemoryAdapter();
    const failedLegacy = await VaultJsonStorage.open(fresh, bad, validate);
    assert.equal(failedLegacy.readOnly, true);
    assert.equal(failedLegacy.data, null);
    await assert.rejects(failedLegacy.persist({ version: 2, cards: [] }));
    assert.equal(fresh.operations.length, 0);
    const a = await initialized();
    a.files.set(VAULT_STATE_PATH, bad);
    const failedCurrent = await VaultJsonStorage.open(a, legacy, validate);
    assert.equal(failedCurrent.readOnly, true);
    assert.equal(failedCurrent.data, null);
    await assert.rejects(failedCurrent.persist({ version: 2, cards: [] }));
    assert.equal(a.files.get(VAULT_STATE_PATH), bad);
    assert.equal(a.operations.length, 0);
  }
});

test('owned directory missing its committed file is read-only rather than re-migrating legacy', async () => {
  const a = await initialized();
  a.files.delete(VAULT_STATE_PATH);
  const storage = await VaultJsonStorage.open(a, legacy, validate);
  assert.equal(storage.readOnly, true);
  assert.match(storage.problem!, /Missing committed state/);
  assert.equal(storage.data, null);
  assert.equal(a.operations.length, 0);
});

test('first initialization survives interruption before and after every filesystem mutation', async () => {
  const sample = new MemoryAdapter();
  await (await VaultJsonStorage.open(sample, legacy, validate)).persist(oldDeck);
  const count = sample.mutationCount;
  for (let i = 1; i <= count; i++) for (const after of [false, true]) {
    const a = new MemoryAdapter();
    a.breakAt = i; a.breakAfter = after;
    const storage = await VaultJsonStorage.open(a, legacy, validate);
    await assert.rejects(storage.persist(oldDeck), undefined, `mutation ${i}, after=${after}`);
    const restarted = a.clone();
    const recovered = await VaultJsonStorage.open(restarted, legacy, validate);
    assert.equal(recovered.readOnly, false, `mutation ${i}, after=${after}: ${recovered.problem}`);
    assert.deepEqual(recovered.data, oldDeck);
    await recovered.persist(oldDeck);
    assert.equal(restarted.files.get(VAULT_LEGACY_ARCHIVE_PATH), legacy);
    assert.equal(restarted.files.get(VAULT_STATE_PATH), raw(oldDeck));
  }
});

test('every interrupted commit window restarts to exactly the prior or fully committed deck', async () => {
  const base = await initialized();
  const sample = base.clone();
  await (await VaultJsonStorage.open(sample, legacy, validate)).persist(newDeck);
  const count = sample.mutationCount;
  assert.equal(count, 6);
  for (let i = 1; i <= count; i++) for (const after of [false, true]) {
    const a = base.clone();
    const storage = await VaultJsonStorage.open(a, legacy, validate);
    a.breakAt = i; a.breakAfter = after;
    await storage.persist(newDeck).catch(() => {});
    const restarted = a.clone();
    const recovered = await VaultJsonStorage.open(restarted, legacy, validate);
    assert.equal(recovered.readOnly, false, `mutation ${i}, after=${after}: ${recovered.problem}`);
    const expected = i > 5 || (i === 5 && after) ? newDeck : oldDeck;
    assert.deepEqual(recovered.data, expected, `mutation ${i}, after=${after}`);
    assert.equal(restarted.files.get(VAULT_STATE_PATH), raw(expected));
    assert.equal(restarted.files.has(VAULT_TRANSACTION_PATH), false);
    assert.equal(restarted.files.get(VAULT_LEGACY_ARCHIVE_PATH), legacy);
    await recovered.persist(newDeck);
    assert.deepEqual((await VaultJsonStorage.open(restarted, null, validate)).data, newDeck);
  }
});

test('pending leftovers, including valid candidate JSON, are never selected as committed state', async () => {
  const a = await initialized();
  a.files.set(`${VAULT_STORAGE_DIRECTORY}/.pending-newer.json`, raw(newDeck));
  a.files.set(`${VAULT_STORAGE_DIRECTORY}/.pending-partial.json`, '{');
  a.files.set(`${VAULT_STORAGE_DIRECTORY}/.pending-unknown.transaction.json`, '{}');
  a.directories.add('.passage-practice-init-interrupted');
  a.files.set('.passage-practice-init-interrupted/state.json', raw(newDeck));
  const storage = await VaultJsonStorage.open(a, null, validate);
  assert.deepEqual(storage.data, oldDeck);
  assert.equal(storage.readOnly, false);
  assert.equal(a.operations.length, 0);
});

test('external byte changes and stale second instances are rejected without overwriting either state', async () => {
  const a = await initialized();
  const first = await VaultJsonStorage.open(a, null, validate);
  const second = await VaultJsonStorage.open(a, null, validate);
  await first.persist(newDeck);
  await assert.rejects(second.persist({ version: 2, cards: ['stale overwrite'] }), /changed outside/);
  assert.equal(second.readOnly, true);
  assert.deepEqual(second.data, oldDeck);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(newDeck));
  const current = await VaultJsonStorage.open(a, null, validate);
  a.files.set(VAULT_STATE_PATH, JSON.stringify(newDeck)); // Formatting is an external change too.
  await assert.rejects(current.persist(oldDeck), /changed outside/);
  assert.equal(a.files.get(VAULT_STATE_PATH), JSON.stringify(newDeck));
});

test('external mutation during staging is caught before current is moved', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const external = raw({ version: 2, cards: ['external edit'] });
  a.once = (kind, path) => {
    if (kind === 'write' && path.includes('.pending-')) { a.once = null; a.files.set(VAULT_STATE_PATH, external); }
  };
  await assert.rejects(storage.persist(newDeck), /changed outside/);
  assert.equal(a.files.get(VAULT_STATE_PATH), external);
  assert.equal(a.files.has(VAULT_TRANSACTION_PATH), false);
});

test('external change at the rotate boundary is preserved and never overwritten by stale data', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const external = raw({ version: 2, cards: ['external edit at rename'] });
  a.once = (kind, path) => {
    if (kind === 'rename' && path === VAULT_STATE_PATH) { a.once = null; a.files.set(VAULT_STATE_PATH, external); }
  };
  await assert.rejects(storage.persist(newDeck), /changed during/);
  assert.equal(storage.readOnly, true);
  assert.equal(a.files.get(VAULT_STATE_PATH), external);
  assert.deepEqual(storage.data, oldDeck);
  assert.equal((await VaultJsonStorage.open(a, null, validate)).readOnly, true);
});

test('corrupt current plus valid recovery backup is retained read-only, never rolled back silently', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  a.breakAt = 5; a.breakAfter = true;
  await storage.persist(newDeck).catch(() => {});
  const restart = a.clone();
  restart.files.set(VAULT_STATE_PATH, '{corrupt newest state');
  const before = restart.clone();
  const recovered = await VaultJsonStorage.open(restart, legacy, validate);
  assert.equal(recovered.readOnly, true);
  assert.equal(recovered.data, null);
  assert.deepEqual(restart.files, before.files);
  assert.equal(restart.operations.length, 0);
});

test('malformed recovery journal and path traversal identifiers are rejected without writes', async () => {
  for (const journal of ['{', JSON.stringify({ owner: 'passage-practice', version: 1, id: '../../outside', previousRaw: raw(oldDeck), nextRaw: raw(newDeck) })]) {
    const a = await initialized();
    a.files.set(VAULT_TRANSACTION_PATH, journal);
    const storage = await VaultJsonStorage.open(a, legacy, validate);
    assert.equal(storage.readOnly, true);
    assert.match(storage.problem!, /Invalid recovery journal/);
    assert.equal(a.operations.length, 0);
  }
});

test('short writes never replace committed state and a fresh attempt succeeds', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const write = a.write.bind(a);
  let partial = true;
  a.write = async (path, value) => { await write(path, partial ? value.slice(0, 10) : value); };
  await assert.rejects(storage.persist(newDeck), /Write verification failed/);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(oldDeck));
  assert.deepEqual(storage.data, oldDeck);
  assert.equal(storage.readOnly, false);
  partial = false;
  await storage.persist(newDeck);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(newDeck));
});

test('a transient failure after rotating the old file rolls back and permits retry', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const rename = a.rename.bind(a);
  let fail = true;
  a.rename = async (from, to) => {
    if (fail && from.includes('.pending-') && to === VAULT_STATE_PATH) { fail = false; throw new Error('Temporary I/O error'); }
    await rename(from, to);
  };
  await assert.rejects(storage.persist(newDeck), /Temporary I\/O error/);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(oldDeck));
  assert.deepEqual(storage.data, oldDeck);
  assert.equal(storage.readOnly, false);
  await storage.persist(newDeck);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(newDeck));
});

test('rename errors reported after a successful move acknowledge the actually committed state', async () => {
  for (const initial of [true, false]) {
    const a = initial ? new MemoryAdapter() : await initialized();
    const storage = await VaultJsonStorage.open(a, legacy, validate);
    const rename = a.rename.bind(a);
    let fail = true;
    a.rename = async (from, to) => {
      await rename(from, to);
      if (fail && (to === VAULT_STATE_PATH || to === VAULT_STORAGE_DIRECTORY)) { fail = false; throw new Error('Late transport error'); }
    };
    await storage.persist(newDeck);
    assert.deepEqual(storage.data, newDeck);
    assert.equal(a.files.get(VAULT_STATE_PATH), raw(newDeck));
    assert.equal(storage.readOnly, false);
  }
});

test('cleanup failure acknowledges saved data but locks writes until a clean reload', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const remove = a.remove.bind(a);
  a.remove = async () => { throw new Error('Temporary cleanup failure'); };
  await storage.persist(newDeck);
  assert.deepEqual(storage.data, newDeck);
  assert.equal(storage.readOnly, true);
  assert.match(storage.problem!, /deck was saved/);
  await assert.rejects(storage.persist(oldDeck), /deck was saved/);
  a.remove = remove;
  const recovered = await VaultJsonStorage.open(a, null, validate);
  assert.equal(recovered.readOnly, false);
  assert.deepEqual(recovered.data, newDeck);
});

test('serialized saves snapshot their arguments and data getter does not expose mutable storage state', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  const first = structuredClone(newDeck);
  const second = { version: 2, cards: ['last queued deck'] };
  const saving = storage.persist(first);
  first.cards.push('not part of snapshot');
  await Promise.all([saving, storage.persist(second)]);
  const value = storage.data!;
  value.cards.push('not stored');
  assert.deepEqual(storage.data, second);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(second));
  assert.equal([...a.files.keys()].filter(p => p.startsWith(`${VAULT_STORAGE_DIRECTORY}/history/`)).length, 2);
});

test('ownership marker changes disable writes before changing any deck files', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  a.files.set(VAULT_STORAGE_MARKER_PATH, 'external marker');
  await assert.rejects(storage.persist(newDeck), /ownership marker/);
  assert.equal(storage.readOnly, true);
  assert.equal(a.files.get(VAULT_STATE_PATH), raw(oldDeck));
  assert.equal(a.operations.length, 0);
});

test('a user directory appearing during initialization is not overwritten', async () => {
  const a = new MemoryAdapter();
  const storage = await VaultJsonStorage.open(a, legacy, validate);
  a.once = (kind, path) => {
    if (kind === 'write' && path.endsWith('/state.json')) {
      a.once = null;
      a.directories.add(VAULT_STORAGE_DIRECTORY);
      a.files.set(`${VAULT_STORAGE_DIRECTORY}/user.md`, 'unrelated data');
    }
  };
  await assert.rejects(storage.persist(oldDeck), /appeared during initialization/);
  assert.equal(a.files.get(`${VAULT_STORAGE_DIRECTORY}/user.md`), 'unrelated data');
  assert.equal(a.files.has(VAULT_STATE_PATH), false);
  assert.equal(a.files.has(VAULT_STORAGE_MARKER_PATH), false);
});

test('a partially written migration archive cannot publish a new storage directory', async () => {
  const a = new MemoryAdapter();
  const storage = await VaultJsonStorage.open(a, legacy, validate);
  const write = a.write.bind(a);
  a.write = async (path, value) => { await write(path, path.endsWith('/migration/legacy-data.json') ? value.slice(0, 5) : value); };
  await assert.rejects(storage.persist(oldDeck), /Write verification failed/);
  assert.equal(a.directories.has(VAULT_STORAGE_DIRECTORY), false);
  assert.equal(a.operations.some(o => o.kind === 'write' && o.path.endsWith('/state.json')), false);
  assert.deepEqual(storage.data, oldDeck);
  a.write = write;
  await storage.persist(oldDeck);
  assert.equal(a.files.get(VAULT_LEGACY_ARCHIVE_PATH), legacy);
});

test('staged bytes changed after verification never replace the stable committed deck', async () => {
  for (const afterRotate of [false, true]) {
    const a = await initialized();
    const storage = await VaultJsonStorage.open(a, null, validate);
    a.once = (kind, path, to) => {
      if (kind === 'rename' && (afterRotate ? path === VAULT_STATE_PATH : to === VAULT_TRANSACTION_PATH)) {
        a.once = null;
        const pending = [...a.files.keys()].find(p => /\/\.pending-[^.]+\.json$/.test(p))!;
        assert.ok(pending);
        a.files.set(pending, '{truncated candidate');
      }
    };
    await assert.rejects(storage.persist(newDeck), /staged deck changed/);
    assert.equal(a.files.get(VAULT_STATE_PATH), raw(oldDeck));
    assert.deepEqual(storage.data, oldDeck);
    const recovered = await VaultJsonStorage.open(a, legacy, validate);
    assert.equal(recovered.readOnly, false);
    assert.deepEqual(recovered.data, oldDeck);
  }
});

test('recovery itself can be interrupted before or after each mutation and safely repeated', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  a.breakAt = 4; a.breakAfter = true;
  await storage.persist(newDeck).catch(() => {});
  assert.equal(a.files.has(VAULT_STATE_PATH), false);
  const crashed = a.clone();
  for (let mutation = 1; mutation <= 2; mutation++) for (const after of [false, true]) {
    const firstRestart = crashed.clone();
    firstRestart.breakAt = mutation;
    firstRestart.breakAfter = after;
    const incomplete = await VaultJsonStorage.open(firstRestart, legacy, validate);
    assert.equal(incomplete.readOnly, true);
    const secondRestart = firstRestart.clone();
    const recovered = await VaultJsonStorage.open(secondRestart, legacy, validate);
    assert.equal(recovered.readOnly, false, `recovery mutation ${mutation}, after=${after}`);
    assert.deepEqual(recovered.data, oldDeck);
    assert.equal(secondRestart.files.get(VAULT_STATE_PATH), raw(oldDeck));
    assert.equal(secondRestart.files.has(VAULT_TRANSACTION_PATH), false);
  }
});

test('missing current and corrupt recovery backup remain read-only with all evidence retained', async () => {
  const a = await initialized();
  const storage = await VaultJsonStorage.open(a, null, validate);
  a.breakAt = 4; a.breakAfter = true;
  await storage.persist(newDeck).catch(() => {});
  const restart = a.clone();
  const backup = [...restart.files.keys()].find(p => p.startsWith(`${VAULT_STORAGE_DIRECTORY}/history/`))!;
  restart.files.set(backup, '{corrupt backup');
  const before = new Map(restart.files);
  const recovered = await VaultJsonStorage.open(restart, legacy, validate);
  assert.equal(recovered.readOnly, true);
  assert.equal(recovered.data, null);
  assert.deepEqual(restart.files, before);
  assert.equal(restart.operations.length, 0);
});
