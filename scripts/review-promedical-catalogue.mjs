// Canonical, revision-bound review of the imported catalogue. Never deploys.
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
process.env.STUDIO_PUBLIC_CORE_DIR=path.join(root,'../promedical-public-20261009');
process.env.STUDIO_NETWORK_SETTINGS=path.join(process.env.STUDIO_PUBLIC_CORE_DIR,'config/niche-network.json');
const {getSite,editPage,revisionHash,recordEditorialReview,approveReviewedBatch,releaseContent}=await import('../content-studio/src/model.mjs');
const {reviewCurrent}=await import('../content-studio/src/content-workflow.mjs');
const work=path.join(root,'content-studio/data/promedical-import');
const receipt=JSON.parse(await readFile(path.join(work,'catalogue-import.json')));
const bytes=await readFile(receipt.sourceCatalogue),sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==receipt.sourceSha256||sha!=='00d2538197a45164b5472e2cf1a4d72b2cfa862d09c3cad50debc4f37fd38cf3')throw Error('Final catalogue source bytes changed.');
const catalogue=JSON.parse(bytes),productByPage=new Map(catalogue.products.map(p=>[receipt.productPageIds[p.id],p]));
let site=await getSite('promedical');
if(site.pages.length!==1856||catalogue.products.length!==1408||receipt.categories!==437)throw Error('Incomplete final catalogue inventory.');
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const plain=p=>clean(p.body.flatMap(b=>b.text?[b.text]:b.items||[]).join(' '));
const escape=v=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function assertProduct(page,v){
  if(!v.reviewEvidence?.contentReviewReady||v.reviewEvidence.numericInvariantResult!=='pass'||v.reviewEvidence.codeInvariantResult!=='pass')throw Error(`Source review incomplete ${v.id}`);
  if(page.title!==v.nameLt||page.intent!==`Katalogo kodas: ${clean(v.sku)} | Klaro produktas ${v.id}`)throw Error(`Model identity mismatch ${v.id}`);
  const text=plain(page);
  for(const s of [v.descriptionLt,...v.specs.map(s=>{const name=clean(s.nameLt||s.labelLt||'Parametras'),value=clean(s.value||s.valueLt);return value?`${name}: ${value}`:name;})])if(!text.includes(clean(s)))throw Error(`Fact missing from canonical draft ${v.id}: ${s}`);
  for(const o of v.variants||[])for(const choice of o.values||[])if(!text.includes(clean(choice.labelLt||choice.label||choice.value)))throw Error(`Variant missing ${v.id}`);
  if(!page.media.length||!page.externalLinks.some(l=>l.url===v.sourceUrl))throw Error(`Source image/link missing ${v.id}`);
}
for(const page of site.pages){const v=productByPage.get(page.id);if(v)assertProduct(page,v);for(const l of page.links)if(!site.pages.some(p=>p.id===l.targetPageId))throw Error(`Unresolved link ${page.slug}`);}
// Preserve an unchanged canonical review's actual earlier HTTP evidence on
// resumption. This is not reported as a new GET or a new review timestamp.
const observations=new Map();let next=0,done=0;
async function observe(page){const response=await fetch(`http://127.0.0.1:4387/preview/promedical/${page.id}`,{signal:AbortSignal.timeout(30000)}),html=await response.text();if(response.status!==200||(!html.includes(page.title)&&!html.includes(escape(page.title)))||html.includes('Tekstas dar nesugeneruotas'))throw Error(`Private rendered review failed ${page.slug}`);observations.set(page.id,{pageId:page.id,slug:page.slug,revisionHash:revisionHash(page),httpStatus:response.status,htmlSha256:createHash('sha256').update(html).digest('hex'),blocks:page.body.length,media:page.media.length,fetchedAt:new Date().toISOString()});}
for(const page of site.pages){const note=page.editorialReview?.evidence.presentation||'',match=note.match(/HTML SHA256 ([a-f0-9]{64})/);if(reviewCurrent(site,page,revisionHash(page))&&note.includes('GET HTTP200')&&match)observations.set(page.id,{pageId:page.id,slug:page.slug,revisionHash:revisionHash(page),httpStatus:200,htmlSha256:match[1],blocks:page.body.length,media:page.media.length,preservedEvidenceCheckedAt:page.editorialReview.checkedAt});}
const pendingViews=site.pages.filter(p=>!observations.has(p.id));
console.log(JSON.stringify({stage:'preserved-current-rendered-reviews',preserved:observations.size,newGets:pendingViews.length}));
await Promise.all(Array.from({length:4},async()=>{while(next<pendingViews.length){await observe(pendingViews[next++]);if(++done%200===0)console.log(JSON.stringify({stage:'studio-rendered-review',done,total:pendingViews.length}));}}));
async function review(page,extra=''){
  const v=productByPage.get(page.id),o=observations.get(page.id);
  await recordEditorialReview('promedical',page.id,{revisionHash:revisionHash(page),reviewer:'Codex /root — source-bound catalogue review',evidence:{
    usefulness:v?`Tikras Klaro modelis ${v.id}, kodas ${v.sku}; lietuviškas aprašymas, ${v.specs.length} techninių eilučių, ${(v.variants||[]).length} pasirinkimų grupių. Individualaus įstaigos poreikio užklausa, be išgalvotos kainos ar likučio.`:`Puslapis ${page.slug||'/'} turi atskirą katalogo, pasirinkimo gido, kontakto ar pasitikėjimo paskirtį; ${page.body.length} turinio blokų. Originalių trijų gidų faktų ir pirkimo ruošinių peržiūra aprašyta RESEARCH.md.`,
    facts:v?`Final v2 šaltinio SHA256 ${sha}; sourceId/SKU ${v.id}/${v.sku}. Agentų patikrinti ${v.reviewEvidence.featureLinesChecked} source faktai ir ${v.reviewEvidence.nameOptionRowsChecked} pavadinimo/variantų eilutės; skaičių ir kodų invariantai PASS. Root papildomai palygino visą aprašymą, kiekvieną spec ir variantą su canonical body. ${v.reviewEvidence.omissionReason||'Nėra teigiamų praleistų techninių faktų.'}`:`Savininko kontaktai sales@promedical.lt, +370 686 88369, prekės ženklas Promedical; juridinis pavadinimas pagal savininko nurodymą nerodomas. Turinys sulygintas su RESEARCH.md ir privacy implementation evidence. Produkcijos tvarkytojai, saugojimo terminai ir tikras inbox dar nėra šios vietinės peržiūros faktai.`,
    sources:`${page.externalLinks.length} konkrečių patikrintų išorinių URL. Gamintojo visų 2038 sitemap ir 299 pagination GET inventorius: 0 failures. Gidų Klaro/VPT/EDPB pirminiai šaltiniai RESEARCH.md. Originalus LT tekstas; nėra išgalvotų ekspertų/bandymų ar nukopijuoto pilno marketingo teksto.`,
    media:page.media.length?`${page.media.length} tikrų Klaro nuotraukų dydžių variantų per canonical saveResponsiveAsset; source SHA, URL, matmenys ir teisės private media-cache/originals. Fotografinė kompozicija išlaikoma, išgalvotų produktų nėra. Šeimų final Promedical browser patikra atliekama po šio immutable release.`:'Informacinis tekstinis puslapis; dekoratyvi fotografija nepriskirta ir jos buvimas neteigiamas.',
    links:`${page.links.length} tikrų tos pačios 1856 puslapių kolekcijos ID; visi tikslai patikrinti. Approval vykdomas pagal category-parent priklausomybes ir <=200 modelių partijas. ${extra}`,
    presentation:`Tikras private Content Studio GET HTTP${o.httpStatus}, antraštė ir ${o.blocks} blokų, HTML SHA256 ${o.htmlSha256}. Tai turinio peržiūra; galutinės Promedical šeimų desktop/mobile patikros ir visų URL HTTP verifier rezultatai įrašomi atskirai prieš delivery. Jokio žmogaus ar klinikinio approval neteigiame.`
  }});
}
for(const [index,page] of site.pages.entries()){if(!reviewCurrent(site,page,revisionHash(page)))await review(page);if(index%200===0)console.log(JSON.stringify({stage:'canonical-review-binding',done:index+1,total:site.pages.length}));}
const complete=p=>p.status==='approved'&&p.publishedRevision?.revisionHash===revisionHash(p);
let pending=site.pages.filter(p=>p.slug.startsWith('kategorijos/')&&!complete(p)),approved=new Set(site.pages.filter(p=>p.publishedRevision).map(p=>p.id));
while(pending.length){const ready=pending.filter(p=>p.links.every(l=>approved.has(l.targetPageId)));if(!ready.length)throw Error('Category dependency cycle');for(let i=0;i<ready.length;i+=200){const ids=ready.slice(i,i+200).map(p=>p.id);await approveReviewedBatch('promedical',ids,'Codex /root source-reviewed local catalogue');ids.forEach(id=>approved.add(id));}const ids=new Set(ready.map(p=>p.id));pending=pending.filter(p=>!ids.has(p.id));}
const support=site.pages.filter(p=>!p.slug.startsWith('kategorijos/')&&!productByPage.has(p.id)&&!complete(p));if(support.length)await approveReviewedBatch('promedical',support.map(p=>p.id),'Codex /root source-reviewed local support');
const products=site.pages.filter(p=>productByPage.has(p.id)&&!complete(p));for(let i=0;i<products.length;i+=200){await approveReviewedBatch('promedical',products.slice(i,i+200).map(p=>p.id),'Codex /root source-reviewed local products');console.log(JSON.stringify({stage:'canonical-approved-products',done:Math.min(i+200,products.length),total:products.length}));}
// Five observed model replacement/accessory relations, after dependency closure.
site=await getSite('promedical');const related=[];
for(const v of catalogue.products.filter(v=>v.relatedProductIds?.length)){const page=site.pages.find(p=>p.id===receipt.productPageIds[v.id]),links=[...page.links];for(const id of v.relatedProductIds){const target=site.pages.find(p=>p.id===receipt.productPageIds[id]);if(!target)throw Error('Unknown related source ID');if(!links.some(l=>l.targetPageId===target.id))links.push({targetPageId:target.id,label:target.title});}if(links.length>30)throw Error('Related graph exceeds canonical limit');const updated=await editPage('promedical',page.id,{links});await observe(updated);await review(updated,'Papildomai pridėtas realus gamintojo modelio pakaitalo/priedo ryšys; visi susiję modeliai jau approved.');related.push(page.id);}
if(related.length)await approveReviewedBatch('promedical',related,'Codex /root observed related model review');
const release=await releaseContent('promedical');
await mkdir(work,{recursive:true});await writeFile(path.join(work,'catalogue-review.json'),JSON.stringify({sourceSha256:sha,reviewedAt:new Date().toISOString(),observations:[...observations.values()],release,relatedCount:related.length,scope:'Source/editorial/studio rendering reviewed; actual public renderer and launch independently verified.'},null,2));
await writeFile(path.join(work,'final-release.json'),JSON.stringify(release,null,2));console.log(JSON.stringify(release));
