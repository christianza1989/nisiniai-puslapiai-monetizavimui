# Bendras automatinis vaizdų kelias

Įgyvendinta 2026-09-30. Taikoma visoms nišoms, ne tik traktorių puslapiui. Automatinis optimizavimas vyksta vietinėje studijoje prieš patvirtinimą/eksportą; lankytojui nereikia nuotraukų transformavimo API ar mokamo CDN.

## Vienas įėjimas

GUI „Vaizdai → Importuoti“ priima PNG, JPEG ir WebP. `POST /api/sites/<siteId>/assets` bei agento `saveResponsiveAsset(siteId, metadata, bytes)` naudoja tą pačią `content-studio/src/image-pipeline.mjs` realizaciją. GUI perduoda originalą, ne antrą kartą jau canvas suspaustą kopiją. Esamas pasirinktinai sukonfigūruotas Image API generatorius taip pat eina per šį kelią; jo mokamas API generavimas šiame darbe neįjungtas. Codex integruotas ImageGen lieka numatytas generavimo būdas.

Agento failo importas:

```powershell
node content-studio/scripts/import-image.mjs <siteId> "C:/absolute/image.png" --alt "Kas matoma vaizde" --rights "Originalus projekto vaizdas" --prompt-file "C:/absolute/exact-prompt.txt"
```

Komanda grąžina primary `assetId`, visų variantų ID, tikrus matmenis ir baitus. Studijos `editPage` į media gavęs **bet kurį** naujos šeimos ID automatiškai prideda visus variantus ir pašalina pasikartojančius ID. GUI rodo naują šeimą vienu pasirinkimu. Įkėlimas nesuteikia redakcinio patvirtinimo ir nekeičia ankstesnės viešos revizijos.

## Vykdoma politika

- `responsive-webp-v1`: 360 / 640 / 800 / 1200 / 1600 px kandidatai, tik iki tikro originalo dydžio. Jei originalas mažesnis, paskutinis dydis yra jo tikras plotis; nedidinama ir nedubliuojama. Maksimalus viešo vaizdo kraštas 1600 px; proporcijos išlaikomos.
- WebP quality 75, alphaQuality 100, effort 6. Skaidrus PNG išlaiko alpha; tai nėra PNG fono užliejimas. JPEG EXIF orientacija pritaikoma prieš resize.
- Viešuose variantuose nelieka originalo EXIF/XMP/GPS. Originalas ir tikslus pateiktas prompt/provenance įrašas laikomi ignoruojamame `content-studio/data/media-originals/<siteId>/`, be viešo endpointo.
- Iki 12 MB, 40 mln. dekoduotų pikselių ir 8192 px įėjimo krašto. Tikras formatas turi atitikti deklaruotą MIME. Sugadinti, neleistini ar animuoti failai atmetami. Tai nėra leidimas importuoti nepatikrintas teises ar pavojingus teiginius.
- Kiekviena kopija turi naują immutable ID, tikrus matmenis, baitus ir SHA-256. `groupId` ir pilnas prompt yra tik studijos metaduomenys, ne viešos schemos pakeitimas.
- Dabartinė viešo paketo riba – **60 medijos variantų puslapiui**, pakanka 12 pilnų penkių dydžių šeimų. Sena studijos 20 riba kliudė penkių vaizdų homepage, todėl suderinti modelio, JSON schemos ir viešo validatoriaus apribojimai. 25 tikri WebP iš penkių pasirinkimų praėjo approval/export/viešo validatoriaus bandymą; 65 atmetami be tyliai trumpinamų variantų ar patvirtintos versijos pakeitimo. Daug vaizdų nėra kokybės kvota.

## Viešas atvaizdavimas

Core `lib/niche-media.mjs` turi bendrą `imageSrcSet(page.media, asset)`. Tik to paties tinkamo publikuoti puslapio, vienodo aprašomojo alt ir proporcijų variantai patenka į srcset. Atskiros kompozicijos turi skirtingą alt; dydžių kopijos tą patį alt. Rendererio `sizes` turi atitikti realų CSS plotį: naršyklė pagal viewport ir DPR pasirenka tinkamą failą. Taip išvengiama kiekvieno failo rankinio optimizavimo; maketo dydžio teisingumą vis tiek tikrina agentas.

Hero ir gido atidarymo vaizdas – eager/high, vėlesni – lazy. Visada yra width/height, aprašomasis alt arba tuščias alt tik aiškiai dekoratyviai miniatiūrai prie pilno tekstinio link. Gido Article/OG vaizdas turi būti tikras matomas jo vaizdas. Originalams nerodyti ImageGen/modelio/įrankio badge; kilmė redakcinėje metodikoje ir žurnale. Tikrai būtina trečiosios šalies licencinė autorystė išlieka. Patvirtinimo/hash/datos/host/deployment filtras galioja ir medijai.

## Priėmimas ir seni failai

Seni jau optimizuoti immutable WebP neperspaudžiami ir patvirtintų paketų baitai automatiškai nekeičiami. `saveAsset` lieka žemas senų optimizuotų įrašų adapteris; nauji agentai jo nenaudoja vietoje `saveResponsiveAsset`. Traktorių istorinis vienkartinis skriptas saugomas kaip įrodymas, ne naujų nišų medijos darbo instrukcija.

`npm test` studijoje tikrina realų PNG → HTTP → WebP → grupės priskyrimo → approval → public-validator/export kelią, source privatumo/tenant ribas, skaidrumą, EXIF orientaciją, mažą originalą ir klaidingus failus. UI peržiūra papildomai tikrina vieną bibliotekos kortelę/šeimą ir dydžių tekstą. Public `scripts/audit-niche.mjs` tikrina tikrus srcset failus, width deskriptorius, proporcijas ir matomą Article image. Lighthouse atliekamas su tikrais galutiniais vaizdais; automatinis suspaudimas negarantuoja 100 balų ar gero sugeneruoto turinio.

2026-09-30 priėmimas: 14/14 studijos testų, tikras izoliuotas GUI PNG importas, viena bibliotekos kortelė ir vienas checkbox → penki priskirti WebP, source originalas liko privačiai. [Vykdymo įrodymai](sites/traktoriupadangos/MEDIA-PIPELINE-VERIFICATION.json), [GUI](sites/traktoriupadangos/media-ui-import.png), [A–Z auditas](sites/traktoriupadangos/PHASE-1-AUDIT.md). Agentų plan/draft instrukcijų failų sąrašas ir fingerprint užfiksuoti tame pačiame įrodymų JSON. Tai komponento įgyvendinimo patikra, ne tikro domeno paleidimas.

Pagrindinė eiga: [START_HERE](START_HERE.md), [builder](SKILLS/niche-site-builder/SKILL.md), [planner media prompt sutartis](SKILLS/niche-content-planner/references/media-workflow.md), [A–Z auditas](SKILLS/niche-site-audit/SKILL.md). Sharp API peržiūrėta 2026-09-30: [resize](https://sharp.pixelplumbing.com/api-resize/), [output](https://sharp.pixelplumbing.com/api-output/), [metadata](https://sharp.pixelplumbing.com/api-input/).

2026-10-05: niekada nepatvirtintos šeimos aprašą galima taisyti bendru `editDraftAssetMetadata(siteId, assetId, {alt, credit}, actorId)`. Visų dydžių alt/credit ir juodraščių kopijos keičiamos atominiu modelio lock, affected puslapiai grįžta į review su nauju hash; ankstesni aprašai lieka privačiame metadataHistory. Bytes/src/source hash/prompt/rights nekeičiami. Jei šeimą naudoja nors vienas approved arba publishedRevision, API atmeta; reikia naujos šeimos ir naujos redakcinės revizijos. Licencinio credit neištrinti be tikro teisių pagrindo. Originaliems AI vaizdams įrankio badge nerodyti; prireikus naudoti semantinį pavyzdžio aprašą, kilmę laikyti žurnale/metodikoje. `M1/studio-tests-media-metadata.log` 23/23 PASS apima tikrą šeimos/juodraščio/immutable snapshot/eksporto bandymą.

Approval/revoke išsaugo private `metadataPublished` žymą: atšaukus puslapį kadaise patvirtinta medija netampa keičiamu juodraščiu. Galutinis23/23 log `research/dovanos123-integration-2026-10-04/M1/studio-tests-media-metadata-final.log` papildomai tikrina revoke bandymo atmetimą. Šios žymos/istorijos/prompt viešame pakete nėra.
