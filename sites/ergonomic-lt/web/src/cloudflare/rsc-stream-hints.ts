/**
 * vinext 1.1.0 compatibility fix: its Flight hint transform repeatedly scans
 * and copies an unfinished JSON row. A real Flesco request spent 47s there.
 * Forward non-hint bodies as they arrive; retain only row headers and HL hints.
 * Binary length-prefixed rows remain opaque. No model/Flight values change.
 * Remove this alias only after the upstream transform passes the same cases.
 */
const encoder=new TextEncoder(),decoder=new TextDecoder();
const hint=/^([0-9a-f]*:HL\[.*?),"stylesheet"(\]|,)/;
const lengthTags=new Set('TAOobUSsLlGgMmV');
const lineTags=new Set('IHENDJWRrXxCP#');
function normalize(bytes:Uint8Array){
 const text=decoder.decode(bytes),next=text.replace(hint,'$1,"style"     $2');
 if(next===text)return bytes;
 const result=encoder.encode(next);return result.byteLength===bytes.byteLength?result:bytes;
}
function jsonStart(byte:number){return byte===34||byte===45||byte>=48&&byte<=57||byte===91||byte===102||byte===110||byte===116||byte===123;}
export function normalizeReactFlightPreloadHints(stream:ReadableStream<Uint8Array>){
 let mode:'id'|'tag'|'hint-tag'|'length'|'line'|'hint'|'raw'|'pass'='id';
 let held:Uint8Array[]=[],heldLength=0,rawRemaining=0,length=0,digits=0,validLength=true;
 const hold=(bytes:Uint8Array)=>{if(bytes.length){held.push(bytes);heldLength+=bytes.length;}};
 function take(){const bytes=new Uint8Array(heldLength);let at=0;for(const part of held){bytes.set(part,at);at+=part.length;}held=[];heldLength=0;return bytes;}
 return stream.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({
  transform(chunk,controller){
   let offset=0;
   const emitHeld=()=>{if(heldLength)controller.enqueue(take());};
   while(offset<chunk.length){
    if(mode==='pass'){controller.enqueue(chunk.subarray(offset));return;}
    if(mode==='id'){
     const colon=chunk.indexOf(58,offset);
     if(colon<0){hold(chunk.subarray(offset));return;}
     hold(chunk.subarray(offset,colon+1));offset=colon+1;mode='tag';continue;
    }
    if(mode==='tag'){
     const byte=chunk[offset++],tag=String.fromCharCode(byte);hold(Uint8Array.of(byte));
     if(lengthTags.has(tag)){length=0;digits=0;validLength=true;mode='length';}
     else if(tag==='H')mode='hint-tag';
     else if(lineTags.has(tag)||jsonStart(byte)){emitHeld();mode='line';}
     else{emitHeld();mode='pass';}
     continue;
    }
    if(mode==='hint-tag'){
     if(chunk[offset]===76){hold(chunk.subarray(offset,++offset));mode='hint';}
     else{emitHeld();mode='line';}
     continue;
    }
    if(mode==='length'){
     const start=offset;
     while(offset<chunk.length&&chunk[offset]!==44){
      const byte=chunk[offset++],digit=byte>=48&&byte<=57?byte-48:byte>=97&&byte<=102?byte-87:-1;
      digits++;length=length*16+digit;validLength&&=digit>=0&&Number.isSafeInteger(length);
     }
     hold(chunk.subarray(start,offset));if(offset===chunk.length)return;
     hold(chunk.subarray(offset,++offset));emitHeld();
     if(!validLength||digits===0)mode='pass';
     else{rawRemaining=length;mode=rawRemaining?'raw':'id';}
     continue;
    }
    if(mode==='raw'){
     const end=offset+Math.min(rawRemaining,chunk.length-offset);
     controller.enqueue(chunk.subarray(offset,end));rawRemaining-=end-offset;offset=end;
     if(rawRemaining===0)mode='id';continue;
    }
    const newline=chunk.indexOf(10,offset),end=newline<0?chunk.length:newline+1;
    if(mode==='hint')hold(chunk.subarray(offset,end));else controller.enqueue(chunk.subarray(offset,end));
    offset=end;
    if(newline>=0){if(mode==='hint')controller.enqueue(normalize(take()));mode='id';}
   }
  },
  flush(controller){if(heldLength)controller.enqueue(normalize(take()));},
 }));
}
export function createRscRenderer<A extends unknown[]>(render:(...args:A)=>ReadableStream<Uint8Array>){
 return(...args:A)=>normalizeReactFlightPreloadHints(render(...args));
}
export function createRscPrerenderer<A extends unknown[]>(prerender:(...args:A)=>Promise<{prelude:ReadableStream<Uint8Array>}>){
 return async(...args:A)=>({prelude:normalizeReactFlightPreloadHints((await prerender(...args)).prelude)});
}
