import {request} from 'node:http';import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production';
const pkg=JSON.parse(await readFile(core+'/content-packages/laiptucentras/content-package.json','utf8'));
const studio=JSON.parse(await readFile(new URL('../../content-studio/data/sites/laiptucentras.json',import.meta.url),'utf8'));
async function get(path,host='laiptucentras.lt'){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:8786,path,headers:{host,'user-agent':'NicheReadOnlyAudit bot'}},res=>{let body='';res.setEncoding('utf8');res.on('data',x=>body+=x);res.on('end',()=>resolve({path,host,status:res.statusCode,body,headers:res.headers}));});req.on('error',reject);req.end();});}
const checks=[];
for(const page of studio.pages.filter(p=>!pkg.pages.some(x=>x.slug===p.slug))){const r=await get('/'+page.slug);assert.equal(r.status,404);assert.ok(!r.body.includes('rel="canonical"'));checks.push({path:r.path,status:r.status,scope:'private future draft'});}
const media=pkg.pages.find(p=>p.type==='guide').media[0].src;
for(const [path,host,status] of [[media,'laiptucentras.lt',200],[media,'traktoriupadangos.lt',404],[media,'unknown-domain.example',404],['/niche/laiptucentras','laiptucentras.lt',404],['/api/internal/publish-due','laiptucentras.lt',404],['/skaic/laiptai.html','laiptucentras.lt',404],['/index.php?menu=lt2','laiptucentras.lt',404]]){const r=await get(path,host);assert.equal(r.status,status,path+' '+host);checks.push({path,host,status});}
const llm=(await get('/llms-full.txt')).body;
assert.ok(!/info@memorycasting\.lt|smtp\.hostinger\.com|LEAD_SMTP_PASSWORD/.test(llm));assert.ok(llm.includes('info@pinet.lt'));for(const p of studio.pages.filter(p=>!pkg.pages.some(x=>x.slug===p.slug)))assert.ok(!llm.includes('/'+p.slug));
const result={at:new Date().toISOString(),checks,privateDraftsExcluded:true,mediaHostBoundary:true,noPrivateConfigurationInLlm:true,noLegacyHomepageRedirects:true};await writeFile(new URL('./qa/boundaries.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
