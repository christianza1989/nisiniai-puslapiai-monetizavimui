// The native Workers response encoder streams compression without buffering models in JS
// or maintaining another copy of the 3D library. The decoded original is unchanged.
function acceptedEncodings(header:string|null){
 const encodings=new Map((header||'').split(',').map(part=>{
  const [name,...parameters]=part.trim().toLowerCase().split(';');
  const q=parameters.find(value=>value.trim().startsWith('q='));
  const quality=q?Number(q.trim().slice(2)):1;
  return [name,Number.isFinite(quality)&&quality>0&&quality<=1] as const;
 }));
 return (encoding:string)=>encodings.get(encoding)??encodings.get('*')??false;
}

export function acceptsGzip(header:string|null):boolean {
 return acceptedEncodings(header)('gzip');
}

export function modelTransport(request:Request,response:Response,textReview=false):Response {
 const pathname=new URL(request.url).pathname;
 const model=/^\/models\/configurator\/.+\.glb$/.test(pathname),environment=/^\/models\/configurator\/environments\/product-side-[a-f0-9]{20}\.bin$/.test(pathname);
 const signedModel=textReview&&pathname.startsWith('/media/p/')&&response.headers.get('Content-Type')==='model/gltf-binary';
 if((!model&&!environment&&!signedModel)||!['GET','HEAD'].includes(request.method)||![200,304].includes(response.status))return response;
 const headers=new Headers(response.headers);
 // Only names containing a captured content digest receive immutable caching.
 if(environment||/^\/models\/configurator\/(?:components|structure)\/K[A-Z0-9]+-[a-f0-9]{20}\.glb$/.test(pathname))headers.set('Cache-Control','public, max-age=31536000, immutable');
 const vary=new Set((headers.get('Vary')||'').split(',').map(s=>s.trim()).filter(Boolean));
 vary.add('Accept-Encoding');headers.set('Vary',[...vary].join(', '));
 // Byte ranges and pre-encoded responses keep the asset service's semantics.
 // Cloudflare normalizes the incoming header to br,gzip. Honour the visitor's
 // actual preferences, including identity and explicit gzip;q=0.
 const clientEncoding=(request as Request&{cf?:{clientAcceptEncoding?:unknown}}).cf?.clientAcceptEncoding;
 const accepts=acceptedEncodings(typeof clientEncoding==='string'?clientEncoding:request.headers.get('Accept-Encoding'));
 const encoding=textReview&&accepts('br')?'br':accepts('gzip')?'gzip':null;
 if(encoding&&!request.headers.has('Range')&&!headers.has('Content-Range')&&!headers.has('Content-Encoding')){
  headers.set('Content-Encoding',encoding);headers.delete('Content-Length');
  const etag=headers.get('ETag');if(etag&&!etag.startsWith('W/'))headers.set('ETag','W/'+etag);
 }
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
