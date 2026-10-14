# Sustabdymas prieš PC perkrovimą

2026-10-09. Savininkas aiškiai paprašė sustabdyti darbus, kad galėtų perkrauti PC. Tai tęstinumo įrašas, ne pilnos agento apimties priėmimas.

## Saugi perkrovimo būsena

Sustabdyti savo API, jobs, vietinio site preview, LiveKit, cloudflared tunelio ir vykusio pytest procesai. PostgreSQL `pg_dump` kopija sėkminga: 206389 baitai, SHA256 `bdae4390911c51849c491a53cfbc74cd00aa5a7d4014f79eff84a406498ba9c9`. Failas ignoruojamas: `agent-business-core/runtime/artifacts/parasoplansetes-20261009/preserved-before-reboot-20261009.dump`. PostgreSQL užbaigtas per `pg_ctl stop -m fast -w`; `postmaster.pid` nebeliko. Tikslūs kvitai išsaugoti `pause-runtime-receipt.json`. `.env` ir privačios bandymų bylos palikti diske; staged secret check PASS abiem repo. Google Cloud infrastruktūros pakeitimų ir naujo Workers deploy nėra.

## Išsaugota ir faktiškai patikrinta

- Abu repo fetched main buvo dabartinės šakos bazėje: private `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public `d0fd6b7d296303bfcaafadc4071945e675a72b96`. Darbai tęsiami esamose `codex/parasoplansetes-f1-20261008` ir `codex/parasoplansetes-public-20261008` šakose, PR46 / PR17.
- Pridėtas tekstinis kanalas per tą patį Conversation / Case / Event, signed edge, need, memory, contact ir postcall core. Atskirų CRM ar kito per-nišos pokalbio serverio nėra. Teksto mokami kvietimai turi idempotency ir atskirą rezervaciją; gedusio request kartojimas naujo mokamo kvietimo nesukuria.
- Tikra vietinė naršyklė gavo Gemini atsakymą. Pataisytas kiekis iš 4 į 2 išliko DB; PDF / Windows / viena darbo vieta išliko kitame atsakyme. Kontaktų forma faktiškai parodyta (`shown` ACK), el. paštas išsaugotas serveryje. Įrenginio atminties pasirinkimas išliko naujo pokalbio pradžioje.
- Tikras 390 × 844 ekrano bandymas: valdiklis tilpo, horizontalus slinkimas neatsirado. Privatūs ekranai `content-studio/tmp/parasoplansetes-agent-20261009/chat-desktop.png` ir `chat-mobile.png`.
- Pirmi FAIL išsaugoti: trūkstamas žinučių veiksmas public proxy, balso 120 s galiojimas tekstui, provider 400 dėl struktūruotos užklausos formato. Pataisyti maršrutas, 30 min tekstinės sesijos galiojimas ir provider adapteris. Adapterio išvestis vis tiek tikrinama originaliu griežtu core schema su serverio priskirtu revision / client evidence.
- Nauji tiksliniai testai: **7 PASS** (`test_chat`, `test_chat_wire`, `test_mail_html`). Public core testai: **63 PASS**. Galutinio public build exit **0**, po kontakto pakartotinio atvėrimo pataisos. Pilnas naujos runtime versijos pytest sustabdytas savininko prašymu; jo negalima vadinti PASS. Ankstesnės 287 + 10 native patikros yra ankstesnio source įrodymas.
- Tikras vietinis Gemini garso gavimas, RTC PCM ir provider resumption jau išbandyti. RTC bandymas su įrašytu sintetiniu garsu nėra fizinio telefono mikrofono priėmimas. Private probe worker load pataisa dar laukia naujo actual audio bandymo.
- Reviewed garso follow-up priimtas SMTP ir pirmas laiškas tikrai rastas gavėjo INBOX pagal exact Message-ID. Savininko tikras atsakymas importuotas į tą patį Case. Aptikta HTML-only atsakymo skaitymo klaida; pridėtas inertinis HTML teksto išgavimas, be script / CSS / image / attachment vykdymo, ir atstatytas anksčiau praleistas turinys.
- Pagal realų savininko atsakymą parengtas ir nepriklausomai peržiūrėtas profesionalus tęsinys per esamą `email_agent` / `mailbox`; `owner_inquiry_reply.py` receipt `accepted_by_smtp`. Šio antro laiško INBOX dar nepatikrintas. Tai owner-only bandymas, ne visiems klientams įjungtas automatinis SMTP.

## Kas dar nebaigta

Viešas Workers preview **neatnaujintas** šio tęsinio metu: https://parasoplansetes-preview.pinet-azprekyba.workers.dev/ vis dar ankstesnė versija, chat / voice OFF. Vietinis chat bandymas nėra šio URL įdiegimo įrodymas. Domenas dar neprijungtas.

Laikinas core HTTPS tunelis buvo sukurtas, tačiau sustabdomas prieš perkrovimą. Jo senas adresas negali būti naudojamas po restart be naujos actual patikros ir preview konfigūravimo. Public voice reikia realaus viešo LiveKit WSS + ICE / TURN. Runtime `.env` tikrinimo metu rodė vietinį `ws://127.0.0.1:17980`, ne Cloud projektą. Raktai ir paštas lieka ignoruojamame `.env`, į Git neperduodami.

Savininko nurodymu atverta ir patikrinta Google Cloud paskyra. Matomas `My First Project`, jo VM instances sąrašas tuščias. Free Trial UI rodė 264 EUR kreditą ir galiojimą iki 2027-01-08. **VM, ugniasienė, nauji raktai ar mokamo plano upgrade nekurti.** Google Cloud projektas nėra LiveKit Cloud projektas; pasirinkti konkretų viešo media serverio diegimą ir išlaidų ribą reikia tęsiant.

Ankstesnis šešių archetipų / reserved / learning ON tekstinis lab PASS ir NO_CHANGE lieka istorinis užfiksuoto source rezultatas. Naujam Gemini text adapteriui būtina nauja užfiksuota kalibravimo partija; promotion / adoption / rollback nėra įrodyti.

## Tęsti po restart

1. Abiem repo atlikti canonical `git-freshness.mjs --phase continue`, integruoti main jei reikia ir aiškiai perskaityti naujus AGENTS / calibration skill. Nevykdyti pasenusio source.
2. Patikrinti ignoruojamą runtime `.env` ir savo PostgreSQL duomenis; paleisti savo PG, API, jobs, site preview. Neužrašyti kito agento konfigūracijos ir neskelbti raktų.
3. Pakartoti pilną runtime suite, peržiūrėti išsaugotą sustabdyto pytest logą. Tiksliniai testai jau PASS, tačiau platesnė suite naujam source nepatvirtinta.
4. Patikrinti antro reviewed laiško exact Message-ID gavimą ir Case / thread continuation. Naujos realios owner žinutės nedubliuoti.
5. Užfiksuoti v2 source / model / knowledge / instruction / corpus / evaluator ir atlikti naujo Gemini text adapterio archetipų ratą; išsaugoti originalius FAIL ir protected split.
6. Parengti ir patikrinti public preview su nauju signed core HTTPS adresu ir tik edge secret. Google / SMTP / LiveKit serverio raktų į Worker ar Git nekelti. Patikrinti realų public chat ir kontaktus telefonu.
7. Prijungti tikrą viešą media serverį, patikrinti agent dispatch ir fizinį telefono garsą / interruption / reconnect. Nepakelti M0 vartų vien dėl tekstinių ar įrašyto PCM testų.
8. Atnaujinti calibration / handoff ataskaitas, core upgrade journal ir esamus draft PR pagal galutinę measured būklę. Senų delivery helperių nekviesti aklai: jie gali perrašyti ataskaitas pasenusiu snapshot.

Biudžetas lieka iki 2 EUR. Runtime dienos rezervacijų cap 1.75 USD ir ankstesnis Treg 0.2438 USD sudaro konservatyvų 1.9938 USD rezervą (apie 1.78 EUR pagal prieš batch patikrintą kursą); tai nėra tiekėjo sąskaitos patvirtinimas. Maži schema diagnostikos kvietimai turi būti įtraukti į naujos partijos išlaidų kvitą. Nauja GCP infrastruktūra šiame biudžete dar neapskaičiuota ir neįjungta.
