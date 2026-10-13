# Madbeauty turinio infrastruktūros publikavimas

2026-10-07 savininko pavedimas kitoje turinio sesijoje: užbaigti reikalingą straipsnių generavimo ir publikavimo kelią. Ši šaka tęsia PR14 foundation. Platesnis 41 užduoties upgrade tebėra PAUSED. Private studio / bendras generatorius priklauso PR10; ši šaka jų ir kitų domenų nekeičia.

## Tikras viešas resolveris

Po šio release: `https://madbeauty.lt/content-targets.json`. `mb:catalog:{taxonomyNodeId}` yra nacionalinis tikslas, `mb:catalog:{taxonomyNodeId}:{cityId}` – tikslios procedūros ir miesto tikslas. Canonical URL be užklausos parametrų, hash ar datos. Naudoti tik naują HTTP registrą: no-store, generatedAt / expiresAt, vienos valandos TTL. Nacionalinis core browse ready reiškia veikiantį pasirinkimą, o ne pasiūlą ar indeksavimą. Local ready reikalinga actual approved pasiūla; empty404, inactive extensions404. Visų katalogo puslapių indexEligiblefalse / noindex ir jų nėra sitemap.

General gidas → nacionalinė procedūra / grupė ir miesto pasirinkimas. Explicit selected city → tikslus vietinis tikslas, jei esama patvirtintos pasiūlos. Nepaversti katalogo URL external source. V2 typed commerce snapshot turi tikslų registro ID / URL, verifiedtrue ir checkedAt po realios tikslinės patikros; approved snapshot nekeisti runtime. Dabartinis fresh registry dar kartą tikrina tikslo readiness, todėl pasiūlos atšaukimas pašalina href.

## Release ir patikra

```powershell
node sites/madbeauty/cloudflare/build.mjs
node --test sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs
node ../dovanos-memorycasting/node_modules/wrangler/bin/wrangler.js deploy --config sites/madbeauty/cloudflare/wrangler.production.json --dry-run
```

Build vartoja common `validateContentPackage` ir `verifyContentRelease`, exact expected SHA, domain/contact admission ir šios nišos production release media/link policy. V1 patvirtinti baitai / approvals nekeičiami. V2 gidui reikalinga reviewed featured 5-WebP šeima iš bendro 360/640/800/1200/iki1600 px optimizatoriaus; katalogo typed ID / URL tikslūs, external source fikcijos atmetamos. Build ruošia švarią assets edition ir `output/content-release-receipt.json`; jokio automatinio approve/deploy.

Autorizuotas deploy: ta pati production konfigūracija, Worker `madbeauty-platform-preview`, DO namespace `2faf96eedef1425c8d4fc07444cde2f3`, class `MadbeautyPlatform`, instance `madbeauty-pilot-v1`. Jokios naujos migracijos, secrets, mail/DNS ar private studio duomenų keitimo. Pinned Wrangler4.92.0. Esama compatibility date / flags palikta, traces0.1 įjungta kartu su esamais logs.

Hosted reception:

```powershell
node sites/madbeauty/cloudflare/verify.mjs https://madbeauty.lt
node sites/madbeauty/cloudflare/verify-catalogue.mjs https://madbeauty.lt --private-path /gidai/bendri-registracija
```

HTTP `X-Madbeauty-Content-SHA256` turi atitikti candidate receipt. Tikrinamos actual SSR nacionalinės ir current-ready miestų routes, 103 options, canonical/noindex/sitemap, tikslių patvirtintų medijos failų baitai ir private/unknown404. Verifier nekuria tiekėjų, nesiunčia pašto ir nekeičia booking/customer state; session/CSRF smoke nėra prisijungimo ar inbox testas.

## Naujo V2 straipsnio vartai

Vien DRAFT-V2 nėra release. Bendras validatorius reikalauja vieno approved V2 home ir visų tame pačiame pakete referenced page IDs. Full reviewed V2 release turi išsaugoti reikalingus retained gidus / trust/editorial / author ir svetainės faktus. V1 istorinių approvals automatiškai V2 neperkelti. `paslaugos/manikiuras` dabar yra platformos browse, jo nekurti kaip V2 editorial page.

Po tikros review / approval ir immutable export:

```powershell
node sites/madbeauty/content-foundation-20261006/preview-release.mjs <release-directory> --expected-sha256 <reviewed-sha>
node sites/madbeauty/cloudflare/build.mjs --content-package <release-directory/content-package.json> --expected-sha256 <reviewed-sha>
```

Preview naudoja bendrą shadow importą izoliuotai. Naujas build yra candidate, ne deployment. V2 public byte verifier reikalinga privati `MADBEAUTY_REVIEWED_RELEASE_ASSETS` aplinkos reikšmė į šio release assets katalogą. Iki publishAt approved ateities straipsnis ir jo unshared medija404; būsimo body / href / schema / JSON / sitemap / llms nėra. Atėjus datai viena bendra projekcija juos leidžia be antro deploy, jeigu reviewed paketas jau įdiegtas. Private/draft revizija savaime nepatenka į release.

Compiled izoliuotas Workers testas tikrina publishAt−1ms ir exact publishAt su penkiais tikrais V1 WebP baitais kaip testine medija, be production laiko override. Tai įrodo adapterio laiko elgesį, ne tikro naujo straipsnio redakcinę review ar viešą V2 release. Naujas pilotas planned2026-10-13 10:00 Europe/Vilnius, dar0approved; šiame infrastruktūros release jo neviešiname.

## Rollback

Prieš activation confirmed priorversion `402a0fb5-bd02-4a78-8a3b-de083aeb68e8`. Jei būtina ir neįsiterpė naujas owner release:

```powershell
node ../dovanos-memorycasting/node_modules/wrangler/bin/wrangler.js rollback 402a0fb5-bd02-4a78-8a3b-de083aeb68e8 --config sites/madbeauty/cloudflare/wrangler.production.json --message "Revert scoped content infrastructure" --yes
```

Pirma patikrinti current deployments / bindings. Code rollback neatkuria DB, secrets ar DNS; čia jų migracijos neatliekamos. Niekada neatkurti seno customer DB snapshot. [Cloudflare rollback ribos](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) ir [konfigūracija](https://developers.cloudflare.com/workers/wrangler/configuration/).

Source candidate92/92PASS, build124assets/7pages, common exact V1 SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, dryrunPASS. Gyvas priėmimas įrašomas atskirai [RECEIPT.json](RECEIPT.json); naujų straipsnių ar city SEO puslapių priėmimas netapatinamas infrastruktūrai.
