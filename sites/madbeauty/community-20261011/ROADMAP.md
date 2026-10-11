# Madbeauty Facebook ir bendruomenės darbų tęstinumas

Atnaujinta 2026-10-11. Aktyvi apimtis: pradėti nuo Facebook, įgyvendinti C0–C2 ir padaryti viską išbandoma. Grupės ir renginiai suplanuoti, jų realizacija šiame lange neužsakyta. Checkbox pažymimas tik su konkrečiu rezultatu ir įrodymu; parašytas kodas savaime nėra priėmimas.

## Kur tęsti po konteksto praradimo

Checkout: `madbeauty-service-picker-20261010`, šaka `ai/madbeauty-service-picker-20261010`, PR88. Plano commit `c8f7d1e`; šis dokumentas gali turėti naujesnius dar necommitintus checkpointus. Pirmiausia `git status`, tada šis failas ir jo naujausias checkpoint. Kitų failų pakeitimų nenurašyti ar reset'inti.

Dabartinis žingsnis: **C0–C2 bandomoji bendruomenė gyvai; Facebook savininko sutikimas laukiamas**. Meta programėlė1827877621543839, Basic/callback/email/ikona išsaugoti, Unpublished. App Secret įdiegtas kaip Workers secret abiem hostams, jo vertė nepateikta source/artifacts/screenshots. Trial Facebook mygtukas pasiekė tikrą Meta leidimo langą, ContinueasChristian nepaspaustas be atskiro savininko sutikimo. Pagrindinis domenas turi FBprivacy/deletion/deauthorization sutartis, bet publicFBlogin ir bendruomenė ten išjungti.

OAuth state galioja5min.; gavus vėlesnį sutikimą pirmiausia iš naujo pradėti trial Facebook mygtuko kelią, kad sena consent kortelė negrąžintų expired state.

Kitas veiksmas: gavus konkrečios Facebook paskyros sutikimą, užbaigti admin OAuth → trialOTPfirstlink → logout/relogin → unlink. Tada tikrinti faktinius Meta App Review / business verification / external public activation reikalavimus. Savininkas jau gali bandyti C0–C2 per /bandymo-paskyros → /bendruomene. Pagrindinio domeno community activation ir WebSocket hibernation dar nepriimti; grupės ir renginiai C3–C4 tik planuoti.

Gyvas pagrindas: runtime `ced9559130e41c3cede6288fa9e94308c689ffe8`, main `09f767e9-9bba-4ddb-96bc-3feaac299535`, trial `8e4da6de-9e07-4c4b-8f37-b42bd4474a30`. [Aktualus kvitas](RECEIPT.md). Trial originali galiojimo pabaiga `2026-10-16T21:10:47.982Z`,40solo+5salonai/11–21testiniųreviews išsaugoti; jokių dummy canonical. Ankstesnių leidimų istorija žemiau neperrašyta.

## Užbaigtas pasiruošimas

- [x] Pilnas produktinis ir techninis planas: [PLAN.md](PLAN.md).
- [x] Dizaino / ekranų kryptis: [SURFACE.md](SURFACE.md).
- [x] 22 struktūriniai darbai, 32 ekranai ir priklausomybės: [BACKLOG.json](BACKLOG.json); JSON / cycle / screen / vietinių nuorodų patikros PASS, planas `c8f7d1e`.
- [x] Patikrintas gyvas auth ir profilio kvietimo pagrindas pagal ankstesnį kvitą.
- [x] Facebook galimybių tyrimas: [FACEBOOK_INTEGRATION_PLAN.md](../auth-social-20261011/FACEBOOK_INTEGRATION_PLAN.md).
- [x] Perskaitytas Meta My Apps ir atidarytas naujos programėlės kūrimo vedlys; Madbeauty programėlės tame pradiniame žingsnyje dar nebuvo.
- [x] Su savininko action-time patvirtinimu sukurta Madbeauty Meta programėlė `1827877621543839`; patvirtinta Dashboard būsena, programėlė dar nepaskelbta.

## Facebook pirmas etapas

- [x] F0 Paruošti programėlę Meta, jos tikrus domenus ir callback sutartį; fiksuoti App ID / režimą / leidimus be secret.
- [x] F1 Įgyvendinti vienkartinį session-bound OAuth state, code exchange ir tokeno app / subject / expiry tikrinimą.
- [x] F2 Atominė Facebook tapatybė, pirmas email kodas ir aiškus esamos paskyros susiejimas; jokio automatinio merge.
- [x] F3 Paskyros susiejimas / atsiejimas, deauthorization ir signed deletion callback.
- [x] F4 Tikras login mygtukas ir grįžimas į pradėtą kelią; neįjungti viešai be veikiančios konfigūracijos.
- [x] F5 Vietiniai + native replay / expiry / wrong app / concurrency / role / restart testai.
- [ ] F6 Tikras Meta vartotojo login bandymas; administratoriaus ir išorinio vartotojo prieigą vertinti atskirai.

## C0 Pagrindas

- [x] C0-01 Esamos tapatybės, aktoriaus ir auditorijos serverio sutartys.
- [x] C0-02 Atskira community saugykla, pridedanti migracija ir native restart kelias.
- [x] C0-03 Srauto / composer / pokalbio desktop ir mobile dizainas; grupių / renginių maketai vėlesnei apimčiai.
- [x] C0-04 Skundų, blokavimo, limitų ir audituojamų sprendimų pagrindas prieš viešą UGC.

## C1 Srautas

- [x] C1-01 Įrašai, auditorija, redagavimas / šalinimas ir saugi vaizdų medija.
- [x] C1-02 Atrask / Sekami, miesto / paslaugos filtrai, stabilus pagination ir tikra paslaugos nuoroda.
- [x] C1-03 Patiktukai, komentarai / atsakymai ir privatūs idėjų albumai.

## C2 Draugystės ir žinutės

- [x] C2-01 Draugystės prašymai, priėmimas / atsiėmimas / nutraukimas ir blokavimo viršenybė.
- [x] C2-02 Žinučių užklausos, patvarūs asmeniniai / salono pokalbiai, atskiros vizito teisės.
- [x] C2-03 5s automatinis atnaujinimas, reconnect / logout / revocation ir privatūs nuotraukų priedai.

## Priėmimas prieš etapų aktyvinimą

- [ ] C0–C2 vietinio backend ir native Worker paritetas, jokių svetimos auditorijos / organizacijos duomenų.
- [ ] Du tikri browser langai: įrašas → reakcija / komentaras → sekti → draugystė → pokalbis → refresh / reconnect.
- [ ] Ne draugo užklausa, atmetimas, blokavimas, sesijos pabaiga ir netinkamas privatus media ID.
- [ ] Pakartojimų, versijos konfliktų ir native restart patikros su įrodymais.
- [ ] 390 / 768 / 1440 px, klaviatūra, fokusas, loading / empty / error / success / access revoked.
- [ ] Pranešimų / privatumo nustatymai, eksportas ir naujo socialinio turinio saugojimo taikymas aiškus prieš atitinkamą viešą / destruktyvią funkciją.
- [ ] Trial įrašai ir žinutės pažymėti sintetiniais, demo profilių / galerijų / atsiliepimų ir expiry išsaugojimas.
- [ ] Patikrintas faktinis release, bindings / namespaces / mail / content išsaugojimas ir rollback.
- [ ] Naudotojui pateiktos testavimo nuorodos bei konkretus dviejų paskyrų scenarijus.

## Vėlesni etapai

- [ ] C3-01 Grupių kūrimas ir narystė.
- [ ] C3-02 Grupių diskusijos, rolės ir valdymas.
- [ ] C4-01 Renginių tipai ir organizatoriaus publikacija.
- [ ] C4-02 Konferencijų programa ir pranešėjai.
- [ ] C4-03 Mokymų / konkursų paraiškos.
- [ ] C4-04 Vietos, registracija ir laukimo eilė.
- [ ] C4-05 Kvietimai, pakeitimai ir priminimai.
- [ ] Visos bendruomenės C5 priėmimas pagal struktūrinį backlogą.

## Checkpoint tvarka

Po kiekvieno prasmingo paketo čia įrašyti source commit arba uncommitted failų sritį, tikrą patikrą ir jos rezultatą, nebaigtą problemą, gyvos versijos tapatybę ir kitą konkretų veiksmą. Pakeisti „Dabartinis žingsnis“ viršuje. Facebook išorinis trukdis neatleidžia nuo nepriklausomų C0–C2 darbų; neskelbti viso etapo baigtu vien dėl testų sumos ar sukurto UI.

### 2026-10-11 Facebook vietinio pagrindo checkpoint

Nauji `backend/facebook-auth.mjs` ir `.test.mjs`; siauri `backend/auth.mjs`, `backend/http-core.mjs`, `cloudflare/fetch-api.mjs` ir `platform-object.mjs` pakeitimai. Vienkartinis sesijos state, realių Graph endpointų adapteris su app / subject / expiry tikrinimu, OTP transakcijos tapatybės susiejimas, signin rotacija, signed deletion / deauthorization ir konfigūracijos išjungimas. `node --test sites/madbeauty/backend/facebook-auth.test.mjs sites/madbeauty/prototype/http-adapter.test.mjs`: 19/19 PASS, iš jų 11 naujų Facebook sutarčių testų; provider atsakymai šiuose testuose sintetiniai. Tikras Graph OAuth, native Worker, frontend ir deployed kelias dar NEPRIIMTI. Gyvos versijos aukščiau nepakeistos. App konfigūracijos ir UI darbai tęsiami.

### 2026-10-11 savininko patvirtinimo ir native checkpoint

Meta App Secret paruoštas privačiai po savininko patvirtinimo; jo vertės čia, Git ar ekrano įrodymuose nėra. Email leidimas pridėtas su atskiru patvirtinimu. Abu OAuth callback adresai ir canonical deauthorization išsaugoti. Naujas `cloudflare/facebook-runtime.test.mjs`: Workers SQLite restart, OTP pirmas susiejimas, linked signin / cookie rotacija, replay, signed deletion, wrong-app ir no-referrer tikrinimas PASS (provider šiame teste sintetinis). Facebook unit / HTTP 15/15 PASS; prieš papildomą killswitch testą combined existing auth / invite / adapter patikros 25/25 PASS. Trial email forma dabar siūlo demo adresą, o ne realų FB hint. Pridėtas state / pending cleanup ir išsaugoma griežtesnė API referrer policy. Gyvai dar niekas iš šio paketo neįdiegta. Ikonos upload užblokuotas extension file permission; tęsti nepriklausomą C0–C2 kelią.

### 2026-10-11 C0–C2 ir Meta ikonos checkpoint

Paruoštas bendruomenės serverio pagrindas su atskirais person / organization ir conversation Durable Objects, autentifikuota API, auditorijų / blokavimo / nuosavybės / versijų ribomis. Vietinėje naršyklėje pereitas OTP → bendruomenės profilis → viešas testinis įrašas kelias. Pridėti feed, follow, save, friendship ir request / message UI; prieinamumas bei mobilioji navigacija patikslinti. Community unit + native Worker ir Facebook / esamo adapterio combined patikra: **27/27 PASS**. Native community testas patvirtino restart ir privatumo / užklausų / revocation ribas. Tai nėra C0–C2 priėmimas: medija, real-time / salonų inbox, retention, moderavimo eilė, papildomas dviejų naršyklių acceptance ir realus trial deploy dar liko.

Savininko paprašyta nauja pikta gražuolė sugeneruota built-in ImageGen pagal esamą estetinių procedūrų iliustraciją. Galutinė Meta ikona: `assets/madbeauty-angry-beauty-icon-v1.png` (1024 × 1024 PNG, 1 693 852 B); tikslus prompt ir kilmė sibling `.provenance.json`. Upload pakartotinai sustabdė ChatGPT Chrome plėtinio `Allow access to file URLs` prieigos trūkumas. Savininkui pateikta konkreti įjungimo / savarankiško upload užklausa. Meta Basics tebėra Unpublished; ikona dar **NEĮKELTA**, gyvos versijos ir Workers secrets nepakeisti.

### 2026-10-11 ikoną įkelia savininkas

Savininkas atsakė „Įkelsiu ikoną pats“. Galutinis PNG taip pat nukopijuotas į `C:/Users/Lenovo/Downloads/madbeauty-app-icon-v1.png`; agentas Meta upload nebekartoja. Pagrindo source checkpoint `cd973a0` push į PR88 šaką; etapų priėmimas ir deploy nepasikeitė. Tęsiant pirmiausia patikrinti, ar savininkas išsaugojo ikoną. Po checkpoint pradėtas `backend/community-media-state.mjs` ir `backend/community.mjs` prijungimas: privatūs SQL WebP variantai / dalys, attachment ownership, auditorijos skaitymas ir 12 mėn. žinučių cleanup. Šis naujas medijos inkrementas dar nepriimtas: upload / read HTTP, alarm, UI ir medijos testai liko; dabartinis API ir toliau saugiai atmeta medijos priedus. Po jo esami community Node / native testai 3/3 PASS. Kitą darbą pradėti naujais medijos ribų testais, tada pilnu HTTP keliu; naujo inkremento neskelbti veikiančiu upload.

### 2026-10-11 privataus media / salonų / UI checkpoint

Uncommitted paketui pridėtos optimized WebP SQL dalys, audience-bound HTTP read/upload, orphan24h / 12 kalendorinių mėnesių cleanup, asmens šalinimo journal / retry, realių organizacijos darbuotojų inbox, moderation audit, actual paslaugos ir esamos darbų galerijos ryšys bei trial90narių/45įrašų idempotent seed. Šalinimas neduoda prieigos ištrintai paskyrai ir sutvarko jos komentarus / reakcijas / albumų nuorodas; native visos paskyros removal testas PASS. Moderatoriaus eilė nerodo privačių pokalbių. Du vietiniai browser langai: nuotrauka, komentaras/redagavimas, patiktukas, named albumas, sekimas, accepted friendship, tekstas + privatus foto-only priedas ir 5s atnaujinimas be reload. Restart išsaugojo turinį.

Rasta reali HTMLFormElement.id shadowing klaida dėl hidden name=id. Pataisyta getAttribute ir prasmingas regressijos testas: comment/save/edit bei neaiškaus post atsakymo operacijos ir upload intent išsaugojimas PASS. Naujos 21 backend/media/native patikros PASS; po papildomų UI, operatoriaus ir native FB patikrų 23/23 bei7/7 PASS (persidengiančių testų nesumuoti). Trial native45publicprofiles ir90communityactors tęstinis sąrašas, actualservice/gallery,11–21reviews/books tikslus before/after ir restart PASS. Actual390/768/1440DOM nėra horizontalaus dokumento overflow; ekranų vaizdinį priėmimą dar papildyti hosted. Pokalbio atnaujinimas yra5s poll su hidden pause/backoff; WebSocket hibernation dar neįdiegta. Meta ikona savininko įkelta ir agento Save Changes patvirtinta, screenshot meta-icon-saved.png. Cloudflare401 išspręstas oficialiu Wrangler4.92 whoami token refresh; trial before lease2292c0bd gautas, jokios deployed mutacijos šiame checkpointe.

### 2026-10-11 hosted checkpoint

Trial5d2173cb-fff3-4902-83b9-021b56f61889 su IMAGES/COMMUNITY, canonical776ac16c-c67b-41bb-8630-3145509fe57c su COMMUNITYdisabled ir FBlogin disabled/callback configured. Runtime d539271. [RECEIPT.md](RECEIPT.md) ir JSON nurodo source/hash/native/public/live19/browser bei incidentus. Meta consent actualChrome atviras, savininkui konkretus ContinueasChristian leidimas pateiktas, dar negautas. CheckboxF0–F5 reiškia configured/native įgyvendinimą, ne publicFacebookOAuth. C0–C2 patikros nurodytam ribotam trial ir5s polling; main bendruomenė dar neaktyvinta, WShibernation vėlesnė transporto plėtra. Grupės/events/conferences C3–C4 neįgyvendinti. Kelias bandymui /bandymo-paskyros → /bendruomene. Trial data protected QA/content/mail/expiry išsaugoti.
