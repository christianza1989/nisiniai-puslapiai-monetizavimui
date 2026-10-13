# Pagrindo priėmimas — 2026-10-06

Apimtis: tik savininko po pauzės autorizuotas straipsnių ir katalogo pagrindas. Bazė b422165; branch ai/madbeauty-content-foundation-20261006. Gyva Worker versija nepakeista. Draftų galimybę ir sąsają read-only patvirtino turinio sesija PR10; jos private CLI/import/GSC rezultatas neperimamas kaip šio paketo PASS.

| Patikra | Būsena | Įrodymas |
|---|---|---|
| Stabilūs ID ir tikslūs eksportai | PASS | 305 unikalūs mazgai:21 kategorija,59 grupės,225 treatment;103city. `export-registry.mjs --check` |
| Legacy semantika | PASS | kirpimas→kirpimai, neturi moterų kirpimo pasiūlos; gelinis-lakavimas→konkreti procedūra. Esami offer/bookings ID nepersirašo |
| Registry gates | PASS | deployed/fresh/approved-public-only supply, invalid/null, fallback opt-in, expiry TTL1h; hash/date/time/price/query atmesti. Preview/static targets[] |
| Node nacionalinis / vietinis SSR | PASS | pats HTTP200 pilnas HTML, selector103cities, actual approved offer200; emptycity/unknown/extension404, native GETcity303, withdrawn404 |
| Workers V2 visas kelias | PASS | tikras izoliuotas SQL DO ir RPC: email fixture→offer→operator approval→registry→articlehref→SSRprovider; restart; approvedfalse→target404 + hrefcollapse |
| Actual common shadow importas | PASS | `preview-release.mjs` tikrai importavo izoliuotą V2 release/manifest/1WebP į atskirą sandbox; synthetic fixture SHA8c0e0855…679, Node HTTP+browser image complete; public compiled registry neaktyvuotas |
| V2 medijos vartai | PASS | Naujas release assets root, featured responsive image; future/unknown media404; validator/hash teisių metaduomenys |
| Immutable V2 intake | PASS | common validator ir approval/hash; future, edited, wrongsite, private/catalogue URL collisions atmesti; V1 SHA dba452…579 nepakeistas |
| V2 HTML / schema / discovery | PASS | rich paragraph/list/heading, exact projected CTA, Article iš common giftSchemas, future/revoked CTA tekstas, index/LLM tik current projection |
| Bendra regresija | PASS | visos TEST_MANIFEST suite,89testai/89PASS/0FAIL/0skip, galutinis7061ms paleidimas. Nei viena suite nepanaikinta |
| Desktop sąveika | PASS | IAB tab7, actual1280×720/client1265/scroll1265, guest/isolated memory fixture. Nagai→Lakavimas→Gelinis→Vilnius→same providerID/profile; Kaunas empty; Enter submit; V2 tekstas,0consoleerrors |
| Mobile sąveika | PASS | actual390×844/client375/scroll375; article/aside343=343, catalogue panel341=341. Tas pats procedūra→miestas200 ir Kaunasempty. `evidence/article-mobile.png`, `catalogue-mobile.png`; vietiniai, Gitexcluded |
| Fizinis telefonas / OS zoom | UNVERIFIED | naršyklės viewport nėra fizinio įrenginio ar200%zoom įrodymas |
| Tikro naujo straipsnio pilnas review/export/import | UNVERIFIED | izoliuotas synthetic V2 kontrakto straipsnis, ne actualredakcinis release. Turinio sesijos next step |
| Naujas production deployment / index/GSC | NEATLIKTAS | gyva platforma ankstesnė; indexEligiblefalse browse, jokio 225thinSEO deployment |

Pirmieji FAIL ir taisymai išsaugoti TEST_MANIFEST: V1 neturi operatorName laukelio; operatorius imamas iš bendros config. Pirmas bendras87/88 – senas tuščio city200 lūkestis; su nauju404 kontraktu tas pats testas pakeistas ir retestuotas. Galutiniai89 apima83 ankstesnius bei6 naujus testus. Mobile override šiame bandyme faktiškai veikia (390px); ankstesnio plano/searchfix nesėkmingo override kvitai neliečiami.

Šis paketas nerašė production DB, naujų tikrų straipsnių, shared public core ar private studio model/generator. Ads/payments/mail channel/medical extensions naujai neaktyvuoti. Testiniai kontaktai @example.com tik fixture; originalūs tekstai/profiliai nevadinami tikra pasiūla.

Source/hash/Git safety receipt – RECEIPT.json. Platus upgrade tebėra PAUSED, lokalaus siauro pagrindo priėmimas nėra41 užduoties užbaigimas.
