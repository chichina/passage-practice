import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCard} from '../src/cards';
import {normalizeStudyData} from '../src/decks';
import {CardStore} from '../src/card-store';
import {MAX_BACKUP_BYTES,exportBackup,exportBackupParts,parseBackup,planImport} from '../src/backup';
import type {ImportAlgorithmChoice} from '../src/backup';

const now=3000;
const full=(cards=0,algorithm?:'fsrs'|'sm2-osr')=>normalizeStudyData({version:2,cards:Array.from({length:cards},(_,i)=>createCard(`Q ${i}`,'A','source.md',1000,`card-${i}`)),...(algorithm?{schedulingAlgorithm:algorithm}:{})},now);

test('the reported 220-card oversized legal deck cannot create an unimportable backup',()=>{
 const cards=Array.from({length:220},(_,i)=>createCard(`Q ${i}`,'a'.repeat(49000),'source.md',1000,`large-${i}`));
 const before=JSON.stringify(cards);
 assert.throws(()=>exportBackup(cards,now),/超过 10 MiB，未生成 JSON 备份/);
 assert.equal(JSON.stringify(cards),before);
 const text=exportBackup(cards.slice(0,200),now);
 assert.ok(Buffer.byteLength(text,'utf8')<=MAX_BACKUP_BYTES);
 assert.deepEqual(parseBackup(text,now).cards,cards.slice(0,200));
});

test('export and import both count UTF-8 bytes instead of JavaScript character length',()=>{
 const cards=Array.from({length:80},(_,i)=>createCard(`Q ${i}`,'中'.repeat(49000),'source.md',1000,`chinese-${i}`));
 const raw=JSON.stringify({version:2,cards});
 assert.ok(raw.length<MAX_BACKUP_BYTES);
 assert.ok(Buffer.byteLength(raw,'utf8')>MAX_BACKUP_BYTES);
 assert.throws(()=>exportBackup(cards,now),/超过 10 MiB/);
 assert.throws(()=>parseBackup(raw,now),/超过 10 MiB/);
 const text=exportBackup(cards.slice(0,60),now);
 assert.ok(Buffer.byteLength(text,'utf8')<=MAX_BACKUP_BYTES);
 assert.deepEqual(parseBackup(text,now).cards,cards.slice(0,60));
});

test('the exact UTF-8 byte boundary is accepted and one extra byte is rejected',()=>{
 const data={version:2 as const,cards:[createCard('中文 😀','答案','source.md',1000,'boundary')]};
 const raw=JSON.stringify(data);
 const boundary=raw+' '.repeat(MAX_BACKUP_BYTES-Buffer.byteLength(raw,'utf8'));
 assert.equal(Buffer.byteLength(boundary,'utf8'),MAX_BACKUP_BYTES);
 assert.deepEqual(parseBackup(boundary,now),data);
 assert.throws(()=>parseBackup(boundary+' ',now),/超过 10 MiB/);
});

test('fresh empty restore defaults to the saved algorithm without modifying input schedules',()=>{
 const current=full(),incoming=full(1,'sm2-osr'),before=JSON.stringify([current,incoming]);
 const plan=planImport(current,parseBackup(exportBackup(incoming,now),now));
 assert.equal(plan.localSchedulingAlgorithm,'fsrs');
 assert.equal(plan.savedSchedulingAlgorithm,'sm2-osr');
 assert.equal(plan.algorithmChoice,'use-backup');
 assert.equal(plan.schedulingAlgorithm,'sm2-osr');
 assert.equal(plan.requiresAlgorithmChoice,false);
 assert.equal(JSON.stringify([current,incoming]),before);
 assert.deepEqual(plan.add,incoming.cards);
 assert.equal(planImport(current,incoming,'keep-local').schedulingAlgorithm,'fsrs');
});

test('merging into existing data requires an explicit algorithm choice and respects either result',()=>{
 const current=full(1,'fsrs'),incoming=full(2,'sm2-osr');
 const undecided=planImport(current,incoming);
 assert.equal(undecided.savedSchedulingAlgorithm,'sm2-osr');
 assert.equal(undecided.requiresAlgorithmChoice,true);
 assert.equal(undecided.algorithmChoice,undefined);
 assert.equal(undecided.schedulingAlgorithm,undefined);
 const keep=planImport(current,incoming,'keep-local');
 assert.equal(keep.schedulingAlgorithm,'fsrs');
 assert.equal(keep.requiresAlgorithmChoice,false);
 const restore=planImport(current,incoming,'use-backup');
 assert.equal(restore.schedulingAlgorithm,'sm2-osr');
 assert.equal(restore.requiresAlgorithmChoice,false);
 assert.deepEqual(restore.add,keep.add);
 assert.equal(planImport(full(1,'sm2-osr'),incoming).requiresAlgorithmChoice,true);
});

test('existing empty named-deck setups are not treated as a fresh instance',()=>{
 const current=full();
 current.decks.push({id:'named',name:'My deck',cardIds:[],createdAt:1000,updatedAt:1000,revision:0});
 assert.equal(planImport(current,full(1,'sm2-osr')).requiresAlgorithmChoice,true);
});

test('legacy backups preserve the local preference and cannot request a nonexistent saved algorithm',()=>{
 const current=full(1,'sm2-osr');
 for(const incoming of [full(2),{version:2 as const,cards:full(2).cards}]){
  const plan=planImport(current,incoming);
  assert.equal(plan.savedSchedulingAlgorithm,undefined);
  assert.equal(plan.algorithmChoice,'keep-local');
  assert.equal(plan.schedulingAlgorithm,'sm2-osr');
  assert.equal(plan.requiresAlgorithmChoice,false);
  assert.throws(()=>planImport(current,incoming,'use-backup'),/未保存算法偏好/);
 }
 assert.throws(()=>planImport(current,full(2,'fsrs'),'other' as ImportAlgorithmChoice),/请选择/);
});

test('full preview fingerprints include algorithm changes; card-only legacy imports remain supported',()=>{
 const current=full(1,'fsrs'),incoming=full(2,'sm2-osr');
 assert.notEqual(planImport(current,incoming).base,planImport({...current,schedulingAlgorithm:'sm2-osr'},incoming).base);
 const legacy=planImport(current.cards,{version:2,cards:incoming.cards});
 assert.equal(legacy.requiresAlgorithmChoice,false);
 assert.equal(legacy.localSchedulingAlgorithm,undefined);
 assert.equal(legacy.schedulingAlgorithm,undefined);
 assert.equal(legacy.add.length,1);
 assert.throws(()=>planImport(current.cards,incoming,'use-backup'),/完整的本地数据/);
});


test('an explicit preference or customized empty default deck still requires a choice',()=>{
 const incoming=full(1,'fsrs');
 assert.equal(planImport(full(0,'sm2-osr'),incoming).requiresAlgorithmChoice,true);
 const customized=full();customized.decks[0].name='Custom default';
 assert.equal(planImport(customized,incoming).requiresAlgorithmChoice,true);
});

test('multipart export restores all 220 large cards, deck memberships, and saved preference',()=>{
 const original=full(0,'sm2-osr');
 original.cards=Array.from({length:220},(_,i)=>createCard(`Large Q ${i}`,'a'.repeat(49000),'source.md',1000,`large-${i}`));
 original.decks[0].cardIds=original.cards.filter((_,i)=>i%2===0).map(card=>card.id);
 original.decks.push({id:'all',name:'All cards',cardIds:original.cards.map(card=>card.id),createdAt:1000,updatedAt:2000,revision:3});
 original.decks.push({id:'late',name:'Later cards',cardIds:original.cards.slice(150).map(card=>card.id),createdAt:1500,updatedAt:2200,revision:2});
 const parts=exportBackupParts(original,now);
 assert.equal(parts.length,2);
 let restored=full();
 for(const [index,text]of parts.entries()){
  assert.ok(Buffer.byteLength(text,'utf8')<=MAX_BACKUP_BYTES);
  const incoming=parseBackup(text,now);
  assert.equal(incoming.backupPart?.index,index+1);
  assert.equal(incoming.backupPart?.total,parts.length);
  const plan=planImport(restored,incoming,index?'keep-local':undefined);
  assert.equal(plan.requiresAlgorithmChoice,false);
  restored.cards.push(...plan.add);restored.decks.push(...(plan.decks??[]));
  for(const update of plan.deckMemberships??[])restored.decks.find(deck=>deck.id===update.id)!.cardIds.push(...update.cardIds);
  if(plan.algorithmChoice==='use-backup')restored.schedulingAlgorithm=plan.schedulingAlgorithm;
  restored=normalizeStudyData(restored,now);
 }
 assert.deepEqual(restored.cards,original.cards);
 assert.deepEqual(restored.decks,original.decks);
 assert.equal(restored.schedulingAlgorithm,'sm2-osr');
 const repeated=planImport(restored,parseBackup(parts[0],now),'keep-local');
 assert.equal(repeated.add.length,0);
 assert.deepEqual(repeated.deckMemberships,[]);
});

test('multipart export covers Chinese, astral characters and JSON-escaped content',()=>{
 const cards=Array.from({length:120},(_,i)=>createCard(`Mixed Q ${i}`,('中😀\n"\\').repeat(8000),'source.md',1000,`mixed-${i}`));
 const parts=exportBackupParts(cards,now);
 assert.ok(parts.length>1);
 const restored=parts.flatMap(text=>{
  assert.ok(Buffer.byteLength(text,'utf8')<=MAX_BACKUP_BYTES);
  return parseBackup(text,now).cards;
 });
 assert.deepEqual(restored,cards);
});

test('a valid single card with oversized history fails before returning any part',()=>{
 const card=createCard('Q','A','source.md',1000,'oversized-history');
 // Each archived fresh state is valid, but this legal history exceeds one part.
 card.schedulingHistory=Array.from({length:16000},()=>({fsrs:card.fsrs!}));
 assert.throws(()=>exportBackupParts([card],now),/单张卡片.*超过 10 MiB.*未生成备份/);
});

test('malformed multipart metadata is rejected and small exports retain the normal format',()=>{
 const data=full(1,'sm2-osr');
 assert.deepEqual(exportBackupParts(data,now),[exportBackup(data,now)]);
 for(const part of [{id:'x',index:0,total:2},{id:'x',index:3,total:2},{id:'x',index:1,total:10001},{id:'',index:1,total:2}]){
  assert.throws(()=>parseBackup(JSON.stringify({format:'passage-practice-backup',formatVersion:2,part,data}),now),/分卷信息损坏/);
 }
});


test('fresh single-file restore preserves default memberships overlapping a named deck',()=>{
 const incoming=full(1,'sm2-osr');
 incoming.decks.push({id:'also',name:'Also here',cardIds:[incoming.cards[0].id],createdAt:1000,updatedAt:1000,revision:0});
 const plan=planImport(full(),parseBackup(exportBackup(incoming,now),now));
 assert.deepEqual(plan.deckMemberships,[{id:'default',cardIds:[incoming.cards[0].id]}]);
 assert.deepEqual(plan.decks?.map(deck=>deck.cardIds),[[incoming.cards[0].id]]);
 assert.deepEqual(plan.deckConflicts,[]);
});


test('multipart CardStore restore persists cards, overlapping memberships, and algorithm through restart',async()=>{
 const original=full(0,'sm2-osr');
 original.cards=Array.from({length:220},(_,i)=>createCard(`Store Q ${i}`,'a'.repeat(49000),'source.md',1000,`store-${i}`));
 original.decks[0].cardIds=original.cards.filter((_,i)=>i%3===0).map(card=>card.id);
 original.decks.push({id:'every',name:'Every card',cardIds:original.cards.map(card=>card.id),createdAt:1000,updatedAt:2000,revision:2});
 let disk:unknown,writes=0;
 const store=new CardStore(null,async data=>{disk=structuredClone(data);writes++;},now);
 const parts=exportBackupParts(original,now);
 for(const [index,text]of parts.entries()){
  const plan=planImport(store.data,parseBackup(text,now),index?'keep-local':undefined);
  await store.importBackup(plan);
 }
 assert.equal(writes,parts.length);
 const restarted=new CardStore(disk,async()=>{},now);
 assert.deepEqual(restarted.cards,original.cards);
 assert.deepEqual(restarted.decks,original.decks);
 assert.equal(restarted.schedulingAlgorithm,'sm2-osr');
 const first=restarted.cards[0];
 const rated=await restarted.rate(first.id,first.revision,'good',now+1000);
 assert.ok(rated.sr);
});

test('store refuses undecided preference merges before persistence and atomically applies either choice',async()=>{
 const local=full(1,'fsrs'),incoming=full(2,'sm2-osr');
 for(const choice of ['keep-local','use-backup']as const){
  let writes=0;
  const store=new CardStore(local,async()=>{writes++;},now);
  await assert.rejects(store.importBackup(planImport(store.data,incoming)),/请选择/);
  assert.equal(writes,0);
  assert.equal(store.schedulingAlgorithm,'fsrs');
  await store.importBackup(planImport(store.data,incoming,choice));
  assert.equal(writes,1);
  assert.equal(store.schedulingAlgorithm,choice==='keep-local'?'fsrs':'sm2-osr');
  assert.deepEqual(store.cards,incoming.cards);
 }
});

test('failed backup persistence cannot partially publish restored algorithm or cards',async()=>{
 const store=new CardStore(null,async()=>{throw new Error('disk full');},now);
 const before=store.data;
 await assert.rejects(store.importBackup(planImport(store.data,full(1,'sm2-osr'))),/disk full/);
 assert.deepEqual(store.data,before);
 assert.equal(store.schedulingAlgorithm,'fsrs');
});

test('changing the local algorithm makes the full restore preview stale',async()=>{
 let writes=0;
 const store=new CardStore(full(1,'fsrs'),async()=>{writes++;},now);
 const preview=planImport(store.data,full(2,'sm2-osr'),'use-backup');
 await store.setSchedulingAlgorithm('sm2-osr');
 await assert.rejects(store.importBackup(preview),/重新预览/);
 assert.equal(writes,1);
 assert.equal(store.cards.length,1);
});
