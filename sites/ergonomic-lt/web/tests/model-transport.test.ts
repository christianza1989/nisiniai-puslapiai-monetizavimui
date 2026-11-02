import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsGzip,modelTransport} from '../src/cloudflare/model-transport';
const asset='https://example.test/models/configurator/components/KEM2013WW009-b3235e320cf6ddc029a5.glb';
test('gzip negotiation honours explicit exclusion and wildcard qualities',()=>{
 for(const header of ['gzip','br, gzip','GZIP;q=0.5','*;q=1'])assert(acceptsGzip(header));
 for(const header of [null,'br','gzip;q=0','gzip;q=0, *;q=1','gzip;q=garbage','gzip;q=2','*;q=0'])assert(!acceptsGzip(header));
});
test('native streaming gzip retains the decoded model body, MIME and source headers',async()=>{
 const original=new Uint8Array([103,108,84,70,0,1,2,3]);
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(original);controller.close();}});
 const response=modelTransport(new Request(asset,{headers:{'Accept-Encoding':'br, gzip'}}),new Response(body,{headers:{'Content-Type':'model/gltf-binary','Content-Length':'8',ETag:'"original"','X-Robots-Tag':'noindex, follow'}}));
 assert.equal(response.headers.get('Content-Encoding'),'gzip');assert.equal(response.headers.get('Content-Length'),null);
 assert.equal(response.headers.get('ETag'),'W/"original"');assert.equal(response.headers.get('Content-Type'),'model/gltf-binary');
 assert.equal(response.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
 assert.equal(response.headers.get('X-Robots-Tag'),'noindex, follow');assert.match(response.headers.get('Vary')!,/Accept-Encoding/);
 // Node exposes the input stream; workerd's native encoder is qualified over HTTP.
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),original);
});
test('range, conditional, missing, private and already-encoded responses retain semantics',()=>{
 const normalized=new Request(asset,{headers:{'Accept-Encoding':'br, gzip'}});Object.defineProperty(normalized,'cf',{value:{clientAcceptEncoding:'identity'}});
 assert.equal(modelTransport(normalized,new Response('original')).headers.get('Content-Encoding'),null);
 const partial=new Response('part',{status:206,headers:{'Content-Range':'bytes 0-3/8'}});
 assert.equal(modelTransport(new Request(asset,{headers:{'Accept-Encoding':'gzip',Range:'bytes=0-3'}}),partial),partial);
 const unchanged=new Response(null,{status:304,headers:{ETag:'"original"'}});
 const conditional=modelTransport(new Request(asset,{headers:{'Accept-Encoding':'gzip'}}),unchanged);
 assert.equal(conditional.status,304);assert.equal(conditional.body,null);
 for(const path of ['/api/quotes/','/models/configurator/runtime/record.json']){
  const response=new Response('private',{headers:{'Cache-Control':'private, no-store'}});
  assert.equal(modelTransport(new Request('https://example.test'+path),response),response);
 }
 const missing=new Response('missing',{status:404});assert.equal(modelTransport(new Request(asset),missing),missing);
 const raw=modelTransport(new Request(asset,{headers:{'Accept-Encoding':'identity'}}),new Response('raw'));
 assert.equal(raw.headers.get('Content-Encoding'),null);
 const encoded=modelTransport(new Request(asset,{headers:{'Accept-Encoding':'gzip'}}),new Response('encoded',{headers:{'Content-Encoding':'br','Content-Length':'7'}}));
 assert.equal(encoded.headers.get('Content-Encoding'),'br');assert.equal(encoded.headers.get('Content-Length'),'7');
 const legacy=modelTransport(new Request('https://example.test/models/configurator/16088654.glb'),new Response('old',{headers:{'Cache-Control':'public, max-age=0, must-revalidate'}}));
 assert.equal(legacy.headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
});
