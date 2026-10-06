// Owner-authorized semantic review of the existing map; no second calendar.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {loadEditorialSkill} from '../../../content-studio/src/editorial-skill.mjs';
import {addedSections} from './keyword-review.mjs';
const dir=new URL('./',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,dir),'utf8'));
export const merges=[
 ['GL-pasiruosimas','MN-pasiruosimas','Pradinė danga, nežinoma sistema, ilgis ir ankstesnis darbas yra tas pats prieš nagų vizitą perduodamos informacijos ruošinys. Gelinio lakavimo išimtis palikti vardiniame skyriuje.'],
 ['MS-kaklas-peciai','MS-nugara-ar-kunas','Abu lygina masažo zonas, darbo laiką ir komfortą. Kaklo ir pečių apimtis įtraukiama į vieną zonų žemėlapį; atskiras URL nekurtų naujos užduoties.'],
 ['BR-forma','BR-kirpimas-modeliavimas','Norimas kontūras ir ilgis yra barzdos modeliavimo užduotis. Originalius formos siluetus ir kasdienius kompromisus įtraukti į modeliavimo gidą.'],
 ['PD-pazeista-oda','PD-kosmetinis-ar-sveikatos','Abu atsako, kada kosmetinio pedikiūro nepakanka ir reikalingas sveikatos vertinimas. Vizito atidėjimas yra to paties sprendimo dalis; klinikinio algoritmo nekurti.'],
 ['VP-odos-tipas','VP-konsultacija','Vartotojo odos pastebėjimai, priemonės ir ankstesnės reakcijos yra vienos pirmos konsultacijos informacija. Nedaryti atskiro savidiagnostinio odos tipo URL.'],
 ['SP-prieziura','SP-gidas','Universalus po-SPA patarimas neturi vienos produkto instrukcijos. Ritualo komponentų instrukcijos ir pagalbos ribos tampa pagrindinio pasirinkimo gido skyriumi.'],
 ['RP-prieziura','RP-gidas','Bendra rankų ir pėdų SPA priežiūros kortelė priklauso paketo paaiškinimui. Konkretaus parafino bei nagų dangos instrukcijos turi savo metodo savininkus.'],
 ['SV-testinumas','SV-gidas','Seanso patirties ir gydymo pažado skirtumas yra tos pačios savijautos paslaugos pasirinkimo ribos; atskiras generinis po-seanso tekstas dubliuotų jas.']
];
export async function applySemanticReview(p){
 const original=p.pages.map(x=>({...x,outline:[...x.outline]}));
 const redirects=Object.fromEntries(merges.map(([from,to])=>[from,to]));
 const resolve=id=>redirects[id]??id,byId=new Map(p.pages.map(x=>[x.id,x]));
 for(const [from,to,reason] of merges){const a=byId.get(from),b=byId.get(to);if(!a||!b)throw Error('Review references unknown article');
  b.outline=[...new Set([...b.outline,...a.outline])];b.dimensions=[...new Set([...b.dimensions,...a.dimensions])];b.sourceIds=[...new Set([...b.sourceIds,...a.sourceIds])];
  b.originalContribution+='; '+a.originalContribution;b.evidenceNeeds.push(...a.evidenceNeeds);
  b.catalogueTargets=[...new Map([...b.catalogueTargets,...a.catalogueTargets].map(t=>[t.routeRegistryId,t])).values()];
  if(a.reviewLevel==='QUALIFIED_HEALTH_OR_LEGAL_REVIEW')b.reviewLevel=a.reviewLevel;
  (b.mergedIntents??=[]).push({oldId:from,title:a.title,reason});
  (b.mergedMediaBriefs??=[]).push({oldId:from,media:a.media});
 }
 p.pages=p.pages.filter(x=>!redirects[x.id]);for(const x of p.pages)if(x.parentId)x.parentId=resolve(x.parentId);
 for(const d of p.procedureCoverage)d.targetId=resolve(d.targetId);
 for(const [id,sections] of Object.entries(addedSections)){const x=p.pages.find(x=>x.id===id);x.outline.push(...sections);x.evidenceNeeds.push({task:'Naujų vardinių skyrių kainos / metodo / inventoriaus faktus patikrinti pirminiame dokumente arba realiame datuotame pasiūlyme; related phrase ar snippet to neįrodo.',status:'REQUIRED_BEFORE_DRAFT_APPROVAL'});}
 for(const x of p.pages){x.procedureSections=p.procedureCoverage.filter(d=>d.targetId===x.id);x.answerRequirements.body=[...x.outline];x.answerRequirements.deliverable=x.originalContribution;
  x.contentAcceptance={answer:'Tiesioginis pavadinime pažadėto klausimo atsakymas, paaiškintas mechanizmas ir taikymo išimtys',workedExample:x.originalContribution,claimEvidence:'Kiekvienas svarbus metodo, kainos, trukmės ar sveikatos teiginys siejamas su actual perskaitytu šaltiniu ir kontekstu; atlikta qualified review pagal teiginį',imageBoundary:'AI iliustracija nevadinama tikru meistro darbu, kliento rezultatu ar produkto bandymu',schema:'Article/WebPage, BreadcrumbList ir faktinė organizacijos autorystė pagal matomą tekstą; jokių fiktyvių Person, review rating, offer, provider ar specialios GEO schemos',geo:'Aiškus atsakymas, palyginimo kriterijai ir citatos prie faktų. Atskirai žymėti illustracinį scenarijų, datuotą pasiūlymą, metodo ribą ir tikrą autorystę.',finalMetadata:'SEO map yra planas; title/description/H2 sutikrinti su galutiniu tekstu ir rendered preview prieš approval'};
 }
 for(const rows of [p.reconciliation,p.referenceMenu])for(const d of rows)d.targetId=resolve(d.targetId);
 p.links=p.links.map(l=>({...l,from:resolve(l.from),to:resolve(l.to)})).filter(l=>l.from!==l.to);
 p.links=[...new Map(p.links.map(l=>[l.from+'|'+l.to,l])).values()];
 for(const l of p.links){const t=p.pages.find(x=>x.id===l.to)??p.existing.find(x=>x.id===l.to);l.anchor=t.title;}
 for(const c of p.categoryCoverage){c.pages=p.pages.filter(x=>x.categoryId===c.id).map(x=>x.id);c.matrix=Object.fromEntries(Object.keys(p.dimensions).map(d=>[d,p.pages.filter(x=>x.categoryId===c.id&&x.dimensions.includes(d)).map(x=>x.id)]));}
 // Shared preparation is an explicit cross-branch answer, not a forced replacement article.
 const gel=p.categoryCoverage.find(c=>c.id==='gelinis-lakavimas');gel.matrix.P=['MN-pasiruosimas'];gel.sharedAnswerReason='Tas pats nagų vizito informacijos ruošinys aptarnauja priežiūrą ir gelinį lakavimą; vardinė ankstesnės sistemos išimtis.';
 for(const c of p.catalogueCategoryCoverage){const ids=[...new Set(p.procedureCoverage.filter(d=>d.categoryId===c.id).map(d=>d.targetId))];const branches=[...new Set(ids.map(id=>p.pages.find(x=>x.id===id).categoryId))];const rows=p.pages.filter(x=>branches.includes(x.categoryId));c.articleIds=rows.map(x=>x.id);c.matrix=Object.fromEntries(Object.keys(p.dimensions).map(d=>[d,rows.filter(x=>x.dimensions.includes(d)).map(x=>x.id)]));}
 Object.assign(p.totals,{newUrls:p.pages.length,coverageTarget:p.pages.length+p.retained.length,evergreenNew:p.pages.filter(x=>x.wave!=='SEASONAL').length,links:p.links.length});p.policy.coverageTarget=p.totals.coverageTarget;
 p.window.target=p.totals.coverageTarget;
 p.updatedAt='2026-10-07';p.status='FULL_CATALOGUE_MAP_SEMANTICALLY_REVIEWED_EVIDENCE_GATES_OPEN';
 p.coverageState={map:'ALL_225_PROCEDURES_MAPPED_AFTER_INTENT_REVIEW',texts:'ONE_PRIVATE_PILOT_291_OTHER_NEW_DRAFTS_NOT_WRITTEN',originalAssets:'ONE_PILOT_IMAGE_CREATED_OTHER_ASSETS_NOT_CREATED',expertReviews:'NOT_PERFORMED',publicRelease:'NO_NEW_ARTICLE_RELEASE',googleAuthority:'NOT_MEASURED'};
 const identities=new Map(read('../content-execution-20261007/STUDIO-IDENTITY-MAP.json').pages.map(x=>[x.planId,x.pageId]));
 p.execution.pilot={articleId:'B-registracija',status:'PRIVATE_DRAFT_WITH_IMAGE_NOT_APPROVED_OR_DEPLOYED',artifact:'../content-execution-20261007/README.md',historicalGenerationReceiptUnchanged:true};
 p.execution.planMigration={oldPrivatePlans:303,newPlannedTotal:p.totals.coverageTarget,status:'NOT_APPLIED_TO_PRIVATE_STUDIO',retire:merges.map(([oldId,targetId])=>({oldId,targetId,oldPageId:identities.get(oldId),targetPageId:identities.get(targetId),action:'Retire unpublished plan through shared studio workflow; retain history and UUID mapping. No redirect for unpublished slug.'})),preserve:'Keep all real legacy IDs, scheduled dates, first pilot and its receipt. Review existing private plan changes before fresh revision; never relabel historical Luna output as generated under new skill.'};
 p.execution.fullMapRequired='Atnaujinta PLAN.json yra master; ankstesni303 privatūs UUID planai dar nemigruoti. Naujam rengimui taikyti explicit planMigration ir naują actual skill fingerprint.';
 if(existsSync(new URL('STUDIO_RECONCILIATION.json',dir))){
  const receipt=read('STUDIO_RECONCILIATION.json');
  if(receipt.status!=='OWNER_PRIVATE_STUDIO_295_ACTIVE_VERIFIED'||receipt.activePages!==p.totals.coverageTarget||receipt.retired.length!==merges.length||!merges.every(([from,to])=>receipt.retired.some(r=>r.pageId===identities.get(from)&&r.targetPageId===identities.get(to))))throw Error('Private reconciliation receipt does not match this reviewed map.');
  Object.assign(p.execution.planMigration,{status:'APPLIED_TO_OWNER_PRIVATE_STUDIO',receipt:'STUDIO_RECONCILIATION.json',checkedAt:receipt.checkedAt,appliedSourcePlanSha256:receipt.sourcePlanSha256,activePlans:receipt.activePages,archivedPlans:receipt.archivedPlans,scope:'Historical verification of the owner-isolated studio at checkedAt, not automatic state restoration in another clone.'});
  p.execution.fullMapRequired='Master brief per bendrą DATA lock perduotas295 aktyviems istoriniams UUID;8 retired snapshots ir ryšiai išlaikyti privačioje istorijoje. Generic V2 autopilot dar fail-closed: adapterio, šaltinių/media/review/release vartai lieka atskiri.';
 }
 p.execution.connectedGroups=p.categoryCoverage.map(c=>({id:c.id,rootId:c.rootId,articleIds:c.pages,sharedAnswerIds:[...new Set(Object.values(c.matrix).flat().filter(id=>!c.pages.includes(id)))],preparationDate:p.pages.find(x=>x.id===c.rootId).publishDate,approval:'NOT_PERFORMED',publicReady:false,requirements:['Pakankamas konkretus atsakymas ir originalus artefaktas','Current šaltinių ir faktų patikra','Kvalifikuota peržiūra pagal teiginius','Tikri target ID ir current public resolver','Revision review, media ir shadow import'],priority:{businessFit:'Owner-confirmed catalogue scope',demand:'Exact query observations only; missing volume does not exclude useful answer',differentiation:'Individual worked example or original schema in brief',dependency:'Actual catalogue and provider/account paths; not automatic indexable offer',effort:c.pages.length,changeTrigger:'Actual relevant GSC queries, approved supply, expert capacity or material source change'}}));
 const skill=await loadEditorialSkill('plan');if(!skill.metadata.modules?.includes('niche-seo-geo-core'))throw Error('This review requires the maintained SEO core merged in PR17 (main ed90a8b); integrate that dependency before rebuilding, without overwriting unrelated work.');p.seoCoreReview={reviewedAt:'2026-10-07',skill:skill.metadata.name,fingerprint:skill.metadata.fingerprint,modules:skill.metadata.modules,coreDependency:'PR17 / main ed90a8b028c8bb1631568a2a54173ce82387c381',newPaidUsd:0,rawEvidenceImport:'RESEARCH_IMPORT_MANIFEST.json',scope:'All existing article titles, outlines, original contributions and duplicate jobs; sampled SERP results. Not a review of nonexistent final article text or clinical claims.'};
 const review={reviewedAt:'2026-10-07',status:'ARTICLE_JOB_MAP_REVIEW_NOT_CONTENT_APPROVAL',inputNewArticles:original.length,outputNewArticles:p.pages.length,merges:merges.map(([oldId,targetId,reason])=>({oldId,targetId,reason,evidence:'Existing paired outline and original contribution; no paired controlled long-tail SERPs available',urlAction:'UNPUBLISHED_PLAN_MERGE_NO_REDIRECT',clinicalReview:'NOT_PERFORMED'})),articles:original.map(x=>({articleId:x.id,decision:redirects[x.id]?'MERGE_INTO_NAMED_ANSWER':'KEEP_DISTINCT_READER_JOB',targetId:resolve(x.id),readerJob:x.title,answerScope:x.outline.slice(0,3),originalContribution:x.originalContribution,decisionBasis:redirects[x.id]?merges.find(m=>m[0]===x.id)[2]:'Concrete method, comparison, visit constraint, price-scope, care instruction or professional boundary in this brief; not an article justified solely by a keyword variant.',serpSplitProof:'NOT_MEASURED_FOR_EVERY_ARTICLE_PAIR',contentApproval:'NOT_PERFORMED'})),keywordUniverse:'Observed phrases are discovery data; candidate and backlog rows remain explicitly unresolved, not completed URL targeting.',historicalPilot:'Preserved actual Luna/xhigh receipt, V2 hash and image. New skill review does not retroactively certify generation.',scopeAccepted:'21 areas / 59 groups / 225 procedures /103 cities; no article quota.',newPaidUsd:0};
 writeFileSync(new URL('SEMANTIC_REVIEW.json',dir),JSON.stringify(review,null,2)+'\n');
 return p;
}
