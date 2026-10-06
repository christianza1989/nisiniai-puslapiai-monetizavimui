import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,dir),'utf8'));
const p=read('PLAN.json'),review=read('SEMANTIC_REVIEW.json'),manifest=read('RESEARCH_IMPORT_MANIFEST.json'),seo=read('SEO_MAP.json');
const table=(heads,rows)=>'| '+heads.join(' | ')+' |\n| '+heads.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.map(x=>String(x??'Nežinoma').replaceAll('|','/').replaceAll('\n',' ')).join(' | ')+' |').join('\n');
const sha=f=>createHash('sha256').update(readFileSync(new URL(f,dir))).digest('hex');
const body=`# Madbeauty plano peržiūra pagal naują SEO/GEO core

2026-10-07 vietos laiku. Atlikta esamo master peržiūra, ne sukurtas antras publikavimo kalendorius. Priklausomybė: merged PR17, main ed90a8b028c8bb1631568a2a54173ce82387c381. Actual planavimo instrukcijų fingerprint: ${p.seoCoreReview.fingerprint}. Senas pirmo straipsnio generavimo fingerprint nekeistas.

## Rezultatas ir tikroji būsena

Visos 21 katalogo srities /59 grupių /225 procedūrų ir103 miestų apimtis išlaikyta. Pradiniai300 naujų URL sutikrinti pagal jų pavadinimus, outline ir originalią naudą. Sujungti8 sutampantys reader jobs: liko${p.pages.length} nauji gidai +3 retained revisions, ${p.links.length} planned links. ${p.totals.evergreenNew} evergreen parengimo orientyras iki2026-11-24,4 sezonai ir12 peržiūrų iki2027-04-06. Šie skaičiai yra sprendimų rezultatas, ne kvota. Dates lieka planinės, faktiniai gates ir pajėgumas nepakeičiami kalendoriumi.

Vienas tikras privatus B-registracija tekstas ir vaizdas jau sukurti gpt-6-luna /xhigh bei atskiru ImageGen. Jo V2/hash/receipt neperrašyti; tai ne visų planų vykdymas. Ankstesni303 privatūs studijos planai suderinti per bendrą model workflow:295 aktyvūs,8 exact retired snapshots išsaugoti privačioje istorijoje su old→target UUID. STUDIO_RECONCILIATION.json patvirtina konkretaus owner-isolated studio būseną ir actual bendro prompt patikrą be generavimo. Brief šaltinis yra ankstesnio peržiūrėto master SHA8b3e618f371e070551cd5f8a3a72e6b10a098699feee969c235053a62b5b7fc9; naujame master papildyta vykdymo būsena ir pataisytas window.target, straipsnių brief apimtis nepasikeitė. Approval, runtime href ir naujas production release neatlikti.

${table(['Sujungta tema','Paliktas atsakymas','Kodėl'],review.merges.map(x=>[x.oldId,x.targetId,x.reason]))}

Retained atsakymo outline, šaltiniai, originalios iliustracijos/ruošinio poreikis ir named procedure sekcijos perkelti. Parent links, cross-links,49 owner menu ir76 senų ketinimų binding sutikrinti. Naujo URL/redirect nekurti vien todėl, kad senas unpublished planas turėjo slug. Gelinio lakavimo pasiruošimas aiškiai dalijasi MN-pasiruosimas su manikiūru.

## Raktažodžiai: duomenys ir mūsų sprendimai

730 LT volume frazių (262 positive,468 unknown),33 related calls /931 rows,1562 unikalių frazių ir60 desktop LT SERP imčių pernaudota. Istorinė settled kaina0.71772USD; nauja mokama kaina0USD. Ads competition nėra organic difficulty, artimų variantų apimtys nesumuotos. Metaduomenų primary frazėms nėra perduotas platesnio komercinio šeimos termino volume. Naujo informacinio primary volume=null, jei būtent jo apimtis nepamatuota.

RelatedKeywords dabar tik vendor grąžintos frazės su callId/source/updatedAt. Outline ir taksonomijos vardai atskirti į editorialConcepts. Susijęs seed dar neįrodo individualaus straipsnio targeting. SERP saugo organic rankGroup ir feature-aware rankAbsolute; senas rank reiškė rankAbsolute. Tai ne Madbeauty reitingai.

Mezoterapija turi national/mixed service owner ir ES-mezoterapija-biorevitalizacija kaip palaikantį metodo atsakymą, ne ES-gidas išimtines teises bendram terminui. Pirtis turi platų SP-gidas, ne vien hamamo ownership. Veido kaukė lieka mišrus produktų/paslaugų klausimas be automatinio straipsnio savininko. Aukštos pamatuotos paklausos atradimai peržiūrėti keyword-review.mjs: pvz. plaukų priauginimo kaina perkelta iš dažymo kainos į PX-gidas; reformer formatas aptariamas vardiniame palyginimo skyriuje, ne naujame užklausos klone.

${table(['Sprendimas','Frazių'],Object.entries(p.keywordOwnership.counts))}

${p.keywordOwnership.unresolved} discovery frazių lieka unresolved: kandidatas, backlog arba aiškiai mišrus ketinimas. Tai nėra ${p.keywordOwnership.unresolved} papildomi straipsniai ar užbaigtas visų frazių targeting. Full map reiškia savininko procedūrų ir skaitytojo sprendimų žemėlapį. Pirmų connected groups writing readiness ir užbaigtų final tekstų priėmimas yra atskiri.

## Private import ir aktualumas

${manifest.sharedImport?.observations??manifest.observations} stebėjimai importuoti per bendrą content-studio/scripts/seo-research.mjs į atskirą madbeauty-writing-studio-20261007 tenant data. Status: ${manifest.sharedImport?.status??'IMPORT_NOT_RECORDED'}; current kinds: ${(manifest.sharedImport?.currentKinds??[]).join(', ')}; missing kinds: ${(manifest.sharedImport?.missingKinds??[]).join(', ')}. Imported manifest SHA:${manifest.sharedImport?.evidenceSha256??'not recorded'}. Žali provider ir request bytes lieka privatūs, pilni atsakymai ir SHA išsaugoti; prompt value imtys sutrumpintos tik dėl256KiB adapterio ribos, ne pakeistos kitais duomenimis.

Keyword original acquisition tiksli valanda nebuvo išsaugota. observedAt įvardytas kaip dabartinis vietinis raw bytes skaitymas, originalAcquisitionDate=2026-10-06, originalAcquisitionInstant=null, replay=true. Underlying vendor updatedAt /monthly arrays išsaugoti. SERP turi actual original datetime. Pakartotinis importas nėra naujas nepriklausomas sample ar GEO baseline.

Current reiškia sutampančius bytes/locale ir galiojantį pasirinktą review window, ne semantinį teisingumą: keywords ikiNov6, original Oct6 SERP ikiOct13, public baseline vienos dienos išleidimo patikrai. Vėlesnis job turi iš naujo vertinti freshUntil; neapeiti core refresh_due. Sveikatos teiginio qualified review nuo šios datos/volume patikros nepriklauso.

## Viešas katalogas ir registracija

${table(['Adresas','HTTP','Robots','Reikšmė'],manifest.baseline.map(x=>[x.path,x.status,x.xRobots??x.robots??'nėra HTTP signalo',x.error??(x.path==='/content-targets.json'||x.path.includes('/vilnius')?'Numatytas naujas CTA dar neparengtas':x.title??x.contentType)]))}

Tai11 bounded GET, ne exhaustive crawl. Viešas /paslaugos yra200/noindex HTML shell; naujas resolveris ir tikrintas moterų kirpimo Vilniuje adresas404/noindex. /paskyra ir /meistrui/pradzia pasiekiami200/noindex, tačiau auth, el. pašto pristatymas, approved provider ir booking projection čia nepriimti. Bare /registracija404 yra tuščias adresas be pasirinktos paslaugos, ne viso rezervavimo variklio neveikimo įrodymas. Šių kelių negalima reklamuoti kaip patikrintos veikiančios rezervacijos.

Skaitytojo kelias: gido atsakymas → atitinkama tikra procedūra/grupė → aiškiai pasirinktas miestas → approved real provider pasiūlymas → tikras serverio patvirtintas booking. Meistro kelias: meniu/grafiko/galerijos brief → tikra meistro informacija ir email-only account entry → darbo vieta → realūs variantai, grafikas, profilis → moderuotas viešas pasiūlymas. Planned commerce targets lieka false iki fresh resolver; nenaudoti owned future URL kaip external bypass.

## Rašymas, schema ir GEO

Kiekvienas brief turi contentAcceptance: tiesioginis atsakymas, mechanizmas, palyginimo kriterijai, realios išimtys, konkretus originalus worked example, claim sources ir faktinės autorystės ribos. Ne vien universalus klausimų meistrui sąrašas. Patikrinta metodo /produkto instrukcija negali būti pakeista kita sistema; kainų komponentai lyginami su tikrais datuotais pasiūlymais. AI schema/iliustracija yra aiškiai iliustracinė, ne mūsų klientas, prieš/po bandymas ar meistro darbas.

Article/WebPage ir BreadcrumbList schema atitinka matomą final tekstą; Organization autorius tikras. Neįrašyti fiktyvaus specialisto, medicininės review, rating ar pasiūlos. H2 ir meta title/description peržiūrimi dar kartą pagal realiai parašytą tekstą ir rendering; SEO_MAP nėra final snippet PASS. Schema ar llms.txt nėra atskira Google AI matomumo garantija. Aiškūs atsakymai, originali nauda, įskaitomos nuorodos ir faktų kontekstas yra naudingos struktūros dalys. [Google AI gairės](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [AI features](https://developers.google.com/search/docs/appearance/ai-features), [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Connected groups ir matavimas

PLAN.execution.connectedGroups nurodo kiekvienos iš33 krypčių root, palaikančius ir shared answer IDs, planinę parengimo datą, publicReady=false ir vartotojo naudos/šaltinių/media/registry gates. Prioritetą keičia tikra pasiūla, reikšminga konkretaus klausimo paklausa, galimybė sukurti originalų artefaktą, sezonas ir faktinė eksperto/peržiūros pajėga. Matrica neturi balo, kuris garantuotų authority. Medicinos, psichologijos, dantų, įrenginių ir pagalbos ribų tekstai lieka privatūs iki kvalifikuotos current review. Nepriklausomą parengtą grupę galima išleisti anksčiau; savaitinės kvotos nėra.

Matavimas dabar NOT_CONNECTED/NOT_MEASURED. Po tikro release GSC: query→landing, indeksavimo ir canonical signalai, device/country bei baseline langas; aktualios AI report funkcijos tikrinamos pačioje property, ne priskiriamos iš įrankio sąrašo. GA4 arba serverio agreguota analitika: article→catalogue click atskirai nuo filtro/results, provider profile, auth verified, pateikta užklausa, realiai pristatyta užklausa ir serverio patvirtintas vizitas. Meistro onboarding milestone – reali darbo vieta bei moderuota vieša paslauga, ne signup click. Leads kokybė apima tinkamą procedūrą/miestą, realius kontaktus ir gavusį teikėją; revenue ir apsilankymas negali būti išvesti iš click. Privatumo/consent apimtį sutikrinti prieš įgyvendinimą; šie events yra siūloma specifikacija, ne jau įdiegta analitika.

GEO mėginys ateityje: atskirai išsaugoti engine/model, exact LT prompt, market/device jei palaikoma, datą, denominator, citavimo URL ir nepriklausomą response SHA. Cached replay nevadinti nauju sample. Neturime faktiško Madbeauty AI citation, backlink ar GSC baseline; tai netrukdo rengti naudingų tekstų.12 esamų review datų naudojamos ir tikriems signalams įvertinti, nereikia antro auto kalendoriaus.

## Tikslūs likę sprendimai ir kaina

Mokamų call dabar0. Jei prioritetui būtina užbaigti mišrią užklausą, minimalus papildymas būtų tos vienos frazės LT desktop organic sample: „veido kaukė“, „parafino vonelė“, „spa Lietuvoje“ ar „pilates namai“ – tik kai sprendimas keičia connected group. Istorinės60 regular užklausos kainavo0.002USD už call; būsimos kainos iš to negarantuojamos. Naujam bounded planui pirma tikrinti actual Treg catalog quote ir cap; vykdymas šioje peržiūroje neautorizuotas. GSC/GA4 prijungimas, public full catalogue ir kvalifikuota klinikinė review reikalauja atskirų realių duomenų, ne papildomo volume buy.

## Priėmimo įrodymai

PLAN SHA:${sha('PLAN.json')}; SEMANTIC_REVIEW SHA:${sha('SEMANTIC_REVIEW.json')}; SEO_MAP SHA:${sha('SEO_MAP.json')}. VALIDATION.json tikrina struktūrą, remapped IDs, datas,225 vardinius atsakymus, tikrus vendor related įrodymus ir broad-query pataisas. Tai ne klinikinis, Google ranking ar naujo release PASS. Pradinio paketo SHA ir istorinio pilot receipt išsaugoti. Private import actual status papildytas RESEARCH_IMPORT_MANIFEST.json.
`;
writeFileSync(new URL('SEO_CORE_REVIEW.md',dir),body);
const f=new URL('README.md',dir),old=readFileSync(f,'utf8');writeFileSync(f,old.split('\n\n2026-10-07: [Naujo SEO/GEO core peržiūra]')[0]+'\n\n2026-10-07: [Naujo SEO/GEO core peržiūra](SEO_CORE_REVIEW.md), [visų300 pradinio žemėlapio sprendimai](SEMANTIC_REVIEW.json) ir [private import kvitas](RESEARCH_IMPORT_MANIFEST.json). 8 intent merges;292 nauji +3 retained,225 procedūros išlaikytos. Vienas privatus straipsnis/vaizdas jau parengtas; privatus303→295 suderinimas atliktas per bendrą DATA lock; masinis rašymas, V2 adapterio priėmimas ir naujas viešas release dar neatlikti. [Studijos suderinimo kvitas](STUDIO_RECONCILIATION.json). Rebuild seka papildyta: node write-review.mjs po verify-plan.mjs.\n');
console.log(JSON.stringify({newArticles:p.pages.length,merged:review.merges.length,unresolved:p.keywordOwnership.unresolved,importStatus:manifest.sharedImport?.status,planSha256:sha('PLAN.json')}));
