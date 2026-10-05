> Historical research and initial direction. Current industrial composition, editorial imagery and acceptance evidence are in `sites/traktoriupadangos/DESIGN.md` and `PHASE-1-AUDIT.md`; older proposals here do not override them.

# Tarptautinis tyrimas ir dizaino sprendimai

Patikra 2026-09-30. Taikytas `SKILLS/niche-site-builder/SKILL.md`. Šaltinių turinys yra tyrimo medžiaga, ne mūsų paslaugų ar sandėlio patvirtinimas. Nenaudotos svetimų portalų nuotraukos, tekstai, logotipai ar atsiliepimai.

## Stebėti pavyzdžiai

| Šaltinis / rinka | Faktinis patikros būdas | Stebėtas sprendimas | Pritaikymas ir ribos |
|---|---|---|---|
| [TractorTyres, JK](https://www.tractortyres.co.uk/), [traktorių kategorija](https://www.tractortyres.co.uk/tractor-tyres) | Atvertas puslapio tekstas; tiesioginė naršyklė vėliau grąžino 522. Vizualinė patikra nepatvirtinta. | Atskirti padangų tipai, dydžiai/gamintojai kataloge ir pasirinkimo gidas. | Pradėti nuo matmens ir pasirengimo klausimų; pirkimą bei filtrus atidėti iki tikro katalogo. Pristatymo pažadų neperkelti. |
| [Allopneus, Prancūzija](https://www.allopneus.com/pneu-agricole/) | Atvertas tekstas ir pirmas realus DOM: dydžio įvedimas, kategorijos, pasirinkimo etapai. Vėlesnis screenshot rodė prieigos ribojimą, todėl nenaudojamas kaip dizaino įrodymas. | Dydžio pradžia; keli aiškūs tolesnio pasirinkimo ir aptarnavimo etapai. | Pirmoje mūsų struktūroje trys pasirinkimo klausimai ir žymėjimo pavyzdys. Pardavimo, montavimo ir mokėjimo etapų neimituoti. |
| [Agrar-Reifen, Vokietija](https://www.agrar-reifen.de/) | Realūs desktop 1440×1000 ir mobile 390×844 screenshot bei DOM. | Padangų kategorijos, dydžių turintys sandėlio įrašai, matomi kontaktai. Viršuje aiškiai įspėja, kad parduotuvė dar kuriama. Mobile dalis seno maketo teksto nukerpama. | Aiškiai atskirti užklausą nuo parduotuvės. Matmenis padaryti įskaitomus. Pasirinktas savas šiuolaikinis žalias/šviesus maketas, ne šio dizaino kopija. |
| [All Terrain Tyres, JK](https://allterraintyres.co.uk/) ir [didelių traktorių kamerų kategorija](https://allterraintyres.co.uk/index.php?main_page=index&cPath=1095_1277) | Realūs desktop/mobile homepage bei mobile kategorijos screenshot, DOM. | Atskiros naudojimo kategorijos, dydžio paieška, matomi tiekimo apribojimai; daug tankios katalogo navigacijos. | Naudojimo kontekstus paversti trimis suprantamais klausimais. Trumpa navigacija ir lengvai randama forma; nesukurti neveikiančios paieškos ar netikro krepšelio. |
| [Oponeo, Lenkija](https://www.oponeo.pl/artykul/opony-rolnicze) | Atvertas informacinio puslapio tekstas; vizualinis maketas šioje patikroje nevertintas. | Informacinis klausimų apie žemės ūkio padangas turinys greta parduotuvės. | Gidai atsako į atskiras intencijas ir remiasi gamintojais; originalūs tekstai, jokios kopijos. |
| e-Agroteka, Xpadangos, Traktoriukai, e-Rytas, Lietuva | Ankstesnis tos pačios 2026-09-30 dienos kategorijų teksto pjūvis užfiksuotas pagrindiniame svetainės dokumente; pakartotinai dalis puslapių neatsivėrė. | Dydžių/gamintojų kortelės, skirtingas katalogo gylis, krepšelis arba vadybininko užsakymas. | Nesivaržyti su neišmatuotu „pigiausi“ pažadu. Pirmas etapas – aiškūs techninių duomenų klausimai ir realaus poreikio surinkimas. |

Naršyklės įrodymai laikomi `C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-research/`: `agrar-desktop.png`, `agrar-mobile.png`, `allterrain-desktop.png`, `allterrain-mobile.png`, `allterrain-category-mobile.png`. `allopneus-*.png` yra **prieigos blokavimo**, ne sėkmingos maketo peržiūros įrodymai. DOM momentinės kopijos `.playwright-cli/`; jos yra vietinio tyrimo artefaktai, ne svetainės medija.

## Atranka prieš įgyvendinimą

| Kliento klausimas | Mūsų sprendimas | Būsena |
|---|---|---|
| Nuo ko pradėti, jeigu žinau tik dydį? | Homepage pasirinkimo seka: mašina/darbai → visas žymėjimas → konstrukcija; nuorodos į tris gyvus gidus. | Įgyvendinta |
| Ką reiškia skaičiai ant padangos? | Kontrastinga 650/60 R38 paaiškinimo sekcija; nominalūs dydžiai, ne tinkamumo rekomendacija. | Įgyvendinta pagal Michelin |
| Kokie mano darbo duomenys svarbūs? | Laukas, kelias, mišrus naudojimas – prašoma aprašyti aplinkybes, neduodamas universalus slėgis ar modelio patvirtinimas. | Įgyvendinta |
| Ar galiu čia pirkti ir ką reiškia užklausa? | DUK ir formos paaiškinimas: poreikis, ne pirkimas; jokio kainos, atsargų, pristatymo ar montavimo pažado. | Įgyvendinta |
| Kaip telefonu greitai rasti atsakymą? | Trumpas native `details` meniu, vienas aiškus CTA, viena stulpelių seka, matoma el. pašto nuoroda ir privatumas. | Įgyvendinta; telefono šiai nišai nėra |
| Kokį modelį užsisakyti ir kada jį gausiu? | Realus katalogas, suderinamumas, tiekėjai, atsargos ir mokėjimai. | Atidėta iki paklausos ir tiekimo grandinės patvirtinimo |
| Kodėl pasitikėti? | Naudingos originalios paaiškinimo struktūros, pirminiai šaltiniai, aiškios ribos. | Įgyvendinta; fiktyvūs specialistai, reitingai ir klientų istorijos atmesti |

## Dizaino brief

Auditorija – traktoriaus savininkas ar ūkis, ruošiantis keisti padangas. Pasiūlymo hipotezė – paieškoje rastas aiškus atsakymas gali paskatinti aprašyti tikrą poreikį. Tai dar nėra patvirtinta padangų pardavimo veikla.

Header: ryškus originalus rato ženklas, trys keliai (gidai, pasirinkimas, klausimai), poreikio CTA; telefone kompaktiškas meniu. Hero: didelė aiški antraštė ir generuotas nefirminės technikos vaizdas. Toliau – pasirinkimo žingsniai, žymėjimo paaiškinimas, naudojimo sąlygos, trys gidai, DUK, forma, footer. Footer rodo realų laikiną el. paštą, gyvus informacinius puslapius ir savininko pageidautą Verslomatika žymą.

Paletė: tamsi miško žalia #173b2c, šviesus popierius #f8f7f1, santūrus gelsvas akcentas. Arial/system šriftas be išorinių fontų; didelės antraštės, ramus tarpas ir aiškus techninis pavyzdys. Desktop dviejų skilčių hero, telefone vaizdas ir tekstas atskirose eilėse; be karuselių, parallax ar privalomo JS meniu. Kiekvienas URL turi savą klausimą; SEO/publikavimo logika bendro core.

Tyrimas pateikia stebėjimus ir dizaino hipotezes. Nežinomi konkurentų konversijų rodikliai, mūsų paieškos apimtis ir paklausos sezoniškumas; „geriausio pasaulyje“ ar reitingo garantijos neteikiamos.
