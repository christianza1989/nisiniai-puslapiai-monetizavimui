# Antigravity techninių aprašymų pritaikymas

2026-10-13. Savininko pavedimas: pritaikyti suredaguotus aprašymus esamuose svetainės puslapiuose pagal bendrą turinio peržiūros ir publikavimo eigą.

## Rezultatas

Integruoti 12 esamų puslapių: šeši įrenginiai, keturios programos / internetinės paslaugos ir dvi apžvalgos. Pakeitimai įdiegti į esamą `parasoplansetes-preview` Worker, aptarnaujantį `https://parasoplansetes.lt/` ir peržiūros adresą. Atskiras naujas svetainės ar turinio variklis nekurtas.

- Dabartiniu laiku matomi 9 atnaujinti puslapiai, kuriuose yra 164 išsamių techninių duomenų eilutės.
- Office Plugin išlaiko 2026-10-31, webSignatureOffice – 2026-11-07, nextGen Pad 5 – 2026-11-14 publikavimo datas, visos 08:00 UTC. Jie patvirtinti ir paruošti, tačiau iki datos viešai grąžina 404.
- Su atskiru vietiniu 2026-11-15 laikrodžiu patikrinti visi 12 puslapių ir visos 223 techninių duomenų eilutės. Ši peržiūra nėra ankstyvas būsimų puslapių viešinimas.
- Visos 34 nepaveiktų puslapių patvirtintos revizijos, ID, adresai, datos ir medijos sąrašai išliko identiški. Išsaugotas privatus 47-asis bandomasis puslapis. Kitų devynių svetainių paketai nepakeisti.
- Visos 215 medijos bylos išliko nepakeistos; naujos nuotraukos negeneruotos.

## Įvestis ir peržiūra

Naudotas `produktai-technine-informacija-20261013/antigravity-result/` aplankas. Originalai ir Antigravity pateikta `private-draft` būsena bei maišos kodai neperrašyti atgaline data. Pritaikyta vieša versija turi atskiras studijos revizijas, faktinę peržiūrą ir naują laidos manifestą.

Patikrinti visų 12 aprašymų SHA-256, visi ID / slug / URL / publikavimo laikai ir šaltinių sąrašai. Lentelių skaitiniai duomenys sutampa su pirminiais aprašymais. Paveldėta manifesto skaičiavimo klaida: webSignatureOffice turi 13 duomenų eilučių, manifeste nurodyta 14. Svetainėje pateikiamos visos 13, duomenys neprarasti. Įvesties manifestas išsaugotas nepakeistas; faktinis skaičius užfiksuotas integracijos patikroje.

Perskaityti visi galutiniai tekstai, PATIKRA ir redagavimo ataskaita. Pritaikant pataisyti dubliuotas „įrenginio“, šalutinio sakinio kablelis, pertekliniai kategoriški žodžiai ir neaiški PDF/A „apsaugos“ formuluotė. Classic ekrano pasukimui nepridėta šaltinyje tiesiogiai nepatvirtinta 180° reikšmė. Programų ir įrenginių suderinamumo reikalavimai pateikiami atskirai.

Panaudoti tos pačios dienos 19 oficialių gamintojo puslapių ir PDF nuskaitymų įrodymai iš ankstesnio tyrimo (0,00285 USD). Šiame integracijos darbe naujų mokamų tyrimų ar modelio užklausų nebuvo. Neperžiūrėtos Atlassian instrukcijos nepriskirtos patikrintiems viešiems šaltiniams. 2021 m. eSignatureOffice brošiūra pažymėta kaip istorinis papildomas šaltinis.

## Faktinės ribos ir pritaikymo sprendimai

Viešai nepateikiami prieštaringi Classic aktyvaus ekrano / jutiklio matmenys ir vidinis matavimo dažnis; 10.0 ir NG 10 aktyvaus ploto reikšmės; NG 10 svoris. Gamintojo patikslinimas tebėra reikalingas tik šiems laukams, o ne visam patvirtintam aprašymui.

NG vaizdo srauto `512K` reikšmė nepateikta be vieneto. NG laikrodžio baterijos eilutė neperkeliama taip, kad dviprasmiškai pažadėtų standartinę datos žymą. Korpuso atidarymo aptikimas nepažadėtas kaip standartinė funkcija; nextGen Pad 5 nepriskirtas kito modelio VESA 100 tvirtinimas ar nepatvirtintas konkretus USB protokolas. Išsamių redakcinių pastabų, „tikslinti“ žymų ir santykinių `.md` nuorodų viešame tekste nėra.

Išlaikyti keturių spalvų 4.3 ekranas, nextGen Pad 5 ±0,4 mm pakartojamumas, Print2NG Windows ARM nepalaikymas ir macOS 13.2 riba. Ethernet / PoE ir NG formų plėtinys pateikiami kaip papildomi priedai / prenumerata. Gamintojo deklaruojama eksploatavimo trukmė ir gamintojo garantijos duomenys nepaversti pardavėjo garantija ar Lietuvoje turimos komplektacijos pažadu. Kvalifikuotojo parašo, dabartinių kainų, atsargų ar pristatymo garantijų nepridėta.

## Turinio ir išdėstymo eiga

1. Išsaugoti pirminiai studijos, viešo paketo ir registro baitai; pakeitimai rengti izoliuotoje studijos kopijoje.
2. Naudotas bendras `editPage`, tikros 12 revizijų `recordEditorialReview`, atominis `approveReviewedBatch` ir `releaseContent`. Kitų puslapių peržiūros neperrašytos.
3. Galutinė peržiūra papildyta tik po tikros vietinės naršyklės patikros. Studijos šaltinis pritaikytas tik įrodžius, kad jis nepasikeitė nuo kopijavimo pradžios.
4. Laida patikrinta bendru verifier, importuota bendru public importer ir sukompiliuota. Laikinos ankstesnių paketų kopijos perkeltos į privatų output, ne į viešą Git.
5. V1 schema nepakeista: techniniai duomenys išsaugoti patvirtintuose sąrašų blokuose. Daugiau kaip 30 eilučių grupės padalytos neprarandant duomenų. StepOver rendereris konkrečiuose techninių duomenų skyriuose rodo semantinį `dl/dt/dd`, kituose sąrašuose elgsena išlieka.
6. Katalogo kortelėse išlaikytos trys trumpos savybių eilutės. Naudojami tie patys Manrope ir teksto vaidmenų kintamieji; iki 520 px parametras bei reikšmė rodomi vienas po kito.

## Laida ir diegimas

- Galutinė laida: `a1f38823-08c1-48b6-aff3-33c56c1cceb4`.
- Paketo SHA-256: `3bcd0d8400bc205274dd5d24d3b55b84d5631b215016c8a8cc2aedb298800b98`.
- Ankstesnis viešas paketas: `23469e38235bf104ec0d491c65c8d280ee6fe3a55f30486cd03dbc18279a8692`, laida `49475e39-38f7-4179-8326-019b46313210`; atkuriamas ankstesnio paketo ir medijos leidinys išsaugotas.
- Worker versija: `fc4943a2-325d-412f-b379-6c47064e61f6`.
- Diegta esamoje paskyroje `1c0a7407abfb959d5ff46540f5f7009d`, su esama D1 `98f4d3c5-11a4-4d19-a6ec-d568a96da0f7`. Naujų debesijos išteklių nesukurta.
- Kodo diegimas atliktas su `--keep-vars`, neliečiant domenų maršrutų. Po diegimo abu custom domain įrašai aktyvūs. Išsaugoti noindex, išjungti chat / voice / lead-email nustatymai ir esamo slapto binding pavadinimas; jo reikšmė nerodyta.
- Fiksuoto laiko QA įėjimo failas pašalintas iš kompiliuoto serverio prieš dry-run / diegimą. Viešame Worker laiko modeliavimas nenaudojamas.

## Patikros ir jų ribos

- Input hash / metadata / lentelių skaitmenų patikra: PASS, 12 failų.
- Galutinės immutable laidos paketo ir 215 medijos bylų verifier: PASS.
- Public `test:core`: 66 PASS; typecheck, scoped renderer lint ir galutinis build: PASS.
- Native SEO smoke: 24 vieši puslapiai, canonical, robots, sitemap, llms, schemas, host izoliavimas ir 404: PASS.
- Vietinis preview HTTP: 284 PASS; actual domain HTTP: 284 PASS; HTTPS / www / HTTP nukreipimai: 5 PASS.
- Tikslūs 12 pakeistų puslapių body / source / specification patikrinimai: vietoje ir gyvai PASS (9 matomi, 164 eilutės); izoliuotu būsimu laiku PASS (12 matomų, 223 eilutės).
- Bendras rendered verifier su vietiniu būsimu laiku: 46 puslapiai, 268 HTTP patikros, 0 issues. Tai turinio atvaizdavimo, o ne visos svetainės paleidimo priėmimas.
- Faktinė naršyklė: 1280 px kompiuteris, 320 ir 390 px telefonas; įrenginio parametrai, Print2NG, webSignatureOffice / Lite ir nextGen 5 būsimoje izoliuotoje peržiūroje, katalogo kortelės. Manrope 17 / 16 px, eilučių aukštis 1,65, parametrų svoris 600; sutvarkytuose vaizduose horizontalaus slinkimo nėra.

Pirmos TypeScript patikros klaida dėl union tipo susiaurinimo pataisyta; galutinė patikra sėkminga. Pradinėje būsimo laiko peržiūroje neužsikrovė CSS dėl netinkamai paruošto vietinio QA įėjimo; taisytas tik šis testavimo įėjimas, naudojant esamą preview adapterį, ir stiliai patikrinti iš naujo. Pradinė nesėkminga nuotrauka išsaugota. Actual 200 % browser zoom ir vartotojo teksto tarpų override nebandyti; pilna WCAG atitiktis ar naujas visos svetainės 10/10 auditas neskelbiami.

Indeksavimas lieka išjungtas pagal ankstesnę paleidimo būseną. Workspace laiškų pristatymas, pokalbis, balsas ir visos svetainės paleidimo / privatumo priėmimas nėra šio aprašymų pakeitimo patikros. Gamintojo patikslinimų sąrašas išsaugotas originaliame PATIKRA ir privačiuose integracijos sprendimuose.

Įrodymai: `output/parasoplansetes-technical-adoption-20261013/` — input-validation, publication-decisions, reviews-final, release, adoption-local/future/remote, future-rendered, local/domain HTTP ir redirects, build/typecheck/lint/dry-run/deploy logs bei naršyklės nuotraukos. Pilni įrodymai ir studijos šaltinis vietiniai; Git perdavimas apima viešą paketą, rendererį, originalų suredaguotą įvesties paketą ir šią ataskaitą.

Git bazė sėkmingai fetch patikrinta pradžioje ir prieš diegimą: private main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; nuosavose šakose main jau buvo protėvis. Esami darbai neresetinti ir nestashinti. Galutinis handoff fetch / staged safety vykdomi prieš scoped commit ir push į esamus PR46 / PR17; main merge neatliekamas.
