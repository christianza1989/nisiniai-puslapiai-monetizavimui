'use client';
import {useMemo,useState,useRef,type ComponentProps} from 'react';
import Link from 'next/link';
import type {CustomerConfiguration,CustomerAsset} from '@/lib/customer-configuration';
import CustomerViewer from './deferred-customer-viewer';
import {useQuote} from './quote-provider';
import {isolateWorkspace} from '@/lib/fullscreen-workspace';
import {useEffect} from 'react';
import {ProductSelectedReading} from './product-selected-reading';
import {publicChairRoleAdapter,ignorePublicRoleProof} from '@/lib/viewer-public-chair-roles';
type ViewerProps=ComponentProps<typeof CustomerViewer>;
const asset=(a:CustomerAsset)=>({asset:a.url,assetSha256:a.sha256,bytes:a.bytes});
export default function CustomerProductDetail({initial,url,image}:{initial:CustomerConfiguration;url:string;image:string|null}){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState(false),[quantity,setQuantity]=useState(1),[fullscreen,setFullscreen]=useState(false);
 const quote=useQuote(),workspace=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!fullscreen||!workspace.current)return;returnFocus.current=document.activeElement as HTMLElement;const restore=isolateWorkspace(workspace.current),overflow=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus();return()=>{restore();document.body.style.overflow=overflow;returnFocus.current?.focus();};},[fullscreen]);
 const assembly=useMemo(()=>({base:data.assets.base?asset(data.assets.base):null,patches:data.assets.patches.map(p=>({remove:p.remove,geometries:p.assets.map(asset),geometry:null,addIds:[],choices:{},changes:{}})),finishes:data.finishes,...(data.desk?{deskColors:{source:{materialDocument:data.desk.document,materialIds:data.desk.materialIds},plan:{materials:data.desk.materials,hidden:data.desk.hidden,assets:data.desk.assets.map(asset),pending:data.desk.pending?['pending']:[]}}}:{})}) as ViewerProps['assembly'],[data]);
 const first=data.assets.base||data.assets.patches.flatMap(p=>p.assets)[0]||data.desk?.assets[0],variant={id:data.selectionId,label:data.name,...(first?asset(first):{asset:'',assetSha256:'',bytes:0}),visualizationNote:''} as ViewerProps['variant'];
 async function change(field:string,value:string){setBusy(true);setError('');setAdded(false);try{const response=await fetch('/api/customer-configuration/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:data.token,change:{field,value}})});const result=await response.json();if(!response.ok)throw Error(result.error||'Nepavyko pakeisti komplektacijos.');setData(result);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function add(){quote.add({productId:data.productId,name:data.name,brand:'',url,image,configurationId:null,configurationToken:data.token,customerSelectionId:data.selectionId,configurationDetails:data.details,configurationLabel:data.details.map(d=>d.label+': '+d.value).join(' · '),quantity,note:''});setAdded(true);}
 return <><section id="konfiguratorius" className="product-configurator"><h2>Susikomplektuokite savo baldą</h2><div ref={workspace} className={fullscreen?'configurator-workspace configurator-fullscreen':'configurator-workspace'} onKeyDown={e=>{if(e.key==='Escape')setFullscreen(false);}} aria-busy={busy}>
 {fullscreen&&<button ref={close} type="button" className="button outline" onClick={()=>setFullscreen(false)}>Uždaryti viso ekrano vaizdą</button>}
 <div className="customer-configurator-controls"><div className="configuration-fields">{data.controls.map(control=><label className="field" key={control.id}><span>{control.label}</span><select disabled={busy||control.disabled} value={control.value} onChange={e=>change(control.id,e.target.value)}>{control.choices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>{control.note&&<span className="form-note">{control.note}</span>}</label>)}</div>{busy&&<p role="status">Atnaujinama komplektacija…</p>}{error&&<p role="alert" className="form-error">{error}</p>}{data.desk?.pending&&<p role="status">Šiai komplektacijai pasirinkta spalva 3D nerodoma.</p>}
 <label className="field"><span>Kiekis</span><input type="number" min={1} max={1000} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(1000,Number(e.target.value)||1)))}/></label><button className="button dark" type="button" disabled={busy||!quote.ready} onClick={add}>{added?'Pridėta į užklausą':'Pridėti prie užklausos'}</button>{added&&<Link className="text-link" href="/uzklausa/">Pateikti užklausą</Link>}
 <a className="text-link" href={'/api/produkto-kortele/?v='+encodeURIComponent(data.token)}>Atsisiųsti komplektacijos PDF</a>
 </div><div className="customer-configurator-view">{data.available3D?<CustomerViewer name={data.name} variant={variant} assembly={assembly} fullscreen={fullscreen} onFullscreen={()=>setFullscreen(true)} legacyRoleAdapter={data.legacyChair?publicChairRoleAdapter:undefined} onChairRoles={data.legacyChair?ignorePublicRoleProof:undefined}/>:<><p>Šiam modeliui 3D peržiūra dar ruošiama.</p>{image&&<img src={image} alt={data.name} style={{width:'100%',height:'auto'}}/>}</>}</div>
 </div></section><ProductSelectedReading rows={[{label:'Modelis',value:data.name},...data.details]}/></>;
}
