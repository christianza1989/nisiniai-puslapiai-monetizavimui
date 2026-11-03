import type {ExpandedState} from './expanded-engine';
import type {customerCapabilities} from './customer-capability';
import type {ResolvedFinish} from './viewer-resolved-finish';
export type CustomerState={product:string;sample:string|null;state?:ExpandedState};
export type CustomerControl={id:string;label:string;value:string;choices:{id:string;label:string}[];disabled?:boolean;note?:string};
export type CustomerAsset={url:string;sha256:string;bytes:number};
export type CustomerConfiguration={token:string;selectionId:string;productId:string;name:string;controls:CustomerControl[];details:{label:string;value:string}[];assets:{base:CustomerAsset|null;patches:{remove:string[];assets:CustomerAsset[]}[]};finishes:Record<string,ResolvedFinish>;legacyChair?:boolean;desk?:{document:Record<string,any>;materialIds:string[];materials:Record<string,string>;hidden:string[];assets:CustomerAsset[];pending:boolean};available3D:boolean};
type Capabilities=ReturnType<typeof customerCapabilities>;
/** Same source value in two different fields never acquires the same public choice identity. */
export function customerControlIds(cap:Capabilities,scope:{product:string;sample:string|null}){
 return {field:(field:string)=>cap.id('field',[scope,field]),choice:(field:string,value:string)=>cap.id('choice',[scope,field,value])};
}
export function resolveCustomerChange(controls:Record<string,string[]>,ids:ReturnType<typeof customerControlIds>,change:{field:string;value:string}){
 const field=Object.keys(controls).find(f=>ids.field(f)===change.field),value=field?controls[field].find(v=>ids.choice(field,v)===change.value):undefined;
 if(!field||value===undefined)throw Error('Pasirinkimas nebegalioja. Atnaujinkite komplektaciją.');return {field,value};
}
