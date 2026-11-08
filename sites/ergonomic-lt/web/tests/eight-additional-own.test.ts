import{test}from'node:test';import assert from'node:assert/strict';import{admitAdditionalOwnVisuals}from'../scripts/admit-additional-own-visuals';
import p0 from'../scripts/kxli002ww002-additional-own-pin.json';
import p1 from'../scripts/kxen032ww001-additional-own-pin.json';
import p2 from'../scripts/kxen028ww001-additional-own-pin.json';
import p3 from'../scripts/kxen033ww003-additional-own-pin.json';
import p4 from'../scripts/kyou002ww001-additional-own-pin.json';
import p5 from'../scripts/kyou001ww001-additional-own-pin.json';
import p6 from'../scripts/kyou002ww002-additional-own-pin.json';
import p7 from'../scripts/kyou001ww003-additional-own-pin.json';
for(const pin of[p0,p1,p2,p3,p4,p5,p6,p7]){const input=()=>structuredClone(pin)as unknown as Parameters<typeof admitAdditionalOwnVisuals>[0];test(pin.additional.code+' keeps previous contexts/palettes and appends only own defaults',()=>{const p=input(),before=JSON.stringify(p),a=admitAdditionalOwnVisuals(p);assert.equal(JSON.stringify(p),before);assert.deepEqual(a.review.qualified.witnesses,p.prior.qualified!.witnesses);assert.equal(a.defaultProofs.length,p.additional.additionalVisuals.length);for(const c of a.defaultProofs){assert.equal(c.sourceSha256,c.derivedSha256);assert.deepEqual(a.review.runtime.contexts[c.context].dimensions,c.values);assert(!a.review.qualified.witnesses.some((w:any)=>w.context===c.context));}});test(pin.additional.code+' rejects wrong runtime and foreign WORLD selectors',()=>{let p=input();p.additional.priorRuntimeSha256='0'.repeat(64);assert.throws(()=>admitAdditionalOwnVisuals(p));p=input();const h=p.additional.additionalVisuals[0].sourceAssetSha256;p.selectors.originalNodeMapping[h][p.selectors.assets[h].slots[0].selectorId].originalWorldMatrix[0]=999;assert.throws(()=>admitAdditionalOwnVisuals(p));});}
