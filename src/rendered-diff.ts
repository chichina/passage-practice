import {compareText,DiffSpan} from './diff';

type Part={node:Text|HTMLElement|null;text:string};
/** Compare only reading content. Keep native structures and math atoms intact. */
function readingParts(root:HTMLElement):Part[]{
 const parts:Part[]=[];
 const visit=(node:Node)=>{
  if(node.nodeType===3){parts.push({node:node as Text,text:node.textContent||''});return;}
  if(node.nodeType!==1)return;
  const el=node as HTMLElement;
  if(el.style.display==='none'||el.style.visibility==='hidden')return;
  if(el.matches('script,style,svg,button,input,[hidden],[aria-hidden="true"],.copy-code-button'))return;
  if(el.matches('.math,.katex, mjx-container')){
   parts.push({node:el,text:el.querySelector('annotation')?.textContent||el.getAttribute('aria-label')||el.textContent||''});return;
  }
  if(el.matches('img')){parts.push({node:el,text:el.getAttribute('alt')||'〔图片〕'});return;}
  if(el.matches('br')){parts.push({node:null,text:'\n'});return;}
  for(const child of Array.from(el.childNodes))visit(child);
  if(el.matches('p,li,h1,h2,h3,h4,h5,h6,pre,blockquote,tr,td,th'))parts.push({node:null,text:'\n'});
 };
 visit(root);return parts;
}
function decorate(parts:Part[],spans:DiffSpan[],side:string){
 let start=0;const ranges=spans.map(span=>{const range={start,end:start+span.text.length,changed:span.changed};start=range.end;return range;});
 let offset=0,index=0;
 for(const part of parts){const end=offset+part.text.length;while(index<ranges.length&&ranges[index].end<=offset)index++;
  const hits:typeof ranges=[];for(let j=index;j<ranges.length&&ranges[j].start<end;j++)if(ranges[j].changed&&ranges[j].end>offset)hits.push(ranges[j]);
  if(part.node&&hits.length){
   const title=side==='original'?'遗漏或不同：原文内容':'新增或不同：回忆内容';
   if(part.node.nodeType===1){const el=part.node as HTMLElement;el.classList.add('pp-diff-mark','pp-diff-'+side);el.title=title;}
   else{const doc=part.node.ownerDocument!,frag=doc.createDocumentFragment();let at=0;
    for(const hit of hits){const a=Math.max(hit.start-offset,0),b=Math.min(hit.end-offset,part.text.length);frag.append(doc.createTextNode(part.text.slice(at,a)));const mark=doc.createElement('mark');mark.className='pp-diff-mark pp-diff-'+side;mark.title=title;mark.textContent=part.text.slice(a,b);frag.append(mark);at=b;}
    frag.append(doc.createTextNode(part.text.slice(at)));part.node.parentNode?.replaceChild(frag,part.node);
   }
  }offset=end;
 }
}
export function highlightRenderedComparison(original:HTMLElement,recall:HTMLElement){
 const a=readingParts(original),b=readingParts(recall),diff=compareText(a.map(p=>p.text).join(''),b.map(p=>p.text).join(''));
 decorate(a,diff.original,'original');decorate(b,diff.recall,'recall');return diff;
}
