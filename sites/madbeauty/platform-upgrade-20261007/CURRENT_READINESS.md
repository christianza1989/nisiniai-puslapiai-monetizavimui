# Dabartinis pasirengimas — 2026-10-08

Pagrindinis katalogo, paieškos, meistro paslaugų ir rezervavimo funkcionalumas įgyvendintas. Naujausias runtime `39b71b18bd535eeb8d231fe497d26ca254b108d3`: source-only recovery apsauga po perkėlimo ir non-resetting atmetimas. Visi keturi rinkiniai 263/263 PASS; nepakeistas approved 75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4 paketas, 39 puslapiai / 309 assets. Gyvas visas platformos atnaujinimas **dar nepaleistas ir neužbaigtas**.

## Parengtos ir konkrečiai tikrintos dalys

| Apimtis | Priėmimo įrodymai ir ribos |
| --- | --- |
| Kategorijų / subkategorijų medis, sinonimai, archyvavimas, versijos ir senos nuorodos | D01–D03 / S01: backend ir Workers regresija, actual paieškos dropdown 103 miestų / 259 enabled pasirinkimų, klaviatūra ir keturi pločiai; global258 / archived224 / catalogue263. Skaičiai yra enabled paieškos entries, ne teiginys apie 259 realiai teikiamas paslaugas. |
| Pasiūlymai, variantai, darbuotojai, priedai ir meniu grupės | D04–D07: private drafts, qualification gate, current per-staff prices/durations, saved snapshots, addon min/max / foreign IDs, menu246 ir CSV249 actual konflikto / retry bandymai. |
| Miestai ir tikras viso vizito laikas | S02–S05: 103 miesto ID / manual location input, tik vartotojo pasirinktas geolocation, actual viso intervalo / stale hold / branch / transfer time keliai. Suteikta reali device geolocation permission nepriskiriama šioms patikroms; manual / neįjungta vietos nustatymo būsena lieka veikianti. |
| Rezervacijos, fazės, perkėlimas, atšaukimas ir laukiančiųjų pasiūlymai | B01–B05: paired Node / native Workers concurrency ir restart; phase256 / cancel256 / waitlist256, rebooking259, booking260 actual keyboard / field retention / natural expiry / changed addon / current price. Queued mail nėra SMTP gavimo įrodymas. |
| Paskyra, išsaugoti profiliai, pasirinkimai ir klientų kortelės | C01 / dalinis C02: global258 / account258 / client-card / own export / recent-OTP / audited erasure request ir withdrawal. Pats negrįžtamas trynimas neaktyvintas be faktinės retention / backup tvarkos. |
| Komandos teisės, vietos ir dokumentų tinkamumas | W01–W03 / O02: actual receptionist/practitioner apribojimai ir grant/revoke/stale/restart, branch258 / qualification258. Sintetinė kvalifikacija nepatvirtina realaus teikėjo teisės. |
| Operatorius, naujų procedūrų prašymai ir skundai | O01/O03: global258 / catalogue263 / publication258 actual versioned sprendimai, precommit / lost-reply errors, private media ir retained bookings. Nauji request nonce / history ir applicable taxonomy parent guards priimti. |
| Straipsnių / kategorijų sąsaja | E01: ankstesnis siauras gyvas content infrastructure leidimas; immutable 75aa build ir editorial / core companion patikros. Šios upgrade šakos push nėra viso leidimo activation. |
| Saugykla | [STORAGE_AUDIT.md](STORAGE_AUDIT.md): current Node dydžiai / timings, native physical media ir tikras isolated hosted source / prepared-target PITR, restart / collision / old-writer guards. Activated pair PITR, didelė hosted media apkrova ir canonical UI nėra šio fixture PASS. |

Priėmimo detalės: [ACCEPTANCE.md](ACCEPTANCE.md) / [UI_MATRIX.md](UI_MATRIX.md). Senų checkpoint įrodymai neperrašomi; naujesni named receipts pakeičia tik jų faktiškai patikrintus likučius.

## Konkretūs likę vartai

| Vartas / kelias | Ko trūksta | Galima atlikti dabar | Kitas veiksmas |
| --- | --- | --- | --- |
| Tikras meistro / salono pilotas | Pasirinktas realus teikėjas, jo tikros paslaugos / grafikas ir autorizuotas dalyvavimas | Sintetiniai keliai baigti; tikro teikėjo faktų negalima sukurti | Su pasirinktu teikėju pereiti paslaugų suvedimą → paiešką → rezervaciją ir užfiksuoti rezultatą |
| Rezervacijos / priminimo laiškas | Testinis gavėjas ir faktinis inbox receipt; existing OTP ar outbox row nepakanka | Pašto runtime / retry / delegated alarm išbandyti izoliuotai | Vienam autorizuotam gavėjui atskirai patikrinti provider acceptance ir gautą reservation / reminder laišką |
| C02 retention / trynimas / backups | Faktiniai terminai, pareigos ir kopijų tvarka | UI / identity / requests / export priimti; duomenų trynimo neaktyvinti pagal spėjimą | Suderinti retained booking/audit/mail/media/checkpoints scope; įgyvendinti ir isolated testuoti reikiamą vykdymą |
| G02 ir ketvirtos fazės integracijos | Konkrečios reguliuojamų paslaugų taisyklės, tiekėjai, sutartys ir, kai taikoma, biudžetas | Esami capability / draft gates veikia; naujų komercinių operacijų neaktyvinti | Įvykdyti konkretaus plėtinio faktines priklausomybes; nemaišyti su įgyvendintu grožio piloto branduoliu |
| Galutinis host / release acceptance | Pasirinkto leidimo canonical UI / media / actual roles / data preservation bei cutover receipt | Build, binding candidate ir atskiras protected hosted storage bandymas parengti | Kai completion prerequisite įvykdyta, taikyti jau duotą conditional deploy leidimą, išlaikyti originalią namespace ir atlikti canonical acceptance |

Savininkui ankstesniu async klausimu paprašyta testinio gavėjo, realaus piloto teikėjo ir esamos saugojimo tvarkos; atsakymas šiame etape negautas. Tai faktų prašymas, ne naujas leidimo diegti prašymas. Autorizacija „kelk gyvai, jei viską pabaigei“ galioja; jos prerequisite dar neįvykdyta. Vien 263 testų suma ar vienas isolated hosted bandymas full completion nesukuria.

Papildoma šio etapo read-only UI peržiūra: local Node8847 / browser2 / tab9, ordinary sintetinė owner/operator paskyra. Pristatymas, turinio sąrašas, rodikliai ir meistro integracijų / profilio nuoroda peržiūrėti prie išmatuotų 320/390/820/1440×900 DOM viewport, main/document ir siaurų blokų horizontalūs plotai sutapo. Native Enter nukopijavo teisingą `/salonai/<existing ID>` nuorodą. Šio Node fixture turinys yra trijų legacy gidų projekcija; tai nėra 39-puslapių Worker leidimo naršyklės įrodymas. Native screenshot rastrai apima rendered turinio sritį ir turi atskirai išsaugotus realius matmenis; jų netvirtiname kaip exact viso 900px viewport kadro. Trys ankstyvi resize-call rastrai liko kaip atmesti diagnostiniai įrodymai, pakeisti atskirame tool call paimtais retests. Ši peržiūra neperima serverinių save/network/stale būsenų ten, kur jų konkrečiai neatlikome.
