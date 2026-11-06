import type {TextDefinition,TextEdit} from './text-review-types';
import {customerLabel} from './customer-names';
import type {Product} from './types';
import {furnitureTerminology} from './furniture-terminology';
export function textReviewProposalPreview(){
 return process.env.TEXT_REVIEW_PROPOSALS==='true'&&process.env.PUBLIC_ORIGIN==='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
}
export function suggestedModelTitle(p:Pick<Product,'categorySlug'|'modelConfigurationId'>,title:string){
 if(p.categorySlug!=='kedes'||!p.modelConfigurationId)return title;
 const terms:Record<string,string>={UPH:'su apmušalais',MESH:'su tinkleliu','5-STAR':'su penkių stipinų pagrindu'};
 return title.replace(/\b5-STAR(?:\s+UPH)?\b|\b(?:MESH|UPH)\b/g,term=>term.startsWith('5-STAR ')?'su penkių stipinų pagrindu ir apmušalais':terms[term]);
}
export function customerTextHasCode(def:TextDefinition,text:string){
 if(/\bK[A-Z0-9]{2,14}W[A-Z0-9]{3,}\b|\bC[A-Z]{4,}\b|\bR\d{2}[A-Z0-9]*\b|Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/.test(text))return true;
 const codes=[def.sourceCode,...def.sourceCode.split(/[.:=;,\s]+/)];return customerLabel(text,codes,'')!==customerLabel(text,[],'');
}
export function textReviewStatus(def:TextDefinition,edit?:TextEdit){
 if(!edit)return def.previousIds?.length?'changed' as const:'new' as const;
 if(edit.source_hash!==def.sourceHash)return 'changed' as const;
 return edit.state==='kept'?'approved' as const:edit.state;
}
export function publishedText(def:TextDefinition,edit:TextEdit|undefined,fallback:string){
 return furnitureTerminology(edit?.published_hash===def.sourceHash&&edit.published!==null?edit.published:fallback);
}
export function displayedReviewText(def:Pick<TextDefinition,'sourceHash'|'suggested'>,edit:TextEdit|undefined,fallback:string){
 if(textReviewProposalPreview()){
  if(edit?.source_hash===def.sourceHash){
   if(edit.state==='kept')return furnitureTerminology(fallback);
   if(edit.draft.trim())return furnitureTerminology(edit.draft);
  }
  return furnitureTerminology(def.suggested||fallback);
 }
 return furnitureTerminology(edit?.published_hash===def.sourceHash&&edit.published!==null?edit.published:fallback);
}
export function reviewCounts(entries:{status:string;published:boolean}[]){
 const done=entries.filter(e=>e.status==='approved').length;
 return {total:entries.length,done,remaining:entries.length-done,pendingPublish:entries.filter(e=>e.status==='approved'&&!e.published).length};
}
