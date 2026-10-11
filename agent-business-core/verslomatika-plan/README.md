# Verslomatika.lt: agentų platformos ir valdymo skydelio planas

2026-10-10. **Planavimo paketas užbaigtas; toliau aprašytas platformos įgyvendinimas PLANNED.** Savininko patvirtinta paskirtis: vienoje platformoje valdyti ir automatizuoti visus verslus, prižiūrėti visus jų agentus ir kalbėtis su kiekvienu kaip direktoriui. Šis paketas išplečia [ankstesnę core architektūrą](../ARCHITECTURE.md) ir jos M2/M6/M7 etapus pagal naują pavedimą. Istoriniai checkboxai ir bandymai nepaverčiami naujais PASS.

## Ką savininkas turės

1. Portfelį su kiekvieno verslo rezultatais, agentais, išlaidomis ir išimtimis.
2. Pasirinkto verslo darbo aplinką: agentai, užduotys, veiklos žurnalas, klientai, laiškai/atsakymai, dokumentai, finansai ir integracijos.
3. Atskirą direktoriaus pokalbį su kiekvienu agentu. Klausimas gauna ataskaitą su šaltiniais; nurodymas virsta užduotimi su atsakingu agentu, eiga ir rezultatu.
4. Verslo direktoriaus agentą, koordinuojantį specialistus, bei portfelio koordinatorių. Galima tiesiogiai kreiptis ir į specialistą. Agentai neprivalo nuolat veikti kaip atskiri procesai.
5. Apskaitos koordinatorių pagal juridinį asmenį: dokumentai, mokėjimų sutikrinimas, parengti įrašai, išimtys ir buhalteriui tinkamas paketas.
6. Bendrą agentų registrą. Naują agento tipą prijungsime per jo aprašą, įrankius, rezultato schemą ir kalibravimą, išlaikydami tą pačią valdymo sąsają.

## Ar klientų paieškos agentas dabar jau veikia iki galo?

**Ne.** Yra vietinis prospect vertinimas/juodraščių parengimas ir uždaras kelių žinučių Codex kalibravimas. Visas gyvas kelias — automatinė paieška → patikrintas kontaktas → tikras siuntimas → gautas atsakymas → atsakymo apdorojimas → tikra Madbeauty registracija/aktyvavimas — dar nesujungtas ir nepriimtas. Esamas kitam procesui patikrintas testinis SMTP/IMAP kelias savaime neprijungia outbound agento.

400 žinomų sintetinių kalibravimo derinių nėra 400 realių potencialių klientų ar pilnai atliktų modelio dialogų. Paskutiniai tikri bandymai, klaidos ir ribos pateikti [kalibravimo QA](../../docs/ACQUISITION_DIALOGUE_CALIBRATION_QA_2026-10-10.md). Paieškos įgyvendinimo darbai lieka [acquisition roadmap](../acquisition-plan/ROADMAP.md). Skydelis turės rodyti atskirai parengtą, įjungtą ir realiu keliu patikrintą agentą.

## Skaitymo tvarka

| Dokumentas | Ką nustato |
| --- | --- |
| [PRODUCT](PRODUCT.md) | Savininko reikalavimai, naudotojai, faktai ir atviri sprendimai |
| [AUDIT](AUDIT.md) | Kas iš tikrųjų yra kode, kas tik aprašyta ir ką pernaudoti |
| [ARCHITECTURE](ARCHITECTURE.md) | Agentų organizacija, registras, duomenys, patvarus vykdymas, API ir integracija |
| [DIRECTOR_CHAT](DIRECTOR_CHAT.md) | Pokalbiai, užduočių delegavimas, atmintis ir patikrinamos ataskaitos |
| [SCREENS](SCREENS.md) | Navigacija, 35 paviršių registras, būsenos ir pagrindinės naudotojo kelionės |
| [FINANCE](FINANCE.md) | Dokumentų/sąskaitų eiga, sutikrinimas, koordinuojama apskaita ir buhalterio paketas |
| [TOOLS](TOOLS.md) | Dabartinių ir būsimų adapterių paskirtis, aprėptis, kaštų bei aktyvavimo ribos |
| [ROADMAP](ROADMAP.md) | D0–D9 darbai, priklausomybės, priėmimo įrodymai ir testavimo matrica |
| [INTEGRATION_HANDOFF](INTEGRATION_HANDOFF.md) | Repo/šakos, esami ir dar nesukurti API, pirmas integracijos paketas ir pavedimas kito PC agentui |

## Įgyvendinimo sprendimas

Plečiame vieną modulinį FastAPI/PostgreSQL core ir kuriame vieną autentifikuotą React/TypeScript Verslomatika valdymo aplinką. Esamos mažos konsolės tampa jos moduliais; turinio studija ir viešų svetainių core jungiami adapteriais. Kiekvienam agentui ar verslui neatsiranda atskira duomenų bazė, atskiras dashboardas ar naujas pašto variklis.

Pirmas vertikalus rezultatas bus realus vietinis kelias: prisijungimas → verslas → registruotas agentas → „kaip sekasi?“ → duomenimis pagrįsta ataskaita → direktoriaus užduotis → patvarus vykdymas → įvykis ir rezultatas UI. Jis tikrinamas dviejų izoliuotų verslų kontekste. Tik po to plečiami kanalai, gyvas Madbeauty pilotas ir finansai. Fixtures izoliuojamos pagal [DEMO_DATA_POLICY](../../DEMO_DATA_POLICY.md).

Galutinis „veikia“ reiškia konkrečią patikrintą versiją ir kelią. Plano, švaraus JSON, įjungto jungiklio ar gražaus pokalbio tam nepakanka.
