import {NextRequest,NextResponse} from 'next/server';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {normalizeSupplierAsync as normalizeSupplier} from '@/lib/catalog';
import {dbAtomic} from '@/lib/db';
export async function POST(req:NextRequest){
  if(!await isAdmin())return NextResponse.json({error:'Reikia prisijungti.'},{status:401});
  if(!originAllowed(req))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403});
  try{const data=await normalizeSupplier(await readJson(req,25_000_000)),now=new Date().toISOString();await dbAtomic([
    {sql:'INSERT OR REPLACE INTO supplier_import VALUES(1,?,?)',params:[JSON.stringify(data),now]},
    {sql:'INSERT INTO audit_events(event,object_id,created_at) VALUES(?,?,?)',params:['supplier_import',String(data.products.length),now]},
  ]);return NextResponse.json({products:data.products.length,categories:data.categories.length,lines:data.lines.length});}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Importuoti nepavyko.'},{status:400});}
}
