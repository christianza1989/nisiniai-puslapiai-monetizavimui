import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {readJson,originAllowed} from '@/lib/auth';
import {resolveCustomerSnapshot,customerConfiguration} from '@/lib/customer-configuration-server';
const schema=z.object({token:z.string().min(40).max(24004),change:z.object({field:z.string().regex(/^[a-f0-9]{32}$/),value:z.string().regex(/^[a-f0-9]{32}$/)}).strict()}).strict();
export async function POST(request:NextRequest){
 const headers={'Cache-Control':'no-store'};
 if(!originAllowed(request))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403,headers});
 try{const started=performance.now(),times:string[]=[],trace=(name:string,ms:number)=>times.push(name+';dur='+ms.toFixed(1)),input=schema.parse(await readJson(request)),resolved=await resolveCustomerSnapshot(input.token,trace),data=await customerConfiguration(resolved.product,input.token,input.change,resolved,trace);trace('total',performance.now()-started);return NextResponse.json(data,{headers:{...headers,'Server-Timing':times.join(',')}});}
 catch(error){console.error('Customer configuration error:',error instanceof Error?error.message:'invalid-request');return NextResponse.json({error:'Nepavyko pakeisti komplektacijos. Atnaujinkite puslapį ir bandykite dar kartą.'},{status:400,headers});}
}
