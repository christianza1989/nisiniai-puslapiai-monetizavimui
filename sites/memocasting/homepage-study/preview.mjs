// Loopback-only layout study. No publishing predicate, customer data or checkout copy.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const study=new URL('./',import.meta.url),assets=new URL('../../../../dovanos-memorycasting/public/memocasting-homepage/v1/',import.meta.url);
const media=['logo.webp','hero-egeon-v2.webp','gallery-home-v1.webp','couple-cast-v1.webp','family-cast-v1.webp'];
const routes=new Map([['/',['index.html','text/html; charset=utf-8']],['/study.css',['study.css','text/css; charset=utf-8']],['/study.js',['study.js','text/javascript; charset=utf-8']],['/plan',['../HOMEPAGE_PLAN.md','text/plain; charset=utf-8']]]);
for(const name of media)routes.set('/assets/'+name,[new URL('media/'+name,assets),'image/webp']);
for(let i=1;i<=6;i++)routes.set(`/assets/chapter-${i}.webp`,[new URL(`media/white-film-v1/chapter-${i}.webp`,assets),'image/webp']);
for(const weight of [400,600])routes.set(`/assets/manrope-${weight}.ttf`,[new URL(`fonts/manrope-${weight}.ttf`,assets),'font/ttf']);
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://127.0.0.1:8841').pathname,item=routes.get(path);if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}if(!item){res.writeHead(404);res.end('Not found');return;}try{const bytes=await readFile(item[0] instanceof URL?item[0]:new URL(item[0],study));res.writeHead(200,{'Content-Type':item[1],'Content-Length':bytes.length,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; img-src 'self'; font-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(503);res.end('Study asset unavailable. Keep the paired public checkout beside core.');}});
server.listen(8841,'127.0.0.1',()=>console.log('Homepage layout study http://127.0.0.1:8841/'));
