'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
export function HeaderCatalogMenu({label,links}:{label:string;links:{href:string;label:string}[]}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))ref.current.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 return <details ref={ref} className="header-catalog-menu"><summary>{label}<ChevronDown size={16}/></summary><div className="header-catalog-links">{links.map(link=><Link key={link.href} href={link.href} onClick={()=>{if(ref.current)ref.current.open=false;}}>{link.label}</Link>)}</div></details>;
}
