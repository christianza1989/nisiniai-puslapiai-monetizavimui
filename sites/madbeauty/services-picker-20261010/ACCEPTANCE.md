# Vieno puslapio paslaugų pasirinkimas

2026-10-10. **LOCAL_PREVIEW_ACCEPTED**. Savininko prašymu įgyvendintas išskleidžiamas paslaugų medis ir miesto filtras tame pačiame kategorijos, grupės ar procedūros puslapyje. Tai veikiantis produkto pakeitimas vietinei peržiūrai; produkcinis diegimas šiame etape neatliktas.

## Sprendimas

Esama DM Sans / juodos, baltos ir violetinės spalvos tapatybė ir jau sugeneruotos skaidrios kategorijų iliustracijos išsaugotos. Kompiuteryje medis yra kairėje, pasirinkimas ir pasiūlymai – dešinėje. Atidarius konkrečią nuorodą, jos kategorija perkeliama į sąrašo pradžią, išskleidžiama reikiama grupė ir pažymimas pasirinkimas. Medis apima visas 14 aktyvių pagrindinių kategorijų ir jų procedūras.

Paieška veikia per visą katalogą, įskaitant sinonimus ir lietuviškų diakritinių ženklų normalizavimą. Galima rinktis visą kategoriją arba procedūrą. Miesto filtras apima 103 miestus ir „Visa Lietuva“. Paspaudus „Rasti meistrą“, tame pačiame vaizde rodomi atitinkami vieši pasiūlymai. Paslauga ir miestas išsaugomi URL, naršyklės grįžimas atkuria ankstesnį pasirinkimą. Prieš pritaikant pakeistą pasirinkimą ankstesni rezultatai paslepiami, kad jų nebūtų galima supainioti su nauju filtru.

Telefone medis sutraukiamas pasirenkant procedūrą, fokusas pereina į miesto lauką. Jį galima vėl išskleisti aiškiai pažymėtu mygtuku. Tiesioginė procedūros nuoroda telefone rodo sutrauktą medį ir jau pasirinktą procedūrą.

Pasiūlymų nebuvimas paaiškinamas čia pat. Kitų miestų alternatyvos rodomos tik esant tikriems paskelbtiems tos paslaugos pasiūlymams. Demonstracinė pasiūla netampa tikra. Ankstesni tiesioginiai miesto adresai ir jų pasiūlos/404 taisyklės lieka suderinami. SEO indeksavimo vartai neįjungiami šiuo UI pakeitimu.

## Faktinės patikros

- 38 produkto / SSR / katalogo / formų testai PASS: 33 ankstesni išlaikyti, 5 nauji. Esamas SSR testas papildytas naujo miesto filtro patikromis.
- Vienas tikslinis compiled Workers V2 testas PASS: tikras izoliuotos API teikėjo sukūrimas, operatoriaus patvirtinimas, naujo tuščio ir pasiūlą turinčio miesto filtro SSR, ankstesni adresai, atšaukimas ir SQL restart. Tai nėra naujas viso native backend priėmimas.
- Faktinis Chrome: procedūros pasirinkimas pele ir Enter, Vilnius ir Akmenė, ta pati sąsaja po pateikimo, URL atkūrimas per Back, paieška „laminavimas“ išskleidžia antakių ir blakstienų kategorijas, nežinomas žodis rodo aiškų atsakymą, paieškos išvalymas atkuria medį.
- Faktiniai 320 ir 390 px telefono vaizdai: viena kolona, jokio horizontalaus perslinkimo, sutraukimas ir miesto fokusas. Kompiuterio ir 1440 px Codex peržiūra: dvi kolonos, navigacija neuždengia pradžios turinio. Papildoma tikslinė padding pataisa atlikta radus incumbent sticky-header persidengimą.
- Galutinis mechaninis Impeccable scan: `[]`. Vertinimas atliktas nuosekliai šioje sesijoje, nevadinamas nepriklausomu.
- Chrome console error įrašų per tikrintą kelią: 0. Ekrano nuotraukos: `screenshots/desktop-full.jpg` (Codex 1440 px), `screenshots/desktop.jpg` ir `screenshots/mobile.jpg` (Chrome).

## Peržiūra ir atkūrimas

`node sites/madbeauty/services-picker-20261010/preview.mjs`

Adresas: http://127.0.0.1:8940/paslaugos/veido-kaukes . Privati vietinė fixture SQLite saugykla laikoma ignoruojamame `private-runtime/`, transportas vietinis capture. Canonical klientų duomenys nenaudojami. Viešas katalogo rendereris demonstracinius pasiūlymus sąmoningai atmeta, todėl ekrano nuotrauka rodo tikrą tuščios pasiūlos būseną; pasiūlą turinčios būsenos patikrintos SSR ir native testais.

Kandidatas izoliuotas atskirame `ai/madbeauty-service-picker-20261010` checkout nuo gyvo services pagrindo `4652575`. Acquisition pakeitimai į kandidatą nepateko. Naujo checkout pirmas bandymas atskleidė trūkstamus ignoruojamus dev priklausomybių / content-core artefaktus; jie prijungti arba nukopijuoti iš esamos darbo aplinkos, po to 38 testai ir native bandymas praėjo. Pradinis nepraėjęs dependency setup nėra produkto PASS. Chrome viso puslapio screenshot API du kartus viršijo laiką; galutinis viso puslapio vaizdas faktiškai gautas per Codex naršyklę. Jokio šių klaidų slopinimo ar sintetinio screenshot nėra.

Pilnas SEO turinys, tikra meistrų pasiūla, visas platformos priėmimas ir gyvas diegimas nėra šio vietinės sąsajos peržiūros įrodymai. Ankstesni live ir turinio leidimo receipts neperrašyti.
