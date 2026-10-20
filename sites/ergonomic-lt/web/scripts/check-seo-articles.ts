import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {legacyPages} from '../src/lib/catalog';

async function main(){
 const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
 const pages=legacyPages().filter(page=>page.path!=='/');
 const images=new Set<string>(),products=new Set<string>(),rows=[];
 for(const page of pages){
  const response=await fetch(origin+page.path),{document}=parseHTML(await response.text());
  assert.equal(response.status,200,page.path);
  assert.equal(document.querySelectorAll('.seo-article-page').length,1,page.path);
  assert.equal(document.querySelectorAll('.article-body').length,1,page.path);
  assert.equal(document.querySelectorAll('.legacy-home-categories').length,0,page.path);
  assert.equal(document.querySelectorAll('header').length,1);assert.equal(document.querySelectorAll('footer').length,1);
  assert.equal(document.querySelectorAll('h1').length,1);assert.equal(document.querySelector('h1')?.textContent,page.h1);
  assert(!/Nowy Styl|Kusch\+Co|SOHOS/i.test(document.querySelector('main')?.textContent||''),'Supplier identity in '+page.path);
  for(const link of document.querySelectorAll('main a[href^="#"]'))assert(document.getElementById(link.getAttribute('href')!.slice(1)),page.path+' broken anchor '+link.getAttribute('href'));
  for(const h of page.headings)assert(document.getElementById(h.id),page.path+' original heading anchor '+h.id);
  const cards=document.querySelectorAll('.article-products .product-card');assert(cards.length>0,page.path+' no related products');
  for(const link of document.querySelectorAll('.article-products a[href^="/produktai/"]'))products.add(link.getAttribute('href')!);
  for(const image of document.querySelectorAll('.article-hero-photo img,.article-figure img')){
   assert(image.getAttribute('alt')?.trim(),page.path+' missing image alt');
   assert(image.getAttribute('width')&&image.getAttribute('height'),page.path+' missing image dimensions');
   const src=image.getAttribute('src')!;images.add(src);
   for(const rendition of (image.getAttribute('srcset')||'').split(',').filter(Boolean))images.add(rendition.trim().split(' ')[0]);
  }
  rows.push({path:page.path,status:200,relatedCards:cards.length,articleBeforeProducts:true,oldNavigationRemoved:true});
  assert.equal(document.querySelectorAll('.article-body,.article-products')[0]?.classList.contains('article-body'),true,page.path+' article order');
 }
 const imageChecks=await Promise.allSettled([...images].map(async path=>{const r=await fetch(origin+path);assert.equal(r.status,200,path);assert(r.headers.get('content-type')?.includes('image/webp'),path);return {path,status:r.status,bytes:(await r.arrayBuffer()).byteLength};}));
 const productChecks=await Promise.allSettled([...products].map(async path=>{const r=await fetch(origin+path);assert.equal(r.status,200,path);return {path,status:r.status};}));
 for(const result of [...imageChecks,...productChecks])if(result.status==='rejected')throw result.reason;
 const directory=process.env.CHECK_REPORT_DIR||'.impeccable/review/seo-articles';mkdirSync(directory,{recursive:true});
 const report={origin,checkedAt:new Date().toISOString(),pages:rows,imageChecks:imageChecks.map(r=>r.status==='fulfilled'?r.value:null),productChecks:productChecks.map(r=>r.status==='fulfilled'?r.value:null)};
 writeFileSync(directory+'/article-check.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({pages:rows.length,images:images.size,productLinks:products.size,result:'PASS'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
