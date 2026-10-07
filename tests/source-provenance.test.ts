import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCard, normalizeData, type SourceRef} from '../src/cards';
import {CardStore} from '../src/card-store';
import {makeCloze} from '../src/cloze';
import {cardMarkup, parseNote, passageSourceRef, selectionSourceRef, type Passage} from '../src/study-source';
import {resolveCardSourceLine, resolvePassageSourceLine} from '../src/source-location';
import {exportBackup, parseBackup} from '../src/backup';

const path='学习/原文.md';
const snapshot=(ref:SourceRef,front='改写的问题',back='独立编辑过的答案')=>({...createCard(front,back,path,1,'source-proof'),sourceRef:ref});
const serialized=(ref:SourceRef)=>JSON.parse(JSON.stringify({version:2,cards:[snapshot(ref)]}));

test('selection provenance follows unchanged mid-line original after answer and question edits',()=>{
 const source='# 缓存\n\n前文 缓存减少重复计算。 后文';
 const ref=selectionSourceRef(source,'缓存减少重复计算。',path,2),card=snapshot(ref);
 assert.equal(ref.kind,'selection');assert.deepEqual(ref.headingPath,['缓存']);
 assert.equal(ref.excerpt,'缓存减少重复计算。');
 assert.equal(resolveCardSourceLine('新增引言\n\n'+source,card),4);
 assert.equal(resolveCardSourceLine(source.replace(/\n/g,'\r\n'),card),2);
 assert.equal(card.back,'独立编辑过的答案');
});

test('selection provenance retains exact whitespace across lines',()=>{
 const source='# 主题\n前文  选中的词\n下一行  后文';
 const excerpt='  选中的词\n下一行  ',ref=selectionSourceRef(source,excerpt,path,1);
 assert.equal(ref.excerpt,excerpt);assert.equal(ref.endLine,2);
 assert.equal(resolveCardSourceLine(source,snapshot(ref)),1);
 assert.throws(()=>resolveCardSourceLine(source.replace('词\n下','词 下'),snapshot(ref)),/已变化|移除/);
});

test('selection evidence disambiguates repeated words by full structural heading path',()=>{
 const source='# 第一章\n## 主题\n这里有共同选段\n# 第二章\n## 主题\n这里也有共同选段';
 const ref=selectionSourceRef(source,'共同选段',path,5);
 assert.deepEqual(ref.headingPath,['第二章','主题']);
 assert.equal(resolveCardSourceLine('\n'+source,snapshot(ref)),6);
 assert.throws(()=>resolveCardSourceLine(source.replace('# 第二章','# 已改名'),snapshot(ref)),/已变化|移除/);
});

test('two identical selections in the same heading remain ambiguous at the saved line',()=>{
 for(const source of ['# 主题\n相同选段和相同选段','# 主题\n相同选段\n相同选段']){
  const ref=selectionSourceRef(source,'相同选段',path,1);
  assert.throws(()=>resolveCardSourceLine(source,snapshot(ref)),/多处相同/);
 }
});

test('selection capture rejects mismatched or invalid editor line instead of guessing',()=>{
 const source='# 主题\n第一行\n第二行';
 for(const line of [-1,0,1,4,1.5])assert.throws(()=>selectionSourceRef(source,'第二行',path,line),/选段/);
 assert.throws(()=>selectionSourceRef(source,'不存在',path,1),/选段/);
 assert.throws(()=>selectionSourceRef(source,' ',path,1),/选段/);
});

test('selected code is literal evidence and fake fenced headings do not change its context',()=>{
 const source='# 代码示例\n```md\n# 假标题\nconst value = 1;\n```';
 const ref=selectionSourceRef(source,'const value = 1;',path,3);
 assert.deepEqual(ref.headingPath,['代码示例']);
 assert.equal(resolveCardSourceLine('\n'+source,snapshot(ref)),4);
});

test('a selection passage carries its captured context into review and card conversion',()=>{
 const source='# 第一节\n相同正文\n# 第二节\n相同正文';
 const ref=selectionSourceRef(source,'相同正文',path,3);
 const p:Passage={text:'相同正文',question:'可改的问题',path,line:3,kind:'selection',sourceRef:ref};
 assert.equal(resolvePassageSourceLine('\n'+source,p),4);
 const copied=passageSourceRef(p);assert.deepEqual(copied,ref);assert.notEqual(copied,ref);assert.notEqual(copied.headingPath,ref.headingPath);
 assert.equal(resolveCardSourceLine(source,snapshot(copied)),3);
});

test('ordinary section provenance survives cloze wrapping and independent back edits',()=>{
 const source='# 缓存\n缓存减少重复计算。\n保留失效条件。',p=parseNote(source,path).passages[0];
 const ref=passageSourceRef(p),cloze=makeCloze(p.text,'缓存',p.question),card=snapshot(ref,cloze.front,cloze.back);
 assert.equal(ref.kind,'passage');assert.equal(ref.passageKind,'section');assert.equal(ref.question,'缓存');
 assert.equal(resolveCardSourceLine('\n\n'+source,card),3);
 card.front='另一个问题';card.back='改写的答题要点';
 assert.equal(resolveCardSourceLine(source,card),1);
 assert.equal(ref.excerpt,p.text);
 assert.throws(()=>resolveCardSourceLine(source.replace('失效条件','新的条件'),card),/已变化|移除/);
});

test('missed-point answers still locate their complete original section',()=>{
 const source='# 主题\n第一点\n第二点',p=parseNote(source,path).passages[0],card=snapshot(passageSourceRef(p),'漏点问题','第二点');
 assert.equal(resolveCardSourceLine(source,card),1);
 assert.equal(card.sourceRef.excerpt,'第一点\n第二点');
 assert.throws(()=>resolveCardSourceLine('# 其他\n第一点\n第二点',card),/已变化|移除/);
});

test('section evidence handles excluded authored cards, fenced text, and Setext headings',()=>{
 const source='章节\n====\n正文一\n'+cardMarkup('proof_001','问题','答案')+'\n```ts\nconst value=1;\n```\n正文二';
 const p=parseNote(source,path).passages[0],ref=passageSourceRef(p),card=snapshot(ref);
 assert.ok(!source.includes(ref.excerpt));
 assert.equal(resolveCardSourceLine('\n'+source,card),3);
 assert.equal(ref.endLine,p.endLine!-1);
});

test('duplicate full sections are rejected even if their old line still matches',()=>{
 const source='# 主题\n原文内容',card=snapshot(passageSourceRef(parseNote(source,path).passages[0]));
 assert.throws(()=>resolveCardSourceLine(source+'\n'+source,card),/多处相同/);
});

test('source refs for all structural passage kinds round-trip without inventing card identity',()=>{
 const sources=['无标题正文','# 主标题\n引言内容\n## 子标题\n正文内容','标题前内容\n# 小节\n正文内容'];
 const kinds=new Set();
 for(const source of sources)for(const p of parseNote(source,path).passages){
  const ref=passageSourceRef(p),data=normalizeData(serialized(ref),1),backedUp=parseBackup(exportBackup(data.cards,2),2);
  kinds.add(ref.passageKind);assert.deepEqual(data.cards[0].sourceRef,ref);assert.deepEqual(backedUp.cards[0].sourceRef,ref);
  assert.equal(resolveCardSourceLine(source,backedUp.cards[0]),p.line);
 }
 assert.deepEqual(kinds,new Set(['document','intro','section','preamble']));
});

test('new evidence validation rejects corrupted type, structure and accessor data',()=>{
 const ref=passageSourceRef(parseNote('# 主题\n正文',path).passages[0]);
 for(const change of [{kind:'guess'},{passageKind:'guess'},{question:undefined},{headingPath:undefined},{headingPath:['x'.repeat(4001)]},{headingPath:Array(7).fill('标题')}]){
  const raw=serialized(ref);Object.assign(raw.cards[0].sourceRef,change);assert.throws(()=>normalizeData(raw,1));
 }
 const raw=serialized(ref);Object.defineProperty(raw.cards[0].sourceRef,'kind',{get:()=>{throw new Error('getter invoked');}});
 assert.throws(()=>normalizeData(raw,1),/Missing or invalid kind/);
});

test('independent source evidence survives save, edit, rating, undo, backup and reload',async()=>{
 const source='# 第二章\n## 缓存\n缓存减少重复计算。',ref=selectionSourceRef(source,'缓存减少重复计算。',path,2);
 let persisted:unknown;const store=new CardStore(null,async data=>{persisted=structuredClone(data);});
 const cloze=makeCloze(ref.excerpt,'缓存','问题');
 const added=await store.add(cloze.front,cloze.back,path,1,undefined,ref);
 (ref.headingPath as string[])[0]='外部突变';
 assert.deepEqual(store.get(added.id)!.sourceRef!.headingPath,['第二章','缓存']);
 const before=store.get(added.id)!,edited=await store.edit(added.id,0,'改写问题','改写答案',2);
 assert.deepEqual(edited.sourceRef,before.sourceRef);assert.equal(resolveCardSourceLine(source,edited),2);
 const rated=await store.rate(edited.id,edited.revision,'good',3);
 await store.restoreRating(edited,rated.revision,4);
 const restored=new CardStore(persisted,async()=>{},5).get(added.id)!;
 assert.equal(restored.back,'改写答案');assert.deepEqual(restored.sourceRef,before.sourceRef);assert.equal(resolveCardSourceLine(source,restored),2);
 const backup=parseBackup(exportBackup([restored],6),6).cards[0];assert.deepEqual(backup.sourceRef,before.sourceRef);
});

test('legacy edited answers never produce a plausible but unrelated source jump',()=>{
 const legacy=createCard('问题','现在正好匹配别处','学习/原文.md',1,'legacy');
 assert.throws(()=>resolveCardSourceLine('# 问题\n现在正好匹配别处',legacy),/未保存独立的原文来源信息/);
 assert.equal(legacy.back,'现在正好匹配别处');assert.equal(legacy.reviews,0);
});

for(const mode of ['single','batch']as const)test(`${mode} queued save captures evidence before external caller mutation`,async()=>{
 let release!:()=>void,writes=0;const waiting=new Promise<void>(resolve=>release=resolve);
 const store=new CardStore(null,async()=>{if(++writes===1)await waiting;});
 const preceding=store.add('先保存的问题','先保存的答案','',1);
 const source='# 第一章\n## 标题\n原始来源',ref=selectionSourceRef(source,'原始来源',path,2),expected=structuredClone(ref);
 const next=mode==='single'?store.add('问题','答案',path,2,undefined,ref):store.addMany([{front:'问题',back:'答案',sourcePath:path,sourceRef:ref}],2);
 (ref.headingPath as string[])[0]='变化的标题';(ref as {excerpt:string}).excerpt='变化的原文';
 release();await preceding;await next;
 const card=store.cards.find(c=>c.front==='问题')!;assert.deepEqual(card.sourceRef,expected);assert.equal(resolveCardSourceLine(source,card),2);
});

test('source passage kind validation never coerces hostile values',()=>{
 const ref=passageSourceRef(parseNote('# 标题\n原文',path).passages[0]),raw=serialized(ref);
 let invoked=false;raw.cards[0].sourceRef.passageKind={toString(){invoked=true;return 'section';}};
 assert.throws(()=>normalizeData(raw,1),/Invalid source passage evidence/);assert.equal(invoked,false);
});
