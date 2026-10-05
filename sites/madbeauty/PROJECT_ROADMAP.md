# Madbeauty — aktualus projekto kelias

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
