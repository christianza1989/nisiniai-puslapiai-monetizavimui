import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {request} from 'node:http';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting';
const isolate=path.join(core,'output/laiptucentras-redesign-20261001');
const hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await fs.readFile(new URL('../../../research/autonomy/laiptucentras-review/parent-evidence/VERSION-CHECK.json',import.meta.url),'utf8'));
const sourceChecks=[];
for(const row of old.sourceChecks){const b=await fs.readFile(path.join(core,row.file));const q=await fs.readFile(path.join(isolate,row.file));sourceChecks.push({file:row.file,prior:row.expected,current:hash(b),isolated:hash(q),unchanged:hash(b)===row.expected,isolatedMatches:hash(b)===hash(q)});}
for(const file of ['components/niche/laiptucentras-quote-check.tsx','lib/laiptucentras-quote-check.mjs','app/niche/[siteId]/brand-icon/route.ts','vite.config.ts','tests/seo-core-smoke.mjs']){sourceChecks.push({file,current:hash(await fs.readFile(path.join(core,file))),isolated:hash(await fs.readFile(path.join(isolate,file))),isolatedMatches:hash(await fs.readFile(path.join(core,file)))===hash(await fs.readFile(path.join(isolate,file)))});}
const dispatchFile='app/niche/[siteId]/[[...slug]]/page.tsx';
const mainDispatch=await fs.readFile(path.join(core,dispatchFile),'utf8');
const isolatedDispatch=await fs.readFile(path.join(isolate,dispatchFile),'utf8');
const withoutAddedMini=mainDispatch.split(/\r?\n/).filter(line=>!line.includes('if (siteId === "miniekskavatoriai")')).join('\n');
const dispatchDifference={file:dispatchFile,onlyAddedMiniBranch:withoutAddedMini===isolatedDispatch.replaceAll('\r\n','\n'),meaning:'Concurrent owner added the seventh branch; existing laiptucentras branch and guards remain byte-identical after that one-line exclusion. No seventh-site runtime claim.'};
const before=JSON.parse(await fs.readFile(new URL('./baseline/content-packages/laiptucentras/content-package.json',import.meta.url),'utf8'));
const after=JSON.parse(await fs.readFile(path.join(core,'content-packages/laiptucentras/content-package.json'),'utf8'));
const pages=after.pages.map(p=>{const prev=before.pages.find(x=>x.id===p.id);return {id:p.id,slug:p.slug,bodyUnchanged:JSON.stringify(prev.body)===JSON.stringify(p.body),titleUnchanged:prev.title===p.title,publishAtUnchanged:prev.publishAt===p.publishAt};});
const get=(url,host)=>new Promise((resolve,reject)=>{const req=request('http://127.0.0.1:8866'+url,{headers:{Host:host}},res=>{let body='';res.setEncoding('utf8');res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body}));});req.on('error',reject);req.end();});
const favicons=[];
for(const entry of await fs.readdir(path.join(isolate,'content-packages'),{withFileTypes:true})){if(!entry.isDirectory())continue;const id=entry.name;const pkg=JSON.parse(await fs.readFile(path.join(isolate,'content-packages',id,'content-package.json'),'utf8'));const result=await get('/favicon.svg',pkg.canonicalHost);favicons.push({siteId:id,status:result.status,svg:result.body.startsWith('<svg'),sha256:hash(result.body),stairMark:result.body.includes('M9 49h14V35h14V21h14V9M9 55 55 9')});}
const unknown=await get('/favicon.svg','unknown-niche.invalid');
const mismatch=await get('/niche/laiptucentras/brand-icon','akmenas.lt');
const ok=pages.every(p=>p.bodyUnchanged&&p.titleUnchanged&&p.publishAtUnchanged)&&favicons.every(f=>f.status===200&&f.svg&&f.stairMark===(f.siteId==='laiptucentras'))&&unknown.status===404&&mismatch.status===404;
const result={at:new Date().toISOString(),sourceChecks,dispatchDifference,pages,favicons,unknownHostStatus:unknown.status,mismatchedSiteStatus:mismatch.status,passed:ok&&dispatchDifference.onlyAddedMiniBranch,scope:'Six packages frozen in isolated QA. Seventh miniekskavatoriai package concurrently added by its owner is not claimed as root tested.',packageSha256:hash(await fs.readFile(path.join(core,'content-packages/laiptucentras/content-package.json')))};
await fs.writeFile(new URL('./VERSION-CHECK.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:ok,pages:pages.length,sourceChecks:sourceChecks.length,changed:sourceChecks.filter(s=>s.unchanged===false).map(s=>s.file),isolateDrift:sourceChecks.filter(s=>!s.isolatedMatches).map(s=>s.file),favicons:favicons.length,unknown:unknown.status,mismatch:mismatch.status}));
if(!ok)process.exitCode=1;
