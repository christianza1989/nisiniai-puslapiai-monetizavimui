import {isCityId} from './cities.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TAXONOMY} from './demo-model.mjs';
import {gzipSync} from 'node:zlib';
import {openStore} from '../backend/store.mjs';
import {createApiHandler} from '../backend/http.mjs';
import {initializeFixtureRuntime} from '../backend/fixture-runtime.mjs';
import {contentProjection,contentAssetsRoot} from '../content/adapter.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),publicRoot=path.join(root,'public');
const network=JSON.parse(await readFile(process.env.MB_NETWORK_CONFIG||path.resolve(root,'../../../../dovanos-memorycasting/config/niche-network.json'),'utf8'));
const siteContact=network.contactsBySite?.madbeauty||{},contact={operatorName:siteContact.operatorName||network.operatorName,email:siteContact.email||network.defaultEmail};
if(!contact.operatorName||!contact.email)throw Error('Approved central contact required');
const inventory=JSON.parse(await readFile(path.join(root,'../SCREEN_INVENTORY.json'),'utf8'));
const heroMedia=JSON.parse(await readFile(path.join(publicRoot,'app-media.json'),'utf8')).assets.find(a=>a.id==='hero-violet');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const modules=new Set(['cities.mjs','config.mjs','demo-model.mjs','demo-adapter.mjs','platform-domain.mjs','platform-adapter.mjs','seo-contract.mjs','profile-fixtures-v2.mjs']);
export function resolveRoute(pathname,{profileResolver=null,contentResolver=null}={}){
  const canonical=pathname==='/'?'/':pathname.replace(/\/+$/,'');
  for(const s of inventory.screens.filter(s=>s.route)){
    const names=[];const re=new RegExp('^'+s.route.replace(/:([a-z]+)/g,(_,n)=>{names.push(n);return'([a-z0-9_-]+)';})+'$');const match=canonical.match(re);if(!match)continue;
    const params=Object.fromEntries(names.map((n,i)=>[n,match[i+1]]));
    if(params.service&&!TAXONOMY.some(s=>s.id===params.service))return null;
    if(params.city&&!isCityId(params.city))return null;
    if(s.id==='content-guide'&&!contentResolver?.(params.slug))return null;
    if(['public-practitioner','public-venue'].includes(s.id)){
      if(params.slug.startsWith('provider_')){const p=profileResolver?.(params.slug);if(!p||(s.id==='public-practitioner'&&p.kind!=='solo')||(s.id==='public-venue'&&p.kind!=='salon'))return null;}
      else {if(!/^demo-org-(?:[0-9]|[1-3][0-9]|4[0-5])$/.test(params.slug)||params.slug==='demo-org-29')return null;if(s.id==='public-practitioner'&&Number(params.slug.slice(9))>=24&&Number(params.slug.slice(9))<30||s.id==='public-venue'&&(Number(params.slug.slice(9))<24||Number(params.slug.slice(9))>=30))return null;}
    }
    if(s.id==='content-author'&&params.slug!=='mb-pinet')return null;
    const labels={'customer-entry':'Prisijungimas el. paštu','booking-confirmation':'Vizito patvirtinimas','booking-details-step':'Kliento kontaktas ir taisyklės','customer-review':'Atsiliepimas po atlikto vizito'};
    return{...s,label:labels[s.id]||s.label,params,canonical};
  }
  return null;
}
export function createAppServer({deployment='local-preview',now=new Date().toISOString(),apiHandler=null,enabled=true,contentClock=()=>Date.now(),contentPackagePath,contentDiscovery=false}={}){
  if(deployment!=='local-preview')throw Error('Private prototype server forbidden outside local-preview. Production implementation is separate.');
  return http.createServer(async(req,res)=>{
    const requestHost=String(req.headers.host||'').split(':')[0].toLowerCase();
    if(!['127.0.0.1','localhost','madbeauty.lt','www.madbeauty.lt'].includes(requestHost)){res.writeHead(404,{'X-Robots-Tag':'noindex, nofollow','Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
    if(apiHandler&&await apiHandler.handle(req,res))return;
    const headers={'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
    try{
      const url=new URL(req.url,'http://127.0.0.1'),requested=decodeURIComponent(url.pathname);
      const needsContent=requested==='/content.json'||requested.startsWith('/content-assets/')||['/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt'].includes(requested)||(!path.extname(requested)&&!/^\/(meistrui|operatorius|paskyra|registracija)(\/|$)/.test(requested));
      const content=needsContent?await contentProjection({now:contentClock(),...(contentPackagePath?{packagePath:contentPackagePath}:{})}):null;
      const contentPage=content?.pages.find(p=>(p.slug?'/'+p.slug:'/')===requested);
      if(requested==='/content.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify({siteId:'madbeauty',pages:content?.dto||[],operatorName:contact.operatorName}));return;}
      if(requested.startsWith('/content-assets/madbeauty/')){const filename=path.basename(requested);if(requested!=='/content-assets/madbeauty/'+filename||!filename.endsWith('.webp'))throw Error('Unsafe asset');const body=await readFile(path.join(contentAssetsRoot,'madbeauty',filename));res.writeHead(200,{...headers,'Content-Type':mime['.webp'],'Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);return;}
      if(requested==='/boot.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify({now,deployment,enabled,privatePrototype:true,apiAvailable:!!apiHandler,siteId:'madbeauty',contact}));return;}
      if(['/media.json','/app-media.json'].includes(requested)){const source=JSON.parse(await readFile(path.join(publicRoot,requested.slice(1)),'utf8'));res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify({assets:source.assets.map(({id,alt,variants})=>({id,alt:alt.replace(/demonstracinės?\s+/gi,'').replace(/demonstracinė\s+/gi,''),variants}))}));return;}
      if(requested==='/screen-registry.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify(inventory.screens.map(({id,route,label,surface})=>({id,route,label,surface}))));return;}
      if(requested==='/robots.txt'){res.writeHead(200,{...headers,'Content-Type':mime['.txt']});res.end(content?content.seo.nicheRobotsText(content.pkg,!contentDiscovery,content.pages.some(p=>p.type==='home')):'User-agent: *\nDisallow: /\n');return;}
      if(['/favicon.svg','/favicon.ico'].includes(requested)){res.writeHead(200,{...headers,'Content-Type':mime['.svg']});res.end(await readFile(path.join(publicRoot,'wordmark.svg')));return;}
      if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(requested)){if(contentDiscovery&&content){const body=requested==='/sitemap.xml'?content.seo.nicheSitemapXml(content.pkg,content.pages):requested==='/llms.txt'?content.seo.nicheLlmsIndex(content.pkg,content.pages):content.seo.nicheLlmsFull(content.pkg,content.pages);res.writeHead(200,{...headers,'Content-Type':requested.endsWith('.xml')?'application/xml; charset=utf-8':'text/markdown; charset=utf-8'});res.end(req.method==='HEAD'?undefined:body);return;}res.writeHead(404,headers);res.end('Private preview: discovery disabled.');return;}
      let route=resolveRoute(requested,{profileResolver:apiHandler?apiHandler.platform.profile:null,contentResolver:slug=>!!content?.pages.some(p=>p.type==='guide'&&p.slug==='gidai/'+slug)});
      if(requested.startsWith('/gidai/')&&!contentPage)route=null;
      if(route||!path.extname(requested)){
        const page=url.searchParams.get('page');const invalidPage=page!==null&&(!/^[1-9][0-9]?$/.test(page)||Number(page)>50);
        let html=await readFile(path.join(publicRoot,'app.html'),'utf8');
        if(requested==='/')html=html.replace('</head>',`<link rel="preload" as="image" href="/${heroMedia.variants.find(v=>v.width===640).file}" imagesrcset="${heroMedia.variants.map(v=>'/'+v.file+' '+v.width+'w').join(', ')}" imagesizes="(max-width:760px) 100vw, 82vw" fetchpriority="high"></head>`);
        html=html.replace(/<title>[^<]*<\/title>/,'<title>'+(route?.label||'Puslapis nerastas')+' · Madbeauty</title>');
        const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        if(contentPage){html=html.replace(/<title>[^<]*<\/title>/,'<title>'+escape(contentPage.title)+' · Madbeauty</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+escape(contentPage.description)+'">');html=html.replace('</head>',`<link rel="canonical" href="${escape(content.seo.nichePageUrl(content.pkg,contentPage))}"><script type="application/ld+json">${JSON.stringify(content.schema(contentPage)).replace(/</g,'\\u003c')}</script></head>`);html=html.replace('<p class="container">Įkeliama…</p>',content.html(contentPage));}
        else if(route)html=html.replace('</head>',`<link rel="canonical" href="http://127.0.0.1:${req.socket.localPort}${route.canonical}"></head>`);
        res.writeHead(route&&!invalidPage?200:404,{...headers,'Content-Type':mime['.html']});res.end(req.method==='HEAD'?undefined:html);return;
      }
      const relative=requested.slice(1),file=modules.has(relative)?path.join(root,relative):path.resolve(publicRoot,relative);
      if(!modules.has(relative)&&!file.startsWith(publicRoot+path.sep))throw Error('Outside public root');
      const type=mime[path.extname(file)];if(!type)throw Error('Not allowed');let body=await readFile(file);
      const compressed=body.length>1000&&/text|json|svg/.test(type)&&(req.headers['accept-encoding']||'').includes('gzip');
      if(compressed)body=gzipSync(body);
      res.writeHead(200,{...headers,'Content-Type':type,'Vary':'Accept-Encoding',...(compressed?{'Content-Encoding':'gzip'}:{}),'Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(404,{...headers,'Content-Type':mime['.txt']});res.end('Not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const deployment=process.env.MADBEAUTY_DEPLOYMENT||'local-preview';if(deployment!=='local-preview')throw Error('Private server forbidden outside local-preview');
  const mode=process.env.MADBEAUTY_DATA_MODE||'preview',port=Number(process.env.MADBEAUTY_APP_PORT||8788),store=mode==='preview'?openStore({filename:path.resolve(root,'../runtime/platform-preview.sqlite'),fixturePreview:true}):openStore();
  if(mode==='preview')console.log(JSON.stringify(initializeFixtureRuntime(store)));
  const apiHandler=createApiHandler(store,{origin:'http://127.0.0.1:'+port}),s=createAppServer({deployment,apiHandler,enabled:mode==='demo'});
  s.on('close',()=>store.close());
  s.listen(port,'127.0.0.1',()=>console.log('Private Madbeauty platform: http://127.0.0.1:'+port));
}
