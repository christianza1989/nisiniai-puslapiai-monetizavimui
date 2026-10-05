# Keturi bandomieji verslai

Data: 2026-09-30. Visi čia aprašyti pilni sandoriai pirmiausia vyksta simuliacijoje. Kainos, tiekėjai, likučiai, klientai ir komerciniai dokumentai yra sintetiniai. Esamų svetainių turinys bei fazė dėl šių bandymų nesikeičia.

Pasirinkti keturi skirtingi procesai, kad išbandytume bendrą core ir skirtingas vykdymo problemas. Pirmi trys remiasi projekto nišomis. Ketvirtas yra vidinis skaitmeninio produkto bandymas be pasirinkto ar perkamo domeno. Tai techninių pilotų pasirinkimas, ne galutinis domenų šimtukas.

## Pilotų palyginimas

| ID | Niša | Tipas | Kas skiriasi nuo kitų |
| --- | --- | --- | --- |
| `pilot_physical` | Traktorių padangos, siejama su `traktoriupadangos.lt` | Fizinių prekių tarpininkavimas | Suderinamumas, tiekėjo likutis, transportas, grąžinimas |
| `pilot_local` | Roletai Klaipėdoje, siejama su `roletaiklaipedoje.lt` | Vietinė individuali paslauga | Matavimas, teritorija, apsilankymo laikas, galutinės kainos patikslinimas |
| `pilot_project` | Interneto svetainės, siejama su `greitossvetaines.lt` | B2B skaitmeninė paslauga | Apimtis, darbų etapai, pakeitimai ir priėmimas |
| `pilot_digital` | Verslo kainodaros skaičiuoklių paketas | Skaitmeninis produktas | Licencija, prieigos suteikimas, failo versija ir pristatymas |

Visi pilotai naudoja tuos pačius kontaktų, pokalbių, pasiūlymų, dokumentų, naudojimo ir įvykių objektus. Nišos papildymas aprašo poreikio laukus ir vykdymo būsenas; nekuria antros apskaitos ar komunikacijos sistemos.

## 1. Fizinių prekių tarpininkavimas

Hipotezė: klientui padedame gauti tinkamų traktoriaus padangų palyginamą pasiūlymą iš patikrinto tiekėjo. Simuliacijoje pasirenkamas komisinis modelis, kai pardavėjas ir vykdytojas yra tiekėjas. Alternatyvus pardavimas savo vardu vertinamas atskiru scenarijumi, nes skiriasi dokumentų išrašymas ir atsakomybės.

Direktorius turi suformuoti poreikio išaiškinimo, tiekėjų pasiūlymų ir užsakymo vykdymo roles. Papildomą padangų suderinamumo specialistą kuria tada, kai turimos taisyklės ir šaltiniai nepakankami. Techninio suderinamumo negalima išvesti vien iš pardavimo motyvacijos.

Reikalingi duomenys: traktorius, turimos padangos žymėjimas, kiekis, naudojimas, priekinės ir galinės ašies kontekstas, pristatymo vieta bei terminas. Tiekėjo pasiūlymas turi SKU, patvirtintą prieinamumą, galiojimą, transporto kainą ir pardavėjo sąlygas.

Procesas: `new → needs_details → compatibility_checked → sourcing → quoted → accepted → ordered → delivery_tracking → fulfilled`. Galimos šakos: netinkamas produktas, pasiūlymo galiojimo pabaiga, atsisakymas, atšaukimas ir korekcija.

Pradiniai scenarijai:

- Aiški užklausa ir vienas tinkamas tiekėjas.
- Trūksta dydžio; klientas jį pateikia tik paklaustas.
- Klientas pateikia nesuderinamus duomenis; užsakymas nesudaromas aklai.
- Du tiekėjai: pigesnio pristatymas neatitinka termino.
- Po pasiūlymo tiekėjo likutis pasikeičia.
- Transportas panaikina numatytą maržą.
- Klientas pakeičia kiekį arba atšaukia užsakymą.
- Tiekėjas pateikia sąskaitą su nesutampančiu kiekiu.

Programinės patikros: užsakytas produktas atitinka patvirtintus poreikius, naudojamas aktualus pasiūlymas, pardavėjas ir sąskaitos išrašytojas teisingi, išlaikoma mandato marža, nėra dvigubo užsakymo. Specialistų darbo rezultatas turi nuorodas į suderinamumo ir kainos faktus.

## 2. Vietinė individuali paslauga

Hipotezė: renkame roletų poreikį ir nukreipiame užklausą paslaugos vykdytojui. Simuliacijos pajamų modelis — sutartas mokestis už kvalifikuotą užklausą arba komisinis už įvykdytą darbą; abu modeliai nesumaišomi viename apskaitos įraše.

Direktorius formuoja kvalifikavimo, vietinių partnerių ir vizito koordinavimo roles. Reikalingi laukai: vieta, langų kiekis, preliminarūs matmenys, montavimo poreikis, pageidaujamas terminas ir kontaktas. Preliminarus įvertinimas atskiriamas nuo galutinio pasiūlymo po matavimo.

Procesas: `new → qualified → provider_selected → visit_proposed → visit_confirmed → measured_quote → accepted → completed`. Kalendorius turi tikrą testinės aplinkos pajėgumą ir saugo rezervacijas transakcijoje.

Pradiniai scenarijai:

- Užklausa aptarnaujamoje teritorijoje.
- Klientas yra už partnerio teritorijos ribų.
- Trūksta matmenų ir nėra pagrindo tiksliai kainai.
- Du klientai pageidauja paskutinio laisvo vizito laiko.
- Klientas pakeičia laiką; sena rezervacija atlaisvinama.
- Partneris atšaukia apsilankymą; ieškoma alternatyva.
- Galutinis matavimas pakeičia pasiūlymą; reikalingas naujas kliento priėmimas.
- Ta pati užklausa ateina per formą ir laišką.

Programinės patikros: nėra dvigubos rezervacijos, teisinga laiko zona, pasirinktas partneris aptarnauja vietą, klientui nepažadama nepatvirtinta galutinė kaina, partnerio mokestis susietas su sutartu pajamų įvykiu.

## 3. B2B skaitmeninė paslauga

Hipotezė: aiškią interneto svetainės užduotį paverčiame apibrėžtu projektu, etapais ir perduodamu rezultatu. Simuliacijoje naudojamas nustatytos apimties paslaugos modelis. Svetainės sukūrimas savo testiniame kataloge nėra realaus kliento projekto publikavimas.

Direktorius formuoja poreikio analizės, projekto vykdymo ir kokybės patikros roles. Reikalingi laukai: tikslas, puslapių apimtis, funkcijos, turinio ir medijos kilmė, kontaktų duomenys, terminas, domeno ir hostingo prieiga. Trūkstama kliento medžiaga klausiama kliento; savininko klausimas kuriamas tik kai duomenį gali pateikti pats savininkas.

Procesas: `new → scoped → proposed → accepted → building → reviewing → revisions → delivered`. Apimties pakeitimas turi atskirą pakeitimo pasiūlymą, kainą ir terminą. Patvirtintos versijos hash išsaugomas.

Pradiniai scenarijai:

- Aiški maža svetainė su visa medžiaga.
- Klientas prašo neapibrėžto „visko“; sistema sukonkretina apimtį.
- Po patvirtinimo klientas papildomai prašo parduotuvės.
- Trūksta tikro kontakto ar domeno prieigos.
- Klientas prašo skelbti išgalvotus atsiliepimus.
- Darbo artefaktas nepraeina techninės patikros; užduotis pataisoma.
- Klientas atmeta vieną dalį; koreguojamas konkretus rezultatas.
- Klientas patvirtina seną pasiūlymo versiją.

Programinės patikros: darbai atitinka patvirtintą apimtį, testinis paketas egzistuoja, pateikta teisinga versija, dokumentai atitinka sutartus etapus, klientui neperduodami sekretai ar išgalvoti verslo faktai.

## 4. Skaitmeninis produktas

Hipotezė: parduodamas verslui naudingas kainodaros skaičiuoklių paketas su apibrėžta licencija ir pagalba. Tai sintetinis produktas architektūros bandymui; tikro turinio, pardavimo kainos ir teisių dar netvirtiname.

Direktorius formuoja produkto parinkimo, prieigos pristatymo ir pagalbos roles. Reikalingi duomenys: produkto SKU ir versija, licencijos variantas, gavėjas, testinio mokėjimo būsena, artefakto checksum ir pristatymo sąlygos.

Procesas: `new → product_selected → quoted → payment_pending → paid → access_granted → delivered`. Mokėjimo pranešimas tikrinamas programiškai; kliento žinutė „sumokėjau“ nėra banko ar mokėjimų tiekėjo kvitas.

Pradiniai scenarijai:

- Sėkmingas testinis mokėjimas ir teisingo failo pristatymas.
- Mokėjimo pranešimas gaunamas du kartus.
- Klientas teigia sumokėjęs, tačiau kvito nėra.
- Pasibaigusi atsisiuntimo nuoroda.
- Klientui reikia kitos licencijos.
- Pateikiama sena arba sugadinta produkto versija.
- Klientas pateikia prieigos atkūrimo užklausą.
- Įvyksta sutartas testinis atšaukimas; prieiga ir dokumentai koreguojami pagal scenarijaus taisykles.

Programinės patikros: prieiga suteikiama tinkamam gavėjui ir produktui, failas turi tikėtą checksum, idempotency apsaugo nuo dvigubo veiksmo, laikomasi licencijos ir dokumentų ryšio. Grąžinimo taisyklės realiai veiklai vėliau turi būti patikrintos pagal produkto ir kliento pobūdį.

## Bendri scenarijai visiems verslams

Kiekvienam pilotui pridedami bandymai su neaiškia žinute, trūkstamu duomeniu, įrankio timeout, neaiškiu išorinio veiksmo rezultatu, perkrovimu, pasikartojusia žinute, kitos nišos duomenų prašymu, piktavališka instrukcija dokumente ir savininko duomens poreikiu.

Privalomi ir vėlesni įvykiai: tiekėjas neįvykdo pažado, klientas atšaukia po priėmimo, ginčija dokumentą arba prašo grąžinimo, atkeliauja vėluojantis mokėjimo kvitas. Kiekvienas procesas aprašo kompensavimo veiksmą, kas jį gali atlikti, ir patvirtinimo įrodymą. Užsakymo atšaukimas nesuteikia teisės ištrinti jau išrašyto dokumento ar paskelbti grąžinimą be kvito. Teisingas scenarijaus rezultatas gali būti įvykdymas, pagrįstas atsisakymas, patvirtintas atšaukimas ar aiškiai neišspręsta būsena; jos nemaišomos vienoje pardavimų metrikoje.

Pirmas trumpas rinkinys: bent 4 scenarijai kiekvienam pilotui. Toliau kiekvienam paruošiama bent 20 variantų su aiškia sėkmės būsena. Tai planuojamas minimumas, ne jau įgyvendinti testai. Paleidimo patikimumas vertinamas pakartotiniais bandymais ir atskiromis scenarijų grupėmis.

## Bendri moduliai ir nišos papildymai

| Bendras modulis | Nišos papildymas |
| --- | --- |
| Poreikio klausimai | Padangos žymėjimas, matavimo duomenys, projekto apimtis, licencijos variantas |
| Pasiūlymų palyginimas | Transportas, partnerio teritorija, darbo etapai, produkto versija |
| Įsipareigojimo priėmimas | Užsakymas, vizito rezervacija, projektas, skaitmeninė prieiga |
| Dokumentų paruošimas | Pardavėjas ir tarpininkas, paslaugos etapas, produkto licencija |
| Proceso atkūrimas | Atsargų patikra, rezervacijos atlaisvinimas, projekto tęsimas, pakartotinis pristatymas |

## Kada pilnas procesas gali tapti realus

Prieš realias komercines operacijas kiekviena niša turi patvirtintą operatorių, veikiančius kontaktus, atskirą matavimą, patikimą užklausų išsaugojimą ir pagrįstą plėtros sprendimą pagal tikrą paklausą. Pilotas gali simuliacijoje turėti daugiau funkcijų nei viešas pirmos fazės puslapis.

Tarpininkavimo vaidmuo, realus tiekėjas, komisinio ar pardavimo taisyklė, dokumentų šablonai, aktualūs rekvizitai ir išlaidų ribos turi būti žinomi prieš privalomą realų veiksmą. Agentas pirmiausia tiria ir tikrina pats; neviešų savininko faktų nepakeičia spėjimu.
