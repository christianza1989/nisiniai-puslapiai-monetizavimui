import {NextRequest,NextResponse} from 'next/server';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {dbOne,dbRun} from '@/lib/db';
import {deliverQuote} from '@/lib/quotes';
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await isAdmin())return NextResponse.json({error:'Reikia prisijungti.'},{status:401});if(!originAllowed(req))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403});
  const {id}=await params;if(!await dbOne('SELECT id FROM quotes WHERE id=?',id))return NextResponse.json({error:'Užklausa nerasta.'},{status:404});
  try{const body=await readJson(req,2000) as {action:string;status?:string};if(body.action==='retry'){const status=await deliverQuote(id);return NextResponse.json({delivery:status});}if(body.action==='status'&&['new','in_progress','done'].includes(body.status||'')){await dbRun('UPDATE quotes SET status=? WHERE id=?',body.status!,id);return NextResponse.json({ok:true});}return NextResponse.json({error:'Neleistinas veiksmas.'},{status:400});}catch{return NextResponse.json({error:'Pakeitimo išsaugoti nepavyko.'},{status:400});}
}
