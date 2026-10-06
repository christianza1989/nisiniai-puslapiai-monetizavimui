# madbeauty.lt — vietinės platformos rezultatas

2026-10-06. Savininko autorizuotas vietinis platformos funkcijų ir normalios desktop/mobile sąsajos darbas užbaigtas su demo medijos išimtimi. Patvarus email-only auth, meistro/kliento paskyros, kalendorius, atomic booking, kliento užklausų istorija, pokalbiai ir operatoriaus moderavimas. [Atidaryti vietinę platformą](http://127.0.0.1:8788/meistrui/kalendorius).

**74PASS/0FAIL**,69individualios normalios desktop/mobile peržiūros; public-gallery OWNER_STOPPED. Lighthouse mobiliajam prisijungusiam kalendoriui94/100/100/66. Aktuali [būklė](madbeauty/IMPLEMENTATION_STATUS.md), [priėmimas](madbeauty/uiux/ACCEPTANCE.md), [kelionės](madbeauty/uiux/JOURNEYS.md), [70paviršių matrica](madbeauty/SCREEN_STATUS.json), [likusios priklausomybės](madbeauty/uiux/REMAINING_GAPS.json).

Fizinis zoom/OSmotion/production įrenginiai ir pilna planšetės matrica UNVERIFIED. Gyvas paštas, DNS/hosting/deploy, tikri teikėjai ir paklausa atskiri. A–Z7,6/gateReady=false nepakeistas; nėra10/10ar production-ready teiginio.

## Istoriniai tyrimai / planai

# madbeauty.lt

2026-10-05. Fazė 1, RESEARCH_COMPLETE / PLATFORM_PROPOSED. Savininkas pranešė įsigijęs domeną, DR18; nepriklausomai nepermatuota.

Kryptis: nemokama grožio paslaugų platforma, pirmas segmentas Vilniaus nepriklausomi nagų meistrai. Vientisas pilnos marketplace + salono registracijos sistemos planas; startui tikri patvirtinti profiliai, palyginamos paslaugos, vizito užklausos / esamos meistro booking nuorodos. Nuosavas kalendorius ir self-service po paklausos / vykdymo plėtros vartų, bazinis pilotas taip pat planuojamas nemokamas.

Numatytas operatorius MB Pinet / info@pinet.lt pagal bendrą config. Naujo domeno registry įrašas, teikėjų kontaktai, inbox pristatymo bandymas, hostingas ir launch dar neatlikti; jokio kitos nišos telefono/adreso. Jokių patvirtintų mūsų salonų, partnerių, jų kainų, darbo vietų ar laisvų laikų šiame tyrime nėra.

- [Rinkos tyrimas](../research/madbeauty-2026-10-05/RESEARCH.md): 11 platformų oficialūs puslapiai, LT pasiūlymai, realus kliento kelias, free alternatyvos, ekonomika ir sprendimą keičiantys faktai.
- [BUSINESS](madbeauty/BUSINESS.md): mokėtojas, reali pirmos fazės vertė, nemokamo starto ekonomika ir tęsti/stabdyti kriterijai.
- [PLATFORM_PLAN](madbeauty/PLATFORM_PLAN.md): ekranai, duomenys, tenant izoliacija, booking patikimumas, core integracija ir etapų priėmimas.
- [ACQUISITION](madbeauty/ACQUISITION.md): tiekėjai atskirai nuo pirkėjų, SEO / FB juodraščiai, esamo modulio ribos ir realių vizitų funnel.
- [Domeno istorijos vertinimas](madbeauty/history/ASSESSMENT.md): ankstesnė prekių parduotuvė / meistrų puslapis, nepilnas archyvas, ribotas seno URL sprendimas.
- [DESIGN](madbeauty/DESIGN.md): trys actual ImageGen full-page konceptai, promptai, originalai ir rastro ribos.
- [Privataus prototipo roadmap](madbeauty/PROTOTYPE_ROADMAP.md): savininko pasirinktas visas frontend su dummy data prieš realių backend adapterių prijungimą.
- [SEO/GEO planas](madbeauty/SEO_GEO_PLAN.md): paslaugos / miesto katalogai, atrinktos vietos, bounded filtrai, schema ir matavimas pagal [naują tyrimą](../research/madbeauty-seo-2026-10-05/RESEARCH.md).
- [Straipsnių ir paslaugų ryšiai](madbeauty/CONTENT_LINKING_PLAN.md): useful content, service/city CTA resolveris, internal / external ryšiai; [24 turinio kandidatai](madbeauty/CONTENT_MAP.json), [URL politika](madbeauty/URL_POLICY.json).

Paruošti DESIGN/raster konceptai ir atskira privati paspaudžiama UI foundation: centralizuotas demo seed/clock/adapteris/on-off, 11 originalių ImageGen vaizdų +55 WebP, SVG wordmark/26 icons, fonts ir valdikliai. Foundation 9 testai PASS, actual desktop/mobile ir noindex patikra, ne pilnos platformos priėmimas. Pilni 70 ekranų keliai, sugeneruoti gidai, tikras content package, formos/delivery/account/availability/booking/public SEO renderer integracija, A–Z/Lighthouse ir viešas deployment dar PLANNED/UNVERIFIED. Jokio domain-ready, 10/10 ar komercinės paklausos įrodymo. Kontaktavimo/FB live/SMTP/voice/mokėjimų veiksmai šiame lange 0.

## Po Fresha peržiūros paruoštas pagrindas

- [Galutinis prototipo planas](madbeauty/FINAL_PROTOTYPE_PLAN.md) ir [70 ekranų inventorius](madbeauty/SCREEN_INVENTORY.json).
- [Fresha public / partner UI peržiūra](madbeauty/FRESHA_UX_REVIEW.md), [šaltiniai ir įrodymai](../research/madbeauty-fresha-2026-10-05/MANIFEST.json).
- [Demo duomenų sutartis](madbeauty/DEMO_DATA_CONTRACT.md), [UI kit start/QA](madbeauty/prototype/README.md).
- [Asset planas](madbeauty/ASSET_PLAN.json), [promptai](madbeauty/asset-inputs.json), [media/SHA](madbeauty/prototype/ASSET_MANIFEST.json).
- [Web/PWA/native app architektūra](madbeauty/MOBILE_ARCHITECTURE.md).

## Aktualus kūrimo pradžios taškas

[PROJECT_ROADMAP](madbeauty/PROJECT_ROADMAP.md) sujungia visus planus, faktinę būklę ir darbų eilę. Savininko pasirinktas [homepage-modern-v2](madbeauty/design-previews/homepage-modern-v2.png) saugomas projekte; kitas darbas — tikras responsive homepage pagal jį. Tai ne pilnos platformos ar launch priėmimas.
