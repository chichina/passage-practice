// Isolated DOM/API-double regressions. These do not claim native Obsidian QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {markdownObsidianDouble} from './obsidian-markdown-double';
import {createCard} from '../src/cards';
import {cardMarkup, parseNote} from '../src/study-source';

const bundle=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'ReviewTest',platform:'browser',plugins:[{name:'obsidian-review-double',setup(b){
 b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}

 export class Modal {}
 export class ItemView {constructor(leaf){this.app=leaf.app;this.containerEl=document.createElement('div');this.contentEl=this.containerEl.appendChild(document.createElement('div'));this.containerEl.getBoundingClientRect=()=>({width:300,height:600});}addAction(){} async setState(){}}
 export const getAllTags=cache=>cache.tags||[];
 export class PluginSettingTab {} export class Setting {} export class Plugin {constructor(app){this.app=app;}}
 export class Notice {}
 export class TFile {}
 export class App {}
 export class Editor {}
 export class MarkdownView {getMode(){return 'source';}}
 window.__ReviewMarkdownView=MarkdownView;
 `,loader:'js'}));
}}]});

function boot(){
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window as any;w.structuredClone=w.eval('(value)=>JSON.parse(JSON.stringify(value))');
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};`);
 w.eval(bundle.outputFiles[0].text+';window.ReviewTest=ReviewTest;');
 return {dom,w};
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
function setup(){
 const {dom,w}=boot(),file={path:'A.md',stat:{mtime:1,size:3}},reads:ReturnType<typeof deferred<string>>[]=[];
 const read=()=>{const d=deferred<string>();reads.push(d);return d.promise;};
 const app={vault:{getMarkdownFiles:()=>[file],read,cachedRead:read},metadataCache:{getFileCache:()=>({})},workspace:{rightSplit:{collapsed:false},requestSaveLayout(){}}};
 let shield=false,writes=0;
 const host={app,currentPath:'A.md',store:{cards:[],rateAuthored:async()=>{writes++;}},shield:(on:boolean)=>{shield=on;},activeEditor:()=>null};
 const view=new w.ReviewTest.StudyView({app},host);
 view.containerEl.getBoundingClientRect=()=>({width:app.workspace.rightSplit.collapsed?0:300,height:600});
 // Isolate state transitions from visual rendering; native app QA covers rendering.
 view.render=()=>{};
 return {dom,w,view,host,app,file,reads,shield:()=>shield,writes:()=>writes};
}

test('superseded asynchronous scans cannot overwrite the fresh source cache',async()=>{
 const s=setup();
 const older=s.view.refresh();s.file.stat={mtime:2,size:3};const newer=s.view.refresh();
 s.reads[1].resolve('new');await newer;s.reads[0].resolve('old');await older;
 await s.view.refresh();
 assert.equal(s.view.notes[0].passages[0].text,'new');
 assert.equal(s.reads.length,2,'the fresh cached content can be reused');s.dom.window.close();
});

test('an aborted source validation cannot rate the previous cached question and answer',async()=>{
 const s=setup(),c=createCard('old Q','old A','A.md',1,'note:test_002');
 s.view.notes=[parseNote(cardMarkup('test_002',c.front,c.back),'A.md')];
 s.view.screen='card';s.view.queue=[c];
 const rating=s.view.rate(c,'good'),newer=s.view.refresh(true);
 const changed=cardMarkup('test_002','new Q','new A');
 s.reads[0].resolve(changed);await rating;s.reads[1].resolve(changed);await newer;
 assert.equal(s.writes(),0,'superseded validation must not commit a rating for changed source content');
 s.dom.window.close();
});

for(const change of ['edit','delete'] as const)test(`a source ${change} after its read but before the scan finishes cannot receive a stale rating`,async()=>{
 const s=setup(),c=createCard('old Q','old A','A.md',1,'note:test_002'),later=deferred<string>();
 let source=cardMarkup('test_002',c.front,c.back),files=[s.file,{path:'B.md',stat:{mtime:1,size:1}}];
 s.app.vault.getMarkdownFiles=()=>files;
 (s.app.vault as any).read=(s.app.vault as any).cachedRead=(file:{path:string})=>file.path==='A.md'?Promise.resolve(source):later.promise;
 s.view.notes=[parseNote(source,'A.md')];s.view.screen='card';s.view.queue=[c];
 const rating=s.view.rate(c,'good');await new Promise(resolve=>setTimeout(resolve,0));
 if(change==='edit'){s.file.stat.mtime++;source=cardMarkup('test_002','new Q','new A');}
 else files=files.filter(file=>file.path!=='A.md');
 later.resolve('other note');await rating;
 assert.equal(s.writes(),0,`a source ${change} during the remainder of the scan must invalidate its old result`);
 s.dom.window.close();
});

test('closing during a pending scan prevents cache publication',async()=>{
 const s=setup(),scan=s.view.refresh();await s.view.onClose();s.reads[0].resolve('late content');await scan;
 assert.equal(s.view.cache.size,0);assert.equal(s.view.notes.length,0);assert.equal(s.shield(),false);s.dom.window.close();
});

test('a collapsed sidebar stays unshielded when a pending write completes',async()=>{
 const s=setup(),write=deferred<void>();
 s.view.screen='card';s.view.queue=[createCard('next Q','next A','A.md',1,'second')];
 const pending=s.view.run(()=>write.promise,()=>s.view.advance());
 s.app.workspace.rightSplit.collapsed=true;s.view.visibilityChanged();write.resolve();await pending;
 assert.equal(s.shield(),false,'a hidden sidebar must not hide the main Markdown workspace');s.dom.window.close();
});

test('selection source is captured before asynchronous sidebar opening',async()=>{
 const {dom,w}=boot(),plugin=new w.ReviewTest.default({}),opened=deferred<any>();let result:any;
 plugin.openStudy=()=>opened.promise;
 let source='# A title\nselection from A',line=1;const editor={getSelection:()=> 'selection from A',listSelections:()=>[1],getValue:()=>source,getCursor:()=>({line,ch:0})};
 plugin.start(editor,{path:'A.md',basename:'A'});plugin.currentPath='B.md';source='# B title\nDifferent text';line=0;
 opened.resolve({startSelection:(value:any)=>{result=value;}});await Promise.resolve();
 assert.equal(result.path,'A.md');assert.equal(result.question,'A title');assert.equal(result.line,1);assert.equal(result.sourceRef.excerpt,'selection from A');assert.equal(result.sourceRef.line,1);assert.equal(result.sourceRef.heading,'A title');dom.window.close();
});

test('two splits of the same file resolve to the last active Markdown editor',()=>{
 const {dom,w}=boot(),first=new w.__ReviewMarkdownView(),second=new w.__ReviewMarkdownView();
 first.file={path:'A.md'};second.file={path:'A.md'};
 const plugin=new w.ReviewTest.default({workspace:{getLeavesOfType:()=>[{view:first},{view:second}]}});
 plugin.currentPath='A.md';plugin.lastMarkdown=second;
 assert.equal(plugin.activeEditor(),second);dom.window.close();
});

test('legacy insertion entry now saves independently and preserves all source bytes',async()=>{
 const {dom,w}=boot(),view=new w.__ReviewMarkdownView();let text='```js\nconst before = 1;\nconst after = 2;\n```';const original=text;
 Object.defineProperty(w.crypto,'randomUUID',{value:()=> 'test_insert_001'});
 view.file={path:'A.md'};view.editor={getValue:()=>text,lastLine:()=>text.split('\n').length-1,getLine:(line:number)=>text.split('\n')[line],getCursor:()=>({line:1,ch:2}),replaceRange:(insert:string,cursor:{line:number,ch:number})=>{const rows=text.split('\n');const offset=rows.slice(0,cursor.line).reduce((n:number,row:string)=>n+row.length+1,0)+cursor.ch;text=text.slice(0,offset)+insert+text.slice(offset);}};
 const plugin=new w.ReviewTest.default({workspace:{getLeavesOfType:()=>[{view}]}});plugin.currentPath='A.md';plugin.lastMarkdown=view;plugin.notify=()=>{};let saved:any;plugin.store={add:async(front:string,back:string,sourcePath:string)=>{saved={front,back,sourcePath};}};
 await plugin.insertCard({front:'Q',back:'A',sourcePath:'A.md'});
 assert.equal(text,original);assert.equal(parseNote(text,'A.md').cards.length,0);assert.deepEqual(saved,{front:'Q',back:'A',sourcePath:'A.md'});dom.window.close();
});

test('cancelled scan never replaces completed index and can restart',async()=>{const s=setup();s.view.notes=[parseNote('previous','A.md')];const pending=s.view.refresh();s.view.cancelScan();s.reads[0].resolve('cancelled');assert.equal(await pending,false);assert.equal(s.view.notes[0].passages[0].text,'previous');const next=s.view.refresh();s.reads[1].resolve('restarted');assert.equal(await next,true);assert.equal(s.view.notes[0].passages[0].text,'restarted');s.dom.window.close();});
test('oversize notes are skipped before reading with a visible reason',async()=>{const s=setup();s.file.stat.size=3*1024*1024;assert.equal(await s.view.refresh(),true);assert.equal(s.reads.length,0);assert.equal(s.view.scanWarnings.length,1);assert.match(s.view.scanWarnings[0],/2 MiB/);s.dom.window.close();});
test('warm scan reads no unchanged notes and rereads only modified source',async()=>{const s=setup();const first=s.view.refresh();s.reads[0].resolve('original');await first;await s.view.refresh();assert.equal(s.view.scanProgress.reads,0);assert.equal(s.view.scanProgress.cached,1);s.file.stat.mtime++;const changed=s.view.refresh();s.reads[1].resolve('changed');await changed;assert.equal(s.view.scanProgress.reads,1);assert.equal(s.view.scanProgress.cached,0);s.dom.window.close();});
