import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../commerce-core/package.json',import.meta.url)),{build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../worker.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',conditions:['workerd','worker','browser']});
// Installed pinned binary supports through2026-10-13. Actual hosted acceptance
// separately validates the production2026-10-20 compatibility configuration.
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-13',kvNamespaces:['INSTAGRAM_STATE'],bindings:{INSTAGRAM_ENABLED:'1',INSTAGRAM_USERNAME:'fixture',INSTAGRAM_API_VERSION:'v26.0'}}));
try{
 await mf.ready;const kv=await mf.getKVNamespace('INSTAGRAM_STATE');
 assert.equal((await mf.dispatchFetch('https://internal/feed')).status,503);
 await kv.put('feed',JSON.stringify({username:'fixture',fetchedAt:Date.now(),items:[{id:'123456789',type:'IMAGE',href:'https://www.instagram.com/p/fixture/',timestamp:new Date().toISOString(),caption:'Vietinė izoliuota patikra',media:'https://fixture.cdninstagram.com/photo.jpg',poster:'https://fixture.cdninstagram.com/photo.jpg'}]}));
 const response=await mf.dispatchFetch('https://internal/feed'),body=await response.json();assert.equal(response.status,200);assert.equal(body.items.length,1);assert.equal(body.items[0].poster,'/social/instagram/media/123456789/poster');assert.equal(JSON.stringify(body).includes('cdninstagram.com'),false);
 assert.equal((await mf.dispatchFetch('https://internal/token')).status,404);assert.equal((await mf.dispatchFetch('https://internal/feed',{method:'POST'})).status,405);
 console.log(JSON.stringify({status:'PASS',runtime:'native-workerd',compatibilityDate:'2026-10-13',productionCompatibility:'2026-10-20-hosted-check-required',checks:['KVunconnected503','KVsnapshot200','sanitizedmedia','noTokenRoute','noWriteMethods'],providerCalls:0}));
}finally{await mf.dispose();}
