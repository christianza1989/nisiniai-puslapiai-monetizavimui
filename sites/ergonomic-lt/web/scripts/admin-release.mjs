import {readFileSync,writeFileSync} from 'node:fs';
// Same compiled application and immutable assets for both hosts. The launch
// gate runs before assets too, so old public design/mockup HTML is not exposed.
const draft=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(draft.name!=='ergonomic-preview')throw Error('Expected reviewed draft build');
// Next applies destination-page DENY headers after a middleware rewrite. Set
// this narrowly at the final edge response, after the authenticated renderer.
writeFileSync('dist/server/draft-entry.mjs',`import application from './index.js';
export default {
 async fetch(request,env,ctx){
  const response=await application.fetch(request,env,ctx);
  if(new URL(request.url).pathname!=='/valdymas/perziura/')return response;
  const headers=new Headers(response.headers);headers.set('X-Frame-Options','SAMEORIGIN');
  headers.set('Content-Security-Policy',"frame-ancestors 'self'");headers.set('Cache-Control','private, no-store');headers.set('X-Robots-Tag','noindex, nofollow');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
`);
draft.main='draft-entry.mjs';writeFileSync('dist/server/wrangler.json',JSON.stringify(draft,null,2)+'\n');
writeFileSync('dist/server/launch-entry.mjs',`import application from './index.js';
export default {
 async fetch(request, env, ctx) {
  const url=new URL(request.url),path=url.pathname;
  if(env.LAUNCH_SITE!=='true')return new Response('Svetainė neparuošta.',{status:503});
  if(url.hostname!==new URL(env.PUBLIC_ORIGIN).hostname)return new Response('Neteisingas host.',{status:421});
  if(/^\\/(?:admin|valdymas|perziura|pavyzdziai[^/]*|virsaus-[^/]*)(?:\\/|$)/.test(path)||path==='/konfiguratoriu-modeliai.csv'||path.startsWith('/api/admin/'))return new Response('Puslapis nerastas.',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  let response;
  if(/^\\/(?:_next|media|models|fonts|branding|wp-content|kategoriju-vaizdai)\\//.test(path)||path==='/icon.svg')response=await env.ASSETS.fetch(request);
  else response=await application.fetch(request,env,ctx);
  const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, nofollow');
  if(!/^\\/(?:_next|media|models|fonts|branding|wp-content|kategoriju-vaizdai)\\//.test(path))headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
`);
const launch={...draft,name:'ergonomic-launch',main:'launch-entry.mjs',configPath:undefined,userConfigPath:undefined,
 assets:{...draft.assets,run_worker_first:true},vars:{...draft.vars,LAUNCH_SITE:'true',PUBLIC_ORIGIN:'https://ergonomic-launch.pinet-azprekyba.workers.dev',CANONICAL_ORIGIN:'https://ergonomic-launch.pinet-azprekyba.workers.dev'}};
writeFileSync('dist/server/wrangler.launch.json',JSON.stringify(launch,null,2)+'\n');
console.log('Prepared launch config from the exact draft build. No DNS, approvals or deploy performed.');
