// DOM/API-double regressions for ordinary authoring paths, not native Obsidian QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {markdownObsidianDouble} from './obsidian-markdown-double';
import {parseNote, selectionSourceRef} from '../src/study-source';
import {resolveCardSourceLine} from '../src/source-location';

const bundle=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'ProvenanceTest',platform:'browser',plugins:[{name:'obsidian-provenance-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}
 export class Plugin {} export class PluginSettingTab {} export class Setting {} export class App {} export class Editor {} export class MarkdownView {}
 export class Notice {constructor(message){(window.__notices??=[]).push(message);}}
 export class TFile {} export const getAllTags=()=>[];window.__TFile=TFile;
 export class ItemView {constructor(leaf){this.leaf=leaf;this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.createDiv();this.containerEl.getBoundingClientRect=()=>({width:400,height:700});}addAction(){} async setState(){}}
 export class Modal {constructor(app){this.app=app;this.containerEl=document.createElement('div');this.modalEl=this.containerEl.createDiv();this.contentEl=this.modalEl.createDiv();}open(){document.body.append(this.containerEl);this.onOpen();}close(){this.onClose();this.containerEl.remove();}}
 `,loader:'js'}));
}}]});
const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const source='# 第一章\n## 主题\n相同选段\n# 第二章\n## 主题\n前文 相同选段 与其他知识。';
const path='Study/原文.md';
function setup(text=source){
 const dom=new JSDOM('<body><main class="mod-root"></main></body>',{runScripts:'outside-only'}),w=dom.window as any;
 w.structuredClone=w.eval('(value)=>JSON.parse(JSON.stringify(value))');
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundle.outputFiles[0].text+';window.ProvenanceTest=ProvenanceTest;');Object.defineProperty(w.crypto,'randomUUID',{value:()=>`proof-${Math.random()}`});
 const file=Object.assign(new w.__TFile(),{path,basename:'原文',stat:{mtime:1,size:text.length}}),opened:number[]=[];
 const sourceContainer=w.document.querySelector('.mod-root'),sourceLeaf={view:{file,containerEl:sourceContainer},openFile:async(_file:any,options:any)=>{opened.push(options.eState.line);},setEphemeralState(){}};
 const app={vault:{getMarkdownFiles:()=>[file],getAbstractFileByPath:(key:string)=>key===path?file:null,read:async()=>text,cachedRead:async()=>text},metadataCache:{getFileCache:()=>({}),getFirstLinkpathDest:()=>null},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){},getLeavesOfType:()=>[sourceLeaf],getLeaf:()=>sourceLeaf}};
 let writes=0;const store=new w.ProvenanceTest.CardStore(null,async()=>{writes++;});
 const editor={getSelection:()=>'相同选段',listSelections:()=>[{}],getValue:()=>text,getCursor:()=>({line:5,ch:3})};
 const host={app,store,currentPath:path,storageError:'',shield(){},activeEditor:()=>({file,editor})};
 const view=new w.ProvenanceTest.StudyView({app},host);view.notes=[parseNote(text,path)];view.refresh=async()=>true;w.document.body.append(view.containerEl);
 const button=(label:string)=>{const el=[...w.document.querySelectorAll('button')].find((b:any)=>b.textContent===label)as HTMLButtonElement;assert.ok(el,`missing ${label}`);return el;};
 const fill=(label:string,value:string)=>{const input=w.document.querySelector(`[aria-label="${label}"]`);assert.ok(input);input.value=value;input.dispatchEvent(new w.Event('input'));};
 return{dom,w,app,view,store,file,editor,opened,button,fill,writes:()=>writes};
}

for(const cloze of [false,true])test(`selection command retains provenance through ${cloze?'cloze generation':'answer edits'} and save/reveal`,async()=>{
 const s=setup();try{
  const plugin=new s.w.ProvenanceTest.default();plugin.openStudy=async()=>s.view;
  plugin.cardFromSelection(s.editor,s.file);await flush();
  assert.equal(s.view.draft.sourceRef.excerpt,'相同选段');
  if(cloze){s.fill('要挖空的关键词','选段');s.button('生成挖空草稿').click();assert.match(s.view.draft.back,/关键词：选段/);}
  else{s.fill('正面 · 问题','独立改写问题');s.fill('背面 · 答案','完全改写答案');}
  s.button('保存卡片').click();await flush();
  const card=s.store.cards[0];assert.ok(card);assert.equal(s.writes(),1);assert.equal(card.sourceRef.kind,'selection');
  assert.deepEqual(Array.from(card.sourceRef.headingPath),['第二章','主题']);assert.equal(card.sourceRef.excerpt,'相同选段');
  s.button('翻到背面 · 揭晓答案').click();await flush();assert.deepEqual(s.opened,[5]);
 }finally{s.dom.window.close();}
});

for(const entry of ['command','sidebar'])test(`${entry} selection practice carries original evidence when converted to missed-point card`,async()=>{
 const s=setup();try{
  if(entry==='command'){const plugin=new s.w.ProvenanceTest.default();plugin.openStudy=async()=>s.view;plugin.start(s.editor,s.file);await flush();}
  else s.view.selection();
  assert.equal(s.view.passage.sourceRef.kind,'selection');
  s.view.session.start('自问');s.view.session.reveal();s.view.session.missed='我自己的漏点答案';s.view.render();
  s.button('把漏点制成卡片').click();s.button('保存卡片').click();await flush();
  const card=s.store.cards[0];assert.equal(card.back,'我自己的漏点答案');assert.equal(card.sourceRef.excerpt,'相同选段');assert.equal(resolveCardSourceLine(source,card),5);
 }finally{s.dom.window.close();}
});

for(const missed of [false,true])test(`${missed?'missed-point':'full-section'} card preserves original section through ordinary editor and cloze`,async()=>{
 const s=setup('# 章节\n缓存减少重复计算。\n必须保留失效条件。');try{
  const p=s.view.notes[0].passages[0];s.view.beginPassage(p);s.view.session.reveal();s.view.session.missed='缓存是我需要再练的漏点';s.view.render();
  s.button(missed?'把漏点制成卡片':'把本节制成卡片').click();
  s.fill('要挖空的关键词','缓存');s.button('生成挖空草稿').click();
  const before=JSON.parse(JSON.stringify(s.view.draft.sourceRef));s.button('保存卡片').click();await flush();
  const card=s.store.cards[0];assert.deepEqual(JSON.parse(JSON.stringify(card.sourceRef)),before);assert.equal(card.sourceRef.excerpt,p.text);assert.equal(card.sourceRef.kind,'passage');
  assert.match(card.back,/关键词：缓存/);assert.equal(resolveCardSourceLine('# 章节\n缓存减少重复计算。\n必须保留失效条件。',card),1);
  s.view.openEditor(card);s.fill('背面 · 答案','又改写了一次答案');s.button('保存卡片').click();await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(s.store.cards[0].sourceRef)),before);assert.equal(s.store.cards[0].back,'又改写了一次答案');
 }finally{s.dom.window.close();}
});

test('standalone CardsModal seed saves original evidence after editing the back',async()=>{
 const s=setup();try{
  const sourceRef=selectionSourceRef(source,'相同选段',path,5);
  const modal=new s.w.ProvenanceTest.CardsModal(s.app,s.store,()=>{},s.w.JSON.parse(JSON.stringify({front:'问题',back:'相同选段',sourcePath:path,sourceRef})));modal.open();
  s.fill('背面 · 答案','重新写过的答案');s.button('保存卡片').click();await flush();
  const card=s.store.cards[0];assert.equal(card.back,'重新写过的答案');assert.equal(card.sourceRef.excerpt,'相同选段');assert.equal(resolveCardSourceLine(source,card),5);
 }finally{s.dom.window.close();}
});
