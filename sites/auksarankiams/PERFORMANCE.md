# Vietinis našumo matavimas

2026-10-01T05:10:43.194Z. Galutinė versija: VERSION.json. Lighthouse 12.8.2, Chrome 154, mobile/simulated throttling, tikras production HTML ir tikri variantai. 8891 GET proxy tik prideda canonical Host; HTML nekeičiamas, formos mutacijos proxy neleidžiamos.

| Puslapis | Performance | A11y | Best practices | SEO | LCP | CLS | TBT | Perduota |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| home | 96 | 100 | 100 | 100 | 2.40 s | 0.0439 | 105.5 ms | 507 KiB |
| guide | 92 | 100 | 100 | 100 | 3.17 s | 0.0025 | 53.5 ms | 337 KiB |

Pradiniai to paties dizaino matavimai 94/98, galutiniai 96/92. Nerenkamas aukščiausias pakartojimas: pagrindinė ataskaita rodo galutinę versiją ir visą CPU įspėjimą JSON/HTML. Gido 3,17 s LCP nėra geras realių lankytojų CWV įrodymas. Local >=90 vartai pasiekti; field rezultato nėra.

Sprendimai: 20 responsive WebP iš bendro importo, CSS plotį atitinkantys sizes, lazy žemiau pirmo vaizdo, hero eager/high, tik vietiniai display šriftai su swap, system-ui body, native meniu/forma be naujos klientinės bibliotekos. Diagnostikoje lieka bendro core React/bootstrap JS (~60 KiB galimo nenaudojamo kodo), trumpa CSS/font grandinė ir vaizdo delivery ekonomija. Šie sąnaudų elementai įtraukti į matavimą; aukšto balo ar field LCP pažado nėra. Bendro core priklausomybių nereikia perdaryti vien vietiniam balui kelti. Production hostinge iš naujo tikrinti compression/cache/font MIME, realų LCP ir CWV, nes localhost rezultatas jų nepatvirtina.

Įrodymai: qa/lighthouse-final-{home,guide}.report.json/.html ir qa/PERFORMANCE-VERIFICATION.json.
