'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play} from 'lucide-react';
import type {ShowcaseModel} from './home-showcase';
export function ChairRail({models}:{models:ShowcaseModel[]}){
  const rail=useRef<HTMLUListElement>(null),direction=useRef(1),manual=useRef(false);
  const [playing,setPlaying]=useState(false),[interacting,setInteracting]=useState(false),[visible,setVisible]=useState(false),[edges,setEdges]=useState({start:true,end:false});
  const syncEdges=useCallback(()=>{const el=rail.current;if(!el)return;const next={start:el.scrollLeft<2,end:el.scrollLeft>=el.scrollWidth-el.clientWidth-2};setEdges(prev=>prev.start===next.start&&prev.end===next.end?prev:next);},[]);
  useEffect(()=>{
    const el=rail.current;if(!el)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width: 900px) and (hover: hover)');
    const updatePreference=()=>{if(!manual.current)setPlaying(!preference.matches&&desktop.matches);};
    updatePreference();preference.addEventListener('change',updatePreference);desktop.addEventListener('change',updatePreference);
    const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{threshold:.12});observer.observe(el);
    const resize=new ResizeObserver(syncEdges);resize.observe(el);el.addEventListener('scroll',syncEdges,{passive:true});syncEdges();
    return()=>{observer.disconnect();resize.disconnect();el.removeEventListener('scroll',syncEdges);preference.removeEventListener('change',updatePreference);desktop.removeEventListener('change',updatePreference);};
  },[syncEdges]);
  useEffect(()=>{
    if(!playing||interacting||!visible)return;const el=rail.current;if(!el)return;
    let frame=0,last=0,position=el.scrollLeft;
    const animate=(now:number)=>{if(document.hidden){last=0;frame=requestAnimationFrame(animate);return;}const max=el.scrollWidth-el.clientWidth;if(max>1&&last){position+=direction.current*18*Math.min(now-last,64)/1000;if(position>=max){position=max;direction.current=-1;}else if(position<=0){position=0;direction.current=1;}el.scrollLeft=position;}last=now;frame=requestAnimationFrame(animate);};
    frame=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frame);
  },[playing,interacting,visible]);
  function pause(){manual.current=true;setPlaying(false);}
  function step(sign:number){const el=rail.current;if(!el)return;pause();const width=el.firstElementChild?.getBoundingClientRect().width||280;el.scrollBy({left:sign*(width+24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <section className="chair-studio home-section" aria-labelledby="chair-studio-title"><div className="home-width studio-heading"><div><h2 id="chair-studio-title">{copyText("ui.d767bf690df9a91ec655","Suraskite savo darbo kėdę.")}</h2><p>{copyText("ui.2b10e4f0933a6bc968e8","Pasukite modelį, priartinkite medžiagą ir pasirinkite komplektaciją tikrame 3D konfigūratoriuje.")}</p></div><div className="rail-controls"><button type="button" className="rail-motion" onClick={()=>{manual.current=true;setPlaying(!playing);}} aria-pressed={playing} aria-label={playing?copyText("ui.0a865f5bd8d5168ae912","Sustabdyti automatinį modelių slinkimą"):copyText("ui.6f9001dd78b640de2f0f","Paleisti automatinį modelių slinkimą")}>{playing?<Pause size={16}/>:<Play size={16}/>}<span>{playing?'Sustabdyti':'Paleisti'}</span></button><button type="button" onClick={()=>step(-1)} disabled={edges.start} aria-label={copyText("ui.a6d6287008b0f3297e63","Ankstesni kėdžių modeliai")}><ArrowLeft size={19}/></button><button type="button" onClick={()=>step(1)} disabled={edges.end} aria-label={copyText("ui.0c4ea98c868de5496fc0","Kiti kėdžių modeliai")}><ArrowRight size={19}/></button></div></div>
    <ul className="chair-rail" ref={rail} aria-label={copyText("ui.8e19a987405d9a7c60ad","Kėdės su 3D konfigūratoriumi")} onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocusCapture={()=>setInteracting(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setInteracting(false);}} onPointerDown={pause} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}}}>
    {models.map(model=><li key={model.id}><Link href={model.href+'#konfiguratorius'} className="rail-product"><div className="rail-product-image"><Image src={model.image} alt={copyText("ui.7da927e2e3b425e66c5a","{{p0}} darbo kėdė",{p0:(model.name)})} fill sizes="(max-width:600px) 75vw, 310px"/></div><div className="rail-product-name"><h3>{model.name}</h3><ArrowUpRight size={21}/></div><span>{copyText("ui.6bc6d410a729bc3e094f","Konfigūruoti 3D")}</span></Link></li>)}</ul>
    <div className="home-width studio-foot"><span>{copyText("ui.a065ea5c432904b25511","Apžiūrėkite modelį, keiskite apdailą ir išsaugokite pasirinkimą.")}</span><Link className="text-link" href="/produktai/kedes/">{copyText("ui.dde9e6bf9116bcba4aa1","Visos kėdės ")}<ArrowUpRight size={17}/></Link></div></section>;
}
