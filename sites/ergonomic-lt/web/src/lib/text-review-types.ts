export type TextDefinition={id:string;sourceHash:string;role:string;english:string;polish:string;sourceCode:string;suggested:string;context:string;notes:string;current:string[];modelCount:number;previousIds?:string[]};
export type TextEdit={key:string;source_hash:string;draft:string;state:'draft'|'approved'|'kept';revision:number;published:string|null;published_hash:string|null;updated_at:string};
export type ReviewEntry=TextDefinition&{currentText:string;originalColourName?:string;edit?:TextEdit;globalEdit?:TextEdit;status:'new'|'changed'|'draft'|'approved';published:boolean;key:string;shared:boolean;model:string;sourceUrl:string;configuratorUrl:string;affected:number;customerNameRequired?:boolean;englishReference?:boolean;englishCatalogueUrl?:string;optionCodes?:string[]};
export type PublicTextScope={scope:string;model:string;bindings:Record<string,Record<string,string>>;values:Record<string,string>;originals:Record<string,string>;colourNames?:Record<string,string>};
export type ReviewScope={publicScope:PublicTextScope;entries:ReviewEntry[];productId:string;model:string;title:string;path:string;complete:boolean;total:number;done:number;remaining:number;pendingPublish:number;inventoryAt:string;proposalPreview?:boolean};
export const contentTextKey=(scope:string,kind:string)=>'content:'+scope+':'+kind;
export const paragraphKind=(kind:string,index:number)=>kind+':'+index;
