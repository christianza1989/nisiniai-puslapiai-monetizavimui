import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyBodyEdits, sha256Body } from './bounded-edits.mjs';
import { validateGeminiProof } from './gemini-ui.mjs';
import { selectCapturedPages, MAX_SOURCE_REASONS } from './capture.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const copy = value => structuredClone(value);
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const read = async file => JSON.parse(await readFile(file, 'utf8'));
export async function verifyPin(pin) {
  assert(pin && typeof pin.path === 'string' && /^[a-f0-9]{64}$/.test(pin.sha256), 'Exact artifact pin required');
  const bytes = await readFile(pin.path); assert.equal(sha(bytes), pin.sha256, `Artifact changed: ${pin.path}`); return bytes;
}
async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, json(value), { flag: 'wx', flush: true });
  const started=Date.now();for(;;)try{await rename(tmp,file);break;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||Date.now()-started>5000)throw error;await new Promise(r=>setTimeout(r,10));}
}
function exactString(value, max, field) {
  assert(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max, `${field} would be truncated or trimmed`); return value;
}
function pairs(list) {
  assert(Array.isArray(list)); for (const p of list) {
    exactString(p.label, 180, 'link label'); const u = new URL(p.url);
    assert(['https:', 'http:'].includes(u.protocol) && !u.username && !u.password, 'Unsafe link');
  } return list.map(({url,label}) => ({url,label}));
}

/** This prepares one independently reviewed page. Machine checks do not stand in
 * for the editor's factual review. No native mutation or provenance claim here. */
export function prepareReviewedPage(record, site, model) {
  const input = record.input, capture = record.candidates.at(-1), candidate = capture?.candidate;
  const review = record.reviews.at(-1), original = candidate?.original;
  assert(review?.decision === 'accepted' && review.candidateId === capture.candidateId, 'Review must bind current candidate');
  exactString(review.reviewer, 120, 'actual reviewer ID');
  assert(review.allH1DescriptionBodyReasonsPersonallyRead === true && review.factsAndLanguageAccepted === true, 'Complete factual and language review required');
  assert(original && Array.isArray(original.body) && original.body.length >= 1 && original.body.length <= 2);
  assert(site.schemaVersion!==2,'V2 site is outside this V1 importer');
  for(const area of ['usefulness','facts','sources','links','media','presentation']){const note=review.evidence?.[area];exactString(note,4000,'review evidence '+area);assert(note.length>=20,'Specific review evidence requires 20 characters');}
  const prior = site.pages.find(p => p.id === record.pageId); assert(prior && prior.contentVersion !== 2, 'Existing V1 page required');
  assert.equal(model.revisionHash(prior), input.originalCanonical, 'Original canonical changed');
  const links = pairs(candidate.orderedBodyLinks);
  const paragraphs=Object.fromEntries(original.body.map((text,i)=>[i,{...(input.protectedParagraphs?.[i]??{}),protectedLiterals:[...(input.protectedParagraphs?.[i]?.protectedLiterals??[]),...links.filter(l=>text.includes(l.label)).map(l=>l.label)]}]));
  const edited = applyBodyEdits(original.body, review.edits ?? [], {
    originalBodySha256: sha256Body(original.body), paragraphs,
  });
  // Labels remain exactly Gemini's; their literal occurrences must survive edits.
  for (const link of links) assert(edited.body.some(p => p.includes(link.label)), 'An authored link label changed');
  const sources = original.sourceItems; assert(Array.isArray(sources) && sources.length >= 1 && sources.length <= MAX_SOURCE_REASONS);
  for (const s of sources) { assert.deepEqual(Object.keys(s).sort(),['label','reason','url']);pairs([s]); exactString(s.url,2048,'source URL');exactString(s.reason, 500, 'source reason'); assert(s.reason.split(/\s+/u).length <= 60); }
  const external = links.filter(p => new URL(p.url).hostname !== site.canonicalHost);
  assert.equal(new Set(external.map(p => p.url)).size, external.length, 'Duplicate external body URL');
  assert.equal(new Set(sources.map(p => p.url)).size, sources.length, 'Duplicate source URL');
  assert.deepEqual(external.map(p => p.url).sort(), sources.map(p => p.url).sort(), 'Own sources must cover external body links');
  if (input.expectedBodyUrls) assert.deepEqual(links.map(p => p.url), input.expectedBodyUrls, 'Authored URL order changed');
  assert.deepEqual(input.links, prior.links, 'Structural parents and labels cannot change');
  const suggestions = input.linkSuggestions ?? prior.linkSuggestions ?? [];
  for (const link of suggestions) {
    exactString(link.label, 160, 'suggestion label'); exactString(link.reason, 500, 'suggestion reason');
    assert(link.targetPageId !== prior.id && site.pages.some(p => p.id === link.targetPageId && p.status !== 'revoked'));
  }
  // This implementation optimizes ordinary KEEP/NOHERO pages. New assets/families
  // need a separately reviewed media change, never silently pass as known template.
  assert(['KEEP_EXACT', 'NOHERO'].includes(input.mediaPolicy), 'Unreviewed media change');
  const media = input.mediaPolicy === 'NOHERO' ? [] : copy(prior.media);
  const expanded=[];for(const item of media){const asset=site.assets.find(a=>a.id===item.id);assert(asset,'Missing media asset');const family=asset.groupId?site.assets.filter(a=>a.groupId===asset.groupId).sort((a,b)=>b.width-a.width):[asset];for(const a of family)if(!expanded.some(m=>m.id===a.id)){const{id,src,alt,width,height,credit,rights}=a;expanded.push({id,src,alt,width,height,credit,rights});}}assert.deepEqual(expanded,media,'Core media family normalization must be exact before intake');
  const patch = { title: exactString(original.title, 300, 'title'), description: exactString(original.description, 160, 'description'),
    intent: exactString(input.intent, 300, 'reader question'), body: edited.body.map(text => ({type:'paragraph',text:exactString(text,3000,'paragraph')})),
    externalLinks: sources.map(s => ({...s,verified:true})), links: copy(prior.links), linkSuggestions: copy(suggestions), media,
    factChecks: ['Private rewrite awaits actual desktop/mobile DOM verification. Publication paused.'] };
  return { pageId: prior.id, key: input.key, prior, patch, original, candidate, capture, review, input,
    audits: edited.audits, canonicalRevision: model.revisionHash({...prior,...patch}) };
}

export function assertPrivateSiteInvariant(before, after, allowedIds) {
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort(), 'Site fields changed');
  for (const k of Object.keys(before).filter(k => k !== 'pages')) assert.deepEqual(after[k], before[k], `Global site field changed: ${k}`);
  assert.deepEqual(after.pages.map(p => p.id), before.pages.map(p => p.id), 'Catalogue inventory changed');
  const mutable = new Set(['title','description','intent','body','externalLinks','linkSuggestions','media','factChecks','status','approval','updatedAt','editorialReview']);
  for (const prior of before.pages) {
    const page = after.pages.find(p => p.id === prior.id);
    if (!allowedIds.includes(page.id)) { assert.deepEqual(page, prior, 'Unrelated page changed'); continue; }
    for (const key of new Set([...Object.keys(prior),...Object.keys(page)])) if (!mutable.has(key)) assert.deepEqual(page[key], prior[key], `Protected page field changed: ${key}`);
    assert.deepEqual(page.links, prior.links, 'Catalogue parents/labels changed');
    assert.equal(page.status, 'review'); assert.equal(page.approval, null);
  }
}

export function validatePageDom(site, page, entry, origin, intakeAt) {
  assert.equal(entry.canonicalRevision, page.canonicalRevision); assert.deepEqual(entry.viewports.map(v => v.innerWidth), [1440,390]);
  for (const v of entry.viewports) {
    assert(Date.parse(v.at) >= Date.parse(intakeAt), 'Stale DOM'); assert.equal(v.url, `${origin}/preview/${site.id}/${page.id}`);
    assert.equal(v.innerHeight,1000); assert.equal(v.h1,page.title); assert.equal(v.description,page.description);
    assert.deepEqual(v.body,page.body.map(p=>p.text)); assert.deepEqual(v.sourceItems,page.externalLinks.map(({url,label,reason})=>({url,label,reason})));
    assert.equal(v.overflowX,0); assert(v.scrollWidth<=v.clientWidth); assert(v.dpr>=1);
    const internal=[...page.links]; for(const s of page.linkSuggestions??[])if(!internal.some(l=>l.targetPageId===s.targetPageId))internal.push(s);
    assert.deepEqual(v.orderedLinks,[{url:`mailto:${site.contact.email}`,label:'Teirautis el. paštu'},...internal.map(l=>({url:`${origin}/preview/${site.id}/${l.targetPageId}`,label:l.label})),...page.externalLinks.map(({url,label})=>({url,label}))]);
    assert.equal(v.images.length,page.media.length?1:0);
    for(const image of v.images){const asset=page.media.find(m=>image.currentSrc.endsWith('/'+m.id+'.webp'));assert(asset&&asset.alt===image.alt);assert(image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&image.width>0&&image.height>0);assert(Math.abs(image.width/image.height-image.naturalWidth/image.naturalHeight)<0.005);}
  }
  return true;
}

function checkpointCounts(cp, site, model, workflow, config) {
  const rows=Object.entries(cp.work).filter(([k])=>k.endsWith('WrittenDraft')),written=rows.length;
  assert.equal(new Set(rows.map(([,r])=>r.pageId)).size,written,'Duplicate written page rows');
  const reviewed=rows.filter(([,r])=>{const p=site.pages.find(p=>p.id===r.pageId);return p&&r.reviewed&&!r.layoutPending&&r.canonicalRevision===model.revisionHash(p)&&workflow.reviewCurrent(site,p,r.canonicalRevision);}).length;
  const remaining=config.inventory-config.legacyFullGuides-written;
  Object.assign(cp.work,{newWrittenDrafts:written,newGeminiResponses:written,newReviewedDrafts:reviewed,fullPrivateDraftsReviewed:reviewed,currentPrivateReviewPending:written-reviewed,remainingFullRewrites:remaining,remainingNativeBodiesToWrite:remaining,remainingDraftsToWrite:remaining,remainingDraftsToReview:remaining+written-reviewed,briefsPreparedForUnwrittenPages:config.prepared-written});
  cp.currentFactualPreparationState={...cp.currentFactualPreparationState,distinctPrepared:config.prepared,written,reviewed,uiPending:written-reviewed,future:config.prepared-written};
  cp.next=`${written} private drafts; ${reviewed} current reviews; publication paused.`; return cp;
}

/** One serial executor owns intake -> actual MCP DOM request -> finalize. The
 * caller supplies the official MCP bridge, not a headless/CDP/browser substitute.
 * An abandoned import lock is never stolen; inspect the single RESULT on restart. */
export function createPrivateImporter({model,workflow,registry,config,captureDom,refreshReaders,guardEpoch}) {
  for(const f of [captureDom,refreshReaders,guardEpoch])assert.equal(typeof f,'function','Real DOM/readers/protected-original guard ports required');
  assert.equal(config.publication,'paused_by_owner'); assert.equal(config.newPublicReleaseAllowed,false);
  for(const key of ['inventory','legacyFullGuides','prepared'])assert(Number.isInteger(config[key])&&config[key]>=0,'Invalid inventory count');
  return async function importPages(records,ctx={}) {
    assert(records.length>=1&&records.length<=3);assert.equal(new Set(records.map(r=>r.pageId)).size,records.length);assert.equal(new Set(records.map(r=>r.input.key)).size,records.length);await mkdir(config.outputDir,{recursive:true});
    const lockFile=config.sharedLockPath,lock=await open(lockFile,'wx'),token=randomUUID();
    await lock.writeFile(json({pid:process.pid,token,at:new Date().toISOString()}));
    let journal, resultPath, consolidated, touched=false;
    const save=async()=>{const i=consolidated.epochs.findIndex(e=>e.epochId===journal.epochId);if(i<0)consolidated.epochs.push(copy(journal));else consolidated.epochs[i]=copy(journal);await atomicJson(resultPath,consolidated);};
    try {
      const nativeBytes=await readFile(config.nativePath),checkpointBytes=await Promise.all(config.checkpoints.map(f=>readFile(f)));
      const before=JSON.parse(nativeBytes),cps=checkpointBytes.map(b=>JSON.parse(b));assert.deepEqual(await model.getSite(config.siteId),before,'Native changed while loading preimage');
      for(const cp of cps)assert(cp.work&&typeof cp.work==='object');
      const expected=new Map([[config.nativePath,sha(nativeBytes)],...config.checkpoints.map((f,i)=>[f,sha(checkpointBytes[i])])]);
      const cas=async()=>{assert(!ctx.signal?.aborted,'Owner paused importer; inspect recovery state');for(const[f,h]of expected)assert.equal(sha(await readFile(f)),h,'Concurrent writer: '+f);};
      const refresh=async f=>expected.set(f,sha(await readFile(f)));
      await guardEpoch({phase:'before',site:before}); await cas();
      const prepared=[],outcomes=[];
      for(const record of records)try{
        const p=prepareReviewedPage(record,before,model);
        assert(/WrittenDraft$/.test(p.key));for(const cp of cps)assert(!cp.work[p.key]&&!Object.entries(cp.work).some(([k,v])=>k.endsWith('WrittenDraft')&&v.pageId===p.pageId),'Already imported; do not repeat');
        for(const pin of [p.capture.captureRef,p.candidate.promptRef,p.input.factsRef,p.candidate.modelProofRef])await verifyPin(pin);
        assert.deepEqual(p.candidate.captureSelection.pages.find(x=>x.pageId===p.pageId),p.input.capturePage);
        const raw=await read(p.capture.captureRef.path),parsed=selectCapturedPages(raw,p.candidate.captureSelection),actual=parsed.outcomes.find(o=>o.pageId===p.pageId);
        assert.equal(actual?.status,'captured','Own actual rendered page not captured');assert.deepEqual(actual.candidate.original,p.original);assert.deepEqual(actual.candidate.orderedBodyLinks,p.candidate.orderedBodyLinks);
        const facts=await read(p.input.factsRef.path);assert.equal(facts.pageId,p.pageId,'Facts belong to another page');
        assert.deepEqual(facts.originalCanonical,p.input.originalCanonical);assert(facts.sourceReview?.wholeDocumentsRead&&facts.sourceReview?.reviewer,'Saved primary sources must actually have been read');
        const proof=await read(p.candidate.modelProofRef.path);assert.equal(proof.proofs?.length,2);assert.deepEqual(proof.proofs.map(p=>p.stage),['PRE','POST']);
        for(const stage of proof.proofs){validateGeminiProof(stage,{expectedAccount:p.candidate.identity.email},p.candidate.conversationUrl,Date.parse(stage.at));for(const pin of stage.artifacts??[])await verifyPin(pin);assert(stage.artifacts?.length>=3,'Actual AX/DOM/PNG artifacts required');}
        assert.match(p.candidate.identity.accountPath,/^\/u\/[2-6]$/);assert.equal(p.candidate.identity.modelUi,'4 Argon');assert(['Low','Žema'].includes(p.candidate.identity.thinkingUi));assert.equal(p.candidate.identity.backendModelId,null);
        assert.equal(proof.proofs[0].accountPath,p.candidate.identity.accountPath);assert.equal(proof.proofs[1].accountPath,p.candidate.identity.accountPath);
        prepared.push(p);
      }catch(error){outcomes.push({pageId:record.pageId,status:'failed',error:error.message});}
      if(!prepared.length)return{outcomes};
      const epochId=randomUUID();resultPath=path.join(config.outputDir,'RESULT.json');
      try{consolidated=await read(resultPath);assert(Array.isArray(consolidated.epochs));}catch(error){if(error.code!=='ENOENT')throw error;consolidated={version:1,publication:'paused_by_owner',epochs:[]};}
      assert(consolidated.epochs.every(e=>['COMPLETE','PARTIAL'].includes(e.status)),'Previous native epoch requires inspection; never replay');
      journal={version:1,epochId,status:'INTAKE',publication:'paused_by_owner',startedAt:new Date().toISOString(),before:{pins:[...expected].map(([path,sha256])=>({path,sha256})),pages:prepared.map(p=>p.prior)},pages:[],outcomes};await save();
      const ids=[],assertSite=async()=>{await cas();const s=await model.getSite(config.siteId);assertPrivateSiteInvariant(before,s,ids);return s;};
      for(const p of prepared){
        await cas();journal.pages.push({pageId:p.pageId,canonicalRevision:p.canonicalRevision,status:'INTAKE_ATTEMPTED'});await save();touched=true;
        const page=await model.editPage(config.siteId,p.pageId,p.patch);await refresh(config.nativePath);assert.equal(model.revisionHash(page),p.canonicalRevision);for(const[k,v]of Object.entries(p.patch))assert.deepEqual(page[k],v,'Core normalized authored text');
        ids.push(p.pageId);
        const file=path.join(path.dirname(resultPath),p.pageId+'-'+p.canonicalRevision+'.json');
        const evidence={...page,originalGemini:p.original,boundedEdits:p.audits,wholeTextReview:p.review,raw:p.capture.captureRef,facts:p.input.factsRef,orderedBodyLinks:p.candidate.orderedBodyLinks,evidenceAt:new Date().toISOString()};
        await writeFile(file,json(evidence),{flag:'wx',flush:true});
        await registry.recordTextProvenance(config.siteId,p.pageId,{revisionHash:p.canonicalRevision,primaryWriter:'gemini',authoringMode:p.audits.length?'gemini_with_codex_text_edits':'gemini_with_codex_review',provider:'Google Gemini web',...p.candidate.identity,modelEvidence:{kind:'ui_selected_mode',artifact:p.candidate.modelProofRef.path,limitation:'Actual captured account and selected UI model; backend unknown. Rendered DOM, not clipboard Copy.'},contributions:p.audits.map(a=>({writer:'codex',excerpt:page.body[a.paragraphIndex].text,role:'Bounded paragraph language correction',evidence:file})),jobId:ctx.runId+'-'+p.pageId,promptVersion:'rewrite-pipeline-v1',conversationUrl:p.candidate.conversationUrl,authoredAt:p.candidate.authoredAt,reviewer:p.review.reviewer,codexRole:p.audits.length?'Exact bounded edits and factual/language review, all diffs retained.':'Factual/language review; no body or reason words changed.',lineage:[p.input.originalCanonical],artifacts:{prompt:p.candidate.promptRef.path,rawResponse:p.capture.captureRef.path,inputEvidence:file,finalSource:file,modelEvidence:p.candidate.modelProofRef.path}});
        for(const cp of cps)cp.work[p.key]={pageId:p.pageId,canonicalRevision:p.canonicalRevision,source:file,intake:resultPath,currentBrief:p.input.factsRef.path,actualAccount:p.candidate.identity.accountPath,reviewed:false,layoutPending:true,approved:false,disposition:'PRIVATE_REWRITE_DOM_PENDING'};
        journal.pages.at(-1).status='INTAKE_CONFIRMED';await save();await assertSite();
      }
      let current=await assertSite();for(let i=0;i<cps.length;i++){await cas();await atomicJson(config.checkpoints[i],checkpointCounts(cps[i],current,model,workflow,config));await refresh(config.checkpoints[i]);}
      journal.status='DOM_PENDING';journal.intakeAt=new Date().toISOString();await save();
      const nativeInput={path:config.nativePath,sha256:expected.get(config.nativePath)};
      const dom=await captureDom({pages:prepared.map(p=>({pageId:p.pageId,canonicalRevision:p.canonicalRevision,url:`${config.previewOrigin}/preview/${config.siteId}/${p.pageId}`})),nativeInput,errorScreenshotPrefix:path.join(path.dirname(resultPath),'error'),visualTemplateReference:config.visualTemplateReference},ctx);
      assert.deepEqual(dom.nativeInput,nativeInput);journal.dom=dom;await save();
      for(const p of prepared){
        try{
          const page=current.pages.find(x=>x.id===p.pageId),entry=dom.pages.find(x=>x.pageId===p.pageId);
          assert(entry,'Actual desktop/mobile DOM missing');validatePageDom(current,{...page,canonicalRevision:p.canonicalRevision},entry,config.previewOrigin,journal.intakeAt);
          const evidence=p.review.evidence;for(const area of workflow.REVIEW_AREAS)exactString(evidence?.[area],4000,'review evidence '+area);
        }catch(error){outcomes.push({pageId:p.pageId,status:'failed',error:error.message});continue;}
          await cas();await model.editPage(config.siteId,p.pageId,{factChecks:[]});await refresh(config.nativePath);
          const s=await assertSite(),final=s.pages.find(x=>x.id===p.pageId);
          const input={reviewer:p.review.reviewer,revisionHash:p.canonicalRevision,expectedBinding:workflow.reviewBinding(s,final,p.canonicalRevision),evidence:p.review.evidence};
          await model.recordEditorialReview(config.siteId,p.pageId,input);await refresh(config.nativePath);current=await assertSite();
          const reviewed=current.pages.find(x=>x.id===p.pageId);assert(workflow.reviewCurrent(current,reviewed,p.canonicalRevision));
          for(const cp of cps)Object.assign(cp.work[p.key],{reviewed:true,layoutPending:false,currentNormalReviewBinding:reviewed.editorialReview.binding,review:resultPath,disposition:'PRIVATE_REWRITE_CURRENT_REVIEWED'});
          outcomes.push({pageId:p.pageId,status:'complete',receipt:{officialCurrentReview:true,cpTesExact:true,canonicalRevision:p.canonicalRevision,domWidths:[1440,390],resultPath}});
        for(let i=0;i<cps.length;i++){await cas();await atomicJson(config.checkpoints[i],checkpointCounts(cps[i],current,model,workflow,config));await refresh(config.checkpoints[i]);}
      }
      await guardEpoch({phase:'after',site:current});await cas();
      const complete=outcomes.filter(o=>o.status==='complete');if(complete.length)await refreshReaders({pageIds:complete.map(o=>o.pageId),nativeInput:{path:config.nativePath,sha256:expected.get(config.nativePath)},checkpoints:config.checkpoints},ctx);
      await cas();journal.status=outcomes.every(o=>o.status==='complete')?'COMPLETE':'PARTIAL';journal.outcomes=outcomes;journal.completedAt=new Date().toISOString();await save();return{outcomes};
    }catch(error){if(journal){journal.status='NEEDS_INSPECTION';journal.error=error.message;await save();}throw error;}
    finally{
      await lock.close();
      // A failed native epoch retains its lock and recovery RESULT. Never steal it.
      if(!touched||journal?.status==='COMPLETE'||journal?.status==='PARTIAL'){const owner=await read(lockFile);assert.equal(owner.token,token);await unlink(lockFile);}
    }
  };
}
