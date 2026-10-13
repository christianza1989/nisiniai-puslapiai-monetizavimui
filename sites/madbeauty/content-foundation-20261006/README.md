# Straipsnių ir katalogo pagrindas

2026-10-06 savininko siauras pavedimas: pirma paruošti pagrindą kitai sesijai rašyti straipsnius ir susieti juos su teisingais katalogo tikslais. **Pilnas platformos atnaujinimas tebėra pristabdytas.** Šis paketas – vietinis veikiantis pagrindas ir Workers candidate; naujas source dar nėra gyvas deployment. Patvirtinti V1 straipsniai, paskyros, DO tapatybė ir SMTP neliečiami.

## Ką turinio sesija gali naudoti dabar

- [taxonomy.json](taxonomy.json): 305 unikalūs kategorijų / grupių / procedūrų ID. 14 core kategorijų / 194 procedūros; 7 plėtinių / 31 procedūra suplanuota, jų runtime route neaktyvus. Registras originalus, jo kilmė – ankstesnis [planas](../upgrade-plan-20261006/PLAN.md).
- [cities.json](cities.json): 103 stabilūs miestų ID ir lietuviški pavadinimai.
- [registry.planned.json](registry.planned.json): nacionaliniai ID ir canonical path, miestų URL šablonas. Visos būsenos `planned`, `deployed:false`, `targets:[]`. Galima juodraščiuose planuoti tikslus; šis failas nesuteikia viešų veikiančių nuorodų.
- [content-targets.mjs](../prototype/content-targets.mjs): vienintelis nišos `planTarget`, `createContentTargetRegistry`, `resolveContentTarget` resolveris.
- [CONTRACT.md](CONTRACT.md): V2 sidecar, commerce snapshot, tikras endpoint ir publikavimo vartai.

Private studijos `model.mjs`, `generator.mjs`, plan schema ir prompto laukų perdavimą valdo kita sesija PR10. Šis paketas jų nesidubliuoja ir neperrašo. 225 procedūrų registro buvimas nėra viso straipsnių temų plano aprėpties priėmimas. Straipsnių automatiškai nesugeneruota ir nepublikuota.

## Veikiantis kelias

`/paslaugos` → kategorija → grupė → procedūra → miesto pasirinkimas → reali patvirtinta pasiūla → teikėjo profilis / esamas rezervavimo kelias. Serveris grąžina visą katalogo HTML be priklausomybės nuo JS. HTML ir client skaito tą patį registrą bei platformos approved catalog projection.

Esami 10 taxonomyServiceId lieka meistro redaktoriuje; alias atitinka tik tikrą semantinį lygį. `kirpimas` → `kirpimai`, bet ne „moterų kirpimas“. `gelinis-lakavimas` → `lakavimas-gelinis-lakavimas`, todėl tikslus šios procedūros miesto puslapis gali rodyti jau esamą pasiūlymą. Naujo pilno provider procedūrų pasirinkimo / variantų darbai lieka pristabdytame plane.

Nacionaliniai browse puslapiai yra funkcionalūs, `noindex`; jie nėra 225 naujų indeksuojamų straipsnių pakaitalas. Vietinis rezultatas – tik su approved pasiūla, tuščias404. Straipsnio turinys gali būti publikuojamas nepriklausomai nuo pasiūlos; neparuoštas CTA atvaizduojamas kaip tekstas, naudojant bendrą V2 projekciją. Viešų indeksuojamų procedūros–miesto SEO puslapių kokybės priėmimas yra vėlesnis darbas.

## Vietinė peržiūra ir tikras adapteris

```powershell
node sites/madbeauty/content/bootstrap-checkout.mjs
node sites/madbeauty/content-foundation-20261006/export-registry.mjs --check
node sites/madbeauty/content-foundation-20261006/preview.mjs
```

Izoliuota peržiūra: http://127.0.0.1:8822/paslaugos/nagai ir `/gidai/katalogo-nuorodos-testas`. Duomenys tik atmintyje, synthetic profilis ir straipsnis aiškiai testiniai; production seed jų neimportuoja. Registry `deployed:false`, todėl straipsnio komercinis CTA lieka tekstas. Tikri Node/Workers adapteriai iš approval projection gauna pasiūlą ir formuoja registro būseną, ne iš šio fixture.

## Patvirtinto V2 paketo intake

`content/adapter.mjs` vartoja bendrą immutable validator + `projectContentPagesV2`, `contentSeoV2`, `giftSchemas`. Nišos rich HTML rendereris vartoja tik projektuotas `href`, neturi savo alternatyvaus nuorodų resolverio. Guide/article, autoriai, šaltiniai, susiję straipsniai, featured image ir faktinės redakcinės datos atvaizduojami iš V2; nedatintas straipsnis negauna išgalvotos publikavimo datos.

`content/intake.mjs` po bendro validatoriaus tikrina domeną, kontaktą / operatorių ir rezervuotus platformos URL. V2 article/guide kelias `gidai/{slug}`; author `autoriai/{slug}`. Katalogo, paskyrų ir rezervacijų URL negali būti perimti straipsniu. V1 patvirtinto paketo baitai ir hash nepakeisti.

Kai kita sesija parengs vieną peržiūrėtą immutable V2 release su assets:

```powershell
node sites/madbeauty/content-foundation-20261006/preview-release.mjs <release-directory> --expected-sha256 <tikslus-patvirtinto-paketo-SHA256>
```

Tai bendro `verifyContentRelease` ir `import-content-package --shadow` kelias izoliuotame Madbeauty sandbox. Default8824, `--port` gali pakeisti portą. Puslapis ir nauji WebP/AVIF skaitomi iš šio shadow release; ateities/unknown medija404. Senas patvirtintas paketas, core compiled registry ir ankstesnis runtime nepersirašo. Tuščias laikinas katalogas negeneruoja netikrų teikėjų; CTA readinessfalse. Vėliau Workers candidate:

```powershell
node sites/madbeauty/cloudflare/build.mjs --content-package <release/content-package.json> --expected-sha256 <tikslus-patvirtinto-paketo-SHA256>
```

Komanda tik stato candidate, nedeployina. Neįjungia homepage migracijos savaime; V2 release turi turėti visus reikalingus patvirtintus puslapius ir tikras medijos teises. Build nekopijuoja fixture ar seno privataus runtime. Vien export ar SHA nėra redakcinė review ir gyvas priėmimas.

Prieš viešą V2 release: viena reali straipsnio revizija → faktų/medijos/nuorodų review → immutable export → šiame adapteryje actual preview → registry readiness ir canonical tikslų HTTP → production release ir jo verification. [TEST_MANIFEST.md](TEST_MANIFEST.md) ir [VALIDATION.md](VALIDATION.md) atskiria kandidatą nuo gyvos būsenos.
