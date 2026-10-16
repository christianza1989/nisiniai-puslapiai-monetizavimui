import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {catalogFromMarkdown} from './score-audit.mjs';
import {articleExpectations,verifySiteCompletion,verifyDiscoveryOutputs,completionTransportHost,requestCompletion} from './verify-site-completion.mjs';

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

test('reading preserves projected inline text and its URL while HTML expects the visible sentence',()=>{
  const guide={id:'guide',type:'guide',contentVersion:2,slug:'guide',title:'Choice',description:'Useful answer',media:[],links:[],externalLinks:[],
    editorial:{authors:[],datePublished:'2026-10-07T07:00:00Z',dateModified:null},body:[
      {type:'richParagraph',content:[{type:'text',text:'Palyginkite '},{type:'link',text:'sąlygas',href:'https://facts.example/terms'},{type:'text',text:', tada rinkitės.'}]},
      {type:'richList',items:[[{type:'text',text:'Patikrinkite '},{type:'link',text:'garantiją',href:'https://facts.example/warranty'},{type:'text',text:'.'}]]}]};
  const pkg={canonicalHost:'equipment.example',locale:'lt-LT',pages:[guide]},pages=[guide];
  assert.equal(articleExpectations(pkg,pages,'guides')[0].bodyTexts[0],'Palyginkite sąlygas, tada rinkitės.');
  const full='## Choice\n\nURL: https://equipment.example/guide\n2026-10-07T07:00:00Z\nPalyginkite sąlygas (https://facts.example/terms), tada rinkitės.\nPatikrinkite garantiją (https://facts.example/warranty).';
  const outputs={'/sitemap.xml':'https://equipment.example/guide','/llms.txt':'https://equipment.example/guide','/llms-full.txt':full};
  assert.deepEqual(verifyDiscoveryOutputs(pkg,pages,outputs),[]);
  for(const changed of [full.replace('sąlygas (',' (').replace('  ',' '),full.replace(' (https://facts.example/terms)',''),full.replace('https://facts.example/warranty','https://foreign.example/'),full.replace(', tada rinkitės.','.')]){
    assert.ok(verifyDiscoveryOutputs(pkg,pages,{...outputs,'/llms-full.txt':changed}).includes('READING_BODY_MISSING:guide'));
  }
});

test('private local preview can use its exact origin Host without changing canonical or hosted defaults',()=>{
  const origin=new URL('http://127.0.0.1:8897');
  assert.equal(completionTransportHost(origin,'private-preview.lt'), 'private-preview.lt');
  assert.equal(completionTransportHost(origin,'private-preview.lt',['--loopback-host','origin']), '127.0.0.1:8897');
  assert.equal(completionTransportHost(new URL('https://private-preview.lt'),'private-preview.lt'),null);
  for(const origin of ['https://private-preview.lt','http://foreign.example:8897','http://127.0.0.1'])
    assert.throws(()=>completionTransportHost(new URL(origin),'private-preview.lt',['--loopback-host','origin']),/explicit HTTP loopback/);
  assert.throws(()=>completionTransportHost(origin,'private-preview.lt',['--loopback-host','foreign.example']),/Unsupported/);
});

test('loopback requests send the actual selected Host, do not follow redirects and bound time and response size',async t=>{
  const received=[];let follow=0;
  const server=createServer((req,res)=>{
    received.push(req.headers.host);
    if(req.url==='/wait')return;
    if(req.url==='/redirect'){res.writeHead(302,{Location:'/follow'});res.end();return;}
    if(req.url==='/follow')follow++;
    if(req.url==='/large'){res.end('x'.repeat(64));return;}
    if(req.url==='/gzip'){res.setHeader('content-encoding','gzip');res.end(gzipSync('x'.repeat(1024)));return;}
    res.end('bound');
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});
  const origin='http://127.0.0.1:'+server.address().port;
  assert.equal((await requestCompletion(origin,'foundation.example')).data.toString(),'bound');
  assert.equal((await requestCompletion(origin,new URL(origin).host)).status,200);
  assert.deepEqual(received,['foundation.example',new URL(origin).host]);
  assert.equal((await requestCompletion(origin+'/redirect','foundation.example')).status,302);assert.equal(follow,0);
  await assert.rejects(requestCompletion(origin+'/large','foundation.example',{maxBytes:32}),/bounded inspector/);
  await assert.rejects(requestCompletion(origin+'/gzip','foundation.example',{maxBytes:64}));
  await assert.rejects(requestCompletion(origin+'/wait','foundation.example',{timeoutMs:25}),/abort/i);
  await assert.rejects(requestCompletion('https://foreign.example','foundation.example'),/Invalid loopback/);
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
