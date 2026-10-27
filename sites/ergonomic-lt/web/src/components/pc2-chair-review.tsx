'use client';
import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {chairObservedChoices,chairPreviewAssembly,chairInitialContext,chairInitialVariants,type ChairPreview} from '@/lib/chair-preview';
import type {PilotVariant} from '@/lib/configurator';
import './pc2-chair-review.css';

const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false});
export type ChairReviewEntry={code:string;name:string;asset:string;sha256:string;bytes:number};
function ModelReview({data}:{data:ChairPreview}){
 const [context,setContext]=useState(()=>chairInitialContext(data)),[variants,setVariants]=useState(()=>chairInitialVariants(data,chairInitialContext(data))),[observed,setObserved]=useState('original');
 const choices=useMemo(()=>chairObservedChoices(data),[data]),choice=choices.find(c=>c.id===observed)||choices[0];
 const assembly=useMemo(()=>chairPreviewAssembly(data,context,variants,choice),[data,context,variants,choice]);
 const current=data.runtime.contexts[context],status=assembly.chairColors.plan.status;
 const variant={id:data.code,asset:assembly.base?.asset||'',assetSha256:assembly.base?.assetSha256||'',bytes:assembly.base?.bytes||0} as PilotVariant;
 return <div className="pc2-chair-workspace" data-chair-code={data.code} data-chair-plan={status}>
  <div className="pc2-chair-controls">
   <h2>{data.name} · {data.code}</h2>
   {data.runtime.contexts.length>1&&<label className="field">Surinkta konstrukcija<select aria-label="Surinkta konstrukcija" value={context} onChange={e=>{const next=Number(e.target.value);setContext(next);setVariants(chairInitialVariants(data,next));setObserved('original');}}>{data.runtime.contexts.map((c,index)=><option value={index} key={index}>{Object.entries(c.dimensions).map(([k,v])=>k+' = '+v).join(' · ')||'Pradinė konstrukcija'}</option>)}</select></label>}
   {current.groups.filter(g=>g.fields.length).map(g=>{const index=current.groups.indexOf(g);return <label className="field" key={index}>{g.fields.join(' / ')}<select aria-label={g.fields.join(' / ')} value={variants[index]??0} onChange={e=>{const next=[...variants];next[index]=Number(e.target.value);setVariants(next);setObserved('original');}}>{g.variants.map((v,n)=><option key={n} value={n}>{Object.entries(v.values).map(([k,value])=>k+' = '+value).join(' · ')}</option>)}</select></label>;})}
   <label className="field">Surinkta spalvinė būsena<select aria-label="Surinkta spalvinė būsena" value={observed} onChange={e=>setObserved(e.target.value)}>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <p className="form-note" role="status">{status==='original'?'Rodomos originalios medžiagos.':status==='observed-state'?'Taikoma viena surinkta spalvinė būsena.':'Šiai konstrukcijai ši spalvinė būsena 3D nerodoma. Rodomos originalios medžiagos.'}</p>
   <p className="form-note">Atskiros spalvos tarpusavyje nemaišomos. Patikra apima tik perduotas konstrukcijas ir spalvines būsenas.</p>
   {Object.keys(current.textOnly).length>0&&<details><summary>Tekstinės parinktys</summary>{Object.entries(current.textOnly).map(([field,values])=><p key={field}>{field}: {values.length?values.join(', '):'reikšmių skaičius nežinomas'}. Šių parinkčių 3D patikra neįrodyta.</p>)}</details>}
  </div>
  <Viewer3D variant={variant} name={data.name} assembly={assembly}/>
 </div>;
}
export default function Pc2ChairReview({entries}:{entries:ChairReviewEntry[]}){
 const [code,setCode]=useState(entries[0]?.code||''),[data,setData]=useState<ChairPreview>(),[error,setError]=useState('');
 useEffect(()=>{
  const entry=entries.find(e=>e.code===code),abort=new AbortController();setData(undefined);setError('');if(!entry)return;
  (async()=>{try{
   if(!/^K[A-Z0-9]+$/.test(entry.code)||!/^[a-f0-9]{64}$/.test(entry.sha256)||!entry.asset.startsWith('/models/configurator/chairs/'+entry.code+'-')||entry.bytes>15_000_000)throw Error('Invalid immutable chair binding');
   const response=await fetch(entry.asset,{signal:abort.signal});if(!response.ok)throw Error('Package unavailable');const bytes=await response.arrayBuffer();
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==entry.bytes||sha!==entry.sha256)throw Error('Package changed');
   const loaded=JSON.parse(new TextDecoder().decode(bytes)) as ChairPreview;if(loaded.schema!=='pc2-chair-review-111-v1'||loaded.code!==entry.code)throw Error('Wrong chair');
   if(!abort.signal.aborted)setData(loaded);
  }catch{if(!abort.signal.aborted)setError('Nepavyko patikrinti kėdės paketo. Perkraukite puslapį.');}})();
  return()=>abort.abort();
 },[code,entries]);
 return <main className="container pc2-chair-review">
  <h1>PC2 kėdžių techninė peržiūra</h1>
  <p>Rendererio kandidatas savininko peržiūrai. Ši peržiūra nepatvirtina visų galimų komplektacijų ar visos spalvų paletės; užklausų ir PDF nesudaro.</p>
  <label className="field pc2-chair-picker">Kėdė<select aria-label="Kėdė" value={code} onChange={e=>setCode(e.target.value)}>{entries.map(entry=><option key={entry.code} value={entry.code}>{entry.name} · {entry.code}</option>)}</select></label>
  {error?<p role="alert">{error}</p>:data?<ModelReview key={code} data={data}/>:<p role="status">{entries.length?'Įkeliamas pasirinktos kėdės paketas…':'Paketai dar neparuošti vietinei peržiūrai.'}</p>}
 </main>;
}
