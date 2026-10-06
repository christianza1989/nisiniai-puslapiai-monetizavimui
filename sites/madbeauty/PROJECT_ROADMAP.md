# Madbeauty — aktualus roadmap entrypoint

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.

Tęsiant darbą pirmiausia skaityti šį dabartinį registrą, IMPLEMENTATION_STATUS, SCREEN_STATUS ir A–Z blockers. Naujos funkcijos neturi savaime įjungti gyvo email/FB/voice/mokėjimų/deploy.


## Istoriniai įrašai (ankstesnė apimtis; ne dabartinis priėmimas)

# Madbeauty — aktualus projekto kelias

**Aktualu 2026-10-05:** savininko užsakymas išplėstas iki vietinio veikiančio email-only meistro / kliento piloto ir galutinio 70 ekranų produkto. [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) yra pradžios taškas su per-modulio apimtimi, 8788 entrypoint, actual backend / 120 vaizdų / common 3 gidų priėmimu ir likusiais vartais. [PLATFORM_BUILD_CONTRACT.md](../../PLATFORM_BUILD_CONTRACT.md), [BACKEND_DECISION.md](BACKEND_DECISION.md), [CONTENT_READINESS.md](CONTENT_READINESS.md), [CORE_FEEDBACK.md](CORE_FEEDBACK.md). Darbas IN_PROGRESS; tikras paleidimas ir paklausa nepatvirtinti.

**Toliau paliktas pradinis frontend etapo roadmap kaip istorinis planas. Jo NEXT / PLANNED ir frontend-only ribos nepakeičia aukščiau nurodyto aktualaus pavedimo.**

2026-10-05. Vienas pradžios taškas kitam kūrimo etapui. Savininkas pasirinko [homepage-modern-v2.png](design-previews/homepage-modern-v2.png) kaip homepage vizualinį pagrindą. Tai HUMAN_SELECTED_DESIGN_REFERENCE, ne funkcionalumo, turinio faktų ar paleidimo patvirtinimas. Failas jau išsaugotas projekte; nekeisti originalo, naujus variantus versijuoti atskirai.

## Aktualūs autoritetai

| Klausimas | Dokumentas |
|---|---|
| Produktas, nemokamas pilotas, plėtros ribos | [PLATFORM_PLAN](PLATFORM_PLAN.md), [BUSINESS](BUSINESS.md) |
| Pilna būsima sąsaja ir Fresha sprendimų atranka | [FINAL_PROTOTYPE_PLAN](FINAL_PROTOTYPE_PLAN.md), [70 ekranų inventorius](SCREEN_INVENTORY.json) |
| Paspaudžiamos platformos kūrimo etapai | [PROTOTYPE_ROADMAP](PROTOTYPE_ROADMAP.md) |
| Savininko pasirinktas dizainas | [DESIGN](DESIGN.md), [pasirinktas homepage](design-previews/homepage-modern-v2.png) |
| Demo on/off, fixture ryšiai, laikrodis | [DEMO_DATA_CONTRACT](DEMO_DATA_CONTRACT.md) |
| Media, ikonos, valdikliai | [ASSET_PLAN](ASSET_PLAN.json), [UI pagrindas](prototype/README.md) |
| SEO/GEO, filtrų URL ir indeksavimas | [SEO_GEO_PLAN](SEO_GEO_PLAN.md), [URL_POLICY](URL_POLICY.json) |
| Straipsniai, klasteriai ir CTA į paslaugas | [CONTENT_LINKING_PLAN](CONTENT_LINKING_PLAN.md), [CONTENT_MAP](CONTENT_MAP.json) |
| Web, PWA ir būsima programėlė | [MOBILE_ARCHITECTURE](MOBILE_ARCHITECTURE.md) |
| Klientų ir meistrų pritraukimas | [ACQUISITION](ACQUISITION.md) |

Nauja juoda/balta/violetinė kryptis pakeičia ankstesnį serif/koralų/šalavijo stilių. Fotografinis hero, paieškos hierarchija ir sekcijų ritmas atkuriami tikru HTML, ne naudojant visą PNG kaip foną. Demo įmonių kodai/adresai,2024 datos, statistika, social paskyros ir netikri registracijos pažadai iš rasterio neperkeliami. Tekstą susieti su patvirtintais faktais ir adapterio būsena. Permatomas blur/autohide header turi klaviatūros, reduced-motion ir be-blur fallback.

## Darbų eilė ir būklė

| Eilė | Darbas | Dabar | Baigimo sąlyga |
|---|---|---|---|
| 1 | Komponentai, seed, adapteris, clock, media | Pagrindas IMPLEMENTED_LOCAL | 9 foundation testai; naujos krypties tikslinė desktop/mobile/header patikra atskirai |
| 2 | Homepage pagal pasirinktą vizualą | NEXT / NOT_IMPLEMENTED | Tikri responsive komponentai, kiekviena sekcija, paieška perduoda būseną, visi CTA turi kelią |
| 3 | Paieška, filtrai, solo/salono profilis, demo vizitas ir kliento paskyra | PLANNED | Pilnas kliento kelias, back/forward, paslaugų variantai, intervalai, error/empty/stale/conflict |
| 4 | Meistro onboarding, dienos/savaitės kalendorius, pasiūla, komanda, operatorius | PLANNED | Taisyklingi scoped demo ryšiai, redagavimo ir approval būsenos, mobile agenda |
| 5 | Trys pilni gidai, hub/katalogų puslapiai, autoriai/redakcija, pagalba ir teisiniai puslapiai | PLANNED | Temos vaizdai, useful content, internal/external ir service/city CTA, turinio faktų peržiūra |
| 6 | Visos sąsajos SEO/URL/schema ir A–Z/UX/mobile/Lighthouse patikra | PLANNED / NOT_RUN | Įrodymai kiekvienam vartui; dummy neindeksuojamas; realūs trūkumai užregistruoti ir pataisyti |
| 7 | Tikras backend ir duomenys | PLANNED | Auth/tenancy, patvarios užklausos ir delivery; availability/atomic booking priimami atskirai, ne vien adapterio URL pakeitimas |
| 8 | Paleidimas ir matavimas | PLANNED / UNVERIFIED | Tikri patvirtinti teikėjai/faktai, production demo exclusion, tinkamas hostingas, domenas, privatumas, kontaktų pristatymas ir atskiri demand rodikliai |

Pirmiausia visa privati frontend demonstracija. Ji gali parodyti būsimos platformos funkcijas iki live plėtros sprendimo; fiktyvūs profiliai nevirsta realia pasiūla. Nemokami pradiniai profiliai ir naudojimas išlieka; mokami atsiliepimai atidėti. Backend/paleidimas neturi nepatikrinto neribotai nemokamos infrastruktūros pažado.

## Kitas konkretus rezultatas

Tikras responsive homepage pagal išsaugotą vizualą, prijungtas prie esamo demo adapterio. Darbo apimtis apima desktop/mobile header, hero ir keturių laukų paiešką, kategorijas, rezultatų korteles, paaiškinimą, gidų bloką, meistrų bloką ir footer. Laikų pasirinkimas turi atskirti UI demonstraciją nuo gyvos registracijos. Trūkstamus temos assets kurti atskirai per ImageGen/MEDIA_CORE; viso rasterio gabalais neatkurti turinio.

Pabaigus homepage toliau vykdyti 3–6 eilės darbus. Pilnas 70 ekranų rezultatas dar nėra padarytas. Planai yra paruošti kūrimui, bet žinių spragos dėl tikros pasiūlos, vykdymo, išlaidų ir paleidimo neišgalvojamos.
