import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {baseSeed,productPath} from '../src/lib/catalog';
import {productPhotograph} from '../src/lib/product-photographs';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001',seed=baseSeed(),results:any[]=[];
function originalSource(src:string){const u=new URL(src,origin);return u.pathname.startsWith('/_next/image')?u.searchParams.get('url')!:src;}
async function inspect(route:string){const r=await fetch(origin+route);assert.equal(r.status,200,route);const d=parseHTML(await r.text()).document;
 const images=[...d.querySelectorAll('.gallery-main img,.gallery-thumbs img,.product-card-image img')];assert(images.length>0,route);
 for(const img of images){const src=originalSource(img.getAttribute('src')!);assert(productPhotograph(src),route+': non-photograph '+src);}
 results.push({route,photographs:images.length});
}
let cursor=0;const routes=seed.products.map(p=>productPath(p)+'?konfig=galerija');
await Promise.all(Array.from({length:6},async()=>{while(cursor<routes.length)await inspect(routes[cursor++]);}));
for(let page=1;page<=62;page++)await inspect('/produktai/'+(page>1?'?puslapis='+page:''));
const result={checkedAt:new Date().toISOString(),origin,productGroups:255,catalogPages:62,checkedPages:results.length,results};
fs.writeFileSync('../research/product-photo-audit-2026-10-12/'+(origin.startsWith('https')?'remote':'local')+'-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify({origin,checkedPages:results.length,productGroups:255,catalogPages:62},null,2));
