import {readFileSync,writeFileSync} from 'node:fs';
import {seeds,primaryPhrase,normalize} from './keyword-seeds.mjs';
import {overrides} from './keyword-review.mjs';
const dir=new URL('./',import.meta.url);
const clean=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const manual={
 'AN-gidas':['antakių priežiūra','Antakių priežiūra: korekcija, dažymas ir laminavimas','Antakių forma, spalva ir plaukelių kryptis sprendžiamos skirtingomis paslaugomis. Palyginkite korekcijos, dažymo ir laminavimo paskirtį bei eigą.'],
 'MK-nuvalymas':['profesionalaus makiažo nuvalymas','Profesionalaus makiažo ir laikinų blakstienų nuvalymas','Kaip skiriasi profesionalaus makiažo ir laikinų blakstienų nuvalymas? Aptariame naudotų produktų instrukcijas ir skirtumą nuo blakstienų priauginimo.'],
 'B-meistrui-meniu':['paslaugų meniu sudarymas','Paslaugų meniu meistrui: aiški apimtis ir variantai','Kaip aiškiai aprašyti grožio paslaugų meniu? Atskirti pagrindinius darbus, papildomus komponentus ir variantus, kuriuos klientas turi pasirinkti.'],
 'B-meistrui-grafikas':['meistro darbo grafikas','Meistro darbo grafikas: vizito trukmė ir laiko rezervas','Planuokite darbo grafiką pagal tikrą vizito trukmę. Atskirti paslaugos darbų laiką, papildomus komponentus ir būtiną laiko rezervą.'],
 'B-meistrui-galerija':['meistro darbų galerija','Meistro darbų galerija: atranka, kontekstas ir teisės','Kaip pateikti darbų galeriją, kuri padeda įvertinti paslaugą? Aptariame nuotraukų kontekstą, retušą ir darbo bei kliento atvaizdo teises.'],
 'B-meistrui-matavimas':['grožio paslaugų užklausų matavimas','Grožio paslaugų užklausų matavimas meistrui','Atskirkite profilio peržiūrą, nuorodos paspaudimą ir tikrą kliento užklausą. Įvertinkite paslaugų paklausą pagal aiškiai apibrėžtus rezultatus.'],
 'MN-japoniskas':['japoniškas manikiūras','Japoniškas manikiūras: paskirtis ir skirtumai','Sužinokite, kuo japoniškas manikiūras skiriasi nuo lakavimo, kas įeina į paslaugą ir kodėl svarbi konkrečios sistemos priežiūra.'],
 'MN-ar-gelinis':['manikiūras ir gelinis lakavimas','Manikiūras ir gelinis lakavimas: kuo skiriasi?','Manikiūras ir gelinis lakavimas sprendžia skirtingas užduotis. Palyginkite nagų priežiūrą, dangą, nuėmimą ir vieno vizito darbų apimtį.'],
 'GL-kaina-trukme':['gelinis lakavimas kaina','Gelinio lakavimo kaina: nuėmimas, bazė ir dizainas','Kas keičia gelinio lakavimo kainą ir vizito trukmę? Palyginkite nuėmimo, bazės, išlyginimo ir dizaino darbų apimtį.'],
 'AN-laminavimas':['antakių laminavimas','Antakių laminavimas: eiga, rezultatas ir paslaugos apimtis','Kaip antakių laminavimas keičia plaukelių kryptį? Sužinokite, kuo skiriasi laminavimas, dažymas ir korekcija bei kas įeina į pasiūlymą.'],
 'DZ-sruogos':['plauku dazymas sruogelemis','Plaukų dažymas sruogelėmis: dalinis, visas ir prie veido','Palyginkite dalinį ir visų plaukų dažymą sruogelėmis, šviesinimo bei tonavimo darbus ir vienodomis sąlygomis įvertinkite pasiūlymą.'],
 'DZ-zili':['žilų plaukų dažymas','Žilų plaukų dažymas: padengimas ir spalvos perėjimas','Kaip skiriasi žilų plaukų padengimas, išsklaidymas ir perėjimas į natūralią spalvą? Palyginkite tikslą, ataugimo kontrastą ir priežiūrą.'],
 'LZ-elektroepiliacija':['elektroepiliacija','Elektroepiliacija ir lazeris: metodų skirtumai','Sužinokite, kuo elektroepiliacija skiriasi nuo plaukų šalinimo lazeriu: veikimo principas, vizito apimtis ir individualaus vertinimo poreikis.'],
 'PM-gidas':['permanentinis makiažas','Permanentinis makiažas: paskirtis, zonos ir ribos','Kas yra permanentinis makiažas? Aptariame pigmentavimo zonas, skirtumą nuo laikino dažymo, korekcijos poreikį ir rezultato bei saugos ribas.'],
 'PM-antakiai':['antakiu permanentinis makiazas plaukeliais','Permanentinis antakių makiažas: forma ir metodų pasirinkimas','Kaip pasirinkti permanentinio antakių makiažo užduotį? Palyginkite formą, jau esantį pigmentą ir metodų pavadinimus su tikra paslaugos eiga.'],
 'KR-gidas':['kirpimas pagal veido forma','Kaip pasirinkti kirpimą: tekstūra, veido forma ir priežiūra','Rinkdamiesi kirpimą palyginkite plaukų tekstūrą, norimą kontūrą ir kasdienį formavimą. Sužinokite, kaip apibrėžti konsultacijos ir kirpimo užduotį.']
};
const brand=/spa vilnius(?!e)|makalius|my ?pilates|mypilates|sette|angis tattoo|vean|zoohotel|woof|stilinga leten|boho|jogos akademija|sunbysil|lusca|prusu usai|senukai|sizeer|akropolis|sypsenos akademija|babor|lsmu/;
const cities=JSON.parse(readFileSync(new URL('CITIES_SNAPSHOT.json',dir),'utf8')).cities;
const cityForms=cities.map(c=>({id:c.id,pattern:new RegExp('\\b'+normalize(c.label).replace(/(?:iai|ys|is|as|us|ai|a|e)$/,'')+'(?:as|is|us|ys|ai|iai|a|e|o|io|u|iu|os|es|oje|eje|uje|yje|uose|iuose|ams|iems)?\\b')}));
const rootPhrases={manikiuras:'kas yra manikiūras','gelinis-lakavimas':'kas yra gelinis lakavimas','nagu-dizainas':'kaip pasirinkti nagų dizainą',pedikiuras:'kas įeina į pedikiūrą',kirpimas:'kirpimas pagal veido formą','plauku-dazymas':'plaukų dažymo būdai',antakiai:'antakių priežiūra',blakstienos:'blakstienų paslaugų skirtumai',masazas:'kaip pasirinkti masažą','veido-prieziura':'veido procedūrų pasirinkimas','nagu-priauginimas':'kas yra nagų priauginimas','plauku-formavimas':'plaukų formavimo paslaugų skirtumai','plauku-prieziura':'plaukų priežiūros procedūrų pasirinkimas',depiliacija:'depiliacijos metodų pasirinkimas','plauku-salinimas-lazeriu':'kaip veikia plaukų šalinimas lazeriu',makiazas:'makiažo paslaugų pasirinkimas','kuno-prieziura':'kūno procedūrų pasirinkimas','auskaru-verimas':'ką žinoti prieš auskarų vėrimą','barzda-vyrams':'vyrų grožio paslaugų pasirinkimas',spa:'spa paslaugų skirtumai','ilgalaikis-makiazas':'kas yra permanentinis makiažas',tatuiruotes:'kaip pasirinkti tatuiruotę',estetika:'estetinių procedūrų pasirinkimas','plauku-priauginimas':'plaukų priauginimo metodai','rankos-pedos-spa':'rankų ir pėdų spa paslaugų skirtumai',idegis:'purškiamas įdegis ir soliariumas','fizinis-aktyvumas':'treniruočių formatų palyginimas',kineziterapija:'kineziterapijos paslaugų skirtumai','psichologine-pagalba':'psichologinės pagalbos formatų skirtumai',savijauta:'meditacija ir atsipalaidavimo seansai',odontologija:'odontologijos paslaugų skirtumai',medicina:'dermatologo ir medicinos estetikos konsultacija',gyvunai:'gyvūnų kailio priežiūros paslaugos'};
const snippets={
 'B-registracija':'Paslauga, sena danga ar ankstesnis darbas, laikas ir vieta: ką perduoti registruojantis grožio vizitui ir ką turi apimti tikras patvirtinimas.',
 'MN-pasiruosimas':'Kokią informaciją perduoti prieš manikiūrą ar gelinį lakavimą? Aptariame seną dangą, nežinomą sistemą, norimą ilgį ir ankstesnio darbo istoriją.',
 'MS-nugara-ar-kunas':'Kaip skiriasi nugaros, kaklo, pečių ir viso kūno masažo apimtis? Palyginkite įtrauktas zonas, darbo laiką ir viso vizito trukmę.',
 'BR-kirpimas-modeliavimas':'Kaip sutarti barzdos ilgį, kontūrą ir ūsų apimtį? Palyginame kirpimą bei modeliavimą ir parodome, kaip aprašyti norimą formą.',
 'PD-kosmetinis-ar-sveikatos':'Kosmetinė pėdų ir nagų priežiūra turi ribas. Sužinokite, kaip atskirti pedikiūro užduotį nuo sveikatos vertinimo ir aptarti vizito atidėjimą.',
 'VP-konsultacija':'Pirmoji veido priežiūros konsultacija: tikslas, odos pastebėjimai, naudojami produktai ir ankstesnės reakcijos. Ką turi paaiškinti siūlomas planas?',
 'ES-mezoterapija-biorevitalizacija':'Mezoterapija ir biorevitalizacija: kodėl reikia žinoti konkretų metodą, priemonę ir paskirtį? Aptariame konsultacijos klausimus bei įrodymų ribas.',
 'ES-gidas':'Kaip vertinti estetinės procedūros pasiūlymą? Atskirkite tikslą, poveikio būdą, priemonės paskirtį ir specialisto kompetenciją.',
 'SP-gidas':'SPA ritualas, pirtis ar privati erdvė? Palyginkite paketo komponentus, laiką, privatumo sąlygas ir atskiras naudojamų produktų instrukcijas.',
 'SP-hamamas':'Hamamas, garinė ir kiti pirties formatai: ką apima apsilankymas, erdvė ir ritualo darbai? Aptariame tikrą pasiūlymo sudėtį.',
 'RP-gidas':'Rankų ir pėdų SPA apimtis: odos priežiūra, parafinas ir atskiri nagų darbai. Kaip palyginti paketą ir jo produktų instrukcijas?',
 'SV-gidas':'Meditacija, kvėpavimo ar garso seansas: kuo skiriasi formatas ir sąlygos? Atskirai aptariame patirtį, gydymo pažadų įrodymus ir pagalbos ribas.'
};
const stopped=new Set(['ir','ar','kas','kaip','kuo','nuo','tai','bei','su','be','po','pries','gidas','paslaugos','paslauga','ko','kokio','kada']);
const tokens=s=>normalize(s).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!stopped.has(x)).map(x=>x.slice(0,5));
export function enrichSeo(p){
 const input=JSON.parse(readFileSync(new URL('SEO_RESEARCH_INPUT.json',dir),'utf8'));
 const {measured,related}=input;
 const all=[...measured,...related],exact=k=>all.find(v=>v.keyword===k&&v.searchVolume!==null)??all.find(v=>normalize(v.keyword)===normalize(k)&&v.searchVolume!==null)??all.find(v=>v.keyword===k);
 for(const page of p.pages){
  page.family??=seeds[page.categoryId]?p.pages.find(x=>x.categoryId===page.categoryId&&x.family)?.family??'Bendra':'Bendra';
  const preset=manual[page.id],primary=(page.id.endsWith('-gidas')?rootPhrases[page.categoryId]:null)??preset?.[0]??clean(primaryPhrase(page));
  // Keep an editorial answer intent even when its seed has mixed commercial demand.
  const row=exact(primary),relatedRows=related.filter(r=>r.seed===seeds[page.categoryId]&&r.keyword!==primary&&!brand.test(normalize(r.keyword))&&!cityForms.some(c=>c.pattern.test(normalize(r.keyword)))).slice(0,6);
  const relatedKeywords=[...new Set(relatedRows.map(x=>x.keyword))];
  let title=preset?.[1]??page.title.replace(/ gidas:/i,':').replace(/ gidas$/i,'');
  if(!preset&&title.length>75&&title.includes(':'))title=title.split(':')[0];
  const headings=page.outline.slice(0,3).map(h=>h.toLowerCase());
  let description=snippets[page.id]??preset?.[2]??`${title.replace(/[?!.]$/,'')}. Aptariamos temos: ${headings.slice(0,2).join('; ')}.`;
  page.seo={status:'DATA_INFORMED_EDITORIAL_METADATA_PLAN_NOT_RENDERED_ARTICLE',primaryKeyword:primary,relatedKeywords,relatedKeywordOrigin:'Actual vendor related rows from category seed; discovery candidates, not all page targets',relatedEvidence:relatedRows.map(x=>({keyword:x.keyword,source:x.source,callId:x.callId,updatedAt:x.updatedAt})),editorialConcepts:[...new Set([...(page.procedureSections?.map(x=>x.label)??[]),...page.outline.slice(0,2)])],metaTitle:title,metaDescription:description,h1:page.title,h2:[...page.outline],metadataAcceptance:'PLANNED_ONLY_REVIEW_AGAINST_FINAL_TEXT_AND_RENDERED_SNIPPET',intent:'INFORMATIONAL_READER_DECISION',monthlySearchVolume:row?.searchVolume??null,volumeKeyword:row?.keyword??null,volumeSource:row?{file:row.source,callId:row.callId,kind:row.kind,updatedAt:row.updatedAt}:null,volumeMeaning:'Tik pateiktos volumeKeyword frazės LT duomenų įvertis; ne straipsnio srauto prognozė. Rašybos variantų nesumuoti. Null reiškia duomenų nėra. Komercinio šeimos termino apimtis nepriskiriama naujai informacinei frazei.',keywordFamily:{term:seeds[page.categoryId]??null,observedVolume:exact(seeds[page.categoryId]??'')?.searchVolume??null,role:'Discovery context only; not primary query volume',commercialOwner:'Actual national/local catalogue when eligible; no editorial substitution for provider results'},lengthReview:{titleChars:title.length,descriptionChars:description.length,reviewIfLong:title.length>75||description.length>180,meaning:'Redakcinės gairės; Google neturi garantuoto simbolių limito. Tikrinti tikrą snippet ir nekarpyti prasmės automatiškai.'},canonicalArticleId:page.id,localTransactionOwner:'Tikras procedūros–miesto katalogo rezultatas; informacinis gidas neturi miesto landing užduoties.'};
  page.description=description;page.primarySearchIntent.query=primary;page.primarySearchIntent.volume=row?.searchVolume??null;
 }
 const decisions=[];
 const unique=[...new Map(all.map(v=>[v.keyword,v])).values()];
 for(const k of unique){
  const n=normalize(k.keyword);let decision,articleId=null,reason,catalogueTargets=[],cityId=null;
  const reviewed=overrides.find(x=>normalize(x[0])===n);
  if(reviewed){[,decision,articleId,reason]=reviewed;if(decision==='NATIONAL_CATALOGUE_OR_MIXED_SERVICE_OWNER')catalogueTargets=reviewed[4]?.map(id=>'mb:catalog:'+id)??p.pages.find(x=>x.id===articleId)?.catalogueTargets.map(t=>t.routeRegistryId)??[];}
  else if(brand.test(n)){decision='EXCLUDE_COMPETITOR_OR_BRAND_NAVIGATION';reason='Prekės ženklo ar teikėjo paieška; nesavinti jo navigacinio ketinimo.';}
  else if(/\b(studij\w*|mokym\w*|kursai|darbo|atlyginim\w*)\b/.test(n)){decision='EXCLUDE_EDUCATION_OR_EMPLOYMENT';reason='Paslaugos užsakymo platforma; ne profesinis mokymas ar darbo portalas.';}
  else if(/\b(rinkin\w*|priemone\w*|priemoni\w*|aliejus|senukai|fotoepiliatorius|pasta|lempa)\b/.test(n)){decision='EXCLUDE_PRODUCT_SHOPPING';reason='Prekės paieška skiriasi nuo salono paslaugos. Produktas aptariamas tik jei reikalingas metodo paaiškinimui.';}
  else if(/\b202[0-6]\b/.test(n)){decision='MERGE_EVERGREEN_OR_REJECT_EXPIRED_YEAR';reason='Praėjusio sezono duomenys neprognozuoja 2027 m. atskiros frazės apimties; nekurti kasmetinio klono.';}
  else if(cityForms.some(c=>c.pattern.test(n))){decision='LOCAL_CATALOGUE_OWNER';cityId=cityForms.find(c=>c.pattern.test(n)).id;reason='Procedūra / paslauga ir vieta: patikrinti tikrą filtrą, pasiūlą ir indexEligible; atskiro miesto straipsnio nekurti. Procedūros mazgą sutikrinti semantiškai; miestas savaime neaktyvuoja URL.';}
  else if(n==='veido kauke'){decision='REVIEW_MIXED_PRODUCT_OR_SERVICE';reason='Bendras terminas gali reikšti prekę, naudojimą namuose arba salono komponentą. Tikslus SERP nepaimtas; nepriskirti automatiškai VP-masazas-kauke.';}
  else{
   const exactPage=p.pages.find(x=>normalize(x.seo.primaryKeyword)===n);
   const procedure=p.procedureCoverage.find(x=>normalize(x.label)===n);
   const familyPage=p.pages.find(x=>seeds[x.categoryId]&&normalize(seeds[x.categoryId])===n);
   if(procedure||familyPage){articleId=n==='mezoterapija'?'ES-mezoterapija-biorevitalizacija':n==='pirtis'?'SP-gidas':procedure?.targetId??familyPage.id;decision='NATIONAL_CATALOGUE_OR_MIXED_SERVICE_OWNER';catalogueTargets=procedure?[`mb:catalog:${procedure.taxonomyNodeId}`]:familyPage.catalogueTargets.map(t=>t.routeRegistryId);reason='Bendras paslaugos terminas nereiškia vien straipsnio ketinimo. Tikras paslaugų katalogas aptarnauja teikėjo pasirinkimą; articleId yra informacinis palaikantis atsakymas, ne išmatuotas šio termino SERP savininkas.';}
   else if(exactPage){articleId=exactPage.id;decision='ARTICLE_ANSWER_OWNER';reason='Konkretus informacinio atsakymo brief; nėra pažado, kad bet kuris komercinis ar mišrus šios frazės rezultatas priklauso gidui.';}
   else{const keys=tokens(n);const scored=p.pages.map(x=>{const words=tokens(x.title+' '+x.outline.join(' '));const hits=keys.filter(t=>words.includes(t)).length;return{x,score:keys.length?hits/keys.length:0,hits};}).filter(x=>x.hits>=2&&x.score>=0.6).sort((a,b)=>b.score-a.score||b.hits-a.hits);if(scored.length){articleId=scored[0].x.id;decision='CANDIDATE_EXISTING_ANSWER_REVIEW_BEFORE_TARGETING';reason='Semantiškai artimas atsakymas; reikia redakcijos patvirtinimo, o ne automatinio raktažodžio įterpimo.';}else{decision='RESEARCH_BACKLOG_NOT_AUTO_ARTICLE';reason='Susijusių frazių grafas nebūtinai reiškia tinkamą ketinimą. Papildomo URL nedaryti be savarankiško atsakymo ir įrodymų.';}}
  }
  decisions.push({...k,decision,articleId,catalogueTargets,cityId,reason,reviewedOverride:Boolean(reviewed),decisionEvidence:decision.startsWith('REVIEW_')||['CANDIDATE_EXISTING_ANSWER_REVIEW_BEFORE_TARGETING','RESEARCH_BACKLOG_NOT_AUTO_ARTICLE'].includes(decision)?'UNRESOLVED_NOT_TARGET_ACCEPTANCE':'BUSINESS_SCOPE_AND_READER_JOB_REVIEW_NOT_RANKING_PROOF',publicReady:false});
 }
 const summary=input.summary;
 p.keywordResearch=summary;p.research.method=`${p.sources.length} perskaityti turinio šaltiniai ir realus treg / DataForSEO LT raktažodžių bei SERP duomenų tyrimas; ribos RESEARCH.md ir KEYWORD_RESEARCH.md.`;
 p.research.limitations=p.research.limitations.map((s,i)=>i===0?'GSC ir patikimo Trends eksporto neturime. Treg / DataForSEO apimčių įverčiai ir susijusių frazių duomenys išsaugoti KEYWORD_DATA.json; reklamos konkurencija nėra organinis sunkumas.':i===1?'Patikrintos 60 Lietuvos Google rezultatų imčių (lt, desktop, depth 10). Tai nėra kontroliuotas Vilniaus ar visų įrenginių reitingų matavimas; rinkos spraga ir būsimas mūsų matomumas lieka hipotezėmis.':s);
 writeFileSync(new URL('KEYWORD_DATA.json',dir),JSON.stringify({summary,measured,related,decisions},null,2)+'\n');
 const counts=Object.fromEntries([...new Set(decisions.map(x=>x.decision))].map(d=>[d,decisions.filter(x=>x.decision===d).length]));p.keywordOwnership={reviewedAt:'2026-10-07',counts,unresolved:decisions.filter(x=>x.decisionEvidence==='UNRESOLVED_NOT_TARGET_ACCEPTANCE').length,status:'OBSERVED_DISCOVERY_GRAPH_NOT_ALL_PHRASES_TARGETED',rule:'No new URL from unresolved candidate or missing volume alone'};
 writeFileSync(new URL('SEO_MAP.json',dir),JSON.stringify({checkedAt:summary.checkedAt,reviewedAt:'2026-10-07',status:'EDITORIAL_METADATA_AND_QUERY_OWNERSHIP_PLAN',ownership:p.keywordOwnership,articles:p.pages.map(x=>({articleId:x.id,slug:x.slug,...x.seo})),decisions,summary},null,2)+'\n');
 return summary;
}
