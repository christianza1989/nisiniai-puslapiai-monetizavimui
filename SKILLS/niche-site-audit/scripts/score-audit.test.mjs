import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreAudit} from './score-audit.mjs';
import {auditSkeleton,initializeAudit} from './init-audit.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const catalog=[{id:'A1',stage:'local',gate:true},{id:'A2',stage:'local',gate:false},{id:'B1',stage:'launch',gate:true}];
const records=()=>[{id:'A1',status:'PASS',evidence:['tested form']},{id:'A2',status:'PASS',evidence:['actual screenshot']},{id:'B1',status:'UNVERIFIED',evidence:[]}];
test('perfect local preparation never hides unverified production readiness',()=>{
 const r=scoreAudit({checks:records()},catalog); assert.equal(r.stages.local.score,10);assert.equal(r.stages.launch.gateReady,false);assert.equal(r.stages.launch.score,0);
});
test('omitted, duplicated and unsupported PASS records cannot inflate scores',()=>{
 assert.throws(()=>scoreAudit({checks:records().slice(0,2)},catalog),/Missing/);
 assert.throws(()=>scoreAudit({checks:[...records(),records()[0]]},catalog),/duplicate/);
 const r=records();r[0].evidence=[];assert.throws(()=>scoreAudit({checks:r},catalog),/without evidence/);
});
test('unverified review counts zero; all NA does not manufacture readiness',()=>{
 const r=records();r[1].status='UNVERIFIED';assert.equal(scoreAudit({checks:r},catalog).stages.local.score,5);
 for(const x of r){x.status='NA';x.notes='Actually outside this product scope';}
 assert.equal(scoreAudit({checks:r},catalog).stages.local.score,null);assert.equal(scoreAudit({checks:r},catalog).stages.local.perfect,false);
});

test('a new audit begins entirely unverified and rejects ambiguous site identity',()=>{
 const r=auditSkeleton('sample-site','sample-site.lt',catalog);
 assert.equal(r.evaluatedAt,null);assert.equal(r.checks.length,catalog.length);
 assert.ok(r.checks.every(c=>c.status==='UNVERIFIED'&&c.evidence.length===0));
 assert.equal(scoreAudit(r,catalog).stages.local.score,0);
 assert.throws(()=>auditSkeleton('../other','sample.lt',catalog),/siteId/);
 assert.throws(()=>auditSkeleton('sample-site','https://sample.lt/path',catalog),/canonical/);
});

test('initializer includes the full catalog and never overwrites an existing review',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'niche-audit-init-'));
 try{
  const result=await initializeAudit(root,'sample-site','sample-site.lt');
  const json=await readFile(result.json,'utf8'),r=JSON.parse(json),md=await readFile(result.md,'utf8');
  assert.equal(result.criteria,85);assert.equal(r.checks.length,85);assert.ok(r.checks.every(c=>c.status==='UNVERIFIED'));
  assert.ok(md.includes('R2 · UNVERIFIED'));assert.ok(md.includes('Z3 · UNVERIFIED'));
  await assert.rejects(()=>initializeAudit(root,'sample-site','sample-site.lt'),/Existing audit preserved/);
  assert.equal(await readFile(result.json,'utf8'),json);
 }finally{
  const resolved=path.resolve(root);
  assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('niche-audit-init-'));
  await rm(resolved,{recursive:true,force:true});
 }
});
