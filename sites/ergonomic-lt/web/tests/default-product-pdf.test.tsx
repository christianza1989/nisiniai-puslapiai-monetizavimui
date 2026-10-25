import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {visibleModelsAsync,productPath} from '../src/lib/catalog';
import {publicProductView} from '../src/lib/public-product-copy';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {studioBuilderSteps} from '../src/lib/product-studio';
import {configurableArticle} from '../src/lib/configuration-article';
import ExpandedProductDetail from '../src/components/expanded-product-detail';
import {QuoteProvider} from '../src/components/quote-provider';

test('Untouched models expose the displayed configuration PDF when the request actions are visible',async()=>{
 const models=await visibleModelsAsync();
 let fixed=0,oneStep=0;
 for(const original of models){
  const product=publicProductView(original),runtime=await loadCatalogRuntime(original);
  const engine=createExpandedEngine(runtime);
  if(!engine.expandedForProduct(product))continue;
  const initial=engine.initialStateForProduct(product),choices=engine.stateChoices(initial);
  const steps=studioBuilderSteps(product,choices,!!configurableArticle(original));
  const isFixed=Object.keys(choices).length===0;
  if(isFixed?fixed>=2:oneStep>=2||steps.length!==1)continue;
  const sample=original.modelConfigurationId!;
  const {document}=parseHTML(renderToStaticMarkup(<QuoteProvider><ExpandedProductDetail product={product} url={productPath(original)} presets={null} catalogRuntime={runtime}/></QuoteProvider>));
  const links=document.querySelectorAll('a.product-pdf');
  assert.equal(links.length,1,sample+' initial configuration PDF must be available');
  const url=new URL(links[0].getAttribute('href')!,'https://ergonomic.lt');
  assert.equal(url.pathname,'/api/produkto-kortele/');
  assert.equal(url.searchParams.get('produktas'),product.id);
  assert.equal(url.searchParams.get('konfig'),engine.stateToken(initial));
  assert.deepEqual(engine.parseStateToken(product,url.searchParams.get('konfig')!),initial);
  if(isFixed)fixed++;else oneStep++;
  if(fixed===2&&oneStep===2)break;
 }
 assert.equal(fixed,2,'Fixed views must offer the untouched configuration PDF');
 assert.equal(oneStep,2,'Single-step interactive models must offer the untouched configuration PDF');
});
