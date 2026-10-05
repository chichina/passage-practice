// Isolated UI/state regression coverage; native Obsidian is verified separately.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {markdownObsidianDouble} from './obsidian-markdown-double';
import {parseNote} from '../src/study-source';
const bundle=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'StructureTest',platform:'browser',plugins:[{name:'obsidian-structure-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}
export class Modal {} export class Plugin {} export class Notice {} export class TFile {} export class App {} export class Editor {} export class MarkdownView {} export const getAllTags=()=>[];export class ItemView {constructor(leaf){this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.createDiv();this.containerEl.getBoundingClientRect=()=>({width:400,height:700});}addAction(){} async setState(){}}`,loader:'js'}));
}}]});
const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
function setup(text:string){
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window as any;
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundle.outputFiles[0].text+';window.StructureTest=StructureTest;');
 let shield=false,writes=0;const source=text,note=parseNote(text,'学习/A.md');
 const app={vault:{getAllLoadedFiles:()=>[],getMarkdownFiles:()=>[],create:()=>{writes++;}},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){}}};
 const host={app,currentPath:note.path,store:null,storageError:'',shield:(on:boolean)=>{shield=on;},activeEditor:()=>null};
 const view=new w.StructureTest.StudyView({app},host);view.notes=[note];view.refresh=async()=>{view.render();return true;};w.document.body.append(view.containerEl);
 const button=(label:string)=>[...w.document.querySelectorAll('button')].find((el:any)=>el.textContent===label)as HTMLButtonElement|undefined;
 const content=()=>w.document.body.textContent;const tab=(label:string)=>[...w.document.querySelectorAll('[role=tab]')].find((el:any)=>el.textContent.startsWith(label))as HTMLButtonElement;
 return{dom,w,view,note,button,content,tab,shield:()=>shield,writes:()=>writes,source};
}
test('heading list hides answer previews; opening uses the real title and a complete hidden answer',async()=>{
 const s=setup('# A\n\nFirst paragraph secret.\n\nSecond paragraph secret.\n\n```js\nlet x=1;\n```\n\n## B\n\nLeaf first.\n\nLeaf last.');
 try{s.view.render();assert.ok(!s.content().includes('First paragraph secret'));s.w.document.querySelector('.pp-passage-choice').click();assert.equal(s.view.session.stage,'recall');assert.equal(s.shield(),true);assert.ok(!s.content().includes('First paragraph secret'));assert.equal(s.view.session.question,'A · 引言（子标题前）');s.button('揭晓并对照')!.click();await flush();assert.equal(s.shield(),false);assert.ok(s.w.document.querySelector('.pp-card .pp-markdown-content').textContent.includes('First paragraph secret.'));assert.equal(s.w.document.querySelectorAll('.pp-literal-diff').length,0);s.button('查看 Markdown 源码差异')!.click();assert.equal(s.w.document.querySelector('.pp-card pre').textContent,s.note.passages[0].text);assert.ok(s.content().includes('Second paragraph secret.'));assert.ok(s.content().includes('let x=1;'));assert.ok(!s.content().includes('Leaf last.'));assert.ok(!s.button('下一段'));const old=s.button('下一节')!;old.click();old.click();assert.equal(s.view.session.question,'B');assert.equal(s.view.passagePosition,1);assert.equal(s.view.session.source,'Leaf first.\n\nLeaf last.');assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
test('repeat recalls the complete original section after focused missed-point retry; cancel restores source',()=>{
 const s=setup('# A\n\nFirst answer.\n\nComplete second answer.');try{s.view.beginPassage(s.note.passages[0]);s.button('揭晓并对照')!.click();s.view.session.missed='Complete second answer.';s.view.render();s.button('只练这些漏点')!.click();assert.equal(s.view.session.target,'Complete second answer.');s.button('揭晓并对照')!.click();s.button('重新回忆本节')!.click();assert.equal(s.view.session.target,'First answer.\n\nComplete second answer.');assert.equal(s.view.session.stage,'recall');s.button('返回学习')!.click();assert.equal(s.shield(),false);assert.equal(s.view.screen,'home');assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
test('explicit selection keeps its literal selection and reading preparation',async()=>{
 const s=setup('# A\nFull answer.');try{s.view.startSelection({text:'selected only',question:'A',line:1,path:s.note.path});await flush();assert.equal(s.view.session.stage,'question');assert.equal(s.view.session.source,'selected only');assert.ok(s.content().includes('selected only'));assert.equal(s.shield(),false);assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
test('outline answers are absent from the DOM until revealed; partial reveal stays shielded and drilling resets hidden children',()=>{
 const s=setup('# Topic\n## Secret child A\n### Secret grandchild\n## Secret child B');try{s.view.mode='outline';s.view.render();const branch=s.note.outline.find(x=>x.label==='Topic')!;s.view.outlineQueue=s.note.outline;s.view.beginOutline(branch);assert.ok(!s.content().includes('Secret child A'));assert.ok(!s.content().includes('Secret child B'));assert.equal(s.shield(),true);s.button('揭晓下一个分支')!.click();assert.ok(s.content().includes('Secret child A'));assert.ok(!s.content().includes('Secret child B'));assert.equal(s.shield(),true);s.button('继续回忆下一级（1）')!.click();assert.equal(s.view.outline.label,'Secret child A');assert.ok(!s.content().includes('Secret grandchild'));s.button('全部揭晓')!.click();assert.ok(s.content().includes('Secret grandchild'));assert.equal(s.shield(),false);s.button('返回上一级节点')!.click();assert.equal(s.view.outline.label,'Topic');assert.ok(!s.content().includes('Secret child A'));s.button('全部揭晓')!.click();assert.ok(s.content().includes('Secret child B'));s.button('重新回忆本节点')!.click();assert.ok(!s.content().includes('Secret child B'));s.button('返回学习')!.click();assert.equal(s.shield(),false);assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
test('four learning modes support keyboard traversal and outline cancellation when hidden',()=>{
 const s=setup('# Topic\n## Child');try{s.view.render();s.tab('段落复习').dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(s.view.mode,'outline');assert.ok(s.w.document.activeElement.textContent.startsWith('大纲回忆'));s.tab('大纲回忆').dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(s.view.mode,'knowledge');s.view.beginOutline(s.note.outline[0]);s.view.visible=()=>false;s.view.visibilityChanged();assert.equal(s.shield(),false);assert.equal(s.view.screen,'home');assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
test('outline drilling stays on its captured subtree after a source refresh changes same-line labels',()=>{
 const s=setup('# Root\n## Old child\n### Old grandchild\n## Sibling');try{const original=s.note.outline.find(x=>x.label==='Root')!;s.view.outlineQueue=[original];s.view.beginOutline(original);s.view.notes=[parseNote('# Root\n## NEW unrelated child\n### NEW unrelated grandchild\n## Sibling','学习/A.md')];s.button('全部揭晓')!.click();assert.ok(s.content().includes('Old child'));s.button('继续回忆下一级（1）')!.click();assert.equal(s.view.outline.label,'Old child');assert.ok(!s.content().includes('NEW unrelated'));s.button('全部揭晓')!.click();assert.ok(s.content().includes('Old grandchild'));assert.ok(!s.content().includes('NEW unrelated'));assert.equal(s.writes(),0);}finally{s.dom.window.close();}
});
