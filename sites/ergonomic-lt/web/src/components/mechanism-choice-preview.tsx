'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

export type MechanismPreviewChoice={id:string;label:string;summary?:string};
/** Supplier-free control shared by the visitor view and the authenticated editor. */
export function MechanismChoicePreview({label,value,choices,disabled,onChange,explanation}:{label:string;value:string;choices:MechanismPreviewChoice[];disabled?:boolean;onChange:(value:string)=>void;explanation?:ReactNode}){
 const id=useId(),menu=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null);
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 const unavailable=disabled||!ready;
 const selected=choices.find(choice=>choice.id===value);
 function choose(next:string){if(unavailable)return;onChange(next);if(menu.current)menu.current.open=false;trigger.current?.focus();}
 return <div className="mechanism-preview" data-control-ready={ready}>
  <span id={id+'-label'} className="mechanism-preview-label">{label}</span>
  <details ref={menu} className="mechanism-preview-menu" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();e.currentTarget.open=false;trigger.current?.focus();}}}>
   <summary ref={trigger} aria-labelledby={id+'-label '+id+'-selected'} aria-disabled={unavailable||undefined} onClick={e=>{if(unavailable)e.preventDefault();}}><span><strong id={id+'-selected'}>{selected?.label}</strong>{selected?.summary&&<span className="mechanism-preview-short">{selected.summary}</span>}</span><ChevronDown size={18} aria-hidden="true"/></summary>
   <fieldset disabled={unavailable} className="mechanism-preview-options"><legend className="sr-only">{label}</legend>{choices.map(choice=><label key={choice.id} className="mechanism-preview-option"><input type="radio" name={id} value={choice.id} checked={choice.id===value} onChange={()=>choose(choice.id)}/><span><strong>{choice.label}</strong>{choice.summary&&<span className="mechanism-preview-short">{choice.summary}</span>}</span></label>)}</fieldset>
  </details>
  {explanation&&<details key={value} className="mechanism-preview-more"><summary>Daugiau apie pasirinktą mechanizmą</summary>{explanation}</details>}
 </div>;
}
