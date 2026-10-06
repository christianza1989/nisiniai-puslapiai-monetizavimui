# AI mokytojo svetainė ir turinio perdavimas

2026-10-06. Savininko aktualus pavedimas: užbaigti atskirą AI_teacher Next.js/Vercel svetainę. Į nišų sistemos rendererį, hostingą ar verslo runtime jos neperkelti. Bendra content-studio tik planuoja, generuoja, peržiūri ir perduoda straipsnius. Savininko anksčiau užsakytos platformos funkcinė apimtis lieka jos aktualiame roadmap, ne bendros F1 domeno užduoties ribose.

## Atsakomybės

- Sesija `01a0e6f0-f346-7b50-9c57-4edc805c917a`: visi AI_teacher UI/backend/SEO/adapterio failai ir jo AGENTS reikalaujamas integruotas QA. Mokytojos ir šeimų runtime nekeisti vien dėl straipsnių prijungimo.
- Root: šis katalogas, nauji `content-studio/src/external-content-export.mjs`, `scripts/export-external-content.mjs` ir jų testas; sutarta maža `createSite` pataisa leidžia optional stabilų `siteId` ir jam tinkamą kontaktą. Root vienas valdo šio site studijos įrašą, gidus, mediją ir release. Schema, publisher, kitos nišos ir public registry nekeičiami.
- Brand Superiora pagal aktualų savininko pasirinkimą toje sesijoje; stable siteId `mokytoja-ai`. Pradiniam bandymui canonical host `mokytoja-ai.vercel.app`; superiora.lt pasirinkimas nėra įsigijimo ar DNS įrodymas. Nepervadinti į namudarbas.lt pagal ankstesnį neapsisprendimą.

## Viena turinio eiga

Naudoti [CONTENT_CORE](../../CONTENT_CORE.md) ir [MEDIA_CORE](../../MEDIA_CORE.md). Šios sistemos importas nesuteikia AI mokytojo vaiko/saugos/piloto vartų PASS. Publikuojamas turinys neturi studentų, šeimų, nuotraukų ar kalibravimo transkriptų. Straipsnių dažnis parenkamas pagal naudingus klausimus ir savininko tikslą, o ne dėl SEO kiekio. Ši užduotis nėra jau sugeneruotas pusmečio kalendorius.

1. Studijoje atskiras mokytoja-ai įrašas su tikrais patvirtintais viešais faktais, tikro produkto ribomis, kontaktais ir contentPolicy.
2. Planas -> juodraščiai -> ImageGen ir bendras responsive WebP importas -> actual teksto, šaltinių, vaizdų, nuorodų bei rendered turinio review.
3. Bendras atominis approve-reviewed ir release. Nei agentas, nei adapteris ranka nekuria approval hash. Senų PASS/fingerprint nepakeičia naujais įrodymais.
4. `export-external-content.mjs` patikrina esamą release ir paruošia **naują** immutable perdavimo katalogą. Esamą katalogą pakeisti draudžiama. Tai eksportas, ne importas ir ne deployment.
5. AI_teacher savo importeris patikrina numatytą siteId/host, visus SHA, inventorių, ribotus kelius ir aktualią viešo paketo schemą. Visas naujas snapshot priimamas atominiu būdu, senas išlieka iki visų patikrų. Vercel read-only filesystem nėra upload DB.
6. Next serverinės užklausos skaito priimtą paketą ir bendrą publikavimo projekciją: straipsnis/indeksas/susijusios bei tekstinės nuorodos/schema/sitemap/medija taiko tą patį publishAt ir approval. Draft preview autentifikuotas, noindex/no-store. Viešas draft/ateities URL -> 404; privatūs raw JSON/receipt/SDK/review negrąžinami per HTTP.
7. Jau įdiegtam turiniui datos slenkstį vykdo SSR su tinkama Next cache politika; vienkartinio statinio buildo neužtenka. Indeksavimo laikas atskiras. Naujas release vis tiek turi būti importuotas ir įdiegtas. Lokalaus Codex/studio nebuvimas kompiuteryje nesukuria nuolat veikiančio hosted generatoriaus.

## Actual eksportuojama struktūra

```text
<NEW-bundle-directory>/
  content-package.json                 # originalūs patvirtinti baitai, hash nekeičiamas
  assets/*.webp|*.avif                  # tik manifeste įvardyti optimizuoti failai
  external-content-receipt.json         # transporto inventorius, be privačių review
  sdk/scripts/content-package-core.mjs
  sdk/scripts/content-package-v2.mjs
  sdk/schemas/content-package.v2.schema.json
  sdk/lib/niche-links.mjs
  sdk/lib/content-projection-v2.mjs
  sdk/lib/niche-media.mjs
```

SDK yra tiksliai kopijuotos bendros validator/hash/projection/media funkcijos su išsaugotais relative imports ir kiekvieno source SHA, ne antras rendereris ar nauja publikavimo taisyklė. V1 projekcija `projectPublicPages`; V2 turi atskirą common rich projekciją. Pirmas AI_teacher adapteris V1; V2 aiškiai atmetamas iki tikro rich rendering/QA. SDK kodo atnaujinimas yra kodo review, ne nekontroliuojamas vykdomų failų upload: importeris turi patikrinti patikimą SDK versiją/allowlist prieš vykdymą. JSON receipt pats savęs neautentifikuoja.

Transporto receipt: version1, kind external-content-bundle, siteId, canonicalHost, schemaVersion, createdAt, packageSha256, assets[{name,sha256,bytes}], sdk[{path,sha256}], pages[{pageId,revisionHash,publishAt}], bundleId ir state exported-not-imported-not-deployed. Bundle ID = SHA-256 nuo JSON.stringify({packageSha256,assets,sdk}) šia laukų tvarka. Receipt įrašomas tik po visų failų. Paketo SHA = tikro content-package.json baitai; approval nėra perskaičiuojamas. Laiko formatas lieka esamos paketo schemos UTC, studija konvertuoja Europe/Vilnius ir DST.

Public paketo home įrašas privalomas konteksto anchor; jo eksportas **neperrašo** Next homepage. Straipsnių slug iškart `mokymosi-gidai/<slug>`, susijusios nuorodos remiasi page ID. Serverinių vaizdų src atitinka originalius paketo kelius; asetus pateikia tik tinkami puslapiai, ne bendras public katalogas su ateities vaizdais. V1 autoriaus/redakcijos faktai yra atskira realių viešų faktų config, V2 typed editorial tik su atskiru priėmimu.

CLI, iš repo root:

```powershell
# Po faktinės studijos review/approval/release:
node content-studio/scripts/export-external-content.mjs <release-directory> <NEW-bundle-directory> mokytoja-ai mokytoja-ai.vercel.app
# Kitame checkout į konkretų patikimą companion:
$env:STUDIO_PUBLIC_CORE_DIR="<absolute-path-to-dovanos-memorycasting>"
```

Privatus originalus release-manifest.json lieka studijoje; nėra studentų, originalių PNG, kredencialų, DB, modelių raktų ar kliento failų eksporto. Contact info@pinet.lt savininko patvirtintas šiame pokalbyje kaip bendras viešas adresas; tikro duomenų valdytojo ir konkretaus produkto teisiniai faktai nustatomi AI_teacher sesijoje.

## Priėmimas, kuris dar turi įvykti AI_teacher

- [x] Tikras mokytoja-ai paketas: trys pilni peržiūrėti gidai, konteksto anchor ir 15 WebP variantų. [Actual peržiūra ir perdavimas](SOURCES-AND-REVIEW.md). Target Next importas ir rendering dar atskiras priėmimas.
- [ ] Realus importas ir rollback; wrong host/site, text/media tamper, missing file, unsafe path ir nepalaikomo V2 atmetimas.
- [ ] Isolated actual HTTP prieš ir tiksliai po datos: article, index, links, sitemap/schema/LLM ir asset. Aiškus Next cache bandymas.
- [ ] Autentifikuotas draft preview/noindex; anonimas negauna būsimų straipsnių ar raw paketo.
- [ ] Pilna viešos svetainės SEO/trust/a11y/design/performance peržiūra ir jos own integruotas QA. Pradinės gairės: [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [AI paieškos gairės](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), peržiūrėta 2026-10-06. Naudingi originalūs atsakymai ir tiesa svarbiau už schema kiekį; llms.txt yra papildomas indeksas, ne Google GEO reikalavimas.
- [ ] Actual Vercel import/deploy ir tikro domeno prijungimas atskirai; vaikų pilotas turi savo esamus išorinius vartus.

Root export testų synthetic adapterio transporto įrodymai nėra AI_teacher svetainės užbaigimo, vaikų saugos, kontaktų pristatymo ar tikro domeno paleidimo patvirtinimas.
