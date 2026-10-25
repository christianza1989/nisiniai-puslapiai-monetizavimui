import {createHash,randomUUID} from 'node:crypto';
import {publicationOne,publicationAll,publicationBatch} from '@/lib/publication-db';
// Reuse Core's exact revision review and readiness predicates. Persistence and
// 3D/photo identity gates below are the business adapter, not a second editor.
import {editorialReview,pageReadiness} from '../../../../../content-studio/src/content-workflow.mjs';
import sourceData from '../../content/admin-source-status.json';
import {allProductModels} from './product-models';
import type {Product} from './types';
import {applyDrafts} from './publication-copy';
import type {Drafts} from './publication-copy';
import {currentTechnicalSourceHash} from './publication-geometry';
import {candidateForModel,candidateRevision} from './chair-structure-candidates';
import {deskCandidateForModel,deskCandidateRevision} from './desk-component-candidates';
export const stages=['Trūksta šaltinio info','Reikia 3D priėmimo','Reikia opcijų aprašymų','Reikia Gemini teksto','Laukia peržiūros','Patvirtinta','Paleidimo svetainėje'];
export type ModelSource=Omit<typeof sourceData.models[number],'image'|'gemini'>&{image:string|null;gemini:{conversation:string;responseSha256:string;valueSha256:string}|null;withoutColors?:boolean;technicalDraft?:boolean};
export const sourceModels=sourceData.models as ModelSource[];
export const sourceByKey=new Map(sourceModels.map(m=>[m.key,m]));
export function bindSourceModels(products:Product[],drafts?:Drafts,technicalHash=currentTechnicalSourceHash):ModelSource[]{
 const sameGeometryRelease=technicalHash===sourceData.technicalSourceHash;
 const current=new Map(allProductModels(drafts?applyDrafts(products,drafts):products).map(p=>[p.id+':'+(p.modelConfigurationId||'product'),p]));
 return sourceModels.map(m=>{
  const p=current.get(m.key);if(!p)return {...m,sourceReady:false,revisionHash:createHash('sha256').update(m.revisionHash+':missing').digest('hex')};
  const c=p.configurations.find(c=>c.id===p.modelConfigurationId),article=p.modelArticle;
  const draft=drafts?.models[m.key],chair=candidateForModel(p)||deskCandidateForModel(p),chairRevision=candidateRevision(p)||deskCandidateRevision(p);
  const revisionHash=createHash('sha256').update(JSON.stringify({source:m.revisionHash,technicalHash,...(chairRevision?{chairRevision}:{}),product:{name:p.name,description:p.description,sourceDescription:p.sourceDescription,image:p.image,gallery:p.gallery,documents:p.documents},configuration:c,article,draftProof:draft?{responseSha256:draft.responseSha256,factualReview:draft.factualReview}:null})).digest('hex');
  return {...m,...(chair?{withoutColors:true,technicalDraft:chair.acceptance==='TECHNICAL_DRAFT',optionsReady:!chair.optionsRequired||chair.acceptance==='DRAFT_READY'&&!!article?.configurable,geometryProof:{worker:'Konstrukcijos 3D patikra',release:chair.runtime.asset,sha256:chair.proofs.sourceGeometryRuntime}}:{}),geometryAccepted:!!chair||m.geometryAccepted&&sameGeometryRelease,name:p.name,image:p.image,summary:article?.summary||p.description,paragraphs:article?.paragraphs?.length?article.paragraphs:[p.description,c?.description||''].filter(Boolean),geminiReady:chair?chair.acceptance==='DRAFT_READY'&&!!draft?.responseSha256&&draft.responseSha256===chair.proofs.generalGemini:!!draft||m.geminiReady,gemini:draft?{conversation:draft.gemini.conversation,responseSha256:draft.responseSha256,valueSha256:createHash('sha256').update(JSON.stringify(draft.copy)).digest('hex')}:m.gemini,revisionHash};
 });
}
type Review={revisionHash:string;[key:string]:unknown};
type Decision={revisionHash:string;review?:Review;approval?:{actor:string;at:string};returned?:{comment:string;at:string};};
export type Workflow={version:1;models:Record<string,Decision>;released:Record<string,{revisionHash:string;at:string}>;releaseId:string|null};
export type Priorities={version:1;order:string[];writer:{provider:string;model:string;thinking:string}};
type Document<T>={revision:number;payload:T;updatedAt:string};
export async function document<T>(name:string):Promise<Document<T>>{
 const row=await publicationOne<{revision:number;payload:string;updated_at:string}>('SELECT revision,payload,updated_at FROM admin_documents WHERE name=?',name);
 if(!row)throw new Error('Administravimo saugykla dar neparuošta.');
 const payload=JSON.parse(row.payload);
 if(name==='workflow.json'||name==='drafts.json'){
  const models=await publicationAll<{model_key:string;view_payload:string}>('SELECT model_key,view_payload FROM publication_model_documents WHERE document=?',name);
  payload.models={...payload.models,...Object.fromEntries(models.map(m=>[m.model_key,JSON.parse(m.view_payload)]))};
 }
 return {revision:row.revision,payload,updatedAt:row.updated_at};
}
export class Conflict extends Error{}
export async function saveDocument<T>(name:string,revision:number,payload:T,actor:string,action:string,key:string|null=null){
 const token=randomUUID(),now=new Date().toISOString();
 const scoped=name==='workflow.json'||name==='drafts.json';
 const data=payload as {models?:Record<string,any>};
 const stored=scoped?{...data,models:{}}:payload;
 const commands=[
  {sql:'UPDATE admin_documents SET payload=?,revision=revision+1,token=?,updated_at=? WHERE name=? AND revision=?',params:[JSON.stringify(stored),token,now,name,revision]},
  {sql:'INSERT INTO publication_audit(document,revision,actor,action,model_key,token,created_at) SELECT name,revision,?,?,?,?,updated_at FROM admin_documents WHERE name=? AND token=?',params:[actor,action,key,token,name,token]},
  {sql:'INSERT INTO publication_versions(document,revision,model_key,payload,token,created_at) SELECT name,revision,?,?,token,updated_at FROM admin_documents WHERE name=? AND token=?',params:[key,JSON.stringify(scoped&&key?data.models?.[key]:stored),name,token]},
 ];
 if(scoped&&key){
  const model=data.models?.[key];if(!model)throw Error('Trūksta modelio versijos.');
  const view=structuredClone(model);if(name==='drafts.json')delete view.gemini.originalResponse;
  commands.push({sql:`INSERT INTO publication_model_documents(document,model_key,payload,view_payload,token,updated_at) SELECT name,?,?,?,?,updated_at FROM admin_documents WHERE name=? AND token=? ON CONFLICT(document,model_key) DO UPDATE SET payload=excluded.payload,view_payload=excluded.view_payload,token=excluded.token,updated_at=excluded.updated_at`,params:[key,JSON.stringify(model),JSON.stringify(view),token,name,token]});
 }
 const result=await publicationBatch(commands);
 if(result[0].changes!==1)throw new Conflict('Duomenis jau pakeitė kita peržiūra. Atnaujinkite langą ir pakartokite sprendimą.');
 return {revision:revision+1,payload,updatedAt:now};
}
export function sourceRevision(m:ModelSource){return m.revisionHash;}
export function modelPage(m:ModelSource,review?:Review){return {id:m.key,type:'product',title:m.name,body:m.paragraphs.map(text=>({type:'paragraph',text})),media:[],links:[],externalLinks:[],factChecks:[],editorialReview:review};}
export const editorialSite={id:'ergonomic-lt',name:'Ergonomic.lt',offer:'Biuro baldai ir komplektacijos parinkimas',facts:'UAB A-Z Prekyba. Buivydiškių g. 22, Vilnius, LT-07195.',audience:'Įmonės ir darbo erdvės',contact:{email:'info@ergonomic.lt',phone:'+37069199833'},canonicalHost:'ergonomic.lt',timezone:'Europe/Vilnius',locale:'lt',brand:'Ergonomic.lt',operatorName:'UAB A-Z Prekyba'};
export function blockers(m:ModelSource){
 const result:string[]=[];
 if(!m.active)result.push('Istorinis modelis paslėptas; į aktyvaus katalogo darbų eilę neįtrauktas.');
 if(!m.sourceReady)result.push('Trūksta susieto originalaus šaltinio.');
 if(!m.geometryAccepted)result.push('Trūksta pilno 3D priėmimo įrodymo arba patvirtintos nuotraukų išimties.');
 if(m.technicalDraft)result.push('Techninis draft: tekstai ir galutinė kompiuterio bei telefono peržiūra dar nepriimti.');
 if(!m.optionsReady)result.push('Opcijų aprašymai neparengti arba nepatikrinti.');
 if(!m.geminiReady)result.push('Trūksta susieto Gemini teksto ir jo redakcinės patikros.');
 if(!m.image)result.push('Trūksta konkrečiam modeliui priskirtos nuotraukos.');
 return result;
}
export function modelStage(m:ModelSource,w:Workflow){
 const d=w.models[m.key],same=d?.revisionHash===m.revisionHash;
 if(w.released[m.key]?.revisionHash===m.revisionHash&&same&&d.approval)return 6;
 if(same&&d.approval)return 5;
 if(!m.sourceReady)return 0;
 if(!m.geometryAccepted)return 1;
 if(!m.optionsReady)return 2;
 if(!m.geminiReady)return 3;
 return 4;
}
export function transition(w:Workflow,key:string,revisionHash:string,action:string,input:any,actor:string,models=sourceByKey):Workflow{
 const m=models.get(key);if(!m)throw new Error('Modelis nerastas.');
 if(revisionHash!==m.revisionHash)throw new Conflict('Modelio revizija pasikeitė. Peržiūrėkite naują versiją.');
 const next=structuredClone(w),now=new Date().toISOString();
 let decision=next.models[key];if(!decision||decision.revisionHash!==revisionHash)decision=next.models[key]={revisionHash};
 if(action==='review'){
  if(input.desktop!==true||input.mobile!==true)throw new Error('Peržiūrėkite ir kompiuterio, ir telefono vaizdą.');
  if(blockers(m).length)throw new Error(blockers(m).join(' '));
  decision.review=editorialReview(editorialSite,modelPage(m),revisionHash,{revisionHash,reviewer:actor,evidence:input.evidence});
  delete decision.approval;delete next.released[key];
 }else if(action==='approve'){
  const ready=pageReadiness(editorialSite,modelPage(m,decision.review),revisionHash);
  const reasons=[...blockers(m),...ready.blockers];if(reasons.length)throw new Error(reasons.join(' '));
  decision.approval={actor,at:now};delete decision.returned;
 }else if(action==='return'||action==='remove'){
  if(typeof input.comment!=='string'||input.comment.trim().length<3)throw new Error('Įrašykite grąžinimo arba išėmimo priežastį.');
  decision.returned={comment:input.comment.trim().slice(0,2000),at:now};delete decision.approval;delete decision.review;delete next.released[key];
 }else throw new Error('Nežinomas veiksmas.');
 return next;
}
export function release(w:Workflow,models=sourceByKey){
 const next=structuredClone(w),at=new Date().toISOString();next.released={};
 for(const [key,d] of Object.entries(next.models)){
  const m=models.get(key);if(!m||!m.active||!d.approval||d.revisionHash!==m.revisionHash)continue;
  const ready=pageReadiness(editorialSite,modelPage(m,d.review),m.revisionHash);
  if(blockers(m).length||ready.blockers.length)throw new Conflict(`Modelio ${m.name} priėmimas paseno.`);
  next.released[key]={revisionHash:m.revisionHash,at};
 }
 next.releaseId=createHash('sha256').update(JSON.stringify(next.released)).digest('hex');return next;
}
export function priorities(input:unknown):Priorities{
 if(!Array.isArray(input)||input.length>sourceModels.length||input.some(x=>typeof x!=='string'||!sourceByKey.get(x)?.active)||new Set(input).size!==input.length)throw new Error('Eilėje turi būti tik unikalūs aktyvaus katalogo modelių ID.');
 return {version:1,order:input,writer:{provider:'Gemini App',model:'4 Argon',thinking:'low'}};
}
