import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {loadJson} from './public/load-json.mjs';

test('Public startup reads reject HTTP errors, invalid JSON and a stalled response body, while a later retry reads current data',async()=>{
 const server=http.createServer((request,response)=>{
  response.writeHead(request.url==='/error'?503:200,{'content-type':'application/json'});
  if(request.url==='/stalled'){response.write('{"pending":');return;}
  response.end(request.url==='/invalid'?'{':request.url==='/null'?'null':request.url==='/array'?'[]':'{"current":true}');
 }).listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.deepEqual(await loadJson(origin+'/current'),{current:true});
  for(const route of ['/error','/invalid','/null','/array'])await assert.rejects(loadJson(origin+route),e=>e.code==='NETWORK_ERROR');
  await assert.rejects(loadJson(origin+'/stalled',{timeoutMs:30}),e=>e.code==='NETWORK_ERROR'&&e.message.includes('užtruko'));
  assert.deepEqual(await loadJson(origin+'/current'),{current:true});
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
