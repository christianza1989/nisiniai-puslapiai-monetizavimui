import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createPrivateImporter, verifyPin } from './core-adapter.mjs';
import { buildAuthorPrompt } from './gemini-ui.mjs';
import { selectCapturedPages } from './capture.mjs';
import { prepareFactGroups } from './fact-preparation.mjs';
import { measurePipelineThroughput } from './throughput.mjs';

const read=async file=>JSON.parse(await readFile(file,'utf8'));
const execute=promisify(execFile);

/** Actual Gemini/review/DOM actions are host requests. Everything from accepted
 * page intake through final review and reader updates runs in this one process. */
export async function createPorts({store,bridge,config}) {
  assert(config.siteId==='promedical'&&config.publication==='paused_by_owner'&&config.newPublicReleaseAllowed===false);
  for(const pin of Object.values(config.contracts))await verifyPin(pin);
  assert.equal(config.contracts.model.path.replaceAll('\\','/').split('/').at(-1),'model.mjs');
  Object.assign(process.env,{STUDIO_DATA_DIR:config.dataDir,STUDIO_OUTPUT_DIR:config.studioOutputDir,STUDIO_NETWORK_SETTINGS:config.networkSettings,STUDIO_PUBLIC_CORE_DIR:config.publicCoreDir});
  const model=await import(pathToFileURL(config.contracts.model.path)),workflow=await import(pathToFileURL(config.contracts.workflow.path)),registry=await import(pathToFileURL(config.contracts.provenance.path));
  assert.equal(model.DATA.replaceAll('\\','/'),config.dataDir.replaceAll('\\','/'));
  const structural=await import(pathToFileURL(config.contracts.structuralGuard.path)),baseline=structural.loadStructuralBaseline();
  const site=await model.getSite(config.siteId);
  for(const e of config.acceptedExamples){const p=site.pages.find(p=>p.id===e.pageId);assert(p&&model.revisionHash(p)===e.canonicalRevision&&workflow.reviewCurrent(site,p,e.canonicalRevision),'Example must be actually current and reviewed');const text=`# ${p.title}\n\n${p.description}\n\n${p.body.map(b=>b.text).join('\n\n')}\n\nPRIVATE_SOURCE_JSON: ${JSON.stringify(p.externalLinks.map(({url,label,reason})=>({url,label,reason})))}`;assert.equal(e.text,text,'Example text changed');}
  const guards=await read(config.guardManifest.path);await verifyPin(config.guardManifest);await verifyPin(guards.protectedOriginalManifest);
  const protectedPins=await read(guards.protectedOriginalManifest.path);assert.equal(protectedPins.length,3880);
  const guardEpoch=async({site})=>{
    for(const pin of [...config.immutablePins,...guards.immutablePins,...protectedPins])await verifyPin(pin);
    const graph=structural.assertStructuralGraph(site,baseline);assert.equal(graph.categoryCount,436);assert.equal(graph.productCount,1408);
  };
  const refreshReaders=async()=>{
    for(const pin of config.readerHelpers){await verifyPin(pin);await execute(process.execPath,[pin.path],{cwd:config.workdir,windowsHide:true,maxBuffer:1024*1024});}
  };
  const importer=createPrivateImporter({model,workflow,registry,config,captureDom:(request,ctx)=>bridge.request('NATIVE_DOM',request,ctx),refreshReaders,guardEpoch});
  return {
    async generate(batch,ctx){
      const document=await store.read(),pipeline=document.pipeline;
      const completed=new Set(Object.entries((await read(config.checkpoints[0])).work).filter(([k])=>k.endsWith('WrittenDraft')).map(([,v])=>v.pageId));
      for(const page of batch.pages){assert(!completed.has(page.pageId),'Completed page cannot be sent again');assert(!config.heldPageIds.includes(page.pageId),'Held page cannot be sent');await verifyPin(page.factsRef);}
      const specs=batch.pages.map(p=>p.capturePage),prompt=buildAuthorPrompt({batchId:batch.batchId,pages:await Promise.all(batch.pages.map(async page=>({...((await read(page.factsRef.path)).authorTask),id:page.pageId,h1:page.capturePage.title}))),examples:config.acceptedExamples,commonMistakes:config.commonMistakes});
      const answer=await bridge.request('GEMINI_GENERATE',{batchId:batch.batchId,prompt,pages:specs,previousRejections:pipeline.pages.filter(p=>batch.pages.some(b=>b.pageId===p.pageId)).flatMap(p=>p.reviews.filter(r=>r.decision==='rejected'))},ctx);
      assert(answer.send?.status==='COMPLETED_RETAINED'&&!answer.send.uncertain,'A query acknowledgement alone is not a retained response');
      for(const pin of [answer.captureRef,answer.promptRef,answer.modelProofRef])await verifyPin(pin);
      assert.equal((await readFile(answer.promptRef.path,'utf8')),prompt,'Actual sent prompt differs');
      const selection={...answer.captureSelection,pages:specs},raw=await read(answer.captureRef.path),parsed=selectCapturedPages(raw,selection);
      return{captureRef:answer.captureRef,send:answer.send,pages:parsed.outcomes.filter(o=>o.status==='captured').map(o=>({...o.candidate,pageId:o.pageId,captureSelection:selection,promptRef:answer.promptRef,modelProofRef:answer.modelProofRef,identity:answer.identity,authoredAt:raw.at,conversationUrl:raw.url})),rejections:parsed.outcomes.filter(o=>o.status==='rejected')};
    },
    async review(record,ctx){
      return bridge.request('REVIEW_PAGE',{pageId:record.pageId,input:record.input,candidate:record.candidates.at(-1),requirements:'Read the complete H1, description, every body paragraph and own source reason against pinned primary facts. Accept this page independently; return all necessary corrections together. Eight-word edits are relative to immutable Gemini paragraphs; no fact/number/model/URL/label changes. Truthfully name actual reviewer ID.'},ctx);
    },
    async importPages(records,ctx){const result=await importer(records,ctx);if(config.measurementBaseline){const measurement=measurePipelineThroughput({site:await model.getSite(config.siteId),checkpoints:await Promise.all(config.checkpoints.map(read)),model,workflow,baseline:config.measurementBaseline});await store.update(doc=>{doc.pipeline.measurement=measurement;});}return result;},
    ...(config.factPreparation?{async prepareFacts(ctx){
      const fp=config.factPreparation;
      const publish=async(pack)=>{
        const task=fp.tasks.find(t=>t.pageId===pack.pageId),file=path.join(fp.outputDir,pack.pageId+'.json');
        assert(pack.authorTask&&pack.originalCanonical,'Reviewed pack needs its own compact author task and original binding');
        await mkdir(fp.outputDir,{recursive:true});const bytes=JSON.stringify(pack,null,2)+'\n';
        try{await writeFile(file,bytes,{flag:'wx',flush:true});}catch(error){if(error.code!=='EEXIST')throw error;assert.equal(await readFile(file,'utf8'),bytes,'Reviewed fact pack is immutable');}
        const factsRef={path:file,sha256:createHash('sha256').update(bytes).digest('hex')};
        await store.update(doc=>{const p=doc.pipeline.pages.find(p=>p.pageId===pack.pageId);assert(p?.status==='FACTS_WAIT');p.input={...p.input,...task.pageInput,factsRef,factsReady:true};p.status='QUEUED';});
      };
      const prepared=await prepareFactGroups({tasks:fp.tasks,existingArtifacts:fp.existingArtifacts,signal:ctx.signal,concurrency:2,
        selection:{heldPageIds:config.heldPageIds,completedPageIds:Object.entries((await read(config.checkpoints[0])).work).filter(([k])=>k.endsWith('WrittenDraft')).map(([,v])=>v.pageId)},
        readSource:async ref=>{const saved=fp.sourceFiles.find(p=>p.url===ref.url&&p.sha256===ref.sha256);assert(saved,'Pinned saved primary source required');const bytes=await verifyPin(saved);return{url:ref.url,content:bytes.toString('utf8'),identity:saved.identity};},
        preparePage:(task,{sources})=>bridge.request('PREPARE_FACT_PAGE',{task,sourceFiles:fp.sourceFiles.filter(p=>sources.some(s=>s.url===p.url&&s.sha256===p.sha256)),groupingMeaning:'Category grouping shares source reads; never transfers SKU facts or implies URL merge. Actual editor must read whole saved documents and identify itself.'},ctx),
        persist:publish});
      for(const result of prepared.outcomes.filter(o=>o.status==='reused'))await publish(result.artifact);
      return prepared;
    }}:{}),
  };
}
