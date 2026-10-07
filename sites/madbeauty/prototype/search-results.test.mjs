import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'public/search-results-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-module-roots',setup(b){b.onResolve({filter:/^\/(cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {entityCard,mapPanel,mapLinks}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('Real-coordinate maps keep matching public addresses, reject absent coordinates and never encode the user reference point',()=>{
 const ctx={searchPoint:{latitude:12.3456789,longitude:98.7654321}},rows=[{organizationName:'Approved fixture',locationId:'l1',location:{id:'l1',publicAddress:'Approved address',city:'Vilnius',latitude:54.68,longitude:25.28}},{organizationName:'Missing point',locationId:'l2',location:{id:'l2',publicAddress:'Actual other address',city:'Vilnius',latitude:null,longitude:null}}];
 const html=mapPanel(ctx,rows);assert.equal((html.match(/<iframe/g)||[]).length,1);assert.ok(html.includes('Actual other address'));assert.ok(html.includes('Koordinatės dar nepatvirtintos'));assert.ok(!html.includes('12.3456789'));assert.ok(!html.includes('98.7654321'));assert.ok(html.includes('www.openstreetmap.org/export/embed.html'));
 const url=new URL(mapLinks(rows[0].location).embed);assert.equal(url.searchParams.get('marker'),'54.68,25.28');assert.equal(url.searchParams.get('bbox'),'25.255,54.665,25.305,54.695');assert.equal(mapLinks({latitude:91,longitude:25}),null);assert.equal(mapLinks({latitude:'54',longitude:25}),null);
 assert.ok(!mapPanel(ctx,[rows[1]]).includes('<iframe'));
});

test('Professional results retain their own staff choice, exact candidates and explicitly organization-level review totals',()=>{
 const c={id:'candidate2',practitionerId:'p2',startAt:'2026-10-08T14:00:00Z'},ctx={media:new Map(),candidates:new Map()},html=entityCard(ctx,{id:'org|p2|l1',entityType:'professional',organizationId:'org',kind:'salon',name:'Second fixture',organizationName:'Approved fixture',city:'Vilnius',location:{publicAddress:'Address'},media:[],practitionerId:'p2',priceMinor:3500,reviewSummary:{count:2,rating:4.5},services:[{id:'variant1',label:'Haircut',priceMinor:3500,durationMin:90}],slots:[c]});
 assert.ok(html.includes('data-practitioner="p2"'));assert.ok(html.includes('data-id="variant1"'));assert.ok(html.includes('veiklos profilio atsiliepimai'));assert.equal(ctx.candidates.get(c.id),c);assert.ok(!html.includes('25,00'));assert.ok(!html.includes('map-diagram'));
});
