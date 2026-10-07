export type ReviewOrder = 'sequential' | 'random';
/** Copy once at session start. Navigation never calls this again. */
export function sessionOrder<T>(items:readonly T[], order:ReviewOrder, random= Math.random):T[]{
 const result=[...items];
 if(order==='random')for(let i=result.length-1;i>0;i--){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new Error('Invalid shuffle source');const j=Math.floor(n*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
/** A manually chosen starting item stays first in a shuffled session. */
export function sessionFrom<T>(items:readonly T[],item:T,order:ReviewOrder):{queue:T[];position:number}{
 if(!items.includes(item))throw new Error('Starting item is outside the selected scope');
 return order==='random'?{queue:[item,...sessionOrder(items.filter(x=>x!==item),order)],position:0}:{queue:[...items],position:items.indexOf(item)};
}
