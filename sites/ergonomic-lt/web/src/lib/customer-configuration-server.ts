import {customerKey} from './customer-capability';
import {customerControlIds,resolveCustomerChange,type CustomerConfiguration,type CustomerState} from './customer-configuration';
import {createExpandedEngine,fieldLabels} from './expanded-configurator';
import {loadCatalogRuntime} from './catalog-runtime-loader';
import {catalogAsync} from './catalog';
import {modelProduct} from './product-models';
import {buildReviewScope,inventoryModels} from './text-review-server';
import {customerLabel} from './customer-names';
import {prepareCustomerAsset,customerSceneName} from './customer-assets-server';
import {productHeading} from './product-presentation';
import type {Product} from './types';
import {renderMaterial,finishGroup} from './render-materials';
import {deskColorPlan} from './desk-color-plan';
import {visibleDeskPreviewChoices} from './desk-preview-choices';
import {customerChairControls} from './customer-chair-controls-server';
import {chairFinishRoles,chairFinishCollection} from './chair-material-groups';
import {customerProductCodes} from './customer-product-presentation';
import {pilotSelection} from './configurator';
import {customerGltfDocument} from './customer-glb';
import {palettes as sourcePalettes} from './expanded-configurator';
const textile=new Set(['CSE','MT','RX','SD','SC','SY','ST','CN','ME','CUR','ERA','X','YS','YB']);

export async function customerContext(p:Product,input?:CustomerState['state']){
 const runtime=await loadCatalogRuntime(p,input),engine=createExpandedEngine(runtime),family=engine.expandedForProduct(p),cap=customerKey();
 const revision=cap.id('revision',family||p.configurations.map(c=>({id:c.id,code:c.code,supplierOptions:c.supplierOptions})));
 return {runtime,engine,family,revision};
}
export async function resolveCustomerSnapshot(token:string){
 const saved=customerKey().open<CustomerState&{revision:string}>('configuration',token);
 if(!saved||typeof saved.product!=='string'||saved.sample!==null&&typeof saved.sample!=='string')throw Error('Komplektacija negalioja.');
 const parent=(await catalogAsync()).products.find(p=>p.id===saved.product);if(!parent)throw Error('Prekė nebegalioja.');
 const sample=parent.configurations.find(c=>c.id===saved.sample);if(saved.sample&&!sample)throw Error('Modelis nebegalioja.');
 const product=sample?modelProduct(parent,sample):parent,context=await customerContext(product,saved.state);
 if(saved.revision!==context.revision)throw Error('Produkto komplektacija pasikeitė. Pasirinkite ją iš naujo.');
 if(saved.state)context.engine.validateState(product,saved.state);
 return {product,saved,context};
}
export async function customerSnapshotFromLegacy(product:Product,token:string){const context=await customerContext(product),state=context.engine.parseStateToken(product,token);return customerKey().seal('configuration',{product:product.id,sample:product.modelConfigurationId||product.configurations[0]?.id||null,state,revision:context.revision});}
export async function customerConfiguration(product:Product,token?:string,change?:{field:string;value:string}):Promise<CustomerConfiguration>{
 const cap=customerKey(),scope={product:product.id,sample:product.modelConfigurationId||product.configurations[0]?.id||null},ids=customerControlIds(cap,scope);
 let context=await customerContext(product),state:CustomerState['state'];
 if(token){const resolved=await resolveCustomerSnapshot(token);if(resolved.saved.product!==scope.product||resolved.saved.sample!==scope.sample)throw Error('Komplektacija priklauso kitam modeliui.');context=resolved.context;state=resolved.saved.state;}
 else if(context.family)state=context.engine.initialStateForProduct(product);
 let materialControls=state?await customerChairControls(product,context,state):[];
 if(change){if(!state)throw Error('Parinktys nepasiekiamos.');const group=materialControls.find(c=>ids.field(c.id)===change.field);if(group){const option=group.options.find(o=>ids.choice(group.id,o.id)===change.value);if(!option)throw Error('Nepatvirtintas medžiagos pasirinkimas.');state=option.state;}else{const hidden=new Set(materialControls.flatMap(c=>c.hiddenFields)),domains=Object.fromEntries(Object.entries(visibleDeskPreviewChoices(context.engine.catalog.catalogForProduct(product),context.engine.stateChoices(state))).filter(([field])=>!hidden.has(field)));const native=resolveCustomerChange(domains,ids,change);state=context.engine.changeField(state,native.field,native.value);}materialControls=await customerChairControls(product,context,state);}
 const selected=state?context.engine.expandedSelection(product,state):undefined,review=await buildReviewScope(product),model=selected?.configuration.code||product.configurations.find(c=>c.id===scope.sample)?.code||'';
 const codes=customerProductCodes(product);for(const[field,value]of Object.entries(state?.values||{})){codes.add(field);codes.add(value);}
 for(const key of Object.keys(inventoryModels()[model]?.bindings||{}))if(key.startsWith('name:'))codes.add(key.slice(5));
 const hiddenMaterialFields=new Set(materialControls.flatMap(c=>c.hiddenFields)),allChoices=state?visibleDeskPreviewChoices(context.engine.catalog.catalogForProduct(product),context.engine.stateChoices(state)):{},choices=Object.fromEntries(Object.entries(allChoices).filter(([field])=>!hiddenMaterialFields.has(field)));
 for(const [field,values]of Object.entries(allChoices)){codes.add(field);for(const value of values)codes.add(value);}
 const published=(field:string,value?:string)=>{const id=review.publicScope.bindings[model]?.[(value===undefined?'field:':'value:')+field+(value===undefined?'':'='+value)];return id?review.publicScope.values[model+':'+id]:undefined;};
 const controls=Object.entries(choices).map(([field,values],i)=>({id:ids.field(field),label:customerLabel(published(field)||context.runtime?.palettes._fieldLabels?.[field]?.text||fieldLabels[field],codes,'Parinktis '+(i+1)),value:ids.choice(field,state!.values[field]),choices:values.map((value,j)=>({id:ids.choice(field,value),label:customerLabel(published(field,value)||context.engine.choiceLabel(field,value,context.runtime?.palettes,state?.family),codes,'Pasirinkimas '+(j+1))}))}));
 for(const group of materialControls)controls.push({id:ids.field(group.id),label:group.label,value:ids.choice(group.id,group.value||'original'),choices:[...(!group.value?[{id:ids.choice(group.id,'original'),label:'Pradinės dalių spalvos'}]:[]),...group.options.map((option,i)=>({id:ids.choice(group.id,option.id),label:customerLabel(published(group.fields[0],option.code)||(()=>{const id=review.publicScope.bindings[model]?.['name:'+option.code];return id?review.publicScope.values[model+':'+id]:undefined;})()||context.engine.choiceLabel(group.fields[0],option.code,context.runtime?.palettes,state?.family),codes,'Spalva '+(i+1))}))],disabled:!group.options.length,note:group.reason} as typeof controls[number]);
 const assets:CustomerConfiguration['assets']={base:null,patches:[]},finishes:CustomerConfiguration['finishes']={},assetMap=new Map<string,string>();let desk:CustomerConfiguration['desk'];
 async function prepare(ref:Parameters<typeof prepareCustomerAsset>[0]){const result=await prepareCustomerAsset(ref);if(ref.assetSha256)assetMap.set(ref.assetSha256,result.sha256);return result;}
 if(selected){
  if(selected.assets.base)assets.base=await prepare(selected.assets.base);
  for(const patch of selected.assets.patches){const refs=patch.geometries||(patch.geometry?[patch.geometry]:[]),publicAssets=[];for(const ref of refs)publicAssets.push(await prepare(ref));assets.patches.push({remove:patch.remove.map(customerSceneName),assets:publicAssets});}
  const catalog=context.engine.catalog.catalogForProduct(product),structureOnly=['structure-only','desk-components'].includes(catalog?.collectionMode||'')&&!product.id.toLowerCase().includes('xilium');
  if(!structureOnly){
   const values=Object.fromEntries((selected.configuration.supplierOptions||[]).map(option=>{const [field,value]=option.split('=');return [field.split('.').at(-1)!,value];})),materials=context.engine.catalog.catalogAnchor(state!)?.materials;
   for(const [field,value]of Object.entries(values)){
    const palette={...sourcePalettes[field]?.[value],...context.runtime?.palettes[field]?.[value]},group=product.categorySlug==='kedes'&&chairFinishRoles[field]?chairFinishCollection(field,values):values[finishGroup[field]];
    const preview=renderMaterial({...palette,material:materials?.[field]?.[value],code:value,group});
    finishes[customerSceneName(field)]={color:preview.color,approximate:preview.approximate,...('factor'in preview?{factor:preview.factor}:{}),...('roughness'in preview?{roughness:preview.roughness}:{}),...('metalness'in preview?{metalness:preview.metalness}:{}),image:preview.image?(await prepare({asset:preview.image})).url:undefined,normalImage:preview.normalImage?(await prepare({asset:preview.normalImage})).url:undefined,sheen:group&&textile.has(group)?.12:0};
   }
  }
  if(catalog?.deskColors){
   const colors=catalog.deskColors,plan=deskColorPlan(colors,state!.values,[...(selected.assets.base?[selected.assets.base]:[]),...selected.assets.patches.flatMap(p=>p.geometries||(p.geometry?[p.geometry]:[]))]),extra=[];
   for(const ref of plan.assets)extra.push(await prepare(ref));
   const doc=customerGltfDocument(colors.materialDocument,customerSceneName,uri=>uri),uris=new Set<string>();
   for(const image of doc.images||[])if(typeof image.uri==='string')uris.add(image.uri);
   const publicUris=new Map<string,string>();for(const uri of uris)publicUris.set(uri,(await prepare({asset:uri})).url);
   for(const image of doc.images||[])image.uri=publicUris.get(image.uri);
   const selector=(key:string)=>{const [sha,...tail]=key.split(':');if(!assetMap.has(sha))throw Error('Desk surface identity unavailable');return assetMap.get(sha)+':'+tail.join(':');};
   desk={document:doc,materialIds:colors.materialIds.map(customerSceneName),materials:Object.fromEntries(Object.entries(plan.materials).map(([key,id])=>[selector(key),customerSceneName(id)])),hidden:plan.hidden.map(selector),assets:extra,pending:plan.pending.length>0};
  }
 }
 if(!selected){const preset=product.configurations.find(c=>c.id===scope.sample),pilot=preset?pilotSelection(product,preset.id):undefined;if(pilot?.variant.asset)assets.base=await prepare(pilot.variant);}
 const nativeCatalog=context.engine.catalog.catalogForProduct(product),legacyChair=!!state&&product.categorySlug==='kedes'&&!['structure-only','desk-components'].includes(nativeCatalog?.collectionMode||'');
 return {legacyChair,token:cap.seal('configuration',{...scope,state,revision:context.revision}),selectionId:cap.id('selection',{...scope,state,revision:context.revision}),productId:'product_public_'+cap.id('product',scope),name:customerLabel(product.textReviewHeading||productHeading(product),codes,'Biuro baldas'),controls,details:controls.map(c=>({label:c.label,value:c.choices.find(v=>v.id===c.value)?.label||'Pasirinkta'})),assets,finishes,desk,available3D:!!assets.base||assets.patches.some(p=>p.assets.length>0)||!!desk?.assets.length};
}
