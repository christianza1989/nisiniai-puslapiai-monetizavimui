import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {visibleModelsAsync,visibleProductsAsync,productPath} from '../src/lib/catalog';
import {publicProductView} from '../src/lib/public-product-copy';
import {ProductArticleBody} from '../src/components/product-article';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {configurableArticle} from '../src/lib/configuration-article';
import {studioBuilderSteps,productStudioPresentation} from '../src/lib/product-studio';
import {allProductModels} from '../src/lib/product-models';
import {productBuilderSteps} from '../src/lib/duo-builder';

test('Every model and line uses its assigned photograph and public heading',async()=>{
 const products=[...new Map([...(await visibleProductsAsync()),...(await visibleModelsAsync())].map(p=>[productPath(p),p])).values()];
 let rooms=0;
 for(const p of products){
  const data=productStudioPresentation(publicProductView(p),configurableArticle(p)?.intro||p.modelArticle?.paragraphs);
  const view=publicProductView(p);
  assert.equal(data.heading,('publicHeading' in view&&view.publicHeading)||view.name,productPath(p));assert(data.image,productPath(p)+' real photograph');
  if(data.illustrated){rooms++;assert(['23636152','23636148'].includes(p.modelConfigurationId!));}
  else assert.equal(data.image,p.image,productPath(p)+' should use its assigned photograph');
 }
 assert.equal(products.length,1037);assert.equal(rooms,1);
});

test('All existing expanded choices remain reachable and curated article steps stay unchanged',async()=>{
 let checked=0,curated=0,fixed=0;
 for(const p of allProductModels(await visibleProductsAsync())){
  const runtime=await loadCatalogRuntime(p),engine=createExpandedEngine(runtime);
  if(!engine.expandedForProduct(p))continue;
  const state=engine.initialStateForProduct(p),choices=engine.stateChoices(state),before=JSON.stringify(choices),article=!!configurableArticle(p);
  const steps=studioBuilderSteps(p,choices,article),fields=steps.flatMap(s=>s.fields);
  if(!Object.keys(choices).length){fixed++;assert.equal(steps.length,0);checked++;continue;}
  assert(steps.length>0,productPath(p));
  assert.equal(new Set(fields).size,fields.length,productPath(p)+' duplicate control');
  if(!article)assert.deepEqual([...fields].sort(),Object.keys(choices).sort(),productPath(p)+' lost former control');
  else{curated++;assert.deepEqual(steps.map(s=>s.fields),productBuilderSteps(p,choices).map(s=>s.fields),productPath(p)+' curated options changed');}
  assert.equal(JSON.stringify(choices),before,productPath(p)+' source choices mutated');checked++;
 }
 assert.equal(checked,359);assert.equal(curated,29);assert.equal(fixed,9);
});

test('The 148 original static source remains preserved behind its new conditional presentation',async()=>{
 const p=(await visibleModelsAsync()).find(p=>p.modelConfigurationId==='23636148')!;
 assert(p.modelArticle&&p.modelArticle.configurable);
 const doc=parseHTML(renderToStaticMarkup(<ProductArticleBody article={p.modelArticle} includeNarrative={false}/>)).document;
 assert.equal(doc.querySelectorAll('.product-article-narrative').length,0);
 assert.equal(doc.querySelector('.product-article-scope')?.textContent,p.modelArticle.scopeNote);
 assert.equal(doc.querySelectorAll('dd').length,p.modelArticle.technicalSections.flatMap(s=>s.rows).length);
});

