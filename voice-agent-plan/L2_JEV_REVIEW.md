# L2 Jev routerio peržiūra ir pritaikymas balsui

2026-09-30. Peržiūrėtas savininko `C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1` aktualus companion routerio, kernel ir konteksto compiler kodas, keli vienetiniai testai bei vienas saugomas provider pilotas. Šis projektas nekeistas, testai nepaleisti ir žaidimo serveris neliestas. Paslapčių failai, privatūs žurnalai ir klientų duomenys neskaityti.

## Ką radome aktualiame kode

- [jev-intent-decision.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/src/providers/jev-intent-decision.ts>) komponuoja keturis Noul atsakymus: ar reikia operacijos, atskiros replikos, gyvo įrodymo ir ar nuoroda neaiški. Vertina tik tai šakai svarbius atsakymus; nereikšmingas neapibrėžtas atsakymas neverčia viso kelio brangti.
- [jev-shadow-router.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/src/providers/jev-shadow-router.ts>) turi inflight ribą, timeout, typed response patikrą, palyginimo metrikas ir ribotą runtime state. Direct tool kandidatai yra aktuali vieno katalogo projekcija, su serverio susietais argumentais.
- [party-agent-kernel.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/src/kernel/party-agent-kernel.ts>) parenka Gemini lane tik decisive rezultatui, turi papildomą Promise.race apsaugą nuo užstrigusio provider promise ir grįžta į Gemini, jei Jev netinka.
- [context/compiler.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/src/context/compiler.ts>) parenka mažesnę atitinkamai lane skirtą istorijos ir faktų projekciją. Tai naudinga mintis: parinkti ne tik modelį, bet ir mažiausią jam reikalingą kontekstą.
- [agent-system/SYSTEM.md](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/agent-system/SYSTEM.md>) bei jo katalogo loaderis laiko bendrą kontraktą ir CHAT/DATA/FAST_ACTION/ACTION/MIXED/CLARIFY fragmentus viename versijuojamame autoritete. Specialistui leidžiama grąžinti structured handoff, jei Jev parinko netinkamą kryptį.
- [jev-live-switch.test.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/tests/unit/jev-live-switch.test.ts>) aprašo užstrigusio Jev grįžimą į Gemini ir vykdymo teisių išlaikymą. [v14-lane-prompts.test.ts](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/services/agent-engine/tests/unit/v14-lane-prompts.test.ts>) tikrina bounded fragmentus ir bendrą katalogą. Testų buvimas nėra jų šio darbo PASS.

Svarbus šaltinio statusas: `docs/important doc/NPC_V1_4_JEV_LIVING_WORLD_ARCHITECTURE.md` viršuje yra 2026-09-23 pataisa, kad NPC Jev skyriai istoriniai ir NPC Jev nebeplanuojamas. Todėl jų nelaikome aktualios veikiančios integracijos autoritetu; remiamės peržiūrėtu companion kodu.

## Ką perimame, ko nekopijuojame

| L2 principas | Verslo balso adaptacija |
| --- | --- |
| Nepriklausomi siauri sprendimai | Reikia šaltinio? Reikia įrašo? Reikia patikslinti? Reikia specialistinės analizės? Juos komponuoja kodas pagal aktualią užduotį. |
| Lane ir kompaktiškas promptas | Routeris parenka serverio prompto ID bei konteksto projekciją foniniam specialistui; Live išlaiko bendrą konsultanto tapatybę. |
| Vienas įrankių katalogas | Tool/skill projekcijos iš esamo core registro, jokio antro Jev allowlist autoriteto ar savavališkai sugeneruotų įrankių. |
| Typed hint yra klaidus | Handleris gali grąžinti `needs_clarification` arba `needs_specialist`; vienas bounded perparinkimas, tada aiškus tęsinys. |
| off / shadow / on | Per nišą ir sprendimų klasę valdomas rollout, palyginimas ir greitas išjungimas. |
| Executor sprendžia teisėtumą | Python mandatų gate ir išorinė sistema tikrina vykdymą, Jev nepatvirtina sandorio. |

L2 skaitinių slenksčių į nišas neperkeliame. Jo `minimumConfidence` iš Noul yra vietinė `max(p, 1-p)` kompozicija, o ne TypeSafe Choice/Score `confidence` laukas. Balso kriterijams kalibruojame atskirą semantiką. Taip pat neperkeliame žaidimo grupinių komandų, STT įsitikinimo laukų kaip garantuotų Gemini signalų, istorinių promptų ar viso socialinio žaidimo konteksto.

L2 kviečia OpenRouter alpha decisions endpointą; mūsų oficialaus TypeSafe adapterio sutartis yra atskira. Modelio ID, atsakymo schema, quota ir confidence interpretacija fiksuojama pagal konkretų providerį, ne spėjama iš bendro „Jev“ pavadinimo.

## Vietinis įrodymas apie delsą

Peržiūrėtame [2026-09-20 provider pilote](<C:/Users/lenovo/Downloads/Lineage AI/L2_AI_Agentic_EngineV1/evidence/jev-router-pilot/jev-router-pilot-2026-09-20T07-46-32-880Z.json>) yra 157 TURN_KIND_ONLY atvejai: 149 teisingi, 8 klaidingi; selective kelias priėmė 124, iš jų 122 teisingi, 33 atmetė. Užrašyta p50 552 ms ir p95 672 ms. Failo klasė `PROVIDER_LAB`, rezultatas `NEEDS_REVIEW`, kartojimas vienas; tai saugomas to bandymo įrodymas, ne naujas matavimas, ne pilnų veiksmų tikslumas ir ne garantija verslo užklausoms.

Šis konkretus skaičius padeda pasirinkti architektūrą: nereikėtų laukti Jev prieš kiekvieną Live repliką. Pirmiausia ruošiame kontekstą fone, o Jev kritiniame kelyje paliekame tik jei tiesioginis ar pasirinktas adapteris pasiekia mūsų delsos tikslą. „Fone“ nepanaikina tinklo ir reikiamo fakto gavimo laiko.

## Galutinis pasirinkimas

Perimame **ketinimas → ribotas sprendimas → tinkamas promptas/įrankis → vykdymo įrodymas** struktūrą. Gyvas modelis tęsia dialogą, o serveris valdo jau paruoštų užduočių rezultatų aktualumą. Numatome mažą patvirtintų specialistinių promptų registrą ir šalutinių efektų neturinčią išankstinę paiešką. Ši sutartis detalizuota [ROUTING_AND_INTELLIGENCE.md](ROUTING_AND_INTELLIGENCE.md); jos kokybė tikrinama mūsų lietuviškų pokalbių rinkiniu.
