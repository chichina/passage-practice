import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCard, type SourceRef} from '../src/cards';
import {extractKnowledge} from '../src/knowledge';
import {cardMarkup,parseNote, type Passage} from '../src/study-source';
import {resolveCardSourceLine,resolvePassageSourceLine} from '../src/source-location';

const path='学习/来源.md';
const card=(front='问题',back='原始答案',sourceRef?:SourceRef)=>({...createCard(front,back,path,1,'snapshot'),...(sourceRef?{sourceRef}: {})});
const reference=(source:string,index=0):SourceRef=>{const p=extractKnowledge(source,path).points[index];assert.ok(p);return {line:p.line,endLine:p.endLine,heading:p.headingPath.join(' › ')||p.heading,excerpt:p.excerpt,fingerprint:p.fingerprint};};
const answer='缓存是一种保存中间结果以减少重复计算的机制。需要注意失效策略。';

test('section lookup follows unique literal content after earlier lines are inserted',()=>{
 const source='# 主题\n\n第一行原文\n第二行原文';const p=parseNote(source,path).passages[0];
 assert.equal(resolvePassageSourceLine('\n\n'+source,p),4);
 assert.deepEqual(p,parseNote(source,path).passages[0]);
});
test('duplicate leaf headings use the full path, not the first heading',()=>{
 const source='# 第一章\n## 同名小节\n重复答案\n# 第二章\n## 同名小节\n重复答案';
 const p=parseNote(source,path).passages[1];assert.deepEqual(p.headingPath,['第二章','同名小节']);
 assert.equal(resolvePassageSourceLine('\n'+source,p),6);
});
test('identical repeated sections remain ambiguous even at a matching saved line',()=>{
 const source='# 重复\n原文\n# 重复\n原文';const p=parseNote(source,path).passages[0];
 assert.throws(()=>resolvePassageSourceLine(source,p),/多处相同/);
});
test('changed section content or heading never falls back to a stale position',()=>{
 const source='# 主题\n原始答案';const p=parseNote(source,path).passages[0];
 for(const current of ['# 主题\n新的答案','# 改名\n原始答案','', '# 其他\n原始答案\n# 主题\n已改变'])assert.throws(()=>resolvePassageSourceLine(current,p),/已变化|已移除/);
});
test('sections containing excluded authored blocks resolve from a fresh parse',()=>{
 const source='# 主题\n正文一\n'+cardMarkup('marked01','卡片问题','卡片答案')+'\n正文二';
 const p=parseNote(source,path).passages[0];assert.ok(!source.includes(p.text));
 assert.equal(resolvePassageSourceLine('\n'+source,p),2);
});
test('setext headings and CRLF line endings preserve accurate section lines',()=>{
 const source='章节\r\n====\r\n\r\n原始答案';const p=parseNote(source,path).passages[0];
 assert.equal(resolvePassageSourceLine('\r\n'+source,p),4);
});
test('selection lookup permits exact substrings, counts newlines, and rejects repeats',()=>{
 const p:Passage={text:'选中的词\r\n下一行',question:'来源',line:90,path,kind:'selection'};
 assert.equal(resolvePassageSourceLine('前文\n含有选中的词\n下一行和后文',p),1);
 assert.throws(()=>resolvePassageSourceLine('选中的词\n下一行\n选中的词\n下一行',p),/多处相同/);
 assert.throws(()=>resolvePassageSourceLine('选中的词\n新的内容',p),/已变化|已移除/);
});
test('legacy selections have no unsafe line-zero fallback',()=>{
 const p:Passage={text:'旧选段',question:'来源',line:0,path};
 assert.equal(resolvePassageSourceLine('前文\n旧选段',p),1);
 assert.throws(()=>resolvePassageSourceLine('其他内容',p),/无法准确定位/);
});
test('authored cards resolve their current fence line from stable ID and exact content',()=>{
 const source=cardMarkup('stable01','问题','原始答案');const c={...card(),id:'note:stable01'};
 assert.equal(resolveCardSourceLine('# 标题\n\n'+source,c),2);
 assert.equal(resolveCardSourceLine(source.replace(/\n/g,'\r\n'),c),0);
});
test('authored lookup rejects missing, malformed, changed, and duplicated IDs',()=>{
 const source=cardMarkup('stable01','问题','原始答案');const c={...card(),id:'note:stable01'};
 assert.throws(()=>resolveCardSourceLine('# 标题\n原始答案',c),/标记已移除/);
 assert.throws(()=>resolveCardSourceLine(source.replace('答案：','内容：'),c),/格式已变化/);
 assert.throws(()=>resolveCardSourceLine(cardMarkup('stable01','问题','改变的答案'),c),/问题或答案已变化/);
 assert.throws(()=>resolveCardSourceLine(source+'\n'+cardMarkup('stable01','其他问题','其他答案'),c),/重复的卡片 ID/);
});
test('reference lookup verifies its old range and relocates unchanged evidence',()=>{
 const source='# 缓存\n\n'+answer;const ref=reference(source),c=card('修改过的问题','修改过的答案',ref);
 assert.equal(resolveCardSourceLine(source,c),2);
 assert.equal(resolveCardSourceLine('\n\n'+source,c),4);
 assert.equal(resolveCardSourceLine(source.replace(/\n/g,'\r\n'),c),2);
 assert.deepEqual(c.sourceRef,ref);
});
test('reference lookup uses full heading paths to choose between identical excerpts',()=>{
 const source='# 章节二\n## 缓存\n\n'+answer,ref=reference(source);
 const current='# 章节一\n## 缓存\n\n'+answer+'\n\n'+source;
 assert.equal(resolveCardSourceLine(current,card('问题',answer,ref)),8);
});
test('repeated heading and excerpt remains ambiguous even at the saved line',()=>{
 const source='# 缓存\n\n'+answer,ref=reference(source);
 assert.throws(()=>resolveCardSourceLine(source+'\n\n'+source,card('问题',answer,ref)),/多处相同的原文和标题/);
});
test('stale reference never opens new content or merely matching headings',()=>{
 const source='# 缓存\n\n'+answer,ref=reference(source),c=card('问题',answer,ref);
 for(const changed of ['',source.replace('减少','避免'),source.replace('# 缓存','# 其他'),source+'改变了同一行原文'])assert.throws(()=>resolveCardSourceLine(changed,c),/已变化|移除/);
});
test('duplicate excerpts under bold subheadings use their saved full context',()=>{
 const original='# 技术\n\n**第二种**\n\n'+answer,ref=reference(original);
 const current='# 技术\n\n**第一种**\n\n'+answer+'\n\n**第二种**\n\n'+answer;
 assert.equal(resolveCardSourceLine(current,card('问题',answer,ref)),8);
});
test('fake code-block headings cannot disambiguate a duplicate reference',()=>{
 const source='# 缓存\n\n'+answer,ref=reference(source);
 const current='# 缓存\n\n```md\n# 其他标题\n```\n\n'+answer+'\n\n'+answer;
 assert.throws(()=>resolveCardSourceLine(current,card('问题',answer,ref)),/多处相同/);
});
test('references without Markdown headings retain declared document titles',()=>{
 const source='---\ntitle: 声明标题\n---\n\n'+answer,ref=reference(source);
 assert.equal(ref.heading,'声明标题');
 assert.equal(resolveCardSourceLine(source.replace('\n\n','\n\n\n'),card('问题',answer,ref)),5);
});
test('multiline reference retains exact whitespace and returns first evidence line',()=>{
 const source='# 列表\n\n- 第一条：需要保留这里原有的所有信息。\n    - 子条目：这是不可丢失的限定条件。\n- 第二条：需要保留原始项目的排列顺序。';
 const ref=reference(source);assert.equal(resolveCardSourceLine('\n'+source,card('问题',ref.excerpt,ref)),3);
 assert.throws(()=>resolveCardSourceLine(source.replace('    -','  -'),card('问题',ref.excerpt,ref)),/已变化|移除/);
});
test('legacy snapshots do not infer provenance from an editable question or answer',()=>{
 const source='# 第一节\n共同答案\n# 第二节\n共同答案';
 assert.throws(()=>resolveCardSourceLine(source,card('第二节','共同答案')),/未保存独立的原文来源信息/);
 assert.throws(()=>resolveCardSourceLine('前文\n这里有一个唯一选段作为答案。',card('自定义问题','唯一选段')),/未保存独立的原文来源信息/);
 assert.throws(()=>resolveCardSourceLine(source,card('自定义问题','共同答案')),/未保存独立的原文来源信息/);
});
test('legacy sections with omitted authored-card markup still require independent provenance',()=>{
 const source='# 主题\n正文一\n'+cardMarkup('marked01','标记问题','标记答案')+'\n正文二',p=parseNote(source,path).passages[0];
 assert.throws(()=>resolveCardSourceLine('\n'+source,card(p.question,p.text)),/未保存独立的原文来源信息/);
});
test('missing evidence and missing source paths give explicit actionable errors',()=>{
 assert.throws(()=>resolveCardSourceLine('其他内容',card()),/未保存独立.*请打开/);
 assert.throws(()=>resolveCardSourceLine('原始答案',{...card(),sourcePath:''}),/没有来源笔记/);
 assert.throws(()=>resolvePassageSourceLine('原始答案',{text:'原始答案',question:'问题',line:0,path:''}),/没有来源笔记/);
 assert.throws(()=>resolveCardSourceLine('原始答案',{...card(),back:''}),/无法准确定位/);
});

test('reference evidence in metadata, comments, or fenced examples cannot replace the original prose',()=>{
 const original='# 缓存\n\n'+answer,ref=reference(original),c=card('问题',answer,ref);
 for(const current of ['# 缓存\n```text\n'+answer+'\n```','# 缓存\n<!--\n'+answer+'\n-->'])assert.throws(()=>resolveCardSourceLine(current,c),/已变化|移除/);
 assert.equal(resolveCardSourceLine('# 缓存\n```text\n'+answer+'\n```\n\n'+answer,c),5);
});

test('example labels sharing the evidence line retain the extracted heading context',()=>{
 const source='# 技术\n\n**例一：缓存** '+answer,ref=reference(source);
 assert.equal(ref.heading,'技术 › 例一：缓存');
 assert.equal(resolveCardSourceLine('\n'+source,card('问题',ref.excerpt,ref)),3);
});


test('extractor-derived references under top-level Setext headings retain document context',()=>{
 const source='缓存\n====\n\n'+answer,ref=reference(source),c=card('问题',answer,ref);
 assert.equal(ref.heading,'来源');
 assert.equal(resolveCardSourceLine(source,c),3);
 assert.equal(resolveCardSourceLine('\n\n'+source,c),5);
 assert.throws(()=>resolveCardSourceLine(source.replace('减少','避免'),c),/已变化|移除/);
});
test('extractor-derived references under nested Setext headings retain their ATX parent',()=>{
 const source='# 上层\n\n缓存\n----\n\n'+answer,ref=reference(source),c=card('问题',answer,ref);
 assert.equal(ref.heading,'上层');
 assert.equal(resolveCardSourceLine(source,c),5);
 assert.equal(resolveCardSourceLine('\n'+source,c),6);
});
test('Setext ancestors do not contaminate an extractor-derived nested ATX heading trail',()=>{
 const source='根标题\n====\n\n## 上层\n\n### 缓存\n\n'+answer,ref=reference(source);
 assert.equal(ref.heading,'上层 › 缓存');
 assert.equal(resolveCardSourceLine(source,card('问题',answer,ref)),7);
});
test('extractor-compatible Setext trails retain duplicate and visibility safeguards',()=>{
 const source='# 上层\n\n第一节\n----\n\n'+answer,ref=reference(source),c=card('问题',answer,ref);
 assert.throws(()=>resolveCardSourceLine(source+'\n\n第二节\n----\n\n'+answer,c),/多处相同/);
 assert.throws(()=>resolveCardSourceLine(source.replace(answer,'```text\n'+answer+'\n```'),c),/已变化|移除/);
});
