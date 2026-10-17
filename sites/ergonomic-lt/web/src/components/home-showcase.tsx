'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import {useState} from 'react';
import {ArrowUpRight,Box} from 'lucide-react';
export type ShowcaseModel={id:string;name:string;brand:string;href:string;image:string};
export function HomeShowcase({models}:{models:ShowcaseModel[]}){
  const [selected,setSelected]=useState(0);
  if(!models.length)return null;
  const current=models[selected]||models[0];
  return <div className="showcase">
    <div className="showcase-info" aria-live="polite" aria-atomic="true"><h2>{current.name}</h2><p>{copyText("ui.0b43e4967c7840bfc11f","Darbo kėdė")}</p><Link className="text-link" href={current.href}>{copyText("ui.0f50e9227ba6e58eda41","Apie modelį ")}<ArrowUpRight size={17}/></Link></div>
    <div className="showcase-object">{models.map((model,i)=><Image key={model.id} className={`showcase-${model.name.toLowerCase()}`} src={model.image} alt={copyText("ui.893708203b9dcd3575c9","{{p0}} darbo kėdė – gamintojo komplektacijos pavyzdys",{p0:(model.name)})} width={1800} height={1800} preload={i===0} sizes="(max-width:600px) 100vw, (max-width:900px) 65vw, 640px" hidden={model.id!==current.id}/>)}</div>
    <div className="showcase-config"><Box size={25} strokeWidth={1.25}/><h3>{copyText("ui.f00ad000e4016f1b1c60","Jūsų pasirinkimas.")}<br/>{copyText("ui.d380ca6d051b26e45c0f","Jūsų darbo vieta.")}</h3><p>{copyText("ui.9ae66c25d60f5ab202bc","Apžiūrėkite iš visų pusių.")}{' '}<br/>{copyText("ui.5ed430c4ef760b60cbfe","Pasirinkite apdailą ir komplektaciją.")}</p><Link className="button outline" href={current.href+'#konfiguratorius'}>{copyText("ui.b253e3e0caaf2889f536","Konfigūruoti 3D ")}<ArrowUpRight size={17}/></Link></div>
    <div className="showcase-selector" aria-label={copyText("ui.26418c6b7e1dc0869600","Pagrindinio vaizdo kėdės modelis")}>{models.map((model,i)=><button key={model.id} type="button" aria-pressed={selected===i} onClick={()=>setSelected(i)}>{model.name}</button>)}</div>
  </div>;
}
