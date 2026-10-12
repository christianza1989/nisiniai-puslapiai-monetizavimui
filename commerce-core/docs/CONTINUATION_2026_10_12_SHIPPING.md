# Siuntų paruošimas — 0.6

Lokaliai veikia pakuočių planai, siuntėjo vietos istorija ir operatoriaus kainų
užklausos. Dabartinio Sendparcel protokolo adapteris paruoštas staging aplinkai.
Tikra prieiga, siuntos registravimas, etiketė ir sekimo įrodymai dar negauti.
Visas prekybos modulis bei produkcinis paleidimas dar nepriimti.

## Tyrimo pagrindas

[Dabartinis API puslapis](https://www.siuskpigiau.lt/api-aprasymas) nurodo
[Sendparcel dokumentaciją](https://api.sendparcel.com/rest-api/doc).
2026-10-12 perskaityta OpenAPI 2.0.1; JSON SHA256:
`cff27042ca7b87f51b98bc54480c431b97fa6ba0fd2ac7d2c5f5c54e6645930d`.
Serveriai — staging.sendparcel.com ir api.sendparcel.com. Globalus JWT ir
legacy password header skiriasi nuo 2021 PDF senų pavyzdžių. Tikslią paskyros
autentifikavimo eigą dar turi patvirtinti tiekėjas.

Legacy kainų ir paštomatų užklausos yra POST; paštomatai turi puslapiavimą ir
kurjerio filtrą. Kainoms naudojami kg, cm, EUR suma; atsakyme — centai. v2
pasiūlymo ID ryšys su viešu legacy siuntos kūrimu nėra dokumentuotas. Taip pat
trūksta dokumentuoto išorinio reference/idempotency ir prarasto atsakymo paieškos
protokolo. Siuntos kūrimo operacija adapteryje todėl neįjungta.

PDF gali būti keli; pirmas failas nebūtinai yra etiketė. Sekimo data neturi
patvirtintos laiko juostos. Nežinomi tikri tarifai, kainų galiojimas, PVM/priedai,
API mokesčiai, sutarties ir IP reikalavimai; paruoštas konkretus tiekėjo laiškas.

Savininkas pakeitė Chrome paskyrą. Naujas profilis patikrintas, rekvizitai tušti.
Ankstesnė asmeninė paskyra ir 02121 pašto kodas neperimti. Patvirtinta siuntimo
vieta — Vilnius, 02211. Paskyros adresas ir neišsiųstas laiškas laikomi tik
ignoruojamame runtime. Gmail connector reikalauja reauthentication; laiškas
neišsiųstas ir jokių prieigos teisių nebuvo suteikta.

Stripe Directory 0.3.5 per oficialų CLI nepavyko dėl user-agent patikros; jos
neapeita. Treg neturi rasto siuntimo endpoint ar paskyros own tool. Šiame
tęsinyje mokamų tyrimo calls nebuvo.

## Vietinė eiga ir ribos

Migracija 0008 prideda nekintamus origins, plans, quotes ir locker snapshots.
Tas pats ID ir turinys grąžina originalą; kitas turinys — 409. Store, aplinka,
operatorius ir kainų tiekėjo paskyra išsaugomi atitinkamuose įrašuose. Kainų
adapteris serverio konfigūracijoje atskirtas nuo siuntų registravimo adapterio.

Pakuotės planui reikia apmokėto, prekėmis aprūpinto užsakymo su gavėjo adresu.
Galima siųsti po SKU pakuotę kiekvienam rinkiniui arba naudoti tikrus operatoriaus
matavimus. Turinys turi tiksliai padengti užsakymą; kelių SKU kraštinės
nesumuojamos. Gavėjo įmonės požymis nurodomas atskirai. Kainos yra operatoriaus
išlaidų įvertinimas: jos nekeičia apmokėtos sumos ar pristatymo pasirinkimo.
EUR adapteris atmeta kitą valiutą. Privatus paštomatų importas nepakeičia viešo
serverio patvirtinto pristatymo sąrašo.

GUI palaiko individualias pakuotes ir vieną bendrą išmatuotą dėžę. API papildomai
palaiko kelias išmatuotas dėžes bei paštomatų snapshot; jų GUI dar nėra.
Paieška ribota 100 puslapių / 45 s; kintantys puslapiai ar pasikartoję ID
atmetami. PDF adapteris tikrina iki 5 PDF / 2 MiB kiekvienam, grąžina privačius
bytes, bet neturi saugyklos/atsisiuntimo integracijos. Laisvas sekimo tekstas
nepaverčiamas pristatymo patvirtinimu.

## Patikros

| Kelias | Rezultatas |
|---|---|
| Node / HTTP | 60 testų PASS; 7 naujos siuntų grupės tikrina 30 vienetų, turinį/matavimus, immutable/replay/store/grant/origin/paid ribas, konversiją, kainą/paskyrą, puslapiavimą, provider klaidas, PDF ir kalendoriaus datas |
| Native workerd / D1 | 8 migracijos; HTTP origin → 2 pakuočių planas → testinė kaina → replay → immutable guard → detail ir ankstesni domenai PASS |
| Dry-run | 109.86 KiB / gzip 21.77 KiB; jokio diegimo |
| Actual IAB | 1440/390/320 px: empty, neaktyvus provider/registravimas, netinkamas pašto kodas, individualus/matuotas planas, TEST 7,99 EUR pasiūlymas |
| Tekstas / fokusas | 390 px su 32 px root ir spacing variantu: formų width/scrollWidth 335 px, document overflow nėra; Tab nuo paaiškinimo pasiekia submit, console warn/error tuščias. Actual browser zoom / screen reader / pilna WCAG nepatikrinti |
| Restart | Ankstesnė vieta ir planas išliko; po restart išsaugotas matuotas planas ir testinė kainų užklausa |
| Tikras tiekėjas | UNVERIFIED: tarifo, pirkimo, etiketės ir track bandymų nebuvo. Fixture HTTP nėra Sendparcel paslaugos įrodymas |

Screenshot įrodymai ignoruojamame tmp/ui-review: shipping-postal-validation.jpg,
shipping-measured-mobile390.jpg, shipping-quote-mobile320.jpg,
shipping-spacing-mobile390.jpg, shipping-final-desktop.jpg. Naujų UI tekstų
kalbos saviredakcija išlaiko skaičius, vienetus ir neaktyvių operacijų reikšmę.

## Atkūrimas ir kitas darbas

```sh
npm ci --ignore-scripts
npm run verify
npm run dev -- --shipping-fixture
```

Fixture yra aiškus pasirenkamas dev argumentas; default nėra vežėjo, deployable
Worker neimportuoja fixtures. Testinis pasiūlymas nėra komercinis tarifas.

Gavus staging prieigą, ignoruojamame runtime/shipping/sdk.json įrašyti accountRef,
accessToken ir, jei būtinas, apiPassword. Paleisti
`npm run dev -- --shipping-sandbox runtime/shipping/sdk.json`.
Abu vežėjo argumentai vienu metu atmetami. Browser cookies nenaudojami, paskyra
nekuriama, production serveris atmetamas. Credentials nepatenka į Git ar JS UI.

Toliau: tiekėjo atsakymai, pilnas siuntėjo adresas/MB sąskaitų rekvizitai,
audituojamas kūrimo gateway, provider paskyros binding, privati PDF saugykla,
sekimo istorija ir LT/PL/LV/EE bandymai. Nuolatinė MB Stripe aplinka, production
identity, dokumentų politika, Worker assets ir M7 taip pat yra atskiri darbai.

Rollback — scoped source revert; DB istorijos nenuvalyti, pritaikytos 0008
neperrašyti. Išjungus read adapterį išlieka planai ir kainų istorija. Svetainės
sesijos failai bei produkciniai duomenys nepakeisti.
