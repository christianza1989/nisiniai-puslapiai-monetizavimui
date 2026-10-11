# Meta peržiūros paruošimas

2026-10-11. App `1827877621543839`, submission `1827877654877169`: **Not submitted / Unpublished**. Tikras savininko Facebook bandymas priimtas; išorinė prieiga nepriimta.

## Atskira įdiegta peržiūros aplinka

`review-build.mjs` paruošia `cloudflare/output/community-20261011/review/`. `https://perziura.madbeauty.lt` įdiegtas į Worker `madbeauty-meta-review-20261011`, versija `b46dfaab-ce7c-4407-a400-bc3ea57cff84`, source `cd5e4d024514b058bc62515ca2acd4e6c0cbd313`, galiojimas iki `2027-10-12T00:00:00.000Z`. Provider readback, 130 hosted public checks ir 19 realių HTTPS bendruomenės scenarijų PASS. IAB tikras OTP → profilis → srautas → reload PASS. **Chrome OTP du kartus grįžo į login; priežastis nepatvirtinta. Facebook išjungtas, actual reviewer OAuth dar nepriimtas.** Anketos URL tebėra ankstesnis trial juodraštis, peržiūros užbaigimas nedeklaruojamas.

Naudojamas priimtas trial entrypoint, core566 ir frozen129. Tik viena origin konstanta specializuojama build metu; originalus source nerašomas. Prieš build tikrinamas priimto runtime source, artifact ir content SHA. Naujos PLATFORM / COMMUNITY saugyklos ir naujas SESSION_SECRET sukurti scoped `review-release.mjs` seka. Esamo trial / production DB, sesijos, tapatybės, pašto konfigūracija neperkelti; originalus expiry išlaikytas. Main / trial / QA provider settings ir deployment prieš / po nepakitę. Facebook išjungtas, FACEBOOK_APP_SECRET naujoje aplinkoje nėra.

Patikra: `node --test sites/madbeauty/community-20261011/review-native.test.mjs`. PASS: naujo origin ribos, main / trial origin atmetimas, 45 sintetiniai profiliai, noindex / sitemap nebuvimas, tikro pašto atmetimas, trial OTP, bendruomenės įrašas, sesijos ir įrašo SQLite restart, HTTP ir tiesioginio DO expiry. Tai nėra hosted ar actual Facebook priėmimas.

Pirmas bandymas su šiandienos compatibility date nepasileido: įdiegtas workerd palaiko iki 2026-05-22. Išlaikyta priimto runtime data; naujo compatibility režimo priėmimas nedeklaruojamas. [Cloudflare datų dokumentacija](https://developers.cloudflare.com/workers/configuration/compatibility-dates/).

## Aktyvinimo seka

- [x] Izoliuotas vietinis paketas ir native bandymas; originalaus trial expiry nepakeistas.
- [x] Patikrintas naujo Worker / hostname laisvumas ir main / trial / QA provider lease. Wrangler OAuth DNS read403 išspręstas esamo autorizuoto Cloudflare connector scoped GET readback; prieigos neplėstos.
- [x] Atskiras Worker su nauja saugykla / session secret įdiegtas, Facebook išjungtas; kitų Worker išsaugojimo readback PASS.
- [x] Provider API `observability.redact_query_string=true` pritaikytas, logs / traces / sampling išlaikyti, readback PASS. Wrangler4.92 schema šio lauko neturi.
- [ ] Gavus konkretų per-action patvirtinimą, pridėti Meta reviewer callback ir įdiegti app secret. Tikrinti tikrą OAuth naujoje saugykloje.
- [x] Naujoje aplinkoje 45 providers / 90 seed members, 130 hosted public checks ir 19 community scenarijų; IAB OTP / profilis / feed / reload ir ekranas PASS.
- [ ] Išaiškinti Chrome OTP grįžimą į login ir priimti actual Facebook reviewer OAuth; tik tada keisti anketos URL ir ilgalaikės prieigos tekstą.
- [x] Abu `email` / `public_profile` Allowed usage sutikimai su konkrečiu savininko patvirtinimu išsaugoti; abiejų žingsnių readback PASS.
- [x] Savininko pateikti Data handling faktai išsaugoti: Lithuania / national-security No / procedures None; jo pataisytas valdytojo vardas Memocasting, MB autosaved ir pakartotinis readback PASS.
- [x] Savininko skirtas `animateme.co` portfelis `900173107610943` pervadintas į Memocasting, MB; pateikti juridiniai rekvizitai išsaugoti ir readback PASS.
- [x] App Verification / submission grid rodo Madbeauty → Memocasting, MB, ID900173107610943, Unverified ir Remove. Tai faktinis susiejimo readback; agento Connect paspaudimas neįrodytas, jo nekartoti.
- [ ] Įmonės patvirtinimo vedlys: Lithuania / Private Company / pateikti rekvizitai peržiūrėti; sustota ties reCAPTCHA, savininko paklausta užbaigti. Dokumentai / galutinis verification / tiekėjų deklaracija / Submit dar nepriimti.

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

## 2026-10-11 Savininko atsakymai ir verslo portfelis

Savininkas patvirtino abu Allowed usage sutikimus ir MB Pinet / Lithuania / užklausų nebuvimo bei procedūrų nebuvimo faktus. Abu konkretūs Save atlikti ir abiejų leidimų Edit / užbaigimo būsena perskaityta. Šių sutikimų pakartotinai neprašyti. Tai nėra Meta leidimų patvirtinimas ar programėlės publikavimas. Data handling tiekėjų sąrašas vis dar tuščias; processing / remote-access šalys dar nepriimtos.

Naujo portfelio kūrimą Meta užblokavo paskyros kūrimo limitu. Patikrinti trys prieinami portfeliai; jų juridiniai rekvizitai tušti, visi Unverified. `animateme.co` turėjo 0 verslo objektų. Savininkas konkrečiai autorizavo jo naudojimą MB Pinet / Madbeauty. Portfelio `900173107610943` pavadinimas išsaugotas kaip **MB Pinet**, abiejose Meta sąsajose perskaitytas. Kitų portfelių duomenys nekeisti, portfeliai nešalinti.

Tai ankstesnio checkpointo istorija: Business details MB Pinet draft dar nebuvo išsaugotas, Connect nepaspaustas ir konkretus patvirtinimas paklaustas. Vėlesnius tikrus faktus ir dabartinę būseną žr. žemiau; ankstesnis naudojimo sutikimas nepervadinamas agento Connect veiksmo įrodymu.

Savininkas pataisė juridinį pavadinimą į **Memocasting, MB**, pateikė kodą306026827, Pupinės g.10 / Vilnius / LT-02206 ir įmonės telefono numerį. Portfelio vardas ir Business details išsaugoti bei perskaityti. State/region Vilniaus apskritis, Lithuania, svetainė madbeauty.lt. Privatus telefono numeris nekopijuojamas į Git. Duomenų valdytojo pavadinimas taip pat pataisytas ir reopened readback PASS. Consumer app vardas Madbeauty nepakeistas.

Vietiniai įrodymai `cloudflare/output/community-20261011/`: `meta-allowed-usage-confirmed.jpg`, `meta-business-creation-limit.jpg`, `meta-mb-pinet-connect-ready.jpg`, `meta-mb-pinet-details-draft.jpg`. Ekrano failai nėra Git ar viešo paketo dalis.

Faktinė App Verification ir submission grid jau rodo šį portfelį kaip Connected business portfolio / Unverified, Remove aktyvus. Agentas Connect dar kartą nespaudė; susiejimo iniciatorius nepatvirtintas. Įmonės verification vedlys pradėtas, šalies / tipo / name / address / contact žingsniai pereiti; dabar reCAPTCHA ir savininko handoff. Galutinis verification ar App Review Submit neatliktas.

Nauji privatūs įrodymai: `meta-memocasting-details-saved.jpg`, `meta-controller-memocasting-saved.jpg`, `meta-verification-captcha.jpg`; review `deployment.json`, `provider.json`, `live.json`, `community-live.json`, `browser.json`, `community-iab.jpg`. Browser būsena PARTIAL: IAB PASS, Chrome login issue unresolved. Naujo reviewer callback neišsaugotas ir app secret neįdiegtas. Anketos esamas trial URL nepakeistas.

Viešas Facebook ir pagrindinio domeno bendruomenė išjungti; C3–C4 grupės / renginiai lieka kitu etapu. Šis paruošimas nekeičia esamo bandymo galiojimo ar priimtų gyvų versijų.
