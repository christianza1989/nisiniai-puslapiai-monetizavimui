import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Store, Fault } from './store.mjs';
import { identities } from './seed.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
export function createServer({dbFile=process.env.MEMORYSTRING_DB||path.join(root,'.local','operations.sqlite')}={}){
 if(process.env.NODE_ENV==='production')throw Error('This synthetic local adapter is not admitted for production.');
 const store=new Store(dbFile),sessions=new Map();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  try{
   const port=server.address()?.port, allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
   if(!allowedHosts.has(req.headers.host))throw new Fault('invalid_host','Use the local loopback URL.',403);
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw new Fault('invalid_origin','This request came from another origin.',403);
   const url=new URL(req.url,`http://${req.headers.host}`),pathname=url.pathname;
   const token=req.headers.cookie?.match(/(?:^|; )ms_session=([^;]+)/)?.[1],actor=sessions.get(token);
   const auth=()=>{if(!actor)throw new Fault('unauthorized','Choose a local test identity to continue.',401);return actor;};
   const body=async()=>{
    if(!req.headers['content-type']?.startsWith('application/json'))throw new Fault('content_type','Send JSON for this action.',400);
    let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>2*1024*1024)throw new Fault('body_limit','This file is too large. Use a bounded creator project.',413);chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new Fault('invalid_json','The request is not valid JSON.',400);}
   };
   if(pathname==='/api/health'&&req.method==='GET')return json(200,{ok:true,mode:'local-synthetic',siteId:'stringart'});
   if(pathname==='/api/identities'&&req.method==='GET')return json(200,{identities});
   if(pathname==='/api/session'&&req.method==='POST'){
    const b=await body(),selected=identities.find(i=>i.id===b.identity);if(!selected)throw new Fault('unknown_identity','Choose an available test identity.',400);
    if(token)sessions.delete(token);const key=randomBytes(32).toString('hex');sessions.set(key,selected);
    res.setHeader('Set-Cookie',`ms_session=${key}; HttpOnly; SameSite=Strict; Path=/`);return json(200,{actor:selected});
   }
   if(pathname==='/api/session'&&req.method==='DELETE'){if(token)sessions.delete(token);res.setHeader('Set-Cookie','ms_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(200,{ok:true});}
   if(pathname==='/api/state'&&req.method==='GET')return json(200,{actor:auth(),data:store.view(actor)});
   if(pathname.startsWith('/api/orders/')&&req.method==='GET')return json(200,{order:store.order(auth(),decodeURIComponent(pathname.slice(12)))});
   if(pathname==='/api/commands'&&req.method==='POST'){auth();return json(200,store.command(actor,await body()));}
   if(pathname.startsWith('/api/'))throw new Fault('not_found','This endpoint could not be found.',404);
   if(req.method!=='GET')throw new Fault('method','Use GET for this page.',405);
   const kit=path.resolve(root,'../mobile/design/kit');
   const file=pathname.startsWith('/assets/')?path.resolve(kit,decodeURIComponent(pathname.slice(8))):path.join(root,({'/':'index.html','/app.mjs':'app.mjs','/style.css':'style.css'})[pathname]||'__missing__');
   if(pathname.startsWith('/assets/')&&!file.startsWith(kit+path.sep))throw new Fault('forbidden','This asset is unavailable.',403);
   const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain; charset=utf-8'}[path.extname(file)];
   if(!mime)throw new Fault('not_found','This page could not be found.',404);
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime});res.end(bytes);
  }catch(e){json(e instanceof Fault?e.status:e.code==='ENOENT'?404:500,{error:e instanceof Fault?e.message:e.code==='ENOENT'?'This page could not be found.':'The local server could not complete this action.',code:e instanceof Fault?e.code:'server_error'});}
 });
 server.on('close',()=>store.close());return {server,store};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server}=createServer();server.listen(Number(process.env.PORT||8946),'127.0.0.1',()=>console.log(`MemoryString local synthetic workspace: http://127.0.0.1:${server.address().port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
