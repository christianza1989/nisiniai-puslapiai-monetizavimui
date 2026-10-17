
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import pilotData from '../../content/configurator-pilot.json';
import type {Product,Configuration} from './types';
import {supplierOptions} from './configuration-labels';

export type PilotVariant={id:string;label:string;backrest:'duo'|'mesh'|'uph';asset:string;assetSha256:string;bytes:number;
  image:string;sourceCadUrl:string;sourceCadSha256:string;supplierCode:string;supplierOptions:string[];
  materialCodes:Record<string,string|null>;samples:Record<string,{code:string;name:string;image:string}>;visualizationNote:string};
export type PilotModel={productId:string;name:string;path:string;variants:PilotVariant[]};
export const pilotModels=pilotData.models as unknown as PilotModel[];
const sameOptions=(a:string[],b:string[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export function pilotForProduct(product:Product):PilotModel|undefined{
  const model=pilotModels.find(m=>m.productId===product.id);if(!model)return;
  const variants=model.variants.filter(v=>(!product.modelConfigurationId||v.id===product.modelConfigurationId)&&product.configurations.some(c=>c.id===v.id&&c.code===v.supplierCode&&sameOptions(supplierOptions(c),v.supplierOptions)));
  return variants.length?{...model,variants}:undefined;
}
export function pilotSelection(product:Product,id:string):{variant:PilotVariant;configuration:Configuration}|undefined{
  const variant=pilotForProduct(product)?.variants.find(v=>v.id===id);
  const configuration=product.configurations.find(c=>c.id===id);
  return variant&&configuration?{variant,configuration}:undefined;
}
export const backrestLabels={duo:'Duo-Back',mesh:'Tinklinis',uph:copyText("ui.69c248f6bd3df3d8a03d","Apmuštas")} as const;
