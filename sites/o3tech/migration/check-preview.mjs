import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import path from'node:path';import http from'node:http';import{parseHTML}from'../../../../tools/node_modules/linkedom/esm/index.js';
import{projectPublicPages}from'../../../../dovanos-memorycasting/lib/niche-links.mjs';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')),site=JSON.parse(await readFile(path.join(root,'private/studio-data/sites/o3tech.json'),'utf8')),layout=JSON.parse(await readFile(path.join(root,'private/layout.json'),'utf8'));
const pkg={siteId:'o3tech',canonicalHost:'o3tech.lt',locale:'lt-LT',site,pages:site.pages};
assert.equal(projectPublicPages(pkg,[pkg],{},Date.now()).length,0,'Drafts must not enter shared public projection');
const results=[],links=new Set(),assets=new Set();let bodyBlocks=0;
const norm=s=>s.replace(/\s+/g,' ').trim();
for(const p of site.pages){
 const route=p.slug?'/'+p.slug+'/':'/';const r=await fetch('http://127.0.0.1:4783'+route);assert.equal(r.status,200,route);
 assert.match(r.headers.get('x-robots-tag'),/noindex/);const html=await r.text(),{document:d}=parseHTML(html);
 assert.equal(d.querySelectorAll('h1').length,1,route+' single H1');assert.equal(d.querySelector('h1').textContent,p.title);
 assert.equal(d.querySelector('html').lang,'lt');assert.ok(d.querySelector('meta[name=description]')?.content);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://o3tech.lt'+route);
 assert.equal(d.querySelectorAll('iframe,object,embed').length,0,route+' no legacy embeds');
 assert.deepEqual([...d.querySelectorAll('script')].map(s=>s.getAttribute('src')),['/o3tech-ui.js'],route+' only dependency-free local controls');
 assert.equal(d.querySelectorAll('[name=add-to-cart],.cart,.woocommerce,.elementor').length,0);
 const text=norm(d.querySelector('main').textContent);const missing=[];
 for(const a of p.media)assets.add(a.src);
 for(const b of p.body){if(b.type==='image')continue;for(const t of b.items||[b.text]){bodyBlocks++;if(!text.includes(norm(t)))missing.push(t);}}
 assert.deepEqual(missing,[],route+' all imported text rendered');
 for(const a of d.querySelectorAll('a[href]'))if(a.getAttribute('href').startsWith('/'))links.add(a.getAttribute('href'));
 for(const i of d.querySelectorAll('img')){assets.add(i.getAttribute('src'));assert.ok(Number(i.width||i.getAttribute('width'))>0);assert.ok(i.hasAttribute('alt'));for(const c of (i.getAttribute('srcset')||'').split(','))if(c.trim())assets.add(c.trim().split(' ')[0]);}
 const meta=layout.pages[p.id];if(meta.kind==='catalogue')assert.equal(d.querySelectorAll('.o3-product-card').length,meta.productPaths.length);
 results.push({path:route,status:r.status,htmlBytes:Buffer.byteLength(html),textBlocks:p.body.length,kind:meta.kind});
}
for(const link of links){const r=await fetch('http://127.0.0.1:4783'+link);assert.equal(r.status,200,link);if(link.includes('#')){const{document:d}=parseHTML(await r.text());assert.ok(d.getElementById(link.split('#')[1]),link);}}
for(const asset of assets){const r=await fetch('http://127.0.0.1:4783'+asset,{method:'HEAD'});assert.equal(r.status,200,asset);assert.match(r.headers.get('content-type'),/image\/webp/);}
for(const path of ['/krepselis/','/apmokejimas/','/paskyra/','/sample-page/','/not-a-page/','/sitemap.xml','/llms.txt','/llms-full.txt','/.env'])assert.equal((await fetch('http://127.0.0.1:4783'+path)).status,404,path);
const foreignHost=await new Promise((resolve,reject)=>{const q=http.get({hostname:'127.0.0.1',port:4783,path:'/',headers:{Host:'o3tech.lt'}},r=>{r.resume();resolve(r.statusCode);});q.on('error',reject);});assert.equal(foreignHost,421);
const before=await fetch('http://127.0.0.1:4783/robots.txt');assert.match(await before.text(),/Disallow: \/\n/);
const valid={name:'Test Fixture',email:'migration-check@example.test',message:'Synthetic local migration form verification only.',phone:'+37060000000',contact_method:'Telefonu',consent:'yes'};
async function submit(values,origin='http://127.0.0.1:4783'){return fetch('http://127.0.0.1:4783/uzklausa',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values)});}
assert.equal((await submit(valid,'https://unrelated.example')).status,403);
assert.equal((await submit({...valid,consent:''})).status,400);
assert.equal((await submit({...valid,name:'',message:'',phone:''})).status,200);
assert.equal((await submit({...valid,phone:'bad\r\nvalue'})).status,400);
assert.equal((await submit({...valid,email:'invalid'})).status,400);
const ok=await submit(valid);assert.equal(ok.status,200);assert.match(await ok.text(),/tik šiame kompiuteryje/);
const report={at:new Date().toISOString(),stage:'local-draft-preview',pages:results,bodyBlocks,internalLinksChecked:links.size,webpVariantsChecked:assets.size,publicProjectionCount:0,privateHostGuard:true,form:{originRejected:true,invalidConsentRejected:true,emailOnlyAccepted:true,invalidEmailRejected:true,headerInjectionRejected:true,validStored:true,mailSent:false},limits:['Native approved package/release not authorized','Production SEO HTTP, D1/SMTP/INBOX and field performance not claimed']};
await writeFile(path.join(root,'private/preview-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pages:results.length,bodyBlocks,internalLinks:links.size,webpVariants:assets.size,form:'native route / local durable SQLite / no email',publicPages:0}));
