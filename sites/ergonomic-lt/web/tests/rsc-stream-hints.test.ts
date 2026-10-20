import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeReactFlightPreloadHints,createRscRenderer,createRscPrerenderer} from '../src/cloudflare/rsc-stream-hints';
const encoder=new TextEncoder();
const upstream=await import(new URL('server/rsc-stream-hints.js',import.meta.resolve('vinext')).href);
const bytes=(s:string)=>encoder.encode(s);
function stream(parts:Uint8Array[]){return new ReadableStream<Uint8Array>({start(c){for(const p of parts)c.enqueue(p);c.close();}});}
async function drain(s:ReadableStream<Uint8Array>){return Buffer.from(await new Response(s).arrayBuffer());}
const split=(b:Uint8Array,n:number)=>[b.subarray(0,n),b.subarray(n)];
const binary=Uint8Array.from([0,255,10,...bytes('a:HL["binary","stylesheet"]\n')]);
const fixture=Buffer.concat([
 bytes('1:HL["/a.css","stylesheet"]\n2:HL["/b.css","stylesheet",{"crossOrigin":""}]\n3:I["id",[],"name"]\n'),
 bytes('4:o'+binary.length.toString(16)+','),binary,
 bytes('5:{"quote":"α中文\\n<stylesheet>","array":[1,null,true]}\n6:HL["/font.woff","font"]\n'),
]);
test('Vite alias replaces the entire resolved Windows or POSIX dependency path',()=>{
 const config=fs.readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const literal=config.match(/find:(\/\^\.\*.*rsc-stream-hints.*?\$\/),replacement:file\('\.\/src\/cloudflare\/rsc-stream-hints.ts'\)/)?.[1];
 assert(literal,'Exact anchored adapter alias must be present');
 const matcher=new RegExp(literal.slice(1,-1));
 for(const id of ['D:/app/node_modules/vinext/dist/server/rsc-stream-hints.js','D:\\app\\node_modules\\vinext\\dist\\server\\rsc-stream-hints.js','/app/node_modules/vinext/dist/server/rsc-stream-hints.js'])assert.equal(id.replace(matcher,'ADAPTER'),'ADAPTER');
 assert(!matcher.test('/app/node_modules/vinext/dist/server/html.js'));
});
test('all byte split positions retain exact upstream hint, JSON, Unicode and binary semantics',async()=>{
 const expected=await drain(upstream.normalizeReactFlightPreloadHints(stream([fixture])));
 for(let i=0;i<=fixture.length;i++)assert.deepEqual(await drain(normalizeReactFlightPreloadHints(stream(split(fixture,i)))),expected,'split '+i);
 assert.deepEqual(await drain(normalizeReactFlightPreloadHints(stream([...fixture].map(b=>Uint8Array.of(b))))),expected);
 assert(expected.includes(Buffer.from(binary)),'Binary bodies are opaque even when they contain a hint row');
});
test('partial rows and invalid headers match upstream fail-open byte preservation',async()=>{
 for(const text of ['','a','a:','a:H','a:HL["/x","stylesheet"]','a:T','a:T0,1:HL["/x","stylesheet"]\n','a:Tzz,1:HL["/x","stylesheet"]\n','a:Qbad\n1:HL["/x","stylesheet"]\n','a:T3,xy','a:{"tail":true}']){
  const b=bytes(text),expected=await drain(upstream.normalizeReactFlightPreloadHints(stream([b])));
  for(let i=0;i<=b.length;i++)assert.deepEqual(await drain(normalizeReactFlightPreloadHints(stream(split(b,i)))),expected,text+' split '+i);
 }
});
test('large unfinished JSON row is forwarded before its tail arrives',async()=>{
 let source!:ReadableStreamDefaultController<Uint8Array>;
 const input=new ReadableStream<Uint8Array>({start(c){source=c;}});
 const reader=normalizeReactFlightPreloadHints(input).getReader();
 source.enqueue(bytes('a:{"payload":"'+ 'x'.repeat(65536)));
 // A full row is not required to make progress; old code buffered/re-scanned it.
 const first=await reader.read();assert(!first.done);assert(first.value.length>0);
 const chunks=[first.value];
 const consume=(async()=>{for(;;){const r=await reader.read();if(r.done)break;chunks.push(r.value);}})();
 for(let i=0;i<64;i++)source.enqueue(bytes('y'.repeat(65536)));
 source.enqueue(bytes('"}\n'));source.close();await consume;
 const result=Buffer.concat(chunks);assert.equal(result.length,bytes('a:{"payload":"').length+65536+64*65536+3);
 assert.equal(JSON.parse(result.toString().slice(2)).payload.length,65*65536);
});
test('renderer and prerenderer apply the same byte-preserving correction',async()=>{
 const expected=await drain(upstream.normalizeReactFlightPreloadHints(stream([fixture])));
 assert.deepEqual(await drain(createRscRenderer((model:string)=>{assert.equal(model,'model');return stream([fixture]);})('model')),expected);
 assert.deepEqual(await drain((await createRscPrerenderer(async()=>({prelude:stream([fixture])}))()).prelude),expected);
});
