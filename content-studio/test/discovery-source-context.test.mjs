import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateDiscoverySourceContext} from '../src/discovery-source-context.mjs';
import {sourceFixture,sourceDigest} from './discovery-source-context.fixture.mjs';

test('source context retains exact Unicode excerpts and admits clipped reader completion only as claims',()=>{
  for(const text of ['Gamintojas teigia: ąžuolas 🧖','🧖'.repeat(9000)]) {
    const value=sourceFixture(undefined,text),copy=validateDiscoverySourceContext(value,{creationId:value.creationId});
    assert.deepEqual(copy,value);assert.equal(copy.sources[0].textMayBeClipped,[...text].length===9000);
    assert.equal(copy.independentVerification,'UNVERIFIED');assert.equal(copy.claimStatus,'external_source_claims');
    assert.equal(copy.coverage.readerReportedComplete,true);assert.ok(!('verifiedFacts'in copy));
  }
});
test('source context rejects changed hash, foreign case, false clipping and unsafe structural/numeric leaves',()=>{
  const value=sourceFixture();
  assert.throws(()=>validateDiscoverySourceContext(value,{creationId:randomUUID()}));
  for(const mutate of [v=>v.sources[0].text+='changed',v=>v.sources[0].textMayBeClipped=true,
    v=>v.sources[0].responseBytes=true,v=>v.reportRevision=Number.MAX_SAFE_INTEGER+1,
    v=>v.coverage.omittedCount=-0,v=>v.coverage.capturedClippedCount=1,v=>v.sources[0].observedAt='2026-02-30T00:00:00Z',
    v=>v.sources[0].šaltinis='unknown',v=>v.verifiedFacts=[],v=>v.claimStatus='verified',v=>v.sources[0].text+='\ud800']) {
    const changed=structuredClone(value);mutate(changed);
    changed.contextSha256=sourceDigest(Object.fromEntries(Object.entries(changed).filter(([k])=>k!=='contextSha256')));
    assert.throws(()=>validateDiscoverySourceContext(changed),/Invalid Discovery source context/);
  }
});
