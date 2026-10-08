import {isCityId} from '../prototype/cities.mjs';
import {MadbeautyPlatform} from './platform-object.mjs';
import {MadbeautyOrganizationStaging} from './organization-object.mjs';
import {contentProjection,contact,escape} from './content.mjs';
import template from '../prototype/public/app.html';
import {trustPages} from '../prototype/public/product-trust.mjs';
import inventory from '../SCREEN_INVENTORY.json';
import assets from './output/asset-paths.json';
import release from './output/content-release-receipt.json';
import {publicModuleEntries,moduleDiscovery,moduleSchema} from './public-modules.mjs';
import {routeTitle} from './route-titles.mjs';
import {activeNode,createContentTargetRegistry} from '../prototype/content-targets.mjs';
import {catalogueRoute,renderCataloguePage} from '../prototype/catalogue-page.mjs';
import {sharingHtml} from '../prototype/public/sharing.mjs';
export {MadbeautyPlatform,MadbeautyOrganizationStaging};
const assetPaths=new Set(assets);
const headers={"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Content-Security-Policy":"default-src 'self'; connect-src 'self'; img-src 'self' blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src https://www.openstreetmap.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
headers['X-Madbeauty-Content-SHA256']=release.packageSha256;
const json=(data,status=200)=>Response.json(data,{status,headers:{...headers,'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
function matchRoute(path){
 for(const screen of inventory.screens.filter(s=>s.route)){
  const names=[],pattern=screen.route.replace(/:([a-z]+)/g,(_,name)=>{names.push(name);return '([a-z0-9_-]+)';}),match=path.match(new RegExp('^'+pattern+'$'));
  if(match)return {...screen,params:Object.fromEntries(names.map((name,i)=>[name,match[i+1]]))};
 }return null;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=new URL(env.APP_ORIGIN),preview=env.RELEASE_MODE!=='production';
  if(!preview&&url.hostname==='www.madbeauty.lt')return Response.redirect('https://madbeauty.lt'+url.pathname+url.search,308);
  if(url.host!==origin.host)return new Response('Not found',{status:404,headers});
  if(!preview&&url.protocol==='http:')return Response.redirect('https://madbeauty.lt'+url.pathname+url.search,308);
  const object=env.PLATFORM.get(env.PLATFORM.idFromName('madbeauty-pilot-v1'));
  if(url.pathname.startsWith('/api/madbeauty/')){
   const forwarded=new Headers(request.headers);forwarded.set('x-madbeauty-client-ip',request.headers.get('cf-connecting-ip')||'local');
   const response=await object.fetch(new Request(request,{headers:forwarded}));
   const result=new Response(response.body,response);for(const [k,v]of Object.entries(headers))result.headers.set(k,v);return result;
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
  const path=url.pathname,needsCatalogue=(!path.includes('.')&&!/^\/(meistrui|paskyra|registracija|operatorius)(\/|$)/.test(path))||path==='/content.json'||path==='/content-targets.json'||path==='/paslaugos'||path.startsWith('/paslaugos/')||['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(path)||path.startsWith('/gidai/')||path.startsWith('/autoriai/');
  const offers=needsCatalogue?await object.catalog({}):[],registry=createContentTargetRegistry({offers,deployed:!preview}),content=contentProjection(Date.now(),registry);
  let assetPath;try{assetPath=decodeURIComponent(path);}catch{return new Response('Not found',{status:404,headers});}
  if(path==='/boot.json')return json({siteId:'madbeauty',now:new Date().toISOString(),deployment:'production',enabled:false,privatePrototype:false,apiAvailable:true,contact});
  if(path==='/screen-registry.json')return json(inventory.screens.map(({id,route,label,surface})=>({id,route,label,surface})));
  if(path==='/content.json')return json({siteId:'madbeauty',pages:content.dto,operatorName:contact.operatorName});
  if(path==='/content-targets.json')return json(registry);
  if(path==='/robots.txt')return new Response(preview?'User-agent: *\nDisallow: /\n':content.seo.nicheRobotsText(content.pkg,false,true)+'Disallow: /meistrui/\nDisallow: /paskyra/\nDisallow: /operatorius\nDisallow: /registracija\n',{headers:{...headers,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(path)){
   if(preview)return new Response('Preview discovery disabled',{status:404,headers});
   const text=moduleDiscovery(content,path,publicModuleEntries(content.pages,trustPages,await object.publicProfiles()));
   return new Response(text,{headers:{...headers,'Content-Type':path.endsWith('.xml')?'application/xml; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  }
  if(assetPath.startsWith('/content-assets/')){
   if(!content.pages.some(p=>p.media.some(m=>m.src===assetPath)))return new Response('Not found',{status:404,headers});
  }
  if(assetPaths.has(assetPath)||path==='/favicon.svg'||path==='/favicon.ico'){
   const target=path.startsWith('/favicon.')?new Request(new URL('/wordmark.svg',url),request):request;
   const response=await env.ASSETS.fetch(target),result=new Response(response.body,response);for(const [k,v]of Object.entries(headers))result.headers.set(k,v);if(preview)result.headers.set('X-Robots-Tag','noindex');return result;
  }
  const canonical=path==='/'?'/':path.replace(/\/+$/,'');if(path!==canonical)return Response.redirect(url.origin+canonical+url.search,308);
  if(/^\/paslaugos\/[^/]+$/.test(path)&&isCityId(url.searchParams.get('miestas'))&&activeNode(path.split('/')[2]))return Response.redirect(url.origin+path+'/'+url.searchParams.get('miestas'),303);
  const catalogue=path==='/paslaugos'||path.startsWith('/paslaugos/'),cataloguePage=catalogue?catalogueRoute(path,offers):null;
  let route=matchRoute(path),page=content.pages.find(p=>(p.slug?'/'+p.slug:'/')===path),profile=null;
  if(route?.params.service&&!activeNode(route.params.service))route=null;
  if(route?.params.city&&!isCityId(route.params.city))route=null;
  if(path.startsWith('/gidai/')&&!page)route=null;
  if(route&&['public-practitioner','public-venue'].includes(route.id)){
   if(!route.params.slug.startsWith('provider_'))route=null;
   else {profile=await object.profile(route.params.slug);if(!profile||profile.kind!==(route.id==='public-practitioner'?'solo':'salon'))route=null;}
  }
  if(route?.id==='content-author'&&route.params.slug!=='mb-pinet')route=null;
  if(catalogue&&!cataloguePage){route=null;page=null;}
  const trust=trustPages[path],found=!!route||!!page||!!trust||!!cataloguePage,publicPage=!!page||!!profile||!!trust,indexable=found&&publicPage&&!catalogue&&!preview&&!url.search;
  let html=template.replace(/<meta name="robots"[^>]+>/,`<meta name="robots" content="${indexable?'index,follow':'noindex,follow'}">`);
  const title=page?.title||cataloguePage?.title||profile?.name||trust?.title||(route?routeTitle(route):'Puslapis nerastas'),description=page?.description||profile?.bio||'Grožio paslaugos ir rezervacijos. MB Pinet · info@pinet.lt.';
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${escape(title)} · Madbeauty</title>`).replace(/<meta name="description"[^>]+>/,`<meta name="description" content="${escape(description)}">`);
  html=html.replace('</head>',`${found?`<link rel="canonical" href="https://madbeauty.lt${escape(path)}">`:''}${page&&!catalogue?sharingHtml(content.metadata?.(page)):''}${publicPage&&!catalogue?'<script type="application/ld+json">'+JSON.stringify(page?content.schema(page):moduleSchema(path,title,description,profile)).replace(/</g,'\\u003c')+'</script>':''}</head>`);
  let body=cataloguePage?renderCataloguePage(cataloguePage):page?content.html(page):trust?`<article class="page container"><h1>${escape(trust.title)}</h1>${trust.body}</article>`:profile?`<article class="page container"><h1>${escape(profile.name)}</h1><p>${escape(profile.bio)}</p><p>${escape(profile.city)}</p><h2>Paslaugos</h2>${profile.services.map(s=>`<section><h3>${escape(s.label)}</h3><p>${escape(s.durationMin)} min. · ${(s.priceMinor/100).toFixed(2)} €</p></section>`).join('')}</article>`:found?'<div class="page container"><h1>'+escape(title)+'</h1><p>Įkeliama…</p></div>':'<div class="page container"><h1>Puslapis nerastas</h1><a href="/">Grįžti į pradžią</a></div>';
  html=html.replace('<p class="container">Įkeliama…</p>',body);
  return new Response(request.method==='HEAD'?null:html,{status:found?200:404,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...(!indexable?{'X-Robots-Tag':'noindex'}:{})}});
 },
};
