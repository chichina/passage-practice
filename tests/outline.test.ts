import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOutline} from '../src/outline';
import type {OutlineBranch} from '../src/outline';

const labels=(branch:OutlineBranch)=>branch.children.map(child=>child.label);
const get=(branches:OutlineBranch[],label:string)=>{
 const branch=branches.find(item=>item.label===label);assert.ok(branch,`Missing branch ${label}`);return branch;
};

test('nested headings produce one direct-child recall unit per parent',()=>{
 const source='# CS\n## Networks\n### TCP\n### UDP\n## Databases\n### Indexes';
 const branches=parseOutline(source,'学习/CS.md');
 assert.deepEqual(branches.map(branch=>branch.label),['CS','CS','Networks','Databases']);
 assert.deepEqual(labels(branches[0]),['CS']);
 assert.deepEqual(labels(branches[1]),['Networks','Databases']);
 assert.deepEqual(labels(get(branches,'Networks')),['TCP','UDP']);
 assert.deepEqual(get(branches,'Networks').headingPath,['CS','Networks']);
 assert.equal(branches[1].children[0].children[0].label,'TCP');
 assert.ok(!branches.some(branch=>branch.label==='TCP'));
});

test('keyword-only nested bullets support spaces and tabs without prose inference',()=>{
 const source='- 网络\n    - 传输层\n        - TCP\n        - UDP\n    - 应用层\n\t\t- HTTP\n- 数据库';
 const branches=parseOutline(source,'知识/脑图.md');
 assert.deepEqual(branches.map(branch=>branch.label),['脑图','网络','传输层','应用层']);
 assert.deepEqual(labels(branches[0]),['网络','数据库']);
 assert.deepEqual(labels(get(branches,'网络')),['传输层','应用层']);
 assert.deepEqual(labels(get(branches,'传输层')),['TCP','UDP']);
 assert.deepEqual(labels(get(branches,'应用层')),['HTTP']);
 assert.deepEqual(get(branches,'网络').headingPath,[]);
});

test('ordered and unordered lists can mix with correct marker-column indentation',()=>{
 const source='1. Layers\n   1) Transport\n      - TCP\n      - UDP\n   2) Application\n2. Storage\n   + SQL';
 const branches=parseOutline(source,'Numbered.md');
 assert.deepEqual(labels(branches[0]),['Layers','Storage']);
 assert.deepEqual(labels(get(branches,'Layers')),['Transport','Application']);
 assert.deepEqual(labels(get(branches,'Transport')),['TCP','UDP']);
 assert.deepEqual(labels(get(branches,'Storage')),['SQL']);
});

test('heading and list trees attach to their authored section and retain source order',()=>{
 const source='- Preamble\n  - Intro keyword\n# Main\n- Parent\n  - Keyword\n## Child\n- Detail\n# Next\n- Other';
 const branches=parseOutline(source,'Mixed.md');
 assert.deepEqual(labels(branches[0]),['Preamble','Main','Next']);
 assert.deepEqual(labels(get(branches,'Main')),['Parent','Child']);
 assert.deepEqual(labels(get(branches,'Parent')),['Keyword']);
 assert.deepEqual(get(branches,'Parent').headingPath,['Main']);
 assert.deepEqual(get(branches,'Child').headingPath,['Main','Child']);
 assert.deepEqual(labels(get(branches,'Next')),['Other']);
});

test('skipped heading levels use actual heading levels rather than stack length',()=>{
 const branches=parseOutline('# A\n#### B\n##### C\n### D\n#### E\n## F\n#### G','levels.md');
 assert.deepEqual(labels(get(branches,'A')),['B','D','F']);
 assert.deepEqual(labels(get(branches,'B')),['C']);
 assert.deepEqual(labels(get(branches,'D')),['E']);
 assert.deepEqual(labels(get(branches,'F')),['G']);
 assert.deepEqual(get(branches,'D').headingPath,['A','D']);
});

test('Setext headings retain their source line and cannot arise from list text',()=>{
 const branches=parseOutline('Title\n=====\n\nSection\n-------\n- A\n- B','setext.md');
 assert.deepEqual(labels(get(branches,'Title')),['Section']);
 assert.deepEqual(labels(get(branches,'Section')),['A','B']);
 assert.equal(get(branches,'Section').line,3);
 assert.deepEqual(labels(parseOutline('- item\n---\n- next','lists.md')[0]),['item','next']);
});

test('frontmatter, HTML/Obsidian comments, fenced and indented code are excluded',()=>{
 const source=[
  '---','title: ignored','outline:','  - metadata','---',
  '<!--','# Hidden','- Secret','-->','%%','- More secrets','%%',
  '```md','# Fake','- Fenced','```','~~~','# Another fake','~~~',
  '    # Indented heading','    - Indented code','\t- Tab code',
  '# Real','- Visible <!-- hidden -->','  - Child','- Tail %% hidden %%',
 ].join('\n');
 const branches=parseOutline(source,'safe.md');
 assert.deepEqual(labels(branches[0]),['Real']);
 assert.deepEqual(labels(get(branches,'Real')),['Visible','Tail']);
 assert.deepEqual(labels(get(branches,'Visible')),['Child']);
 assert.ok(!JSON.stringify(branches).includes('Secret'));
});

test('nested comments and list-contained code fences do not leak keyword nodes',()=>{
 const source=[
  '- Parent','    <!--','    - Hidden','    -->','    - First',
  '    ```md','    - Code','    ## Not a heading','    ```','    - Second',
  '      - Nested','            - Indented code','- Outside',
 ].join('\n');
 const branches=parseOutline(source,'nested.md');
 assert.deepEqual(labels(branches[0]),['Parent','Outside']);
 assert.deepEqual(labels(get(branches,'Parent')),['First','Second']);
 assert.deepEqual(labels(get(branches,'Second')),['Nested']);
 assert.ok(!JSON.stringify(branches).includes('Hidden'));
 assert.ok(!JSON.stringify(branches).includes('Indented code'));
});

test('explicit practice cards including malformed or unclosed fences are never outlines',()=>{
 const card='````practice-card\nid: example\n问题：\n# Hidden question\n答案：\n- Hidden answer\n```md\n- Nested code\n```\n````';
 const branches=parseOutline('# Visible\n'+card+'\n- Real','cards.md');
 assert.deepEqual(labels(get(branches,'Visible')),['Real']);
 assert.deepEqual(parseOutline('```practice-card\n# Question\n- Answer','bad.md'),[]);
 assert.deepEqual(parseOutline('---\n# Metadata\n- Value','bad.md'),[]);
});

test('empty input, prose, quotes, thematic rules and standalone code create no tree',()=>{
 for(const source of ['', 'First sentence is not a heading.\nAnother sentence.', '> # Quoted\n> - Quoted list','---\n***\n___','    - code\n\n    # code','```md\n# title\n- list'])assert.deepEqual(parseOutline(source,'plain.md'),[]);
 assert.deepEqual(parseOutline('# Leaf\nOrdinary prose','leaf.md').map(branch=>branch.label),['leaf']);
});

test('source line identity preserves duplicates, CRLF, path and original order',()=>{
 const source='---\r\ntags: [a]\r\n---\r\n# Topic\r\n- Same\r\n  - Child\r\n- Same\r\n  - Child';
 const first=parseOutline(source,'A/topic.md'),again=parseOutline(source,'A/topic.md');
 assert.deepEqual(first,again);
 const topic=get(first,'Topic');
 assert.equal(topic.line,3);assert.equal(topic.path,'A/topic.md');
 assert.deepEqual(topic.children.map(child=>child.line),[4,6]);
 assert.notEqual(topic.children[0].id,topic.children[1].id);
 assert.notEqual(first[0].id,parseOutline(source,'B/topic.md')[0].id);
 assert.equal(topic.children[0].children[0].line,5);
 assert.equal(topic.children[1].children[0].line,7);
});

test('labels stay literal plain strings, preserving technical markup and comment-like code',()=>{
 const source='# `Map<K,V>` and foo_bar\n- [x] `<script>alert(1)</script>`\n  - `<selectKey>`\n- [ ] [link](https://example.invalid)\n- `<!--literal-->`\n- `%%literal%%`';
 const branches=parseOutline(source,'safe.md'),topic=get(branches,'`Map<K,V>` and foo_bar');
 assert.deepEqual(labels(topic),['`<script>alert(1)</script>`','[link](https://example.invalid)','`<!--literal-->`','`%%literal%%`']);
 assert.deepEqual(labels(get(branches,'`<script>alert(1)</script>`')),['`<selectKey>`']);
});

test('explanatory continuation lines are not fabricated labels and loose lists remain nested',()=>{
 const source='- Parent\n  Supporting prose\n\n  - Keyword\n    More prose\n\n  - Another\n\nParagraph outside the list\n\n    - Code';
 const branches=parseOutline(source,'continuations.md');
 assert.deepEqual(labels(branches[0]),['Parent']);
 assert.deepEqual(labels(get(branches,'Parent')),['Keyword','Another']);
});

test('fence info and code comment literals do not suppress later legitimate branches',()=>{
 const source='```md %% <!--\n- code\n```\n    <!-- literal code\n# Visible\n- Real';
 assert.deepEqual(labels(get(parseOutline(source,'fence.md'),'Visible')),['Real']);
});

test('bounds reject whole trees instead of returning incomplete recall answers',()=>{
 assert.deepEqual(parseOutline('x'.repeat(2*1024*1024+1),'big.md'),[]);
 assert.deepEqual(parseOutline('- a','x'.repeat(4097)),[]);
 assert.deepEqual(parseOutline(Array.from({length:10001},(_,index)=>`- ${index}`).join('\n'),'many.md'),[]);
 assert.deepEqual(parseOutline(Array.from({length:130},(_,index)=>`${'  '.repeat(index)}- ${index}`).join('\n'),'deep.md'),[]);
});


test('a fenced block can start immediately after a list marker without becoming a keyword',()=>{
 const source='- Parent\n  - ```practice-card\n    # Hidden\n    - Secret\n    ```\n  - Real\n- ```md %% <!--\n  - Code\n  ```\n- Tail';
 const branches=parseOutline(source,'list-fences.md');
 assert.deepEqual(labels(branches[0]),['Parent','Tail']);
 assert.deepEqual(labels(get(branches,'Parent')),['Real']);
});

test('comment padding cannot manufacture a structural list marker',()=>{
 const branches=parseOutline('# Main\n<!-- note -->- Not a list\n- Real','comments.md');
 assert.deepEqual(labels(get(branches,'Main')),['Real']);
});


test('list-contained closing fences cannot hide later ATX or Setext headings',()=>{
 const source='- ```md\n  # Hidden\n  ```\n# Visible\n- Real\n- Parent\n    ~~~md\n    # Also hidden\n    ~~~\nNext\n====\n- Tail';
 const branches=parseOutline(source,'list-headings.md');
 assert.deepEqual(labels(branches[0]),['Visible','Next']);
 assert.deepEqual(labels(get(branches,'Visible')),['Real','Parent']);
 assert.deepEqual(labels(get(branches,'Next')),['Tail']);
 assert.equal(get(branches,'Visible').line,3);
 assert.equal(get(branches,'Next').line,9);
});


test('whole-tree limits report a visible reason without affecting normal parsing',()=>{
 const warnings:string[]=[];
 for(const [source,path,reason] of [
  ['x'.repeat(2*1024*1024+1),'big.md','2 MiB'],
  ['- a','x'.repeat(4097),'4,096'],
  [Array.from({length:10001},(_,index)=>`- ${index}`).join('\n'),'many.md','10,000'],
  [Array.from({length:130},(_,index)=>`${'  '.repeat(index)}- ${index}`).join('\n'),'deep.md','128'],
 ]){
  const count=warnings.length;
  assert.deepEqual(parseOutline(source,path,warnings),[]);
  assert.equal(warnings.length,count+1);
  assert.ok(warnings.at(-1)!.includes(reason));
 }
 const count=warnings.length;
 assert.equal(parseOutline('- Parent\n  - Child','valid.md',warnings).length,2);
 assert.equal(warnings.length,count);
});


test('ancestor breadcrumbs distinguish repeated list labels without exposing child answers',()=>{
 const branches=parseOutline('# Topic\n- First parent\n  - Repeated\n    - Secret A\n- Second parent\n  - Repeated\n    - Secret B','Study/map.md');
 const repeated=branches.filter(branch=>branch.label==='Repeated');
 assert.deepEqual(branches[0].ancestorPath,['map']);
 assert.deepEqual(get(branches,'Topic').ancestorPath,['map','Topic']);
 assert.deepEqual(repeated.map(branch=>branch.ancestorPath),[
  ['map','Topic','First parent','Repeated'],
  ['map','Topic','Second parent','Repeated'],
 ]);
 assert.deepEqual(repeated.map(branch=>branch.headingPath),[['Topic'],['Topic']]);
 assert.ok(repeated.every(branch=>!branch.ancestorPath.some(label=>label.startsWith('Secret'))));
});
