# Facebook publikavimo lango patikra

Apimtis: esamo privataus operatoriaus lango papildymas, ne nauja svetainės tapatybė. Išlaikytas esamas sistemos šriftas, mėlyna veiksmo spalva, balti blokai ir pilkas fonas. Taikytos canonical typography ir language-quality sutartys bei impeccable craft floor.

Prieš realizaciją pasirinkta patikra: login / defaultoff, abi leidėjo rūšys ir auditorijos, teksto bei peržiūros formos, ilga nuoroda / kelių eilučių įrašas, desktop dviejų stulpelių ir mobile vieno stulpelio išdėstymas, focus, pause / error / receipt būsenos. Neplėsti į kitų nišų UI perrašymą.

Teksto vaidmenys: body 1rem / 1.55, formos 1rem / paveldėtas line-height, textarea 1.6, h1 1.8rem / 1.2 (mobile 1.55rem), h2 1.25rem. Sistemos šriftas turi tikrus normal / bold svorius; būsenos 650. Pagrindinis tekstas #172233, antrinis #526277 ant balto / #f4f5f8; tekstinės eilutės iki 72ch. Tamsus tekstas ir links / focus išlieka matomi. Ilgos body ir nuorodos wrap; hidden workspace nedemonstruoja privataus teksto prieš auth.

Actual desktop CUA patikrintas operatoriaus login, atskiras numatytai išjungtas verslas, site keitimas ir du galutiniai synthetic receipt. Actual Page ir profile fixture ekranai rodo autoriaus vardą / ID, auditoriją, visą tekstą ir įrašo nuorodą. QA ekrano nuotraukos lieka privačiuose ignored runtime artifacts. Testinių receipt neskelbiame kaip live Facebook priėmimo.

Actual mobile 390 × 844 Codex in-app browser: login, įjungta / pristabdyta būsena, vieno stulpelio forma, ilga leidėjo nuoroda ir kelių eilučių receipt tekstas įskaitomi, horizontalaus overflow nematyti. Actual form save sukūrė ready užduotį; UI pause ją atšaukė, abi ankstesnės visible istorijos liko. Iš actual desktop vaizdo rastas sulipęs receipt link / fixture paaiškinimas pataisytas atskirais block elementais ir wrap; galutinis ekranas peržiūrėtas dar kartą. Impeccable detect abu HTML: exit 0, findings nėra.

Chrome extension authenticated mobile screenshot patyrė atkuriamą capture timeout, todėl galutinė mobile vizualinė patikra atlikta palaikomu Codex in-app browser. Abiejų browser laikinų viewport override atsisakyta. Tikras 200 % zoom per prieinamą tab keyboard kelią nepakeitė matuojamo CSS viewport / devicePixelRatio, todėl 200 % vizualinis PASS neteikiamas; patvirtintas actual 390 px reflow ir įskaitomumas. Tai aiški įrankio patikros riba, ne išgalvotas zoom įrodymas.

Issue142 UI plėtros planas prieš redagavimą: išlaikyti esamus tekstų vaidmenis ir tapatybę; papildyti aiškiai atskirtus įrašo, komentaro ir grupių paieškos laukus, vaizdo / actor-specific group proof pasirinkimą ir searched būseną. Turinį / kanalą tikrina Codex, nėra žmogaus approval vartų. Actual desktop/mobile tikrinti išskleistą komentarų / paieškos formą, ilgas URL, media select ir naujas būsenas; originalios live blocker ir zoom ribos lieka istorijoje.

Issue142 faktinė patikra: Codex in-app browser desktop ir 390 × 844 mobile komentarų / paieškos / vaizdo formos peržiūrėtos. Ilga parent nuoroda telpa input viduje, ilgas leidėjo URL persikelia į kitas eilutes; atskiros veiksmo formos, focus ir fixture receipt lieka įskaitomi. Patikrintas AI vaizdo pasirinkimas. Laikinas viewport reset atliktas. Naujos searched būsenos backend patikrintas, actual Facebook discovery receipt neįrašytas; ankstesnė 200 % zoom riba lieka UNVERIFIED.

Iš actual UI rastas defektas: `label{display:block}` nusvėrė naršyklės numatytą hidden taisyklę, todėl paslėpti kito veiksmo laukai buvo matomi. Pradinis ekranas išsaugotas privačiai; pridėta aiški `[hidden]` taisyklė, po mutacijos / klaidos atnaujinamas scope. Po pataisos iš naujo peržiūrėti desktop/mobile ekranai rodo tik pasirinkto veiksmo laukus. Sugeneruotas vaizdas actual chooser įkeltas į vietinį fixture, matoma tikra peržiūra ir visible įrašas; tai nėra Facebook publikacija. Visų galutinių UI frazių saviredakcija išlaikė tekstų reikšmę ir esamą tapatybę.

Galutiniai abu HTML Impeccable detect 0.1.8: exit 0, findings nėra. Paveiktų source / helper / testų Ruff: PASS; visas bounded paketas 93 PASS. Raw ekrano nuotraukos ir fixture kvitai išsaugoti ignored `runtime/artifacts/facebook-live-2026-10-14/`, ne Git.
