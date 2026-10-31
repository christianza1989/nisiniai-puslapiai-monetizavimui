# A01–A07 vietinio atitikimo pataisos

Roko 2026-10-30 pavedimas: sutvarkyti septynis [gilaus palyginimo](DEEP-COMPARISON-20261029.md) radinius vietoje, išsaugoti nuorodas ir patikrinti kompiuterio / telefono vaizdą. Gyvos svetainės keisti negalima.

Source: PUBLIC `47b957972aad55c3bd6cf6243a94d2233a790e02`, CORE bazė `2717a5c576fbcf2faeeb18c11249622edc9f13fb`; fetched main `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da` / `25292e20219b735df7f04c5807dd4c100f98addc`. Koordinavimas: CORE issue303 / PUBLIC issue102. Pataisos per-site; bendras publikavimo, SEO, routerio ir pašto kontraktas nekeistas.

| Radinys | Pataisa ir patikra |
| --- | --- |
| A01 | Greitoji peržiūra gauna tikrą patvirtinto produkto SSR turinį: aprašymą, parametrus, kainą, galeriją ir užklausos nuorodą. Nuotrauka atidaroma atskirame dialoge. Nesėkmės metu lieka veikianti produkto nuoroda; uždarymas nutraukia užklausą, vėlyvas atsakymas lango neatveria. |
| A02 | `/prekes/` be šoninės juostos, H1 prieinamas skaitytuvui; programinės įrangos filtrai iki 959 px po prekėmis, įrangos prieš. Ties 768 px trys stulpeliai; telefone įrangai du, programinei ir bendram katalogui vienas. |
| A03 | Pagrindinis pradinis galerijos vaizdas 300 px, kiti originalo demonstravimo pločiai iš matavimų; miniatiūros 100 px ir pažymėta aktyvi. Vieną vaizdą turintiems software produktams nedubliuojama miniatiūra. Visos vaizdų šeimos ir nuorodos išliko. |
| A04 | Faktinis kortelės tekstas 14/21 px, 600; produkto H1 24 px, 600; strong 600. Sutvarkytos mobilių konteinerių paraštės, hero akordeono tarpai ir pavadinimų laužymas. Kontrasto bei fokuso pagerinimai išlaikyti. Tai artimas originalui maketas, ne pikselių tapatumo pažadas. |
| A05 | Native Studio revizijoje pašalintas tik antrasis Sigma `Pristatymas 5-8 d.d.` blokas. Realūs edit / editorial review / approve / release API, tikras Codex aktorius pagal savininko vietinį pavedimą. Ankstesnė revizija ir release išliko. |
| A06 | Visi penki originalo rikiavimo pasirinkimai. Date / popularity / rating remiasi faktinėmis 2026-10-30 originalo produktų sekomis, ne išgalvotomis datomis ar įvertinimais. Priimami originalus `products-per-page` ir ankstesnis vietinis `product_count`; filtrai, `paged` ir užklausų nuorodos išliko. |
| A07 | Abu dialogai atidarant gauna produkto pavadinimą; Escape uždaro tik viršutinį, fokusas grįžta. 44 px uždarymo valdiklis lieka matomas slenkant. Papildomai rezervuota vieta ilgam desktop pavadinimui, kad jo neuždengtų uždarymo mygtukas. |

## Įrodymai

Naujas atskiras katalogas: `D:/Core/output/signaturepads-migration-20261029/parity-fixes-20261030/`. Ankstesnis 120 kadrų auditas ir originalo capture nepakeisti.

- `draft-qa.json`: 24 originalo / native juodraščio kadrai, desktop 1440, touch-emulated 390 ir tablet 768 px; funkcijų ir tikro produkto greitosios peržiūros patikra.
- `draft-verification.json`: visų 13 įrenginių pastraipų ir paryškinimų sekos sutampa su užfiksuotu originalu; abu kiekio parametrai, puslapiavimas, klaidos ir nutrauktos užklausos būsena; touch veiksmai 390 / 320 px.
- `core-browser.json`: tikro 8956 Core Worker 19 vaizdų ties 1440 / 768 / 390 / 320 px; 19 produktų kainos ir galerijos, 13 aprašymų, 8 home blokai, 92 unikalūs viešai pateiktų nuorodų tikslai su query ir anchor patikra. Tai pradinio 4bca4009 Core build kadrai; paskesnės CSS tarpo / centravimo pataisos tikrinami atskirai final-reconfirmation.json. Nėra horizontalaus slinkimo ar trūkstamų vaizdų. Desktop klaviatūra, atskiras nuotraukos dialogas ir fokuso grąžinimas PASS.
- `core-controls.json`: tikro Core kiekio ir užklausos klaidos scenarijai; reali Chrome lietimo emuliacija (`maxTouchPoints=1`, coarse pointer) ties 390 / 320 px, galerija, uždarymas ir mobilus kontaktų meniu PASS. Scenarijai laukia `data-sp-ready=true`; pradinis bandymas palietė nuorodą prieš React valdiklio įkėlimą ir teisėtai atvėrė pilną produkto URL. Pirminis žurnalas `core-controls-run.log` išsaugotas, koreguotos patikros žurnalas `core-controls-confirmation.log`.
- `original-facts-proof.json`: 19 kainų ir nuotraukų kiekių sutampa su originalo auditu; 25 kiti native įrašai nepakito nė vienu lauku, kontaktai ir visų 199 vaizdų baitai nepakito; Sigma body skiriasi tik viena tikslia pašalinta pastraipa, visos galerijų ID sekos tos pačios.
- `core-http-verification.json`: 26 aktyvūs URL, po vieną H1/title/description/canonical; 199 vaizdai, 225 senųjų vaizdų nuorodos, slash / legacy / retired / commerce elgesys ir privataus host izoliacija. Dešimt vietinės formos / D1 scenarijų PASS, du sintetiniai priimti įrašai tiksliai pašalinti; tikras laiškas nesiųstas.
- `core-tests.log`: 305/305; TypeScript PASS; penkių pakeistų JS/MJS/test failų lint PASS, klaidų ir perspėjimų nėra. Pirmas framework build ir du RSC manifestai / 0 trūkstamų failų PASS. Po paskutinių CSS pavadinimo tarpo ir mobilios galerijos pataisymų galutinis build-final.log ir du RSC manifestai / 0 trūkstamų failų PASS. final-reconfirmation.json tikslinė patikra PASS ties 1440 / 390 / 320 px: nėra pavadinimo ir valdiklio persidengimo, 44×44 valdiklis, 29 greitosios peržiūros pastraipos, nested Escape ir fokusas, 300×300 pagrindinis vaizdas. Ties 390 px nuotraukos x45/y124, ties 320 px x10/y124 – originalo padėtis. Šeši papildomi tikro galutinio Core kadrai.

## Native paketas ir vietinė peržiūra

Sigma nauja body revizija `8bc51ee52e57ada83f3d54803d694e3eb1beb696b8137ff138659fed75e6e6b9`; release `3a7cbc66-bbac-42b1-a1c0-1da892287e77`, paketo SHA256 `38a9024fc02d9f31062e98438214413402d147573822bcd5cbdaa486a4827b81`. 26 puslapiai, 199 media. Pagrindinėje PUBLIC šakoje tik shadow import; aktyvus admission tik savo output engine, `local-preview/testOnly`. Production host neaptarnaujamas.

Peržiūra: `http://127.0.0.1:8956/`; engine `D:/Core/output/signaturepads-migration-20261029/core-integration/engine`. SMTP / Hostinger API / voice išjungti. Gyvos svetainės, WordPress, DNS, hostingas ir realus paštas nekeisti.

Fiziniai telefonai, Safari, tikras 200% browser zoom ir Lighthouse šiame pavedime nepatikrinti. Lietimo emuliacija nėra fizinio įrenginio bandymas. Pašto autentifikacijos ir INBOX gavimo būsena išlieka nepatvirtinta; tai ankstesnio paleidimo etapo priklausomybė. Visi A01–A07 uždaryti vietinei versijai. Galutinis Core source 47b95797, patikra final-reconfirmation.json PASS. Tai nėra production launch priėmimas.
