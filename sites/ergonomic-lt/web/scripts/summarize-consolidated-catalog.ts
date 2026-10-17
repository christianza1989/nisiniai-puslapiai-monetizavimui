import {visibleModelsAsync,visibleProductsAsync} from '../src/lib/catalog';
import {productPath} from '../src/lib/catalog';
import {modelTags,matchesSelection} from '../src/lib/seo-collections';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {configurableArticle} from '../src/lib/configuration-article';
const models=await visibleModelsAsync(),parents=await visibleProductsAsync();
let expanded=0,curated=0,fixed=0;
for(const p of models){const e=createExpandedEngine(await loadCatalogRuntime(p));if(e.expandedForProduct(p)){expanded++;if(configurableArticle(p))curated++;if(!Object.keys(e.stateChoices(e.initialStateForProduct(p))).length)fixed++;}}
console.log(JSON.stringify({active:models.length,pathsWithParents:new Set([...models,...parents].map(productPath)).size,xilium:models.filter(p=>p.id.includes('product_xilium-swivel')).map(p=>p.modelConfigurationId),expanded,curated,fixed,selections:Object.fromEntries(['ergonomines-kedes','ergonominiai-stalai','balansines-kedes','priedai'].map(id=>[id,models.filter(p=>matchesSelection(p,id)).length])),tags:Object.fromEntries(['electric','manual','pneumatic'].map(tag=>[tag,models.filter(p=>modelTags(p).includes(tag)).length]))},null,2));
