import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';

// Read-only acceptance probe. It never submits a quote or changes remote data.
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const response=await fetch(origin+'/');
assert.equal(response.status,200);
const {document}=parseHTML(await response.text());
assert(document.querySelector('.approved-home'));
assert.equal(document.querySelectorAll('h1').length,1);
assert.equal(document.querySelectorAll('[data-category-id]').length,28);
assert.equal(document.querySelectorAll('.hp-popular-model').length,5);
assert.equal(document.querySelectorAll('.hp-demo-stage canvas').length,1);
assert.equal(document.querySelectorAll('footer').length,1);
assert(document.querySelector('footer.footer-unified'));
assert(!document.querySelector('.hp-legacy-contacts'));
assert.equal(document.querySelectorAll('#kontaktai .hp-contact-handwriting').length,1);
assert.equal(document.querySelectorAll('header').length,1);
assert.equal(document.querySelector('.header-search-form')?.getAttribute('action'),'/produktai/');
assert.equal(document.querySelector('.header-search-form input')?.getAttribute('name'),'paieska');
assert(document.querySelector('.hp-contact-form input[name="consent"][required]'));
const links=[...new Set([...document.querySelectorAll('header a[href], .approved-home a[href], footer a[href]')]
  .map(node=>node.getAttribute('href')).filter(href=>href.startsWith('/')&&!href.startsWith('/#')))];
const manifest=JSON.parse(fs.readFileSync('content/home-final-provenance.json','utf8'));
const assets=[...manifest.assets,{path:'/media/home-final/demo.js'},{path:'/media/home-final/carousels.js'}];
async function batch(items,task){
  const results=[];
  for(let i=0;i<items.length;i+=4)results.push(...await Promise.all(items.slice(i,i+4).map(task)));
  return results;
}
const destinations=await batch(links,async href=>{
  const result=await fetch(origin+href);assert.equal(result.status,200,href);
  await result.arrayBuffer();return {path:href,status:result.status};
});
const files=await batch(assets,async asset=>{
  const result=await fetch(origin+asset.path);assert.equal(result.status,200,asset.path);
  const bytes=Buffer.from(await result.arrayBuffer());
  const expected=asset.sha256||createHash('sha256').update(fs.readFileSync('public'+asset.path)).digest('hex');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,asset.path+' changed bytes');
  return {path:asset.path,status:result.status,bytes:bytes.length,sha256:expected};
});
const out=process.env.CHECK_REPORT_DIR||'.impeccable/review/home-integration-20261012';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,origin.startsWith('https:')?'public-acceptance.json':'local-acceptance.json'),JSON.stringify({checkedAt:new Date().toISOString(),origin,readOnly:true,categories:28,popular:5,destinations,files},null,2));
console.log(JSON.stringify({origin,categories:28,popular:5,links:destinations.length,verifiedAssets:files.length,readOnly:true}));
