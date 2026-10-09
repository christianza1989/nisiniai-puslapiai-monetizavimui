# Miestai, paskyra ir patvirtinta kortelės nuotrauka — 2026-10-09

Šis bandymas priima konkrečius izoliuotos aplinkos kelius. Pilnas atnaujinimas madbeauty.lt nepaleistas. Tikro teikėjo, rezervacijos / priminimo inbox ir faktinės retention / backup tvarkos šie sintetiniai įrašai nepakeičia.

## Aktualus leidimas

Runtime ir source: `1ba6c7dec9ac437f4bc60608d4ee9f15a92e71bb`; core `c7e0c9a5a43e22c74af5da14e61ad403bdc40ee7`; patvirtintas turinio paketas `bb1b90aa2929d9cc63607afb9b77977203eb9bc45031a6c8ae5e8775ce378511`.

Protected Worker `madbeauty-ui-acceptance-20261009`, versija `016ae399-bd77-4689-b9ee-b5ffd9308532`, artifact `5fce801083683c047b946e5e085b17fb5d4f4c8071a81e63f05770c93d384ac6`. Tik tie patys du QA namespaces; capture-only paštas, trys testinės paskyros ir ribotos QA prieigos vartai. Production namespace nepririšta; domain routes nepridėtos.

## Nauja pataisa ir jos patikra

Salono kortelė be avataro rodė bendrą demonstracinės studijos nuotrauką, nors jo patvirtintoje galerijoje buvo teikėjo vaizdas. Backend dabar parenka esamą patvirtintą, neapribotą savo avatarą arba pirmą galerijos vaizdą ir pateikia tik kortelei reikalingus viešus deskriptorius. Darbuotojo portreto savaime nepasirenka. Realus frontend adapteris nenaudoja demonstracinės studijos ar kategorijos vaizdo kaip teikėjo nuotraukos; jos nesant rodo „Nuotrauka nepateikta“.

- Prieš pataisą papildytas esamas Node testas nepraėjo: katalogas nepateikė `coverImageId`. Po pataisos trys esami Node / Workers testai papildomai tikrina juodraščio privatumą, patvirtintą cover, privataus originalo / teisių duomenų nepateikimą, galerijos pašalinimą ir moderatoriaus apribojimą. Darbuotojo portretas neįtraukiamas į kortelės mediją.
- Visi keturi produkto rinkiniai: **264/264 PASS**, 0 naujų / 3 papildyti / 0 pašalintų, 75 372 ms. [Regresijos manifestas](acceptance-20261009/card-media-regression.json) užfiksuoja testuotų failų SHA ir prieš vykdymą buvusį source base; runtime commit pridėtas atskirai patikrinus nepakitusius failų baitus.
- Naujo runtime 39-puslapių paketas: **64 native HTTP publikavimo ribos PASS**, 309 assets. [Publikavimo įrodymas](acceptance-20261009/card-media-calendar.json) taikomas tik acceptance wrapper laikrodžiui.
- Protected Worker prieš / po kodo pakeitimo: source ir target 29 kolekcijos, fiziniai vaizdai ir 16 mail captures sutapo tiksliai. Išliko atšauktas v3 vizitas ir patvirtintas v2 105 minučių vizitas. Production nustatymai ir deployment atsakymas sutapo tiksliai; gyva versija liko `4dbdf361` 100 %. [Duomenų išsaugojimas](acceptance-20261009/card-media-hosted-preservation.json).
- [Hosted HTTP patikra](acceptance-20261009/card-media-hosted-http.json): visų 309 failų SHA / future-media blokavimas, 7 suėjusios datos puslapiai ir 32 dar neprieinami būsimi gidai. Vieša produkto / API / QA prieiga be rakto atmesta.
- [Native UI](acceptance-20261009/card-media-ui.json): normaliai prisijungusio testinio kliento išsaugoto salono kortelė rodo tikrą įkeltą ir peržiūrėtą violetinį bandomąjį vaizdą; IMG dekoduotas, nėra horizontalios dokumento ir main sklaidos. Faktiniai DOM viewport: hosted 1280×900 ir390×900. Tai medijos kelio bandymas, ne realaus teikėjo darbo fotografija.
- Atskiras Node8852 in-memory real-adapter fixture be įkeltos nuotraukos: desktop1280×720 irmobile 390×900 rodo230px tuščią cover, 0 IMG ir aiškų tekstą. Darbo dienos pasirinkimas normalioje paieškoje pateikia vieną tikrai tinkantį fixture intervalą; pradinis šeštadienio pasirinkimas teisingai nerodė pasiūlymo. Tai atskiras vietinis bandymas, ne hosted no-photo būsena.
- Normalus favorite pašalinimas atnaujintame hosted UI pateikė „Dar nėra išsaugotų profilių“. [Saugyklos patikra](acceptance-20261009/card-media-favorite-removed.json): favouriteIds tuščias, vizitai, target ir capture sutapo su išsaugota ankstesnio fbc fixture būsena. Naujo runtime source restart čia neatliktas ir nepriskiriamas.

![Aktuali kortelė telefone](acceptance-20261009/card-media-hosted-mobile.jpg)

## Ankstesnis šio tęsinio fbc hosted bandymas

Šių įrodymų runtime lieka `fbc4bbc3e900694cee8c011667a1a2cb7abd1ecc`; versija `71dab99f-29eb-425f-8354-6fc4d760157e`. Naujo runtime vardu jų neperrašome.

| Kelias | Faktinis rezultatas |
| --- | --- |
| QA leidimo pakeitimas | [Prieš / po duomenys](acceptance-20261009/city-hosted-preservation.json) sutapo: 29 source / 29 target kolekcijos, medija ir 15 capture; production 4db nepakito. |
| Miestas be pasiūlymų | Antakiai → Žiežmariai ir SPA → Vilnius grąžino303 į veikiančią paiešką su tiksliais ID; tiesioginiai nepaskelbti miesto katalogo URL liko404. Native desktop/mobile parodė tuščius rezultatus, išlaikytą pasirinkimą ir14 miesto kategorijų. [HTTP](acceptance-20261009/city-hosted-http.json), [native](acceptance-20261009/city-hosted-ui.json). |
| Dropdown ir klaviatūra |103 miestai; 257 katalogo įrašai ir atskiras „Visos paslaugos“ pasirinkimas. „tatu“ paieška pateikė8 atitikmenis; ArrowDown/Enter parinko Tatuiruotes ir Palangą, submit išlaikė abu ID. Tai katalogo įrašai, ne 257 realiai siūlomos paslaugos. Ankstesnio vietinio 259 skaičiaus papildomas operatoriaus fixture įrašas nepriskiriamas šiam hosted sąrašui. |
| Kliento nustatymai | Įprastas OTP prisijungimas, service=false / marketing=false / reminderLeadMin=0 save ir reload; paskui atkurta true / false / 1440. Central ir active-target prefs sutapo; vizitai / medija / captures nepasikeitė nuo prisijungimo. [Išjungimas](acceptance-20261009/city-hosted-settings-off.json), [atkūrimas](acceptance-20261009/city-hosted-settings-restored.json), [native](acceptance-20261009/city-hosted-settings-ui.json). |
| Duomenų eksportas | Native dialogo „Atsisiųsti JSON failą“ nuoroda tikrai atsisiuntė16 558 B failą. Sutapo abu aktualūs active-target vizitai ir central prefs; kitos testinės paskyros duomenų nebuvo. Be app session401. [Failo patikra](acceptance-20261009/city-hosted-export.json), [native](acceptance-20261009/city-hosted-export-ui.json). Pats eksportas ir OTP lieka privačiai. |
| Išsaugoti profiliai | Įprastas add / list / source restart: favouriteIds ir visa source / target / capture būsena sutapo tiksliai. [Restart įrodymas](acceptance-20261009/city-hosted-favorite-restart.json). Šis restart atliktas fbc runtime; 1ba leidimas paskui tą būseną išlaikė. |

Ekrano rastrai yra originalūs browser bytes; DOM viewport ir tikri rastrų matmenys užfiksuoti atskirai. Faktinio inbox, fizinio įrenginio geolocation leidimo, realaus piloto, negrįžtamo trynimo ar canonical viso atnaujinimo priėmimo čia nėra. Reikalingi faktai ir bandymo eiga: [PILOT_INPUTS.md](PILOT_INPUTS.md).
