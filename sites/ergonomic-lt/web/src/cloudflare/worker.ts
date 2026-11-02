import application from 'vinext/server/app-router-entry';
import {modelTransport} from './model-transport';

export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  if(new URL(request.url).pathname.startsWith('/models/configurator/')&&['GET','HEAD'].includes(request.method)){
   return modelTransport(request,await env.ASSETS.fetch(request));
  }
  return application.fetch(request,env,ctx);
 }
} satisfies ExportedHandler<Env>;
