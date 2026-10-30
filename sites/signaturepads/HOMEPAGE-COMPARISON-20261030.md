# Pagrindinio puslapio nuotraukų, fonų ir slinkimo palyginimas

2026-10-30. Būsena: **OPEN_FINDINGS**. Tai naujas viso pagrindinio puslapio palyginimas po dviejų darbuotojų nuotraukos atkūrimo. Ankstesnės ataskaitos lieka istoriniu įrodymu; jų techniniai PASS neuždaro žemiau pateiktų naujų radinių.

Visos 13 originalo vaizdų šeimų yra vietinėje versijoje. Abiejų fotografinių fonų `fixed` / `scroll` režimai atitinka originalą. Daugiau prarastų turinio nuotraukų nerasta. Tačiau liko 8 skirtumų grupės, tarp jų 11 senų paveikslėlių adresų, kurie originale veikia, o vietoje grąžina 404. Todėl viso pagrindinio puslapio atitikimas ir visų medijos nuorodų išsaugojimas dar nėra PASS.

Gyva svetainė, WordPress, DNS, hostingas, paštas, vietinis rendereris ir native turinio paketas šiame audite nekeisti. Formos nesiųstos; naršyklės užklausoms leisti tik GET / HEAD. Peržiūra lieka <http://127.0.0.1:8956/>.

## Patikros pagrindas

- Originalas: <https://signaturepads.lt/>, naujai atidarytas ir fiziškai nuslinktas per visas sekcijas, kad suveiktų Nitro offscreen medija. Tai nėra vien pradinio DOM inventorius.
- Core dokumentacijos šaltinis: `efd3ea01852eecead4f5d4cc454b40578fe98497`; PUBLIC ir faktinis vietinis variklis: `f20d7683637e0c381c5b9edca757146362938ecb`.
- Native paketas: `94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25`, 26 puslapiai / 204 medijos failai. Paketas šiame audite nekeistas.
- Pločiai: 1790, 1440, 1025, 1024, 768, 390 ir 320 CSS px; 14 originalo / vietinės versijos scenarijų. Chrome, telefonams `isMobile` / `hasTouch` ir tikri Playwright `tap` veiksmai emuliacijoje.
- 200 pagrindinių ekrano kadrų ir 6 papildomi meniu kadrai. Visi skyriai vizualiai peržiūrėti 1440 / 390 px palyginimo lapuose; papildomai peržiūrėti tiksliniai 1790 / 1025 / 1024 / 768 / 320 px kadrai, visi 8 akordeonų turiniai ir uždaryta būsena. Tai nuosekli šio agento peržiūra, ne nepriklausomų specialistų vertinimas.
- Patikrinti `img` ir jų `srcset` / lazy variantai, CSS ir pseudo-elementų fonai, apkirpimas, permatomumas, užapvalinimai, sekcijų išsidėstymas, slinkimas, meniu, akordeonai ir kontaktų inkaras.

Įrodymai: [ACCEPTANCE.json](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/ACCEPTANCE.json), [matavimai](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-summary.json), [papildomos būsenos](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/supplement.json). Tame pačiame aplanke palikti vykdyti `.mjs` skriptai ir originalo aktyvinto DOM kopijos.

## Visų sekcijų vaizdų inventorius

| Vieta | Originalo vaizdas | Rezultatas |
| --- | --- | --- |
| Viršus ir poraštė | `logo-o3.png` | Yra; mobile originale papildomai matoma to paties logotipo prisegto header kopija |
| Hero fonas | `banner900000058.jpg`, 1920 × 837 | Yra; kairė / viršus, nekartojamas, desktop >1024 fixed, <=1024 scroll |
| Hero planšetės | `ant-delno2-1` | Yra; originalas pats deklaruoja 600 / 768 ir kitus tos pačios nuotraukos variantus |
| Įrangos kortelės | `Paraso-plansetes-menu`, `monitoriaus-ispletimas`, `mobilus-sprendimai`, `programine-iranga` | Visos keturios yra |
| Programinės įrangos fonas | `pexels-mikhail-nilov-7988079.jpg`, 1920 × 1282 | Yra; centras / centras, nekartojamas, >1024 fixed, <=1024 scroll |
| Programinės įrangos dėžutė | `signoSign_2_SoftwareBox` | Yra; dydis ir skydelio pateikimas skiriasi, žr. H04 |
| Pasitikėjimo kortelės | `images.jpg`, `rc.png`, `Ap.png` | Visos trys yra; logotipų vaizdų dydis 250 × 200 išlaikytas |
| Kontaktai | `Susisiekite_su_mumis.jpg` | Yra; mastelis / paraštės skiriasi, žr. H06 |

Iš viso 11 unikalių įprastų vaizdų šeimų ir 2 fotografinių fonų. Visuose 7 pločiuose sutampa tos pačios 13 šeimų; nėra nei prarastos, nei papildomos nuotraukos. Mobilūs `600x496` ir `600x484` variantai atpažįstami pagal originalo viename `img srcset` deklaruotą ryšį su jau susieta šeima. Tai įrodo vaizdo tapatybę, bet **neįrodo seno URL veikimo** – pastarasis patikrintas atskirai H01.

## Radiniai ir konkretūs sprendimai

### H01 — P1: 11 senų paveikslėlių URL grąžina 404

Originalo pagrindinio puslapio `img` / `srcset` deklaruoja 22 skirtingus WordPress vaizdų adresus. 11 jų nėra dabartiniame alias sąraše. Visi 11 tikrame originale grąžina HTTP200 ir `image/png` arba `image/jpeg`, o faktinis vietinis Core – HTTP404. Tai apima didžiosios planšečių iliustracijos 300 / 600 / 1024 ir originalų dydį, keturių kategorijų 300 px variantus bei programinės įrangos dėžutės 300 / 600 ir originalų dydį.

Nuotraukos dabartiniame puslapyje nėra sugedusios: jis naudoja native WebP. Rizika – senos išorinės ar indeksuotos tiesioginės medijos nuorodos. Ankstesnė 226 alias regresija patikrino esamą sąrašą; ji netikrino, ar sąrašas apima visus tikro originalo responsive adresus.

Sprendimas: papildyti bendrą `content-media-aliases` konfigūraciją aiškiai susiejant šiuos 11 adresų su jau patvirtintomis tos pačios nuotraukos šeimomis, išlaikant approval / host filtrą. Nereikia naujų nuotraukų ar jų generavimo. Po pataisos visus 22 paveikslėlių adresus ir abu fotografinių fonų adresus tikrinti HTTP lygiu, greta ankstesnės visų alias regresijos.

Tikslus sąrašas ir abiejų serverių atsakymai: [legacy-image-proof.json](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/legacy-image-proof.json).

### H02 — P2: kompiuteryje meniu lieka prisegtas

1440 / 1790 ir 1025 px originale meniu nuslenka už ekrano, vietoje `.sp-header` yra `position:sticky` ir lieka virš fotografijų. <=1024 px originalas iš tiesų turi atskirą fiksuotą mobile header kopiją, todėl telefono prisegimas savaime nėra defektas.

Sprendimas: originalo ribą taikyti ir header: desktop nefiksuoti, <=1024 išlaikyti prieinamą prisegtą meniu. Tikrinti 1024 / 1025 ribą ir bent dvi tikras slinkimo padėtis. [Desktop slinkimo palyginimas](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-1440-1.png).

### H03 — P2: įrangos tinklelis per anksti tampa dviejų stulpelių

768 px originalas rodo keturias korteles vienoje eilėje; vietinė versija rodo 2 × 2. Tai reikšmingai pastumia žemyn likusias sekcijas. 390 px abu variantai yra vieno stulpelio, tačiau originalo kortelės beveik liečiasi, vietoje naudojamas 40 px tarpas ir siauresnės kortelės. Skiriasi rėmelių storis, spalva ir pačių iliustracijų užapvalinimas.

Sprendimas: perkelti įrangos lūžio ribą pagal faktinį originalą, atkurti mobile kortelių plotį ir tarpus. Originalo 8 px horizontalaus overflow ties 768 / 1024 / 1025 px nekopijuoti; vietoje jo nėra.

Įrodymai: [768 originalas](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/original-768-equipment.png), [768 vietinis](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/local-768-equipment.png), [390 palyginimas](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-390-2.png).

### H04 — P2: hero ir programinės įrangos skydelių dydžiai bei permatomumas

Originalo akordeonų balti skydeliai nepermatomi, vietoje jų fonas `rgba(255,255,255,0.96)` ir matosi foninės nuotraukos detalės. Originalo hero bei software iliustracijoms taikomas `opacity:0.95`; vietinės iliustracijos nepermatomos. Taigi šių dviejų vaidmenų permatomumas perkeltas netinkamai.

1440 px software originalo akordeonas ~585 px, iliustracija ~490 px; vietoje naudojami lygūs 548 px stulpeliai ir dar 30 px iliustracijos paraštė. 390 px originalo dėžutės iliustracija ~315 px pločio, vietoje ~271 px dėl 22 px paraštės. Hero iliustracija atitinkamai ~315 ir 300 px. 320 px originalo akordeono plotis 248 px, vietinis 280 px, todėl skiriasi eilučių lūžiai.

Uždarius software pirmą punktą, vietinis akordeono baltas fonas lieka ištemptas iki iliustracijos aukščio; originale akordeono aukštis prisitaiko prie jo turinio. Tai nėra dingęs tekstas: visi 8 tekstai ir jų atidarymo būsenos sutampa.

Sprendimas: atskirti hero ir software stulpelių proporcijas, atkurti natūralų akordeono aukštį ir originalo iliustracijų pateikimą. Sutvarkius sekcijų aukštį, dar kartą lyginti centro fono iškirpimą – vien teisingas `background-position` negarantuoja to paties iškirpimo skirtingo aukščio sekcijose. Kontrasto ir fokuso pagerinimus išlaikyti.

Įrodymai: [software desktop](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-1440-3.png), [uždaryta / keista būsena](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-1440-9.png), [software mobile](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-390-4.png), `focused-skins.json`.

### H05 — P3: pasitikėjimo kortelių tarpai ir rėmeliai

Visi trys teisingi logotipai ir jų 250 × 200 dydis išlikę. 390 px originalo logotipų viršūs nutolę ~311 px, vietoje ~328 px; kortelės siauresnės, tarpai didesni, rėmeliai šviesesni. Sprendimas: suderinti kortelių apvalkalą ir vertikalius tarpus, nekeisti logotipų ar nuorodų. [Palyginimas](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-390-5.png).

### H06 — P3: kontaktų ir poraštės geometrija

390 px kontaktų nuotrauka originale ~354 px, vietoje 374 px; poraštės logotipas ~202 px ir 187 px. Skiriasi tarpai tarp nuotraukos, antraštės, laukų bei poraštės. Desktop kontaktų nuotrauka ~550 px ir 535 px. Poraštės fono matuota RGB reikšmė skiriasi tik vienu mėlynos kanalo vienetu: 225/241/246 ir 225/241/245 – tai mažas kosmetinis skirtumas, ne trūkstamas fonas.

Sprendimas: suderinti nuotraukos, logotipo ir išorinių tarpų vaidmenis. Aiškus formos sutikimas, matomos būsenos ir pagerintas kontrastas paliekami; jų papildomos vietos nelaikyti netyčine klaida. [Kontaktų ir poraštės palyginimas](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/comparison-390-6.png).

### H07 — P2: meniu struktūra ir pagrindinė „Įranga“ nuoroda

Originalo mobile meniu turi Pagrindinis / Įranga / Kontaktai, kategorijos atidaromos po Įranga. Vietoje kategorijos išklotos į penkių nuorodų meniu. Desktop originale „Įranga“ taip pat yra nuoroda į `/iranga/paraso-plansetes/`; vietoje tai tik `summary` valdiklis. Pats adresas niekur nedingęs ir pasiekiamas kitose vietose, tačiau nuorodos paspaudimo elgesys nėra išlaikytas.

Sprendimas: grąžinti tą pačią naršymo hierarchiją ir atskirti tikrą Įranga nuorodą nuo prieinamo submenu atvėrimo valdiklio, išlaikant keyboard / touch valdymą. [Originalo meniu](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/original-390-menu-verified.png), [vietinis meniu](D:/Core/output/signaturepads-migration-20261029/homepage-comparison-20261030/local-390-menu-verified.png).

### H08 — P3, pasirenkama: pasirodymo slenkant animacijos

Originale įrangos ir desktop pasitikėjimo kortelės turi `fadeIn` 1,25 s animaciją. Vietoje jos pasirodo iš karto. Tai elgesio skirtumas, ne dingęs blokas. Galima atkurti vienkartinį opacity efektą su `prefers-reduced-motion` išimtimi ir be Elementor / Nitro priklausomybės. Pagal greičio tikslą tai žemiausio prioriteto darbas; neprivaloma kopijuoti seno įskiepio vykdymo ar turinio slėpimo iki JS.

## Kas patikrinta ir ko nekopijuoti

- Abiejų fotografinių fonų režimai ir visi 13 vaizdų šeimų: PASS septyniuose pločiuose. Originale fonai 1920 px natūralaus pločio, vietoje WebP atvaizduojami 1920 px masteliu. Pats mastelis teisingas; H04 lieka kompozicijos skirtumai.
- Visų 8 akordeonų tekstai ir atidarymo būsenos: PASS 1440 / 390 px; scenarijai įvykdyti ir kituose pločiuose. Native `details` uždarymo negalima vertinti vien jo vaiko `getComputedStyle().display` – pirminiame trace šis laukas nėra matomumo įrodymas.
- 14 originalo desktop verslo / naršymo taikinių ir 13 matomų mobile taikinių turi atitikmenis vietoje; įskaitant klientų, kontaktų, teisinių puslapių ir kategorijų adresus. H07 skiria taikinio egzistavimą nuo konkretaus valdiklio elgesio. H01 medijos adresai į šį naršymo taikinių PASS neįskaičiuojami.
- Vietoje nėra sulūžusių dabartinių vaizdų, vaizdų HTTP klaidų ar horizontalaus slinkimo septyniuose pločiuose. Originalo 8 px overflow ties tarpiniais pločiais nėra atkūrimo tikslas.
- Originalo kontaktų inkaras nuslenka į sekcijos vidurį; vietoje ji nusileidžia su 100 px tarpu ir matoma antrašte. Jo URL išlikęs. Seno nepatogaus nusileidimo nekopijuoti.
- NitroPack ženklo, Statcounter sekiklio ir WordPress krepšelio likučių neatkurti. Savininkas atsisakė prekybos; sekiklis nėra turinio nuotrauka.
- Detector vykdytas vieną kartą: Open Sans perspėjimas atmestas, nes tai išlaikomas originalo šriftas; `side-tab` radinys susijęs su katalogo sidebar, už šios homepage apimties. Detector nesprendžia šio atitikimo vertinimo.

## Pataisų priėmimas ir ribos

Pirmiausia sutvarkyti H01, tada vienoje vietinėje partijoje H02–H04 ir H07; H05–H06 derinti kartu nekeičiant tekstų, kontaktų, kainų ar URL. H08 palikti paskutinį ir laikyti pasirenkamu. Naujų vaizdų, mokamų įskiepių ar viešos prozos nereikia.

Priimant pataisas palyginti tokias pačias originalo / vietinio sekcijų ir scroll padėtis, patikrinti visus 24 pagrindinio puslapio legacy vaizdų / fonų adresus, 1024 / 1025 ribą, 768 px tinklelio ir 320 / 390 px mobile maketus, akordeonų uždarymą bei nuotraukų įkėlimą. Saugoti dabartinių native šeimų ir kitų 25 puslapių nekeistumą. Bendrų techninių testų skaičius nepakeičia šio vizualinio priėmimo.

Visi audito paleisti headless naršyklių procesai uždaryti `finally`. Fiziniai telefonai, Safari / Firefox, tikras browser zoom ir produkcinis diegimas šiame audite nepatikrinti. Ankstesnė tikro pašto / INBOX nežinomybė lieka atskiras darbas. Ataskaita nepatvirtina paleidimo ir nieko nepublikuoja.
