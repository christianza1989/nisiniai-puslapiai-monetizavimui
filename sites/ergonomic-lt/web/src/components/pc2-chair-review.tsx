'use client';
import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {chairObservedChoices,chairPreviewAssembly,chairInitialContext,chairInitialVariants,type ChairPreview} from '@/lib/chair-preview';
import {qualifiedWitnessMatches,qualifiedDefaultSelection,qualifiedChairPlan,type QualifiedSelection,type QualifiedGroup} from '@/lib/chair-qualified-colors';
import {qualifiedChairMaterialControls} from '@/lib/chair-material-groups';
import type {PilotVariant} from '@/lib/configurator';
import './pc2-chair-review.css';

const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false});
export type ChairReviewEntry={code:string;name:string;asset:string;sha256:string;bytes:number};
function ModelReview({data}:{data:ChairPreview}){
 const [context,setContext]=useState(()=>chairInitialContext(data)),[variants,setVariants]=useState(()=>chairInitialVariants(data,chairInitialContext(data))),[observed,setObserved]=useState('original'),[qualified,setQualified]=useState<QualifiedSelection>();
 const choices=useMemo(()=>chairObservedChoices(data),[data]),choice=choices.find(c=>c.id===observed)||choices[0];
 const baseline=useMemo(()=>chairPreviewAssembly(data,context,variants,choices[0]),[data,context,variants,choices]);
 const active=[baseline.base,...baseline.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 const witnesses=(data.qualified?.witnesses||[]).filter(w=>qualifiedWitnessMatches(data,w,context,variants,active));
 const selectedWitness=witnesses.find(w=>w.id===qualified?.witness);
 const materialControls=selectedWitness&&qualified?qualifiedChairMaterialControls(selectedWitness,qualified,s=>qualifiedChairPlan(data,context,variants,active,s).status!=='unavailable'):undefined;
 const assembly=useMemo(()=>chairPreviewAssembly(data,context,variants,choice,observed.startsWith('__q')?qualified:undefined),[data,context,variants,choice,qualified,observed]);
 const current=data.runtime.contexts[context],status=assembly.chairColors.plan.status;
 const variant={id:data.code,asset:assembly.base?.asset||'',assetSha256:assembly.base?.assetSha256||'',bytes:assembly.base?.bytes||0} as PilotVariant;
 function choose(value:string){
  setObserved(value);
  if(value.startsWith('__qg:')){const w=witnesses.find(w=>w.id===value.slice(5));setQualified(w?{...qualifiedDefaultSelection(w),kind:'groups'}:undefined);}
  else if(value.startsWith('__qs:')){const [,wid,id]=value.split(':');setQualified({witness:wid,kind:'single',single:id,groups:{}});}
  else setQualified(undefined);
 }
 function groupControl(group:QualifiedGroup){return <label className="field" key={group.id}>{group.label}<select aria-label={group.label} value={qualified?.groups[group.id]??group.base} onChange={e=>setQualified(q=>q?{...q,groups:{...q.groups,[group.id]:e.target.value}}:q)}>{group.options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;}
 return <div className="pc2-chair-workspace" data-chair-code={data.code} data-chair-plan={status}>
  <div className="pc2-chair-controls">
   <h2>{data.name} · {data.code}</h2>
   {data.runtime.contexts.length>1&&<label className="field">Surinkta konstrukcija<select aria-label="Surinkta konstrukcija" value={context} onChange={e=>{const next=Number(e.target.value);setContext(next);setVariants(chairInitialVariants(data,next));setObserved('original');setQualified(undefined);}}>{data.runtime.contexts.map((c,index)=><option value={index} key={index}>{Object.entries(c.dimensions).map(([k,v])=>k+' = '+v).join(' · ')||'Pradinė konstrukcija'}</option>)}</select></label>}
   {current.groups.filter(g=>g.fields.length).map(g=>{const index=current.groups.indexOf(g);return <label className="field" key={index}>{g.fields.join(' / ')}<select aria-label={g.fields.join(' / ')} value={variants[index]??0} onChange={e=>{const next=[...variants];next[index]=Number(e.target.value);setVariants(next);setObserved('original');setQualified(undefined);}}>{g.variants.map((v,n)=><option key={n} value={n}>{Object.entries(v.values).map(([k,value])=>k+' = '+value).join(' · ')}</option>)}</select></label>;})}
   {(choices.length>1||witnesses.some(w=>w.groups.length||w.branches.length||w.singles.length))&&<label className="field">Surinkta spalvinė būsena<select aria-label="Surinkta spalvinė būsena" value={observed} onChange={e=>choose(e.target.value)}>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}{witnesses.filter(w=>w.groups.length||w.branches.length).map(w=><option key={w.id} value={'__qg:'+w.id}>{w.label}</option>)}{witnesses.flatMap(w=>w.singles.map(s=><option key={w.id+s.id} value={'__qs:'+w.id+':'+s.id}>{s.label}</option>))}</select></label>}
   {!witnesses.some(w=>w.groups.length||w.branches.length)&&(choices.length>1||witnesses.some(w=>w.singles.length>0))&&<p className="form-note">Galimos tik perduotos pilnos spalvinės būsenos. Atskiras vienodos visų apmuštų dalių spalvos pasirinkimas nepatvirtintas.</p>}
   {data.palette.schema==='chair-base-observed-colours-v1'&&!witnesses.some(w=>w.fixed||w.groups.length||w.branches.length||w.singles.length)&&<p className="form-note">Kitoms spalvoms trūksta patvirtinto ryšio su šios konstrukcijos paviršiais. 3D rodoma originali apdaila.</p>}
   {observed.startsWith('__qg:')&&selectedWitness&&<>
    {selectedWitness.branches.length>0&&<label className="field">Apdailos grupė<select aria-label="Apdailos grupė" value={qualified?.branch} onChange={e=>{const b=selectedWitness.branches.find(b=>b.id===e.target.value);setQualified(q=>q&&b?{...q,branch:b.id,groups:{...q.groups,...Object.fromEntries(b.groups.map(g=>[g.id,g.base]))}}:q);}}>{selectedWitness.branches.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>}
    {materialControls?.controls.map(c=><label className="field" key={c.id} data-chair-material={c.id} data-chair-material-fields={c.fields.join(',')} data-chair-material-value={c.value}>{c.label}<select aria-label={c.label} disabled={!c.options.length} value={c.value} onChange={e=>{const o=c.options.find(o=>o.id===e.target.value);if(o)setQualified(o.state);}}>
     {!c.value&&<option value="" disabled>{c.options.length?'Pradinės dalių spalvos':'Bendros spalvos pasirinkimas neprieinamas'}</option>}
     {c.options.map(o=><option key={o.id} value={o.id}>{o.code}</option>)}
    </select>{c.reason&&<span className="form-note">{c.reason}</span>}</label>)}
    {materialControls?.remaining.map(groupControl)}
   </>}
   {observed.startsWith('__q')&&selectedWitness?.inference&&<p className="form-note">Dalis atspalvių pritaikoma pagal šiam variantui patikrintą bendrą medžiagų biblioteką.</p>}
   <p className="form-note" role="status">{status==='original'?'Rodomos originalios medžiagos.':status==='observed-state'?'Taikomas šiai konstrukcijai perduotas spalvų pasirinkimas.':'Šiai konstrukcijai ši spalvinė būsena 3D nerodoma. Rodomos originalios medžiagos.'}</p>
   <p className="form-note">Pasirinkimai galioja tik nurodytam variantui. Jungiamos tik patikrintos, tarpusavyje nepriklausomos spalvų grupės.</p>
   {witnesses.some(w=>w.fixed)&&<details><summary>Fiksuotos šio varianto spalvos</summary><p>Kitų spalvų pasirinkimas šiam variantui nedeklaruotas.</p>{Object.entries(witnesses.find(w=>w.fixed)!.fixed!).map(([field,value])=><p key={field}>{field}: {value}</p>)}</details>}
   {data.palette.schema==='chair-base-observed-colours-v1'&&!witnesses.some(w=>w.fixed)&&<details><summary>Pradinės būsenos spalvų aprašas</summary><p>Dabartinės konstrukcijos originalias medžiagas rodo 3D vaizdas. Čia pateiktas pradinės perduotos būsenos aprašas.</p>{Object.entries(data.palette.baselineObservedFinish).map(([field,entry])=><p key={field}>{field}: {entry.value}. {entry.knownCurrentPrefixChoices.length?`Tekstinės alternatyvos: ${entry.knownCurrentPrefixChoices.join(', ')}.`:'Alternatyvų skaičius nežinomas.'}</p>)}</details>}
   {data.unavailableFinishChoices?.filter(c=>c.context===context).map((c,i)=><p className="form-note" key={i}>{c.label}: perduota {c.count} susietų būsenų. Šiai konstrukcijai jų spalva 3D nerodoma. {c.reason}</p>)}
   {Object.keys(current.textOnly).length>0&&<details><summary>Tekstinės parinktys</summary>{Object.entries(current.textOnly).map(([field,values])=><p key={field}>{field}: {values.length?values.join(', '):'reikšmių skaičius nežinomas'}. Šių parinkčių 3D patikra neįrodyta.</p>)}</details>}
  </div>
  <Viewer3D variant={variant} name={data.name} assembly={assembly}/>
 </div>;
}
export default function Pc2ChairReview({entries,initialCode}:{entries:ChairReviewEntry[];initialCode?:string}){
 const [code,setCode]=useState(entries.find(e=>e.code===initialCode)?.code||entries[0]?.code||''),[data,setData]=useState<ChairPreview>(),[error,setError]=useState('');
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
  <h1>Kėdžių 3D peržiūra</h1>
  <p>Perduotos konstrukcijos ir spalvinės būsenos. Ši peržiūra nepatvirtina visų galimų komplektacijų ar visos spalvų paletės; užklausų ir PDF nesudaro.</p>
  <label className="field pc2-chair-picker">Kėdė<select aria-label="Kėdė" value={code} onChange={e=>setCode(e.target.value)}>{entries.map(entry=><option key={entry.code} value={entry.code}>{entry.name} · {entry.code}</option>)}</select></label>
  {error?<p role="alert">{error}</p>:data?<ModelReview key={code} data={data}/>:<p role="status">{entries.length?'Įkeliamas pasirinktos kėdės paketas…':'Paketai dar neparuošti vietinei peržiūrai.'}</p>}
 </main>;
}
