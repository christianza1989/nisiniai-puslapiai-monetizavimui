import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {candidate,seedPublicFixture,repo,out} from './candidate.mjs';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const f=await candidate();let checks=0;
const page=async(p,index,status=200)=>{const r=await f.request(p);assert.equal(r.status,status,p);const html=await r.text();assert.equal(html.includes('<meta name="robots" content="index,follow">'),index,p);assert.equal(r.headers.has('X-Robots-Tag'),!index,p);checks++;return html;};
try{
 for(const p of ['/', '/paslaugos','/salonai','/meistrai',...TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core').map(n=>'/paslaugos/'+n.id)]){const h=await page(p,true);assert.ok(h.includes('rel="canonical"'));assert.ok(h.includes('application/ld+json'));}
 for(const p of ['/paslaugos?q=manikiuras','/paieska','/meistrui/galerija','/paskyra','/salonai/miestas/akmene'])await page(p,false);
 await page('/salonai/miestas/not-a-city',false,404);await page('/paslaugos/not-a-service',false,404);
 const {org,asset}=await seedPublicFixture(f),profile=await page('/salonai/'+org.id,true);assert.ok(profile.includes('Darbų galerija'));assert.ok(profile.includes('Vietinio bandymo iliustracija'));assert.ok(profile.includes('Atsiliepimų dar nėra'));assert.ok(!profile.includes('aggregateRating'));
 const image=await f.request('/'+asset.variants[0].file);assert.equal(image.status,200);assert.equal(image.headers.get('X-Robots-Tag'),null);checks++;
 const directory=await page('/salonai/miestas/vilnius',true);assert.ok(directory.includes(org.id));assert.ok(directory.includes('ItemList'));const map=await page('/salonai/miestas/vilnius?vaizdas=zemelapis',false);assert.ok(map.includes('www.openstreetmap.org/export/embed.html'));
 const providers=await(await f.request('/providers.json')).json();assert.equal(providers.profiles.length,1);assert.equal(providers.profiles[0].id,org.id);assert.ok(!JSON.stringify(providers).includes('local-directory-owner'));assert.ok(!JSON.stringify(providers).includes('rightsConfirmedBy'));checks++;
 const sitemap=await(await f.request('/sitemap.xml')).text();assert.ok(sitemap.includes('/salonai/miestas/vilnius'));assert.ok(sitemap.includes('/salonai/'+org.id));assert.ok(!sitemap.includes('demo-'));assert.ok(!sitemap.includes('/salonai/miestas/akmene'));checks++;
 const robots=await(await f.request('/robots.txt')).text();assert.ok(robots.includes('Disallow: /api/'));assert.ok(robots.includes('Allow: /api/madbeauty/media/'));checks++;
 const pkg=JSON.parse(await readFile(path.join(repo,'sites/madbeauty/cloudflare/output/content-package.json'),'utf8')),future=pkg.pages.filter(p=>Date.parse(p.publishAt)>Date.now());for(const p of future){assert.equal((await f.request('/'+p.slug)).status,404,p.slug);checks++;}
 assert.equal((await(await f.request('/content.json')).json()).pages.length,pkg.pages.length-future.length);checks++;
 for(const file of ['/profile-seo.mjs','/provider-directory.mjs','/server-recovery.mjs','/search-select.mjs']){const r=await f.request(file);assert.equal(r.status,200,file);assert.ok(r.headers.get('content-type').includes('javascript'));checks++;}
 const result={state:'PASS',at:new Date().toISOString(),artifactSha256:f.manifest.artifactSha256,sourceCommit:f.manifest.sourceCommit,checks,futureHidden:future.length,localFixtureOnly:true,externalMailSent:0};await writeFile(path.join(out,'native.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await f.close();}
