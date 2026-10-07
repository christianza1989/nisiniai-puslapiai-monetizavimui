import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {catalogFromMarkdown} from './score-audit.mjs';
import {articleExpectations,verifySiteCompletion,verifyDiscoveryOutputs,verifierResponse,sourceBindingIssues} from './verify-site-completion.mjs';
import {createServer} from 'node:http';

test('a nonempty source version cannot substitute for the exact inspected source fingerprint',()=>{
  const audit={version:{sourceVersion:'a real commit',sourceFingerprint:'a'.repeat(64)}};
  assert.deepEqual(sourceBindingIssues(audit,{fingerprint:'a'.repeat(64)}),[]);
  assert.deepEqual(sourceBindingIssues(audit,{fingerprint:'b'.repeat(64)}),['AUDIT_SOURCE_FINGERPRINT_MISMATCH']);
  assert.deepEqual(sourceBindingIssues({version:{sourceVersion:'a real commit'}},{fingerprint:'a'.repeat(64)}),['AUDIT_SOURCE_FINGERPRINT_MISMATCH']);
});

test('loopback verification reaches the actual canonical tenant Host, with status and bytes retained',async()=>{
  const server=createServer((req,res)=>{res.setHeader('Content-Type','text/plain');res.statusCode=req.headers.host==='tenant.example'?200:404;res.end(req.headers.host);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const result=await verifierResponse(new URL(`http://127.0.0.1:${server.address().port}/sitemap.xml`),'tenant.example');assert.equal(result.status,200);assert.equal(result.data.toString(),'tenant.example');assert.equal(result.headers.get('content-type'),'text/plain');}finally{await new Promise(r=>server.close(r));}
});

test('reading verification binds each body to its canonical section and uses exact hidden URLs',()=>{
  const base={type:'guide',contentVersion:2,title:'Useful answer',description:'Description',media:[],editorial:{authors:[],datePublished:'2026-10-07T07:00:00Z',dateModified:null},links:[],externalLinks:[]};
  const a={...base,id:'a',slug:'next-longer',body:[{text:'Specific first answer.'},{text:'Second section.'}]};
  const b={...base,id:'b',slug:'other',body:[{text:'Distinct second answer.'}],links:[{targetPageId:'a',label:'Related'}],externalLinks:[{url:'https://evidence.example/source'}]};
  const pkg={canonicalHost:'beauty.example',locale:'lt-LT',pages:[a,b,{...base,id:'hidden',slug:'next',body:[]}]},pages=[a,b];
  const full='## First\n\nURL: https://beauty.example/next-longer\n\n2026-10-07T07:00:00Z\nSpecific first answer.\n\n## Internal heading\nSecond section.\n\n## Second\n\nURL: https://beauty.example/other\n2026-10-07T07:00:00Z\nDistinct second answer.\n[Related](https://beauty.example/next-longer)\n[Source](https://evidence.example/source)';
  const outputs={'/sitemap.xml':'<loc>https://beauty.example/next-longer</loc><loc>https://beauty.example/other</loc>','/llms.txt':'https://beauty.example/next-longer https://beauty.example/other','/llms-full.txt':full};
  assert.deepEqual(verifyDiscoveryOutputs(pkg,pages,outputs),[]);
  assert.ok(verifyDiscoveryOutputs(pkg,pages,{...outputs,'/llms-full.txt':full.replace('Specific first answer.','Distinct second answer.')} ).includes('READING_BODY_MISSING:a'));
  assert.ok(verifyDiscoveryOutputs(pkg,pages,{...outputs,'/llms.txt':outputs['/llms.txt']+' https://beauty.example/next'}).includes('HIDDEN_URL_IN_DISCOVERY:/llms.txt:hidden'));
  assert.ok(verifyDiscoveryOutputs(pkg,pages,{...outputs,'/llms-full.txt':full.replace('https://evidence.example/source','https://other.example/')}).includes('READING_SOURCE_MISSING:b'));
});

test('completion CLI fails for an unverified review item even when all local gates pass',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'completion-cli-'));
  try{
    const catalog=catalogFromMarkdown(await readFile(new URL('../references/checklist.md',import.meta.url),'utf8'));
    const audit={checks:catalog.map(c=>({id:c.id,status:c.stage==='local'?'PASS':'UNVERIFIED',evidence:c.stage==='local'?['Isolated test evidence']:[]}))};
    const review=audit.checks.find(c=>catalog.find(r=>r.id===c.id).stage==='local'&&!catalog.find(r=>r.id===c.id).gate);
    review.status='UNVERIFIED';review.evidence=[];
    const file=path.join(tmp,'audit.json');await writeFile(file,JSON.stringify(audit));
    const script=path.join(import.meta.dirname,'score-audit.mjs');
    assert.equal(spawnSync(process.execPath,[script,file],{encoding:'utf8'}).status,0);
    const blocked=spawnSync(process.execPath,[script,file,'--require-local'],{encoding:'utf8'});
    assert.equal(blocked.status,1);assert.equal(JSON.parse(blocked.stdout).stages.local.gateReady,true);
    review.status='PASS';review.evidence=['Isolated reviewed fixture'];await writeFile(file,JSON.stringify(audit));
    assert.equal(spawnSync(process.execPath,[script,file,'--require-local'],{encoding:'utf8'}).status,0);
  }finally{await rm(tmp,{recursive:true,force:true});}
});

test('signed canonical home reading is checked while legacy home summaries retain compatibility',()=>{
  const home={id:'home',type:'home',slug:'',title:'Home',description:'Summary',body:[{text:'Complete visible body.'}],media:[]};
  const pkg={canonicalHost:'home.example',locale:'lt-LT',pages:[home]};
  const outputs={'/llms-full.txt':'## Home\n\nURL: https://home.example/\nSummary'};
  assert.deepEqual(verifyDiscoveryOutputs(pkg,[home],outputs),[]);
  home.bodyProjection='canonical';
  assert.ok(verifyDiscoveryOutputs(pkg,[home],outputs).includes('READING_BODY_MISSING:home'));
  assert.deepEqual(verifyDiscoveryOutputs(pkg,[home],{'/llms-full.txt':outputs['/llms-full.txt']+'\nComplete visible body.'}),[]);
});

test('two niche contracts bind author IDs to actual eligible profiles without a hardcoded path',()=>{
  for(const [host,hub,profile] of [['beauty.example','guides','authors/team'],['equipment.example','atsakymai','ekspertai/jonas']]){
    const author={id:'team',name:'Actual editor',kind:'organization'};
    const base={title:'Useful title',description:'Useful description',body:[],media:[],editorial:{authors:[author],datePublished:'2026-10-07T07:00:00Z'}};
    const pages=[{...base,id:'home',type:'home',slug:''},{...base,id:'hub',type:'index',slug:hub},{...base,id:'profile',type:'author',slug:profile},{...base,id:'guide',type:'guide',slug:'guide'}];
    const pkg={canonicalHost:host,locale:'lt-LT',pages};
    const expected=articleExpectations(pkg,pages,hub).find(p=>p.id==='guide');
    assert.equal(expected.authors[0].url,'https://'+host+'/'+profile);assert.equal(expected.articleIndexUrl,'https://'+host+'/'+hub);
    assert.equal(articleExpectations(pkg,pages.filter(p=>p.id!=='profile'),hub).find(p=>p.id==='guide').authors[0].url,'');
  }
});

test('a live origin cannot use a synthetic future clock or a foreign host',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'completion-clock-'));
  try{
    const file=path.join(tmp,'package.json');await writeFile(file,JSON.stringify({canonicalHost:'beauty.example'}));
    await assert.rejects(verifySiteCompletion(['--package',file,'--origin','https://other.example','--article-index','guides']),/exact package/);
    await assert.rejects(verifySiteCompletion(['--package',file,'--origin','https://beauty.example','--article-index','guides','--now','2030-01-01T00:00:00Z']),/only against an isolated/);
  }finally{await rm(tmp,{recursive:true,force:true});}
});
