# Madbeauty: visa sąsaja prieš backend

2026-10-05. Savininkas pasirinko iš pradžių pilną platformos website maketą su dummy data, visais būtinais puslapiais ir SEO struktūra; tik po pilnos peržiūros jungti realų backend. Po Fresha public/partner review galutinis autoritetas [FINAL_PROTOTYPE_PLAN](FINAL_PROTOTYPE_PLAN.md) ir [70 ekranų inventorius](SCREEN_INVENTORY.json). UI/data/assets foundation jau įgyvendinta; pilna platforma dar nesukurta. [QA](prototype/QA.md), [dizaino vaizdai](DESIGN.md), [SEO planas](SEO_GEO_PLAN.md), [straipsnių ryšiai](CONTENT_LINKING_PLAN.md).

## Ką reiškia frontend-first

Tai paspaudžiama svetainė, ne trys PNG ar statinės neveikiančių mygtukų dekoracijos. Search, filtrai, demo laiko pasirinkimas, meistro grafiko redagavimas ir pagrindiniai srautai veikia deterministiškai su vietiniais fiktyviais duomenimis. Kiekvienas paviršius turi normal, loading, empty, validation ir error būsenas. Klientas mato, kad tai demonstracija, jokios tikros registracijos ar laiško neišsiunčiama.

Duomenų ir API sutartys projektuojamos iš karto. Vėliau vienas mock adapteris keičiamas priimtu realiu adapteriu; puslapiuose nepaliekami atskiri hardcoded kainų / trukmių / laikų sąrašai. Backend prijungimas nėra vien UI button URL pakeitimas: reikės serverio teisių, patvarumo, conflict / recovery ir faktinio launch priėmimo.

Savininko nurodymas leidžia parodyti visas būsimos F2 platformos sritis privačiame prototipe iki paklausos. Jis nesuteikia fiktyviems profiliams public SEO statuso ir pats savaime neįjungia gyvo commerce / voice / autonominio kontaktavimo. Realios nišos live plėtra išlieka atskiras BUSINESS sprendimas.

## Puslapiai ir keliai, kuriuos reikia paruošti

| Sritis | Būtini paviršiai | Ką turi būti galima patikrinti |
|---|---|---|
| Viešas atradimas | Homepage; paslaugų indeksas; paslaugos hub; miesto hub; paslaugos/miesto katalogas; atrinkto rajono variantas | Visas search kelias, kortelių / sąrašo režimai, filtrų būsena, URL, empty ir pagination |
| Viešas profilis | Meistro profilis; salono profilis su komanda ir vieta; portfolio peržiūra; paslaugos detalės | Vienas authority paslaugoms, trukmėms, priedams ir kainoms; meistro / salono ryšys ne du tos pačios paskyros dublikatai |
| Vizito kelias | Paslaugos variantas → data/laikas → kontaktas → peržiūra → demo patvirtinimas; nėra laiko; konfliktas; pakeitimas; atšaukimas; waitlist | Aiškus booking vs inquiry, tas pats pasirinkimas visuose žingsniuose; AV fixture scenarijai |
| Kliento paskyra | Demo prisijungimas / registracija; būsimi ir buvę vizitai; išsaugoti meistrai; paskyros ir komunikacijos nustatymai | Viešai ieškoti / pateikti užklausą galima be paskyros; rezervacijos prieiga saugioje ateities sutartyje, demo nenaudoja tikro slaptažodžio |
| Meistro onboarding | Paraiška; profilio / vietos / paslaugų / nuotraukų informacija; peržiūra; pending / returned / accepted būsenos | Profilis nepaskelbiamas vien įvedus formą; ką patvirtina teikėjas ir operatorius |
| Meistro darbo vieta | Apžvalga; dienos / savaitės kalendorius; vizito panelė; manual vizitas; užklausos; waitlist; klientų sąrašas / demo kortelė | Greitas kasdienis kelias, aiškios užklausų / vizitų būsenos, nėra privatumo miksavimo |
| Meistro pasiūla | Paslaugų sąrašas / redagavimas; grafikas / pertraukos / atostogos; profilio ir galerijos redagavimas; komanda / teisės; pranešimai; export ir integracijų būsena | Pakeitimas atsispindi teisingame demo viešame profilyje; integracija neprisistato prijungta; kalendoriaus pakeitimas nepaslepia esamo vizito |
| Operatoriaus privatus valdymas | Teikėjų patvirtinimas; profilių kokybės / media eilė; inquiry status; taxonomy / catalog eligibility peržiūra; content/link status; pranešimai apie klaidą | Vienu žvilgsniu kas gali būti public ir kodėl; demo veiksmas neperjungia production |
| Turinio skaitymas | Gidų indeksas / klasteris; pilnas straipsnis; redakcija / tikras autorius; related services / CTA variantai | Skaitymas su realiais assets, breadcrumbs, naudingomis lentelėmis, nuorodų ir CTA logika |
| Pasitikėjimas / pagalba | Apie; kontaktai; kaip veikia platforma; tikrinimo metodika; pagalba; privatumas; slapukai; taisyklės; atšaukimo paaiškinimas; klaidos/pranešimo kelias | Tekstas atitinka etapą ir faktines galimybes, turinio išsamumas / footer / desktop/mobile |
| Sistemos būsenos | 404; nepaskelbtas / removed profilis; no results; unavailable calendar; draft guide; upload klaida; session expiry; permission denied | Jokio green success gedimo metu; prasmingas atsistatymo kelias |

Ne kiekvienam modalui reikia atskiro SEO URL. Provider sąrašo, gido ir paskyros route inventory yra vienas registras, iš kurio vedamos actual audit patikros. Mokėjimų, subscription planų, paid reviews ir voice ekranai nepridedami kaip veikianti piloto dalis.

## Demo duomenys ir izoliuotas adapteris

Aktualus [DEMO_DATA_CONTRACT](DEMO_DATA_CONTRACT.md) pakeičia ankstesnį 12 specialistų seed: 30 organizations, 42 specialistai, 126 variantai, 120 klientų, 480 vizitų, 96 atsiliepimai, 24 waitlist ir 30 inquiries. 3 miestai struktūros testui, ne esama pasiūla. Datos apskaičiuojamos nuo vieno valdomo clock ir Europe/Vilnius, ne prie rastro balandžio 2024. Fixed scenario clock leidžia pakartoti testą; UI turi aiškų demo režimą. Foundation įgyvendina katalogo/scoped vizitų peržiūrą, ne visus būsimo prototipo veiksmus.

Seed apima teikėją be kalendoriaus, stale adapterį, papildomos trukmės priedą, manual busy bloką, hold expiry, atšauktą ir confirmed vizitą, netelpantį laiko intervalą, tuščią rajoną, nepatvirtintą profilį. Vienas atsitiktinis „visi turime laisvų laikų“ rinkinys nepademonstruoja produkto taisyklių.

Visi fixture ID / media / kontaktai atskirame namespace; `isDemo` ir aplinkos vartas. Privačių formų seed tik fiktyvūs vardai, be tikrų žmonių telefono / el. pašto. Ne naudoti realaus Hostinger inbox pavyzdinėms registracijoms; matomas operatoriaus info@pinet.lt nėra dummy pranešimų siuntimo leidimas. Demo login = pasirinkti rolę / seed paskyrą, jokio tikro slaptažodžio rinkimo.

Sąsajos modeliai: Provider, Location, Practitioner, ProviderService (variantai / priedai / duration / buffer / price basis), Schedule, Availability, Inquiry, Booking, ProfileRevision, Article, CatalogLanding ir ArticleLinkPlan. Site/provider autorizacijos modelis dokumentuojamas, tačiau local role switch nėra reali serverio izoliacija.

## API sutarties ribos

Prieš realų backend aprašyti ir su mock adapteriu patikrinti:

- Public katalogas / paieška: bounded filters, approved projection, stable pagination, netaisyklinga input, source freshness ir provider-without-calendar.
- Availability: provider/service/location, date/time-window, buffer ir lead-time taisyklės; atsakyme source / asOf / galiojimas. Rodyti tik informaciją, leidžiamą viešai.
- Inquiry: patvarus ateities source ID, statuses, dedup ir delivery būsenos; mock atsakymas aiškiai demonstration.
- Booking: hold / confirm / change / cancel, idempotency ir conflict kodai, UTC ir timezone, kainos / trukmės snapshot. Mock prototipas neįrodo dviejų realių klientų konkurencijos atominės transakcijos.
- Provider redagavimas / upload / approval: allowed fields, versija, stale edit, moderation, media rights, quotas, removal ir public revocation.
- Kliento / meistro / operatoriaus rolės: scoped ownership ir private exports; real auth ne vien role toggle UI.
- Article / catalog link resolver: priimti entity ID, approval/time/deployment, city context, fallback ir outbound validacija; taisyklės [CONTENT_LINKING_PLAN](CONTENT_LINKING_PLAN.md).

Ne skelbti šių modelių jau veikiančiomis bendro core API. Būsimos schema/edge/runtime integracijos serializuojamos pagal WORKSTREAMS ir ownership sutartis.

## Dizainas / medija ir paspaudžiamo prototipo priėmimas

Rastrai nustato kryptį, ne virsta dideliais foniniais website screenshotais. Tikra HTML struktūra, readable LT tipografika, maži component assets ir temos nuotraukos. Galutinė vieno teikėjo demo tapatybė, header/footer bei datų / kainų / trukmių authority sutvarkoma iš karto — PNG skirtumų neperkeliame į kodą.

Per-surface desktop / 390px mobile peržiūra, desktop kalendoriui mobile agenda/dienos režimas vietoje suspausto 6 stulpelių vaizdo. Keyboard/focus, dialogs, loading, form errors, back/forward, share filters, page2, scroll galimybės. Images importuojami per MEDIA_CORE; nagų / studio / avatar demo kilmė aiški privačiame manifeste, production pakeičiama tikrais patvirtintais assets. Jokių matomų ImageGen badge.

## Etapai

| ID | Darbas | Baigimo įrodymas |
|---|---|---|
| PUI-0 — šis planas | Produktas, route / content / URL policy, mock API ribos | Dokumentai suderinti, actual implementation status nepagalvotas |
| PUI-1 | HTML component sistema, demo seed / adapteris / clock ir privatumo vartai | Originalūs persona / media, vietinis noindex, baseline fixtures |
| PUI-2 | Viešas katalogas + profilis + inquiry / booking demo + kliento paskyra | Kliento kelias nuo landing / article iki demo veiksmo, empty / error / conflict |
| PUI-3 | Meistro onboarding / paskyra / kalendorius / redagavimas ir operatoriaus eilės | Provider ir operatoriaus keliai; teisių mock būsenos, neišsiunčiami tikri laiškai |
| PUI-4 | Gidai, trust/legal, SEO/links/schema/robots prototipas | Visi puslapiai inventoriuje, visi 3 initial guide layout / CTA ir SEO scenarijai |
| PUI-5 | Visos platformos local A–Z / per-role usability / mobile / assets / Lighthouse | Faktiniai ekrano ir testų įrodymai, aiškus open-gaps registras, ne production-ready runtime |
| BACKEND | Tikrų duomenų / auth / inquiries ir vėliau priimto kalendoriaus adapteriai | Patvarumas / izoliacija / concurrency / delivery / recovery / realių faktų testai |
| LAUNCH | Tikra patvirtinta pasiūla, phase1 arba atskirai priimtas booking pilotas | Host/DNS/privacy/contact/indexing actual vartai, demo pašalinti, monitoring |

UI-complete, local SEO-ready, backend-ready, launch-ready ir paklausa yra atskiri statusai. Iki BACKEND / LAUNCH nėra pažado „galima saugiai rezervuoti“. Nėra būtinybės iš anksto automatizuoti visas commerce / AI funkcijas, kad patikrintume pilną vartotojo patirtį.

Aktualus darbų ir būklės indeksas: [PROJECT_ROADMAP](PROJECT_ROADMAP.md). Savininkas pasirinko homepage-modern-v2.png; homepage HTML realizacija yra kitas PUI-2 rezultatas. Originalo nekeisti, nenaudoti jame sugeneruotų rekvizitų ar istorinių datų kaip duomenų.
