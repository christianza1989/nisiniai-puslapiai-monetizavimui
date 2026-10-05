# M4 runtime inkremento patikra

Pradėta 2026-10-04, užbaigta 2026-10-05 Europe/Vilnius. Tai šaltinių transporto ir mokymosi parengties patikra, ne naujas modelių aptarnavimo kalibravimo ratas ar visas Dovanos123 paleidimas.

## Įgyvendinta

- Atskiras V2 paged žinių kontraktas, privatūs worker auth maršrutai, durable tenant/environment staging ir atominis complete. Puslapiai bei ilgi tekstai netrumpinami; trūkstant dalies, nesutampant hash ar pasikeitus base revision aktyvus šaltinis neperrašomas ir TTL nepratęsiamas.
- Iki 1000 puslapių/fragmentų, 8 MB staging, 18 000 simbolių fragmentas, 10 fragmentų/512 KB batch. Unicode fragmentai ir JavaScript/Python canonical hash suderinti. V1 modelis, 30 puslapių ir jo išvesties kelias nepakeisti.
- Atominis V2 revocation daugiau nei 30 hash, išliekantis po naujo importo. Atšaukimas ar pakeistas V1 šaltinis invaliduoja staging fence; naujas importas invaliduotą staging gali pakeisti iš karto. V1 neperrašo aktyvaus V2 mažesniu inventoriumi.
- Actual root M2 version dispatch: emitter naudoja `projectContentPagesV2`, `visibleContentTextV2`, `projectedSnapshotV2`, be antro publikavimo filtro. V2 artefaktas atskirame `.v2.json`; nėra raw target ar `[object Object]`. Autorystė, vieši šaltiniai ir tinkamos matomos nuorodos išlaikomi.
- Registration/source_ready/learning_admitted atskirti. Esami šeši siteId užfiksuoti aiškiame compatibility rinkinyje; naujas profilis automatiškai neįtraukiamas į sync/learning. Start tikrina source_ready, quality palieka problemą ir kandidatą be learning job, controller admission tikrina pakartotinai. Šie jungikliai nekeičia voice/SMTP/commerce/FB policy.

Visi payload, hash ir endpoint: [PAGED_KNOWLEDGE_V2_API_2026-10-04.md](PAGED_KNOWLEDGE_V2_API_2026-10-04.md).

## Actual QA

| Patikra | Rezultatas | Įrodymas |
| --- | --- | --- |
| Visa Python suite po pagrindinio įgyvendinimo | 275 PASS, 0 FAIL, 1020.31 s | [junit.xml](../agent-business-core/runtime/artifacts/m4-runtime-20261004/junit.xml) |
| Galutinės fence-recovery pataisos regresijos | 2 PASS, 1.69 s | [final-fence-junit.xml](../agent-business-core/runtime/artifacts/m4-runtime-20261004/final-fence-junit.xml) |
| V2/readiness/JS transport/local sync tikslinė grupė | 29 PASS, 21.49 s | Tool output; vėlesnė visa suite viršuje |
| Scoped Ruff ir du Node syntax checks | PASS | Pakeistų failų tiksliniai checks |
| Actual vietinė API | HTTP 200, status ok, nauji V2/onboarding maršrutai įkelti | [runtime-proof.json](../agent-business-core/runtime/artifacts/m4-runtime-20261004/runtime-proof.json) |
| Esami šeši šaltiniai | 6/6 fresh, 6/6 onboarding HTTP 200, pending local jobs 0 | Tas pats proof |
| Naujos nišos defaults | source_ready=false, learning_admitted=false | Tas pats proof |

Visos suite moduliai jau buvo užkrauti, kai pakeista viena begin sąlyga invaliduotam staging greitai pakeisti. Galutinei delta paleistos abi tiesiogiai ją tikrinančios regresijos; visa suite po tos vienos sąlygos nepakartota. Galutiniai source SHA runtime-proof. Nauji 23 testai papildo ankstesnius 252; šie testai nekviečia išorinių modelių ir nesiunčia tikrų laiškų.

Tikrinama: 31 puslapis + ilgas gidas, 35 puslapių JS/Python su emoji, pilnas inventoriaus hash, fragmento replay konfliktas, dalinis commit, pirmas staging be faktų, host/site konfliktas, expiry, concurrent commit tik vieną revision, V1 pasikeitimas importo metu, 31 hash revocation ir jo išlikimas, vien laiko refresh nekelia revision, private auth, actual M1/M2 fixture projection, missing gift nepristabdo šešių, learning OFF candidate retention/controller gate.

Pradiniai gedimai neslepiami: Docker buvo nepaleistas ir DB fixtures nepavyko. Paleistas Docker Desktop ir esamas Postgres su išlaikyta baze; migracijos nevykdytos. Pirmas kodavimo bandymas rado neteisingą šešto legacy siteId, jis pataisytas pagal actual PROFILES/registry į `auksarankiams`; pridėtas viso rinkinio sutapimo testas. JS emitter raw fixture turėjo būsimą straipsnį; assertion pataisytas į actual viešą projekciją, būsimas turinys nepaskelbtas. Tik vėlesni užbaigti vykdymai yra PASS.

## Veikianti vietinė būsena

Ankstesni API/jobs/knowledge procesai jau nebegyvi; pagal senus PID svetimi procesai nestabdyti. Nauji savi localhost helpers: API launcher 9924, jobs 20536, knowledge 23104. [processes.json](../agent-business-core/runtime/artifacts/m4-runtime-20261004/processes.json), savo stdout/stderr logai tame pačiame privačiame artefaktų kataloge. Preview/bendras public build, DNS, hostingas ar scheduled task nepaleisti.

Actual HTTP proof 2026-10-04 21:03:20 UTC = 2026-10-05 00:03:20 Europe/Vilnius. Knowledge pages: akmenas11, auksarankiams13, greitossvetaines7, laiptucentras11, roletaiklaipedoje9, traktoriupadangos11; visi fresh. Learning=true, voice=false, SMTP=false. Naujas Business/profile neįrašytas. Agentų MD, protected corpus ir adaptive active/versions neredaguoti šiame inkremente.

## Likusios ribos

Tai neužbaigia visų 18 M4 planavimo scenarijų. Typed legacy gift D1 mapping/backfill/stream cutover/PII retention šiame inkremente neįgyvendinti ir netestuoti; `lead_import.py` ir `website_d1` sutartis nepakeisti. Naujas gift profilis, faktai ir corpus neįrašyti. Vieša D1 forma lieka nepriklausoma nuo runtime.

Protected evaluator ir Start dar V1: V2 learning admission blokuojamas iki versijuoto pin/corpus/session adapterio. Deployed viešas HMAC paginated pull/refresh ir naujos V2 nišos sync loop yra atskiras žingsnis. Actual Gemini audio, SMTP delivery, tiekėjų derybos, užsakymai ir naujas aklas modelių ratas šiame inkremente nevykdyti.

Ankstesnis realių Codex pokalbių mokymosi priėmimas lieka [AUTONOMOUS_LEARNING_2026-10-03.md](AUTONOMOUS_LEARNING_2026-10-03.md); originalai neperrašyti. Šie PASS įrodo infrastruktūros bei admission regresijas, ne idealų elgesį visais būsimo kliento atvejais.

## M4 liekanų registras po root M5 — 2026-10-05

Read-only patikrintas root [M5 HTTP-QA.json](../research/dovanos123-integration-2026-10-04/M5/HTTP-QA.json): `fixtureOnly=true`, `actualGiftApproval=false`. Jo gift HTTP/SEO/D1 rezultatai neprideda privataus runtime knowledge commit, session adoption ar learning admission įrodymo. Kitų sesijų source/DB/politikos netaisytos. Toliau išvardyti konkretūs priėmimo žingsniai, ne jau baigti darbai.

| Sritis | Faktinis įrodymas dabar | Likęs priėmimas |
| --- | --- | --- |
| V2 core ingest | Izoliuota ASGI HTTP begin/batch/commit, 31 puslapis/ilgas gidas, atomic revision, replay ir konflikto testai | Viešo paginated source → privataus runtime adapterio e2e su nekintamu snapshot, pasikeitimu tarp cursor, ryšio pertrūkiu ir pilno priėmimo kvitu |
| V2 source semantika/hash | Actual M1/M2 fixture eksportas; JS/Python transport hash, approval revision ir matomas tekstas; per-site contact/operator pilname deployment identity | To paties M5 HTTP fixture visų matomų HTML/LLM/žinių tekstų ir aktyvaus runtime inventoriaus palyginimas; exact manifest/deployment/content hash dokumentuotas kvite. Faktinio gift paketo 0 approval neapeiti |
| Adoption sesijoje | Izoliuotas V2 lookup iš priimto KnowledgeState, įskaitant ilgo gido pabaigą | Tikras versioned Start, prisegta knowledge revision/hash, worker tool/result audit, naujos sesijos adoption ir seno šaltinio atšaukimas. Esama V1 Start negali pradėti V2 sesijos per schema downgrade |
| V2 šaltinio gyvavimas | Commit nekeičia TTL iki complete; expiry/revocation/base fence ir immediate recovery testai | V2 pull/refresh loop, restart po dalinio importo, šaltinio pašalinimas, retention/rollback išsaugant revocation, esamų šešių runtime tęstinumas aktualiame e2e |
| Mokymosi admission | Naujas site false/false; V2 learning=false net esamai nišai; Start/source ir enqueue/controller vartų testai | Versioned protected knowledge pin ir evaluator; atskiras gift profilis/roles + frozen corpus; incumbent/candidate palyginimas, hash izoliacija/adoption/rollback. Iki to learning OFF |
| Shared naujas D1 lead | Esamas `website_d1` importo kontraktas ir jo bendros regresijos; root M5 įrodo tik izoliuotos formos įrašą | Realus shared stream/binding mapping, checkpoint ir commit/replay kvitas; nėra production connector ar gift CaseSource prijungimo |
| Legacy D1 | Šaltinio ribos identifikuotos; kodas nepakeistas | Tikro legacy laukų/ID/laiko/consent inventorius, versioned adapteris ir stream identitetas, dedup ir notification-owner taisyklės, backfill bei restart/concurrent replay/site-env-source negative testai |
| Faktinis gift aktyvavimas | Naujos Business/PROFILES registracijos nėra; operator/source/learning/channel ON nėra | Peržiūrėtas aktualus pasiūlymas ir vieši faktai, operatoriaus priimtas source/mapping, atskiri capabilities ir finansiniai limitai. Public compile ar SEO PASS šių leidimų nesuteikia |

### Typed D1 ribos, kurių adapteris negali numanyti

`lead_import.Batch` priima tik `source_system=website_d1`, iki 30 įrašų. Lead ID yra UUID, site_id atitinka registry mapping, timestamp griežtas sveikas millisecond epoch, consent_at=created_at, status new/notified. Cursor yra `(created_at, UUID string id)`; eilė griežtai didėjanti, checkpoint tik po commit. Name2..100, valid email, message20..3000, source_path su vienu pradiniu `/`.

Esamas checkpoint turi vieną `(business,environment,source_system)` stream; nepriklausomo legacy ir naujo shared binding negalima įmaišyti į tą patį cursor. Įrašas, atkeliavęs su senesniu created_at, nėra priimamas įprastu forward import. Backfill todėl reikalauja atskiros sutarties, ne cursor nustūmimo atgal. Negalima išgalvoti UUID, consent, papildyti trumpos žinutės fiktyviu tekstu ar pakeisti seconds į milliseconds be patvirtinto šaltinio tipo. Importo notification_owner lieka `source-d1`, notifications_sent=0; jis neatkartoja seno operatoriaus SMTP. Formos sutikimas nesuteikia įrenginio atminties ar rinkodaros leidimo.

### Reikalingi per-nišos faktai ir operatoriaus priėmimas

1. Tikslus dovanos123 siteId/kanoninis host ir jo viešo kontaktų/privatumo paketo approval. MB Pinet/info@pinet.lt bendras default jau patvirtintas; jo nereikia iš naujo klausti, bet paketo matomas snapshot turi jį atitikti. Kitos nišos telefonas/adresas ar MB Memocasting sąskaitų rekvizitai automatiškai nėra gift faktai.
2. Aktualus mokamas rezultatas/pasiūlymas ir vykdymo ribos: ar šis agentas konsultuoja, surenka poreikį, nukreipia į konkrečią parduotuvę, ar parduoda. Tikros produkto/kainos/likučio/pristatymo/grąžinimo sąlygos ir pardavėjo tapatybė reikalingos toms capability, kurios jas žada; info-only merchant target neįrodo checkout ar užsakymo.
3. Patvirtintos agento knowledge versijos, source inventorius ir išimtys. Šiuo metu privatūs/review gift įrašai nesudaro public approved inventory; source_ready lieka OFF. Naujas profilis ir instrukcijos kuriami pagal šią patvirtintą per-nišos tiesą, ne pagal archyvą.
4. Tikras D1 binding/stream ID, site key/ID mapping, laukų tipai, timestamp vienetai, originalūs ID ir consent kilmė; minimizuotas struktūros pavyzdys be klientų duomenų. Legacy/shared migracijos riba, dedup, retention/delete/backfill ir notification-owner atsakomybė turi būti priimta atskirai.
5. Runtime source ir learning admission, išlaidų limitai, modelio/įrankių capability, eskalavimo kelias ir retained-memory taisyklės. Voice, email delivery, supplier outreach, commerce ir learning yra atskiri leidimai/priėmimai; source_ready neįjungia nė vieno iš jų.

Trūkstamus faktus pirmiausia nustatyti iš aktualių savininko patvirtintų konfigūracijų, BUSINESS/paketo ir šaltinio inventoriaus. Neklausti pakartotinai jau patvirtinto default; klausti tik konkretaus likusio fakto, kurio nėra įrodymuose. Kitas V2 fixture ratas privalo naudoti atskirą test namespace, nekeisti global Business/PROFILES ir neįjungti faktinio gift admission.

## Per-site operator emitter pataisa — 2026-10-05

Root read-only peržiūra rado, kad V2 metadata/deployment operator visada buvo global `network.operatorName`. Pataisytas tik own `scripts/network_manifest.mjs`: explicit per-site `contactsBySite[siteId].operatorName`, kitaip default; netuščias string turi exact match su ingest-validated `pkg.site.operatorName`. Explicit null/empty/neteisingas tipas arba snapshot nesutapimas sukelia `operator_mismatch` prieš to site V2 artefakto eksportą. Metadata ir deployment hash abu gauna tą patį parinktą operatorių. V1 operator ir deployment/projection hash algoritmai nepakeisti.

7 naujos operator regressions ir esami transport/local-sync testai: **17 PASS, 3.14 s**. Scoped Ruff ir Node syntax PASS. [Operator JUnit](../agent-business-core/runtime/artifacts/m4-runtime-20261005-operator/junit.xml), [source SHA ir scope proof](../agent-business-core/runtime/artifacts/m4-runtime-20261005-operator/proof.json). Visa suite po šios Node delta nepakartota; ankstesni 275 PASS yra ankstesnio pagrindinio inkremento įrodymas.

Priėmimo atvejai: per-site operator match su kitokiu global default, invalid/null/empty/type/missing/mismatched operator rejection, content checksum ir nuo nesusijusio global default nepriklausomas V2 deployment, nepakeistos V1 pages/deployment su esamu global operator pasirinkimu. Naudoti tik laikini fixture katalogai; jokia faktinė Business/PROFILES registracija, admission, DB/kanalai ar kitos sesijos failai nekeičiami.

Root [M5 KNOWLEDGE-QA.json](../research/dovanos123-integration-2026-10-04/M5/KNOWLEDGE-QA.json) rodo 9 puslapių HTML inventoriaus/žinių fixture atitikimą su `runtimeImportEnabled=false` ir `learningAdmitted=false`. Tai papildomas viešos fixture semantikos įrodymas; M4 liekanų lentelės runtime/adoption/legacy D1 vartai dėl jo netampa complete.
