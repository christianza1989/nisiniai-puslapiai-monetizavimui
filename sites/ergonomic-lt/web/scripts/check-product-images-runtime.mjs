import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const origin=process.env.CHECK_ORIGIN||'https://ergonomic-preview.pinet-azprekyba.workers.dev';
const seed=JSON.parse(readFileSync('content/seed.json','utf8'));
const mapping=JSON.parse(readFileSync('content/optimized-product-images.json','utf8'));
const manifest=JSON.parse(readFileSync('../research/product-images-background-2026-10-11/manifest.json','utf8'));
const backdrops=JSON.parse(readFileSync('content/product-image-backdrops.json','utf8'));
const product=seed.products.find(p=>p.id==='product_4me-swivel-chairs_d3eabb4a');
const routes=['/','/produktai/','/kolekcijos/',`/produktai/${product.categorySlug}/${product.slug}/`];
const pages=[];
for(const route of routes){
  const response=await fetch(origin+route);
  assert.equal(response.status,200,route);
  const html=await response.text();
  assert(!html.includes('Nepavyko įkelti puslapio.'),route);
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
  const prepared=images.filter(tag=>tag.includes('/media/products-v2/'));
  assert(prepared.length>0,`${route}: no optimized image elements`);
  assert(prepared.every(tag=>tag.includes('srcSet=')||tag.includes('srcset=')),`${route}: missing responsive sources`);
  for(const tag of prepared){const digest=tag.match(/products-v2\/([a-f0-9]+)-/)[1];if(backdrops[digest])assert(tag.includes('background-color:'+backdrops[digest]),`${route}: contain gutters differ from the source backdrop`);}
  if(route.startsWith('/produktai/'))assert(prepared.every(tag=>tag.includes('loading=')),route);
  pages.push({route,status:response.status,preparedImageElements:prepared.length});
}

const files=new Map(manifest.entries.flatMap(row=>row.files||[]).map(file=>[file.path,file]));
const paths=[...new Set(seed.products.flatMap(p=>[p.image,...p.configurations.map(c=>c.image)]).filter(Boolean).map(src=>mapping[src].replace(/\/\d+\.webp$/,'/400.webp')))];
let cursor=0,bytes=0;
await Promise.all(Array.from({length:8},async()=>{
  while(cursor<paths.length){
    const path=paths[cursor++],file=files.get(path);
    assert(file,path);
    const response=await fetch(origin+path);
    assert.equal(response.status,200,path);
    assert.match(response.headers.get('content-type')||'',/image\/webp/,path);
    if(origin.startsWith('https://')){
      assert.match(response.headers.get('cache-control')||'',/max-age=31536000/,path);
      assert.match(response.headers.get('cache-control')||'',/immutable/,path);
    }
    const data=Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,path);
    bytes+=data.length;
  }
}));
const result={checkedAt:new Date().toISOString(),origin,pages,verifiedPrimaryAndModelAssets:paths.length,downloadedBytes:bytes};
writeFileSync(`../research/product-images-background-2026-10-11/${origin.startsWith('https://')?'runtime-verification':'local-runtime-verification'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
