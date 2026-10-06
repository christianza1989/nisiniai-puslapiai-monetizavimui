# Superiora nepriklausoma parent peržiūra

2026-10-06. Tikras izoliuotas Next dev target `http://localhost:3240`, svetainės sesijos valdomas procesas. Root nekeitė jo failų, paskyrų, DB, procesų ir nevykdė viso QA lygiagrečiai. Ši peržiūra papildo atsakingos sesijos actual HTTP/build/performance įrodymus; jų neatstoja. Atskiro Vercel projekto migracijos į public core nėra.

## Peržiūrėta tiesiogiai naršyklėje

- [x] Homepage desktop: nuoseklus Superiora vardas, tikras produktas/jo ribos, savita cream/green/serif kompozicija, kelias į sintetinį pamokos pavyzdį, gidus ir kontaktus.
- [x] Gidų sąrašas desktop: 3 prasmingos temos ir 3 įkeltos skirtingos iliustracijos, kiekvienos `srcset` su penkiais actual WebP URL. Canonical į aktualų Vercel host.
- [x] Visų trijų gidų pilnas rendered tekstas, H1/H2/list, byline/data, breadcrumbs, actual contextual bei susijusios vidinės nuorodos, pirminiai išoriniai šaltiniai.
- [x] Visų trijų gidų mobilūs 390×844 screenshot peržiūrėti: 375px document scrollWidth ≤390, pagrindinė vaizdo veikla matoma. Actual vaizdai visi įkelti, pasirinktas mažas360WebP. Tai vieno viewport patikra, ne visų įrenginių sertifikatas.
- [x] Visų trijų gidų tikra Article schema su atitinkamu headline, image, publication, organization author/redakcija ir canonical; ne išgalvotas mokytojas.
- [x] Mobile meniu atsidaro per native summary ir rodo suprantamą navigaciją. Playwright button locator nesutapo su summary, bet AX expanded ir screenshot patvirtino veikimą; tai ne vartotojo kelio klaida.
- [x] `/redakcija`, `/kontaktai`, `/saugumas-ir-privatumas`, `/apie` visi pilnai perskaityti actual Next HTML. Kontaktas MB Pinet/info@pinet.lt, jokių skolintų rekvizitų. Privatumo informacija skiria actual techninį duomenų naudojimą ir neužbaigtus realių vaikų piloto vartus; teisinių sąlygų priėmimo root nesuteikia.
- [x] Viešas `/demo-pamoka` yra tikras, aiškiai sintetinis scenarijus. Pirmas → antras žingsnis actual UI veikia; tikrų vaikų duomenys, balso ar mokamo AI užklausa nepaleisti.
- [x] Laikinas root viewport reset; svetainės sesijos3240 procesas neliečiamas.

## Aptikti ir perduoti pataisymai

1. Actual V1 bundle gidai turi `media` šeimas, bet nė vieno `body.image`. Ankstesnis target tik body vaizdus renderino, todėl prarado visas iliustracijas ir Article image. Sesija priėmė vieną primary hero fallback ir naudoja jį body/index/OG/schema, išlaikydama approved bytes.
2. Originalioms iliustracijoms nereikalingas routine provenance caption. Sesija pašalino, tikrų trečiųjų šalių credit gali likti. Kilmė saugoma metodikoje ir private journal.
3. Sąrašo atskirų image links `alt=''` su be tekstu/no aria-label buvo bevardžiai. Sesijai perduotas konkretus named link reikalavimas; galutinį pataisymą/testą tikrina jos QA.
4. Viešas source reason pradžioje rodė vidinį review dienoraštį („Key findings“, „feedback“ ir peržiūros datą). Adapteris turi rodyti naudingą source label, o review note laikyti privačiai. Vėlesniuose actual2/3gidų preview matyti tik tvarkingi source links; galutinio visų URL QA atsakomybė sesijai.
5. Pirmas Next dev load buvo ilgas ir laikinas screenshot rodė dar neįkeltą hero. Vėliau visi3mobile vaizdai loaded=true, dev error logs tušti; tai nepatvirtino nuolatinio asset gedimo. Sesija nustatė viso failų inventoriaus nuoseklios patikros kaštą ir tvarko našumą, ne silpnina approval.

## Dar ne root patvirtinta

- [x] Tikras izoliuotas production-build prieš/po publishAt HTTP/SSR/cache su future asset: source report perskaitytas root, 11/11 PASS. Raw/private tiesioginių URL404 ir production teigiamos managed editorial sesijos priėmimas dar atskiri.
- [x] Visi15 tikrų WebP variantų production-build HTTP200, teisingas MIME ir originalių approved baitų SHA, actual-date sitemap/index/LLM riba. Named image links pataisyti source; importer rollback/tamper ribos patikrintos source Vitest, ne gyva DB.
- [x] Galutinė lint pataisos patikra PASS kartu su ankstesniu TypeScript/1421testų/production build PASS; initial whole QA FAIL išsaugotas. Actual Lighthouse ir pilnas WCAG vis dar UNVERIFIED.
- [x] Actual naujų failų Vercel deploy ir live patikra esamam host. `superiora.lt` nuosavybė/DNS nepatvirtinta ir nekeičiama.
- [ ] Tikrų vaikų pilotas, realūs įrenginiai/tiekėjų sąlygos ir likę produkto roadmap išoriniai vartai; public UI/content jų neuždaro.

Pirmų gidų `publishAt` yra2026-10-06T17:37:25.589Z initial eligibility; jei pirmas viešas deployment vyksta vėliau, publikavimo tiesa tvarkoma nauja actual editorial revizija, ne keičiamu senu hash. Core Git source ir realus Vercel deployment skirtingi. 10/10/production-ready ši parent peržiūra neskelbia.

## Peržiūros tęsinys 2026-10-06

- Target importo failo SHA perskaitytas iš AI_teacher actual `content/releases/f31ca9b1bb4d8524f341bdb47ae81025d67f45b935dd0de21f3f6167e69d2aa4/content-package.json`: sutapo su originaliu `b2415a82d23181ac9cf0c12847df0e25bf8f3f05efbce052d717e8bc6fd39c71`.
- Target `/mokymosi-gidai` dabartinis source turi konkrečius `aria-label` image ir read links. Tai patikrintas source pataisymas; galutinės revizijos actual a11y HTTP/browser priėmimas atskiras.
- Parent perskaitė `docs/PUBLIC_CONTENT_ADAPTER.md`, tikrus import/projection/access testus, `public-content-import.ts`, Next tracing ir actual isolated HTTP harness. Nepasitikima upload SDK vien jo paties SHA; vykdomas tik vietinis reviewed/pinned SDK. Receipt integrity nėra jo kilmės autentifikacija.
- HTTP dev synthetic teigiamas editor bandymas naudoja legacy signed parent be managed `sessionId`; tikras production auth jo nepriima. Todėl jis nėra managed Neon editorial production sesijos PASS. Anonymous/child/unlisted deny ir production public-date riba vertinami atskirai, auth nesilpninama dėl bandymo.
- Vieno release 200 asset limit reiškia daugiausia40 pilnų5variantų šeimų (jei nėra papildomų vaizdų). Policy6mėn./2per savaitę (~52gidai) tokio limito savaime neišplečia. Spraga perduota source, dabartiniai3gidai telpa; pilno pusmečio priėmimas nepretenduojamas.
- Core eksportas / optional stable siteId / bendri content-only docs sujungti per [PR9](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/9), main `e2020125ac8868c4ba65640210031a712e361e45`. Studijos36/36, bendro core49/49 ir atskiras greitossvetaines7URL smoke nėra AI_teacher final QA.

### Tikra būsimos pradinės datos revizija

Source paprašius iki pirmo viešo gidų deployment, root per bendrą modelį pakeitė tik datą į `2026-10-06T18:30:00.000Z`. 2026-10-06T18:10:55.717Z atliktas naujas review su aktualia revision/site binding, bendra4įrašų approval ir immutable release; istorinis release neperrašytas. Script tikrino ID/type/slug/title/description/intent/body/media/links/externalLinks nepakitimą ir visų6SDK SHA sutapimą. Naujo release ID `26de29d9-7001-40eb-a327-55b83294f3f3`, package SHA `99ee288dea54b1896b5f02cfcecb0b3db05aa5b03716ffe2a5b82effaada88a8`, bundle ID `fd5b7d28379cd4b588d0ade6d36ee9414468b2f3a6f15eb98369adb3c2e873f9`. 4tiepatysID,15WebP,6SDK. Tai planuojama publikavimo data; dar nėra importo/deployment įrodymas. Jei pirmas deployment nusikels už šios datos, nauja data vėl tvirtinama review keliu prieš pirmą publikavimą.

### Source testų įrodymai, perskaityti root

`AI_teacher/reports/latest-autonomous-qa.json`, generatedAt2026-10-06T18:16:17.647Z, full passed=false: lintFAIL68,443s; typecheckPASS21,355s; Vitest190files/1421testsPASS492,469s; offline teacher evaluationPASS; calibrationPASS; architecturePASS; audit-highPASS; Next production buildPASS247,693s. Source išsaugo šį pirmą report prieš lint pataisymo tęsinį. Nėra fake viso ciklo PASS. Lint priežastis pagal source yra jos laikinas domeno tikrinimo script; root runtime failų nekeičia ir viso QA nekartoja.

`AI_teacher/reports/public-content-http-qa-production-2026-10-06.json`, timestamp2026-10-06T18:19:26.151Z: tikras isolated production build, synthetic fixture,0providerAPIcalls,11checksPASS. Actual riba18:19:24.495Z: prieš ją article irasset404, index/sitemap/LLM URL nėra; po jos same-running-server200 irURL atsiranda, responsesno-store. Anonymousprivatepreview404/noindex, unknownguide/asset/foreignsite404. Visi15realresponsivevariantų MIMEimage/webp ir exactapprovedSHA sutampa. To concurrentfixture vienoatsakymociklo339–420ms nėra Lighthouse, percentilio, cache hit ar Vercelperformance įrodymas. Fixture keičia tik savoisolatedkopijosdate/review/hash; actualapprovedpackage nemutuoja.

2026-10-06 apie18:25Z source pranešė atskirą `npm run lint` PASS (0klaidų,2istoriniai perspėjimai). Pirminis fullFAIL dėl lint lieka istorijoje; programos testai/build nereikalauja pakartojimo vien dėl laikino tikrinimo script pataisos. Root patikrino naują actual `content/active.json` su `fd5b7d28379cd4b588d0ade6d36ee9414468b2f3a6f15eb98369adb3c2e873f9` ir jo paketo SHA `99ee288dea54b1896b5f02cfcecb0b3db05aa5b03716ffe2a5b82effaada88a8`: originalūs naujo patvirtinto paketo baitai tikrai importuoti. Vercel deployment pradėtas source, READY/live patikra šiame taške dar laukia.

## Užbaigtas gyvas viešo turinio bandymas

Source `reports/SUPERIORA_PUBLIC_VERCEL_2026-10-06.md` ir `PUBLIC_SITE_RELEASE_QA_2026-10-06.json` perskaityti root. Deployment `dpl_8nb6URHg4FRsXDcfJdTAyhsyUfcq` READY pastebėtas 18:26:52 UTC, alias [mokytoja-ai.vercel.app](https://mokytoja-ai.vercel.app/). CLI laukimo ECONNRESET nėra cloud deployment gedimas; source inspektavo esamą deployment, antro nedarė. Naujas paketas importuotas prieš deployment, READY prieš planuotą 18:30 ribą. Final QA režimas tiksliai `full-with-targeted-lint-repair`; originalus full FAIL ir tarpinio lint rerun laikino HTTP fixture cleanup race išsaugoti. Repair artefakte tikras lint exitCode0,0klaidų ir2ankstesni įspėjimai. Runtime/app kodo pataisos tarp build ir lint repair nebuvo.

Root perskaitė actual live before report 18:27:04.859Z: visi3būsimi gidai ir15jų assetų404; index irllms gidų nerodo; raw `/content/active.json`, naujo release `content-package.json` ir `/tools/content-sdk/provenance.json`404/noindex; anonymouseditorial404/noindex/no-store. Svarbi **atšaukta išvada**: pradinis before checker nedekodavo application/xml, todėl jo sitemap `present=false` nėra before sitemap įrodymas. Source išsaugo originalų report ir šį vartą žymi UNVERIFIED. Tikras lokalus production-build before/after sitemap PASS nuo šios klaidos nepriklauso.

Actual live after report 18:30:38.455Z: visi3gidai200 suhero/canonical/datePublished18:30Z; visi15assetų200/MIMEimage/webp/exactApprovedBytes=true; index, sitemap irllms visi3URL yra. Naujo redeploy publikavimo slenksčiui nereikėjo. Tai patikrintas gyvas publikavimas; naujo turinio rengimo/importo/deployment automatizavimo job šis įrodymas neprideda.

Root papildomai actual live CUA peržiūrėjo homepage ir4žingsniųdemo390×844 (scrollWidth375≤390), peržiūrėjo įkeltą demo vaizdą ir1→2žingsnį. Visi3liveindexvaizdai complete=true, pasirinkti360WebP su5variantųsrcset; image irreadlinks turi tikrus accessible names. Perskaitė pirmą ir antrą actuallivegidą, source panel rodo tik naudingus labels, ne internal review diary. Pirmo live Article schema turi18:30Z, teisingą canonical/hero/MBPinetorganizationauthor. Native AXclick kelias index→gidas→contextualkitasgidas→breadcrumbindex→gidas veikia. Pirmi Playwrightlocatorclick bandymai ir URLwait liko be navigacijos, logs buvo tušti; vėlesnis nativeclick tiesiogiai išindex pavyko. Tai nėra patvirtintas nuolatinis navigacijos defektas ar PASS iš failedtool. Laikinasviewportreset; paskyros/mic/AIAPI/studentųduomenys neliesti. Screenshot peržiūrėti įrankyje, atskiro root pixel artefakto/hash ši peržiūra nepateikia.

Livepublichomepage irtrust index/follow, demo/private noindex/robotsdisallow. Public turinys išlaiko aiškią adultsyntheticprodukto bandymo ribą. Source A–Z adapted85kriterijų auditas išsaugo nepatikrintus vartus (local47/67, launch2/9, operations0/2), nėra10/10 ar visos platformos production-ready deklaracijos. Pilnas a11y/performance, production managedNeoneditorialpositive ir realaus vaikų piloto vartai išlieka atskiri. Bendra studija turi tik3parengtusgidus irpolicy, ne užbaigtą52gidųkalendorių ar periodinįgeneratorių.
