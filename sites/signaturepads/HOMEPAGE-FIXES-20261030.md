# H01–H08 vietinės pataisos

Rokas 2026-10-30 tiesiogiai pavedė „pataisyk ka radai“. Pagrindas – HOMEPAGE-COMPARISON-20261030.md ir jo originalo / actual Core įrodymai. Gyvos svetainės nekeisti.

## Planas ir priėmimo kriterijai

- H01: papildyti11 originalo responsive adresų esamomis native šeimomis; tikrinti visus24 homepage medijos / fonų legacy adresus ir visą237 alias sąrašą. Jokio raw šaltinio apėjimo.
- H02: >1024 nefiksuotas header, <=1024 prisegtas;1024/1025 scroll patikra.
- H03: originalo4 desktop/tablet /1 mobile stulpelis, plotis, rėmeliai ir tarpai; nekopijuoti originalo overflow.
- H04: atskiri hero /software santykiai, nepermatomas akordeonas ir0.95 iliustracijos; natūralus uždaryto akordeono aukštis; visi8 tekstai išlieka.
- H05–H06: originalo trust /kontaktų /poraštės matmenys, kartu paliekant sutikimą ir geresnį kontrastą.
- H07: originalo parent Įranga nuoroda ir atskiras išskleidimas, submenu hierarchija; keyboard /touch /Escape ir tikri URL.
- H08: vienkartinis1.25s pasirodymas; turinys matomas be JS, reduced-motion nerodo animacijos.

Tik savo per-site renderer/client/CSS, alias konfigūracija ir prasminga native gate /menu regresija. PUBLIC bazėf20d7683, COREc10a5927, paketas94de2ef5; visi26 puslapių tekstai /kontaktai /nuorodos /204 turto baitai nekeičiami. Patikrinti native vietinį preflight, paskui vieną actual Core build ir desktop/mobile patvirtinimą. Kitos svetainės ir bendri kontraktai neliečiami. Naujos viešos prozos nerašyti; meniu atkuriami esami pavadinimai.

## Rezultatas: H01–H08 sutvarkyti vietoje

PUBLIC šaltinis `57e3ac49a72b59245815dae58be008664fa0ef0f`; native paketas liko `94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25`. Ta pati actual Core peržiūra <http://127.0.0.1:8956/>. Naujo approval / release / deployment nebuvo.

| Radinys | Įgyvendinta ir patikrinta |
| --- | --- |
| H01 | Visi11 adresų susieti su esamų patvirtintų šeimų tinkamo dydžio variantais. Visi24 homepage medijos adresai grąžina native307 į tinkamą `/content-assets/signaturepads/` failą, kurio HTTP200 ir image MIME. Visa237 alias regresija PASS.307 sąmoningai išlaiko dabartinę Core publikavimo /atšaukimo sutartį. |
| H02 | >1024 header nuslenka; <=1024 lieka prisegtas. Patikrinta1024/1025 riba ir fonų /turinio slinkimas. |
| H03 | >=768 keturios kortelės, <=767 viena; originalo plotis,4px tarpai,2px rėmeliai ir95% iliustracijos. Desktop1440 įrangos sekcija prasideda802px, software1357.47px – sutampa su originalu. Horizontalaus overflow nėra. |
| H04 | Skirtingos hero /software proporcijos, opacity0.95 iliustracijoms, nepermatomi teksto skydeliai, originalios paraštės. Desktop uždarytas software akordeonas200px, ne buvęs ištempimas iki nuotraukos. Mobile390 dėžutės vaizdas~315px; visi8 tekstai ir atidarymo būsenos atitinka originalą visuose7 pločiuose. |
| H05 | Originalo kortelių rėmeliai, tarpai ir250×200 logotipai; mobile logotipų žingsnis311px. |
| H06 | Desktop550px /mobile390→354px kontaktų nuotrauka,40px kampai;225px /202px poraštės logotipas, #e1f1f6 fonas. Išorinės paraštės priartintos prie originalo. Sutikimas, aiškesnis kontrastas ir skaitomas mygtukas lieka – dėl jų apatinės sekcijos nėra identiško aukščio. |
| H07 | Pagrindinis /Įranga /Kontaktai hierarchija; tikra Įranga parent nuoroda ir atskiras native submenu valdiklis, trys kategorijos originalia tvarka. Keyboard /touch ir Escape abiem lygiais PASS. Parent nuoroda išimama, kai jos native kategorija nebetinkama rodyti. |
| H08 | Vienkartinis1250ms opacity pasirodymas; reduced-motion jo nevykdo, be JavaScript turinys iš karto matomas. Visos trys būsenos actual Core naršyklėje PASS. |

Galutinis patikrinimas:308/308 Core testai; TypeScript ir3 failų ESLint be klaidų; framework build ir2 RSC manifestai /0 trūkstamų failų. Actual Worker HTTP26 puslapiai /204 media /237 aliases /10 formos-D1 scenarijų PASS, tikslus sintetinių įrašų sutvarkymas. Tikrų laiškų nesiųsta. Nepriklausoma nuo senos alias inventorizacijos24 pradinių homepage media adresų patikra taip pat PASS.

Naršyklė:109 galutiniai kadrai,7 pločiai1790/1440/1025/1024/768/390/320;56 akordeonų teksto /būsenos palyginimai, desktop ir mobile submenu /Escape, scroll, vaizdų įkėlimas ir no-overflow. Papildomai8 nepakeistų produktų /katalogų /politikos šablonų kadrai1440/390,320px vienalaikių vartotojo teksto tarpų patikra ir motion/no-JS kontrolės. Tarpiniai native peržiūros kadrai lieka atskiri nuo actual compiled Core įrodymų.

Preservation PASS: visų26 native puslapių paketo baitai ir204 vaizdų SHA sutampa su ankstesniu patvirtintu šaltiniu. Visi ankstesni226 alias ir kitų svetainių įrašai išlikę; tik11 papildyti. Viešos prozos, kontaktų, kainų, puslapių URL ir metaduomenų pakeitimų nėra.

## Įrodymai ir ribos

Visi šios partijos artefaktai: `D:/Core/output/signaturepads-migration-20261029/homepage-fixes-20261030/`. Pagrindiniai: `final-browser.json`, `core-http-verification.json`, `preservation-proof.json`, `media-alias-receipt.json`, `core-tests.log`, `build.log`, `rsc-check.json`; keturi `comparison-final-*.png` palyginimo lapai. Mobile originalo kadras844px aukščio, naujas900px; palyginime originalas papildytas apačioje, jo mastelis /kraštai neapkerpami.

Paleidimo eiga užfiksuota atvirai: po sėkmingo build du vietinio Wrangler paleidimai nutrūko `ECONNRESET`. Tas pats config /šaltinis sėkmingai paleistas diagnostiniu log režimu; tikras HTTP200 patvirtintas prieš pakartotinę faktinę patikrą. Veikiantis serveris po to atlaikė visas aukščiau išvardytas patikras. Dependency ar produkcijos konfigūracija nekeista.

Naršyklės harness dvi prielaidos patikslintos nekeičiant produkto: mobile nuorodos yra `nav` po `details`; native legacy vaizdai grąžina307, o ne tiesioginį200. Klaidingų prielaidų FAIL artefaktai išsaugoti. Visų7 browser scenarijų /4 papildomų kontrolių PASS išlaikytas, o paskutinis24-media tikrinimas užbaigtas atskiru realių užklausų tęsiniu; dabartinis `final-browser.mjs` jau priima teisingą307→200 sutartį. Tai nėra suklastotas viso pakartotinio scenarijaus vykdymas.

Vertinimas yra vizualiai artimas originalui, ne pikselių tapatumas. Smulkūs eilučių lūžiai /SVG valdikliai, sąmoningi kontrasto ir formos sutikimo skirtumai lieka. Fiziniai telefonai, Safari /Firefox ir tikras200% browser zoom lieka UNVERIFIED; Chrome touch ir teksto tarpų patikros jų neatstoja. Gyva svetainė, DNS, WordPress, hostingas ir realus paštas nekeisti. Ankstesnė SMTP /INBOX nežinomybė šiame vizualiniame pavedime nespręsta.
