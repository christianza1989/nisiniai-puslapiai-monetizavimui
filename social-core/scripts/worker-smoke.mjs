import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../commerce-core/package.json',import.meta.url)),{build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../worker.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',conditions:['workerd','worker','browser']});
// Installed pinned binary supports through2026-10-13. Actual hosted acceptance
// separately validates the production2026-10-20 compatibility configuration.
let outboundCalls=0;
const outboundService=async request=>{
 outboundCalls++;const url=new URL(request.url);
 if(url.hostname==='graph.instagram.com'){
  assert.equal(request.headers.get('authorization'),'Bearer fixture-private-token');
  return Response.json({data:[{id:'123456789',media_type:'VIDEO',media_url:'https://fixture.cdninstagram.com/video.mp4',thumbnail_url:'https://fixture.cdninstagram.com/photo.jpg',permalink:'https://www.instagram.com/p/fixture/',timestamp:new Date().toISOString(),caption:'Izoliuota vietinė patikra'}]});
 }
 assert.equal(url.hostname,'fixture.cdninstagram.com');
 if(url.pathname==='/redirect')return new Response(null,{status:302,headers:{location:'https://untrusted.test/collect'}});
 if(url.pathname==='/video.mp4'){assert.equal(request.headers.get('range'),'bytes=0-3');return new Response('test',{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 0-3/100'}});}
 return new Response('fixture-jpeg',{headers:{'content-type':'image/jpeg'}});
};
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-13',outboundService,kvNamespaces:['INSTAGRAM_STATE'],bindings:{INSTAGRAM_ENABLED:'1',INSTAGRAM_USERNAME:'fixture',INSTAGRAM_API_VERSION:'v26.0'}}));
try{
 await mf.ready;const kv=await mf.getKVNamespace('INSTAGRAM_STATE');
 assert.equal((await mf.dispatchFetch('https://internal/feed')).status,503);
 await kv.put('feed',JSON.stringify({username:'fixture',fetchedAt:Date.now(),items:[{id:'123456789',type:'IMAGE',href:'https://www.instagram.com/p/fixture/',timestamp:new Date().toISOString(),caption:'Vietinė izoliuota patikra',media:'https://fixture.cdninstagram.com/photo.jpg',poster:'https://fixture.cdninstagram.com/photo.jpg'}]}));
 const response=await mf.dispatchFetch('https://internal/feed'),body=await response.json();assert.equal(response.status,200);assert.equal(body.items.length,1);assert.equal(body.items[0].poster,'/social/instagram/media/123456789/poster');assert.equal(JSON.stringify(body).includes('cdninstagram.com'),false);
 assert.equal((await mf.dispatchFetch('https://internal/token')).status,404);assert.equal((await mf.dispatchFetch('https://internal/feed',{method:'POST'})).status,405);
 const image=await mf.dispatchFetch('https://internal/media/123456789/poster');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.equal(await image.text(),'fixture-jpeg');
 await kv.put('connection',JSON.stringify({token:'fixture-private-token',userId:'123450000',username:'fixture',refreshedAt:Date.now(),expiresAt:null}));
 const worker=await mf.getWorker();await worker.scheduled({cron:'*/30 * * * *'});
 assert.equal(JSON.parse(await kv.get('status')).status,'connected');
 const video=await mf.dispatchFetch('https://internal/media/123456789/video',{headers:{Range:'bytes=0-3'}});assert.equal(video.status,206);assert.equal(await video.text(),'test');
 const snapshot=JSON.parse(await kv.get('feed'));snapshot.items[0].poster='https://fixture.cdninstagram.com/redirect';await kv.put('feed',JSON.stringify(snapshot));
 assert.equal((await mf.dispatchFetch('https://internal/media/123456789/poster')).status,502);assert.equal(outboundCalls,4);
 console.log(JSON.stringify({status:'PASS',runtime:'native-workerd',compatibilityDate:'2026-10-13',productionCompatibility:'2026-10-20-hosted-check-required',checks:['KVunconnected503','KVsnapshot200','sanitizedmedia','noTokenRoute','noWriteMethods','native-image-fetch','native-scheduled-API-sync','native-video-Range','redirect-not-followed'],providerCalls:0,isolatedOutboundCalls:outboundCalls}));
}finally{await mf.dispose();}
