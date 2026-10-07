/** Day-based SM-2-OSR adapter. See THIRD_PARTY_NOTICES.md for upstream attribution. */
export type SchedulingAlgorithm='fsrs'|'sm2-osr';
export type SRRating='again'|'hard'|'good'|'easy';
export const SR_VERSION='sm2-osr-v1' as const;
export const SR_MAX_INTERVAL=36525;
export interface SRMemory {interval:number;ease:number;due:number}
export interface SRLog {rating:SRRating;review:number;delayDays:number;before:SRMemory;after:SRMemory;histogram:Record<string,number>}
export interface SRSchedule {algorithm:'SM-2-OSR';version:typeof SR_VERSION;parameters:{baseEase:250;hardMultiplier:0.5;easyBonus:1.3;maximumInterval:36525;loadBalance:true};card:SRMemory;logs:SRLog[];baseline:{at:number;reviews:number;lapses:number}}
export const SR_PARAMETERS={baseEase:250,hardMultiplier:0.5,easyBonus:1.3,maximumInterval:36525,loadBalance:true} as const;
export function emptySR(now:number,reviews=0,lapses=0):SRSchedule{return{algorithm:'SM-2-OSR',version:SR_VERSION,parameters:{...SR_PARAMETERS},card:{interval:1,ease:250,due:now},logs:[],baseline:{at:now,reviews,lapses}};}

export function srDelay(memory:SRMemory,now:number):number{const today=new Date(now);today.setHours(0,0,0,0);return Math.max(0,Math.floor((today.getTime()-memory.due)/86400000));}
export function scheduleSR(memory:SRMemory,rating:SRRating,now:number,histogram:Record<string,number>={},delayDays=srDelay(memory,now)):SRMemory{
 let interval=Math.max(1,memory.interval),ease=memory.ease;
 const delay=delayDays;
 if(rating==='again'){ease=Math.max(130,ease-20);interval=0;}
 else if(rating==='hard'){ease=Math.max(130,ease-20);interval=Math.max(1,(interval+delay/4)*0.5);}
 else if(rating==='good')interval=(interval+delay/2)*ease/100;
 else if(rating==='easy'){ease+=20;interval=(interval+delay)*ease/100*1.3;}
 else throw new Error('Unknown SM-2-OSR rating');
 interval=Math.round(interval);
 if(interval>7&&Object.hasOwn(histogram,String(interval))){
  const fuzz=interval<=21?1:interval<=180?Math.min(3,Math.floor(interval*.05)):Math.min(7,Math.floor(interval*.025));
  const original=interval;let count=histogram[String(interval)],found=false;
  for(let offset=1;offset<=fuzz&&!found;offset++)for(const candidate of [original-offset,original+offset]){
   if(!Object.hasOwn(histogram,String(candidate))){interval=candidate;found=true;break;}
   if(histogram[String(candidate)]<count){interval=candidate;count=histogram[String(candidate)];}
  }
 }
 interval=Math.round(Math.min(interval,SR_MAX_INTERVAL)*10)/10;
 const due=new Date(now);due.setHours(0,0,0,0);due.setDate(due.getDate()+Math.round(interval));
 return{interval,ease,due:due.getTime()};
}
