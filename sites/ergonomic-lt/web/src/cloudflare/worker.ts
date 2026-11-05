import application from 'vinext/server/app-router-entry';
import {modelTransport} from './model-transport';
import {customerHttpBoundary,privateCustomerResponse} from '../lib/customer-http-boundary';

export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const denied=customerHttpBoundary(request,env);if(denied)return denied;
  const finish=(response:Response)=>privateCustomerResponse(request,response,env);
  if(new URL(request.url).pathname.startsWith('/models/configurator/')&&['GET','HEAD'].includes(request.method)){
   return finish(await modelTransport(request,await env.ASSETS.fetch(request)));
  }
  if(['GET','HEAD'].includes(request.method)&&!new URL(request.url).pathname.startsWith('/media/p/')){const asset=await env.ASSETS.fetch(request);if(asset.status!==404)return finish(asset);}
  return finish(await application.fetch(request,env,ctx));
 }
} satisfies ExportedHandler<Env>;
