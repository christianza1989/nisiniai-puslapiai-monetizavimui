import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {catalogFromMarkdown,scoreAudit} from '../../SKILLS/niche-site-audit/scripts/score-audit.mjs';
const dir=import.meta.dirname,root=path.resolve(dir,'../..');
const json=async file=>JSON.parse(await readFile(path.join(dir,file),'utf8'));
const version=await json('VERSION.json'),perf=await json('PERFORMANCE.json'),html=await json('HTML-AUDIT.json');
assert.equal(html.findings.length,0);assert.equal(html.publicPages,11);
const at=new Date().toISOString();
const luminance=h=>{const rgb=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return Math.round(((Math.max(x,y)+.05)/(Math.min(x,y)+.05))*100)/100;};
const palette={paper:'#f5f1e9',ink:'#29251f',muted:'#655d52',accent:'#87472f',soft:'#e8dfd2',inquiry:'#e0c5b0',field:'#fcfaf6',hover:'#693721'};
const contrastRows=[['body',palette.ink,palette.paper],['utility',palette.muted,palette.paper],['guide utility',palette.muted,palette.soft],['inline action',palette.accent,palette.paper],['button',palette.paper,palette.accent],['button hover',palette.paper,palette.hover],['inquiry body',palette.ink,palette.inquiry],['field',palette.ink,palette.field]].map(([usage,fg,bg])=>({usage,fg,bg,ratio:contrast(fg,bg),normalTextPass:contrast(fg,bg)>=4.5}));
assert.ok(contrastRows.every(r=>r.normalTextPass));
const accessibility={siteId:'akmenas',at,packageSha256:version.packageSha256,sourceFingerprints:version.sourceFingerprints,base:'http://127.0.0.1:8886',environment:'Isolated local production build; Codex IAB viewport overrides, simulated desktop/mobile, not physical devices.',enlargement:{status:'UNVERIFIED',mechanism:'No supported real browser zoom or existing text-size control exposed by this browser backend.',originalZoom:null,finalZoom:null,viewportOverrideRestored:true,reason:'320px reflow and Lighthouse cannot stand in for actual 200% enlargement. No global settings changed.'},viewports:[320,390,768,1440],contrastRows,keyboard:await json('qa/keyboard-final.json'),runtime:await json('qa/runtime-a11y.json'),form:await json('qa/native-form.json'),evidence:['qa/responsive-evidence.json','qa/care-capture-state.json','FINISH-VERDICT.json','qa/keyboard-final.json','qa/runtime-a11y.json','qa/native-form.json'],scope:{narrow:'Homepage, index, form, all three entire guides, source lists, byline, breadcrumb, contents and footer inspected. No horizontal overflow observed in recorded DOM checks.',touch:'Menu, primary actions, contents and footer routes >=44px. Brand32px and checkbox21px inside a larger clickable label are recorded exceptions; inline text links remain inline. Not a universal target-size conformance claim.',utility:'Mobile body17px, actions16px, contents15px, source14px, breadcrumb/byline13px. Read at320/390; actual enlargement is still missing.',motion:'No timed entrance/scroll animations. Source prefers-reduced-motion rule removes the 1px active-button translation. Browser preference emulation not available, so this is source behavior evidence.',focus:'Menu activated and closed with Enter. Skip link focuses main#turinys with3px accent outline; mainTop0. Native empty form focuses name and exposes required constraints. Contents native details and valid fragment IDs recorded during viewport tests.'},repairs:['Skip target made focusable with tabIndex=-1.','768px hero reading order corrected with761–960px stacked grid.','Invalid/sticky-top care captures discarded and final17 captures independently reopened.'],limitations:['No actual200% page/text enlargement; R2/S2 remain UNVERIFIED.','No physical phone, touch screen, screen reader or WCAG certification.','Screenshot pixels appear warmer than normative CSS; actual DOM background rgb(245,241,233) matches CSS, cause of capture difference unknown.']};
await writeFile(path.join(dir,'ACCESSIBILITY-VERIFICATION.json'),JSON.stringify(accessibility,null,2));
await writeFile(path.join(dir,'ACCESSIBILITY-VERIFICATION.md'),`# akmenas.lt prieinamumo įrodymai\n\n${at}; paketas ${version.packageSha256}. Vietinis production build8886, Codex IAB; atskirai tikrinti320/390/768/1440 CSS px, ne fiziniai įrenginiai.\n\n## Patikrinta\n\nKlaviatūros Enter atidaro ir uždaro Meniu; skip link fokusuoja main#turinys su3px outline. Native tuščia forma fokusuoja vardą, turi susietus labels ir privalomumo klaidas. Gido native details ir egzistuojantys fragmentai, visas trijų gidų turinys, šaltiniai, byline, breadcrumb, footer bei formos išdėstymas patikrinti siaurai.17 galutinių ekrano nuotraukų nepriklausomai peržiūrėtos FINISH-VERDICT. Ankstesni neteisingai nuslinkę care captures pakeisti.\n\n${contrastRows.map(r=>`- ${r.usage}: ${r.fg} / ${r.bg} = ${r.ratio}:1.`).join('\n')}\n\nNormatyvinio CSS ir tikro DOM spalvos sutampa. Kai kurie screenshot pikseliai šiltesni; priežastis nežinoma. Body17px, actions16px, source14px, byline/breadcrumb13px mobile; vizualiai skaitomi320/390. Veiksmų/menu/contents/footer valdikliai bent44px; brand32px ir checkbox21px su dideliu clickable label bei inline nuorodos yra išvardytos išimtys. Jokios bendros target-size/WCAG sertifikacijos. Nėra timed animacijų, reduced-motion CSS pašalina active button1px poslinkį; preference emuliacija nevykdyta.\n\n## Neužbaigtas didinimo vartas\n\n**R2/S2 UNVERIFIED.** Backend nepateikia tikro browser zoom mechanizmo; pradinis ir galutinis procentas nenustatyti.320px peržiūra nėra200% bandymas. Globalūs zoom/font nustatymai nekeisti, temporary viewport atkurtas. Nepridėtas dirbtinis dydžio valdiklis vien PASS gauti. Fiziniai įrenginiai ir screen reader netestuoti.\n\nJSON saugo versiją, datą, kontrastą ir tikrų peržiūrų įrodymų kelius.\n`);
// Per-criterion decisions from this site's evidence. The official initializer supplied the catalog.
const decisions={};
const set=(id,status,notes,...files)=>{decisions[id]={status,notes,evidence:files.map(f=>`sites/akmenas/${f}`)};};
const pass=(id,notes,...files)=>set(id,'PASS',notes,...files);
const unverified=(id,notes,...files)=>set(id,'UNVERIFIED',notes,...files);
pass('A1','Informacinė Phase1: medžiagų pasirinkimas ir poreikio aprašas; ne užsakymas ir ne paklausos įrodymas.','PRODUCT.md','HTML-AUDIT.json');
pass('A2','Yra tikri gidai ir lokali D1 forma. Nėra katalogo, kainų, likučio, tiekėjų ar montavimo pažado.','CONTENT-REVIEW.json','FORM-VERIFICATION.json');
unverified('A3','Nepaleista; tinkamų realių užklausų, vertės ir vykdymo pajėgumo nėra išmatuota.','CONTENT-PLAN.json');
pass('B1','MB Pinet/info@pinet.lt sutampa pakete, rendererio config, Organization, kontaktuose ir bendrame pašto gavėjo įrodyme.','VERSION.json','HTML-AUDIT.json','SHARED-MAIL-EVIDENCE.json');
pass('B2','Peržiūrėti11tekstų; nėra kitų nišų telefono/adreso/kodo, fiktyvių darbų, žmonių, sertifikatų ar atsiliepimų.','CONTENT-REVIEW.json');
unverified('B3','Patvirtintas tik operatoriaus vardas ir numatytas el.paštas. Juridiniai rekvizitai/adresas bei domain control nenustatyti.','CONTENT-REVIEW.json');
pass('C1','Ribotas CDX tyrimas283HTMLURL,4archyvo mėginiai; nepavykęs metų pjūvis aiškiai pažymėtas, ne istorijos nebuvimas.','history/audit.json','history/REPORT.md','history/ASSESSMENT.md');
pass('C2','Root atkuriamas naujai informacinei nišai; seni product/JSP/Joomla URL defer/404. Nėra visų URL redirect į root.','history/url-decisions.json','seo-smoke.log');
set('C3','NA','Neįgyvendinta nė viena legacy redirect taisyklė; todėl same-intent production redirect priėmimas šiai versijai netaikomas.','history/url-decisions.json');
pass('D1','LT/PL/UK/IT pavyzdžiai su actual desktop/mobile evidence; DE tik paieškos kandidatas, Laminam lazy/cookie ribos įvardytos.','research/RESEARCH.md','FINISH-REVIEW.md');
pass('D2','Originali agento kopija remiasi pirminiais NSI/Cosentino/Laminam dokumentais;4originalios iliustracijos su kilmės ir teisių žurnalu.','CONTENT-REVIEW.json','MEDIA-LEDGER.json','research/RESEARCH.md');
pass('D3','Auditorija, SEO klausimai ir sezoninės datos aiškiai hipotezės; apimtys/konversijos/reitingai neišgalvoti.','research/RESEARCH.md','CONTENT-PLAN.json');
pass('E1','Akmens atlaso kompozicija visuose puslapiuose; reviewer13/14subjektyvus, planšetės kompozicija pataisyta ir fixes-only patvirtinta.','FINISH-REVIEW.json','FINISH-VERDICT.json','DIRECTION.md');
pass('E2','Normatyviniai realaus CSS tokenai ir kompozicija įrašyti DESIGN bei sidecar; kompromisai ir ribos atskirti nuo LH.','DESIGN.md','.impeccable/design.json');
pass('E3','AIoriginalai nežymimi tikrais kliento projektais; nėra generator badge. Kilmė privateledger ir redakcinėje metodikoje; fontOFL išlaikyta.','MEDIA-LEDGER.json','CONTENT-REVIEW.json','FONT-OPTIMIZATION.json');
pass('F1','Visi11publicURL pasiekiami;3guides perhome/hub/context/footer, nėra orphan.','HTML-AUDIT.json');
pass('F2','Header/mobilemenu/footer/CTA turi realius eligibleURL; mobilemenu nativeEnter išbandytas.','HTML-AUDIT.json','qa/keyboard-final.json','qa/index-320.png');
pass('F3','11skirtingų klausimų; trysgidai skirti medžiagai/pasiruošimui/priežiūrai, nėra miestų/sinonimų puslapių.','CONTENT-REVIEW.json');
pass('G1','Pirmas ekranas nurodo virtuvės akmenį, pasirinkimo informaciją ir palyginimo/poreikio veiksmus; vietinis formos režimas aiškus.','qa/home-desktop.png','qa/home-mobile.png','qa/home-tablet.png');
pass('G2','Toliau medžiagų kriterijai,3klausimų gidai,pasiruošimo sąrašas ir konkretus kontaktas; kartojamas CTA tik prasminguose etapuose.','qa/home-desktop.png','FINISH-REVIEW.md');
pass('G3','CTA/privatumo URL200; tuščiosnativeformos reikalavimai,400/403/404ir išsaugojimo200 tikri serverio bandymai.','qa/native-form.json','FORM-VERIFICATION.json','HTML-AUDIT.json');
pass('H1','Visi3gidai individualiai perskaityti ir palyginti su primarysources; nauda įvertinta pagal klausimą, ne žodžių skaičių.','CONTENT-REVIEW.json','research/RESEARCH.md');
pass('H2','Nėra universalios atsparumo garantijos, konstrukcinių mm ar pavojingų chemijos receptų; konkretaus modelio dokumentas virš bendros kategorijos.','CONTENT-REVIEW.json','research/RESEARCH.md');
pass('H3','Medžiagų palyginimo lapas, užklausos pavyzdys/checklist ir priežiūros žurnalas su aiškiu kitu žingsniu.','CONTENT-REVIEW.json','qa/materials-320.png','qa/planning-320.png','qa/care-320.png');
pass('H4','Visas3gidų ilgas body/list/source turinys tikrai renderinamas; final17screens reopen, visi headingfragmentai sutampa.','HTML-AUDIT.json','FINISH-VERDICT.json','qa/responsive-evidence.json');
pass('H5','3gidaieachteminis vaizdas,homepagepapildomi,hubteisingosminiatiūros,20WebP actualsrcset/Articleimage. Trust/legal/contact be dekoratyvios fotonuotraukos – tekstinis darbas.','MEDIA-LEDGER.json','VERSION.json','HTML-AUDIT.json','FINISH-VERDICT.json','CONTENT-REVIEW.json');
pass('I1','Byline MB Pinet redakcija turi /redakcija profilį; nenaudojamas fiktyvus Person.','HTML-AUDIT.json','qa/materials-390.png');
pass('I2','Organization/byline/profile sutampa su operatoriumi. Neklaiminta akmens eksperto patirtis.','HTML-AUDIT.json','CONTENT-REVIEW.json');
pass('I3','Visible/Article publish-review dates yra fiksuoti paketo laukai, nekeičiamiperrequest; plannedeligiblelocaldate nėra deploymentdate.','VERSION.json','HTML-AUDIT.json','core-tests.log');
unverified('I4','Paketo publishAt2026-10-01 yra local projection data; faktinio produkcinio deployment nebuvo.','VERSION.json');
pass('J1','About/editorial paaiškina informacinį pilotą, agento/AIvaidmenį, primarysources,ribasircorrections info@pinet.lt.','CONTENT-REVIEW.json','HTML-AUDIT.json');
pass('J2','Approvalactor codex-source-review ir humanApproval:false; kvalifikuoto žmogaus peržiūra nepriskiriama.','CONTENT-REVIEW.json','VERSION.json');
pass('J3','Poreikio tipas service→faq patikslintas per tikrą model.edit/approve/export; dabartinis revisionhash atitinka import/compile. Sharedtestai atmeta pakeistą approval.','VERSION.json','HTML-AUDIT.json','core-tests.log','studio-tests.log');
pass('K1','11publicURL oneH1/title/description/langlt/canonicalakmenas.lt;HTMLaudit0findings.','HTML-AUDIT.json');
pass('K2','Semantiniai headings/alt/OGatitinka visiblecopy,Articleimageactual;real mobileguidai peržiūrėti.','HTML-AUDIT.json','FINISH-VERDICT.json');
pass('K3','Unknown/future/privateURL404,nohomepagecanonical;hostisolation ir SEOsmoke actual.','seo-smoke.log','core-tests.log');
pass('L1','JSON-LD parses WebSite/WebPage/Organization/Article su stableID; pradinė doubleJSONserialization pataisyta sharedhelper contract naudojimu.','HTML-AUDIT.json');
pass('L2','Breadcrumb{name,path} sutampa su visible/nav ir JSONLD;authorprofiliseligible.','HTML-AUDIT.json');
pass('L3','Nėra Product/Offer/Review/AggregateRating/LocalBusiness; unsupportedService pašalintasfaq.','HTML-AUDIT.json','VERSION.json');
unverified('L4','Nėra crawlable production domain/RichResults/GSCURLInspection įrodymo. LocalJSONparse nėra officialcrawl.','HTML-AUDIT.json');
pass('M1','Contextlinks remiasi tikru targetPageId;HTMLaudit target/fragment checks befindings.','HTML-AUDIT.json');
pass('M2','Authoritativeeligiblepages valdovisi linkedtext/related/hub/schema; future/revoked/hash/crosshostsharednegatives praėjo.','core-tests.log','seo-smoke.log');
pass('M3','Hub ir3atskiri klausimai turi tikslingas related nuorodas; nėra all-to-all autoriteto pažado.','CONTENT-REVIEW.json','HTML-AUDIT.json');
pass('N1','PrimarysourceURLrealiaiatidaryti2026-10-01;sourcepanels nurodo kodėlšaltinisnaudotas,nepartnerystę.','research/RESEARCH.md','HTML-AUDIT.json');
pass('N2','Nėra kitų nuosavų editorialdomainlinks; verslomatikafooterplaintext koltikslo deployment nepatvirtintas. Sharedeligibilitytests.','HTML-AUDIT.json','core-tests.log');
pass('N3','Actualsourcepanel/link renderingpatikrintasvisuoseguides; nėra sponsor/UGC ryšio šiojekopijoje.','qa/materials-320.png','qa/planning-320.png','qa/care-320.png','HTML-AUDIT.json');
unverified('N4','Gyvas domain/footer/externaldestinationlaunch darnepatikrintas;paskirtisiliksplaintextiki deployment.','HTML-AUDIT.json');
pass('O1','Hostawarecanonical/sitemap/robots/slash/query/404 actualtests;nevykstaautomassredirect.','seo-smoke.log','HTML-AUDIT.json');
pass('O2','Tik11eligibleURL ir meaningfullastmod; draftprivate/hash/datefilters sharedtests,robotsneqaccesscontrol.','seo-smoke.log','core-tests.log');
unverified('O3','ProductionDNS/TLS/host/indexing/isolation darnejungta.','VERSION.json');
pass('P1','Tas pats coreprojection kontroliuojahtml/livepages/media/schema/sitemap/LLM. Nichebranch gauna projectedprops.','core-tests.log','seo-smoke.log','HTML-AUDIT.json');
pass('P2','Hash/date/revocation/crosshost/badpathnegativestests,privatepreviewroute gatespraėjo.','core-tests.log','seo-smoke.log');
pass('P3','Tikrastudiomodel edit/approve/export; packageimportvalidatedcompile. Testai changedapprovedreject/preserveunrelatedPASS;handoverhashes nėra išgalvotas sessionstartbaseline.','VERSION.json','core-tests.log','studio-tests.log');
pass('Q1','akmenasLLMscope/contacts/11URLs atitikimas irtenantisolationtikrintaactualSEOsmoke.','seo-smoke.log');
pass('Q2','Visibledefs/qualifiedanswers/primarysources semanticparagraph/list/dl/heading; nėra hiddenAI-onlyteiginių.','HTML-AUDIT.json','CONTENT-REVIEW.json');
pass('Q3','llms yra papildomascoreindex;copyirprivateplanneteigia garantuotoreitingo/srauto.','CONTENT-REVIEW.json','CONTENT-PLAN.json');
pass('R1','RealEntermenuopen/close,skipmainfocus/outline,labels/nativevalidation,landmarks/details irsourcefragments.','ACCESSIBILITY-VERIFICATION.json');
unverified('R2','Kontrastas/touch/utility/narrow patikrinti; tikras200% zoom nėra supported ir neatliktas. AukštasLH nėraWCAGPASS.','ACCESSIBILITY-VERIFICATION.json');
pass('R3','Meaningfulalt/heading/expanded native state/formconstraints patikrinti; timedmotionnėra,reducedmotionCSSactiveoff.','ACCESSIBILITY-VERIFICATION.json','qa/native-form.json');
pass('S1','17final desktop320/390/768/1440screens irDOMoverflow0;768herofix perpeer confirmed.','FINISH-VERDICT.json','qa/responsive-evidence.json');
unverified('S2','Ilgųgidų/contents/byline/sources/breadcrumb/form/footer narrowevidenceyra; enlargedtextmechanism nepatvirtintas.','ACCESSIBILITY-VERIFICATION.json');
pass('S3','IABviewport overrides aiškiai virtualūslab; nephysicalphone/touch.','ACCESSIBILITY-VERIFICATION.json');
set('T1',perf.reports.every(r=>r.categories.performance>=90)?'PASS':'FAIL','Reali isolatedproductionmobilelab:homefixed3serialruns90/92/99,median92;guide91. Versija/date/envsaved;earlierconcurrent81retained.','PERFORMANCE.json','PERFORMANCE-SAMPLES.json','VERSION.json');
pass('T2','Medijos20responsiveWebP;modernwoff2glyphsubsets/fontinlineCSS/preloads. FinalLCP3.05s/3.17s,CLS0,TBT50.5/19.5ms. Dummycontentnebuvo;variation/samplesįvardyta.','PERFORMANCE.json','PERFORMANCE-SAMPLES.json','FONT-OPTIMIZATION.json');
unverified('T3','NėraproductionfieldCWVatraffic;lablokali.','PERFORMANCE.json');
pass('U1','Nativeconstraints/server400/403/404,size/honeypot;D1newrecord storedwithSMTPvoiceoffirpašalintasexactsyntheticID.','FORM-VERIFICATION.json','qa/native-form.json');
pass('U2','NekitęsMBPinetrecipientinfo@pinet.lt:datedsharedTLSAUTHSMTPacceptanceproof2026-09-30; akmenasindependentlocalD1test,neproductiondelivery.','SHARED-MAIL-EVIDENCE.json','FORM-VERIFICATION.json');
pass('U3','BendrasformtestIdd2fe...sutampaD1/SMTP/INBOXreceivedproof2026-09-30; authaloneanksčiau4d94...nepainiotas. Naujakmenasproductionmailnetestuotas.','SHARED-MAIL-EVIDENCE.json');
unverified('U4','ProductionD1bindings,delivery/reconciliation/spamlimits darnepatikrinti. LocalSMTPoff.','FORM-VERIFICATION.json');
pass('V1','Per-sitecountervalid204increment,bot/DNT/GPCnostorage,invalid400/origin403/future404/size413;syntheticcount restored irclicksneqleads.','INTEREST-VERIFICATION.json');
pass('V2','Fields site_id/day/page_path/event/count; no visitorID/cookies/IPstoredbycounter. Privacynotice pagalactualenabledinventory.','INTEREST-VERIFICATION.json','CONTENT-REVIEW.json');
unverified('V3','GSC/realsessions/qualifiedleadsatskirainėra išmatuota;voiceoff,60–90ddecisiontikpoactualindexing.','CONTENT-PLAN.json');
pass('W1','Textprivacy/termsmatchlocalinformationpilot/syntheticD1;officialGDPR/VDAIprimaryreview,ribosneatitiktiesgarantija.','CONTENT-REVIEW.json','research/RESEARCH.md');
pass('W2','Contact/purpose/rights irnepatvirtintųretention/basis/processors/transfers ribosaiškios;neinventpolicy/identity. PubliclaunchblockedW3.','CONTENT-REVIEW.json','HTML-AUDIT.json');
unverified('W3','Tikraslegalbasis/recipientprocessors/transfer/retention/delete-recovery sprendimas darnepatvirtintas; localnotice turi būtikeičiamaperapprovedrevision priešlaunch.','CONTENT-REVIEW.json');
pass('W4','Nėraads/GA/pixel/nonessentialcookies; inquiryconsentnėramarketing, nativecheckboxpatikrintas.','INTEREST-VERIFICATION.json','qa/native-form.json');
pass('X1','Isolatedcopyexcludesenv/credentialTXT;publicpackageapprovedonly,originalsprivate,syntheticleadremoved;tenant/payloadnegativepass.','VERSION.json','SECURITY-VERIFICATION.json','FORM-VERIFICATION.json','seo-smoke.log');
pass('X2','Origin/payload/honeypot/hostfailureexercised;voiceandmailoffdoesnotpreventD1. Rate/binding/restoreproductiongaps explicitlyopen.','SECURITY-VERIFICATION.json','FORM-VERIFICATION.json','INTEREST-VERIFICATION.json');
unverified('X3','Productionaccess/abuse/backups/restore/incidentgatesunproven;localtestnėrabackuprestore.','SECURITY-VERIFICATION.json');
pass('Y1','NaudojamistiepatyscoreSEO/media/contact/D1/linkhelpers;onlynicherenderer/dispatch/package/fonts. Schemanekeista.','VERSION.json','core-tests.log','studio-tests.log');
pass('Y2','Actual19core/15studioandSEO4currentsnapshotnichesPASS. OwnedisolatedTSC/ESLintPASS;newconcurrentauksarankiamsglobalTSCerror separatelydisclosed.','core-tests.log','studio-tests.log','seo-smoke.log','typecheck-isolated.log','eslint.log','typecheck.log');
pass('Y3','JournalnowlinksSTART/CORE/builder/planner/auditforfreshsession;sharedskillcurrentfingerprintslabelhandoveronly.','VERSION.json','HANDOVER.md');
pass('Z1','All85owncriteria/JSON/scorer,baselinefixlog17screenshash/version/cost/remaininggates savedperniche;FIRST-RUN capturesbeforefirstfinal.','PHASE-1-AUDIT.json','PHASE-1-SCORE.json','HANDOVER.md','VERSION.json');
pass('Z2','Aritmetinislocal9.72ne10;R2/S2blockersvisible,launch/operationsunverified;craftscoreseparateandfix-onlyverdict.','PHASE-1-SCORE.json','FINISH-VERDICT.json','HANDOVER.md');
unverified('Z3','Domain-ready nepretenduojama. Productiongatesirpaklausadarneįrodyta.','HANDOVER.md');
const catalog=catalogFromMarkdown(await readFile(path.join(root,'SKILLS/niche-site-audit/references/checklist.md'),'utf8'));
assert.equal(Object.keys(decisions).length,catalog.length);
const audit=await json('PHASE-1-AUDIT.json');
audit.evaluatedAt=at;audit.evaluator='Codex agent; own site-specific source/DOM/server review, separate fresh Impeccable reviewer.';
audit.environment={localPreview:'http://127.0.0.1:8886/',productionBuild:'output/akmenas-production',smtpEnabled:false,voiceEnabled:false,physicalDevice:false,canonical:'https://akmenas.lt',deployed:false};
audit.version={packageSha256:version.packageSha256,sourceFingerprints:version.sourceFingerprints};
audit.verdict={local:'70/72 PASS; R2/S2 UNVERIFIED, gates not ready',launch:'NOT DEPLOYED / UNVERIFIED',demand:'UNMEASURED',visual:'Initial subjective13/14(9.29); fixes-only final verdict ship, no rescore'};
audit.checks=catalog.map(c=>({...c,...decisions[c.id]}));
const readableNotes={
 A1:'The visible pilot offers information and a need description; an inquiry is not an order or measured demand.',
 A2:'Three real guides and the local D1 form are available. No stock, prices, suppliers or fabrication promise is offered.',
 A3:'No production qualified-inquiry, value or capacity data yet supports an expansion decision.',
 B1:'MB Pinet and info@pinet.lt agree across the approved package, visible contact, Organization and shared recipient proof.',
 B2:'All11 texts were reviewed; no borrowed phone/address/code, fictional expert, customer project, certification or review appears.',
 B3:'Only operator name and default email are confirmed. Legal identifiers/address and domain control remain unproved.',
 C1:'Bounded CDX found283 HTML URLs and four snapshots were read. An incomplete year query is explicitly recorded.',
 C2:'Root has current narrow informational content. Legacy catalog/JSP/Joomla routes are deferred or404, without mass homepage redirects.',
 C3:'No legacy redirect is implemented, so production redirect acceptance is not applicable to this version.',
 D1:'LT/PL/UK/IT comparisons include actual desktop/mobile captures. DE is only a candidate; Laminam lazy/cookie limitations are recorded.',
 D2:'Original agent copy uses current primary NSI/Cosentino/Laminam sources; original illustrations have origin/rights records.',
 D3:'Audience, intents and seasonal dates are labelled hypotheses; search volume, conversion and ranking are not invented.',
 E1:'The stone atlas identity spans the full homepage and guides. Initial subjective craft13/14 is separate from the fixes-only verdict.',
 E2:'DESIGN and the sidecar specify actual CSS tokens, components, responsive composition and known compromises.',
 E3:'AI illustrations are not presented as customer work. Provenance is in the media ledger/editorial method, without a generator badge.',
 F1:'All11 eligible pages are reachable through navigation, hub, related routes or footer; no initial guide is orphaned.',
 F2:'Actual eligible navigation/action targets render. Native mobile menu opens and closes with Enter.',
 F3:'Each URL has a separate reader question. No city/synonym doorway pages were created.',
 G1:'The first screen identifies kitchen stone, selection guidance and actual comparison/inquiry actions.',
 G2:'The full homepage develops material criteria, three guide questions, a preparation list and contact rather than repeating promotions.',
 G3:'Action/privacy URLs resolve; empty native validation and real400/403/404/200 server outcomes were exercised.',
 H1:'All three guides were individually read against primary sources and evaluated for usefulness, not word count.',
 H2:'Product-specific documents take precedence. No universal resistance warranty, structural dimensions or hazardous chemical recipes appear.',
 H3:'The guides include a comparison worksheet, an inquiry checklist/example and a care log with a useful next step.',
 H4:'All three long bodies, lists, sources and real heading fragments render;17 final captures were reopened.',
 H5:'Every guide has an inspected relevant image. Homepage/hub coverage,20 actual WebP variants, srcset and Article images were checked; text-focused trust/legal/contact exceptions are documented.',
 I1:'The visible byline names MB Pinet editorial Organization and links to its public profile.',
 I2:'Organization, byline and profile agree; no fictional specialist or claimed stone expertise.',
 I3:'Fixed package publication/review dates agree with visible and structured dates, rather than refreshing per request.',
 I4:'Local publishAt is not deployment evidence. No actual production publication date exists yet.',
 J1:'About/editorial pages explain the pilot, AI/agent role, sources, limits and corrections contact.',
 J2:'Approval actor is codex-source-review; humanApproval:false. No human or qualified-expert approval is asserted.',
 J3:'The service→faq correction used real studio edit/approve/export. Current hash/import/compile match; tests reject modified approved content.',
 K1:'Actual11-page HTML audit verifies one H1, title, description, Lithuanian language and canonical; zero findings.',
 K2:'Heading/alt/OG/Article imagery match content; real mobile long-guide rendering was inspected.',
 K3:'Unknown/future/private paths and unknown hosts pass actual404/isolation tests without homepage canonicalization.',
 L1:'JSON-LD parses truthful WebSite/WebPage/Organization/Article entities; the initial double serialization was repaired.',
 L2:'Visible and structured breadcrumbs agree with the shared name/path contract and eligible author profile.',
 L3:'No Product/Offer/Review/AggregateRating/LocalBusiness exists. Unsupported Service was removed through approved content type correction.',
 L4:'No official crawlable-domain rich-result or URL Inspection evidence exists. Local parsing is labelled local.',
 M1:'Context links use actual page IDs and valid fragment targets; HTML audit has no findings.',
 M2:'Shared eligible-page projection controls text/related/index/schema; hash/date/revocation/cross-host negatives pass.',
 M3:'A hub and three distinct guide questions support selective related routes; no all-to-all authority promise.',
 N1:'Primary source destinations were actually read2026-10-01; panels explain their role without claiming partnership.',
 N2:'No owned-domain editorial links are published. The required verslomatika attribution stays plain text pending eligible live target proof.',
 N3:'Actual source/related panels render in all guides. No sponsored or UGC relationship applies to this copy.',
 N4:'External/attribution destinations have not been checked on a live akmenas deployment.',
 O1:'Actual host-aware canonical/sitemap/robots/slash/query/404 behavior passes; no mass redirects.',
 O2:'Sitemap contains11 eligible URLs with meaningful lastmod. Private/date/hash filters are tested beyond robots.',
 O3:'Production DNS/TLS/host/indexing and domain isolation are not yet proved.',
 P1:'The shared authoritative projection supplies HTML/links/media/schema/sitemap/LLM; the niche branch receives projected props.',
 P2:'Hash/date/revocation/cross-host and private-preview negative tests pass.',
 P3:'Real studio edit/approve/export and validated import/compile used. Changed-approval rejection and preservation tests pass; handover hashes are not claimed as start baseline.',
 Q1:'Actual SEO smoke checks akmenas LLM scope, contacts, eligible URLs and tenant isolation.',
 Q2:'Definitions, qualified answers and primary sources are visible semantic HTML, without hidden model-only claims.',
 Q3:'llms remains supplementary. Copy and plan do not guarantee ranking, traffic or AI visibility.',
 R1:'Actual Enter menu, main skip focus/outline, native labels/validation, landmarks/details and valid fragments are exercised.',
 R2:'Contrast, target dimensions, utility type and narrow reading are recorded. Actual200% enlargement is unsupported and unverified.',
 R3:'Meaningful alt/headings/native disclosure/form constraints were checked. No timed animation; CSS removes active button movement under reduced motion.',
 S1:'17 final desktop/narrow/tablet captures and DOM checks show no observed overflow; the768 opening repair is confirmed.',
 S2:'Narrow full-guide/contents/byline/sources/breadcrumb/form/footer evidence exists; actual enlarged text remains unverified.',
 S3:'IAB viewport simulations are explicitly distinguished from physical phone/touch tests.',
 T1:'Real-media isolated production mobile lab: home fixed three serial runs90/92/99, median92; guide91. Earlier concurrent81 is retained.',
 T2:'Shared responsive WebP, modern font subsets, inline font CSS and preloads reduce payload. Final LCP3.05/3.17s, CLS0, TBT50.5/19.5ms; variance is recorded.',
 T3:'No production field CWV or traffic evidence exists; local lab is not field performance.',
 U1:'Native/server/origin/body/host/honeypot checks pass. A durable D1 record survives disabled SMTP/voice and the exact synthetic record was removed.',
 U2:'Unchanged shared recipient/transport has dated2026-09-30 TLS/AUTH/SMTP proof. Akmenas local D1 is independently tested; production delivery is not.',
 U3:'Shared form test d2fe… matches stored record, SMTP and INBOX received proof. The earlier separate SMTP-only test is not treated as receipt.',
 U4:'Production D1/bindings, delivery/reconciliation/recovery and spam limits remain unverified.',
 V1:'Per-site increment, bot/DNT/GPC non-storage and origin/path/body/event boundaries pass; test counter restored. Clicks are separate from leads.',
 V2:'Counter stores site/day/path/event/count without visitor identifiers or cookies; local notice matches enabled inventory.',
 V3:'GSC/real sessions/qualified value are unmeasured; voice is off. Decision window starts after real indexing.',
 W1:'Notice/terms match a local information and synthetic-inquiry pilot, with official GDPR/VDAI source review and explicit limits.',
 W2:'Contact, purposes and rights are described truthfully. Retention/basis/processors/transfers are explicitly unconfirmed, blocking production.',
 W3:'Production legal basis, recipient/processors/transfers/retention/delete-recovery decisions are not established. Local notice must be replaced through approval before launch.',
 W4:'No ads/GA/pixels/nonessential cookies are enabled; native inquiry consent is not marketing consent.',
 X1:'Own package/render/LLM/private paths and secret exclusions checked. Originals private and exact synthetic lead removed; tenant/payload negatives pass.',
 X2:'Origin/body/honeypot/host failure checks and D1 independence are exercised. Production rate/binding/restore gaps remain explicit.',
 X3:'Production access, abuse controls, backups/restore and incident procedures remain unproved.',
 Y1:'Shared SEO/media/contact/D1/link helpers are reused. Only own renderer/dispatch/package/fonts added; schema unchanged.',
 Y2:'Actual19 core/15 studio and four installed-niche SEO checks pass. Own isolated TypeScript/ESLint pass; concurrent other-niche global TypeScript errors are disclosed.',
 Y3:'Journal/handover link current START/core/builder/planner/audit workflow; instruction hashes are labelled handover-only.',
 Z1:'All85 site-specific statuses/evidence, scorer, fixes, captures, version and remaining blockers are retained; FIRST-RUN precedes the first final response.',
 Z2:'Local9.72 is not10; R2/S2 blockers are visible. Launch/demand and subjective craft remain separate.',
 Z3:'Domain-ready is not claimed. Production and demand gates remain unproved.'
};
for(const check of audit.checks){assert.ok(readableNotes[check.id]);check.notes=readableNotes[check.id].replace(/([A-Za-z])([0-9])/g,'$1 $2').replace(/([0-9])([A-Za-z])/g,'$1 $2');}
const score=scoreAudit(audit,catalog);assert.deepEqual(score.stages.local.blockers,['R2','S2']);
await writeFile(path.join(dir,'PHASE-1-AUDIT.json'),JSON.stringify(audit,null,2));
await writeFile(path.join(dir,'PHASE-1-SCORE.json'),JSON.stringify(score,null,2));
// Referenced evidence must actually exist, including these generated audit/score files.
for(const c of audit.checks)for(const e of c.evidence)await stat(path.join(root,e));
const stages=Object.entries(score.stages).map(([k,v])=>`| ${k} | ${v.passed}/${v.applicable} | ${v.score??'—'} | ${v.gateReady?'PASS':'NOT READY'} | ${v.blockers.join(', ')||'—'} |`).join('\n');
const cats=Object.entries(score.categories).map(([k,v])=>`| ${k} | ${v.passed}/${v.applicable} | ${v.score??'—'} | ${v.blockers.join(', ')||'—'} |`).join('\n');
await writeFile(path.join(dir,'PHASE-1-AUDIT.md'),`# akmenas.lt · Phase1 A–Z auditas\n\n${at}. Official85criterioncatalog ir initializer, nėra kitos nišos PASS kopijavimo. Paketas ${version.packageSha256}. Productionbuildvietinėkopija8886,canonicalhost transportasakmenas.lt;SMTP/voiceoff. Tikrasdomainnepaleistas.\n\n## Etapų rezultatas\n\n| Etapas | PASS / taikomi | Balas /10 | Vartai | Blokuoja |\n|---|---:|---:|---|---|\n${stages}\n\n**Vietinis70/72=9,72/10; local-ready nėra.** R2/S2 actual200%enlargementUNVERIFIED. Launch0/10iroperations0/2nėraįrodytas gedimas: darneatlikti. C3NA–neįgyvendinta legacyredirect. Subjektyvi craft peržiūra13/14=9,29atskirai;finalpeer patvirtinotikdufixes,scoresnerescored.\n\n## Faktai, ribos ir pataisos\n\n11patvirtintųpuslapių,3gidai,4originaliai peržiūrėtos iliustracijos/20WebP. MBPinet/info@pinet.lt,numatytafooteržyma plaintext. Nepatvirtintos kainos/tiekėjai/pajėgumas/juridiniai rekvizitai nekuriami. VisiblepublishAt yra localpublicationprojectiondata,neproductiondeployment.\n\nPradinės klaidos: JSONLDdoubleJSONserialization,breadcrumburl/pathassumption,TypeScriptprops,unsupportedService type,skipfocus,tablet768kompozicija irperdideliprastoformato šriftai. Visi išvardyti localfixes patikrinti actualHTML/peer/tests. PradinėsLHhome88/guide90irintermediate95/86;po finalfontpreloads91guide,home81concurrentcapturemetu;išankstonustatyta3serialhomeserija90/92/99median92. Žemesni matavimai išsaugoti, geriausias99nepasirinktasgalutiniamclaim. LCP3.05/3.17s,CLS0;labnėrafieldCWV.\n\nNativeform/D1validations ircountertenant/privacynegativesPASS;sintetiniaiįrašai pašalinti/restored. U2/U3naudoja aiškiaipažymėtą nepakitusio bendrotransporto2026-09-30SMTP→matchingINBOX įrodymą,naujokmenasproductiondeliveryneįrodyta. SharedcurrentTSCnurodo2klaidas kitossesijosauksarankiamsrenderer;ownisolatedfinalsourceTSC/ESLintpass,sharedcore19/15studio/4SEOpass.\n\nTikras200%didinimas neprieinamas per supportedbackend,nekeisti globalūs nustatymai;nepraeitasR2/S2. Originalconceptseedfullhandnepersisted:dabartiniskatalogoreplay corroboratesindex5, historicalfullhandUNVERIFIED. Directuserbuild nėraformalparentbenchmark;session-startinstructionfingerprintneužfiksuotas,currenthasheshandoveronly. FIRST-RUNtaiatskleidžia.\n\nProdukciniai vartai: domaincontrol/DNS/TLS/hosting,operatoridentity/legalrekvizitai,deploydate,crawltools,liveD1/SMTPINBOX/recovery/rate/backupsirprivacyretention/basis/processors/transfers. Localformnotice aiškiai synthetic;priešproductionjįirprivacypakeistitikapprovedrevision. Paklausa/GSC/qualifiedvalueunmeasured;neplėsticommerce/voicepagalQAclicks.\n\n## Kategorijų balai (apima jų etapus)\n\n| Grupė | PASS / taikomi | Balas /10 | Atviri vartai |\n|---|---:|---:|---|\n${cats}\n\n## Visų kriterijų sprendimai\n\n${audit.checks.map(c=>`### ${c.id} · ${c.status} · ${c.stage}${c.gate?' gate':''}\n\n${c.criterion}\n\n${c.notes}\n\nĮrodymai: ${c.evidence.map(e=>`[${path.basename(e)}](../../${e})`).join(', ')}.\n`).join('\n')}\n\nScorer: \`node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/akmenas/PHASE-1-AUDIT.json\`; rezultatasPHASE-1-SCORE.json. Likusios ribos HANDOVER ir ACCESSIBILITY-VERIFICATION.\n`);
console.log(JSON.stringify(score.stages,null,2));
await writeFile(path.join(dir,'PHASE-1-AUDIT.md'),`# akmenas.lt · Phase 1 A–Z auditas\n\n${at}. Inicializuotas visas oficialus 85 kriterijų katalogas; kiekvienas sprendimas pagrįstas šios nišos įrodymais. Paketas: ${version.packageSha256}.\n\nIzoliuota vietinė production peržiūra: http://127.0.0.1:8886/. Canonical host transportas: akmenas.lt. SMTP ir balsas išjungti, tikras domenas nepaleistas.\n\n## Etapai\n\n| Etapas | PASS / taikomi | Balas /10 | Vartai | Blokuoja |\n|---|---:|---:|---|---|\n${stages}\n\n**Vietinis balas 70/72 = 9,72/10; local-ready nėra.** R2/S2 tikras 200 % didinimas UNVERIFIED. C3 NA, nes legacy redirect neįgyvendinta. Launch ir operations dar neatlikti; nežinoma būsena nėra įrodytas gedimas. Pradinis subjektyvus craft 13/14 = 9,29 yra atskiras, final fixes-only verdict jo neperskaičiavo.\n\n[Perdavimas ir vartai](HANDOVER.md), [versija](VERSION.json), [pataisų žurnalas](BASELINE-AND-FIXES.json), [prieinamumo ribos](ACCESSIBILITY-VERIFICATION.md), [lab matavimai](PERFORMANCE.json), [paklausos planas](CONTENT-PLAN.json).\n\n## Kategorijos (apima skirtingus etapus)\n\n| Grupė | PASS / taikomi | Balas /10 | Atviri vartai |\n|---|---:|---:|---|\n${cats}\n\n## Visi 85 sprendimai\n\n${audit.checks.map(c=>`### ${c.id} · ${c.status} · ${c.stage}${c.gate?' gate':''}\n\n${c.criterion}\n\n${c.notes}\n\nĮrodymai: ${c.evidence.map(e=>`[${path.basename(e)}](../../${e})`).join(', ')}.\n`).join('\n')}\n\nScorer: \`node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/akmenas/PHASE-1-AUDIT.json\`. Rezultatas: PHASE-1-SCORE.json. Skaičius neatšaukia atvirų vartų ir nėra reitingų, paklausos ar WCAG pažadas.\n`);
await writeFile(path.join(dir,'ACCESSIBILITY-VERIFICATION.md'),`# akmenas.lt prieinamumo įrodymai\n\n${at}. Paketas ${version.packageSha256}; source hash – JSON. Izoliuotas local production build 8886, Codex IAB. Tikrinti 320/390/768/1440 CSS px, ne fiziniai įrenginiai.\n\n## Patikrintas elgesys\n\nEnter atidaro ir uždaro Meniu. Skip link fokusuoja main#turinys, mainTop 0, 3 px accent outline. Native tuščia forma fokusuoja vardą, rodo required constraints, susietus labels ir privatumo kelią. Gido native details bei egzistuojantys fragmentai patikrinti. Visų trijų gidų visas tekstas, šaltiniai, byline, breadcrumb, formos ir footer apžiūrėti siauruose ekranuose; 17 galutinių capture atskirai patvirtinti FINISH-VERDICT.\n\nBody 17 px, actions 16 px, source 14 px, byline/breadcrumb 13 px mobile. Menu/actions/contents/footer valdikliai bent 44 px. Brand 32 px, checkbox 21 px dideliame clickable label ir inline tekstinės nuorodos yra įvardytos išimtys; bendras target-size conformance neteigiamas. Nėra timed animacijų; reduced-motion CSS pašalina active button 1 px poslinkį. Browser preference emuliacija nevykdyta.\n\n## Kontrastas\n\nNormatyviniai CSS tokenai sutampa su tikru DOM background rgb(245,241,233). Kai kurie screenshot pikseliai šiltesni, priežastis nežinoma.\n\n${contrastRows.map(r=>`- ${r.usage}: ${r.fg} / ${r.bg} = ${r.ratio}:1.`).join('\n')}\n\n## Neužbaigtas didinimas\n\n**R2/S2 UNVERIFIED.** Šis backend neturi supported tikro browser zoom mechanizmo. Pradinis/galutinis procentas nenustatytas. 320 px viewport ir Lighthouse nėra 200 % enlargement įrodymas. Globalūs font/zoom nustatymai nekeisti; temporary viewport atkurtas. Dirbtinis text-size valdiklis vien PASS tikslui nepridėtas.\n\nScreen reader, fiziniai įrenginiai ir touch netestuoti; WCAG sertifikacija neteigiama. JSON išsaugo actual keyboard/native form/runtime/screenshot kelius, versiją, kontrastą ir ribas.\n`);
