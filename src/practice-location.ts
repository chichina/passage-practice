import {Scope} from './study-source';
export interface PracticeLocation {mode:'passage'|'outline';path:string;line:number;identity:string;sourceFingerprint:string;scope:Scope;currentPath:string;excludedPaths:string[]}
export interface PracticeLocations {version:1;passage?:PracticeLocation;outline?:PracticeLocation}
export function parseLocations(raw:unknown):PracticeLocations {
 if(!raw||typeof raw!=='object'||(raw as any).version!==1)throw new Error('练习位置文件格式不支持，已停止写入位置');
 const result:PracticeLocations={version:1};
 for(const mode of ['passage','outline'] as const){const p=(raw as any)[mode];if(p===undefined)continue;
  if(!p||p.mode!==mode||typeof p.path!=='string'||!p.path||p.path.length>4096||!Number.isSafeInteger(p.line)||p.line<0||typeof p.identity!=='string'||p.identity.length>10000||typeof p.sourceFingerprint!=='string'||!/^[a-f0-9]{16}$/.test(p.sourceFingerprint)||!p.scope||!['all','current','folder','tag'].includes(p.scope.kind)||typeof p.scope.value!=='string'||typeof p.currentPath!=='string'||!Array.isArray(p.excludedPaths)||p.excludedPaths.some((x:unknown)=>typeof x!=='string'))throw new Error('练习位置文件损坏，已停止写入位置');
  result[mode]={mode,path:p.path,line:p.line,identity:p.identity,sourceFingerprint:p.sourceFingerprint,scope:{kind:p.scope.kind,value:p.scope.value},currentPath:p.currentPath,excludedPaths:[...p.excludedPaths]};
 }return result;
}
/** Separate from card data; never writes answer text, recall or drafts. */
export class LocationStore {
 private state:PracticeLocations;private pending:Promise<unknown>=Promise.resolve();
 constructor(raw:unknown,private persist:(value:PracticeLocations)=>Promise<void>){this.state=parseLocations(raw);}
 get(mode:'passage'|'outline'){return this.state[mode]?structuredClone(this.state[mode]):undefined;}
 save(location:PracticeLocation):Promise<void>{const captured=structuredClone(location);const job=this.pending.then(async()=>{const next=parseLocations({...this.state,[captured.mode]:captured});await this.persist(next);this.state=next;});this.pending=job.catch(()=>{});return job;}
}
