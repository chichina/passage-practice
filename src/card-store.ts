import {sameCard} from './card-management';
import {deckFingerprint,planImport,ImportPlan} from './backup';
import { Card, CardData, Rating, SourceRef, applyRating, createCard, normalizeData } from './cards';

const copy=(card:Card):Card=>({...card,...(card.sourceRef?{sourceRef:{...card.sourceRef}}:{})});

// Serialize writes and publish state only after Obsidian confirms the save.
// A failed write leaves the in-memory state and the visible card unchanged.
export class CardStore {
 private state:CardData;
 private pending:Promise<unknown>=Promise.resolve();
 constructor(raw:unknown, private readonly persist:(data:CardData)=>Promise<void>,now=Date.now()) { this.state=normalizeData(raw,now); }
 get cards():readonly Card[] { return this.state.cards.map(copy); }
 get(id:string):Card|undefined { const c=this.state.cards.find(c=>c.id===id);return c?copy(c):undefined; }
 private transact<T>(edit:(cards:Card[])=>T,beforeCommit?:()=>void):Promise<T> {
  const work=this.pending.then(async()=>{const next=this.state.cards.map(copy);const result=edit(next);const data:CardData=normalizeData({version:2,cards:next},Date.now());beforeCommit?.();await this.persist(data);this.state=data;return result;});
  this.pending=work.catch(()=>{});return work;
 }
 /** One atomic persistence for an explicitly reviewed batch; duplicates are skipped. */
 addMany(seeds:readonly {front:string;back:string;sourcePath:string;sourceRef?:SourceRef}[],now=Date.now(),beforeCommit?:()=>void):Promise<{added:number;duplicates:number}> {
  if(!seeds.length||seeds.length>100)throw new Error('每批请选择 1 至 100 条候选');
  return this.transact(cards=>{let added=0,duplicates=0;const keys=new Set(cards.map(c=>JSON.stringify([c.front,c.back,c.sourcePath])));
   for(const seed of seeds){const card=createCard(seed.front.trim(),seed.back.trim(),seed.sourcePath,now,crypto.randomUUID()),key=JSON.stringify([card.front,card.back,card.sourcePath]);if(keys.has(key)){duplicates++;continue;}if(seed.sourceRef)card.sourceRef={...seed.sourceRef};cards.push(card);keys.add(key);added++;}return{added,duplicates};},beforeCommit);
 }
 importBackup(plan:ImportPlan):Promise<number>{return this.transact(cards=>{if(deckFingerprint(cards)!==plan.base)throw new Error('本地卡片已变化，请重新预览备份');const latest=planImport(cards,plan.incoming);cards.push(...latest.add);return latest.add.length;});}
 /** All selected identities must still match; failure never publishes a partial deck. */
 suspendMany(selected:readonly Card[],suspended:boolean,now=Date.now(),beforeCommit?:()=>void):Promise<number>{
  if(!selected.length||selected.length>1000||new Set(selected.map(c=>c.id)).size!==selected.length)throw new Error('每批请选择 1 至 1000 张不同卡片');
  const snapshots=selected.map(copy);return this.transact(cards=>{let changed=0;for(const snapshot of snapshots){const i=cards.findIndex(c=>c.id===snapshot.id),old=i<0?undefined:cards[i];if(old&&(old.id.startsWith('note:')?old.revision!==snapshot.revision:!sameCard(old,snapshot)))throw new Error('所选卡片已变化，本批未保存，请重新核对');if(!old&&(!snapshot.id.startsWith('note:')||snapshot.reviews!==0))throw new Error('所选卡片已移除，本批未保存');if(snapshot.suspended===suspended)continue;const updated={...snapshot,suspended,updatedAt:now,revision:snapshot.revision+1};if(i<0)cards.push(updated);else cards[i]=updated;changed++;}return changed;},beforeCommit);
 }
 setAuthoredSuspended(card:Card,suspended:boolean,now=Date.now()):Promise<void>{if(!card.id.startsWith('note:'))throw new Error('不是笔记标记卡片');return this.transact(cards=>{const i=cards.findIndex(c=>c.id===card.id);if(i>=0&&cards[i].revision!==card.revision)throw new Error('卡片已变化，请重新打开');const updated={...card,suspended,updatedAt:now,revision:card.revision+1};if(i<0)cards.push(updated);else cards[i]=updated;});}
 rateAuthored(card:Card,rating:Rating,now=Date.now(),beforeCommit?:()=>void):Promise<Card> {
  if(!card.id.startsWith('note:'))throw new Error('不是笔记标记卡片');
  return this.transact(cards=>{const i=cards.findIndex(c=>c.id===card.id);if(i>=0&&cards[i].revision!==card.revision)throw new Error('卡片已改变，请刷新后重试');if(i<0&&card.reviews!==0)throw new Error('复习记录已改变');if(card.suspended)throw new Error('卡片已暂停');const next=applyRating(card,rating,now);if(i<0)cards.push(next);else cards[i]=next;return copy(next);},beforeCommit);
 }
 relocate(oldPath:string,newPath:string):Promise<void> {
  return this.transact(cards=>{for(const c of cards)if(c.sourcePath===oldPath||c.sourcePath.startsWith(oldPath+'/')){c.sourcePath=newPath+c.sourcePath.slice(oldPath.length);c.revision++;}});
 }
 add(front:string,back:string,sourcePath:string,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const duplicate=cards.find(c=>c.front===front&&c.back===back&&c.sourcePath===sourcePath);if(duplicate)throw new Error('相同题目与答案的卡片已存在，可在卡片库编辑或恢复。');const card=createCard(front,back,sourcePath,now,crypto.randomUUID());cards.push(card);return {...card};});
 }
 edit(id:string,revision:number,front:string,back:string,now=Date.now(),relearn=false):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision),old=cards[i];const content=createCard(front,back,old.sourcePath,now,old.id);cards[i]={...old,front:content.front,back:content.back,...(relearn?{dueAt:now,intervalDays:0,suspended:false}:{}),updatedAt:now,revision:old.revision+1};return {...cards[i]};});
 }
 rate(id:string,revision:number,rating:Rating,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision);if(cards[i].suspended)throw new Error('卡片已暂停，请刷新队列。');cards[i]=applyRating(cards[i],rating,now);return {...cards[i]};});
 }
 suspend(id:string,revision:number,suspended:boolean,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision);cards[i]={...cards[i],suspended,updatedAt:now,revision:cards[i].revision+1};return {...cards[i]};});
 }
 restoreRating(previous:Card,expectedRevision:number,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,previous.id,expectedRevision);cards[i]={...previous,updatedAt:now,revision:expectedRevision+1};return {...cards[i]};});
 }
 private index(cards:Card[],id:string,revision:number):number {const i=cards.findIndex(c=>c.id===id);if(i<0)throw new Error('卡片不存在，请重新打开卡片库。');if(cards[i].revision!==revision)throw new Error('卡片已改变，请重新打开后重试。');return i;}
}
