# Antraštės ir pirmojo ekrano lygiavimas — 2026-10-10

Savininko ekrano nuotraukoje pirmasis ekranas atrodo pasislinkęs į dešinę. Tikroje 1904 px naršyklėje atkurta priežastis: 1889 px pločio nuotrauka siekia dešinį kraštą, bet tekstas ribojamas 1248 px konteineriu ir prasideda ties x344,5. Tai vizualinė kompozicijos problema, ne horizontalus puslapio perpildymas.

Pakeistas tik companion `components/niche/parasoplansetes-site.module.css` photographic homepage išdėstymas. Antraštė ir hero dalijasi vienu `--first-screen-width:1600px` centruotu konteineriu. Išsaugoti 24 px vidiniai desktop tarpai, tekstų vaidmenų šriftai / dydžiai / svoriai / spalvos. H1 leidžiama 38rem skaitymo zona, įžangai 32rem; pašalintas plataus ekrano `46vw` priverstinis aukštis. Esama nuotrauka, tekstai, logotipas, visos nuorodos ir turinio paketas nepakeisti. Kitų nišų stiliai nepaveikti.

## Faktinės patikros

- Canonical freshness `continue` PASS abiem repo: core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`.
- Vietinė tikra naršyklė: 1904, 1280, 1024, 768 ir 320 px. Visuose horizontalios slinkties nėra; antraštės ir hero plotis sutampa. 1904 px ekrane naudingo turinio plotis 1889 px, abu konteineriai nuo x144,5 iki x1744,5: abu išoriniai tarpai po 144,5 px. Logotipo ir H1 kairysis kraštas x168,5. Hero aukštis 709,95 px, H1 trys eilutės; anksčiau keturios ir hero 797,23 px.
- 320 px meniu atvertas ir tikros navigacijos nuorodos matomos; 320 px PDF gido antraštė neperpildyta. Šrifto ir teksto dydžiai nepakeisti; naujas visos svetainės 200% zoom / user text-spacing auditas nebuvo atliekamas ir nėra šios siauro pataisymo ataskaitos PASS.
- Impeccable layout detector: `[]` (0 findings), ne vizualinės kokybės pakaitalas.
- `npm run build` PASS. Esami vinext route klasifikavimo ir kitų nišų CSS/chunk įspėjimai lieka baziniai. Naujų unit testų mažam CSS pakeitimui nepridėta.
- Wrangler 4.92.0 lokalios `deploy --help` ir dabartinė oficiali dokumentacija patikrintos. Dry-run PASS. Tikras diegimas į esamą `parasoplansetes-preview` PASS, versija `d6825aab-4426-4572-bd3c-3ec33c4ab6e0`.
- Hosted naršyklė 1904 px patvirtina tokius pačius 144,5 px paraštes, x168,5 logo/H1 kraštą ir 0 perpildymo. Hosted 320 px taip pat 0 perpildymo. Pirmas mobilus bandymas buvo ne aktyviame viewport lange ir vis dar rodė 1904 px; tai nelaikyta mobile įrodymu. Tikras 320 px bandymas atliktas aktyviame langelyje ir galutinis `public-mobile.png` perrašytas teisinga nuotrauka.

Įrodymai: `output/parasoplansetes-header-hero-20261010/`: local-wide, local-1280/1024/768/320, local-menu, local-guide, public-wide, public-mobile PNG; local-checks JSON; layout-detector JSON; build/dry-run/deploy logs. Antras vietinio serverio paleidimas atsisakė užimto 8835 porto; naudotas jau veikiantis to paties checkout serveris, joks svetimas procesas nestabdytas.

Prieš deploy actual Worker nustatymai nuskaityti. Dedicated D1 `98f4d3c5-11a4-4d19-a6ec-d568a96da0f7`, CHAT/VOICE/LEAD_SMTP/LEAD_EMAIL OFF, esami vars išsaugoti `--keep-vars`, observability enabled ir traces OFF išlaikyti. Patvirtintas turinio paketas SHA256 `9d94e82ae07be3a28406373e6b4f0c9808549e26a057e9b81aad7633f73e2cfa`, ta pati immutable laida `cb6be84b-426e-45d2-a117-4bd6c1cf2880`. DNS / indeksavimo / mokamų paslaugų pakeitimų nėra. Ankstesnė atkuriama Worker versija `489965ee-0f06-4b56-b1fa-8d260049246e`.
