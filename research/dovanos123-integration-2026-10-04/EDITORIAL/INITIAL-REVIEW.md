# Nepriklausoma pradinio kandidato redakcinė peržiūra

2026-10-05 Europe/Vilnius. Peržiūrėti visi 11 puslapių pilni tekstai, visos trijų gidų pastraipos, editorial/authors/sources/commerce/link/media metadata ir trys originalūs vaizdai. Initial snapshot SHA `d67dc4d13b83331afc1ac6618b1d8a1f617d38f5d381d122ab979ef7b5a9c5fd`, `initial-candidate.json`; visi11 revisionHash ir15 tikrų WebP failų SHA patikrinti `initial-checks.json`. Tai draft review; 0 approval ir 0 public activation.

## Būtinos pataisos iki redakcinio priėmimo

1. `lt-hand-casting-guide`: pavadinimas žada išsamų procesą iki rezultato, tačiau tikras turinys yra pirkimo/tinkamumo atranka ir sąmoningai nėra instrukcija. Title/description/intent turi atitikti klausimą, ne žadėti trūkstamus darbo žingsnius. Istorinis URL lieka. Taisyti pagalbininko sakinio gramatiką.
2. `lt-christmas-couple`: pašalinti tuščią H2 „Išvada“ prieš kitą H2. FAQ datos įrašymą susieti su gavėjais suderintu laiku; ankstesnis savarankiškas datos paskyrimas prieštarauja lankstaus dovanos naudojimo argumentui. Kiti H2→H3 perėjimai yra prasminga hierarchija, ne automatinės detektoriaus klaidos.
3. `lt-christmas-man`: „konkretaus prekės“ → „konkrečios prekės“.
4. `gift-home`: pastraipa sako „šiame gide“, nors tai homepage. Semantika turi nurodyti portalą. Vienas aiškus komercinio ryšio paaiškinimas pakankamas; neapkrauti kartotiniais techniniais checkout teiginiais.
5. Originalų matomas AI/ImageGen figcaption ir alt įrankio prefiksai prieštarauja savininko aiškiai pasirinktam pateikimui. Kilmė lieka private žurnale ir redakcinėje metodikoje; alt aprašo sceną. Prireikus rankų kompozicijos caption turi paaiškinti, kad tai pavyzdys, ne konkretaus rinkinio rezultatas, be generatoriaus ženklelio. Tikri trečiųjų šalių licenciniai credit nešalinami.

Gift sesijai perduota kritika ir private-only `editDraftAssetMetadata` API; root actual DATA nerašo. Po pakeitimų iš naujo tikrinti exact candidate SHA ir changed revisionHash.

## Teiginių ir šaltinių išvada

2026-10-05 nepriklausomai atidaryti pirminiai [IKEA RÖDALM](https://www.ikea.com/lt/lt/p/roedalm-remelis-berzo-rastas-30548866/), [IKEA DINERA](https://www.ikea.com/lt/lt/p/dinera-puodelis-smeline-60350646/), [Pegasas kuponų kategorija](https://www.pegasas.lt/dovanu-kuponai/) ir [Memory Casting informacija](https://memorycasting.lt/). Rėmelio13×18 bei puodelio30cl konkretūs teiginiai palaikomi. Rėmelio nuotraukos/pasparto dydžiai skiriasi ir gidas teisingai liepia tikrinti. Kupono nuoroda kategorijos, ne momentinio įsigijimo/pristatymo pažadas. Neskelbiamos prekės kainos, sandėlio ar checkout garantijos. Memory Casting šeimos/saugumo/reitingų reklaminių teiginių neperkeliama kaip mūsų patikrintos patirties.

Trys originalai pikseliais peržiūrėti: rankų skulptūros scena, kalėdinė poros popieriaus iliustracija, kavos/praktiškų daiktų natiurmortas. Temos atskiriamos; originalai neįrodo realių produktų ar atliktų klientų darbų. Rankų rezultato tikslus panašumas ir gamintojo saugos reikalavimai neišgalvoti. Actual crop/srcset/Lighthouse ir galutinė kompozicija bus tikrinami realiame r2 HTML.

Organization byline priimtinas; išgalvoti person profiliai nepatvirtinami. Unknown pirmos publikacijos datos null, publishAt nevadinamas istoriniu paskelbimu. Trys trumpi legacy straipsniai ir likęs neperžiūrėtas kalendorius lieka draft; nuorodų į juos pašalinimo loss dokumentuotas. Privacy/cookies/terms nėra šio11 rinkinio dalis: form/analytics OFF, mailto kontaktas pats savaime neįrodo inbox ar legal launch readiness.
