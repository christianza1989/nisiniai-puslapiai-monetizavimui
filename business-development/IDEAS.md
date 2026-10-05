# Verslo plėtros ir automatizacijos idėjų registras

2026-10-01. Naujas idėjas savininkas aptaria / patvirtina atskiroje idėjų Codex sesijoje. Įgyvendinimui saugoti tikrą patvirtinimo šaltinį ir apimtį. Registras nėra automatinis visų siūlomų darbų mandatas.

| ID | Idėja | Statusas | Patvirtinimas / vykdytojas | Įrodymas |
|---|---|---|---|---|
| [BDEV-0001](ideas/BDEV-0001.md) | Atskirai valdomas Facebook core modulis kiekvienai nišai — privati vietinė pakopa | implemented | Originalus savininko mandatas; root kvitas peržiūrėtas 2026-10-01; stage `implemented_local_increment` | [QA](../research/facebook-module-2026-10-01/QA.md); live collector / Page / send / retention / runner lieka pending |
| [BDEV-0002](ideas/BDEV-0002.md) | businessintelligence.lt: vienos pasikartojančios Excel ataskaitos automatizavimo bandymas | proposed | Savininko patvirtinimo nėra; įgyvendinimas nepradėtas | [Rinkos / vykdymo / ekonomikos tyrimas](research/2026-10-01-single-report/RESEARCH.md); mūsų paklausa nepatikrinta |
| [BDEV-0003](ideas/BDEV-0003.md) | Verslomatika.lt: keturi verslo užsakymo keliai ir kliento automatizuotų verslų portfelis | discussing | Savininko 2026-10-01 vizija ir patvirtintas maksimalios autonomijos principas; visos platformos realizacijos apimtis dar nenustatyta | [Platformos vizija](VISION.md): savarankiški įrankiai, partneriai, apskaitos paketas; naudojamas esamas domenų / core pagrindas |

Pagrindinė savininko kryptis nuo 2026-10-01: [Verslomatika.lt ir verslų portfelis](VISION.md). Tolesnius tyrimus vertinti jos kontekste. BDEV-0002 lieka atskiras nepatvirtintas bandymas.

2026-10-01 14:00 UTC tyrimo papildymas BDEV-0003: [vieno proceso plano pilotas BDEV-0003-P1](research/2026-10-01-first-path/PILOT.md), **proposed**. Pirmas siūlomas įgyvendinimas iki 8 agento darbo valandų privatus prototipas; hipotetinė mokamo plano kaina 299 €, be naujų prenumeratų. [Pirminiai šaltiniai ir prieštaraujantys įrodymai](research/2026-10-01-first-path/RESEARCH.md). Naujo ID / runtime ar siuntimo teisės nėra; BDEV-0003 pagrindinis statusas lieka discussing.

Pasiūlymo vertė nėra pažadėtas pelnas ar klientų skaičius. BDEV-0002 konkretina esamą BI hipotezę: vieno šaltinio paketas, kliento aplinka, dviejų laikotarpių priėmimas ir laiko / kainos bandymas. Naujo runtime modulio savaime nereikia.

2026-10-03 14:00 UTC BDEV-0003 perdavimo hipotezės konkretinimas: [BDEV-0003-P2 vietinis vienos nišos duomenų eksporto / atkūrimo bandymas](research/2026-10-03-transfer/PILOT.md), **proposed**, iki 4 agento darbo valandų su sintetiniais dviejų nišų įrašais. [Tyrimas](research/2026-10-03-transfer/RESEARCH.md): turinio paketas apima JSON/mediją, o bendrų D1 lentelių atranka savaime nėra siteId eilučių atranka. Tai esamo M9 bandymo detalė, ne naujas BDEV ID, nutekėjimo radinys ar gyvo perdavimo mandatas. BDEV-0003 statusas lieka discussing; P1 nepakeistas.
