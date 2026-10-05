import {App,Component,MarkdownRenderer,TFile} from 'obsidian';
import {prepareSafeMarkdown} from './markdown-safety';

/** A renderer may finish after unload; late children/callbacks are cleaned immediately. */
class PreviewOwner extends Component {
 private disposed=false;
 override unload(){this.disposed=true;super.unload();}
 override addChild<T extends Component>(child:T):T {if(this.disposed){child.unload();return child;}return super.addChild(child);}
 override register(cleanup:()=>any){if(this.disposed)cleanup();else super.register(cleanup);}
}

/** One owner per screen/modal; reset before replacing a screen, dispose on close. */
export class MarkdownPreviewScope {
 private active=new Set<()=>void>();
 constructor(private app:App){}
 reset(){for(const cancel of [...this.active])cancel();this.active.clear();}
 mount(parent:HTMLElement,markdown:string,sourcePath:string,onReady?:(host:HTMLElement)=>void):()=>void {
  const doc=parent.ownerDocument,host=doc.createElement('div');host.className='pp-markdown markdown-rendered';
  host.setAttribute('aria-busy','true');parent.append(host);
  const loading=doc.createElement('p');loading.className='pp-muted';loading.textContent='正在排版…';host.append(loading);
  const staging=doc.createElement('div');staging.className='pp-markdown-content';
  const owner=new PreviewOwner();owner.load();let current=true;
  const cancel=()=>{if(!current)return;current=false;owner.unload();staging.replaceChildren();host.replaceChildren();host.remove();this.active.delete(cancel);};this.active.add(cancel);
  const safe=prepareSafeMarkdown(markdown,{resolveLocalAsset:path=>{
   try {const link=decodeURIComponent(path.split('#')[0]);const file=this.app.metadataCache.getFirstLinkpathDest(link,sourcePath);
    return file instanceof TFile&&/^(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.extension)?this.app.vault.getResourcePath(file):null;
   }catch{return null;}
  }});
  void MarkdownRenderer.render(this.app,safe,staging,sourcePath,owner).then(()=>{
   if(!current){owner.unload();staging.replaceChildren();return;}
   host.replaceChildren(staging);host.setAttribute('aria-busy','false');
   // Contain wide tables without flattening native Markdown structure.
   for(const table of Array.from(staging.querySelectorAll('table'))){const scroll=doc.createElement('div');scroll.className='pp-table-scroll';table.replaceWith(scroll);scroll.append(table);}
   // Native tasks in a read-only snapshot must never edit the source note.
   for(const input of Array.from(staging.querySelectorAll<HTMLInputElement>('input')))input.disabled=true;
   const links=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest<HTMLAnchorElement>('a.internal-link');if(!anchor||!host.contains(anchor))return;event.preventDefault();event.stopPropagation();const target=anchor.getAttribute('data-href')||anchor.getAttribute('href');if(target)void this.app.workspace.openLinkText(target,sourcePath,event.ctrlKey||event.metaKey);};
   owner.registerDomEvent(host,'click',links);
   onReady?.(staging);
  }).catch(()=>{if(!current){owner.unload();staging.replaceChildren();return;}owner.unload();staging.replaceChildren();host.replaceChildren();const error=doc.createElement('p');error.className='pp-error';error.textContent='这段内容暂时无法排版，请打开来源查看，或切换 Markdown 源码差异。';host.append(error);host.setAttribute('aria-busy','false');});
  return cancel;
 }
}
