import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {validatePackage,compilePackage} from './editorial/contract.mjs';
import {legacyPages,baseSeed,productPath} from '../src/lib/catalog';
import {legacyArticle} from '../src/lib/legacy-article';
import {applyEditorialHtml} from '../src/lib/editorial-server';
import {approvedHeroMarkup,approvedSectionsMarkup} from '../src/lib/approved-home-markup';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const active=JSON.parse(fs.readFileSync('content/editorial/content-package.json','utf8')),baseline=JSON.parse(fs.readFileSync('content/editorial/baseline-package.json','utf8'));
const status=validatePackage(active,baseline),norm=(text:string)=>text.replace(/\s+/g,' ').trim();
const compiled=compilePackage(active);assert.deepEqual(compiled.ui,JSON.parse(fs.readFileSync('content/editorial/compiled-ui.json','utf8')));assert.deepEqual(JSON.parse(JSON.stringify(compiled.server)),JSON.parse(fs.readFileSync('content/editorial/compiled-server.json','utf8')));
const results=[];
const home=await fetch(origin+'/'),homeDoc=parseHTML(await home.text()).document;
assert.equal(home.status,200);
for(const [scope,markup] of [['home-hero',approvedHeroMarkup],['home-sections',approvedSectionsMarkup]]){
 const expected=parseHTML('<html><body>'+applyEditorialHtml(scope,markup)+'</body></html>').document;
 for(const node of expected.body.querySelectorAll('h1,h2,h3,p,a,button')){
  const text=norm(node.textContent||'');if(text)assert(norm(homeDoc.querySelector('main')!.textContent!).includes(text),scope+' missing approved text: '+text.slice(0,120));
 }
}
for(const page of legacyPages().filter(p=>p.path!=='/')){
 const r=await fetch(origin+page.path),{document}=parseHTML(await r.text());assert.equal(r.status,200);
 const expected=parseHTML('<html><body>'+legacyArticle(page).html+'</body></html>').document;
 const blockText=(node:Node):string=>node.nodeType===3?node.nodeValue||'':Array.from(node.childNodes).map(blockText).join(' ');
 assert(norm(blockText(document.querySelector('.article-body')!)).includes(norm(blockText(expected.body))),page.path+' approved article text');
 assert.equal(document.querySelector('h1')?.textContent,page.h1);assert.equal(document.querySelectorAll('h1').length,1);
 for(const a of document.querySelectorAll('main a[href^="#"]'))assert(document.getElementById(a.getAttribute('href')!.slice(1)),page.path+' anchor');
 assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'),'https://ergonomic.lt'+page.path);
 results.push({path:page.path,status:200,approvedCopy:true});
}
for(const [id,copy] of Object.entries(compiled.server.products) as [string,{description?:string}][]){const product=baseSeed().products.find(p=>p.id===id)!;const r=await fetch(origin+productPath(product)),{document}=parseHTML(await r.text());assert.equal(r.status,200);if(copy.description)assert(norm(document.querySelector('main')!.textContent!).includes(norm(copy.description)),id+' product copy');}
const folder=process.env.CHECK_REPORT_DIR||'.impeccable/review/editorial';fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/editorial-http.json',JSON.stringify({origin,status,results},null,2));console.log(JSON.stringify({origin,...status,articles:results.length,result:'PASS'}));
