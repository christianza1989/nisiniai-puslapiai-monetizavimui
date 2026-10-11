# Xbot įgyvendinimo būsena

Vietinis pavedimas užbaigtas; šaltinio paketas paruoštas peržiūrai. Laukiama atskiro maintained platformos prijungimo ir vėlesnio savininko numatyto kalibravimo.

2026-10-11 · `codex/xbot-finish-20261011` · core bazė `7af6b9641012a30c5f95eac38a66daeff8f8cb39` · rezervacija GitHub #89.

| Sritis | Faktinė būsena |
| --- | --- |
| Vietinė eilė, per-nišos profilis, planas, kalendorius, review | Įgyvendinta, 40 lokalūs testai PASS |
| Codex CLI juodraštis ir nepriklausoma peržiūra | Actual sintetinis Service → CLI → patvarus juodraštis PASS su aiškiai parinktu gpt-5.5 |
| Operatorius, aštuonios UI skiltys, vaizdo importas | Actual naršyklės patikra desktop/mobile; konkretūs įrodymai QA |
| Treg transportas, sąnaudos, paskyros lock, medija, fail-closed siuntimas | Įgyvendinta ir mock/HTTP patikros; šio pavedimo metu mokamų X veiksmų 0 |
| Verslomatika modulio DTO / schema / adapteris | Įgyvendinta, per-verslo sritis ir revokacija testuotos |
| Maintained core auth / source resolver / dashboardo API laidai | Suderinta sutartis; actual prijungimas dar neįgyvendintas |
| Bendro projekto ir nišos kalibravimas | Atidėtas kitam savininko numatytam etapui |
| Gyva kampanija, recurring runtime, post/media/reply/DM priėmimas | OFF; nauji kanalai išjungti, ribos 0 |
| CRM CaseSource / pardavimo atribucija | Neprijungta; vietinis inbound klasifikavimas nesukuria kliento |

Ankstesnis shared CodexLab constructor netiko Xbot užduočiai. Dabar modulis turi ribotą no-tools runnerį su strict JSON, laiko ir bandymų ribomis. App modelio vardas bei šio CLI numatytasis modelis faktiniu bandymu buvo atmesti; sėkmingas aiškus modelio pasirinkimas dokumentuotas, globalūs savininko modelio nustatymai nekeisti.

Šaltinio pakeitimas nėra main merge, runtime deployment, paskyros mandato, klientų leidimo, nišos paklausos ar pelno įrodymas. [QA](QA-2026-10-11.md) ir [platformos sutartis](PLATFORM_CONTRACT.md) atskiria šias būsenas. 2026-10-07 istorija išsaugota atskirai, jos įrodymai neatnaujinti atgaline data.
