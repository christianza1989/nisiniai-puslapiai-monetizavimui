# Vietinių paketų 0.2 ir 0.3 priėmimas

Savininkas tęsė įgyvendinimą prieš viešos svetainės ir agentų kūrimą. Tas pats issue 95 ir draft PR 96, tik commerce-core namespace, Memocasting statusas, own upgrade journal bei own WORKSTREAMS eilutės.

## Įgyvendintas kelias

Pirkėjo kontaktai ir šalies adresas išsaugomi order schema2, paštomatas tikrinamas pagal serverio sąrašą. Senas order schema1 duomenų failas ir rezervacijos išlieka. Numeruotos migracijos turi turinio hash ir transakciją; taikytos migracijos perrašymas atmetamas.

Stock adjustment turi idempotent ID, actor, reason ir expectedAvailable. Jei kita rezervacija pakeičia likutį arba korekcija jį sumažintų žemiau nulio, visas veiksmas atmetamas. Sale/credit/packing dokumento numeris ir įrašas sukuriami kartu. Vienas source turi vieną dokumentą; UPDATE/DELETE atmeta DB. Credit siejamas su patvirtintu refund ir pradiniu sale dokumentu. Dokumentai šiuo metu TEST, production išdavimas atmeta.

Stripe SDK patikrina raw refund.created/updated/failed parašą ir aplinką. Serveris sieja payment_intent su savo order, ne su refund metadata. Anksčiau už paid gautas refund lieka DB; paid apdorojimas peržiūri laukiančius. Succeeded pritaikomas vieną kartą, pending nepakeičia sumos, nepavykę ar prieštaringi faktai kuria apskaitos peržiūros išimtį. Tikras refund API vykdymas neprijungtas.

Privatus operatoriaus API ir ekranas rodo duomenis iš tos pačios DB: orders/detail/stock/history/documents/refund exceptions. Serveris tikrina principal ID/store/grant; actor neimamas iš body. Vietinis CLI žetonas turi hash, vieną parduotuvę ir 8h expiry. Bendras production identity nėra įdiegtas.

## Serverio įrodymai

- Node 24.19 Windows: 39/39 domeno ir HTTP testų PASS.
- `npm run test:worker`: tikras workerd/native D1 PASS, įskaitant migracijas, operatoriaus izoliaciją, stock adjustment, concurrent dokumento issue/numeraciją, immutability, pasirašytą refund ir credit.
- `npm run build:worker`: dry-run PASS, nieko nediegta. `npm audit --audit-level=high`: 0 vulnerabilities patikros metu.
- Senas 0001SQLite failas priimtas be prarasto order ar pakeisto likučio; nepavykusi nauja migracija nesukuria dalinių lentelių. Hash mismatch fail-closed.
- Order keyset puslapiavimas patikrintas su vienodais timestamps — visi 5 įrašai po vieną kartą. Provider replay, out-of-order ir crash po refund įrašo prieš inbox ack nepadvigubina sumos.

## Naršyklės įrodymai

Tikras Codex IAB ir vietinis 127.0.0.1:8795 serveris. Pirmas kombinuotas desktop/mobile peržiūros ratas, vienas bendras taisymas ir patvirtinimas. Papildoma tikslinė patikra skirta skaitiklių lietuviškai formai bei faktiniam teksto enlargement/spacing; tai nėra atvira dizaino poliravimo kilpa. Peržiūra nuosekli, to paties agento, ne nepriklausoma.

Patikrinta: prisijungimas, orders → detail, tikras pack POST ir atnaujinta būsena, packing dokumento POST, dokumento peržiūra, stock form serverio klaida ir sėkminga +2 korekcija, išlikę duomenys po tikro serverio sustabdymo/perkrovimo. Pirminiai 4 užsakymai, 2 sale ir 1 packing dokumentas bei korekcija išliko; initial legacy order be kontaktų sąžiningai rodė jų nebuvimą.

Vaizdai: default 615px, 1440×950, 390×844, 320×740. Įprastoje būsenoje horizontalios dokumento slinkties nematyta; DOM matavimai 320→305 ir 390→390 scrollWidth. Valdiklių būsena/disabled, klaida/success ir programinis fokuso perkėlimas į pasirinktą įrašą patikrinti. Atskirame dev-only `/qa/admin-spacing` override faktiškai padidino body/controls 16→32px; line height 48px, letter spacing 3.84px, word spacing 5.12px ir p margin 2em.390/1440 vaizdai išlaikė informaciją bei valdiklius. Tai teksto didinimo ir spacing patikra; tikro browser zoom, ekrano skaitytuvo ar visos WCAG atitikties neįrodo.

`impeccable detect --json` public HTML/CSS/JS: 0 findings. Faktinis Segoe UI, body 16px, pagalbinis 15px; source ir DESIGN sutampa. Operator UI neturi testinių duomenų fallback. Browser console error/warn sąrašas tuščias per patikrintą kelią. Screenshotai laikomi ignoruojamame `commerce-core/tmp/ui-review/`; tik testiniai pirkėjai, ne Git artifact ar production duomenys.

## Ankstesni bandymai

Pirmas bendros migracijos Node bandymas nepraėjo: eager prepare bandė paruošti triggerį prieš naujos lentelės sukūrimą. Node prepare pakeistas į lazy, kad atitiktų D1 batch sutartį; transaction rollback ir legacy adoption testai liko. Pridėjus 0003 migraciją senas testo count 2 tapo neteisingas; testas skaito tikrus migracijų vardus ir tikrina visą jų kiekį. Prettier paleistas prieš public katalogo sukūrimą kartą pranešė jo nebuvimą; galutinis visas check PASS. Vienas format tikrinimo paleidimas root kataloge neturėjo package.json; galutinė verifikacija vykdoma teisingame commerce-core kataloge. Šios nesėkmės neišspręstos silpninant acceptance.

## Likę vartai

Tikras Stripe sandbox API/methods, pasirinkto carrier API/tarifai/private PDF/tracking, production identity/Worker assets/backup/queue/mail. Stripe connector read-only inventorius rodė tik MB Memocasting live paskyrą; jokio live write ar mokėjimo neatlikta. Numeracija testinė; tikri banko/Stripe source adapteriai ir teisinė dokumentų/tax politika dar nepriimti. B2B/komponentų/partijų pagrindas tęsiant įgyvendintas pagal žemiau pateiktą kvitą; platesni UI, svetainė/turinys ir agentai išlieka roadmap.

## Tęstas vietinis darbas 0.3

Komponentų partijos ir immutable sudėties versijos, FEFO (galiojančios anksčiau besibaigiančios partijos pirmiau), atominis surinkimas į paruoštą SKU ir consumed lot pėdsakas. Finansinis normalizuotų šaltinių importas, source hash/dedup ir payment/refund/payout-bank sutikrinimas. Privatus didmenos partneris/kainynas, MOQ/casepack, 7 d. immutable pasiūlymas, vienas prepaid test order ir naujas pasiūlymas pakartojant. Visi naudoja tą pačią store/env/actor/API/D1 sutartį. Source importas nepostina journal ir nepatvirtina mokėjimo.

Tikras IAB: atliktas vieno testinio rinkinio surinkimas (3 partijų likučiai 20→19, paruoštas poros SKU +1), mokėjimo šaltinio sutikrinimas, didmenos quote 40 EUR→vienas order, reorder→naujas quote. Tai fixture kainos, ne komercinis Memocasting pasiūlymas. Normalūs 1440×950 ir 390×844 vaizdai, formų klaviatūros valdymas ir siaurų konteinerių matavimas. Nauja row būsenų peržiūra matė matched/mismatch/unmatched. Screenshots atskiri tmp/ui-review; actual production auth/carrier/bank ir pilna WCAG nepriskiriama.

Ankstesnio stock form atšaukimo tikslinė patikra: klaida išvalyta, fokusas grąžintas į Koreguoti. 0.3 aptiktas dvigubas asinchroninis render ištaisytas nekeičiant duomenų/idempotency: po retest viena form ir vienas order. Native runner fixture stock klaida ir jos taisymas aprašyti ACCEPTANCE.

Ankstesnio 0.3 taško SHA256 (istorinis kvitas, ne galutiniai darbo failai):

- public/admin.html: 45850cfdbb1fa945f45ee87ebc918a19137656c145df466887b5a212516885aa
- public/admin.css: 32f299fe8f06f43abd42bc22c7d54af5a09da094ca589203d0d7f8af2cdd89e9
- public/admin.mjs: e925968c1058384db5a9b09865ac57160aa9988348c170602c46c1778617d58c
- public/backoffice-ui.mjs: 16578670c327ef801a684ea5628be8c68a3bd256ccb58e977f3f73f7c871549f
- src/backoffice.mjs: bdd1136e355b41000945b2776c5e433b2f25144dd4da33b29d17e12b27577872
- src/wholesale.mjs: 2b441c4be2f398b1b2b3de512600420a9a9719e8226cf3b375345c1fcfc827d1

## Galutinis 0.3 vietinis patvirtinimas

39/39 Node testai, native workerd/D1 su 0001–0005 ir dry-run82.05KiB/gzip16.73 PASS. Kainyno versijos, nepatvirtinto partnerio įrašymo ir prekybos patvirtinimo/stabdymo formos realiame IAB išsaugojo duomenis; partnerio kainynas apribojo pasiūlymo SKU. Esamo partnerio rekvizitų/kainyno redagavimas ir portalas neprijungti.

Švarus stage Git tree90478d470fd8ffb73f91de76cb6ba544fec46b6d atkurtas per git archive tik commerce-core srityje, be runtime/credentials. npm ci --ignore-scripts įdiegė36paketus/audited37;39tests/nativeD1/format/dry-run PASS. Tai Git blob atkūrimas, ne viso bendro core fresh clone. Vienas handoff bandymas nurodė neegzistuojantį istorinį companion kelią, kitas parodė realų foreign dirty companion atsilikusį9main commit. Jis neperrašytas. Šis paketas companion source nekeičia/neimportuoja; scoped core-only handoff įrodė aktualų main ir0missing commits. Prieš būsimą public renderer integraciją reikės savo aktualaus companion checkout.

QA32px Didmena pirmiausia turėjo463px horizontalų plotį dėl ilgo kainyno h3. H3 overflow-wrap:anywhere taisymas sumažino scrollWidth iki375 esant390px viewport; naujos kainyno/partnerio/quote formos visos335px clientWidth=scrollWidth. Normalūs1440 ir390 vaizdai bei testinio kainyno/partnerio būsenos peržiūrėti iš screenshotų. Native select trumpina ilgą pasirinktą žymenį; pilnas žymuo lieka lentelėje. Refund source formos klaida su teigiama suma atmesta, pataisytas neigiamas įrašas išsaugotas, fokusas grįžo į Sutikrinimas heading. Browser console warn/error sąrašas galutiniame kelyje tuščias.

Detektoriaus advisory dėl ankstesniame DESIGN nepaminėtų realių spalvų, masthead18px ir h3 17px išspręsti sutikrinus norminį inventorių su esamu CSS. Tai dokumentų atitikties pataisa, ne fiktyvus source spalvų pakeitimas. Galutinis impeccable detect grąžino [].

Po perkrovimo0.3 vietoje išliko5 užsakymai, komponentų partijos po19,2 ankstesni quote ir vienas didmenos order, sutikrintas source. Po to naršyklėje pridėtas dar vienas testinis kainynas ir partneris; jis patvirtintas/stabdytas/patvirtintas su versijų istorija. Tai ignoruojamos vietinės fixture DB reikšmės, ne komerciniai kainynai ar klientai.

Paskutinis UI bandymas iš AX tree checkbox vaidmens parinko neteisingą Didmena locator ir gavo no_matches; tikras DOM parodė button aria-pressed. Pasirinktas dokumentuotas button locator, duomenų ar serverio vartų pakeitimų dėl to nedaryta.

Galutinio šaltinio SHA256 (LF normalizuoti darbo failai), 2026-10-11T22:23:33.748Z:

- public/admin.html: 45850cfdbb1fa945f45ee87ebc918a19137656c145df466887b5a212516885aa
- public/admin.css: 3138bbdd3102cca93e435daac3302bc50524f3598a1e63ed864b0b505148b800
- public/admin.mjs: 03a781417fe42af57b598f0da74a93ca5bb513f8d6832875eaef7a8d366865f9
- public/backoffice-ui.mjs: 91ff52ba0897c03ff8286927fdf02fa60dec1b68a90041dc22ca09fa7fbd302a
- src/backoffice.mjs: bdd1136e355b41000945b2776c5e433b2f25144dd4da33b29d17e12b27577872
- src/wholesale.mjs: e9f8412b0a4591467aa18960f988446787210c11668111587e6c0a32a5fbe501
- src/http.mjs: 84729affbf1f78f47a883346caf1d0dd8a9f2b268a17c7972242117b4b7010b0
- migrations/0005_partner_approval.sql: ced918e5d4c17b7372b7d6ff341c69d2d14826c0cc788d4d22767ac26e4a7b75
