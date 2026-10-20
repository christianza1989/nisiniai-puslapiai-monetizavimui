# Memocasting įrankiai ir aktyvavimo ribos
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
