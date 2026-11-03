import {createHmac,timingSafeEqual} from 'node:crypto';
import environment from '../../content/product-environment.json';
type BoundaryEnv={PUBLIC_CUSTOMER_BOUNDARY?:string;SESSION_SECRET?:string;PRIVATE_SOURCE_READ_TOKEN?:string;PRIVATE_CLIENT_CHUNKS?:string;PUBLIC_CLIENT_CHUNKS?:string};
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function sourceRequestAuthorized(request:Request,env:BoundaryEnv){
 const authorization=request.headers.get('authorization');
 if(env.PRIVATE_SOURCE_READ_TOKEN&&authorization&&equal(authorization,'Bearer '+env.PRIVATE_SOURCE_READ_TOKEN))return true;
 const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('ergonomic_admin='))?.slice('ergonomic_admin='.length);
 if(!token||!env.SESSION_SECRET)return false;
 const match=/^(\d+)\.([a-f0-9]{64})$/.exec(token);if(!match||Number(match[1])<Date.now()||Number(match[1])>Date.now()+9*3600_000)return false;
 return equal(match[2],createHmac('sha256',env.SESSION_SECRET).update(match[1]).digest('hex'));
}
/** Must run before both ASSETS and application routing (run_worker_first). */
export function customerHttpBoundary(request:Request,env:BoundaryEnv):Response|undefined{
 if(env.PUBLIC_CUSTOMER_BOUNDARY!=='true'||sourceRequestAuthorized(request,env))return;
 let path:string;try{path=decodeURIComponent(new URL(request.url).pathname);if(/%2e|%2f|%5c/i.test(path))throw Error('Ambiguous path');path=new URL(path.replace(/\\/g,'/').replace(/\/+/g,'/'),'https://boundary.invalid').pathname;}catch{return new Response('Puslapis nerastas.',{status:404});}
 if(path===environment.asset&&['GET','HEAD'].includes(request.method))return;
 const rawModels=/^\/models(?:\/|$)/.test(path),rawConfigurator=/^\/media\/(?:configurator|home-final\/demo(?:\.|\/))/.test(path);
 const privatePages=/^\/(?:3d(?:-|\/)|local-chair-qa|kategoriju-vaizdai|\.vite|\.private|api\/text-review)(?:.*)/.test(path)||path.endsWith('.map');
 const otherRawMedia=path.startsWith('/media/')&&!path.startsWith('/media/p/')&&(/\.(?:glb|gltf|bin|f16|json|pdf)$/i.test(path)||/\.(?:js|mjs)$/i.test(path)&&path!=='/media/home-final/carousels.js');
 let privateChunk=false;
 if(env.PRIVATE_CLIENT_CHUNKS){try{privateChunk=(JSON.parse(env.PRIVATE_CLIENT_CHUNKS) as string[]).includes(path);}catch{return new Response('Paslauga laikinai nepasiekiama.',{status:503});}}
 if(/^\/(?:_next\/static|assets)\/.*\.m?js$/.test(path)){try{privateChunk||=!(JSON.parse(env.PUBLIC_CLIENT_CHUNKS||'[]') as string[]).includes(path);}catch{privateChunk=true;}}
 if(rawModels||rawConfigurator||otherRawMedia||privatePages||privateChunk)return new Response('Puslapis nerastas.',{status:404,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
