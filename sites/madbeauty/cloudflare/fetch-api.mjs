import {createApiHandler} from '../backend/http-core.mjs';

// The same origin, CSRF, permission and booking dispatcher serves Node and Workers.
// Request bytes remain streamed and are bounded by the shared handler.
export async function fetchApi(request,store,{origin,media,ip='unknown',dispatch}={}){
 const handler=createApiHandler(store,{origin,secure:new URL(origin).protocol==='https:',media,dispatch});
 const url=new URL(request.url);
 const req={url:url.pathname+url.search,method:request.method,headers:{...Object.fromEntries(request.headers),host:url.host},socket:{remoteAddress:ip},async *[Symbol.asyncIterator](){
  if(!request.body)return;
  const reader=request.body.getReader();try{while(true){const {value,done}=await reader.read();if(done)break;yield Buffer.from(value);}}finally{reader.releaseLock();}
 }};
 let response;
 const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){response=new Response(body,{status:this.status,headers:this.headers});}};
 if(!await handler.handle(req,res))return new Response('Not found',{status:404});
 return response;
}
