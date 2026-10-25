# Dažai abiejuose rinkiniuose · 2026-10-14

Savininkas patvirtino baltus dažus poros ir šeimos rinkiniuose. Kainos lieka 32 € ir 48 €. Produkto pasirinkimuose dažų priedas ir jo priemoka pašalinti; sudėties sąrašai, aprašai, metadata, homepage ir susiję tekstai suderinti LT, PL, LV ir ET versijose. Dažų kiekis, savikaina ir pilnos pakuotės duomenys neišgalvoti. Medinis pagrindas lieka atskiras priedas pagal ankstesnius faktus.

## Turinio leidinys

Naujas immutable release `4ea58f2e-3057-49ac-8631-b0d87ed8f472`, SHA256 `3f5a4864a45a094ee5c8baceb8e27f5c2607a1d3f73ab5118e482c3ffb61b818`: 88 puslapiai, 84 indeksuojami, 24 gidai, 172 medijos failai. Pakeisti 26 puslapiai, jų visas galutinis tekstas perskaitytas ir redaguotas prieš patvirtinimą. 62 ankstesni patvirtinti puslapiai išliko deep-equal; homepage 89 specialūs blokai ir 9 išlaikyti blokai išsaugoti.

Pirmas release bandymas buvo teisėtai sustabdytas: pasikeitus bendram facts hash, nepakeisto instrukcijos puslapio ankstesnės peržiūros kontekstas nebebuvo aktualus. Originalus FAIL išsaugotas vietinėje istorijoje. Vartai nesusilpninti. Patikrinus visų 62 nepakeistų published snapshots tapatumą ir naujo faktų helperio no-op, atlikta jų faktinės priklausomybės bei konteksto peržiūra, naudojant autentišką ankstesnio pilno teksto skaitymo įrodymą. Tai nėra naujo visų 62 tekstų pilno perskaitymo teiginys. Naujas release po šios patikros priimtas. Keturių rinkų checkout policy revision hashes atnaujinti tik savo 8827 sandbox rinkose; užsakymai ir jų ankstesni policy snapshots neperrašyti.

## Krepšelis ir sąsaja

Dar nepateikto krepšelio `couple_white` pasirinkimas normalizuojamas į `couple`, saugiai sujungiant kiekius. Atskiras `white_paint` pašalinamas. Kainų helperis ignoruoja pasenusį įtrauktų dažų priedą ir neleidžia dar kartą pridėti 3 €. Originali įvestis ir jau pateiktų užsakymų dokumentai nekeičiami. Abu produktai rodo lokalizuotą eilutę apie įtrauktus dažus šalia tikros serverio kainos; dažų checkbox nebėra.

Manrope tekstų vaidmenys ir esama tipografika išlaikyti. Patikros apimtis: nauja sudėties eilutė, produktų pasirinkimai, kaina, mobile pirkimo juosta ir krepšelio suma. Actual IAB 1280×720 LT pora, 320×720 LT šeima ir 1280×720 PL šeima: įtraukimo tekstas matomas, nėra dažų checkbox ar horizontalaus overflow. Ši pataisa nekeičia šriftų dydžių ar responsive taisyklių; ankstesnė actual 200% zoom / text-spacing nežinomybė nepervadinta PASS.

## Patikros ir mokėjimų riba

110 PUBLIC testų, TypeScript, scoped ESLint ir galutinis production build PASS. `QA_INCLUDED_PAINT.mjs` patikrino 88 puslapius ir 8 šaltinio rinkinių sąrašus, helperio idempotenciją ir pašalintas priemokas. 88 puslapių SEO smoke, 103 SEO HTTP ir 13 native gateway guard užklausų PASS. HTTP checks atlikti prieš paskutinę matomą įtraukimo eilutę, po jos galutinis build ir actual browser pakartotinai patikrinti. Tai nėra Lighthouse, produkcijos indeksavimo ar SEO pozicijų matavimas.

Native krepšelyje actual serverio quote: pora 32 € + šeima 48 € + testinis pristatymas 4,50 € = 84,50 €. Papildomos dažų eilutės nėra; dabartinio turinio sąlygų nuoroda galioja. Formos kontaktai nepateikti, naujas užsakymas nesukurtas; 8 ankstesni synthetic užsakymai išsaugoti. 4,50 € yra vietinė fixture, ne patvirtintas komercinis tarifas. Private screenshots: PUBLIC/output/paint-couple-final.png, paint-family-mobile-final.png, paint-cart-final.png; testų/TS/lint/build/SEO išvestys ten pat, ignoruojamos Git.

Savininkas taip pat užsakė veikiančius mokėjimus. Shopo sesija tikrina nuolatinį MB Memocasting Stripe TEST ryšį ir signed webhook. Šio dažų priėmimo metu 8827 visi gyvi providers ir offers išjungti, preview guard nesusilpnintas, `paymentConnected` rankiniu būdu neįjungtas. Stripe Codex connector ir po žmogaus pranešto atnaujinimo grąžina UNAUTHORIZED. Saugiam testiniam API raktui paruošta forma, bet jo sukūrimas laukia žmogaus action-time patvirtinimo shopo pokalbyje. Nei tikras apmokėjimas, nei galutinis viso mokėjimų pavedimo priėmimas šiame dokumente neteigiami.

Core bazė `e69738e69afb6e76159e33140d9a279ac964e416`, main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`; PUBLIC bazė `508779baaaa4151d82b8ff8b0d1d15a1237d95b8`, main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Upgrade `upgrade-c050e9e5-b8d3-4c58-9abc-b21d87cee20e`, esami PR101/31. Local release nėra main merge, adoption ar deployment. Dažų etapas atskirai patikrintas; mokėjimų darbas tęsiamas pagal realias prieigas.
