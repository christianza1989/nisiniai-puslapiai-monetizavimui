# Madbeauty — V3 patirtos platformos pamokos

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

## Pilna temų aprėptis ir planavimo skill — 2026-10-06

Patirta spraga: kalendoriaus savaitinė kvota ir pradinis nagų pilotas buvo palaikyti pilnos platformos turinio apimtimi. Pirmas platesnis planas apėmė 10 veikiančių kategorijų, bet dar ne visus vartotojo klausimus; savininko vėliau pateiktas 225 procedūrų katalogas dar kartą praplėtė ribas. Straipsnių suma ir vien kiekvienos kategorijos paminėjimas nėra pilno naudingo atsakymo įrodymas.

Pritaikytas bendras source: TOPICAL_CONTENT_CORE, AGENTS/CONTENT_CORE/SEO_GEO pointeriai ir niche-content-planner entry/references reikalauja iš karto pilno apibrėžtos nišos klausimų/URL/skyrių žemėlapio, ankstesnių ketinimų sutikrinimo, individualios struktūros, originalios naudos, faktiškų šaltinių, datų, priklausomybių ir kontekstinių nuorodų. Default coverage neturi savaitinės/mėnesinės kvotos ar vieno straipsnio per dieną ribos; vartai ir esami approved bytes/datos nekinta. Neužpildytas coverageTarget null ir neįkeltas pilnas map neužpildomi autopiloto išgalvotomis temomis. Legacy kalendoriai suderinami, pasirenkamo dažnio senas uppercap pašalintas.

Katalogo pamoka įrašyta į bendrą skill: turinio klasteris nėra platformos taxonomy ID, procedūra nėra teikėjo variantas. Planavimo CTA turi remtis autoritetingais ID ir actual bendru resolveriu. Bendras vietinis gidas bei pasirinktas miestas turi skirtingą kelią; dovanų nišai nėra privalomo procedūra–miestas šablono. Jei plan/schema/import neperneša ID, integracija dar nepriimta. Source gali būti parengtas, bet būsimas route netampa live href ar Google rezultatu. Dovanos123 sesijai metodika perduota savininko autorizuotu pranešimu; Madbeauty platformos sesija kuria atskirą adapterį savo srityje.

Ši source patikra nepriima neparašytų straipsnių, neegzistuojančių vaizdų, ekspertų review, viso naujo 225 procedūrų turinio plano ar gyvo diegimo. Aktualus pakeitimas PR10; istoriniai instruction fingerprint nekoreguojami atgaline data.

## Tikslūs puslapių ID generavimo schemoje — 2026-10-07

Patirtas bendras defektas: penki tikri Luna/xhigh juodraščiai buvo atmesti nepakeisto native V2 validatoriaus. Keturi makiažo juodraščiai pakeitė pilno žemėlapio šakninio puslapio UUID; nagų dizaino juodraštis bandė įterpti dar nepatvirtinto puslapio nuorodą tekste. Klaidos ir originalūs CLI rezultatų SHA lieka privačiame generavimo žurnale, neperrašyti kaip PASS.

Pataisyta priežastis: bendras bindV2DraftSchema helperis apriboja privačią vieno darbo CLI schemą tik tikrais tos svetainės ID. Pasiūlymams leidžiami esami neatšaukti svetimi puslapiai; teksto nuorodoms leidžiamos tik esamos patvirtintos versijos. Savęs ir atšauktų puslapių nėra sąrašuose; kai nėra tikslo, atitinkamas kelias negeneruojamas. Darbo kvite išsaugomas tikros privačios schemos SHA. Vieša V2 sutartis, paskesnis tikslus validatorius, faktų, medijos, peržiūros ir datos vartai nepakeisti.

Source: content-studio/src/draft-v2.mjs ir generator.mjs, regresija test/draft-v2.test.mjs, PR10. Tikri native individualaus / batch / explicit revision CLI integracijos testai tikrina, kad vykdomam procesui perduodama konkreti schema; bendras studijos rinkinys60/60 PASS. Pirmi du realūs atmestų straipsnių pakartojimai priimti su nauja schema ir tuo pačiu Luna/xhigh, be fallback. Ši pataisa nepatvirtina jų faktų ar publikavimo: straipsniai lieka juodraščiai iki atskiros redakcinės peržiūros ir leidimo.
