'use client';
import {createContext,useContext,useState,useEffect,useCallback,type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import {Pencil} from 'lucide-react';
import type {PublicTextScope,ReviewScope} from '@/lib/text-review-types';
const Panel=dynamic(()=>import('./text-review-panel'),{ssr:false});
type ReviewContext={editing:boolean;open:(id:string)=>void;binding:(model:string,field:string,value?:string)=>string;resolve:(id:string,fallback:string,model?:string)=>string;known:(id:string,fallback:string)=>boolean;scope:string;model:string};
const empty:ReviewContext={editing:false,open:()=>{},binding:()=>'',resolve:(_,fallback)=>fallback,known:()=>false,scope:'',model:''};
const Context=createContext<ReviewContext>(empty);
export const useTextReview=()=>useContext(Context);
export function TextReviewProvider({initial,admin,children}:{initial:PublicTextScope;admin?:ReviewScope;children:ReactNode}){
 const [scope,setScope]=useState(admin),[editing,setEditing]=useState(false),[selected,setSelected]=useState('');
 const [publicState,setPublicState]=useState(initial);
 useEffect(()=>{if(admin)setEditing(sessionStorage.getItem('ergonomic-text-edit')==='1'||new URLSearchParams(location.search).get('redaguoti')==='1');},[admin]);
 const publicScope=scope?.publicScope||publicState;
 useEffect(()=>{
  if(!admin)return;
  let current=true;
  const refresh=()=>{const code=document.querySelector<HTMLElement>('[data-chair-code]')?.dataset.chairCode;const url=code?'/api/admin/text-review/?code='+encodeURIComponent(code):'/api/admin/text-review/?'+new URLSearchParams({product:admin.productId,sample:admin.publicScope.scope.slice(admin.productId.length+1)});fetch(url).then(r=>r.ok?r.json():undefined).then(value=>{if(current&&value)setScope(value);}).catch(()=>{});};
  const channel=new BroadcastChannel('ergonomic-text-review');channel.onmessage=refresh;window.addEventListener('focus',refresh);
  return()=>{current=false;channel.close();window.removeEventListener('focus',refresh);};
 },[admin]);
 const update=(value:ReviewScope)=>{setScope(value);const channel=new BroadcastChannel('ergonomic-text-review');channel.postMessage({changed:true});channel.close();};
 useEffect(()=>{
  let code=initial.model,controller:AbortController|undefined;
  const changed=()=>{const next=document.querySelector<HTMLElement>('[data-chair-code]')?.dataset.chairCode;if(!next||next===code)return;code=next;controller?.abort();controller=new AbortController();
   const signal=controller.signal,url=admin?'/api/admin/text-review/?code=':'/api/text-review/?code=';
   fetch(url+encodeURIComponent(next),{signal}).then(async r=>{if(!r.ok)throw Error('Modelio tekstai nepasiekiami.');return r.json();}).then(value=>{if(signal.aborted)return;if(admin)setScope(value);else setPublicState(value);setSelected('');}).catch(error=>{if(error.name!=='AbortError')console.warn('Nepavyko atnaujinti modelio tekstų.');});
  };
  const observer=new MutationObserver(changed);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-chair-code']});changed();
  return()=>{observer.disconnect();controller?.abort();};
 },[initial.model,admin]);
 const binding=useCallback((model:string,field:string,value?:string)=>publicScope.bindings[model]?.[(value===undefined?'field:':'value:')+field+(value===undefined?'':'='+value)]||'',[publicScope]);
 function resolve(id:string,fallback:string,model=publicScope.model){
  if(!id)return fallback;
  if(publicScope.originals[id]!==undefined&&publicScope.originals[id]!==fallback)return fallback;
  const entry=editing?scope?.entries.find(e=>e.id===id):undefined,edit=entry?.edit;
  if(edit&&edit.source_hash===entry?.sourceHash&&edit.state!=='kept'&&edit.draft&&(edit.key===id||entry.model===model))return edit.draft;
  let value=publicScope.values[model+':'+id]||publicScope.values[id]||fallback;
  if(id.endsWith(':title'))for(const [key,termId]of Object.entries(publicScope.bindings[model]||{}))if(key.startsWith('name:')){
   const word=key.slice(5),replacement=publicScope.values[model+':'+termId];
   if(replacement){const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');value=value.replace(new RegExp('(^|[^A-Za-z0-9])'+escaped+'(?=$|[^A-Za-z0-9])','g'),(_,prefix)=>prefix+replacement);}
  }
  return value;
 }
 const toggle=()=>setEditing(v=>{sessionStorage.setItem('ergonomic-text-edit',v?'0':'1');return !v;});
 return <Context.Provider value={{editing,open:setSelected,binding,resolve,known:(id,fallback)=>!!id&&(publicScope.originals[id]===undefined||publicScope.originals[id]===fallback),scope:publicScope.scope,model:publicScope.model}}>{children}
 {scope&&<Panel scope={scope} update={update} editing={editing} toggle={toggle} selected={selected} select={setSelected}/>}
 </Context.Provider>;
}
export function TextValue({id,fallback,model}:{id:string;fallback:string;model?:string}){
 const context=useTextReview(),editable=context.editing&&context.known(id,fallback);
 return <span data-text-review-id={id||undefined} className={editable?'review-target':undefined} role={editable?'button':undefined} tabIndex={editable?0:undefined} title={editable?'Redaguoti tekstą':undefined} onClick={editable?e=>{e.preventDefault();e.stopPropagation();context.open(id);}:undefined} onKeyDown={editable?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();context.open(id);}}:undefined}>{context.resolve(id,fallback,model)}</span>;
}
export function ReviewFieldButton({model,field,value}:{model:string;field:string;value:string}){
 const review=useTextReview();if(!review.editing)return null;
 const label=review.binding(model,field),choice=review.binding(model,field,value);
 return <div className="review-field-actions">{label&&<button type="button" onClick={()=>review.open(label)}><Pencil size={14}/> Pavadinimas</button>}{choice&&<button type="button" onClick={()=>review.open(choice)}><Pencil size={14}/> Pasirinktas tekstas</button>}</div>;
}
