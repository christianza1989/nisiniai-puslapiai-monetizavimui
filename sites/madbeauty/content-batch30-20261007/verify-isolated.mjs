// Compiled exact-edition acceptance. Clock changes exist only in these isolated test bundles.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const expected='75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4';
const workerRoot=path.resolve(import.meta.dirname,'../cloudflare'),core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting');
const raw=await readFile(path.join(workerRoot,'output/content-package.json'));assert.equal(createHash('sha256').update(raw).digest('hex'),expected);const pkg=JSON.parse(raw);assert.equal(pkg.pages.length,39);
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const media=new Map(await Promise.all([...new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.src)))].map(async src=>[src,await readFile(path.join(workerRoot,'output/assets-release',src))])));
const dates=[...new Set(pkg.pages.filter(p=>Date.parse(p.publishAt)>Date.now()).map(p=>Date.parse(p.publishAt)))].sort((a,b)=>a-b),times=[Date.now(),...dates.flatMap(t=>[t-1,t])],proof={packageSha256:expected,approvedPages:39,media:media.size,mode:'isolated-compiled-workers-no-production-bindings',checkpoints:[]};
for(const now of times){
 const compiled=await build({entryPoints:[path.join(workerRoot,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[{name:'isolated-clock-only',setup(b){b.onLoad({filter:/cloudflare[\\/]worker\.mjs$/},async a=>{const source=await readFile(a.path,'utf8');assert.equal(source.split('contentProjection(Date.now(),registry)').length,2);return {contents:source.replace('contentProjection(Date.now(),registry)',`contentProjection(${now},registry)`),loader:'js'};});}}]});
 const mf=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}},images:{binding:'IMAGES'},bindings:{APP_ORIGIN:'https://madbeauty.test',RELEASE_MODE:'production',SESSION_SECRET:'isolated-batch30-no-production-secret-'.repeat(3)},serviceBindings:{ASSETS:async request=>{const data=media.get(new URL(request.url).pathname);return data?new Response(data,{headers:{'content-type':'image/webp'}}):new Response('Not found',{status:404});}}});
 try{
  const get=route=>mf.dispatchFetch('https://madbeauty.test'+route),due=pkg.pages.filter(p=>Date.parse(p.publishAt)<=now),future=pkg.pages.filter(p=>!due.includes(p)),dto=await(await get('/content.json')).json(),visibleMedia=new Set(due.flatMap(p=>p.media.map(m=>m.src)));
  assert.deepEqual(dto.pages.map(p=>p.id).sort(),due.map(p=>p.id).sort());
  for(const page of pkg.pages){const route=page.slug?'/'+page.slug:'/',r=await get(route),html=await r.text();assert.equal(r.status,due.includes(page)?200:404,route);if(future.includes(page)){assert.ok(!html.includes('application/ld+json'));assert.ok(!html.includes(page.title));continue;}
   if(page.type==='guide'){const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema[0]['@type'],'Article');assert.equal(schema[0].datePublished,page.editorial.datePublished);assert.equal(schema[0].dateModified,undefined);assert.equal(schema[0].author[0]['@type'],'Organization');assert.equal(schema[0].reviewedBy,undefined);assert.deepEqual(schema[1].itemListElement.map(x=>x.name),['Madbeauty','Gidai',page.title]);assert.ok(html.includes('/autoriai/redakcija'));const date=new Intl.DateTimeFormat('lt-LT',{timeZone:'Europe/Vilnius',dateStyle:'long'}).format(new Date(page.editorial.datePublished));assert.ok(html.includes(`datetime="${page.editorial.datePublished}">${date}`));}
  }
  const index=await(await get('/gidai')).text(),schema=JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema[0]['@type'],'CollectionPage');assert.equal(schema[0].mainEntity.itemListElement.length,due.filter(p=>p.type==='guide').length);
  for(const route of ['/sitemap.xml','/llms.txt','/llms-full.txt']){const r=await get(route);assert.equal(r.status,200);const text=await r.text();for(const p of future)assert.ok(!text.includes('https://madbeauty.lt/'+p.slug));for(const p of due)assert.ok(text.includes('https://madbeauty.lt/'+p.slug));}
  for(const [src,bytes] of media){const r=await get(src);assert.equal(r.status,visibleMedia.has(src)?200:404,src);if(visibleMedia.has(src))assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);}
  for(const p of future){assert.ok(!index.includes('href="/'+p.slug+'"'));assert.ok(!JSON.stringify(dto).includes('https://madbeauty.lt/'+p.slug));}
  proof.checkpoints.push({at:new Date(now).toISOString(),due:due.length,future:future.length,readyMedia:visibleMedia.size,hiddenMedia:media.size-visibleMedia.size,pass:true});
  console.log(JSON.stringify(proof.checkpoints.at(-1)));
 }finally{await mf.dispose();}
}
await writeFile(new URL('evidence/isolated-timing.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');
