# Esamos tapatybės išsaugojimas

Pagrindas – 2026-10-29 faktinis `signaturepads.lt` desktop vaizdas, WordPress tekstai ir originali medija. Tai techninė migracija: balta ir šviesiai mėlyna, Open Sans, siaura horizontali antraštė, nuotraukos fonas, išskleidžiami tekstai ir produktų paveikslai. Produktas išdėstomas dviem stulpeliais, apačioje panašūs produktai. Kataloge lieka kategorijos, kainos ir produktų kortelės. Naujų kompozicijų ar rinkodaros tekstų neieškoma.

## Tekstų sistema ir patikros planas

- [x] Išlaikyti Open Sans ir lietuviškas raides; lokaliai aptarnauti tikrus 400–700 svorius.
- [x] Bendras tekstas 14–16 px, apie 1,75 eilutės aukštis; antraštės 22–30 px pagal vaidmenį; mobiliajame nemažinti teksto dėl vietos.
- [x] Vienas 1140 px pločio karkasas, produkto dviejų stulpelių maketas ir siauresnis ilgo teksto plotis.
- [x] Matomi keyboard focus, atidaromas mobilus meniu, natyvūs details/summary ir tikros nuorodos.
- [x] Faktinės desktop/mobile nuotraukos, 320 px reflow ir tekstų tarpų patikra.
- [ ] Tikras naršyklės teksto padidinimas iki 200%: UNVERIFIED, neteigiama, kad viewport patikra jį atstoja.
- [x] Peržiūroje patikrintos visų 28 URL source fragmentų reikšmės; nesutrumpinti parametrai, nepridėta produktų savybių.

Originalios produkto ir logotipų nuotraukos naudojamos to paties savininko svetainės migracijai. Failų kilmė, URL ir SHA saugomi atskirame asset-manifest. Naudojami esami WordPress skirtingo dydžio vaizdai; nauji vaizdai negeneruojami.

## 2026-10-29 peržiūros įrodymai

`D:/Core/output/signaturepads-migration-20261029/` turi desktop homepage, mobile homepage, desktop katalogo ir mobile produkto vaizdus; atskirai `PREVIEW-VERIFICATION.json` ir `reflow-check.json`. Patikrintas mobilus meniu, galerijos keitimas, zoom dialogo atidarymas/uždarymas ir originalių kategorijų antraščių įtraukimas. Detector vienintelis perspėjimas dėl Open Sans ignoruojamas pagrįstai: šriftas sąmoningai išlaikomas pagal savininko nurodymą nekeisti esamos tapatybės.

Tai vietinė nepatvirtinto migracijos snapshot peržiūra. Production Core publikavimo adapteris ir bendro SEO/GEO priėmimas dar neintegruoti; nėra production Lighthouse ar paleidimo deklaracijos. Savininkas paprašė radinius ir papildomus optimizavimus pirmiausia aptarti.
