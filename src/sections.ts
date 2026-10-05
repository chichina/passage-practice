/** Markdown structure for recall units. Content is kept literal, not summarized. */
export interface Heading {line:number;contentLine:number;level:number;title:string;path:string[]}
export interface Fence {line:number;endLine:number;info:string;closed:boolean;indent:number;nested?:boolean}
export interface MarkdownStructure {rows:string[];start:number;headings:Heading[];fences:Fence[];warnings:string[];visibleRows:string[];opaqueRanges:[number,number][]}

export function markdownStructure(text:string):MarkdownStructure {
 const rows=text.replace(/\r\n/g,'\n').split('\n'),result:MarkdownStructure={rows,start:0,headings:[],fences:[],warnings:[],visibleRows:[],opaqueRanges:[]};
 if(rows[0]?.replace(/^\uFEFF/,'')==='---'){
  const end=rows.findIndex((row,i)=>i>0&&(row==='---'||row==='...'));
  if(end<0){result.start=rows.length;result.warnings.push('YAML 属性区尚未闭合，未作为正文复习');return result;}result.start=end+1;
 }
 let comment:''|'html'|'obsidian'='',paragraphStart=-1,inTable=false;const stack:Heading[]=[];const lists:{indent:number;contentIndent:number}[]=[];
 const indentation=(row:string)=>{let width=0;for(const char of row){if(char===' ')width++;else if(char==='\t')width+=4-width%4;else break;}return width;};
 const visible=(row:string)=>{let out='',i=0;while(i<row.length){
  if(comment){const token=comment==='html'?'-->':'%%',end=row.indexOf(token,i);if(end<0)return out+' '.repeat(row.length-i);out+=' '.repeat(end+token.length-i);i=end+token.length;comment='';}
  else if(row[i]==='\\'&&i+1<row.length){out+=row.slice(i,i+2);i+=2;}
  else if(row[i]==='`'){const run=row.slice(i).match(/^`+/)![0];let end=row.indexOf(run,i+run.length);while(end>=0&&(row[end-1]==='`'||row[end+run.length]==='`'))end=row.indexOf(run,end+run.length);if(end>=0){out+=row.slice(i,end+run.length);i=end+run.length;}else{out+=run;i+=run.length;}}
  else if(row.startsWith('<!--',i)){comment='html';out+='    ';i+=4;}
  else if(row.startsWith('%%',i)){comment='obsidian';out+='  ';i+=2;}
  else{out+=row[i];i++;}
 }return out;};
 const add=(line:number,contentLine:number,level:number,title:string)=>{
  // Actual levels, not path lengths: Markdown permits skipped heading levels.
  while(stack.length&&stack.at(-1)!.level>=level)stack.pop();
  const heading={line,contentLine,level,title:title||'（空标题）',path:[...stack.map(h=>h.title),title||'（空标题）']};result.headings.push(heading);stack.push(heading);
  paragraphStart=-1;
 };
 for(let i=result.start;i<rows.length;i++){
  // Track list containers so a fenced example inside a list cannot open a
  // fake heading or turn its closing fence into a new top-level code block.
  const raw=rows[i],indent=indentation(raw);let nested=false,fenceRow=raw,baseIndent=0;
  const marker=!comment?raw.match(/^([ \t]*)([-+*]|\d{1,9}[.)])([ \t]+)(.*)$/):null;
  if(!comment&&raw.trim()){
   if(marker&&(indent<4||lists.some(list=>indent>=list.contentIndent))){
    while(lists.length&&indent<=lists.at(-1)!.indent)lists.pop();
    baseIndent=indent+marker[2].length+marker[3].length;lists.push({indent,contentIndent:baseIndent});nested=true;fenceRow=marker[4];
   }else{
    while(lists.length&&indent<lists.at(-1)!.contentIndent)lists.pop();
    if(lists.length){nested=true;baseIndent=lists.at(-1)!.contentIndent;fenceRow=raw.replace(/^[ \t]*/,spaces=>' '.repeat(Math.max(0,indent-baseIndent)));}
   }
  }
  // Fence info and indented code are literal, including comment delimiters.
  if(!comment&&((!nested&&/^(?: {4}|\t)/.test(raw))||(nested&&!marker&&indent>=baseIndent+4))){paragraphStart=-1;result.visibleRows[i]='';continue;}
  const fence=(!comment?fenceRow:'').match(/^ {0,3}(`{3,}|~{3,})([^\n]*)$/);
  if(fence&&!(fence[1][0]==='`'&&fence[2].includes('`'))){
   const character=fence[1][0],close=new RegExp(`^ {0,3}${character}{${fence[1].length},}\\s*$`);let end=i+1,closed=false;
   while(end<rows.length){const row=rows[end],width=indentation(row);
    if(nested&&row.trim()&&width<baseIndent)break;
    const candidate=nested?row.replace(/^[ \t]*/,spaces=>' '.repeat(Math.max(0,width-baseIndent))):row;
    if(close.test(candidate)){closed=true;break;}end++;
   }
   result.fences.push({line:i,endLine:closed?end+1:end,info:fence[2].trim(),closed,indent,nested});
   paragraphStart=-1;i=closed?end:end-1;continue;
  }
  const html=!comment?fenceRow.match(/^ {0,3}<(pre|script|style|textarea)(?:[ \t>]|$)/i):null;
  if(html){const close=new RegExp('</'+html[1]+'\\s*>','i');let end=i,closed=false;while(end<rows.length){if(end>i&&nested&&rows[end].trim()&&indentation(rows[end])<baseIndent)break;if(close.test(rows[end])){closed=true;break;}end++;}const endLine=closed?end+1:end;result.opaqueRanges.push([i,endLine]);paragraphStart=-1;i=endLine-1;continue;}
  const row=visible(raw);result.visibleRows[i]=row;
  if(nested){paragraphStart=-1;continue;}
  const atx=row.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/);
  if(atx){add(i,i+1,atx[1].length,(atx[2]||'').replace(/(?:^|[ \t]+)#+[ \t]*$/,'').trim());continue;}
  if(!row.trim())inTable=false;
  const cells=row.trim().replace(/^\||\|$/g,'').split('|');if(row.includes('|')&&cells.length>1&&cells.every(cell=>/^\s*:?-+:?\s*$/.test(cell))){inTable=true;paragraphStart=-1;continue;}
  if(inTable&&row.includes('|')){paragraphStart=-1;continue;}
  const setext=row.match(/^ {0,3}(=+|-+)[ \t]*$/);
  if(setext&&paragraphStart>=0){add(paragraphStart,i+1,setext[1][0]==='='?1:2,result.visibleRows.slice(paragraphStart,i).join('\n').trim());continue;}
  // Only a top-level paragraph can be a Setext title. Lists, quotes, thematic
  // rules, indented code and table rows must never supply a fake heading.
  if(!row.trim()||/^(?: {4}|\t| {0,3}(?:>|[-+*][ \t]|\d+[.)][ \t]|(?:\*\s*){3,}$|(?:_\s*){3,}$|(?:-\s*){3,}$|<))/.test(row)||comment)paragraphStart=-1;
  else if(paragraphStart<0)paragraphStart=i;
 }
 return result;
}
