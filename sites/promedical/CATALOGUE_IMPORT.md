# Klaro katalogo apimtis ir importo ribos

2026-10-09. Savininko pavedimas: Promedical yra jo atstovaujamo Klaro tiekėjo medicinos įrangos katalogas Lietuvos ligoninėms, poliklinikoms ir slaugos įstaigoms. Patvirtinti kontaktai sales@promedical.lt ir +370 686 88369. Savininkas nurodė viešai nevartoti juridinio įmonės pavadinimo.

## Patikrintas šaltinis

Nekintamas `normalized-catalogue-final-v2.json` SHA-256: `00d2538197a45164b5472e2cf1a4d72b2cfa862d09c3cad50debc4f37fd38cf3`. Faktinis agento baigiamasis QA dokumentas yra [CATALOGUE_SOURCE_QA.json](CATALOGUE_SOURCE_QA.json). Raw gamintojo puslapiai, SEO atsakymai ir pirminiai medijos failai lieka privačioje darbo saugykloje; jie nepublikuojami kaip mūsų rinkodaros tekstas.

Inventorius: 2 042 sitemap įrašai / 2 038 unikalūs URL, visi nuskaityti; dar 299 kategorijų puslapiavimo URL. 0 nepavykusių GET. 1 411 produkto detail URL atitinka 1 409 unikalius gamintojo ID. Vienas aiškiai gamintojo pavadintas testinis produktas ID1685 neįtrauktas. Rezultatas: **1 408 realūs produktai**, 511 šaltinio kategorijų įrodymų ir **437 viešos kategorijos**. 27 pagrindinės gamintojo meniu kategorijos ir 7 papildomos tikros šaknys: iš viso 34 hierarchijos šaknys. Tuščios pagalbinės kategorijos ir paieškos helperis nėra vieši produktų puslapiai.

Gamintojo paieškoje / ne pagrindinėse grupėse aptikti 17 modelių aiškiai priskirti su šaltinio/redakcinio sprendimo provenance. Tiesioginių kategorijų narystės išsaugotos, ne tik pirmoji grupė. Atitinkamai nepervadiname visų papildomų šaknų pagrindiniu gamintojo meniu. To paties SKU skirtingi gamintojo ID išlieka atskiri modeliai, pvz. įprastas PLV150 ir PLV150 II kokybės / išpardavimo žymėjimas. Užklausos sąrašo tapatybė yra modelio URL, ne SKU.

## Lietuviškas turinys

Tekstas originaliai išverstas/perrašytas lietuviškai, išsaugant techninius faktus, skaičius, vienetus, modelių kodus, variantų žymėjimus ir neiginius. Šaltinio QA patvirtino 12 652 panaudotas techninių savybių eilutes, 0 trūkstamų pavadinimų/variantų, 0 invariantų klaidų, 0 aprašymo ar nuotraukos trūkumų. 25 gamintojo puslapiai neturi originalaus išplėstinio aprašymo: jiems taikomas aiškus modelio/kategorijos faktinis pristatymas ir visi turimi parametrai, be išgalvotų savybių.

Penki atvejai turi sąmoningai pašalintus nepatvirtintus gamintojo kainos / laikinos akcijos / rinkodaros teiginius. Jų techniniai faktai išsaugoti. Gamintojo pasiūlymo žymėjimas modelio pavadinime pateikiamas su pastaba, kad dabartinės mūsų pardavimo ir tiekimo sąlygos derinamos užklausoje. Nedeklaruojama Lietuvos atsarga, kaina, garantijos terminas, klinikinis tinkamumas ar tikras mūsų produkto bandymas.

Root papildomai tikrina kiekvieno iš 1 408 juodraščių tikslų pavadinimą ir SKU, visą aprašymą, visas technines eilutes (įskaitant šaltinio antraštes be atskiros reikšmės) ir kiekvieną pasirinkimo variantą pagal tą patį source SHA. Kanoninės bloko ribos laikomos skaidant sąrašus / ilgą tekstą, ne nukertant faktus. Ilgoje produkto formoje rodomas pilnas turinys; kortelės santrauka yra atskira iki300 ženklų įžanga.

## Medija ir paskelbimo kelias

Kiekvienas produktas turi tikrą patikrintą Klaro pirminę fotografiją; 1 180 unikalių nuotraukų šeimų naudojama pakartotinai pagal tikrą source SHA. Visi dydžiai generuoti kanoniniu responsive WebP pipeline. Inventorius, originalo/gautinio URL, SHA, matmenys ir teisių pagrindas yra [ASSET_PROVENANCE.json](ASSET_PROVENANCE.json). Nepublikavome nepatikrintų papildomų galerijos kadrų. ISO gido/kategorijos vaizdas parinktas kaip tikra ZS1211 spinta, o ne atsitiktinis smulkus priedas.

Kanoninė eiga: `saveResponsiveAsset` → tikri juodraščiai → source/fact patikra → visi 1 856 private Studio HTTP preview → `recordEditorialReview` su aktualiu `revisionHash` → priklausomybių tvarka `approveReviewedBatch` iki200 → `releaseContent` → public import/compile → realus HTML, medija, paieška, puslapiavimas ir browser patikra. Penki stebėti susijusių/pakeistų modelių ryšiai pridėti tik po visų tikslų approval ir peržiūrėti dar kartą. Approval/publishedRevision nekonstruojami rankomis.

Baigiamasis release SHA, tikras public build ir patikrų rezultatai fiksuojami [VERIFICATION.md](VERIFICATION.md), [CONTENT_READINESS.md](CONTENT_READINESS.md) ir [SITE_COMPLETION.json](SITE_COMPLETION.json). Šaltinio `contentReady:true` nėra paleidimo, laiško gavimo ar svetainės priėmimo patvirtinimas.
