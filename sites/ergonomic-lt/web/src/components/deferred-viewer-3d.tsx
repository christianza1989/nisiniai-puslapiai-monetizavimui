'use client';
import {useEffect,useRef,useState,type ComponentProps,type ComponentType} from 'react';
import type Viewer3D from './viewer-3d';
import {copyText} from '@/lib/editorial-copy';
import {activateProductViewerWhenNear} from '@/lib/viewer-activation';
type Props=ComponentProps<typeof Viewer3D>;

// Keep the loading stage's dimensions and accessible focus target while the
// visitor reads the page. The original renderer, materials and controls load
// unchanged when this stage is reached; no second click is required.
export default function DeferredViewer3D(props:Props){
 const host=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),restoreFocus=useRef(false);
 const [active,setActive]=useState(false),[attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
 const [Viewer,setViewer]=useState<ComponentType<Props>>();
 useEffect(()=>{if(stage.current)return activateProductViewerWhenNear(stage.current,()=>setActive(true));},[]);
 useEffect(()=>{
  if(!active)return;let closed=false;setFailed(false);
  import('./viewer-3d').then(module=>{if(!closed)setViewer(()=>module.default);},()=>{if(!closed)setFailed(true);});
  return()=>{closed=true;};
 },[active,attempt]);
 useEffect(()=>{if(Viewer&&restoreFocus.current)host.current?.querySelector('canvas')?.focus({preventScroll:true});},[Viewer]);
 return <div ref={host} style={{display:'contents'}}>{Viewer?<Viewer {...props}/>:<div className="viewer-3d" data-state={failed?'error':'loading'} data-color-state="original" data-variant={props.variant.id}>
  <div ref={stage} className="viewer-stage" aria-busy={!failed}>
   <canvas tabIndex={0} role="img" aria-label={copyText("ui.3b0c2ba761f32717f690","{{p0}} 3D modelis. Rodyklėmis pasukite, pliusu ir minusu keiskite mastelį, F apžiūrėkite apmušalą, Home atkurkite vaizdą.",{p0:props.name})} onFocus={()=>{restoreFocus.current=true;setActive(true);}}/>
   {failed?<div className="viewer-message" role="alert"><p>{copyText("ui.f4932f22135bf006a99b","Nepavyko parodyti 3D modelio. Bandykite dar kartą arba rinkitės nuotraukų peržiūrą.")}</p><button className="button outline" onClick={()=>setAttempt(n=>n+1)}>{copyText("ui.9b6dd1a2e70b58ac82ea","Bandyti dar kartą")}</button></div>:<p className="viewer-message" role="status">{copyText("ui.d1818a488c16805e4761","Įkeliamas 3D modelis…")}</p>}
  </div>
 </div>}</div>;
}
