import {NextRequest,NextResponse} from 'next/server';
import {checkPassword,sessionToken,SESSION_COOKIE,originAllowed,rateKey,readJson} from '@/lib/auth';
import {rateAllowed} from '@/lib/db';
export async function POST(req:NextRequest){
  if(!originAllowed(req))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403});
  if(!await rateAllowed(rateKey(req,'login'),8,15*60_000))return NextResponse.json({error:'Per daug bandymų. Bandykite po 15 minučių.'},{status:429});
  try{const p=await readJson(req,2000) as {password?:unknown};if(typeof p.password!=='string'||p.password.length>200||!checkPassword(p.password))return NextResponse.json({error:'Neteisingas slaptažodis.'},{status:401});
    const res=NextResponse.json({ok:true});res.cookies.set(SESSION_COOKIE,sessionToken(),{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',path:'/',maxAge:8*3600});res.headers.set('Cache-Control','no-store');return res;
  }catch{return NextResponse.json({error:'Neteisingas užklausos formatas.'},{status:400});}
}
