import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {prepareSafeMarkdown} from '../src/markdown-safety';

const resolveLocalAsset=(path:string)=>['assets/中文 image.png','image.png','photo.jpg','nested(image).png'].includes(path)?'app://local/vault/'+encodeURIComponent(path):null;
const safe=(source:string)=>prepareSafeMarkdown(source,{resolveLocalAsset});
const dom=(source:string)=>new JSDOM('<body>'+safe(source)+'</body>').window.document;

test('ordinary native Markdown, math, tables, lists, links, and wiki links are retained',()=>{
 const source='# Heading\n\n**bold** and *emphasis*, ~~strike~~ ==mark==\n\n- first\n- second\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n$$E = mc^2$$\n\n$\\frac{1}{2}$\n\n[external](https://example.org) [[My note#Heading|label]]';
 assert.equal(safe(source),source);
});

test('safe raw HTML keeps paragraph alignment and removes all unsanctioned attributes',()=>{
 const result=dom('<p align="center" style="background:url(https://evil.test/x)" onclick="fetch(1)" class="internal-embed" data-href="https://evil.test">**center**</p>');
 const p=result.querySelector('p')!;
 assert.equal(p.getAttribute('align'),'center');assert.equal(p.attributes.length,1);assert.equal(p.textContent,'**center**');
});

test('HTML attribute spelling, quoting, newlines, entities, and duplicates cannot smuggle attributes',()=>{
 for(const source of ['<p ALIGN=center ONCLICK=alert(1)>x</p>','<p align="center"\nstyle="background: url(https://evil.test)">x</p>','<p align="center" align="right" onmouseover="alert(1)">x</p>']){
  const p=dom(source).querySelector('p')!;assert.equal(p.attributes.length,1);assert.equal(p.getAttribute('align'),'center');
 }
 assert.equal(dom('<p align="center&quot; onload=&quot;alert(1)">x</p>').querySelector('p')!.attributes.length,0);
});

test('Markdown inline, angle destinations, reference, collapsed and shortcut local images resolve',()=>{
 for(const source of ['![x](image.png)','![x](<assets/中文 image.png> "title")','![x](nested\\(image\\).png)','![x][local]\n\n[local]: image.png','![local][]\n\n[local]: image.png','![local]\n\n[local]: image.png']){
  const doc=dom(source),image=doc.querySelector('img');assert.ok(image,source);assert.match(image.src,/^app:\/\/local\/vault\//);assert.equal(doc.querySelectorAll('img').length,1);
 }
});

test('Obsidian raster embeds allow local dimensions and raw image tags resolve through the same callback',()=>{
 const wiki=dom('![[assets/中文 image.png|320x200]]').querySelector('img')!;assert.equal(wiki.width,320);assert.equal(wiki.height,200);
 const raw=dom('<img src="image.png" alt="a &amp; b" width="300" height="150" onerror="alert(1)" srcset="https://evil.test 2x" style="background:url(https://evil.test)">').querySelector('img')!;
 assert.equal(raw.alt,'a & b');assert.equal(raw.width,300);assert.equal(raw.height,150);assert.deepEqual(Array.from(raw.attributes).map(a=>a.name),['src','alt','width','height']);
});

test('all remote image and embedding syntaxes become inert before the native renderer sees them',()=>{
 for(const source of ['![alt](https://evil.test/x.png)','![alt](//evil.test/x.png)','![alt](data:image/svg+xml,evil)','![alt](https%3A%2F%2Fevil.test/x.png)','![alt](https&colon;//evil.test/x.png)','![[https://evil.test/x.png]]','![[//evil.test/x.png]]','![[nested.md]]','![[local.pdf]]','![[local.svg]]','![alt][r]\n\n[r]: https://evil.test/pixel.png','![r][]\n\n[r]: https://evil.test/pixel.png','![r]\n\n[r]: https://evil.test/pixel.png','![unresolved reference]','![[unclosed','![nested [image](https://evil.test)](https://evil.test/pixel.png)']){
  const result=safe(source);assert.ok(!result.includes('!['),source);assert.equal(new JSDOM(result).window.document.querySelectorAll('img,iframe,object,embed,video,audio,source').length,0,source);
 }
});

test('remote local-looking URLs and unsafe resolver URLs cannot become app images',()=>{
 for(const path of ['https://evil.test/a.png','//evil.test/a.png','/etc/a.png','C:\\image.png','image.svg','image.svg#x.png','image.png?x=1','image.png%00','http&#58;//evil.test/a.png']){
  let calls=0;const result=prepareSafeMarkdown(`![](${path})`,{resolveLocalAsset:()=>{calls++;return'app://local/x';}});assert.equal(calls,0,path);assert.ok(!result.includes('<img'),path);
 }
 for(const url of ['https://evil.test/a.png','file:///tmp/a.png','data:image/svg+xml,evil','blob:https://evil.test/id','app://local/a.png" onload="evil','app://local/a.png\n'])assert.ok(!prepareSafeMarkdown('![](image.png)',{resolveLocalAsset:()=>url}).includes('<img'),url);
 assert.doesNotThrow(()=>prepareSafeMarkdown('![](image.png)',{resolveLocalAsset:()=>{throw Error('gone');}}));
});

test('SVG, scripts, passive-resource HTML, styles and foreign namespaces stay literal',()=>{
 const source='<script src="https://evil.test/a.js">alert(1)</script><style>@import "https://evil.test/a.css";</style><iframe src="https://evil.test"></iframe><object data="https://evil.test"></object><embed src="https://evil.test"><video poster="https://evil.test"><source src="https://evil.test"></video><audio src="https://evil.test"></audio><link rel="preload" href="https://evil.test"><meta http-equiv="refresh" content="0;url=https://evil.test"><svg><image href="https://evil.test"/><foreignObject><img src="https://evil.test"></foreignObject></svg><math href="https://evil.test"></math>';
 const document=dom(source);assert.equal(document.querySelectorAll('script,style,iframe,object,embed,video,audio,source,link,meta,svg,math,img').length,0);
});

test('HTML comments including multiline and malformed comments cannot reactivate an embed',()=>{
 for(const source of ['!<!--comment-->[x](https://evil.test/a.png)','<!--\n<img src="https://evil.test/x">\n-->safe','<!-- unclosed <img src="https://evil.test/x">']){
  const result=safe(source);assert.ok(!result.includes('!['));assert.ok(!result.includes('<img'));assert.ok(!result.includes('<!--'));
 }
});

test('safe HTML links remain clickable without executable schemes, ping, events or target attributes',()=>{
 const a=dom('<a href="https://example.org?a=1&amp;b=2" ping="https://evil.test" onclick="evil()" target="frame">link</a>').querySelector('a')!;
 assert.equal(a.href,'https://example.org/?a=1&b=2');assert.deepEqual(Array.from(a.attributes).map(a=>a.name),['href','rel']);
 for(const href of ['javascript:alert(1)','java&#x73;cript:alert(1)','java&#9;script:alert(1)','data:text/html,evil','file:///etc/passwd','//evil.test','\\\\evil.test'])assert.equal(dom(`<a href="${href}">x</a>`).querySelector('a')!.hasAttribute('href'),false,href);
 assert.equal(safe('<https://example.org/path> <mail@example.org>'),'<https://example.org/path> <mail@example.org>');
});

test('fenced code is literal and cannot invoke code-language postprocessors',()=>{
 for(const language of ['dataviewjs','dataview','query','mermaid','js','python','custom-plugin','dataviewjs title="x"']){
  const source='```'+language+'\nfetch("https://evil.test");\n<img src="https://evil.test">\n![remote](https://evil.test/x)\n```';
  const result=safe(source),document=new JSDOM(result).window.document,pre=document.querySelector('pre')!;
  assert.ok(pre,language);assert.equal(pre.textContent,'fetch("https://evil.test");\n<img src="https://evil.test">\n![remote](https://evil.test/x)\n');assert.equal(document.querySelectorAll('img,script').length,0);assert.ok(!result.includes('```'));assert.equal(pre.querySelector('code')!.className,'');
 }
});

test('tilde, longer, nested and unclosed code fences are inert',()=>{
 for(const source of ['~~~dataviewjs\nfetch(1)\n~~~','````dataviewjs\n```\nfetch(1)\n````','> ```dataviewjs\n> fetch(1)\n> ```','- ```dataviewjs\n  fetch(1)\n  ```','```dataviewjs\nfetch(1)']){
  const result=safe(source);assert.ok(result.includes('<pre><code>'),source);assert.ok(!/(?:`{3,}|~{3,})dataviewjs/.test(result));assert.ok(!result.includes('class="language-'));
 }
});

test('nested fences remove container prefixes and cannot swallow dedented following content',()=>{
 assert.equal(dom('- ```js\n  const x = 1;\n  ```\n- Next').querySelector('code')!.textContent,'const x = 1;\n');
 assert.equal(dom('> ```js\n> const x = 1;\n> ```\n\nOutside').querySelector('code')!.textContent,'const x = 1;\n');
 for(const source of ['- ```js\n  const x = 1;\n- Next\n# Heading','> ```js\n> const x = 1;\nOutside\n# Heading']){
  const result=safe(source);assert.ok(result.includes('</code></pre>\n'));assert.ok(result.endsWith('# Heading'));assert.ok(!dom(source).querySelector('code')!.textContent!.includes('Heading'));
 }
});

test('removed comments cannot concatenate a dangerous MathJax command',()=>{
 assert.ok(!safe('$$\\req<!-- x -->uire{evil}$$').includes('\\require'));
});

test('large malformed Markdown tokens fail closed without losing the surrounding text',()=>{
 const source='start '+ '!['.repeat(25_000)+' ending';const begin=performance.now(),result=safe(source);assert.ok(result.startsWith('start '));assert.ok(result.endsWith(' ending'));assert.ok(!result.includes('!['));assert.ok(performance.now()-begin<5000);
});

test('inline code preserves literal Markdown and disables Dataview expressions',()=>{
 const source='Use `<img src=x> ![x](https://evil.test) **bold**` then `= fetch("https://evil.test")` and `$=fetch(1)`';
 const result=safe(source),document=new JSDOM(result).window.document,codes=document.querySelectorAll('code');assert.equal(codes.length,3);assert.equal(codes[0].textContent,'<img src=x> ![x](https://evil.test) **bold**');assert.ok(codes[1].textContent!.startsWith('\u2060='));assert.ok(codes[2].textContent!.startsWith('\u2060$='));assert.equal(document.querySelectorAll('img').length,0);
 assert.ok(dom('<code>= fetch(1)</code>').querySelector('code')!.textContent!.startsWith('\u2060='));
});

test('dangerous MathJax extension commands are disabled while ordinary math stays native',()=>{
 for(const command of ['bbox','mmlToken','require','href','includegraphics','style','cssId','htmlStyle','csname','def','newcommand']){
  const result=safe('$$\\'+command+'{https://evil.test}$$');assert.ok(!result.includes('\\'+command+'{'),command);assert.ok(result.includes('disabled'));
 }
 assert.equal(safe('$$\\frac{x^2}{2} + \\sqrt{y}$$'),'$$\\frac{x^2}{2} + \\sqrt{y}$$');
});

test('adversarial labels and trusted app resource escaping cannot create new HTML attributes',()=>{
 const result=prepareSafeMarkdown('![\" onerror=\"fetch(1)](image.png)',{resolveLocalAsset:()=>"app://local/a&b.png"});const img=new JSDOM(result).window.document.querySelector('img')!;assert.equal(img.attributes.length,2);assert.equal(img.getAttribute('src'),'app://local/a&b.png');assert.ok(img.alt.includes('onerror'));
});

test('sanitizing a render copy never changes the original source string or options',()=>{
 const card={back:'<p align="center">![x](https://evil.test)</p>\n```dataviewjs\nevil()\n```'},before=JSON.stringify(card),options={resolveLocalAsset};prepareSafeMarkdown(card.back,options);assert.equal(JSON.stringify(card),before);assert.deepEqual(options,{resolveLocalAsset});
});
