'use client';
import {useEffect,useRef,useState,type ComponentProps,type ComponentType} from 'react';
import type Viewer3D from './viewer-3d-core';
import {copyText} from '@/lib/editorial-copy';
import {activateProductViewerWhenNear} from '@/lib/viewer-activation';
type Props=ComponentProps<typeof Viewer3D>&{legacyChair?:boolean};

// Keep the loading stage's dimensions and accessible focus target while the
// visitor reads the page. The original renderer, materials and controls load
// unchanged when this stage is reached; no second click is required.
export default function DeferredViewer3D({legacyChair,...props}:Props){
 const host=useRef<HTMLDivElement>(null),restoreFocus=useRef(false);
 const [stage,setStage]=useState<HTMLDivElement|null>(null);
 const [active,setActive]=useState(false),[attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
 const [Viewer,setViewer]=useState<ComponentType<Props>>();
 const [roles,setRoles]=useState<Props['legacyRoleAdapter']>();
 useEffect(()=>{if(stage)return activateProductViewerWhenNear(stage,()=>setActive(true));},[stage]);
 useEffect(()=>{
  if(!active)return;let closed=false;setFailed(false);
  Promise.all([import('./viewer-3d-core'),legacyChair?import('@/lib/viewer-public-chair-roles'):undefined]).then(([module,adapter])=>{if(!closed){setRoles(adapter?.publicChairRoleAdapter);setViewer(()=>module.default);}},()=>{if(!closed)setFailed(true);});
  return()=>{closed=true;};
 },[active,attempt,legacyChair]);
 useEffect(()=>{if(Viewer&&restoreFocus.current)host.current?.querySelector('canvas')?.focus({preventScroll:true});},[Viewer]);
 return <div ref={host} style={{display:'contents'}}>{Viewer?<Viewer {...props} legacyRoleAdapter={legacyChair?roles:props.legacyRoleAdapter}/>:<div className="viewer-3d" data-state={failed?'error':'loading'} data-color-state="original" data-variant={props.variant.id}>
  <div ref={setStage} className="viewer-stage" aria-busy={!failed}>
   <canvas tabIndex={0} role="img" aria-label={copyText("ui.3b0c2ba761f32717f690","{{p0}} 3D modelis. Rodyklėmis pasukite, pliusu ir minusu keiskite mastelį, F apžiūrėkite apmušalą, Home atkurkite vaizdą.",{p0:props.name})} onFocus={()=>{restoreFocus.current=true;setActive(true);}}/>
   {failed?<div className="viewer-message" role="alert"><p>{copyText("ui.f4932f22135bf006a99b","Nepavyko parodyti 3D modelio. Bandykite dar kartą arba rinkitės nuotraukų peržiūrą.")}</p><button className="button outline" onClick={()=>setAttempt(n=>n+1)}>{copyText("ui.9b6dd1a2e70b58ac82ea","Bandyti dar kartą")}</button></div>:<p className="viewer-message" role="status">{copyText("ui.d1818a488c16805e4761","Įkeliamas 3D modelis…")}</p>}
  </div>
 </div>}</div>;
}
