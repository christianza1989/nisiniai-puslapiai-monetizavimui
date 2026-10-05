# Tiekėjų pristatymo ir RFQ kalibravimas, 2026-10-02

Esamame autorizuotame privačiame tiekėjų lab atlikti trys keturių scenarijų ratai. Galutinė versija praėjo 4/4 automatinių patikrų ir visų keturių laiškų rankinę peržiūrą. Tai struktūrizuoto tekstinio Codex tiekėjų specialisto patikra su tikrais viešų puslapių HTTP kvitais. Ji nėra Gemini garso, kliento skambučio įrankių kelio, tiekėjo atsakymo ar patvirtinto komercinio pasiūlymo įrodymas.

## Įvestis ir šaltiniai

Panaudotas [tyrimo handoff](../business-development/research/2026-10-02-tyre-delivery/RESEARCH.md) ir jo [keturi dokumentuoti scenarijai](../business-development/research/2026-10-02-tyre-delivery/CHECK_CASES.json). Originalūs tyrimo failai nekeisti. Tyrime jie buvo tik pasiūlyti, šiame lab jau vykdyti. Modelis gauna poreikį, savo pasirinktų šaltinių tikrus kvitus ir pakuotės įvestis; paslėpto `delivery_expected` vertinimo negauna.

Pirminiai šaltiniai patikrinti 2026-10-02: [BayWa CEAT produktas](https://www.baywa.de/p/ceat-specialty-traktorreifen-420-85-r-28-farmax-r85-139d-142a8-radial-tl/p_32802342/2227868), [BayWa pristatymo FAQ](https://www.baywa.de/i/footermenue/wir-helfen-ihnen/faq), [DPD LT pakuočių sąlygos](https://www.dpd.com/lt/lt/pagalba/naudingi-patarimai/standartines-ir-nestandartines-siuntos/). BayWa nemokamo siuntimo žyma nepatvirtina šio SKU siuntimo į LT; produkto skersmuo nėra siuntimo pakuotės matavimas. DPD vienos paslaugos gabaritų ribos neapima viso vežėjo paslaugų, o gabaritų atitikimas nepatvirtina maršruto ar kainos.

## Originalūs rezultatai ir intervencijos

| Ratas | Automatiniai vartai | CLI kvietimai | HTTP kvitai / retrieved | Peržiūros išvada |
| --- | --- | --- | --- | --- |
| Baseline, v1 fixture | 4/4 | 12 | 6/6 | Aptiktas naujo vertinimo lauko dviprasmiškumas ir vidinės rengimo žymos laiškuose |
| Pristatymo pataisa, v2 fixture | 4/4 | 12 | 6/6 | Matmenys sutvarkyti; dalyje laiškų liko rengimo žymos, operatoriaus tapatybė nebuvo pateikta |
| Parašo ir laiško formato pataisa, v2 fixture | 4/4 | 12 | 6/6 | Keturi laiškai tiesiogiai adresuoti tiekėjui, turi patvirtintą operatoriaus parašą |

Iš viso 12 scenarijų vykdymų, 36 CLI kvietimai, 18 HTTP kvitų, visi retrieved. Tai keturi pakartoti scenarijai, ne 12 nepriklausomų blind atvejų. Galutiniame rate papildomų taisymo bandymų neprireikė. CLI tokenų apskaita saugoma per-case JSON, jos piniginė kaina šiame rate nepatvirtinta.

Baseline naujame `DeliveryAssessment.longest_side_cm` vienas atsakymas įrašė produkto 142,5 cm, nors pakuotė nežinoma. Pirmos fixture vartai šio lauko tame atvejyje netikrino, todėl automatinis PASS nebuvo viso priėmimo įrodymas. Modelio schema papildyta aiškiu measured-shipping-package aprašymu; v2 fixture pridėjo trūkstamą NULL patikrą. Tai lab kontrakto pataisa, ne nustatytas production kainodaros gedimas. V1 ir jos rezultatų neperrašėme.

Operatorius/Codex papildė bendras tiekėjo instrukcijas: tik patvirtinti pakuotės duomenys, nemokamo siuntimo teritorija, paslaugos gabaritų atskyrimas nuo maršruto/kainos ir vidinio rengimo statuso laikymas metaduomenyse. Prieš galutinį ratą lab pateikė tik patvirtintos viešos projekcijos operatoriaus vardą, el. paštą ir kilmę. Projekcijos MB Pinet / info@pinet.lt atitikimas dabartinei viešo core konfigūracijai patikrintas. Kitos nišos projekcija atmetama; klientų asmens duomenys ir slapta konfigūracija neperduodami. Atskirame modelio review reikalaujamas profesionalus laiško formatas, serveris papildomai tikrina operatoriaus vardą ir el. paštą. Tai ne agento savarankiško production skills pakeitimo įrodymas.

## Galutiniai scenarijai

| Scenarijus | Galutinis vertinimas |
| --- | --- |
| Vietinis nemokamas siuntimas, gavėjas LT | Transporto kaina NULL, maršrutas nepatvirtintas, nežinoma pakuotė NULL |
| Produkto matmenys be pakuotės matavimo | Ilgiausia kraštinė ir apimtis NULL, gabaritų tinkamumas unknown |
| Pakuotė 145 × 145 × 50 cm, 20 kg | Ilgiausia 145 cm, apimtis 535 cm, standartinio profilio gabaritai fail; visas vežėjas neatmetamas |
| Pakuotė 60 × 40 × 30 cm, 20 kg | Ilgiausia 60 cm, apimtis 200 cm, gabaritai pass; maršrutas ir kaina dar nepatvirtinti |

Visuose keturiuose atvejuose `landed_cost_ready=false`, `can_quote_customer=false`, `can_commit_order=false`. Dvi BayWa užklausos vokiškai, dvi DPD užklausos lietuviškai. Galutinėje rankinėje peržiūroje vidinių „juodraščio / dar neišsiųsta / parengiu peržiūrai“ žymų laiškų body nėra. Komercinė frazė „užklausa nėra užsakymas“ palikta kaip tinkama.

## Įrodymai ir ribos

- [Baseline ataskaita](../agent-business-core/runtime/artifacts/network-calibration/supplier-20261002-delivery-baseline/suppliers/report.json), [pirmoji pataisa](../agent-business-core/runtime/artifacts/network-calibration/supplier-20261002-delivery-repair/suppliers-repair/report.json).
- [Galutiniai laiškai](../agent-business-core/runtime/artifacts/network-calibration/supplier-20261002-delivery-format/suppliers-repair/index.html), [galutinė JSON ataskaita](../agent-business-core/runtime/artifacts/network-calibration/supplier-20261002-delivery-format/suppliers-repair/report.json).
- Galutinio rato `run-contract.json` ir baseline `baseline-contract.json` užfiksuoti po dispatch, tai aiškiai pažymėta; jų nevadiname iki vykdymo užšaldytu kontraktu. Instrukcijų / fixture / skripto / projekcijos hash išsaugoti.
- Šio tęsinio tikslinės Python patikros: 28 PASS, 6,92 s. Apima tiekėjų HTTP ribas, matmenų ir kainos nežinomybes, operatoriaus parašą / svetimos projekcijos atmetimą, instrukcijas, profilius, Jev ON/OFF, revizijas ir vėlyvų rekomendacijų atmetimą. Scoped Ruff PASS. Tai tikslinė patikra; ankstesnės 213 visos suite patikros šiandien iš naujo nepaleistos.

Tiekėjų atradimas šiame lab yra operatoriaus atrinktas viešas katalogas; modelis pasirenka, ką skaityti. `supplier.public_fetch` čia nėra prijungtas prie keturių skambučio/dialogo įrankių. Išorinių laiškų, RFQ, užsakymų ar klientų kainų šiame rate 0. SMTP, balsas, svetainių turinys ir kitų sesijų procesai nekeisti. Galutinio kliento pasiūlymo priėmimui dar reikia tikro tiekėjo maršruto, kainos, sąlygų ir tinkamumo patvirtinimo.
