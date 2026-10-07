import {PracticeSettingTab} from './settings';
import {VaultJsonStorage} from './vault-storage';
import {normalizeStudyData} from './decks';
import {LocationStore} from './practice-location';
import {MarkdownPreviewScope} from './markdown-preview';
import { App, Editor, MarkdownRenderChild, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { Session, createReview, defaultQuestion, reviewNote } from './core';
import { mountComparison } from './comparison';
import { CardStore } from './card-store';
import { CardsModal, CardSeed } from './card-modal';
import {StudyView,STUDY_VIEW} from './study-view';
import {parseCardBlock,selectionSourceRef,passageSourceRef} from './study-source';
export { StudyView } from './study-view';
export { CardsModal } from './card-modal';
export { CardStore } from './card-store';

export class PracticeModal extends Modal {
 private previews=new MarkdownPreviewScope(this.app);
 private readonly session: Session;
 private saving=false; private saved=false; private closed=false;
 private compareHighlights=true;
 constructor(app: App, source: string, fallback: string, private sourceFile: TFile | null, private sourcePath:string, private done:()=>void, private makeCard?:(seed:CardSeed)=>void) {
  super(app); this.session=new Session(source,fallback);
 }
 onOpen() { this.containerEl.addClass('pp-screen'); this.modalEl.addClass('pp-modal'); this.render(); }
 onClose() { this.closed=true;this.previews.reset(); this.contentEl.empty(); this.done(); }
 private button(parent: HTMLElement, text:string, action:()=>void, primary=false) {
  const b=parent.createEl('button',{text,cls:primary?'pp-primary':'pp-secondary'}); b.type='button'; b.addEventListener('click',action); return b;
 }
 private textArea(parent:HTMLElement,label:string,value:string,onInput:(value:string)=>void,placeholder='') {
  const wrap=parent.createEl('label',{cls:'pp-field'}); wrap.createEl('span',{text:label});
  const input=wrap.createEl('textarea',{attr:{placeholder,'aria-label':label}}); input.value=value;
  input.addEventListener('input',()=>onInput(input.value)); return input;
 }
 private render() {
  this.previews.reset();const s=this.session, root=this.contentEl; root.empty();
  const top=root.createDiv({cls:'pp-top'}); top.createEl('span',{text:'回想练习',cls:'pp-brand'}); top.createEl('span',{text:`${String(s.rounds.length+1).padStart(2,'0')} / ${s.stage==='question'?'准备':s.stage==='recall'?'回忆':'对照'}`,cls:'pp-step'});
  const body=root.createDiv({cls:'pp-body'});
  body.createEl('p',{text:s.stage==='question'?'从一小段开始':s.stage==='recall'?'给记忆一点空间':'看见差距，再练一次',cls:'pp-eyebrow'});
  body.createEl('h1',{text:s.stage==='question'?'你想问自己什么？':s.stage==='recall'?(s.rounds.length?'只回忆刚才的漏点':'先不看，试着回忆'):'自己对照，自己判断'});
  body.createEl('p',{text:s.stage==='question'?'题目已取自最近标题，可直接开始。题目中若含答案，建议改写。':s.stage==='recall'?`原文已遮住${s.rounds.length?` · 本轮 ${s.rounds.at(-1)!.missed.length} 个漏点`:''}。不必完整，先写下记得的。`:'不自动评分。把需要再练的要点写在下面，每行一条。',cls:'pp-muted'});
  if(s.stage==='question') {
   const q=this.textArea(body,'自问的问题',s.question,v=>s.question=v); q.classList.add('pp-question-input');
   const row=body.createDiv({cls:'pp-actions'});
   this.button(row,'遮住原文，开始回忆',()=>{s.start(s.question);this.render();},true);
   this.button(row,'跳过，使用标题',()=>{s.start(s.fallback);this.render();});
  } else if(s.stage==='recall') {
   body.createEl('p',{text:s.question,cls:'pp-question'});
   const a=this.textArea(body,'我的回忆',s.recall,v=>s.recall=v,'用自己的话写下来……'); a.classList.add('pp-recall');
   const row=body.createDiv({cls:'pp-actions'}); this.button(row,'揭晓并对照',()=>{s.reveal();this.render();},true);
   body.createEl('p',{text:'想不起来也可以揭晓；空白不会被判错。',cls:'pp-footnote'}); a.focus();
  } else {
   body.createEl('p',{text:s.question,cls:'pp-question'});
   mountComparison(body.createDiv({cls:'pp-comparison'}),s.target,s.recall,s.rounds.length?'本轮漏点答案':'原始选段',
    this.compareHighlights,value=>this.compareHighlights=value,(parent,text,onReady)=>this.previews.mount(parent,text,this.sourceFile?.path||this.sourcePath,onReady));
   const m=this.textArea(body,'我漏掉的要点（每行一条）',s.missed,v=>{s.missed=v;retry.disabled=!s.points().length;},'可以复制上方原文中的要点，也可以自己概括。'); m.classList.add('pp-missed');
   const row=body.createDiv({cls:'pp-actions'});
   const retry=this.button(row,'只练这些漏点',()=>{if(s.retry())this.render();},true);retry.disabled=!s.points().length;
   const save=this.button(row,this.saved?'已保存新复习笔记':'保存为新复习笔记',()=>void this.save(save));save.disabled=this.saving||this.saved;
   if(this.makeCard)this.button(row,'制成复习卡片',()=>this.makeCard!({front:s.question,back:s.target,sourcePath:this.sourceFile?.path||this.sourcePath,sourceRef:passageSourceRef({text:s.source,question:s.fallback,path:this.sourceFile?.path||this.sourcePath,line:0,kind:'selection'})}));
   body.createEl('p',{text:'保存笔记或卡片才会写入；结束或 Esc 不保存临时练习。使用本次开始时的快照。',cls:'pp-footnote'});
  }
  const bottom=root.createDiv({cls:'pp-bottom'});bottom.createEl('span',{text:'临时练习 · 手工自测 · 原笔记不改动'});this.button(bottom,'结束练习',()=>this.close());
 }
 private async save(button:HTMLButtonElement) {
  if(this.saving||this.saved||this.closed)return; this.saving=true;button.disabled=true;button.textContent='正在保存…';
  try {
   // Review notes are new files. Card state is kept separately in plugin data.json.
   const sourcePath=this.sourceFile?.path || this.sourcePath;
   const path=await createReview((p,t)=>this.app.vault.create(p,t),p=>!!this.app.vault.getAbstractFileByPath(p),reviewNote(this.session,sourcePath,new Date().toISOString()));
   this.saved=true;new Notice(`已新建：${path}`);
  } catch { new Notice('保存失败，练习仍在。请检查仓库写入权限后重试。'); }
  finally { this.saving=false;if(!this.closed)this.render(); }
 }
}
export default class PassagePractice extends Plugin {
 store:CardStore|null=null;
 locations:LocationStore|null=null;locationError='';
 storageError='';currentPath='';
 private lastMarkdown:MarkdownView|null=null;
 private opening:Promise<StudyView>|null=null;private refreshTimer:number|undefined;
 async onload() {
  const locationPath=`${this.manifest.dir}/practice-location.json`;
  try {const raw=await this.app.vault.adapter.exists(locationPath)?JSON.parse(await this.app.vault.adapter.read(locationPath)):{version:1};this.locations=new LocationStore(raw,value=>this.app.vault.adapter.write(locationPath,JSON.stringify(value,null,2)));}catch{this.locationError='上次位置无法安全读取，位置保存已停用；请保留原文件后检查。卡片与临时练习不受影响。';new Notice(this.locationError,10000);}
  try {const legacyPath=`${this.manifest.dir}/data.json`,adapter=this.app.vault.adapter;
   const legacy=await adapter.exists('Passage Practice')?null:await adapter.exists(legacyPath)?await adapter.read(legacyPath):null;
   const storage=await VaultJsonStorage.open(adapter,legacy,value=>normalizeStudyData(value));
   if(storage.readOnly)throw new Error(storage.problem||'存储只读');
   const initial=storage.data||normalizeStudyData(null);
   if(storage.source!=='vault')await storage.persist(initial);
   this.store=new CardStore(initial,data=>storage.persist(data));
  }catch(e){this.storageError='卡片写入已停用：'+(e instanceof Error?e.message:String(e))+'。请保留 Passage Practice 目录和旧 data.json 后检查；段落复习仍可使用。';new Notice(this.storageError,10000);}
  this.addSettingTab(new PracticeSettingTab(this.app,this));
  this.currentPath=this.app.workspace.getActiveFile()?.path||'';this.lastMarkdown=this.app.workspace.getActiveViewOfType(MarkdownView);
  this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{if(leaf?.view instanceof MarkdownView){this.lastMarkdown=leaf.view;this.currentPath=leaf.view.file?.path||'';this.notify();}}));
  this.registerView(STUDY_VIEW,leaf=>new StudyView(leaf,this));
  this.addRibbonIcon('book-open-check','回想练习：段落与问答卡片',()=>void this.openStudy());
  this.addCommand({id:'review-cards',name:'打开学习侧栏',callback:()=>void this.openStudy()});
  this.addCommand({id:'practice-selection',name:'在侧栏练习所选文字',editorCallback:(editor,view)=>this.start(editor,view.file)});
  this.addCommand({id:'card-from-selection',name:'将选段制成问答卡片',editorCallback:(editor,view)=>this.cardFromSelection(editor,view.file)});
  this.registerEvent(this.app.workspace.on('layout-change',()=>{for(const leaf of this.app.workspace.getLeavesOfType(STUDY_VIEW))(leaf.view as StudyView).visibilityChanged();}));
  this.registerEvent(this.app.workspace.on('file-open',file=>{if(file){this.currentPath=file.path;const active=this.app.workspace.getActiveViewOfType(MarkdownView);if(active)this.lastMarkdown=active;this.notify();}}));
  this.registerEvent(this.app.vault.on('modify',()=>this.notify()));
  this.registerEvent(this.app.vault.on('create',()=>this.notify()));
  this.registerEvent(this.app.vault.on('delete',file=>{if(file.path===this.currentPath)this.currentPath='';this.notify();}));
  this.registerEvent(this.app.metadataCache.on('resolved',()=>this.notify()));
  this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{if(this.currentPath===oldPath||this.currentPath.startsWith(oldPath+'/'))this.currentPath=file.path+this.currentPath.slice(oldPath.length);if(this.store?.cards.some(c=>c.sourcePath===oldPath||c.sourcePath.startsWith(oldPath+'/')))void this.store.relocate(oldPath,file.path).then(()=>this.notify()).catch(()=>new Notice('来源路径更新失败，卡片进度保留；请重新打开学习侧栏检查'));else this.notify();}));
  this.registerEvent(this.app.workspace.on('editor-menu',(menu,editor,view)=>{if(editor.getSelection().trim()){menu.addItem(item=>item.setTitle('在侧栏复习选段').setIcon('book-open-check').onClick(()=>this.start(editor,view.file)));menu.addItem(item=>item.setTitle('制成问答卡片').setIcon('gallery-vertical-end').onClick(()=>this.cardFromSelection(editor,view.file)));}}));
  this.registerMarkdownCodeBlockProcessor('practice-card',(source,el,ctx)=>{try{const card=parseCardBlock(source);const box=el.createDiv({cls:'pp-authored-card'});box.createEl('span',{text:'问答卡片',cls:'pp-authored-label'});for(const [label,value]of [['正面 · 问题',card.front],['背面 · 答案',card.back]]){const face=box.createDiv();face.createEl('span',{text:label,cls:'pp-face-label'});const previews=new MarkdownPreviewScope(this.app);const child=new MarkdownRenderChild(face);child.onunload=()=>previews.reset();ctx.addChild(child);previews.mount(face,value,ctx.sourcePath);}box.createEl('p',{text:'点左侧「回想练习」图标，按问题自测',cls:'pp-footnote'});}catch(e){el.createEl('p',{text:'卡片标记未完成：'+(e as Error).message,cls:'pp-error'});el.createEl('pre',{text:source});}});
 }
 refreshStudyViews(){this.notify();}
 private notify(){window.clearTimeout(this.refreshTimer);this.refreshTimer=window.setTimeout(()=>{for(const leaf of this.app.workspace.getLeavesOfType(STUDY_VIEW))(leaf.view as StudyView).notifyChanged();},200);}
 async openStudy():Promise<StudyView>{if(this.opening)return this.opening;this.opening=(async()=>{let leaf=this.app.workspace.getLeavesOfType(STUDY_VIEW)[0];if(!leaf){leaf=this.app.workspace.getRightLeaf(false)!;if(!leaf)throw new Error('无法创建侧栏');await leaf.setViewState({type:STUDY_VIEW,active:true});}this.app.workspace.rightSplit.expand();this.app.workspace.revealLeaf(leaf);return leaf.view as StudyView;})();try{return await this.opening;}finally{this.opening=null;}}
 shield(on:boolean){const el=this.app.workspace.containerEl;if(el.classList.contains('pp-recall-shield')!==on)el.toggleClass('pp-recall-shield',on);}
 activeEditor():MarkdownView|null{if(this.lastMarkdown?.file?.path===this.currentPath&&this.lastMarkdown.getMode()==='source'&&this.app.workspace.getLeavesOfType('markdown').some(l=>l.view===this.lastMarkdown))return this.lastMarkdown;const matches=this.app.workspace.getLeavesOfType('markdown').map(l=>l.view).filter((v):v is MarkdownView=>v instanceof MarkdownView&&v.file?.path===this.currentPath&&v.getMode()==='source');return matches.length===1?matches[0]:null;}
 private start(editor:Editor,file:TFile|null){const text=editor.getSelection();if(!text.trim()||editor.listSelections().length!==1||text.length>50000){new Notice('请先选择一段连续文字，最多 50,000 字符');return;}const path=file?.path||'',line=editor.getCursor('from').line,question=defaultQuestion(editor.getValue(),line,file?.basename||'回忆这段内容');const sourceRef=selectionSourceRef(editor.getValue(),text,path,line);this.currentPath=path;void this.openStudy().then(view=>view.startSelection({text,question,path,line,kind:'selection',sourceRef}));}
 private cardFromSelection(editor:Editor,file:TFile|null){const text=editor.getSelection();if(!text.trim()||editor.listSelections().length!==1||text.length>50000){new Notice('请先选择一段连续文字，最多 50,000 字符');return;}const sourcePath=file?.path||'',front=defaultQuestion(editor.getValue(),editor.getCursor('from').line,file?.basename||'回忆这段内容');const sourceRef=selectionSourceRef(editor.getValue(),text,sourcePath,editor.getCursor('from').line);this.currentPath=sourcePath;void this.openStudy().then(view=>view.openSeed({front,back:text,sourcePath,sourceRef}));}
 async insertCard(seed:CardSeed):Promise<void>{if(!this.store)throw new Error(this.storageError||'卡片存储不可用');await this.store.add(seed.front,seed.back,seed.sourcePath,Date.now(),undefined,seed.sourceRef);this.notify();}

 onunload(){window.clearTimeout(this.refreshTimer);this.shield(false);this.app.workspace.detachLeavesOfType(STUDY_VIEW);}
}
