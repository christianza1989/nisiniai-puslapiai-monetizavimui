# Bendra visų svetainių turinio sistema

2026-10-05. Vienas workflow visoms nišoms pagal siteId, įskaitant Madbeauty. Viešos V1/V2 schemos, publikavimo filtrai ir medijos importas nekopijuojami kiekvienai svetainei.

## Veikiantis kelias

1. Nišos BUSINESS, faktai, URL inventorius ir tikros funkcijos → niche-content-planner tyrimas ir sezoniniai briefai.
2. `contentPolicy`: months (1–12), cadence (monthly arba weekly), articlesPerMonth (1–12) arba articlesPerWeek (1–7), localTime (HH:mm), timezone (IANA). Senam mėnesiniam policy suderinamumas: 6 mėn. × 2 straipsniai/mėn. 10:00; tai nėra visų nišų SEO rekomendacija. Savininko nurodytas dažnis turi pirmenybę prieš default. Madbeauty tikslas: 3 straipsniai/sav., leidžiant pagrįstai palikti tik 2, kai nėra trečios naudingos temos. Savaitiniame režime tikslas skaičiuojamas pagal realias intervalo datas, paliekant 7 kalendorines pasiruošimo dienas; datos išdėstomos per savaites, jau suplanuoti gidai įskaičiuojami į tos kalendorinės savaitės ribą. Agentas pagrindžia dažnį pagal naudingų klausimų kiekį. Esamų datų policy pakeitimas neperrašo. Laikrodis perskaičiuoja DST; neegzistuojančio/dviprasmio laiko nesirenka tyliai.
3. V1 CLI planuoja partijomis iki 24 URL ir rengia juodraščius. Autopilot apdoroja kelias partijas, sustoja nesant pažangos ar esant draft klaidai ir rodo likutį. V2 tekstinis generatorius dar išjungtas; rich turinys įkeliamas / redaguojamas lossless. V1/V2 peržiūra, partijos patvirtinimas ir release bendri.
4. Agentas sugeneruoja ir peržiūri actual vaizdus su built-in ImageGen, importuoja MEDIA_CORE ir priskiria variantų šeimą. Tekstinis CLI savaime nevykdo built-in ImageGen. GUI ImageGen API yra atskiras API-key režimas.
5. `finalizeInternalLinks` perkelia pagrįstus žinomų tos pačios nišos puslapių ryšių pasiūlymus į juodraščio `links`. Neprideda all-to-all ir nekeičia patvirtinto snapshot. Ryšiai su nerengiamu/atšauktu puslapiu atidedami arba pataisomi. Vėlesnis tikslo approval savaime neperrašo jau paskelbto straipsnio.
6. Agentas perskaito galutinį tekstą, šaltinius, actual media ir rendered puslapį. `recordEditorialReview` išsaugo konkrečius usefulness/facts/sources/media/links/presentation paaiškinimus, susietus su tikslia revizija, svetainės faktais/kontaktais ir ryšiais. Tai agento įrodymų žurnalas, ne automatinis tiesos ar 10/10 sertifikatas. Negalima įrašyti atliktos patikros prieš ją atliekant.
7. `approveReviewedBatch` tikrina peržiūras, faktų pastabas, šaltinius, straipsnių vaizdus/failus ir ryšių priklausomybes. Tarpusavyje susietas publikacijas patvirtina vienu atominiu įrašu; klaidos atveju neišsaugo dalies partijos. Tarpdomeninės nuorodos turi ir NETWORK_LINKING realaus deployment / HTTPS vartus.
8. `releaseContent` iš to paties site snapshot sukuria atskirą release katalogą ir privatų manifest: paketo/medijos SHA-256, page IDs/revizijos/datos ir review. Būsena **exported-not-deployed**. Nereikia kiekvienos nišos eksportuotojo ar rankinių approval hash.
9. Agentas patikrina/importuoja public paketą į bendrą variklį, atlieka izoliuotą build/HTML/SEO patikrą. Tikras deployment turi atskirą priėmimą. Jau įdiegta patvirtinta revizija tampa vieša po `publishAt` užklausos metu be cron; sitemap/schema/LLM/nuorodos turi tą patį tinkamumą. Google indeksavimo laikas yra atskiras.

## GUI ir agento sąsaja

Kiekvienos svetainės **Turinio eiga** rodo parametrus, datas, ryšius, aktualią peržiūrą ir konkrečias kliūtis. Kalendorius / privatus draft preview bendri. Savininkui nereikia pildyti kalendoriaus ar review pastabų.

Privati loopback API su esamais Host/origin/X-Studio-Request vartais:

| Veiksmas | API |
|---|---|
| Būsena ir revizijų hash | GET `/api/sites/<siteId>/workflow` |
| Policy ir workflow įjungimas | PUT `/api/sites/<siteId>` su `contentPolicy` |
| Užbaigti pasirinktus ryšius | POST `/api/sites/<siteId>/finalize-links`, `{pageIds}` |
| Agentų review | POST `/api/sites/<siteId>/pages/<pageId>/review`, `{reviewer, revisionHash, evidence}` |
| Atominis patvirtinimas | POST `/api/sites/<siteId>/approve-reviewed`, `{pageIds, actorId}` |
| Release | POST `/api/sites/<siteId>/release` |

Agento CLI: `node content-studio/scripts/content-workflow.mjs <status|policy|finalize|review|approve|release> <siteId> [JSON-file] [pageId]`. Status/release failo nereikia. Policy failas = policy objektas; finalize/approve = pageIds objektas; review = tikras įrodymų objektas ir paskutinis pageId argumentas. `STUDIO_DATA_DIR` / `STUDIO_OUTPUT_DIR` leidžia izoliuotus testus. Nekurti fiktyvių review pastabų automatinio pildytojo.

Prieš importą paleisti `node content-studio/scripts/verify-content-release.mjs <release-directory>`: tikrina tikrus paketo/visų media baitus, public validator, puslapių/revizijų inventorių. Kito checkout public core keliui naudoti `STUDIO_PUBLIC_CORE_DIR`. Manifestą laikyti privačiai; SHA sutapimas nėra atliktos šaltinių patikros ar deployment įrodymas.

## Migracija ir adapteriai

- V1 plan/draft/autopilot įjungia `contentWorkflowVersion=1` ir policy prieš generavimą. Galima įjungti anksčiau per policy API/CLI. Tuomet ir senas individualaus approval / export API nebegali apeiti aktualios peržiūros. Senos įdiegtos revizijos savaime neperrašomos.
- Esamos neįjungtos svetainės yra legacy (workflowVersion=0). Istorinių approval/audito/skill fingerprint nekeisti. Naujam release peržiūrėti visus į paketą patenkančius puslapius. Naujas core nėra visų senų nišų atliktos migracijos ar naujo A–Z audito įrodymas.
- Naujam domenui taikyti šį workflow nuo pirmo paketo. Per-site adapteris registruoja tikrus page/service/catalog IDs, canonical URL, public eligibility ir CTA į veikiančią funkciją. Dizainas savitas; laikrodis/paketai/review/publikavimas bendri. Madbeauty katalogo adapteris dar įgyvendinamas.
- V2 actual-host admission receipt išlieka; release manifest nėra jo pakaitalas. Demo exclusion, SMTP-INBOX, DNS, paklausa ir rankings nėra lokalaus release įrodymai.
- Review manifest privatus; į viešą rendererį importuojami tik content-package ir assets, ne privačios patikros pastabos.

## Nepriklausomo projekto turinio adapteris — 2026-10-06

Savininko pasirinktas atskiras Next.js/Vercel ar kitas projektas gali naudoti tik studijos turinį. Tai nereikalauja jo homepage, hostingą, paskyras ar verslo runtime perkelti į nišų variklį. `createSite` leidžia optional stabilų `siteId`; jo nenurodžius lieka esamas domeno ID. Host pakeitimas nėra tyliai palaikoma migracija.

Po įprastos review/approval/release vykdyti `node content-studio/scripts/export-external-content.mjs <release-directory> <NEW-bundle-directory> <siteId> <canonical-host>`. Helper tikrina esamą release, išsaugo exact approved baitus, optimizuotus assets ir dependency-complete common validator/projection/media SDK; privatus review lieka studijoje. Bundle yra eksportas, ne deployment. Importeriui būtinas trusted/pinned SDK šaltinis: upload pateikti SHA vieni kodo neautentifikuoja. Negalima atsinešti naujo approval hash ar publikavimo predikato.

Target adapterio article/index/nuorodos/sitemap/schema/LLM/medija naudoja tą patį request-time eligibility ir host. Future/draft tekstas bei vaizdai neprieinami anonimiškai; SSR/cache tikrinami realiu prieš/po datos HTTP testu. V1 adapteris V2 aiškiai atmeta iki rich rendererio priėmimo. Konteksto home anchor neperrašo target homepage. Naujo bundle importas/deploy yra atskiras žingsnis; vietinė studija kompiuteriui neveikiant nėra hosted generatorius. [Superiora actual perdavimo pavyzdys](research/ai-teacher-content-integration-2026-10-06/CONTENT-BRIDGE.md).

## Priėmimas

### Aiški domeno migracija

Įprastas `editSite` hostname nekeičia. Patvirtintai domeno migracijai naudoti modelio `migrateSiteDomain(siteId, {expectedCanonicalHost, canonicalHost, actorId})`: bendras cross-process write lock tikrina aktualų seną host ir naujo host unikalumą. Stable siteId, puslapių ID, turinys, media, links ir publishAt išlieka; senos publishedRevision/review ir immutable release failai neperrašomi. V2 atnaujina tik dabartinio draft siteSnapshot. Privačiame site įraše saugoma domainMigrations istorija; revoked puslapiai neaktyvuojami.

Pakeistas host panaikina ankstesnės review konteksto aktualumą; įjungtas workflow neleidžia release/export iki naujos tikros visų eksportuojamų puslapių review ir atomic approval. Peržiūrėti seną domeną tekste, absolute nuorodose bei privačiuose faktuose; ID nuorodos resolverio naujame host tikrinamos atskirai. Nekeičiama istorinė publikavimo data vien dėl host pokyčio ir ranka netaisomi approval hash ar paketų baitai. Naujas immutable export dar nėra DNS/TLS/deployment/auth-origin/redirect priėmimas. Ši funkcija yra explicit agento modelio API; GUI domain picker ar automatinės migracijos job nepridėta.

`content-workflow.test.mjs`: dviejų nišų izoliacija, DST, atominė susietų draftų partija, prieš/po datos nuorodos, stale review po turinio/faktų pokyčių, missing/foreign/revoked targets, vaizdų/šaltinių vartai, V2 lossless ir privati HTTP sąsaja. `generator-policy.test.mjs`: 27 straipsniai per kelias tikro CLI proceso fixture partijas, datos ir visi juodraščiai privatūs. Fixture nėra live Codex tyrimo ar kokybės įrodymas.

Paleisti studijos `npm test` ir public core `npm run test:core`. Viešo adapterio/SEO keitimas papildomai reikalauja actual `test:seo-smoke` ir prieš/po datos HTTP bandymo savo izoliuotoje peržiūroje. Šis inkrementas viešo rendererio ir schemos nekeičia.

## Savaitinės kadencijos patikslinimas — 2026-10-05

Savininkas Madbeauty numatė 2–3/sav.; anksčiau jo įrašas paveldėjo bendrą2/mėn. Tai nebuvo individuali SEO strategija. Weekly API/GUI/generatorius naudoja tikrą articlesPerWeek, ne apytikslį mėnesinį daugiklį. 2026-10-05 šešių mėnesių3/sav. politika turi76 suplanuojamus slotus iki2027-04-05 po7dienų pasiruošimo. Tai tikslas, ne jau parašyti/peržiūrėti tekstai. Esamos datos ir kitų nišų policy nekeičiamas. Kiekvienam URL reikia atskiro naudingo atsakymo ir atitinkamo tikro CTA; metrika sprendžia plėtrą. [Google people-first gairės](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) nerekomenduoja didinti kiekio vien dėl numanomo „šviežumo“.
