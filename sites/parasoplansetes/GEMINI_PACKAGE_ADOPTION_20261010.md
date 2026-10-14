# Gemini paketo integravimas — 2026-10-10

Savininko pateiktas `C:/Core/parasoplansetes-gemini-paketas-20261010/result/` paketas sutikrintas su pagrindinio projekto patvirtinta versija. Originalūs failai ir jų SHA256, palyginimas, prieš pakeitimus buvę šaltiniai, peržiūrų įrašai ir ekrano nuotraukos saugomi privačiame `output/parasoplansetes-package-adoption-20261010/`. Mokamų modelių, vaizdų ar tyrimų kvietimų šiame darbe neatlikta.

## Planas ir integravimo sprendimas

1. Abiejų repo canonical freshness: core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, companion main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`, abu esamų savo šakų bazėse. Esami darbai išsaugoti; prieš perdavimą pakartoti handoff ir exact-staged safety.
2. Patikrinti tikslų kandidato turinį, ne vien schemą. `candidate.json` SHA256 `b3103520b115c204dd5ff18260d150dcf10cb149875e2fc4e93ddb72499091bb` sutampa su ankstesniu Gemini juodraščiu. STRUCTURE_ONLY_PASS nėra faktų ar kalbos patvirtinimas. Išlaikyti jau peržiūrėtos Gemini versijos pataisymai apie parašo lygius, laiko žymas, licencijas, modelius ir tikslius nuorodų linksnius. Dėl jų galutinių29 puslapių body ir13 puslapių links nėra pažodinė žalio kandidato kopija; title ir description sutampa su pateiktu kandidatu.
3. Papildomoje viso galutinio teksto peržiūroje šešiose pastraipose pašalinti nepagrįsti saugojimo/priežiūros garantijų, bendri rašiklių ir naršyklių teiginiai bei „renderinimas“. Keturi paveikti puslapiai: API pasirinkimas, dokumentų saugojimas, priežiūra ir nextGen Pad5. Tikslūs before/after ir priežastys yra `content-corrections.json`.
4. Pritaikyti sąsają tik StepOver šakoje, išlaikant kitų nišų tekstus. Patikrinti tikrą realizuotą kompiuterio/telefono vaizdą ir klaidų būsenas, sutvarkyti per mažus pokalbio šriftus. Pradinio15/13/11/10px mišinio vietoje naudojami bendros sistemos teksto vaidmenys: pokalbio tekstas16/17px, pagalbiniai14px, mygtukai15px, trumpos žinučių etiketės13px. Formos atsakymo puslapis dabar naudoja Manrope, StepOver spalvas,16/17px tekstą ir26–32px H1. Kitų nišų CSS ir formos atsakymo stilius išsaugoti.
5. Native peržiūra → atominis visų46 susietų puslapių patvirtinimas → immutable release → bendras public importer → build → esamas Worker → nuotolinės patikros. Privatų studio būvį perkelti tik patikrinus, kad nuo backup jis nebuvo pakeistas.

## Sąsajos ir ALT aprėptis

UI failas SHA256 `e25fb752382bdef7eb93e3a384e2023b9a91a9defb0974fe954527b3836e1d8f`:157 įrašai.126 original/replacement nesiskyrė;31 siūlytas pakeitimas.10 jau buvo pagrindiniame rendereryje,21 naujai pritaikytas widget, ArticleMeta ir formos route. Galutinė patikra:27 tikslūs paketo pakeitimai,4 peržiūrėtos išimtys,126 nepakeisti tekstai,0 trūkstamų. Tai nėra157 naujų perrašymų.

| Įrašas | Patikslinimas | Priežastis |
| --- | --- | --- |
| ui-0099 | Išlaikyta pasirinktinio vėlesnio atpažinimo reikšmė | Įrenginio atmintis nėra besąlygis viso pokalbio saugojimo pažadas. |
| ui-0139 | „remiantis nurodytais šaltiniais“ | Tarp šaltinių yra Europos Komisija ir teisės aktai, ne vien gamintojas. |
| ui-0154 | „Atsakymui naudosime jūsų nurodytą el. pašto adresą“ | Administratoriaus pranešimo priėmimas neįrodo kliento atsakymo pristatymo. |
| ui-0155 | Atskiri sakiniai apie vietinį išsaugojimą ir neišsiųstą laišką | Vietinė saugykla nėra priežastis, kodėl neveikia SMTP. |

ALT failas SHA256 `d67f88d4d12f693af72adcae04a64269da9d7cde91386e9838b2290a8e35a327`: visi47 aprašų šeimų tekstai jau buvo pritaikyti ankstesnėje native laidoje. Sutikrinti215 variantų ALT, jų ID atitikmenys ir kiekvieno viešo WebP SHA256:0 neatitikimų. Naujų nuotraukų, naujų medijos ID ar antrų kopijų nekurta.

Išoriniai URL, etiketės ir paaiškinimai native šaltiniuose sutampa su kandidatu, išskyrus kelių pasirašytojų gido anksčiau patikrintą šaltinį, kurio tuščias kandidatų sąrašas nepašalintas. Esamų verified žymų nenustatyta iš naujo. Pirminių šaltinių2026-10-10 kvitai pernaudoti iš ankstesnio darbo; naujos šaltinių užklausos ar naujas EUR-Lex patikrinimas neįvardijami kaip atlikti.

## Laida ir išsaugojimas

Laida `cb6be84b-426e-45d2-a117-4bd6c1cf2880`, paketo SHA256 `9d94e82ae07be3a28406373e6b4f0c9808549e26a057e9b81aad7633f73e2cfa`.46 dabartinės revizijos turi atskirus šešių sričių agento editorialReview ir native atomic approval įrašus. Tai Codex saviredakcija, ne nepriklausomo kalbininko sertifikatas ar savininko approval.

Pritaikytas kandidato `offer`. URL/ID/publishAt, originalūs215 medijos variantai ir visi kitų9 nišų paketai išsaugoti. Nepaskelbtas47-asis tikro kliento piloto puslapis liko identiškas. Native47 puslapių privatus būvis saugiai perkeltas į įprastą studijos duomenų katalogą; backup išlaikytas. Dabar matomi24 puslapiai,22 būsimi. Visi46 atsivers iki2026-11-14 pagal ankstesnį grafiką.

## Faktinės patikros ir ribos

- Public66 core ir5 preview adapterio testai, TypeScript, pakeisto ArticleMeta/formos route ESLint ir build PASS. Bendras SEO smoke PASS; jo default greitossvetaines patikra nėra StepOver ataskaitos pakaitalas.
-157 source UI įrašai,47 ALT šeimos/215 failų SHA, visų46 puslapių tikslūs inline anchor, title/description, datos ir kitų9 paketų baitai PASS. Common importer priėmė originalią immutable laidą.
- Vietinis Worker: visų46 maršrutų tinkamas200/404, canonical, šriftai, skriptai, leidžiami ir būsimi vaizdai, izoliuoti keliai, cross-originPOST403, robots/sitemap/llms PASS. Po paskutinių stilių pataisų patikra pakartota.
- Tikra naršyklės gido ir ArticleMeta peržiūra; pokalbio pradžia ir nepasiekiamumo būsena.390px,320px ir1280px plotyje panelis neperžengia ekrano. Pagalbinis tekstas išmatuotas14px, įžanga16/17px. Formos400 klaidos puslapis patikrintas320px su sintetiniais duomenimis; netinkamas vardas atmetamas iki DB ar laiško. Naujausios ekrano nuotraukos ir metrikos saugomos output.
- Pokalbis vietoje tikrintas su įjungtu vietiniu UI ir be core URL:503 įrodo tik klaidos atvaizdavimą, ne agento veikimą. Contact popup/save, aktyvių žinučių ir tikro laiško būsenų per šį bandymą nepasiekta; jų tekstai tikrinti šaltinyje. Balsas, modeliai ir SMTP nekviesti.
- Widget pilnas ESLint vis dar rodo ankstesnį react-hooks/set-state-in-effect radinį ir5 įspėjimus. Tai nėra šio teksto pakeitimo regresija ar pilnas lint PASS. Su vien šia žinoma taisykle išjungta naujų klaidų nėra. Impeccable detektorius grąžino[]; tai nepakeičia tikros peržiūros.
- Tikras200% naršyklės zoom išlieka UNVERIFIED. Nėra naujo visos svetainės prieinamumo, Lighthouse, kalbininko ar Google pozicijų priėmimo teiginio. Pradinės jungties/schemos-helper klaidos ir jų taisymas nelaikomi galutine patikra.

## Viešas diegimas

Tikslas — esamas viešas `https://parasoplansetes-preview.pinet-azprekyba.workers.dev/`, tas pats D1 `98f4d3c5-11a4-4d19-a6ec-d568a96da0f7`. Jokio DNS/custom domain, naujo mokamo ištekliaus ar runtime aktyvavimo. Current Cloudflare settings ir Wrangler OAuth workers_scripts:write patikrinti prieš deploy. `--keep-vars` išsaugo ankstesnius vars/secret, naujas config išlaiko chatOFF, voiceOFF ir formosSMTP OFF. Preview noindex/nofollow ir robots Disallow lieka; domeno/indexavimo, nuolatinio chat backend ir formos pašto paleidimas atskiros priklausomybės. Traces ankstesniame Workeryje išjungti; ši siaura laida observability nustatymų neatnaujina.

Paskelbta Worker versija `e25d725d-16c1-4f9e-8770-928c744d3f00`. Dry-run PASS, tikras deploy PASS, galutinės284 nuotolinės HTTP patikros PASS,0 klaidų. Paskutinės vietinės286 HTTP patikros PASS (vietinis pokalbio UI įjungtas, todėl papildomi client assets); tai ne nuotolinio pokalbio veikimo bandymas. Po diegimo Cloudflare settings patvirtino tas pačias keturias OFF reikšmes, D1 ID ir išsaugotą secret vardą. Tikras viešas gidas naujame naršyklės skirtuke rodo atnaujintą ArticleMeta ir peržiūros datą; screenshot `public-guide-final.png`.

Public source `29d27c1579c2ba139a239e349f3afce8506d7aa0` perduotas PR17;7 tiksliai atrinktų staged failų safety PASS. Core ataskaita ir WORKSTREAMS perduodami PR46 po atskiro handoff/staged safety. Atkuriama prieš šį darbą buvusi Worker versija `11095d04-6e8a-4226-b8bc-369d317f09e8`; ankstesnė native laida1bf7f1c5 ir importo paketo backup išsaugoti. DB duomenys nėra Worker rollback dalis. Main savarankiškai nesujungiamas.
