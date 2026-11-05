import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optionExplanation,explainManufacturerOption} from '../src/lib/option-explanations';
const args={group:'chairs' as const,model:'KBJA001WW002',field:'CMECHANISM',value:'FS',english:'FS: synchronous',label:'Sinchroninis',context:'Mechanizmas',configuratorUrl:'https://configurator.nowystyl.com/'};
test('verified variants, model boundaries and automatic new mechanism facts',()=>{
 assert.match(optionExplanation(args)!.suggested,/penkių/);
 const next=optionExplanation({...args,value:'NEW',english:'NEW: asynchronous, seat depth adjustment'})!;
 assert.match(next.suggested,/atskirai/);assert.match(next.suggested,/gylis/);assert.doesNotMatch(next.suggested,/automatiškai|penkių/);
 assert.equal(optionExplanation({...args,value:'UNKNOWN',english:'UNKNOWN'}),undefined);
 assert.doesNotMatch(optionExplanation({...args,model:'UNKNOWN'})!.suggested,/penkių/);
 assert.notEqual(optionExplanation(args)!.id,optionExplanation({...args,group:'desks'})!.id);
});
test('identical confirmed meanings share an edit, conflicting meanings do not',()=>{
 const a=optionExplanation({...args,field:'CARMRESTS',value:'R01',english:'R01: fixed, plastic'})!;
 assert.equal(a.id,optionExplanation({...args,model:'OTHER',field:'CARMRESTS',value:'R01',english:'R01: fixed, plastic'})!.id);
 assert.notEqual(a.id,optionExplanation({...args,field:'CARMRESTS',value:'R01',english:'R01: 4D, plastic'})!.id);
 assert.doesNotMatch(a.suggested,/R01/);
});
test('desk controls and floors only acquire explicit functions',()=>{
 assert.match(explainManufacturerOption('FHEIGHTADJUSTMENT','Manual by crank (650-1000 mm)')!,/sukant/);
 assert.match(explainManufacturerOption('FHADJUSTMENTWAY','Control panel with display and memory function (4 positions)')!,/keturias/);
 assert.doesNotMatch(explainManufacturerOption('FHEIGHTADJUSTMENT','Electric')!,/atmint|koliz|1300/);
 assert.match(explainManufacturerOption('CGLIDES','GBPF: self-leveling, for hard floors, with felt')!,/veltinis/);
 assert.doesNotMatch(explainManufacturerOption('CCASTORS','ESH60: diam. 60 mm, for soft floors')!,/savaiminio/);
 assert.match(explainManufacturerOption('CARMRESTS','R35K3-SB2: 4D, arm: black polyamide, pad: black polyurethane')!,/atstumas.*slankioja.*sukasi/);
 assert.doesNotMatch(explainManufacturerOption('CARMRESTS','UNVERIFIED: 2D, plastic')!,/aukštis|slankioja|sukasi/);
});
test('help drafts are editable, shared by meaning and isolated from the real site',async()=>{
 const {mkdtempSync}=await import('node:fs');
 const seed=(await import('../content/seed.json')).default;
 const {buildReviewScope,inventoryModels,mutateText}=await import('../src/lib/text-review-server');
 const prior={runtime:process.env.RUNTIME_DIR,flag:process.env.TEXT_REVIEW_PROPOSALS,origin:process.env.PUBLIC_ORIGIN};
 process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-option-explanations-20261105/test-');
 process.env.TEXT_REVIEW_PROPOSALS='true';process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
 try{
  const models=inventoryModels();
  const product=(code:string)=>({...seed.products.find(p=>p.id===models[code].productId)!,modelConfigurationId:models[code].sample}) as import('../src/lib/types').Product;
  const a=product('KBJA001WW002'),first=await buildReviewScope(a,new Map());
  const help=first.entries.find(e=>e.id===first.publicScope.bindings['KBJA001WW002']['explanation:CMECHANISM=FS'])!;
  assert(help&&help.shared&&help.affected>1);assert.match(help.suggested,/penkių/);
  await mutateText(help,{key:help.id,sourceHash:help.sourceHash,expectedRevision:0,action:'draft',text:'Atlošas ir sėdynė juda suderintai. Pasipriešinimas reguliuojamas.'});
  const other=Object.keys(models).filter(c=>c!=='KBJA001WW002'&&models[c].bindings['value:CMECHANISM=FS']);
  let shared=false;
  for(const code of other){const scope=await buildReviewScope(product(code));const id=scope.publicScope.bindings[code]?.['explanation:CMECHANISM=FS'];if(id===help.id){assert.equal(scope.publicScope.values[code+':'+id],'Atlošas ir sėdynė juda suderintai. Pasipriešinimas reguliuojamas.');shared=true;break;}}
  assert(shared);
  const legacy=seed.products.find(p=>p.id==='product_xilium-swivel-chairs_0fe4091b')!;
  const oldScope=await buildReviewScope({...legacy,modelConfigurationId:'23636148'} as import('../src/lib/types').Product,new Map());
  assert(oldScope.publicScope.bindings.KXIL044WW001['explanation:CMECHANISM=ERNHST']);
  assert(oldScope.entries.some(e=>e.role==='Pasirinkimo paaiškinimas'&&e.english.includes('reinforced spring')));
  process.env.PUBLIC_ORIGIN='https://ergonomic.lt';
  assert(!(await buildReviewScope(a,new Map())).entries.some(e=>e.role==='Pasirinkimo paaiškinimas'));
 }finally{
  for(const [name,value]of Object.entries({RUNTIME_DIR:prior.runtime,TEXT_REVIEW_PROPOSALS:prior.flag,PUBLIC_ORIGIN:prior.origin}))if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
});
