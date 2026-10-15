// Isolated compiled runtime over actual approved bytes. No production clock override.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];},site=path.resolve(import.meta.dirname,'..'),core=path.resolve(site,'../../../dovanos-memorycasting');
const packagePath=path.resolve(arg('--package')),raw=await readFile(packagePath),sha=createHash('sha256').update(raw).digest('hex');assert.equal(sha,arg('--expected-sha256'));
assert.equal(createHash('sha256').update(await readFile(path.join(site,'cloudflare/output/content-package.json'))).digest('hex'),sha,'Build the exact candidate before acceptance');
const pkg=JSON.parse(raw),assets=JSON.parse(await readFile(path.join(site,'cloudflare/output/asset-paths.json'))),assetPaths=new Set(assets),allMedia=new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.src)));
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const origin='https://madbeauty.lt',future=pkg.pages.filter(p=>Date.parse(p.publishAt)>Date.now()),boundary=Math.min(...future.map(p=>Date.parse(p.publishAt)));assert.ok(Number.isFinite(boundary));
const proof={packageSha256:sha,environment:'isolated-Miniflare-actual-reviewed-candidate',productionMutation:false,clocks:[]};
for(const now of [Date.now(),boundary-1,boundary]){
 const bundle=await build({entryPoints:[path.join(site,'cloudflare/worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[{name:'isolated-clock-only',setup(b){b.onLoad({filter:/cloudflare[\\/]worker\.mjs$/},async a=>({contents:(await readFile(a.path,'utf8')).replace('contentProjection(Date.now(),registry)',`contentProjection(${now},registry)`).replace('createContentTargetRegistry({offers,deployed:!preview})',`createContentTargetRegistry({offers,deployed:!preview,now:${now}})`),loader:'js'}));}}]});
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true}},images:{binding:'IMAGES'},bindings:{APP_ORIGIN:origin,RELEASE_MODE:'production',SESSION_SECRET:'isolated-candidate-check-no-production-access'},serviceBindings:{ASSETS:async request=>{const requested=decodeURIComponent(new URL(request.url).pathname);if(!assetPaths.has(requested))return new Response('Not found',{status:404});return new Response(await readFile(path.join(site,'cloudflare/output/assets-release',requested.slice(1))),{headers:{'Content-Type':requested.endsWith('.webp')?'image/webp':'application/octet-stream'}});}}});
 try{
  const visible=pkg.pages.filter(p=>Date.parse(p.publishAt)<=now),media=new Set(visible.flatMap(p=>p.media.map(m=>m.src))),row={now:new Date(now).toISOString(),visiblePages:visible.length,mediaReady:media.size,mediaHidden:allMedia.size-media.size,articleCommerceLinks:0};
  const dto=await(await mf.dispatchFetch(origin+'/content.json')).json();assert.equal(dto.pages.length,visible.length);
  for(const p of pkg.pages){const due=visible.includes(p),r=await mf.dispatchFetch(origin+'/'+p.slug),html=await r.text();assert.equal(r.status,due?200:404,p.slug);assert.equal(r.headers.get('x-madbeauty-content-sha256'),sha);if(!due){assert.ok(!html.includes('application/ld+json'));assert.ok(!dto.pages.some(x=>x.id===p.id));continue;}assert.ok(html.includes('application/ld+json'));assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1);for(const block of p.body.filter(b=>b.type==='paragraph'))assert.ok(html.includes(block.text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))),p.slug);if(p.slug==='gidai/bendri-gidas'){for(const t of p.editorial.commerceTargets)assert.ok(html.includes(`href="${t.url}"`),t.id);row.articleCommerceLinks=p.editorial.commerceTargets.length;}}
  for(const src of allMedia){const r=await mf.dispatchFetch(origin+src);assert.equal(r.status,media.has(src)?200:404,src);if(media.has(src)){const expected=await readFile(path.join(path.dirname(packagePath),'assets',path.basename(src)));assert.deepEqual(Buffer.from(await r.arrayBuffer()),expected);}}
  for(const route of ['/sitemap.xml','/llms.txt','/llms-full.txt']){const text=await(await mf.dispatchFetch(origin+route)).text();for(const p of pkg.pages)assert.equal(text.includes(origin+'/'+p.slug),visible.includes(p),route+' '+p.slug);if(route==='/sitemap.xml')assert.ok(!text.includes('<loc>'+origin+'/paslaugos'));}
  proof.clocks.push(row);
 }finally{await mf.dispose();}
}
await mkdir(new URL('evidence/',import.meta.url),{recursive:true});await writeFile(new URL('evidence/prospective-candidate.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,pass:true}));
