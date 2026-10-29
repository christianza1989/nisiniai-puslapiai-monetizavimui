# Originalios išvaizdos atkūrimas

2026-10-29 Roko pavedimas: pataisyti visus vizualinio audito radinius ir kiek įmanoma priartėti prie esamos svetainės. Tai papildoma patikra po ankstesnio teksto migracijos priėmimo. Ankstesni bandymai neperrašyti.

## Įgyvendinta

- Grąžinti originalūs šriftų dydžiai, svoriai, pastraipų tarpai, straipsnių plotis, antraščių ir nuotraukų padėtys. Skirtingi puslapių vaidmenys turi savo išdėstymą: baltos kainų kortelės, atskiras baltas keturių žingsnių procesas, originalūs DUK, siauras baltas privatumo puslapis.
- Išsaugoti native turinio paryškinimai, kursyvas, numeruoti žingsniai, pradžios numeriai ir dvi originalios vidinės nuorodos. Nebėra sąrašuose įdėtų antraščių dubliavimo. Šaltinio metaduomenys tik dekoruoja sutampantį native tekstą; SHA sargai atmeta pasenusius diapazonus.
- Naudojami būtent originale rodomi WordPress apkirpti nuotraukų variantai, importuoti bendru responsive medijos keliu. Atkurtas dangaus fonas, pilna debesų SVG proporcija, nuotraukų kampai ir originalus favicon. Originalūs neapkirpti failai išsaugoti.
- Atkurta lipni antraštė, meniu ir poraščių etiketės, viena visa 300px karuselės iliustracija, 2s keitimas, sustabdymas, išskleidžiami pradinio puslapio blokai ir grįžimas į viršų. Kortelių tekstas skaitomas iš native blokų; jis nesuplakamas su šiek tiek kitaip suformuluotomis meniu etiketėmis.
- Mobilūs tarpai ir kainų kortelių vidinės paraštės pritaikyti pagal šaltinį. Fiksuoti visų ekrano pločių widget aukščiai nenaudojami. Sutvarkyta skaitinių Elementor ID tvarka ir klaidingas CSS `normal` pavertimas nuliniu eilučių aukščiu.

## Patvirtinta galutinėje versijoje

Vietiniai įrodymai: `D:/Core/output/kvapunaikinimas-fidelity-repair-20261029/`. Galutinė galerija ir 24 Core bei 24 originalo viso puslapio nuotraukos: `confirmed/`. Papildomi 8 pradinio bei antrojo bloko viewport vaizdai parodo tikrą fiksuotų fonų veikimą. Viso puslapio screenshot gali baltai parodyti originalo fiksuotą foną už matomo lango; tai fiksavimo ribojimas, ne svetainės defektas.

| Patikra | Rezultatas |
|---|---|
| Visi 12 puslapių po 1440 ir 390px | 24/24 užfiksuoti, 0 neužsikrovusių nuotraukų |
| Originalaus teksto fragmentai | 261/261, be praradimų; privatumo tekstas yra atskirai leista išimtis |
| Kontaktai, vienas H1, metadata, canonical ir vidinių URL formatas | 12/12 PASS; privatumo puslapyje išlaikytas originalus tik poraštės kontaktų vaidmuo |
| Native formos / saugyklos / redirect bandymas | 17 PASS, SMTP išjungtas, 3 sintetiniai įrašai pašalinti |
| Naršyklės veikimo patikra | 17 PASS: tikri pointer veiksmai, karuselės auto/manual/pause/reduced-motion, blokai, DUK, meniu, lipni antraštė, grįžimas į viršų, formos required būsenos |
| Responsive / teksto didinimas | 320/390/768/1440px be horizontalaus perpildymo; 2x tekste nenukirstos pastraipos ir antraštės |
| Public core regresijos | 303/303 PASS, įskaitant 5 naujas turinio sargų / saugių nuorodų / skaitinių widget ID regresijas |
| TypeScript / scoped ESLint / native build | PASS; vienintelis bendro layout jau buvęs `no-css-tags` perspėjimas nepaslėptas |
| SEO smoke | Visi 12 puslapių, robots/sitemap/LLMS/schema/404/host izoliacija PASS |
| Lighthouse 13.6 mobile, 2026-10-29 20:00 UTC | Greitis96, prieinamumas100, best practices100; LCP2,24s, TBT190ms, CLS0, perduota431KB |

Lighthouse yra vienas vietinis laboratorinis matavimas, ne gyvos svetainės lauko rodikliai. SEO69 kyla iš tyčinio peržiūros noindex / robots blokavimo; apsauga neišjungta. Bendroje apimtyje likusios production pašto, valdytojo faktų, saugumo įrankių ir publikavimo sąlygos iš ACCEPTANCE.md nesikeičia. Tikros vartotojo klaviatūros patikros ši lentelė nepatvirtina; native elementai ir pointer veiksmai patikrinti.

## Sąmoningai išlikę skirtumai

Sutarti patobulinimai: dvi mobilios paslaugų kortelių kolonos, matomas skambinimas, aiškūs formos laukai ir faktinis privatumo pranešimas, skaitomas kontrastas, vienas H1 ir navigacinis puslapio kelias. NitroPack ženkliukas neperkeliamas. Karuselės turi pasiekiamus valdiklius, matomus užvedus arba sufokusavus. Smulkūs naršyklės šriftų rastravimo bei eilučių lūžių skirtumai galimi; absoliuti pixel tapatybė neteigiama.

5 punkto ozono teiginiai nepakeisti. Tikras `.lt` paketas tebėra native Studio juodraštis; `.example` yra izoliuotas vietinis bandymas. Gyvas puslapis, DNS ir tikras paštas nekeisti. Pakeitimai perduodami draft PR305 / PR104, ne main merge ar production release.
