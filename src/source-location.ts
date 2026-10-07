import type {Card,SourceRef} from './cards';
import {plainText} from './knowledge';
import {markdownStructure, type MarkdownStructure} from './sections';
import {parseNote, type Passage} from './study-source';

/** Resolve against freshly read Markdown. Saved offsets are hints, never identity. */
export function resolvePassageSourceLine(text:string,passage:Passage):number {
 if(!passage.path)throw new Error('这段练习没有来源笔记，请重新选择笔记或选段。');
 const source=normalize(text),target=normalize(passage.text);
 if(passage.sourceRef)return resolveReference(source,passage.path,passage.sourceRef);
 const missing='来源内容已变化或已移除，无法准确定位本节。请刷新内容后重新选择练习。';
 const ambiguous='来源中有多处相同的段落，无法准确定位。请打开笔记核对后重新选择练习。';
 if(!target.trim())throw new Error(missing);
 if(passage.kind==='selection'||!passage.kind&&!passage.headingPath&&!Number.isInteger(passage.headingLine)){
  return uniqueLine(literalOccurrences(source,target,false).map(match=>match.line),missing,ambiguous);
 }
 const candidates=parseNote(source,passage.path).passages.filter(current=>
  normalize(current.text)===target&&current.question===passage.question&&
  (!passage.kind||current.kind===passage.kind)&&
  (!passage.headingPath||samePath(current.headingPath||[],passage.headingPath)));
 // Even a matching old line cannot distinguish two identical sections after edits.
 return uniqueLine(candidates.map(current=>current.line),missing,ambiguous);
}

type SourceCard=Pick<Card,'id'|'front'|'back'|'sourcePath'|'sourceRef'>;
/** Returns the current zero-based fence/content line, or an actionable error. */
export function resolveCardSourceLine(text:string,card:SourceCard):number {
 if(!card.sourcePath)throw new Error('这张卡片没有来源笔记，请先在卡片中填写来源路径。');
 const source=normalize(text);
 if(card.id.startsWith('note:')){
  const cards=parseNote(source,card.sourcePath).cards.filter(current=>current.id===card.id);
  if(!cards.length)throw new Error('来源中的卡片标记已移除或格式已变化。请打开笔记检查 practice-card 标记，再刷新卡片。');
  if(cards.length!==1)throw new Error('来源中有重复的卡片 ID，无法准确定位。请为笔记卡片保留独立编号，再刷新卡片。');
  const current=cards[0];
  if(normalize(current.front)!==normalize(card.front)||normalize(current.back)!==normalize(card.back))throw new Error('来源中的问题或答案已变化。请刷新卡片后重新打开来源。');
  return current.line;
 }
 if(card.sourceRef)return resolveReference(source,card.sourcePath,card.sourceRef);
 // The card's editable answer is not provenance. Old snapshots may have been
 // rewritten or clozed; even a unique match can point to unrelated source text.
 throw new Error('这张卡片未保存独立的原文来源信息，无法准确定位。请打开来源笔记核对，或重新从对应原文保存卡片；现有答案与学习进度仍保留。');
}

function resolveReference(source:string,path:string,ref:SourceRef):number {
 const missing='保存时的原文或标题已变化、移除，无法准确定位。请在来源笔记中核对后重新保存卡片。';
 const ambiguous='来源中有多处相同的原文和标题，无法准确定位。请核对对应段落后重新保存卡片。';
 if(ref.kind==='passage'){
  if(!ref.question||!ref.passageKind||!ref.headingPath)throw new Error(missing);
  return resolvePassageSourceLine(source,{path,text:ref.excerpt,question:ref.question,line:ref.line,endLine:ref.endLine+1,kind:ref.passageKind,headingPath:[...ref.headingPath]});
 }
 if(ref.kind==='selection'){
  const excerpt=normalize(ref.excerpt);if(!excerpt.trim())throw new Error(missing);
  const structure=markdownStructure(source);
  const candidates=literalOccurrences(source,excerpt,false).filter(match=>!ref.headingPath||samePath(structure.headings.filter(heading=>heading.line<=match.line).at(-1)?.path||[],ref.headingPath));
  return uniqueLine(candidates.map(match=>match.line),missing,ambiguous);
 }
 const excerpt=normalize(ref.excerpt).trim();if(!excerpt)throw new Error(missing);
 const structure=markdownStructure(source);
 const candidates=literalOccurrences(source,excerpt,true).filter(match=>
  visibleEvidence(structure,match)&&(!ref.heading||headingAliases(structure,path,match.line).has(ref.heading)));
 // A saved line is usable only when its whole saved range still matches exactly.
 // Check all matches as well: another identical heading/excerpt makes even that
 // old line unsafe (an insertion/deletion may have put a different copy there).
 const saved=candidates.find(match=>match.line===ref.line&&match.endLine===ref.endLine&&
  structure.rows.slice(ref.line,ref.endLine+1).join('\n').trim()===excerpt);
 const line=uniqueLine(candidates.map(match=>match.line),missing,ambiguous);
 return saved?.line??line;
}

function normalize(text:string):string {return text.replace(/\r\n/g,'\n');}
function samePath(a:readonly string[],b:readonly string[]):boolean {return a.length===b.length&&a.every((value,index)=>value===b[index]);}
function uniqueLine(lines:number[],missing:string,ambiguous:string):number {
 if(!lines.length)throw new Error(missing);
 if(lines.length!==1)throw new Error(ambiguous);
 return lines[0];
}
interface LiteralOccurrence {line:number;endLine:number}
/** No case folding, Markdown stripping, fuzzy matching, or whitespace collapsing. */
function literalOccurrences(source:string,value:string,wholeLines:boolean):LiteralOccurrence[] {
 if(!value.trim())return [];
 const matches:LiteralOccurrence[]=[];let from=0,line=0,countedTo=0;
 while(from<=source.length){
  const at=source.indexOf(value,from);if(at<0)break;
  for(let i=countedTo;i<at;i++)if(source[i]==='\n')line++;
  countedTo=at;
  const end=at+value.length,startOfLine=source.lastIndexOf('\n',at-1)+1,nextNewline=source.indexOf('\n',end),endOfLine=nextNewline<0?source.length:nextNewline;
  if(!wholeLines||!source.slice(startOfLine,at).trim()&&!source.slice(end,endOfLine).trim()){
   matches.push({line,endLine:line+value.split('\n').length-1});
  }
  from=at+1;
 }
 return matches;
}

function visibleEvidence(structure:MarkdownStructure,match:LiteralOccurrence):boolean {
 if(match.line<structure.start)return false;
 for(let line=match.line;line<=match.endLine;line++){
  const visible=structure.visibleRows[line];
  if(visible===undefined||visible!==structure.rows[line])return false;
 }
 return true;
}

/** Accept structural trails and the ATX-only trails used by the extractor. */
function headingAliases(structure:MarkdownStructure,path:string,line:number):Set<string> {
 const heading=structure.headings.filter(h=>h.contentLine<=line).at(-1);
 const name=path.split('/').pop()!.replace(/\.md$/i,'');
 const declared=structure.start?structure.rows.slice(1,structure.start-1).find(row=>/^title:\s*[^|>]/.test(row))?.replace(/^title:\s*/,'').replace(/^["']|["']$/g,''):undefined;
 const aliases=new Set<string>();
 const addTrail=(trail:string[],start:number)=>{
  let label='';
  // Match the extractor's supported label syntax, ignoring opaque code/comments.
  const caption=/^(?:图解步骤\s*\d+|图\s*\d+(?:[.－-]\d+)*(?:[：:\s].*)?|(?:Python|Java|C\+\+|C|JavaScript|TypeScript|Go|Rust|Swift|Kotlin|Dart|C#)?\s*(?:参考实现|源码|代码文件)[：:].*|[\w.-]+\.(?:py|js|ts|java|cpp|c|go|rs))$/i;
  for(let i=start;i<=line;i++){
   const row=structure.visibleRows[i];if(row===undefined)continue;
   const example=row.match(/^\s*\*\*(例[一二三四五六七八九十0-9]+[：:][^*]{1,60})\*\*/);
   if(example)label=plainText(example[1]);
   const strong=row.match(/^\s*\*\*([^*\n]{1,80})\*\*\s*$/);
   if(strong&&!/[。！!]|\.\s|\.$/.test(strong[1])&&!caption.test(plainText(strong[1])))label=plainText(strong[1]);
  }
  if(label)trail.push(label);
  if(!trail.length)aliases.add(declared||name);
  else{aliases.add(trail.join(' › '));aliases.add(trail.at(-1)!);}
 };
 addTrail(heading?.path.map(plainText)||[],heading?.contentLine??structure.start);
 // extractKnowledge currently ignores Setext headings. Rebuild its heading
 // stack from real ATX headings rather than inheriting the structural path:
 // a Setext ancestor must not change the identity of an unchanged saved card.
 const extracted:{level:number;text:string;contentLine:number}[]=[];
 for(const current of structure.headings){
  if(current.contentLine>line)break;
  const row=structure.rows[current.line],atx=row.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/);
  if(!atx||row.includes('<!--'))continue;
  while(extracted.length&&extracted.at(-1)!.level>=atx[1].length)extracted.pop();
  extracted.push({level:atx[1].length,text:plainText(atx[2]),contentLine:current.contentLine});
 }
 addTrail(extracted.map(h=>h.text),extracted.at(-1)?.contentLine??structure.start);
 return aliases;
}
