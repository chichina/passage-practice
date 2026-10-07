// Isolated DOM/API-double navigation regressions; these do not claim native Obsidian QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createCard, type Card} from '../src/cards';
import {cardMarkup, parseNote, type Passage} from '../src/study-source';
import {markdownObsidianDouble} from './obsidian-markdown-double';

const bundle=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'NavigationTest',platform:'browser',plugins:[{name:'obsidian-navigation-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}
 export class Modal {}
 export class ItemView {constructor(leaf){this.leaf=leaf;this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.appendChild(document.createElement('div'));this.containerEl.getBoundingClientRect=()=>({width:400,height:700});}addAction(){} async setState(){}}
 export class PluginSettingTab {} export class Setting {} export class Plugin {} export class App {} export class Editor {} export class MarkdownView {}
 export class Notice {constructor(message){(window.__navigationNotices??=[]).push(message);}}
 export class TFile {}
 export const getAllTags=cache=>cache.tags||[];
 window.__NavigationTFile=TFile;`,loader:'js'}));
}}]});

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>resolve=yes);return{promise,resolve};}
const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const source='# First\n\nFirst original answer.\n\n# Second\n\nSecond original answer.';
function setup(text=source,path='Study/A.md'){
 const dom=new JSDOM('<body><main class="mod-root"></main></body>',{runScripts:'outside-only'}),w=dom.window as any;
 w.structuredClone=w.eval('(value)=>JSON.parse(JSON.stringify(value))');
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundle.outputFiles[0].text+';window.NavigationTest=NavigationTest;');
 const file=Object.assign(new w.__NavigationTFile(),{path,basename:'A',stat:{mtime:1,size:text.length}}),files=new Map<string,any>([[path,file]]);
 const reads:Array<{file:any;done:ReturnType<typeof deferred<string>>}>=[],opened:Array<{leaf:string;file:any;options:any}>=[],positions:Array<{leaf:string;line:number}>=[];
 let shield=false;
 const createLeaf=(name:string,leafPath:string,root=true)=>{
  const container=w.document.createElement('div');if(root)w.document.querySelector('.mod-root').append(container);else w.document.body.append(container);
  return{view:{file:{path:leafPath},containerEl:container},openFile:async(target:any,options:any)=>{opened.push({leaf:name,file:target,options});},setEphemeralState:({line}:{line:number})=>positions.push({leaf:name,line})};
 };
 const otherLeaf=createLeaf('other','Other.md'),sourceLeaf=createLeaf('source',path),leaves=[otherLeaf,sourceLeaf];
 const read=(target:any)=>{const done=deferred<string>();reads.push({file:target,done});return done.promise;};
 const app={vault:{getAbstractFileByPath:(key:string)=>files.get(key)||null,getMarkdownFiles:()=>[...files.values()],getAllLoadedFiles:()=>[...files.values()],read,cachedRead:read,getResourcePath:(target:any)=>'app://vault/'+target.path},metadataCache:{getFileCache:()=>({}),getFirstLinkpathDest:()=>null},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){},getLeavesOfType:()=>leaves,getLeaf:()=>otherLeaf}};
 const host={app,currentPath:path,store:{cards:[],decks:[]},storageError:'',shield:(value:boolean)=>{shield=value;},activeEditor:()=>null};
 const view=new w.NavigationTest.StudyView({app},host);view.notes=[parseNote(text,path)];w.document.body.append(view.containerEl);
 const button=(label:string)=>{const value=Array.from(view.contentEl.querySelectorAll('button')).find((el:any)=>el.textContent===label) as HTMLButtonElement|undefined;assert.ok(value,`missing button: ${label}`);return value;};
 const clickAgain=(el:HTMLButtonElement)=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const beginPassage=(p:Passage=view.notes[0].passages[0])=>{view.passageQueue=view.notes[0].passages;view.passagePosition=view.passageQueue.indexOf(p);view.beginPassage(p);return p;};
 const beginCard=(c:Card)=>{const local=w.JSON.parse(JSON.stringify(c));view.startCards([local]);return local;};
 return{dom,w,view,host,app,file,files,reads,opened,positions,sourceLeaf,otherLeaf,leaves,createLeaf,button,clickAgain,beginPassage,beginCard,shield:()=>shield};
}

test('passage reveal restores the answer before reading and opens its exact source only once',async()=>{
 const s=setup();try{
  const passage=s.beginPassage(s.view.notes[0].passages[1]);
  assert.equal(s.view.session.stage,'recall');assert.equal(s.shield(),true);assert.equal(s.reads.length,0);assert.equal(s.opened.length,0);
  const reveal=s.button('揭晓并对照');reveal.click();
  assert.equal(s.view.session.stage,'compare');assert.equal(s.shield(),false);assert.equal(s.reads.length,1);assert.equal(s.opened.length,0);
  assert.ok(s.view.contentEl.querySelector('.pp-compare'),'comparison is mounted before navigation finishes');
  s.clickAgain(reveal);assert.equal(s.reads.length,1,'a queued second click must not start another read');
  s.reads[0].done.resolve(source);await flush();
  assert.equal(s.opened.length,1);assert.equal(s.opened[0].file,s.file);assert.equal(s.opened[0].leaf,'source');
  assert.equal(s.opened[0].options.active,true,'the source tab becomes visible even if it was inactive');
  assert.equal(s.opened[0].options.eState.line,passage.line);
  assert.deepEqual(s.positions,[{leaf:'source',line:passage.line}]);
  s.clickAgain(reveal);await flush();assert.equal(s.opened.length,1,'detached reveal controls cannot reopen the source');
 }finally{s.dom.window.close();}
});

test('authored card reveal resolves its current marker line after earlier text moves',async()=>{
 const markup=cardMarkup('nav_card_001','Question','Answer'),original='# Cards\n\n'+markup,s=setup(original);try{
  const c=s.beginCard(createCard('Question','Answer',s.file.path,1,'note:nav_card_001'));
  assert.equal(s.view.revealed,false);assert.equal(s.shield(),true);assert.equal(s.reads.length,0);assert.equal(s.opened.length,0);
  const reveal=s.button('翻到背面 · 揭晓答案');reveal.click();
  assert.equal(s.view.revealed,true);assert.equal(s.shield(),false);assert.ok(s.view.contentEl.querySelector('.pp-flash-answer'));
  s.clickAgain(reveal);assert.equal(s.reads.length,1);
  const updated='# Inserted\n\nNew introduction.\n\n'+original;s.reads[0].done.resolve(updated);await flush();
  const expected=parseNote(updated,c.sourcePath).cards[0].line;assert.equal(s.opened.length,1);assert.equal(s.opened[0].file.path,c.sourcePath);assert.equal(s.opened[0].options.eState.line,expected);
  s.clickAgain(reveal);await flush();assert.equal(s.opened.length,1);
 }finally{s.dom.window.close();}
});

test('snapshot card reveal locates the preserved excerpt instead of a stale saved line',async()=>{
 const original='# Topic\n\nUnique original excerpt.\n\nAnother paragraph.',s=setup(original);try{
  const c=createCard('Question','Answer',s.file.path,1,'snapshot-nav');c.sourceRef={line:2,endLine:3,heading:'Topic',excerpt:'Unique original excerpt.',fingerprint:'12345678'};
  s.beginCard(c);s.button('翻到背面 · 揭晓答案').click();
  const moved='Inserted preamble.\n\n'+original;s.reads[0].done.resolve(moved);await flush();
  assert.equal(s.opened.length,1);assert.equal(s.opened[0].options.eState.line,4);assert.equal(s.opened[0].file.path,c.sourcePath);
 }finally{s.dom.window.close();}
});

test('a card with no source still reveals without a read or navigation',async()=>{
 const s=setup();try{s.beginCard(createCard('Question','Answer','',1,'source-free'));s.button('翻到背面 · 揭晓答案').click();await flush();assert.equal(s.view.revealed,true);assert.equal(s.shield(),false);assert.equal(s.reads.length,0);assert.equal(s.opened.length,0);assert.equal(s.view.busy,false);}finally{s.dom.window.close();}
});

for(const mode of ['passage','card']as const)for(const change of ['exit','close','replace']as const)test(`${mode} read completion after ${change} cannot navigate the old source`,async()=>{
 const markup=cardMarkup('nav_card_002','Question','Answer'),text=mode==='card'?markup:source,s=setup(text);try{
  if(mode==='passage'){s.beginPassage();s.button('揭晓并对照').click();}else{s.beginCard(createCard('Question','Answer',s.file.path,1,'note:nav_card_002'));s.button('翻到背面 · 揭晓答案').click();}
  assert.equal(s.reads.length,1);assert.equal(s.view.busy,true);
  // Invoke lifecycle/state changes directly: the pending operation intentionally disables its old controls.
  if(change==='close')await s.view.onClose();
  else if(change==='exit'){s.view.refresh=async()=>true;s.view.home();}
  else if(mode==='passage')s.view.beginPassage(s.view.notes[0].passages[1]);
  else{s.view.queue=[createCard('New question','New answer','',1,'replacement')];s.view.advance();}
  s.reads[0].done.resolve(text);await flush();
  assert.equal(s.opened.length,0);assert.equal(s.positions.length,0);assert.equal(s.view.busy,false);
  if(change!=='replace')assert.equal(s.shield(),false);
 }finally{s.dom.window.close();}
});

for(const mutation of ['edit','delete','replace','rename']as const)test(`a source ${mutation} during its pending read cannot cause a stale jump`,async()=>{
 const s=setup();try{
  s.beginPassage();s.button('揭晓并对照').click();
  if(mutation==='edit')s.file.stat.mtime++;
  else if(mutation==='delete')s.files.delete(s.file.path);
  else if(mutation==='replace')s.files.set(s.file.path,Object.assign(new s.w.__NavigationTFile(),{path:s.file.path,stat:{...s.file.stat}}));
  else s.file.path='Study/Renamed.md';
  s.reads[0].done.resolve(source);await flush();
  assert.equal(s.opened.length,0);assert.equal(s.positions.length,0);assert.equal(s.view.session.stage,'compare');assert.equal(s.shield(),false);assert.ok(s.view.message,'unavailable or changed source has a visible error');assert.equal(s.view.busy,false);
 }finally{s.dom.window.close();}
});

for(const mode of ['passage','card']as const)test(`${mode} content changed before reveal is rejected rather than opened at an old line`,async()=>{
 const markup=cardMarkup('nav_card_003','Question','Answer'),text=mode==='card'?markup:source,s=setup(text);try{
  if(mode==='passage'){s.beginPassage();s.button('揭晓并对照').click();s.reads[0].done.resolve(source.replace('First original answer.','Replacement answer.'));}
  else{s.beginCard(createCard('Question','Answer',s.file.path,1,'note:nav_card_003'));s.button('翻到背面 · 揭晓答案').click();s.reads[0].done.resolve(cardMarkup('nav_card_003','Question','Changed answer'));}
  await flush();assert.equal(s.opened.length,0);assert.equal(s.positions.length,0);assert.ok(s.view.message);assert.equal(s.shield(),false);
 }finally{s.dom.window.close();}
});

test('closing during openFile prevents a late ephemeral editor position',async()=>{
 const s=setup(),opened=deferred<void>();try{
  s.sourceLeaf.openFile=async(file:any,options:any)=>{s.opened.push({leaf:'source',file,options});await opened.promise;};
  s.beginPassage();s.button('揭晓并对照').click();s.reads[0].done.resolve(source);await flush();assert.equal(s.opened.length,1);
  await s.view.onClose();opened.resolve();await flush();assert.equal(s.positions.length,0);assert.equal(s.shield(),false);
 }finally{s.dom.window.close();}
});

test('passage navigation preserves original scoped search order and ignores repeated old controls',async()=>{
 const s=setup();try{
  const notes=[parseNote('# Keep first\n\nFirst.\n\n# Omit\n\nExcluded by query.\n\n# Keep second\n\nSecond.','Study/A.md'),parseNote('# Keep third\n\nThird.\n\n# Keep fourth\n\nFourth.','Study/B.md'),parseNote('# Keep outside\n\nOutside.','Elsewhere/C.md')];
  s.view.notes=notes;s.view.studyScope={kind:'folder',value:'Study'};s.view.passageQuery='Keep';s.view.render();
  const choices=Array.from(s.view.contentEl.querySelectorAll('.pp-passage-choice'))as HTMLButtonElement[];
  assert.equal(choices.length,4);choices[1].click();
  assert.deepEqual(Array.from(s.view.passageQueue,(p:any)=>p.question),['Keep first','Keep second','Keep third','Keep fourth']);assert.equal(s.view.passagePosition,1);
  const next=s.button('下一节');next.click();s.clickAgain(next);assert.equal(s.view.passagePosition,2);assert.equal(s.view.session.question,'Keep third');assert.equal(s.view.session.stage,'recall');
  // Opening another source may change the host's current path, but cannot reshape this captured queue.
  s.host.currentPath='Elsewhere/C.md';s.view.passageQuery='outside';s.view.studyScope={kind:'current',value:''};
  const previous=s.button('上一节');previous.click();s.clickAgain(previous);assert.equal(s.view.passagePosition,1);assert.equal(s.view.session.question,'Keep second');
  s.button('上一节').click();assert.equal(s.button('上一节').disabled,true);assert.equal(s.view.passagePosition,0);
  s.button('下一节').click();s.button('下一节').click();s.button('下一节').click();assert.equal(s.view.passagePosition,3);assert.equal(s.button('下一节').disabled,true);
  assert.deepEqual(Array.from(s.view.passageQueue,(p:any)=>p.path),['Study/A.md','Study/A.md','Study/B.md','Study/B.md']);assert.equal(s.reads.length,0);assert.equal(s.opened.length,0);assert.equal(s.shield(),true);
 }finally{s.dom.window.close();}
});

test('pending reveal disables previous and next even for explicitly dispatched old controls',async()=>{
 const s=setup();try{
  s.beginPassage();const next=s.button('下一节');s.button('揭晓并对照').click();s.clickAgain(next);
  assert.equal(s.button('下一节').disabled,true);assert.equal(s.view.passagePosition,0);assert.equal(s.reads.length,1);
  s.reads[0].done.resolve(source);await flush();s.button('下一节').click();assert.equal(s.view.passagePosition,1);assert.equal(s.view.session.stage,'recall');assert.equal(s.opened.length,1);assert.equal(s.shield(),true);
 }finally{s.dom.window.close();}
});
