import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {catalog,productPath} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {preparedImageSource} from '../src/lib/product-image-sources';
import {getDb} from '../src/lib/db';
import {uniqueGalleryPhotos,galleryPhotoIdentity} from '../src/lib/gallery-photo-identity';
import {productPhotograph} from '../src/lib/product-photographs';
const registry=JSON.parse(fs.readFileSync('content/photo-attribution.json','utf8')).records;

const out=process.env.CHECK_REPORT_DIR||'../research/full-product-galleries-2026-10-12';
fs.mkdirSync(out,{recursive:true});
process.env.RUNTIME_DIR=out+'/verification-runtime';
process.env.PREVIEW_CATALOG='true';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const parents=catalog().products,models=productModels(parents);
const routes=[...models,...parents.filter(p=>p.configurations.length>1)];
const checks:{route:string;photos:number;modelPhotos?:number}[]=[];
function normalize(source:string):string{
 const u=new URL(preparedImageSource(source),origin);
 if(u.pathname.startsWith('/_next/image'))return normalize(u.searchParams.get('url')!);
 if(u.pathname.startsWith('/media/products-v2/'))return u.pathname.replace(/\/\d+\.webp$/,'/');
 for(const key of [...u.searchParams.keys()])if(['height','width','mode','quality'].includes(key.toLowerCase()))u.searchParams.delete(key);
 u.hash='';return u.href;
}
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{
 while(cursor<routes.length){
  const p=routes[cursor++],route=productPath(p),response=await fetch(origin+route);
  assert.equal(response.status,200,route);
  const d=parseHTML(await response.text()).document;
  const gallery=d.querySelector('.product-photo-gallery');assert(gallery,route);
  const evidence=registry[p.id];
  const allowed:string[]=p.modelConfigurationId?evidence.configurations[p.modelConfigurationId].gallery:evidence.standalone?evidence.standalone.gallery:[...p.configurations.flatMap(c=>evidence.configurations[c.id]?.gallery||[]),...(evidence.familyGallery||[])];
  const approved=uniqueGalleryPhotos(allowed.map(src=>productPhotograph(src)));
  const ownPrimary=p.modelConfigurationId?productPhotograph(evidence.configurations[p.modelConfigurationId].primary):evidence.standalone?productPhotograph(evidence.standalone.primary):p.image;
  const expected=uniqueGalleryPhotos([ownPrimary,...approved]);
  assert.deepEqual(p.gallery,uniqueGalleryPhotos(p.modelConfigurationId||evidence.standalone?[ownPrimary,...approved]:approved),route+' registry ownership');
  assert.equal(new Set(p.gallery.map(galleryPhotoIdentity)).size,p.gallery.length,route+' unique photo content');
  const main=gallery!.querySelector('.gallery-main img');assert(main,route);
  assert.equal(normalize(main!.getAttribute('src')!),normalize(expected[0]),route+' primary');
  const thumbnails=[...gallery!.querySelectorAll('.gallery-thumbs img')];
  assert.equal(thumbnails.length,expected.length>1?expected.length:0,route+' full photo count');
  thumbnails.forEach((img,index)=>{
   assert.equal(normalize(img.getAttribute('src')!),normalize(expected[index]),route+' photo '+index);
   assert.equal(img.getAttribute('loading'),'lazy',route+' thumbnail loading');
   if(expected[index].startsWith('/media/products-v2/')||expected[index].startsWith('https://www.nowystyl.com/'))assert(img.getAttribute('srcset')||img.getAttribute('srcSet'),route+' responsive photo');
  });
  assert(d.querySelector('footer.footer-unified'),route+' current footer');
  checks.push({route,photos:expected.length,modelPhotos:p.modelGalleryCount});
  if(checks.length%200===0)console.log('Checked '+checks.length+'/'+routes.length);
 }
}));
getDb().close();
const counts=models.map(p=>p.gallery.length).sort((a,b)=>a-b);
const result={checkedAt:new Date().toISOString(),origin,models:models.length,familyPages:routes.length-models.length,checkedPages:checks.length,minPhotos:counts[0],medianPhotos:counts[Math.floor(counts.length/2)],maxPhotos:counts.at(-1),singlePhotoModels:counts.filter(n=>n===1).length,checks};
fs.writeFileSync(out+'/'+(origin.startsWith('https:')?'public':'local')+'-gallery-verification.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,checks:undefined}));
