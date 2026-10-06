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
