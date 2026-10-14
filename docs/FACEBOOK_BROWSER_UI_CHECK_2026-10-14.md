# Facebook publikavimo lango patikra

Apimtis: esamo privataus operatoriaus lango papildymas, ne nauja svetainės tapatybė. Išlaikytas esamas sistemos šriftas, mėlyna veiksmo spalva, balti blokai ir pilkas fonas. Taikytos canonical typography ir language-quality sutartys bei impeccable craft floor.

Prieš realizaciją pasirinkta patikra: login / defaultoff, abi leidėjo rūšys ir auditorijos, teksto bei peržiūros formos, ilga nuoroda / kelių eilučių įrašas, desktop dviejų stulpelių ir mobile vieno stulpelio išdėstymas, focus, pause / error / receipt būsenos. Neplėsti į kitų nišų UI perrašymą.

Teksto vaidmenys: body 1rem / 1.55, formos 1rem / paveldėtas line-height, textarea 1.6, h1 1.8rem / 1.2 (mobile 1.55rem), h2 1.25rem. Sistemos šriftas turi tikrus normal / bold svorius; būsenos 650. Pagrindinis tekstas #172233, antrinis #526277 ant balto / #f4f5f8; tekstinės eilutės iki 72ch. Tamsus tekstas ir links / focus išlieka matomi. Ilgos body ir nuorodos wrap; hidden workspace nedemonstruoja privataus teksto prieš auth.

Actual desktop CUA patikrintas operatoriaus login, atskiras numatytai išjungtas verslas, site keitimas ir du galutiniai synthetic receipt. Actual Page ir profile fixture ekranai rodo autoriaus vardą / ID, auditoriją, visą tekstą ir įrašo nuorodą. QA ekrano nuotraukos lieka privačiuose ignored runtime artifacts. Testinių receipt neskelbiame kaip live Facebook priėmimo.

Actual mobile 390 × 844 Codex in-app browser: login, įjungta / pristabdyta būsena, vieno stulpelio forma, ilga leidėjo nuoroda ir kelių eilučių receipt tekstas įskaitomi, horizontalaus overflow nematyti. Actual form save sukūrė ready užduotį; UI pause ją atšaukė, abi ankstesnės visible istorijos liko. Iš actual desktop vaizdo rastas sulipęs receipt link / fixture paaiškinimas pataisytas atskirais block elementais ir wrap; galutinis ekranas peržiūrėtas dar kartą. Impeccable detect abu HTML: exit 0, findings nėra.

Chrome extension authenticated mobile screenshot patyrė atkuriamą capture timeout, todėl galutinė mobile vizualinė patikra atlikta palaikomu Codex in-app browser. Abiejų browser laikinų viewport override atsisakyta. Tikras 200 % zoom per prieinamą tab keyboard kelią nepakeitė matuojamo CSS viewport / devicePixelRatio, todėl 200 % vizualinis PASS neteikiamas; patvirtintas actual 390 px reflow ir įskaitomumas. Tai aiški įrankio patikros riba, ne išgalvotas zoom įrodymas.
