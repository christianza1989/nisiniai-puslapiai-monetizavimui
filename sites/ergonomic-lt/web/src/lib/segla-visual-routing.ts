import type {ChairReviewSource} from './chair-review-routing';
export type SeglaVisualRepresentative={id:string;label:string;code:string;asset:{asset:string;assetSha256:string;bytes:number};options:Record<string,string>;dimensions:Record<string,string>;defaultFinish:Record<string,string|undefined>;sourceKind:string};
export type SeglaVisualMapping={id:string;visualId:string;options:Record<string,string>;dimensions:Record<string,string>;mode:string;exactRoute?:{constructionId:string;finishId:string;source:ChairReviewSource;witness:string;single:string}};
export type SeglaVisualSupplement={mapSha256:string;representatives:SeglaVisualRepresentative[];mappings:SeglaVisualMapping[]};
/** Exact admitted construction AND finish wins. The fallback never inherits a palette. */
export function resolveSeglaVisual(s:SeglaVisualSupplement,code:string,visualId:string,mappingId:string){
 const representative=s.representatives.find(r=>r.id===visualId&&r.code===code);
 const mapping=s.mappings.find(m=>m.id===mappingId&&m.visualId===visualId);
 if(!representative||!mapping||mapping.options.CARMRESTS!==representative.options.CARMRESTS||mapping.options.CBASE!==representative.options.CBASE)throw Error('UNRESOLVED_VISIBLE_PAIR');
 return {representative,mapping,exactRoute:mapping.exactRoute,mode:mapping.exactRoute?'EXACT_QUALIFIED_ROUTE':mapping.mode};
}
