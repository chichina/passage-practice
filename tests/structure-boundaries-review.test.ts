// Independent boundary review. Synthetic fixtures stay outside the user vault.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNote} from '../src/study-source';
import {parseOutline} from '../src/outline';

const path='Boundary review.md';
const labels=(source:string)=>parseOutline(source,path).map(branch=>({
 label:branch.label,children:branch.children.map(child=>child.label),
}));

test('list-marker fenced code stays in its complete answer and cannot consume the next heading',()=>{
 for(const [marker,indent] of [['- ','  '],['1. ','   '],['10) ','    ']]){
  const body=['before',marker+'```md',indent+'# code heading',indent+'- code keyword',indent+'```','after'].join('\n');
  const source='# Real\n'+body+'\n\n# Next\nnext body';
  const note=parseNote(source,path);
  assert.deepEqual(note.passages.map(p=>p.question),['Real','Next'],marker);
  assert.equal(note.passages[0].text,body,marker);
  assert.equal(note.passages[1].text,'next body',marker);
  assert.deepEqual(labels(source),[{label:'Boundary review',children:['Real','Next']}],marker);
 }
});

test('list-contained fences ending at dedent cannot swallow later sibling branches',()=>{
 const source='- Parent\n  - ```js\n    const x = 1;\n- Next\n  - Child\n# Following heading\n- Final keyword';
 assert.deepEqual(labels(source),[
  {label:'Boundary review',children:['Parent','Next','Following heading']},
  {label:'Next',children:['Child']},
  {label:'Following heading',children:['Final keyword']},
 ]);
});

test('opaque raw HTML cannot manufacture heading answers or outline keywords',()=>{
 for(const tag of ['pre','script','style','textarea']){
  const body=['before','<'+tag+'>','# code heading','- code keyword','<!-- literal comment','</'+tag+'>','after'].join('\n');
  const source='# Real\n'+body+'\n\n# Next\nnext body';
  const note=parseNote(source,path);
  assert.deepEqual(note.passages.map(p=>p.question),['Real','Next'],tag);
  assert.equal(note.passages[0].text,body,tag);
  assert.deepEqual(labels(source),[{label:'Boundary review',children:['Real','Next']}],tag);
 }
});

test('Setext headings can contain literal or escaped pipes without becoming tables',()=>{
 for(const title of ['A | B','A \\| B','Use `|` to combine flags']){
  const source=title+'\n========\n- First\n- Second';
  const note=parseNote(source,path);
  assert.equal(note.passages.length,1,title);
  assert.equal(note.passages[0].question,title,title);
  assert.equal(note.passages[0].text,'- First\n- Second',title);
  assert.deepEqual(labels(source),[
   {label:'Boundary review',children:[title]},
   {label:title,children:['First','Second']},
  ],title);
 }
});

test('closed nested fences retain following siblings and fence-info comments remain literal',()=>{
 const source='# Root\n- Parent\n  - ```js <!-- %%\n    ## Code heading\n    - Code keyword\n    ```\n  - Sibling\n# Next\n- Child';
 const note=parseNote(source,path);
 assert.deepEqual(note.passages.map(p=>p.question),['Root','Next']);
 assert.equal(note.passages[0].text,source.split('\n').slice(1,7).join('\n'));
 assert.deepEqual(labels(source),[
  {label:'Boundary review',children:['Root','Next']},
  {label:'Root',children:['Parent']},
  {label:'Parent',children:['Sibling']},
  {label:'Next',children:['Child']},
 ]);
});

test('indented code inside a list cannot turn literal comment syntax into a document comment',()=>{
 for(const token of ['<!--','%%']){
  const body='- Parent\n\n      '+token+' literal indented code';
  const source='# Real\n'+body+'\n\n# Next\nbody';
  const note=parseNote(source,path);
  assert.deepEqual(note.passages.map(p=>p.question),['Real','Next'],token);
  assert.equal(note.passages[0].text,body,token);
  assert.deepEqual(labels(source),[
   {label:'Boundary review',children:['Real','Next']},
   {label:'Real',children:['Parent']},
  ],token);
 }
});

test('unclosed raw HTML within a list ends at its containing item boundary',()=>{
 const body='- Parent\n  <pre>\n  literal code';
 const source='# Real\n'+body+'\n# Next\n- Child';
 const note=parseNote(source,path);
 assert.deepEqual(note.passages.map(p=>p.question),['Real','Next']);
 assert.equal(note.passages[0].text,body);
 assert.deepEqual(labels(source),[
  {label:'Boundary review',children:['Real','Next']},
  {label:'Real',children:['Parent']},
  {label:'Next',children:['Child']},
 ]);
});
