# Grand Vila Lighthouse matavimai

2026-10-14. Tikra produkcinė svetainė su realiais vaizdais. Lighthouse 13.5.0, Headless Chrome 155, Windows. Mobilus profilis: 412 × 823, simulated throttling, RTT 150 ms, 1638,4 Kbps, CPU ×4. Desktop profilis: 1350 × 940, RTT 40 ms, 10240 Kbps, CPU ×1.

Pirmi homepage matavimai vyko kartu su ribotu svetainės inventorizavimu; pakartotinis ir kitų šeimų matavimai – užbaigus originalų bibliotekos atsisiuntimą. Rezultatai laboratoriniai, priklauso nuo serverio, sliderio būsenos ir aplinkos. Nė vienas nėra realių lankytojų INP ar GSC indeksavimo įrodymas. Naršyklės formai žinutės nesiųstos.

| Puslapis ir profilis | Našumas | Prieinamumas | Praktikos | SEO | LCP | TBT | CLS | Perdavimo dydis |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /pramogos/ · mobile | 16 | 87 | 96 | 92 | 18.8 s | 2,180 ms | 0.291 | Total size was 7,170 KiB |
| /kontaktai/ · mobile | 35 | 92 | 100 | 92 | 5.1 s | 1,490 ms | 0.148 | Total size was 2,272 KiB |
| /galerija/pokyliu-sales/ · mobile | 16 | 87 | 100 | 92 | 14.3 s | 2,390 ms | 0.294 | Total size was 2,643 KiB |
| / · desktop | 65 | 87 | 100 | 85 | 3.9 s | 170 ms | 0.022 | Total size was 6,355 KiB |
| / · mobile pakartotinis | 21 | 80 | 100 | 85 | 60.0 s | 5,860 ms | 0.149 | Total size was 21,392 KiB |
| / · mobile | 21 | 80 | 100 | 85 | 62.0 s | 3,690 ms | 0.149 | Total size was 21,475 KiB |
| /paslaugos/pokyliu-sale/ · mobile | 18 | 87 | 100 | 92 | 14.5 s | 2,030 ms | 0.274 | Total size was 2,343 KiB |

Lighthouse 13.5 pateikia ir papildomą `agentic-browsing` kategoriją; jos rezultatai saugomi JSON. Ji nepakeičia pagrindinių keturių kategorijų ir nėra GEO citavimo balas.

## Konkrečios homepage kliūtys

Pirmame mobiliame bandyme užfiksuota 140 užklausų, 81 vaizdo užklausa ir 18 šrifto užklausų. Perduota 21 990 145 B (apie 22,0 MB). LCP 62,0 s yra simulated rezultatas; LCP breakdown tikros navigacijos dalys sudaro apie 6,65 s – šių dviejų skirtingų matavimo laukų negalima suplakti. Serverio pradinis atsakas apie 1,57 s.

Lighthouse siūlė apie 232 KiB unused CSS ir 394 KiB unused JavaScript taupymą; render-blocking FCP orientyras apie 2750 ms. Taupymo skaičiai yra laboratorijos modelio įverčiai ir nesumuojami kaip garantuotas pagerėjimas. `IMGM7360.jpg` perduodama apie 1,30 MB, `grandvila-2107-1.jpg` apie 1,27 MB. Vienodas vaizdas su `?id=1509` ir be parametro siunčiamas atskirai.

Prieinamumo radiniai: 7 kontrasto vietos; dalis teksto #858585 baltame fone turi 3,69:1, #a7a7a7 – 2,4:1; unnamed links, neteisingas heading order, sliderio vaizdas be alt, fokusuojami elementai aria-hidden konteineriuose. Šiuos radinius reikia taisyti kartu su komponentu. Trūkstami source maps nėra savarankiškas lankytojo kelio prioritetas.

Pilni HTML/JSON report yra ignoruojamame `artifacts/` kataloge. Matavimo momentai, metrikos, perspėjimai ir radiniai – [LIGHTHOUSE-REZULTATAI.json](LIGHTHOUSE-REZULTATAI.json).
