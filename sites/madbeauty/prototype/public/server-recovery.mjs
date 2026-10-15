const privateRoute=/^\/(?:paskyra|meistrui|operatorius|registracija)(?:\/|$)/;
const routeKey=href=>{const u=new URL(href);return u.pathname+u.search;};
export function captureServerPage(doc,href,{privatePrototype=false,temporaryTest=false}={}){
 const main=doc.querySelector('#main'),heading=main?.querySelector('h1'),url=new URL(href);
 if(privatePrototype||temporaryTest||privateRoute.test(url.pathname)||!heading||/Įkeliama|nerastas|nepavyko/.test(heading.textContent)||!main.textContent.trim()||main.textContent.trim()==='Įkeliama…')return null;
 return {schemas:doc.querySelectorAll?[...doc.querySelectorAll('script[type="application/ld+json"]')].map(el=>el.textContent):null,key:routeKey(href),html:main.innerHTML,title:doc.title,robots:doc.querySelector('meta[name="robots"]')?.content,description:doc.querySelector('meta[name="description"]')?.content,canonical:doc.querySelector('link[rel="canonical"]')?.href};
}
export function serverPageFor(snapshot,href){return snapshot?.key===routeKey(href)?snapshot:null;}
export function restoreServerMetadata(doc,snapshot){
 doc.title=snapshot.title;
 if(snapshot.schemas){doc.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());for(const text of snapshot.schemas){const el=doc.createElement('script');el.type='application/ld+json';el.textContent=text;doc.head.append(el);}}
 for(const name of ['robots','description']){const meta=doc.querySelector(`meta[name="${name}"]`);if(meta&&snapshot[name])meta.content=snapshot[name];}
 const canonical=doc.querySelector('link[rel="canonical"]');if(canonical&&snapshot.canonical)canonical.href=snapshot.canonical;
}
