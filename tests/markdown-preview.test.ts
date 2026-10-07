// Isolated asynchronous API/DOM regressions. Renderer fixtures verify integration,
// not Obsidian's actual Markdown parser; native-app QA is maintained separately.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {parseNote} from '../src/study-source';
import {mountComparison} from '../src/comparison';
import {markdownObsidianDouble} from './obsidian-markdown-double';

const bundle=await build({stdin:{contents:"export * from './src/main';export * from './src/markdown-preview';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'MarkdownTest',platform:'browser',plugins:[{name:'obsidian-markdown-lifecycle-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}
 export class Modal {constructor(app){this.app=app;this.containerEl=document.createElement('div');this.modalEl=this.containerEl.createDiv();this.contentEl=this.modalEl.createDiv();}open(){document.body.append(this.containerEl);this.onOpen();}close(){this.onClose();this.containerEl.remove();}}
 export class ItemView {constructor(leaf){this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.createDiv();this.containerEl.getBoundingClientRect=()=>({width:400,height:700});}addAction(){} async setState(){}}
 export class PluginSettingTab {} export class Setting {} export class Plugin {} export class Notice {} export class TFile {} export class App {} export class Editor {} export class MarkdownView {} export const getAllTags=()=>[];
 window.MarkdownDouble={Component,MarkdownRenderChild,TFile};`,loader:'js'}));
}}]});
const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
function deferred(){let resolve!:()=>void,reject!:(error:Error)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function setup(){
 const dom=new JSDOM('<body><main></main></body>',{runScripts:'outside-only'}),w=dom.window as any;w.structuredClone=w.eval('(value)=>JSON.parse(JSON.stringify(value))');
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundle.outputFiles[0].text+';window.MarkdownTest=MarkdownTest;');
 const opened:any[][]=[];let reads=0,writes=0;
 const app={metadataCache:{getFirstLinkpathDest:()=>null},vault:{getAllLoadedFiles:()=>[],getMarkdownFiles:()=>[],read:async()=>{reads++;return'';},create:async()=>{writes++;},getResourcePath:(file:any)=>'app://vault/'+file.path},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){},openLinkText:(...args:any[])=>{opened.push(args);return Promise.resolve();}}};
 const pending:any[]=[];
 w.__markdownRenderHook=(call:any)=>{const done=deferred(),child=new w.MarkdownDouble.MarkdownRenderChild(call.el);call.owner.addChild(child);call.el.textContent='Partial '+call.markdown;const item={...call,child,done,lateChild:null as any};pending.push(item);return done.promise.then(()=>{item.lateChild=new w.MarkdownDouble.MarkdownRenderChild(call.el);call.owner.addChild(item.lateChild);call.el.textContent='Rendered '+call.markdown;});};
 const scope=new w.MarkdownTest.MarkdownPreviewScope(app),root=w.document.querySelector('main') as HTMLElement;
 const button=(text:string)=>[...w.document.querySelectorAll('button')].find((b:any)=>b.textContent===text) as HTMLButtonElement|undefined;
 return{dom,w,app,scope,root,pending,button,opened,reads:()=>reads,writes:()=>writes};
}
function assertReleased(call:any){assert.equal(call.owner.loaded,false);assert.equal(call.child.loaded,false);assert.equal(call.owner.children.length,0);assert.equal(call.el.childNodes.length,0);if(call.lateChild)assert.equal(call.lateChild.loaded,false);}

test('reset cancels staging, unloads renderer children, and never commits an older delayed render',async()=>{
 const s=setup();try{s.scope.mount(s.root,'old answer','学习/old.md');const old=s.pending[0];assert.equal(s.root.textContent,'正在排版…');assert.equal(old.child.loaded,true);
  s.scope.reset();assert.equal(s.root.childNodes.length,0);assertReleased(old);s.scope.mount(s.root,'new answer','学习/new.md');const fresh=s.pending[1];fresh.done.resolve();await flush();assert.equal(s.root.querySelector('.pp-markdown-content')!.textContent,'Rendered new answer');assert.equal(s.root.querySelector('.pp-markdown')!.getAttribute('aria-busy'),'false');assert.equal(fresh.sourcePath,'学习/new.md');
  old.done.resolve();await flush();assertReleased(old);assert.ok(!s.root.textContent!.includes('old answer'));assert.equal(s.root.querySelectorAll('.pp-markdown-content').length,1);s.scope.reset();assertReleased(fresh);assert.equal(s.root.childNodes.length,0);assert.equal(s.writes(),0);
 }finally{s.dom.window.close();}
});

test('cancelled renderer rejection cannot resurrect an error or detached answer',async()=>{
 const s=setup();try{const cancel=s.scope.mount(s.root,'secret','A.md');const call=s.pending[0];cancel();cancel();call.done.reject(new Error('late renderer failure'));await flush();assert.equal(s.root.childNodes.length,0);assertReleased(call);}finally{s.dom.window.close();}
});

test('a renderer failure exposes a safe message and releases renderer-owned children',async()=>{
 const s=setup();try{s.scope.mount(s.root,'secret source','A.md');const call=s.pending[0];call.done.reject(new Error('renderer internals must not leak'));await flush();assert.equal(s.root.querySelectorAll('.pp-error').length,1);assert.ok(!s.root.textContent!.includes('secret source'));assert.ok(!s.root.textContent!.includes('renderer internals'));assert.equal(s.root.querySelector('.pp-markdown')!.getAttribute('aria-busy'),'false');assertReleased(call);s.scope.reset();assert.equal(s.root.childNodes.length,0);}finally{s.dom.window.close();}
});

test('native-shaped code, table, image, list, task and link fixture retains structure in the preview',async()=>{
 const s=setup();try{const asset=Object.assign(new s.w.MarkdownDouble.TFile(),{path:'学习/assets/diagram.png',extension:'png'}),resolutions:any[][]=[];s.app.metadataCache.getFirstLinkpathDest=(...args:any[])=>{resolutions.push(args);return asset;};
  s.w.__markdownRenderHook=(call:any)=>{const child=new s.w.MarkdownDouble.MarkdownRenderChild(call.el);call.owner.addChild(child);call.el.innerHTML='<h2>算法</h2><p>Use <strong>two</strong> passes.</p><ul><li>First<ul><li>Nested</li></ul></li></ul><pre><code class="language-js">const value = "a  b";\n</code></pre><table><thead><tr><th>Kind</th></tr></thead><tbody><tr><td>stack</td></tr></tbody></table><p><img alt="Diagram" src="app://vault/学习/assets/diagram.png"></p><ul><li><input type="checkbox" checked> Task</li></ul><a class="internal-link" data-href="Other#Section" href="Other#Section">Other</a>';return Promise.resolve();};
  const source='## 算法\n\nUse **two** passes.\n\n- First\n  - Nested\n\n```js\nconst value = "a  b";\n```\n\n| Kind |\n| --- |\n| stack |\n\n![Diagram](assets/diagram.png)\n\n- [x] Task\n\n[[Other#Section|Other]]';s.scope.mount(s.root,source,'学习/Topic.md');await flush();
  const call=s.w.__markdownCalls[0];assert.equal(call.sourcePath,'学习/Topic.md');assert.equal(call.app,s.app);assert.equal(s.root.querySelector('pre code')!.textContent,'const value = "a  b";\n');assert.equal(s.root.querySelectorAll('.pp-table-scroll > table').length,1);assert.equal(s.root.querySelector('th')!.textContent,'Kind');assert.equal(s.root.querySelectorAll('ul ul li').length,1);assert.equal(s.root.querySelector('img')!.getAttribute('alt'),'Diagram');assert.equal(s.root.querySelector<HTMLInputElement>('input')!.disabled,true);assert.equal(s.root.querySelector('strong')!.textContent,'two');assert.deepEqual(resolutions,[['assets/diagram.png','学习/Topic.md']]);assert.equal(s.reads(),0);
  const anchor=s.root.querySelector('a')!,click=new s.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});anchor.dispatchEvent(click);assert.equal(click.defaultPrevented,true);assert.deepEqual(s.opened,[['Other#Section','学习/Topic.md',true]]);const oldHost=s.root.querySelector('.pp-markdown')!;s.scope.reset();oldHost.append(anchor);anchor.dispatchEvent(new s.w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(s.opened.length,1,'unload removes the internal-link listener');assert.equal(s.writes(),0);
 }finally{s.dom.window.close();}
});

for(const action of ['close','retry']as const)test(`practice modal ${action} during delayed reveal removes answers and renderer children`,async()=>{
 const s=setup();try{const modal=new s.w.MarkdownTest.PracticeModal(s.app,'secret original','Question',null,'A.md',()=>{});modal.open();s.button('跳过，使用标题')!.click();s.button('揭晓并对照')!.click();const call=s.pending[0];assert.equal(call.sourcePath,'A.md');
  if(action==='close')modal.close();else{const field=s.w.document.querySelector('.pp-missed');field.value='missed secret';field.dispatchEvent(new s.w.Event('input'));s.button('只练这些漏点')!.click();}
  assertReleased(call);call.done.resolve();await flush();assertReleased(call);assert.equal(s.w.document.querySelectorAll('.pp-markdown,.pp-compare').length,0);assert.ok(!s.w.document.body.textContent.includes('secret original'));if(action==='retry')assert.equal(modal.session.stage,'recall');assert.equal(s.writes(),0);
 }finally{s.dom.window.close();}
});

for(const action of ['next section','home','close']as const)test(`study ${action} while Markdown render is pending cannot publish the old answer`,async()=>{
 const s=setup();try{const note=parseNote('# First\n\nOld secret answer.\n\n# Second\n\nFresh secret answer.','学习/Topic.md'),host={app:s.app,currentPath:note.path,store:null,storageError:'',shield(){},activeEditor:()=>null};const view=new s.w.MarkdownTest.StudyView({app:s.app},host);view.notes=[note];s.w.document.body.append(view.containerEl);view.render();s.w.document.querySelector('.pp-passage-choice').click();s.button('揭晓并对照')!.click();await flush();const call=s.pending.at(-1)!;assert.equal(call.sourcePath,note.path);assert.equal(call.owner.loaded,true,'the current Markdown render remains pending after source navigation settles');
  if(action==='next section')s.button('下一节')!.click();else if(action==='home')s.button('返回学习')!.click();else await view.onClose();assertReleased(call);call.done.resolve();await flush();assertReleased(call);assert.equal(s.w.document.querySelectorAll('.pp-markdown').length,0);assert.ok(!s.w.document.body.textContent.includes('Old secret answer.'));assert.ok(!s.w.document.body.textContent.includes('Fresh secret answer.'));if(action==='next section')assert.equal(view.session.question,'Second');assert.equal(s.writes(),0);
 }finally{s.dom.window.close();}
});

test('cards modal close during delayed front and answer render releases both owners',async()=>{
 const s=setup();try{Object.defineProperty(s.w.crypto,'randomUUID',{value:()=> 'markdown-card'});const store=new s.w.MarkdownTest.CardStore(null,async()=>{});await store.add('**Question**','Hidden answer','学习/Card.md');const modal=new s.w.MarkdownTest.CardsModal(s.app,store,()=>{});modal.open();s.button('开始复习 1 张')!.click();s.button('揭晓答案')!.click();assert.equal(s.pending.length,3);modal.close();for(const call of s.pending){assertReleased(call);call.done.resolve();}await flush();for(const call of s.pending)assertReleased(call);assert.equal(s.w.document.querySelectorAll('.pp-cards-modal,.pp-markdown').length,0);assert.ok(!s.w.document.body.textContent.includes('Hidden answer'));assert.equal(store.cards[0].reviews,0);}finally{s.dom.window.close();}
});


test('switching to source during delayed Markdown cannot overwrite exact comparison and remounts fresh owners',async()=>{
 const s=setup();try{const original='**Old answer**\r\n\n```js\nconst s = "a  b";\n```',recall='**My answer**\n';mountComparison(s.root,original,recall,'完整答案',true,()=>{},(parent,text,onReady)=>s.scope.mount(parent,text,'学习/Topic.md',onReady));
  const first=s.pending.slice();assert.equal(first.length,2);const mode=s.root.querySelector<HTMLButtonElement>('.pp-compare-mode')!;mode.click();for(const call of first)assertReleased(call);assert.equal(s.root.querySelectorAll('pre')[0].textContent,original);assert.equal(s.root.querySelectorAll('pre')[1].textContent,recall);
  mode.click();const latest=s.pending.slice(2);assert.equal(latest.length,2);latest.forEach(call=>call.done.resolve());await flush();assert.equal(s.root.querySelectorAll('.pp-markdown-content').length,2);first.forEach(call=>call.done.resolve());await flush();for(const call of first)assertReleased(call);assert.equal(s.root.querySelectorAll('.pp-markdown-content').length,2);mode.click();for(const call of latest)assertReleased(call);assert.equal(s.root.querySelectorAll('pre')[0].textContent,original);assert.equal(s.root.querySelectorAll('pre')[1].textContent,recall);
 }finally{s.dom.window.close();}
});

for(const outcome of ['resolve','reject']as const)test(`cancelled renderer immediately releases late children and registrations before ${outcome}`,async()=>{
 const s=setup();try{const done=deferred();let call:any,lateChild:any,cleanups=0,lateEvents=0;s.w.__markdownRenderHook=(value:any)=>{call=value;return done.promise.then(()=>{lateChild=new s.w.MarkdownDouble.MarkdownRenderChild(value.el);lateChild.load();value.owner.addChild(lateChild);value.owner.register(()=>cleanups++);value.owner.registerDomEvent(value.el,'late-event',()=>lateEvents++);value.el.dispatchEvent(new s.w.Event('late-event'));value.el.textContent='late secret';assert.equal(lateChild.loaded,false,'late children unload before the renderer finishes');assert.equal(cleanups,1,'late registrations clean up immediately');if(outcome==='reject')throw new Error('late failure');});};s.scope.mount(s.root,'secret','A.md');s.scope.reset();done.resolve();await flush();assert.equal(s.root.childNodes.length,0);assert.equal(call.el.childNodes.length,0);assert.equal(call.owner.children.length,0);assert.equal(lateChild.loaded,false);assert.equal(cleanups,1);assert.equal(lateEvents,0);assert.ok(lateChild.unloadCalls>0);}finally{s.dom.window.close();}
});

test('candidate list redraw releases old preview owners; edit and preview preserve exact drafts',async()=>{
 const s=setup();try{const note=parseNote('# Topic\n\n- **First**: Keep this complete original list.\n- Second: Keep this second original item.','学习/Topic.md'),host={app:s.app,currentPath:note.path,store:null,storageError:'',shield(){},activeEditor:()=>null};const view=new s.w.MarkdownTest.StudyView({app:s.app},host);view.notes=[note];view.mode='knowledge';s.w.document.body.append(view.containerEl);view.render();const initial=s.pending.slice();assert.ok(initial.length>0);const search=s.w.document.querySelector('[aria-label="搜索知识候选"]');search.value='No match';search.dispatchEvent(new s.w.Event('input'));initial.forEach(assertReleased);initial.forEach(call=>call.done.resolve());await flush();assert.equal(s.w.document.querySelectorAll('.pp-knowledge-list .pp-markdown').length,0);
 search.value='';search.dispatchEvent(new s.w.Event('input'));s.button('预览与编辑')!.click();const exact=view.draft.back;assert.equal(s.w.document.querySelectorAll('[aria-label="候选答案"]').length,0);s.button('编辑 Markdown 源码')!.click();const field=s.w.document.querySelector('[aria-label="候选答案"]');assert.equal(field.value,exact);field.value=exact+'\n\n**Changed** $x^2$';field.dispatchEvent(new s.w.Event('input'));s.button('切换到 Markdown 预览')!.click();assert.equal(view.draft.back,exact+'\n\n**Changed** $x^2$');assert.equal(s.w.document.querySelectorAll('[aria-label="候选答案"]').length,0);assert.equal(s.writes(),0);await view.onClose();
 }finally{s.dom.window.close();}
});
