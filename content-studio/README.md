# Turinio studija

Vietinis GUI maždaug 30 skirtingų svetainių turinio planavimui, rengimui ir patvirtintų paketų eksportui. Pradžioje įtraukti 20 pasirinktų nišinių domenų. Jie yra **planavimo įrašai**, o ne įrodymas, kad domenai nupirkti arba svetainės jau veikia.

## Paleidimas Windows aplinkoje

Reikia Node.js 22+ ir veikiančio `codex` CLI prisijungimo.

```powershell
cd C:\Users\lenovo\Documents\nisiniai_puslapiai_monetizavimui\content-studio
npm start
```

Atidarykite `http://127.0.0.1:4317`. Serveris klausosi tik `127.0.0.1`; duomenys saugomi `data/`, eksportuoti paketai – `output/`. Nėra internetinio prisijungimo ar kelių operatorių bendro redagavimo: ši studija **nepublikuojama kaip vieša svetainė**. `npm test` patikrina publikavimo versijų, domenų ir vietinės API ribas.

## Redaktoriaus eiga

Bendra agento instrukcija yra [niche-content-planner](../SKILLS/niche-content-planner/SKILL.md). Ji apima nišos tyrimą, sezonų pritaikymą, savitus URL, klasterius, nuorodas, naudingą tekstą ir faktų patikrą. `src/editorial-skill.mjs` kiekvieno darbo pradžioje nuskaito skill ir reikalingus jo priedus, tiesiogiai įtraukia juos į Codex CLI užduotį ir į `jobs.json` įrašo instrukcijų SHA-256. Viena partija naudoja tą pačią instrukcijų versiją; pakeitimai taikomi kitam darbui. Trūkstant failo nėra tylaus perėjimo prie bendro prompto. Alternatyvų skill katalogą galima nurodyti `STUDIO_EDITORIAL_SKILL_DIR` (kataloge turi būti tie patys failai).

Nuo 2026-10-01 abu CLI režimai taip pat tiesiogiai gauna [PROJECT_CONTRACT](../SKILLS/PROJECT_CONTRACT.md), jo tekstas įskaičiuojamas į tą patį SHA-256. Alternatyvus skill katalogas turi turėti `../PROJECT_CONTRACT.md` su realia projekto sutartimi; jos trūkstant darbas stabdomas iki CLI, nepublikuoja ir nekeičia svetainės turinio. Importuoti SOURCE_SKILL/SOURCE_PROMPT ir visi 52 helpers į generavimo promptą automatiškai nekraunami. Esamo darbo snapshot nekeičiamas.

Skill neįjungia neegzistuojančių įrankių: kai konkrečiame CLI darbe nėra šaltinių paieškos, agentas turi palikti tyrimo poreikius ir negali teigti patikrinęs šaltinius. Viešinimo patikros bei automatizavimo ribos išlieka aprašytos žemiau.

Šiame kompiuteryje `C:/Users/lenovo/.codex/skills/niche-content-planner` yra katalogo nuoroda į projekto skill, todėl bendras Codex ir studija naudoja vieną šaltinį. Naujoje Codex sesijoje jį galima kviesti `$niche-content-planner`; studijai aptikimo ar sesijos perkrovimo nereikia. `node scripts/evaluate-editorial-skill.mjs` yra pasirenkamas tikro CLI elgesio bandymas su dviem sintetinėmis nišomis ir techniniu juodraščiu; naudoja paskyros CLI limitą, rezultatus saugo tik `output/skill-validation/`, svetainių duomenų nekeičia. `npm test` CLI integraciją tikrina su izoliuotu pakaitalu, be generavimo išlaidų.

1. Domenui priskiriama niša ir pasiūlymo hipotezė. Tikri verslo faktai ir veikiantis el. paštas būtini prieš viešinimą; telefonas neprivalomas ir jo neišgalvojame. Pradiniai 20 pasiūlymų yra hipotezės.
2. Pagrindinis „Automatiškai suplanuoti ir parengti“ veiksmas paleidžia vieną eilės darbą: Codex CLI suplanuoja pasirinktą horizontą ir straipsnių tikslą pagal nišą bei sezoną (numatytai šeši mėnesiai), sugrupuoja temas į klasterius, parenka datas ir nuosekliai sukuria juodraščius. Savininkui nereikia pačiam pildyti kalendoriaus. „Kalendorius“ rodo visų domenų planus pagal datą, leidžia filtruoti domeną, atverti redaktorių ar privačią peržiūrą. Pradinio plano, šešių mėnesių plano ir pavienių juodraščių veiksmai palikti kaip pasirenkami valdymo įrankiai.
   Publikavimo datos yra redakcinis planas, ne įrodymas, kad URL jau įdiegtas. Agentas sezoninę temą taiko tik susijusiai nišai, o ne visiems domenams vienodai.
3. Codex grąžina redaguojamą tekstą, faktų patikros pastabas, vidinių nuorodų pasiūlymus ir galimus išorinius šaltinius. Jei šaltinio realiai nepatikrino, jis turi palikti URL sąrašą tuščią. Suplanuoti šaltinių kandidatai išlieka juodraštyje, tačiau **nepatenka į patvirtintą paketą**, kol nėra patikrinti.
4. „Vaizdai“ → sugeneruokite su ImageGen arba importuokite originalų PNG/JPEG/WebP. Bendras vietinis importas automatiškai paruošia 360/640/800/1200/1600 px WebP variantus iki tikro originalo dydžio, išlaiko alpha ir pritaiko JPEG orientaciją. Puslapiui pasirinkite vieną vaizdo šeimą; variantai priskiriami kartu. Pridėkite tikrą alt tekstą ir naudojimo teisių įrašą. Originalas ir pilnas pateiktas prompt saugomi privačiai, ne pakete. Visa sutartis: [MEDIA_CORE.md](../MEDIA_CORE.md).
5. Agentas patikrina galutinį tekstą, vaizdus, šaltinius ir rendered puslapį. Bendras `finalizeInternalLinks` užbaigia pagrįstus juodraščio ryšius, `recordEditorialReview` susieja tikrus peržiūros įrodymus su revizija ir svetainės faktais, `approveReviewedBatch` atominiu įrašu patvirtina susietus puslapius. Naujo workflow individualus approval / export kelias taip pat reikalauja aktualios peržiūros. Pasikeitęs juodraštis nepakeičia jau patvirtintos versijos. Visa eiga ir senų svetainių migracija: [CONTENT_CORE.md](../CONTENT_CORE.md).
6. `releaseContent` sukuria `output/releases/<siteId>/<releaseId>/content-package.json`, `assets/` ir privatų kontrolinių sumų/peržiūros manifestą. `scripts/verify-content-release.mjs` prieš importą tikrina tikrus paketo ir media baitus bei viešą validatorį. Importuoti tik content-package ir assets; manifestą laikyti privačiai. Būsena exported-not-deployed. Senas neįjungtas workflow turi legacy `output/<siteId>/` eksportą. Jei būsimi patvirtinti straipsniai jau įdiegti, jie pasirodo pagal `publishAt` be cron; vien studijos juodraščių viešas variklis nemato.

Patvirtintą realios svetainės eksportą į Dovanos viešą variklį importuokite jo repozitorijoje:

```powershell
cd C:\Users\lenovo\Documents\dovanos-memorycasting
$SiteId = 'pasirinktos-svetaines-id'
npm run content:import -- "C:\Users\lenovo\Documents\nisiniai_puslapiai_monetizavimui\content-studio\output\$SiteId"
npm run content:compile
```

Jei tos svetainės paketas jau yra, prieš pridėdami `--replace` peržiūrėkite pakeitimus. Bandomojo `tmp/browser-output/bandymas-core` paketo su netikrais kontaktais neimportuokite į viešą projektą.

Generavimo darbai vykdomi po vieną, matomi „Darbai“. Didelė šešių mėnesių juodraščių partija gali trukti ilgai; kiekvieno puslapio klaida rodoma atskirai. Nepavykę darbai gali būti paleisti iš naujo. `Codex CLI` kviečiamas su JSON schema, read-only darbo režimu ir be automatinio kodo rašymo. Dabartinis autonominis etapas baigiasi **juodraščiu**, o ne viešu straipsniu: patikros, patvirtinimo ir importo vartai dar nėra automatizuoti. [Automatizavimo eiga](../AUTONOMY_ROADMAP.md) apibrėžia kitus etapus. „Klasteris“ yra redakcinis temų žemėlapis, ne Google suteikiamas autoriteto balas.

## ImageGen

Šioje Codex sesijoje integruotas `imagegen` įrankis gali sukurti vaizdą ir išsaugoti jį į projekto failą, kurį importuosite per GUI. Jei šiame kompiuteryje sąmoningai nustatytas `OPENAI_API_KEY`, GUI gali paleisti oficialų `imagegen` įgūdžio `scripts/image_gen.py` CLI tiesiogiai. Naudojamas numatytasis `gpt-image-2` ir WebP išvestis. Kai rakto nėra, GUI siūlo nukopijuoti promptą integruotam įrankiui; ji neapsimeta, kad vaizdas jau sugeneruotas. Naudojant CLI kelią, taikomas atskiras Image API apmokestinimas.

## Automatinio media kelio patikra

`npm test` dabar turi 14 testų, įskaitant PNG importą per tikrą localhost HTTP, penkių WebP variantų priskyrimą vienu pasirinkimu, patvirtintos revizijos nekintamumą, tenant/source/export izoliaciją, alpha, EXIF, dydžių ribas ir aiškų >60 variantų atmetimą ir penkių šeimų / 25 variantų eksportą. Atskirą GUI bandymą galima paleisti `node scripts/media-ui-fixture.mjs` (port 4327, tik `tmp/media-ui-2026-09-30/`, sintetiniai kontaktai). Šio fixture neeksportuoti į viešą core. 2026-09-30 reali GUI peržiūra parodė vieną bibliotekos kortelę ir vieną checkbox visiems penkiems variantams; įrodymai `../sites/traktoriupadangos/media-ui-browser.json` ir `MEDIA-PIPELINE-VERIFICATION.json`.

Agentas naudoja bendrą `scripts/import-image.mjs`, o ne domenui skirtą optimizavimo skriptą. Tikslūs argumentai, ribos ir viešos medijos atvaizdavimas aprašyti [MEDIA_CORE.md](../MEDIA_CORE.md); promptuose vykdymo instrukcija yra [media-workflow.md](../SKILLS/niche-content-planner/references/media-workflow.md). Automatinio teksto darbo ir faktiškai sugeneruotų/patikrintų vaizdų būsenos skiriamos.

## Turinio paketo sutartis

Tiksli [JSON schema](schemas/content-package.schema.json). Paketas turi `schemaVersion:1`, `siteId`, `canonicalHost`, `locale`, svetainės konfigūraciją ir patvirtintų `pages[]` sąrašą. Puslapis turi `type`, `slug`, `body: Block[]`, ISO UTC `publishAt`, `revisionHash`, `approval`, `media`, `links`. Kontrolinė suma yra `SHA256(stable sorted-key JSON)` iš `{siteId,type,slug,title,description,intent,body,publishAt,media,links}` ir, kai yra, `externalLinks`. Viešas variklis turi perskaičiuoti šią sumą ir puslapį rodyti tik kai patvirtinimas sutampa bei `publishAt <= serverio dabartinis laikas`. Vienas URL registre priklauso vienam `siteId` ir kanoniniam domenui.

  Medijos `src` kelias yra `/content-assets/<siteId>/<assetId>.<ext>`. Importas turi kopijuoti `assets/<assetId>.<ext>` į šį viešą kelią. Nežinomo domeno negalima nukreipti į kitą svetainę. Nuorodos į būsimus ar atšauktus puslapius viešai nerodomos. Pasirenkami `externalLinks` turi HTTPS adresą, pavadinimą ir teiginį paaiškinantį kontekstą; redakcinis `verified` žymeklis į viešą paketą neeksportuojamas.

## Našumas

Studijos GUI nenaudoja išorinių šriftų, JS bibliotekų ar analitikos. Viešų svetainių variklyje yra atskira Lighthouse patikra; tikslas yra aukšti mobilūs Performance, Accessibility, Best Practices ir SEO balai, bet balai patvirtinami tik paleidus realų testą su konkretų turinį ir vaizdus turinčia svetaine. WebP vaizdams reikia tikrų matmenų ir tikslaus `alt`; hero vaizdą svetainės variklis turi krauti prioritetu, žemiau esančius – tingiai. SEO puslapiai turi grąžinti serverio HTML, canonical ir tik gyvus URL sitemap.

## Ribos

`output/` paketas nėra deployment. Jo įdiegimas ir konkretaus domeno DNS vykdomas atskirai. Viešajame core parengta užklausos forma su D1 įrašu; prieš paleidimą dar reikia pritaikyti migraciją, end-to-end patikrinti gavimą ir pasirūpinti operatoriaus pranešimu bei privatumo informacija. Tiekėjų, mokėjimų, skambučių ir pilnos analitikos integracijų nėra. Šiuo metu vaizdų bei teiginių patikra prieš eksportą yra atskiras redakcinis vartas; [autonomijos eigoje](../AUTONOMY_ROADMAP.md) numatyta jį automatizuoti su įrodymų žurnalu. Generavimas negarantuoja faktų tikslumo ar Google pozicijų.

## V2 gift ir keli rašytojai (2026-10-05)

V1 išlieka naujų nišų numatytas formatas. V2 lossless inline/editorial redaktorius skirtas koordinuotai lt-LT gift migracijai; nepritaikytas V2 Codex generatorius fail-closed, UI disabled. Naujos nišos nekopijuoja gift maketo ar bandomų `.example` paketų. [Adapterio patikra](../research/dovanos123-integration-2026-10-04/M1/ACCEPTANCE.md) ir [integracijos kontraktas](../DOVANOS123_CORE_INTEGRATION.md).

Modelio mutacijos serializuojamos process-local ir atominiu tarp-procesiniu `.model-write.lock` DATA kataloge. Laukiama ribotai; crash užraktas neperimamas pagal amžių. Nešalinti kito proceso užrakto ar stabdyti jo darbo. Vienas GUI/queue savininkas turi restart recovery; įprastas initialize CLI tik paruošia katalogus/seed ir neišjungia svetimų jobs. Senus modelio procesus reikia perleisti jų savininkui, kad įsigaliotų naujas lock. Agentai naudoja savo OUTPUT, source redaguoja tik model API; temp/synthetic nekeliamas į main.

## Bendras visų nišų review ir release (2026-10-05)

CONTENT_CORE.md yra aktuali bendra eiga: policy/kadencija/timezone, kelių CLI partijų V1 generavimas, draft link finalizavimas, revision-bound agento review, atomic batch approval ir immutable release su paketo/media SHA. GUI turi Turinio eiga. V1 generavimo užduotis įjungia griežtus naujus review/export vartus; legacy įrašai migruoja su realia peržiūra. V2 review/release bendri, jo tekstinis generatorius vis dar OFF. Agentas turi faktiškai patikrinti turinį/asetus; receipt pildymas nėra patikra. Release lieka exported-not-deployed. Skaityti [CONTENT_CORE](../CONTENT_CORE.md); prieš importą naudoti scripts/verify-content-release.mjs. Ankstesnės instrukcijos apie tik planuojamą įrodymų žurnalą pakeistos šiuo inkrementu.
