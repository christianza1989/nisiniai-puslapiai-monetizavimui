import {createServer} from 'node:http';
import {readFile,mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from '../release-20261010/pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),publicRoot=path.join(repo,'sites/madbeauty/prototype/public'),assets=path.join(repo,'sites/madbeauty/cloudflare/output/assets-release'),origin='http://127.0.0.1:8797';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const b=await build({entryPoints:[path.join(repo,'sites/madbeauty/cloudflare/worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]});
const output=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011');await mkdir(output,{recursive:true});
const mails=[],mime={'.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const requestedStorage=process.argv[2];if(requestedStorage&&(!path.isAbsolute(requestedStorage)||!path.basename(requestedStorage).startsWith('madbeauty-community-ui-')||path.dirname(path.resolve(requestedStorage))!==path.resolve(os.tmpdir())))throw Error('Only the isolated local UI test directory may be reused');
const storage=requestedStorage||await mkdtemp(path.join(os.tmpdir(),'madbeauty-community-ui-'));
const mf=new Miniflare({modules:true,script:b.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true}},durableObjectsPersist:storage,images:{binding:'IMAGES'},bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',COMMUNITY_ENABLED:'true',SESSION_SECRET:'local-ui-only-secret-not-production-access',OPERATOR_EMAIL:'operator@example.com'},serviceBindings:{MAIL_TRANSPORT:async r=>{mails.push(await r.json());return new Response('Accepted');},ASSETS:async r=>{const name=decodeURIComponent(new URL(r.url).pathname).slice(1);if(!name||name.includes('..'))return new Response('Not found',{status:404});try{let bytes;try{bytes=await readFile(path.join(publicRoot,name));}catch{bytes=await readFile(path.join(assets,name));}return new Response(bytes,{headers:{'Content-Type':mime[path.extname(name)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}});
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,origin);if(u.pathname==='/local-test-code'){const email=u.searchParams.get('email');if(!email?.endsWith('@example.com')){res.writeHead(404);res.end();return;}const mail=mails.findLast(m=>m.to===email);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({code:mail?.text.match(/\b\d{6}\b/)?.[0]||null}));return;}
 const chunks=[];for await(const c of req)chunks.push(c);const r=await mf.dispatchFetch(u.href,{method:req.method,redirect:'manual',headers:req.headers,...chunks.length?{body:Buffer.concat(chunks)}:{}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local test failed');}});
server.listen(8797,'127.0.0.1',()=>console.log('Isolated native community UI: '+origin+'/bendruomene'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await mf.dispose();process.exit(0);});
