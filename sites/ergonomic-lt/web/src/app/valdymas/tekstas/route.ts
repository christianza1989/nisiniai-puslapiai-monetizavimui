import {NextRequest,NextResponse} from 'next/server';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {catalogAsync} from '@/lib/catalog';
import {bindSourceModels,document,saveDocument,Conflict} from '@/lib/publication-workflow';
import type {Priorities} from '@/lib/publication-workflow';
import {readDrafts,validateCopy} from '@/lib/publication-copy';
import type {Drafts} from '@/lib/publication-copy';
export const dynamic='force-dynamic';
const response=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function GET(req:NextRequest){
 if(!await isAdmin()||process.env.LAUNCH_SITE==='true')return response({error:'Reikia prisijungti.'},401);
 const seed=await catalogAsync(),drafts=await readDrafts(),models=bindSourceModels(seed.products,drafts);
 const queue=await document<Priorities>('priorities.json'),order=queue.payload.order;
 const next=models.filter(m=>m.geometryAccepted&&!m.geminiReady).sort((a,b)=>{const x=order.indexOf(a.key),y=order.indexOf(b.key);return (x<0?99999:x)-(y<0?99999:y);})[0];
 const key=req.nextUrl.searchParams.get('model'),m=key?models.find(m=>m.key===key):next;
 if(!m)return response({next:null,reason:'Tekstų eilėje paruoštų modelių nėra.'});
 const p=seed.products.find(p=>p.id===m.productId)!,c=p.configurations.find(c=>c.id===m.configurationId);
 return response({model:m.key,revisionHash:m.revisionHash,priorityRevision:queue.revision,nextInQueue:next?.key||null,writer:{provider:'Gemini App',model:'4 Argon',thinking:'low'},
  prompt:`Rašyk lietuviškai Ergonomic.lt produkto aprašymą. Gemini App: 4 Argon, low (patikrink tikrame UI). Tik pateikti faktai, neišgalvok matmenų, sertifikatų, savybių, kainų ar terminų. Nevadink linijos šeima. Viešame tekste neminėk Pinet, Verslomatika ar gamintojo pavadinimo. Pirmiausia tiksliai susiek modelį su jo kodu ir šaltiniais; prieš galutinį atsakymą pats suredaguok kalbą. Išlaikyk modelio pavadinimą ir techninę reikšmę. Grąžink tik JSON: {"summary":"...","paragraphs":["...","..."]}. 2–5 rišlios pastraipos; nesikartojantis trumpas summary. Užklausos procesas: lankytojas pasirenka komplektaciją ir siunčia pasiūlymo užklausą; kainų svetainė neskaičiuoja. Šaltinis:\n${JSON.stringify({id:m.configurationId,code:m.code,name:m.name,sourceUrl:p.sourceUrl,sourceDescription:p.sourceDescription,configuration:c,documents:p.documents},null,2)}`,
  importContract:{key:m.key,baseRevisionHash:m.revisionHash,copy:{summary:'Gemini originalas',paragraphs:['Gemini originalas']},gemini:{provider:'Gemini App',model:'4 Argon',thinking:'low',conversation:'Tikras pokalbio URL',originalResponse:'Nepakeistas galutinis JSON atsakymas'},factualReview:{actor:'Tikras peržiūrėtojas',notes:'Konkrečios šaltinių, kodų, faktų ir kalbos patikros',sourceRevisionHash:m.revisionHash}}});
}
export async function POST(req:NextRequest){
 if(!await isAdmin()||process.env.LAUNCH_SITE==='true')return response({error:'Reikia prisijungti.'},401);
 if(!originAllowed(req)||req.headers.get('x-ergonomic-action')!=='1')return response({error:'Neleistina užklausos kilmė.'},403);
 try{
  const body=await readJson(req,250000) as any;
  const drafts=await document<Drafts>('drafts.json');if(body.version!==drafts.revision)throw new Conflict('Tekstų saugykla pasikeitė. Atnaujinkite langą.');
  const models=bindSourceModels((await catalogAsync()).products,drafts.payload),m=models.find(m=>m.key===body.draft?.key);if(!m)throw Error('Modelis nerastas.');
  const validated=validateCopy(body.draft,m.revisionHash);
  await saveDocument('drafts.json',drafts.revision,{version:1,models:{...drafts.payload.models,[m.key]:validated}},'owner-session','gemini-import',m.key);
  return response({ok:true,message:'Privatus Gemini juodraštis išsaugotas. Viešas draft nepakeistas. Reikia naujos savininko peržiūros.'});
 }catch(e){return response({error:(e as Error).message},e instanceof Conflict?409:400);}
}
