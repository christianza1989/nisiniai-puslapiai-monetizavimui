# Promedical tekstų stilių planas

2026-10-10. Savininko pavedimas: peržiūrėti ir sutvarkyti visos svetainės šriftus, dydžius, išdėstymą, eilučių ir raidžių tarpus bei kontrastą. Tai esamos tapatybės patobulinimas. Turinys, faktai, nuorodos ir 57 gidų publikavimo kalendorius lieka savo patvirtintose revizijose.

## Peržiūros išvados

Naršyklėje peržiūrėti pradžios, katalogo, ilgo produkto pavadinimo ir kontaktų puslapiai 1440 px bei 390 px ekranuose. Papildomai peržiūrėti visų bendrų teksto vaidmenų stiliai kode. Figtree su Arial atsarginiu šriftu dera su medicinos įrangos katalogu. Antras šriftas nereikalingas. Vietiniai lotyniškų ir lietuviškų simbolių šriftai jau naudojami su `font-display: swap`.

Prieš pataisą telefone produkto kodas buvo 10 px, aprašymas 12 px, produkto nuoroda 11 px, o poraštės tekstas 10 px. Dvi produktų kortelės 390 px ekrane palieka apie 156 px teksto koloną: ilgas modelio pavadinimas suskyla į daug trumpų eilučių. Formų, filtrų, šaltinių ir metaduomenų dydžiai turi atskiras, nevienodas išimtis. Tabletėje pradžios H1 yra fiksuotas 44 px, todėl užima neproporcingai daug vietos siauroje dviejų kolonų kompozicijoje. Antraščių raidės suspaustos vienodai nepriklausomai nuo jų dydžio; logotipas turi atskirą tyčinį prekės ženklo suspaudimą.

## Numatyta sistema

| Teksto paskirtis | Dydis įprastai | Eilučių aukštis | Svoris ir tarpai |
| --- | --- | --- | --- |
| Bendras tekstas, įvesties laukai | 16 px | 1,6; laukuose 1,5 | 400, normalūs raidžių tarpai |
| Ilgas produkto, gido ir informacinio puslapio tekstas | 17 px; telefone 16 px | 1,7 | 400, iki 72ch eilutė |
| Produkto kortelės aprašymas | 16 px | 1,55 | 400, antrinė žalsva spalva |
| Navigacija, mygtukai, etiketės | 15–16 px | 1,4–1,5 | 500–600 |
| Metaduomenys, kodai, pagalbiniai paaiškinimai | 13–14 px | 1,5–1,6 | 400–500, skaitomi be mažinimo telefone |
| Kortelių pavadinimai | 18 px; telefone 17 px | 1,4 | 600, raidžių tarpas −0,01em |
| Sekcijų H2 | 26–32 px | 1,25 | 600, raidžių tarpas −0,02em |
| Puslapio H1 | 30–40 px; produkto 28–32 px | 1,2–1,25 | 600, raidžių tarpas −0,02em |
| Pradžios H1 | 34–52 px pagal ekrano plotį | 1,15 | 600, raidžių tarpas −0,025em |

Dydžiai nustatomi `rem` vienetais, kad tekstas galėtų prisitaikyti prie naršyklės šrifto nustatymų. Įprasta teksto spalva #153c32, antrinė #53695f; žalias veiksmas #087a4d. Laukų pavyzdžiai turi aiškią antrinę spalvą. Svarbą rodo dydžio, svorio ir erdvės derinys. Logotipo paaiškinimui paliekama 11–12 px išimtis, o kompaktiškam produktų skaitikliui – 12 px. Katalogo modelių kodai ir kita pagalbinė informacija nemažinami žemiau 13 px.

## Įgyvendinimo tvarka

1. Viename Promedical CSS modulyje įvesti bendrus tipografijos vaidmenis. Kitų svetainių globalių stilių nekeisti.
2. Suvienodinti pagrindines, sekcijų ir kortelių antraštes; ilgiems katalogo pavadinimams naudoti natūralų eilučių laužymą, ne vienodą trumpų antraščių balansavimą.
3. Padidinti smulkų katalogo, formos, šaltinių, metaduomenų ir poraštės tekstą. Siauresniame nei 520 px ekrane produktus rodyti viename stulpelyje; kategorijoms palikti dvi trumpesnes kolonas. 721–1050 px ekrane pradžios produktų ir kategorijų tinklelį taip pat sumažinti iki dviejų kolonų: faktinė 768 px peržiūra parodė, kad keturiose kolonose ilgi pavadinimai vis dar pernelyg suskaidomi. Paveikslų `sizes` turi atitikti naują kortelės plotį.
4. Išlaikyti nuoseklų pastraipų ritmą: apie 20 px po pastraipos, daugiau erdvės prieš naują teksto antraštę, mažiau po jos. Ilgą tekstą apriboti 72ch, formų ir šoninių paaiškinimų eilučių nesuspausti.
5. Patikrinti visus puslapių tipus ir ilgo teksto atvejus 1440, 768, 390 ir 320 px ekranuose. Atskirai patikrinti publikavimui paruoštus gidus privačiame būsimo laiko rendererio bandyme, nekeičiant tikrų datų.
6. Paleisti esamas rendererio ir SEO regresijas, normalų build, tipografijos mechaninę peržiūrą ir deploy dry-run. Vienoje bendroje naršyklės peržiūroje surinkti trūkumus, vienu taisymų rinkiniu pašalinti ir patvirtinti. Įdiegus patikrinti gyvą puslapį ir išsaugoti ekrano kopijas.

## Įgyvendinimo rezultatas

Planas įgyvendintas ir įdiegtas į Cloudflare (780b04d1-8ac5-4b41-ab73-e5a38f858dc2). Įprastas tekstas ir kortelių aprašymai telefone – 16 px, kodai – 13 px, metaduomenys – 14 px. Antraštėms paliktas 600 svoris, tarpai ir raidžių suspaudimas suvienodinti. Faktinė peržiūra apėmė 1440, 768, 390 ir 320 px ekranus; visų 57 paruoštų gidų pavadinimai, teksto dydžiai ir pločio ribos patikrinti 320 px ekrane. Horizontalus puslapio slinkimas nenustatytas. Pagrindinių naudojamų teksto ir fono spalvų porų kontrastas yra 4,72:1 arba didesnis.

Praėjo 57 esami rendererio testai, TypeScript, susijusi ESLint patikra, visų 10 svetainių SEO regresijos, galutinis surinkimas ir diegimo bandymas. Tiksli patikros apimtis pateikta [tipografijos patikros įraše](verification-20261010/typography-refinement-v1.json). Tikras 200 % naršyklės didinimas liko nepatvirtintas: valdymo įrankio didinimo klavišai nepakeitė išmatuoto mastelio. Patikra siaurame ekrane jo neatstoja.
