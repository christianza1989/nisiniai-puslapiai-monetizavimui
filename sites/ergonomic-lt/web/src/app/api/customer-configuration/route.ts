import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {readJson,originAllowed} from '@/lib/auth';
import {resolveCustomerSnapshot,customerConfiguration} from '@/lib/customer-configuration-server';
const schema=z.object({token:z.string().min(40).max(24004),change:z.object({field:z.string().regex(/^[a-f0-9]{32}$/),value:z.string().regex(/^[a-f0-9]{32}$/)}).strict()}).strict();
export async function POST(request:NextRequest){
 const headers={'Cache-Control':'no-store'};
 if(!originAllowed(request))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403,headers});
 try{const input=schema.parse(await readJson(request)),resolved=await resolveCustomerSnapshot(input.token);return NextResponse.json(await customerConfiguration(resolved.product,input.token,input.change,resolved),{headers});}
 catch{return NextResponse.json({error:'Nepavyko pakeisti komplektacijos. Atnaujinkite puslapį ir bandykite dar kartą.'},{status:400,headers});}
}
