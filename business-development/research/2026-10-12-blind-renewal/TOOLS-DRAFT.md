# roletaiklaipedoje · BDEV-0004 įrankių plano juodraštis

2026-10-12 · pirma fazė · core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39` · companion `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Statusas: proposed plan, ne `verified-active`. Galiojantis [PRODUCT](../../../sites/roletaiklaipedoje/PRODUCT.md) nekeičiamas. Naujas BUSINESS sprendimas nepriimtas; po jo ir failų koordinavimo priimtas planas būtų perkeltas į `sites/roletaiklaipedoje/TOOLS.md`. Juodraštis nėra leidimas vykdyti įrankius ar keisti balso agentą.

Mokamas kliento rezultatas ateityje: sutartos apimties roletų atnaujinimas. Dabar: tik konkretus išankstinis poreikis, be patvirtinto vykdytojo, kainos ir likučio.

| Sritis | Priemonė / įvestis → išvestis | Statusas ir riba |
|---|---|---|
| Paklausa / pirkėjai | Esama nišos forma ir jos išsaugotas aprašas → naujas / audinys / mechanizmas / neaišku | candidate, tik po A patvirtinimo; tikri savi įrašai B etape, ne portalo kontaktų rinkimas |
| Tiekėjai / gaminys / kaina | Pirminio teikėjo puslapis ir vėliau rašytinis atsakymas → konkrečios apimties / modelio / kainos patvirtinimas | candidate; LT puslapiai perskaityti, partnerių patvirtinimų 0; išorinio siuntimo autorizacijos nėra |
| Pokalbis / laiškas | Esamos nišos sales/supplier instrukcijos ir MAIL_CORE → santrauka / klausimų juodraštis | deferred šiam segmentui; roletų core vykdytojas valdo dabartinį agento pavedimą; pašto / balso nekeisti |
| Pasiūlymas / vykdymas | Kompetentingas vykdytojas + gaminio modelis / apimtis → remonto tinkamumas ir sutartas darbas | deferred; automatizuotas dalių parinkimas ar atvykimo rezervavimas nepradedami |
| Matavimas / medija | Esami domeno skaitikliai ir atskirti savo užklausų įrašai → pasiekiamumas / tinkami poreikiai / atrankos laikas | candidate B etape; nuotraukų įkėlimo ir naujos medijos A etapui nereikia; naujos GSC / GA teisės nepriskiriamos |

## Kandidatas: branddev.brand.ai.products

- Paskirtis: būsimas viešų teikėjo produktų / kainų puslapių struktūravimas, ne remonto diagnozė, dalių suderinamumas ar užklausų siuntimas.
- Šaltinis: Treg `catalog_search` ir `catalog_get`, peržiūrėti 2026-10-12; [provider docs](https://docs.context.dev/api-reference/web-extraction/products). Tikslus provider branddev / Context.dev, POST `/brand/ai/products`.
- Įvestis: arba `domain`, arba konkretaus puslapio `directUrl`, ne abu; išvestis `products` su pavadinimais, kainomis, valiuta, aprašais ir URL. Vėlesnėje patikroje konkretus remonto puslapis būtų prasmingesnis negu visas domenas.
- LT ir lietuvių kalbos aprėptis šiam darbui neišmatuota. Katalogas nurodo 0,9286 ok_rate iš 57 pavyzdžių; tai teikėjo techninė statistika, ne mūsų semantinio tikslumo įrodymas.
- Katalogo per-success kaina 0,02534 USD / call; overflow 0,03 USD / call. Kainos patikros data kataloge 2026-08-20; prieš tikrą naudojimą atnaujinti. Miss kaina neapibrėžta; automatinio retry / waterfall nėra. Upstream entry paid tier limitas 60/min nėra mūsų suteikta nemokama kvota. Dabartinio bandymo paid-call limitas **0**, call vykdymas neautorizuotas.
- Palyginimui katalogo sibling PredictLeads `predictleads.companies.products` nurodo 0,04 USD / call ir domeno įvestį; abu teikia produkto aprašą, ne patvirtintą LT remonto pajėgumą. Nė vieno provider netestavau.
- Duomenys: tik viešo verslo puslapio URL; klientų aprašų ar nuotraukų į endpoint nesiųsti. Jokių raktų ar klientų duomenų šiame plane. Viešų tekstų naudojimo ribos išlieka; nekopijuoti žalių puslapių į turinio paketą.
- Alternatyva / fallback: ribotai skaityti pirminį puslapį ir palikti modelį / kainą / aptarnavimą nežinomus iki tikro vykdytojo patvirtinimo. Šiam mažam tyrimui to pakanka, todėl mokamas ekstraktorius **deferred**.
- Įleidimo sąlyga: realus didesnis pasikartojančio tiekėjų tikrinimo darbas, konkreti išlaidų autorizacija ir dabartinės kainos patikra. Savininkas — nišos vykdytojas pagal suderintą apimtį.
- Ateities priėmimas: kiekvienas laukelis atsekamas į konkretų puslapį, nežinomos sąlygos neišgalvotos, patikrintos LT reikšmės; stabdyti, jei produkto aprašas pateikiamas kaip likutis, suderinamumas ar galutinė remonto kaina. Dabartinis vykdymas 0, patikimumas mūsų nišai UNVERIFIED.

## Peržiūra

Naudojamas esamas formos / siteId / pašto ir agentų pagrindas, naujo router, CRM ar prieigų nereikia. Pasirinktas nemokamas viešų įrodymų skaitymo kelias nesuteikia nemokamo viso verslo pažado. Priėmimo ir sustabdymo taisyklės [PILOT](PILOT.md). Šiame etape priimta tik dokumentinė atranka; runtime ir nišos failai nekeisti.
