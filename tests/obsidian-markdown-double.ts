/** Lightweight API double for DOM/state tests, never a claim of native Markdown fidelity. */
export const markdownObsidianDouble = String.raw`
export class Component {
 constructor(){this.children=[];this.cleanups=[];this.loaded=false;this.unloadCalls=0;(window.__markdownComponents??=[]).push(this);}
 load(){if(this.loaded)return;this.loaded=true;this.onload?.();for(const child of this.children)child.load();}
 unload(){this.unloadCalls++;if(!this.loaded)return;const wasLoaded=this.loaded;this.loaded=false;for(const child of this.children)child.unload();this.children=[];for(const cleanup of this.cleanups.splice(0))cleanup();if(wasLoaded)this.onunload?.();}
 addChild(child){this.children.push(child);if(this.loaded)child.load();return child;}
 removeChild(child){this.children=this.children.filter(c=>c!==child);child.unload();return child;}
 register(cleanup){this.cleanups.push(cleanup);}
 registerDomEvent(el,type,callback,options){el.addEventListener(type,callback,options);this.register(()=>el.removeEventListener(type,callback,options));}
}
export class MarkdownRenderChild extends Component {constructor(containerEl){super();this.containerEl=containerEl;}}
export class MarkdownRenderer {
 static render(app,markdown,el,sourcePath,owner){
  const call={app,markdown,el,sourcePath,owner};(window.__markdownCalls??=[]).push(call);
  if(window.__markdownRenderHook)return window.__markdownRenderHook(call);
  owner.addChild(new MarkdownRenderChild(el));
  const p=document.createElement('p');
  // Decode the sanitizer's escaped literal HTML for a readable text-only double.
  p.textContent=markdown.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  el.append(p);return Promise.resolve();
 }
}
`;
