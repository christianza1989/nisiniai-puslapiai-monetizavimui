import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {baseSeed,legacyPages,productPath} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {selections,matchesSelection,curatedModels,modelTags} from '../src/lib/seo-collections';
import {categoryLabel} from '../src/lib/category-labels';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001',out=process.env.CHECK_REPORT_DIR||'.impeccable/review/seo-restructure';
const seed=baseSeed(),models=productModels(seed.products),results:any[]=[],destinations=new Set<string>();
async function inspect(route:string){const r=await fetch(origin+route);assert.equal(r.status,200,route);const d=parseHTML(await r.text()).document;assert.equal(d.querySelectorAll('h1').length,1,route+' H1');assert.equal(d.querySelectorAll('header').length,1,route+' header');assert.equal(d.querySelectorAll('footer').length,1,route+' footer');assert(d.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex'),route+' preview');for(const a of d.querySelectorAll('main a[href]')){const href=a.getAttribute('href')!;if(href.startsWith('/')&&!href.startsWith('/#'))destinations.add(href.split('#')[0]);}results.push({route,status:200,h1:d.querySelector('h1')!.textContent,canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href'),cards:d.querySelectorAll('.product-card').length});return d;}
for(const legacy of legacyPages())await inspect(legacy.path);
for(const s of selections.filter(s=>s.id!=='biuro-kedes')){const d=await inspect(s.catalog),expected=models.filter(p=>matchesSelection(p,s.id)).length;assert(d.querySelector('.catalog-heading')!.textContent!.includes(String(expected)),s.id+' count');assert.equal(d.querySelectorAll('.product-card').length,Math.min(20,expected));const old=await inspect(s.path);for(const p of curatedModels(models,s.id,5))assert(old.querySelector('a[href="'+productPath(p)+'"]'),s.id+' same registry');assert(old.querySelector('script[type="application/ld+json"]')?.textContent);}
const root=await inspect('/produktai/');for(const c of seed.categories.filter(c=>!c.parentId)){const route='/produktai/'+c.slug+'/';assert(root.querySelector('a[href="'+route+'"]')?.textContent?.includes(categoryLabel(c.id,c.name)));await inspect(route);}
const second=await inspect('/produktai/?puslapis=2');assert.equal(second.querySelector('link[rel="canonical"]')?.getAttribute('href'),'https://ergonomic.lt/produktai/?puslapis=2');
for(const query of ['ergonominiai stalai','ergonominės kėdės','ergonomines kedes','elektriniai stalai']){const d=await inspect('/produktai/?paieska='+encodeURIComponent(query));assert(d.querySelectorAll('.product-card').length>0,query);}
for(const type of ['elektriniai-stalai','mechaniniai-stalai','293c566e-be4e-4866-aece-e52d047e9f1c']){const d=await inspect('/produktai/rasomieji-stalai-ir-darbo-vietos/?tipas='+type);assert(d.querySelectorAll('.product-card').length>0,type);}
const electric=models.find(p=>modelTags(p).includes('electric'))!;const product=await inspect(productPath(electric));assert(product.querySelector('title')!.textContent!.includes('elektra reguliuojamo'));const jsons=[...product.querySelectorAll('script[type="application/ld+json"]')].map(node=>JSON.parse(node.textContent!));assert(jsons.some(j=>j['@type']==='BreadcrumbList'));const item=jsons.find(j=>j['@type']==='Product');assert.equal(item.sku,electric.modelConfigurationId);assert(!item.offers&&!item.aggregateRating);
for(const path of ['/biuro-baldu-gamyba/','/steam-baldai/','/gidai/'])await inspect(path);
for(const topic of ['Gamyba','STEAM','Mokyklai']){const d=await inspect('/uzklausa/?tema='+topic);assert(d.querySelector('textarea[name="message"]')!.textContent!.length>0,topic);}
const invalid=await fetch(origin+'/produktai/?atranka=nera-tokios');assert.equal(invalid.status,404);
const robots=await fetch(origin+'/robots.txt');assert((await robots.text()).includes('Disallow: /'));
const sitemap=await fetch(origin+'/sitemap.xml');assert(!(await sitemap.text()).includes('<loc>'));
const links=[...destinations];for(let n=0;n<links.length;n+=6)await Promise.all(links.slice(n,n+6).map(async route=>{const r=await fetch(origin+route);assert.equal(r.status,200,'internal link '+route);await r.arrayBuffer();}));
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/restructure-http.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,readOnly:true,results,internalLinks:links.length,previewNoindex:true,robotsDisallow:true,sitemapExcluded:true,invalidSelection:404},null,2));console.log(JSON.stringify({origin,pages:results.length,internalLinks:links.length,previewNoindex:true,status:'PASS'}));
