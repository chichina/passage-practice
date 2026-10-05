import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareText,graphemes,TextDiff} from '../src/diff';
import {mountComparison} from '../src/comparison';
import {JSDOM} from 'jsdom';
const join=(spans:TextDiff['original'])=>spans.map(x=>x.text).join('');
function checked(a:string,b:string) {const d=compareText(a,b);assert.equal(join(d.original),a);assert.equal(join(d.recall),b);assert.equal(join(d.original.filter(x=>!x.changed)),join(d.recall.filter(x=>!x.changed)));return d;}
test('identical strings stay entirely neutral',()=>{for(const x of ['', '栈，后进先出。\n', 'one two 👩🏽‍💻']) {const d=checked(x,x);assert.ok(!d.original.some(s=>s.changed));assert.equal(d.simplified,false);}});
test('addition, removal and replacement use their respective panel only',()=>{
 assert.deepEqual(checked('栈顶','查看栈顶').recall,[{text:'查看',changed:true},{text:'栈顶',changed:false}]);
 assert.deepEqual(checked('查看栈顶','栈顶').original,[{text:'查看',changed:true},{text:'栈顶',changed:false}]);
 const d=checked('栈是后进先出。','栈是先进先出。');assert.equal(join(d.original.filter(s=>s.changed)),'后');assert.equal(join(d.recall.filter(s=>s.changed)),'先');
});
test('English words are not split into scattered character highlights',()=>{
 const d=checked('Read the original text.','Read the recalled text.');assert.equal(join(d.original.filter(s=>s.changed)),'original');assert.equal(join(d.recall.filter(s=>s.changed)),'recalled');
});
test('Chinese rephrasing, repetition, punctuation, whitespace and markup preserve exact input',()=>{
 for(const pair of [
  ['栈是一种后进先出的数据结构。插入和删除都在栈顶进行。','栈是后进先出的。入栈和出栈都在栈顶进行。'],
  ['人人人人人人','人人人'],['甲乙甲乙甲乙','乙甲乙甲乙甲'],['a\r\n b\t c  ','a\n b c '],['你好，世界！','你好世界。'],['<script>alert(1)</script>','<img src=x onerror=alert(1)>'],
 ])checked(pair[0],pair[1]);
});
test('Chinese comparison anchors the nearby common phrase instead of scattering into later repeated words',()=>{
 const d=checked('栈是一种后进先出的数据结构。插入和删除都在栈顶进行，分别叫入栈和出栈。读取栈顶元素但不删除，叫查看栈顶。对空栈执行出栈操作，需要处理下溢情况。','栈是后进先出的。入栈和出栈都在栈顶进行。');
 assert.ok(d.original.some(s=>!s.changed && s.text==='都在栈顶进行'));
 assert.ok(d.original.some(s=>s.changed && s.text.includes('读取栈顶元素但不删除')));
});
test('Unicode extended graphemes remain intact, including emoji, combining marks and flags',()=>{
 const units=['👩🏽‍💻','👨‍👩‍👧‍👦','🇨🇳','e\u0301','1️⃣'];assert.deepEqual(graphemes(units.join('')),units);
 const d=checked('你好👩🏽‍💻e\u0301🇨🇳','你好👨‍👩‍👧‍👦e\u0301🇨🇳');assert.equal(join(d.original.filter(s=>s.changed)),'👩🏽‍💻');assert.equal(join(d.recall.filter(s=>s.changed)),'👨‍👩‍👧‍👦');
});
test('older-engine grapheme fallback preserves common sequences',()=>{
 const old=Intl.Segmenter;try {Object.defineProperty(Intl,'Segmenter',{value:undefined,configurable:true});assert.deepEqual(graphemes('👩🏽‍💻🇨🇳e\u0301\r\n'),['👩🏽‍💻','🇨🇳','e\u0301','\r\n']);}finally {Object.defineProperty(Intl,'Segmenter',{value:old,configurable:true});}
});
test('empty and whitespace-only answers stay literal',()=>{
 assert.deepEqual(checked('原文','').original,[{text:'原文',changed:true}]);assert.deepEqual(checked('','回答').recall,[{text:'回答',changed:true}]);checked('原文',' \n\t');
});
test('long input uses bounded fallback while preserving every code unit',()=>{
 let d=checked('甲'.repeat(25000),'乙'.repeat(25000));assert.equal(d.simplified,true);assert.equal(d.original.length,1);
 d=checked('始'+ '甲'.repeat(1500)+'终','始'+'乙'.repeat(1500)+'终');assert.equal(d.simplified,true);assert.deepEqual(d.original.map(s=>s.changed),[false,true,false]);
 d=checked('甲'.repeat(50000),'乙'.repeat(100001));assert.equal(d.simplified,true);
 d=checked('甲'.repeat(49999)+'乙','甲'.repeat(49999)+'丙');assert.equal(d.simplified,false);assert.equal(join(d.original.filter(s=>s.changed)),'乙');
});
test('deterministic random fixtures reconstruct both inputs and all matched text',()=>{
 let seed=7;const chars=['甲','乙','丙','。',' ','\n','👩🏽‍💻','e\u0301'];const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 for(let n=0;n<300;n++) {const make=()=>Array.from({length:random()%40},()=>chars[random()%chars.length]).join('');const a=make(),b=make();assert.deepEqual(checked(a,b),compareText(a,b));}
});
test('DOM uses literal text, inline marks, accessible toggle and exact plain mode',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main')!;
 const a='你好 <script>alert(1)</script> 👩🏽‍💻\n',b='您好 <img src=x onerror=alert(1)> 👨‍👩‍👧‍👦\n';let latest=true;
 mountComparison(root,a,b,'原始选段',true,v=>latest=v);
 const pre=root.querySelectorAll('pre');assert.equal(pre[0].textContent,a);assert.equal(pre[1].textContent,b);assert.equal(root.querySelectorAll('script,img').length,0);assert.ok(root.querySelectorAll('mark.pp-diff-original').length);assert.ok(root.querySelectorAll('mark.pp-diff-recall').length);
 assert.equal(root.querySelectorAll('.pp-diff-note').length,1);
 const toggle=root.querySelector('input')!;toggle.checked=false;toggle.dispatchEvent(new dom.window.Event('change'));assert.equal(latest,false);assert.equal(root.querySelectorAll('mark').length,0);assert.equal(pre[0].textContent,a);assert.equal(pre[1].textContent,b);
 toggle.checked=true;toggle.dispatchEvent(new dom.window.Event('change'));assert.ok(root.querySelectorAll('mark').length);assert.equal(pre[1].textContent,b);
});
test('empty answer placeholder is never treated as submitted text',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main')!;mountComparison(root,'原文','','原始选段');assert.equal(root.querySelectorAll('pre')[1].textContent,'（本轮未填写）');assert.equal(root.querySelectorAll('mark.pp-diff-recall').length,0);
});

test('rendered comparison defaults to rich content and repeated source toggles preserve exact baselines',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main')!;
 const original='# 原文\r\n\r\n```js\r\nconst s = "a  b";\r\n```\r\n\n![图](images/a.png)\n| A | B |\n|---|---|\n| 甲 | 👩🏽‍💻 |\n';
 const recall='## 回忆\n\n<script>unsafe()</script>\nconst s = "a b";\n';
 const calls:string[]=[],cleaned:string[]=[];let latest=true;
 const render=(parent:HTMLElement,text:string)=>{calls.push(text);const section=parent.ownerDocument.createElement('section');section.className='mock-native-markdown';section.textContent=text;parent.append(section);return()=>{cleaned.push(text);section.remove();};};
 mountComparison(root,original,recall,'完整答案',true,value=>latest=value,render);
 const switcher=root.querySelector<HTMLButtonElement>('.pp-compare-mode')!,toggle=root.querySelector<HTMLInputElement>('.pp-diff-toggle input')!,label=root.querySelector<HTMLElement>('.pp-diff-toggle')!;
 assert.deepEqual(calls,[original,recall]);assert.equal(switcher.textContent,'查看 Markdown 源码差异');assert.equal(label.hidden,false);assert.equal(root.querySelectorAll('pre,mark').length,0);
 for(let cycle=0;cycle<3;cycle++){
  switcher.click();assert.equal(root.querySelectorAll('.mock-native-markdown').length,0);assert.equal(root.querySelectorAll('pre')[0].textContent,original);assert.equal(root.querySelectorAll('pre')[1].textContent,recall);assert.equal(root.querySelectorAll('script,img').length,0);assert.equal(label.hidden,false);
  toggle.checked=cycle%2===0;toggle.dispatchEvent(new dom.window.Event('change'));assert.equal(latest,toggle.checked);assert.equal(root.querySelectorAll('pre')[0].textContent,original);assert.equal(root.querySelectorAll('pre')[1].textContent,recall);assert.equal(root.querySelectorAll('mark').length>0,toggle.checked);
  switcher.click();assert.equal(root.querySelectorAll('pre,mark').length,0);assert.equal(root.querySelectorAll('.mock-native-markdown').length,2);assert.deepEqual(calls.slice(-2),[original,recall]);assert.equal(label.hidden,false);
 }
 assert.equal(cleaned.length,6);dom.window.close();
});

test('empty rich recall stays a placeholder and never becomes Markdown or diff input',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main')!,calls:string[]=[];
 mountComparison(root,'**原文**','','原始选段',true,()=>{},(parent,text)=>{calls.push(text);parent.textContent='原文';return()=>parent.replaceChildren();});
 assert.deepEqual(calls,['**原文**']);assert.equal(root.querySelector('.pp-empty-answer')!.textContent,'（本轮未填写）');
 root.querySelector<HTMLButtonElement>('.pp-compare-mode')!.click();assert.equal(root.querySelectorAll('pre')[1].textContent,'（本轮未填写）');assert.equal(root.querySelectorAll('.pp-diff-recall').length,1,'only the legend key exists for an empty recall');dom.window.close();
});
