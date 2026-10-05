import {decodeHTML} from 'entities';

export interface SafeMarkdownOptions {
 /** Resolve only existing raster files in this vault. Never return an arbitrary URL. */
 resolveLocalAsset?: (path:string) => string|null;
}

const raster=/\.(?:png|jpe?g|gif|webp|bmp|avif)$/i;
const tags=new Set('p div span strong em b i u s del ins mark small sub sup kbd samp code pre blockquote ul ol li dl dt dd table thead tbody tfoot tr th td caption h1 h2 h3 h4 h5 h6 hr br a img'.split(' '));
const voidTags=new Set(['hr','br','img']);
const unsafeTex=new Set('bbox mmltoken require autoload href url style class cssId htmlId htmlClass htmlStyle htmlData htmlHref includegraphics input include def gdef edef xdef let futurelet csname newcommand renewcommand providecommand newenvironment renewenvironment'.toLowerCase().split(' '));
const html=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// Markdown is still parsed between inline HTML tags. Escape its punctuation too.
const literal=(text:string)=>html(text).replace(/[!\[\]`*_~\\$]/g,c=>`&#${c.charCodeAt(0)};`);
const codeText=(text:string)=>literal(/^[\s]*\$?=/.test(text)?'\u2060'+text:text);
const label=(text:string)=>decodeHTML(text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g,'$1'));
const referenceKey=(text:string)=>label(text).trim().replace(/\s+/g,' ').toLocaleLowerCase();
const maxTokenLength=16_384;

/**
 * A conservative rendering copy, never a storage transform. No DOM is created.
 * Only this module's reconstructed tags can reach MarkdownRenderer as HTML.
 * Markdown image/embed introducers are escaped unless resolved to a local raster.
 * Fences become inert code, so no language-specific postprocessor can execute.
 * This is not a sandbox for arbitrary third-party Markdown postprocessors: those
 * plugins run with Obsidian's full privileges regardless of the supplied content.
 */
export function prepareSafeMarkdown(source:string,options:SafeMarkdownOptions={}):string {
 const text=source.replace(/\r\n?/g,'\n'),references=new Map<string,string>(),brackets=new Map<number,number>(),openBrackets:number[]=[];
 // Pair brackets once. Repeated unmatched image introducers otherwise turn a
 // malformed note into quadratic work before rendering has even started.
 for(let position=0;position<text.length;position++){
  if(text[position]==='\\'){position++;continue;}
  if(text[position]==='[')openBrackets.push(position);
  else if(text[position]===']'&&openBrackets.length){const opening=openBrackets.pop()!;if(position-opening<=maxTokenLength)brackets.set(opening,position);}
 }
 for(const row of text.split('\n')){
  const match=row.match(/^ {0,3}\[((?:\\.|[^\]\\])+)\]:[ \t]*(?:<([^<>\n]*)>|(\S+))/);
  if(match&&!references.has(referenceKey(match[1])))references.set(referenceKey(match[1]),match[2]??match[3]);
 }
 const asset=(raw:string):string|null=>{
  let path=label(raw).trim();
  try{path=decodeURIComponent(path);}catch{return null;}
  // A vault resolver is the final authority. URLs, absolute paths, SVG, and
  // content-bearing document/media embeds never reach it.
  if(!path||/[\u0000-\u001f\u007f\\:#?]/.test(path)||path.startsWith('/')||!raster.test(path))return null;
  let resolved:string|null=null;
  try{resolved=options.resolveLocalAsset?.(path)??null;}catch{return null;}
  // Obsidian desktop uses app://local/ and mobile uses app://<id>/ resources.
  // The callback may not promote an http/file/data/blob URL to trusted content.
  if(!resolved||!/^app:\/\/[^\s"'<>]+$/i.test(resolved))return null;
  return resolved;
 };
 const image=(path:string,alt:string,attrs:Record<string,string>={}):string=>{
  const src=asset(path);
  if(!src)return `<span>${literal(alt?'图片未加载：'+alt:'图片未加载')}</span>`;
  let out=`<img src="${html(src)}" alt="${html(alt)}"`;
  for(const name of ['width','height'])if(/^\d{1,4}$/.test(attrs[name]??'')&&Number(attrs[name])>0)out+=` ${name}="${Number(attrs[name])}"`;
  return out+'>';
 };
 const safeTag=(raw:string):string=>{
  const match=raw.match(/^<(\/?)\s*([a-z][a-z0-9-]*)([\s\S]*?)>$/i);
  if(!match)return literal(raw);
  const name=match[2].toLowerCase();
  if(!tags.has(name))return literal(raw);
  if(match[1])return /^\s*$/.test(match[3])&&!voidTags.has(name)?`</${name}>`:literal(raw);
  const attrs:Record<string,string>=Object.create(null);let rest=match[3];
  while(rest.trim()&&rest.trim()!=='/'){
   const attr=rest.match(/^\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/);
   if(!attr)return literal(raw);
   const key=attr[1].toLowerCase();if(!(key in attrs))attrs[key]=decodeHTML(attr[2]??attr[3]??attr[4]??'');
   rest=rest.slice(attr[0].length);
  }
  if(name==='img')return image(attrs.src??'',attrs.alt??'',attrs);
  let out='<'+name;
  if(/^(?:p|div|th|td)$/.test(name)&&/^(?:left|right|center|justify)$/i.test(attrs.align??''))out+=` align="${attrs.align.toLowerCase()}"`;
  if(attrs.title)out+=` title="${html(attrs.title)}"`;
  for(const key of ['colspan','rowspan'])if(/^(?:th|td)$/.test(name)&&/^\d{1,3}$/.test(attrs[key]??''))out+=` ${key}="${Number(attrs[key])}"`;
  if(name==='ol'&&/^-?\d{1,6}$/.test(attrs.start??''))out+=` start="${Number(attrs.start)}"`;
  if(name==='a'&&safeLink(attrs.href??''))out+=` href="${html(attrs.href.trim())}" rel="noopener noreferrer"`;
  // Dataview's inline evaluator recognizes code beginning with = or $=.
  return out+'>'+(name==='code'?'\u2060':'');
 };
 let out='',i=0,nextWikiEnd=-2;
 while(i<text.length){
  // Convert complete (or EOF-terminated) fences, including list/quote prefixes,
  // to escaped code without leaving executable language information behind.
  if(i===0||text[i-1]==='\n'){
   const lineEnd=text.indexOf('\n',i),end=lineEnd<0?text.length:lineEnd,row=text.slice(i,end);
   const fence=row.match(/^([ \t]*(?:(?:>[ \t]*)|(?:(?:[-+*]|\d{1,9}[.)])[ \t]+))*)(`{3,}|~{3,})([^\n]*)$/);
   if(fence){
    let cursor=end<text.length?end+1:end,body='',after=text.length;
    const quotePrefix=fence[1].match(/^(?:[ \t]*>[ \t]*)+/)?.[0]??'';
    const contentIndent=fence[1].slice(quotePrefix.length).replace(/\t/g,'    ').length;
    const nestedList=/[-+*]|\d[.)]/.test(fence[1].slice(quotePrefix.length));
    const closing=new RegExp('^[ \\t]*(?:>[ \\t]*)*'+fence[2][0]+'{'+fence[2].length+',}[ \\t]*$');
    while(cursor<text.length){const next=text.indexOf('\n',cursor),stop=next<0?text.length:next,line=text.slice(cursor,stop);
     const unquoted=quotePrefix?line.replace(/^(?:[ \t]*>[ \t]*)+/,''):line;
     if(line.trim()&&((quotePrefix&&!/^[ \t]*>/.test(line))||(nestedList&&(unquoted.match(/^[ \t]*/)?.[0].replace(/\t/g,'    ').length??0)<contentIndent))){after=cursor;break;}
     if(closing.test(line)){after=stop<text.length?stop+1:stop;break;}
     body+=(nestedList?unquoted.replace(new RegExp('^ {0,'+contentIndent+'}'),''):unquoted)+(stop<text.length?'\n':'');cursor=stop<text.length?stop+1:stop;
    }
    // Entity newlines avoid parsing the escaped code as fresh Markdown lines.
    out+=fence[1]+'<pre><code>'+codeText(body).replace(/\n/g,'&#10;')+'</code></pre>'+(after<=text.length&&text[after-1]==='\n'?'\n':'');i=after;continue;
   }
  }
  if(text.startsWith('<!--',i)){const end=text.indexOf('-->',i+4);out+=' ';i=end<0?text.length:end+3;continue;}
  if(text[i]==='`'){
   const run=text.slice(i).match(/^`+/)![0],limit=Math.min(text.length,i+maxTokenLength);let end=text.indexOf(run,i+run.length);
   while(end>=0&&end<limit&&(text[end-1]==='`'||text[end+run.length]==='`'))end=text.indexOf(run,end+run.length);
   if(end>=limit)end=-1;
   if(end>=0){let value=text.slice(i+run.length,end).replace(/\n/g,' ');if(/^ .* $/.test(value)&&/\S/.test(value))value=value.slice(1,-1);out+='<code>'+codeText(value)+'</code>';i=end+run.length;continue;}
   out+='&#96;'.repeat(run.length);i+=run.length;continue;
  }
  if(text[i]==='~'&&text.startsWith('~~~',i)){const run=text.slice(i).match(/^~+/)![0];out+='&#126;'.repeat(run.length);i+=run.length;continue;}
  if(text.startsWith('![[',i)){
   if(nextWikiEnd!==-1&&nextWikiEnd<i+3)nextWikiEnd=text.indexOf(']]',i+3);
   let end=nextWikiEnd;if(end-i>maxTokenLength)end=-1;
   if(end>=0&&!text.slice(i,end).includes('\n')){const [path,...parts]=text.slice(i+3,end).split('|'),last=parts.at(-1)??'',size=last.match(/^(\d{1,4})(?:x(\d{1,4}))?$/);out+=image(path,size?'':parts.join('|'),size?{width:size[1],height:size[2]??''}:{});i=end+2;continue;}
  }
  if(text.startsWith('![',i)){
   const end=brackets.get(i+1)??-1;
   if(end>=0){const alt=label(text.slice(i+2,end));let cursor=end+1,path:string|undefined;
    if(text[cursor]==='('){const destination=readDestination(text,cursor);if(destination){path=destination.path;cursor=destination.end;}}
    else if(text[cursor]==='['){const refEnd=brackets.get(cursor)??-1;if(refEnd>=0){path=references.get(referenceKey(text.slice(cursor+1,refEnd)||alt));cursor=refEnd+1;}}
    else path=references.get(referenceKey(alt));
    if(path!==undefined){out+=image(path,alt);i=cursor;continue;}
   }
  }
  if(text[i]==='<'){
   const auto=text.slice(i).match(/^<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+|[^\s<>@]+@[^\s<>@]+)>/i);
   if(auto){out+=auto[0];i+=auto[0].length;continue;}
   let cursor=i+1,quote='';for(;cursor<Math.min(text.length,i+maxTokenLength);cursor++){const c=text[cursor];if(quote){if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='>'||c==='<')break;}
   if(text[cursor]==='>'){out+=safeTag(text.slice(i,cursor+1));i=cursor+1;continue;}
   out+='&lt;';i++;continue;
  }
  if(text[i]==='!'){out+='&#33;';i++;continue;}
  if(text[i]==='\\'){
   const command=text.slice(i+1).match(/^[a-zA-Z]+/);
   if(command&&unsafeTex.has(command[0].toLowerCase())){out+='\\text{'+command[0]+' disabled}';i+=command[0].length+1;continue;}
   if(/[!<`~]/.test(text[i+1]??'')){out+=literal(text[i+1]);i+=2;continue;}
   if(text[i+1]==='\\'){out+='\\\\';i+=2;continue;}
  }
  if(text.startsWith('^^',i)){out+='&#94;&#94;';i+=2;continue;}
  out+=text[i++];
 }
 return out;
}

function safeLink(raw:string):boolean {
 const value=decodeHTML(raw).trim();
 if(!value||/[\u0000-\u0020\u007f\\]/.test(value))return false;
 return /^(?:https?:\/\/|mailto:|#)/i.test(value)||!/[<>:]/.test(value)&&!value.startsWith('//');
}

function readDestination(text:string,start:number):{path:string;end:number}|null {
 text=text.slice(0,start+maxTokenLength);
 let i=start+1;while(/[ \t\n]/.test(text[i]??'')&&i<text.length)i++;
 let path='';
 if(text[i]==='<'){const end=text.indexOf('>',i+1);if(end<0||text.slice(i,end).includes('\n'))return null;path=text.slice(i+1,end);i=end+1;}
 else{let depth=0;for(;i<text.length;i++){const c=text[i];if(c==='\\'&&i+1<text.length){path+=text.slice(i,i+2);i++;continue;}if(c==='(')depth++;if(c===')'){if(!depth)break;depth--;}if(/\s/.test(c)&&!depth)break;path+=c;}if(depth)return null;}
 while(i<text.length&&/\s/.test(text[i]))i++;
 if(text[i]==='"'||text[i]==="'"){const quote=text[i++];for(;i<text.length;i++){if(text[i]==='\\'){i++;continue;}if(text[i]===quote){i++;break;}}while(i<text.length&&/\s/.test(text[i]))i++;}
 return text[i]===')'?{path,end:i+1}:null;
}
