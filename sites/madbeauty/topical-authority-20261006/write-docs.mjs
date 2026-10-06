import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const dir=new URL('./',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,dir))),p=read('PLAN.json'),k=read('KEYWORD_DATA.json');
const write=(f,s)=>writeFileSync(new URL(f,dir),s+'\n');
const ledger=readFileSync(new URL('SOURCE_LEDGER.md',dir),'utf8').replace('S59–S82','S59–S84');write('SOURCE_LEDGER.md',ledger.trimEnd());
const table=(heads,rows)=>'| '+heads.join(' | ')+' |\n| '+heads.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.map(x=>String(x??'duomenų nėra').replaceAll('|','/').replaceAll('\n',' ')).join(' | ')+' |').join('\n');
write('README.md',`# Galutinis Madbeauty turinio planas

2026-10-06–2027-04-06. Visos 21 katalogo srities, 59 grupių ir 225 procedūrų atsakymai sutikrinti su foundation commit c1f159353620aed66e9c67a95306786646c7137c. ${p.pages.length} naujų individualių gidų ir 3 esamų gidų atnaujinimai; ${p.links.length} suplanuotų redakcinių nuorodų. Tai pilnas paslaugos supratimo / pasirinkimo planas, ne visų medicinos ir kitų plėtinių problemų enciklopedija.

- [Skaitoma interaktyvi peržiūra](MADBEAUTY-TOPICAL-AUTHORITY-PLANAS.html): visos temos, datos, H2, metaduomenys, nauda, šaltiniai ir konkretūs nuorodų tikslai.
- [PLAN.json](PLAN.json): visas autoritetingas brief; [PROCEDURE_COVERAGE.json](PROCEDURE_COVERAGE.json) — kiekvienos procedūros vardinis atsakymo skyrius.
- [KEYWORD_RESEARCH.md](KEYWORD_RESEARCH.md), [KEYWORD_DATA.json](KEYWORD_DATA.json), [SEO_MAP.json](SEO_MAP.json): realus treg / DataForSEO LT tyrimas, metaduomenys ir užklausų savininkai.
- [RESEARCH.md](RESEARCH.md), [SOURCE_LEDGER.md](SOURCE_LEDGER.md), [WRITING_PLAYBOOK.md](WRITING_PLAYBOOK.md): tyrimas, ${p.sources.length} perskaityti turinio šaltiniai ir nišos rašymo standartas.
- [CONTENT_SEO_HANDOFF.md](CONTENT_SEO_HANDOFF.md), [ARTICLE_CATALOGUE_TARGETS.json](ARTICLE_CATALOGUE_TARGETS.json), [PLATFORM_SCOPE.md](PLATFORM_SCOPE.md): suderinti nacionaliniai / miesto ID ir aktyvavimo ribos.
- [VALIDATION.json](VALIDATION.json): aprėpties, datų, šaltinių, grafų, metaduomenų ir transporto patikra.

Pagrindinė ${p.totals.evergreenNew} temų aprėptis rengiama iki 2026-11-24; tai parengimo orientyras po kokybės peržiūrų. Parengtas grupes leidžiama išleisti anksčiau. Likęs pusmetis apima 4 sezonines temas ir 12 peržiūrų. Publikavimo savaitinės kvotos nėra; data nepakeičia faktinio patvirtinimo.

batches/ — ${Math.ceil(p.pages.length/24)} schema-valid V1 transporto projekcijų, daugiausia 24 įrašai vienoje. 24 yra transporto riba, ne publikavimo ritmas. V1 neperneša viso research / katalogo binding: prieš rengimą įkelti pilną master brief, susieti tikrus studijos UUID ir patikrinti plan→V2 draft→export→shadow import. Patvirtintas pradinis paketas nekeičiamas.

Atkurti: node build-plan.mjs; node write-docs.mjs; node render-plan.mjs; node verify-plan.mjs. Skriptus paleisti šio katalogo kontekste arba nurodyti visą kelią. SEO_RESEARCH_INPUT.json yra atrinkti tyrimo duomenys ir kvitai; atkūrimas nevykdo mokamų API užklausų. Žali tiekėjo atsakymai keyword-research/ lieka vietiniai ir į Git neįtraukiami. Jokie treg prieigos raktai čia nesaugomi.

Planas nesukuria viešų tekstų, originalios medijos, specialisto patvirtinimų, deployed katalogo ar Google reitingų.`);
write('PLATFORM_SCOPE.md',`# Katalogo ir turinio apimtis

Autoritetinga read-only foundation kopija: c1f159353620aed66e9c67a95306786646c7137c / draft PR14, priklauso nuo PR13. 305 mazgai, 225 treatment, 103 miestai. Turinio plano PR10 nėra platformos diegimas.

${table(['Sritis','Procedūrų','Būsena'],p.catalogueCategoryCoverage.map(c=>[c.label,c.treatmentCount,c.scope==='core'?'14 core sričių lokalaus foundation dalis; production nepatvirtintas':'7 savininko patvirtintų plėtinių dalis; runtime planned']))}

21 katalogo sritis ir 33 redakcinės kryptys yra skirtingi lygiai. Pavyzdžiui, nagų sritis išskaidyta į manikiūrą, dangą, dizainą, modeliavimą ir priežiūrą. Kiekviena iš 225 procedūrų turi tikslų targetId ir vardinį skyrių; ne kiekvienai reikia atskiro straipsnio.

planTarget({taxonomyNodeId,cityId}) kontraktas: mb:catalog:{node}[:{city}], /paslaugos/{node}[/{city}]. Informacinis gidas numatytai nesiunčia kiekvieno skaitytojo į Vilnių — miesto pasirinkimas aiškus. Planuojamus adresus laikyti duomenimis, o ne išgalvotais href.

Runtime /content-targets.json naudoja approved-public-only pasiūlą, 1 valandos TTL. Funkcinis deployed / reachable ir indexEligible skirtingi. Nacionalinis browse noindex; tuščias miesto rezultatas 404; plėtiniams negalima išgalvoti pasiūlos. Indeksuojamam rezultatui reikia realių faktų, prasmingo HTML, self-canonical, matomos procedūros / miesto antraštės ir atskiro sitemap / robots priėmimo. Miestų, datų, kainų, rikiavimo bei variantų sandauga nėra masinio indeksavimo programa.

Prieš turinio CTA išleidimą privalomas actual fresh resolver. V2 editorial.commerceTargets verified:false ir checkedAt:null iki realios patikros; neparengta inline commerce nuoroda lieka tekstu. Tikro straipsnio tekstas, revision review, immutable medija ir shadow import tikrinami atskirai pagal CONTENT_SEO_HANDOFF.md.`);
const serps=read('SERP_REVIEW.json').queries;
write('SERP_REVIEW.json',JSON.stringify({checkedAt:'2026-10-06',status:'PROVIDER_GOOGLE_ORGANIC_SNAPSHOT_NOT_RANKING_GUARANTEE',scope:'60 sampled queries; LT country location 2440, language lt, desktop; not personalised Vilnius mobile results; regular endpoint excludes full AI/PAA feature audit',queries:serps},null,2));
const seeds=Object.keys(p.categoryCoverage).length;
write('KEYWORD_RESEARCH.md',`# Lietuvos raktažodžių ir rezultatų tyrimas

2026-10-06. treg → DataForSEO. Lithuania / 2440, language lt. Google Ads volume viena task užklausa: 730 frazių, 262 teigiami įverčiai, 468 null. 33 related-keywords task užklausos, po iki 30 eilučių ir depth2; ${p.keywordResearch.relatedRows} grąžintos eilutės, ${p.keywordResearch.uniquePhrases} unikalių tirtų formuluočių abiejuose rinkiniuose. Dar 60 Google organic rezultatų imčių, depth10, desktop / Windows. Atrinkti duomenys ir call receipt yra SEO_RESEARCH_INPUT.json, sprendimai KEYWORD_DATA.json; žali keyword-research/ atsakymai lieka vietiniai; SERP_REVIEW.json saugo konkrečius rezultatų adresus.

Faktinė tyrimo kaina ${p.keywordResearch.chargedUsd.toFixed(5)} USD, iš pradinio 1 USD promo kredito. Neperkame prenumeratos ir nejungiame reklamų. Pirmas apimčių bandymas grąžino keywords skyrybos parametrų klaidą ir buvo neapmokestintas; pataisyta į užklausų tekstą be skyrybos. Klaidos atsakymas saugomas, jo nelaikome apimčių duomenimis.

## Kaip skaityti skaičius

Apimtis yra tiekėjo Google Ads / duomenų bazės įvertis, ne tikslus paieškų skaitiklis. monthly_searches pateikia ankstesnius mėnesius, ne 2027 m. prognozę. Null reiškia duomenų nėra. Lietuviškos ir lotyniškos rašybos variantai gali persidengti — jų nesumuoti. Batch ir Labs duomenų atnaujinimo datos skiriasi; kiekvienam skaičiui išlaikytas exact keyword, endpoint ir callId. CPC ir competition yra reklamos rodikliai, ne organinis konkurencingumas ar būsimas mūsų uždarbis.

## Sprendimai, kuriuos pakeitė tyrimas

1. Japoniškas manikiūras (Labs 1900 / mėn.) turi konkretų skaitytojo klausimą, todėl MN-japoniskas pridėtas atskirai. Tai termino paklausos įrodymas, ne nago stiprinimo ar gydymo įrodymas: prieš draft reikia realaus gamintojo protokolo ir specialisto komentaro. Nežinomą pasiūlą kataloge nekurti.
2. Kirpimo užklausose svarbūs trumpas ilgis, tekstūra, veido forma ir kasdienis formavimas. KR-gidas papildytas veido formos pasirinkimo skyriumi; nėra vienos idealios formos pagal amžių ar lytį. Užklausos virš50 nekuria to paties kirpimo klono.
3. Permanentinis / ilgalaikis makiažas — to paties ketinimo formuluotės. PM-gidas naudoja suprantamesnį termino pavadinimą, turi privalumų ir trūkumų skyrių; korekcija ir paslaugos apimtis atskirtos. Senas plaukelių antakių darbas nepervadinamas pigmentavimu.
4. Manikiūras ir gelinis lakavimas paliekami atskirų komponentų palyginimu. Antakių gido primary nėra antakių laminavimas — tą frazę valdo konkretesnis AN-laminavimas, bendras gidas valdo priežiūros pasirinkimą.
5. Miestų paslaugų frazės skiriamos katalogui, kainos apimties ir metodų klausimai — gidams. Greičiausias turinio rengimas pirmiausia užbaigia root + palyginimas + pasirinkimas / apimtis + pasiruošimas / priežiūra grupę; didesnė paieškų apimtis nesuteikia leidimo praleisti sveikatos review.

## Reikšmingų frazių imtis

${table(['Frazė','Įvertis / mėn.','Sprendimas / atsakymas'],k.decisions.filter(d=>d.searchVolume>0&&['ARTICLE_ANSWER_OWNER','MERGE_IN_NAMED_SECTION','LOCAL_CATALOGUE_OWNER'].includes(d.decision)&&!/^spa vilnius$/.test(d.keyword)).sort((a,b)=>b.searchVolume-a.searchVolume).slice(0,40).map(d=>[d.keyword,d.searchVolume,d.articleId??d.decision]))}

Lentelė nėra prognozuojamo srauto suma. Tiekėjas susijusių frazių grafuose grąžina ir netinkamų rezultatų: SPA VILNIUS yra prekės ženklas; my pilates ir tattoo studijų vardai yra navigacija; priemonių rinkiniai — prekių pirkimas; studijos — mokymas; ankstesnių metų tendencijos — pasibaigęs sezonas. Jų neįterpti į tekstą vien dėl skaičiaus.

SEO_MAP.json kiekvienam straipsniui turi primaryKeyword, atskirą metaTitle / metaDescription, H1 / H2, patikrinto skaičiaus provenance ir intended URL. 300 primary frazių bei metaduomenų unikalumas tikrinamas. relatedKeywords straipsnio kortelėje yra redakcinės formuluotės iš jo apimties; pamatuoti susiję terminai su metrika saugomi atskirame decisions registre. Semantinio algoritmo CANDIDATE yra būsimos redakcijos review poreikis, ne galutinis faktas ar automatinė naujo URL komanda.

## Google rezultatų patikra

${table(['Užklausa','Stebėtas pirmas organinis rezultatas','Įrodymas'],serps.filter(s=>['manikiūras vilniuje','moterų kirpimas vilniuje','masažas vilniuje','japoniškas manikiūras','spa','limfodrenažinis masažas'].includes(s.query)).map(s=>[s.query,s.items[0]?.title,`[URL](${s.items[0]?.url}) · ${s.file}`]))}

Miestų imtyse matomi katalogo ir teikėjo puslapiai, o platesnėse užklausose rezultatų paskirtys mišrios. Tai pagrindžia informacinio atsakymo ir procedūros–miesto rezultato atskyrimą. 60 imčių nėra visų užklausų, visų miestų ar mobilių rezultatų auditas. Kitų puslapių tekstai ir snippet nėra klinikinių teiginių šaltiniai. Google gali pakeisti title ir snippet; prieš publikavimą metaduomenis sutikrinti su parašytu tekstu, vėliau query→landing→conversion tikrinti GSC / analitikoje.

## SEO ir GEO vykdymas

Rašyti vieną aiškų atsakymą kiekvienam ketinimui, natūralias formuluotes ir tikslius metodų pavadinimus. H2 turi išspręsti skyriuje konkretų klausimą, o ne kartoti primaryKeyword visose eilutėse. Trumpas tiesioginis apibrėžimas, vienodų kriterijų palyginimas, matoma nauda, datuoti šaltiniai ir tikros autorystės / kompetencijos ribos daro atsakymą suprantamesnį skaitytojui bei paieškos sistemoms. Schema turi atitikti matomą tekstą; nekurti privalomų FAQ dėl raktažodžių.

GEO nėra atskiras žodžių tankio receptas. Šis tyrimas nematavo Madbeauty citavimo AI sistemose ar AI Overview dažnio. Ateityje treg AI visibility priemonės gali padėti matuoti konkretų query / brand / source pokytį, kai bus tikras publikuotas turinys. Nei įrankio naudojimas, nei parengtas planas nėra matomumo pažadas.`);
write('RESEARCH.md',`# Madbeauty: pilno katalogo topical coverage tyrimas

2026-10-06. Apimtis remiasi savininko pateiktu visų procedūrų katalogu ir platformos sesijos autoritetingu foundation c1f1593 eksportu. 21 sritis, 59 grupės, 225 procedūros (194 core + 31 plėtinių), 103 miestai. Iš jų sudarytos 33 redakcinės kryptys ir ${p.pages.length} individualių naujų gidų brief; 3 esami adresai palikti atnaujinimams. ${p.sources.length} pirminiai turinio šaltiniai perskaityti; papildomai atliktas realus LT raktažodžių / SERP tyrimas pagal KEYWORD_RESEARCH.md.

## Kodėl nėra vien straipsnių skaičiaus ar savaitinės kvotos

Skaitytojo sprendimas, patikimas atsakymas ir originali nauda svarbesni už kalendoriaus užpildymą. Google naudingo turinio gairės (S19), scaled content abuse taisyklės (S20), AI turinio patikros gairės (S46) ir generatyvios paieškos gairės (S45) nenurodo privalomos savaitinės dozės. Daug neoriginalių URL nėra autoriteto įrodymas. News topic authority paaiškinimas S47 yra konkretaus naujienų paieškos konteksto dokumentas, ne universalus Madbeauty autoriteto balas.

Todėl iš karto suplanuotos visos patvirtintos sritys. Procedūros ir sinonimai sujungti tada, kai tas pats tekstas aiškiai atsako savarankišką klausimą; kiekvienas treatment turi vardinį skyrių ir atsakymo reikalavimus. Miestas yra paslaugos katalogo pasirinkimas, ne šimtų vienodų straipsnių priežastis. 24 įrašų studijos transportas nekeičia publikavimo tempo. Parengta susieta grupė išleidžiama po faktinės patikros, o ne laukia savaitinės kvotos.

## Aštuoni poreikiai ir tikras atsakymas

Kiekvienoje katalogo srityje suplanuoti apibrėžimo, alternatyvų, pasirinkimo, apimties / kainos / trukmės, pasiruošimo, eigos, priežiūros ir pagalbos ribų atsakymai. Matrica rodo, kur tie poreikiai atsakomi, ne tai, kad parašyti tekstai jau kokybiški. Kaina pagrindžiama komponentais ir datuotais vienodos apimties pavyzdžiais; universalūs kainų vidurkiai ar visiems vienodi išlaikymo terminai neišgalvojami.

Tiesioginis atsakymas turi paaiškinti paslaugą, metodą ir skirtumą. Bendras klausimų meistrui sąrašas nėra pakankamas. Originali palyginimo lentelė, eigos schema, darbo užduoties pavyzdys ar dokumentuota specialisto įžvalga turi būti iš tiesų sukurti. Dekoratyvus hero nepakeičia naudos elemento.

## Nišos tyrimo išvados

Nagų priežiūra, spalvinė danga ir konstrukcija skiriasi. LT meniu S01 / S32 ir alergijų publikacijos S41 leidžia planuoti komponentus, bet ne garantuoti produkto saugumą. LED terminas nėra savaiminis UV nebuvimo įrodymas; HEMA-free nėra universalus nealergiškumas. TPO / HEMA taisyklėms reikalinga aktuali ES norma, konkretaus produkto sudėtis ir specialisto review.

Plaukų dažyme atskirti zoną, techniką, šviesinimą ir tonavimą. Gamintojų S42 / S48 / S80 instrukcijos turi konkrečių sistemų išimčių; negalima parašyti, kad joks toneris nešviesina ar kiekviena cheminė procedūra vienodai saugi. Plaukų tempimo S73 ir glotninimo S54 dokumentai pagrindžia papildomą produkto bei darbo sąlygų patikrą, ne savidiagnostiką.

Antakių ir blakstienų priežiūros S36 / S49 sistemos skirtingos. Viena 24–48 valandų taisyklė nekopijuojama visiems produktams. LT meniu S35 / S84 padeda atskirti korekciją, dažymą, laminavimą ir pigmentavimą. Pigmentavimui ir tatuiravimui S59 / S60 reikalinga higienos, priemonių ir kompetencijos patikra; užsienio reikalavimai nėra Lietuvos taisyklės.

Lazeris, IPL ir elektroepiliacija turi skirtingą metodą bei vertinimą (S50 / S51). Konkretaus įrenginio ir žmogaus kontekstas svarbesnis už universalią procedūrų skaičiaus ar nuolatinio rezultato formulę. Kūno kontūro dokumentas S52 atskiria estetinį tikslą nuo nutukimo gydymo. RF mikroadatinis metodas tikrinamas ir pagal S83: bendras mikrobadymo dokumentas neįrodo kiekvienos RF kombinacijos saugos.

Masažo ir aromaterapijos S37 / S64 dokumentai turi skirtingą įrodymų kokybę; reklaminiai detox ir gydymo pažadai neperkeliami. Hamamo bei parafino S76 / S77 meniu rodo komponentus, o NVSC S79 — veiklos patikros klausimus. Purškiamo įdegio S74 ir soliariumo S75 negalima sujungti į vieną saugaus UV grafiką ar apsaugos nuo saulės pažadą.

Plėtiniai turi atskirą kompetenciją. Joga, pilatesas ir bendras aktyvumas S65 / S66 / S82 nėra individualus treniruočių receptas. Kineziterapijos S67 paskirtis skiriasi nuo bendros treniruotės. Psichologinės pagalbos S68 / S69 profesijų ir formatų tvarka ne vienoda. Dantų balinimo S70 UK teisė nėra LT licencijavimas. Gyvūnų priežiūros S71 / S72 neatlieka veterinaro ar Lietuvos registracijos patikros. Šios kategorijos planuojamos kaip paslaugos pasirinkimas, o ne diagnostikos ar gydymo instrukcijos.

## Šaltinių ribos ir nepasiekta medžiaga

SOURCE_LEDGER.md kiekvienam perskaitytam šaltiniui saugo URL, datą, paskirtį, išvadą ir ribą. READ nereiškia būsimo straipsnio fact-check ar expert PASS. Teikėjo meniu įrodo jo paslaugos apimtį; jo reklama nėra klinikinis bandymas. Tiekėjo darbas ar ekspertas automatiškai netampa mūsų redakcijos autoriumi.

Papildomo tyrimo metu ECHA tatuiravimo prieiga grąžino 403, dalis EUR-Lex HTML neatskleidė normos teksto, pasirinktas Lietuvos odontologijos licencijos puslapis grąžino 502, kai kurie seni NHS / SPA adresai buvo neveikiantys. Šių atsakymų ir paieškos ištraukų nelaikome perskaitytais dokumentais. Kur reikalinga jurisdikcija ar konkretus protokolas, brief turi REQUIRED_BEFORE_DRAFT_APPROVAL. Teiginys nerašomas vien todėl, kad tema jau yra plane.

## URL, miestas ir vykdymo eilė

Informacinis tekstas veda į pagrindinį gidą, konkrečius susijusius klausimus ir tinkamą katalogo tikslą. Taikomas platformos centralizuotas ID / resolver kontraktas; būsimas URL neapeina jo kaip external nuoroda. Katalogo national → city selector → results kelias ir local indexEligible priimami atskirai. CONTENT_SEO_HANDOFF.md fiksuoja šios ir platformos sesijų darbų ribas.

Penkios bangos spalio13,20,27 ir lapkričio10,24 numato pagrindus, metodų skirtumus, pasiruošimą / priežiūrą, sudėtingesnius sprendimus ir stipresnių įrodymų klausimus. Visų 296 evergreen temų parengimo tikslas 2026-11-24 priklauso nuo faktinės review. 4 sezoniniai gidai ir 12 peržiūrų pratęsia darbą iki 2027-04-06. Po pirmo tikro ciklo GSC query→landing, indeksavimas ir tikros paslaugų užklausos padeda koreguoti planą; dar neturime šių rezultatų.

Pilnas planas neprilygsta užbaigtam viešam turiniui. Prieš masinį vykdymą lieka realių studijos ID roundtrip, V2 draft / medija / immutable release ir shadow import priėmimas. Rašymo kokybės standartas WRITING_PLAYBOOK.md taikomas kiekvienai revision.`);
