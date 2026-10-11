# Xbot įgyvendinimo būsena

Vietinis pavedimas užbaigtas; šaltinio paketas paruoštas peržiūrai. Laukiama atskiro maintained platformos prijungimo ir vėlesnio savininko numatyto kalibravimo.

2026-10-11 · `codex/xbot-finish-20261011` · core bazė `7af6b9641012a30c5f95eac38a66daeff8f8cb39` · rezervacija GitHub #89.

| Sritis | Faktinė būsena |
| --- | --- |
| Vietinė eilė, per-nišos profilis, planas, kalendorius, review | PR90 55 PASS išsaugoti; atskiras issue91 paketas su async patikromis iš viso 87 lokalūs testai PASS |
| Codex CLI juodraštis ir nepriklausoma peržiūra | Actual sintetinis Service → CLI → patvarus juodraštis PASS su aiškiai parinktu gpt-5.5 |
| Operatorius, aštuonios UI skiltys, vaizdo importas | Actual naršyklės patikra desktop/mobile; konkretūs įrodymai QA |
| Treg transportas, sąnaudos, paskyros lock, medija, fail-closed siuntimas | Įgyvendinta ir mock/HTTP patikros; šio pavedimo metu mokamų X veiksmų 0 |
| Verslomatika modulio DTO / schema / adapteris | Įgyvendinta, nekintama per-verslo tapatybė, DB aplinkos pin ir revokacija testuotos |
| Modelio apskaita po atmetimo/klaidos/cancel | Nepriklausomi usage kvitai, lifetime sumos; nežinomi žetonai ir piniginė kaina neišgalvojami |
| Maintained core auth / source resolver / dashboardo API laidai | Suderinta sutartis; actual prijungimas dar neįgyvendintas |
| Awaited module ir Service current-core bibliotekos sąsaja | Async bind/snapshot/command, kiekvieno modelio ir provider rezultato patikros įgyvendintos; tik injected priėmimas, tikras server resolver dar neprijungtas |
| Bendro projekto ir nišos kalibravimas | Atidėtas kitam savininko numatytam etapui |
| Gyva kampanija, recurring runtime, post/media/reply/DM priėmimas | OFF; nauji kanalai išjungti, ribos 0 |
| CRM CaseSource / pardavimo atribucija | Neprijungta; vietinis inbound klasifikavimas nesukuria kliento |

Ankstesnis shared CodexLab constructor netiko Xbot užduočiai. Dabar modulis turi ribotą no-tools runnerį su strict JSON, laiko ir bandymų ribomis. App modelio vardas bei šio CLI numatytasis modelis faktiniu bandymu buvo atmesti; sėkmingas aiškus modelio pasirinkimas dokumentuotas, globalūs savininko modelio nustatymai nekeisti.

Šaltinio pakeitimas nėra main merge, runtime deployment, paskyros mandato, klientų leidimo, nišos paklausos ar pelno įrodymas. [QA](QA-2026-10-11.md) ir [platformos sutartis](PLATFORM_CONTRACT.md) atskiria šias būsenas. 2026-10-07 istorija išsaugota atskirai, jos įrodymai neatnaujinti atgaline data.

Originalaus PR90 source `780bd36f1e39b19b6fb53129be228ea7483dfa19` įrodymai palikti nepakeisti. [Papildoma peržiūra](QA-REVIEW-FOLLOWUP.md) fiksuoja rastas persiejimo ir usage spragas, pradines nesėkmes bei pataisų priėmimą. Platformos sesija tikrino read-only, root taisė tik Xbot. Maintained async source/auth prijungimas ir realus Agentai → X dashboard kelias tebėra atskiras darbas.

[Issue91 QA](QA-ASYNC-CORE.md) aprašo atskirą bibliotekos priklausomybę nuo PR90/4c7. Root Registration/Profile/V2 source perskaitytas iš clean32b2 ir ba891 tik read-only. Shared PG/BFF, customer_profile, portal, mokami modeliai ir X kanalas šiame žingsnyje nekeisti; main merge/adoption nėra numanomi.
