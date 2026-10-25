# Administravimo skydelio atnaujinimas

Savininkas pavedė užbaigus paštą ir apmokėjimo tęsimą sutvarkyti visą valdymą. Tikras pradinis vaizdas apžiūrėtas prisijungus login.memocasting.lt/admin: užsakymai, prekės, likučiai ir automatiniai darbai. Produkcijoje niekas neredaguota šios peržiūros metu. Tolesnės UI patikros atliekamos su izoliuotais duomenimis, paskui tikras hosted skaitymo patikrinimas.

## Kryptis ir apimtis

Režimas Operate: mažos parduotuvės savininkas turi greitai rasti užsakymą, suprasti mokėjimo ir siuntos būseną, redaguoti prekę ir saugiai atlikti veiksmą. Nėra išgalvotų pardavimų grafikų ar rodiklių. Išlaikomos teisės, prieigos apsauga, API, versijuoti katalogo pakeitimai, privatūs dokumentai ir vienkartinės operacijos.

Palygintos struktūros: (1) užsakymų registras, (2) siuntų paruošimo stalas, (3) sandėlio terminalas, (4) kasos ekranas, (5) mažo prekių ženklo prekybos darbo erdvė, (6) finansų registras, (7) kūrybinės dirbtuvės inventorius. Pasirinkta penktoji: pastovi navigacija, rami antraštė su atnaujinimo veiksmu, užsakymų paieška ir būsenų filtrai, tvarkinga duomenų lentelė, prekės redaktorius su aiškiais skyriais. Seed9608e2c9 priskyrė5. Tai agento sprendimas pagal savininko deleguotą pavedimą, ne naujas žmogaus patvirtinimas.

Spektro linijų navigacija atmesta: kasdieniam parduotuvės darbui reikalautų išmokti naują žymėjimą; perimamas tik nuoseklus sulygiavimas. Itin tankus japoniškų modulių maketas atmestas dėl ilgų LT etikečių ir telefono; perimamas kompaktiškas, bet įskaitomas grupavimas. Iliustruoto zoologijos žemėlapio forma atmesta dėl lentelių ir finansinių veiksmų pobūdžio; perimamas aiškus aktyvios vietos nurodymas. Code-led įgyvendinimas: nuotraukos ir generuotas dashboard maketas šiam duomenų ekranui nereikalingi.

## Nustatyti trūkumai

- Nėra užsakymų paieškos ir filtrų; pasibaigę neapmokėti užsakymai užgožia vykdytinus.
- Viena ilga skaičių eilutė ir pasikartojantis infrastruktūros paaiškinimas konkuruoja su pagrindine lentele visuose skyriuose.
- Katalogo lentelė automatiškai atveria pirmą prekę, o ilgas redaktorius pradedamas žemiau viso sąrašo.
- Įkeliami asinchroniniai skyriai iš pradžių atrodo tušti; ne kiekvienas atsakymas apsaugotas nuo vėlyvo ankstesnio skyriaus atvaizdavimo.
- Užsakymo detalės viename stulpelyje sumaišo kontaktus, prekes, siuntas, dokumentus, grąžinimus ir pagalbinius įrankius.
- Kai kurie sėkmės tekstai dokumentą vadina testiniu ir produkcijoje. Tai teksto klaida, ne duomenų pakeitimas.
- Telefonui reikia kompaktiško išskleidžiamo meniu, nuoseklių lentelių įrašų ir patogaus redaktoriaus veiksmų išdėstymo.

## Darbai ir patikra

- [x] Actual prisijungusio pradinio vaizdo, kodo ir vartotojo užduočių peržiūra.
- [x] Atnaujinti bendrą shell, navigaciją, būsenas ir tipografikos vaidmenis.
- [x] Pridėti vietinę užsakymų paiešką ir aiškiai apibrėžtus filtrus; nurodyti įkeltos imties ribą, išlaikyti senesnių įrašų įkėlimą.
- [x] Sutvarkyti užsakymo detalių hierarchiją ir veiksmų grupavimą.
- [x] Katalogo, aprašymų, kainų, nuotraukų ir pasirinkimų redaktorių padaryti patogiai pasiekiamą iš prekės eilutės.
- [x] Vienodai pateikti likučius, siuntas, dokumentus, automatinius darbus, finansus ir didmeną; išlaikyti palaikomas funkcijas ir teises.
- [x] Patikrinti asinchroninių skyrių būsenas ir saugų perjungimą, paiešką, filtrus ir klaidas.
- [x] Faktinis desktop/mobile,320px ir matomas klaviatūros fokusas. Pilnas assistive-technology,200% teksto ir spacing atitikties auditas šiame ribotame priėmime neatliktas; jo PASS neteikiamas.
- [ ] Paveikti regresijos testai, tikras edge, source safety, Git/upgrade perdavimas, diegimas ir hosted skaitymo patikra.

Tipografika: vienas sistemos sans su LT ženklais,16px body/controls,14–15px pagalbiniai duomenys,28px H1 ir20px H2; tabulinės sumos,70ch proza, mažiausiai44px svarbūs valdikliai. Šviesus neutralus darbo paviršius, grafito tekstas ir vienas akcentas aktyviai navigacijai bei pirminiam veiksmui. Tikslius tokenus fiksuoti iš baigto bendro admin kodo commerce-core/DESIGN.md; viešos parduotuvės CSS nekeisti.

Priėmimas neapima tikro pinigų grąžinimo, siuntos užsakymo, kliento laiško ar katalogo publikavimo kaip bandymo. Galutinį dizainą įvertinti pagal actual ekraną, ne detektoriaus balą.

## Galutinė vietinė patikra

237/237 commerce regresijos; tikras workerd/native D1 smoke; produkcijos profilio dry-run; pakeistų modulių sintaksė ir formatas. Izoliuotas penkių užsakymų bandymas parodė paiešką/filtrus, juodraščio saugojimą nekeičiant paskelbtos versijos, dialogo abi baigtis, prekės antraštės perjungimą,320 CSS px be horizontalaus perpildymo. Esami prekių vaizdai įkelti per tikrą CatalogMedia saugyklą, ne fiktyvius ID.

Pridėtos tikslinės5sekjuodraščio ir1,8sek užsakymo atsakymų patikros: užvertas užsakymas negrąžina navigacijos; seno juodraščio atsakymas nenuima naujos prekės dirty perspėjimo; atšauktas paskelbimas nesukuria naujo publication POST ir nerodo sėkmės; įprastas At naujinti užbaigia busy būseną. Viena ankstesnė fixture publikacija, kur sprendimas priimtas jau po atsakymo, nevadinama atšaukimo įrodymu. Produkcijos katalogas bandymams nekeistas.

Kanoninio Impeccable nepriklausomo reviewer paskutinis verdict: ship tik išvardytoms pataisoms. Detektorius pateikė53 advisory atvejus trijuose atnaujinamų dizaino tokenų tipuose; tai ne53 funkcijos klaidos ir ne visas WCAG auditas. Faktiniai privatūs ekranai: admin-final-desktop, admin-final-mobile, admin-editor-mobile (sąmoningai slinktas redaktorius), admin-finance-desktop (visas finansų puslapis). Viešų klientų duomenų šiose fixture nuotraukose nėra.
