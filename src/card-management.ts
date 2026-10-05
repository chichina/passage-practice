import {Card} from './cards';
export type CardStatus='all'|'active'|'due'|'scheduled'|'suspended'|'new';
export interface CardFilters {query:string;status:CardStatus;type:'all'|'snapshot'|'authored';source:string}
export const NO_SOURCE='\u0000';
export function filterCards(cards:readonly Card[],filter:CardFilters,now:number):Card[]{
 const query=filter.query.trim().toLocaleLowerCase();return cards.filter(c=>(!query||`${c.front}\n${c.back}\n${c.sourcePath}`.toLocaleLowerCase().includes(query))&&(filter.type==='all'||(c.id.startsWith('note:')?'authored':'snapshot')===filter.type)&&(!filter.source||(filter.source===NO_SOURCE?!c.sourcePath:c.sourcePath===filter.source))&&(filter.status==='all'||filter.status==='suspended'&&c.suspended||filter.status==='active'&&!c.suspended||filter.status==='due'&&!c.suspended&&c.dueAt<=now||filter.status==='scheduled'&&!c.suspended&&c.dueAt>now||filter.status==='new'&&!c.suspended&&c.reviews===0));
}
/** Both content and revision belong to the reviewed snapshot. */
export function sameCard(a:Card,b:Card):boolean{return a.id===b.id&&a.revision===b.revision&&a.front===b.front&&a.back===b.back&&a.sourcePath===b.sourcePath&&a.suspended===b.suspended;}
