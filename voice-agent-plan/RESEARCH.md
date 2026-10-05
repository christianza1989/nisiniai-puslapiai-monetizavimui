# Gemini Live galimybių ir integravimo variantų tyrimas

Patikrinta 2026-09-30. Toliau atskiriami dokumentuoti faktai, šio projekto architektūros pasirinkimai ir dalykai, kuriuos dar reikia išmatuoti su tikra paskyra. Paskyros kvotos, lietuviško balso kokybė ir gamybinio skambučio delsa šiame tyrime nematuoti.

Pirminį API ir transporto tyrimą papildo [komercinių balso platformų auditas](BEST_PRACTICES_AUDIT.md), [oficialių TypeSafe Jev šaltinių pagrindu suprojektuotas routeris](ROUTING_AND_INTELLIGENCE.md) ir [AI_teacher vietinio balso vedlio kodo peržiūra](AI_TEACHER_REVIEW.md). Viešai aprašyti praktiniai sprendimai nėra nepriklausomas platformų našumo reitingas.

## Modelių pasirinkimas

| Paskirtis | Patikrintas faktas | Šio projekto sprendimas |
| --- | --- | --- |
| Gyvas pokalbis | `gemini-3.8-live` pažymėtas Stable; palaiko function calling ir native audio. Turi 131 072 įvesties tokenų ribą; neturi File Search, URL Context ar structured outputs. | Naudoti pokalbiui, o žinias pateikti savo paieškos įrankiu. Komercines būsenas saugoti programiškai. |
| Sudėtingesnis gyvas samprotavimas | `gemini-3.8-live-extended-thinking` palaiko foninį samprotavimą; priima tik asinchroninius įrankius. `turnComplete` dar nereiškia idle; aprašytas `interaction_status`. | Pradžioje nenaudoti kaip numatytojo. Įjungti tik jei nišos bandymuose gaunama reali nauda. |
| Analizė po pokalbio | `gemini-3.8-flash` palaiko structured outputs ir tekstinę išvestį. | Struktūruota poreikio analizė ir atsakymo rengimas atskiroje užduotyje. |

Šaltiniai: [3.8 Live specifikacija](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live), [Extended Thinking specifikacija](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking), [3.8 Flash specifikacija](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).

`gemini-3.8-live` setup nereikia `thinking_level` ar `enable_affective_dialog`; pirmasis nepalaikomas, antrasis pašalintas. Proactive audio nuolat įjungtas. Asinchroninis kvietimas yra numatytas režimas; savo deklaracijose jį nustatysime aiškiai. [Modelio migravimo taisyklės](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live).

Modelio Stable žyma ir visos API brandos statusas nėra tas pats. Bendrame capabilities vadove dar yra Live API Preview pastaba; prieš diegimą tikrinamas pasirinktas paviršius ir sutartis. [Capabilities statusas](https://ai.google.dev/gemini-api/docs/live-api/capabilities).

Tai konfigūracijos sutartis konkrečiam endpointui, o ne universali taisyklė visiems modeliams. Modelio identifikatorius, SDK versija ir faktinė konfigūracija bus įrašyti į kiekvieną pokalbį.

## Balsas ir transkripcija

Live API yra stateful WSS sąsaja. Dokumentuotas garsas: PCM16 little-endian, 16 kHz įvestis ir 24 kHz išvestis. Lietuvių kalba `lt` yra palaikomų kalbų lentelėje. Native audio modeliui pasirenkama AUDIO išvestis, o tekstui įjungiamos transkripcijos. Tai palaikymo faktas, ne taisyklingo tarimo, skaičių atpažinimo ar dalykinių atsakymų kokybės matavimas. [Live apžvalga](https://ai.google.dev/gemini-api/docs/live-api), [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities).

SDK pateikia kliento ir agento transkripcijas bei įrankių kvietimo ID. Funkciją vykdo aplikacija ir rezultatą grąžina modeliui. [SDK vadovas](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk).

Mūsų pasirinkimas: balso grandinėje naudoti native audio, o analizę grįsti serverio surinktu tekstu ir įrankių kvitais. Kritines reikšmes klientas patvirtina balsu arba ekrane. Atskiro STT reikės tik jei bandymai parodys, kad papildomas atpažinimas išsprendžia konkretų trūkumą.

## Sesijų ir protokolo detalės

Be konteksto compression audio sesijos riba nurodyta 15 minučių; vienas ryšys trunka maždaug 10 minučių. `GoAway`, session resumption ir compression padeda tęsti pokalbį. [Sesijų valdymas](https://ai.google.dev/gemini-api/docs/live-api/session-management).

Mūsų aplikacijos pokalbio ID išlieka keičiantis modelio ryšiui. Reconnect nėra naujas klientas ar nauja lead užklausa. Upstream resumption handle saugomas privačiai; nutrūkus atkūrimui kuriama nauja modelio sesija su patvirtintų kliento duomenų santrauka ir aiškia pastaba apie nutrūkimą.

Viename serverio pranešime gali būti keli turinio tipai. Parseris apdoroja visas dalis; negalima rinktis tik pirmosios. [Capabilities pranešimų aprašymas](https://ai.google.dev/gemini-api/docs/live-api/capabilities).

Įrankių vadove vietomis likusi senesnė sequential-default formuluotė ir skiriasi scheduling vardų pavyzdžiai. Konkretaus 3.8 modelio specifikacija turi naujesnį async-default aprašymą. Tikslūs enum ir serializavimas fiksuojami pasirinkto SDK sutarties bandymu; į planą nekopijuojame prieštaringo pavyzdžio kaip veikiančio kodo. [Įrankių vadovas](https://ai.google.dev/gemini-api/docs/live-api/tools).

## Transportų ir platformų palyginimas

Toliau pateikti sprendimai yra mūsų vertinimas pagal projekto poreikius, ne tiekėjų pažadai.

| Variantas | Kur tinka | Kaina ir sudėtingumas | Sprendimas |
| --- | --- | --- | --- |
| Naršyklė tiesiai į Gemini WSS su ephemeral token | Labai trumpas techninis prototipas, mažiausiai tarpininkų | Reikia pačiam valdyti garsą; naršyklės pateiktas transkriptas nėra patikimas serverio veiksmų įrodymas | Tik techniniam bandymui. Privataus pagrindinio API rakto naršyklėje nelaikyti. |
| Naršyklė WSS į savo serverį, tada Gemini WSS | Kontroliuojamos aplinkos, greitas native SDK bandymas | Serveris mato įvykius, bet reikia savo jitter, atkūrimo ir mobilios kokybės realizacijos | Tinka pirmam API bandymui; nėra pasirinktas galutinis klientų transportas. |
| LiveKit WebRTC ir Python balso vykdytojas | Naršyklės, mobilūs tinklai, vėliau telefonijos adapteris | Papildomas medijos sluoksnis, tačiau vienas transportas visoms nišoms | Rekomenduojamas gamybinis variantas. |
| Pipecat ir WebRTC transportas | Platesni STT/LLM/TTS pipeline deriniai | Tinkama alternatyva, jei native audio vėliau keičiamas sudėtine grandine | Atidėti; nereikia dviejų balso frameworkų vienu metu. |
| Visas balsas ir procesai Cloudflare DO bei D1 | Vien TypeScript komanda ir labai mažas savas serverių sluoksnis | Kitokia patvarių verslo procesų realizacija nei jau suplanuotas Python core | Galima alternatyva, tačiau šiam projektui nepasirinkta. |

Ephemeral tokenai yra trumpalaikiai ir ribojami, bet patikrintame vadove dar Preview. [Google autentifikacijos vadovas](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens).

Pipecat transportų vadovas rekomenduoja WebRTC klientų balsui ir pažymi tiesioginį Gemini transportą deprecated. Jo argumentus apie mobilų ryšį naudojame transporto pasirinkimui, bet jie neįrodo mūsų produkto delsos. [Pipecat transportai](https://docs.pipecat.ai/client/concepts/choosing-a-transport).

LiveKit palaiko Gemini pluginą Python ir Node.js, tačiau patikrintas suderinamumo skyrius aprašo 3.1, o pavyzdžiuose dar yra 2.5. Vien įrašyti naują modelio vardą neužtenka. Pirmo etapo bandymas turi patikrinti 3.8 setup, async tools, transkripcijas, interruption ir resume. Jei pluginas netinka, realizuojamas ribotas adapteris į oficialų Google SDK, išlaikant LiveKit tik medijos transportui. [LiveKit Gemini pluginas](https://docs.livekit.io/agents/models/realtime/plugins/gemini/).

Cloudflare DO outgoing WebSocket ryšiai nehibernuoja; jų negalima laikyti nemokamais miegančiais balso seansais. [Cloudflare WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

## Gamybinės infrastruktūros pasirinkimas

Siūloma pradėti nuo LiveKit Cloud kaip medijos tarnybos, o bendrą API, balso vykdytoją ir foninius darbus laikyti vieno Python core atskiruose procesuose EU infrastruktūroje. PostgreSQL ir privatūs dokumentai taip pat turi apibrėžtą vietą bei kopijas. Vėliau LiveKit transportą galima savarankiškai hostinti; verslo logika nuo jo nepriklauso.

LiveKit leidžia agentus vykdyti savo infrastruktūroje. [Self-hosted agentų diegimas](https://docs.livekit.io/deploy/custom/deployments/). Pasirinkimą tarp savo workerio ir LiveKit Cloud agent hosting priimti pagal faktinį DB ryšį, SLA ir sąnaudas; tai nėra poreikis kurti po 30 deploymentų.

Cloud Run yra tinkamas API ar pasirinktam WSS bandymui, tačiau ryšiai turi timeout, affinity yra best-effort, o aktyvūs WebSocket ryšiai sukelia skaičiavimo sąnaudas. Nenaudoti scale-to-zero HTTP proceso kaip numanomo patikimo foninių užduočių vykdytojo. [Cloud Run WebSockets](https://docs.cloud.google.com/run/docs/triggering/websockets).

## Google produktų dokumentacijos skirtumai

Gemini Developer API modelio puslapis ir Gemini Enterprise Agent Platform 3.8 vadovas nėra tas pats endpointo kontraktas. Enterprise vadove aprašomi avatarai ir kita affective dialog elgsena; Developer API modelio puslapyje yra kitoks funkcijų sąrašas. Produkto pavadinimas ir modelio vardas savaime nesuteikia teisės maišyti jų setup laukų, kvotų ar duomenų rezidavimo pažadų. [Enterprise 3.8 vadovas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-live).

Pirmo prototipo adapteris aiškiai naudoja Developer API. Gamybiniam naudojimui paliekamas patikrinamas tiekėjo pasirinkimo vartas: endpointas, sutartis, regionas, duomenų laikymas, kvota ir komercinis naudojimas. Jei būtinas garantuotas EU inference, reikia to garantiją turinčio endpointo; vien EU serverio nepakanka.

## Informacijos paieška ir jos naudojimo teisės

Google Search grounding yra palaikomas, tačiau jo sąlygos riboja rezultatų saugojimą, analizę, indeksavimą ir panaudojimą kitais tikslais. Negalima automatiškai supilti Search rezultatų į bendrą žinių bazę ar tobulinimo agentą. [Gemini API sąlygų Grounding skyrius](https://ai.google.dev/gemini-api/terms).

Mūsų numatytas kelias: patvirtinta svetainės bazė → struktūruoti verslo įrankiai → gamintojų dokumentų paieška per teises turintį adapterį. Built-in Google Search pradžioje išjungtas, nes viso pokalbio automatinė analizė ir ilgalaikės žinios neturi būti grindžiamos nepatikrintu teisių aiškinimu. Platesnį interneto paieškos adapterį galima prijungti, kai patikrintos jo rezultato naudojimo ir išlaikymo sąlygos. Taip pat neperduodami klientų kontaktai paieškos užklausose.

## Kas dar turi būti įrodyta

- Tikra paskyra priima `gemini-3.8-live`, lietuvišką sesiją ir pasirinktą SDK konfigūraciją.
- Bibliotekos grąžina pilnus įvykius, o pertraukimas išvalo dar negrotą garsą.
- Konkretus Gemini endpointas ir LiveKit planas atitinka pasirinktas duomenų sąlygas.
- Tikros kvotos leidžia suplanuotą vienalaikių pokalbių skaičių. Jos yra projekto lygmens, o ne kiekvieno API rakto nepriklausomas limitas. [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
- Faktinis usage ir sąskaita sutampa su mūsų sąnaudų skaičiavimu.
- Profesinis lietuviškas pokalbis tinkamai patikslina matmenis, valiutą, datą ir įmonės pavadinimą.

## Papildomi šaltiniai

Visi tikrinti 2026-09-30. Kainas ir teisines sąlygas prieš įjungimą reikia peržiūrėti dar kartą.

- [Google kainodara](https://ai.google.dev/gemini-api/docs/pricing) ir [Live billing praktika](https://ai.google.dev/gemini-api/docs/live-api/best-practices).
- [Modelių keitimo grafikas](https://ai.google.dev/gemini-api/docs/deprecations).
- [Struktūruota išvestis](https://ai.google.dev/gemini-api/docs/structured-output).
- [Gemini duomenų išlaikymas](https://ai.google.dev/gemini-api/docs/zdr).
- [LiveKit kainodara](https://livekit.com/pricing) ir [EU duomenų valdymas](https://docs.livekit.io/deploy/admin/regions/data-residency/).
- [ES AI skaidrumo gairės](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations).
- [BDAR pirminis tekstas](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1463250435964&uri=CELEX%3A32016R0679).
- [VDAI tiesioginės rinkodaros informacija](https://vdai.lrv.lt/uploads/vdai/documents/files/03_%20Lankstinukas%20Tiesiogine%20rinkodara%202020-02-20.pdf): senesnis aiškinamasis leidinys, ne 2026 m. konsoliduoto įstatymo pakaitalas.
