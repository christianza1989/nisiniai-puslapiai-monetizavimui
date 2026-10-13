# Promedical: privataus privatumo ir paleidimo faktų patikra

Privatus projekto dokumentas, 2026-10-09. Tai konkretaus vietinio prototipo kodo ir privatumo puslapio peržiūra; ji nėra viešo paleidimo ar teisės atitikties patvirtinimas. Root failai, patvirtinimai ir release nepakeisti. Vartotojas patvirtino `sales@promedical.lt`, `+370 686 88369` ir paprašė neviešinti juridinio pavadinimo. Viešas prekės ženklas lieka **Promedical**; juridinių duomenų iš vartotojo pakartotinai neprašome ir neišgalvojame.

## Tikslus peržiūros taikinys

Studio privatumo puslapis: `C:/Core/promedical-core-20261009/content-studio/data/sites/promedical.json`, slug `privatumas`, ID `fbecd4f2-ddef-4f28-b12a-97d2da359a68`, revisionHash `d23fce299fe453e2b46a0e55b8739012e4fe6341be0374a2f3ee5df631a03045`, 15 body blokų. 2026-10-09T15:10:55.565Z privatus ContentStudio preview grąžino HTTP 200 ir abu vietinės saugyklos bei skaitiklių skyrius. Preview HTML SHA-256 `9bea85a311b09d8aa134d3067d826dff2e68e5a5a1b1a9b12e3b23898f174551`. Studio HTML preview nėra įrodymas, kad viešas React frontend visas funkcijas atvaizduoja ar kad production forma išsiunčia laišką.

Peržiūrėtas public checkout `C:/Core/promedical-public-20261009`: `components/niche/promedical-inquiry.tsx`, `components/niche/interest-tracking.tsx`, `app/niche/[siteId]/lead/route.ts`, `app/niche/[siteId]/interest/route.ts`, `lib/niche-mail.ts`, `lib/niche-network.ts` ir DB migracijos `0004_niche_leads.sql`, `0005_niche_interest_daily.sql`. Vietinis `data/promedical-history/privacy-review-evidence.json` saugo tikrą snapshot ir aštuonis šių šaltinių SHA-256. Toliau išvados taikomos šiam snapshot; po kodo pakeitimo jas reikia patikslinti.

## Kas atitinka tikrą duomenų eigą

| Privatumo teiginys | Kode nustatyta | Vertinimas |
| --- | --- | --- |
| Užklausoje vardas, el. paštas, poreikio tekstas | Forma turi šiuos laukus; pasirinkti SKU, pavadinimai ir kiekiai pridedami prie žinutės | Atitinka. Galutinis tekstas, įskaitant produktus, 20–3000 ženklų |
| Užklausa naudojama atsakymui, ne naujienlaiškiui | Lead handler saugo užklausą ir gali persiųsti operatoriui; rinkodaros automatikos šiame kode nėra | Atitinka tik šią įgyvendintą eigą; vėlesni procesai netirti |
| Tekstas ir kontaktai išsaugomi DB | `niche_leads` saugo name, email, message; taip pat id, site_id, created_at, source_path, consent_at, status | Atitinka, tačiau viešai nepaaiškinti laiko / šaltinio metadata ir saugojimo kriterijai |
| Pašto nuorodą išsiunčia pats naudotojas | `mailto:` užpildo temą ir produkto + žinutės tekstą pašto programai | Atitinka. Klikas pats užklausos DB įrašo nesukuria; gali patekti tik į bendrą email_click skaitiklį |
| Produktų sąrašas saugomas naršyklėje be vardo ir el. pašto | `promedical-request-v1` localStorage: sku, title, path, quantity; iki 20 pozicijų | Atitinka; path viešame tekste neįvardytas. Automatinio galiojimo termino ir išvalymo po pateikimo nėra |
| Sąrašą galima išvalyti užklausos puslapyje | Yra kiekvienos pozicijos „Pašalinti“; bendro „išvalyti viską“ veiksmo nėra | Išvalymas galimas pašalinant kiekvieną poziciją; tekstą verta sukonkretinti |
| Skaitikliai pagal dieną / puslapį, be slapukų, lankytojo ID ir formos duomenų | JS siunčia tik event ir location.pathname, credentials omit; DB tik site_id, day, page_path, event, count | Atitinka agregavimo mechanizmą. IP ir UA kaip HTTP infrastruktūros metadata vis tiek pasiekia hostą; jų logų politika nepatikrinta |
| Gerbiami DNT ir GPC | JS nesiunčia jei doNotTrack=1 arba globalPrivacyControl=true; serveris praleidžia DNT:1 / Sec-GPC:1 | Kode atitinka; reikia frontend network patikros su abiem signalais |
| Prašoma nepateikti pacientų / sveikatos duomenų | Forma ir politika aiškiai tai įvardija; laisvo teksto analizės nėra | Atitinka instrukciją, tačiau nėra automatinio jautrių duomenų filtro. Neteigti, kad tokie duomenys techniškai negali būti gauti |

Lead source_path imamas tik iš same-origin Referer pathname, be query. Agregavimo endpoint leidžia tik viešą tikslų kanoninį puslapio kelią ir tris įvykius. Formos pateikimas pats nėra lankomumo įvykis. Invalidūs duomenys atmetami prieš DB; honeypot užpildymas grąžina 200 be įrašymo. Pranešimo sėkmė route atsakyme tiksliai įvardyta kaip perdavimas pašto serveriui, o ne operatoriaus perskaitymas.

## Konkretūs neužbaigti paleidimo faktai

BDAR 13 straipsnis apima valdytojo tapatybę / kontaktus, tikslą ir pagrindą, gavėjus, taikomus perdavimus, saugojimą bei teises. 7 straipsnis aktualus, kai remiamasi sutikimu. Čia tų teisinių faktų kodo pasirinkimas nepakeičia. [BDAR oficialus tekstas, 7 ir 13 straipsniai](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679).

| Gap | Konkreti šio snapshot spraga | Reikalingas tikras užbaigimo įrodymas |
| --- | --- | --- |
| PRIV-01 valdytojo identifikavimas | Viešai tik brand ir patvirtintas el. paštas; faktinio duomenų valdytojo tapatybė dokumentuose nepatvirtinta | Privati operatoriaus identifikavimo ir pareigų peržiūra prieš teigiant production readiness. Tai private gap; nekeisti brand į numanomą bendrovę ir vartotojo neklausinėti pakartotinai |
| PRIV-02 užklausos pagrindas | Privalomas checkbox „Sutinku...“ ir consent_at, bet politikoje nėra konkretaus užklausos tvarkymo pagrindo; bendras „jeigu sutikimu“ tekstas jo nenustato | Operatorius viduje pasirenka tikrai taikomą pagrindą ir suderina formos bei politikos kalbą. Jei išlieka sutikimas, peržiūri atšaukimo eigą ir įrodomą parodytą tekstą. Jei kitu pagrindu, checkbox nelaikomas universaliu teisiniu sprendimu |
| PRIV-03 saugojimas | Lead route ir schema turi įrašymo laiką, bet neturi retention / TTL. Atlikta scripts paieška rado tik testinių lead įrašų ištrynimą, ne veiklos saugojimo procesą | Faktinės DB, pašto dėžutės, logų ir backup terminų / kriterijų taisyklės; ištrynimo ar periodinės peržiūros savininkas ir patikrintas vykdymas. Neįrašyti išgalvotų 30 / 90 dienų |
| PRIV-04 procesoriai ir gavėjai | Kode yra Cloudflare env.DB / sockets ir sąlyginis Hostinger SMTP adapteris arba LEAD_EMAIL. Tai parodo galimus adapterius, ne production sutartis, regioną, subprocesorius ar įjungimą | Tikro pasirinkto hosto, DB, pašto, logų / backup paslaugų inventorius ir sutartiniai / perdavimo faktai. Politiką papildyti tik patvirtintais gavėjais ar kategorijomis, ne kodo hostname kaip deployment faktu |
| PRIV-05 duomenų teisės praktiškai | sales el. paštas pateiktas ir VDAI paminėta; teisių aptarnavimo procesas netirtas | Kas skaito šį paštą, saugiai randa užklausą, pateikia / taiso / ištrina atitinkamas kopijas ir atsako. Atlikti vieną kontroliuojamą praktinį bandymą su testiniais duomenimis |
| PRIV-06 pristatymas | SMTP / binding env reikalingas. Recipient gali būti pakeistas `mailRecipientsBySite`, todėl viešo kontaktinio email sutapimas savaime neįrodo tikro gavėjo. `notified` reiškia serverio priėmimą | Saugiai patikrinti veikiančią production binding / recipient konfigūraciją ir kontroliuojamo laiško gavimą numatytoje dėžutėje. Be tokio įrodymo nerašyti „laiškai pristatomi“ ar „forma veikia production“ |
| PRIV-07 infrastruktūros logai | Programos skaitiklių lentelė neturi IP / UA. Tačiau serveris skaito UA bot filtrui, HTTP hostas gauna technines užklausos savybes | Tikros edge / hostingo logų ir jų saugojimo nuostatos. Viešas tekstas apie identifikatoriaus nenaudojimą turi likti apribotas šiems skaitikliams, ne visa infrastruktūra |
| PRIV-08 vietinė saugykla ir skaitikliai | localStorage išlieka po siuntimo ir neturi TTL. Automatinis pageview POST vyksta be pasirinkimo (išskyrus DNT / GPC). Be cookies nepakanka automatiškai įrodyti ePrivacy išimties | Dokumentuota būtinybės analizė kiekvienai funkcijai pagal tikrą įgyvendinimą ir jurisdikciją; frontend cookies / storage / network inventorius. Jei analizė nustato nebūtiną technologiją, prieš paleidimą ją išjungti arba įgyvendinti reikalingą naudotojo pasirinkimą |
| PRIV-09 consent teksto atsekamumas | DB saugo consent_at, bet ne parodytos formos / politikos versijos identifikatorių | Jei veiklos pagrindas bus sutikimas, susieti įrodymą su parodytos kalbos versija ir išlaikyti prieinamą jos snapshot; nekurti fiktyvaus istorinio sutikimo įrašo |

EDAV galutinės 2/2023 gairės paaiškina, kad terminalo informacijos laikymas / prieiga apima įvairias technologijas ir nepriklauso vien nuo cookies ar duomenų asmeniškumo. Gairės pačios nesuteikia konkrečiam produktų sąrašui automatinės išimties. [EDAV galutinės gairės, 2024-10, 2.1 ir 2.6 skyriai](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf).

VDAI 2026-07-23 primena, kad nebūtinoms slapukų / sekimo technologijoms reikia tinkamo aktyvaus pasirinkimo ir aiškios informacijos. Šio katalogo localStorage sąrašas įrašomas naudotojui paspaudus įtraukimo veiksmą; tai svarbus būtinybės vertinimo faktas, bet ne visas teisinis vertinimas. [VDAI aktualus priminimas](https://vdai.lrv.lt/lt/naujienos/vdai-primena-butina-uztikrinti-tinkama-slapuku-ir-kitu-sekimo-technologiju-naudojima-Xad/).

## Tikslūs galimi redakciniai pataisymai be naujų verslo faktų

Šie tekstai yra privataus auditavimo pasiūlymai, ne studio pakeitimai ir ne galutinė privatumo politika:

- Vietinė saugykla: „Pasirinktų produktų kodai, pavadinimai, puslapių nuorodos ir kiekiai laikomi šios naršyklės vietinėje saugykloje. Vardas ir el. paštas į ją neįrašomi. Po užklausos pateikimo produktų sąrašas lieka naršyklėje. Jį galite išvalyti užklausos puslapyje pašalindami kiekvieną poziciją arba ištrynę svetainės duomenis naršyklėje.“
- DB metadata: „Kartu su užklausa įrašomas jos pateikimo laikas, puslapio kelias, užklausos identifikatorius ir priėmimo bei pranešimo būsena.“ Formos pagrindo / sutikimo kalbą pridėti tik po PRIV-02 sprendimo.
- Perdavimas: „Formos atsakymas parodo, ar užklausa išsaugota ir ar pranešimas priimtas operatoriaus pašto serveryje.“ Tai atitinka handler atsakymą ir nesuteikia inbox garantijos.
- VDAI paminėjimą susieti su [oficialiu skundų paaiškinimu](https://vdai.lrv.lt/lt/veiklos-sritys-1/skundu-nagrinejimas/), kaip jau skatina dabartinė politika.

## Likusi techninė patikra

Root atlieka actual frontend patikrą: švari naršyklė → jokio product localStorage įrašo iki įtraukimo; įtraukimas → tik keturi produkto laukai; pozicijų šalinimas ir postsubmit išlikimas; DNT / GPC → nėra įvykių POST; be signalų → tik event / pathname; validus formos POST → expected DB row ir pranešimo būsena; neveikiantis paštas → sąžiningas išsaugojimo / pristatymo atsakymas. Šiame supporting audite jokios užklausos neišsiųstos ir DB nekeičiama.

Politikos peržiūra apėmė tikslų 18 puslapių preview šeimos privatumo snapshot. Naujas 1408 produktų katalogas savaime šių spragų neužbaigia. Kol nėra tikrų veiklos faktų ir production patikros, galime tvirtinti **vietinio prototipo kodo ir teksto suderinamumą su šiomis ribomis**, o ne viešo paleidimo parengtį.
