# Kliento vaizdas, mūsų pasiūlymai ir PDF

2026-10-01 savininko pataisa: visą simuliaciją rodyti taip, kaip ją matys klientas. Laiškų temos, tekstas, HTML ir PDF neturi „TESTAS“, „sintetika“ ar kalibravimo pastabų. Serverio testinės aplinkos, sintetinės teisės ir audito faktai išlieka tik administracinėje diagnostikoje. Tai nekeičia realaus išrašymo, siuntimo ar užsakymo leidimų. [Ankstesni bandymai ir intervencijos](TEXT_CLIENT_LAB.md) išsaugoti.

## Įgyvendintas dabartinis kelias

1. Pokalbis surenka poreikį tame pačiame site/case. Modelis gauna normalias kliento žinutes.
2. Viešas tiekėjo produktas ir jo kaina yra vidinis įrodymas. `retail_options` atskirai projektuoja klientui prekės aprašymą, mūsų kainą ir sąlygas. Tiekėjo vardas, jo URL ir savikaina neperkeliami į laišką.
3. Savininko peržiūrai konfigūruotas keičiamas 15 % antkainis. Tai vystymo profilio nustatymas, ne universali visų verslų komercinė politika. Ne PVM mokėtojo profilyje šio pavyzdžio rodomas tiekėjo bruto kaštas laikomas neatskaitomu kaštu. Nežinomas / be PVM šaltinio pagrindas neperverčiamas spėjant.
4. Imituotas klientas patvirtina tikslią pasiūlymo versiją. Deterministinis servisas skaičiuoja sumas ir vienu bendru `invoice_pdf.render` generuoja PDF. Keičiamas buyer/model/line turinys, bet pinigų modelis nekuriamas iš laisvo teksto.
5. Laiške prisegami tikri PDF baitai su `application/pdf`; vardas `isankstine-saskaita.pdf`. MIME, turinio hash ir idempotency patikrinti. Core pašto UI leidžia autentifikuotai atsisiųsti tos pačios nišos PDF; kitos nišos / anoniminė prieiga atmesta.

Serverio `mailbox.prepare` papildomai atmeta išorinius HTTP(S) adresus kliento laiške. Leidžiamos tik tos nišos patvirtinto canonical host nuorodos; paieškos / tiekėjo URL nelaikomas kliento pasiūlymo turiniu vien dėl modelio sprendimo. Tai papildoma apsauga greta griežtos retail projekcijos.

| Prekė | Vidinis šaltinio kaštas | Antkainis | Klientui / vnt. | 2 vnt. |
| --- | ---: | ---: | ---: | ---: |
| GTK RS200 420/85 R28 | 584,05 EUR | 15 % | 671,66 EUR | 1 343,32 EUR |
| CEAT Farmax R85 420/85 R28 | 619,95 EUR | 15 % | 712,94 EUR | 1 425,88 EUR |

Skaičiai apvalinami vieneto lygiu, tada dauginami iš kiekio; pasiūlymas ir sąskaita naudoja tą pačią kainą. Pristatymas, likutis ir tinkamumas dar nepatvirtinti, todėl klientui aiškiai pateikiama preliminari prekių kaina ir prašomas pristatymo adresas / specifikacija. Tai nėra visų transporto kaštų įskaičiavimo ar rezervacijos pažadas. Vieši produktų šaltiniai ir jų neatitikimai lieka vidinėje įrodymų struktūroje.

## Tikri siuntimo ir vaizdo įrodymai

Naujos versijos penki pasiūlymų / patikslinimo laiškai ir viena PDF išankstinė sąskaita iš `info@pinet.lt` į savininko nurodytą testinį Gmail SMTP priimti. Anksčiau išsiųsti penki viešų kainų laiškai ir vienas HTML dokumento laiškas išsaugoti istorijoje; jų antraščių atgaline data nekeičiame. Numatytoji UI kategorija „Klientų laiškai“ rodo naują versiją be senų bandymų žymų.

Naujas PDF ir pasiūlymo laiškas turi tą patį practical kliento case `1e35eeb8-ce72-5fa2-ac21-52177b77ad94`. Dokumente GTK 2 × 671,66 EUR, bendra suma 1 343,32 EUR, laikinas MB Memocasting ne PVM mokėtojo profilis. Pirkėjas Jonas Petrauskas yra imituoto kliento vardas; tai administracinis bandymo faktas, ne tikras pirkimo patvirtinimas.

PDF yra profesionaliai atrodanti **išankstinė sąskaita**, turi stabilų PF dokumento reference ir neturi apskaitos išrašymo numerio. `issued=false`, `payment_requested=false`, realus užsakymas nesukurtas. Banko rekvizitai neišgalvoti. Tikrą apskaitos dokumentą vėliau išrašys patvirtintas apskaitos adapteris / numerių registras pagal C4. Klientų vaizdas nėra pagrindas deklaruoti, kad šie production mechanizmai jau veikia.

PDF vizualiai patikrintas Poppler: vienas A4 puslapis, lietuviškos raidės, aiški pardavėjo/pirkėjo lentelė ir sumos, be bandymų teksto ar tiekėjų nuorodų. Core naudoja ReportLab 4.4.9 ir OS TrueType šriftus: Arial Windows, DejaVu Linux. Jei tinkamų šriftų nėra, generavimas stabdomas; deployment metu patikrinti šriftų paketą. PDF turinys laikomas private mail storage, ne viešame turinio pakete.

Privatūs įrodymai runtime `artifacts/`:

- `customer-preview-2026-10-01/saskaita.pdf` ir `saskaita-preview.png` — tikslūs prie laiško prisegti PDF baitai ir peržiūra.
- `order-test-customer-pdf-2026-10-01.json` — versijos, patvirtinimo ir SMTP būsena.
- `customer-view-qa-2026-10-01.json` — 6 naujų laiškų scope / hash / presentation / PDF / same-case / sumos metaduomenys.
- `mail-console-preview/customer-mail-ui.jpg` — tikra naršyklės pasiūlymo peržiūra; `customer-invoice-ui.jpg` — sąskaitos laiškas ir atsisiuntimo nuoroda.

Vietinis operatoriaus UI: `http://127.0.0.1:8840/operator/mail-ui`; savininko perskaitoma tik sintetinių įrašų kopija: `http://127.0.0.1:8861/`. Gavėjo inbox ir tikras atsakymas kol kas neįrodyti. Šaltinių atnaujinimo worker, tiekėjų derybos, galutinė pristatymo savikaina, realus customer acceptance, production invoice/payment ir Gemini audio lieka savo [roadmapo](ROADMAP.md) vartuose.

## Galutinė patikra

Pilnas runtime suite: **118 passed per 353,17 s** (po PDF/MIME/retail integracijos). Po paskutinės išorinių nuorodų apsaugos ir inbound presentation pataisų: **12 passed** mail/PDF/offers tikslinių testų. Šie skaičiai persidengia, nesumuojami į 130. Ruff visas `src scripts migrations tests` PASS. `qa_customer_view.py` 10/10 metaduomenų ir tikro HTTP patikrų PASS, įskaitant baitais sutampantį PDF atsisiuntimą, anoniminį 401 ir svetimos nišos 404. IMAP dar kartą patikrintas: 0 susietų atsakymų; gavėjo inbox nepatvirtintas.

## 2026-10-01 tikras gavimas ir atsakymai

Naujas case 4c45ca57-a0b8-4daf-943f-d499f470de6c: keturi accepted outbound ir trys IMAP inbound, viena atskira Gmail gija. Pasiūlymo kaina po leistinos nuolaidos 654,14 EUR/vnt.; 2 vnt. 1 308,28 EUR. 600 EUR biudžetas nesumažino kainos žemiau grindų. Po tikslaus varianto/kiekio/sumos ir pirkėjo patvirtinimo bounded worker išsiuntė išankstinę PDF; jos gavimas realiai patikrintas mrchristian90210 Gmail. Kliento vaizde nėra testinių žymų ar tiekėjų URL. Nauja scoped HTTP/metaduomenų QA 12/12 PASS; ankstesnis 10/10 kitas atvejis neperrašomas. Pilni įrodymai: [ataskaita](SALES_CALIBRATION_2026-10-01.md).
