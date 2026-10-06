import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const data=await mkdtemp(path.join(os.tmpdir(),'studio-plan-reconcile-'));
process.env.STUDIO_DATA_DIR=data;
const model=await import('../src/model.mjs');
await model.initialize();
const digest=s=>createHash('sha256').update(model.stable(s)).digest('hex');
async function fixture(host){
 const site=await model.createSite({canonicalHost:host,name:'Reconciliation test',offer:'Test only',schemaVersion:2});
 const a=await model.addPage(site.id,{id:'root',slug:'gidai/root',type:'guide',title:'Root',description:'Root',intent:'Root',body:[{type:'paragraph',text:'A preserved written article.'}]});
 const b=await model.addPage(site.id,{id:'duplicate',slug:'gidai/duplicate',type:'guide',title:'Duplicate',description:'Duplicate',intent:'Duplicate'});
 const c=await model.addPage(site.id,{id:'support',slug:'gidai/support',type:'guide',title:'Support',description:'Support',intent:'Support'});
 const current=await model.getSite(site.id);
 const request={canonicalHost:current.canonicalHost,locale:current.locale,expectedSiteHash:digest(current),sourcePlanSha256:'a'.repeat(64),skillFingerprint:'b'.repeat(64),coverageTarget:2,updates:[{pageId:a.id,slug:a.slug,brief:{outline:['Root','Merged answer'],media:{subject:'Original illustration'}},linkSuggestions:[{targetPageId:c.id,label:'Support',reason:'Useful next answer'}]},{pageId:c.id,slug:c.slug,brief:{outline:['Support'],ownership:{role:'article'}},pillarPageId:a.id,metadata:{title:'Updated support'},linkSuggestions:[{targetPageId:a.id,label:'Root',reason:'Broader answer'}]}],retire:[{pageId:b.id,targetPageId:a.id,reason:'Same reader job; merged answer.'}]};
 return {site:current,a,b,c,request};
}
test('atomic reconciliation archives UUID/history and preserves written V2 revision/date/media',async()=>{
 const f=await fixture('plan-ok.lt'),hash=model.revisionHash(f.a);
 const receipt=await model.reconcilePrivatePlan(f.site.id,f.request),after=await model.getSite(f.site.id);
 assert.equal(after.pages.length,2);assert.equal(after.contentPolicy.coverageTarget,2);
 assert.equal(after.retiredPlans.length,1);assert.deepEqual(after.retiredPlans[0].page,f.b);assert.equal(after.retiredPlans[0].targetPageId,f.a.id);
 const a=after.pages.find(p=>p.id===f.a.id);assert.equal(model.revisionHash(a),hash);assert.equal(a.publishAt,f.a.publishAt);assert.equal(a.approval,null);assert.equal(a.planningBrief.data.outline[1],'Merged answer');
 assert.equal(after.pages.find(p=>p.id===f.c.id).title,'Updated support');assert.equal(receipt.newGeneration,false);assert.equal(receipt.protectedHashes[0].revisionHash,hash);
 assert.ok(!JSON.stringify(model.revisionPayload(a)).includes('planningBrief'));assert.ok(after.pages.every(p=>!p.publishedRevision&&!p.approval));assert.throws(()=>model.packageForSite(after),/Invalid content v2/);
 const bytes=await readFile(path.join(data,'sites',f.site.id+'.json'),'utf8');const repeated=await model.reconcilePrivatePlan(f.site.id,f.request);
 assert.equal(repeated.replayed,true);assert.equal(repeated.id,receipt.id);assert.equal(await readFile(path.join(data,'sites',f.site.id+'.json'),'utf8'),bytes);
 const other=await fixture('unrelated-site.lt'),otherBytes=await readFile(path.join(data,'sites',other.site.id+'.json'),'utf8');
 await model.reconcilePrivatePlan(f.site.id,f.request);assert.equal(await readFile(path.join(data,'sites',other.site.id+'.json'),'utf8'),otherBytes);
});
test('stale snapshots and active jobs fail without any site mutation',async()=>{
 const f=await fixture('plan-job.lt'),job=await model.createJob('draft',f.site.id,f.c.id),before=await readFile(path.join(data,'sites',f.site.id+'.json'),'utf8');
 await assert.rejects(model.reconcilePrivatePlan(f.site.id,f.request),/active site job/);assert.equal(await readFile(path.join(data,'sites',f.site.id+'.json'),'utf8'),before);
 await model.updateJob(job.id,{status:'complete'});await model.editPage(f.site.id,f.c.id,{title:'Concurrent edit'});
 await assert.rejects(model.reconcilePrivatePlan(f.site.id,f.request),/site changed/);
});
test('written retirement, protected edits and references cannot be lost',async()=>{
 const f=await fixture('plan-guard.lt');
 f.request.updates[0].metadata={title:'Must not overwrite written article'};
 await assert.rejects(model.reconcilePrivatePlan(f.site.id,f.request),/written\/approved/);delete f.request.updates[0].metadata;
 await model.editPage(f.site.id,f.b.id,{body:[{type:'paragraph',text:'New written content'}]});f.request.expectedSiteHash=digest(await model.getSite(f.site.id));
 await assert.rejects(model.reconcilePrivatePlan(f.site.id,f.request),/unwritten, unapproved/);
 const g=await fixture('plan-reference.lt');await model.editPage(g.site.id,g.a.id,{links:[{targetPageId:g.b.id,label:'Existing content link'}]});g.request.expectedSiteHash=digest(await model.getSite(g.site.id));
 await assert.rejects(model.reconcilePrivatePlan(g.site.id,g.request),/references a retired page/);
 const h=await fixture('plan-cycle.lt');h.request.updates[0].pillarPageId=h.c.id;const before=await readFile(path.join(data,'sites',h.site.id+'.json'),'utf8');
 await assert.rejects(model.reconcilePrivatePlan(h.site.id,h.request),/pillar cycle/);assert.equal(await readFile(path.join(data,'sites',h.site.id+'.json'),'utf8'),before);
});
test('real shared draft prompt carries merged private evidence/media/links without generation',async()=>{
 const f=await fixture('plan-prompt.lt');
 f.request.updates[0].brief={outline:['Original answer','Merged preparation system'],sourceIds:['S-one','S-merged'],originalContribution:'Merged worked example with unknown-system option',media:{subject:'Original state card'},mergedMediaBriefs:[{oldId:'duplicate',media:{subject:'System handoff card'}}],ownership:{role:'informational article'},plannedLinks:[{targetPageId:f.c.id,reason:'Next useful answer'}]};
 await model.reconcilePrivatePlan(f.site.id,f.request);
 const after=await model.getSite(f.site.id),page=after.pages.find(p=>p.id===f.a.id);
 const {draftPageData,enqueue}=await import('../src/generator.mjs');
 const {loadEditorialSkill,buildEditorialPrompt}=await import('../src/editorial-skill.mjs');
 const prompt=buildEditorialPrompt(await loadEditorialSkill('draft'),{mode:'draft',instruction:'Validation only; no generation.',siteData:{id:after.id,domain:after.canonicalHost,locale:after.locale},pageData:draftPageData(after,page)});
 for(const text of ['Merged preparation system','S-merged','unknown-system option','System handoff card','informational article',f.c.id])assert.ok(prompt.includes(text));
 const beforeJobs=(await model.listJobs()).length;
 await assert.rejects(enqueue('autopilot',after.id,null),/V2 generavimo kontraktas/);assert.equal((await model.listJobs()).length,beforeJobs);
});
test('approved retained revision/approval remain byte-equivalent when only its private brief changes',async()=>{
 const f=await fixture('plan-approved.lt');await model.editSite(f.site.id,{facts:'Test business facts only.'});
 await model.editPage(f.site.id,f.a.id,{body:[{type:'paragraph',text:'A test-only approved article with enough factual explanation for the existing validation contract. No real offer or provider is asserted by this fixture.'}],editorial:{...f.a.editorial,authors:[{id:'test-editor',siteId:f.site.id,locale:f.site.locale,slug:'redakcija',name:'Test editorial organization',role:'Test author',bio:'Test-only author snapshot, not a claim about a real provider.',kind:'organization',sameAs:[]}]}});
 const approved=await model.approvePage(f.site.id,f.a.id,'test-editor');const site=await model.getSite(f.site.id);f.request.expectedSiteHash=digest(site);
 const result=await model.reconcilePrivatePlan(f.site.id,f.request),a=(await model.getSite(f.site.id)).pages.find(p=>p.id===f.a.id);
 assert.deepEqual(a.approval,approved.approval);assert.deepEqual(a.publishedRevision,approved.publishedRevision);assert.equal(model.revisionHash(a),approved.revisionHash);assert.equal(result.protectedHashes.length,1);
});
