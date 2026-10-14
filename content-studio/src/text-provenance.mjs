// Private revision-bound sidecar. Never imported by public package projection.
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {DATA,getSite,revisionHash,revisionPayload,stable} from './model.mjs';
import {bodyPlainText} from './content-package-v2.mjs';
import {withStudioWriteLock} from './write-lock.mjs';

export const textHash=value=>createHash('sha256').update(value).digest('hex');
const id=value=>{if(typeof value!=='string'||! /^[a-z0-9][a-z0-9-]{1,79}$/i.test(value))throw Error('Invalid provenance ID');return value;};
const hash=value=>{if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value))throw Error('Invalid provenance hash');return value;};
const string=(value,max=2000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid provenance text');return value;};
const choice=(value,values)=>{if(!values.includes(value))throw Error('Invalid provenance enum');return value;};
const root=siteId=>path.join(DATA,'text-provenance',id(siteId));
export const pageText=page=>page.contentVersion===2?bodyPlainText(page.body):page.body.map(b=>b.text??b.items?.join('\n')??'').join('\n\n');

function authorship(input,text){
 const primaryWriter=choice(input.primaryWriter,['gemini','codex','mixed','unknown']);
 const authoringMode=choice(input.authoringMode,['gemini_with_codex_review','gemini_with_codex_text_edits','codex_only','mixed','legacy_unknown']);
 const expected={gemini_with_codex_review:'gemini',gemini_with_codex_text_edits:'gemini',codex_only:'codex',mixed:'mixed',legacy_unknown:'unknown'};
 if(expected[authoringMode]!==primaryWriter)throw Error('Writer/mode mismatch');
 const contributions=(input.contributions??[]).map(c=>{
   const writer=choice(c.writer,['gemini','codex']);
   const excerpt=string(c.excerpt,12000);if(!text.includes(excerpt))throw Error('Contribution is not in the exact final text');
   return {writer,excerpt,sha256:textHash(excerpt),role:string(c.role,500),evidence:string(c.evidence)};
 });
 if(authoringMode==='gemini_with_codex_text_edits'&&!contributions.some(c=>c.writer==='codex'))throw Error('Codex text edits require exact contribution segments');
 if(authoringMode==='gemini_with_codex_review'&&contributions.some(c=>c.writer==='codex'))throw Error('Review alone cannot include Codex-written segments');
 if(authoringMode==='codex_only'&&contributions.some(c=>c.writer!=='codex'))throw Error('Codex-only cannot include Gemini-written segments');
 if(authoringMode==='mixed'&&!['gemini','codex'].every(writer=>contributions.some(c=>c.writer===writer)))throw Error('Mixed authoring requires both writer contributions');
 if(primaryWriter==='unknown'&&(contributions.length||input.modelUi||input.backendModelId||input.provider))throw Error('Unknown legacy authorship cannot assert a model/provider');
 const modelEvidence=input.modelEvidence??{kind:'unknown',limitation:'No authorship evidence available.'};
 choice(modelEvidence.kind,['unknown','ui_selected_mode','actual_metadata']);string(modelEvidence.limitation);
 if(modelEvidence.kind==='unknown'&&(input.modelUi||input.thinkingUi||input.backendModelId))throw Error('Unknown model evidence cannot assert a model');
 if(modelEvidence.kind!=='unknown')string(modelEvidence.artifact);
 if(input.backendModelId&&modelEvidence.kind!=='actual_metadata')throw Error('UI selection does not establish backend model ID');
 return {primaryWriter,authoringMode,originClass:authoringMode==='gemini_with_codex_text_edits'||primaryWriter==='mixed'?'mixed':primaryWriter,
   provider:input.provider??null,modelUi:input.modelUi??null,thinkingUi:input.thinkingUi??null,backendModelId:input.backendModelId??null,
   modelEvidence:{kind:modelEvidence.kind,artifact:modelEvidence.artifact??null,limitation:modelEvidence.limitation},contributions};
}
async function captureArtifacts(input){
 const result={};
 for(const [kind,file]of Object.entries(input??{})){
   if(!['prompt','inputEvidence','rawResponse','finalSource','modelEvidence'].includes(kind))throw Error('Unknown provenance artifact kind');
   const bytes=await readFile(path.resolve(string(file)));
   if(bytes.length>16*1024*1024)throw Error('Provenance artifact exceeds 16 MiB');
   result[kind]={sourcePath:path.resolve(file),sha256:textHash(bytes),bytes:bytes.length,content:bytes};
 }
 return result;
}
export async function recordTextProvenance(siteId,pageId,input){
 return withStudioWriteLock(DATA,async()=>{
   const site=await getSite(id(siteId)),page=site.pages.find(p=>p.id===id(pageId));
   if(!page)throw Error('Unknown provenance page');
   const expected=hash(input.revisionHash);
   const snapshot=revisionHash(page)===expected?page:page.publishedRevision?.revisionHash===expected?page.publishedRevision:null;
   if(!snapshot||revisionHash(snapshot)!==expected)throw Error('Provenance revision is not a current or preserved published revision');
   const text=pageText(snapshot),author=authorship(input,text),artifacts=await captureArtifacts(input.artifacts);
   const snapshotBytes=Buffer.from(JSON.stringify({...revisionPayload(snapshot),id:snapshot.id,...(snapshot.contentVersion===2?{contentVersion:2}:{})}));
   artifacts.revisionSnapshot={sourcePath:null,sha256:textHash(snapshotBytes),bytes:snapshotBytes.length,content:snapshotBytes};
   if(author.primaryWriter!=='unknown'){
     string(input.jobId,200);if(!['string','number'].includes(typeof input.promptVersion))throw Error('Known authoring requires prompt version');string(String(input.promptVersion),200);
     string(input.provider,120);
   }
   if(author.primaryWriter!=='unknown'&&(!artifacts.prompt||!artifacts.rawResponse||!artifacts.inputEvidence||!artifacts.finalSource))throw Error('Known authoring requires prompt, raw response, input evidence and final source artifacts');
   if(author.modelEvidence.kind!=='unknown'&&!artifacts.modelEvidence)throw Error('Observed model requires captured evidence artifact');
   const lineage=(input.lineage??[]).map(hash);
   const entry={version:1,siteId,pageId,slug:snapshot.slug,revisionHash:expected,...author,
     jobId:input.jobId??null,promptVersion:input.promptVersion??null,conversationUrl:input.conversationUrl??null,
     authoredAt:input.authoredAt??null,reviewer:string(input.reviewer),codexRole:string(input.codexRole),lineage,
     finalTextHash:textHash(text),finalBodyHash:textHash(stable(snapshot.body)),
     artifacts:Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,{sourcePath:v.sourcePath,sha256:v.sha256,bytes:v.bytes,storedFile:'artifacts/'+v.sha256}]))};
   if(entry.conversationUrl){const u=new URL(entry.conversationUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid conversation URL');}
   if(entry.authoredAt&&!Number.isFinite(Date.parse(entry.authoredAt)))throw Error('Invalid authoredAt');
   const directory=path.join(root(siteId),id(pageId)),file=path.join(directory,expected+'.json');
   try{const previous=JSON.parse(await readFile(file,'utf8'));const {recordedAt,...payload}=previous;if(stable(payload)!==stable(entry))throw Error('Immutable provenance record already exists with different evidence');return previous;}
   catch(error){if(error.code!=='ENOENT')throw error;}
   await mkdir(path.join(root(siteId),'artifacts'),{recursive:true});await mkdir(directory,{recursive:true});
   for(const a of Object.values(artifacts)){
     const target=path.join(root(siteId),'artifacts',a.sha256);
     try{await writeFile(target,a.content,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;if(textHash(await readFile(target))!==a.sha256)throw Error('Stored provenance artifact hash mismatch');}
   }
   const record={...entry,recordedAt:new Date().toISOString()};await writeFile(file,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});return record;
 });
}
export async function listTextProvenance(siteId,filters={}){
 const allowed=['primaryWriter','originClass','modelUi','pageId','revisionHash','currentOnly'];
 if(Object.keys(filters).some(k=>!allowed.includes(k)))throw Error('Unknown provenance filter');
 if(filters.primaryWriter)choice(filters.primaryWriter,['gemini','codex','mixed','unknown']);
 if(filters.originClass)choice(filters.originClass,['gemini','codex','mixed','unknown']);
 if(filters.revisionHash)hash(filters.revisionHash);if(filters.pageId)id(filters.pageId);
 let dirs;try{dirs=await readdir(root(siteId),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
 const site=filters.currentOnly?await getSite(siteId):null,entries=[];
 for(const d of dirs.filter(d=>d.isDirectory()&&d.name!=='artifacts'))for(const file of await readdir(path.join(root(siteId),d.name))){
   if(!/^[a-f0-9]{64}\.json$/.test(file))continue;
   const entry=JSON.parse(await readFile(path.join(root(siteId),d.name,file),'utf8'));
   if(entry.siteId!==siteId||entry.pageId!==d.name||entry.revisionHash+'.json'!==file)throw Error('Provenance identity mismatch');
   if(Object.entries(filters).some(([k,v])=>k!=='currentOnly'&&entry[k]!==v))continue;
   if(site&&!site.pages.some(p=>p.id===entry.pageId&&revisionHash(p)===entry.revisionHash))continue;
   entries.push(entry);
 }
 return entries.sort((a,b)=>a.slug.localeCompare(b.slug)||a.recordedAt.localeCompare(b.recordedAt));
}
export async function verifyTextProvenance(siteId){
 const records=await listTextProvenance(siteId);
 for(const record of records){for(const artifact of Object.values(record.artifacts)){
   hash(artifact.sha256);
   if(artifact.storedFile!=='artifacts/'+artifact.sha256)throw Error('Invalid stored artifact path');
   const bytes=await readFile(path.join(root(siteId),artifact.storedFile));
   if(bytes.length!==artifact.bytes||textHash(bytes)!==artifact.sha256)throw Error('Provenance artifact integrity failed');
 }
   const snapshot=JSON.parse(await readFile(path.join(root(siteId),record.artifacts.revisionSnapshot.storedFile),'utf8'));
   if(snapshot.siteId!==record.siteId||snapshot.id!==record.pageId||snapshot.slug!==record.slug||revisionHash(snapshot)!==record.revisionHash||textHash(pageText(snapshot))!==record.finalTextHash||textHash(stable(snapshot.body))!==record.finalBodyHash)throw Error('Provenance revision snapshot integrity failed');
 }
 return {siteId,records:records.length,status:'PASS_REVISION_AND_ARTIFACT_INTEGRITY',limitation:'Integrity is not proof of authorship, model backend identity or editorial quality.'};
}
