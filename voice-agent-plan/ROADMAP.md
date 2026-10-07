# Balso sistemos įgyvendinimo etapai

**Aktualus 2026-10-07 traktoriupadangos paleidimo pavedimas:** [IMPLEMENTATION_STATUS](../sites/traktoriupadangos/IMPLEMENTATION_STATUS.md) ir [tikro garso priėmimas / paleidimo eiga](VOICE_LAUNCH_2026-10-07.md). Tikras vietinis Gemini/RTC garsas ir kontaktų įrankiai jau išbandyti; viešas paleidimas / pilnas M0 dar nepriimti. Žemiau esanti 2026-09-30 pažangos lentelė yra istorinio etapo įrašas.

**2026-10-01 papildymas:** [TEXT_CLIENT_LAB](TEXT_CLIENT_LAB.md) fiksuoja veikiančią Codex tekstinę laboratoriją, bendrą pašto UI, 5 pasiūlymų + 1 testinės sąskaitos SMTP kvitus ir vietinį imituoto patvirtinimo kelią. Tai dalis C0/C2 bandymų iš [komercinės plėtros plano](PROCUREMENT_AND_INVOICING.md), ne M0 ar production invoicing užbaigimas. Likę artimiausi vartai: tikras inbox → reply → case įrodymas, pilnas inbound/outbound worker, patikrintas sourcing/antkainio profilis ir Gemini audio.

Data 2026-09-30. Checkbox pažymimas tik įgyvendinus jo konkrečią sutartį ir išsaugojus patikros įrodymą. Dalinis darbas nepaverčia viso etapo baigtu; aktualūs įrodymai yra [IMPLEMENTATION.md](IMPLEMENTATION.md). Dokumentų parengimas neįrodo tikro balso ar laiško pristatymo.

## Dabartinė pažanga

| Etapas | Būsena | Įgyvendinta ir likusi riba |
| --- | --- | --- |
| M0 | Laukia prieigų | SDK ir adapteriai parengti; realaus Gemini/LiveKit audio bei naudojimo bandymo nėra. |
| M1 | Dalinis | PG/RLS, sesijos, jobs/outbox, operatoriaus politika, USD rezervacijos/SDK įverčiai ir vietinis D1 replay veikia; gamybinė D1 reconciliation, billing sutikrinimas ir GUI dar liko. |
| M2 | Dalinis | Patvirtinta projekcija, periodinis HMAC refresh, patvarus revoke ir du skirtingi profiliai; išorinių gamintojų research adapteris ir antros nišos tikras balso bandymas dar liko. |
| M3 | Dalinis | Valdiklis, UI ACK, poreikio pataisos, kontaktai ir naršyklės atmintis; tikras garsas, pilnas reconnect/coverage ir mobilių įrenginių bandymas dar liko. |
| M4 | Dalinis | Patvarus kontakto/pabaigos sujungimas, analizės/kokybės adapteriai ir informacinis šablonas; profesionalaus laisvo laiško validatorius bei realus gavimas dar liko. |
| M5 | Neaktyvuotas | Jev bandymas ir komercinės jungtys dar neįgyvendintos; naršyklės tęstinumas pridėtas prie M3, nepriklausomai nuo šios šakos. |
| M6 | Dalinės programinės patikros | 92 runtime ir 19 viešo core testų, realus HTTP/jobs, edge atmintis/žinios ir pg_dump/restore praėjo; audio, apkrovos, delivery, protected semantinis eval ir canary dar nepraeiti. [QA](PRELIVE_QA.md). |
| M7 | Nepradėtas paleidimas | Antra niša ir 2 → 30 plėtra laukia piloto vartų; du registruoti siteId nėra du veikiantys balso verslai. |

Privalomas informacinio pirmos fazės piloto kelias: **M0 → M1 → M2 → M3 → M4 → M6-A**. Jis apima tikrą balso konsultaciją, poreikio registravimą, prašytą atsakymą ir kiekvieno pokalbio QualityReview. Tiekėjo, quote ar booking jungtis, Jev `on` ir automatinis promptų promotion nėra šio piloto paleidimo sąlygos. Jie aktyvuojami atskiromis šakomis, praėjus jų konkretiems vartams; piloto PASS jų nepatvirtina. [Esamo verslų plano](../agent-business-core/ROADMAP.md) bendri moduliai įgyvendinami vieną kartą; šis roadmapas turi naudoti jų rezultatą, o ne dubliuoti darbus.

## Etapų priklausomybės

| Etapas | Rezultatas | Priklausomybė | Apytikslis darbo dydis |
| --- | --- | --- | --- |
| M0 | Įrodytas Gemini 3.8 ir transporto kontraktas | Tikros API ir transporto prieigos | 1–2 darbo dienos |
| M1 | Minimalus patvarus bendras core ir užklausų susiejimas | M0 ir bendrų failų koordinavimas | 6–10 dienų |
| M2 | Dviejų nišų profiliai ir žinių manifestai | M1, patvirtintos svetainės versijos | 3–5 dienos |
| M3 | Tikras widget, poreikio būsena ir pokalbio valdymas | M0–M2 | 5–8 dienos |
| M4 | Analizė, kontakto forma, QualityReview ir realus follow-up | M1 ir M3 | 5–8 dienos |
| M5 | Nepriklausomos pasirenkamos komercinių jungčių ir routerio šakos | M4; komercijai papildomai tikras pajėgumas ir sistemų prieiga | 5–10 dienų |
| M6 | M6-A piloto saugos/audio vartai; M6-B routerio ir M6-C savikalibracijos vartai tik aktyvuojamai šakai | A: M0–M4, privatumas ir kanalo e2e; B: M5 routerio bandymas; C: M4 QualityReview bei savikalibracijos realizacija | 7–14 dienų visoms šakoms |
| M7 | Antra niša ir valdoma plėtra; automatinis promotion pagal atskirus vartus | M6-A ir nišos parengtis; routeriui papildomai M6-B, promotion — M6-C ir pakankama canary imtis | 3–6 dienos baziniam onboarding procesui |

Papildžius routerį, poreikio būseną ir savikalibraciją, planavimo hipotezė yra maždaug 35–63 aktyvios inžinerinės dienos, ne terminas ar tiekėjo įsipareigojimas. Neapima viso ankstesnio autonominių verslų core, 30 nišų faktų surinkimo, laukimo prieigoms, pakankamo realių canary pokalbių srauto ir kiekvieno tiekėjo integracijos. Minimalų vienos nišos kelią galima tikrinti iki visos tobulinimo grandinės užbaigimo. Jei M0 atskleidžia plugin trūkumą ar privatumo apribojimą, sąmata tikslinama prieš tęsiant.

## M0 Suderinamumo bandymas

- [ ] Fiksuoti modelio produktą, endpointą, SDK lock versiją ir tikrą paskyros kvotą.
- [ ] Sukurti trumpą native SDK bandymą: lietuvių balsas, abiejų pusių transkripcijos ir serverio event log.
- [ ] Tikrinti 3.8 setup be netinkamų thinking ir affective laukų; išsaugoti tik neslaptą konfigūracijos įrodymą.
- [ ] Patikrinti 3.8 per LiveKit: audio, asinchroninis 3–5 sekundžių read tool, interruption ir reconnect.
- [ ] Patikrinti, kaip pateikiamas foninio specialistinio rezultato kontekstas ir tool response scheduling aktyvaus garso metu; nepostuluoti hot systemInstruction ar tool declaration keitimo.
- [ ] Patikrinti, kad viename pranešime neprarandamos audio, transcript ir tool dalys; coverage fiksuojamas.
- [ ] Jei plugin neatitinka kontrakto, pasirinkti vieną ribotą adapterį į oficialų Google SDK ir pakartoti tą patį bandymą.
- [ ] Palyginti provider usage su sąnaudų skaičiavimu; užfiksuoti cumulative/incremental reikšmių interpretaciją.

Išėjimo kriterijus: tikras modelis atlieka šiuos veiksmus; demo su 3.1 ar pakaitalu nevadinama 3.8 įrodymu. Jokio tylaus modelio pakeitimo. Jei endpointas nepasiekiamas, likusius modulius galima kurti su aiškiai pažymėtu adapterio pakaitalu, tačiau gamybinis balsas neįjungiamas.

## M1 Minimalus bendras core

- [ ] Įgyvendinti ar pakartotinai panaudoti businesses, environments, cases, contacts, conversations, facts, jobs ir outbox modelius.
- [x] Įgyvendinti RLS, composite tenant ryšius, atskirą administravimo rolę ir pool konteksto išvalymą. Patikrinta tikru PostgreSQL ir izoliuotu restore; 13 forced RLS.
- [ ] Įgyvendinti signed edge kontekstą, vienos sesijos capability ir LiveKit kambario tokenų teises.
- [ ] Įgyvendinti voice ownership lease, fencing epoch, idempotency ir atkūrimą po proceso perkrovimo.
- [ ] Sukurti įrankių gate: schema, mandatų sankirta, confirmation ir write kvitas.
- [x] Sukurti operatoriaus pause ir atskiro įrankio/profilio išjungimą, nepriklausomą nuo M5 komercinių jungčių. API/CLI, policy revisions ir kvietimų atšaukimo testai; platesnis išimčių GUI dar lieka.
- [ ] Įgyvendinti stabilų siteId/business mapping iš viešo host resolverio projekcijos, kontaktų autoritetų kryptį ir voice.enabled=false visoms nišoms.
- [ ] Sukurti CaseSource D1/voice importo sutartį, patvarų replay/cursor/reconciliation ir bendrą kvalifikavimo vaizdą, nedubliuojant esamų formos pranešimų.
- [ ] Įgyvendinti admission, per-business/global limitus, biudžeto rezervaciją ir nutekėjusių rezervacijų atkūrimą.
- [ ] Įjungti minimizuotą telemetry: bendruose loguose nėra kontaktų, transkripto, garso ar laisvo tool argumentų/rezultatų teksto; tik leidžiami operaciniai metaduomenys, būsenos ir riboti koreliavimo ID. Privačių pokalbio/kliento įrašų prieiga, retention ir ištrynimas turi atskirą sutartį bei aplinkų atskyrimą.

Išėjimo kriterijus: dirbtinai perkrovus workerį neprarandamas case ir kartotinai nesukuriamas tas pats veiksmas. Kitos nišos užklausa negali perskaityti pokalbio ar panaudoti jo tokeno.

## M2 Nišos ir žinios

- [ ] Koordinuoti privatų deployment knowledge manifest esamame viešame core, nekeisti paketo schemos be atskiro poreikio.
- [x] Manifestui naudoti publicNichePages/projectPublicPages, atskirti originalios revizijos ir projekcijos hash; patikrinti laiko ribų bei atšaukimo cache. Core ir knowledge regresijos, tikras privatus HMAC refresh.
- [ ] Filtruoti approval hash, publishAt, siteId, kanoninį domeną ir deployment statusą.
- [x] Implementuoti snapshot aktyvavimą, atšaukimą, galiojimo tikrinimą ir šaltinių versijas. Foninis refresh, TTL, patvarus revoke ir paveiktų sesijų pabaiga.
- [ ] Sukurti tikslų terminų bei full-text lookup; semantiką pridėti tik su matuota nauda.
- [x] Sukurti `traktoriupadangos` profilį informacinei fazei, be tiekėjų, kainų ir sandėlio teiginių. Profiles testai ir 11 dabartinių puslapių projekcija; tikras atsakymo audio dar nepatvirtintas.
- [x] Sukurti antrą skirtingą `greitossvetaines` profilį, su savo poreikio schema ir patvirtintų faktų projekcija. Tai profilio kodas, ne antros nišos gyvo balso paleidimas.
- [ ] Implementuoti approved-source research adapterį, šaltinių naudojimo teisės lauką ir SSRF apsaugą.

Išėjimo kriterijus: atsakomas konkretus klausimas, išsaugoma jo faktų kilmė ir negrąžinamas privatus, būsimas, atšauktas ar kito domeno tekstas. Gamintojas nevadinamas mūsų tiekėju be atskiro fakto.

## M3 Kliento pokalbis

- [ ] Widget krauti tik po paspaudimo; pridėti mikrofono, garso, mute ir pabaigos valdiklius.
- [ ] Suderinti host-aware proxy viešus /pokalbis/* alias, metodus/origin/sesijos teises, tiesioginių vidinių route blokavimą ir legacy domenų atskirą adapterį.
- [ ] Pridėti peržiūrėtą įžangos audio asset ir tekstą apie AI bei kontakto formą.
- [x] Įgyvendinti `ui.open_contact_form`, widget valdymo kanalą ir parodymo ACK, kad agentas galėtų atverti formą pokalbio metu. Sutartis patikrinta per tikrą HTTP/PG; realaus balso elgesį dar tikrina M0/M6-A.
- [x] Įgyvendinti pasirenkamą pirmos šalies naršyklės atmintį: site/aplinkos izoliacija, slapuko hash, istorijos paieška/puslapiavimas, expiry/revoke ir vieno lango UX. Teksto ir edge patikros pateiktos IMPLEMENTATION; vietinis laikotarpis 30 dienų.
- [ ] Gyvu balsu patikrinti grįžimą ir pradinio poreikio patikslinimą, istorijos naudojimą be senų kontaktų atskleidimo ar pakartotinio veiksmo. Kito įrenginio identifikavimui apibrėžti patvirtinto kontakto sutartį.
- [ ] Patikrinti formos pateikimą agentui kalbant, uždarymą be kontakto, pakartotinį kvietimą ir reconnect, išlaikant įvestį bei aktyvų balsą.
- [ ] Implementuoti reconnect, GoAway/resume, garso buferio išvalymą ir aiškų ryšio fallback.
- [ ] Implementuoti serverio transcript deltas, deduplikavimą, finalization bei interrupted/playback uncertain žymas.
- [ ] Rodyti kritinių matmenų, datų ir veiksmų patvirtinimus ekrane.
- [ ] Įgyvendinti CustomerNeedState: proposed/confirmed kilmę, skipped/unknown temas, pataisymų revision ir nuo seno lauko priklausančių rekomendacijų atšaukimą.
- [ ] Patikrinti vieną output/turn valdytoją, backchannel, klaidingą interruption, užsitęsusią pauzę, formos pildymą ir vienkartinį tool progress pranešimą.
- [ ] Patikrinti Android Chrome, iOS Safari ir desktop Chrome/Edge, mikrofono atsisakymą, Bluetooth ir mobilią tinklo kaitą.
- [ ] Patikrinti klaviatūrą, fokusą, ekrano skaitytuvo būsenas ir mobilų widget. IAB 390/320 px, fokusas/Escape ir AX būsena praėjo; tikras ekrano skaitytuvas ir fiziniai mobilūs įrenginiai dar netikrinti.

Išėjimo kriterijus: lietuviškas realus balso pokalbis padeda klientui, leidžia jį pertraukti ir palieka serverio įvykius. Agentas negali neaktyvuotų verslo funkcijų pateikti kaip veikiančių.

## M4 Analizė ir kontekstinis atsakymas

- [x] Įgyvendinti nepriklausomus ConversationFinalized ir ContactSubmitted įvykius, kontaktą dar aktyvaus pokalbio metu, abu arrival order variantus ir rendezvous. Runtime testai patvirtina abi tvarkas ir deduplikavimą; tikras pristatymas turi atskirus vartus.
- [ ] Įgyvendinti email/phone formą su tikrais prieinamų kanalų veiksmais ir atskirtu rinkodaros pasirinkimu.
- [ ] Įjungti Flash struktūruotą poreikio analizę, evidence refs, neaiškius laukus ir coverage.
- [ ] Kiekvienam finalization sukurti QualityReview su coverage, rubrika, incidento refs ir priežasties kandidatais; no_interaction klasifikuoti be išgalvoto semantinio įvertinimo.
- [ ] Informaciniam pilotui įgyvendinti summary ir clarification artefaktus. Faktinius quote/booking tipus aktyvuoti tik su atitinkama M5 komercine jungtimi ir mandatu; jie nėra informacinio piloto priklausomybė.
- [ ] Įgyvendinti programinę faktų, URL, recipient, dokumento versijos ir mandato patikrą.
- [ ] Prijungti bendro siuntėjo Python email adapterį, outbox, stable Message-ID ir timeout reconciliation.
- [ ] Atlikti aiškiai pažymėtą savininko self-test: pokalbis → forma → analizė → SMTP priėmimas → konkretaus laiško gavimas; testiniai įrašai nepatenka į tikrų klientų metrikas.
- [ ] Prieš telefono tęsinio pažadą įjungti ir patikrinti SMS arba realią callback eigą. Kol jos nėra, el. paštas yra pilnas automatinis atsakymo kanalas, o telefono funkcija nevadinama pristatyta.

Išėjimo kriterijus: klientas gauna vieną reikalingą atsakymą, paremtą jo pokalbiu. Jei nėra kontakto, nėra siuntimo. Po transkripto klaidos siunčiamas patikslinimas, o ne išgalvotas pasiūlymas.

## M5 Tęstinumas ir verslo įrankiai

Tai nepriklausomos pasirenkamos šakos. Informacinis pilotas gali pereiti tiesiai iš M4 į M6-A, palikdamas komercinius įrankius išjungtus ir Jev `off` arba neautoritetiniu `shadow`. Jev bandymui nereikia realaus tiekėjo integracijos; jo `on` vis tiek reikalauja M6-B. Privalomi pause/kill valdikliai realizuojami M1.

### M5-A Tęstinumas ir komercinės jungtys

- [ ] Prijungti inbound email ar kitą tikrą tęsinio kanalą prie esamo case.
- [ ] Su konkrečia niša apibrėžti vieną tikrą registracijos, tiekėjo ar quote procesą ir jo mandatą.
- [ ] Implementuoti realią dinaminę būseną, jos galiojimą, patvirtinimą ir kvitą.
- [ ] Patikrinti write timeout, išorinio rezultato sutikrinimą ir pakartotinio kvietimo nedubliavimą.

Šakos išėjimo kriterijus: vienas realiai įvykdomas nišos procesas su galiojančiu mandatu ir kvitu. Niša be tiekėjo ar kito pajėgumo šios šakos nevadina užbaigta; jos plėtra remiasi paklausa ir pajėgumu.

### M5-B Pasirenkamo routerio bandymas

- [ ] Pirmiausia shadow režimu įvertinti Jev knowledge handlerio parinkimą prieš baseline, su bent 200 pažymėtų dviejų nišų užklausų ir atskiru holdout.
- [ ] Įgyvendinti vieno core prompt/skill projekcijas, fragmentų manifestus, off/shadow/on, ribotą perparinkimą ir nepagerinančio routerio išjungimą.
- [ ] Patikrinti PreparedContext TTL/goal revision, atšauktus faktus, provisional STT, inflight/biudžeto ribas ir deadline fallback; spekuliuoti tik leistinais skaitymais.

Šakos išėjimo kriterijus: įrašyti baseline/shadow palyginimo rezultatai, konteksto aktualumo ir fallback bandymai. Tai leidžia vertinti kandidatą, bet Jev `on` dar reikalingi M6-B vartai. Routerio pagerėjimas neaktyvuoja komercinio įrankio.

## M6 Kokybės ir paleidimo vartai

Sukurti pradinių bent 60 scenarijų rinkinį, kuriame yra įprastas poreikis, neaiškus dydis, pasikeitusi data, pertrauktas agento sakinys, vėlyvas tool rezultatas, nepatvirtinta kaina, kitos nišos duomenų prašymas, prompt injection, dvigubas formos pateikimas, SMTP timeout ir nėra kontakto. Kartu naudoti programinius invariantų testus ir žmogaus įvertintą lietuviško pokalbio rubriką. Vienas LLM vertintojas nepakeičia kvito ar duomenų izoliacijos patikros.

### M6-A Privalomi informacinio piloto vartai

Priklauso nuo M0–M4. Kai M5 komercinės jungtys išjungtos, testai įrodo jų neprieinamumą ir išgalvotų pažadų draudimą; veikiančio tiekėjo nereikalaujame. Kiekvieno pokalbio QualityReview lieka M4 dalis. Jei routeris išjungtas, vertinamas bazinis Gemini kelias; pasirenkamos funkcijos nevadinamos patikrintomis.

- [ ] Fiksuoti testų rinkinio, prompto, modelio ir SDK versijas; kritinius scenarijus laikyti nuo tobulinimo agento pakeitimų apsaugotais.
- [ ] Atskirtai vykdyti programinius invariantus, tekstinę analitiko/routerio regresiją ir tikrą Gemini native audio bandymą; teksto simuliacija nepatvirtina balso elgesio.
- [ ] Audio rinkinyje matuoti LT matmenis/vardus, pataisymus, tylą, false/missed interruption ir kliento užduoties rezultatą; LLM rubric kalibruoti žmogaus pažymėtais atvejais, fiksuojant nesutarimus.
- [ ] Įrodyti, kad nėra testuose aptikto duomenų nutekėjimo, neteisėto write ar išgalvoto komercinio įsipareigojimo.
- [ ] Patikrinti transkripto coverage ir kritinių laukų patvirtinimą; neaiškūs laukai netampa order.
- [x] Atlikti retention ir delete patikrą, kopijų atkūrimą į izoliuotą aplinką su išjungtu siuntimu. Tikras pg_dump/restore, ribota rolė, RLS ir lease/generation išsaugojimas; gamybinė kopijų politika atskirai.
- [ ] Patikrinti tikrą domeno deployment, privacy notice, kontaktą ir kanalų gavimą.
- [ ] Atlikti numatytą vienalaikių sesijų apkrovos testą bei failure injection, išlaikant fallback formą.
- [ ] Po viešo core pakeitimų vykdyti `npm run test:core` ir `npm run test:seo-smoke`; patikrinti widget poveikį realiam mobiliam puslapiui.

Pradiniai siūlomi UX tikslai kontroliuotame pilotų tinkle: prisijungimas iki pirmo garso p95 ≤ 3 s; paprasto atsakymo pradžia p95 ≤ 1,5 s nuo speech end; barge-in garso stabdymas ≤ 300 ms; 95 % leidžiamų follow-up darbų parengti ≤ 2 min. Tai mūsų tikslai, ne Google ar LiveKit garantijos; matavimuose nurodyti tinklą, šalis, hardware ir tool scenarijų. Sudėtingas lookup vertinamas atskirai.

### M6-B Vartai prieš Jev on

Priklauso nuo M5-B ir M6-A. Informacinio piloto paleidimas jų nepakeičia; iki tol Jev lieka `off` arba neautoritetiniame `shadow`.

- [ ] Įrodyti Jev timeout/failure grįžimą, klaidingo lane perparinkimą ir tai, kad routeris neblogina tikro garso eigos; 300 ms yra tikrinamas tikslas.
- [ ] Priimti konkrečios sprendimų klasės `on` tik pagal jos holdout kokybę, pavojingų klaidų, delsos ir sąnaudų ribas; išlaikyti išjungimą bei neaktyvius komercinius įrankius.

### M6-C Vartai prieš savikalibracijos canary ir promotion

Priklauso nuo M4 QualityReview ir M6-A, bet nepriklauso nuo tiekėjo jungties ar Jev naudojimo. Šios šakos neįgyvendinus vertinimai ir improvement užduotys kaupiami, o runtime versija automatiškai nekeičiama.

- [ ] Įgyvendinti QualityReview → issue → bounded candidate → nepriklausomi testai → canary/rollback kelią, be savavališkų verslo faktų, teisių, kontakto ar testų pakeitimų.
- [ ] Patikrinti kalibratoriaus priešišką įvestį, tenant scope, nepakankamą imtį, pasikartojantį job, biudžeto išnaudojimą ir esamų sesijų release stabilumą.
- [ ] Įrodyti, kad runtime kandidatas negali keisti filesystem web skills, studijos instrukcijų/paketo, approval ar publishAt; turinio spraga kuria atskirą patikros užduotį.

Canary leidžiamas tik praėjus candidate regresijoms, o pilnas promotion — ir pakankamai realiai canary imčiai bei nustatytiems pagerėjimo/neblogėjimo kriterijams. Vien M6-A arba dokumentų parengimas šių vartų neatstoja.

## M7 Antroji niša ir plėtra

- [ ] Pakartoti visą balso → kontaktų → atsakymo kelią antrai nišai su kitu poreikio modeliu.
- [ ] Tikrinti nišų kontaktų, šaltinių, įrankių, ankstesnių pokalbių ir recipient izoliaciją.
- [ ] Parengti onboarding komandą ar GUI: profilis, faktai, deployment manifest, leidimai, kanalas ir eval rinkinys.
- [ ] Plėsti 2 → 5 → 10 → 30 nišų partijomis; įjungti tik paruoštas nišas.
- [ ] Registruoti realias tinkamas užklausas, tęstinį bendravimą, sandorius, sąnaudas ir neatsakytus klausimus pagal domeną.
- [ ] Jei įjungiama runtime savikalibracija, kurti promptų pataisų ciklą tik pagal M6-C, su eval, ribotu canary ir rollback; nekeičiant mandato ar testų, kad pataisa „praeitų“. Svetainės žinių pataisas perduoti atskiram redakciniam procesui su jo publikavimo vartais.
- [ ] Jei aktyvuojamas savikalibracijos promotion, pirma praeiti M6-C ir išmatuotus imties/pagerėjimo/neblogėjimo kriterijus; bendrus fragmentus tikrinti visoms paveikiamoms nišoms. Nišų plėtra savaime promotion neaktyvuoja.
- [ ] Prieš SIP/PSTN plėtrą patikrinti autentifikuotą provider įvykį, DID arba aiškų nišos pasirinkimą; bendras telefonas ir caller ID nėra tenant autoritetas.

Išėjimo kriterijus: nauja niša prijungiama konfigūracija ir patvirtintais šaltiniais, o bendro kodo kopijos nereikia. Nišų kiekis nėra parengties ar ekonominės sėkmės matas.

## Vienkartiniai savininko duomenys įgyvendinimo pradžiai

Techninį planą galima įgyvendinti savarankiškai. Tik realių faktų ir prieigų negalima susigalvoti: API projekto prieiga, pasirinktų kanalų paskyros, gamybinis domenų valdymas, nišų aptarnavimo pajėgumas, operatoriaus privatumo politika ir komerciniai limitai.

Šiuos duomenis surinkti vienu konkrečiu įvedimo paketu tada, kai parengta juos naudojanti realizacija. Rutininiai agento atsakymai ar leistini follow-up laiškai neturi virsti nuolatiniu savininko tvirtinimo darbu.
