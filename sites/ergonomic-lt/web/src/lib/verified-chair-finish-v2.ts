import {createHash} from 'node:crypto';
import overlays from '../../content/verified-chair-finish-v2.json';
import type {ChairPreview} from './chair-preview';
/** Stage-only caller supplies the verified immutable package identity. The
 * evidence is an exact OWN before/after contrast, not a palette inferred from
 * a field name or transplanted from another construction. */
export function verifiedChairFinishV2(data:ChairPreview,packageSha256:string){
 const overlay=(overlays as Record<string,unknown>)[data.code] as typeof overlays.KXLI002WW002|undefined;
 if(!overlay)return;
 if(overlay.packageSha256!==packageSha256||overlay.currentRuntimeSha256!==data.runtimeSha256||data.qualified)throw Error('Spalvų įrodymas neatitinka kėdės paketo.');
 const witness=overlay.qualified.witnesses[0],context=data.runtime.contexts[witness.context];
 const values={...context?.dimensions,...Object.assign({},...context?.groups.map((g,i)=>g.variants[witness.variants[i]]?.values)||[])};
 const active=[context?.invariant?.sha256,...context?.groups.map((g,i)=>g.variants[witness.variants[i]]?.asset?.sha256)||[]].filter(Boolean);
 if(JSON.stringify(values)!==JSON.stringify(witness.construction)||active.length!==witness.requiredAssets.length||!active.every(h=>witness.requiredAssets.includes(h!))||data.palette.schema!=='chair-base-observed-colours-v1'||!Object.entries(overlay.fullBeforeFinish).every(([k,v])=>data.palette.schema==='chair-base-observed-colours-v1'&&data.palette.baselineObservedFinish[k]?.value===v))throw Error('Spalvų konstrukcijos arba pradinės apdailos įrodymas pasikeitė.');
 data.selectors={...data.selectors,assets:{...data.selectors.assets,...overlay.selectors}};
 data.textures={...data.textures,...overlay.textures};
 data.qualified=overlay.qualified as unknown as NonNullable<ChairPreview['qualified']>;
 return createHash('sha256').update(JSON.stringify(overlay)).digest('hex');
}
