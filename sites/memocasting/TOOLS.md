# Memocasting įrankiai ir aktyvavimo ribos

## Europos kainodara, partneriai ir 3PL · 2026-10-21

Pagal aktualų canonical niche-business-tools skill ir BUSINESS_TOOLS_CORE. [BUSINESS atnaujinimas](BUSINESS.md), [kainodaros tyrimas](PRICING_RESEARCH_2026_10_21.md), [3PL planas](EU_FULFILLMENT_2026_10_21.md). Pradiniai CORE / PUBLIC SHA 6c8dc91bd46fbb2310fdcc1303e80f56e2de4257 / 44d24ef6462aea98de04ee88881f84ed37ffdd19; porinė continue freshness PASS 2026-10-21, main e231fe49 / ec8a9c03. Dokumentas neaktyvuoja naujo pardavimų runtime.

Mokamas rezultatas: apmokėta profesionalo partija arba įvykdytas vartotojo užsakymas. Kontaktų, laiškų, sekėjų ir sukurtų svetainių skaičiai nėra pajamos.

| Sritis | Pasirinkta dabar / vėliau | Įrodymai ir riba |
| --- | --- | --- |
| Kainodara | Dabar pirminiai produktų puslapiai, ECB, formulėmis perskaičiuojamas XLSX | 23 pasiūlymai; stebėjimas nėra galutinis pristatytas pasiūlymas / paklausos tyrimas |
| Partnerių paieška | Vėliau viešos profesionalų svetainės, Treg Local Places kandidatas | Dabar tik nemokamas katalogas; jokios mokamos užklausos ar kandidatų kontaktavimo |
| Pokalbis / paštas | Vėliau MAIL_CORE ir acquisition peržiūra | Būtinas konkretus užduoties, kanalo ir siuntimo limito pavedimas; šio tyrimo metu nesiųsta |
| 3PL atranka | Dabar pirminiai FLEX / StartFill / Quivo / Omnipack puslapiai | Vieši planai nėra mūsų dviejų SKU kainos, SLA, priėmimo ar API sutartis |
| Vykdymas | Vėliau vienas serverinis fulfillment adapteris ir eilė | Tikras paid, vienas išsiuntimas, tracking, WMS likučiai; planas neprijungė provider |
| Medija / lokalizacija | Vėliau sutartas partnerio turinys ir peržiūrėta instrukcija | Aiškios žmonių atvaizdų, muzikos bei reklamos teisės; profesionalo mokymas prieš renginį |
| Matavimas | Vėliau partnerio QR / kodas ir įvykdytų užsakymų padengimas | Pakartotiniai mokami užsakymai, pristatymo p95 ir realios išlaidos, ne kontaktų kiekis |

### Kandidatas: serper.google.serp.places

- Paskirtis / statusas: būsima vietinių vedėjų / planuotojų verslo atranka; **candidate**, provider nevykdytas. Treg catalog_search → catalog_get 2026-10-21; [tiekėjo sutartis](https://serper.dev/playground).
- Tikslus endpoint `serper.google.serp.places`, POST `/places`; privalomas `q`, pasirenkami `location`, `gl`, `hl`, `page`, `autocorrect`. Išvestis `places` su Google parodytais verslo laukais / CID; tinklalapis ir kontaktas nėra garantuoti. Pirmiausia LT / PL / DE / FR pagal pasirinktą pilotą; tikras nišos atitikimas neišmatuotas.
- Katalogo 0,001 USD už sėkmingą atsakymą; prieš vykdymą perskaityti kainą iš naujo. 100 sėkmingų calls būtų 0,10 USD, tačiau **šiam būsimam darbui mokamas biudžetas neautorizuotas**. Ankstesnis turinio 1 USD limitas netaikomas. Katalogo 99,53 % HTTP sėkmė iš 217 554 bandymų nėra mūsų semantinio tikslumo matas.
- Alternatyva: nemokama pirminių verslo puslapių paieška; kataloge DataForSEO Local Finder 0,002 USD, Litescrape Local 0,00015 USD, bet skirtingos įvestys ir patikimumas. Mokamas waterfall nepasirinktas.
- Duomenys: verslo pavadinimas, regionas, veiklos / renginių nuoroda, viešas verslo kontaktavimo kelias, data ir vertinimas. Nerenkami svečių kontaktai. Katalogas žymi cache `forbidden`: nekurti neapdorotų SERP archyvo; leistiną saugojimą patikrinti prieš provider naudojimą. Viešas įrašas nėra leidimas automatinei reklamai.
- Vykdytojas: Memocasting savininko pavestas operatorius. Būsimas mažas bandymas – 20 peržiūrėtų kandidatų vienoje rinkoje, vertinamas veiklos atitikimas, apmokėta partija ir pakartotinis pirkimas. Stop: klaidinga šalis / veikla, neaiškios teisės, atsisakymas, nepatvirtinta kaina ar semantinis netinkamumas. Fallback pirminiai puslapiai. Jokio runtime įjungimo.

### Kandidatai: 3PL / integracija

- Tikslūs tiekėjai ir pirminės kainų nuorodos: [FLEX](https://www.flexfulfillment.eu/de/), [StartFill](https://startfill.com/pricing/), [Quivo](https://quivo.co/faq/), [Omnipack](https://omnipack.com/pricing), peržiūrėta 2026-10-21. Statusas **candidate**, ne verified-active. Stripe Directory skill panaudotas pirmiausia; CLI 1.54.1 / directory 0.3.5 paiešką atmetė `Invalid user agent`, ribojimas neapeitas. Treg logistikos discovery grąžino tik netinkamą Shopping gretimumą; jis nevykdytas.
- Įvestis: du SKU, 2,2 / 4,5 kg, 20×20×17 / 25×25×20 cm, instrukcijos kalba, pradinis 20 vnt. kiekis ir tikslinė šalis / pašto kodai. Išvestis, kurios reikia: pasirašomas kainų pasiūlymas, priėmimo / SLA taisyklės, dokumentuota API, vienas tikras užsakymas ir tracking. Pirkėjo duomenys tik pavedimui vykdyti, per duomenų sutartį, jokie raktai Git.
- Aprėptis / ribos: sandėlio šalis nėra garantuota visos Europos 4 d. d. aprėptis; priimtinumas milteliams / dažams, įvežimas ir individualaus kodo integracija dar nežinomi. Provider rinkodaros patikimumas atskiras nuo mūsų bandymo.
- Kaina / limitas: vieši planai dokumentuoti tyrime; tikros siuntimo, PVM / administravimo, minimumų ir parengimo sąnaudos nežinomos. Mokamos sutarties / siuntos limitas nesuteiktas; XLSX sumos aiškiai pažymėtos prielaidomis. Naujų sąskaitų ar sutarčių nesukurta.
- Alternatyva: LT vykdymas per esamą sandėlio / carrier sistemą ten, kur patvirtintas 4 d. d. maršrutas. Nepereiti prie kito provider vien dėl API timeout ir nedubliuoti originalaus užsakymo.
- Plėtros sąlyga / savininkas: savininko pasirinkta rinka, tikri pardavimai, priimta ekonomika ir mokesčių režimas. Mažas pilotas: rašytinai priimta 20 vnt. partija, tikras WMS likutis, patvirtintas mokėjimo įvykis → viena siunta → tracking / pristatymas. Stop: neaiški bendra kaina, nepriimamos prekės, netinkamas terminas, neatskirtas pardavėjas ar dubliuojama siunta.

Peržiūra: BUSINESS ir fazės ribos išlaikytos. Įrankių planas nėra autonominio pardavimų / pašto / finansavimo įjungimas. Toliau esantys datuoti įrašai saugomi kaip istorija; jų senos būsenos neperrašytos.

## Ankstesni pasirinkimai ir operacijų istorija

Atranka 2026-10-11 pagal BUSINESS_TOOLS_CORE. Planas neįjungia tiekėjų.

| Darbas / pasirinkimas | Įvestis → rezultatas / aprėptis | Kaina ir limitas | Statusas, fallback, aktyvavimas |
|---|---|---|---|
| Paklausa: Treg dataforseo.google.keywords.volume ir dataforseo.google.serp.organic | locale/query → mėnesio įverčiai ir current intent | ankstesnis tyrimas0,3724USD; likęs1USD cap nėra periodinis leidimas | scoped research, exact request/results local; reuse, nauja išlaidų užduotis tik pagal actual budget |
| Checkout: Stripe Checkout Sessions SDK | server order/currency → session, signed paid event | tikras LT account kainynas ir FX; dev su sandbox | candidate; realios paskyros activation ir failed/async testai, ne Connect |
| Logistika: Siųsk pigiau / Alsendo | iš LT 2/4kg paketai/adresai → quote/order/label/tracking | API aktyvavimo ir tarifų sąlygos nežinomos | candidate; rankinė savitarna fallback; sandbox+raštas apie minimumus |
| Alternatyva: Omniva / DPD / LP Express/UNISEND | pagal konkretų LT→destination produktą | tarifai/sutartys tikslintini | deferred, Omniva API reikalauja verslo sutarties; ne universalus InPost maršrutas |
| Turinio/SEO/media | existing content-studio ir companion helpers | modelių/medijos calls tik su actual task limit | vėliau site registry/evidence import ir reviewed content |
| Mail ir aptarnavimas | MAIL_CORE, per-site sender → inbox evidence | transporto sąlygos / quotas tikslintini | deferred; nepradėti cold outreach esamu transportu pagal spėjimą |
| Partnerių paieška | public business pages → verified business candidates | Treg discovery/free primary sources, future paid limit required | deferred; įrankis ir lawfully contactable partneris skirtingi dalykai |
| AI apskaita | sales/provider/bank originals → proposals/posting/reconcile | API/OCR calls ir mokesčių taisyklės dar nenustatyti | local deterministic foundation, AI runtime deferred; private data only |
| Infra | Workers/D1/R2/Queues | paskyros planas ir vartojimas, ne per-store blanket fee | local-only; deployment/resources nėra šiame etape įjungti |

Pradinį customer result bandymą valdo commerce module. Kiekvienas provider įjungiamas su konkrečiu storeId/account/environment, actual mandato limitu ir measured result. Null costs/coverage nėra zero/verified. Stop: semantically wrong market, unexplained paid debit, duplicate side effect, nesuderinta account/įmonė.

Šaltiniai: [Stripe](https://docs.stripe.com/checkout/fulfillment), [SP API](https://www.siuskpigiau.lt/api-aprasymas), [Alsendo](https://www.alsendo.lt/terms_couriers_pages/api-integracija), [Omniva](https://www.omniva.lt/verslas/api/), [UNISEND](https://post.lt/savitarna/api_doc.html). Pirminio tyrimo katalogo metaduomenys/price ir tinkamumo ribos išsaugotos privačiame evidence.


2026-10-20 Instagram: official Meta Instagram Login, own professional @memocasting.lt, instagram_business_basic only. Provider app28277591295252965/IG1131627019423512 created after ownerTerms confirmation; basic readyfortesting, own-account invite sent and acceptance pending. No publishing/messages/comments. Separate memocasting-instagram Worker + privateEU KV842d4dbb187f4b5097bf284545415e28,48latestposts,30minutecron/7daytokenrefresh, same-origin streaming proxy. No newpaidplan/scraper/Tregcalls; existingCloudflareaccount limits apply. Stop/reconnect on revoked/expired/mismatched account;6hourmax stale, profile fallback. Acceptance and rollback: INSTAGRAM_FEED.md; not claimedconnected until actual ownedtoken/media/runtime checks.

2026-10-20 connection update: owner login/terms/token completed; genuine44posts visible on canonical homepage, actual images/video verified. Service af6558f5 fixes native redirect incompatibility, source a1727cdb. Previous basic-only describes intended API usage, not the owner's actual Dashboard token grants: Meta generator also granted optional permissions, and editor reduction did not persist after reload; do not claim least-privilege scope verified. Runtime remains read-only. Current evidence and isolated/native versus hosted/cron distinctions in INSTAGRAM_FEED.md. No new paid service or Codex scheduler.

2026-10-20 current homepage media:24owner-supplied videos, localinteractivecarousel and66nativeWebPposters, frontend316f4de3 hosted. No Instagram API dependency for this section; previously connected44post service/privateKV/30mincron preserved only forrollback, not resumed Facebookcollab work. [Current media operation/acceptance](VIDEO_CAROUSEL_2026_10_20.md). New video files require scoped mediaimport/deployment, not automaticInstagram sync.
