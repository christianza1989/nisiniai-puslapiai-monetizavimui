# Tekstų stilių sutvarkymas ir vieša publikacija

2026-10-10. Savininko pavedimas: užbaigti vietinio Gemini juodraščio šriftų tvarkymą ir paskelbti svetainę. Viešas adresas: https://parasoplansetes-preview.pinet-azprekyba.workers.dev/. Domeno ir indeksavimo paleidimas yra atskira likusi priklausomybė; esamas peržiūros Worker turi noindex ir robots Disallow.

## Planas ir rezultatas

1. Išsaugoti originalų CSS, tekstus ir paketus; patikrinti abiejų repo main. Canonical gate PASS: core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; abu įtraukti į savo šakų bazes.
2. Vienoje sistemoje suvienodinti visus tekstų vaidmenis, išsaugant Manrope ir esamą dizainą. 74 CSS dydžių deklaracijos naudoja bendrus vaidmenų kintamuosius. Esamos latin ir latin-ext WOFF2 kopijos, font-display swap; nėra papildomo dekoratyvinio šrifto ar Google Fonts užklausų.
3. Subalansuoti antraštes ir skaitymo ritmą: pagrindinis tekstas 17/16 px, įžanga 18/17 px, navigacija ir etiketės 15 px, pagalbinis tekstas 14 px, trumpi kreditai 13 px. Antraščių svoris 650, valdiklių 600, teksto 400. Pradžios H1 32–48 px, vidinių puslapių H1 32–44 px; 1280 px ekrane išmatuota 44,64 / 36,48 px. H1 eilutė 1,2, raidžių tarpas -0,02 em, teksto eilutė 1,65 ir normalūs raidžių tarpai. Proza iki 65ch; pastraipų tarpas 18/16 px, prozos skyrių 40/36 px.
4. Tikrinti realius ilgus tekstus ir siaurus ekranus. Forma iki 700 px tampa vieno stulpelio, iki 360 px modelių savybės persirikiuoja. Teksto perteklius neslepiamas. Proceso mygtuko hover balta/#3479fa turėjo 3,99:1; pakeista į #185de5, 5,62:1.
5. Vietinį tekstų overlay pakeisti tikru peržiūrėtu turinio paketu, surinkti, paskelbti ir patikrinti nuotolinį rezultatą.

## Turinys ir nekintamumas

Visi 46 Gemini puslapiai perskaityti. Prieš patvirtinimą pataisytos pastebėtos linksnių, rašybos ir faktinės reikšmės klaidos: Office Plugin, modelio rašiklis, terminalo licencijos, PDF vientisumas, laiko žymos, eIDAS lygių sąlygos ir universalūs pažadai. Korekcijų bei ankstesnių kandidatų istorija saugoma privačiuose output failuose; tai nėra papildomo modelio generavimas ar nepriklausomo kalbininko sertifikatas.

Naudoti native editPage → exact-revision editorialReview → approveReviewedBatch → releaseContent ir bendras public importer. Galutinė nekintama laida `1bf7f1c5-2211-4e0b-8ee6-5e7e0f557b2a`, paketo SHA256 `97ad9b63790c26c956dcea38a5dbd2d8ddecdfe6965bf995a96f9d4c46b64e26`. 46 puslapiai, 215 medijos variantų. ALT pakeitimai įvesti naujais native ID iš tų pačių optimizuotų WebP baitų; kiekvieno šaltinio SHA ir atitikmuo išsaugotas. Naujų nuotraukų negeneruota. Originalios publikavimo datos, URL, ID, tikri išoriniai šaltiniai ir nepaskelbtas klientų piloto puslapis išsaugoti. Kiti devynių nišų paketai nekeisti.

## Faktinės patikros

- 66 public core testai, 5 preview adapterio testai, TypeScript, StepOver rendererio ESLint ir build PASS. Bendras SEO smoke taip pat PASS, tačiau jo default greitossvetaines patikra nėra StepOver ataskaitos pakaitalas.
- Tikras native Worker prieš diegimą: visų 46 puslapių tinkamas 200/404, canonical, šriftai, skriptai, leidžiami ir būsimi vaizdai, svetimų kelių izoliacija, cross-origin POST403, robots, sitemap ir llms PASS.
- 28 realios naršyklės išdėstymo patikros: 7 puslapių tipai × 1280/768/390/320 px. Tekstas neperžengia ekrano, horizontalios slinkties nėra. Lazy vaizdai už ekrano iš pradžių gali neturėti currentSrc; tai ne laikyta sugadintais failais. Leidžiamų vaizdų HTTP ir matomas įkėlimas tikrinti atskirai.
- Pradžia, gido antraštės ir proza, katalogas, produktas, kontaktai, privatumas, gidų sąrašas; mobilus meniu ir gido turinys tikrinti vietiniame juodraštyje. Native tuščios kontaktų formos bandyme name laukas gauna fokusą, 3 px mėlyną kontūrą ir naršyklės pranešimą. Tikri asmens duomenys nesiųsti.
- Privačiame vietiniame juodraštyje papildomai tikrintos 320 px peržiūros su vartotojo teksto tarpais: eilutė1,5, raidės0,12em, žodžiai0,16em, pastraipos2em. Tai nėra naršyklės zoom bandymas.
- Tipografikos detektorius grąžino `[]`. Pagrindinių spalvų kontrastas ir WOFF2 magija/baitų SHA tikrinti; lietuviškos raidės matomos. Vidinės šrifto ašių ir glifų lentelės atskirai neanalizuotos.
- Tikras 200 % naršyklės mastelis UNVERIFIED: IAB jungtis neturi zoom valdiklio, Chrome jungtis neprieinama. Siauro ekrano bandymas jo neatstoja. Visos svetainės prieinamumo, Lighthouse ar Google pozicijų priėmimas neskelbiamas.

## Diegimas ir priklausomybės

Esamas Worker ir D1, be naujo mokamo ištekliaus. Balsas ir formos SMTP lieka išjungti. Ankstesnis laikinas trycloudflare pokalbio serverio adresas nebepasiekiamas, todėl neveikiantis chat widget išjungtas; jo sesijos ar serverio duomenys nenaikinti. Tiesioginis info@pinet.lt kontaktas išlieka. Formos administratoriaus pranešimų įjungimas ir ilgalaikis pokalbio serveris lieka atskiros priklausomybės.

Pirmas diegimas `504a29c6-e22a-4d23-836f-1f2abb193fc9`; pirmoje iškart po deploy patikroje dalis naujų vaizdų kelių laikinai grąžino404. Originalus FAIL išsaugotas. Po propagavimo pakartotinė visų284checks patikra PASS; HTML ir visi leidžiami vaizdai sutapo su nauja laida. Galutinis diegimas `11095d04-6e8a-4226-b8bc-369d317f09e8` pataiso vieną būsimo piloto teksto nuorodos linksnį; 284 galutinės nuotolinės patikros PASS. Vieša pradžia patikrinta 1280 ir320 px, tikras mobilus meniu atsiveria, šriftai loaded, matomi vaizdai įkelti. Galutinė visų46 puslapių tikslių nuorodų etikečių patikra:0 trūkstamų. Kitų9 paketų generated inventory sutikrintas su HEAD: baitinė JSON objekto reikšmė nepakitusi.

Pradinė atkurti galima Worker versija `d70ac26a-3d94-4f36-b9d6-d1610baa8fda`. Privatus vietinis įrodymų katalogas: `output/parasoplansetes-typography-publication-20261010/`; ankstesnės tipografikos patikros `C:/Core/parasoplansetes-gemini-draft-20261010/typography/`. Output, vietinė studio data, raktai, originalūs Gemini failai ir naršyklės vaizdai per Git nekeliami. Source ir apibendrinta ataskaita perduodami savo PR46/17, main automatiškai nesujungiamas.

Gamintojo tikslinimui vienas Treg crawl: actual `0.00125 USD`. Nauji mokami modeliai, paštas, balsas ir infrastruktūra neįjungti. Faktams tikrinti skaityti StepOver pirminiai įrenginių/programų puslapiai bei Europos Komisijos eSignature FAQ; nepavykęs EUR-Lex atvėrimas nevadinamas šaltinio patikra.
