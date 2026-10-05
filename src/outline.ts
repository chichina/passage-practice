import {markdownStructure} from './sections';

export interface OutlineNode {
 id:string; label:string; line:number; path:string;
 kind:'heading'|'list'|'document'; children:OutlineNode[];
}
export interface OutlineBranch {
 id:string; label:string; line:number; path:string;
 headingPath:string[]; ancestorPath:string[]; children:OutlineNode[];
}

// Reject oversized input as a whole: a truncated tree would give an incomplete
// recall answer. These limits also bound memory and traversal depth for callers.
const MAX_CHARACTERS=2*1024*1024,MAX_NODES=10000,MAX_LIST_DEPTH=128,MAX_PATH_LENGTH=4096;
interface ListEntry {node:OutlineNode; contentIndent:number}

/** Tabs advance to Markdown's four-column tab stops. */
function columns(whitespace:string,start=0):number {
 let column=start;
 for(const character of whitespace)column+=character==='\t'?4-column%4:1;
 return column;
}

/**
 * Builds recall units from authored Markdown structure, never from prose.
 *
 * Provenance rules:
 * - ATX/Setext headings come from markdownStructure; skipped levels are allowed.
 * - Only explicit ordered/unordered list markers create list nodes. Indentation
 *   is relative to the containing item's content column, so four-space nested
 *   bullets are lists while four-space standalone/code blocks are not.
 * - Frontmatter, HTML/Obsidian comments and code (including practice-card fences)
 *   never supply nodes. No Markdown links, embeds, HTML or scripts are executed.
 * - Labels are literal strings with structural markers removed. Inline Markdown,
 *   identifiers and HTML-looking text stay literal; render with textContent.
 *   Only a list item's first line is its label, not its explanatory continuation.
 * - Lines are zero-based original source lines. IDs identify an occurrence by
 *   path, kind and line, so equal labels at different positions stay distinct.
 * - Every returned branch contains just its direct children. Those same child
 *   nodes retain descendants for drill-down, never flattened into the answer.
 * - ancestorPath includes only root/ancestor/self labels, never child answers;
 *   headingPath remains the heading-only trail for source-section context.
 *
 * Bounded with no I/O, persistence, inference or source mutation. An optional
 * warnings collector receives a clear reason when a whole tree is rejected. A
 * document root uses its filename and line 0; leaves are not separate branches.
 */
export function parseOutline(text:string,path:string,warnings:string[]=[]):OutlineBranch[] {
 const reject=(reason:string):OutlineBranch[]=>{warnings.push(`大纲召回未生成：${reason}`);return [];};
 if(text.length>MAX_CHARACTERS)return reject('笔记超过 2 MiB 字符上限，请选择较小笔记');
 if(path.length>MAX_PATH_LENGTH)return reject('笔记路径超过 4,096 字符上限');
 const structure=markdownStructure(text);
 const {rows,start,headings,fences,visibleRows}=structure;
 if(start>=rows.length)return [];
 const headingAt=new Map(headings.map(heading=>[heading.line,heading]));
 const fenceAt=new Map(fences.map(fence=>[fence.line,fence]));
 const opaqueAt=new Map((structure.opaqueRanges??[]).map(([begin,end])=>[begin,end]));
 const branches:OutlineBranch[]=[],ancestors=new WeakMap<OutlineNode,string[]>();
 let count=0;
 const make=(label:string,line:number,kind:OutlineNode['kind'],headingPath:string[],parent?:OutlineNode):OutlineNode=>{
  const node:OutlineNode={id:JSON.stringify(['outline',path,kind,line]),label,line,path,kind,children:[]};
  const ancestorPath=[...(parent?ancestors.get(parent)??[]:[]),label];
  ancestors.set(node,ancestorPath);
  branches.push({id:node.id,label,line,path,headingPath:[...headingPath],ancestorPath,children:node.children});
  count++;
  return node;
 };
 const root=make(path.split(/[\\/]/).pop()!.replace(/\.md$/i,'')||'（未命名笔记）',0,'document',[]);
 const headingStack:{level:number;node:OutlineNode}[]=[],listStack:ListEntry[]=[];
 let comment:''|'html'|'obsidian'='';

 // markdownStructure intentionally blanks indented rows, which can be valid
 // nested lists here. Track comments through visible list continuations too,
 // without ever treating code-block delimiters as comments in the document.
 const maskComments=(row:string):string=>{
  let output='',index=0;
  while(index<row.length){
   if(comment){
    const token=comment==='html'?'-->':'%%',end=row.indexOf(token,index);
    if(end<0)return output+' '.repeat(row.length-index);
    output+=' '.repeat(end+token.length-index);index=end+token.length;comment='';
   }else if(row[index]==='\\'&&index+1<row.length){output+=row.slice(index,index+2);index+=2;}
   else if(row[index]==='`'){
    const run=row.slice(index).match(/^`+/)![0];let end=row.indexOf(run,index+run.length);
    while(end>=0&&(row[end-1]==='`'||row[end+run.length]==='`'))end=row.indexOf(run,end+run.length);
    if(end>=0){output+=row.slice(index,end+run.length);index=end+run.length;}
    else{output+=run;index+=run.length;}
   }else if(row.startsWith('<!--',index)){comment='html';output+='    ';index+=4;}
   else if(row.startsWith('%%',index)){comment='obsidian';output+='  ';index+=2;}
   else{output+=row[index];index++;}
  }
  return output;
 };

 for(let line=start;line<rows.length;line++){
  const raw=rows[line],whitespace=raw.match(/^[ \t]*/)![0],indent=columns(whitespace);
  const fence=fenceAt.get(line),opaqueEnd=opaqueAt.get(line);
  if(fence||opaqueEnd!==undefined){
   // The shared scanner supplies exact container-aware ranges, including an
   // unclosed nested fence that ends when its containing list item dedents.
   if(fence&&!fence.nested)listStack.length=0;
   else while(listStack.length&&indent<listStack.at(-1)!.contentIndent)listStack.pop();
   line=(fence?.endLine??opaqueEnd!)-1;comment='';continue;
  }
  let parentIndex=listStack.length-1;
  while(parentIndex>=0&&indent<listStack[parentIndex].contentIndent)parentIndex--;
  const listParent=listStack[parentIndex];
  // Comments can close at any indentation. Otherwise indented code is literal.
  if(!comment&&indent>=4&&(!listParent||indent>=listParent.contentIndent+4))continue;
  const row=maskComments(raw);
  if(!row.trim())continue;
  const heading=headingAt.get(line);
  if(heading&&visibleRows[line]?.trim()&&row.trim()){
   listStack.length=0;
   while(headingStack.length&&headingStack.at(-1)!.level>=heading.level)headingStack.pop();
   const trail=[...headingStack.map(entry=>entry.node.label),heading.title];
   const parent=headingStack.at(-1)?.node??root,node=make(heading.title,line,'heading',trail,parent);
   parent.children.push(node);
   headingStack.push({level:heading.level,node});
   line=heading.contentLine-1;
   if(count>MAX_NODES)return reject('结构超过 10,000 个节点上限，请拆分笔记');
   continue;
  }
  const marker=row.match(/^([ \t]*)([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/);
  const rule=/^[ \t]*(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(row);
  if(marker&&!rule&&columns(marker[1])===indent){
   const markerEnd=indent+marker[2].length,padding=columns(marker[3]??' ',markerEnd)-markerEnd;
   const contentIndent=markerEnd+(padding<=4?padding:1);
   const label=(marker[4]??'').replace(/^\[[ xX]\](?:[ \t]+|$)/,'').trim();
   // Empty structural labels are not recall answers; do not invent a parent.
   if(!label){listStack.length=parentIndex+1;continue;}
   const parent=listParent?.node??headingStack.at(-1)?.node??root;
   const node=make(label,line,'list',headingStack.map(entry=>entry.node.label),parent);
   parent.children.push(node);
   listStack.length=parentIndex+1;
   listStack.push({node,contentIndent});
   if(count>MAX_NODES)return reject('结构超过 10,000 个节点上限，请拆分笔记');
   if(listStack.length>MAX_LIST_DEPTH)return reject('列表嵌套超过 128 层上限，请简化大纲');
  }else if(rule||!listParent){
   // Normal paragraphs, quotes and tables cannot become fabricated headings.
   // Indented continuation prose may keep the current list container open.
   listStack.length=0;
  }
 }
 return branches.filter(branch=>branch.children.length>0);
}
