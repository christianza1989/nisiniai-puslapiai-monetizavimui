import application from 'vinext/server/app-router-entry';
import {textReviewAssetRequest} from '../lib/text-review-asset-origin';
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const url=new URL(request.url);
  if(/^\/(?:models|media|fonts|branding)\//.test(url.pathname)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Metodas neleidžiamas.',{status:405});
   const upstream=await fetch(textReviewAssetRequest(request)),headers=new Headers(upstream.headers);headers.delete('Set-Cookie');headers.set('X-Robots-Tag','noindex, nofollow');
   return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
  }
  if(url.pathname.startsWith('/valdymas/'))return new Response('Puslapis nerastas.',{status:404});
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&!/^\/api\/admin\/(?:login|logout|text-review)\/?$/.test(url.pathname))return new Response('Bandymo aplinkoje šis veiksmas nevykdomas.',{status:403});
  return application.fetch(request,env,ctx);
 }
} satisfies ExportedHandler<Env>;
