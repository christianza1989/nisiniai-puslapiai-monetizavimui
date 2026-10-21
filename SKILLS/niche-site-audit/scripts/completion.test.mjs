import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {catalogFromMarkdown} from './score-audit.mjs';
import {articleExpectations,verifySiteCompletion,verifyDiscoveryOutputs,canonicalLoopbackGet} from './verify-site-completion.mjs';

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

test('loopback transport preserves the canonical Host and does not follow redirects',async()=>{
  let requests=0;
  const server=http.createServer((req,res)=>{requests++;res.writeHead(302,{Location:'/must-not-follow','X-Observed-Host':req.headers.host});res.end('bounded receipt');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const response=await canonicalLoopbackGet(new URL(`http://127.0.0.1:${server.address().port}/`),'catalogue.example');
    assert.equal(response.status,302);assert.equal(response.headers.get('x-observed-host'),'catalogue.example');
    assert.equal(response.data.toString(),'bounded receipt');assert.equal(requests,1);
  }finally{await new Promise(r=>server.close(r));}
});

test('actual completion requests deduplicated same-origin CSS/JS and rejects 404 or wrong MIME',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'completion-resources-'));
  const {pageRevisionHash}=await import('../../../../dovanos-memorycasting/scripts/content-package-core.mjs');
  const page={id:'home',siteId:'resource-fixture',type:'home',slug:'',title:'Resource fixture',description:'Isolated resource regression fixture.',intent:'Test actual resource delivery',body:[{type:'paragraph',text:'Isolated resource regression fixture.'}],publishAt:'2026-01-01T00:00:00.000Z',media:[],links:[]};
  page.revisionHash=pageRevisionHash(page);page.approval={status:'approved',revisionHash:page.revisionHash,approvedAt:'2026-01-01T00:00:00.000Z',actorId:'fixture-reviewer'};
  const pkg={schemaVersion:1,siteId:'resource-fixture',canonicalHost:'resource-fixture.example',locale:'en-GB',generatedAt:'2026-01-01T00:00:00.000Z',site:{id:'resource-fixture',name:'Resource fixture',canonicalHost:'resource-fixture.example',locale:'en-GB',timezone:'Europe/Vilnius',brand:{accent:'#245b44'},offer:'Isolated fixture',contact:{email:'fixture@example.invalid'}},pages:[page]};
  await writeFile(path.join(tmp,'package.json'),JSON.stringify(pkg));
  let cssStatus=404,jsStatus=404,cssMime='text/plain',jsMime='text/plain';let counts={};
  const server=http.createServer((req,res)=>{
    assert.equal(req.headers.host,pkg.canonicalHost);
    counts[req.url]=(counts[req.url]||0)+1;
    if(req.url==='/style.css'){res.writeHead(cssStatus,{'content-type':cssMime});res.end('body{}');return;}
    if(req.url==='/app.js'){res.writeHead(jsStatus,{'content-type':jsMime});res.end('void 0');return;}
    if(req.url==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html lang="en"><head><link rel="stylesheet" href="/style.css"><link href="/style.css" rel="stylesheet"><link rel="stylesheet" href="https://external.invalid/not-fetched.css"><script src="/app.js"></script><script src="/app.js"></script></head><body><h1>Resource fixture</h1></body></html>');return;}
    if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(req.url)){res.writeHead(200,{'content-type':'text/plain'});res.end('https://resource-fixture.example/');return;}
    if(req.url==='/robots.txt'){res.writeHead(200,{'content-type':'text/plain'});res.end('User-agent: *\nAllow: /');return;}
    res.writeHead(404);res.end('Not found');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const args=['--package',path.join(tmp,'package.json'),'--origin',`http://127.0.0.1:${server.address().port}`,'--article-index','guides','--core',path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),'--render-only'];
    const check=async()=>{counts={};const report=await verifySiteCompletion(args);return report.issues.filter(i=>/^(?:STYLESHEET|SCRIPT)_/.test(i));};
    assert.deepEqual(await check(),['STYLESHEET_UNAVAILABLE:/style.css','SCRIPT_UNAVAILABLE:/app.js']);
    assert.equal(counts['/style.css'],1);assert.equal(counts['/app.js'],1);
    cssStatus=200;jsStatus=200;
    assert.deepEqual(await check(),['STYLESHEET_MIME:/style.css','SCRIPT_MIME:/app.js']);
    cssMime='text/css; charset=utf-8';jsMime='application/javascript; charset=utf-8';
    assert.deepEqual(await check(),[]);
    assert.equal(counts['/style.css'],1);assert.equal(counts['/app.js'],1);
  }finally{await new Promise(r=>server.close(r));await rm(tmp,{recursive:true,force:true});}
});
