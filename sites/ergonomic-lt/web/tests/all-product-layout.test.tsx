import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {visibleModelsAsync,productPath} from '../src/lib/catalog';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {configurableArticle} from '../src/lib/configuration-article';
import {studioBuilderSteps,studioDescriptionParagraphs} from '../src/lib/product-studio';
import {productSpecificationSections,productSpecificationRows} from '../src/lib/product-specifications';
import {ProductSelectedReading} from '../src/components/product-selected-reading';
import {ProductStudioIntro} from '../src/components/product-studio-intro';

test('Every non-curated 3D model keeps all actual choices in the approved functional sequence',async()=>{
 let checked=0;
 for(const p of await visibleModelsAsync()){
  const engine=createExpandedEngine(await loadCatalogRuntime(p));
  if(!engine.expandedForProduct(p)||configurableArticle(p))continue;
  const choices=engine.stateChoices(engine.initialStateForProduct(p));
  const original=JSON.stringify(choices),steps=studioBuilderSteps(p,choices,false),fields=steps.flatMap(s=>s.fields);
  assert.equal(new Set(fields).size,fields.length,productPath(p));
  assert.deepEqual([...fields].sort(),Object.keys(choices).sort(),productPath(p));
  assert(steps.every(s=>s.fields.length));
  const order=steps.map(s=>['movement','supports','construction','finishes'].indexOf(s.id));
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
  for(const field of ['CMECHANISM','CGASLIFT','CBACKRESTMOVEMECH'])if(choices[field])assert(steps.find(s=>s.id==='movement')?.fields.includes(field));
  for(const field of ['CHEADREST','CARMRESTS','CLUMBARSUPPORT'])if(choices[field])assert(steps.find(s=>s.id==='supports')?.fields.includes(field));
  assert.equal(JSON.stringify(choices),original);checked++;
 }
 assert.equal(checked,230);
});

test('All original model technical rows and base codes survive the shared presentation',async()=>{
 let checked=0;
 for(const p of await visibleModelsAsync()){
  const model=p.configurations.find(c=>c.id===p.modelConfigurationId)!;
  if(!model){assert(!p.modelConfigurationId&&p.configurations.length===0,productPath(p));checked++;continue;}
  const rows=productSpecificationRows(model.code,model.details),sections=productSpecificationSections(rows);
  const actual=sections.flatMap(s=>s.rows);
  assert.equal(actual.length,rows.length,productPath(p));
  for(const row of rows)assert.equal(actual.filter(r=>r===row).length,1,productPath(p));
  assert(sections.every(s=>s.rows.length));
  if(model.code)assert(actual.some(r=>r.label==='Produkto kodas'&&r.value===model.code));
  checked++;
 }
 assert.equal(checked,797);
});

test('Long source values, negations and unknown properties remain visible with usable chapter links',()=>{
 const rows=[{label:'Produkto kodas',value:'KXIL044WW001'},{label:'Mechanizmo pasipriešinimo reguliavimas',value:'45–150 kg; tai nėra maksimali leistina apkrova.'},{label:'Šoninių profilių apmušalo spalva',value:'CSE42'},{label:'Nežinomas duomuo',value:'Šaltinio tekstas be pakeitimų'}];
 const d=parseHTML(renderToStaticMarkup(<ProductSelectedReading rows={rows}/>)).document;
 assert.equal(d.querySelectorAll('h2').length,1);assert.equal(d.querySelectorAll('dd').length,rows.length);
 for(const row of rows)assert([...d.querySelectorAll('dd')].some(n=>n.textContent===row.value));
 for(const a of d.querySelectorAll('nav a'))assert(d.querySelector(a.getAttribute('href')!));
 assert.equal(d.querySelector('#duo-description-heading')?.getAttribute('tabindex'),'-1');
 assert(d.querySelector('#configuration-finishes')?.parentElement?.textContent?.includes('CSE42'));
});

test('A photo-only model with no detailed source still displays its real code, without fake chapters',()=>{
 const d=parseHTML(renderToStaticMarkup(<ProductSelectedReading configured={false} rows={productSpecificationRows('REAL-42')}/>)).document;
 assert.equal(d.querySelector('h2')?.textContent,'Produkto techniniai duomenys');
 assert.equal(d.querySelectorAll('.configuration-article-section').length,1);assert.equal(d.querySelectorAll('dd').length,1);
 assert.equal(d.querySelector('dd')?.textContent,'REAL-42');
 assert.equal(renderToStaticMarkup(<ProductSelectedReading rows={[]}/>),'');
});

test('Long descriptions retain every original word and number while being split into readable paragraphs',async()=>{
 let long=0;const normalize=(text:string)=>text.replace(/\s+/g,' ').trim();
 for(const p of await visibleModelsAsync()){
  const paragraphs=studioDescriptionParagraphs(p.description);
  assert.equal(normalize(paragraphs.join(' ')),normalize(p.description),productPath(p));
  if(p.description.length>1600){assert(paragraphs.length>1,productPath(p));long++;}
 }
 assert(long>0);
});

test('Tables and storage finishes are not labelled as chair upholstery',()=>{
 const sections=productSpecificationSections([{label:'Stalviršio spalva',value:'NZ'},{label:'Metalinio pagrindo spalva',value:'RAL9005'}]);
 assert.equal(sections[0].heading,'Medžiagos ir spalvos');
 assert.equal(productSpecificationSections([{label:'Atlošo apmušalas',value:'Lucia'}])[0].heading,'Apmušalai ir spalvos');
});

test('Rendered long descriptions preserve sentence separation in public HTML for text readers and SEO',async()=>{
 const p=(await visibleModelsAsync()).find(p=>p.description.length>1600)!;
 const d=parseHTML(renderToStaticMarkup(<ProductStudioIntro product={p}/>)).document;
 const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
 assert(normalize(d.textContent||d.querySelector('.product-studio-intro')!.textContent!).includes(normalize(p.description)));
});
