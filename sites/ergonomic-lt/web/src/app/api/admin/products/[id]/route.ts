import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {catalogAsync as catalog,safeImage,safeDocument} from '@/lib/catalog';
import {saveProductEdit} from '@/lib/db';
const image=z.string().max(2000).refine(safeImage);
const schema=z.object({name:z.string().trim().min(1).max(200),description:z.string().trim().min(10).max(12000),gallery:z.array(image).min(1).max(30),published:z.boolean(),translationReviewed:z.boolean(),documents:z.array(z.object({title:z.string().min(1).max(200),url:z.string().max(2000).refine(safeDocument)})).max(100)});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!await isAdmin())return NextResponse.json({error:'Reikia prisijungti.'},{status:401});
  if(!originAllowed(req))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403});
  const {id}=await params;if(!(await catalog()).products.some(p=>p.id===id))return NextResponse.json({error:'Prekė nerasta.'},{status:404});
  try{const edit=schema.parse(await readJson(req));if(edit.published&&!edit.translationReviewed)return NextResponse.json({error:'Prieš paskelbdami patvirtinkite lietuvišką turinį.'},{status:400});await saveProductEdit(id,{...edit,image:edit.gallery[0]});return NextResponse.json({ok:true});}
  catch{return NextResponse.json({error:'Patikrinkite tekstus, nuotraukų adresus ir dokumentų nuorodas.'},{status:400});}
}
