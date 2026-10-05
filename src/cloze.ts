/** Deliberate local cloze authoring; never modifies source Markdown. */
export interface ClozeDraft{front:string;back:string;matches:number}
export function protectedSpans(text:string):Array<[number,number]>{
 const spans:Array<[number,number]>=[];let offset=0,fence='',size=0,begin=0;
 for(const row of text.split('\n')){const f=row.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);if(!fence&&f){fence=f[1][0];size=f[1].length;begin=offset;}else if(fence&&f&&f[1][0]===fence&&f[1].length>=size&&!f[2].trim()){spans.push([begin,offset+row.length]);fence='';}offset+=row.length+1;}if(fence)spans.push([begin,text.length]);
 const patterns=[/(`+)[\s\S]*?\1/g,/\$\$[\s\S]*?\$\$/g,/(?<!\\)\$(?:\\.|[^$\n])+?(?<!\\)\$/g,/\\\([\s\S]*?\\\)/g,/\\\[[\s\S]*?\\\]/g,/<!--(?:[\s\S]*?-->|[\s\S]*$)/g];
 for(const pattern of patterns)for(const match of text.matchAll(pattern))spans.push([match.index!,match.index!+match[0].length]);return spans;
}
export function keywordSuggestions(text:string):string[]{const spans=protectedSpans(text),terms:string[]=[];for(const m of text.matchAll(/\*\*([^*\n]{1,60})\*\*/g)){if(!spans.some(([a,b])=>m.index!<b&&m.index!+m[0].length>a)&&!/[。！？.!?：:]/.test(m[1]))terms.push(m[1].trim());}return [...new Set(terms)].slice(0,6);}
export function makeCloze(text:string,keyword:string,heading='关键词回忆'):ClozeDraft{
 const term=keyword.trim();if(!term||term.length>80||/\n/.test(term))throw new Error('请输入 1 至 80 字符的单行关键词');const positions:number[]=[];let i=0;while((i=text.indexOf(term,i))>=0){positions.push(i);i+=term.length;}
 if(!positions.length)throw new Error('原文中没有完全相同的关键词，请直接复制原文字词');const spans=protectedSpans(text);if(positions.some(i=>spans.some(([a,b])=>i<b&&i+term.length>a)))throw new Error('关键词出现在代码、公式或注释中，请选择普通正文里的关键词');if(positions.length>12)throw new Error('关键词出现超过 12 次，范围过宽；请选择更具体的词');
 let masked=text;for(const at of [...positions].reverse())masked=masked.slice(0,at)+'［…］'+masked.slice(at+term.length);const safeHeading=heading.split(term).join('［…］');const front=`${safeHeading} · 补全关键词\n\n${masked}`;if(front.length>4000)throw new Error('挖空问题过长，请选择较短的段落');return{front,back:`关键词：${term}\n\n原文：${text}`,matches:positions.length};
}
