import data from '../../content/configurator-expanded.json';
import {catalogFamilies,catalogPalettes,type CatalogRuntime,type CatalogFamily} from './catalog-configurator';
import {createScopedExpandedEngine,type Family,type PaletteItem,type ExpandedEngineSources} from './expanded-engine';
import {choiceLabel as presentationChoiceLabel} from './choice-presentation';
import type {Product} from './types';
export * from './expanded-engine';
export const families=[...data.families,...catalogFamilies] as unknown as Family[];
export const palettes:Record<string,Record<string,PaletteItem>>={...data.palettes};for(const[k,v]of Object.entries(catalogPalettes))palettes[k]={...palettes[k],...v};
export function choiceLabel(field:string,value:string,localPalettes?:CatalogRuntime['palettes'],family?:string){return presentationChoiceLabel(field,value,localPalettes,family,palettes);}
export function createExpandedEngine(runtime?:CatalogRuntime){return createScopedExpandedEngine(runtime,{families,catalogFamilies,palettes});}
// Preserve the entire active captured family and every local runtime palette.
// Only facts from unrelated products are excluded from this client's payload.
export function expandedClientSources(product:Product,runtime?:CatalogRuntime):ExpandedEngineSources{
 const family=createExpandedEngine(runtime).expandedForProduct(product);
 if(!family)return {families:[],catalogFamilies:[],palettes:{}};
 const tokens=new Set<string>();
 const visit=(value:unknown)=>{if(typeof value==='string')tokens.add(value);else if(value&&typeof value==='object')for(const[key,child]of Object.entries(value)){tokens.add(key);visit(child);}};
 visit(family);visit(runtime);
 const local=runtime?.palettes||{},scopedPalettes:typeof palettes={};
 for(const[field,entries]of Object.entries(palettes)){
  const selected=field.startsWith('_')?entries:Object.fromEntries(Object.entries(entries).filter(([value])=>tokens.has(value)&&!local[field]?.[value]));
  if(Object.keys(selected).length)scopedPalettes[field]=selected;
 }
 return {families:family.kind?[]:[family],catalogFamilies:!runtime?.family&&family.kind==='catalog'?[family as unknown as CatalogFamily]:[],palettes:scopedPalettes};
}
export const {expandedForProduct,anchorFor,stateChoices,initialState,initialStateForProduct,changeField,validateState,stateToken,parseStateToken,assembledAssets,stateDetails,expandedSelection}=createExpandedEngine();

