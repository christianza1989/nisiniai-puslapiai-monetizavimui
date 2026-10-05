# M1 v2 adapterio sutartis

2026-10-04. Įgyvendinimo kontraktas; v2 aktyvus host cutover dar užrakintas. Fixture `content-package.v2.fixture.json` yra izoliuotas testas, ne realus Dovanos123 turinys.

Schema: `content-studio/schemas/content-package.v2.schema.json`, identiška public repo `schemas/content-package.v2.schema.json`. V1 schema failas ir hash nepakeisti. V2 helper: `content-studio/src/content-package-v2.mjs`, identiškas public `scripts/content-package-v2.mjs`.

## Studijos API

`createSite({canonicalHost:'dovanos123.lt', name, offer, schemaVersion:2, renderer:'gift'})`. Kontaktai ir operatorius pagal actual config, tada `editSite(siteId,{facts,contact,...})` su tikrais šio site faktais. Agentas nekuria fiktyvių rekvizitų. Naujo v2 site negalima užkurti perrašant esamos v1 nišos JSON.

`addPage(siteId,{id:<stabilus legacy ID>,type,slug,title,description,intent,publishAt,body,editorial})`. ID turi `[a-zA-Z0-9._-]`, iki100; slugo ≤150, canonical-safe lower-case segmentai. Nesuderinamas legacy ID/URL lieka inventorine išimtimi ir dokumentuotu mapping, ne tyliai pakeičiamas. Tipai: visi v1 + article/index/author/policy/about/contact. ID nėra UUID reikalavimas.

`editPage` išsaugo v2 body/editorial be flatten/truncate. `approvePage` tikrina faktus ir kuria immutable `publishedRevision`. V2 guide/article turi tikrą author snapshot. Išspręsti factChecks prieš approval; senas published/scheduled nėra approval. `revokePage` pašalina publishedRevision; source snapshot nekeičiamas atgaline data.

`packageForSite` / `exportPackage` parenka schemaVersion2 tik naujam v2 site. Viešas siteSnapshot įtrauktas į kiekvieno page hash. Jo kontaktams/operatoriui/offer/brand pasikeitus seni approval neeksportuojami su naujais faktais: būtina peržiūrėti ir reapprove. V1 eksportas neturi šių naujų laukų.

## Turinio laukai

Papildomi v2 page laukai: contentVersion:2, editorial, siteSnapshot. Stubą su siteSnapshot ir media/links sukuria studija; importer naudodamas modelio API jo nesuklastoja. hash `revisionHash(page)` ir public `pageRevisionHash(page)` v2 atveju delegate į tą pačią `v2RevisionHash`; payload yra eksplicitinis ID/site/contentVersion + visi public turinio/datos/media/links/external/editorial/siteSnapshot laukai.

`editorial` required snapshot: category string, readingMinutes integer, authors[], sources[], datePublished nullable UTC, dateModified nullable UTC, productRecommendation boolean, featuredImageId nullable asset ID, relatedPageIds[], commerceTargets[]. Nėra fake datePublished: nežinoma data null. approvedAt nėra dateModified. `sources[].accessedAt` UTC; public snapshot leidžia tik public:true šaltinius. public:false ir metodologinius šaltinius saugoti privačiame migracijos inventoriuje, ne atvirame eksporte. Commerce snapshot turi id/url/label/relationship/verified/checkedAt nullable; verified reikalauja tikros checkedAt. Tai nėra M3 commerce runtime readiness ar veikiančio checkout įrodymas.

Author: id, siteId, locale, slug, name, role, bio, kind(person/organization), sameAs[]. Ta pati site/locale. Jei nėra tikro eksperto, naudojama tikra organizacijos redakcija su faktiniu aprašu, ne fiktyvus žmogus.

V1 paragraph/heading/list/image leidžiami ir v2. Nauji:

```json
{"type":"richParagraph","content":[{"type":"text","text":"Tekstas "},{"type":"link","text":"gidas","target":{"kind":"page","pageId":"stable-id"}}]}
```

richHeading turi level2/3 ir content; richList turi ordered boolean ir items (inline masyvų masyvas). Inline text iki12000, label iki1000, max500 nodes/block; viršijimas atmetamas, niekas netrumpinama. 1000 blocks/page. Tekstas ir pasikartojančios nuorodos išsaugo konkrečią seką.

Target variantai: page/pageId, external/url, network/siteId/pageId, commerce/targetId. URL tik HTTPS be portų/kredencialų. Network target nėra savavališkas href. M2 viešas resolveris turi paslėpti missing/future/revoked/deployment-unready target ir palikti label. Žalias v2 paketas dar nėra saugi vieša render projekcija. V2 package cross-reference validator reikalauja, kad same-site page ir related IDs būtų eksportuojamame patvirtintame inventoriuje; neeksportuojamus legacy target inventorinti ir prieš approval paversti plain text arba pašalinti tik related ryšį su loss report.

## Medija ir staging

Importuoti tikrais bytes per bendrą saveResponsiveAsset/import-image pipeline, suteikti naują šio site asset ID; originalių URL→WebP šeimų mapping laikyti M0. `editPage({media:[{id:familyMemberId}],editorial:{...featuredImageId}})` priskiria visą variantų šeimą. Jei legacy guide neturi peržiūrėto temos vaizdo, tai audito spraga, ne paketo migracijos PASS. Naudoti tą pačią privatų originalą saugančią MEDIA_CORE; naujo optimizer nėra.

`node public/scripts/import-content-package.mjs <export-dir> --shadow [--replace]` rašo tik `public/content-staging/<siteId>/`. Nerašo compiled registry ar public assets. Įprastas v2 import ir aktyvus compiler v2 kol kas atmetami. Nepašalinti šių vartų vien dėl M1 sėkmės; jie bus pakeisti koordinuotame M2/M5 routing lange.

## Priėmimas

Abiejų schema/helper kopijų equality, v1 golden hashes, editorial/inline/contact mutations, private-source/cross-site/unsafe URL/date reject, immutable old approval, UTC round trip ir actual isolated import/compiler CLI tikrinami `content-studio/test/content-v2.test.mjs`. Papildomas HTTP/GUI peržiūros bandymas reikalingas prieš M1 uždarymą. Šis dokumentas nėra gift turinio redakcinis approval, M2 acceptance ar live paleidimo įrodymas.
