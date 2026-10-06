# Superiora turinio perdavimo įrodymai

2026-10-06. Savininkas patikslino, kad AI_teacher lieka atskiras Next.js/Vercel projektas; prie bendros sistemos prijungiama tik straipsnių eiga. Sesija `01a0e6f0-f346-7b50-9c57-4edc805c917a` valdo svetainės kodą, importą ir savo pilną QA. Root valdo tik studijos turinį ir bendrą eksportą. Tai nėra visos platformos, Vercel deployment ar vaikų piloto priėmimas.

## Tikri paruošti straipsniai

| Page ID | Viešas slug | Klausimas |
|---|---|---|
| 31fad6f3-2631-4637-9d2d-674ac11d35c4 | mokymosi-gidai/padeti-namu-darbams-neatliekant-uz-vaika | Kaip padėti neperimant sprendimo? |
| 49ce210c-0e07-4d8e-a7f9-26b5a456788d | mokymosi-gidai/fotografuoti-uzduoti-ir-bandyma | Kaip paruošti įskaitomą užduotį ir bandymą? |
| a53eb15c-0399-4767-b4c9-ad7f1263c0bd | mokymosi-gidai/kai-vaikas-nesupranta-pirmas-zingsnis | Kaip rasti vieną įveikiamą pradžią? |

Originalūs tekstai yra šio katalogo `01-`, `02-`, `03-` Markdown failuose. Patvirtinta paketo versija išlaiko pilną tekstą; tai ne tušti SEO ruošiniai. Konteksto anchor ID `9f0d62bc-bfa2-4ed8-8299-996ddf03ac70` būtinas V1 paketui; jis neperrašo Next homepage. Gidai susieti tikrais ID; nuorodas vartotojui pateikia bendros eligible/contextual funkcijos ir Next adapteris. Pradiniai gidai paruošti; pusmečio policy 2/sav. nėra jau sugeneruotas pusmečio planas.

## Šaltinių ir faktų peržiūra

Root 2026-10-06 atvėrė ir perskaitė šiuos pirminius šaltinius, ne tik paieškos ištraukas:

- [EEF Homework](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/homework): užduoties paskirtis, ryšys su pamoka, kokybė ir feedback. EEF vidurkiai neskelbiami kaip Superiora ar konkretaus vaiko pažangos įrodymas.
- [UNICEF Parenting in the AI age](https://www.unicef.org/mena/parenting-ai-age): atsakingas naudojimas mokantis ir mokymosi veiklos perleidimo sistemai rizika. Originalūs dialogai nėra ištirtas veiksmingumo metodas.
- [UNICEF Child-centric AI](https://www.unicef.org/digitalimpact/stories/child-centric-ai): minimalūs reikalingi duomenys ir ribotas saugojimas. Fotografavimo checklist yra originalus pritaikymas, ne teisinės atitikties ar produkto privatumo sertifikatas.

MB Pinet / info@pinet.lt patvirtinimas patikrintas originaliame žmogaus 2026-09-30T08:32:16.124Z pranešime, ne kito agento atpasakojimu. Mokytojo sesija patikrino tą patį pranešimą. Nėra išgalvoto pedagogo, atsiliepimų, telefono, įmonės kodo, adreso, diagnozių, pažymių ar efektyvumo pažadų. Brand Superiora ir esamas host mokytoja-ai.vercel.app suderinti su sesija; superiora.lt prijungimas nepatvirtintas.

## Iliustracijos ir actual peržiūra

Sugeneruotos trys originalios iliustracijos su built-in ImageGen. Kiekvienos paskirtis skirtinga: vaikas pats rašo ir suaugęs klausosi; telefonas fotografuoja geometrinę užduotį; vaikas nupiešia vieną trikampį. Root apžiūrėjo visas originalias iliustracijas ir actual studijos draft HTML ekranus. Tai nėra tikrų vaikų ar klientų nuotraukos, realios programos screenshot ar vartotojo duomenys. Pagrindinė veikla matoma, nėra logotipų ar asmens duomenų; alt aprašo iliustraciją. Kilmė nerodoma dekoratyviu ImageGen badge.

Originalai ir tikslūs prompt TXT privačiame `content-studio/data/media-originals/mokytoja-ai/source-20261006/`. Bendras `saveResponsiveAsset` sukūrė 5 WebP variantus kiekvienam gidui: 15 tikrų optimizuotų failų. Privatus `media-handoff.json` saugo dimensijas ir SHA; originalūs PNG į Git ar external bundle neperduodami.

Root savo laikinu loopback 4318 serveriu CUA naršyklėje perskaitė visus tris pilnus tekstus ir anchor: H1/H2, sąrašus, išorinių šaltinių tikslus, mailto, tikrus susijusių gidų ID ir įkeltus vaizdus. Trečio gido actual currentSrc buvo 780×519 WebP, complete=true. Tai studijos desktop preview, ne Next responsive/rendering/Lighthouse PASS. Šias target patikras vykdo svetainės savininko sesija.

Po review tik pradinė publikavimo data pakeista į `2026-10-06T17:37:25.589Z` ir užbaigtos faktų/medijos pastabos. Turinys ir vaizdai nepakeisti. Ši data yra initial eligibility po peržiūros, ne tariamas ankstesnio deployment laikas. Per esamą `recordEditorialReview` visoms 4 revizijoms įrašyti konkretūs šešių sričių įrodymai; per `approveReviewedBatch` patvirtinta visa susieta partija ir `releaseContent` sukurtas immutable release. Istorinių kitų nišų approval/fingerprint nekeisti.

## Tikras paketas ir perdavimas

- Site ID `mokytoja-ai`, canonical `mokytoja-ai.vercel.app`, schema V1.
- Release katalogas: `content-studio/output/releases/mokytoja-ai/9406cc03-b124-49f8-a364-f7c197f61f63/`.
- Originalių content-package.json baitų SHA-256: `b2415a82d23181ac9cf0c12847df0e25bf8f3f05efbce052d717e8bc6fd39c71`.
- External bundle: `research/ai-teacher-content-integration-2026-10-06/bundle-9406cc03/`.
- Bundle ID `f31ca9b1bb4d8524f341bdb47ae81025d67f45b935dd0de21f3f6167e69d2aa4`.
- 4 puslapiai, 15 WebP, 6 exact common SDK failai; privatus review manifest neperduotas. Būsena `exported-not-imported-not-deployed`.

2026-10-06 bundle kelias, SHA ir priėmimo ribos tiesiogiai perduoti autorizuotai mokytojo sesijai. SDK savų SHA sutapimas nėra kodo autentiškumas: Next importeris turi priimti tik savo reviewed/pinned trusted versiją. Actual importas/deployment ir svetainės galutinis priėmimas šiame root kvite dar nepatvirtinti. Vercel lieka atskiras; jokios registrų, studentų runtime, DNS, mokamos paslaugos ar branduolio migracijos nėra.

## Core patikros

Nauji 3 external export testai ir stabilaus site ID registracijos testas PASS; originalios studijos pilnas rinkinys 36/36 PASS (18,618 s). Testuose tikrinami exact paketo baitai, standalone SDK importai, publication boundary, wrong ID/host, altered text/media, no-overwrite ir senų ID suderinamumas. Synthetic Madbeauty fixture nėra Superiora target UI/SEO/piloto įrodymas. Testų žalias log, draft JSON, originalai ir raw bundle vietiniai, Git neįtraukti; kodas ir atrinkti MD perduodami atskira šaka.

Final clean-checkout QA: 36/36 studio PASS (12,606 s), companion core 49/49 PASS (6,086 s) ir realus SEO smoke greitossvetaines 7 URL PASS. Vienas naujo registracijos testo ciklas 35/36 FAIL dėl klaidingo naujo testo lūkesčio apie senų ID trumpinimą; esamas helper trumpina iki 60, lūkestis pataisytas, source log išsaugotas. Pirmas SEO smoke negalėjo jungtis į neveikiantį default8787; root savo švariame checkout paleido atskirą8928 ir patikrino sėkmingai. Tai nereiškia mokytojo target SEO ar deployment PASS. Root nustatė ir perdavė Next hero/Article image spragą: actual V1 media priskirta, bet body image blokų nėra; atsakinga sesija pataisė bendrą hero pasirinkimą nekeisdama patvirtintų baitų. Target patikra tęsiama jos izoliuotame3240.

## Vėlesnė target peržiūra ir datos revizija

Originalus bundle tikrai importuotas į AI_teacher, root patikrino exact originalių paketo baitų SHA. Visus3actual Next gidus perskaitė desktop irmobile, patikrino iliustracijas, schemas, nuorodas bei public trust puslapius. Detalės ir neužbaigti target/launch vartai — [PARENT-TARGET-REVIEW.md](PARENT-TARGET-REVIEW.md). Shared code perduotas [PR9](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/9), main `e2020125ac8868c4ba65640210031a712e361e45`.

2026-10-06T18:10:55.717Z nauja tikra review/approval/release revizija perplanuoja pradinį visų4įrašų publishAt į2026-10-06T18:30:00.000Z prieš pirmą jų viešą deployment. Full tekstas, ID, medija ir nuorodos nepakito; ankstesnis kvitas ir release istorija išsaugoti. Naujas release `26de29d9-7001-40eb-a327-55b83294f3f3`, package SHA `99ee288dea54b1896b5f02cfcecb0b3db05aa5b03716ffe2a5b82effaada88a8`, bundle `fd5b7d28379cd4b588d0ade6d36ee9414468b2f3a6f15eb98369adb3c2e873f9`; actual bundle perduotas source sesijai. Būsima planinė data dar nėra first-publication/deployment įrodymas. Statusas šiame taške exported-not-imported-not-deployed.

Vėliau root patikrino exact naujo paketo importo SHA. Source deployment `dpl_8nb6URHg4FRsXDcfJdTAyhsyUfcq` READY18:26:52Z; actual live before18:27 irafter18:30:38 bandymai patvirtino3gidų/15WebP publikavimą pagal datą be naujo deploy. Source atšaukė nepagrįstą beforeXML sitemap stebėjimą dėl checker MIME decode; beforeliveXML lieka UNVERIFIED, o actuallocalbefore/afterXML irliveafterXMLPASS. Root livebrowser matė3indexvaizdus, namedlinks, du pilnusgidus, tikrą Article datą bei normalų native navigacijos kelią. Finalfull-with-targeted-lint-repairPASS1421testas; originalfullFAIL nepanaikintas. Visosplatformosperformance/WCAG/realchildrenpilot/periodicgeneration vartai dėl šio turinio priėmimo neužsidaro. Žr. išsamią parent peržiūrą.
