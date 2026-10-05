import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Session, defaultQuestion, literal, reviewNote, createReview} from '../src/core';
test('question fallback ignores fenced headings and honors nearest ATX heading',()=>{
 assert.equal(defaultQuestion('# 总题\n## 栈\n```md\n# 假标题\n```\n正文',5,'标题'),'栈');
 assert.equal(defaultQuestion('正文',0,'文件名'),'文件名');
});
test('reveal, empty recall, manual missed points and retries keep answers out of recall',()=>{
 const s=new Session('秘密答案 👩🏽‍💻\n- 栈顶','问题');s.start('');assert.equal(s.stage,'recall');
 s.start('恶意重复');assert.equal(s.question,'问题');s.reveal();assert.equal(s.recall,'');assert.equal(s.retry(),false);
 s.missed='\n查看栈顶\n空栈下溢\n';assert.equal(s.retry(),true);assert.equal(s.stage,'recall');assert.equal(s.recall,'');assert.equal(s.missed,'');assert.equal(s.rounds.length,1);assert.equal(s.retry(),false);
 s.recall='查看不删除';s.reveal();s.missed='下溢';s.retry();assert.equal(s.target,'下溢');assert.equal(s.rounds.length,2);
});
test('literal blocks safely contain markdown, HTML, backticks and Unicode',()=>{
 const input='```\n<script>x</script>\n![x](https://example.org)\n````\n中文 👩🏽‍💻';
 assert.ok(literal(input).startsWith('`````text\n'));
 const s=new Session(input,'题目');s.start('a\n# 注入');s.reveal();const n=reviewNote(s,'a/[标题] #?.md','date');
 assert.ok(n.includes('%5B'));assert.ok(n.includes('%23%3F.md'));assert.ok(n.includes(input));
});
test('new review creates unique note and handles a creation race without overwrite',async()=>{
 const files=new Map([['选段即练-1-1.md','original']]);let calls=0;
 const result=await createReview(async(p,t)=>{calls++;if(calls===1){files.set(p,'racer');throw Error('exists');} files.set(p,t);},p=>files.has(p),'new',1);
 assert.equal(result,'选段即练-1-3.md');assert.equal(files.get('选段即练-1-1.md'),'original');assert.equal(files.get('选段即练-1-2.md'),'racer');
});
test('save error propagates instead of overwriting or swallowing',async()=>{await assert.rejects(createReview(async()=>{throw Error('denied');},()=>false,'text'),/denied/);});
