import http from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {AsyncLocalStorage} from 'node:async_hooks';
import {DatabaseSync} from 'node:sqlite';
import {o3techMarkup} from '../../../../dovanos-memorycasting/lib/o3tech-render.mjs';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')),pub=path.join(root,'dovanos-memorycasting');
const privateRoot=path.join(root,'private'),runtime=path.join(privateRoot,'preview-runtime');await mkdir(runtime,{recursive:true});
const sitePath=path.join(privateRoot,'studio-data/sites/o3tech.json');
const context=new AsyncLocalStorage();
const database=new DatabaseSync(path.join(privateRoot,'preview-leads.sqlite'));
database.exec('CREATE TABLE IF NOT EXISTS niche_leads(id TEXT PRIMARY KEY,site_id TEXT,created_at INTEGER,source_path TEXT,name TEXT,email TEXT,message TEXT,consent_at INTEGER,status TEXT)');
const env={DB:{prepare(sql){return{bind(...values){return{run(){return database.prepare(sql).run(...values);}};}};}}};
globalThis.__o3techPreview={context,env};
const stubFile=path.join(runtime,'bindings.mjs');
await writeFile(stubFile,`export const env=globalThis.__o3techPreview.env;export async function headers(){return globalThis.__o3techPreview.context.getStore().request.headers;}export function publicSiteByHost(host){return /^(127\\.0\\.0\\.1|localhost)(:\\d+)?$/.test(host||'')?globalThis.__o3techPreview.context.getStore().pkg:null;}export function publicSitePage(pkg,slug){return pkg.pages.find(p=>p.slug===slug);}export function publicSitePages(pkg){return pkg.pages;}export function nicheNetworkContact(){return{operatorName:'UAB A-Z Prekyba'};}export function nicheLeadRecipient(id,email){return email;}export async function sendNicheLeadMail(){throw Error('Preview never sends mail');}\n`);
let source=await readFile(path.join(pub,'app/niche/[siteId]/lead/route.ts'),'utf8');
source=source.replace(/^import .*;\r?\n/gm,'');
const prefix=`import {env,headers,publicSiteByHost,publicSitePage,publicSitePages,nicheLeadRecipient,nicheNetworkContact,sendNicheLeadMail} from ${JSON.stringify(pathToFileURL(stubFile).href)};import {memoLeadContext,memoLeadText} from ${JSON.stringify(pathToFileURL(path.join(pub,'lib/memocasting-lead-response.mjs')).href)};import {o3techInquiryMessage} from ${JSON.stringify(pathToFileURL(path.join(pub,'lib/o3tech-inquiry.mjs')).href)};\n`;
await writeFile(path.join(runtime,'lead-route.mjs'),prefix+stripTypeScriptTypes(source,{mode:'transform'}));
const{POST}=await import(pathToFileURL(path.join(runtime,'lead-route.mjs')).href);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const common={'X-Robots-Tag':'noindex, nofollow','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost):4783$/.test(host)){res.writeHead(421,common);res.end('Private loopback preview');return;}
  const url=new URL(req.url,'http://'+host),pathname=decodeURIComponent(url.pathname);
  if(pathname==='/robots.txt'){res.writeHead(200,{...common,'Content-Type':'text/plain'});res.end('User-agent: *\nDisallow: /\n');return;}
  // A draft preview cannot become a public content-discovery endpoint.
  if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(pathname)){res.writeHead(404,common);res.end('Private draft preview');return;}
  const site=JSON.parse(await readFile(sitePath,'utf8'));
  const pkg={siteId:'o3tech',canonicalHost:'o3tech.lt',locale:'lt-LT',site,pages:site.pages};
  if(pathname==='/uzklausa'&&req.method==='POST'){
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413,common);res.end('Request too large');return;}chunks.push(chunk);}
   const request=new Request(url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
   const response=await context.run({request,pkg},()=>POST(request,{params:Promise.resolve({siteId:'o3tech'})}));
   res.writeHead(response.status,{...common,...Object.fromEntries(response.headers)});res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...common,Allow:'GET, HEAD'});res.end();return;}
  let file=null,mime='';
  if(/^\/content-assets\/o3tech\/[a-f0-9-]+\.webp$/.test(pathname)){file=path.join(privateRoot,'preview-assets',path.basename(pathname));mime='image/webp';}
  if(/^\/fonts\/o3tech\/[a-z-]+\.woff2$/.test(pathname)){file=path.join(pub,'public',pathname);mime='font/woff2';}
  if(pathname==='/o3tech.css'){const css=await readFile(path.join(pub,'components/niche/o3tech-fonts.css'),'utf8')+await readFile(path.join(pub,'components/niche/o3tech.css'),'utf8');res.writeHead(200,{...common,'Content-Type':'text/css'});res.end(req.method==='HEAD'?'':css);return;}
  if(pathname==='/o3tech-ui.js'){const bytes=await readFile(path.join(pub,'public/o3tech-ui.js'));res.writeHead(200,{...common,'Content-Type':'text/javascript','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);return;}
  if(file){try{const bytes=await readFile(file);res.writeHead(200,{...common,'Content-Type':mime,'Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404,common);res.end();}return;}
  const page=site.pages.find(p=>('/'+p.slug+'/').replace('//','/')===pathname);
  if(!page){res.writeHead(404,{...common,'Content-Type':'text/html;charset=utf-8'});res.end('<!doctype html><html lang="lt"><meta name="robots" content="noindex"><title>404</title><p>404</p><a href="/">o3tech</a></html>');return;}
  const layout=JSON.parse(await readFile(path.join(pub,'config/o3tech-layout.json'),'utf8'));
  const rendererPath=path.join(pub,'lib/o3tech-render.mjs');
  const renderer=await import(pathToFileURL(rendererPath).href+'?version='+(await stat(rendererPath)).mtimeMs);
  const markup=renderer.o3techMarkup({pkg,page,pages:site.pages,layout,query:Object.fromEntries(url.searchParams)});
  const icon=site.pages.find(p=>p.type==='home').media.find(a=>a.id===layout.assets.icon);
  const html=`<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(page.title)} | o3tech.lt</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="https://o3tech.lt${pathname}"><link rel="icon" type="image/webp" href="${icon?.src||''}"><link rel="stylesheet" href="/o3tech.css"><style>body{margin:0}</style></head><body>${markup}<script src="/o3tech-ui.js" defer></script></body></html>`;
  res.writeHead(200,{...common,'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?'':html);
 }catch(e){console.error(e);res.writeHead(500,common);res.end('Preview error');}
});
server.listen(4783,'127.0.0.1',()=>console.log('o3tech private draft preview: http://127.0.0.1:4783/ (noindex; mail disabled)'));
process.on('SIGTERM',()=>server.close(()=>{database.close();process.exit(0);}));
