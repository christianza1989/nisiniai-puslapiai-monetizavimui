import fs from 'node:fs';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const out=process.env.CHECK_REPORT_DIR||'D:/Core/output/ergonomic-duo-back-release-20261014';
const compiled=JSON.parse(fs.readFileSync('content/editorial/compiled-server.json','utf8'));
const article=compiled.products['product_xilium-swivel-chairs_0fe4091b'].articles?.['23636148'];assert(article,'Article not imported');
fs.mkdirSync(out,{recursive:true});const rows=article.technicalSections.flatMap(s=>s.rows),norm=s=>s.replace(/\s+/g,' ').trim(),results=[];
for(const id of ['23636148','23636152']){
 const path='/produktai/kedes/xilium-darbo-kedes-modelis-'+id+'/',response=await fetch(origin+path),raw=await response.text();assert.equal(response.status,200,path);
 const {document}=parseHTML(raw);assert.equal(document.querySelectorAll('h1').length,1);assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'),'https://ergonomic.lt'+path);
 const priorFile='D:/Core/output/ergonomic-duo-back-release-20261014/before-'+id+'.html';
 if(fs.existsSync(priorFile)){const previous=parseHTML(fs.readFileSync(priorFile,'utf8')).document;assert.equal(document.querySelector('h1')?.textContent,previous.querySelector('h1')?.textContent,'Existing H1 preserved');}
 if(id==='23636148'){
  assert.equal(norm(document.querySelector('.product-description').textContent),norm(article.summary));
  assert.equal(norm(document.querySelector('.product-article-scope').textContent),norm(article.scopeNote));
  assert.deepEqual([...document.querySelectorAll('.product-article-narrative p')].map(p=>norm(p.textContent)),article.paragraphs.map(norm));
  assert.deepEqual([...document.querySelectorAll('.product-technical-section h3')].map(n=>n.textContent),article.technicalSections.map(s=>s.heading));
  assert.deepEqual([...document.querySelectorAll('.product-technical-section dt')].map(n=>n.textContent),rows.map(r=>r.label));
  assert.deepEqual([...document.querySelectorAll('.product-technical-section dd')].map(n=>n.textContent),rows.map(r=>r.value));
  assert.equal(document.querySelector('meta[name="description"]').getAttribute('content'),article.seo.description);
  assert.equal(document.querySelector('title').textContent,article.seo.title);
  const schemas=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
  const product=schemas.find(s=>s['@type']==='Product');assert(product);assert.equal(product.sku,id);assert.equal(product.description,article.summary);assert(!product.brand&&!product.offers&&!product.aggregateRating);
  assert(!/Nowy\s*Styl|Kusch\s*\+\s*Co|SOHOS|configurationId|sourceOptions/i.test(document.querySelector('.product-article').textContent));
  assert(/noindex/.test(document.querySelector('meta[name="robots"]')?.getAttribute('content')||response.headers.get('x-robots-tag')||''));
 }else assert.equal(document.querySelectorAll('.product-article').length,0,'Copy must not leak to sibling');
 fs.writeFileSync(out+'/'+(origin.includes('127.0.0.1')?'local':'public')+'-'+id+'.html',raw);
 results.push({id,status:200,h1Preserved:true,article:id==='23636148',rows:id==='23636148'?rows.length:0});
}
const report={origin,checkedAt:new Date().toISOString(),status:'PASS',results};
fs.writeFileSync(out+'/'+(origin.includes('127.0.0.1')?'local':'public')+'-article-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
