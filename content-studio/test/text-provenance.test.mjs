import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {v2Fixture} from './fixtures/v2.mjs';
const parent=path.resolve(import.meta.dirname,'../output/provenance-tests');await mkdir(parent,{recursive:true});
const fixture=await mkdtemp(path.join(parent,'run-'));process.env.STUDIO_DATA_DIR=path.join(fixture,'data');
const model=await import('../src/model.mjs'),api=await import('../src/text-provenance.mjs');
await mkdir(path.join(process.env.STUDIO_DATA_DIR,'sites'),{recursive:true});
const prose='A synthetic Gemini sentence. A synthetic Codex contribution.';
const make=(id,slug)=>({id,siteId:'fixture',type:'service',slug,title:'Synthetic',description:'Synthetic test',intent:'Fixture',body:[{type:'paragraph',text:prose}],publishAt:'2026-10-01T00:00:00Z',media:[],links:[]});
let site={id:'fixture',name:'Fixture',canonicalHost:'fixture.example',locale:'lt-LT',timezone:'Europe/Vilnius',pages:[make('page-one','one'),make('page-two','two'),make('page-three','three')],assets:[]};
const save=()=>writeFile(path.join(process.env.STUDIO_DATA_DIR,'sites/fixture.json'),JSON.stringify(site));await save();
const artifacts={};for(const kind of ['prompt','inputEvidence','rawResponse','finalSource','modelEvidence']){artifacts[kind]=path.join(fixture,kind+'.txt');await writeFile(artifacts[kind],kind+' synthetic evidence');}
const known=(page,extra={})=>({revisionHash:model.revisionHash(page),primaryWriter:'gemini',authoringMode:'gemini_with_codex_review',provider:'google',modelUi:'Synthetic UI',thinkingUi:'Synthetic level',modelEvidence:{kind:'ui_selected_mode',artifact:artifacts.modelEvidence,limitation:'Synthetic test; not a real UI observation or backend identity'},jobId:'synthetic-job',promptVersion:'fixture-v1',reviewer:'fixture-reviewer',codexRole:'Test review only',artifacts,...extra});
test.after(async()=>{assert.ok(fixture.startsWith(parent+path.sep));await rm(fixture,{recursive:true,force:true});});
test('records exact revision, snapshots original artifacts, keeps review separate and exports no sidecar',async()=>{
 const before=await readFile(path.join(process.env.STUDIO_DATA_DIR,'sites/fixture.json'));
 const r=await api.recordTextProvenance('fixture','page-one',known(site.pages[0]));assert.equal(r.backendModelId,null);assert.equal(r.originClass,'gemini');
 assert.deepEqual(await api.recordTextProvenance('fixture','page-one',known(site.pages[0])),r);
 assert.deepEqual(await readFile(path.join(process.env.STUDIO_DATA_DIR,'sites/fixture.json')),before);
 const p=site.pages[0];p.revisionHash=model.revisionHash(p);p.approval={status:'approved',revisionHash:p.revisionHash};p.publishedRevision={...model.revisionPayload(p),id:p.id,revisionHash:p.revisionHash,approval:p.approval};await save();
 assert.ok(!JSON.stringify(model.packageForSite(site)).includes('modelUi'));assert.ok(!JSON.stringify(model.packageForSite(site)).includes('text-provenance'));
 await writeFile(artifacts.rawResponse,'changed original path');assert.equal((await api.verifyTextProvenance('fixture')).records,1,'stored evidence retains original bytes');
});
test('filters Gemini-primary, Codex-only, mixed contributions and observed UI model',async()=>{
 await api.recordTextProvenance('fixture','page-two',known(site.pages[1],{authoringMode:'gemini_with_codex_text_edits',contributions:[{writer:'codex',excerpt:'A synthetic Codex contribution.',role:'Test text edit',evidence:'Synthetic author record'}]}));
 await api.recordTextProvenance('fixture','page-three',known(site.pages[2],{primaryWriter:'codex',authoringMode:'codex_only',provider:'openai',modelUi:null,thinkingUi:null,modelEvidence:{kind:'unknown',limitation:'Test model unknown'}}));
 assert.equal((await api.listTextProvenance('fixture',{primaryWriter:'gemini'})).length,2);
 assert.equal((await api.listTextProvenance('fixture',{primaryWriter:'codex'})).length,1);
 assert.equal((await api.listTextProvenance('fixture',{originClass:'mixed'})).length,1);
 assert.equal((await api.listTextProvenance('fixture',{modelUi:'Synthetic UI'})).length,2);
});
test('rejects stale revisions, false review-only attribution, missing segments and invented backend identity',async()=>{
 const p=site.pages[1];await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{revisionHash:'f'.repeat(64)})),/revision/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{backendModelId:'fabricated'})),/backend/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{authoringMode:'gemini_with_codex_text_edits'})),/segments/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{contributions:[{writer:'codex',excerpt:'not present',role:'Edit',evidence:'Test'}]})),/exact final text/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{contributions:[{writer:'codex',excerpt:'A synthetic Codex contribution.',role:'Edit',evidence:'Test'}]})),/Review alone/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{promptVersion:null})),/prompt version/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{jobId:null})),/Invalid.*text/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{primaryWriter:'codex',authoringMode:'codex_only',contributions:[{writer:'gemini',excerpt:'A synthetic Gemini sentence.',role:'Writing',evidence:'Test'}]})),/Codex-only/);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{primaryWriter:'mixed',authoringMode:'mixed'})),/both writer/);
});
test('preserves lineage and filters current revisions without rewriting history',async()=>{
 const p=site.pages[0],previous=model.revisionHash(p);p.body=[{type:'paragraph',text:'Revised synthetic text.'}];await save();
 await api.recordTextProvenance('fixture',p.id,known(p,{lineage:[previous]}));
 assert.equal((await api.listTextProvenance('fixture',{pageId:p.id})).length,2);
 assert.equal((await api.listTextProvenance('fixture',{pageId:p.id,currentOnly:true})).length,1);
 await assert.rejects(api.recordTextProvenance('fixture',p.id,known(p,{jobId:'changed-job'})),/Immutable/);
});
test('unknown legacy provenance does not infer a writer/model and cannot traverse paths',async()=>{
 const p=site.pages[0];p.body=[{type:'paragraph',text:'Another legacy revision.'}];await save();
 const input={revisionHash:model.revisionHash(p),primaryWriter:'unknown',authoringMode:'legacy_unknown',reviewer:'fixture',codexRole:'Archiving only'};
 const r=await api.recordTextProvenance('fixture',p.id,input);assert.equal(r.modelUi,null);assert.equal(r.primaryWriter,'unknown');
 await assert.rejects(api.recordTextProvenance('fixture',p.id,{...input,provider:'google'}),/Unknown legacy/);
 await assert.rejects(api.listTextProvenance('../escape'),/Invalid/);
 await assert.rejects(api.listTextProvenance('fixture',{authoringMode:'invalid'}),/Unknown.*filter/);
});
test('detects tampered historical text hash even when artifacts have not changed',async()=>{
 const records=await api.listTextProvenance('fixture');const record=records[0];
 const file=path.join(process.env.STUDIO_DATA_DIR,'text-provenance/fixture',record.pageId,record.revisionHash+'.json');
 const original=await readFile(file);await writeFile(file,JSON.stringify({...record,finalTextHash:'f'.repeat(64)}));
 await assert.rejects(api.verifyTextProvenance('fixture'),/snapshot integrity/);await writeFile(file,original);
 assert.equal((await api.verifyTextProvenance('fixture')).records,records.length);
});
test('preserves native V2 rich revision payloads and stays outside their public package',async()=>{
 const pkg=v2Fixture(),siteV2={...pkg.site,schemaVersion:2,pages:pkg.pages.map(p=>({...p,publishedRevision:structuredClone(p)})),assets:[]};
 await writeFile(path.join(process.env.STUDIO_DATA_DIR,'sites/v2-fixture.json'),JSON.stringify(siteV2));
 const p=siteV2.pages[1],record=await api.recordTextProvenance('v2-fixture',p.id,known(p));
 assert.equal(record.revisionHash,model.revisionHash(p));
 assert.equal(record.finalTextHash,api.textHash(api.pageText(p)));
 assert.equal((await api.verifyTextProvenance('v2-fixture')).records,1);
 assert.ok(!JSON.stringify(model.packageForSite(siteV2)).includes('modelUi'));
 assert.deepEqual(model.packageForSite(siteV2).pages,pkg.pages);
});
