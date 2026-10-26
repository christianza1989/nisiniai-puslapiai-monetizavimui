import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('./stage-chair-technical-draft.mjs',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});const bytes=Buffer.from(typeof value==='string'?value:JSON.stringify(value));await fs.writeFile(file,bytes);return hash(bytes);};
async function fixture(){
 const base=await fs.mkdtemp('D:/Core/output/ergonomic-stage-scope-test-'),root=path.join(base,'root'),web=path.join(base,'web'),stage=path.join(base,'stage');
 const old={acceptance:'TECHNICAL_DRAFT',runtime:{asset:'/preserved.json',sha256:'prior'},proofs:{sourceGeometryRuntime:'prior'},key:'existing'};
 const key='new',job='new-job',code='KNEW001WW001',asset=code+'-0123456789abcdef0123.glb';
 const runtime={family:{id:'family',productId:'product-new',sample:'sample-new',baseArticle:code,collectionMode:'structure-only',anchors:[{geometry:{asset:'/models/configurator/structure/'+asset,assetSha256:hash('original-geometry')},choices:{OPTION:['A','B']}}]}};
 const artifacts={};
 for(const [name,value] of Object.entries({'runtime.json':runtime,'GEOMETRY-PBR-PROOF.json':{result:'PASS'},'RUNTIME-PROOF.json':{result:'PASS',states:1,transitions:1},['assets/'+asset]:'original-geometry'}))artifacts[name]=await save(path.join(root,'prepared',job,name),value);
 const cpSha=await save(path.join(root,'capture-v2/source',job,'CHECKPOINT.json'),{states:{initial:{}},edges:[{}]});
 await save(path.join(root,'capture-v2/source',job,'RESULT.json'),{graph:{closed:true},stopReason:null});
 const rows=[{job:'existing-job',result:'PASS_SOURCE_GEOMETRY_RUNTIME_ONLY',checkpointSha256:'nonexistent-old-prepared-is-never-read'},{job,code,result:'PASS_SOURCE_GEOMETRY_RUNTIME_ONLY',checkpointSha256:cpSha,artifacts,tools:{proof:'unchanged'},wire:{proof:'full'}}];
 await save(path.join(root,'prepared/OFFLINE-STATUS.json'),{rows});
 await save(path.join(root,'capture-v2/SOURCE-QUEUE.json'),{completedSource:['existing-job',job]});
 await save(path.join(root,'INVENTORY.json'),{queue:[{job:'existing-job',modelKeys:['existing']},{job,code,modelKeys:[key]}]});
 await save(path.join(web,'content/admin-source-status.json'),{models:[{key:'existing',active:true,categorySlug:'kedes',productId:'product-old',configurationId:'sample-old',path:'/old/'},{key,active:true,categorySlug:'kedes',productId:'product-new',configurationId:'sample-new',path:'/new/'}]});
 await save(path.join(web,'content/chair-structure-candidates.json'),{schemaVersion:1,models:{existing:old}});
 return {root,web,stage,old,job,rows};
}
function run(f,jobs,extra=[]){return spawnSync(process.execPath,[script,'--root='+f.root,'--stage='+f.stage,...(jobs===undefined?[]:['--jobs='+jobs]),...extra],{cwd:f.web,encoding:'utf8'});}
test('selected new job preserves the existing technical draft without reading its missing local artifacts',async()=>{
 const f=await fixture(),v=run(f,f.job);assert.equal(v.status,0,v.stderr);
 const manifest=JSON.parse(await fs.readFile(path.join(f.stage,'chair-structure-candidates.json'),'utf8'));
 assert.deepEqual(manifest.models.existing,f.old);assert.equal(manifest.models.new.acceptance,'TECHNICAL_DRAFT');
 const report=JSON.parse(await fs.readFile(path.join(f.stage,'REPORT.json'),'utf8'));assert.deepEqual(report.models.map(x=>x.job),[f.job]);
});
test('selected changed artifact is still rejected by the complete SHA gate',async()=>{
 const f=await fixture();await fs.appendFile(path.join(f.root,'prepared',f.job,'runtime.json'),'corrupt');
 const v=run(f,f.job);assert.notEqual(v.status,0);assert.match(v.stderr,/Changed acceptance artifact runtime.json/);
});
test('unknown job and selected job without full offline PASS are rejected before staging',async()=>{
 const f=await fixture();assert.notEqual(run(f,'unknown').status,0);
 f.rows[1].result='REVIEW_REQUIRED';await save(path.join(f.root,'prepared/OFFLINE-STATUS.json'),{rows:f.rows});
 const v=run(f,f.job);assert.notEqual(v.status,0);assert.match(v.stderr,/Selected job lacks full offline PASS/);
 await assert.rejects(fs.access(f.stage));
});
test('omitting the filter retains the legacy all-rows validation path',async()=>{
 const f=await fixture(),v=run(f);assert.notEqual(v.status,0);assert.match(v.stderr,/existing-job/);
});

test('the owner065 table codec cannot opt in any other job or unknown encoding',async()=>{
 const f=await fixture();
 const other=run(f,f.job,['--transport=tables-v1']);assert.notEqual(other.status,0);assert.match(other.stderr,/admitted only/);
 const unknown=run(f,f.job,['--transport=unknown']);assert.notEqual(unknown.status,0);assert.match(unknown.stderr,/Unknown runtime transport/);
 await assert.rejects(fs.access(f.stage));
});

test('runtime publication accepts 15000000 bytes and defers 15000001 after accepted v1 packing',async()=>{
 for(const size of [15_000_000,15_000_001]){
  const f=await fixture(),file=path.join(f.root,'prepared',f.job,'runtime.json');
  const runtime=JSON.parse(await fs.readFile(file,'utf8'));
  Object.assign(runtime.family.anchors[0],{components:[],profiles:[],defaults:{},classes:{}});
  runtime.padding='';runtime.padding='x'.repeat(size-Buffer.byteLength(JSON.stringify(runtime)));
  const sha=await save(file,runtime);assert.equal((await fs.stat(file)).size,size);
  f.rows[1].artifacts['runtime.json']=sha;await save(path.join(f.root,'prepared/OFFLINE-STATUS.json'),{rows:f.rows});
  const v=run(f,f.job);
  if(size===15_000_000){
   assert.equal(v.status,0,v.stderr);
   const report=JSON.parse(await fs.readFile(path.join(f.stage,'REPORT.json'),'utf8'));
   assert.equal(report.models[0].runtimeTransport.packedBytes,size);
   assert.equal(report.models[0].runtimeTransport.limitBytes,15_000_000);
  }else{
   assert.notEqual(v.status,0);await assert.rejects(fs.access(path.join(f.stage,'chair-structure-candidates.json')));
  }
 }
});
