// The full-quality renderer starts automatically when the visitor reaches
// its actual stage. Once active it stays active through scrolling and changes.
export function activateProductViewerWhenNear(stage:HTMLElement,activate:()=>void):()=>void {
 let closed=false,started=false,observer:IntersectionObserver|undefined;
 const start=()=>{
  if(closed||started)return;
  started=true;observer?.disconnect();stage.removeEventListener('focusin',start);activate();
 };
 stage.addEventListener('focusin',start);
 if(typeof IntersectionObserver==='function'){
  observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.target===stage&&entry.isIntersecting&&entry.intersectionRatio>=.25))start();},{rootMargin:'0px',threshold:.25});
  observer.observe(stage);
 }else start();
 return()=>{closed=true;observer?.disconnect();stage.removeEventListener('focusin',start);};
}
