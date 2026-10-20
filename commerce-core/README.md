# Bendras prekybos modulis

0.18.0: [įterptas Checkout](docs/PRODUCTION_CONNECTION.md#embedded-checkout--source-0180) leidžia naują mokėjimo formą rodyti tame pačiame pirkimo puslapyje. Išsaugotas hosted režimas, prarastų atsakymų atkūrimas ir vienas stabilus Session idempotency raktas. Esamo mokėjimo režimas atkuriamas iš tiekėjo; raw Session objektas naršyklei neperduodamas. Reikalingas tos pačios Stripe paskyros publishable raktas; jo sukūrimas, realūs mokėjimai ir produkcinis diegimas į šaltinio darbus neįeina. Svetainės sesija atskirai valdo vieno puslapio išvaizdą ir tikrus paleidimo vartus.

2026-10-17: priimtos [tikrais Sendparcel bandymais pagrįstos pataisos](docs/SENDPARCEL_V1_2026_10_14.md): visų REST užklausų ribojimas, tikslus lietuviškų gatvių diakritinių raidžių palyginimas ir sekimo atsakymas iki pirmo skenavimo. Svetainės sesija testinėje aplinkoje patikrino vieną dviejų pakuočių siuntą, du lipdukus ir manifestą. Tikrų siuntų API raktas dar negautas; bendro modulio šaka nepakeičia veikiančios parduotuvės konfigūracijos ar siuntimo leidimų.

0.17.0: [Access savininko sesijos](docs/PRODUCTION_CONNECTION.md#access-owner-sessions--source-0170). Patikrintas JWT ir tikslus core membership leidžia administravimui prisijungti be kartotinio žetono įklijavimo. Išsaugotos iki 8 val. teisių ribos ir Bearer suderinamumas; yra tos pačios kilmės patikra, atsijungimas ir hash revokacija naujoje0024 migracijoje. Tikra Access organizacija, AUD, savininko subject ir hosted prisijungimo priėmimas lieka diegimo savininko darbas; šaltinio testai jų neaktyvuoja.

0.16.0: [Memocasting paprasti likučiai](docs/PRODUCTION_CONNECTION.md#current-memocasting-simple-counts--0160). Pagal naują savininko nurodymą produktams galima aiškiai parinkti kiekių režimą be partijų, galiojimo ir BOM; 999 yra nustatytas laikinas balansas. Admin neberodo šiam režimui netaikomų formų. Kitų produktų lot/legacy režimai ir rezervavimo, grąžinimo, mokėjimo bei pakartojimo apsaugos išsaugotos.

0.15.0: [savininko administravimas ir prieigos paruošimas](docs/PRODUCTION_CONNECTION.md#owner-admin-and-temporary-production-grants--0150). Produkcinis operatoriaus įrankis numatytai tik parodo planą; pasirinkus `--write`, vietiškai paruošia konkrečios parduotuvės iki 8 val. grant ir privatų žetoną. Administravimo tekstai nebesiūlo vietinių demo komandų. Nuolatinė Access / SSO prieiga aprašyta kaip atskira dar neįgyvendinta sutartis.

0.14.1: [produkcinio prijungimo ir D1 migravimo instrukcija](docs/PRODUCTION_CONNECTION.md). Atskiras operatoriaus įrankis išsaugo istorinius SQL failus, perduoda vientisus trigerius per native D1 binding ir blokuoja neatpažintą schemą. Bendroje Stripe paskyroje pasirašyti kitų projektų Checkout įvykiai saugiai praleidžiami, o žinomos savos sesijos lieka griežtai tikrinamos. Vietiniai testai nėra tikros bazės ar LIVE Stripe prijungimo kvitas.

2026-10-14 papildymas: [Sendparcel v1 patikslinimai](docs/SENDPARCEL_V1_2026_10_14.md) ir [nuolatinės Stripe TEST paskyros prijungimas](docs/STRIPE_TEST_CONNECTION.md). API password, per-raktą D1 ribojimas, paštomatų pakuočių ribos ir privatūs etikečių faktai pakeičia seną JWT interpretaciją. Abu rinkiniai apima baltus dažus už tas pačias 32 / 48 € kainas; naujų pilnų pakuočių matavimai dar nepatvirtinti. Mokėjimų prijungimas lieka aktyvus iki tikro Checkout → webhook bandymo.

Aktualus 0.12.1 pagrindas: [susietas vietinis prekybos priėmimas](docs/LOCAL_SHOP_ACCEPTANCE_0_12_1.md), [partijų apskaita ir migracija](docs/CONTINUATION_0_12.md), [funkcijų peržiūra](docs/SHOP_FUNCTIONAL_REVIEW_2026_10_12.md). Pagaminto rinkinio galiojimo / kilmės ir pirkėjo būsenų spragos užbaigtos, exact SDK svetainėje patikrintas. Production, visos svetainės auditas, dizainas, našumas ir agentai lieka atskiri vartai.

Aktualus papildymas 0.10: [automatinė siuntos ir PDF eiga po komplektavimo](docs/CONTINUATION_0_10.md). Backend ir pagrindo sritis tęsia žemiau aprašytą 0.9; source merge / provider prijungimas / realus paleidimas yra atskiri.
Pirmas klientas — Memocasting. [Pilnas modulio planas](docs/MODULIO_PLANAS.md), [aktuali apimtis](docs/IMPLEMENTATION_STATUS.md), [roadmap](docs/ROADMAP.md), [architektūra](docs/ARCHITECTURE.md), [API](docs/API.md), [priėmimas](docs/ACCEPTANCE.md).

Vienas bendras prekybos pagrindas mūsų parduotuvėms; kiekviena parduotuvė turi savo katalogą, įmonę, rinkas ir integracijų paskyras. Tikras kelių nepriklausomų pardavėjų marketplace paliekamas atskirai plėtrai.

Aktualus paketas 0.9 apima prekybos pagrindą, administravimą, privačius PDF, siuntų vykdymo komandas, automatinius darbus, atkūrimą, katalogo versijas, finansinius šaltinius ir grąžinimus. [Aktualus kvitas ir prijungimas](docs/CONTINUATION_0_9.md). Memocasting svetainės / medijos / SEO turinio integracija vykdoma atskiroje savininko sesijoje. Galutinis dizainas ir agentai vėliau. Produkciniai mokėjimai, siuntos, laiškai, deklaracijos ir diegimas neįjungti.

## Paleidimas ir patikra

Komandas vykdyti iš `commerce-core/`, naudojant Node 24. Patikrinta su Node 24.19.0 Windows aplinkoje.

```sh
npm ci --ignore-scripts
npm run verify
npm run dev
```

Vietinis administravimas: `http://127.0.0.1:8795/admin`, API: `http://127.0.0.1:8795/api/catalog`. Serveris klausosi tik 127.0.0.1 ir atmeta kitą Host. Duomenys saugomi ignoruojamame `runtime/local.sqlite`. Vietinis katalogas testinis; Stripe ir vežėjas neprijungti. Operatorius prisijungia su atskirai terminale išduotu žetonu; production core identity lieka kitas integracijos vartas.

Kitame terminale, tame pačiame modulio kataloge:

```sh
npm run operator:token
npm run demo:seed
```

Žetoną įvesti administravimo prisijungime. Jis galioja 8 valandas ir suteikia tik vienos parduotuvės teises; serveryje saugomas hash, naršyklėje — tik atmintyje. `demo:seed` yra pasirinktinis, pakartojamas vietinių testinių užsakymų, medžiagų, finansinių šaltinių ir didmenos partnerio kūrimas; jis atmeta kitą aplinką ar įmonę. Dokumentai turi TEST seriją ir nėra patvirtinti apskaitos dokumentai. [Dizainas](DESIGN.md), [ekrano apimtis](docs/ADMIN_SURFACE.md).

Atskiras `npm run dev:worker` reikalauja vietinės D1 migracijos ir testinio katalogo; atkuriamas D1 bandymas — `npm run test:worker`. Node ir Worker aptarnauja tą patį host-aware API bei administravimo assets. Production prieiga turi patikėto core identity, įmonės, aplinkos ir atskirų teisių adapterį; faktiniai production grants dar neišduoti.

`verify` patikrina formatą, domeno / HTTP testus, native workerd/D1/R2/Queue kelią ir Wrangler dry-run build. Šis rinkinys nesikreipia į Stripe ar vežėjo realų API. `build:worker` nieko neišleidžia į Cloudflare. Miniflare 5 alpha yra užfiksuota vietinio testavimo priklausomybė; tikra production patikra lieka atskiras vartas.

Node adapteris taiko numeruotas migracijas transakcijomis; bendras `applyMigrations` naudojamas native D1 bandyme. Taikytos SQL migracijos tikrinamos pagal SHA256 ir neturi būti perrašomos. Senas 0001 duomenų failas priimamas be istorijos ar likučių ištrynimo.

Viešame runtime naudoti `src/worker.mjs`, o ne `test/worker-harness.mjs`. Testinis įėjimas turi dirbtinį checkout/vežėją/operatorių ir niekada neturi būti diegiamas. Be runtime ir store admission Worker production uždaryta.


0.4 prideda audituojamą medžiagų partijų karantiną/grąžinimą ir inventorizaciją, atominius stale/race vartus ir operatoriaus ekraną. [Naujas priėmimo kvitas](docs/CONTINUATION_2026_10_12_LOTS.md). Svetainę ir turinį savininkas dabar pavedė atskirai lygiagrečiai sesijai.

0.5 prideda patvarias grąžinimo užduotis, rezervuotos sumos ribas, vykdymo nuomą, Stripe rezultato paiešką ir operatoriaus veiksmus. Tikras atskiros laikinos Stripe bandymų aplinkos Checkout, signed webhook ir dviejų dalinių grąžinimų/replay kelias patikrintas. [Kvitas ir atkūrimas](docs/CONTINUATION_2026_10_12_REFUNDS.md). Gyva MB paskyra ir produkciniai grąžinimai neįjungti.

0.6 prideda siuntėjo vietos ir pakuočių planus, operatoriaus kainų užklausas
bei current Sendparcel staging read adapterį. [Kvitas ir atkūrimas](docs/CONTINUATION_2026_10_12_SHIPPING.md).
Vietiniam ekranui aiškus testinis pasiūlymas: npm run dev -- --shipping-fixture.
Tikram staging read: --shipping-sandbox su privačiu konfigūracijos failu.
Registravimas, tikri tarifai, PDF saugykla ir tracking dar neaktyvūs.
