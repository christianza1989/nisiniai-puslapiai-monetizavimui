type Json=Record<string,any>;
import {chairFinishRoles} from './chair-material-groups';
import {customerImageBytes} from './customer-image-bytes';
const gltfEnums=new Set(['SCALAR','VEC2','VEC3','VEC4','MAT2','MAT3','MAT4','OPAQUE','MASK','BLEND','LINEAR','STEP','CUBICSPLINE','translation','rotation','scale','weights','perspective','orthographic','directional','point','spot','ATTRIBUTES','TRIANGLES','INDICES','NONE','OCTAHEDRAL','QUATERNION','EXPONENTIAL']);
export function customerGltfDocument(doc:Json,alias:(name:string)=>string,assetUrl:(uri:string)=>string){
 function clean(value:any):any{
  if(Array.isArray(value))return value.map(clean);
  if(typeof value==='string')return gltfEnums.has(value)||/^(?:KHR_|EXT_|MSFT_|NV_|CESIUM_|AGI_)[A-Za-z0-9_]+$/.test(value)||/^image\/(?:jpeg|png|webp|ktx2)$/.test(value)||/^\d+\.\d+$/.test(value)?value:alias(value);
  if(!value||typeof value!=='object')return value;
  const result:Json={};for(const [key,item]of Object.entries(value)){
   if(key==='extras'){
    if(item&&typeof item==='object'&&typeof (item as Json).finishField==='string'){
     const field=(item as Json).finishField as string;
     result.extras={finishField:alias(field),...(chairFinishRoles[field]?{ergonomicChairRole:chairFinishRoles[field]}:{}),...(/^(?:CUPH|CSEBASIDEPROFILUPH|CHEADRESTUPH|CHEADSIDEPROFUPH|CARMRESTUPH)/.test(field)?{ergonomicUpholstery:true}:{})};
    }continue;
   }
   if(key==='name'){if(typeof item==='string')result.name=alias(item);continue;}
   if(key==='uri'&&typeof item==='string'){const image=/^(data:image\/(?:jpeg|png|webp);base64,)(.*)$/s.exec(item);result.uri=image?image[1]+Buffer.from(customerImageBytes(Buffer.from(image[2],'base64'))).toString('base64'):item.startsWith('data:')?item:assetUrl(item);continue;}
   if(key==='copyright'||key==='generator')continue;
   if(/^(?:supplier.*|manufacturer.*|article.*|catalog(?:ue)?.*|product(?:Code|Id)|source(?:Code|Id|Url)|code|label|description|group)$/i.test(key))continue;
   if(typeof item==='string'&&/\bK[A-Z]{2,8}\d[A-Z0-9]{5,}\b/.test(item))continue;
   result[/^C[A-Z]{4,}$/.test(key)||key.startsWith('_')?'_'+alias(key):key]=clean(item);
  }return result;
 }
 return clean(doc) as Json;
}
/** Geometry/compressed geometry stays byte-identical. Image metadata can be
 * removed in place without re-encoding pixels or moving geometry buffers. */
export function customerGlb(input:Uint8Array,alias:(name:string)=>string,assetUrl:(uri:string)=>string){
 const src=Buffer.from(input.buffer,input.byteOffset,input.byteLength);
 if(src.length<20||src.toString('ascii',0,4)!=='glTF'||src.readUInt32LE(4)!==2||src.readUInt32LE(8)!==src.length)throw Error('Invalid source GLB');
 const chunks:{type:number;data:Buffer}[]=[];let offset=12;
 while(offset<src.length){if(offset+8>src.length)throw Error('Invalid GLB chunk');const length=src.readUInt32LE(offset),type=src.readUInt32LE(offset+4);offset+=8;if(length%4||offset+length>src.length)throw Error('Invalid GLB chunk');chunks.push({type,data:src.subarray(offset,offset+length)});offset+=length;}
 if(chunks[0]?.type!==0x4e4f534a||chunks.filter(c=>c.type===0x4e4f534a).length!==1)throw Error('Invalid GLB JSON');
 const doc=JSON.parse(chunks[0].data.toString('utf8').trim()) as Json;
 const images=new Set<number>((doc.images||[]).flatMap((image:Json)=>Number.isSafeInteger(image.bufferView)?[image.bufferView]:[]));
 for(const index of images){const view=doc.bufferViews?.[index];if(!view||view.buffer!==0)throw Error('Unsupported embedded image buffer');const bin=chunks.find(c=>c.type===0x004e4942);if(!bin)throw Error('Missing image buffer');const offset=view.byteOffset||0,end=offset+view.byteLength;
  if(end>bin.data.length)throw Error('Invalid embedded image bounds');const original=bin.data.subarray(offset,end),cleaned=customerImageBytes(original);if(Buffer.from(cleaned).equals(original))continue;
  if(cleaned.byteLength>original.byteLength||(doc.bufferViews||[]).some((other:Json,i:number)=>i!==index&&other.buffer===0&&(other.byteOffset||0)<end&&(other.byteOffset||0)+other.byteLength>offset))throw Error('Image metadata overlaps another buffer view');
  bin.data=Buffer.from(bin.data);bin.data.fill(0,offset,end);bin.data.set(cleaned,offset);view.byteLength=cleaned.byteLength;
 }
 const json=Buffer.from(JSON.stringify(customerGltfDocument(doc,alias,assetUrl))),padding=Buffer.alloc((4-json.length%4)%4,32);chunks[0]={type:chunks[0].type,data:Buffer.concat([json,padding])};
 const length=12+chunks.reduce((n,c)=>n+8+c.data.length,0),out=Buffer.alloc(length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(length,8);offset=12;
 for(const c of chunks){out.writeUInt32LE(c.data.length,offset);out.writeUInt32LE(c.type,offset+4);c.data.copy(out,offset+8);offset+=8+c.data.length;}return out;
}
