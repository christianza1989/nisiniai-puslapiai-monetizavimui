# Madbeauty Facebook ir bendruomenės darbų tęstinumas

Atnaujinta 2026-10-11. Aktyvi apimtis: pradėti nuo Facebook, įgyvendinti C0–C2 ir padaryti viską išbandoma. Grupės ir renginiai suplanuoti, jų realizacija šiame lange neužsakyta. Checkbox pažymimas tik su konkrečiu rezultatu ir įrodymu; parašytas kodas savaime nėra priėmimas.

## Kur tęsti po konteksto praradimo

Checkout: `madbeauty-service-picker-20261010`, šaka `ai/madbeauty-service-picker-20261010`, PR88. Plano commit `c8f7d1e`; šis dokumentas gali turėti naujesnius dar necommitintus checkpointus. Pirmiausia `git status`, tada šis failas ir jo naujausias checkpoint. Kitų failų pakeitimų nenurašyti ar reset'inti.

Dabartinis žingsnis: **Meta nustatymai ir Facebook serverio integracija**. Savininkas atskiru atsakymu patvirtino „Create app“ ir Terms; programėlė sukurta. App ID `1827877621543839`, pavadinimas Madbeauty, kontaktas info@pinet.lt, vartotojų Facebook Login, be verslo portfelio. Dashboard būsena Unpublished; rodo Business verification ir App Review. Svetimų programėlių nustatymai nepakeisti. Basic išsaugoti domenas, privatumo / taisyklių URL, Lifestyle kategorija ir duomenų šalinimo callback. Savininkas užbaigė security patvirtinimą; App Secret saugiai paruoštas ignoruojamame vietiniame credentials faile, neįdiegtas į Workers ir niekur nerodomas. OAuth main / trial callback bei deauthorization nustatyti, email leidimas su atskiru savininko patvirtinimu Ready for testing. Ikona 1024×1024 paruošta; Chrome extension file URL permission šiuo metu neleidžia įkelti.

Kitas veiksmas: Basic nustatyti Madbeauty domeną ir tikrus privatumo / šalinimo adresus; Use cases → Facebook Login nustatyti tikslų `/api/madbeauty/auth/facebook/callback` ir atskirti bandymo konfigūraciją. App Secret nekelti į chat, screenshot, viešą JS ar Git. Facebook backend ir HTTP / UI integracija parašyti, vietiniai bei pirmas native restart testas PASS; dar reikia tikro Meta kelio ir gyvo priėmimo. Nauji endpointai dar neįdiegti gyvai.

Gyvas pagrindas: runtime `e2d9f8c8ccb9653c70f0b1d376b6ba7dd405de61`, main `96af1b12-52cc-48cb-820e-1580f4b7c860`, trial `2292c0bd-b302-40cc-8d7c-e1eb9de0b033`. Šių ID nekeisti kaip dokumentinio progreso. Trial galioja iki `2026-10-16T21:10:47.982Z`, turi 40 solo ir 5 viešus salonus; jokių dummy canonical. Ankstesni įrodymai: [auth kvitas](../auth-social-20261011/RECEIPT.md).

## Užbaigtas pasiruošimas

- [x] Pilnas produktinis ir techninis planas: [PLAN.md](PLAN.md).
- [x] Dizaino / ekranų kryptis: [SURFACE.md](SURFACE.md).
- [x] 22 struktūriniai darbai, 32 ekranai ir priklausomybės: [BACKLOG.json](BACKLOG.json); JSON / cycle / screen / vietinių nuorodų patikros PASS, planas `c8f7d1e`.
- [x] Patikrintas gyvas auth ir profilio kvietimo pagrindas pagal ankstesnį kvitą.
- [x] Facebook galimybių tyrimas: [FACEBOOK_INTEGRATION_PLAN.md](../auth-social-20261011/FACEBOOK_INTEGRATION_PLAN.md).
- [x] Perskaitytas Meta My Apps ir atidarytas naujos programėlės kūrimo vedlys; Madbeauty programėlės tame pradiniame žingsnyje dar nebuvo.
- [x] Su savininko action-time patvirtinimu sukurta Madbeauty Meta programėlė `1827877621543839`; patvirtinta Dashboard būsena, programėlė dar nepaskelbta.

## Facebook pirmas etapas

- [ ] F0 Paruošti programėlę Meta, jos tikrus domenus ir callback sutartį; fiksuoti App ID / režimą / leidimus be secret.
- [ ] F1 Įgyvendinti vienkartinį session-bound OAuth state, code exchange ir tokeno app / subject / expiry tikrinimą.
- [ ] F2 Atominė Facebook tapatybė, pirmas email kodas ir aiškus esamos paskyros susiejimas; jokio automatinio merge.
- [ ] F3 Paskyros susiejimas / atsiejimas, deauthorization ir signed deletion callback.
- [ ] F4 Tikras login mygtukas ir grįžimas į pradėtą kelią; neįjungti viešai be veikiančios konfigūracijos.
- [ ] F5 Vietiniai + native replay / expiry / wrong app / concurrency / role / restart testai.
- [ ] F6 Tikras Meta vartotojo login bandymas; administratoriaus ir išorinio vartotojo prieigą vertinti atskirai.

## C0 Pagrindas

- [ ] C0-01 Esamos tapatybės, aktoriaus ir auditorijos serverio sutartys.
- [ ] C0-02 Atskira community saugykla, pridedanti migracija ir native restart kelias.
- [ ] C0-03 Srauto / composer / pokalbio desktop ir mobile dizainas; grupių / renginių maketai vėlesnei apimčiai.
- [ ] C0-04 Skundų, blokavimo, limitų ir audituojamų sprendimų pagrindas prieš viešą UGC.

## C1 Srautas

- [ ] C1-01 Įrašai, auditorija, redagavimas / šalinimas ir saugi vaizdų medija.
- [ ] C1-02 Atrask / Sekami, miesto / paslaugos filtrai, stabilus pagination ir tikra paslaugos nuoroda.
- [ ] C1-03 Patiktukai, komentarai / atsakymai ir privatūs idėjų albumai.

## C2 Draugystės ir žinutės

- [ ] C2-01 Draugystės prašymai, priėmimas / atsiėmimas / nutraukimas ir blokavimo viršenybė.
- [ ] C2-02 Žinučių užklausos, patvarūs asmeniniai / salono pokalbiai, atskiros vizito teisės.
- [ ] C2-03 Realaus laiko atnaujinimas, reconnect / logout / revocation ir privatūs nuotraukų priedai.

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
