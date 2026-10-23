# Verslomatika V2 turinio plano patikra

2026-10-23. Apimtis – savininko pateiktų turinio planų redakcija ir papildymas po klausimo apie agentų kūrėją. Parengti [pagrindinis planas](CONTENT_PLAN.md) ir [struktūrizuotas priedas](content-plan.json). Tai planavimo, o ne veikiančios svetainės priėmimas.

## Ankstesnės redakcijos patikra

Toliau iki skilties „Naujas perdavimas“ išsaugotas ankstesnio pakeitimų paketo įrašas. Jis neaprašo vėliau atlikto mokamo tyrimo ar naujo darbo pasidalijimo.

## Pakeitimai

Išsaugoti visi ankstesnio suderinto inventoriaus 73 konkretūs URL ir agento profilio šablonas. Papildomai įtrauktas /agentu-kurejas/, jo paskirtis ir kelias nuo darbo aprašymo iki patikrinto agento. Galutinė apimtis – 75 įrašai: 74 konkretūs URL ir vienas šablonas. T0 turi 58 konkrečius URL; 16 straipsnių datos išsaugotos.

S1 atskiria ERĮ juridinio asmens abonento išimtį nuo BDAR teisinio pagrindo ir esamo fizinio kliento išimties. S3 nebeturi išgalvotų delsos matavimų. S6 atskiria pajamas, konversijos vertę ir pelną. S8 nereikalauja nepatikrinto Figma įvykio. S9 skiria agento profilį nuo vykdomos integracijos. S11–S16 pašalinti bendri tikslumo, teisinio rezultato ir terminų pažadai. Kainos, SLA, failai ir klientų rezultatai neimituojami.

Agentų kūrėjas įrašytas kaip pilno produkto funkcijos pasiūlymas. Peržiūrėti vietinio V2 PRODUCT.md, docs/ARCHITECTURE.md, docs/EVOLUTION_AND_MAINTENANCE.md, server/roles.mjs ir server/engine.mjs. Rasti fiksuoti koordinatoriaus, autoriaus ir vertintojo vaidmenys bei instrukcijų kandidato vertinimas. Tai nėra bendro naujo agento su įrankiais sukūrimo priėmimas. V2 šaltinis ir veikiantis procesas nekeisti.

## Duomenų ir teksto patikra

| Patikra | Rezultatas | Apimtis |
| --- | --- | --- |
| Inventoriaus išsaugojimas | PASS | Visi 74 šaltinio įrašai išsaugoti, pridėtas tik vienas naujas produkto puslapis; nėra dubliuotų URL ar planinių ID. |
| Galutiniai skaičiai | PASS | 75 įrašai, 74 konkretūs URL, 1 šablonas, 58 T0 URL ir 16 straipsnių. |
| Straipsnių briefai | PASS | S1–S16 turi atskirą klausimą, užklausą, ribą, turinio eigą, originalią naudą, šaltinių poreikį, agentus, vizualą ir veiksmą. JSON ir dokumento tekstai sutampa. |
| Datos | PASS | Lietuvos laikas perskaičiuotas esamu localPublishAt; visos 16 publikacijų yra antradienį arba ketvirtadienį 09:00, 07:00 UTC. Parengimo terminai ankstesni už publikavimą. |
| Planiniai ryšiai | PASS | 368 išvardytos ryšių nuorodos turi konkrečius inventoriaus tikslus. Būtini tikslai suplanuoti ne vėliau už juos naudojantį puslapį. Tai nėra 368 viešų href skaičius. |
| Agentų failai | PASS | 23 skirtingi panaudoti failų keliai egzistuoja prisegtos agency-agents versijos medyje. Neegzistuojantys ankstesni keliai nepateko į rezultatą. |
| Failų ir demonstracijų registras | PASS | 21 poreikis pažymėtas parengti ir patikrinti; neegzistuojantys atsisiuntimai nepaskelbti veikiančiais. |
| Šaltinių kilmė | PASS | JSON saugo visų 10 naudotojo priedų identifikatorius ir tikslių originalių baitų SHA-256. Originalai nekeisti. |
| Dokumento vietinės nuorodos | PASS | 4 nuorodos į canonical core dokumentus ir kodą egzistuoja peržiūrėtame checkout. |
| Kalbos saviredakcija | ATLIKTA | Atskirai perskaitytas galutinis tekstas, pataisyta sintaksė, netikslios sąvokos ir likę angliški žodžiai, palygintos sąlygos, datos, URL ir skaitinės reikšmės. Techninė patikra nelaikoma kalbos kokybės sertifikatu. |
| Svetainės vaizdas ir HTTP | NETAIKOMA ŠIAM PERDAVIMUI | UI, rendereris, turinio duomenys ir deployment nekeisti. Numatyti tikri prieš ir po datos HTTP, talpyklos bei skaitymo patikros darbai nėra pažymėti atliktais. |
| Importas ir viešas leidimas | NEATLIKTA | JSON nėra native turinio paketas. Tikrieji siteId/pageId, dabartinės revizijos ir adapteris susiejami prieš importą. Approval ar release nesukurti. |

Duomenų patikra atlikta vienkartiniu vietiniu dokumentų patikros scenarijumi, naudojančiu canonical localPublishAt. Produkto testų rinkinys nevykdytas, nes vykdomas kodas ir sutartys nebuvo keičiami. Naujas planas nesuteikia ankstesnėms svetainėms ar moduliams priėmimo.

## Peržiūrėti pirminiai šaltiniai

- [VDAI 2026-05-19 DUK](https://vdai.lrv.lt/public/canonical/1779182967/1405/05-19_DUK_Tiesiogin%C4%97%20rinkodara_juridiniai_asm_svetainei.pdf): ERĮ 81 straipsnio pakeitimas, juridinis abonentas, atsisakymas ir fizinio kliento išimties atskyrimas.
- [EDPB gairių 1/2024 konsultacinė versija](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf): teisėtas interesas nepasirenkamas automatiškai; vertinamas būtinumas ir interesų pusiausvyra.
- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [spam policies](https://developers.google.com/search/docs/essentials/spam-policies): įprasti SEO principai, naudinga originali informacija ir sąlygos be reitingų garantijų.
- [Google Ads conversion values](https://support.google.com/google-ads/answer/13064207): matuojama konversijos vertė turi būti aiškiai apibrėžta; pajamos ir marža nėra vienas rodiklis.
- [Relevance AI Invent](https://relevanceai.com/invent): jų pristatoma agentų kūrimo ir valdymo eiga. Konkurento pateikti pavyzdžių rodikliai nepriskirti Verslomatikai.
- [agency-agents prisegta versija](https://github.com/msitarzewski/agency-agents/tree/4e3ac3ca6604c75113f52c695dbddcc7af928b46): failų keliai. Tai turinio šaltinio versija, o ne įrodymas, kad būtent ši versija veikia vietiniame V2 runtime.

TAR paieškoje rastas XV-815 identifikatorius, tačiau tiesioginis teksto atvėrimas grąžino 403. EUR-Lex bandymas pateikė neįskaitomą trijų eilučių projekciją. Šie atvejai nepristatyti kaip viso teisės akto perskaitymas. Treg balance patikra grąžino pasibaigusio ar netinkamo prisijungimo būseną. Mokamų užklausų, modelių kvietimų ir išorinių verslo veiksmų šioje užduotyje nebuvo.

## Git kilmė ir perdavimas

Core bazė 26493054ae065dc92980bf9d0c1a4d7c4bdb4371, companion bazė 705688622563e75b1ab044f416b75cdf5cf4fbf7. Originalūs pasenę checkout išsaugoti; darbui sukurti atskiri aktualaus main worktrees ir atlikta porinė freshness patikra. Companion skaitytas, jo source nekeistas.

Rezervacija: GitHub issue246. Keisti tik šie trys sites/verslomatika-v2 dokumentai ir savas WORKSTREAMS įrašas. Bendro core kodo, schemų ar skills spraga šioje redakcijoje netaisyta; core upgrade journal šiems konkrečios svetainės dokumentams netaikomas. Draft PR ir main merge nepakeičia veikiančio V2 ar viešos svetainės.

## Naujas perdavimas

2026-10-23 savininkas patikslino, kad Codex parengia pilną struktūrą ir rašymo užduotį, o visus galutinius tekstus rašo Antigravity / Gemini. Vėliau tiesiogiai nurodė šio projekto negrįsti bendromis core taisyklėmis. Todėl parengtas savarankiškas PROJECT_RULES.md: pilnas V2 produktas, bet kurio tinkamo agency-agents profilio pasirinkimas, komandos ir agentų kūrėjas; nėra paveldėtų F1/MVP, paklausos testo, publikacijų kvotų ar septynių dienų pasirengimo ribų. Paliekamas savininko pasirinkimas panaudoti esamą publikavimo pagal datą galimybę.

Parengta 75 individualių užduočių: 74 konkretūs URL ir vienas agento puslapio šablonas. Pridėta navigacija, puslapių šeimos, skaitytojo keliai, visų sąsajos tekstų užduotis, rezultatų formatas, šaltinių taisyklės ir rašymo partijos. S1 papildytas MX ir neaiškaus adresato patikros ribomis; komercinis aktualumas atskirtas nuo tariamos papildomos universalios ERĮ sąlygos. P39 tyrimas atnaujintas pagal B1 nukreipimą į Site.pro; P49 reikalauja tikrinti dabartinius kreditų ir kitų naudojimo vienetų skirtumus.

Atliktas savininko autorizuotas iki 10 USD Treg tyrimas: 47 užbaigti kvietimai, 0,3536 USD pagal charged_micro. 133 LT ir po 89 US/GB frazes; 31 SERP bandymas, 26 sėkmingi atsakymai; 13 AI bandymų, 8 sėkmingi atsakymai. Klaidos, null, nulis, užsienio rinka ir nepatvirtinta faktinė AI geografija atskirti. Ataskaita ir normalizuoti duomenys yra antigravity/RESEARCH.md bei research-data.json; originalūs kvitai privatūs .local.

Prieš naujausią savininko patikslinimą atskirai išbandytas esamas tyrimų adapteris izoliuotame duomenų kataloge, 47 įrašai su originalių failų SHA-256. Tai techninės galimybės patikra, ne šio produkto organizacinės taisyklės ar privalomas writer darbo etapas. Aktyvios studijos duomenys ir V2 tenant nekeisti.

Šio perdavimo tekstai ir individualios užduotys peržiūrėti dėl lietuvių kalbos, sąlygų ir prasminių ribų. Baigiamasis nuoseklumo patikros kvitas pateiktas antigravity/HANDOFF_CHECK.json. Tai dokumentų patikra; svetainės vaizdas, pilni vieši tekstai, demonstracijos, realūs atsisiuntimai ir techninis įdiegimas šiuo pavedimu nesukurti.
