'use client';
import dynamic from 'next/dynamic';
import type {ReactNode} from 'react';
import type {PilotVariant} from '@/lib/configurator';
import type {resolveSeglaVisual} from '@/lib/segla-visual-routing';
const Viewer3D=dynamic(()=>import('./viewer-3d'),{ssr:false});
export default function SeglaVisualReview({resolved,children}:{resolved:ReturnType<typeof resolveSeglaVisual>;children?:ReactNode}){
 const {representative:r,mapping:m,exactRoute}=resolved;
 const variant:PilotVariant={id:r.id,label:r.label,backrest:'uph',...r.asset,image:'',sourceCadUrl:'',sourceCadSha256:r.asset.assetSha256,supplierCode:r.code,supplierOptions:[],materialCodes:{},samples:{},visualizationNote:''};
 return <section data-segla-visual-id={r.id} data-segla-visual-mode={resolved.mode} data-segla-visual-sha={r.asset.assetSha256}>
  <p className="form-note" role="status">{exactRoute?'Naudojama tiksliai šiai komplektacijai ir apdailai patikrinta versija.':m.mode==='NEAREST_VISUAL_MODEL_DIRECT_ROKO'?'Rodomas artimiausias surinktas išorinis modelis. Funkcinė komplektacija nėra tiksliai atkurta 3D.':'Rodomas surinktas išorinis modelis su originalia numatyta apdaila.'}</p>
  {!exactRoute&&<p className="form-note">Šiam vaizdui kitų spalvų pasirinkimas nepatvirtintas. Apdaila: {Object.entries(r.defaultFinish).map(([k,v])=>k+' = '+v).join(' · ')||'originalios modelio medžiagos'}.</p>}
  <details><summary>Pasirinktos funkcinės komplektacijos duomenys</summary><dl>{Object.entries({...m.options,...m.dimensions}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="form-note">Duomenys išsaugomi atskirai nuo rodomo modelio. Geometrija pagal matmenis netempiama.</p></details>
  {exactRoute?children:<Viewer3D variant={variant} name={r.label}/>}
 </section>;
}
