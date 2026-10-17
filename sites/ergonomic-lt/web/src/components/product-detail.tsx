'use client';

// editorial-copy-wired
import {copyText,copyValue} from '@/lib/editorial-copy';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Plus,Check,ArrowUpRight,Download,X} from 'lucide-react';
import type {Product} from '@/lib/types';
import {pilotForProduct,backrestLabels} from '@/lib/configurator';
import {useQuote} from './quote-provider';
import {createExpandedEngine,type ExpandedState} from '@/lib/expanded-configurator';
import type {CatalogRuntime} from '@/lib/catalog-configurator';
import ExpandedProductDetail from './expanded-product-detail';
import {ProductGallery} from './product-gallery';
import {ProductStudioIntro} from './product-studio-intro';
import {ProductSelectedReading} from './product-selected-reading';
import {productSpecificationRows} from '@/lib/product-specifications';
import {useProductWorkspace} from '@/lib/use-product-workspace';
const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false,loading:()=> <div className="viewer-placeholder" role="status">{copyText("ui.19eac4a3b50b67b8f89d","Ruošiama 3D peržiūra…")}</div>});
export function ProductDetail({product:p,url,presetOnly=false,catalogRuntime,initialConfiguration,initialCustomized=false,configurationMessage}:{product:Product;url:string;presetOnly?:boolean;catalogRuntime?:CatalogRuntime;initialConfiguration?:ExpandedState;initialCustomized?:boolean;configurationMessage?:string}){
  const pilot=pilotForProduct(p);
  const workspace=useProductWorkspace();
  const [selected,setSelected]=useState(p.modelConfigurationId||pilot?.variants[0]?.id||''),[view,setView]=useState<'3d'|'photo'>(pilot?'3d':'photo');
  const [quantity,setQuantity]=useState(1),[added,setAdded]=useState(false);
  const {add,items}=useQuote();const config=p.configurations.find(c=>c.id===selected);
  const variant=pilot?.variants.find(v=>v.id===selected),backrest=variant?.backrest;
  const image=config?config.image:variant?.image||p.image;
  const specificationRows=productSpecificationRows(config?.code,config?.details);
  const choose=(id:string)=>{setSelected(id);setAdded(false);};
  if(!presetOnly&&createExpandedEngine(catalogRuntime).expandedForProduct(p))return <ExpandedProductDetail product={p} url={url} catalogRuntime={catalogRuntime} initialConfiguration={initialConfiguration} initialCustomized={initialCustomized} configurationMessage={configurationMessage} presets={<ProductDetail product={p} url={url} presetOnly/>}/>;
  function addToQuote(){add({productId:p.id,name:p.name,brand:p.brand,url,image,configurationId:config?.id||null,configurationLabel:variant?.label||config?.description||copyText("ui.e4019a818673bd9db5c9","Komplektaciją suderinsime"),quantity,note:''});setAdded(true);}
  return <><ProductStudioIntro product={p}/><div id="konfiguratorius" ref={workspace.ref} className={"product-detail editorial-studio studio-basic-workspace"+(workspace.fullscreen?" configurator-fullscreen":"")} role={workspace.fullscreen?"dialog":undefined} aria-modal={workspace.fullscreen?true:undefined} aria-label={workspace.fullscreen?p.name:undefined} onKeyDown={workspace.onKeyDown}><div className="configurator-fullscreen-header" hidden={!workspace.fullscreen}><span>{p.name}</span><button ref={workspace.closeRef} type="button" aria-label={copyText("ui.dc7d204b244e9e406fcd","Uždaryti visą ekraną")} onClick={workspace.close}><X size={22}/><span>{copyText("ui.63fc471369e620d7d2d6","Uždaryti")}</span></button></div><div className="studio-basic-heading"><h2>{pilot?"Susikomplektuokite savo norimą kėdę su 3D konfigūratoriumi":"Produkto nuotraukos ir užklausa"}</h2></div><div className="gallery">
    {pilot&&<div className="product-view-switch" role="group" aria-label={copyText("ui.b9442465d0b687df4540","Produkto peržiūra")}><button type="button" aria-pressed={view==='3d'} onClick={()=>{if(!variant)choose(pilot.variants[0].id);setView('3d');}}>{copyText("ui.f8e94106288faa882ee7","3D konfigūratorius")}</button><button type="button" aria-pressed={view==='photo'} onClick={()=>setView('photo')}>{copyText("ui.12ef5d8d56f194f5cbd4","Nuotraukos")}</button></div>}
    {view==='3d'&&variant?<><Viewer3D variant={variant} name={p.name} fullscreen={workspace.fullscreen} onFullscreen={workspace.open}/><p className="visualization-note">{copyText("ui.57a1e594fb23c46d68ae","3D apdailų spalvos orientacinės. Tikslią komplektaciją žymi gamintojo kodai ir pavyzdžio nuotrauka.")}</p></>:<ProductGallery key={selected||p.slug} primary={image} images={config?config.gallery||[]:p.gallery} name={p.name} specificCount={p.modelGalleryCount} backdrops={p.galleryBackdrops}/>}
    </div><div className="product-info"><h3>{pilot?"Pasirinkite komplektaciją":"Pasirinkite kiekį ir pateikite užklausą"}</h3><p className="price-note">{copyText("ui.7712573f04829fa4cead","Kaina pagal pasirinktą komplektaciją")}</p>
    {pilot&&view==='3d'?<div className="pilot-options"><fieldset className="backrest-options"><legend>{copyText("ui.c4401757d8f96cf092b2","Atlošas")}</legend><div>{([...new Set(pilot.variants.map(v=>v.backrest))]).map(type=><button key={type} type="button" aria-pressed={backrest===type} onClick={()=>choose(pilot.variants.find(v=>v.backrest===type)!.id)}>{backrestLabels[type]}</button>)}</div></fieldset>
      <label className="field">{copyText("ui.c008f27cfbae7d70aa58","Komplektacija")}<select value={selected} onChange={e=>choose(e.target.value)}>{pilot.variants.filter(v=>v.backrest===backrest).map(v=><option key={v.id} value={v.id}>{copyValue(v.label)}</option>)}</select></label>
      <p className="pilot-scope">{copyText("ui.6735c9c48cbe11daca02","Bandomojoje versijoje — ")}{pilot.variants.length} {copyText("ui.053a350b8abf5bfaaa71","gamintojo paskelbtos komplektacijos. Pasirinkus variantą atnaujinama visa komplektacija.").replace(/^gamintojo paskelbtos komplektacijos\./,new Intl.PluralRules("lt").select(pilot.variants.length)==="one"?"gamintojo paskelbta komplektacija.":new Intl.PluralRules("lt").select(pilot.variants.length)==="few"?"gamintojo paskelbtos komplektacijos.":"gamintojo paskelbtų komplektacijų.")}</p></div>
    :!p.modelConfigurationId&&p.configurations.length>0&&<label className="field">{copyText("ui.a1c1b3a459931f004fef","Pavyzdinė konfigūracija")}<select value={selected} onChange={e=>choose(e.target.value)}><option value="">{copyText("ui.e4019a818673bd9db5c9","Komplektaciją suderinsime")}</option>{p.configurations.map(c=><option key={c.id} value={c.id}>{c.name} · {c.code||c.description}</option>)}</select></label>}
    {config&&<div className="configuration-info"><p>{variant?.label||config.description}</p>{config.code&&<span>{copyText("ui.64f416f9af4eca88c370","Gamintojo bazinis kodas: ")}{config.code}</span>}
      {variant&&<><dl className="configuration-summary">{config.details?.filter(d=>['Galvos atrama','Porankiai','Pagrindas','Mechanizmas'].includes(d.label)).map(d=><div key={d.label}><dt>{copyValue(d.label)}</dt><dd>{copyValue(d.value)}</dd></div>)}</dl>
      <div className="finish-samples">{Object.entries(variant.samples).filter(([role])=>role==='seat'||role==='backrest').map(([role,sample])=><div key={role}><Image src={sample.image} alt="" width={42} height={42}/><span>{role==='seat'?copyText("ui.3875a6b4825d17627492","Sėdynė"):copyText("ui.c4401757d8f96cf092b2","Atlošas")}<strong>{sample.name} · {sample.code}</strong></span></div>)}</div></>}
      {!pilot&&config.configurator&&<a href={config.configurator} target="_blank" rel="noopener noreferrer">{copyText("ui.398d2dbfd50649381e2b","Gamintojo konfigūratorius ")}<ArrowUpRight size={15}/></a>}</div>}
    <div className="add-row"><label className="field quantity-field">{copyText("ui.84089b1ac893b8a8b5da","Kiekis")}<input type="number" min="1" max="1000" value={quantity} onChange={e=>setQuantity(Math.min(1000,Math.max(1,Number(e.target.value)||1)))}/></label><button className="button dark" onClick={addToQuote} disabled={items.length>=30&&!items.some(i=>i.productId===p.id&&i.configurationId===(config?.id||null))}>{added?<Check size={18}/>:<Plus size={18}/>} {added?copyText("ui.75475eb16effff6bf4c9","Pridėta prie užklausos"):copyText("ui.ed4fdbb2369ef0a68283","Pridėti prie užklausos")}</button></div>
    {added&&<p role="status" className="added-status">{copyText("ui.b3fb0ee1eaf5744bab77","Prekė sąraše. ")}<Link href="/uzklausa/">{copyText("ui.b9b11a9902bcc5bc0761","Peržiūrėti užklausą")}</Link></p>}
    {variant&&<a className="text-link product-pdf" href={'/api/produkto-kortele/?produktas='+encodeURIComponent(p.id)+'&komplektacija='+encodeURIComponent(variant.id)} download>{copyText("ui.b7fea1b19b503a1459af","Atsisiųsti produkto kortelę (PDF)")}<Download size={17}/></a>}
    <p className="product-help">{copyText("ui.55badab7237b886ed0ee","Nurodykite poreikį, o pasiūlymą paruošime pagal pasirinktą modelį ir komplektaciją.")}</p>
    {p.documents.length>0&&<details className="detail-disclosure"><summary>{copyText("ui.993ee48d40ec98d616c7","Dokumentai ir katalogai")}</summary><ul>{p.documents.map(d=><li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer">{d.title}<ArrowUpRight size={14}/></a></li>)}</ul></details>}
    {p.sourceDescription&&<details className="detail-disclosure"><summary>{copyText("ui.d6faa487db213e83f7d4","Gamintojo aprašymas anglų kalba")}</summary><div className="source-description" lang="en">{p.sourceDescription}</div></details>}
    </div></div>{!p.modelArticle&&<ProductSelectedReading rows={specificationRows} configured={!!pilot}/>}</>;
}
