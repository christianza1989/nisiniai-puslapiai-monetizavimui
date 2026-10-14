# Grand Vila nuotraukų ir turinio archyvas

2026-10-14. Originalai išsaugoti vietiniame `sites/grandvila/artifacts/` kataloge. Viešai paskelbti turinio, nuotraukų ir WordPress bibliotekos šaltiniai atsisiųsti tik savininko audito/migracijos pavedimui. Archyvas nėra naujas public content package ir nekeliamas į GitHub.

| Objektas | Kiekis ir patikra |
|---|---|
| WordPress image įrašai | 1 682: 1 634 JPEG ir 48 PNG. |
| source_url + original_image | 2 412 unikalių originalo adresų; 730 įrašų turi papildomą didesnės raiškos original_image. |
| Atsisiųsti originalų adresai | 2 399, 6 534 244 693 B. Visų šių kopijų failų SHA-256 patikrinti. |
| Nepasiekiami originalai | 13 HTTP404; 404 HTML nesaugomas kaip nuotrauka. |
| Patikrinti resursai | 3 953 skirtingi resource failai, 6 717 163 523 B, 0 hash/size/decode klaidų; papildomai 1 pakartotinai atsisiųsta ir patikrinta miniatiūra. |
| Išoriniai vaizdai | Atsisiųsti 3 kambarių planai iš vilapasaka.lt ir 2 Gravatar avataro dydžiai, kai jie buvo šaltinio dalis. |
| Turinys | Visų 53 puslapių tikras HTML ir ištrauktas tekstas su SHA; 5 sitemap XML, robots, redirect ir 404 įrodymai. |
| Importo ribos | 76 archyvo fotografijos virš 12 MB importo ribos; 0 virš 40 MP ir 0 virš 8192 px. Pilni originalai lieka išsaugoti. |

Biblioteka apima ir neaktyvias senas bei šablono nuotraukas. Jas išsaugoti kaip istoriją, bet neviešinti naujame puslapyje vien todėl, kad jos yra WordPress media API. Prie kiekvieno pasirinkto publikuoti vaizdo reikia nustatyti puslapį, paskirtį, teises, reikalingą credit ir tikrą alternatyvų aprašymą. Esamos galerijos tvarka ir visi jos elementai turi atskirą atitikmenų registrą. Atvaizdo variantų, failų URL ir WordPress image įrašų skaičiai nėra vienas ir tas pats „nuotraukų skaičius“.

## Kur rasti kopijas

- `artifacts/assets/`: originalai ir naudojami variantai. Failų vardai yra URL SHA prefiksai; tai leidžia saugiai išsaugoti vienodus pavadinimus iš skirtingų katalogų.
- `artifacts/originals-manifest.json`: originalo URL → vietinis failas → bytes/SHA → WordPress ID ir source/original vaidmuo.
- `artifacts/assets-manifest.json`: HTML/sitemap ir media API atrasti failų URL su jų source vietomis, pirminiais atsisiuntimo rezultatais. Neatsisiųsti pertekliniai WP dydžiai čia nėra automatiškai „sugadintos nuotraukos“.
- `artifacts/referenced-retries.json` ir `archive-verification-supplement.json`: pirmų tinklo nesėkmių išsaugojimas bei sėkminga pakartotinė patikra.
- `artifacts/image-dimensions.json`, `archive-verification.json`: tikri matmenys ir kiekvieno išsaugoto failo vientisumo kontrolė.
- `artifacts/raw/`, `artifacts/content/`: tikras HTML/XML/technical payload ir tekstai; [URL-INVENTORIUS.json](URL-INVENTORIUS.json) turi jų hash ir failo nuorodą.

Žalių failų archyvas skirtas šiam PC. Git clone ir dokumentų PR neperkelia 6,7 GB archyvo, darbo procesų ar paskyrų prieigų. Kitam PC prireiks privataus archyvo perdavimo su hash arba naujo viešų šaltinių atsisiuntimo. Šiame pavedime naujo medijos optimizatoriaus ar AI vaizdų negeneruota.

## Nepasiekiamų originalų sąrašas

Visiems žemiau pateiktiems adresams užfiksuotas HTTP404. `22424213_...` originalas ir 150×150 kopija taip pat naudojami `/galerija/pramogos/`; tai faktinės būsimos migracijos medijos kliūtis. Likę įrašai yra bibliotekos originalai ir nebūtinai rodomi dabartiniuose 53 puslapiuose.

1. `/wp-content/uploads/2020/02/11013313_938904249464192_1491756448560844733_o-1-1.jpg`
2. `/wp-content/uploads/2020/01/DSC09185-scaled.jpg`
3. `/wp-content/uploads/2020/01/Nuotykines_orientacines_varzybos_1012.jpg`
4. `/wp-content/uploads/2020/01/10350505_10152492014973734_7697449445146609390_n.jpg`
5. `/wp-content/uploads/2020/01/1599665_10153964279923734_1043359823413800618_o.jpg`
6. `/wp-content/uploads/2020/01/krepsinis.jpg`
7. `/wp-content/uploads/2020/01/22424213_1572776882780115_5361746001057719298_o.jpg`
8. `/wp-content/uploads/2020/01/Amuras.jpg`
9. `/wp-content/uploads/2020/01/29873121_1764748573582944_4692273248007672828_o.jpg`
10. `/wp-content/uploads/2020/01/cursus-bier-brouwen.jpg`
11. `/wp-content/uploads/2020/01/football2.jpg`
12. `/wp-content/uploads/2020/01/29749900_1764747793583022_3197743800494485884_o.jpg`
13. `/wp-content/uploads/2020/01/Nuotykines_orientacines.jpg`
