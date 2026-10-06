# Namudarbas.lt turinio migracija — 2026-10-06

Autorizuota AI_teacher sesija perdavė naują tiesioginį savininko domeno įsigijimo ir prijungimo pavedimą. Tai nepriklausomo Next.js/Vercel projekto turinio host pakeitimas; Superiora brand, tėvų/pedagogikos režimas ir mokinių runtime į bendrą core neperkeliami. Domeno pasirinkimas nėra autoriteto, mokymo veiksmingumo ar paklausos įrodymas.

## Naujas realus paketas

- Stable siteId: `mokytoja-ai`; naujas canonicalHost: `namudarbas.lt`.
- Actual review: `2026-10-06T20:16:38.613Z` (23:16 Europe/Vilnius).
- Release: `74f02cd6-7c59-4514-bfc9-c4333e1f34d2`.
- Package SHA-256: `3123ddf8d24b2e9354606e092eebc36a31361e1d99d86da2c9278d98259f77c9`.
- Bundle ID: `e5f24da0037cd130c458a250212d538ae0da3306a025a65896356cd10a931315`.
- Vietinis perduotas kelias: `research/ai-teacher-content-integration-2026-10-06/bundle-74f02cd6-7c59-4514-bfc9-c4333e1f34d2/`; raw bundle, script ir private manifest į Git nekeliami.
- 4 puslapiai (home anchor ir 3 gidai), 15 WebP, 6 trusted SDK failai.

Root patikrino dabartinius visų keturių puslapių ID, type, slug, title, description, intent, visą body, original publishAt, media, internal IDs ir external URL/label/reason prieš keisdamas svetainės kontekstą. Jie atitinka ankstesnį gyvai priimtą `26de29d9` paketą; nenukreipia absolute self-links į seną host. Naujo paketo viešo material palyginimas išliko toks pats. PublishAt `2026-10-06T18:30:00.000Z` išsaugotas, neperstumtas į migracijos laiką. Visų 15 medijos failų ir 6 SDK hash/bytes inventorius exact ankstesniam receipt. Istorinio paketo `99ee288d...88a8` baitai po migracijos nepakito.

Naudotas bendras `migrateSiteDomain` su explicit expected-old-host ir atsakingu actor, tada sąžiningai patikslinti privatūs faktai, atlikta naujo host konteksto šešių sričių review, atomic approve 4 ir immutable release/export. V1 page hash dėl paties site host pokyčio gali likti toks pats: šio schema hash apima page payload, o review.binding atskirai apima canonical/site kontekstą; jokio rankinio hash pakeitimo nedaryta. Istorinė review/paketo/deployment dokumentacija lieka.

## Bendro modelio spraga ir pataisa

Įprastas editSite host keitimą draudė; sukurti antrą siteId ar perrašyti studijos JSON būtų neteisinga. Rezervacija [Git issue15](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/15); scope tik model API, 2 izoliuoti testai ir šios/bendros instrukcijos. Host pasikeitimas vyksta per tą patį cross-process lock, unique-host ir expected-old-host vartus. Ankstesnė review nebegalioja; release/export/approval užblokuoti iki naujos review. Stable IDs, kontaktai, datos, turinys, senos approved snapshots ir release išsaugoti; V2 keičia tik draft snapshot, revoked puslapiai lieka revoked. Schema/projekcija/SDK/renderer ir kitų nišų faktai nepakeisti.

Final clean-checkout studio `npm test`: **38/38 PASS**, 15.003 s. Naujo isolated fixture pirmi trys paleidimai nepraėjo dėl neinitialize katalogo, nepakankamų fixture faktų/intent ir per trumpo fixture body; pataisytas tik test setup, approval vartai nesusilpninti. Prieš tikros svetainės mutaciją pirmas comparison nepraėjo dėl omitted empty externalLinks prieš draft []; comparison normalizuotas pagal viešą V1 external payload (URL/label/reason), actual verified flags patikrinti atskirai. Pirmas tikras bandymas nieko nepakeitė; final assertions PASS.

## Kas dar priklauso svetainei

Šio kvito būsena **exported-not-deployed**. AI_teacher sesija valdo target verify/import, canonical env, Vercel/Hostinger DNS ir TLS, seno alias migracijos/redirects, auth allowed origins, QR bei tikrus new-host HTTP/canonical/schema/sitemap testus. Ji pranešė savo domain-config full QA 1424 PASS; root šio rinkinio nekartojo ir nepaverčia jo naujo domeno live PASS. Hostinger domains/dns įrankių įjungimas kitai sesijai pareikalavo Codex restart; root DNS, NS/MX, live deployment, vartotojų sesijų ar mokamų paslaugų neveikė.

Papildomai pagal CONTENT_CORE sutartį companion npm run test:core49/49PASS (2.937s), public core failai nepakeisti. Target sesija gavo exact bundle/hash ir patvirtino kvito priėmimą savo DOMAIN_CONFIGURATION_FIX ataskaitoje; actual target verify-only/import/DNS/deploy lieka pending jos kitam prisijungimui.

## Faktinė migracija ir parent peržiūra — 2026-10-07 Europe/Vilnius

Ankstesnis exported-not-deployed kvitas aukščiau yra istorija. Target sesija aktyvavo e5f24da0037cd130c458a250212d538ae0da3306a025a65896356cd10a931315, deployment dpl_5z5pQis285h49SXjM5aEQrGbCpVN, adresas https://namudarbas.lt. Source reports/namudarbas-domain-acceptance-2026-10-07.json actual21:29:48.831Z (00:29:48 Vilnius) turi9PASS: TLS/public/3articlecanonical/originaldates/15exactWebP/discovery/privatefiles404/2redirects/loginrequirement.

Root nepriklausoma read-only HTTPS atranka21:32:15.332Z (00:32:15 Vilnius)10/10PASS: homepage ir3gidai200 bei naujasis canonical, trijų Article original datePublished18:30Z, sitemapXML/llms/robots200 ir nauji URL, www bei senas mokytoja-ai.vercel.app308 su exact path/query, vienas tikras approvedWebP200/MIME/exactSHA. Nei root, nei ši atranka nekūrė paskyrų/sesijų/provider calls ir nekartojo source pilno QA. Private raw JSON namudarbas-root-live-20261007.json lokalus; į Git tik šis atrinktas priedas. Pirma root checker ataskaita nepraėjo tik dėl semantiškai tapačių homepage origin adresų su/be slash; normalizeURL pataisymas nekeitė svetainės, pirminisFAILkvitas išsaugotas.

Source namudarbas-auth-qr-smoke-2026-10-07.json18/18PASS apima register/login/family state/host-only Secure HttpOnly Strict cookie/serverrevocation/logout ir QRcreate/task+attemptupload/parentexactdownload/anonDenied/delete/deletedDenied/neworigin. Root perskaitė atskirus kriterijus ir cleanupPASS, bet pats neregistravo šeimų. Pirmo smoke infrastruktūros FAIL ir esamų versioned0003/0004 DBmigrations pritaikymo įrodymai source išsaugoti; tai nėra naujas programos kodas. Tik šio QA dvi sintetinės šeimos source scoped išvalytos, auditas išsaugotas.

Domeno migracijos public/content/password-auth/QR vartas pagal šiuos įrodymus priimtas. OAuthcallback/passkey/emaildelivery taikomumas ir likę mokinių/tiekėjo/pedagogikos/privacy/performance platformos vartai vertinami atskirai; šis rezultatas nepaleidžia tikrų vaikų piloto ar periodinio turinio generatoriaus. Naujas domenas nėra Google indeksavimo/reitingų/GSCproperty priėmimo įrodymas. Source sesijai perduota atnaujinti senus pending/no-domain status tekstus ir aiškiai pažymėti neaktyvių papildomų auth funkcijų NA. Root AI_teacher source/DNS/env/deploy/db nekeičia; bendro turinio migracijos kodas jau main per PR16.
