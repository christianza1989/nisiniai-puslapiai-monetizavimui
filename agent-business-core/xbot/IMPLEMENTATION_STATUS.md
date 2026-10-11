# Xbot įgyvendinimo būsena

Vietinis Xbot ir atskiras sintetinio PostgreSQL prijungimo paketas užbaigti peržiūrai. Laukiama platformos peržiūros/adoption, tikro bendro bei nišos kalibravimo ir dashboardo/BFF prijungimo; gyvas kanalas lieka OFF.

2026-10-12 papildymas: [PG sąsaja](PG_BRIDGE.md), [faktinės patikros](QA-PG-BRIDGE.md) ir sanitizuotas QA JSON. Užfiksuotas source `d3aa5ab484c4d9995bb52877d26f5e1e7fcb6085`:25 nauji actual restricted-PG testai su tikra clean-Git patikra PASS/365.01s;25 esami customer_agents testai PASS/189.72s su jų originaliais fake/source adapteriais. Modeliai abiem rinkiniams sintetiniai; tai nėra gyvo kliento/modelio kalibravimas. Ankstesni55/87 ir CLI įrodymai neperrašyti ar iš naujo sumuojami.

2026-10-11 · `codex/xbot-finish-20261011` · core bazė `7af6b9641012a30c5f95eac38a66daeff8f8cb39` · rezervacija GitHub #89.

| Sritis | Faktinė būsena |
| --- | --- |
| Vietinė eilė, per-nišos profilis, planas, kalendorius, review | PR90 55 PASS išsaugoti; atskiras issue91 paketas su async patikromis iš viso 87 lokalūs testai PASS |
| Codex CLI juodraštis ir nepriklausoma peržiūra | Actual sintetinis Service → CLI → patvarus juodraštis PASS su aiškiai parinktu gpt-5.5 |
| Operatorius, aštuonios UI skiltys, vaizdo importas | Actual naršyklės patikra desktop/mobile; konkretūs įrodymai QA |
| Treg transportas, sąnaudos, paskyros lock, medija, fail-closed siuntimas | Įgyvendinta ir mock/HTTP patikros; šio pavedimo metu mokamų X veiksmų 0 |
| Verslomatika modulio DTO / schema / adapteris | Įgyvendinta, nekintama per-verslo tapatybė, DB aplinkos pin ir revokacija testuotos |
| Modelio apskaita po atmetimo/klaidos/cancel | Nepriklausomi usage kvitai, lifetime sumos; nežinomi žetonai ir piniginė kaina neišgalvojami |
| Maintained core auth / source resolver / dashboardo API laidai | Actual izoliuotas PG resolver, atskiras worker grant, ticket ir galutinis CAS su saugiu HTTP kvitu priimti sintetiniam keliui; BFF/portal/operational adoption dar neatlikta |
| Awaited module ir Service current-core bibliotekos sąsaja | Ankstesnė87 injected QA išsaugota; papildomas tikras PG/maintained V2 source kelias patikrintas34 naujais testais po atskiros peržiūros pataisų. Canonical module admission/activation lieka false, kalibravimas UNVERIFIED |
| Bendro projekto ir nišos kalibravimas | Atidėtas kitam savininko numatytam etapui |
| Gyva kampanija, recurring runtime, post/media/reply/DM priėmimas | OFF; nauji kanalai išjungti, ribos 0 |
| CRM CaseSource / pardavimo atribucija | Neprijungta; vietinis inbound klasifikavimas nesukuria kliento |

Ankstesnis shared CodexLab constructor netiko Xbot užduočiai. Dabar modulis turi ribotą no-tools runnerį su strict JSON, laiko ir bandymų ribomis. App modelio vardas bei šio CLI numatytasis modelis faktiniu bandymu buvo atmesti; sėkmingas aiškus modelio pasirinkimas dokumentuotas, globalūs savininko modelio nustatymai nekeisti.

Šaltinio pakeitimas nėra main merge, runtime deployment, paskyros mandato, klientų leidimo, nišos paklausos ar pelno įrodymas. [QA](QA-2026-10-11.md) ir [platformos sutartis](PLATFORM_CONTRACT.md) atskiria šias būsenas. 2026-10-07 istorija išsaugota atskirai, jos įrodymai neatnaujinti atgaline data.

Originalaus PR90 source `780bd36f1e39b19b6fb53129be228ea7483dfa19` įrodymai palikti nepakeisti. [Papildoma peržiūra](QA-REVIEW-FOLLOWUP.md) fiksuoja rastas persiejimo ir usage spragas, pradines nesėkmes bei pataisų priėmimą. Platformos sesija tą delta tikrino read-only. Naujas PG paketas turi savo atskirą priėmimą; realus Agentai → X dashboard kelias tebėra atskiras darbas.

[Issue91 QA](QA-ASYNC-CORE.md) aprašo atskirą bibliotekos priklausomybę nuo PR90/4c7. Root Registration/Profile/V2 source perskaitytas iš clean32b2 ir ba891 tik read-only. Shared PG/BFF, customer_profile, portal, mokami modeliai ir X kanalas šiame žingsnyje nekeisti; main merge/adoption nėra numanomi.
