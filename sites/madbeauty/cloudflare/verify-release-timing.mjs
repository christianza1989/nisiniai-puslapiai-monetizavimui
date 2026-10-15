// Actual-time reception of an exact immutable edition, without changing its dates.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateContentPackage} from '../../../../dovanos-memorycasting/scripts/content-package-core.mjs';
import {admitMadbeautyPackage} from '../content/intake.mjs';
import {admitPublicationRelease} from '../content/release-admission.mjs';
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const origin=args[0]||'https://madbeauty.lt',u=new URL(origin),production=origin==='https://madbeauty.lt';
assert.ok(production||u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port&&u.pathname==='/');
const packagePath=path.resolve(arg('--package')||fileURLToPath(new URL('output/content-package.json',import.meta.url))),raw=await readFile(packagePath),digest=createHash('sha256').update(raw).digest('hex');assert.equal(digest,arg('--expected-sha256'),'Exact reviewed immutable SHA required');
const pkg=admitPublicationRelease(admitMadbeautyPackage(validateContentPackage(JSON.parse(raw)),{operatorName:'MB Pinet',email:'info@pinet.lt'})),now=Date.now();assert.equal(pkg.schemaVersion,2);
const due=pkg.pages.filter(p=>Date.parse(p.publishAt)<=now),future=pkg.pages.filter(p=>Date.parse(p.publishAt)>now),publicMedia=new Set(due.flatMap(p=>p.media.map(m=>m.src)));
const proof={origin,production,checkedAt:new Date(now).toISOString(),packageSha256:digest,approvedPages:pkg.pages.length,duePages:due.length,futurePages:future.length,pages:[],media:[],discovery:[]};
async function get(urlPath){const response=await fetch(origin+urlPath,{redirect:'manual'});if(production)assert.equal(response.headers.get('x-madbeauty-content-sha256'),digest,urlPath);return {status:response.status,headers:response.headers,bytes:Buffer.from(await response.arrayBuffer())};}
const dto=await get('/content.json');assert.equal(dto.status,200);const publicJson=JSON.parse(dto.bytes),visibleIds=new Set(publicJson.pages.map(p=>p.id));
for(const p of pkg.pages){
 const route='/'+p.slug,published=due.includes(p),r=await get(route),html=r.bytes.toString();assert.equal(r.status,published?200:404,route);assert.equal(visibleIds.has(p.id),published,p.id);
 if(published){assert.ok(html.includes(`<link rel="canonical" href="https://madbeauty.lt${route}">`));assert.ok(html.includes('application/ld+json'));assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1);}
 else {assert.ok(!html.includes('rel="canonical"'));assert.ok(!html.includes('application/ld+json'));assert.ok(!html.includes(p.title));for(const visible of publicJson.pages){assert.ok(!(visible.links||[]).some(l=>l.href==='https://madbeauty.lt'+route||l.href===route));assert.ok(!JSON.stringify(visible.body).includes('https://madbeauty.lt'+route));}}
 proof.pages.push({path:route,status:r.status,publishAt:p.publishAt,published});
}
for(const src of new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.src)))){
 const sharedWithDue=publicMedia.has(src),r=await get(src);assert.equal(r.status,sharedWithDue?200:404,src);
 if(sharedWithDue){assert.match(r.headers.get('content-type'),/^image\/(webp|avif)/);const source=await readFile(path.join(path.dirname(packagePath),'assets',path.basename(src)));assert.equal(createHash('sha256').update(r.bytes).digest('hex'),createHash('sha256').update(source).digest('hex'),src);}
 proof.media.push({path:src,status:r.status,referencedByDuePage:sharedWithDue});
}
for(const discoveryPath of ['/sitemap.xml','/llms.txt','/llms-full.txt']){const r=await get(discoveryPath);assert.equal(r.status,production?200:404);if(production){const text=r.bytes.toString();for(const p of due)assert.ok(text.includes('https://madbeauty.lt/'+p.slug));for(const p of future)assert.ok(!text.includes('https://madbeauty.lt/'+p.slug));if(discoveryPath==='/sitemap.xml')assert.ok(!text.includes('<loc>https://madbeauty.lt/paslaugos'));}proof.discovery.push({path:discoveryPath,status:r.status});}
// Do not pass a check that crossed a scheduled boundary during reception.
assert.ok(!future.some(p=>Date.parse(p.publishAt)<=Date.now()),'Publication boundary crossed; repeat actual-time reception');
await mkdir(new URL('output/',import.meta.url),{recursive:true});await writeFile(new URL(`output/v2-${production?'canonical':'shadow'}-timing.json`,import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,pages:proof.pages.length,media:{ready:proof.media.filter(m=>m.status===200).length,hidden:proof.media.filter(m=>m.status===404).length},pass:true}));
