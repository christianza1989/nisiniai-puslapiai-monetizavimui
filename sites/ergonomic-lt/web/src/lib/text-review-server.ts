import {createHash} from 'node:crypto';
import inventoryData from '../../content/text-review-inventory.json';
import {dbAll,dbAtomic} from './text-review-db';
import {publicProductView} from './public-product-copy';
import {studioDescriptionParagraphs,productStudioPresentation} from './product-studio';
import {configurableArticle} from './configuration-article';
import {publishedText,textReviewStatus,reviewCounts} from './text-review-state';
import {contentTextKey,type ReviewScope,type ReviewEntry,type TextDefinition,type TextEdit} from './text-review-types';
import type {Product} from './types';

type Inventory={at:string;terms:Record<string,TextDefinition>;models:Record<string,{productId:string;sample:string;name:string;path:string;sourceUrl:string;bindings:Record<string,string>;current:Record<string,string>;inventoryComplete:boolean}>};
const inventory=inventoryData as unknown as Inventory;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const localTextKey=(model:string,id:string)=>'local:'+model+':'+id;
export const productTextScope=(p:Product)=>p.id+':'+(p.modelConfigurationId||'line');
export function contentDefinitions(p:Product):TextDefinition[]{
 const v=publicProductView(p),original=publicProductView({...p,textReviewHeading:undefined}),scope=productTextScope(p),out:TextDefinition[]=[];
 const put=(kind:string,text:string,context:string,source=text)=>{if(!text?.trim())return;out.push({id:contentTextKey(scope,kind),sourceHash:hash(source),role:'Produkto tekstas',english:kind==='title'?'':kind==='description:0'?p.sourceDescription||'':'',polish:'',sourceCode:'',suggested:text,context,notes:'Atskiro parengto pasiūlymo šiam tekstui dar nėra. Galite įrašyti savo variantą arba palikti esamą.',current:[text],modelCount:1});};
 put('title',v.publicHeading||v.name,'Produkto pavadinimas',original.publicHeading||original.name);
 studioDescriptionParagraphs(v.description).forEach((s,i)=>put('description:'+i,s,'Aprašymo pastraipa '+(i+1)));
 const intro=configurableArticle(v)?.intro||v.modelArticle?.paragraphs||[];
 productStudioPresentation(v,intro).overview.forEach((s,i)=>put('intro:'+i,s,'Įžangos pastraipa '+(i+1)));
 return out;
}
export async function allTextEdits(){return new Map((await dbAll<TextEdit>('SELECT * FROM text_review_edits')).map(r=>[r.key,r]));}
export function inventoryModels(){return inventory.models;}
export function inventoryTerms(){return inventory.terms;}
export async function reviewProductForCode(code:string){
 const m=inventory.models[code];
 const {catalogAsync}=await import('./catalog'),{modelProduct}=await import('./product-models');
 const p=(await catalogAsync()).products.find(p=>m?p.id===m.productId:p.configurations.some(c=>c.code===code)),c=p?.configurations.find(c=>(!m||c.id===m.sample)&&c.code===code);
 return p&&c?modelProduct(p,c):undefined;
}
function modelFor(p:Product){return p.configurations.find(c=>c.id===p.modelConfigurationId)?.code||p.configurations.find(c=>c.code)?.code||productTextScope(p);}
export async function buildReviewScope(p:Product,providedEdits?:Map<string,TextEdit>):Promise<ReviewScope>{
 const scope=productTextScope(p),model=modelFor(p),known=inventory.models[model],defs=contentDefinitions(p);
 const codes=[...new Set(p.configurations.map(c=>c.code).filter((c):c is string=>!!c&&!!inventory.models[c]))];
 if(known&&!codes.includes(model))codes.unshift(model);
 const bindings=Object.fromEntries(codes.map(code=>[code,inventory.models[code].bindings]));
 const ids=[...new Set(known?Object.values(known.bindings):[])];
 defs.push(...ids.map(id=>inventory.terms[id]).filter(Boolean));
 let edits=providedEdits;
 if(!edits){
  edits=new Map();const keys=[...new Set([...defs.map(d=>d.id),...codes.flatMap(code=>Object.values(bindings[code]).flatMap(id=>[id,localTextKey(code,id)]))])];
  for(let i=0;i<keys.length;i+=70){const batch=keys.slice(i,i+70);for(const row of await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key IN ('+batch.map(()=>'?').join(',')+')',...batch))edits.set(row.key,row);}
 }
 const values:Record<string,string>={};
 for(const code of codes)for(const id of new Set(Object.values(bindings[code]))){
  const def=inventory.terms[id];if(!def)continue;
  const local=edits.get(localTextKey(code,id)),global=edits.get(id);
  const fallback=publishedText(def,global,'');
  const value=publishedText(def,local,fallback);
  if(value)values[code+':'+id]=value;
 }
 for(const d of defs.filter(d=>d.role==='Produkto tekstas')){const value=publishedText(d,edits.get(d.id),'');if(value)values[d.id]=value;}
 const entries:ReviewEntry[]=defs.map(def=>{
  const shared=def.role!=='Produkto tekstas',global=edits!.get(def.id),local=shared?edits!.get(localTextKey(model,def.id)):undefined;
  const edit=local||global,status=textReviewStatus(def,edit);
  const originalText=shared?known?.current[def.id]||def.current[0]||def.sourceCode:def.current[0];
  const currentText=publishedText(def,local,publishedText(def,global,originalText));
  const config=p.configurations.find(c=>c.code===model);
  const isPublished=status==='approved'&&(edit?.state==='kept'||edit?.published_hash===def.sourceHash&&edit.published===edit.draft);
  return {...def,currentText,edit,globalEdit:global,status,published:!!isPublished,key:local?.key||def.id,shared,model,sourceUrl:p.sourceUrl,configuratorUrl:config?.configurator||'',affected:shared?def.modelCount:1};
 });
 const originals=Object.fromEntries(defs.filter(d=>d.role==='Produkto tekstas').map(d=>[d.id,d.current[0]]));
 return {publicScope:{scope,model,bindings,values,originals},entries,productId:p.id,model,title:publicProductView(p).publicHeading||p.name,path:'/produktai/'+p.categorySlug+'/'+p.slug+'/',complete:!!known?.inventoryComplete,...reviewCounts(entries),inventoryAt:inventory.at};
}
export type ReviewAction='draft'|'approve'|'keep'|'publish'|'unpublish';
export class ReviewConflict extends Error{}
export async function mutateText(def:TextDefinition,args:{key:string;sourceHash:string;expectedRevision:number;text?:string;action:ReviewAction}){
 if(args.sourceHash!==def.sourceHash)throw new ReviewConflict('Pasikeitė teksto šaltinis. Atnaujinkite puslapį.');
 if(!Number.isSafeInteger(args.expectedRevision)||args.expectedRevision<0)throw Error('Neteisinga teksto versija.');
 const prior=await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE key=?',args.key);
 const previous=prior[0];
 if((previous?.revision||0)!==args.expectedRevision)throw new ReviewConflict('Šį tekstą jau pakeitė kita sesija. Atnaujinkite įrašą.');
 let text=(args.text??previous?.draft??'').trim();
 if(args.action!=='keep'&&args.action!=='unpublish'&&(!text||text.length>12000||/<[^>]*>|\[\[(?:open|close|void)/.test(text)))throw Error('Įrašykite tekstą be HTML žymų (iki 12 000 ženklų).');
 if(def.id.endsWith(':title')&&text.length>250)throw Error('Pavadinimas gali būti iki 250 ženklų.');
 if(def.role!=='Produkto tekstas'&&text.length>500)throw Error('Parinkties tekstas gali būti iki 500 ženklų.');
 if(/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i.test(text))throw Error('Viešame tekste negalima skelbti vidinės tiekėjo tapatybės.');
 if(args.action==='publish'&&(previous?.state!=='approved'||previous.source_hash!==def.sourceHash||previous.draft!==text))throw new ReviewConflict('Prieš skelbdami patvirtinkite dabartinę teksto versiją.');
 let state:TextEdit['state']=args.action==='draft'?'draft':args.action==='keep'?'kept':previous?.state||'approved';
 if(args.action==='approve')state='approved';
 if(args.action==='keep')text='';
 const published=args.action==='publish'?text:args.action==='unpublish'?null:previous?.published??null;
 const publishedHash=args.action==='publish'?def.sourceHash:args.action==='unpublish'?null:previous?.published_hash??null;
 const at=new Date().toISOString();
 const result=await dbAtomic([
  {sql:'INSERT OR IGNORE INTO text_review_edits(key,source_hash,draft,state,revision,updated_at) VALUES(?,?,?,?,0,?)',params:[args.key,def.sourceHash,'','draft',at]},
  {sql:'UPDATE text_review_edits SET source_hash=?,draft=?,state=?,revision=revision+1,published=?,published_hash=?,updated_at=? WHERE key=? AND revision=?',params:[def.sourceHash,text,state,published,publishedHash,at,args.key,args.expectedRevision]},
  {sql:'INSERT INTO text_review_history(key,action,source_hash,text,revision,actor,at) SELECT ?,?,?,?,?,?,? WHERE changes()=1',params:[args.key,args.action,def.sourceHash,text,args.expectedRevision+1,'admin',at]},
 ]);
 const update=result[1] as unknown as {changes?:number;meta?:{changes:number}};
 if((update.changes??update.meta?.changes)!==1)throw new ReviewConflict('Teksto versijos konfliktas. Atnaujinkite įrašą.');
 return args.expectedRevision+1;
}
