import {NextRequest,NextResponse} from 'next/server';
import {isAdmin,originAllowed,readJson} from '@/lib/auth';
import {document,saveDocument,bindSourceModels,stages,modelStage,blockers,transition,release,priorities,Conflict} from '@/lib/publication-workflow';
import {catalogAsync} from '@/lib/catalog';
import {readDrafts} from '@/lib/publication-copy';
import type {Drafts} from '@/lib/publication-copy';
import type {Workflow,Priorities} from '@/lib/publication-workflow';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function GET(){
 if(!await isAdmin()||process.env.LAUNCH_SITE==='true')return response({error:'Reikia savininko prisijungimo.'},401);
 try{
  const [queue,workflow,drafts]=await Promise.all([document<Priorities>('priorities.json'),document<Workflow>('workflow.json'),document<Drafts>('drafts.json')]);
  const models=bindSourceModels((await catalogAsync()).products,drafts.payload);
  return response({queue,workflow,draftsRevision:drafts.revision,stages,models:models.map(m=>({...m,stage:modelStage(m,workflow.payload),blockers:blockers(m)}))});
 }catch{return response({error:'Nepavyko perskaityti administravimo saugyklos. Bandykite atnaujinti langą.'},503);}
}
export async function POST(req:NextRequest){
 if(!await isAdmin()||process.env.LAUNCH_SITE==='true')return response({error:'Reikia savininko prisijungimo.'},401);
 if(!originAllowed(req)||req.headers.get('x-ergonomic-action')!=='1')return response({error:'Neleistina užklausos kilmė.'},403);
 try{
  const body=await readJson(req,180000) as any;
  if(!Number.isSafeInteger(body.version)||body.version<0)throw new Error('Trūksta dokumento versijos.');
  if(body.action==='priorities')return response(await saveDocument('priorities.json',body.version,priorities(body.order),'owner-session','priorities'));
  const current=await document<Workflow>('workflow.json');
  if(body.version!==current.revision)throw new Conflict('Būsena pasikeitė. Atnaujinkite langą.');
  const models=new Map(bindSourceModels((await catalogAsync()).products,await readDrafts()).map(m=>[m.key,m]));
  const next=body.action==='release'?release(current.payload,models):transition(current.payload,body.key,body.revisionHash,body.action,body,'owner-session',models);
  if(body.action!=='release'&&!models.has(body.key))throw new Error('Modelis nerastas.');
  return response(await saveDocument('workflow.json',current.revision,next,'owner-session',body.action,body.key||null));
 }catch(e){return response({error:(e as Error).message},e instanceof Conflict?409:400);}
}
