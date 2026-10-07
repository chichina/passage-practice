// Independent data-integrity regression tests. JSDOM/API doubles, not native-app QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {markdownObsidianDouble} from './obsidian-markdown-double';
import {createCard} from '../src/cards';
import {CardStore} from '../src/card-store';
import {extractKnowledge} from '../src/knowledge';
import {cardMarkup,parseNote} from '../src/study-source';

const bundle=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'SafetyTest',platform:'browser',plugins:[{name:'obsidian-data-safety-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}

 export class Modal {} export class PluginSettingTab {} export class Setting {} export class Plugin {} export class Notice {} export class TFile {}
 export class App {} export class Editor {} export class MarkdownView {}
 export const getAllTags=()=>[];
 window.SafetyTFile=TFile;
 export class ItemView {constructor(leaf){this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.createDiv();this.containerEl.getBoundingClientRect=()=>({width:400,height:600});}addAction(){} async setState(){}}
 `,loader:'js'}));
}}]});

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
const flush=()=>new Promise<void>(r=>setTimeout(r,0));
const note=(heading:string)=>`# ${heading}\n\n- First meaningful concept is recorded carefully.\n- Second meaningful concept belongs to the same subject.`;

function setup(persist?:(data:any)=>Promise<void>){
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window as any;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=w.eval('(value)=>JSON.parse(JSON.stringify(value))');
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundle.outputFiles[0].text+';window.SafetyTest=SafetyTest;');
 Object.defineProperty(w.crypto,'randomUUID',{value:()=>`safety-${Math.random()}`});
 let writes=0;
 const store=new w.SafetyTest.CardStore(null,async(data:any)=>{writes++;await persist?.(data);});
 const files=new Map<string,any>(),texts=new Map<string,string>();
 const vault={getMarkdownFiles:()=>[...files.values()],getAbstractFileByPath:(path:string)=>files.get(path),read:async(file:any)=>texts.get(file.path)!,cachedRead:async(file:any)=>texts.get(file.path)!};
 const app={vault,metadataCache:{getFileCache:()=>({})},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){}}};
 const host={app,store,currentPath:'A.md',shield(){},activeEditor:()=>null};
 const view=new w.SafetyTest.StudyView({app},host);w.document.body.append(view.containerEl);
 const addFile=(path:string,text:string)=>{const file=Object.assign(new w.SafetyTFile(),{path,stat:{mtime:1,size:text.length}});files.set(path,file);texts.set(path,text);return file;};
 const editFile=(path:string,text:string)=>{const file=files.get(path);texts.set(path,text);file.stat={mtime:file.stat.mtime+1,size:text.length};};
 const button=(text:string)=>[...w.document.querySelectorAll('button')].find((b:any)=>b.textContent===text) as HTMLButtonElement|undefined;
 const input=(selector:string)=>w.document.querySelector(selector) as HTMLInputElement;
 return{dom,w,store,view,app,files,texts,addFile,editFile,button,input,writes:()=>writes};
}

function previewBackup(s:ReturnType<typeof setup>){s.view.screen='backup';s.view.backupText=JSON.stringify({version:2,cards:[createCard('Previewed question','Previewed answer','',1,'previewed')]});s.view.render();s.button('预览合并结果')!.click();assert.ok(s.button('确认合并 1 张卡片'));}
function showCandidate(s:ReturnType<typeof setup>,text=note('Original subject')){s.addFile('A.md',text);const p=extractKnowledge(text,'A.md').points[0];assert.ok(p);s.view.screen='candidate';s.view.candidate=p;s.view.draft={front:p.question,back:p.excerpt,sourcePath:p.path};s.view.render();return p;}

test('editing a backup after preview invalidates its mounted confirmation before any write',async()=>{
 const s=setup();try{previewBackup(s);const previousConfirmation=s.button('确认合并 1 张卡片')!;const field=s.input('textarea');field.value=JSON.stringify({version:2,cards:[createCard('Unreviewed question','Unreviewed answer','',1,'unreviewed')]});field.dispatchEvent(new s.w.Event('input'));
  assert.equal(s.button('确认合并 1 张卡片'),undefined,'the stale confirmation must disappear immediately');previousConfirmation.click();await flush();assert.equal(s.writes(),0,'even an obsolete callback cannot import the old draft');assert.equal(s.store.cards.length,0);
 }finally{s.dom.window.close();}
});

for(const kind of ['invalid','oversize']as const)test(`${kind} replacement backup file cannot leave an earlier import plan confirmable`,async()=>{
 const s=setup();try{previewBackup(s);const file=s.input('input[type=file]');Object.defineProperty(file,'files',{value:[{size:kind==='oversize'?10*1024*1024+1:7,text:async()=>'invalid'}]});file.dispatchEvent(new s.w.Event('change'));await flush();s.button('确认合并 1 张卡片')?.click();await flush();assert.equal(s.writes(),0);assert.equal(s.store.cards.length,0);
 }finally{s.dom.window.close();}
});

for(const part of ['heading','context']as const)test(`candidate ${part} changes after preview require a new review`,async()=>{
 const s=setup();try{const original=note('Original subject')+'\n\nNearby explanation gives the condition for applying this concept correctly.';showCandidate(s,original);s.editFile('A.md',part==='heading'?original.replace('Original subject','Different subject'):original.replace('gives the condition','changes the condition'));
  s.button('确认保存为卡片')!.click();await flush();assert.equal(s.writes(),0,'the reviewed question/context no longer describes the current source');assert.equal(s.store.cards.length,0);
 }finally{s.dom.window.close();}
});

for(const change of ['move','delete']as const)test(`candidate source ${change} during validation cannot produce an orphaned snapshot`,async()=>{
 const s=setup(),read=deferred<string>();try{const p=showCandidate(s),file=s.files.get('A.md');s.app.vault.read=()=>read.promise;s.button('确认保存为卡片')!.click();s.files.delete('A.md');if(change==='move'){file.path='Moved.md';s.files.set(file.path,file);}read.resolve(note('Original subject'));await flush();assert.equal(s.writes(),0);assert.equal(s.store.cards.length,0);assert.equal(p.path,'A.md');
 }finally{s.dom.window.close();}
});

test('batch validation rechecks an earlier source after another source awaited I/O',async()=>{
 const s=setup(),lastRead=deferred<string>();try{const a=note('A subject'),b=note('B subject').replace('First meaningful','Another meaningful');s.addFile('A.md',a);s.addFile('B.md',b);s.app.vault.read=async(file:any)=>file.path==='B.md'?lastRead.promise:s.texts.get(file.path)!;s.view.batch=[extractKnowledge(a,'A.md').points[0],extractKnowledge(b,'B.md').points[0]];s.view.screen='batch';s.view.render();s.button('确认保存 2 张卡片')!.click();await flush();s.editFile('A.md',a.replace('First meaningful','Changed meaningful'));lastRead.resolve(b);await flush();assert.equal(s.writes(),0,'a changed member must reject the complete batch');assert.equal(s.store.cards.length,0);
 }finally{s.dom.window.close();}
});

test('candidate source is rechecked at the serialized transaction boundary',async()=>{
 const pendingWrite=deferred<void>();let first=true;const s=setup(async()=>{if(first){first=false;await pendingWrite.promise;}});try{const original=note('Original subject');showCandidate(s,original);const preceding=s.store.add('Existing queued question','Existing queued answer','');await flush();s.button('确认保存为卡片')!.click();await flush();s.editFile('A.md',original.replace('First meaningful','Changed meaningful'));pendingWrite.resolve();await preceding;await flush();assert.equal(s.writes(),1,'only the preceding unrelated write may commit');assert.equal(s.store.cards.length,1);assert.equal(s.store.cards[0].front,'Existing queued question');
 }finally{pendingWrite.resolve();s.dom.window.close();}
});

test('retrieved nested source evidence cannot mutate stored data without persistence',()=>{
 const c={...createCard('Question','Answer','A.md',1,'evidence'),sourceRef:{line:1,endLine:1,heading:'Title',excerpt:'Original evidence',fingerprint:'abc'}};let writes=0;const store=new CardStore({version:2,cards:[c]},async()=>{writes++;});store.cards[0].sourceRef!.excerpt='changed through cards';store.get(c.id)!.sourceRef!.heading='changed through get';assert.equal(store.get(c.id)!.sourceRef!.excerpt,'Original evidence');assert.equal(store.get(c.id)!.sourceRef!.heading,'Title');assert.equal(writes,0);
});

test('authored-card source cannot change while its rating waits in the transaction queue',async()=>{
 const pendingWrite=deferred<void>();let first=true;const s=setup(async()=>{if(first){first=false;await pendingWrite.promise;}});try{const source=cardMarkup('authored_safety','Original question','Original answer');s.addFile('A.md',source);s.view.notes=[parseNote(source,'A.md')];const card=s.view.cards().cards[0];s.view.screen='card';s.view.current=card;s.view.queue=[card];s.view.revealed=true;s.view.render();const preceding=s.store.add('Existing queued question','Existing queued answer','');await flush();s.input('button[aria-label="记住了 · 10 分钟后"]').click();await flush();s.editFile('A.md',cardMarkup('authored_safety','Different question','Different answer'));pendingWrite.resolve();await preceding;await flush();assert.equal(s.writes(),1,'a stale question and answer must not receive a queued rating');assert.equal(s.store.cards.length,1);
 }finally{pendingWrite.resolve();s.dom.window.close();}
});

test('a newer completed index cannot legitimize a queued rating for older source text',async()=>{
 const pendingWrite=deferred<void>();let first=true;const s=setup(async()=>{if(first){first=false;await pendingWrite.promise;}});try{const source=cardMarkup('authored_safety','Original question','Original answer');s.addFile('A.md',source);s.view.notes=[parseNote(source,'A.md')];const card=s.view.cards().cards[0];s.view.screen='card';s.view.current=card;s.view.queue=[card];s.view.revealed=true;s.view.render();const preceding=s.store.add('Existing queued question','Existing queued answer','');await flush();s.input('button[aria-label="记住了 · 10 分钟后"]').click();await flush();s.editFile('A.md',cardMarkup('authored_safety','Different question','Different answer'));await s.view.refresh(true);pendingWrite.resolve();await preceding;await flush();assert.equal(s.writes(),1,'the transaction must retain its own verified source baseline');assert.equal(s.store.cards.length,1);
 }finally{pendingWrite.resolve();s.dom.window.close();}
});

test('unchanged candidate saves exactly once with literal reviewed text and source evidence',async()=>{
 const s=setup();try{const p=showCandidate(s);const save=s.button('确认保存为卡片')!;save.click();save.click();await flush();assert.equal(s.writes(),1);assert.equal(s.store.cards.length,1);assert.equal(s.store.cards[0].front,p.question);assert.equal(s.store.cards[0].back,p.excerpt);assert.equal(s.store.cards[0].sourceRef.excerpt,p.excerpt);assert.equal(s.store.cards[0].sourceRef.line,p.line);
 }finally{s.dom.window.close();}
});

test('candidate persistence failure preserves the reviewed draft and permits an explicit retry',async()=>{
 let fail=true;const s=setup(async()=>{if(fail)throw new Error('Simulated disk failure');});try{const p=showCandidate(s);s.button('确认保存为卡片')!.click();await flush();assert.equal(s.store.cards.length,0);assert.equal(s.view.draft.back,p.excerpt);assert.equal(s.w.document.querySelectorAll('textarea[aria-label="候选答案"]').length,0);fail=false;s.button('确认保存为卡片')!.click();await flush();assert.equal(s.store.cards.length,1);assert.equal(s.store.cards[0].back,p.excerpt);
 }finally{s.dom.window.close();}
});

test('candidate markup is sanitized for rendered preview while exact source stays in the draft',async()=>{
 const s=setup();try{const original=note('Safe subject').replace('recorded carefully.','recorded carefully with <img src=x onerror=alert(1)> and <script>alert(1)</script>.');const p=showCandidate(s,original);await flush();const rendered=s.w.document.querySelector('.pp-source-evidence .pp-markdown-content').textContent;assert.ok(rendered.includes('recorded carefully with'));assert.ok(rendered.includes('图片未加载'));assert.equal(s.view.draft.back,p.excerpt);assert.equal(s.w.document.querySelectorAll('textarea[aria-label="候选答案"]').length,0);assert.equal(s.w.__markdownCalls[0].sourcePath,'A.md');assert.ok(!s.w.__markdownCalls[0].markdown.includes('onerror='));assert.equal(s.w.document.querySelectorAll('img,script,iframe,object').length,0);
 }finally{s.dom.window.close();}
});
