# Tekstų TVS

Roko 2026-11-03 pavedimas: prisijungęs administratorius redaguoja produkto tekstus ir 3D parinkčių pavadinimus naršydamas svetainę. Esamas tekstas, išsaugotas EN/PL originalas ir redaguojamas pasiūlymas rodomi šoniniame skydelyje. Bendro termino patvirtinimas keičia visų susietų produktų pažangą. Publikavimas atskiras nuo juodraščio ir patvirtinimo.

## Apimtis

- Esama admin autentifikacija, vienas papildomas tekstų registras ir papildoma DB migracija.
- Nekintami terminų ID, šaltinio versija, atskiri juodraščiai / patvirtinimas / paskelbimas, optimistinis pakeitimų versijų tikrinimas ir audito istorija.
- Produktų sąrašas ir produkto skaitiklis: surinkti, patikrinti, likę tekstai. Nepilnas 3D inventorius visada aiškiai pažymėtas; nulis likusių nepatvirtina nesurinktų opcijų.
- Esami 665 pasiūlymai ir 345 modelių susiejimai importuojami iš patikrinto vietinio inventoriaus. Trūkstami kalbų originalai neišgalvojami. Naujo AI generavimo ar mokamų API ši versija neįjungia.
- Produktų antraštės, aprašų ir įžangos pastraipos redaguojamos pagal konkretaus modelio ID; bendri 3D terminai pagal tikslius modelio / lauko / reikšmės susiejimus. DOM teksto paieška nėra tapatybės šaltinis.
- Autentifikuotas originalų / gamintojo nuorodų endpoint atskirtas nuo viešo tik paskelbtų tekstų rodymo. Vieši props negauna gamintojo duomenų.
- Suderinamumas su SQLite vietoje ir esama Cloudflare D1 sąsaja. Jokių Native sesijų, 3D paketų, geometrijos, medžiagų, pasirinkimų, ID, seed ar gamintojo šaltinių pakeitimų.

## Patikra

Tikras DB kelias prieš UI: juodraštis neviešas, patvirtinimas atnaujina abiejų produktų skaitiklius, paskelbimas pakeičia tik nurodytą tekstą. Prasmingos regresijos: naujas / pasikeitęs šaltinis, pasenęs įrašymas, tuščias tekstas, trūkstama autentifikacija, vienodas tekstas skirtingame kontekste, produkto išimtis, atšaukimas. Po UI desktop ir 320 px tikras naršyklės bandymas, tada abiejų runtime tipų ir paveiktų testų patikra. Publikavimui paliekami aktualūs Native / išteklių / build ir visų esamų modelių išsaugojimo vartai.

Core HEAD prieš darbą 2865240e6259f2ab7d45a72c272ed5c1e9ef63c6; fetched main 25292e20219b735df7f04c5807dd4c100f98addc; companion c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Own issue319 / PR320 tęstinumas; G ir J tik skaitymui.

## Atskira bandymo aplinka

`wrangler.text-review.json` kuria tik `ergonomic-text-review` Worker su atskira D1 (`227b3e97-2ebd-48cc-abce-c390931da765`). Build: `ERGONOMIC_TEXT_REVIEW_STAGE=1`, `ERGONOMIC_WRANGLER_CONFIG=wrangler.text-review.json`, atskiras šviežias E-backed scaffold po D:/Core. Šiame režime esami vieši media/models/fonts/branding skaitomi fiksuoto ankstesnės peržiūros adreso proxy; neperduodami slapukai ir Authorization, nekopijuojami ir nekeičiami Native failai. Metaduomenų įkėliklis išlaiko esamą pilną šaltinio SHA ir transporto ribų patikrą. Užklausos ir senos produkto mutacijos bandymo aplinkoje uždraustos; leidžiama tik prisijungti / atsijungti ir keisti tekstų registrą. Pagrindinis ergonomic-preview Worker, jo D1, publikavimo seka ir Native failai nepakeičiami.

Inventoriaus papildymas: `node scripts/text-review/import-inventory.mjs <naujas-patikrintas-translation-data.json>`. Esami terminų ID ir D1 pažanga išsaugomi, nauji įrašai pradedami nepatikrinti; pakeistų susiejimų lineage `previousIds` atveria seną istoriją, bet neperima seno patvirtinimo. Toliau įprasta peržiūrėta build / publikavimo eiga. Dabartinis inventorius nelaikomas baigtu.

Pasiūlymai turi prasmės kontekstą; vienodai parašyti skirtingų laukų terminai automatiškai nesujungiami. Žmogus tikrina pirmą bendro termino vertimą ir patvirtina jo taikymo apimtį. Naujos frazės be parengto pasiūlymo rodo esamą tekstą su aiškiu paaiškinimu. Ši versija naujų vertimų negeneruoja.

Tekstų D1 yra ilgalaikis atskiras registras. Standartinės ir launch aplinkos `TEXT_REVIEW_DB` binding nurodo tą patį registrą; stage `DB` nurodo tik šį registrą. Peržiūros darbų nereikės perkelti iš Excel ar perrašyti į pagrindinę produkto DB. Šioje užduotyje paskelbtas tik atskiras Worker; pagrindinė peržiūra dar nenaudoja naujo TVS kodo. Tarp Worker viešas fetch blokuojamas 1042, todėl stage ištekliams naudoja fiksuotą `REFERENCE_ASSETS` service binding. Tai nesuteikia teisės į kitų Worker mutacijas: į jį nukreipiami tik GET/HEAD leistinų išteklių keliams, be prisijungimo duomenų.

Platesnės regresijos: ankstesnis 2865240 ir kandidatas su vienodais public fixtures abu turi 29 identiškas nesėkmes (trūkstami vietiniai 3D/nuotraukų šaltiniai bei senos tikėtinos reikšmės). 260 ankstesnių testų praeina, 6 naujos TVS patikros praeina. Tai nėra viso projekto žalias rinkinys; įrodymai D:/Core/output/ergonomic-text-cms-20261103/REGRESSION-COMPARISON.json. Esami geometrijos testai nepakeisti ir jų ribos nemažintos.
