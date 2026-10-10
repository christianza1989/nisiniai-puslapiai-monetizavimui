import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateReportRange} from './public/report-range.mjs';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/operations-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {operationsForm,reportsView}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Shared report date-only bounds include leap and DST days, exactly92 dates, and reject malformed rollover dates',()=>{
 assert.equal(validateReportRange('2024-02-29','2024-02-29').days,1);assert.equal(validateReportRange('2026-03-28','2026-03-30').days,3);assert.equal(validateReportRange('2026-10-24','2026-10-26').days,3);assert.equal(validateReportRange('2026-01-01','2026-04-02').days,92);
 for(const [from,to] of [['2026-02-29','2026-03-01'],['2026-10-08T00:00:00Z','2026-10-08'],['2026-10-09','2026-10-08'],['2026-01-01','2026-04-03'],['','2026-10-08']])assert.ok(validateReportRange(from,to).error);
});
test('Report range form rejects reversed, impossible and oversized periods before navigating; corrected and inclusive92-day dates navigate',async()=>{
 const navigations=[],ctx={navigate:async url=>navigations.push(url)},submit=(from,to)=>operationsForm(ctx,{id:'report-range'},new Map([['from',from],['to',to]]));
 for(const [from,to] of [['2026-10-08','2026-10-07'],['2026-02-30','2026-03-01'],['2026-01-01','2026-04-03']])await assert.rejects(submit(from,to),e=>e.code==='INVALID_INPUT');assert.equal(navigations.length,0);
 await submit('2026-10-08','2026-10-09');await submit('2026-01-01','2026-04-02');assert.equal(navigations.length,2);assert.match(navigations[0],/nuo=2026-10-08&iki=2026-10-09/);assert.match(navigations[1],/nuo=2026-01-01&iki=2026-04-02/);
});
test('A bookmarked invalid report range keeps its labeled date form and specific recovery error without reading or rendering metrics',async()=>{
 const previousLocation=globalThis.location;globalThis.location={hash:'#nuo=2026-10-08&iki=2026-10-07'};let reads=0;const ctx={dayKey:()=> '2026-10-08',adapter:{organizationReport:async()=>{reads++;throw Error('Invalid range should not fetch');}}};
 try{const html=await reportsView(ctx,{organizations:[{id:'org'}]});assert.equal(reads,0);assert.match(html,/id="report-range"/);assert.match(html,/value="2026-10-08"/);assert.match(html,/value="2026-10-07"/);assert.match(html,/role="alert"/);assert.match(html,/Pabaigos data/);assert.doesNotMatch(html,/<table|CSV|Rezervuotas meistrų laikas/);
 globalThis.location.hash='#nuo=2026-01-01&iki=2026-04-03';assert.match(await reportsView(ctx,{organizations:[{id:'org'}]}),/92 dienų/);assert.equal(reads,0);
 }finally{globalThis.location=previousLocation;}
});
