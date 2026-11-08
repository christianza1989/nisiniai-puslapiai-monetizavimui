'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {observedDeskState,observedDeskVariant,validateObservedDesk,type ObservedDeskEntry,type ObservedDeskReview} from '@/lib/observed-desk-review';
import './pc2-chair-review.css';
const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false,loading:()=> <p role="status">Kraunama 3D peržiūra…</p>});
function Workspace({entry}:{entry:ObservedDeskEntry}){
 const[data,setData]=useState<ObservedDeskReview>(),[id,setId]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const abort=new AbortController();void(async()=>{try{
  if(entry.bytes>15_000_000)throw Error('Per dideli peržiūros duomenys.');
  const r=await fetch(entry.asset,{signal:abort.signal});if(!r.ok)throw Error('Nepavyko gauti peržiūros duomenų.');const bytes=await r.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==entry.bytes||digest!==entry.sha256)throw Error('Peržiūros failo tapatybė nesutampa.');
  const next=validateObservedDesk(JSON.parse(new TextDecoder().decode(bytes)),entry.code);if(next.states.length!==entry.states)throw Error('Komplektacijų skaičius nesutampa.');
  if(!abort.signal.aborted){setData(next);setId(next.states[0].id);}
 }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Duomenys neprieinami.');}})();return()=>abort.abort();},[entry]);
 const state=data&&observedDeskState(data,id);
 if(error)return <p role="alert">{error} 3D nerodoma.</p>;
 if(!data)return <p role="status">Kraunami stalo duomenys…</p>;
 return <div className="pc2-chair-workspace" data-desk-code={data.code} data-desk-state={id} data-desk-asset-sha={state?.assetSha256}>
  <div className="pc2-chair-controls"><h2>{data.name} · {data.code}</h2>
   <label className="field">Surinkta komplektacija<select aria-label="Surinkta komplektacija" value={id} onChange={e=>setId(e.target.value)}>{data.states.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>
   <p className="form-note" role="status">Galimos tik surinktos pilnos komplektacijos. Kitiems matmenų, konstrukcijos ir apdailos deriniams 3D nerodoma.</p>
   {state&&<details><summary>Pasirinktos komplektacijos duomenys</summary><dl>{state.details.map(p=><div key={p.field}><dt>{p.label}</dt><dd>{p.text}</dd></div>)}</dl></details>}
  </div>
  {state?<Viewer3D variant={observedDeskVariant(data.code,state)} name={data.name}/>:<p role="alert">Šiai komplektacijai surinkto 3D nėra.</p>}
 </div>;
}
export default function ObservedDeskReviewPage({entries,initialCode}:{entries:ObservedDeskEntry[];initialCode?:string}){
 const[code,setCode]=useState(initialCode&&entries.some(e=>e.code===initialCode)?initialCode:entries[0]?.code);const entry=entries.find(e=>e.code===code);
 return <main className="container pc2-chair-review"><p><a href="/3d-visi">Visos paruoštos 3D peržiūros</a></p><h1>Stalų surinktų komplektacijų peržiūra</h1><p>Ribota techninė peržiūra. Rodomi originalūs surinktų komplektacijų modeliai ir medžiagos. Atskirų parinkčių deriniai negeneruojami.</p>
  <label className="field pc2-chair-picker">Stalas<select aria-label="Stalas" value={code} onChange={e=>setCode(e.target.value)}>{entries.map(e=><option value={e.code} key={e.code}>{e.name} · {e.code}</option>)}</select></label>
  {entry&&<Workspace entry={entry} key={entry.code}/>}
 </main>;
}
