import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {catalogAsync} from '@/lib/catalog';
import {allProductModels} from '@/lib/product-models';
import {buildReviewScope,localTextKey,mutateText,ReviewConflict,reviewProductForCode} from '@/lib/text-review-server';
import {dbAll} from '@/lib/text-review-db';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers});
async function product(id:string,sample?:string){const p=(await catalogAsync()).products.find(p=>p.id===id);if(!p)return;return sample?allProductModels([p]).find(m=>m.modelConfigurationId===sample):p;}
export async function GET(req:NextRequest){
 if(!await isAdmin())return json({error:'Reikia prisijungti.'},401);
 try{
  const code=req.nextUrl.searchParams.get('code'),p=code?await reviewProductForCode(code):await product(req.nextUrl.searchParams.get('product')||'',req.nextUrl.searchParams.get('sample')||undefined);if(!p)return json({error:'Produktas nerastas.'},404);
  const scope=await buildReviewScope(p),id=req.nextUrl.searchParams.get('history');
  if(id){const entry=scope.entries.find(e=>e.id===id);if(!entry)return json({error:'Tekstas nerastas.'},404);const keys=[entry.id,...entry.previousIds||[]].flatMap(id=>[id,localTextKey(scope.model,id)]);return json({history:await dbAll('SELECT key,action,text,revision,actor,at FROM text_review_history WHERE key IN ('+keys.map(()=>'?').join(',')+') ORDER BY id DESC LIMIT 20',...keys)});}
  return json(scope);
 }catch{return json({error:'Nepavyko įkelti tekstų saugyklos. Bandykite atnaujinti puslapį.'},503);}
}
const change=z.object({product:z.string().min(1).max(200),sample:z.string().max(100).optional(),id:z.string().min(1).max(400),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),revision:z.number().int().min(0),text:z.string().max(12000).optional(),local:z.boolean().default(false),action:z.enum(['draft','approve','keep','publish','unpublish'])}).strict();
export async function POST(req:NextRequest){
 if(!await isAdmin())return json({error:'Reikia prisijungti.'},401);
 if(!originAllowed(req))return json({error:'Neleistina užklausos kilmė.'},403);
 try{
  const args=change.parse(await readJson(req)),p=await product(args.product,args.sample);if(!p)return json({error:'Produktas nerastas.'},404);
  const scope=await buildReviewScope(p),entry=scope.entries.find(e=>e.id===args.id);if(!entry)return json({error:'Tekstas nepriklauso šiam produktui.'},404);
  // Keeping source presentation is model-specific. It must never copy one
  // model's raw supplier code into another model's shared label.
  const local=entry.shared&&(args.local||args.action==='keep');
  const key=local?localTextKey(scope.model,entry.id):entry.id;
  await mutateText(entry,{key,sourceHash:args.sourceHash,expectedRevision:args.revision,text:args.text,action:args.action});
  return json(await buildReviewScope(p));
 }catch(e){return json({error:e instanceof Error?e.message:'Nepavyko išsaugoti teksto.'},e instanceof ReviewConflict?409:400);}
}
