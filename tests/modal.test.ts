// DOM-level fallback tests. These do not claim native Obsidian execution.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {markdownObsidianDouble} from './obsidian-markdown-double';
const bundled=await build({entryPoints:['src/main.ts'],bundle:true,write:false,format:'iife',globalName:'PluginUnderTest',platform:'browser',plugins:[{name:'obsidian-test-double',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`${markdownObsidianDouble}
export class Modal { constructor(app){this.app=app;this.containerEl=document.createElement('div');this.modalEl=this.containerEl.createDiv();this.contentEl=this.modalEl.createDiv();}open(){document.body.append(this.containerEl);this.onOpen();}close(){this.onClose();this.containerEl.remove();}} export class ItemView{} export const getAllTags=()=>[]; export class Plugin{} export class Notice{} export class TFile{} export class App{} export class Editor{} export class MarkdownView{}`,loader:'js'}));}}]});
const boot=()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'});const w=dom.window;
 w.eval(`HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(c){this.classList.add(c)};HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.text!==undefined)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const [k,v] of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e};HTMLElement.prototype.createDiv=function(o={}){return this.createEl('div',o)};`);
 w.eval(bundled.outputFiles[0].text+';window.PluginUnderTest=PluginUnderTest;');return {dom,w};
};
const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
test('modal only mounts rendered comparison after reveal; retry removes answers and highlights',async()=>{
 const {w}=boot();const modal=new (w as any).PluginUnderTest.PracticeModal({},'原文绝密👩🏽‍💻','问题',null,'',()=>{});modal.open();
 const root=w.document,button=(text:string)=>Array.from(root.querySelectorAll('button')).find(x=>x.textContent===text)!;
 assert.equal(root.querySelectorAll('pre,mark,.pp-compare').length,0);assert.ok(!root.body.textContent!.includes('原文绝密'));
 button('跳过，使用标题').click();assert.equal(root.querySelectorAll('pre,mark,.pp-compare').length,0);assert.ok(!root.body.textContent!.includes('原文绝密'));
 const recall=root.querySelector('textarea')!;recall.value='回答绝密👩🏽‍💻';recall.dispatchEvent(new w.Event('input'));button('揭晓并对照').click();await flush();
 assert.equal(root.querySelectorAll('.pp-markdown-content').length,2);assert.equal(root.querySelectorAll('.pp-markdown-content')[0].textContent,'原文绝密👩🏽‍💻');assert.equal(root.querySelectorAll('.pp-markdown-content')[1].textContent,'回答绝密👩🏽‍💻');assert.equal(root.querySelectorAll('pre').length,0);assert.ok(root.querySelectorAll('mark').length>0);
 button('查看 Markdown 源码差异').click();assert.equal(root.querySelectorAll('pre').length,2);assert.equal(root.querySelectorAll('pre')[0].textContent,'原文绝密👩🏽‍💻');assert.equal(root.querySelectorAll('pre')[1].textContent,'回答绝密👩🏽‍💻');assert.ok(root.querySelectorAll('mark').length);
 const missed=root.querySelector('textarea')!;missed.value='漏点绝密';missed.dispatchEvent(new w.Event('input'));
 const toggle=root.querySelector<HTMLInputElement>('.pp-diff-toggle input')!;toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));assert.equal(missed.value,'漏点绝密');
 button('只练这些漏点').click();assert.equal(root.querySelectorAll('pre,mark,.pp-compare').length,0);assert.equal(root.querySelector('textarea')!.value,'');assert.ok(!root.body.textContent!.includes('漏点绝密'));assert.ok(!root.body.textContent!.includes('原文绝密'));
 button('揭晓并对照').click();await flush();assert.equal(root.querySelector('.pp-markdown-content')!.textContent,'漏点绝密');button('查看 Markdown 源码差异').click();assert.equal(root.querySelectorAll('pre')[0].textContent,'漏点绝密');assert.equal(root.querySelectorAll('pre')[1].textContent,'（本轮未填写）');assert.equal(root.querySelector<HTMLInputElement>('.pp-diff-toggle input')!.checked,false);
 button('结束练习').click();assert.equal(root.querySelectorAll('.pp-modal').length,0);
});
