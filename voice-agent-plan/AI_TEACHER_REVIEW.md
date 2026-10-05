# AI_teacher balso vedlio principų peržiūra

2026-09-30. Savininkas paprašė pasisemti idėjų iš `C:/Users/lenovo/Documents/AI_teacher`. Perskaitytos projekto taisyklės, architektūros ištrauka ir aktualus tėvų balso sąrankos kodas. Projektas nekeistas, nepaleistas ir jo testai šiame darbe nevykdyti. Kode matomas kelias nėra mūsų nišų sistemos realaus skambučio įrodymas. Vaikų profiliai, tikri transkriptai ir paslaptys neskaityti.

## Pritaikomi principai

| Vietinis kodo šaltinis | Ką patikrinome kode | Kaip pritaikome verslo konsultantui |
| --- | --- | --- |
| [profile-live-agent.ts](C:/Users/lenovo/Documents/AI_teacher/src/lib/profile-live-agent.ts) | `record_profile_facts` perduoda tik schemos laukus, topic ID ir in_progress/covered būseną; validuoja griežta Zod schema. | `need.patch` fiksuoja poreikio laukus ir jų kilmę pokalbio metu. Jis atskiras nuo galutinio registracijos ar sandorio veiksmo. |
| [voice-profile-controller.tsx](C:/Users/lenovo/Documents/AI_teacher/src/components/voice-profile-controller.tsx) | Tool call ID deduplikavimas, invalid argumentų atmetimas, accepted atsakymas, capturedFields ir coveredTopics apskaita. | Idempotentinis serverio įrašas, vienas ACK ir vienas UI atnaujinimas. Versle ACK siunčiamas po patvaraus DB įrašo: React būsenos priėmimas tam nepakankamas. |
| [voice-profile-setup.tsx](C:/Users/lenovo/Documents/AI_teacher/src/components/voice-profile-setup.tsx) | Gyva aptartų sričių eiga, matomas juodraštis, rankinis taisymas ir galutinis patvirtinimas. | Neįkyrus kliento poreikio juodraštis bei kritinių matmenų/veiksmų kortelės. Paprasta konsultacija nereikalauja užpildyti visos anketos. |
| [profile-interview.ts](C:/Users/lenovo/Documents/AI_teacher/src/lib/profile-interview.ts) | Juodraščio instrukcija skiria tėvo faktus nuo agento klausimų, praleidžia nežinomus laukus ir vėlesnę pataisą laiko svarbesne. | Kliento pareiškimas ir agento rekomendacija saugomi atskirai. Pataisymas pakeičia lauko versiją ir panaikina nuo jos priklausančią rekomendaciją. |
| [profile-interview-prompt.ts](C:/Users/lenovo/Documents/AI_teacher/src/lib/profile-interview-prompt.ts) | Vienas klausimas, aiškus baigimo prašymas, savanoriškai pateiktų vėlesnių temų faktų priėmimas ir praleistos temos žyma. | Klientas gali papasakoti kelis dalykus vienu atsakymu. Neklausiame jų pakartotinai vien todėl, kad scenarijus numatė kitą tvarką. |
| [model-router.ts](C:/Users/lenovo/Documents/AI_teacher/src/lib/model-router.ts) | Modelių klasės, reasonCode, versija ir capability sutartis; tai programinis registras, ne Jev semantinis ketinimo modelis. | Vienas modelių registras; atskiras intent routeris gali parinkti patikrintą užduoties profilį. Nenaudojame kito projekto modelių ID kaip mūsų dabartinio pasirinkimo autoriteto. |
| [prompt-manifest.ts](C:/Users/lenovo/Documents/AI_teacher/src/lib/agent-prompts/prompt-manifest.ts) | Fragmentų tvarka, hash, tool schemų hash, tokenų biudžetai ir tikslus surinktos instrukcijos atkuriamumas. | Prompto compiler/manifest užrašo, kuri bazė, nišos atmintinė ir specialistinis fragmentas sukūrė konkretų atsakymą. Tai būtina savikalibracijos palyginimui ir rollback. |
| [use-live-teacher.ts](C:/Users/lenovo/Documents/AI_teacher/src/hooks/use-live-teacher.ts) | Pažymimos nepatikimos transkripcijos, pašalinami atšaukti tool requests. | STT laikomas hipoteze; pertraukimas ir užklausos atšaukimas negali suteikti leidimo ankstesniam veiksmui. |

## Kur adaptacija turi skirtis

Tėvų vedlys galutinį profilį išsaugo po peržiūros. Nišų sistemoje informacinį poreikį ir kliento prašytą follow-up galima registruoti automatiškai pagal mandatą; nereikia reikalauti žmogaus patvirtinimo kiekvienam laiškui. Tikslias komercinio veiksmo sąlygas vis tiek patvirtina klientas.

`covered` gali reikšti ir praleistą temą, todėl tai nėra žinomo ar patvirtinto lauko sinonimas. Mūsų sutartyje atskiriame `answered`, `skipped`, `unknown`, `not_applicable`, laukų kilmę ir konkretaus veiksmo parengties kriterijus. Vien pažangos procentas nieko neįsipareigoja.

Tėvų vedlio būsenos įrankis deklaruotas `BLOCKING`. Mūsų gyva paieška gali būti `NON_BLOCKING`, o kritiniam įrašui būtinas patvarus kvitas ir draudimas paskelbti sėkmę anksčiau. Kopijuoti vienodą visų įrankių vykdymo režimą netinka.

Tėvų juodraščio kelias siunčia ribotą naršyklės transkriptą ir atmeta pending/nepatikimas eilutes. Mūsų post-call analitikas naudoja patvarų serverio transkriptą su coverage ir vėluojančiais kvitais; klientinė santrauka nėra autoritetas. Neaiški kritinė reikšmė tikslinama, o ne automatiškai pašalinama prarandant patį poreikį.

## Konkreti mūsų kliento eiga

Klientas sako: „Reikia dviejų 18.4R34 padangų, daugiausia dirbu laukuose, pasiūlymą siųskite paštu.“ Agentas priima tris poreikio laukus, atveria kontakto popup ir klausia vieno tolesnio svarbaus dalyko. Ekrane matoma juodraščio kortelė. Routeris ruošia tinkamą gamintojo šaltinį ar specialistinę užduotį. Klientui pataisius matmenį kortelė ir užduoties revision keičiasi; senas rekomendacijos rezultatas nebepritaikomas.

Tai būsimas scenarijus, ne patvirtinta konkrečios nišos prekybos galimybė. Detalus kelių ir promptų modelis — [routerio sutartyje](ROUTING_AND_INTELLIGENCE.md), automatinio tobulinimo vartai — [SELF_CALIBRATION.md](SELF_CALIBRATION.md).
