# Kėdžių spalvų pasirinkimai pagal medžiagą

Darbas #313, `codex/chair-material-groups-20261031`. Priklausomybė – nesujungtas PR298, tikslus pradinis source `483220d31c721f2f3d7314beb332d735a1dba307`. Aktuali patikrinta main bazė `25292e20219b735df7f04c5807dd4c100f98addc`; companion `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da`, be companion kodo pakeitimų. Tai atskiras peržiūrimas pakeitimas; jis nesujungia ir neskelbia PR298.

## Veikimas ir duomenų ribos

- Ankstesnių produktų konfigūratorių „Gobelenas“ kartu pakeičia visus aktyvius tai pačiai audinio rūšiai įrodytai priskirtus spalvų laukus. Kolekcija ir spalva pateikiamos viename pasirinkime. Esama kainų grupė lieka tikra paletės sąlyga. Užklausos, URL ir PDF gauna visą galutinę esamo engine patikrintą būseną, su originaliais opcijų kodais.
- Tinklelis, oda ir dirbtinė oda turi atskiras grupes. Nežinomos kolekcijos vadinamos „Apmušalas“. Fiksuota odinė galvos atrama netampa gobeleno dalimi. Plastikas, metalas, mediena ir neįrodyti paviršiai negauna gobeleno spalvos.
- Kiekvienas kandidatas pereina esamus leistinus setter perėjimus tik atmintyje. Galutinis variantas turi išlaikyti konstrukciją ir visus kitus laukus, tą pačią kolekciją ir spalvą visose grupės dalyse. Į React nepatenka tarpinis dalinai pakeistas variantas. Fiksuota nesuderinama dalis arba tuščia bendra paletė sustabdo tik atitinkamą pasirinkimą.
- PC2 nepriklausomos grupės sujungiamos tik pasirinkus vieną konkretų konstrukcijos witness ir jo apdailos šaką. Imama tik tikrų visos grupės tuple parinkčių sankirta; dar kartą vykdomas `qualifiedChairPlan`. Metalo/medienos grupės, part swaps ir apdailos šakos lieka savo pirminėse ribose. Kolekcijos ir spalvos tuple neskaidomas.
- Pilnos stebėtos būsenos lieka pilnos. Iš jų nekuriamos atskiros laisvai maišomos spalvos. Jeigu neįrodyta vienoda visų apmuštų dalių būsena arba nepriklausomos grupės, UI tai pasako; galimas tik visas perduotas variantas. Original-only paketai neįgyja ankstesnio kito adapterio paletės.

## Originalių paviršių ryšys

`Viewer3D.onChairRoles(proof)` taikomas tik ankstesniam keičiamų kėdžių apdailų keliui. Prieš callback tikrinamas visas GLB SHA256 ir baitų skaičius. `tagLegacyChairRoles` skaito konkretaus originalaus glTF node `extras.finishField` ir GLTFLoader node/primitive associations. Įrašas saugo asset SHA, node, primitive, pirminį material indeksą ir originalų part ID. Vardai, spalvos panašumas ar sutampantis medžiagos SHA nenaudojami grupavimui.

`visibleLegacyChairRoles(root)` ignoruoja pašalintas / nematomas dalis. Valdiklio proof turi sutapti su dabartine surenkamų asset multiaibe; adresai negali kartotis. Kelių material primitives node be atskiro pakankamo susiejimo lieka originalus ir nesukuria spalvos įrodymo. Trūkstant ryšio, UI rodo neprieinamą medžiagos pasirinkimą arba aiškiai tekstinį originalaus lauko pasirinkimą.

PC2 naudoja jau perduotus own `assetSha256 + selectorId + baseMaterialId` ryšius ir kvalifikuotas grupes. Šis pakeitimas nekeičia paketų, originalių selectors, bibliotekos, runtime SHA, geometrijos ar kitų modelių medžiagų.

`legacyChairSurfaceRole(mesh)` yra maža API suderintam kitam 3D valdymo darbui. Ji grąžina įrodytą konkretaus mesh vaidmenį; sukimą, ratuką, focus ar contact-shadow šis darbas nekeičia.

## Tikslus originalas

`createLegacyChairMaterialApplication` išsaugo pačias originalių medžiagų nuorodas. Naujas apdailas rodo atskiros sunaikinamos kopijos; originalūs material, texture, geometry ir pasaulio matricų objektai neperrašomi. „Rodyti originalias modelio medžiagas“ yra peržiūros režimas; užklausos parinktys lieka aiškiai atskirtos. Išjungus režimą arba pasirinkus spalvą vėl rodomos pasirinktos apdailos.

PC2 išlaiko esamą original-relative atkūrimą, async revision apsaugą ir savų papildomų dalių pašalinimą grįžtant į originalą.

## Aprėptis

Tikslus kiekvieno PC2 kodo ir versijos sąrašas: `content/chair-material-group-coverage.json`. Jo 54 paketai:

| Rezultatas | Paketų skaičius | Ribos |
|---|---:|---|
| Kvalifikuotos medžiagų grupės | 2 | KWI2003WW002: 763 tikros apmušalo tuple parinktys viename witness; KYOU001WW001: 77 bendros sėdynės/atlošo parinktys pradinėje sąlyginėje šakoje. Kitos jų grupės / witness išsaugoti. |
| Tik pilnos stebėtos būsenos | 23 | Nėra naujo laisvo bendro gobeleno pasirinkimo; išlaikytos originalios visos būsenos ir jų apribojimai. |
| Tik originalios medžiagos | 25 | Nėra patvirtinto alternatyvų ryšio su originaliais paviršiais. Čia patenka abu 4ME PC2 paketai. |
| Deklaruota fiksuota apdaila | 4 | Šaltinis nedeklaruoja kitų apdailos pasirinkimų. |

Ankstesnio pagrindinio kelio 12 šeimų / 28 anchor metaduomenys ir jų originalūs vaidmenų laukai įrašyti tame pačiame faile. Bendras adapteris taikomas ir vėliau įkeltam pilnam runtime, kai jo paties SHA, node/primitive ryšys ir leistini perėjimai praeina tas pačias patikras. `structure-only` kėdės lieka originalių apdailų. 198 įrašai kandidatuose ar 231 įrašas papildomame indekse nėra tiek pat naujai patvirtintų spalvinių palečių; ne visi indeksų įrašai atitinka atskirą aktyvią viešą kortelę. Viešas 251/80 skaičius šiuo darbu nekeičiamas.

Pirmiausia patikrinti 4ME MESH WHITE K4ME002WW004, Xilium DUO-BACK KXIL044WW001 ir Souly KSOU001WW003 originalūs asset SHA bei originalūs node vaidmenys. Xilium apima sėdynę, atlošo apmušalą, šoninius apmuštus profilius ir galvos atramą; 4ME ir Souly atskiria tinklelį. Šiuose atrinktuose porankiuose neįrodytas gobelenas, todėl jie neperdažomi. Būsimos tikrai aptrauktos porankio dalys gali jungtis tik gavus tokį pat originalų paviršiaus vaidmens įrodymą.

Kolekcijų pavadinimai remiasi esamais source profiliais bei [gamintojo medžiagų matrica](https://www.nowystyl.com/files/interactive/catalogue/EX/Finishes-Matrix/files/assets/common/downloads/publication.pdf?uni=e0ebb25c5f4cc234ff6f2b8ed1e9babe). SD/LE ir SP yra odos kodai; jie nevadinami gobelenu. VL sluoksniai nurodyti [gamintojo apdailų kataloge](https://dam.nowystyl.com/assets-prod/f5e70dd7-6176-4e7c-a201-be1fc4d09640_Finishes_Catalogue_EN-PL-DE-FR_E01_2025.pdf). Tai padeda tik teisingai pavadinti jau leistą kolekciją; katalogas nesuteikia naujų konkretaus modelio kombinacijų.

## Vietinė peržiūra ir patikra

Peržiūra: `http://127.0.0.1:3510/produktai/kedes/4me-darbo-kedes-modelis-20402097/`; PC2: `/3d-perziura-pc2/?chair=KYOU001WW001`. Fizinis worktree yra E:, loginis – `D:/Core/worktrees/chair-material-groups-20261031/platform`.

Naudojamos jau kvalifikuotos dependency junction ir originalių failų skaitymas, be modelių baseline / node_modules kopijavimo. Vietinis `ERGONOMIC_LOCAL_ASSET_ORIGIN` priima tik loopback HTTP. Next development režime išjungiamas disko webpack cache ir sutvarkomas jo cross-drive entry kelias; diegimo elgsena nekeičiama. Child Next cwd naudoja tą patį fizinį E: source, kad Next nesujungtų D: ir E: absoliučių kelių. Visų komandų darbo vieta nurodyta D:.

Įrodymai saugomi `web/output/chair-material-groups/` šiame worktree. Jie į Git nekeliami; source ir ši suvestinė yra peržiūrimi PR.

- `FINAL-FOCUSED-REGRESSION-V3.log` (29/29): own-role, visų dalių sinchronizavimo, fiksuotos odos, svetimo asset, mixed primitive, conditional grupių, part swaps, async ir originalų testai.
- `FINAL-STATE-PDF-REGRESSION.log`: visas galutinis rinkinys 45/45, įskaitant 2000 perėjimų, originalių GLB SHA / geometriją, užklausas ir PDF.
- `REGRESSION.log`: 39/41 po originalių GLB skaitymo junction prijungimo; likusios dvi PDF patikros iš pradžių neturėjo originalių nuotraukų. `PDF-DEPENDENCY-FIX.log`: abi 2/2 praeina prijungus originalų media katalogą. Nei šaltiniai, nei testų kriterijai nepakeisti.
- `browser-v2/RESULT.json`: 4ME, Xilium, Souly desktop 1440×1000 ir phone 390×844 – realūs spalvų pasirinkimai, originalios material nuorodos / pasaulio matricos ir identiškas raw GPU kadras grįžus į originalą, be puslapio horizontalaus overflow.
- `browser-v3-final/FAILURE.json` saugo penkias papildomas visų atitinkamų mesh ir plastiko/metalo nepakeitimo patikras bei šeštos patikros nutrūkimą source HMR metu. Po source sustabdymo `browser-v4-souly-phone/RESULT.json` patvirtina šeštą atvejį; `ACTUAL-SURFACES.json` rodo abi tinklo dalis ir gobeleno dalį. Ankstesnis nepavykęs įrašas neištrintas.
- `browser-xilium-fabric-v3/RESULT.json`: papildomas Xilium audinio pasirinkimas pakeitus kainų grupę į pirmą – vienas „Gobelenas“, visos penkios spalvų laukų grupės / šeši originalūs paviršiai ir tikslus originalas desktop / phone. Ši patikra atskleidė, kad UI turi naudoti tą patį CSEATUPHGROUP ← CBACKRESTUPHGROUP mirror kaip PDF; bendras `engine.stateValues` dabar naudojamas abiem. Ankstesnis klaidingas dviejų medžiagų valdiklių atvejis išsaugotas ir turi regresiją.
- `fallback-ui-final/RESULT.json`: original-only ir pilnų būsenų paaiškinimai desktop / 320px, be horizontalaus overflow.
- `pc2-browser-v3/RESULT.json`: sąlyginė KYOU001WW001 paletė desktop ir phone, bendras sėdynės / atlošo pasirinkimas, tikslus originalas ir sąžiningas original-only K4ME002WW004. Ankstesni 404 dėl neįjungto vietinės PC2 peržiūros flag ir startup nudge kvitai išsaugoti; tai nėra produkto spalvų PASS.
- `FINAL-TYPECHECK-V3.log`: svetainės `tsc --noEmit --incremental false`.

Tai naršyklės telefono pločio emuliacija, ne fizinio telefono testas. Pilnas gamybinis build, visų 251 kėdžių vizualinis priėmimas, nauji Native / gamintojo bandymai, mokami tyrimai, PR merge ir publikavimas neatlikti. Šio darbo build / dev pradžios vartai tikrino D≥60 GB ir E≥150 GB. Esama Next 16.4 paleidimo priemonė pranešė apie saugos atnaujinimą; dependency atnaujinimas nepatenka į šį spalvų pakeitimą. Impeccable nurodė senesnį design sidecar; jis nekeistas, esamas DESIGN / Manrope stilius išsaugotas.

## Integravimas ir atkūrimas

Nuotraukų chatas atskirai ruošia `viewer-controls.ts` / kameros pakeitimą nuo tos pačios 483220d3 bazės. Su juo suderinta maža viewer import / props / load callback integracija pagal abiejų commit diff. Šio darbo source nekeičia jo helperio, focus, ratuko, fullscreen, contact-shadow ar kito checkout. Vienintelis bendros peržiūros publikavimo integratorius lieka pagrindinis 3D chatas; šiam spalvų pakeitimui publikavimo leidimas dar atskiras.

Atkūrimas – revert tik šio PR commit savo integracijos šakoje; prieš tai apsaugoti kito 3D valdymo commit. Paketai / originalai / viešo Worker build / vienas ankstesnis build ir G: duomenys nepakeisti. MAIN NATIVE lieka OFF pagal 111.
