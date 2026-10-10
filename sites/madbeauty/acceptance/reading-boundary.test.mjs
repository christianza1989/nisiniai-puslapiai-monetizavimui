import test from 'node:test';
import assert from 'node:assert/strict';
import {articleFixture,signFixture} from '../content-foundation-20261006/fixture.mjs';
import {projectMadbeautyV2} from '../content/v2-projection.mjs';
test('Public reading retains source URLs and published author/date while excluding private editorial reasons and future material',()=>{
 const pkg=articleFixture(),page=pkg.pages[1];page.externalLinks=[{url:'https://www.nhs.uk/',label:'Public source',reason:'PRIVATE editorial claim verification notes not intended for readers'}];page.editorial.sources=[{url:'https://www.nhs.uk/',label:'Public source',publisher:'NHS'}];signFixture(pkg);
 const publicReading=projectMadbeautyV2(pkg,{now:Date.parse(page.publishAt)}).seo.nicheLlmsFull();assert.match(publicReading,/https:\/\/www.nhs.uk\//);assert.match(publicReading,/Public source/);assert.match(publicReading,/Publikavimo data: 2026-10-06T08:00:00Z/);assert.doesNotMatch(publicReading,/PRIVATE|verification notes/);
 const future=projectMadbeautyV2(pkg,{now:Date.parse(page.publishAt)-1}).seo.nicheLlmsFull();assert.doesNotMatch(future,/Public source|nhs.uk|katalogo-nuorodos-testas|PRIVATE/);
});
