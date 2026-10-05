import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TAXONOMY} from './demo-model.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),publicRoot=path.join(root,'public');
const inventory=JSON.parse(await readFile(path.join(root,'../SCREEN_INVENTORY.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const modules=new Set(['config.mjs','demo-model.mjs','demo-adapter.mjs','platform-domain.mjs']);
export function resolveRoute(pathname){
  const canonical=pathname==='/'?'/':pathname.replace(/\/+$/,'');
  for(const s of inventory.screens.filter(s=>s.route)){
    const names=[];const re=new RegExp('^'+s.route.replace(/:([a-z]+)/g,(_,n)=>{names.push(n);return'([a-z0-9-]+)';})+'$');const match=canonical.match(re);if(!match)continue;
    const params=Object.fromEntries(names.map((n,i)=>[n,match[i+1]]));
    if(params.service&&!TAXONOMY.some(s=>s.id===params.service))return null;
    if(params.city&&!['vilnius','kaunas','klaipeda'].includes(params.city))return null;
    if(['public-practitioner','public-venue'].includes(s.id)&&(!/^demo-org-(?:[0-9]|[12][0-9])$/.test(params.slug)||params.slug==='demo-org-29'))return null;
    if(s.id==='content-guide'&&!['kaip-issirinkti-nagu-spalva','kas-ieina-i-manikiuro-kaina','kaip-pasirinkti-manikiuro-meistra'].includes(params.slug))return null;
    if(s.id==='content-author'&&params.slug!=='mb-pinet')return null;
    return{...s,params,canonical};
  }
  return null;
}
export function createAppServer({deployment='local-preview',now=new Date().toISOString()}={}){
  if(deployment!=='local-preview')throw Error('Private prototype server forbidden outside local-preview. Production implementation is separate.');
  return http.createServer(async(req,res)=>{
    const headers={'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
    try{
      const url=new URL(req.url,'http://127.0.0.1'),requested=decodeURIComponent(url.pathname);
      if(requested==='/boot.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify({now,deployment,enabled:true,privatePrototype:true}));return;}
      if(requested==='/screen-registry.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify(inventory.screens.map(({id,route,label,surface})=>({id,route,label,surface}))));return;}
      if(requested==='/robots.txt'){res.writeHead(200,{...headers,'Content-Type':mime['.txt']});res.end('User-agent: *\nDisallow: /\n');return;}
      if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(requested)){res.writeHead(404,headers);res.end('Private demonstration: no production discovery.');return;}
      const route=resolveRoute(requested);
      if(route||!path.extname(requested)){
        const page=url.searchParams.get('page');const invalidPage=page!==null&&(!/^[1-9][0-9]?$/.test(page)||Number(page)>50);
        let html=await readFile(path.join(publicRoot,'app.html'),'utf8');
        html=html.replace('<title>Madbeauty · privati demonstracija</title>','<title>'+(route?.label||'Puslapis nerastas')+' · Madbeauty demo</title>');
        res.writeHead(route&&!invalidPage?200:404,{...headers,'Content-Type':mime['.html']});res.end(req.method==='HEAD'?undefined:html);return;
      }
      const relative=requested.slice(1),file=modules.has(relative)?path.join(root,relative):path.resolve(publicRoot,relative);
      if(!modules.has(relative)&&!file.startsWith(publicRoot+path.sep))throw Error('Outside public root');
      const type=mime[path.extname(file)];if(!type)throw Error('Not allowed');const body=await readFile(file);
      res.writeHead(200,{...headers,'Content-Type':type});res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(404,{...headers,'Content-Type':mime['.txt']});res.end('Not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.MADBEAUTY_APP_PORT||8788),s=createAppServer({deployment:process.env.MADBEAUTY_DEPLOYMENT||'local-preview'});
  s.listen(port,'127.0.0.1',()=>console.log('Private Madbeauty platform: http://127.0.0.1:'+port));
}
