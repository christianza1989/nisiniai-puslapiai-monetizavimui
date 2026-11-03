import {NextRequest,NextResponse} from 'next/server';
import {buildReviewScope,reviewProductForCode} from '@/lib/text-review-server';
export async function GET(req:NextRequest){
 const headers={'Cache-Control':'no-store'};
 try{const p=await reviewProductForCode(req.nextUrl.searchParams.get('code')||'');if(!p)return NextResponse.json({error:'Modelis nerastas.'},{status:404,headers});
  return NextResponse.json((await buildReviewScope(p)).publicScope,{headers});
 }catch{return NextResponse.json({error:'Nepavyko įkelti paskelbtų tekstų.'},{status:503,headers});}
}
