import application from 'vinext/server/app-router-entry';
import {modelTransport} from './model-transport';
import {customerHttpBoundary} from '../lib/customer-http-boundary';

export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const denied=customerHttpBoundary(request,env);if(denied)return denied;
  if(new URL(request.url).pathname.startsWith('/models/configurator/')&&['GET','HEAD'].includes(request.method)){
   return modelTransport(request,await env.ASSETS.fetch(request));
  }
  if(['GET','HEAD'].includes(request.method)&&!new URL(request.url).pathname.startsWith('/media/p/')){const asset=await env.ASSETS.fetch(request);if(asset.status!==404)return asset;}
  return application.fetch(request,env,ctx);
 }
} satisfies ExportedHandler<Env>;
