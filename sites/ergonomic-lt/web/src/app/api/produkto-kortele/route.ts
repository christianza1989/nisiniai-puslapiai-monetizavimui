
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {visibleProductsAsync as visibleProducts} from '@/lib/catalog';
import {pilotSelection} from '@/lib/configurator';
import {productCardPdf} from '@/lib/product-card-pdf';
import {createExpandedEngine} from '@/lib/expanded-configurator';
import {loadCatalogRuntime} from '@/lib/catalog-runtime-loader';
import {modelProduct} from '@/lib/product-models';
import {configurableArticle,articleChoiceLabel} from '@/lib/configuration-article';
import {armrestChoiceLabel,armrestFieldLabel} from '@/presentation/armrest-labels';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const query=new URL(request.url).searchParams,id=query.get('produktas'),cid=query.get('komplektacija');
  if(id&&query.has('konfig')){
    const product=(await visibleProducts()).find(p=>p.id===id);if(!product)return Response.json({error:copyText("ui.66a3aeec731259a7d56f","Produktas nerastas.")},{status:404});
    try{
      const requested=query.get('modelis'),configuration=requested?product.configurations.find(c=>c.id===requested):undefined;
      if(requested&&!configuration)throw Error('Unknown model');
      const configured=configuration?modelProduct(product,configuration):product;
      if(requested&&!configurableArticle(configured))throw Error('Model has no reviewed conditional article');
      const scoped=await loadCatalogRuntime(configured,query.get('konfig')),engine=createExpandedEngine(scoped),state=engine.parseStateToken(configured,query.get('konfig')!);
      const selection=engine.expandedSelection(configured,state),article=engine.selectionArticle(configured,state);
      const bytes=await productCardPdf(configured,selection.configuration,selection.variant,true,article,(k,v)=>armrestChoiceLabel(selection.configuration.code,k,v)||articleChoiceLabel(configured,k,v),{palettes:{...scoped?.palettes,...(armrestFieldLabel(selection.configuration.code)?{_fieldLabels:{...scoped?.palettes._fieldLabels,CARMRESTS:{text:armrestFieldLabel(selection.configuration.code)!}}}:{})},family:state.family});
      return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="ergonomic-${product.slug}-individuali.pdf"`,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
    }catch{return Response.json({error:copyText("ui.bf211cdf6122f80f3ec4","Komplektacija negalioja. Pasirinkite ją iš naujo.")},{status:400});}
  }
  if(!id||!cid||id.length>200||cid.length>100)return Response.json({error:copyText("ui.70482cf8332f8b67ef7c","Nurodykite produktą ir komplektaciją.")},{status:400});
  const product=(await visibleProducts()).find(p=>p.id===id),selection=product?pilotSelection(product,cid):undefined;
  if(!product||!selection)return Response.json({error:copyText("ui.eda1beb2430cb0570f38","Produkto komplektacija nerasta.")},{status:404});
  try{
    const bytes=await productCardPdf(product,selection.configuration,selection.variant);
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="ergonomic-${product.slug}-${cid}.pdf"`,
      'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
  }catch{return Response.json({error:copyText("ui.b8832f323f129f8e0738","Nepavyko paruošti produkto kortelės. Bandykite dar kartą.")},{status:503});}
}
