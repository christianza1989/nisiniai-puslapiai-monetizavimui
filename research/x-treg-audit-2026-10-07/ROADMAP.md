# X kanalo įgyvendinimo ir PhoneBridger bandymo roadmapas

2026-10-07 · SIŪLOMAS planas po [Treg/X audito](AUDIT.md). [Įrodymų ribos](EVIDENCE.md). M0 atliktas auditas; X1–X6 ir visi priėmimo scenarijai NOT RUN. Savininkas užsakė auditą, ne gyvą X siuntimą / naują spend. FB kanalo mandatas nepersikelia savaime.

## Vienas bendras core, skirtingi kanalų vartai

Bendrą faktų/peržiūros/medijos kilmės, siteId/business_id, durable darbų, išlaidų ir metrikų logiką naudoti esamame agent-business-core. FB ir X turi atskirus adapterius, autentifikaciją, allowed actions ir platformos taisykles. Didesnis bendrų schemų pakeitimas — atskiras suderintas PR, ne šio audito tylus kodas. [ACQUISITION_CORE](../../ACQUISITION_CORE.md), [CONTENT_CORE](../../CONTENT_CORE.md), [MEDIA_CORE](../../MEDIA_CORE.md) ir [MAIL_CORE](../../MAIL_CORE.md) išlieka autoritetingi savo sritims.

Viena koordinavimo paslauga paskirsto darbus. Specialistas gauna tik nišos faktus ir užduoties kontekstą. X rašymo eiliškumas koordinuojamas pagal actual provider account / actor; kelios paskyros nepaverčiamos savitarpio like/repost tinklu. Pirmam bandymui vienas tikras PhoneBridger actor; nė vienos kitos nišos automatinio įjungimo.

Siūloma per-site konfigūracija (nėra jau veikiančios API): enabled=false; mode=research_only; siteId; actual X user ID/handle/connectionRef; approved fact/contact/offer hashes; post/reply/dm/media/analytics capabilities; source policy; account/brand/source access; X approval evidence su use-case/version; experimentId; UTC publishAt ir operator timezone; query/cursor/freshness; action/model/media/time ir pinigų ribos; opt-out/retention; spend reserve+settlement. Sekretų reikšmės neįtraukiamos.

Paskyros veiksmas turi kanalą ir paskirtį: original post / own-thread continuation / inbound reply / DM. Vien X endpoint /2/tweets nėra leidimas visoms keturioms paskirtims. Originalo content job neprivalo turėti fiktyvaus buyer signalo. Social calendar atskiras nuo website Article publication; shared approval logika nesukuria Article release.

## M0 — šio audito rezultatas

- [x] Apžiūrėta konkreti X katalogo sąsaja ir actual connection inventorius.
- [x] Perskaityti devyni public metadata kontraktai; jokio paid provider call.
- [x] Patikrinti X kainoraštis ir automation vartai; URL modifikatorius patvirtintas cost.note/UI.
- [x] Atskirta mūsų esama Treg SEO ir FB preparation bazė nuo neįgyvendinto X transporto.
- [x] Parengtas siūlomas piloto, ekonomikos ir priėmimo planas; niekas neaktyvuota.

## X1 — faktai, prieiga, pasirinktas kanalas

- [ ] Prieš kodą rezervuoti failų langą GitHub/WORKSTREAMS; skaityti aktualias bendrų modulių sutartis.
- [ ] Aktualus PhoneBridger pasiūlymas ir produkto/medijos įrodymai, realus canonical ir kontakto išimtis.
- [ ] Patikrinti esamą X actor arba parengti konkretaus account sukūrimo kelią; paskyros fakto neišgalvoti.
- [ ] Išspręsti disabled Connect priežastį; parinkti Treg OAuth arba BYO developer app su actual provider/app capabilities.
- [ ] Užfiksuoti konkretų tyrimo/publikavimo mandatą ir ribotą spend; credential įjungimas atskirai nuo kanalo acceptance.
- [ ] AI inbound reply ir DM lieka OFF iki atitinkamų X/platformos ir techninių vartų.

Priėmimas: persite capabilities manifest su patvirtintais / UNKNOWN faktais, jokio paslėpto naujo prisijungimo ar mokėjimo. Neveikiantis reply kanalas netrukdo vietiniam original-content darbui.

## X2 — vietinis pilnas kelias ir GUI

- [ ] Originalo brief → approved facts/assets → current review → scheduled job → simulated receipt → aiškiai synthetic inbound → policy/draft.
- [ ] Viename operator GUI kanalo/site režimas, kalendorius, preview, eventual permalink, permissions/blocked priežastys, sąnaudų ir rezultatų lentelė.
- [ ] Tikro inbound ir researched prospect skirtis; CaseSource priimamas tik esamame core su source ID/dedup.
- [ ] Deterministinis wrong-site / wrong-actor / stale context / opt-out / global pause vartas prieš dispatch.
- [ ] Provider native response/schema adapteriai, partial/empty/blocked/stale būsenos ir invariantų testai.
- [ ] Private duomenų retention, injekcijų ir cross-tenant patikra. Testai nesukuria tikro kliento metrikų.

Priėmimas: vietinis vertikalus kelias ir matomi operatoriaus vartai; aukštas testų skaičius nėra live acceptance.

## X3 — vienas oficialus publikavimo transportas

- [ ] Priimti actual write scopes, account identity, exact endpoint/body ir kainos modifikatorius.
- [ ] Vienas API postas pagal actual live pavedimą; provider ID/atsakymas, matomumo būklė ir private receipt. Netestuoti gyvai vien tam, kad uždaryti checklist.
- [ ] Durable outbox / atominis vietinis job lease / account ordering / timeout reconciliation; treg idempotency patikrinti būtent own-account write keliui, ne perkelti catalog read pažadą.
- [ ] Kol own write replay elgsena UNKNOWN, uncertain nesiųsti pakartotinai. Niekada netikrinti write patikimumo atsitiktiniu nauju idempotency key.
- [ ] Savo thread dalys turi atskirus receipts ir resume boundary; svetimas parent negali pavirsti own-thread continuation.
- [ ] Faktų, assets/teisių, URL ar publishAt pakeitimas atšaukia stale review; vienas scheduling autoritetas, ne dubliuoti su provider schedule.
- [ ] Medijos formatas/scopes/upload body/processing status/alt ir post association patikrinti atskirai pagal actual X ir Treg sutartį. Schema descriptor neperduodamas kaip upload payload.

Priėmimas: priimtas tekstinis kanalas nėra priimtas vizualus PhoneBridger kanalas. Katalogo observed_success nėra šio agento receipt.

## X4 — bounded tyrimas, inbound ir sąnaudos

- [ ] Skaitymo query/kalba/data semantika, provider-source teisės, cursor/max rows, pagination cap, freshness ir dedup.
- [ ] Pradėti nuo 2 siaurų query/d.; ne broad firehose. Kvota yra siūlomas eksperimento limitas, ne X allowance.
- [ ] Prieš kiekvieną paid call konservatyvus rezervas ir actual likęs biudžetas; po jo settlement/call ID. Failover/pending/cached ir own-key upstream kaštai neišnyksta.
- [ ] Inbound polling arba webhook pasirinktas po actual prieigos ir kainos įvertinimo; vienu metu abu nesukuria duplicate reply.
- [ ] AI reply approval evidence ir vartotojo interaction/opt-out vartai tikrinami dispatch metu. Keyword-only cold reply blocked, follow/open DM nėra leidimas.
- [ ] API restrictions/429/auth change sukelia bounded backoff/pause. Jokio website scripting fallback.
- [ ] GUI rodo neužbaigtą/unknown spend, blocked inbound ir backlog; worker negali sau pakelti biudžeto.

Priėmimas: pirmas kanalas gali apsiriboti research + original publishing; inbound lieka draft-only, jei X approval ar transportas nepriimtas. Tai aiškiai mažesnė priimta apimtis, ne „pilnai autonominis X“.

## X5 — 28 d. PhoneBridger bandymas

- [ ] Viena EN auditorijos/use-case hipotezė, 16 originalių briefų ir realus device-fit/onboarding kelias. Medija tik iš actual patikrinto produkto; AI iliustracija nėra veikimo įrodymas.
- [ ] 4 postai/sav. yra pradinė hipotezė; neturint tinkamo asset/fakto atidėti arba pakeisti naudingu įgyvendinamu formatu.
- [ ] SEO gidų ir landing CTA per shared core, actual anoniminiai campaign/action IDs; jokio X handle ar kliento PII URL.
- [ ] Patikrinti qualified visit, beta/download, actual activation, D7 naudojimą, paid unique server event, refund/support ir contribution. Download nėra aktyvacija.
- [ ] Atribucija first/last/assisted/unattributed nepadvigubina order; X ir FB kohortos atskiros, priežastinis prieaugis neišgalvojamas.
- [ ] Savaitinė peržiūra: vienas kampo/auditorijos/CTA/formato pakeitimas, kontrolė ir visas creative/AI/time sąnaudų žurnalas.
- [ ] D28 turinio intake pabaiga; D35 paskutinių dalyvių D7 peržiūra. Data nepakeičia trūkstamų faktų.

Siūlomi slenksčiai užfiksuojami prieš live, ne prognozuojami: bent 8 publikuoti originalai ir actual qualified-visit denominator tik preliminariam kanalo vertinimui; jei to nėra — inconclusive. Bent 5 nepriklausomi kvalifikuoti žmonės / 3 actual aktyvacijos / 2 D7 grįžimai būtų naudojimo signalas, ne pelnas. Bent 2 actual nepriklausomi pirkėjai su outcome/sąnaudomis leidžia tik tęsti nedidelį komercinį bandymą. Pelningumas ir skala reikalauja pakartotos kohortos; unknown išlaidos ar missing attribution neleidžia paskelbti laimėtojo.

Ribos: visi current live/spend toggles OFF šiame audite. Būsimam runner riboti modelio/media/publikavimo/laiko darbą atskirai ir bendrai; čia neįjungta $1 ar kitokia slapta bandomoji allowance. Jei kontaktavimo / platformos teisės pasikeičia, tas kelias sustoja; originalus turinys gali būti tęsiamas tik savo galiojančiose ribose.

## X6 — pakartojimas ir kitos nišos

- [ ] Pakartota PhoneBridger kohorta su contribution po aptarnavimo/grąžinimų, ne vien reach.
- [ ] Antros nišos BUSINESS/ACQUISITION ir X audience pagrindas; nenaudoti PhoneBridger kalbos/kvotų kaip global default.
- [ ] Account isolation, shared scheduler fairness ir suppression testai; kontaktų/klientų neperkelti tarp nišų pagal handle.
- [ ] Patirties pataisos į core/skills pagal CORE_IMPROVEMENT; nesujungtas PR nėra visų agentų bazė.

## Priėmimo scenarijai — visi NOT RUN

- [ ] X-01 Nauja niša neturi X write/send/spend įjungimo; FB mandatas nesuteikia X mandato.
- [ ] X-02 Wrong actor, site ar sutrumpintas domeno alias neperjungia paskyros/pasiūlymo.
- [ ] X-03 Nepatvirtinti scopes ir media/DM schema descriptor payload blokuojami prieš provider call.
- [ ] X-04 Post su URL gauna aukštesnį kainos rezervą; neįkainotas modifier arba unknown settlement sustabdo paid dispatch.
- [ ] X-05 Keli PC/worker neviršija bendro biudžeto ir nepublikuoja vieno job du kartus.
- [ ] X-06 Own-account write timeout tampa uncertain; nėra aklo read-idempotency / provider failover / naujo-key retry.
- [ ] X-07 Dalinis thread tęsiamas tik nuo patvirtinto savo parent; deleted/restricted/foreign parent neaplenkia reply vartų.
- [ ] X-08 AI reply be actual X approval blokuojamas net esant owner mandate ir tweet.write.
- [ ] X-09 Keyword-only stranger, follower ar open-DM negauna auto pitch; naujas tinkamas interaction atskirai patikrintas.
- [ ] X-10 Vienas automatinis reply per tinkamą interaction; duplicate webhook/poll event nesukuria antro, refusal atšaukia pending.
- [ ] X-11 Automatiniai like/hide ir spam cross-account engagement nesukuriami iš katalogo endpoint buvimo.
- [ ] X-12 Auth/rate-limit/restriction nėra website scripting fallback ar neleistinas retry.
- [ ] X-13 Provider-native cursor, schema error, stale/empty/unknown ir permalinks neprasimano pirkėjo ar nulinės paklausos.
- [ ] X-14 Scheduled post stale facts/media/rights/offer/site-config blokuojamas; publishAt pakeitimas nesukuria antro schedule.
- [ ] X-15 Post/release/approval ir savo social ID nesukuria svetainės Article release ar tarp-nišos klientų merge.
- [ ] X-16 Test clicks/download/paid sandbox nėra tikra aktyvacija/pardavimas; contribution ir attribution su actual evidence.
- [ ] X-17 Treg BYO/owned-read/cache/replay neužmaskuoja upstream usage ir nepatvirtinto sutaupymo.
- [ ] X-18 Prompt injection/PII iš X/DM nepatenka į public post, URL ar kitos nišos specialisto kontekstą.

Uždaryti tik su exact source/config/version, expected/actual ir privačiu sanitized receipt. Plano markdown checkboxų patikra nėra šių scenarijų PASS.
