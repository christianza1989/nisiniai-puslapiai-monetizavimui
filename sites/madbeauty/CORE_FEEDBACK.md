# Madbeauty — V3 patirtos platformos pamokos

2026-10-06 straipsnių / katalogo adapterio patirtis: [siauro pagrindo CORE_FEEDBACK](content-foundation-20261006/CORE_FEEDBACK.md). V2 projekcija naudojama iš esamo public core; shared studio langas lieka turinio PR10. Ankstesnės pamokos žemiau nekeistos.

2026-10-06. Patirti defektai, jų vietinis sprendimas ir actual įrodymas: [DEFECTS](uiux/DEFECTS.json), [galutinis kvitas](../../research/madbeauty-implementation/uiux-functional-final-v3.json), [intervencijos](../../research/madbeauty-implementation/uiux-interventions-v3.json).

Klientui trūko inquiry/waitlist istorijos: pridėta serverinė savo paskyros whitelist projekcija, paslaugos pavadinimas/būsena ir naujas izoliacijos testas. Waitlist redaktorius naudojo netinkamą status lauką: now state/offered išlieka. Moderavimo approval beprasmė privaloma priežastis pakeista conditional returned/rejected, whitespace required nepriimama. Staff radio rerender fokusas sutaisytas pagal pasirinktos reikšmės tapatybę. Fragmento popstate rerender naikino native scroll: route/structured-hash raktas ir deep-link atkūrimas tikrai retestuoti. Booking santrauka išlaiko kainą/trukmę ir nesitęsia per visą stulpelį.

V2 ankstyvas sustojimas paliko autorizuotą vietinę apimtį nepatikrintą. V3 tęsta be naujo savininko leidimo:69normalūsdesktop/mobile, actual rolės ir aiškus state applicability. Bendrų komponentų įrodymas nepriskiriamas konkrečios normalios kompozicijos estetikai; fizinių priemonių ribos liekaUNVERIFIED. Testų manifestas registruoja visus tris rinkinius prieš vykdymą. Tikras dviejų skirtukų409 ir dvi nuosavo serverio ryšio pertraukos patikrino saugojimą/atkūrimą, root8786neliečiant.

Shared core taisyklės/kodas šioje sesijoje nepakeisti. Tai konkrečios Madbeauty pamokos; jų bendrinimas yra pasiūlymas, ne kitų nišų įgyvendinimo įrodymas.

<!-- UIUX_V3_CURRENT -->

<!-- UIUX_V3_HISTORY -->

# Madbeauty — aktuali platformos patirtis

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.

Pagrįstos pamokos:1) registracijos flow turi leisti naujai darbo vietai pridėti pirmą klientą ir rezervuoti savo laiką prieš approval;2) inquiry/waitlist ryšiai priklauso scoped klientų projekcijai;3) tikras signed-in Lighthouse atskleidė perteklinį viešo katalogo/media krovimą;4) review moderation privalo išlaikyti istoriją ir neviešinti clientId/privačios priežasties;5) full70 UI inventorius nėra visų būsenų QA;6) native dialog Tab kraštas patikrintas ir pataisytas. Shared core šioje sesijoje neperrašytas. Tai own taikymo pamokos, ne kitų nišų priėmimas.



Galutinė papildoma pataisa: reschedule variantas prieš patvirtinimą rodo kainą ir trukmę. Atomic change atnaujina snapshot/meistrą/resursą, tikrina konkretaus vizito prieigą ir leidžia savo esamą nepublikuoto meistro vizitą perkelti klientui. BackendV13 pirmas naujo kontrakto testas FAIL: aptikta approval-dependent reschedule spraga. Pataisyta; V14 35/35PASS2049.8453ms, platformV7 30/30PASS2362.7397ms. V13FAIL išlaikytas. Actual320px reschedule panelė ir native dialog replacement focus retestuoti;1280px savaitė dabar rodo visus7stulpelius.

## Istoriniai įrašai (ankstesnė apimtis; ne dabartinis priėmimas)

# Madbeauty: actual būsena ir core pamokos

2026-10-05. Savininko autorizuota pilna vietinė platforma; IN_PROGRESS. Šis įrašas nekeičia shared instrukcijų ar istorinių rezultatų. Individuali agento patikra, ne nepriklausomas auditas.

Aktualizavimas po pirmo snapshot: priimti visi 120/120 atskirų ImageGen originalų ir 600 WebP, manifest complete:true. `profile-media-http.json` tikrina visus failus/hash, kiekvieno iš 40 profilių susiejimą ir privačių originalų 404. Pirmas harness bandymas klaidingai tapatino P25 ir demo-org-24; jo FAIL išliko, testas pataisytas pagal actual katalogo avatar ID. Publikuoti vietoje trys common gidai / 7 puslapių release SHA `dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579`, 20 WebP; exported-not-deployed. Foundation V3 28/30 FAIL išliko, V4 po route projection ir schemos testo korekcijos 30/30 PASS. V3 tikrų serverio paskyrų priėmimas vyksta `screen-acceptance-v3.json`; rankinis vizitas patvarus, klientės žinutė matoma meistrui, operatoriaus prieiga atskira. Istoriniai skaičiai žemiau yra pirmo snapshot, ne aktuali spraga.

## Actual įgyvendinimas ir priėmimas

- Backend: serverio el. pašto kodai, sesijos, CSRF, membership teisės, patvarus SQLite, rezervavimo intervalai su buferiais / priedais / ištekliais, atomic hold / confirm / change / cancel, pokalbiai ir moderuojama medija. `research/madbeauty-implementation/backend-tests-v7.tap`: 27/27 PASS; V6 su 26 PASS / 1 FAIL išlaikytas. Du procesai su atskiromis SQLite jungtimis patikrino vieną laimėtoją persidengiančiam vizitui. `sites/madbeauty/backend/`, `BACKEND_DECISION.md`.
- Actual naršyklėje: atskiras naujas meistras → operatoriaus patvirtinimas → atskiras klientas → booking → pakeitimas → meistro atsakymas → kliento cancel; duomenys ir sesija išliko po serverio restart. Atskirame vieningame preview tas pats klientas rezervavo seed meistrą ir meistras matė tą patį booking. `research/madbeauty-implementation/v2-server-*`, `v2-unified-server-*`, `browser-qa-v2.json`. Vietinis OTP capture nėra pristatytas laiškas ar el. pašto nuosavybės įrodymas.
- 40 solo ir 6 salonų pakeičiami įrašai atskirame `platform-preview.sqlite`; tas pats serverio auth / booking kelias. Vienkartinis transaction seed, išlikimas po restart, demo DB atidarymas kaip real storage draudžiamas. Tikri testinės registracijos duomenys saugomi atskiroje pradinėje `platform.sqlite`.
- 70 ekranų ir panelių inventorius įgyvendintas ankstesniame frontend etape; galutinė serverio versijos individuali desktop/mobile/keyboard patikra dar vyksta. Produkto kalba, juoda / balta / violetinė tapatybė, trukmei proporcingas kalendorius ir pokalbiai įgyvendinti. Inventorius nėra 70 galutinių PASS.
- 109 iš 120 atskirų profilinių ImageGen originalų peržiūrėti ir importuoti: 36 pilni portreto / darbo / aplinkos rinkiniai ir P37 portretas, 545 WebP. Dar generuojama 11. `prototype/PROFILE_ASSET_MANIFEST_V2.json`, nekintami `PROFILE_GENERATION_BATCH_001–017.json`. Kiekvieno aseto kilmė ir fiktyvus pobūdis žurnale; tai nėra tikro teikėjo darbų įrodymas.
- Bendras turinio V1 modelis: actual brief → draft / media → revision-bound review → atomic approval → release → tikslus bendras importer / compile. Pirmas gidas ir 4 susiję puslapiai, 5 medijos variantai. Release SHA `42ad4384d497594849dc4b7953e01d80a3b2a76a3318b3bd4e8e38b4efb52ae1`, būsena exported-not-deployed. `content/FIRST_RELEASE_RECEIPT.json`.
- Actual vietinio HTTP patikros: draft 404; ta pati importuota versija prieš / po publishAt su kontroliuojamu laikrodžiu; guide / links / index / canonical / Article / sitemap / LLMs / WebP; privačių review ir demo įrašų nebuvimas; unknown host 404. `content-draft-http.json`, `content-release-http.json`, `content-common-seo-smoke.txt`. Atšaukimo testas naudojo izoliuotą tik Madbeauty studijos kopiją, bendras revoke blokavo kabančias nuorodas, po bendro taisymo / review / import gidas dingo iš 7 HTTP paviršių: `content-revocation-http.json`. Tai nėra istorinis paleidimas tikrame domene.
- Patvirtinta bendra politika: 3 straipsniai per savaitę, 6 mėnesiai, 10:00 Europe/Vilnius. 76 suplanuojami langai nėra 76 parengti straipsniai. Esamų publishAt neprerašyta.

## Svarbiausios likusios spragos

1. 11 profilinių vaizdų ir visų 40 rinkinių actual failų / crop / HTTP / profilių priėmimas.
2. Du likę pradiniai gidai turi pereiti tą pačią studijos eigą; senas hardcoded turinys pašalintas. Pusmečio masinis generavimas neįjungtas.
3. Galutinė visų 70 paviršių serverio desktop/mobile/keyboard / klaidų būsenų matrica, paskutinės copy ir mobilios kompozicijos pataisos, actual prisijungusios darbo vietos Lighthouse. Ankstesnis kalendoriaus Lighthouse matavo guest įėjimą.
4. A–Z 85 kriterijų įrodymai ir scorer, konsoliduoti aktualūs dokumentai. Jokių 10/10 ar domain-ready teiginių.
5. Bendras turinio SEO veikia 5 importuotiems puslapiams; viso viešo katalogo / profilių produkcinis SSR ir tikrų duomenų patvirtinimas dar nepriimti. Produkcinis sitemap / LLMs išjungti, vietinis testas izoliuotas ir noindex.
6. SMTP + actual INBOX, tikri teikėjai / faktai / teisės, produkcinė duomenų ir seansų infrastruktūra, domenas / TLS / hostingas / deployment, GSC ir reali paklausa nepatikrinti. Mokėjimai, voice, FB ir išorinės kampanijos neįjungti.

## Faktinės patirtos problemos

- F1 dokumentai daugelyje vietų sako, kad serverio auth / paskyros / pilnas vykdymas vėlesniam etapui. Savininkas Madbeauty tai aiškiai autorizavo. Seno demonstracijos priėmimo teksto laikymas aktualiu klaidingai slėpė vėliau įgyvendintas funkcijas. Reikia atskiro aktualaus scope ir istorijos; F1 taisyklė neturi panaikinti konkrečios savininko autorizacijos.
- Seed ir real auth iš pradžių buvo atskiri UI keliai; patogus mock neįrodo klientas → meistras transaction. Vieningas preview serveris su atskiru DB ir real tais pačiais API išsprendė šią priėmimo spragą.
- SQLite WAL įjungimas prieš busy_timeout sukėlė užraktą dviejų procesų teste; V6 seed paslaugų trūkstamas active laukas sukėlė 1 test FAIL. Abu pataisyti ir fail rezultatai palikti.
- Pirmo turinio approve / release atmestas dėl per trumpo homepage teksto. Pirmas common import atmestas dėl trūkstamos V2 schemos priklausomybės net naudojant V1. Pirmas unknown-host testas klaidingai manė, kad fetch perduoda Host override; patikrintas native HTTP pataisymas. Atitinkami `content-first-approval-attempt.json`, `content-first-import-attempt.json`, `content-release-http-first-attempt.json` išlaikyti.
- V2 turinio priėmimas leidžiamas tik gift rendereriui; Madbeauty pasirinktas bendras V1 su savo HTML. Bendro SEO esmės nekopijavimas pareikalavo aiškaus projection / schema / SEO įrišimo ir importo priklausomybių allowlist. Įrišimas bei source SHA dokumentuoti `content/adapter.mjs`, `CORE_SOURCE_VERSION.json`, `CORE_SANDBOX_PROVENANCE.json`.
- Naršyklės viewport buvo pritaikytas paskutiniam studijos tabui, todėl vienas „mobile“ screenshot iš tikro 1280 px. Klaidingas bandymas išlaikytas, tabų pasirinkimas sutvarkytas ir pakartotinai patikrintas 390 px. Kalendoriaus polish pirmas bandymas turėjo undefined organization; pataisytas, fail screenshot išlaikytas.
- Shared rašymo ribų / kitos sesijos procesų apsauga reikalinga praktiškai: root 8786 ir companion šaltiniai neliečiami; own 8788 serverį restartina tik patikrinus konkretų portą ir PID. Esamos auditų PASS negalima perkelti į naują platformą.

## Būsimi pasiūlymai bendram core

- **Scope:** vienas explicit per-site authorization manifest su F1 / authorized-platform moduliais ir jų priėmimo vartais. Bendri turinio / SEO / media / teisinių faktų saugikliai abiem galioja, bet išplėsta autorizacija nelaikoma F1 pažeidimu. Atskirti implemented, tested-local, accepted, deployed ir demand.
- **Moduliai:** bendras turinio importas / projection / SEO, media, kontaktai ir faktai; produkto domeno moduliai auth, membership, provider/service/schedule, booking, message, moderation. Versijuoti sutartis ir bendrų šaltinių SHA; thin renderer binding vietoj SEO kopijos. Runtime modulis neįsijungia vien parengus jo planą.
- **Duomenys:** eksplicitiniai demo / preview-server / real režimai, atskiros DB ir žymė, fail-closed real importas, deterministinis vienkartinis seed, privati reset / OTP patikra, produkcinio build / package testas dėl fixture nuotėkio. Demo žyma įrašo kilmėje; normali produkto UI kalba neprivalo būti testinis banneris.
- **Auth / booking:** standartinis email capture adapteris vietiniam QA, atskiras real delivery priėmimas. Serveris skaičiuoja kainą / trukmę / teises; hold expiry, idempotency, per-service buffers, schedule revision ir future-booking guard. Bent vienas actual dviejų paskyrų ir dviejų procesų priėmimas, ne vien UI mock testas.
- **Turinys / SEO:** first-guide vertikalus slice privalomas prieš masę: brief / assets / revision-bound review / approval / common import / actual publishAt / revoke negatives. Policy yra planavimo, ne parengimo ar deploy įrodymas. Bendro importerio priklausomybės ir alternatyvaus rendererio V1 adapterio kontraktas galėtų būti standartizuoti.
- **UI / media:** inventorius su kiekvieno ekrano konkrečia užduotimi, būsenomis ir faktiniais action rezultatais; desktop/mobile individualus priėmimas, ne vien route 200. Paieška / kalendorius / chat turi savo kompozicijas. Per-profile aseto trijulės žurnalas, unique SHA, crop ir mažo srcset peržiūra.
- **Acceptance:** maža versijuota matrica su fail + repair + retest įrodymais, measured viewport / auth / data-mode / source-version; istoriniai rezultatai nekinta. Ataskaita negali vadinti guest login puslapio workspace Lighthouse ar SMTP auth inbox pristatymu. Vietinė kokybė, produkcinis paleidimas ir paklausa atskiri.

Šie pasiūlymai nėra įgyvendinti shared core pakeitimai. Platformos darbas tęsiamas pagal savininko autorizuotą apimtį.

## Cloudflare release: patirti ir pritaikyti pataisymai — 2026-10-06

Node HTTP/SQLite/fs importai neleido paleisti tikro platformos kelio Workers. Portable backend/{primitives,http-core}.mjs ir thin Node wrapper išlaiko tą patį dispatcher; cloudflare SQL adapteriai riboti šiam pilotui. Local74 ir Workers6 regressions, actual owner/mail/canonical checks PASS. Schema/version/storage tapatybė išlaikyta; kitų nišų platformos automatiškai nemigruotos.

Bendras media policy ištrauktas į image-policy.mjs ir dalinamas Sharp/Cloudflare Images pipeline. Miniflare neorientuoja EXIF kaip actual Images; trys actual cloud fixtures parodė teisingą orientation/alpha/metadata/bounding. Immutable restoreApprovedV2Package validuoja approval/assetSHA prieš kopijavimą ir saugiai tęsia tik exact dalinį restore; studio33PASS. Istoriniai receipts nekinta.

Actual gift client chunks/font404 ir Madbeauty encoded-fontredirect parodė asset precedence/pathdecode spragą. Own release deleguoja chunks/fonts į ASSETS; Madbeauty decoded allowlist ir decoded content guard kartu palaiko validų fontą bei uždaro encoded unpublished bypass. Canonical asset/negative checks PASS.

Direct SMTP šiame Workers/provider derinyje blokuotas. Optional shared public lib/hostinger-transport.mjs naudoja authenticated HTTPS/manualredirect/timeout ir saugius retryable errors; own PHPMailer relay turi bounds/purpose guards/receipts/TLS. Public D1 lease/backoff/retention testai ir core51PASS; abi canonical primaryINBOX PASS. Vieno providerio workaround nėra tinklo default. Mailbox password iš Workers pašalintas.

Būsena: patikrinta actual cloud ir vietiškai, pritaikyta gyvam pilotui; source draftPR8 ir companionPR5, main merge atskiras. Tiksli source versija research/cloudflare-release-20261006/SOURCE_COMMITS.json. Kitos istorinių auditų svetainės šių PASS automatiškai neperima.

## Madbeauty writer perdavimo pagrindas ir SSR priklausomybė —2026-10-08

Runtime3231472. Valdoma freeze kopija privalo sustabdyti ir seną aplikacijos writer: vien naujo JavaScript guard neapsaugo tiesioginio legacy JSON update. Pritaikyti source SQL triggers ir transaction-only mirror permit, actual atskirų SQLite Workers objektų post-insert failure/restart/staging testai. Pirmas Workers bandymas paslėpė trigger po>2MiB SQL binding limitu; pakeistas į tikrą mažą legacy mirror ir abi normalized tiesiogines mutacijas.6focusedPASS; readinessfalse, fizinis authority routing dar neaktyvuotas. Tai site modulio įgyvendinimas, ne shared core migracija.

175suite pirmas run aptiko paslaugų SSR404. Controlled malformed package patvirtino konkrečią priklausomybę: katalogo puslapis prieš jo atvaizdavimą be reikalo skaitė straipsnių paketą ir bendras catch slėpė katalogą. Vietinis app-server dabar katalogui skaito jo patvirtintą pasiūlą savarankiškai. Naujas meaningful server testas ir175pairedPASS; originalaus pavienio cold-start bei parallel fail priežastys lieka nepatvirtintos. Shared core/skills šiame kontroliniame taške nepakeisti; kitų svetainių priėmimui šie PASS neperkeliami.

## Sesijos ir peržiūrimo pasiūlymo klaidos —2026-10-08

Runtimed85cdc7/b7f244f/2e39897. Concurrent expired-session refresh siuntė kelis GET ir laukęs write galėjo naudoti seną CSRF; site adapter barrier dalija vieną refresh, identity pasikeitimą atmeta prieš POST ir uncertain write nekartoja. Operator review nerodė privalomų priedų/fazių, klientui pending-required summary atrodė galutinė bazinė suma; actual form ir meaningful tests pakeisti. Pasibaigus qualification klaidos toast slėpėsi už service dialog: focused inline alert priimtas actual4pločiais, operator renewal atkuria current eligibility.

Fast viewport screenshot loop kartais saugo ankstesnį/intermediate paint, nors DOM skaitiniai matavimai jau nauji. Atitinkami kadrai išlaikyti kaip netinkamas final proof; settled screenshot po atskirų veiksmų visada peržiūrėtas. Tai patirtas local screenshot workflow trūkumas, ne visų naršyklių garantija.182pairedPASS; full matrica ir physical authority routing neužbaigti. Shared core/skills nepakeisti, kitoms svetainėms šių PASS nepriskirti.

## Vieno writer ir jo outbox perdavimas —2026-10-08

Runtime4133849. Vien copy integrity flag nėra write authority: prepare importas vis dar fenced, source atominis seal precedes target activation, old source abort nebegalioja. Node ir actual Workers post-write failure/restart/private retained-hold confirm priimti. Source SQL mail/job guards uždaro seną lease writer; global preferences sutartis explicit guard pagalba nesusilpninta. Node SQLite object prototypes ir held accountId laukas pirmoje versijoje sukėlė actual test failure; cache protocol normalizuojamas per tikrą JSON transporto ribą.

Epoch replacement leidžiamas tik su signed abort ir prepared target, jo transactional discard failure priimtas realiame SQLite Workers. Active kopijos niekada nepakeičia senas checkpoint/abort.187pairedPASS; public routing/global state/mail/media admission dar nėra priimtas. Tai Madbeauty site kontraktas, ne shared core migracijos ar kitų nišų garantija.


## 2026-10-08 · directory routing and accepted HTTP do not imply all role entry points

Runtime7e9bb96,194/194 regression-52. Actual two-store browser revealed that a global unsupported-workspace guard also rejected the source org of a mixed migrated/unmigrated owner. Removed that blanket guard after resolving the actual organization; retained source route still runs original membership/permission checks, sealed routes never fall back. Node and actual Workers now cover both orgs, and browser retry/switch/calendar matches the same target booking ID after restart. First failure screenshot retained.

A forced post-OTP role lookup outage also exposed a committed-session/new-cookie ordering risk; secure cookie is now returned even with later lookup error, and next GET recovers the actual session. No OTP values/logs/artifacts entered Git. Async SSR waits current public projection and keeps assets/private shells independent of calendar outage. Shared rpc-contract avoids different browser/target calling conventions. Domain-specific helpers remain in Madbeauty own modules; no unrelated shared/writer files changed.

Remaining cache identity/preferences/taxonomy/name, mail/media activation and full UI states stay ACTIVE. A successful existing-client booking alone cannot mark new-client/provider onboarding accepted after physical handoff. No partial production deployment inferred from the conditional full-upgrade authorization.


###198 / fresh identity ir cache manifest suderinamumas

Actual test naujas OTP account turi blank name; name reikalavimas cache admission būtų blokavęs patį pirmą hold. Target cache priima blank global name, confirm išlieka name validation. directory-cache-retest2.log24PASS ir actual first new browser confirmation. Source taxonomy archive pradėjo saugoti taxonomyVersion, kurio handoff snapshot manifest dar neturėjo; original partial writer atmetė exact manifest pasikeitimą. directory-cache-retest.log išsaugo SERVER_ERROR. Tik private cache writer leidžia pridėti dvi žinomas taxonomy collections, išlaikant visus kitus manifest/foreign/global scope guards; directory-cache-bounds-first.log9PASS patvirtina exact bytes/records >1MiB, public archive/restore current projection ir capability/account/mail rollback. Bendrų core failų šiame taške nereikėjo keisti. Production transfer/SMTP nuo isolated rezultato atskirti.
