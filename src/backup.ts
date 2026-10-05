import {Card,CardData,normalizeData} from './cards';import{fingerprint}from'./knowledge';
export interface ImportPlan {incoming:CardData;add:Card[];identical:number;duplicates:number;conflicts:string[];base:string}
export function exportBackup(cards:readonly Card[],now=Date.now()):string{return JSON.stringify({format:'passage-practice-backup',formatVersion:1,pluginVersion:'1.0.0',exportedAt:new Date(now).toISOString(),data:normalizeData({version:2,cards},now)},null,2);}
export function parseBackup(text:string,now=Date.now()):CardData{if(text.length>10*1024*1024)throw new Error('备份超过 10 MiB，请先检查文件');let raw:any;try{raw=JSON.parse(text);}catch{throw new Error('不是有效的 JSON 备份文件');}if(raw?.format==='passage-practice-backup'){if(raw.formatVersion!==1)throw new Error('不支持的备份版本');return normalizeData(raw.data,now);}return normalizeData(raw,now);}
export function deckFingerprint(cards:readonly Card[]):string{return fingerprint(JSON.stringify(cards));}
export function planImport(current:readonly Card[],incoming:CardData):ImportPlan{
 const byId=new Map(current.map(c=>[c.id,c])),contents=new Set(current.map(c=>JSON.stringify([c.front,c.back,c.sourcePath]))),add:Card[]=[],conflicts:string[]=[];let identical=0,duplicates=0;
 for(const card of incoming.cards){const existing=byId.get(card.id);if(existing){if(JSON.stringify(existing)===JSON.stringify(card))identical++;else conflicts.push(card.id);continue;}const key=JSON.stringify([card.front,card.back,card.sourcePath]);if(contents.has(key)){duplicates++;continue;}add.push({...card,...(card.sourceRef?{sourceRef:{...card.sourceRef}}:{})});contents.add(key);}
 return {incoming,add,identical,duplicates,conflicts,base:deckFingerprint(current)};
}
