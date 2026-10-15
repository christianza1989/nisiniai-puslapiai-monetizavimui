# Įrankių atranka visam verslo keliui

2026-10-15. SiteId `wellness-export`; domenas ir viešas prekės ženklas nežinomi. BUSINESS redakcija 1. Core `d3d9c9fd` / funkcinis `0f28432`, companion `1a26`. Dabartinė fazė — tyrimas ir uždaro pristatymo parengimas. Tikslinis mokamas rezultatas — sutartos komplektacijos gaminio pardavimas; tiekimas, partnerystė ir kainodara dar nepriimti.

| Sritis | Dabar | Vėliau / kodėl |
| --- | --- | --- |
| Poreikis / pirkėjai | Oficialūs puslapiai, ribotas rankinis pirminių šaltinių tyrimas | Maps kandidatai tik su biudžetu, teisėmis ir tikros šalies / intencijos patikra |
| Tiekėjas / gaminiai / kaina | Kanoninis HTTPS skaitytuvas ir datuoti gamintojo teiginiai | B2B dokumentai ir modelių sąlygos; vieša mažmeninė kaina netampa mūsų galutine kaina |
| Pokalbis / atsakymas | Esamas Discovery / Creation / Task, šaltinių perdavimo jungtis | Kalibruotas verslo agentas tik su tikrais faktais ir atskiru priėmimu |
| Pardavimas / vykdymas | Poreikio ruošinys ir uždara demonstracija | Tikri pasiūlymai, sąskaitos, apmokėjimas ir logistika po sutartų atsakomybių |
| Medija / matavimas | Galerijų vertinimas ir esamas MEDIA_CORE importo planas | Teisėti originalai, realios formos ir domeno rodikliai; naujų optimizatorių nereikia |

## Esamas core: `business_discovery.sources.read` / `collect`

- Paskirtis: gauti nurodyto gamintojo pirminį HTTPS šaltinį ir datuotą kilmės kvitą; ne nepriklausomai sertifikuoti gaminį. [Šaltinis](../../agent-business-core/runtime/src/pinet_core/business_discovery/sources.py), peržiūrėtas d3d9c9f.
- Įvestis: viešas HTTPS URL; išvestis: adresas, data, pavadinimas, originalaus HTML SHA, teksto SHA, ribota ištrauka, nuorodos arba unavailable. Iki 800 000 baitų puslapiui, iki 9 000 simbolių ištraukai; kolektorius turi bendrą laiko / konteksto ribą ir robots / viešo DNS / TLS patikrą.
- Coverage: actual 7/7 pasirinktų Maudis puslapių gauti; visas pasirinkimas 9/11 gautų. Penkios Maudis ištraukos siekia 9 000 ribą. Kitų dviejų LT puslapių nesėkmės išsaugotos, web skaitymas atskiras. Tai mūsų išmatuotas gavimas, ne semantinis teisingumas ar pilnas katalogas.
- Kaina / kvota: šiame procese nėra mokamos duomenų API ar modelio kvietimo; esamos PC / tinklo sąnaudos nevertintos. Tik pasirinkti puslapiai, jokio nuolatinio crawler. Neprieinamumą išlaikyti, neapeiti robots, autentifikacijos ar Booking hold.
- Duomenys: privatūs šaltinių originalai ir hash; jokie raktai ar klientų duomenys. Viešam paketui perduodamas tik peržiūrėtas leistinas turinys, ne raw HTML. Peržiūrėti po gaminio sąlygų pokyčio ir prieš tikrą pasiūlymą.
- Savininkas Root; statusas `scoped-test`: tikras skaitymas įrodytas, Discovery→Creation įrodymų perdavimas dar realizuojamas. Fallback — oficialus web skaitymas su aiškia gavimo riba; jei kritinis faktas nepasiekiamas, jo nežadėti.

## Kandidatas: `crawl4ai.google.serp.maps`

- Paskirtis: rasti ribotą apgyvendinimo įmonių kandidatų ir jų oficialių puslapių sąrašą. Kataloge pasirinkta po paieškos pagal verslo užduotį; `catalog_get` peržiūrėtas 2026-10-15. Treg provider Crawl4AI, POST `/recipes/google-maps-places`; [tiekėjo dokumentacija](https://api.crawl4ai.com/docs).
- Įvestis: JSON `query`, pasirenkamas `location`, `limit` (numatyta 20, aprašyme daugiausia 100). Rezultatai: vieta / įmonė, adresas, kategorijos, koordinatės, telefonas, website, place ID ir papildomi Maps laukai. Pirmam būsimam bandymui būtų ne daugiau 20 kandidatų vienai tiksliai vietai.
- Šalys / kalbos: reikia NL / tikros vietos ir atitinkamos užklausos. Lietuvos / Europos country coverage šiame darbe faktiniais kvietimais netikrinta. Katalogo atsiliepimai mini ne visada tinkamą vietą ar veiklą; būtina patikrinti originalų puslapį. Techninis katalogo sėkmės rodiklis nėra pirkimo poreikio tikslumas.
- Kaina kataloge: 0,00015 USD už sėkmingą kvietimą; tuščias / atmestas / nepavykęs rezultatas aprašytas nemokamas, faktinį atsiskaitymą patvirtina kvitas. Teorinė dviejų sėkmingų kvietimų riba 0,00030 USD, tai būsimo bandymo skaičiavimas. Dabartinis papildomų mokamų Treg kvietimų leidimas 0; neįvykdytas nė vienas kvietimas.
- Teisės / saugojimas: tik reikalingi organizacijos duomenys, privatūs ir siteId apriboti; prieš vykdymą patikrinti šaltinio ir provider naudojimo sąlygas. Viešas telefono ar el. pašto adresas nėra leidimas rinkodarai. Siuntimo nėra.
- Alternatyva: oficialių įmonių puslapių tyrimas be naujos prenumeratos. Stabdyti, jei rezultatai kitos šalies, netinkamos veiklos, nėra oficialaus puslapio ar naudojimo teisės. Plėtra tik kai patikrintas tiekimas ir reikia konkretaus segmento bandymo. Savininkas acquisition; statusas `candidate`, actual execution nėra.

## Alternatyva: `openmart.businesses.search`

- Paskirtis: įmonių paieškos atsarginis variantas, jei mažos apimties oficialių puslapių / Maps atranka nepakankama. Treg katalogo `catalog_get` 2026-10-15; POST `/api/v1/search`, `query`, aiškus `limit`, `estimate_total`. Shared-key aprašyta riba 1–25, upstream schema pati platesnė. [Kainodara](https://www.openmart.com/pricing).
- Katalogo orientyras 0,00894 USD už įrašą, bet sąskaita kreditais apvalinama `ceil(0.3 × returned records)` kiekvienai operacijai. Vienas įrašas gali kainuoti visą kreditą. 25 įrašų operacijos aprašytas maksimumas 8 kreditai; faktinę Treg USD kainą būtina perskaityti prieš vykdant, nepasikliauti vien reklamuojamu įrašo vidurkiu.
- Coverage: katalogas nėra mūsų NL kokybės bandymas. `match_score=0` — netinkamas rezultatas; bet koks teigiamas balas dar nepatvirtina šalies ar pirkimo intencijos. Išvestis ir exact sutartis tikrinami prieš testą.
- Minimalūs organizacijos duomenys, jokio asmeninių kontaktų spėjimo. Tos pačios atskiros duomenų / kontaktavimo ribos; dabartinis mokamų bandymų limitas 0. Savininkas acquisition; statusas `deferred`. Fallback — pirminiai puslapiai; sustabdyti off-target ar neaiškią kainą.

## Pokalbis, vykdymas, medija ir matavimas

Esami Discovery, Creation, native studio ir bendras Task chat lieka vienintelis proceso pagrindas. SourceContext jungties apimtis ir priėmimas — [INTEGRATION](INTEGRATION.md). Jos būsimas PASS savaime neįjungs faktų admission, agentų kalibravimo, pašto, CRM, mokėjimų ar outbound. Esamo modelio profilio leidimas 6.1 Sol High nėra visų Treg endpoint ar naujo siuntimo autorizacija. Šio tyrimo metu modelių kvietimų nebuvo.

Gamintojo kainoraštį ir produktų aprašus pradžioje tikrinti rankiniu peržiūros sprendimu su kilme; atskiro katalogo tiekėjo ar kainų prenumeratos nereikia. ERP / sandėlis atidėti iki realių užsakymų ir tiekimo proceso. Naujos Stripe paskyros ar apmokėjimo integracijos šiam tyrimui nereikia.

Esamas MEDIA_CORE saugo originalus ir generuoja responsive variantus po leistino importo. Maudis medijos licencijos nėra; statusas `blocked` tik jų produkcinių failų naudojimui. Tai netrukdo ruošti struktūros ar aiškiai iliustracinių savų konceptų. Pasirinkti tikro produkto vaizdai turės sutapti su konkrečia komplektacija; generuotas vaizdas netampa gamintojo produkto ar mūsų darbo įrodymu.

GSC / GA4 ir formos faktinių užklausų matavimas — `not_connected` šiam nežinomam domenui. SEO tyrimo bendras `seo-research.mjs` importas laukia tikro domain / locale ryšio; svetimo gamintojo domeno nenaudoti vietoje mūsų. Jokių išgalvotų srauto, konversijų ar SEO balų.

Stripe Directory pirmo discovery kelias šiame PC nebuvo prieinamas: Stripe CLI nėra, prijungto dokumentacijos įrankio autentifikacija atmesta. Naudotas pirminių šaltinių / esamo Treg katalogo fallback; Directory supplier patikros nebuvo. Tai netrukdo šiam nepriklausomam tyrimui ir nereikalauja naujos paskyros kūrimo.

## Peržiūros rezultatas

Parinktos priemonės atitinka mažą pirmo verslo bandymą ir vėlesnį visą pirkėjo kelią. Katalogo discovery atliktas, mokamas provider vykdymas neįrodytas ir neaktyvuotas. Pagrindinės nežinomybės: B2B sąlygos, tinkama komplektacija, tikros rinkos aptarnavimas, medijos teisės, mūsų marža ir tikros užklausos. Kelios svetainės vėliau naudos tą patį core, kiekviena savo siteId / faktų / kanalų ribose.
