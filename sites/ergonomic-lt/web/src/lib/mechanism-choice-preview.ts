/** One-chair UI trial. The keys remain server/admin-only supplier metadata. */
export function mechanismChoicePreview(model:string,field:string,preview:boolean){
 if(!preview||model!=='KBJA001WW002'||field!=='CMECHANISM')return undefined;
 // Short versions of the verified Bjarg explanations in option-mechanism-explanations.json.
 return {
  EAST:'Atskiras atlošo ir sėdynės pasvirimo bei sėdynės gylio reguliavimas.',
  ER:'Suderintas atlošo ir sėdynės judėjimas; atlošas fiksuojamas 5 padėtyse.',
  ERT:'Suderintas judėjimas ir reguliuojamas sėdynės gylis.',
  ERTN:'Reguliuojamas sėdynės gylis ir pasvirimas į priekį.',
  FS:'Suderintas atlošo ir sėdynės judėjimas; atlošas fiksuojamas 5 padėtyse.',
  FST:'Suderintas judėjimas; sėdynę galima pastumti pirmyn arba atgal.',
  SYNCROIBRATR:'Atskiras atlošo ir sėdynės pasvirimo bei sėdynės gylio reguliavimas.',
 } as Record<string,string>;
}
