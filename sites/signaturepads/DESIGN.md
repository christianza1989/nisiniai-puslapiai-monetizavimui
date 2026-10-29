# Esamos tapatybės išsaugojimas

Pagrindas – 2026-10-29 faktinis `signaturepads.lt` desktop vaizdas, WordPress tekstai ir originali medija. Tai techninė migracija: balta ir šviesiai mėlyna, Open Sans, siaura horizontali antraštė, nuotraukos fonas, išskleidžiami tekstai ir produktų paveikslai. Produktas išdėstomas dviem stulpeliais, apačioje panašūs produktai. Kataloge lieka kategorijos, kainos ir produktų kortelės. Naujų kompozicijų ar rinkodaros tekstų neieškoma.

## Tekstų sistema ir patikros planas

- [x] Išlaikyti Open Sans ir lietuviškas raides; lokaliai aptarnauti tikrus 400–700 svorius.
- [x] Bendras tekstas 14–16 px, apie 1,75 eilutės aukštis; antraštės 22–30 px pagal vaidmenį; mobiliajame nemažinti teksto dėl vietos.
- [x] Vienas 1140 px pločio karkasas, produkto dviejų stulpelių maketas ir siauresnis ilgo teksto plotis.
- [x] Matomi keyboard focus, atidaromas mobilus meniu, natyvūs details/summary ir tikros nuorodos.
- [x] Faktinės desktop/mobile nuotraukos, 320 px reflow ir tekstų tarpų patikra.
- [ ] Tikras naršyklės teksto padidinimas iki 200%: UNVERIFIED, neteigiama, kad viewport patikra jį atstoja.
- [x] Peržiūroje patikrintos visų 28 URL source fragmentų reikšmės; nesutrumpinti parametrai, nepridėta produktų savybių.

Originalios produkto ir logotipų nuotraukos naudojamos to paties savininko svetainės migracijai. Failų kilmė, URL ir SHA saugomi atskirame asset-manifest. Naudojami esami WordPress skirtingo dydžio vaizdai; nauji vaizdai negeneruojami.

## 2026-10-29 peržiūros įrodymai

`D:/Core/output/signaturepads-migration-20261029/` turi desktop homepage, mobile homepage, desktop katalogo ir mobile produkto vaizdus; atskirai `PREVIEW-VERIFICATION.json` ir `reflow-check.json`. Patikrintas mobilus meniu, galerijos keitimas, zoom dialogo atidarymas/uždarymas ir originalių kategorijų antraščių įtraukimas. Detector vienintelis perspėjimas dėl Open Sans ignoruojamas pagrįstai: šriftas sąmoningai išlaikomas pagal savininko nurodymą nekeisti esamos tapatybės.

Tai vietinė nepatvirtinto migracijos snapshot peržiūra. Production Core publikavimo adapteris ir bendro SEO/GEO priėmimas dar neintegruoti; nėra production Lighthouse ar paleidimo deklaracijos. Savininkas paprašė radinius ir papildomus optimizavimus pirmiausia aptarti.

## Šešių programinės įrangos aprašymų patikros planas

Rokas 2026-10-29 pasirinko 1 variantą: Codex gali parašyti šiuos šešis aprašymus iš patikrintų gamintojų šaltinių. Tai konkreti autorystės išimtis, ne publikavimo leidimas. Išlaikomas esamas produkto maketas ir bendri `.sp-prose` p / h2 / ul / a vaidmenys; CSS ir šriftai nekeičiami.

- [x] Aprašymų skirtumai: Java SDK, Windows COM SDK, vietinė programa, žiniatinklio programa, Adobe įskiepis, Pro automatizavimas. Produktų vardai, URL ir kainos neliečiami.
- [x] Visų šešių tekstų kalba, metaduomenys ir techniniai skaičiai palyginti su gamintojo šaltiniais; nepažadėti licencijų priedai ir teisinė galia nepridedami.
- [x] Visų šešių aprašymų DOM tekstas / antraštės / sąrašai / šaltinių nuorodos 1440 / 390 / 320 px: nėra paslėptų blokų ar horizontalaus overflow, Open Sans įkeltas. Adobe faktinės desktop / mobile / mobile-reading ekrano nuotraukos perskaitytos.
- [x] 320 px ir vienu metu taikomi vartotojo teksto tarpų nustatymai Adobe produkto tekste: turinys lieka matomas, horizontalaus overflow nėra; tikras 200% browser zoom lieka UNVERIFIED.

Įrodymai: output `software-browser-check.json`, `software-adobe-desktop.png`, `software-adobe-mobile.png`, `software-adobe-mobile-reading.png`. Desktop tekstas Open Sans 14 px / 25,2 px, mobile 15 px / 27 px, desktop skaitymo plotis 547,5 px. Tekstas rgb(74,74,74), pabrauktos nuorodos rgb(35,126,146), baltas fonas. Išdėstymo ar šriftų defektų šioje ribotoje patikroje nenustatyta; CSS nekeitėme.

## Atitikimo originalui palyginimas po savininko prašymo

2026-10-29 palyginti 8 pagrindiniai adresai, 32 originalo / peržiūros desktop / mobile vaizdai. Ankstesnė tekstų / URL ir šešių naujų aprašymų patikra nepakeičia viso maketo atitikimo patikros. [VISUAL-AUDIT.md](VISUAL-AUDIT.md) fiksuoja 9 skirtumų grupes: dvi praleistos kategorijų iliustracijos ir jų maketas, mobile tinkleliai, apatinis logotipas, rėmeliai, katalogo valdikliai, kortelių užvedimo būsena, panašūs produktai, tipografika / antraštė ir statinių puslapių dubliuotos antraštės. Tai atviri radiniai, pataisos šiame audite nedarytos. Originalių 1×1 sekiklių skaičiaus nelaikome turinio paveikslėliais; spaudos puslapio iliustracijos praradimo įtarimas atmestas.

## Patvirtinta atkūrimo partija

Rokas tiesiogiai pavedė sutvarkyti visus audito skirtumus vietinėje versijoje ir išsaugoti visas nuorodas. Planas: viena suderinta VF01–VF09 realizacija per-site renderer / CSS / client, paskui desktop/mobile patvirtinimas ir URL / teksto regresija. Bendro Core modelio / SEO / publikavimo bibliotekų nekeisti.

- [x] Kategorijų originalios iliustracijos, įvadas šalia paveikslo ir likęs tekstas platesniu maketu.
- [x] Planšečių, monitorių ir panašių produktų mobile 2 stulpeliai; software katalogas – originalo vienas stulpelis.
- [x] Footer logotipas, home rėmeliai, logotipų mastelis, kontaktų nuotraukos kampai.
- [x] Natūralūs kainos intervalo slankikliai, matomas rikiavimas pagal kainą; query / URL išsaugojimas.
- [x] Alternatyvios kortelių nuotraukos, Quick View hover / keyboard būsena, 3 desktop panašių produktų stulpeliai, didinimo ir grįžimo į viršų ženklai.
- [x] Originalo Open Sans vaidmenys: žalios #276d72 antraštės, 32 px home antraštės, 16 px / 600 kortelės; mobile viršutinis logotipas ~142 px; aktyvus meniu.
- [x] Statinių puslapių vienas H1 iš esamos turinio antraštės, 720 px antraštės ir 560 px teksto stulpelis, pagal actual originalą.
- [x] 26 aktyvūs URL / 160 vidinių tikslų ir originalus tekstas; 1440 / 390 / 320 px, intervalų / rikiavimo / galerijos / meniu / quick view / teksto tarpų būsenos. Tikras 200% browser zoom ir actual touch – UNVERIFIED, nepaslepiama viewport bandymu.

Rezultatai ir įrodymai: [VISUAL-RESTORATION.md](VISUAL-RESTORATION.md). Ši dalis pakeičia ankstesnę atvirų VF01–VF09 radinių būseną; istorinė audito ataskaita nepakeista. CSS laikomas vienoje per-site sistemoje, be papildomo override failo. Open Sans 400–700 svoriai išlaikyti; mažo teksto / mygtukų akcentas tamsesnis dėl kontrasto, o antraščių spalva atkurta iš originalo.
