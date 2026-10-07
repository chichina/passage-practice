import {SchedulingAlgorithm} from './spaced-repetition';
import {CardData,normalizeData,CardValidationError} from './cards';
export const DEFAULT_DECK='default';
export interface Deck {id:string;name:string;cardIds:string[];createdAt:number;updatedAt:number;revision:number}
export interface StudyData extends CardData {format:'passage-practice-vault';storageVersion:1|2;decks:Deck[];schedulingAlgorithm?:SchedulingAlgorithm}
function fail(s:string):never{throw new CardValidationError(s);}
const own=(o:object,k:string):unknown=>{const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!('value'in d))fail('缺少卡组字段：'+k);return d.value;};
export function normalizeStudyData(raw:unknown,now=Date.now()):StudyData{
 const cards=normalizeData(raw,now);const object=raw as Record<string,unknown>|null;
 const algorithm=object&&Object.hasOwn(object,'schedulingAlgorithm')?own(object,'schedulingAlgorithm'):undefined;if(algorithm!==undefined&&algorithm!=='fsrs'&&algorithm!=='sm2-osr')fail('不支持的复习算法');const preference=algorithm?{schedulingAlgorithm:algorithm as SchedulingAlgorithm}:{};
 if(!object||!Object.prototype.hasOwnProperty.call(object,'format'))return{...cards,...preference,format:'passage-practice-vault',storageVersion:1,decks:[{id:DEFAULT_DECK,name:'默认卡组',cardIds:cards.cards.map(c=>c.id),createdAt:now,updatedAt:now,revision:0}]};
 if(own(object,'format')!=='passage-practice-vault'||![1,2].includes(own(object,'storageVersion') as number))fail('不支持的卡组存储版本');
 const decksRaw=own(object,'decks');if(!Array.isArray(decksRaw)||!decksRaw.length||decksRaw.length>10000)fail('卡组列表损坏');
 const ids=new Set<string>(),cardIds=new Set(cards.cards.map(c=>c.id));
 const decks=(decksRaw as unknown[]).map(value=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('卡组数据损坏');const o=value as object;
  const id=own(o,'id'),name=own(o,'name'),members=own(o,'cardIds'),createdAt=own(o,'createdAt'),updatedAt=own(o,'updatedAt'),revision=own(o,'revision');
  if(typeof id!=='string'||!id||id.length>256||ids.has(id))fail('卡组编号重复或损坏');ids.add(id);
  if(typeof name!=='string'||!name.trim()||name.length>100)fail('卡组名称损坏');
  if(!Array.isArray(members)||new Set(members).size!==members.length||members.some(x=>typeof x!=='string'||!cardIds.has(x)))fail('卡组卡片关联损坏');
  for(const n of [createdAt,updatedAt,revision])if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0)fail('卡组时间或版本损坏');
  return{id,name,cardIds:[...members],createdAt,updatedAt,revision} as Deck;
 });if(!ids.has(DEFAULT_DECK))fail('缺少默认卡组');return{...cards,...preference,format:'passage-practice-vault',storageVersion:cards.version===3||algorithm||own(object,'storageVersion')===2?2:1,decks};
}
