# StepOver tekstinio agento kalibravimo kvitas

2026-10-10, Europe/Vilnius. **19/19 galutinių scenarijų veikimo vartai PASS; bendravimo tikslas 10/10 dar nepasiektas.** Galutinio rinkinio penkių dimensijų vidurkis 9,2211/10, mažiausias įvertis 4/5. Tai sintetinio vertintojo rezultatas, ne klientų pasitenkinimas. Originalūs bandymai ir nesėkmės išsaugoti privačiame runtime, jų balai neperrašyti.

## Versija ir apimtis

- Išbandytas source `ec73aaf8a572c0a89ebe6621e4d734805026692f`; companion `b2d581ddc312a1431992806d0dd591d77c1e83d0`.
- Aktualumo patikra 2026-10-09 21:13 UTC: abiejų repo main sėkmingai fetch, core `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public `d0fd6b7d296303bfcaafadc4071945e675a72b96`, abiejose šakose trūkstamų main commit 0.
- Canonical `scripts/network_lab.py`, actual FastAPI ASGI, PostgreSQL, signed tools, kontaktų išsaugojimas, postcall ir reviewed laiško projekcija. Kontaktų langelio shown ACK imituotas; šis ratas nėra tikros naršyklės arba SMTP pristatymo priėmimas.
- Codex CLI 0.160.1, `codex_cli_local_default`, ChatGPT account autentifikacija. Harness neužfiksavo konkretaus modelio ID; jo neįvardijame spėjimu. Google ir gyvas paštas šiame rate išjungti.
- 19 patvirtintų žinių puslapių projekcija užfiksuota prieš palyginimus: source projection SHA256 `d83aeabfa78ac9359afd01a890fc3008d7e29a500ced62bb6f8ba423a9c41688`, failo SHA256 `b6722a068ab9a562bff3813d77a02135bd68a1883fe579a5d19b403f029f08cd`. Source, instrukcijų, corpus ir vertintojo fingerprint pateikti [JSON kvite](AGENT-TEXT-CODEX-20261010.json).

## Galutiniai rinkiniai

| Rinkinys | Scenarijai / PASS | CLI kvietimai | Vidurkis / 10 |
|---|---:|---:|---:|
| C5 ankstesni archetipai, žinoma regresija | 6 / 6 | 48 | 9,0000 |
| C5 naujo poreikio, pataisymų, kainos ir privatumo train | 6 / 6 | 46 | 9,2667 |
| C5 ilgesni 4–5 kliento žinučių train | 3 / 3 | 38 | 9,0667 |
| C5 rezervas, pirmas vykdymas po source užfiksavimo | 4 / 4 | 30 | 9,6000 |

Train apima aiškų pirkėją, specifikacijos nežinantį klientą, skubantį ir keičiantį kiekį, techninį ERP skeptiką, kainai jautrų, privatumo / kontakto atsisakantį, kalbos keitimą, kontaktą pokalbio metu, programos pavadinimo atidėjimą ir laiško pažado tęstinumą. Darbuotojų skaičius nėra automatiškai įrenginių kiekis.

Keturi rezerviniai atvejai: nuotolinis ir vietinis procesas; telefonas su kiekio pataisymu; kvalifikuoto parašo garantijos spaudimas / ERP; anglų kalba ir kontakto atsisakymas. Jie operatoriaus sukurti prieš tuning, atsiliepimas nenaudotas iki C5 freeze. Tai nėra nepriklausomų žmonių sukurtas blind. Po šio vykdymo jų pakartojimas būtų regresija.

Kiekvienas galutinis atvejis praėjo visus 10 operational checks. Skaičiaus 10 operational checks nelaikome bendravimo įverčiu 10/10. Penkios vertinamos dimensijos: relevance, factual accuracy, listening, useful next step, email quality. 4/5 yra kompetentingas, konkretus ir naudojamas atsakymas; 5/5 — išskirtinis. Iš anksto užfiksuotas visų dimensijų 5/5 tikslas lieka FAIL.

## Faktinės intervencijos ir kontrolės

1. Žinių atranka pirmenybę teikia konkrečiam modelio pavadinimui / URL ir atominiams 4.3 / 5.0 / 10.0 skaičiams. Originali 14 atvejų regresija turėjo 11 FAIL; po pataisos kartu su esamais žinių testais 21 PASS.
2. Reviewed follow-up įrodo patvirtintą homepage URL ir tuščio kelio / slash atitikimą. Originali konkreti 11 testų regresija turėjo 1 FAIL; po pataisos 11 PASS ir platesnė projekcijų patikra 38 PASS. Neatlaisvintas scheme, host, query, fragment arba non-root tikrinimas.
3. Eksportuojama dialogo refusal metadata ir išskirtas nekeistų service checks helper. Actual ASGI neigiamas kontrolinis atvejis parodo, kad langelis po kontakto atsisakymo atmetamas net esant sintetiniams 5/5 balams; langelis prieš atsisakymą leidžiamas. **Patikslinimas:** originalus `network_lab.py` refusal flag jau nustatydavo savarankiškai; ankstesnio žurnalo teiginys apie canonical baseline vacuous PASS buvo per platus. Pataisa sutvirtina eksportuojamą metadata ir savarankišką regresiją, neįrodo seno baseline false green.
4. Nišos procedūros pataisytos pagal actual train dialogus: klaidingas 5.0 ekrano atmetimas, būsimo signotec / StepOver atskyrimo painiojimas su esama svetaine, neįsigyto įrenginio dokumentacijos prašymas, nereikalingas sutikimo pakartojimas, žinomo ir atidėto programos lauko skirtumas, sutarto kito veiksmo išlaikymas laiške, paprasta kalba ir poreikiui tinkamas vienas veiksmas arba IT pasirengimo planas. Nepatvirtintos kainos, atsargos, QES, API funkcijos ar oficialaus atstovavimo garantijos nesukurtos.
5. Quality gauna tikrą chronologijos kontekstą: postcall juodraštis sukurtas po final dialogue, todėl nereikalaujamas ankstesnis dar neegzistavusio laiško paskelbimas. Tikri teiginiai „išsiunčiau / pristatyta“ vis tiek reikalauja kvito. Numerinė scoring schema, rubric ir threshold nepakeisti. Atskiros 8 evaluator diagnostikos: 4 sąžiningi atvejai priimti, 4 melagingo pristatymo atvejai atmesti ir su senu, ir su nauju promptu. Supaprastintas kontrolinis atvejis nesukėlė seno sudėtingo false positive, todėl nelaikomas priežastinio pagerėjimo įrodymu. Originalus C3 long FAIL išsaugotas.

Visa C4 backend patikra: **342 PASS / 143,89 s**. Po C5 tik nišos MD pakeitimų compose/profile patikra: **6 PASS / 0,86 s**. Galutiniai 15 train ir 4 rezervo service bandymai atlikti būtent C5 source.

Pradinė source admission nesėkmė: 6 bandyti, 0 užbaigtų, 0 modelio kvietimų; ne modelio PASS. Visas kanoninis šiame rate vykdymas: 748 CLI kvietimai, originalios baseline ir C1–C5 nesėkmės bei rezultatai JSON. Papildomai 8 užbaigtos evaluator-only diagnostikos ir 3 kvietimai iki Windows stdout encoding klaidos. Tai ne 759 skirtingi klientai. Pasikartojantys bandymai ir to paties vertintojo stochastiniai balai nesudaro statistinio pagerėjimo įrodymo.

## Mokymasis ir kanalai

| Vartas | Būsena / įrodymo riba |
|---|---|
| Poreikio pataisymas, tool kvitai, save, kontaktų atsisakymas, reviewed juodraštis | PASS 19 sintetinių actual-core atvejų |
| Iš anksto užfiksuotas 10/10 bendravimas | FAIL, likę 4/5 įverčiai |
| Privati adaptive versija / promotion / adoption | NA šiame operatoriaus Git intervencijų rate; learning OFF, candidate_activated false, active pointer nėra |
| Tikra naršyklė, reconnect ir įrenginio memory dabartiniu C5 | UNVERIFIED; ankstesni realūs kvitai lieka ankstesnės source istorija |
| Tikras Gemini, SMTP / INBOX / kliento reply dabartiniu C5 | UNVERIFIED; šiame rate 0 inference / SMTP siunčiamų laiškų |
| Balsas | NA dabartinei savininko apimčiai; OFF |
| Production / domain DNS / reviewed main adoption | UNVERIFIED; šio rato naujo deploy nėra |

Rolės hash pasikeitimas čia reiškia operatoriaus Git procedūros pakeitimą, ne autonominę private promotion. Nei 19/19 service PASS, nei MD commit nesertifikuoja Gemini arba balso. Istoriniai realūs kanalų bandymai: [AGENT-RESUME-20261009](AGENT-RESUME-20261009.md).

## Naujo Gemini rakto tęsinys

Savininkas po Codex rato pateikė naują raktą ir leido Gemini pokalbių / laiškų bandymus. Raktas pakeistas tik ignoruojamame `runtime/.env`; paslapčių report / Git nėra. Konfigūracijoje tekstui, analizei ir laiškams naudojamas `gemini-3.8-flash`, būsimam balsui `gemini-3.8-live`, balsas OFF.

[Google modelių dokumentacija](https://ai.google.dev/gemini-api/docs/models?hl=en) ir [kainodara](https://ai.google.dev/gemini-api/docs/pricing), patikrinta 2026-10-10: Flash 3.8 model ID patvirtintas, standard iki 2026-12-31 kainuoja 0,75 USD / 1M input ir 3,75 USD / 1M output įskaitant thinking. Dabartinis rate card šias kainas jau atitinka. Treg katalogo nemokama discovery užklausa šiam modelių sąrašo darbui grąžino `none`; mokamo Treg kvietimo neatlikta.

Nemokamos ModelService ListModels / GetModel patikros su nauju raktu: **403, API_KEY_SERVICE_BLOCKED ir SERVICE_DISABLED**, projektas `926136508612`. Atvertas Google API valdymas, bet Google reikalauja pakartotinio prisijungimo; projektas / API prieigos nesutvarkytos. Šie kvitai neįrodo GenerateContent veikimo.

Išlaidų ledger perskaitytas, nepakeistas: 44 rezervacijos, **1,866000 USD laikomas rezervas iš 1,866000 USD runtime limito**, observed token estimate **0,492610 USD**; tai nėra invoice ar įrodytas nepanaudotas kreditas. Bendra savininko 2 EUR riba ir istorinės Treg sąnaudos išlieka. Naujas raktas neatnaujina biudžeto, naujo environment šiai ribai apeiti nesukurta. Gemini inference dar neįvykdyta.

Konkrečios priklausomybės: savininko Google prisijungimas, API įjungimas / tinkami rakto apribojimai, patvirtintas realus bandymų biudžetas arba įrodytas account free-tier kelias, naujas frozen Gemini service / laiškų / reply ratas, tikro C5+ naršyklės tęstinumo patikra. Iš naujo kalibruojant naudoti naują rezervinį rinkinį; jau matyti rezervo atvejai lieka regresija. Balso įjungimas ir nuolatinis cloud backend atskiri nepriimti vartai.

Pakeitimai siūlomi [draft PR46](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/46) su [companion PR17](https://github.com/christianza1989/niche-public-core/pull/17). Reviewed main merge / adoption neįvyko. Tęsti pagal [canonical kalibravimo skill](../../SKILLS/business-agent-calibration/SKILL.md), originalių kvitų ir išlaidų neresetinti.
