'use client';
import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {chairObservedChoices,chairPreviewAssembly,chairInitialContext,chairInitialVariants,chairInitialQualifiedSelection,type ChairPreview} from '@/lib/chair-preview';
import {qualifiedWitnessMatches,qualifiedDefaultSelection,qualifiedChairPlan,qualifiedGroupOptions,qualifiedSetGroupOption,type QualifiedSelection,type QualifiedGroup} from '@/lib/chair-qualified-colors';
import {qualifiedChairMaterialControls} from '@/lib/chair-material-groups';
import type {PilotVariant} from '@/lib/configurator';
import {chairReviewVersion,chairReviewRoute,chairConstructionMenus,chairCompatibleFinishRoute,validateChairConstructionBinding,type ChairReviewEntry} from '@/lib/chair-review-routing';
import {chairFinishIntent,resolveChairFinishIntent,type ChairFinishIntent} from '@/lib/chair-finish-intent';
export type {ChairReviewEntry} from '@/lib/chair-review-routing';
import './pc2-chair-review.css';
import {distinctPreviewLabels,previewCollection,previewField,previewFinishField,previewTuple,previewValue} from '@/lib/preview-option-presentation';
import {PreviewColourSample} from './preview-colour-sample';
import SeglaVisualReview from './segla-visual-review';
import {resolveSeglaVisual} from '@/lib/segla-visual-routing';

const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false});
function ModelReview({data,initialSingle,finishIntent,onFinishIntent,externalArmrests=false,externalBase=false,externalCastors=false,externalGaslift=false,externalMechanism=false,externalFoam=false}:{data:ChairPreview;initialSingle?:{witness:string;single:string};finishIntent?:ChairFinishIntent;onFinishIntent?:(intent:ChairFinishIntent|undefined)=>void;externalArmrests?:boolean;externalBase?:boolean;externalCastors?:boolean;externalGaslift?:boolean;externalMechanism?:boolean;externalFoam?:boolean}){
 const retained=useMemo(()=>resolveChairFinishIntent(data,finishIntent,chairInitialContext(data),chairInitialVariants(data,chairInitialContext(data))),[data,finishIntent]);
 const [context,setContext]=useState(()=>chairInitialContext(data)),[variants,setVariants]=useState(()=>chairInitialVariants(data,chairInitialContext(data))),
  [observed,setObserved]=useState(()=>{if(retained)return '__qs:'+retained.witness+':'+retained.single;if(finishIntent)return '__pending';if(initialSingle)return '__qs:'+initialSingle.witness+':'+initialSingle.single;const q=chairInitialQualifiedSelection(data);return q?'__qg:'+q.witness:'original';}),
  [qualified,setQualified]=useState<QualifiedSelection|undefined>(()=>retained||(finishIntent?undefined:initialSingle?{...initialSingle,kind:'single',groups:{}}:chairInitialQualifiedSelection(data))),[originalPreview,setOriginalPreview]=useState(false);
 const [functionalIndex,setFunctionalIndex]=useState(0);
 const functionalOptions=data.visualFunctionalMappings?.[String(context)],functional=functionalOptions?.[functionalIndex],alternateFunctional=!!functional&&functionalIndex!==0;
 const choices=useMemo(()=>chairObservedChoices(data),[data]),choice=choices.find(c=>c.id===observed)||choices[0];
 const baseline=useMemo(()=>chairPreviewAssembly(data,context,variants,choices[0]),[data,context,variants,choices]);
 const active=[baseline.base,...baseline.patches.flatMap(p=>p.geometry?[p.geometry]:[])].filter(a=>a!==null).map(a=>a.assetSha256);
 const witnesses=(alternateFunctional?[]:data.qualified?.witnesses||[]).filter(w=>qualifiedWitnessMatches(data,w,context,variants,active));
 const selectedWitness=witnesses.find(w=>w.id===qualified?.witness);
 const structural=witnesses.find(w=>w.structural)?.structural||{};
 const materialControls=selectedWitness&&qualified?qualifiedChairMaterialControls(selectedWitness,qualified,s=>qualifiedChairPlan(data,context,variants,active,s).status!=='unavailable'):undefined;
 const assembly=useMemo(()=>chairPreviewAssembly(data,context,variants,originalPreview?choices[0]:choice,!originalPreview&&observed.startsWith('__q')?qualified:undefined),[data,context,variants,choice,qualified,observed,originalPreview,choices]);
 const current=data.runtime.contexts[context],status=assembly.chairColors.plan.status;
 const text=(field:string,value:string)=>previewValue(data.code,field,value);
 const tuple=(values:Record<string,string>)=>previewTuple(data.code,values);
 const finishTuple=(values:Record<string,string>)=>previewTuple(data.code,values,true);
 const structuralValues:Record<string,string>={...current.dimensions,...Object.fromEntries(current.groups.flatMap((g,i)=>Object.entries(g.variants[variants[i]??0]?.values??{})))};
 const baseMetadata=data.visualMetadataByContext?.[String(context)]||data.visualMetadata;
 const visualMetadata=functional?{values:functional.values,sameStaticAppearanceObservations:[]}:baseMetadata;
 const originalFinish=data.originalFinishByContext?Object.fromEntries(Object.entries(data.originalFinishByContext[String(context)]||{}).map(([k,value])=>[k,{value,knownCurrentPrefixChoices:[]}])):data.palette.schema==='chair-base-observed-colours-v1'?data.palette.baselineObservedFinish:{};
 const variant={id:data.code,asset:assembly.base?.asset||'',assetSha256:assembly.base?.assetSha256||'',bytes:assembly.base?.bytes||0} as PilotVariant;
 function choose(value:string){
  setOriginalPreview(false);
  setObserved(value);
  if(value.startsWith('__qg:')){const w=witnesses.find(w=>w.id===value.slice(5));setQualified(w?{...qualifiedDefaultSelection(w),kind:'groups'}:undefined);onFinishIntent?.(undefined);}
  else if(value.startsWith('__qs:')){const [,wid,id]=value.split(':');const selection:QualifiedSelection={witness:wid,kind:'single',single:id,groups:{}};setQualified(selection);onFinishIntent?.(chairFinishIntent(data,selection));}
  else{setQualified(undefined);onFinishIntent?.(undefined);}
 }
 function construction(nextContext:number,nextVariants:number[]){
  const held=resolveChairFinishIntent(data,finishIntent,nextContext,nextVariants),q=held||(finishIntent?undefined:chairInitialQualifiedSelection(data,nextContext,nextVariants));setFunctionalIndex(0);setContext(nextContext);setVariants(nextVariants);setQualified(q);setObserved(held?'__qs:'+held.witness+':'+held.single:finishIntent?'__pending':q?'__qg:'+q.witness:'original');setOriginalPreview(false);
 }
 function groupControl(group:QualifiedGroup){
  if(!selectedWitness||!qualified)return null;
  const options=qualifiedGroupOptions(selectedWitness,qualified,group);
  const labels=distinctPreviewLabels(options,o=>[...new Set(Object.entries(o.values)
   .map(([field,value])=>previewValue(data.code,field,value,
     previewFinishField(field)?previewCollection(Object.values(selectedWitness.branches.find(b=>b.id===qualified.branch)?.values??{}).find(v=>previewCollection(v))??''):undefined)))].join(' · '));
  const sample=options.find(o=>o.id===(qualified.groups[group.id]??group.base));
  const sampleCode=sample&&Object.entries(sample.values).find(([field])=>/COLOU?R|CHCOL|COL$/.test(field))?.[1];
  return <label className="field" key={group.id}>{group.label}<select aria-label={group.label} value={qualified.groups[group.id]??group.base}
   disabled={!options.length} onChange={e=>{const value=e.target.value;setOriginalPreview(false);
    setQualified(q=>q?qualifiedSetGroupOption(selectedWitness,q,group,value):q);}}>
   {options.map((o,index)=><option key={o.id} value={o.id}>{labels[index]}</option>)}
  </select><PreviewColourSample code={sampleCode}/></label>;
 }
 return <div className="pc2-chair-workspace" data-chair-code={data.code} data-chair-runtime-sha={data.runtimeSha256} data-chair-base-asset-sha={assembly.base?.assetSha256} data-chair-plan={status}>
  <div className="pc2-chair-controls">
   <h2>{data.name}</h2>
   {data.runtime.contexts.length>1&&<label className="field">Surinkta konstrukcija<select aria-label="Surinkta konstrukcija" value={context} onChange={e=>{const next=Number(e.target.value);construction(next,chairInitialVariants(data,next));}}>{data.runtime.contexts.map((c,index)=><option value={index} key={index}>{tuple(c.dimensions)||'Pradinė konstrukcija'}</option>)}</select></label>}
   {functionalOptions&&functionalOptions.length>1&&<label className="field">Stebėtas funkcinis variantas<select aria-label="Stebėtas funkcinis variantas" value={functionalIndex} onChange={e=>{setFunctionalIndex(Number(e.target.value));choose('original');}}>{functionalOptions.map((f,i)=><option key={i} value={i}>{i===0?'Tiksli vaizduojama konstrukcija':tuple(Object.fromEntries(Object.entries(f.values).filter(([k,v])=>functionalOptions[0].values[k]!==v)))+(f.approximation?' · artimiausias surinktas vaizdas':' · stebėtas toks pats išorinis vaizdas')}</option>)}</select></label>}
   {functional?.approximation&&<p className="form-note">Rodomas artimiausias surinktas išorinis modelis, ne šio funkcinio varianto tikslus 3D. Tikros pasirinkto produkto reikšmės pateiktos žemiau. Kitų konstrukcijų spalvos netaikomos.</p>}
   {Object.entries(structural).filter(([field])=>(!externalArmrests||field!=='CARMRESTS')&&(!externalBase||field!=='CBASE')&&(!externalCastors||field!=='CCASTORS')&&(!externalGaslift||field!=='CGASLIFT')&&(!externalMechanism||field!=='CMECHANISM')&&(!externalFoam||field!=='CSEATPADFOAM')).map(([field,s])=><label className="field" key={field}>{previewField(field)}<select aria-label={previewField(field)} value={current.dimensions[field]} onChange={e=>{if(s.supportedValues.includes(e.target.value)&&e.target.value===current.dimensions[field])construction(context,variants);}}>{s.supportedValues.map(value=><option value={value} key={value}>{text(field,value)}</option>)}</select><span className="form-note">Peržiūrai surinkta tik ši konstrukcija.</span></label>)}
   {current.groups.filter(g=>g.fields.length).map(g=>{const index=current.groups.indexOf(g);return <label className="field" key={index}>{g.fields.map(previewField).join(' / ')}<select aria-label={g.fields.map(previewField).join(' / ')} value={variants[index]??0} onChange={e=>{const next=[...variants];next[index]=Number(e.target.value);construction(context,next);}}>{g.variants.map((v,n)=><option key={n} value={n}>{tuple(v.values)}</option>)}</select></label>;})}
   {(observed==='__pending'||choices.length>1||witnesses.length>1||witnesses.some(w=>w.singles.length)||!selectedWitness&&witnesses.some(w=>w.groups.length||w.branches.length))&&<label className="field">Surinkta spalvinė būsena<select aria-label="Surinkta spalvinė būsena" value={observed} onChange={e=>choose(e.target.value)}>{observed==='__pending'&&finishIntent&&<option value="__pending" disabled>{finishTuple(finishIntent.values)} · šiai konstrukcijai 3D nerodoma</option>}{choices.map(c=><option key={c.id} value={c.id}>{Object.keys(c.values).length?finishTuple(c.values):c.label}</option>)}{witnesses.filter(w=>w.groups.length||w.branches.length).map((w,index)=><option key={w.id} value={'__qg:'+w.id}>Apdailos pasirinkimai {index+1}</option>)}{witnesses.flatMap(w=>{const labels=distinctPreviewLabels(w.singles,s=>finishTuple(s.values));return w.singles.map((s,index)=><option key={w.id+s.id} value={'__qs:'+w.id+':'+s.id}>{labels[index]}</option>);})}</select></label>}
   {!witnesses.some(w=>w.groups.length||w.branches.length)&&(choices.length>1||witnesses.some(w=>w.singles.length>0))&&<p className="form-note">Galimos tik perduotos pilnos spalvinės būsenos. Atskiras vienodos visų apmuštų dalių spalvos pasirinkimas nepatvirtintas.</p>}
   {data.palette.schema==='chair-base-observed-colours-v1'&&!witnesses.some(w=>w.fixed||w.groups.length||w.branches.length||w.singles.length)&&<p className="form-note">Kitoms spalvoms trūksta patvirtinto ryšio su šios konstrukcijos paviršiais. 3D rodoma originali apdaila.</p>}
   {observed.startsWith('__qg:')&&selectedWitness&&<>
    {selectedWitness.branches.length>0&&<label className="field">Apdailos grupė<select aria-label="Apdailos grupė" value={qualified?.branch} onChange={e=>{const b=selectedWitness.branches.find(b=>b.id===e.target.value);setOriginalPreview(false);setQualified(q=>q&&b?{...q,branch:b.id,groups:{...q.groups,...Object.fromEntries(b.groups.map(g=>[g.id,g.base]))}}:q);}}>{selectedWitness.branches.map(b=><option key={b.id} value={b.id}>{tuple(b.values)}</option>)}</select></label>}
    {materialControls?.controls.map(c=>{
     const labels=distinctPreviewLabels(c.options,o=>previewValue(data.code,c.fields[0],o.code,o.collection?.split(' / ').map(previewCollection).filter(Boolean).join(' / ')));
     const sampleCode=c.options.find(o=>o.id===c.value)?.code;
     return <label className="field" key={c.id} data-chair-material={c.id} data-chair-material-fields={c.fields.join(',')} data-chair-material-value={c.value}>{c.label}<select aria-label={c.label} disabled={!c.options.length} value={c.value} onChange={e=>{const o=c.options.find(o=>o.id===e.target.value);if(o){setOriginalPreview(false);setQualified(o.state);}}}>
     {!c.value&&<option value="" disabled>{c.options.length?'Pradinės dalių spalvos':'Bendros spalvos pasirinkimas neprieinamas'}</option>}
     {c.options.map((o,index)=><option key={o.id} value={o.id}>{labels[index]}</option>)}
    </select><PreviewColourSample code={sampleCode}/>{c.reason&&<span className="form-note">{c.reason}</span>}</label>;})}
    {materialControls?.remaining.map(groupControl)}
   </>}
   {(choices.length>1||witnesses.some(w=>w.groups.length||w.branches.length||w.singles.length))&&<label className="consent"><input type="checkbox" checked={originalPreview} onChange={e=>setOriginalPreview(e.target.checked)}/><span>Rodyti originalias modelio medžiagas</span></label>}
   {observed.startsWith('__q')&&selectedWitness?.inference&&<p className="form-note">Dalis atspalvių pritaikoma pagal šiam variantui patikrintą bendrą medžiagų biblioteką.</p>}
   <p className="form-note" role="status">{observed==='__pending'&&finishIntent?`Pasirinkta apdaila ${finishTuple(finishIntent.values)} išsaugota. Šiai konstrukcijai jos spalva 3D nerodoma; rodomos originalios medžiagos.`:status==='original'?'Rodomos originalios medžiagos.':status==='observed-state'?'Taikomas šiai konstrukcijai perduotas spalvų pasirinkimas.':'Šiai konstrukcijai ši spalvinė būsena 3D nerodoma. Rodomos originalios medžiagos.'}</p>
   <p className="form-note">{qualified?.kind==='single'?'Pasirinkta visa spalvinė būsena galioja tik šiai konstrukcijai.':selectedWitness?.branches.find(branch=>branch.id===qualified?.branch)?.groups.some(group=>group.dependsOn)?'Atlošo spalvų sąrašas priklauso nuo pasirinktos galvos atramos spalvos.':'Pasirinkimai galioja tik nurodytam variantui. Jungiamos tik patikrintos, tarpusavyje nepriklausomos spalvų grupės.'}</p>
   {witnesses.some(w=>w.fixed)&&<details><summary>Fiksuotos šio varianto spalvos</summary><p>{witnesses.some(w=>w.groups.length||w.branches.length||w.singles.length)?'Šios fiksuotos savybės nėra atskiri spalvų pasirinkimai.':'Kitų spalvų pasirinkimas šiam variantui nedeklaruotas.'}</p>{Object.entries(witnesses.find(w=>w.fixed)!.fixed!).map(([field,value])=><p key={field}>{previewField(field)} – {text(field,value)}</p>)}</details>}
   {data.palette.schema==='chair-base-observed-colours-v1'&&!witnesses.some(w=>w.fixed)&&<details><summary>Pradinės būsenos spalvų aprašas</summary><p>Dabartinės konstrukcijos originalias medžiagas rodo 3D vaizdas. Čia pateiktas pradinės perduotos būsenos aprašas.</p>{Object.entries(originalFinish).map(([field,entry])=><p key={field}>{previewField(field)} – {text(field,entry.value)}. {entry.knownCurrentPrefixChoices.length?`Tekstinės alternatyvos: ${[...new Set(entry.knownCurrentPrefixChoices.map(v=>text(field,v)))].join(', ')}.`:'Alternatyvų skaičius nežinomas.'}</p>)}</details>}
   {data.unavailableFinishChoices?.filter(c=>c.context===context).map((c,i)=><p className="form-note" key={i}>Apdailos variantai. {c.count!==undefined&&<>perduota {c.count} susietų būsenų. </>}Šiai konstrukcijai jų spalva 3D nerodoma. {c.reason}</p>)}
   <details><summary>Konstrukcijos duomenys</summary>{Object.entries({...structuralValues,...visualMetadata?.values}).map(([field,value])=><p key={field}>{previewField(field)} – {text(field,value)}</p>)}{visualMetadata?.sameStaticAppearanceObservations.map(o=><p key={o.field+o.value}>{previewField(o.field)} – {text(o.field,o.value)} – stebėtas toks pats stacionarus išorinis vaizdas. Tai nėra atskiras perjungiamas 3D variantas.</p>)}<p>Geometrija pagal aukščio duomenis netempiama. Apdailos pasirinkimai galioja tik perduotai konstrukcijai.</p></details>
   {Object.keys(current.textOnly).length>0&&<details><summary>Tekstinės parinktys</summary>{Object.entries(current.textOnly).map(([field,values])=><p key={field}>{previewField(field)} – {values.length?[...new Set(values.map(v=>text(field,v)))].join(', '):'reikšmių skaičius nežinomas'}. Šių parinkčių 3D patikra neįrodyta.</p>)}</details>}
  </div>
  <Viewer3D variant={variant} name={data.name} assembly={assembly}/>
 </div>;
}
export default function Pc2ChairReview({entries,initialCode}:{entries:ChairReviewEntry[];initialCode?:string}){
 const [versionId,setVersionId]=useState('default');
 const [code,setCode]=useState(entries.find(e=>e.code===initialCode)?.code||entries[0]?.code||''),[data,setData]=useState<ChairPreview>(),[error,setError]=useState(''),[finishContext,setFinishContext]=useState('default'),[constructionId,setConstructionId]=useState('default'),[visualId,setVisualId]=useState(''),[mappingId,setMappingId]=useState(''),[finishIntent,setFinishIntent]=useState<ChairFinishIntent>();
 const baseEntry=entries.find(e=>e.code===code),selected=baseEntry&&chairReviewVersion(baseEntry,versionId),visual=selected?.visualSupplement&&visualId?resolveSeglaVisual(selected.visualSupplement,code,visualId,mappingId):undefined,routed=selected&&(!visual||visual.exactRoute)?chairReviewRoute(selected,visual?.exactRoute?.constructionId||constructionId,visual?.exactRoute?.finishId||chairCompatibleFinishRoute(selected,constructionId,finishContext)):undefined,construction=routed?.construction,source=routed?.source,sourceCode=selected?.code,sourceAsset=source?.asset,sourceSha=source?.sha256,sourceBytes=source?.bytes;
 function changeConstruction(id:string){if(!selected)return;chairCompatibleFinishRoute(selected,id,finishContext);setConstructionId(id);}
 const constructionMenus=selected?chairConstructionMenus(selected,constructionId):undefined,baseSelectable=!!constructionMenus&&constructionMenus.bases.length>1,castorsSelectable=!!constructionMenus&&constructionMenus.castors.length>1,gasliftSelectable=!!constructionMenus&&constructionMenus.gaslifts.length>1,mechanismSelectable=!!constructionMenus&&constructionMenus.mechanisms.length>1,foamSelectable=!!constructionMenus&&constructionMenus.foams.length>1;
 const constructionBinding=useMemo(()=>construction?.construction?{...construction.construction,runtimeSha256:source?.runtimeSha256||construction.construction.runtimeSha256}:undefined,[construction,source]);
 useEffect(()=>{
  const abort=new AbortController();setData(undefined);setError('');if(!sourceCode||!sourceAsset||!sourceSha||!sourceBytes)return;
  (async()=>{try{
   if(!/^K[A-Z0-9]+$/.test(sourceCode)||!/^[a-f0-9]{64}$/.test(sourceSha)||!sourceAsset.startsWith('/models/configurator/chairs/'+sourceCode+'-')||sourceBytes>15_000_000)throw Error('Invalid immutable chair binding');
   const response=await fetch(sourceAsset,{signal:abort.signal});if(!response.ok)throw Error('Package unavailable');const bytes=await response.arrayBuffer();
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==sourceBytes||sha!==sourceSha)throw Error('Package changed');
   const loaded=JSON.parse(new TextDecoder().decode(bytes)) as ChairPreview;if(loaded.schema!=='pc2-chair-review-111-v1'||loaded.code!==sourceCode)throw Error('Wrong chair');
   if(constructionBinding)validateChairConstructionBinding(loaded,constructionBinding);
   if(!abort.signal.aborted)setData(loaded);
  }catch{if(!abort.signal.aborted)setError('Nepavyko patikrinti kėdės paketo. Perkraukite puslapį.');}})();
  return()=>abort.abort();
 },[sourceCode,sourceAsset,sourceSha,sourceBytes,constructionBinding]);
 const names=distinctPreviewLabels(entries,entry=>entry.name);
 return <main className="container pc2-chair-review">
  <h1>Kėdžių 3D peržiūra</h1>
  <p>Perduotos konstrukcijos ir spalvinės būsenos. Ši peržiūra nepatvirtina visų galimų komplektacijų ar visos spalvų paletės; užklausų ir PDF nesudaro.</p>
  <label className="field pc2-chair-picker">Kėdė<select aria-label="Kėdė" value={code} onChange={e=>{setVersionId('default');setConstructionId('default');setFinishContext('default');setVisualId('');setMappingId('');setFinishIntent(undefined);setCode(e.target.value);}}>{entries.map((entry,index)=><option key={entry.code} value={entry.code}>{names[index]}</option>)}</select></label>
  {!!baseEntry?.reviewVersions?.length&&<label className="field pc2-chair-picker">Perduotas kėdės paketas<select aria-label="Perduotas kėdės paketas" value={versionId} onChange={e=>{setConstructionId('default');setFinishContext('default');setVisualId('');setMappingId('');setFinishIntent(undefined);setVersionId(e.target.value);}}><option value="default">Dabartinis paketas</option>{baseEntry.reviewVersions.map((v,index)=><option key={v.id} value={v.id}>Ankstesnis paketas{baseEntry.reviewVersions!.length>1?' '+(index+1):''}</option>)}</select><span className="form-note">Kiekvienas paketas turi savo konstrukciją ir tik jai patikrintas spalvas.</span></label>}
  {selected?.visualSupplement&&<label className="field pc2-chair-picker">Išorinis Segla modelis<select aria-label="Išorinis Segla modelis" value={visualId} onChange={e=>{setVisualId(e.target.value);setMappingId(selected.visualSupplement!.mappings.find(m=>m.visualId===e.target.value)?.id||'');}}><option value="">Surinktos komplektacijos ir spalvos</option>{selected.visualSupplement.representatives.map((r,index)=><option key={r.id} value={r.id}>Surinktas modelis {index+1}</option>)}</select><span className="form-note">Rodomos tik perduotos porankių ir bazės poros. Kitų porų neatkuriame.</span></label>}
  {visual&&<label className="field pc2-chair-picker">Funkcinė komplektacija<select aria-label="Funkcinė komplektacija" value={mappingId} onChange={e=>setMappingId(e.target.value)}>{selected!.visualSupplement!.mappings.filter(m=>m.visualId===visualId).map(m=><option key={m.id} value={m.id}>{previewTuple(code,Object.fromEntries(Object.entries(m.options).filter(([k])=>!['CARMRESTS','CBASE'].includes(k))))}</option>)}</select></label>}
  {!visual&&<>
  {constructionMenus&&<label className="field pc2-chair-picker">Porankiai<select aria-label="Porankiai" value={constructionMenus.armId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.arms.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CARMRESTS',c.label)}</option>)}</select><span className="form-note">Pasirinkimas įkelia tiksliai perduotą konstrukciją su jos spalvomis.</span></label>}
  {baseSelectable&&<label className="field pc2-chair-picker">Kryžmė<select aria-label="Kryžmė" value={constructionMenus.baseId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.bases.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CBASE',c.label)}</option>)}</select></label>}
  {castorsSelectable&&<label className="field pc2-chair-picker">Ratukai<select aria-label="Ratukai" value={constructionMenus.castorId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.castors.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CCASTORS',c.label)}</option>)}</select></label>}
  {gasliftSelectable&&<label className="field pc2-chair-picker">Dujinė pakėlimo kolonėlė<select aria-label="Dujinė pakėlimo kolonėlė" value={constructionMenus.gasliftId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.gaslifts.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CGASLIFT',c.label)}</option>)}</select></label>}
  {mechanismSelectable&&<label className="field pc2-chair-picker">Mechanizmas<select aria-label="Mechanizmas" value={constructionMenus.mechanismId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.mechanisms.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CMECHANISM',c.label)}</option>)}</select></label>}
  {foamSelectable&&<label className="field pc2-chair-picker">Sėdynės pagalvėlės užpildas<select aria-label="Sėdynės pagalvėlės užpildas" value={constructionId} onChange={e=>{changeConstruction(e.target.value);}}>{constructionMenus.foams.map(c=><option key={c.id} value={c.id}>{previewValue(code,'CSEATPADFOAM',c.label)}</option>)}</select></label>}
  {(!!construction?.contexts?.length||!!construction?.construction)&&<label className="field pc2-chair-picker">Apmušalo kainų grupė<select aria-label="Apmušalo kainų grupė" value={finishContext} onChange={e=>{setFinishIntent(undefined);setFinishContext(e.target.value);}}><option value="default">Pradinis apdailos rinkinys</option>{finishContext!=='default'&&!construction.contexts?.some(c=>c.id===finishContext)&&<option value={finishContext} disabled>Pasirinkta grupė šiai konstrukcijai neperduota</option>}{construction.contexts?.map((context,index)=><option key={context.id} value={context.id}>Apdailos rinkinys {index+1}</option>)}</select></label>}
  </>}
  {visual&&<SeglaVisualReview resolved={visual}>{error?<p role="alert">{error}</p>:data?<ModelReview key={sourceSha+mappingId} data={data} finishIntent={finishIntent} onFinishIntent={setFinishIntent} initialSingle={visual.exactRoute}/>:<p role="status">Įkeliamas patikrintas modelis…</p>}</SeglaVisualReview>}
  {!visual&&(error?<p role="alert">{error}</p>:data?<ModelReview key={sourceSha} data={data} finishIntent={finishIntent} onFinishIntent={setFinishIntent} externalArmrests={!!selected?.constructions?.length} externalBase={baseSelectable} externalCastors={castorsSelectable} externalGaslift={gasliftSelectable} externalMechanism={mechanismSelectable} externalFoam={foamSelectable}/>:<p role="status">{entries.length?'Įkeliamas pasirinktos kėdės paketas…':'Paketai dar neparuošti vietinei peržiūrai.'}</p>)}
 </main>;
}
