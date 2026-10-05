# Bendra visų svetainių turinio sistema

2026-10-05. Vienas workflow visoms nišoms pagal siteId, įskaitant Madbeauty. Viešos V1/V2 schemos, publikavimo filtrai ir medijos importas nekopijuojami kiekvienai svetainei.

## Veikiantis kelias

1. Nišos BUSINESS, faktai, URL inventorius ir tikros funkcijos → niche-content-planner tyrimas ir sezoniniai briefai.
2. `contentPolicy`: months (1–12), articlesPerMonth (1–12), localTime (HH:mm), timezone (IANA). Numatytai 6 mėn. × 2 straipsniai/mėn. 10:00 svetainės laiko zonoje. Agentas pagrindžia dažnį pagal naudingų klausimų kiekį. Esamų datų policy pakeitimas neperrašo. Laikrodis perskaičiuoja DST; neegzistuojančio/dviprasmio laiko nesirenka tyliai.
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

## Priėmimas

`content-workflow.test.mjs`: dviejų nišų izoliacija, DST, atominė susietų draftų partija, prieš/po datos nuorodos, stale review po turinio/faktų pokyčių, missing/foreign/revoked targets, vaizdų/šaltinių vartai, V2 lossless ir privati HTTP sąsaja. `generator-policy.test.mjs`: 27 straipsniai per kelias tikro CLI proceso fixture partijas, datos ir visi juodraščiai privatūs. Fixture nėra live Codex tyrimo ar kokybės įrodymas.

Paleisti studijos `npm test` ir public core `npm run test:core`. Viešo adapterio/SEO keitimas papildomai reikalauja actual `test:seo-smoke` ir prieš/po datos HTTP bandymo savo izoliuotoje peržiūroje. Šis inkrementas viešo rendererio ir schemos nekeičia.
