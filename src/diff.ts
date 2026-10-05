// Literal, local-only text comparison. No semantic assessment or normalization.
export interface DiffSpan { text: string; changed: boolean }
export interface TextDiff { original: DiffSpan[]; recall: DiffSpan[]; simplified: boolean }
const MAX_CELLS = 1_000_000;
const MAX_INPUT_UNITS = 100_000;

// Obsidian's current Electron supports Segmenter. The fallback keeps common emoji,
// combining sequences and CRLF together on older desktop engines as well.
export function graphemes(text: string): string[] {
 if (typeof Intl.Segmenter === 'function') {
  return Array.from(new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(text), x=>x.segment);
 }
 const result: string[]=[];
 let regional=0;
 for (const point of text) {
  const last=result.at(-1);
  const isRegional=/[\u{1F1E6}-\u{1F1FF}]/u.test(point);
  const joins=last!==undefined && (/^[\p{Mark}\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]$/u.test(point)
   || point==='\u200d' || last.endsWith('\u200d') || (point==='\n' && last==='\r') || (isRegional && regional%2===1));
  if(joins)result[result.length-1]+=point;else result.push(point);
  regional=isRegional?regional+1:0;
 }
 return result;
}

function tokens(text: string): string[] {
 const result: string[]=[];
 let word='';
 const flush=()=>{if(word){result.push(word);word='';}};
 for(const part of graphemes(text)) {
  // Chinese stays character-granular; Latin words and numbers stay readable.
  if(/^[\p{Script=Latin}\p{Number}\p{Mark}_]+$/u.test(part))word+=part;
  else {flush();result.push(part);}
 }
 flush();return result;
}
function append(spans: DiffSpan[], text: string, changed: boolean) {
 if(!text)return;
 const last=spans.at(-1);
 if(last && last.changed===changed)last.text+=text;else spans.push({text,changed});
}

export function compareText(original: string, recall: string): TextDiff {
 const out: TextDiff={original:[],recall:[],simplified:false};
 if(original===recall) {
  append(out.original,original,false);append(out.recall,recall,false);return out;
 }
 if(!original || !recall) {
  append(out.original,original,true);append(out.recall,recall,true);return out;
 }
 // Bound work before segmentation for arbitrarily large pasted answers.
 if(original.length+recall.length>MAX_INPUT_UNITS) {
  append(out.original,original,true);append(out.recall,recall,true);out.simplified=true;return out;
 }
 const a=tokens(original),b=tokens(recall);
 type Range={a0:number;a1:number;b0:number;b1:number};
 const pending:(Range | {common:string})[]=[{a0:0,a1:a.length,b0:0,b1:b.length}];
 let budget=MAX_CELLS;
 while(pending.length) {
  const task=pending.pop()!;
  if('common' in task) {
   append(out.original,task.common,false);append(out.recall,task.common,false);continue;
  }
  let {a0,a1,b0,b1}=task;
  // Match the nearby prefix/suffix first, then prefer the longest contiguous
  // phrase. This avoids scattering Chinese matches across later repeated words.
  const prefix=a0;
  while(a0<a1 && b0<b1 && a[a0]===b[b0]){a0++;b0++;}
  const common=a.slice(prefix,a0).join('');
  append(out.original,common,false);append(out.recall,common,false);
  const suffix=a1;
  while(a1>a0 && b1>b0 && a[a1-1]===b[b1-1]){a1--;b1--;}
  if(a1<suffix)pending.push({common:a.slice(a1,suffix).join('')});
  const n=a1-a0,m=b1-b0;
  if(!n || !m) {
   append(out.original,a.slice(a0,a1).join(''),true);append(out.recall,b.slice(b0,b1).join(''),true);continue;
  }
  const cells=n*m;
  if(cells>budget) {
   append(out.original,a.slice(a0,a1).join(''),true);append(out.recall,b.slice(b0,b1).join(''),true);out.simplified=true;continue;
  }
  budget-=cells;
  const row=new Uint32Array(m+1);
  let length=0,anchorA=a0,anchorB=b0;
  for(let i=a0;i<a1;i++)for(let j=m;j>0;j--) {
   row[j]=a[i]===b[b0+j-1]?row[j-1]+1:0;
   const size=row[j],atA=i-size+1,atB=b0+j-size;
   if(size>length || (size===length && size>0 && (atA<anchorA || (atA===anchorA && atB<anchorB)))) {
    length=size;anchorA=atA;anchorB=atB;
   }
  }
  if(!length) {
   append(out.original,a.slice(a0,a1).join(''),true);append(out.recall,b.slice(b0,b1).join(''),true);continue;
  }
  // Stack order preserves the original order in both panels without recursion.
  pending.push({a0:anchorA+length,a1,b0:anchorB+length,b1});
  pending.push({common:a.slice(anchorA,anchorA+length).join('')});
  pending.push({a0,a1:anchorA,b0,b1:anchorB});
 }
 return out;
}
