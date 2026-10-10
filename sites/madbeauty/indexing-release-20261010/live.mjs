import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {out,repo,origin} from './candidate.mjs';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const deployment=JSON.parse(await readFile(path.join(out,'deployment.json'),'utf8'));let checks=0;
const request=p=>fetch(origin+p,{redirect:'manual'}),page=async(p,index)=>{const r=await request(p);assert.equal(r.status,200,p);assert.equal(r.headers.get('X-Madbeauty-Content-SHA256'),deployment.packageSha256);const html=await r.text();assert.equal(html.includes('<meta name="robots" content="index,follow">'),index,p);assert.equal(r.headers.has('X-Robots-Tag'),!index,p);checks++;return html;};
for(const p of ['/', '/paslaugos','/salonai','/meistrai',...TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core').map(n=>'/paslaugos/'+n.id)])await page(p,true);
for(const p of ['/paskyra','/meistrui/galerija','/paieska','/paslaugos?q=manikiuras'])await page(p,false);
const profiles=(await(await request('/providers.json')).json()).profiles;assert.ok(profiles.every(p=>p.approved&&!p.isDemo&&!p.id.startsWith('demo-')));checks++;
for(const kind of ['salon','solo']){const cityProfiles=profiles.filter(p=>p.kind===kind&&(p.locations||[p.location]).some(l=>l?.city==='Vilnius'));await page('/'+(kind==='salon'?'salonai':'meistrai')+'/miestas/vilnius',cityProfiles.length>0);}
for(const p of profiles){const html=await page('/'+(p.kind==='salon'?'salonai':'meistrai')+'/'+p.id,true);assert.ok(html.includes(p.name.replaceAll('&','&amp;')));assert.ok(html.includes('LocalBusiness'));if(!p.reviews.length)assert.ok(!html.includes('aggregateRating'));}
const sitemap=await(await request('/sitemap.xml')).text();assert.ok(sitemap.includes('https://madbeauty.lt/paslaugos</loc>'));assert.ok(sitemap.includes('https://madbeauty.lt/salonai</loc>'));assert.ok(!sitemap.includes('demo-'));checks++;
const robots=await(await request('/robots.txt')).text();assert.ok(robots.includes('Allow: /api/madbeauty/media/'));assert.ok(robots.includes('Disallow: /api/'));checks++;
for(const file of ['app.mjs','start.mjs','search-select.mjs','server-recovery.mjs','profile-seo.mjs','provider-directory.mjs','app.css']){const r=await request('/'+file);assert.equal(r.status,200,file);const bytes=Buffer.from(await r.arrayBuffer()),local=await readFile(path.join(repo,'sites/madbeauty/cloudflare/output/assets-release',file));assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(local).digest('hex'),file);checks++;}
assert.equal((await request('/salonai/miestas/not-a-city')).status,404);checks++;
const result={state:'PASS',at:new Date().toISOString(),version:deployment.version,sourceCommit:deployment.sourceCommit,checks,publicProfiles:profiles.length,sitemapURLs:(sitemap.match(/<loc>/g)||[]).length,backendWrites:0};await writeFile(path.join(out,'live.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
