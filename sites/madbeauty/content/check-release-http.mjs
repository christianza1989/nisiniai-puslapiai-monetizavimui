import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {request as httpRequest} from 'node:http';
import {createAppServer} from '../prototype/app-server.mjs';
import {contentSourceEvidence} from './adapter.mjs';
const evidenceRoot=path.resolve(import.meta.dirname,'../../../research/madbeauty-implementation');await mkdir(evidenceRoot,{recursive:true});
let clock=Date.parse('2026-10-05T11:59:59.999Z');
const server=createAppServer({enabled:false,contentClock:()=>clock,contentDiscovery:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const rows=[],guidePath='/gidai/kas-ieina-i-manikiuro-kaina';
const rawGet=(route,host='madbeauty.lt')=>new Promise((resolve,reject)=>{const req=httpRequest('http://127.0.0.1:'+server.address().port+route,{headers:{Host:host}},res=>{let body='';res.setEncoding('utf8');res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,body}));res.on('error',reject);});req.on('error',reject);req.end();});
const request=async(route,phase)=>{const {status,body}=await rawGet(route);rows.push({phase,route,status});await writeFile(path.join(evidenceRoot,'content-'+phase+'-'+route.replaceAll('/','_')+'.txt'),body);return{status,body};};
try{
 const before=await request(guidePath,'before');assert.equal(before.status,404);assert.ok(!before.body.includes('Šiame pavyzdyje bazinė paslauga'));assert.ok(!before.body.includes('type="application/ld+json"'));
 for(const route of ['/','/gidai','/paslaugos/manikiuras','/sitemap.xml','/llms.txt','/llms-full.txt','/content.json']){const row=await request(route,'before');assert.equal(row.status,200);assert.ok(!row.body.includes('href="'+guidePath+'"'));assert.ok(!row.body.includes('https://madbeauty.lt'+guidePath));if(route==='/content.json')assert.ok(!JSON.parse(row.body).pages.some(p=>p.slug===guidePath.slice(1)));}
 // Same HTTP server and same immutable imported package; only the test clock crosses publishAt.
 clock=Date.parse('2026-10-05T12:00:00.000Z');
 const after=await request(guidePath,'after');assert.equal(after.status,200);assert.ok(after.body.includes('Šiame pavyzdyje bazinė paslauga'));assert.ok(after.body.includes('href="/paslaugos/manikiuras"'));assert.ok(after.body.includes('type="application/ld+json"'));assert.ok(after.body.includes('"@type":"Article"'));assert.ok(after.body.includes('srcset='));assert.ok(after.body.includes('href="https://madbeauty.lt'+guidePath+'"'));
 for(const route of ['/','/gidai','/paslaugos/manikiuras']){const row=await request(route,'after');assert.equal(row.status,200);assert.ok(row.body.includes('href="'+guidePath+'"'));}
 for(const route of ['/sitemap.xml','/llms.txt','/llms-full.txt','/content.json']){const row=await request(route,'after');assert.equal(row.status,200);assert.ok(row.body.includes(route==='/content.json'?guidePath.slice(1):'https://madbeauty.lt'+guidePath));assert.ok(!/demo-org-|demo-client-|fixture-owner-|@example\.com|editorialReview|review-manifest|revisionHash|isDemo/.test(row.body));}
 const dto=JSON.parse((await request('/content.json','assets')).body),guide=dto.pages.find(p=>p.slug===guidePath.slice(1));for(const a of guide.media){const row=await fetch('http://127.0.0.1:'+server.address().port+a.src);assert.equal(row.status,200);assert.equal(row.headers.get('content-type'),'image/webp');assert.ok((await row.arrayBuffer()).byteLength>1000);}
 const privateManifest=await request('/release-manifest.json','private');assert.equal(privateManifest.status,404);
 const unknown=await rawGet('/','unknown-domain.example');assert.equal(unknown.status,404);
 await contentSourceEvidence();
 await writeFile(path.join(evidenceRoot,'content-release-http.json'),JSON.stringify({date:'2026-10-05',siteId:'madbeauty',status:'PASS',scope:'actual loopback HTTP, controlled clock replay of exact imported package; no historical publication or deployment claim',sameServer:true,before:'2026-10-05T11:59:59.999Z',after:'2026-10-05T12:00:00.000Z',mediaFiles:guide.media.length,noDemoContent:true,privateReviewExcluded:true,rows},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',requests:rows.length,mediaFiles:guide.media.length}));
}finally{await new Promise(r=>server.close(r));}
