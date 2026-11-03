import type {TextDefinition,TextEdit} from './text-review-types';
import {customerLabel} from './customer-names';
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
 return edit?.published_hash===def.sourceHash&&edit.published!==null?edit.published:fallback;
}
export function reviewCounts(entries:{status:string;published:boolean}[]){
 const done=entries.filter(e=>e.status==='approved').length;
 return {total:entries.length,done,remaining:entries.length-done,pendingPublish:entries.filter(e=>e.status==='approved'&&!e.published).length};
}
