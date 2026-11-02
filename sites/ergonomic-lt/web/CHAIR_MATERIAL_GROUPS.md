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
| Kvalifikuotos medžiagų grupės | 20 | Prijungtos visos 19 dabartinio J indekso groups547 versijų ir išsaugota ankstesnė KYOU sąlyginė paletė. Kiekviena grupė galioja tik savo konstrukcijai; dalis grupių yra medžio, metalo ar plastiko, ne apmušalo. |
| Tik pilnos stebėtos būsenos | 15 | Nėra naujo laisvo bendro gobeleno pasirinkimo; išlaikytos originalios visos būsenos ir jų apribojimai. |
| Tik originalios medžiagos | 15 | Nėra patvirtinto alternatyvų ryšio su originaliais paviršiais. |
| Deklaruota fiksuota apdaila | 4 | Šaltinis nedeklaruoja kitų apdailos pasirinkimų. |

Ankstesnio pagrindinio kelio 12 šeimų / 28 anchor metaduomenys ir jų originalūs vaidmenų laukai įrašyti tame pačiame faile. Bendras adapteris taikomas ir vėliau įkeltam pilnam runtime, kai jo paties SHA, node/primitive ryšys ir leistini perėjimai praeina tas pačias patikras. `structure-only` kėdės lieka originalių apdailų. Dabartinis inventorius sutikrintas su 256 kėdžių sąrašu: 202 pagrindinio kelio originalios apdailos ir 54 PC2 paketai. Šis skaičius nėra spalvų palečių priėmimas. Šiame chate J duomenų atnaujinimas paruoštas vietinei integracijai; viešą leidimą valdo pagrindinis 3D integruotojas.

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

### Tęsinys iki visų apmušalų spalvų · 2026-11-02

Papildymo prašyme taip pat atskirti visi 54 PC2 paketai: 25 be alternatyvių medžiagų ryšių, 23 su išsaugomomis pilnomis būsenomis ir papildomai reikalingu vienodos medžiagos / nepadengtų kontekstų įrodymu, 2 su pernaudotinomis kvalifikuotomis grupėmis ir 4 su išsaugoma deklaruota fiksuota apdaila. Jau priimtų būsenų kartotinai rinkti neprašoma. Tai papildo 175 modelių spragas seno Native šaltinio audite; šių skaičių negalima sudėti nepašalinus sutampančio sustabdyto įrašo.

Nepagrįstas neapmušalų finish laukas UI dabar aiškiai lieka tekstiniu specifikacijos pasirinkimu. Konstrukcijos pasirinkimai atskiriami pagal tikrą `_OPTIONS` klasę, o ne `CPLASTIC` / `CFRAME` pavadinimo pradžią; todėl pavadinimas nesuteikia neįrodytos 3D spalvos, o tikri geometrijos perėjimai išsaugomi.

Savo šakoje integruotas tuo metu paskelbtas `99eda1f83fc6101549921da38b566de47d882ffb` source (merge `b2bd785`), išsaugant controls-only, 88 stalų ir penkių naujų kėdžių pakeitimus. Konfliktuose išlaikyti abu originalų žymėjimai, pilna visų asset SHA / bytes patikra ir abu cleanup veiksmai. Bendras medžiagų / controls / upholstery testų rinkinys 28/28 PASS; `browser-integrated-20261102/RESULT.json` patvirtina desktop ir 390px Xilium gobeleną (5 laukai / 6 paviršiai), nekintantį plastiką / metalą, tikslius originalius material / geometry / world refs ir raw GPU kadrą, ratuko puslapio slinkimą, apmušalo apžiūros įjungimą / išjungimą bei viso ekrano mygtuko nebuvimą.

Dabartinis inventorius atnaujintas pagal naują publikuotą sąrašą: **256 kėdės**, iš jų 202 su originalia apdaila ir tie patys 54 PC2 paketai. Audito kodas nebepririštas prie seno 251 skaičiaus; reikalauja tikslios visų publikuotų kėdžių ir priėmimo indeksų atitikties. Vietinė peržiūra skaito dabartinį published asset map. Serverio runtime skaitymui pritaikytas tas pats aiškiai įjungiamas loopback origin kaip vietinei naršyklės peržiūrai: taip nereikia kopijuoti penkių naujų runtime ar keisti saugomų baseline junction. Produkcijoje be šio nustatymo išlieka įprastas filesystem kelias; tikri loaderių SHA ir schemų vartai nekinta. `continuation-20261102/LOCAL-RUNTIME-TRANSPORT.json`: 5 naujų modelių tikri loaderiai ir tikslūs token round-trip PASS, be GLB skaitymo ar ankstesnių geometrijos patikrų kartojimo.

Pavedimas neužbaigtas vien 251 įrašo inventoriumi. Toliau plečiama tikra kėdžių medžiagų aprėptis: pagal esamo 110 audito tiekėjo laukus pridėti aptraukti porankių padukai, pagalvėlė, vidinės / išorinės atlošo pusės, korpuso viršutinis / apatinis apmušalas ir šoniniai profiliai. Specializuotas šoninio profilio kolekcijos valdiklis turi pirmenybę prieš bendrą `CUPHGROUP` tiek parinkčių grupavime, tiek rendererio medžiagos kolekcijoje. Paprastas OP tinklelis ir 3D RN tinklelis yra skirtingos medžiagos; jų nesuderinamos spalvų sritys nebesujungiamos į vieną neveikiantį valdiklį. Mišrus kvalifikuotas tuple lieka nedalomas. Medžiagų testai: 17/17 PASS.

Tai nesuteikia leidimo nuspalvinti neįrodytų paviršių: originalių asset / node / primitive ir pilnų kvalifikuotų būsenų vartai lieka. Naujų spalvų ar kolekcijų iš tekstinių sąrašų nekuriama.

`scripts/prepare-chair-material-source-request.ts` naudoja jau baigto `COLOR-AUDIT110-V2-RESULT.json` audito CSV, sutikrina jo tapatybę ir parengia konkretų papildymo prašymą, nekartodamas 907 MB šaltinių audito. Gautas `output/chair-material-groups/continuation-20261102/SOURCE-REQUEST.json`: 203 šaltinio įrašai (202 uždaryti), 175 modeliai su apmušalų / tinklelio įrodymų spragomis, 657 susiję spalvų ir kolekcijų laukai, 10 141 žinoma nepadengta reikšmė ir 132 ribotos arba nežinomos srities laukai. Reikšmių suma nėra savarankiškų užklausų skaičius: priklausomi prefiksai ir tuple turi būti išsaugoti. CSV neišsamumas nėra įrodymas, kad kitų 28 modelių apmušalų nėra.

Prašyme reikalingos tikros dabartinio runtime ir savo geometrijos tapatybės, po prefikso galiojančios sritys, priežastiniai paviršių ryšiai arba pilnos stebėtos / keičiamų dalių būsenos, originalios medžiagos bei aiškios aprėpties ribos. Apie konkretų papildymą pranešta pagrindiniam 3D integruotojui, kuris jau valdo PC2 kanalą. Svetimi PC2 `UZDUOTIS` / `EILE` failai neredaguoti; pagrindinis Native lieka išjungtas pagal 111. Ši suvestinė nėra spalvų priėmimas ar viso pavedimo užbaigimas.

### Visų kėdžių tęsinys · 2026-10-31

Po tiesioginio pavedimo taikyti visoms kėdėms bendras adapteris patikrintas pagal visą dabar publikuoto `/3d-visi.html` sąrašą, o ne tik 4ME, Xilium ir Souly pavyzdžius. Tikslus 251 kėdės kodas, peržiūros kelias, priėmimo režimas ir nekintamo paketo SHA yra `content/chair-material-rollout.json`. Šis sąrašas apima 197 konstrukcijų konfigūratorius su originalia apdaila ir 54 PC2 paketus: 2 su patvirtintais medžiagų grupių pasirinkimais, 23 tik su pilnomis stebėtomis spalvinėmis būsenomis, 25 be patvirtintų alternatyvų ir 4 su deklaruota fiksuota apdaila. Tai nereiškia 251 naujos spalvų paletės ar 251 modelio vizualinio priėmimo.

Papildomai inventorizuotos visų 12 ankstesnių šeimų 28 pagrindinės būsenos, kad bendras adapteris aprėptų ir ankstesnes išsaugotas komplektacijas. Rastas trūkstamas Tref `CBACKRESTMESHCOLOR` originalaus atlošo tinklelio vaidmuo. Jis dabar atskiriamas nuo sėdynės apmušalo; fiksuotas FX01 nekeičiamas pasirenkant kitą sėdynės spalvą. Nauja regresija naudoja tikrą Tref variklį ir jo leistą LAR101 pasirinkimą. Atnaujintas medžiagų testų failas: 13/13 PASS; svetainės `tsc --noEmit --incremental false`: PASS.

Vienkartinio aprėpties audito komanda, vykdoma iš `web`:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/audit-chair-material-rollout.ts --asset-map=PATH/ASSET-FILE-IDENTITIES.json
```

Sąrašą atnaujina aiškus `--write`. Auditas sutikrina publikuotų modelių rinkinio ir jau priimtų paketų tapatybes, neperleidžia užbaigtų Native / geometrijos / transporto / PDF patikrų. Ankstesnių įrodymų negalima pernaudoti pasikeitus jų source ar juos vartojančiai logikai. Šio tęsinio kamera, rendererio ciklas, geometrija, užklausų ir PDF kodas nesikeitė; todėl ankstesnės jų patikros nekartotos. Naujo build ar publikavimo nėra.

Nuotraukų chatas atskirai ruošia `viewer-controls.ts` / kameros pakeitimą nuo tos pačios 483220d3 bazės. Su juo suderinta maža viewer import / props / load callback integracija pagal abiejų commit diff. Šio darbo source nekeičia jo helperio, focus, ratuko, fullscreen, contact-shadow ar kito checkout. Vienintelis bendros peržiūros publikavimo integratorius lieka pagrindinis 3D chatas; šiam spalvų pakeitimui publikavimo leidimas dar atskiras.

Atkūrimas – revert tik šio PR commit savo integracijos šakoje; prieš tai apsaugoti kito 3D valdymo commit. Paketai / originalai / viešo Worker build / vienas ankstesnis build ir G: duomenys nepakeisti. MAIN NATIVE lieka OFF pagal 111.

### J paketų priėmimas ir PC2 pavedimas · 2026-11-02

Tiesioginis Roko leidimas perduoti surinkimą PC2 įvykdytas naujomis 3D-STAL žinutėmis 182 ir 183. Perduotas konkrečių spragų prašymas su visu 24 J įrašų momentiniu sąrašu; 19 jų turi groups547 versijas. Svetimi eilės ar užduoties failai neredaguoti. PC2 biudžetai ir Native limitai nepadidinti; pagrindinis Native tebėra OFF111. Drive patvirtino žinučių buvimą bendrame kanale. PC2 atsakyme 184 papildomai pateikė 7 tikslių optimizuotų assetų 190 aiškių selector alias įrodymus; visų 9 failų SHA priimti, baigtas jų geometrijos patikrinimas nekartotas. 175 pagrindinio kelio modelių įrodymų spragos tebėra atviros; jų riboto surinkimo planas tikslinamas žinute 185.

Visos 19 jau pateiktų grupių versijų priimtos naudojant `scripts/prepare-j-chair-materials.ts`. Originali geometrija ir jau patikrintos senos būsenos pakartotinai neeksportuotos. Skirtingų versijų witness išsaugomi atskirai, jų grupės tarpusavyje nekomponuojamos. To paties OWN papildomo failo SHA alias iš grupių ir pilnos būsenos dokumentų turi vieną nekintamą transporto nuorodą.

Jupiter ir Utila naudoja anksčiau paskelbto lossless transporto SHA. Tikslus ankstesnis originalaus dokumento ir BIN įrodymas susieja RAW su esamu transportu; nauji node/primitive, matricos, accessor ir PBR ryšiai tikrinami atskirai. Jupiter dekoduotas atmintyje tik naujiems paviršių ryšiams; Utila nepakeistų kitų konstrukcijų geometrijos patikros nekartotos. Originalų kopijų, kodavimo ar Native užklausų nėra. Viešai skaitomų failų 25 MiB riba nepakeista.

Valdikliai iškart atsiveria tik kai jų visas pradinis tuple nekeičia originalios medžiagos. Originalo peržiūros žymimasis langelis išlaiko pasirinktus kodus. Nekintančio pasirinkto kodo / SHA / baitų paketo nebeperkrauna kito katalogo įrašo atnaujinimas. Medžiagų, scoped būsenų, alias ir lossless perrišimo patikros: 41 PASS; TypeScript PASS. Vietiniai desktop / phone įrodymai saugomi `output/chair-material-groups/browser-j-*`; ankstesni nepaveikti užklausų, PDF, Native ir transporto įrodymai pernaudoti.

Papildomo PC2 paketo 190 alias sugretinti su tiksliais J runtime, selectors, manifesto ir pradinio gavėjo review SHA. Jupiter įdiegti 24 optimizuoto modelio kanoniniai selector ir pradinės medžiagos ID; tiksliai sutampa originalūs node/primitive adresai, WORLD, geometrijos parašai ir PBR reikšmės. Gamintojo pasirinktų medžiagų JSON bei tuple nekeičiami. Utila 166 kitų konstrukcijų ryšiai priimti kaip įrodymai; jos dabartinis spalvų witness naudoja nepakeistą assetą, todėl nenaudojami ryšiai į rendererį neįkeliami ir kitoms konstrukcijoms spalvų nesuteikia. Papildomų GLB skaitymų, dekodavimo ar gamintojo matavimų šiame žingsnyje nėra. Naujas Jupiter review pakartotinai patikrintas desktop/phone; gamintojo detalės pakeitimas po bendro performance integravimo patikrintas atskirai viename paveiktame vaizde.

Prijungtas dabartinis paskelbtas performance source `62cb9c4`: išsaugotas ilgiau gyvenantis WebGL kontekstas, tikslių baitų cache, originalių tekstūrų paruošimas ir iš anksto parengtas apšvietimas. 48 paveiktų medžiagų / valdymo / cache patikros bei TypeScript PASS; po integravimo 4ME2 ir Xilium desktop/phone patvirtina spalvą, originalo atkūrimą ir valdymą. Pernaudotas jau paskelbtas 4ME2 review `9880db08…`: visos jo geometrijos, selector, grupių, PBR ir tekstūrų baitų tapatybės sutampa su savo kvalifikuotu variantu; skyrėsi tik keturi tų pačių JPG transporto URL. Šio paketo pakartotinai kelti nereikia.


## 2026-11-02: exact conditional Bjarg context

KBJA003WW002 additionally receives manifest `17ff76a2acc4463b0812f454bb48f56bf9b4567ff80e326d29fc4fedc01fffb3` as `QUALIFIED_CONDITIONAL_BJA3_74_OWN_4181`. This is one exact OWN construction at context79/runtime0ca26e7a/base47a23f32. It contains74 atomic full five-field states under `CPRICEGROUP=_2`, `CHEADRESTUPHGROUP=VL`, `CHEADRESTUPHCOLOR=VL5002`: XR41, EGL17, CUR15 and one invariant VL state. VL has no selectable colour entry. Each selected tuple applies its complete measured patch from the original OWN baseline; no prefix/leaf factorization is introduced.

The receiver requires the separate conditional-context contract, matching token/runtime/construction/base assets, exact whole tuple-domain coverage and the bounded producer certificate. It rejects full-GROUP promotion, changed prefixes, duplicate/missing tuples, a selectable hidden VL colour and changed runtime pins. Other constructions remain original-only. Previous19 J group versions and earlier whole-state witnesses remain intact. This does not qualify the115924 factory combinations or declare a complete palette.

Receiving evidence is in `content/chair-conditional-palette-intake.json`. All74 consumer plans passed; desktop and phone each exercised CUR/XR/VL, protected other material references and geometry/WORLD, exact original GPU/material restoration, and retained selected codes. Desktop also left the construction scope and returned to the original state. No Native, geometry copies, producer WHOLE replay, deployment or public PASS. Source inputs for the separate175-model PC2 collection were transferred in messages188–190; those inputs do not represent additional palette passes.

## 2026-11-02: dependent NXT2/UTI4 finite-context receiver draft

This extension stays on its own branch based on PR316/ac4eed7. It does not merge or publish that draft renderer. The public Souly source460d22f/version3152714b, current Worker and rollback build remain protected.

- KNXT002WW002 `colors-20261102-v1-qualified-context4341`, manifest05bd923e…: exactly13 whole PRICE1/YB upholstery tuples at original runtimeb337f1b4/context1. BLACK back plastic and BL seat plastic remain readonly invariants. The separate PRICE2/EGL16 original is a control, never an invented fourteenth YB choice.
- KUTI004WW002 `colors-20261102-v1-qualified-context4461`, manifest8f67a053…: exactly13 whole PRICE1/YB upholstery tuples and6 mesh choices at runtime8f383c48/context0. Every upholstery tuple retains its supplied readonly CUPHSIDECOLOR. There is one upholstery control and one mesh control, with disjoint canonical OWN selectors. Frame plastic, mesh group and seat plastic are fixed readonly properties. The supplied28 complete manufacturer states and10 distinct joint states do not mean78 separate manufacturer exports or all constructions.

The explicit receiver checks the pinned package manifest, qualification certificate SHA, original runtime/context, construction, scope token, complete finite domain and every OWN patch target. Conditional4341/4461 flags remain incomplete for full palette/GROUP/all geometry. Material-only cases cannot add or remove geometry. Startup and reset keep the true original; entering the YB scope requires explicit selection because its first real colour is not the original EGL control.

NXT reuses all9 existing lossless runtime mappings from the original base manifest60e242c3. The complete rebound runtime and old partial palette must equal the previously admitted published ones; only proved transport identities change. New selectors on its OWN base use the prior original-document/BIN equivalence proof plus a single exact decoder admission of the published20.93MB transport. There is no re-encoding, source GLB copying or repeat of old geometry jobs. UTI uses the exact existing runtime/geometry identities. Both new asset deltas contain only their review JSON; texture assets are reused by their real SHA/bytes/immutable file identities.

All123 received physical files576203795B passed source and independent target SHA. Prior19 GROUP versions and Bjarg193/ac4 receiver/browser evidence are preserved; Bjarg geometry and browser cases are not repeated. Focused receiver/material/lossless/union regressions41/41 and both TypeScript configurations pass. Actual local browser and receiving receipts live under the separate E-backed `all-ready-publication-20261029/pc2-conditional-contexts-20261102` continuation. Tests and source admission are not browser or publication PASS; no Native or producer WHOLE requests are made.
