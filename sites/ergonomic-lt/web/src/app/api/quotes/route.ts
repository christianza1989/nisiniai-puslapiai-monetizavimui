
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {NextRequest,NextResponse,after} from 'next/server';
import {originAllowed,rateKey,readJson} from '@/lib/auth';
import {rateAllowed} from '@/lib/db';
import {storeQuote,deliverQuote} from '@/lib/quotes';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  if(!originAllowed(req))return NextResponse.json({error:copyText("ui.6e3dda43283e5f75b67f","Neleistina užklausos kilmė.")},{status:403});
  if(!await rateAllowed(rateKey(req,'quote'),30,15*60_000))return NextResponse.json({error:copyText("ui.a347af082196e24a60bc","Per daug užklausų. Bandykite vėliau.")},{status:429});
  try{const saved=await storeQuote(await readJson(req));after(()=>deliverQuote(saved.id).then(()=>{}));return NextResponse.json({id:saved.id},{status:saved.duplicate?200:201});}
  catch(e){return NextResponse.json({error:e instanceof Error&&e.name!=='ZodError'?e.message:copyText("ui.963080f705db05ff672b","Patikrinkite vardą, el. paštą, kiekį ir sutikimą.")},{status:400});}
}
