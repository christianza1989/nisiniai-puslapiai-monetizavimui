# Meta peržiūros paruošimas

2026-10-11. App `1827877621543839`, submission `1827877654877169`: **Not submitted / Unpublished**. Tikras savininko Facebook bandymas priimtas; išorinė prieiga nepriimta.

## Atskiras vietinis peržiūros paketas

`review-build.mjs` paruošia `cloudflare/output/community-20261011/review/`. Numatyta paskirtis `https://perziura.madbeauty.lt`, Worker `madbeauty-meta-review-20261011`, galiojimas iki `2027-10-12T00:00:00.000Z`. **Adresas dar neįdiegtas, jo prieinamumas ar ilgalaikė Meta prieiga nepatvirtinti.** Anketos URL tebėra ankstesnis trial juodraštis.

Naudojamas priimtas trial entrypoint, core566 ir frozen129. Tik viena origin konstanta specializuojama build metu; originalus source nerašomas. Prieš build tikrinamas priimto runtime source, artifact ir content SHA. Naujo Worker PLATFORM / COMMUNITY deklaracijos neturi namespace ID ar cross-script binding. Esamo trial / production DB, sesijos, tapatybės, pašto konfigūracija neperkeliami. Reikia naujo SESSION_SECRET, šis helper jo nesukuria. Facebook pagal nutylėjimą išjungtas. Paketas nėra automatinio deploy komanda.

Patikra: `node --test sites/madbeauty/community-20261011/review-native.test.mjs`. PASS: naujo origin ribos, main / trial origin atmetimas, 45 sintetiniai profiliai, noindex / sitemap nebuvimas, tikro pašto atmetimas, trial OTP, bendruomenės įrašas, sesijos ir įrašo SQLite restart, HTTP ir tiesioginio DO expiry. Tai nėra hosted ar actual Facebook priėmimas.

Pirmas bandymas su šiandienos compatibility date nepasileido: įdiegtas workerd palaiko iki 2026-05-22. Išlaikyta priimto runtime data; naujo compatibility režimo priėmimas nedeklaruojamas. [Cloudflare datų dokumentacija](https://developers.cloudflare.com/workers/configuration/compatibility-dates/).

## Aktyvinimo seka

- [x] Izoliuotas vietinis paketas ir native bandymas; originalaus trial expiry nepakeistas.
- [ ] Patikrinti naujo Worker / hostname laisvumą ir užfiksuoti main / trial / QA provider lease.
- [ ] Įdiegti atskirą Worker su nauja saugykla / session secret, Facebook dar išjungtas; readback patikrinti kitų Worker išsaugojimą.
- [ ] Provider API pritaikyti `observability.redact_query_string=true`, išlaikant logs / traces / sampling. Wrangler4.92 schema šio lauko neturi, todėl jis nėra kandidato konfigūracijoje.
- [ ] Gavus konkretų per-action patvirtinimą, pridėti Meta reviewer callback ir įdiegti app secret. Tikrinti tikrą OAuth naujoje saugykloje.
- [ ] Hosted reviewer paskyros / seed / visas scenarijus / ekrano įrodymai; tik tada pakeisti anketos URL ir ilgalaikės prieigos tekstą.
- [ ] Verified business, Allowed usage, faktinė Data handling anketa ir galutinis pateikimas.

## Duomenų tvarkymo techninis juodraštis

Šaltinis `backend/facebook-auth.mjs`, runtime ced9559; tai nėra įmonės faktų ar teisinės atitikties patvirtinimas.

| Duomenys | Paskirtis ir apdorojimas |
| --- | --- |
| App-scoped Facebook ID | Cloudflare PLATFORM SQLite paskyros ryšys; atsiejimas, signed callback ir paskyros šalinimas panaikina ryšį |
| Pasirenkamas Graph email | Pending email hint iki 10 min.; panaikinamas susiejus, automatinio merge nėra. Vartotojo patvirtintas adresas vėliau yra paskyros duomuo |
| OAuth code / access token | Vienkartinis serverio exchange ir app / subject / expiry patikra; access token į SQL nerašomas |
| App secret | Cloudflare secret binding; nėra naršyklėje / Git / ekrano įrodymuose |
| OAuth state | Tik hash SQL; galiojimas 5 min., consumed cleanup |
| Šalinimo kvitas | Atsitiktinis kodas ir subject hash, 24 kalendoriniai mėnesiai |

Graph `/me` prašo tik `id,email`; Facebook draugų sąrašo, vardo ir nuotraukos neimportuoja. Cloudflare gauna Meta ID / email / exchange duomenis ir secret. [Workers localization](https://developers.cloudflare.com/data-localization/how-to/workers/) ir [Cloudflare privacy](https://www.cloudflare.com/privacypolicy/) nepagrindžia EU-only deklaracijos. Visų processing / remote-access šalių faktinis sąrašas dar neužbaigtas.

Production OTP paštas siunčiamas vartotojo patvirtintu adresu, o trial / šis paketas naudoja tik `example.com` capture. Pašto tiekėjo faktinį Meta-sourced adreso gavimą ir processing / remote-access geografiją reikia pagrįsti prieš anketos deklaraciją; [Hostinger DPA](https://www.hostinger.com/uk/legal/dpa) nėra mūsų pašto regionų priėmimas.

## Trūkstami savininko atsakymai

1. Kuris MB Pinet Meta Business portfelis yra tinkamas, ar jį dar reikia sukurti.
2. Konkretus abiejų `email` / `public_profile` Allowed usage „I agree …“ sutikimų patvirtinimas; ankstesnė konkreti užklausa tebėra pending.
3. Duomenų valdytojo šalis, nacionalinio saugumo užklausų istorija per 12 mėn. ir tikrai galiojančios teisėtumo patikros / ginčijimo / minimalaus atskleidimo / registravimo procedūros. Nežinomi checkbox nepažymėti.

Viešas Facebook ir pagrindinio domeno bendruomenė išjungti; C3–C4 grupės / renginiai lieka kitu etapu. Šis paruošimas nekeičia esamo bandymo galiojimo ar priimtų gyvų versijų.
