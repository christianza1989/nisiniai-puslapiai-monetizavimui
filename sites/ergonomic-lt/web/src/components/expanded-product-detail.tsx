'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {ProductImage as Image} from './product-image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {Plus,Check,Download,RotateCcw,X} from 'lucide-react';
import type {Product} from '@/lib/types';
import type {PilotVariant} from '@/lib/configurator';
import {createExpandedEngine,palettes as basePalettes,fieldLabels as baseFieldLabels,choiceLabel as baseChoiceLabel,type ExpandedState} from '@/lib/expanded-configurator';
import {useQuote,entryKey} from './quote-provider';
import {finishGroup,hasSourceMaterial,renderMaterial} from '@/lib/render-materials';
import type {CatalogRuntime} from '@/lib/catalog-configurator';
import {selectedModelConfiguration} from '@/lib/product-models';
import FinishSelect from './finish-select';
import {ProductGallery} from './product-gallery';
import {isolateWorkspace,workspaceFocusables} from '@/lib/fullscreen-workspace';
import {articleChoiceLabel,articleFieldLabels,configurableArticle} from '@/lib/configuration-article';
import {DuoBackBuilder} from './duo-back-builder';
import {DuoProductReading} from './duo-product-reading';
import {ProductStudioIntro} from './product-studio-intro';
import {ProductSelectedReading} from './product-selected-reading';
import {productSpecificationRows} from '@/lib/product-specifications';
import {expandedQuoteEntry} from '@/lib/expanded-quote-entry';
import {expandedProductCardPath} from '@/lib/expanded-product-card-path';
const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false,loading:()=> <div className="viewer-placeholder" role="status">{copyText("ui.19eac4a3b50b67b8f89d","Ruošiama 3D peržiūra…")}</div>});
export default function ExpandedProductDetail({product,url,presets,catalogRuntime,initialConfiguration,initialCustomized=false,configurationMessage}:{product:Product;url:string;presets:ReactNode;catalogRuntime?:CatalogRuntime;initialConfiguration?:ExpandedState;initialCustomized?:boolean;configurationMessage?:string}){
 const engine=useMemo(()=>createExpandedEngine(catalogRuntime),[catalogRuntime]);
 const {expandedForProduct,initialStateForProduct,changeField,stateChoices,stateToken,parseStateToken,expandedSelection}=engine;
 const {catalogForProduct,catalogAnchor,catalogInitial}=engine.catalog;
 const palettes=useMemo(()=>{const result={...basePalettes};for(const [key,values] of Object.entries(catalogRuntime?.palettes||{}))result[key]={...result[key],...values};return result;},[catalogRuntime]);
 const choiceLabel=(field:string,value:string)=>articleChoiceLabel(product,field,value)||baseChoiceLabel(field,value,catalogRuntime?.palettes,family.id);
 const fieldLabels={...baseFieldLabels,...Object.fromEntries(Object.entries(catalogRuntime?.palettes._fieldLabels||{}).map(([key,label])=>[key,label.text])),...articleFieldLabels(product)};
 const family=expandedForProduct(product)!;
 const catalog=catalogForProduct(product);
 const structureOnly=catalog?.collectionMode==='structure-only'&&!product.id.toLowerCase().includes('xilium');
 const model=selectedModelConfiguration(product);
 const builderFirstPreview=true;
 const [customized,setCustomized]=useState(initialCustomized);
 const [selection,setSelection]=useState<ExpandedState>(()=>initialConfiguration||initialStateForProduct(product)),[photo,setPhoto]=useState(!builderFirstPreview&&!!product.modelConfigurationId&&!configurableArticle(product)),[presetMode,setPresetMode]=useState(false),[quantity,setQuantity]=useState(1),[added,setAdded]=useState(false),[message,setMessage]=useState(configurationMessage||'');
 const [fullscreen,setFullscreen]=useState(false),workspace=useRef<HTMLDivElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null),returnScroll=useRef(0),nativeFullscreen=useRef(false);
 const {items,add}=useQuote();
 async function openFullscreen(){returnFocus.current=document.activeElement as HTMLElement;returnScroll.current=window.scrollY;setFullscreen(true);
  // Keep the studio workspace stable in embedded and mobile browsers.
  if(builderFirstPreview)return;
  try{await workspace.current?.requestFullscreen?.();}catch{/* Embedded browsers still get the full viewport workspace. */}}
 async function closeFullscreen(){setFullscreen(false);if(document.fullscreenElement===workspace.current)try{await document.exitFullscreen();}catch{/* The viewport workspace still closes. */}}
 useEffect(()=>{const changed=()=>{if(document.fullscreenElement===workspace.current)nativeFullscreen.current=true;else if(nativeFullscreen.current){nativeFullscreen.current=false;setFullscreen(false);}};
  document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);
 },[]);
 useLayoutEffect(()=>{if(!fullscreen||!workspace.current)return;
  const restore=isolateWorkspace(workspace.current),overflow=document.body.style.overflow;document.body.style.overflow='hidden';closeButton.current?.focus();
  return()=>{restore();document.body.style.overflow=overflow;window.scrollTo({top:returnScroll.current,behavior:'instant'});returnFocus.current?.focus({preventScroll:true});};
 },[fullscreen]);
 useEffect(()=>{if(initialConfiguration)return;const token=new URLSearchParams(window.location.search).get('konfig');if(token)try{setSelection(parseStateToken(product,token));setCustomized(true);}catch{setMessage(copyText("ui.ebb2987ef716971244b4","Nuorodos komplektacija negalioja. Rodoma pradinė komplektacija."));}},[product,initialConfiguration]);
 const selected=useMemo(()=>expandedSelection(product,selection),[product,selection,expandedSelection]);
 const choices=stateChoices(selection);
 const interactive=Object.keys(choices).length>0;
 const article=engine.selectionArticle(product,selected.state);
 const summaryDetails=product.id.includes('xilium-swivel')?selected.configuration.details?.filter(d=>['Mechanizmas','Galvos atrama','Porankiai','Pagrindas','Ratukai'].includes(d.label)):selected.configuration.details?.slice(0,4);
 const activeMaterials=catalogAnchor(selection)?.materials;
 const missingFinish=!structureOnly&&catalog&&Object.entries(selection.values).some(([k,v])=>/COLOR|CHCOL/.test(k)&&!/PLASTIC|FRAME/.test(k)&&!hasSourceMaterial(v)&&!activeMaterials?.[k]?.[v]&&!palettes[k]?.[v]?.color);
 const assembly=useMemo(()=>{
  const values=Object.fromEntries((selected.configuration.supplierOptions||[]).map(option=>{const [field,value]=option.split('=');return [field.split('.').at(-1)!,value];}));
  // Literal structure-only assets already contain the complete measured PBR
  // materials. Recolouring them through a generic palette would change proof.
  return {...selected.assets,finishes:structureOnly?{}:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{...palettes[k]?.[v],material:activeMaterials?.[k]?.[v],code:v,group:values[finishGroup[k]]||(k==='CUPHSEATCOLOR'?values.CSEATUPHGROUP:k==='CUPHCOLOR'?values.CUPHGROUP:k==='CHEADRESTUPHCOLOR'?values.CHEADRESTUPHGROUP:undefined)}]))};
 },[selected,palettes,activeMaterials,structureOnly]);
 const variant={...selected.variant,...selected.assets.base} as PilotVariant;
 const token=stateToken(selection);
 const pdf=expandedProductCardPath(product,token,!!article);
 const quote=expandedQuoteEntry(product,selected.configuration,selection,{url,model,customized,quantity,choiceLabel});
 function change(field:string,value:string){try{setSelection(changeField(selection,field,value));setCustomized(true);setAdded(false);setMessage('');setPhoto(false);}catch{setMessage(copyText("ui.9382165cbfa58b82bfc9","Šis pasirinkimas negalimas su dabartine konstrukcija. Rinkitės kitą variantą."));}}
 function field(k:string){const value=selection.values[k],color=/COLOR|CHCOL/.test(k);
  const label=fieldLabels[k]||k;
  if(color&&!k.startsWith('CPLASTIC'))return <FinishSelect key={k} label={label} value={value} onChange={v=>change(k,v)} options={choices[k].map(v=>({value:v,label:choiceLabel(k,v),image:activeMaterials?.[k]?.[v]?.image||palettes[k]?.[v]?.image||renderMaterial({code:v}).image,color:palettes[k]?.[v]?.color}))}/>;
  return <div key={k} className="configuration-field"><label className="field">{label}
   <select value={value} onChange={e=>change(k,e.target.value)}>{choices[k].map(v=><option key={v} value={v}>{choiceLabel(k,v)}</option>)}</select></label>
  </div>;
 }
 const actions=<>
  <div className="add-row"><label className="field quantity-field">{copyText("ui.84089b1ac893b8a8b5da","Kiekis")}<input type="number" min="1" max="1000" value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(1000,Number(e.target.value)||1)))}/></label><button className="button dark" disabled={items.length>=30&&!items.some(i=>entryKey(i)===entryKey(quote))} onClick={()=>{add(quote);setAdded(true);}}>{added?<Check size={18}/>:<Plus size={18}/>} {added?copyText("ui.75475eb16effff6bf4c9","Pridėta prie užklausos"):copyText("ui.ed4fdbb2369ef0a68283","Pridėti prie užklausos")}</button></div>
  {added&&<p className="added-status" role="status">{copyText("ui.10c7e0c07a9fe83192c2","Komplektacija išsaugota. ")}<Link href="/uzklausa/">{copyText("ui.b9b11a9902bcc5bc0761","Peržiūrėti užklausą")}</Link></p>}
  <a className="text-link product-pdf" href={pdf} download>{copyText("ui.b7fea1b19b503a1459af","Atsisiųsti produkto kortelę (PDF)")}<Download size={17}/></a>
  <p className="product-help">{copyText("ui.bfc8671fddd44ed50d27","Pasiūlyme patvirtinsime kainą, apdailas ir užsakymo specifikaciją.")}</p>
 </>;
 const gallery=<div key="gallery" className="gallery">
  <div className="product-view-switch" role="group" aria-label={copyText("ui.b9442465d0b687df4540","Produkto peržiūra")}><button aria-pressed={!photo} onClick={()=>setPhoto(false)}>{copyText("ui.f8e94106288faa882ee7","3D konfigūratorius")}</button><button aria-pressed={photo} onClick={()=>setPhoto(true)}>{copyText("ui.12ef5d8d56f194f5cbd4","Nuotraukos")}</button></div>
  {photo?<ProductGallery key={model?.id||selected.configuration.id} primary={product.modelConfigurationId?product.image:selected.configuration.image} images={(model||product.configurations.find(c=>c.id===selected.configuration.id))?.gallery||[]} name={product.name} specificCount={product.modelGalleryCount} backdrops={product.galleryBackdrops}/>:<Viewer3D variant={variant} name={product.name} assembly={assembly} fullscreen={fullscreen} onFullscreen={()=>void openFullscreen()}/>}
  <p className="visualization-note">{structureOnly?'Rodoma šio varianto apdaila. Dėl kitų spalvų teiraukitės.':copyText("ui.1f86445eb42b83be0ee5","Spalvos ekrane orientacinės. Nuotrauka — modelio pavyzdys; individualią komplektaciją žymi jūsų pasirinkimai.")}</p>
  {photo&&article&&<p className="visualization-note">{article.photoNote}</p>}
  {missingFinish&&<p className="form-note" role="status">{copyText("ui.3d2d0a1dccfd3cf4986c","Gamintojas nepateikia pasirinktos apdailos vaizdo. Jos spalvą patvirtinsime pasiūlyme; pasirinktas kodas išsaugomas užklausoje.")}</p>}
  {message&&<p className="configuration-status" role="status">{message}</p>}
  {article&&!builderFirstPreview&&!!summaryDetails?.length&&<div className="duo-live-summary"><p>Jūsų pasirinkimai</p><dl>{summaryDetails.map(d=><div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl></div>}
 </div>;
 const productInfo=<div key="product-info" className="product-info">{article||builderFirstPreview?<DuoBackBuilder preview={builderFirstPreview?gallery:undefined} studio={builderFirstPreview} heading={builderFirstPreview?'Susikomplektuokite savo norimą kėdę su 3D konfigūratoriumi':undefined} extraControls={catalog&&catalog.articles.length>1?<label className="field studio-model-picker">{copyText("ui.40ae815c6fd93bd1128a","Kėdės modelis")}<select value={catalogAnchor(selection)?.article} onChange={e=>{setSelection(catalogInitial(catalog,e.target.value));setAdded(false);setMessage(copyText("ui.ced1e103d19ade62c867","Pasirinktas kitas kėdės modelis."));}}>{catalog.articles.map(a=><option key={a.code} value={a.code}>{a.name} · {a.code}</option>)}</select></label>:undefined} product={product} state={selected.state} choices={choices} article={article} control={field} actions={actions} details={selected.configuration.details||[]}/>:<><h1>{product.publicHeading||product.name}</h1><p className="product-description">{product.description}</p><p className="price-note">{copyText("ui.7712573f04829fa4cead","Kaina pagal pasirinktą komplektaciją")}</p>
  {catalog&&catalog.articles.length>1&&<label className="field">{copyText("ui.40ae815c6fd93bd1128a","Kėdės modelis")}<select value={catalogAnchor(selection)?.article} onChange={e=>{setSelection(catalogInitial(catalog,e.target.value));setAdded(false);setMessage(copyText("ui.ced1e103d19ade62c867","Pasirinktas kitas kėdės modelis."));}}>{catalog.articles.map(a=><option key={a.code} value={a.code}>{a.name} · {a.code}</option>)}</select></label>}
  {model&&<p className="configuration-model">{customized?copyText("ui.3dad75de298a208bae2c","Individuali šio modelio komplektacija"):copyText("ui.b549610f5be9e81ec852","Pasirinktas gamintojo pavyzdys")} · {model.code}</p>}<p className="configuration-model">{catalog?catalogAnchor(selection)?.name:family.id==='xilium'?copyText("ui.682d34e4afb5e79cfa12","Duo-Back atlošas"):copyText("ui.63098d690dc9fb73bce7","Tinklinis atlošas")} · {selected.configuration.code}</p>
  {!article&&<><details className="configuration-section" open><summary>{copyText("ui.00e28775dffa5860871b","Konstrukcija ir funkcijos")}</summary><div className="configuration-grid">{Object.keys(choices).filter(k=>!k.includes('GROUP')&&!/COLOR|CHCOL/.test(k)||k.startsWith('CPLASTIC')).map(field)}</div></details>
  <details className="configuration-section"><summary>{copyText("ui.e0bb12feaf5e98afa8fe","Apmušalai ir spalvos")}</summary><div className="configuration-grid">{Object.keys(choices).filter(k=>!k.startsWith('CPLASTIC')&&(k.includes('GROUP')||/COLOR|CHCOL/.test(k))).map(field)}</div><p className="form-note">{copyText("ui.fa574cddca3691ac20e3","Pakeitus apmušalų grupę atnaujinamos galimos medžiagos ir spalvos.")}</p></details></>}
  {actions}
  {!product.modelConfigurationId&&<button className="text-link preset-mode" onClick={()=>{if(fullscreen)void closeFullscreen();setPresetMode(true);}}>{catalog?copyText("ui.5b961219b370be86dbd0","Gamintojo pavyzdinės komplektacijos"):copyText("ui.fa510655a478d166ab0e","Kiti atlošai ir gamintojo pavyzdinės komplektacijos")}</button>}
  {product.documents.length>0&&<details className="detail-disclosure"><summary>{copyText("ui.993ee48d40ec98d616c7","Dokumentai ir katalogai")}</summary><ul>{product.documents.map(d=><li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a></li>)}</ul></details>}
 </>}</div>;
 if(presetMode)return <><button className="text-link configurator-back" onClick={()=>setPresetMode(false)}><RotateCcw size={16}/> {copyText("ui.fa3bb395559b126b5719","Grįžti į individualų konfigūratorių")}</button>{presets}</>;
 return <>{builderFirstPreview&&<ProductStudioIntro product={product} paragraphs={article?.intro}/>}<div id="konfiguratorius" ref={workspace} className={'product-detail expanded-detail'+(builderFirstPreview?' builder-first-preview editorial-studio'+(!interactive?' studio-basic-workspace':''):'')+(fullscreen?' configurator-fullscreen':'')} role={fullscreen?'dialog':undefined} aria-modal={fullscreen?true:undefined} aria-label={fullscreen?copyText("ui.a964afd79eaffcffc406","{{p0}} konfigūratorius",{p0:(product.name)}):undefined} onKeyDown={e=>{
  if(!fullscreen)return;
  if(e.key==='Escape'){e.preventDefault();void closeFullscreen();}
  if(e.key==='Tab'){const focusable=workspaceFocusables(workspace.current!),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}>
 <div className="configurator-fullscreen-header" hidden={!fullscreen}><span>{product.name} <span>{copyText("ui.f8e94106288faa882ee7","3D konfigūratorius")}</span></span><button ref={closeButton} type="button" aria-label={copyText("ui.dc7d204b244e9e406fcd","Uždaryti visą ekraną")} title={copyText("ui.efef796bbdbf76bdebb2","Uždaryti (Esc)")} onClick={()=>void closeFullscreen()}><X size={22}/><span>{copyText("ui.63fc471369e620d7d2d6","Uždaryti")}</span></button></div>
 {article&&!builderFirstPreview&&<header className="duo-product-heading"><h1>{product.publicHeading||product.name}</h1><p>{product.description}</p></header>}
 {interactive?(builderFirstPreview?productInfo:[gallery,productInfo]):<><header className="studio-basic-heading"><h2>3D produkto peržiūra</h2></header><div className="product-info"><h3>Pasirinkite kiekį ir pateikite užklausą</h3><p className="configuration-model">{selected.configuration.code}</p>{actions}</div>{gallery}</>}</div>{article?<DuoProductReading name={product.name} article={article} includeOverview={false}/>:!product.modelArticle&&<ProductSelectedReading rows={productSpecificationRows(selected.configuration.code,selected.configuration.details)}/>}</>;
}
