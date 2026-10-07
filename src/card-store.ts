import {SchedulingAlgorithm} from './spaced-repetition';
import {srHistogram} from './cards';
import {Deck,StudyData,normalizeStudyData,DEFAULT_DECK} from './decks';
import {sameCard} from './card-management';
import {deckFingerprint,planImport,ImportPlan} from './backup';
import { Card, CardData, Rating, SourceRef, applyRating, createCard, normalizeData, resetScheduling } from './cards';

const copy=(card:Card):Card=>structuredClone(card);

// Serialize writes and publish state only after Obsidian confirms the save.
// A failed write leaves the in-memory state and the visible card unchanged.
export class CardStore {
 private state:StudyData;
 private pending:Promise<unknown>=Promise.resolve();
 constructor(raw:unknown, private readonly persist:(data:StudyData)=>Promise<void>,now=Date.now()) { this.state=normalizeStudyData(raw,now); }
 get data():StudyData{return structuredClone(this.state);}
 get schedulingAlgorithm():SchedulingAlgorithm{return this.state.schedulingAlgorithm??'fsrs';}
 setSchedulingAlgorithm(algorithm:SchedulingAlgorithm):Promise<void>{return this.transact((_cards,data)=>{if(algorithm!=='fsrs'&&algorithm!=='sm2-osr')throw new Error('不支持的算法');data.schedulingAlgorithm=algorithm;data.version=3;data.storageVersion=2;});}
 get decks():readonly Deck[]{return structuredClone(this.state.decks);}
 get cards():readonly Card[] { return this.state.cards.map(copy); }
 get(id:string):Card|undefined { const c=this.state.cards.find(c=>c.id===id);return c?copy(c):undefined; }
 private transact<T>(edit:(cards:Card[],data:StudyData)=>T,beforeCommit?:()=>void,assignUnclaimed=true):Promise<T> {
  const work=this.pending.then(async()=>{const draft=structuredClone(this.state),next=draft.cards;const oldIds=new Set(next.map(c=>c.id));const result=edit(next,draft);const defaultDeck=draft.decks.find(d=>d.id===DEFAULT_DECK)!;for(const card of next)if(assignUnclaimed&&!oldIds.has(card.id)&&draft.decks.every(d=>!d.cardIds.includes(card.id)))defaultDeck.cardIds.push(card.id);const data=normalizeStudyData(draft,Date.now());beforeCommit?.();await this.persist(data);this.state=data;return result;});
  this.pending=work.catch(()=>{});return work;
 }
 /** One atomic persistence for an explicitly reviewed batch; duplicates are skipped. */
 addMany(seeds:readonly {front:string;back:string;sourcePath:string;sourceRef?:SourceRef}[],now=Date.now(),beforeCommit?:()=>void,deckId=DEFAULT_DECK):Promise<{added:number;duplicates:number}> {
  if(!seeds.length||seeds.length>100)throw new Error('每批请选择 1 至 100 条候选');seeds=structuredClone(seeds);
  return this.transact((cards,data)=>{const deck=this.requireDeck(data,deckId);let added=0,duplicates=0;const keys=new Set(cards.map(c=>JSON.stringify([c.front,c.back,c.sourcePath])));
   for(const seed of seeds){const card=createCard(seed.front.trim(),seed.back.trim(),seed.sourcePath,now,crypto.randomUUID()),key=JSON.stringify([card.front,card.back,card.sourcePath]);if(keys.has(key)){duplicates++;continue;}if(seed.sourceRef)card.sourceRef=structuredClone(seed.sourceRef);cards.push(card);deck.cardIds.push(card.id);keys.add(key);added++;}return{added,duplicates};},beforeCommit);
 }
 importBackup(plan:ImportPlan):Promise<number>{return this.transact((cards,data)=>{const current=plan.decks!==undefined?data:cards;if(deckFingerprint(current)!==plan.base)throw new Error('本地卡片或卡组已变化，请重新预览备份');const latest=planImport(current,plan.incoming,plan.algorithmChoice);if(latest.requiresAlgorithmChoice)throw new Error('请选择恢复后使用的复习算法');cards.push(...latest.add);if(latest.decks)data.decks.push(...latest.decks);for(const membership of latest.deckMemberships||[]){const deck=this.requireDeck(data,membership.id);deck.cardIds=[...new Set([...deck.cardIds,...membership.cardIds])];}if(latest.algorithmChoice==='use-backup'&&latest.schedulingAlgorithm){data.schedulingAlgorithm=latest.schedulingAlgorithm;data.version=3;data.storageVersion=2;}return latest.add.length;},undefined,!('decks'in plan.incoming));}
 /** All selected identities must still match; failure never publishes a partial deck. */
 suspendMany(selected:readonly Card[],suspended:boolean,now=Date.now(),beforeCommit?:()=>void):Promise<number>{
  if(!selected.length||selected.length>1000||new Set(selected.map(c=>c.id)).size!==selected.length)throw new Error('每批请选择 1 至 1000 张不同卡片');
  const snapshots=selected.map(copy);return this.transact(cards=>{let changed=0;for(const snapshot of snapshots){const i=cards.findIndex(c=>c.id===snapshot.id),old=i<0?undefined:cards[i];if(old&&(old.id.startsWith('note:')?old.revision!==snapshot.revision:!sameCard(old,snapshot)))throw new Error('所选卡片已变化，本批未保存，请重新核对');if(!old&&(!snapshot.id.startsWith('note:')||snapshot.reviews!==0))throw new Error('所选卡片已移除，本批未保存');if(snapshot.suspended===suspended)continue;const updated={...snapshot,suspended,updatedAt:now,revision:snapshot.revision+1};if(i<0)cards.push(updated);else cards[i]=updated;changed++;}return changed;},beforeCommit);
 }
 setAuthoredSuspended(card:Card,suspended:boolean,now=Date.now()):Promise<void>{if(!card.id.startsWith('note:'))throw new Error('不是笔记标记卡片');return this.transact(cards=>{const i=cards.findIndex(c=>c.id===card.id);if(i>=0&&cards[i].revision!==card.revision)throw new Error('卡片已变化，请重新打开');const updated={...card,suspended,updatedAt:now,revision:card.revision+1};if(i<0)cards.push(updated);else cards[i]=updated;});}
 rateAuthored(card:Card,rating:Rating,now=Date.now(),beforeCommit?:()=>void):Promise<Card> {
  if(!card.id.startsWith('note:'))throw new Error('不是笔记标记卡片');
  return this.transact(cards=>{const i=cards.findIndex(c=>c.id===card.id);if(i>=0&&cards[i].revision!==card.revision)throw new Error('卡片已改变，请刷新后重试');if(i<0&&card.reviews!==0)throw new Error('复习记录已改变');if(card.suspended)throw new Error('卡片已暂停');const next=applyRating(card,rating,now,this.schedulingAlgorithm,srHistogram(cards,now));if(i<0)cards.push(next);else cards[i]=next;return copy(next);},beforeCommit);
 }
 relocate(oldPath:string,newPath:string):Promise<void> {
  return this.transact(cards=>{for(const c of cards)if(c.sourcePath===oldPath||c.sourcePath.startsWith(oldPath+'/')){c.sourcePath=newPath+c.sourcePath.slice(oldPath.length);c.revision++;}});
 }
 add(front:string,back:string,sourcePath:string,now=Date.now(),deckId=DEFAULT_DECK,sourceRef?:SourceRef):Promise<Card> {
  sourceRef=sourceRef?structuredClone(sourceRef):undefined;return this.transact((cards,data)=>{const deck=this.requireDeck(data,deckId);const duplicate=cards.find(c=>c.front===front&&c.back===back&&c.sourcePath===sourcePath);if(duplicate)throw new Error('相同题目与答案的卡片已存在，可在卡片库编辑或恢复。');const card=createCard(front,back,sourcePath,now,crypto.randomUUID());if(sourceRef)card.sourceRef=structuredClone(sourceRef);cards.push(card);deck.cardIds.push(card.id);return copy(card);});
 }
 edit(id:string,revision:number,front:string,back:string,now=Date.now(),relearn=false):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision),old=cards[i];const content=createCard(front,back,old.sourcePath,now,old.id);cards[i]={...(relearn?resetScheduling(old,now):old),front:content.front,back:content.back,updatedAt:now,revision:old.revision+1};return copy(cards[i]);});
 }
 rate(id:string,revision:number,rating:Rating,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision);if(cards[i].suspended)throw new Error('卡片已暂停，请刷新队列。');cards[i]=applyRating(cards[i],rating,now,this.schedulingAlgorithm,srHistogram(cards,now));return copy(cards[i]);});
 }
 suspend(id:string,revision:number,suspended:boolean,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,id,revision);cards[i]={...cards[i],suspended,updatedAt:now,revision:cards[i].revision+1};return copy(cards[i]);});
 }
 restoreRating(previous:Card,expectedRevision:number,now=Date.now()):Promise<Card> {
  return this.transact(cards=>{const i=this.index(cards,previous.id,expectedRevision);cards[i]={...previous,updatedAt:now,revision:expectedRevision+1};return copy(cards[i]);});
 }
 createDeck(name:string,selected:readonly Card[]=[],now=Date.now()):Promise<Deck>{
  const snapshots=selected.map(copy);return this.transact((cards,data)=>{name=name.trim();if(!name||name.length>100)throw new Error('卡组名称需为 1 至 100 个字符');if(data.decks.some(d=>d.name===name))throw new Error('同名卡组已存在');this.materialize(cards,snapshots);const deck:Deck={id:crypto.randomUUID(),name,cardIds:snapshots.map(c=>c.id),createdAt:now,updatedAt:now,revision:0};data.decks.push(deck);return structuredClone(deck);});
 }
 assignDeck(deckId:string,selected:readonly Card[],now=Date.now()):Promise<number>{const snapshots=selected.map(copy);return this.transact((cards,data)=>{const deck=data.decks.find(d=>d.id===deckId);if(!deck)throw new Error('卡组不存在');this.materialize(cards,snapshots);let added=0;for(const c of snapshots)if(!deck.cardIds.includes(c.id)){deck.cardIds.push(c.id);added++;}deck.updatedAt=now;deck.revision++;return added;});}
 renameDeck(id:string,revision:number,name:string,now=Date.now()):Promise<void>{return this.transact((_cards,data)=>{const deck=this.requireDeck(data,id);if(deck.revision!==revision)throw new Error('卡组已变化，请重新核对');name=name.trim();if(!name||name.length>100)throw new Error('卡组名称需为 1 至 100 个字符');if(data.decks.some(d=>d.id!==id&&d.name===name))throw new Error('同名卡组已存在');deck.name=name;deck.revision++;deck.updatedAt=now;});}
 removeFromDeck(id:string,revision:number,selected:readonly Card[],now=Date.now()):Promise<number>{const snapshots=selected.map(copy);return this.transact((cards,data)=>{const deck=this.requireDeck(data,id);if(deck.revision!==revision)throw new Error('卡组已变化，请重新核对');for(const c of snapshots){const old=cards.find(x=>x.id===c.id);if(!old||!sameCard(old,c))throw new Error('所选卡片已变化，请重新核对');}const ids=new Set(snapshots.map(c=>c.id)),count=deck.cardIds.filter(x=>ids.has(x)).length;deck.cardIds=deck.cardIds.filter(x=>!ids.has(x));deck.revision++;deck.updatedAt=now;return count;});}
 deleteEmptyDeck(id:string,revision:number):Promise<void>{return this.transact((_cards,data)=>{const deck=this.requireDeck(data,id);if(id===DEFAULT_DECK)throw new Error('默认卡组不能删除');if(deck.revision!==revision)throw new Error('卡组已变化，请重新核对');if(deck.cardIds.length)throw new Error('只能删除空卡组，请先移出卡片');data.decks=data.decks.filter(d=>d.id!==id);});}
 private requireDeck(data:StudyData,id:string){const deck=data.decks.find(d=>d.id===id);if(!deck)throw new Error('卡组不存在，请重新选择');return deck;}
 private materialize(cards:Card[],selected:readonly Card[]){if(selected.length>10000||new Set(selected.map(c=>c.id)).size!==selected.length)throw new Error('卡片选择无效');for(const c of selected){const old=cards.find(x=>x.id===c.id);if(old&&!sameCard(old,c))throw new Error('所选卡片已变化，请重新选择');if(!old){if(!c.id.startsWith('note:')||c.reviews!==0)throw new Error('卡片已移除');cards.push(copy(c));}}}
 private index(cards:Card[],id:string,revision:number):number {const i=cards.findIndex(c=>c.id===id);if(i<0)throw new Error('卡片不存在，请重新打开卡片库。');if(cards[i].revision!==revision)throw new Error('卡片已改变，请重新打开后重试。');return i;}
}
