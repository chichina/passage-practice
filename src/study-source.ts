import {KnowledgePoint,extractKnowledge,fingerprint} from './knowledge';
import {Card, createCard} from './cards';
import {markdownStructure} from './sections';
import {OutlineBranch,parseOutline} from './outline';
export type Scope = {kind:'all'|'current'|'folder'|'tag';value:string};
export interface Passage {text:string;question:string;line:number;path:string;endLine?:number;headingLine?:number;headingPath?:string[];kind?:'section'|'intro'|'preamble'|'document'|'selection'}
export interface AuthoredCard {id:string;front:string;back:string;sourcePath:string;line:number}
export interface NoteIndex {sourceFingerprint?:string;path:string;name:string;tags:string[];passages:Passage[];cards:AuthoredCard[];warnings:string[];knowledge:KnowledgePoint[];outline:OutlineBranch[]}
export function matchesScope(path:string,tags:readonly string[],scope:Scope,current:string):boolean {
 if(scope.kind==='all')return true;
 if(scope.kind==='current')return !!current&&path===current;
 if(scope.kind==='folder')return scope.value==='/'||!!scope.value&&path.startsWith(scope.value.replace(/\/$/,'')+'/');
 const tag=scope.value.replace(/^#/,'').toLocaleLowerCase();
 return !!tag&&tags.some(t=>{const normalized=t.replace(/^#/,'').toLocaleLowerCase();return normalized===tag||normalized.startsWith(tag+'/');});
}
export function parseCardBlock(block:string,path='',line=0):AuthoredCard {
 const rows=block.replace(/\r\n/g,'\n').split('\n');
 const id=rows[0]?.match(/^id: ([A-Za-z0-9_-]{6,100})\s*$/)?.[1];
 if(!id||rows[1]?.trim()!=='问题：')throw new Error('卡片需包含自动生成的 id、问题：和答案：标记');
 const answer=rows.findIndex((x,i)=>i>1&&x.trim()==='答案：');
 if(answer<0)throw new Error('缺少单独一行的「答案：」');
 const front=rows.slice(2,answer).join('\n').trim(),back=rows.slice(answer+1).join('\n').trim();
 if(!front||!back)throw new Error('问题和答案都需要填写');
 if(front.length>4000||back.length>50000)throw new Error('问题限 4,000 字符；答案限 50,000 字符');
 return{id:'note:'+id,front,back,sourcePath:path,line};
}
export function cardMarkup(id:string,front:string,back:string):string {
 if(!/^[A-Za-z0-9_-]{6,100}$/.test(id))throw new Error('Invalid card id');
 if(front.replace(/\r\n/g,'\n').split('\n').some(line=>line.trim()==='答案：'))throw new Error('问题中不能单独一行写「答案：」；它是背面分隔标记。请把这几个字放在句子中。');
 const rows=`id: ${id}\n问题：\n${front.trim()}\n答案：\n${back.trim()}`;
 parseCardBlock(rows);
 const runs=rows.match(/`+/g)||[],fence='`'.repeat(Math.max(3,...runs.map(x=>x.length+1)));
 return `${fence}practice-card\n${rows}\n${fence}`;
}
export function parseNote(text:string,path:string,tags:string[]=[]):NoteIndex {
 const name=path.split('/').pop()!.replace(/\.md$/i,''),note:NoteIndex={sourceFingerprint:fingerprint(text.replace(/\r\n/g,'\n')),path,name,tags:[...new Set(tags)],passages:[],cards:[],warnings:[],knowledge:[],outline:[]};
 const structure=markdownStructure(text),{rows,start,headings,fences}=structure;note.warnings.push(...structure.warnings);
 const omitted=new Set<number>();
 for(const fence of fences){if(fence.info!=='practice-card'||fence.nested)continue;
  for(let i=fence.line;i<fence.endLine;i++)omitted.add(i);
  if(!fence.closed)note.warnings.push(`第 ${fence.line+1} 行卡片未闭合`);
  else try{note.cards.push(parseCardBlock(rows.slice(fence.line+1,fence.endLine-1).map(row=>row.replace(new RegExp('^ {0,'+fence.indent+'}'),'')).join('\n'),path,fence.line));}
  catch(e){note.warnings.push(`第 ${fence.line+1} 行：${(e as Error).message}`);}
 }
 const add=(begin:number,end:number,question:string,kind:Passage['kind'],headingPath:string[]=[],headingLine?:number)=>{
  while(begin<end&&(!rows[begin].trim()||omitted.has(begin)))begin++;while(end>begin&&(!rows[end-1].trim()||omitted.has(end-1)))end--;
  const content=rows.slice(begin,end).filter((_,i)=>!omitted.has(begin+i));
  while(content.length&&!content[0].trim())content.shift();while(content.length&&!content.at(-1)!.trim())content.pop();
  const value=content.join('\n');if(!value.trim())return;
  note.passages.push({text:value,question,line:begin,endLine:end,headingLine,headingPath,kind,path});
 };
 if(!headings.length)add(start,rows.length,`${name} · 全文（无标题）`,'document');
 else{
  add(start,headings[0].line,`${name} · 笔记引言（首个标题前）`,'preamble');
  for(let i=0;i<headings.length;i++){
   const heading=headings[i],next=headings[i+1],intro=!!next&&next.level>heading.level;
   add(heading.contentLine,next?.line??rows.length,heading.title+(intro?' · 引言（子标题前）':''),intro?'intro':'section',heading.path,heading.line);
  }
 }
 note.outline=parseOutline(text,path,note.warnings);
 const extracted=extractKnowledge(text,path);note.knowledge=extracted.points;note.warnings.push(...extracted.warnings.filter(w=>!(w==='跳过未闭合代码块'&&note.warnings.some(x=>x.includes('卡片未闭合')))));return note;
}
export function studyCards(notes:readonly NoteIndex[],saved:readonly Card[],scope:Scope,current:string,now:number):{cards:Card[];warnings:string[]} {
 const found=new Map<string,AuthoredCard[]>();for(const n of notes)for(const c of n.cards)found.set(c.id,[...(found.get(c.id)||[]),c]);
 const warnings:string[]=[],cards:Card[]=[],byPath=new Map(notes.map(n=>[n.path,n]));
 for(const [id,occurrences]of found){if(occurrences.length!==1){warnings.push(`卡片 ID 重复，已跳过：${occurrences.map(c=>c.sourcePath+':'+(c.line+1)).join('、')}。请用「插入卡片标记」创建新卡，勿复制 id。`);continue;}
  const c=occurrences[0],n=byPath.get(c.sourcePath)!;if(!matchesScope(c.sourcePath,n.tags,scope,current))continue;const previous=saved.find(x=>x.id===id);cards.push(previous?{...previous,front:c.front,back:c.back,sourcePath:c.sourcePath}:createCard(c.front,c.back,c.sourcePath,now,id));}
 for(const c of saved){if(c.id.startsWith('note:'))continue;const n=byPath.get(c.sourcePath);if(matchesScope(c.sourcePath,n?.tags||[],scope,current))cards.push({...c});}
 return{cards,warnings};
}
/** Append only at a Markdown top-level EOF. Never alter existing source text. */
export function assertSafeAppend(text:string):void {
 const rows=text.replace(/\r\n/g,'\n').split('\n');let start=0;
 if(rows[0]==='---'){const end=rows.findIndex((r,i)=>i>0&&(r==='---'||r==='...'));if(end<0)throw new Error('笔记的 YAML 属性区尚未闭合，请先补上结尾 --- 再插入卡片');start=end+1;}
 let char='',length=0;for(const row of rows.slice(start)){const f=row.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);if(!f)continue;if(!char){char=f[1][0];length=f[1].length;}else if(f[1][0]===char&&f[1].length>=length&&!f[2].trim()){char='';length=0;}}
 if(char)throw new Error('笔记末尾仍在未闭合的代码块中，请先闭合代码块再插入卡片');
}
