/** Labels describe the scheduler's actual elapsed interval, including learning. */
export function intervalLabel(dueAt:number,now:number):string{const minutes=Math.max(1,Math.round((dueAt-now)/60000));if(minutes<60)return `${minutes} 分钟`;if(minutes<1440)return `${Math.round(minutes/60)} 小时`;return `${Math.round(minutes/1440)} 天`;}
