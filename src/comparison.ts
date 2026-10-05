import {compareText, DiffSpan} from './diff';

/** Only called after reveal. Readable Markdown is default; exact source diff is an explicit alternative. */
export function mountComparison(parent: HTMLElement, original: string, recall: string, originalTitle: string,
 highlighted=true, onToggle:(value:boolean)=>void=()=>{}, renderMarkdown?: (parent:HTMLElement,text:string)=>()=>void) {
 const doc=parent.ownerDocument;
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string)=>{
  const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;
 };
 const diff=compareText(original,recall);
 const tools=el('div','pp-compare-tools');
 const legend=el('div','pp-diff-legend');
 legend.append(el('span','pp-diff-key pp-diff-original','原文差异'),el('span','pp-diff-key pp-diff-recall','回答差异'));
 const label=el('label','pp-diff-toggle');
 const toggle=el('input','');toggle.type='checkbox';toggle.checked=highlighted;
 label.append(toggle,doc.createTextNode('标出文字差异'));tools.append(legend,label);parent.append(tools);
 let rich=!!renderMarkdown;let cleanups:Array<()=>void>=[];
 const switcher=el('button','pp-secondary pp-compare-mode');switcher.type='button';
 if(renderMarkdown)tools.prepend(switcher);
 const grid=el('div','pp-compare');parent.append(grid);
 const panes: {pre:HTMLElement;text:string;spans:DiffSpan[];side:string}[]=[];
 for(const [title,text,spans,side] of [
  [originalTitle,original,diff.original,'original'],['我的回忆',recall,diff.recall,'recall']
 ] as const) {
  const card=el('div','pp-card'),pre=el('pre','');
  card.append(el('h2','',title),pre);grid.append(card);panes.push({pre,text,spans,side});
 }
 const draw=()=>{
  for(const cleanup of cleanups)cleanup();cleanups=[];
  switcher.textContent=rich?'查看 Markdown 源码差异':'返回阅读格式';
  label.hidden=rich;legend.hidden=rich||!toggle.checked;
  for(const pane of panes) {
   const {text,spans,side}=pane;
   const target=rich?el('div','pp-rich-content'):el('pre','pp-literal-diff');
   pane.pre.replaceWith(target);pane.pre=target;
   if(!text){target.append(el('span','pp-empty-answer','（本轮未填写）'));continue;}
   if(rich){cleanups.push(renderMarkdown!(target,text));continue;}
   if(!toggle.checked){target.textContent=text;continue;}
   for(const span of spans){
    if(span.changed){const mark=el('mark',`pp-diff-mark pp-diff-${side}`,span.text);mark.title=side==='original'?'原文中的不同文字':'回答中的不同文字';target.append(mark);}
    else target.append(doc.createTextNode(span.text));
   }
  }
  legend.hidden=rich||!toggle.checked;
 };
 switcher.addEventListener('click',()=>{rich=!rich;draw();});
 toggle.addEventListener('change',()=>{draw();onToggle(toggle.checked);});draw();
 parent.append(el('p','pp-diff-note',renderMarkdown?'默认按 Markdown 阅读；需要逐字核对时，可切换源码差异。是否表达正确由你判断':'颜色仅标出文字差异，是否表达正确由你判断'));
 if(diff.simplified)parent.append(el('p','pp-diff-note pp-diff-simplified','文本较长，部分差异已合并标注；可取消高亮查看原样文字。'));
}
