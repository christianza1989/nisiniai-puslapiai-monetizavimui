# Vėlesnis laiško nepristatymas: atskiras agento įvykis

2026-10-09. Pasiūlymas BDEV-0003-P4, proposed. Klausimas: kaip būsimas autonominis verslas pastebės nepristatymo pranešimą, atsiradusį po SMTP priėmimo, nepaversdamas jo kliento atsakymu ar pakartotinio siuntimo komanda?

## Dabartinė patikrinta versija

[MAIL_CORE](../../../MAIL_CORE.md) jau aiškiai atskiria SMTP priėmimą nuo tikro gavimo. [jobs.py](../../../agent-business-core/runtime/src/pinet_core/jobs.py) saugo siuntimo ketinimą ir Message-ID, po bandymo skiria accepted / rejected / unknown; nežinomo rezultato aklai nekartoja. [Testai](../../../agent-business-core/runtime/tests/test_delivery.py) turi SMTP atsisakymo bei dviprasmiško transporto scenarijus. Šiame cikle jie tik perskaityti, nepaleisti.

[mail_reader.py](../../../agent-business-core/runtime/src/pinet_core/mail_reader.py) priima tik gijos atsakymus su žinomu laiško ID ir siuntėju, sutampančiu su gavėju. Tai tikslinga kliento reply kontrolė. Standartinis pašto sistemos pranešimas gali būti iš kito siuntėjo ir turėti kitokią MIME struktūrą, todėl šis kelias nėra bendras DSN importas. Peržiūrėtuose main src/tests/docs neradau atskiro DSN parserio ar reconciler. Tai ribotos versijos radinys, ne visų šakų ar production incidentų auditas. Core main d4ea8bf7384b70c4ea62a344001e3f8158812c56; aktyvaus balso PR32 head bc34e9b9491aff159216bceb19f93e7e4b6ddf5c mail_reader nesiskiria nuo main. Jo jobs pakeitimų ši sesija neperima.

## Pirminiai standartų šaltiniai

[RFC 5321](https://www.rfc-editor.org/rfc/rfc5321), 4.2.5 ir 6.1: priimantis SMTP serveris perima pristatymo arba nesėkmės pranešimo atsakomybę. Vėlesnė nesėkmė pranešama envelope return adresui. Tai nesuteikia įrodymo, kad mūsų transportas jau siunčia, gauna ar patikimai susieja tokius pranešimus.

[RFC 3464](https://www.rfc-editor.org/rfc/rfc3464.txt), 2 ir 4.1, pateikia struktūrinį DSN formatą, gavėjo rezultatą ir Action / Status laukus. `delayed` reiškia tęsiamus bandymus, o `failed` — nutrauktus; net 4 klasės kodas gali lydėti galutinį failed. `delivered` neįrodo perskaitymo. DSN gali būti suklastotas. Vien jo sintaksė, tema ar siuntėjo vardas nėra patikimumo įrodymas. Optional Original-Envelope-Id nėra tas pats kaip Message-ID; ne visus pranešimus įmanoma automatiškai susieti.

[RFC 3463](https://www.rfc-editor.org/rfc/rfc3463.txt) skiria 4 klasės laikiną ir 5 klasės nuolatinę problemą; 5.1.1 nurodo neegzistuojančią gavėjo dėžutę, o 4.2.2 — pilną dėžutę. Kodo klasė viena pati nėra universali mūsų retry taisyklė. [RFC 6533](https://www.rfc-editor.org/rfc/rfc6533.txt) atnaujina DSN ne ASCII adresams bei MIME variantams; pradinis ribotas parseris negalėtų apsimesti, kad juos visus palaiko.

Treg catalog_search `parse SMTP delivery status notification bounce enhanced status code` grąžino none / 0. Viena paieška nėra viso katalogo auditas; neturint kandidato catalog_get nevykdytas. Provider calls ir papildomos prenumeratos nereikalingi sintetinių failų bandymui. Naudotini esami Python standartinės bibliotekos MIME įrankiai; naujas išorinis pristatymo tiekėjas šio konkretaus klausimo savaime neišsprendžia.

## Deduplikacija, nauda ir alternatyvos

[VISION](../../VISION.md) ir esamas [M1](../../../agent-business-core/ROADMAP.md) numato vykdymo kvitus / nežinomų rezultatų sutikrinimą. P4 tai konkretina vienam vėlesniam pašto įvykiui; tai nėra naujas BDEV ID, CRM ar mail core kopija. P1/P2/P3 ir BI patvirtinimo būsenos nepakeistos.

Galima nauda: klientui negavus pasiūlymo, agentas neturėtų tokio atvejo vertinti vien kaip kliento tylėjimo; operatorius gautų konkrečią pristatymo nežinomybę. Komercinės vertės, nepristatymo dažnio, sutaupyto žmogaus laiko ir pelno duomenų nėra. Automatizacijos bandymas nėra leidimas rinkti naujus adresus ar susisiekti kitu kanalu.

Alternatyvos: (1) palikti esamą SMTP/reply kelią ir vėliau tikrinti kiekvieną atvejį rankomis; mažiausia dabartinė realizacijos kaina, bet nėra struktūrinio vėlesnio nepristatymo kvito; (2) privati offline laboratorija, siūloma dabar; (3) gyvas IMAP DSN importas / tiekėjo webhook, tik atskirai suderintoje vykdytojo apimtyje po tikro transporto, prieigų, retention ir pasitikėjimo patikrų. Dabartinio kliento reply siuntėjo filtro silpninti negalima.

## Mažiausias bandymas ir sprendimo vartai

[PILOT](PILOT.md): iki 2 agento darbo valandų izoliuotas parserio ir kandidatų susiejimo bandymas su 12 sintetiniais atvejais, dviem nišomis, be tinklo, DB, IMAP, SMTP ar shared runtime pakeitimų. Rezultatas — pranešimo stebėjimas ir susiejimo kandidatas, ne automatiškai patvirtinta pristatymo būsena. Vien tik parsed ir matched neleidžia slopinti adresų, išsiųsti naujo laiško ar paskelbti fakto „klientas gavo“.

Priimti laboratoriją tik tiksliai sutapus visiems numatytiems rezultatams ir neįvykus jokiam šalutiniam veiksmui. Nepalaikomas / prieštaringas / per didelis failas turi aiškiai grąžinti nežinomybę. Stabdyti po 2 valandų, jei reikia realių laiškų ar prieigų, kito vykdytojo failų, mokamos paslaugos arba nepavyksta išlaikyti nišų atskyrimo. Tikro paslaugos lygio priėmimas vėliau reikalautų realaus kvito bei patikrinto kilmės pasitikėjimo; šio piloto PASS jo neatstoja.

Kaštai: naujų prenumeratų / pirkimų nėra; darbo / esamo modelio savikaina nežinoma. Priklausomybės: aiškus savininko šio piloto mandatas ir privatūs sintetiniai failai. Tiksli runtime integracija bei būsimo DSN gavimo kelias nepriskirti šiai sesijai. Iki shared realizacijos būtina suderinti core vykdytojo ribas; jo agentų kūrimo ir balso pavedimas lieka jam. Šiame cikle tik dokumentai: [SOURCES](SOURCES.json), [QA](QA.json).
