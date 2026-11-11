import application from 'vinext/server/app-router-entry';
import {referenceAsset} from './text-review-reference-assets';
import {customerHttpBoundary,privateCustomerResponse} from '../lib/customer-http-boundary';
import {modelTransport} from './model-transport';
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const incoming=request;
  const url=new URL(request.url);
  // This namespace reuses the same application and records, with a request-local view.
  const prefix='/su-pasleptais-produktais',all=url.pathname===prefix||url.pathname.startsWith(prefix+'/');
  const requestHeaders=new Headers(request.headers);requestHeaders.delete('x-ergonomic-all-products');
  if(all){
   if(!['GET','HEAD'].includes(request.method))return new Response('Metodas neleidžiamas.',{status:405});
   const path=url.pathname.slice(prefix.length)||'/produktai/';
   if(path!=='/'&&!path.startsWith('/produktai/'))return new Response('Puslapis nerastas.',{status:404});
   url.pathname=path==='/'?'/produktai/':path;requestHeaders.set('x-ergonomic-all-products','1');
  }
  request=new Request(url,request);request=new Request(request,{headers:requestHeaders});
  const denied=customerHttpBoundary(request,env);if(denied)return denied;
  const finish=(response:Response)=>privateCustomerResponse(request,modelTransport(incoming,response,true),env);
  if((/^\/(?:models|media|fonts|branding)\//.test(url.pathname)||url.pathname==='/icon.svg')&&!url.pathname.startsWith('/media/p/')){
   if(!['GET','HEAD'].includes(request.method))return new Response('Metodas neleidžiamas.',{status:405});
   const upstream=await referenceAsset(request),headers=new Headers(upstream.headers);headers.delete('Set-Cookie');headers.set('X-Robots-Tag','noindex, nofollow');
   return finish(new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers}));
  }
  if(url.pathname.startsWith('/valdymas/'))return new Response('Puslapis nerastas.',{status:404});
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&!/^\/api\/(?:admin\/(?:login|logout|text-review)|customer-configuration|quotes)\/?$/.test(url.pathname))return new Response('Bandymo aplinkoje šis veiksmas nevykdomas.',{status:403});
  if(['GET','HEAD'].includes(request.method)){
   const asset=await env.ASSETS.fetch(request);if(asset.status!==404)return finish(asset);
  }
  return finish(await application.fetch(request,env,ctx));
 }
} satisfies ExportedHandler<Env>;
