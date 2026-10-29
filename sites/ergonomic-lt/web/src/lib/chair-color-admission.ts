/** PC2 palettes are observed states, not independently composable swatches.
 * Used only by the separately gated technical review, never the live loader.
 */
type Values=Record<string,string>;
type Binding={assetSha256:string;selectorId:string;baseMaterialId:string;materialId:string};
type Slot={selectorId:string;materialId:string;sourceNodePath:number[];primitive:number};
type Selectors={schema:string;assets:Record<string,{assetSha256:string;slots:Slot[]}>};
type BoundState={status:string;bindings:Binding[];materials?:Record<string,unknown>;targetOwnedRuntimeBindingProof?:boolean;generalizedAcrossConstructionContexts?:boolean;geometryReusedFromOtherModel?:boolean};
type FullRecord={actualStateSha256:string;field:string;value:string;finishControllerContext:Values;exactFullStateOverrideOnly:boolean;jointIndependentFinishCompositionValidated:boolean;binding:BoundState};
type FullPalette={schema:'chair-colors-full-state-329-v1';code:string;runtimeSha256:string;records:Record<string,FullRecord>;selectionLinks:Record<string,{actualStateSha256:string;context:Values;field:string;value:string}>};
type Pair=BoundState & {constructionScope:Values;finishAlternativeScope:Values;finishBaseScope:Values;requiresExactConstructionAndFinishScope:boolean;requiresExactObservedState:boolean;onlyThisObservedPairQualified:boolean;mode:string};
type PartialPalette={schema:'chair-colors-observed-partial-344-v1';code:string;runtimeSha256:string;actualPaletteComplete:false;observedPairs:Pair[]};
/** Captured original finishes only; the listed textual alternatives have no
 * admitted material bindings and must never become independent 3D swatches. */
export type BaseObservedPalette={schema:'chair-base-observed-colours-v1';sourceSchema:string;code:string;runtimeSha256:string;actualPaletteComplete:false;independentFinishCompositionAllowed:false;availableMaterialBindings:[];baselineObservedFinish:Record<string,{value:string;knownCurrentPrefixChoices:string[]}>};
export type BoundChairPalette=FullPalette|PartialPalette;
export type ChairPalette=BoundChairPalette|BaseObservedPalette;
export type ChairColorPlan={status:'original'|'observed-state'|'unavailable';resetOriginalMaterialsFirst:true;assignments:Binding[];materials:Record<string,unknown>;fullPalettePass:false;hidden?:{assetSha256:string;selectorId:string}[];assets?:import('./expanded-configurator').Asset[]};
const hash=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const matches=(scope:Values,values:Values)=>Object.entries(scope).every(([k,v])=>values[k]===v);
const exact=(a:Values,b:Values)=>Object.keys(a).length===Object.keys(b).length&&matches(a,b);
const empty=(status:ChairColorPlan['status']):ChairColorPlan=>({status,resetOriginalMaterialsFirst:true,assignments:[],materials:{},fullPalettePass:false});

/** Every assignment must name exactly one slot on this package's own asset. */
function admitBindings(state:BoundState,selectors:Selectors,activeAssets:Set<string>):ChairColorPlan{
 if(state.status!=='EXACT_SAVED_PAIR_OWN_RUNTIME_BINDINGS'||state.targetOwnedRuntimeBindingProof!==true||state.generalizedAcrossConstructionContexts!==false||state.geometryReusedFromOtherModel!==false||!state.bindings.length)return empty('unavailable');
 const seen=new Set<string>();
 for(const b of state.bindings){
  const asset=selectors.assets[b.assetSha256],slots=asset?.slots.filter(s=>s.selectorId===b.selectorId);
  if(!hash(b.assetSha256)||!hash(b.selectorId)||!hash(b.materialId)||!hash(b.baseMaterialId)||asset?.assetSha256!==b.assetSha256||slots?.length!==1||slots[0].materialId!==b.baseMaterialId||!state.materials?.[b.materialId])return empty('unavailable');
  const key=b.assetSha256+':'+b.selectorId;
  if(seen.has(key))return empty('unavailable');
  seen.add(key);
 }
 // The package may index the same observed surface on several mutually
 // exclusive component assets. Validate every own binding above, then apply
 // only the exact asset currently assembled. Never use an inactive variant's
 // selector or a matching name/material SHA to find a visible replacement.
 const assignments=state.bindings.filter(b=>activeAssets.has(b.assetSha256)).map(b=>({...b}));
 if(!assignments.length)return empty('unavailable');
 return {status:'observed-state',resetOriginalMaterialsFirst:true,assignments,materials:{...state.materials},fullPalettePass:false};
}

/** One whole observed state per request. Never merge two independent records.
 * The caller must already verify SHA256SUMS, the runtime SHA and actual GLB
 * node/primitive/world-matrix selectors before supplying this admission data.
 */
export function chairColorPlan(input:{palette:ChairPalette;selectors:Selectors;code:string;runtimeSha256:string;activeAssetSha256:string[];values:Values;selection:{kind:'original'}|{kind:'full-state';link:string}|{kind:'observed-pair';index:number};fullStateConstructionScope?:Values}):ChairColorPlan{
 const {palette,selectors,selection,values}=input;
 if(!hash(input.runtimeSha256)||palette.code!==input.code||palette.runtimeSha256!==input.runtimeSha256||selectors.schema!=='canonical-world-primitive-selectors-329-v1')return empty('unavailable');
 if(selection.kind==='original')return empty('original');
 if(palette.schema==='chair-base-observed-colours-v1')return empty('unavailable');
 const assets=new Set(input.activeAssetSha256);
 if(selection.kind==='full-state'){
  if(palette.schema!=='chair-colors-full-state-329-v1'||!input.fullStateConstructionScope||!matches(input.fullStateConstructionScope,values))return empty('unavailable');
  const link=palette.selectionLinks[selection.link],record=link&&palette.records[link.actualStateSha256];
  if(!record||!hash(record.actualStateSha256)||record.actualStateSha256!==link.actualStateSha256||record.exactFullStateOverrideOnly!==true||record.jointIndependentFinishCompositionValidated!==false||!exact(link.context,record.finishControllerContext)||!matches(link.context,values)||record.field!==link.field||record.value!==link.value||(link.field!=='__CONTEXT_DEFAULT__'&&values[link.field]!==link.value))return empty('unavailable');
  // The record represents a full-state override relative to original materials.
  // A caller must reset before applying it, even after another selected record.
  return admitBindings(record.binding,selectors,assets);
 }
 if(palette.schema!=='chair-colors-observed-partial-344-v1'||palette.actualPaletteComplete!==false||!Number.isSafeInteger(selection.index)||selection.index<0)return empty('unavailable');
 const pair=palette.observedPairs[selection.index];
 if(!pair||pair.requiresExactConstructionAndFinishScope!==true||pair.requiresExactObservedState!==true||pair.onlyThisObservedPairQualified!==true||pair.mode!=='materialFullObservedStateOverride'||!matches(pair.constructionScope,values)||!matches(pair.finishAlternativeScope,values))return empty('unavailable');
 return admitBindings(pair,selectors,assets);
}
