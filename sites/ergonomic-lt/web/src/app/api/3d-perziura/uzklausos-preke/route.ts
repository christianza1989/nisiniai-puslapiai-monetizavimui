import {NextRequest,NextResponse} from 'next/server';
import {originAllowed,rateKey,readJson} from '@/lib/auth';
import {rateAllowed} from '@/lib/db';
import {visibleProductsAsync} from '@/lib/catalog';
import {pc2QuoteEnabled,pc2SelectionSchema} from '@/lib/pc2-quote-selection';
import {resolvePc2Quote} from '@/lib/pc2-quote';

export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!pc2QuoteEnabled())return new NextResponse(null,{status:404});
 if(!originAllowed(req))return new NextResponse(null,{status:403});
 if(!await rateAllowed(rateKey(req,'pc2-quote-selection'),60,15*60_000))return new NextResponse(null,{status:429});
 try{
  const selection=pc2SelectionSchema.parse(await readJson(req,16_000));
  const {item}=await resolvePc2Quote(selection,await visibleProductsAsync());
  return NextResponse.json(item,{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'Nepavyko patikrinti 3D komplektacijos.'},{status:400});
 }
}
