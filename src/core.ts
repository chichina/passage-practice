// Original implementation. MIT; see LICENSE.
export type Stage = 'question' | 'recall' | 'compare';
export interface Round { target: string; recall: string; missed: string[] }
export class Session {
 stage: Stage = 'question'; question = ''; recall = ''; missed = ''; rounds: Round[] = [];
 target: string;
 constructor(readonly source: string, readonly fallback: string) { this.target = source; this.question = fallback; }
 start(question: string) { if (this.stage !== 'question') return; this.question = question.trim() || this.fallback; this.stage = 'recall'; }
 reveal() { if (this.stage !== 'recall') return; this.stage = 'compare'; }
 points() { return this.missed.split(/\r?\n/).map(x=>x.trim()).filter(Boolean); }
 snapshot(): Round { return {target:this.target, recall:this.recall, missed:this.points()}; }
 retry() { if (this.stage !== 'compare' || !this.points().length) return false; this.rounds.push(this.snapshot()); this.target = this.points().join('\n'); this.recall = ''; this.missed = ''; this.stage = 'recall'; return true; }
}
export function defaultQuestion(text: string, line: number, title: string): string {
 let heading = ''; let fence = '';
 for (const row of text.split('\n').slice(0, line + 1)) {
  const f = row.match(/^\s{0,3}(`{3,}|~{3,})/);
  if (f) { if (!fence) fence=f[1][0]; else if (f[1][0]===fence) fence=''; continue; }
  if (!fence) { const h=row.match(/^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/); if(h) heading=h[1]; }
 }
 return heading || title || '回忆这段内容';
}
export function literal(text: string): string {
 const runs=text.match(/`+/g) || []; const fence='`'.repeat(Math.max(3,...runs.map(x=>x.length+1)));
 return `${fence}text\n${text}\n${fence}`;
}
export function reviewNote(session: Session, path: string, date: string): string {
 const link=path.split('/').map(x=>encodeURIComponent(x).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16))).join('/');
 const rounds=[...session.rounds,session.snapshot()];
 return `# 选段即练 · 复习记录\n\n时间：${date}\n\n来源：[打开来源笔记](<${link}>)\n\n本次使用启动时的选段快照；原笔记未被修改。漏点由自己填写，无自动评分。\n\n## 题目\n${literal(session.question)}\n\n## 原始选段\n${literal(session.source)}\n\n`+rounds.map((r,i)=>`## 第 ${i+1} 轮\n\n### 本轮对照\n${literal(r.target)}\n\n### 我的回忆\n${literal(r.recall || '（未填写）')}\n\n### 自记漏点\n${literal(r.missed.join('\n') || '（未记录）')}`).join('\n\n')+'\n';
}
export async function createReview(create: (path:string,text:string)=>Promise<unknown>, exists:(path:string)=>boolean, text:string, stamp=Date.now()) {
 for (let n=0;n<100;n++) {
  const path=`选段即练-${stamp}-${n+1}.md`;
  if (exists(path)) continue;
  try { await create(path,text); return path; } catch(e) { if (exists(path)) continue; throw e; }
 }
 throw new Error('无法找到可用的新文件名');
}
