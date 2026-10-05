import {MarkdownPreviewScope} from './markdown-preview';
import {App,Modal,Notice} from 'obsidian';
import {Card,Rating,applyRating,dueCards} from './cards';
import {CardStore} from './card-store';
export interface CardSeed {front:string;back:string;sourcePath:string}
const labels:Record<Rating,string>={again:'忘了',hard:'困难',good:'记住了',easy:'轻松'};
const date=(n:number)=>new Date(n).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
function intervalLabel(due:number,now:number) {const minutes=Math.round((due-now)/60000);return minutes<60?`${minutes} 分钟`:`${Math.round(minutes/1440)} 天`;}
export class CardsModal extends Modal {
 private previews=new MarkdownPreviewScope(this.app);
 private mode:'home'|'review'|'edit'|'library';
 private busy=false;private closed=false;private message='';private revealed=false;private recall='';private query='';
 private queue:string[]=[];private reviewed=0;private sessionTotal=0;private current:Card|undefined;
 private editCard:Card|undefined;private draft:CardSeed;private returnMode:'home'|'library'|'review'='home';
 private undo:{previous:Card;revision:number}|undefined;
 constructor(app:App,private store:CardStore,private done:()=>void,private seed?:CardSeed) {super(app);this.mode=seed?'edit':'home';this.draft=seed?{...seed}:{front:'',back:'',sourcePath:''};}
 onOpen(){this.containerEl.addClass('pp-screen');this.modalEl.addClass('pp-modal');this.modalEl.addClass('pp-cards-modal');this.render();}
 close(){if(this.busy){new Notice('正在保存，请稍候；完成后可以关闭。');return;}super.close();}
 closeForUnload(){super.close();}
 onClose(){this.closed=true;this.previews.reset();this.contentEl.empty();this.done();}
 private button(el:HTMLElement,text:string,action:()=>void,primary=false){const b=el.createEl('button',{text,cls:primary?'pp-primary':'pp-secondary'});b.type='button';b.disabled=this.busy;b.addEventListener('click',()=>{if(!this.busy&&!this.closed)action();});return b;}
 private field(el:HTMLElement,label:string,value:string,set:(v:string)=>void,max:number){const wrap=el.createEl('label',{cls:'pp-field'});wrap.createEl('span',{text:label});const input=wrap.createEl('textarea',{attr:{'aria-label':label,maxlength:String(max)}});input.value=value;input.disabled=this.busy;input.addEventListener('input',()=>set(input.value));return input;}
 private async run(action:()=>Promise<unknown>,success:()=>void){if(this.busy||this.closed)return;this.busy=true;this.message='';this.contentEl.querySelectorAll<HTMLButtonElement|HTMLTextAreaElement|HTMLInputElement>('button,textarea,input').forEach(b=>b.disabled=true);this.contentEl.setAttribute('aria-busy','true');try{await action();this.busy=false;if(!this.closed)success();}catch(e){this.message=e instanceof Error?e.message:'保存失败，请检查仓库写入权限后重试。';if(this.closed)new Notice('卡片保存失败。请重新启用插件并检查写入权限。',10000);}finally{this.busy=false;if(!this.closed)this.render();}}
 private navigation(mode:'home'|'library'){this.mode=mode;this.message='';this.current=undefined;this.revealed=false;this.recall='';this.render();}
 private render(){this.previews.reset();const root=this.contentEl;root.empty();root.setAttribute('aria-busy',String(this.busy));const top=root.createDiv({cls:'pp-top'});top.createEl('span',{text:'回想练习 / 复习卡片',cls:'pp-brand'});top.createEl('span',{text:'本地保存 · 间隔复习',cls:'pp-step'});const body=root.createDiv({cls:'pp-body pp-flash-body'});
  if(this.message)body.createEl('p',{text:this.message,cls:'pp-error',attr:{role:'alert'}});
  if(this.mode==='home')this.home(body);else if(this.mode==='library')this.library(body);else if(this.mode==='edit')this.editor(body);else this.review(body);
  const bottom=root.createDiv({cls:'pp-bottom'});bottom.createEl('span',{text:'原笔记不改动 · 手工自评 · 简单间隔算法'});this.button(bottom,'关闭卡片',()=>this.close());
  const heading=body.querySelector<HTMLElement>('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }
 private home(body:HTMLElement){const cards=this.store.cards,now=Date.now(),due=dueCards([...cards],now),active=cards.filter(c=>!c.suspended),today=new Date(now).toDateString(),reviewed=cards.filter(c=>c.lastReviewedAt!==null&&new Date(c.lastReviewedAt).toDateString()===today).length;
  body.createEl('p',{text:'每天一点，留住记忆',cls:'pp-eyebrow'});body.createEl('h1',{text:due.length?'到时间，想一想':cards.length?'这一刻，没有到期卡片':'从第一张卡片开始'});
  body.createEl('p',{text:cards.length?'先回忆，再揭晓，最后按真实感受安排下一次。':'在笔记里选中一段，右键「制成复习卡片」；也可以在这里手动创建。',cls:'pp-muted'});
  const stats=body.createDiv({cls:'pp-stats'});for(const [count,label]of [[due.length,'当前到期'],[reviewed,'今天复习过'],[active.length,'启用卡片']]as const){const tile=stats.createDiv();tile.createEl('strong',{text:String(count)});tile.createEl('span',{text:label});}
  const row=body.createDiv({cls:'pp-actions'});if(due.length)this.button(row,`开始复习 ${due.length} 张`,()=>{this.queue=due.map(c=>c.id);this.reviewed=0;this.sessionTotal=due.length;this.undo=undefined;this.mode='review';this.advance();},true);else this.button(row,'刷新到期队列',()=>this.render());
  this.button(row,'新建卡片',()=>this.edit());this.button(row,`卡片库 · ${cards.length}`,()=>this.navigation('library'));
  const next=active.filter(c=>c.dueAt>now).sort((a,b)=>a.dueAt-b.dueAt)[0];if(next)body.createEl('p',{text:`下次到期：${date(next.dueAt)}。到期后点击刷新或重新打开。`,cls:'pp-footnote'});
  if(cards.some(c=>c.suspended))body.createEl('p',{text:`${cards.filter(c=>c.suspended).length} 张已暂停，可在卡片库恢复。`,cls:'pp-footnote'});
 }
 private edit(card?:Card){this.returnMode=this.mode==='review'?'review':this.mode==='library'?'library':'home';this.editCard=card;this.draft=card?{front:card.front,back:card.back,sourcePath:card.sourcePath}:{front:'',back:'',sourcePath:''};this.mode='edit';this.message='';this.render();}
 private editor(body:HTMLElement){body.createEl('p',{text:this.editCard?'保留原有复习进度':'一张卡片，一个要点',cls:'pp-eyebrow'});body.createEl('h1',{text:this.editCard?'编辑复习卡片':'制成复习卡片'});body.createEl('p',{text:'正面只放问题，背面放完整答案。保存的是快照，之后修改笔记不会自动同步。',cls:'pp-muted'});
  const f=this.field(body,'正面 · 问题',this.draft.front,v=>this.draft.front=v,4000);f.classList.add('pp-question-input');this.field(body,'背面 · 答案',this.draft.back,v=>this.draft.back=v,50000);
  if(this.draft.sourcePath)body.createEl('p',{text:`来源：${this.draft.sourcePath}`,cls:'pp-footnote'});
  const row=body.createDiv({cls:'pp-actions'});this.button(row,'保存卡片',()=>{const d={...this.draft},c=this.editCard;if(!d.front.trim()||!d.back.trim()){this.message='请填写问题和答案后再保存。';this.render();return;}if(d.front.length>4000||d.back.length>50000){this.message='问题最多 4,000 字符，答案最多 50,000 字符。';this.render();return;}void this.run(()=>c?this.store.edit(c.id,c.revision,d.front,d.back):this.store.add(d.front,d.back,d.sourcePath),()=>{if(this.seed){this.close();return;}if(this.returnMode==='review'){this.current=this.current?this.store.get(this.current.id):undefined;this.revealed=false;this.recall='';}this.mode=this.returnMode;this.message='卡片已保存';});},true);
  this.button(row,'取消',()=>{if(this.seed)this.close();else{this.mode=this.returnMode;this.message='';this.render();}});body.createEl('p',{text:this.editCard?'编辑不会重置到期时间；如果暂时不想复习，可在卡片库暂停。':'新卡保存后立即进入到期队列。相同来源、问题与答案不会重复创建。',cls:'pp-footnote'});
 }
 private library(body:HTMLElement){body.createEl('p',{text:'整理问题，也整理记忆',cls:'pp-eyebrow'});body.createEl('h1',{text:'卡片库'});const search=body.createEl('input',{cls:'pp-search',attr:{type:'search','aria-label':'搜索卡片',placeholder:'搜索问题或答案'}});search.value=this.query;const list=body.createDiv({cls:'pp-library'});const draw=()=>{list.empty();const query=this.query.trim().toLocaleLowerCase(),cards=this.store.cards.filter(c=>!query||`${c.front}\n${c.back}`.toLocaleLowerCase().includes(query));list.createEl('p',{text:`${cards.length} 张卡片`,cls:'pp-muted'});if(!cards.length)list.createEl('p',{text:query?'没有匹配的卡片，换一个关键词试试。':'还没有卡片，点击下方「新建卡片」。',cls:'pp-muted'});
   for(const card of cards){const item=list.createDiv({cls:'pp-library-card'});item.createEl('h2',{text:card.front});item.createEl('p',{text:card.suspended?'已暂停 · 随时可恢复':`${card.dueAt<=Date.now()?'已到期':'到期 '+date(card.dueAt)} · 已复习 ${card.reviews} 次`,cls:'pp-muted'});const row=item.createDiv({cls:'pp-actions'});this.button(row,'编辑',()=>this.edit(card));this.button(row,card.suspended?'恢复复习':'暂停复习',()=>void this.run(()=>this.store.suspend(card.id,card.revision,!card.suspended),()=>{this.message=card.suspended?'已恢复，到期卡片可重新复习':'已暂停，复习进度保留';}));}
  };search.addEventListener('input',()=>{this.query=search.value;draw();});draw();const row=body.createDiv({cls:'pp-actions'});this.button(row,'返回今日复习',()=>this.navigation('home'));this.button(row,'新建卡片',()=>this.edit(),true);
 }
 private advance(){this.current=undefined;while(this.queue.length){const c=this.store.get(this.queue[0]);if(c&&!c.suspended&&c.dueAt<=Date.now()){this.current=c;break;}this.queue.shift();}this.revealed=false;this.recall='';this.render();}
 private review(body:HTMLElement){const c=this.current;body.createEl('p',{text:`本轮已完成 ${this.reviewed} / ${this.sessionTotal}`,cls:'pp-eyebrow'});
  if(!c){body.createEl('h1',{text:'这一轮，完成了'});body.createEl('p',{text:`已安排 ${this.reviewed} 张卡片的下次复习。可以安心停在这里。`,cls:'pp-muted'});const next=this.store.cards.filter(c=>!c.suspended&&c.dueAt>Date.now()).sort((a,b)=>a.dueAt-b.dueAt)[0];if(next)body.createEl('p',{text:`下次到期：${date(next.dueAt)}`,cls:'pp-footnote'});const row=body.createDiv({cls:'pp-actions'});this.button(row,'返回今日复习',()=>this.navigation('home'),true);this.undoButton(row);return;}
  body.createEl('h1',{text:this.revealed?'对照答案，诚实自评':'先回忆，再揭晓'});this.previews.mount(body,c.front,c.sourcePath);
  if(!this.revealed){const input=this.field(body,'我的回忆（可选）',this.recall,v=>this.recall=v,50000);input.placeholder='可以默想，也可以用自己的话写下来……';const row=body.createDiv({cls:'pp-actions'});this.button(row,'揭晓答案',()=>{this.revealed=true;this.render();},true);this.undoButton(row);body.createEl('p',{text:'答案揭晓前不会显示。想不起来也可以继续。',cls:'pp-footnote'});}
  else{const card=body.createDiv({cls:'pp-flash-answer'});card.createEl('h2',{text:'背面 · 答案'});this.previews.mount(card,c.back,c.sourcePath);if(this.recall){const own=body.createDiv({cls:'pp-own-recall'});own.createEl('h2',{text:'我的回忆'});this.previews.mount(own,this.recall,c.sourcePath);}
   const row=body.createDiv({cls:'pp-ratings'}),now=Date.now();for(const rating of ['again','hard','good','easy']as Rating[]){const next=applyRating(c,rating,now);const b=this.button(row,'',()=>{void this.run(()=>this.store.rate(c.id,c.revision,rating),()=>{this.undo={previous:c,revision:c.revision+1};this.queue.shift();this.reviewed++;this.advance();});},rating==='good');b.setAttribute('aria-label',`${labels[rating]} · ${intervalLabel(next.dueAt,now)}后`);b.createEl('strong',{text:labels[rating]});b.createEl('span',{text:`${intervalLabel(next.dueAt,now)}后`});}
   body.createEl('p',{text:'按记忆感受选择；这不是正确性自动评分。只有选择后才保存本次进度。',cls:'pp-footnote'});
  }
  const row=body.createDiv({cls:'pp-actions pp-review-secondary'});if(this.revealed)this.button(row,'编辑这张卡片',()=>this.edit(c));this.button(row,'暂停这张卡片',()=>void this.run(()=>this.store.suspend(c.id,c.revision,true),()=>{this.queue.shift();this.sessionTotal--;this.advance();}));this.button(row,'结束本轮',()=>this.navigation('home'));
 }
 private undoButton(row:HTMLElement){const undo=this.undo;if(!undo)return;this.button(row,'撤销上次评分',()=>void this.run(()=>this.store.restoreRating(undo.previous,undo.revision),()=>{this.queue=this.queue.filter(id=>id!==undo.previous.id);this.queue.unshift(undo.previous.id);this.reviewed=Math.max(0,this.reviewed-1);this.undo=undefined;this.advance();}));}
}
