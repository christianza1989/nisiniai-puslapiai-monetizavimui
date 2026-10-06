(() => {
 const header=document.querySelector('.pb-global-header'),nav=document.querySelector('#pb-global-nav'),toggle=document.querySelector('.pb-shell-toggle');
 if(!header||!nav||!toggle)return;
 const close=()=>{nav.removeAttribute('data-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');toggle.querySelector('use').setAttribute('href','/assets/shared-shell/icons.svg#menu');};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';nav.toggleAttribute('data-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');toggle.querySelector('use').setAttribute('href','/assets/shared-shell/icons.svg#'+(open?'close':'menu'));});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
 header.addEventListener('focusout',event=>{if(event.relatedTarget&&!header.contains(event.relatedTarget))close();});
 const breakpoint=matchMedia('(min-width:851px)');breakpoint.addEventListener('change',()=>close());
 const path=location.pathname.split('/').filter(Boolean)[0]||'',route=['shop','guides','help','contact'].includes(path)?path:path==='checkout'?'shop':'';
 nav.querySelector(`[data-shell-route="${route||'demo'}"]`)?.setAttribute('aria-current',route?'page':path?'false':'location');
 if(path&&!route)nav.querySelector('[aria-current="false"]')?.removeAttribute('aria-current');
 document.addEventListener('pointerlockchange',()=>header.toggleAttribute('data-demo-active',!!document.pointerLockElement?.classList.contains('demo-scene')));
 const summary=document.querySelector('.pb-mobile-summary'),footer=document.querySelector('.pb-global-footer');
 if(summary&&footer&&'IntersectionObserver' in window)new IntersectionObserver(entries=>summary.toggleAttribute('data-footer-visible',entries[0].isIntersecting)).observe(footer);
})();
