import {customerAssetResponse} from '@/lib/customer-assets-server';
export const dynamic='force-dynamic';
async function asset(request:Request,{params}:{params:Promise<{token:string}>}){
 try{return await customerAssetResponse((await params).token,request);}catch{return new Response('Išteklius nepasiekiamas.',{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
}
export const GET=asset;
export const HEAD=asset;
