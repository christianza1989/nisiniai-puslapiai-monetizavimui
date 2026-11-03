import type {TextDefinition,TextEdit} from './text-review-types';
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
