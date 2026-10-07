import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VaultJsonStorage, type VaultStorageAdapter, VAULT_STATE_PATH} from '../src/vault-storage.ts';
import {CardStore} from '../src/card-store.ts';
import {normalizeStudyData} from '../src/decks.ts';
import {createCard,applyRating} from '../src/cards.ts';
import {exportBackup,exportBackupParts,MAX_BACKUP_BYTES,parseBackup,planImport} from '../src/backup.ts';
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


async function fixture(){
 const a=new MemoryAdapter();a.files.set('source.md','# Never modify\nSecret source');
 const cards=Array.from({length:11},(_,i)=>applyRating(createCard('Q'+i,'A'+i,'source.md',1000,'c'+i),'good',2000));
 const data=normalizeStudyData({version:2,cards},3000);
 data.decks.push({id:'one',name:'Deck one',cardIds:cards.slice(0,7).map(c=>c.id),revision:0,createdAt:3000,updatedAt:3000});
 data.decks.push({id:'two',name:'Deck two',cardIds:cards.slice(3).map(c=>c.id),revision:0,createdAt:3000,updatedAt:3000});
 const storage=await VaultJsonStorage.open(a,null,normalizeStudyData);await storage.persist(data);a.operations=[];a.mutationCount=0;return {a,data};
}
test('real transaction interruption before/after each write: eleven scored cards and multi-deck membership recover wholly',async()=>{
 const {a:seed,data}=await fixture();const initial=JSON.stringify(normalizeStudyData(data));let checked=0;
 const probe=seed.clone();const storage=await VaultJsonStorage.open(probe,null,normalizeStudyData);const store=new CardStore(storage.data,d=>storage.persist(d));await store.rate('c0',data.cards[0].revision,'again',5000);const after=JSON.stringify(store.data),count=probe.mutationCount;
 for(let position=1;position<=count;position++)for(const breakAfter of [false,true]){
  const a=seed.clone(),v=await VaultJsonStorage.open(a,null,normalizeStudyData),s=new CardStore(v.data,d=>v.persist(d));a.breakAt=position;a.breakAfter=breakAfter;
  await s.rate('c0',data.cards[0].revision,'again',5000).catch(()=>{});a.dead=false;a.breakAt=null;
  const recovered=await VaultJsonStorage.open(a,null,normalizeStudyData);assert.equal(recovered.readOnly,false,`point ${position} after ${breakAfter}: ${recovered.problem}`);
  assert.ok([initial,after].includes(JSON.stringify(recovered.data)),`whole old/new state required at ${position}/${breakAfter}`);assert.equal(recovered.data!.cards.length,11);
  assert.deepEqual(recovered.data!.decks,data.decks);assert.equal(a.files.get('source.md'),'# Never modify\nSecret source');assert.ok(a.operations.every(o=>o.path!=='source.md'));checked++;
 }
 assert.ok(checked>=12);console.log('fault points checked',checked);
});
test('failed rating, successful retry and undo preserve every original scheduling field and membership through restart',async()=>{
 const {a,data}=await fixture();const storage=await VaultJsonStorage.open(a,null,normalizeStudyData);let fail=true;const s=new CardStore(storage.data,async d=>{if(fail)throw Error('disk full');await storage.persist(d);});const before=s.data,card=s.get('c0')!;
 await assert.rejects(s.rate(card.id,card.revision,'again',6000));assert.deepEqual(s.data,before);fail=false;const rated=await s.rate(card.id,card.revision,'again',6000);const restored=await s.restoreRating(card,rated.revision,7000);
 assert.deepEqual({...restored,revision:card.revision,updatedAt:card.updatedAt},card);assert.deepEqual(s.decks,data.decks);const restart=await VaultJsonStorage.open(a,null,normalizeStudyData);assert.deepEqual(restart.data,s.data);
 await assert.rejects(s.restoreRating(card,rated.revision,8000));assert.deepEqual(restart.data,s.data);
});
test('queued algorithm switch and rating use committed single source; failed switch does not leak',async()=>{
 let fail=false;const s=new CardStore(null,async()=>{if(fail)throw Error('disk full');});const c=await s.add('Q','A','',1000);fail=true;await assert.rejects(s.setSchedulingAlgorithm('sm2-osr'));assert.equal(s.schedulingAlgorithm,'fsrs');fail=false;
 await Promise.all([s.setSchedulingAlgorithm('sm2-osr'),s.rate(c.id,c.revision,'good',2000)]);assert.ok(s.get(c.id)!.sr);assert.equal(s.get(c.id)!.fsrs,undefined);
 const old=s.get(c.id)!;await Promise.all([s.setSchedulingAlgorithm('fsrs'),s.rate(c.id,old.revision,'again',3000)]);const now=s.get(c.id)!;assert.ok(now.fsrs);assert.equal(now.sr,undefined);assert.equal(now.reviews,2);assert.equal(now.schedulingHistory!.length,2);
});
test('membership removal, rename and empty-delete never alter scored cards or other decks, even on failure/restart',async()=>{
 const {a,data}=await fixture();const v=await VaultJsonStorage.open(a,null,normalizeStudyData);let fail=false;const s=new CardStore(v.data,async d=>{if(fail)throw Error('disk');await v.persist(d)});
 const before=s.data;fail=true;await assert.rejects(s.removeFromDeck('one',0,s.cards.slice(0,7),4000));assert.deepEqual(s.data,before);fail=false;
 await assert.rejects(s.deleteEmptyDeck('one',0),/空卡组/);await assert.rejects(s.deleteEmptyDeck('default',0),/默认/);
 assert.equal(await s.removeFromDeck('one',0,s.cards.slice(0,7),4000),7);assert.deepEqual(s.cards,data.cards);assert.deepEqual(s.decks.find(d=>d.id==='two'),data.decks.find(d=>d.id==='two'));assert.deepEqual(s.decks.find(d=>d.id==='default'),data.decks[0]);
 await assert.rejects(s.renameDeck('one',0,'Stale'),/变化/);await s.renameDeck('one',1,'Renamed',5000);await assert.rejects(s.renameDeck('one',2,'Deck two'),/同名/);
 fail=true;await assert.rejects(s.deleteEmptyDeck('one',2));assert.ok(s.decks.find(d=>d.id==='one'));fail=false;await s.deleteEmptyDeck('one',2);assert.equal(s.decks.find(d=>d.id==='one'),undefined);assert.deepEqual(s.cards,data.cards);
 const restart=await VaultJsonStorage.open(a,null,normalizeStudyData);assert.deepEqual(restart.data,s.data);assert.equal(a.files.get('source.md'),'# Never modify\nSecret source');
});
test('removing batch with stale later snapshot is wholly rejected; queued rename and remove cannot overwrite',async()=>{
 const {data}=await fixture();let writes=0;const s=new CardStore(data,async()=>{writes++});const selected=s.cards.slice(0,7);await s.rate(selected[6].id,selected[6].revision,'again',4000);const before=s.data,prior=writes;
 await assert.rejects(s.removeFromDeck('one',0,selected),/变化/);assert.deepEqual(s.data,before);assert.equal(writes,prior);
 const results=await Promise.allSettled([s.renameDeck('one',0,'New name'),s.removeFromDeck('one',0,s.cards)]);assert.deepEqual(results.map(x=>x.status),['fulfilled','rejected']);assert.equal(s.decks.find(d=>d.id==='one')!.cardIds.length,7);assert.deepEqual(s.cards,before.cards);
});
test('independent: full backup restores overlapping default membership and preserves explicitly ungrouped cards',async()=>{
 const src=new CardStore(null,async()=>{});await src.setSchedulingAlgorithm('sm2-osr');const c1=await src.add('Q1','A1','source.md',1000),c2=await src.add('Q2','A2','source.md',1000);await src.assignDeck((await src.createDeck('Shared')).id,[c1]);await src.removeFromDeck('default',src.decks[0].revision,[c2]);
 const target=new CardStore(null,async()=>{});await target.importBackup(planImport(target.data,parseBackup(exportBackup(src.data),3000)));
 assert.deepEqual(target.cards,src.cards);assert.equal(target.schedulingAlgorithm,'sm2-osr');for(const d of src.decks)assert.deepEqual(target.decks.find(x=>x.id===d.id)!.cardIds,d.cardIds,d.name+' membership');
});
test('independent: real store multipart restore reversed order, failure/retry and duplicate part preserve all cards, memberships and algorithm',async()=>{
 const original=normalizeStudyData({version:2,schedulingAlgorithm:'sm2-osr',cards:Array.from({length:220},(_,i)=>createCard('Long Q'+i,'a'.repeat(49000),'source.md',1000,'long'+i))},2000);
 original.decks[0].cardIds=original.cards.filter((_,i)=>i%2===0).map(c=>c.id);original.decks.push({id:'named',name:'Long deck',cardIds:original.cards.slice(0,210).map(c=>c.id),createdAt:2000,updatedAt:2000,revision:0});
 const parts=exportBackupParts(original,3000);assert.equal(parts.length,2);let fail=false,disk:any;const target=new CardStore(null,async d=>{if(fail)throw Error('disk full');disk=structuredClone(d)});
 for(const [i,text]of [...parts].reverse().entries()){assert.ok(Buffer.byteLength(text)<=MAX_BACKUP_BYTES);const incoming=parseBackup(text,4000),plan=planImport(target.data,incoming,i?'use-backup':undefined);if(i){const before=target.data;fail=true;await assert.rejects(target.importBackup(plan));assert.deepEqual(target.data,before);fail=false;}await target.importBackup(plan);}
 assert.deepEqual([...target.cards].sort((a,b)=>a.id.localeCompare(b.id)),[...original.cards].sort((a,b)=>a.id.localeCompare(b.id)));for(const d of original.decks)assert.deepEqual([...target.decks.find(x=>x.id===d.id)!.cardIds].sort(),[...d.cardIds].sort());assert.equal(target.schedulingAlgorithm,'sm2-osr');const before=target.data;await target.importBackup(planImport(target.data,parseBackup(parts[0],4000),'keep-local'));assert.deepEqual(target.data,before);assert.deepEqual(new CardStore(disk,async()=>{}).data,target.data);
});
