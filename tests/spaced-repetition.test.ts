import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduleSR,emptySR,srDelay} from '../src/spaced-repetition';
import {createCard,applyRating,normalizeData,resetScheduling,srHistogram,dueCards} from '../src/cards';
import {CardStore} from '../src/card-store';
import {normalizeStudyData} from '../src/decks';
import {exportBackup,parseBackup} from '../src/backup';
import {sessionOrder,sessionFrom} from '../src/review-order';
const now=new Date(2026,9,6,14,0).getTime();
const fresh=()=>createCard('Question','Answer','Note.md',now,'test');
test('official 1.15.4 SM-2-OSR default vectors and cap',()=>{
 for(const [i,e,d,r,next,ease]of [[1,250,0,'again',0,230],[1,250,0,'hard',1,230],[1,250,0,'good',3,250],[1,250,0,'easy',4,270],[10,250,4,'again',0,230],[10,250,4,'hard',6,230],[10,250,4,'good',30,250],[10,250,4,'easy',49,270],[0,130,0,'hard',1,130],[0,230,0,'good',2,230],[100000,250,0,'good',36525,250]]as const){const n=scheduleSR({interval:i,ease:e,due:now},r,now,{},d);assert.equal(n.interval,next);assert.equal(n.ease,ease);assert.equal(new Date(n.due).getHours(),0);}
});
test('deterministic histogram: missing key, smaller load, zero key, no random fuzz',()=>{
 for(const [histogram,want]of [[{},10],[{10:3},9],[{10:3,9:1,11:0},11],[{10:0,9:0,11:0},10]]as const){assert.equal(scheduleSR({interval:4,ease:250,due:now},'good',now,histogram).interval,want);}
});
test('switch selection preserves bytes, next real rating initializes separate state and archives complete history',async()=>{
 const fsrs=applyRating(fresh(),'good',now);let persisted:any;const store=new CardStore({version:2,cards:[fsrs]},async d=>{persisted=structuredClone(d);},now);const before=JSON.stringify(store.cards);
 await store.setSchedulingAlgorithm('sm2-osr');assert.equal(JSON.stringify(store.cards),before);assert.equal(persisted.version,3);assert.equal(persisted.storageVersion,2);
 const c=await store.rate(fsrs.id,fsrs.revision,'good',now+86400000);assert.ok(c.sr);assert.equal(c.fsrs,undefined);assert.equal(c.reviews,2);assert.deepEqual(c.schedulingHistory,[{fsrs:fsrs.fsrs}]);assert.equal(c.sr.logs.length,1);assert.equal(c.intervalDays,3);
 await store.setSchedulingAlgorithm('fsrs');const back=await store.rate(c.id,c.revision,'good',c.dueAt);assert.ok(back.fsrs);assert.equal(back.sr,undefined);assert.equal(back.reviews,3);assert.equal(back.fsrs!.card.reps,1);assert.equal(back.schedulingHistory!.length,2);assert.deepEqual(back.schedulingHistory![1],{sr:c.sr});
 assert.deepEqual(parseBackup(exportBackup(store.data),now),normalizeStudyData(store.data,now));
});
test('preview is pure; Again today and exactly one log per score; undo restores archived scheduler',async()=>{
 const base=fresh(),before=JSON.stringify(base),next=applyRating(base,'again',now,'sm2-osr');assert.equal(JSON.stringify(base),before);assert.equal(next.intervalDays,0);assert.ok(next.dueAt<=now);assert.equal(next.sr!.logs.length,1);assert.equal(dueCards([next],now).length,1);
 const store=new CardStore({version:2,cards:[base]},async()=>{},now);await store.setSchedulingAlgorithm('sm2-osr');await store.rate(base.id,0,'easy',now);await store.restoreRating(base,1,now+1);const restored=store.get(base.id)!;assert.deepEqual(restored.fsrs,base.fsrs);assert.equal(restored.sr,undefined);assert.equal(restored.reviews,0);
});
test('invalid state fails closed; failed algorithm preference write preserves prior data',async()=>{
 const card=applyRating(fresh(),'easy',now,'sm2-osr');const bad=structuredClone(card);bad.sr!.card.ease++;assert.throws(()=>normalizeData({version:3,cards:[bad]},now));
 const future=structuredClone(card);(future.sr as any).version='future';assert.throws(()=>normalizeData({version:3,cards:[future]},now));
 const both=structuredClone(card);both.fsrs=fresh().fsrs;assert.throws(()=>normalizeData({version:3,cards:[both]},now));
 const store=new CardStore({version:2,cards:[fresh()]},async()=>{throw Error('disk full');},now);await assert.rejects(store.setSchedulingAlgorithm('sm2-osr'));assert.equal(store.schedulingAlgorithm,'fsrs');
});
test('reset and suspension retain history and counters',()=>{
 const c=applyRating(fresh(),'again',now,'sm2-osr'),reset=resetScheduling(c,now+1000);assert.equal(reset.reviews,1);assert.equal(reset.lapses,1);assert.equal(reset.sr!.logs.length,0);assert.equal(reset.schedulingHistory!.length,2);assert.equal(reset.dueAt,now+1000);const next=applyRating(reset,'good',now+2000);assert.equal(next.reviews,2);assert.equal(next.intervalDays,3);assert.equal(srHistogram([{...next,suspended:true}],now)[3],undefined);
});
test('local calendar days cross DST correctly and historical data reopens after timezone travel',()=>{
 const old=process.env.TZ;try{process.env.TZ='America/New_York';const spring=new Date(2026,2,8,12).getTime(),prior=new Date(2026,2,7).getTime();assert.equal(srDelay({interval:1,ease:250,due:prior},spring),1);const n=scheduleSR({interval:1,ease:250,due:spring},'hard',spring);assert.equal(new Date(n.due).getDate(),9);assert.equal(new Date(n.due).getHours(),0);assert.equal((n.due-new Date(2026,2,8).getTime())/3600000,23);
 const c=applyRating(createCard('Q','A','',spring,'dst'),'good',spring,'sm2-osr');process.env.TZ='Asia/Tokyo';assert.deepEqual(normalizeData({version:3,cards:[c]},spring).cards[0],c);
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
test('session ordering copies once, preserves membership, and anchors manual choice',()=>{
 const items=Array.from({length:50},(_,i)=>i),before=[...items];assert.deepEqual(sessionOrder(items,'sequential'),items);const shuffled=sessionOrder(items,'random',()=>.31);assert.deepEqual(items,before);assert.notDeepEqual(shuffled,items);assert.deepEqual([...shuffled].sort((a,b)=>a-b),items);assert.equal(new Set(shuffled).size,50);const selected=sessionFrom(items,17,'random');assert.equal(selected.queue[0],17);assert.equal(selected.position,0);assert.equal(new Set(selected.queue).size,50);const position=12;assert.equal(shuffled[position-1+1],shuffled[position]);assert.throws(()=>sessionFrom([1,2],3,'random'));
});
