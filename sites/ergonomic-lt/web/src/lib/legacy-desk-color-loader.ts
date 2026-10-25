import {createHash} from 'node:crypto';
import {createChairCandidateLoader,type ChairCandidates} from './chair-structure-candidates';
import type {DeskColorCandidates} from './desk-component-candidates';
import {legacyDeskColorIdentity,validateDeskColors,withLegacyDeskColors} from './desk-colors';
import {RUNTIME_TRANSPORT_MAX_BYTES} from './runtime-transport-limits.mjs';
import type {Product} from './types';

/** Only the sealed eRange candidate opts in; every chair retains its original loader. */
export function createLegacyDeskColorLoader(entries:ChairCandidates,readAsset:(asset:string)=>Promise<Uint8Array>,colors:DeskColorCandidates){
 const loadOriginal=createChairCandidateLoader(entries,readAsset);
 return async(product:Product,input?:unknown)=>{
  const runtime=await loadOriginal(product,input),id=legacyDeskColorIdentity;
  if(!runtime||runtime.family.baseArticle!==id.code)return runtime;
  const overlay=colors.models[id.code];if(!overlay)return runtime;
  const original=entries.models[id.productId+':'+id.sample];
  if(colors.schemaVersion!==1||original?.runtime.sha256!==id.runtimeSha256||overlay.componentRuntimeSha256!==id.runtimeSha256||!/^[a-f0-9]{64}$/.test(overlay.sha256)||overlay.asset!=='/models/configurator/components/'+id.code+'-'+overlay.sha256.slice(0,20)+'.json')throw Error('Invalid legacy desk color binding');
  const bytes=await readAsset(overlay.asset);
  if(bytes.byteLength>RUNTIME_TRANSPORT_MAX_BYTES||createHash('sha256').update(bytes).digest('hex')!==overlay.sha256)throw Error('Legacy desk color overlay changed');
  const source:unknown=JSON.parse(Buffer.from(bytes).toString('utf8'));validateDeskColors(source,id.code,id.runtimeSha256);
  return withLegacyDeskColors(runtime,source);
 };
}
