import {readFileSync,writeFileSync} from 'node:fs';
import {seeds,primaryPhrase,normalize} from './keyword-seeds.mjs';
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
const cityRegex=/\b(vilniu\w*|kaun\w*|klaiped\w*|siauli\w*|panevez\w*|druskinink\w*|palang\w*|anyksc\w*|birston\w*)\b/;
const stopped=new Set(['ir','ar','kas','kaip','kuo','nuo','tai','bei','su','be','po','pries','gidas','paslaugos','paslauga','ko','kokio','kada']);
const tokens=s=>normalize(s).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!stopped.has(x)).map(x=>x.slice(0,5));
export function enrichSeo(p){
 const input=JSON.parse(readFileSync(new URL('SEO_RESEARCH_INPUT.json',dir),'utf8'));
 const {measured,related}=input;
 const all=[...measured,...related],exact=k=>all.find(v=>v.keyword===k&&v.searchVolume!==null)??all.find(v=>normalize(v.keyword)===normalize(k)&&v.searchVolume!==null)??all.find(v=>v.keyword===k);
 for(const page of p.pages){
  page.family??=seeds[page.categoryId]?p.pages.find(x=>x.categoryId===page.categoryId&&x.family)?.family??'Bendra':'Bendra';
  const preset=manual[page.id],primary=preset?.[0]??(page.id.endsWith('-gidas')?seeds[page.categoryId]:clean(primaryPhrase(page)))??clean(primaryPhrase(page));
  // Keep an editorial answer intent even when its seed has mixed commercial demand.
  const row=exact(primary),relatedKeywords=[...new Set([primary, ...(page.procedureSections?.map(x=>x.label.toLowerCase())??[]),...page.outline.slice(0,2).map(clean)])].slice(1,7);
  let title=preset?.[1]??page.title.replace(/ gidas:/i,':').replace(/ gidas$/i,'');
  if(!preset&&title.length>75&&title.includes(':'))title=title.split(':')[0];
  const headings=page.outline.slice(0,3).map(h=>h.toLowerCase());
  let description=preset?.[2]??`${title.replace(/[?!.]$/,'')}. Gide: ${headings.join('; ')}.`;
  if(!preset&&description.length>180)description=`${title.replace(/[?!.]$/,'')}. Gide: ${headings.slice(0,2).join('; ')}.`;
  page.seo={status:'DATA_INFORMED_EDITORIAL_METADATA_PLAN_NOT_RENDERED_ARTICLE',primaryKeyword:primary,relatedKeywords,metaTitle:title,metaDescription:description,h1:page.title,h2:[...page.outline],intent:'INFORMATIONAL_READER_DECISION',monthlySearchVolume:row?.searchVolume??null,volumeKeyword:row?.keyword??null,volumeSource:row?{file:row.source,callId:row.callId,kind:row.kind,updatedAt:row.updatedAt}:null,volumeMeaning:'Tik pateiktos volumeKeyword frazės LT duomenų įvertis; ne straipsnio srauto prognozė. Rašybos variantų nesumuoti. Null reiškia duomenų nėra.',lengthReview:{titleChars:title.length,descriptionChars:description.length,reviewIfLong:title.length>75||description.length>180,meaning:'Redakcinės gairės; Google neturi garantuoto simbolių limito. Tikrinti tikrą snippet ir nekarpyti prasmės automatiškai.'},canonicalArticleId:page.id,localTransactionOwner:'Tikras procedūros–miesto katalogo rezultatas; informacinis gidas neturi miesto landing užduoties.'};
  page.description=description;page.primarySearchIntent.query=primary;page.primarySearchIntent.volume=row?.searchVolume??null;
 }
 const decisions=[];
 const unique=[...new Map(all.map(v=>[v.keyword,v])).values()];
 for(const k of unique){
  const n=normalize(k.keyword);let decision,articleId=null,reason;
  if(brand.test(n)){decision='EXCLUDE_COMPETITOR_OR_BRAND_NAVIGATION';reason='Prekės ženklo ar teikėjo paieška; nesavinti jo navigacinio ketinimo.';}
  else if(/\b(studij\w*|mokym\w*|kursai|darbo|atlyginim\w*)\b/.test(n)){decision='EXCLUDE_EDUCATION_OR_EMPLOYMENT';reason='Paslaugos užsakymo platforma; ne profesinis mokymas ar darbo portalas.';}
  else if(/\b(rinkin\w*|priemone\w*|priemoni\w*|aliejus|senukai|fotoepiliatorius|pasta|lempa)\b/.test(n)){decision='EXCLUDE_PRODUCT_SHOPPING';reason='Prekės paieška skiriasi nuo salono paslaugos. Produktas aptariamas tik jei reikalingas metodo paaiškinimui.';}
  else if(/\b202[0-6]\b/.test(n)){decision='MERGE_EVERGREEN_OR_REJECT_EXPIRED_YEAR';reason='Praėjusio sezono duomenys neprognozuoja 2027 m. atskiros frazės apimties; nekurti kasmetinio klono.';}
  else if(cityRegex.test(n)){decision='LOCAL_CATALOGUE_OWNER';reason='Procedūra / paslauga ir vieta: patikrinti tikrą filtrą, pasiūlą ir indexEligible; atskiro miesto straipsnio nekurti.';}
  else{
   const exactPage=p.pages.find(x=>normalize(x.seo.primaryKeyword)===n);
   const procedure=p.procedureCoverage.find(x=>normalize(x.label)===n);
   if(exactPage){articleId=exactPage.id;decision='ARTICLE_ANSWER_OWNER';reason='Vienas konkretus atsakymo gidas; plati komercinė variacija vis tiek turi katalogo kelią.';}
   else if(procedure){articleId=procedure.targetId;decision='MERGE_IN_NAMED_SECTION';reason=procedure.section;}
   else{const keys=tokens(n);const scored=p.pages.map(x=>{const words=tokens(x.title+' '+x.outline.join(' '));const hits=keys.filter(t=>words.includes(t)).length;return{x,score:keys.length?hits/keys.length:0,hits};}).filter(x=>x.hits>=2&&x.score>=0.6).sort((a,b)=>b.score-a.score||b.hits-a.hits);if(scored.length){articleId=scored[0].x.id;decision='CANDIDATE_EXISTING_ANSWER_REVIEW_BEFORE_TARGETING';reason='Semantiškai artimas atsakymas; reikia redakcijos patvirtinimo, o ne automatinio raktažodžio įterpimo.';}else{decision='RESEARCH_BACKLOG_NOT_AUTO_ARTICLE';reason='Susijusių frazių grafas nebūtinai reiškia tinkamą ketinimą. Papildomo URL nedaryti be savarankiško atsakymo ir įrodymų.';}}
  }
  decisions.push({...k,decision,articleId,reason});
 }
 const summary=input.summary;
 p.keywordResearch=summary;p.research.method=`${p.sources.length} perskaityti turinio šaltiniai ir realus treg / DataForSEO LT raktažodžių bei SERP duomenų tyrimas; ribos RESEARCH.md ir KEYWORD_RESEARCH.md.`;
 p.research.limitations=p.research.limitations.map((s,i)=>i===0?'GSC ir patikimo Trends eksporto neturime. Treg / DataForSEO apimčių įverčiai ir susijusių frazių duomenys išsaugoti KEYWORD_DATA.json; reklamos konkurencija nėra organinis sunkumas.':i===1?'Patikrintos 60 Lietuvos Google rezultatų imčių (lt, desktop, depth 10). Tai nėra kontroliuotas Vilniaus ar visų įrenginių reitingų matavimas; rinkos spraga ir būsimas mūsų matomumas lieka hipotezėmis.':s);
 writeFileSync(new URL('KEYWORD_DATA.json',dir),JSON.stringify({summary,measured,related,decisions},null,2)+'\n');
 writeFileSync(new URL('SEO_MAP.json',dir),JSON.stringify({checkedAt:summary.checkedAt,status:'EDITORIAL_METADATA_AND_QUERY_OWNERSHIP_PLAN',articles:p.pages.map(x=>({articleId:x.id,slug:x.slug,...x.seo})),decisions,summary},null,2)+'\n');
 return summary;
}
