import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDomain,inspectUrl,parseCdx,cdxUrl,archiveClient,auditDomain,summarizeHtml,selectSnapshots} from '../history.mjs';
const domain='fixture.lt';
const header=['timestamp','original','statuscode','mimetype','digest'];
const row=(url,date='20200901000000')=>[date,url,'200','text/html','fixture-digest'];
const clientFor=fetcher=>archiveClient({fetcher,gapMs:0,wait:async()=>{},timeoutMs:1000});
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});

test('domain scope rejects paths, credentials, local hosts and output traversal inputs',()=>{
  assert.equal(normalizeDomain('WWW.FIXTURE.LT'),domain);
  for(const value of ['../outside','user@fixture.lt','fixture.lt/path','fixture.lt:443','127.0.0.1','localhost','test.local','-bad.lt']) assert.throws(()=>normalizeDomain(value));
});
test('CDX keeps real default-port www paths and query IDs, not external or sensitive records',()=>{
  const result=parseCdx([header,row('http://www.fixture.lt:80/gidas?id=42'),row('https://external.lt/'),row('https://fixture.lt/?token=private'),row('https://fixture.lt/bad','20200231000000')],domain);
  assert.equal(result.captures.length,1);assert.equal(result.captures[0].path,'/gidas?id=42');assert.equal(result.omitted,3);
  assert.equal(result.captures[0].capturedAt,'2020-09-01T00:00:00.000Z');
  assert.ok(!JSON.stringify(result).includes('private'));
});
test('successful empty scope is distinct from an unavailable archive',async()=>{
  const empty=await auditDomain(domain,{maxSnapshots:0,client:clientFor(async()=>json([]))});
  assert.equal(empty.coverage,'no-matching-html-captures');assert.equal(empty.inventoryComplete,true);
  let calls=0;const unavailable=await auditDomain(domain,{client:clientFor(async()=>{calls++;return new Response('',{status:429});})});
  assert.equal(calls,1,'429 stops the remaining queries and replay requests');
  assert.equal(unavailable.coverage,'unknown');assert.equal(unavailable.inventoryComplete,false);
  assert.equal(unavailable.seoSignals.currentBacklinks,null);assert.equal(unavailable.publicChangesApplied,false);
});
test('partial archive failures and bounded inventory never become a complete clean-history claim',async()=>{
  const client=clientFor(async url=>new URL(url).searchParams.get('matchType')==='domain'
    ? json([header,row(`https://${domain}/gidas`),row(`https://${domain}/kitas`)]) : new Response('',{status:503}));
  const result=await auditDomain(domain,{maxUrls:1,maxSnapshots:0,client});
  assert.equal(result.coverage,'records-found');assert.equal(result.inventory.length,1);
  assert.equal(result.inventoryComplete,false);assert.equal(result.queries[0].truncated,true);
});
test('replay redirects cannot fetch the live historic business or a private server',async()=>{
  let calls=0;const client=clientFor(async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});});
  await assert.rejects(()=>client.read('https://web.archive.org/web/20200101000000/https://fixture.lt/','replay'),/archive_redirect_left_archive/);
  assert.equal(calls,1);assert.equal(client.requests[0].error,'archive_redirect_left_archive');
});

test('merging two successful samples cannot silently make a clipped inventory complete',async()=>{
  const client=clientFor(async url=>{
    const query=new URL(url).searchParams;
    if(query.get('matchType')!=='domain') return json([]);
    const suffix=query.getAll('filter').some(value=>value.startsWith('!original:'))?'category':'product';
    return json([header,row(`https://${domain}/${suffix}-a`),row(`https://${domain}/${suffix}-b`)]);
  });
  const result=await auditDomain(domain,{maxUrls:2,maxSnapshots:0,client});
  assert.ok(result.queries.every(query=>query.ok&&!query.truncated));
  assert.equal(result.inventory.length,2);assert.equal(result.coverage,'records-found');
  assert.equal(result.inventoryComplete,false,'the combined sample exceeds the retained inventory limit');
});
test('HTML is evidence, scripts are not executed or stored as instructions',()=>{
  const result=summarizeHtml('<title>Istorinis puslapis</title><script>throw new Error("execute me")</script><h1>Padangų pasirinkimas</h1><p>Domenas parduodamas. Į krepšelį.</p>');
  assert.equal(result.title,'Istorinis puslapis');assert.deepEqual(result.headings,['Padangų pasirinkimas']);
  assert.ok(result.signals.includes('parking-or-domain-sale'));assert.ok(result.signals.includes('commerce-interface'));
  assert.equal(result.htmlSha256.length,64);assert.ok(!JSON.stringify(result).includes('execute me'));
  assert.equal(summarizeHtml('<script>window.location.replace("elsewhere")</script>').contentReadable,false);
  assert.equal(inspectUrl('https://fixture.lt/padangų-specialistas',domain).kind,'unknown-intent','medicine keyword inside a legitimate word is not a risk signal');
});
test('archive body size is bounded and errors remain technical evidence',async()=>{
  const client=archiveClient({fetcher:async()=>new Response('x'.repeat(50)),gapMs:0,wait:async()=>{},maxBytes:20});
  await assert.rejects(()=>client.read('https://web.archive.org/cdx/search/cdx','index'),/archive_body_limit/);
});
test('inventory first-capture sample and root latest lookup stay separate',()=>{
  assert.equal(new URL(cdxUrl(domain,'inventory',20)).searchParams.get('limit'),'21');
  assert.equal(new URL(cdxUrl(domain,'latest')).searchParams.get('limit'),'-1');
  const roots=parseCdx([header,row(`http://${domain}/`,'20130101000000'),row(`https://${domain}/`,'20240101000000')],domain).captures;
  const catalog=parseCdx([header,row(`https://${domain}/padangos/`),row(`https://${domain}/cart/`)],domain,['padang']).captures;
  const selected=selectSnapshots(catalog,roots,4);
  assert.equal(selected[0].timestamp,'20240101000000');assert.equal(selected[1].timestamp,'20130101000000');
  assert.ok(selected.some(item=>item.kind==='topic-candidate'));assert.ok(!selected.some(item=>item.kind==='utility'));
});
