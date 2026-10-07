import {Card,CardData,normalizeData} from './cards';
import {fingerprint} from './knowledge';
import {StudyData,Deck,DEFAULT_DECK,normalizeStudyData} from './decks';
import type {SchedulingAlgorithm} from './spaced-repetition';

/** The same UTF-8 byte limit applies to exported JSON, file selection, and parsing. */
export const MAX_BACKUP_BYTES=10*1024*1024;
export type ImportAlgorithmChoice='keep-local'|'use-backup';
export interface BackupPartInfo {id:string;index:number;total:number}
export type BackupData=(CardData|StudyData)&{backupPart?:BackupPartInfo};
export interface ImportPlan {
 incoming:BackupData;
 backupPart?:BackupPartInfo;
 add:Card[];
 identical:number;
 duplicates:number;
 conflicts:string[];
 base:string;
 decks?:Deck[];
 deckConflicts?:string[];
 /** Add only these missing associations; never replace an existing deck. */
 deckMemberships?:Array<{id:string;cardIds:string[]}>;
 /** Absent in older backups that did not save a scheduler preference. */
 savedSchedulingAlgorithm?:SchedulingAlgorithm;
 /** Available only when planning against a complete local StudyData snapshot. */
 localSchedulingAlgorithm?:SchedulingAlgorithm;
 algorithmChoice?:ImportAlgorithmChoice;
 requiresAlgorithmChoice:boolean;
 /** Resolved preference; unset while an explicit choice is still required. */
 schedulingAlgorithm?:SchedulingAlgorithm;
}

function assertBackupSize(text:string,exporting=false):void {
 // UTF-8 never uses fewer bytes than the string's UTF-16 code units. Avoid
 // allocating another very large buffer when that cheap bound already fails.
 if(text.length>MAX_BACKUP_BYTES||new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES){
  throw new Error(exporting
   ?'备份超过 10 MiB，未生成 JSON 备份。请完整备份知识库文件以保留全部数据'
   :'备份超过 10 MiB（UTF-8），请先检查文件');
 }
}

function fitsBackup(text:string):boolean {
 return text.length<=MAX_BACKUP_BYTES&&new TextEncoder().encode(text).byteLength<=MAX_BACKUP_BYTES;
}
function serializeBackup(data:CardData|StudyData,now:number,part?:BackupPartInfo):string {
 return JSON.stringify({format:'passage-practice-backup',formatVersion:'decks'in data?2:1,pluginVersion:'1.5.1',exportedAt:new Date(now).toISOString(),...(part?{part}:{}),data},null,2);
}
function backupData(input:readonly Card[]|StudyData,now:number):CardData|StudyData {
 return Array.isArray(input)?normalizeData({version:2,cards:input},now):normalizeStudyData(input,now);
}

/** Every successfully returned backup fits the parser/file-import size limit. */
export function exportBackup(input:readonly Card[]|StudyData,now=Date.now()):string {
 const text=serializeBackup(backupData(input,now),now);
 assertBackupSize(text,true);
 return text;
}

/**
 * Produce all bounded parts before writing any file. Each part is independently
 * parseable, contains full card schedules, and carries only deck references to
 * its own cards. Restoring all parts unions their memberships without replacing
 * local cards. A single card/history or deck-definition set that cannot fit is
 * rejected explicitly; no partial backup is returned.
 */
export function exportBackupParts(input:readonly Card[]|StudyData,now=Date.now()):string[] {
 const data=backupData(input,now),single=serializeBackup(data,now);
 if(fitsBackup(single))return[single];
 const id=crypto.randomUUID(),parts:Array<CardData|StudyData>=[];
 // Reserve the maximum part-number width before partitioning. Actual envelopes
 // can only get smaller, so the final output always obeys the same byte limit.
 const reserve={id,index:Number.MAX_SAFE_INTEGER,total:Number.MAX_SAFE_INTEGER};
 const partition=(cards:Card[]):void=>{
  const ids=new Set(cards.map(card=>card.id));
  const subset:CardData|StudyData='decks'in data
   ?{...data,cards,decks:data.decks.map(deck=>({...deck,cardIds:deck.cardIds.filter(cardId=>ids.has(cardId))}))}
   :{...data,cards};
  if(fitsBackup(serializeBackup(subset,now,reserve))){
   parts.push(subset);
   if(parts.length>10000)throw new Error('备份需要超过 10000 个分卷，未生成备份；请完整备份知识库文件');
   return;
  }
  if(cards.length<=1)throw new Error('单张卡片及其复习记录或卡组定义超过 10 MiB，无法分卷，未生成备份；请完整备份知识库文件');
  const middle=Math.ceil(cards.length/2);
  partition(cards.slice(0,middle));partition(cards.slice(middle));
 };
 partition(data.cards);
 return parts.map((part,index)=>{
  const text=serializeBackup(part,now,{id,index:index+1,total:parts.length});
  assertBackupSize(text,true);
  return text;
 });
}

function parsePart(raw:any):BackupPartInfo|undefined {
 if(raw===undefined)return;
 if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!raw.id||raw.id.length>128||!Number.isSafeInteger(raw.index)||!Number.isSafeInteger(raw.total)||raw.index<1||raw.total<1||raw.total>10000||raw.index>raw.total)throw new Error('备份分卷信息损坏');
 return{id:raw.id,index:raw.index,total:raw.total};
}

export function parseBackup(text:string,now=Date.now()):BackupData {
 assertBackupSize(text);
 let raw:any;
 try{raw=JSON.parse(text);}catch{throw new Error('不是有效的 JSON 备份文件');}
 if(raw?.format==='passage-practice-backup'){
  if(raw.formatVersion!==1&&raw.formatVersion!==2)throw new Error('不支持的备份版本');
  const backupPart=parsePart(raw.part);
  const data=raw.formatVersion===2?normalizeStudyData(raw.data,now):normalizeData(raw.data,now);
  return backupPart?{...data,backupPart}:data;
 }
 return raw?.format==='passage-practice-vault'?normalizeStudyData(raw,now):normalizeData(raw,now);
}

export function deckFingerprint(cards:readonly Card[]|StudyData):string{return fingerprint(JSON.stringify(cards));}

/**
 * An untouched empty instance restores the saved preference by default. Merging
 * into an existing instance requires an explicit choice whenever the backup
 * contains a preference, even when it currently matches the local setting.
 * Card-only/legacy backups without a saved preference never replace the local
 * algorithm, and planning does not alter either input or any card schedule.
 */
export function planImport(current:readonly Card[]|StudyData,incoming:BackupData,choice?:ImportAlgorithmChoice):ImportPlan {
 if(choice!==undefined&&choice!=='keep-local'&&choice!=='use-backup')throw new Error('请选择保留本地算法或使用备份算法');
 const full=!Array.isArray(current),local=full?(current as StudyData).cards:current as readonly Card[];
 const localData=full?current as StudyData:undefined,defaultDeck=localData?.decks[0];
 const empty=!!localData&&local.length===0&&localData.schedulingAlgorithm===undefined&&localData.decks.length===1&&defaultDeck?.id===DEFAULT_DECK&&defaultDeck.name==='默认卡组'&&defaultDeck.revision===0&&defaultDeck.createdAt===defaultDeck.updatedAt;
 const byId=new Map(local.map(c=>[c.id,c])),contents=new Set(local.map(c=>JSON.stringify([c.front,c.back,c.sourcePath]))),add:Card[]=[],conflicts:string[]=[];
 let identical=0,duplicates=0;
 for(const card of incoming.cards){
  const existing=byId.get(card.id);
  if(existing){if(JSON.stringify(existing)===JSON.stringify(card))identical++;else conflicts.push(card.id);continue;}
  const key=JSON.stringify([card.front,card.back,card.sourcePath]);
  if(contents.has(key)){duplicates++;continue;}
  add.push(structuredClone(card));contents.add(key);
 }
 const plan:ImportPlan={incoming:structuredClone(incoming),add,identical,duplicates,conflicts,base:deckFingerprint(current),requiresAlgorithmChoice:false,...(incoming.backupPart?{backupPart:{...incoming.backupPart}}:{}),...(full?{decks:[],deckConflicts:[],deckMemberships:[]}:{})};
 if(full){
  const data=current as StudyData;
  plan.localSchedulingAlgorithm=data.schedulingAlgorithm??'fsrs';
  plan.savedSchedulingAlgorithm='decks'in incoming?incoming.schedulingAlgorithm:undefined;
  if(plan.savedSchedulingAlgorithm){
   plan.algorithmChoice=choice??(empty?'use-backup':undefined);
   plan.requiresAlgorithmChoice=plan.algorithmChoice===undefined;
   if(plan.algorithmChoice)plan.schedulingAlgorithm=plan.algorithmChoice==='use-backup'?plan.savedSchedulingAlgorithm:plan.localSchedulingAlgorithm;
  }else{
   if(choice==='use-backup')throw new Error('此备份未保存算法偏好，请保留本地算法');
   plan.algorithmChoice='keep-local';
   plan.schedulingAlgorithm=plan.localSchedulingAlgorithm;
  }
 }else if(choice==='use-backup'){
  throw new Error('恢复算法偏好需要完整的本地数据，请重新预览备份');
 }
 if(full&&'decks'in incoming){
  const localDecks=(current as StudyData).decks,available=new Set([...local,...add].map(c=>c.id));
  for(const deck of incoming.decks){
   const existing=localDecks.find(d=>d.id===deck.id||d.name===deck.name);
   if(existing){
    if((incoming.backupPart||empty)&&existing.id===deck.id&&existing.name===deck.name){
     const members=new Set(existing.cardIds),missing=deck.cardIds.filter(id=>available.has(id)&&!members.has(id));
     if(missing.length)plan.deckMemberships!.push({id:existing.id,cardIds:missing});
     // Multipart definitions have identical metadata across parts. Keep local
     // metadata even if it was edited; membership additions remain explicit.
     if(existing.id!==DEFAULT_DECK&&JSON.stringify({...existing,cardIds:[]})!==JSON.stringify({...deck,cardIds:[]}))plan.deckConflicts!.push(deck.name);
    }else if(JSON.stringify(existing)!==JSON.stringify(deck))plan.deckConflicts!.push(deck.name);
    continue;
   }
   plan.decks!.push({...structuredClone(deck),cardIds:deck.cardIds.filter(id=>available.has(id))});
  }
 }
 return plan;
}
