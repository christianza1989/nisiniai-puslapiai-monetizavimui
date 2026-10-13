# Faktinis kompresijos matavimas

2026-10-09, Windows, Node24.21.0, sharp0.35.5; du tikri gamintojo 720px WebP katalogo failai. Matavimas atliktas tame pačiame procese, po vieną encode, vykstant canonical katalogo importui; tai konkrečios aplinkos įrodymas, ne universalus greičio pažadas. Vienodi width720, withoutEnlargement, quality75, alphaQuality100. Skiriasi tik effort.

| Manifesto eilutė | effort6 ms/baitai | effort4 ms/baitai |
| --- | --- | --- |
| 1 | 6844 / 13706 | 183 / 13972 |
| 50 | 18549 / 101946 | 361 / 105980 |

Įėjimo manifestas: vietinis `data/klaro-catalog/asset-manifest.json` katalogo agento worktree. Teisės ir source SHA laikomi importo proveniencijoje. Visų galutinių nuotraukų matmenys ir HTTP bei vizualinė šeimų patikra atliekami atskirai. Didesnė kompresoriaus effort vertė kainavo daug CPU, o išėjimo failų skirtumas čia buvo 1,94% ir 3,96%. Nauji importai naudoja versioned responsive-webp-v2 effort4; jau patvirtinti v1 failai neperrašomi.

Pataisos patikra: 10/10 image-pipeline, HTTP media import/export, draft metadata immutability ir editorial loader testų PASS (3970,5811ms). Alpha, EXIF orientacija, dydžių šeima, mažas originalas, blogi failai, originalo privatumas, approval/export ir nekintantis snapshot patikrinti tikrais baitais. Šių testų rezultatai nėra vizualinio dizaino ar produkcijos deployment įrodymas.
