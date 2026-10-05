/** Local, deterministic extraction. Candidates are verbatim source excerpts, never LLM output. */
export const EXTRACTOR_VERSION = 3;
export const MAX_NOTE_BYTES = 2 * 1024 * 1024;
export interface KnowledgePoint {
 id:string; path:string; heading:string; headingPath:string[]; line:number; endLine:number;
 excerpt:string; question:string; kind:'definition'|'list'|'explanation'; confidence:'structured'|'review'; reason:string;
 fingerprint:string;sourceFingerprint:string;context:string;contextLine:number;caveats:string[];
}
export interface Extraction {points:KnowledgePoint[]; skipped:number; warnings:string[]}
export function fingerprint(value:string):string {
 let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
export function plainText(value:string):string {
 const code:string[]=[];const protectedText=value.replace(/(`+)([^`]*?)\1/g,(_,f,body)=>{code.push(body);return `\u0000${code.length-1}\u0000`;});
 return protectedText.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g,(_,p,label)=>label||p).replace(/<[^>]+>/g,'').replace(/[*_`~]/g,'').replace(/^\s*(?:[-+*>]|\d+[.)])\s+/gm,'').replace(/\u0000(\d+)\u0000/g,(_,i)=>code[Number(i)]).trim();
}
// Deduplication must not erase identifiers, generic types, math operators or case.
export function contentKey(value:string):string {return value.replace(/\r\n/g,'\n').trim();}
const caption=/^(?:图解步骤\s*\d+|图\s*\d+(?:[.－-]\d+)*(?:[：:\s].*)?|(?:Python|Java|C\+\+|C|JavaScript|TypeScript|Go|Rust|Swift|Kotlin|Dart|C#)?\s*(?:参考实现|源码|代码文件)[：:].*|[\w.-]+\.(?:py|js|ts|java|cpp|c|go|rs))$/i;
const exerciseHeading=/(?:^|\s)(?:练习|知识巩固|编程练习|习题|Exercises?)$/i;
const answerLabel=/^(?:参考答案|答案(?:解析)?|解析|解答|解题提示|正确性证明)$/;
const promptLabel=/^(?:问题|题目|题干|输入|输出|要求|(?:练习|习题|题目|问题)[一二三四五六七八九十0-9]+(?:[：:].*)?)$/;
function contentRole(labels:string[]):'answer'|'prompt'|''{for(const label of [...labels].reverse()){if(answerLabel.test(label))return 'answer';if(promptLabel.test(label)||exerciseHeading.test(label))return 'prompt';}return '';}
const navigation=/(?:^(?:\d+[.、]\s*)?(?:目录|导航|阅读顺序|建议阅读顺序|适合谁看|文章推荐|延伸资料|网站历史|资料推荐|阅读推荐|推荐阅读|参考(?:资料|文献|链接)?|相关(?:链接|阅读)|延伸阅读|资源|链接|致谢|版权|免责声明|许可证|contents|table of contents|references?|resources?|links?|see also|further reading|license|acknowledg(?:e)?ments?)(?:[：:\s].*)?$)/i;
const promotional=/(?:扫码|扫描.{0,5}二维码|关注.{0,12}(?:公众号|我)|知识星球|优惠券|优惠码|限时福利|付费加入|购买.{0,12}(?:专栏|课程)|微信.{0,5}(?:联系|加我)|公众号.{0,12}(?:回复|领取|获取))/;
const misconception=/(?:很多人.{0,12}(?:觉得|认为|误以为)|有人(?:认为|误以为)|可能会(?:觉得|误以为)|看了这个.{0,15}觉得|误以为)/;
const correction=/^(?:实际上|事实上|其实|但(?:是)?|然而|并非如此|并不是)/;
const hasCorrection=/(?:实际上|事实上|但(?:是)?|然而|并非如此|并不是)/;
const discourse=/^(?:下面(?:是|我们|来看|给出|的)|如下(?:图|所示)|如(?:上|下)所示|上述|下图|上图|接下来(?:我们|看)|代码如下|运行结果|输出结果|这里(?:我们|以|给出)|今天我|最近我|我(?:自己|当时|的文章|们来看)|这本书|这是什么世道|现在本身|不知不觉|前几天|出于不想|看了一下|好家伙)/;
function definitionTerm(value:string,heading:string):string|undefined {
 const first=value.split('\n')[0],match=first.match(/^([^。.!?？：:，,]{1,65}?)(?:是(?:一种|指|一个|用来|用于)|指的是|定义为|被称为|\s+(?:is|are)\s+(?:an? |the ))/i);
 if(match&&!misconception.test(first)&&!/(?:并?不|并非|而不)$/.test(match[1])&&!discourse.test(first)&&!/[我你他她它这那]/.test(match[1].slice(0,1)))return match[1].trim().replace(/(?:也常|通常|一般|也|又|还|常)$/, '').trim();
 return undefined;
}
export function extractKnowledge(text:string,path:string):Extraction {
 const result:Extraction={points:[],skipped:0,warnings:[]};
 if(text.length>MAX_NOTE_BYTES){result.warnings.push('笔记超过 2 MiB 字符上限，未提炼；请选择较小笔记或选段');return result;}
 const sourceFingerprint=fingerprint(text.replace(/\r\n/g,'\n'));
 const rows=text.replace(/\r\n/g,'\n').split('\n'),name=path.split('/').pop()!.replace(/\.md$/i,'');
 let start=0,fence='',fenceSize=0,comment=false,mathClose='',subheading='',title=name,buffer:string[]=[],begin=0,subRole:''|'answer'|'prompt'='';
 const headings:{level:number;text:string}[]=[],seen=new Set<string>();
 if(rows[0]?.trim()==='---'){const end=rows.findIndex((r,i)=>i>0&&/^(---|\.\.\.)\s*$/.test(r));if(end<0){result.warnings.push('未闭合的属性区，未提炼');return result;}start=end+1;const declared=rows.slice(1,end).find(r=>/^title:\s*[^|>]/.test(r))?.replace(/^title:\s*/, '').replace(/^["']|["']$/g,'');if(declared)title=declared;}
 const flush=()=>{
  if(!buffer.length)return;const raw=buffer.join('\n').trim(),endLine=begin+buffer.length-1;buffer=[];
  const heading=subheading||headings.at(-1)?.text||title,readable=plainText(raw),han=(readable.match(/[\u3400-\u9fff]/g)||[]).length;
  const meaningful=han>=12?readable.length>=20:readable.length>=65;
  const linkCount=(raw.match(/\[[^\]]+\]\([^)]*\)|\[\[[^\]]+\]\]/g)||[]).length;
  const contentWithoutLinks=raw.replace(/!?\[[^\]]*\]\([^)]*\)|\[\[[^\]]+\]\]/g,'').replace(/[\s\-*#\d.():：]/g,'');
  const lines=raw.split('\n'),bulletRows=lines.filter(r=>/^\s*(?:[-+*]|\d+[.)])\s+/.test(r)),list=bulletRows.length,bulletText=bulletRows.map(plainText),linkedBullets=bulletRows.filter(r=>/\[[^\]]+\]\([^)]*\)|\[\[[^\]]+\]\]/.test(r)).length;
  const questionOnly=list>=2&&bulletText.every(t=>/[?？]$/.test(t)&&!/[：:]/.test(t));const structuredList=list>=2&&!questionOnly&&bulletText.some(t=>/[：:。.!;；]/.test(t)||t.length>35);if(list>=2&&linkedBullets/list>=0.6){result.skipped++;return;}
  if(!meaningful||readable.length>1800||raw.length>3000||navigation.test(heading)||promotional.test(readable)||discourse.test(readable)||/^\s*(?:https?:\/\/|#\S+\s*$)/.test(raw)||linkCount>0&&contentWithoutLinks.length<40||lines.some(r=>/^\s*\|/.test(r))||!/[。！？.!?:：;]/.test(readable)&&list<2){result.skipped++;return;}
  const key=contentKey(raw);if(seen.has(key)){result.skipped++;return;}seen.add(key);
  if(misconception.test(readable)&&!hasCorrection.test(readable)){result.skipped++;return;}
  const promptContext=(subRole||contentRole(headings.map(h=>h.text)))==='prompt';
  const named=readable.match(/(?:两|二|三|四|[234])种[^。！？\n：:]{0,25}[：:]([^。！？\n]+)[。.]?$/),names=named?.[1].split(/[、，,]/).map(x=>x.trim());const namedList=!!names&&names.length>=2&&names.length<=4&&names.every(x=>x.length>0&&x.length<=24);
  const term=promptContext?undefined:definitionTerm(readable,heading),isDefinition=!!term,kind=isDefinition?'definition':!promptContext&&(structuredList||namedList)?'list':'explanation';
  const headingTrail=[...headings.map(h=>h.text),...(subheading?[subheading]:[])],bareHeading=heading.replace(/^\d+(?:\.\d+)*[.、]?\s*/,''),role=/^(?:优点|缺点|特点|优势|劣势|前提|适用条件|适用场景|使用场景|原理|步骤|流程|注意事项|限制|主要参数)$/.test(bareHeading);
  const subject=role?headingTrail.at(-2)||title:heading;
  let question=role?`「${subject}」的${bareHeading}有哪些？`:/[?？]$/.test(heading)?heading:`「${heading}」${kind==='definition'?'是什么，有哪些关键特征？':kind==='list'?'有哪些要点？':'说明了什么？'}`;
  
  if(term&&term.length<=45)question=`${term}是什么？`;
  if(answerLabel.test(subheading))question=`「${headings.at(-1)?.text||title}」的${subheading}是什么？`;
  const exact=rows.slice(begin,endLine+1).join('\n').trim(),hash=fingerprint(exact),contextLine=Math.max(start,begin-6),context=rows.slice(contextLine,Math.min(rows.length,endLine+8)).join('\n');const caveats:string[]=[];if(promptContext)caveats.push('这是练习题干、条件或要求，尚不是答案；请结合参考答案核对后再制卡');if(/^(?:这|它|其|因此|所以|也就是说|实际上|对于(?:这个|该)|该)/.test(readable))caveats.push('可能依赖前文指代，请展开上下文');if(/(?:两(?:个|项)|任意.{0,3}两|总是|绝对|一定|所有|必然)/.test(readable))caveats.push('包含范围或条件判断，请核对适用前提');if(misconception.test(readable))caveats.push('包含先提出误解再澄清的表达，请保留完整上下文');
  result.points.push({id:fingerprint(path+'\n'+heading+'\n'+exact),path,heading,headingPath:[...headings.map(h=>h.text),...(subheading?[subheading]:[])],line:begin,endLine,excerpt:exact,question,kind,confidence:!promptContext&&(isDefinition||structuredList||namedList)?'structured':'review',reason:promptContext?'练习题干或条件，未作为结构明确的答案':isDefinition?'发现定义句；请检查问题是否足够具体':(structuredList||namedList)?'发现成组要点；请检查是否属于同一个问题':'按标题整理的原文段落，需要你判断是否值得记忆',fingerprint:hash,sourceFingerprint,context,contextLine,caveats});
 };
 for(let i=start;i<rows.length;i++){
  const row=rows[i],f=row.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){if(f&&f[1][0]===fence&&f[1].length>=fenceSize&&!f[2].trim())fence='';continue;}
  if(f){flush();fence=f[1][0];fenceSize=f[1].length;continue;}
  if(comment){if(row.includes('-->'))comment=false;continue;}
  if(row.includes('<!--')){flush();if(!row.slice(row.indexOf('<!--')+4).includes('-->'))comment=true;continue;}
  if(mathClose){if(row.includes(mathClose))mathClose='';continue;}if(/^\s*(?:\$\$|\\\[)/.test(row)){flush();const delimiter=row.trim().startsWith('$$')?'$$':'\\]';const rest=row.trim().slice(2);if(!rest.includes(delimiter))mathClose=delimiter;continue;}
  const h=row.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/);
  if(h){flush();subheading='';subRole='';while(headings.length&&headings.at(-1)!.level>=h[1].length)headings.pop();headings.push({level:h[1].length,text:plainText(h[2])});continue;}
  const example=row.match(/^\s*\*\*(例[一二三四五六七八九十0-9]+[：:][^*]{1,60})\*\*/);if(example){flush();subheading=plainText(example[1]);}
  const strong=row.match(/^\s*\*\*([^*\n]{1,80})\*\*\s*$/);if(strong&&!/[。！!]|\.\s|\.$/.test(strong[1])){flush();const label=plainText(strong[1]);if(caption.test(label)){continue;}subheading=label;if(answerLabel.test(label))subRole='answer';else if(promptLabel.test(label)||exerciseHeading.test(label))subRole='prompt';continue;}
  if(!row.trim()&&buffer.length&&misconception.test(plainText(buffer.join('\n')))){const next=rows.slice(i+1).find(r=>r.trim());if(next&&correction.test(plainText(next))){buffer.push('');continue;}}
  // HTML, indented code, Markdown navigation, tag-only and image-only lines are not facts.
  const nestedList=/^\s+\S/.test(row)&&buffer.some(r=>/^\s*(?:[-+*]|\d+[.)])\s+/.test(r));
  if(!row.trim()||!nestedList&&/^ {4}|^\t/.test(row)||/^\s*(?:<|!\[|\[\^[^\]]+\]:|\[[^\]]+\]:|[-*_]{3,}\s*$)/.test(row)){flush();continue;}
  if(!buffer.length)begin=i;buffer.push(row);
 }
 flush();if(fence)result.warnings.push('跳过未闭合代码块');return result;
}
export function uniqueKnowledge(points:readonly KnowledgePoint[]):{points:KnowledgePoint[];duplicates:number} {
 const seen=new Set<string>(),unique:KnowledgePoint[]=[];for(const point of points){const key=contentKey(point.excerpt);if(!seen.has(key)){seen.add(key);unique.push(point);}}
 return {points:unique,duplicates:points.length-unique.length};
}
