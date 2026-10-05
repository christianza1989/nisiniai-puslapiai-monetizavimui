# Balso platformų praktikos ir plano auditas

Patikrinta 2026-09-30, papildžius pirminį Gemini, LiveKit ir Pipecat tyrimą. Peržiūrėta oficiali Vapi, Retell AI, ElevenLabs ir TypeSafe dokumentacija. Tai viešų techninių sutarčių ir įgyvendinimo pavyzdžių palyginimas; tiekėjų uždaras kodas, jų klientų skambučiai ir mūsų realių skambučių kokybė netirti. „Moderniausia“ nėra išmatuota platformų vieta reitinge.

## Kokie sprendimai dokumentuoti

| Šaltinis | Dokumentuota praktika | Pritaikymas mūsų core |
| --- | --- | --- |
| [Vapi naršyklės įrankiai](https://docs.vapi.ai/tools/client-side-websdk) | Agentas gali inicijuoti UI veiksmą. Šiame Web SDK klientiniai įrankiai negrąžina modelio tool result; tam siūlomas serverinis įrankis. | Kontakto popup yra agento įrankis su mūsų serverio ir naršyklės ACK sutartimi. „Parodyta“ ir „kontaktas išsaugotas“ yra atskiri rezultatai. Tai ne pažadas, kad skirtingų tiekėjų SDK turi vienodą protokolą. |
| [Vapi structured outputs](https://docs.vapi.ai/assistants/structured-outputs-quickstart) | Po pokalbio analizuojamas transkriptas, įrankių rezultatai ir metaduomenys; schema apibrėžia rezultatą, analizė gaunama per API ar webhook. | Atskiras analizės vaidmuo jau numatytas. Laiškas remiasi ir serverio veiksmų kvitais, ne vien agento žodžiais. Pokalbio pabaiga ir analizės parengimas laikomi atskirais įvykiais. |
| [Retell Flex Mode](https://docs.retellai.com/build/conversation-flow/flex-mode) | Derinami verslo žingsniai ir lankstus pokalbis; dideli sukompiliuoti srautai brangsta, turi elgesio ribojimų. | Laisva konsultacija ir maži verslo procedūrų moduliai. Tikslias veiksmų sąlygas vykdo Python, nesukrauname visų 30 verslų srautų į vieną promptą. |
| [Retell testavimo vadovas](https://docs.retellai.com/test/test-overview) | Tekstiniai bandymai tikrina logiką, tikras web garsas — delsą ir pertraukimus. Speech-to-speech agentų tekstiniai bandymai nepakeičia audio bandymų. | Trys atskiri sluoksniai: core invariantai, teksto / analitiko regresijos ir realaus Gemini audio regresijos. Telefoninis testavimas pridedamas tik įjungus tikrą telefonijos kanalą. |
| [Retell analizės kategorijos](https://docs.retellai.com/features/post-call-analysis) | Po skambučio galima išgauti tekstinius, kategorinius, boolean ir skaitinius laukus. | Kiekvienai nišai savo poreikio schema; bendra outcome schema leidžia stebėti kokybę nesumaišant klientų. |
| [ElevenLabs pokalbio eiga](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow) | Valdomas tylos laikas, turn-taking, pertraukimai ir vienkartinis soft timeout pranešimas. | Atskiros įprasto klausimo, techninių matmenų, „palaukite“ ir formos pildymo būsenos. Vienas balso valdytojas neleidžia dviem sluoksniams vienu metu kalbėti. |
| [ElevenLabs Alexis įgyvendinimas](https://elevenlabs.io/docs/eleven-agents/guides/elevenlabs-docs-agent) | Dokumentacijos konsultantas naudoja RAG, naršyklės įrankius ir vertina poreikio supratimą, išsprendimą bei faktinį tikslumą. | Tai konkretus tiekėjo įgyvendinimo pavyzdys, artimas mūsų modeliui. Kartu vertiname atsakymo pagrįstumą ir kliento užduoties rezultatą. Pardavėjo aprašyti privalumai nėra mūsų konversijos įrodymas. |
| [TypeSafe intent routing](https://docs.typesafe.ai/patterns/intent-routing) | Tipizuotas sprendimas nukreipia į programinį handlerį, specialistą arba žmogų. | Jev numatomas kaip pakeičiamas routerio adapteris. Gyvas Gemini balsas lieka vienas; specialistai grąžina duomenis tam pačiam konsultantui. |

Komercinės platformos nėra vien „LLM su balsu“. Jų dokumentuose greta modelio aprašomos pokalbio valdymo, žinių, įrankių, analizės ir bandymų sutartys. Ši išvada yra dokumentacijos sintezė, ne jų vidinių architektūrų atkūrimas.

## Kas buvo plane ir kas sustiprinta

Pirminiame plane jau buvo WebRTC, native audio, nišų izoliacija, šaltinių versijos, serverio kontroliuojami įrankiai, patvari analizė, outbox, kontakto forma ir kokybės vartai. Palyginimas nepagrindžia šio branduolio pakeitimo komercine platforma.

Papildytos konkrečios spragos:

1. **Pokalbio ritmas.** Aiškios tylos, backchannel, klaidingo pertraukimo ir laukiančio įrankio taisyklės. Skaitinės ribos yra pilotų hipotezės, derinamos pagal lietuvišką garsą.
2. **Užduoties tęstinumas.** Klientas gali pakeisti temą ir grįžti prie užsakymo neatsakinėdamas iš naujo į jau patvirtintus klausimus. Pataisytas matmuo panaikina nuo seno matmens priklausomą rekomendaciją.
3. **Realaus garso vertinimas.** Audio scenarijai ir žmogaus kalibruoti vertintojai atskiriami nuo tekstinių simuliacijų. LLM vertinimas nėra rezervacijos ar laiško gavimo įrodymas.
4. **Sprendimų parinkimas.** Atskirta programinė autorizacija, Jev klasifikacija ir sudėtingesnė Flash analizė. Jev nėra įterpiamas prieš kiekvieną balso sakinį.
5. **Rezultato kokybė.** Atskirai matuojama techninė pabaiga, poreikio supratimas, teisingas įrankio veiksmas, kontakto pateikimas ir leidžiamo atsakymo pristatymas. Malonus pokalbis gali likti neišspręstas.

## Projektui siūlomi savarankiški sprendimai

Šie sprendimai yra mūsų architektūros sintezė ir tikrintinos hipotezės; neteigiame, kad jie naujai išrasti ar visais atvejais pranašesni:

- Viena struktūruota kliento poreikio ir įrodymų būsena gyvam konsultantui, analitikui bei tęsinio kanalui. Tai sumažintų nuostolius, kai po pokalbio viską bandytume atkurti iš santraukos.
- Kitas klausimas parenkamas pagal tai, kurio atsakymo trūkumas labiausiai blokuoja konkretų kliento tikslą. Traktoriaus padangos atveju matmuo ir apkrova gali būti svarbesni už vardą ar kontaktą.
- Ekrano kortelė su patikrintu matmeniu, dokumentu ar veiksmo rezultatu padeda klientui ištaisyti kritinį skaičių dar pokalbio metu. Ne visą techninį atsakymą būtina skaityti balsu.
- Pasikartojantys neatsakyti klausimai virsta patikros ir turinio užduotimis. Patvirtinta pataisa gali pagerinti visų tinkamų nišų žinias, bet jų kainos, kontaktai ir klientų duomenys lieka atskirti.
- Pokalbio greitis gerinamas leidžiamų skaitymo užduočių vykdymu fone ir rezultatų galiojimo tikrinimu; spėjami rezervavimo ar siuntimo veiksmai nevykdomi.

Detalus sprendimų modelis, Jev ribos ir palyginimo planas pateikti [ROUTING_AND_INTELLIGENCE.md](ROUTING_AND_INTELLIGENCE.md). Po šio audito planas yra išsamiau pagrįstas, tačiau produkcinį pasirinkimą patvirtins lietuviški audio bandymai, realių sistemų kvitai ir išmatuotos sąnaudos.

Vėlesni savininko pateikti šaltiniai peržiūrėti atskirai: [AI_teacher vedlys](AI_TEACHER_REVIEW.md), [L2 companion Jev integracija](L2_JEV_REVIEW.md). Naujas reikalavimas sistemai pačiai tobulėti aprašytas [SELF_CALIBRATION.md](SELF_CALIBRATION.md), įskaitant automatinio leidžiamų pataisų aktyvavimo vartus. Su tikru viešo core kodu taip pat suderinta [VOICE_CORE_INTEGRATION.md](../VOICE_CORE_INTEGRATION.md): mapping, hash, D1 replay, vieši proxy alias ir telefonijos kelias.
