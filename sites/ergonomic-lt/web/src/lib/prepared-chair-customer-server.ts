import {isAdmin} from './auth';
import verifiedProposals from '../../content/text-review-option-proposals.json';
import inventory from '../../content/text-review-inventory.json';
import {canonicalReviewValue} from './text-review-value';
import {createHash} from 'node:crypto';
import entries from '../../content/pc2-chair-review-candidates.json';
import english from '../../content/manufacturer-english-review.json';
import {connectedChoiceModel} from './connected-choice-scope';
import {customerSourceAsset} from './customer-source-asset';
import {customerKey} from './customer-capability';
import {customerControlIds,type CustomerConfiguration} from './customer-configuration';
import {customerLabel,customerColourLabel} from './customer-names';
import {customerProductCodes} from './customer-product-presentation';
import {customerReviewProduct} from './customer-review-product';
import {buildReviewScope} from './text-review-server';
import {publishedReviewValue} from './text-review-value';
import {fieldLabels} from './choice-presentation';
import {configurationOptionLabel,supplierOptions} from './configuration-labels';
import {isColourField} from './colour-fields';
import {prepareCustomerAsset,customerSceneName} from './customer-assets-server';
import {customerGltfDocument} from './customer-glb';
import {chairMaterialDocument,type ChairPreview} from './chair-preview';
import {initialPreparedChair,preparedChairAssembly,preparedChairValues,preparedChairChoices} from './prepared-chair-choices';
import type {PreparedChairSelection} from './prepared-chair-selection';
import type {Product} from './types';
export type PreparedCustomerChair={entry:typeof entries.entries[number];data:ChairPreview};
const cache=new Map<string,Promise<PreparedCustomerChair>>();
const sharedOriginals=new Map<string,Set<string>>();
for(const[model,values]of Object.entries(english.models)){const meta=(inventory.models as Record<string,{path:string}>)[model];if(!meta||!meta.path.includes('/kedes/')&&!entries.entries.some(e=>e.code===model))continue;for(const[binding,text]of Object.entries(values)){const set=sharedOriginals.get(binding)||new Set<string>();set.add(text);sharedOriginals.set(binding,set);}}
function sourceText(code:string,field:string,value?:string){const binding=(value===undefined?'field:':'value:')+field+(value===undefined?'':'='+value),canonical=value===undefined?binding:'value:'+field+'='+canonicalReviewValue(code,field,value),own=(english.models as Record<string,Record<string,string>>)[code],shared=sharedOriginals.get(canonical)||sharedOriginals.get(binding);return own?.[binding]||own?.[canonical]||(shared?.size===1?[...shared][0]:undefined);}
function sourceProposal(field:string,value:string,original:string|undefined){const binding='value:'+field+'='+value,known=(verifiedProposals as Record<string,Record<string,string>>)[binding];return original?known?.[original.trim().replace(/\s+/g,' ').toLowerCase()]:undefined;}
export async function loadPreparedCustomerChair(product:Product):Promise<PreparedCustomerChair|undefined>{
 const identity=connectedChoiceModel(product,'prepared');if(!identity)return;
 const entry=entries.entries.find(e=>e.code===identity.code);if(!entry)throw Error('Trūksta paruošto modelio paketo.');
 let task=cache.get(entry.sha256);if(!task){task=(async()=>{
  const bytes=await customerSourceAsset(entry.asset);if(bytes.byteLength!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Kėdės paketo tapatybė pasikeitė.');
  const data=JSON.parse(Buffer.from(bytes).toString('utf8')) as ChairPreview;
  if(data.schema!=='pc2-chair-review-111-v1'||data.code!==entry.code||data.runtime.code!==entry.code||data.palette.code!==entry.code||data.palette.runtimeSha256!==data.runtimeSha256)throw Error('Netinkamas kėdės paketas.');
  return {entry,data};})();if(cache.size>=2)cache.delete(cache.keys().next().value!);cache.set(entry.sha256,task);task.catch(()=>cache.delete(entry.sha256));}return task;
}
export function preparedSupplierConfiguration(product:Product,source:PreparedCustomerChair,input?:PreparedChairSelection){
 const selection=input||initialPreparedChair(source.data),values=preparedChairValues(source.data,selection),sample=product.configurations.find(c=>c.id===product.modelConfigurationId)!;
 const original=supplierOptions(sample),byField=new Map(original.map(option=>{const i=option.indexOf('=');return [option.slice(0,i).split('.').at(-1)!,option];}));
 for(const [field,value]of Object.entries(values)){if(!/^(?:C|F|D|GD)[A-Z0-9_]+$/.test(field))continue;const prior=byField.get(field),key=prior?prior.slice(0,prior.indexOf('=')):field;byField.set(field,key+'='+value);}
 return {selection,values,sample,options:[...byField.values()],assembly:preparedChairAssembly(source.data,selection),evidence:{schemaVersion:1,kind:'validated-prepared-manufacturer-chair',packageSha256:source.entry.sha256,sourceRuntimeSha256:source.data.runtimeSha256,selection}};
}
/** Public glTF projection of an already admitted OWN primitive/material plan.
 * The existing renderer uses source node/primitive addresses; no geometry is rebuilt. */
async function publicPreparedAssembly(source:PreparedCustomerChair,selection:PreparedChairSelection){
 const assembly=preparedChairAssembly(source.data,selection),plan=assembly.chairColors.plan,data=source.data,map=new Map<string,string>();
 async function asset(ref:{asset:string;assetSha256?:string;bytes?:number}){const a=await prepareCustomerAsset(ref);if(ref.assetSha256)map.set(ref.assetSha256,a.sha256);return a;}
 const base=assembly.base?await asset(assembly.base):null,patches=[];
 for(const patch of assembly.patches){const assets=[];for(const ref of patch.geometries||(patch.geometry?[patch.geometry]:[]))assets.push(await asset(ref));patches.push({remove:patch.remove.map(customerSceneName),assets});}
 const extra=[];for(const ref of plan.assets||[])extra.push(await asset(ref));
 const document:{asset:{version:string};materials:unknown[];images:unknown[];textures:unknown[];samplers:unknown[];extensionsUsed:string[]}={asset:{version:'2.0'},materials:[],images:[],textures:[],samplers:[],extensionsUsed:[]},materialIds:string[]=[];
 for(const [id,material]of Object.entries(plan.materials)){
  const doc=chairMaterialDocument(material,data.textures),textureOffset=document.textures.length,imageOffset=document.images.length,samplerOffset=document.samplers.length;
  function shift(value:any):any{if(Array.isArray(value))return value.map(shift);if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='index'&&typeof v==='number'?v+textureOffset:shift(v)]));}
  document.materials.push(...(doc.materials as unknown[]).map(shift));document.images.push(...doc.images);document.textures.push(...(doc.textures as {source:number;sampler:number}[]).map(t=>({...t,source:t.source+imageOffset,sampler:t.sampler+samplerOffset})));document.samplers.push(...doc.samplers);document.extensionsUsed=[...new Set([...document.extensionsUsed,...doc.extensionsUsed])];materialIds.push(customerSceneName(id));
 }
 const imageUrls=new Map<string,string>();for(const image of document.images as {uri:string}[]){if(imageUrls.has(image.uri))continue;const proof=Object.values(data.textures).find(t=>t.asset===image.uri);if(!proof)throw Error('Nežinomas medžiagos paveikslas.');imageUrls.set(image.uri,(await asset({asset:proof.asset,assetSha256:proof.sha256,bytes:proof.bytes})).url);}
 const address=(sha:string,selector:string)=>{const slots=data.selectors.assets[sha]?.slots.filter(s=>s.selectorId===selector);if(slots?.length!==1||slots[0].sourceNodePath.length!==1||!map.has(sha))throw Error('Nežinomas medžiagos paviršius.');return map.get(sha)+':'+slots[0].sourceNodePath[0]+':'+slots[0].primitive;};
 return {assets:{base,patches},desk:{document:customerGltfDocument(document,customerSceneName,uri=>{const value=imageUrls.get(uri);if(!value)throw Error('Nežinoma tekstūra.');return value;}),materialIds,materials:Object.fromEntries(plan.assignments.map(b=>[address(b.assetSha256,b.selectorId),customerSceneName(b.materialId)])),hidden:(plan.hidden||[]).map(b=>address(b.assetSha256,b.selectorId)),assets:extra,pending:false}};
}
export async function preparedCustomerConfiguration(product:Product,source:PreparedCustomerChair,revision:string,input?:PreparedChairSelection,change?:{field:string;value:string}):Promise<CustomerConfiguration>{
 const cap=customerKey(),scope={product:product.id,sample:product.modelConfigurationId||null},ids=customerControlIds(cap,scope);let selection=input||initialPreparedChair(source.data),rows=preparedChairChoices(source.data,selection);
 if(change){const row=rows.find(r=>ids.field('prepared:'+r.key)===change.field),option=row?.options.find(o=>ids.choice('prepared:'+row.key,o.key)===change.value);if(!option)throw Error('Pasirinkimas nepriklauso šiai konstrukcijai.');selection=option.selection;rows=preparedChairChoices(source.data,selection);}
 const selected=preparedSupplierConfiguration(product,source,selection),code=source.data.code,review=await buildReviewScope(customerReviewProduct(product,code)),originals=(english.models as Record<string,Record<string,string>>)[code]||{},codes=customerProductCodes(product);
 for(const [field,value]of Object.entries(selected.values)){codes.add(field);codes.add(value);}for(const row of rows)for(const option of row.options)for(const [field,value]of Object.entries(option.values)){codes.add(field);codes.add(value);}
 const fieldName=(f:string)=>customerLabel(publishedReviewValue(review,code,f)||configurationOptionLabel(f)||fieldLabels[f]||sourceText(code,f),codes,isColourField(f)?'Spalva':'Parinktis');
 const valueName=(f:string,v:string)=>{const original=sourceText(code,f,v),published=publishedReviewValue(review,code,f,v),text=(isColourField(f)?published:customerLabel(published,codes,''))||sourceProposal(f,v,original)||original;return isColourField(f)?customerColourLabel(text||v,codes,'Spalva',[v]):customerLabel(text,codes,'Gamintojo variantas');};
 const tuple=(fields:string[],values:Record<string,string>)=>fields.filter(f=>values[f]!==undefined&&!/PRICE|PACK|ASSEMBLY/.test(f)).map(f=>(fields.length>1?fieldName(f)+': ':'')+valueName(f,values[f])).join(' · ')||'Pradinė apdaila';
 let admin=false;try{admin=await isAdmin();}catch{}
 const controls=rows.map(row=>{const fields=row.fields.filter(f=>!/PRICE|PACK|ASSEMBLY/.test(f));return {id:ids.field('prepared:'+row.key),...(admin?{adminCodes:fields.filter(f=>selected.values[f]!==undefined).map(f=>f+'='+selected.values[f])}:{}),label:row.key.startsWith('chair-material-')?'Apmušalas':row.key==='construction'?'Konstrukcija':row.key==='finish-state'?'Apdailos derinys':row.key==='finish-branch'?'Apdailos grupė':fields.map(fieldName).join(' / ')||'Apdaila',value:ids.choice('prepared:'+row.key,row.current),choices:row.options.map(o=>({id:ids.choice('prepared:'+row.key,o.key),label:row.key==='finish-state'&&o.key==='original'?'Pradinė apdaila':row.key.startsWith('chair-material-')?tuple(fields.slice(0,1),o.values):tuple(fields,o.values)})),...(!fields.every(isColourField)?{mechanismPreview:true}:{})};});
 const details=Object.entries(selected.values).filter(([f])=>/^(?:C|F|D|GD)/.test(f)&&!/PRICE|PACK|ASSEMBLY/.test(f)).map(([f,v])=>({label:fieldName(f),value:valueName(f,v)}));
 const name=customerLabel(product.customerHeading||product.textReviewHeading||product.name,codes,'Biuro kėdė'),publicAssembly=await publicPreparedAssembly(source,selection);
 return {token:cap.seal('configuration',{...scope,prepared:selection,revision}),selectionId:cap.id('selection',{...scope,prepared:selection,revision}),productId:'product_public_'+cap.id('product',scope),name,controls,steps:[{id:'configuration',label:'Komplektacija',controls:controls.map(c=>c.id)}],details,...publicAssembly,finishes:{},available3D:!!publicAssembly.assets.base||publicAssembly.assets.patches.some(p=>p.assets.length>0)};
}
