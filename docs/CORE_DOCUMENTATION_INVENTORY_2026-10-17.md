# Core dokumentacijos inventorius ir pirmas karantino paketas

2026-10-17. [Issue193](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/193), šaka `codex/core-docs-quarantine-20261017`. Inventoriaus bazė – sėkmingai fetched `origin/main` **808581d919d06cb4a2d151cc7f9ec1be1782aba2**; švaraus naujo worktree start gate PASS 11:56:38 UTC. Ankstesnė `8413cfb4507fd8d919444c4c764f94b2f6c09b31` darbo šaka išsaugota. Companion sąsajos nekeičiamos ir šiame pakete nenaudojamos.

Tikslas – sumažinti klaidinančių dokumentacijos pradžios taškų skaičių, išsaugant istoriją ir palaikomus darbo kelius. Tai ribotas sekamų failų inventorius, o ne viso kodo nenaudojimo ar vykdančio runtime auditas. Failo data, vienodas hash arba nerastas importas savaime nėra pagrindas jį pašalinti.

## Kur pradėti darbą

| Darbas | Prižiūrimas pradžios taškas |
| --- | --- |
| Repo taisyklės ir nuosava failų sritis | [AGENTS](../AGENTS.md), [WORKSTREAMS](../WORKSTREAMS.md) ir aktuali GitHub rezervacija |
| Nauja nišinė svetainė | [START_HERE](../START_HERE.md), [CORE_BUILD_CONTRACT](../CORE_BUILD_CONTRACT.md), canonical builder/planner/audit skills |
| Git ir keli kompiuteriai | [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md), [MULTI_MACHINE](MULTI_MACHINE.md), [GITHUB](GITHUB.md) |
| Bendras pataisymas ar karantinas | [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md), [žurnalas ir plan/apply/restore](../core-improvements/README.md) |
| Konkrečios nišos būsena | Jos `sites/<siteId>.md`, aktualus roadmap ir atitinkamos datos įrodymai |
| Bendros būsenos istorija | [PROJECT_STATUS](../PROJECT_STATUS.md); jo datuotos santraukos nepatvirtina vėlesnių šakų ar dabartinio runtime |

Bazės `SKILLS/` bibliotekoje atskiro Git SKILL nėra; Git autoritetas šiame pakete yra pirmiau susieti canonical projekto dokumentai ir `scripts/git-freshness.mjs`. Asmeninė skill kopija nenaudota.

## Inventoriaus aprėptis

`git ls-files` bazėje: **2 672 failai**, iš jų **696 Markdown**. Failų skaičius pagal sritį: root38, `.github`3, `SKILLS`371, `agent-business-core`296, `business-development`38, `content-studio`68, `core-improvements`78, `docs`19, `domain-history`5, `domain-sorter`40, `inputs`53, `research`63, `scripts`12, `sites`1557, `voice-agent-plan`31. Skaičiai aprašo bazę prieš šį paketą.

Visų sekamų `.md/.txt/.mjs/.js/.py/.json/.ps1/.sh` failų iki 1 MiB netuščių baitų palyginimas rado **12 vienodo SHA-256 grupių**. Visų Markdown struktūrinė santykinių nuorodų patikra tikrino 2 766 nuorodas: 905 taikiniai šiame švariame clone neprieinami; dar 1 420 nuorodų naudoja absoliučius vietinius kelius. Tai skenerio radiniai, o ne 905 patvirtintos produkto klaidos: istoriniuose dokumentuose yra vietinių neperkeliamų įrodymų, trečiųjų šalių SOURCE tekstų ir senų darbo kelių. Skeneris netikrina interneto, heading anchor semantikos ar runtime būsenos. Šio paketo kriterijus – nesukurti naujų trūkstamų santykinių taikinių ir patikrinti visas pakeistas nuorodas.

Patikrinta kandidato turinio paskirtis, visos sekamos nuorodos, prižiūrimi įėjimo keliai ir šie programiniai naudojimo paviršiai:

- `content-studio/src/editorial-skill.mjs` abiem plan/draft režimais turi aiškų canonical SKILL/references sąrašą; root MVP dokumento nekrauna. Generatorius naudoja šį loaderį, ne visų root Markdown glob.
- `agent-business-core/runtime/src/pinet_core/agent_instructions.py` skaito tik savo `instructions/core/` ir profilio `instructions/niches/` fragmentus. Runtime šaltinis tik skaitytas; joks jo failas nepakeistas ir vykdantys procesai nevaldyti.
- `SKILLS/catalog.json`, `SKILLS/scripts/install-core-skills.mjs`, `audit-skills.mjs` ir kalibravimo `check-inputs.mjs` naudoja bibliotekos katalogą, SKILL, jo nuorodas bei fiksuotus profilių/corpus kelius. Root MVP nėra registruotas įvesties failas.
- `content-studio/package.json`, `domain-history/package.json`, runtime `pyproject.toml` ir abu `.github/workflows/*.yml` neįvardija MVP kaip CLI, build, job ar testų įvesties. Domenų tyrimo kodas skaito savo promptus ir builder business-validation; root MVP loaderio nerasta.
- `scripts/export-public-core.mjs` yra aiškiai parametrizuotas kito source medžio snapshot įrankis, aprašytas GITHUB dokumente. Jis nesuteikia MVP vykdymo autoriteto. `repository-inventory.mjs` yra failų dydžių inventorius; bendras failų išvardijimas nėra semantinis priklausymas nuo konkretaus plano.

Tai leidžia pagrįsti vieno dokumento perkėlimą. Tai nėra teiginys, kad nėra jokių išorinių rankinių nuorodų ar kad kiekviena funkcija visuose 2 672 failuose įrodyta naudojama.

## Karantinuota

Vienas švarus Git sekamas tekstinis failas: **`20_SVETAINIU_SEO_MVP.md`**, 7 976 baitai; darbo kopijos SHA-256 **59d2076c956ac506a7eb12cd09111a2b521c21211cc27ab72cf27869352f2875**. Bazės Git blob: `6c036c2770482e1c02144cbf9868065b2ac6e03b`.

Dokumentas buvo preskriptyvi 2026-09-29 santrauka su antrašte „Dabartinis planas“, be testų, approval ar audito kvitų. Jo svetainių apimtį jau apibrėžia aktualus AGENTS → START_HERE → CORE_BUILD_CONTRACT kelias ir susietos specialistų sutartys. Senasis tekstas siūlė bendrus šablonus/Vercel kryptį, kiekvienos nišos telefoną ir atskirus pašto aliasus; aktualios sutartys prižiūri savitą dizainą, realius nišos kontaktus, bendrą MB Pinet / info@pinet.lt numatytą kontaktą bei visą publikavimo/priėmimo kelią. Antro „dabartinio plano“ laikymas root didino klaidingo starto riziką.

Visos penkios rastos priklausomybės buvo dokumentacijos nuorodos: `20_SVETAINIU_MODULIAI_IR_TEMU_PLANAS.md:5`, `BENDRA_30_SVETAINIU_SISTEMA.md:13`, `TOP_20_DOMENU.md:7`, `MONETIZAVIMO_PLANAS.md:5`, `FABRIKO_IR_20_SVETAINIU_ARCHITEKTURA.md:9`. Pakeistas tik nukreipiantis sakinys/nuoroda į portable `CORE_BUILD_CONTRACT.md`; likę planai, lentelės, faktai ir ankstesni bandymų rezultatai išsaugoti. README pridėtas šio inventoriaus kelias. Naujo bendro vykdymo taisyklių rinkinio nekuriama.

Canonical `record` → `plan` → plano peržiūra → `apply` įvykdytas atskirai šiam failui, upgrade **`upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18`**:

- [Originalūs baitai, skirti istorijai ir atkūrimui](../core-improvements/entries/upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18/quarantine/source.txt).
- [Planas ir tikslus kelias/hash](../core-improvements/entries/upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18/quarantine-plan.json), [operacijos būsena](../core-improvements/entries/upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18/quarantine-state.json), [radinio įrašas](../core-improvements/entries/upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18/record.json).

Atkūrimas savo aktualioje šakoje, kai originalaus kelio nėra:

```powershell
node scripts/core-upgrade.mjs restore --id upgrade-39805578-fc01-457b-9b4a-8cc7a76d9a18
```

Helperis neperrašo naujo failo. Atkūrus dokumentą, penkias nuorodas galima grąžinti atskiru scoped revert, jei to reikia konkrečiai migracijai. Karantino `source.txt` yra istorinis tekstas; jis nėra vykdomas modulis, aktyvi instrukcija ar viešos svetainės paketo įvestis.

## Palikta dėl priklausomybių arba istorijos

| Kandidatas / grupė | Patikrintas naudojimas arba išsaugojimo priežastis |
| --- | --- |
| `inputs/.../miniekskavatoriai-lt.md` ir `research/autonomy/miniekskavatoriai-review/INPUT-ANALYSIS.md` | Vienodi baitai; tyrimo šaltinis ir konkretaus pirmo rezultato peržiūros įvestis yra skirtingi istorijos vaidmenys. |
| Miniekskavatorių FIRST-COMPLETION ir dabartiniai `sites/miniekskavatoriai/{BUSINESS,ACQUISITION,DESIGN,PHASE-1-AUDIT}.md` | Keturios vienodų baitų grupės; pirmo pateikimo įrodymai neliečiami. Dabartinis dokumentas gali keistis, istorinė kopija turi likti. |
| Laiptų `DESIGN-REVISION-2026-10-01` ir dabartiniai `AUDIT-SCORE.json`, `MEDIA.json`, `PHASE-1-AUDIT.md`, `PHASE-1-AUDIT.json`, taip pat `EDITORIAL-MEDIA-REVIEW.json` / `MEDIA-ACCEPTANCE.json` | Penkios grupės; revizijos ir acceptance įrodymai, ne saugūs valymo kandidatai. |
| Trys skirtingų nišų detektoriaus JSON su tuo pačiu `[]` rezultatu | Viena grupė; atskiri testų kontekstai. Vienodas tuščias rezultatas nesujungia auditų. |
| Madbeauty `prototype/ASSET_MANIFEST.json` ir `prototype/public/media.json` | Viena grupė; manifestas ir viešai aptarnaujamas atvaizdas. Runtime/build/public kopijos nevalomos. |
| `BENDRA_30_SVETAINIU_SISTEMA.md`, `FABRIKO_IR_20_SVETAINIU_ARCHITEKTURA.md` | Unikali ankstesnio kodo ir bandymų analizė. Palikta; pakeista tik perkeltą MVP nurodanti nuoroda. |
| `20_SVETAINIU_MODULIAI_IR_TEMU_PLANAS.md`, `MONETIZAVIMO_PLANAS.md`, `TOP_20_DOMENU.md`, `PIRMAS_PILOTAS_GREITOS_SVETAINES.md` | Unikalios domenų, monetizavimo ir piloto hipotezės. Atskiri turinio dubliai neįrodyti; planų lentelės nepanaikintos. |
| `docs/NEXT_CODEX_HANDOFF_2026-10-06.md`, `docs/AGENT_CALIBRATION_HANDOFF_2026-10-08.md`, `voice-agent-plan/` | Handoff ir planai tebėra susieti su aktualiais įėjimo dokumentais; sena data nėra uždarymo įrodymas. |
| `scripts/export-public-core.mjs` | Explicit manual CLI ir GITHUB runbook. Nepakeičiamas vien todėl, kad nėra įprasto importo. |
| `content-studio/scripts/build-tractor-site.mjs` | START_HERE nurodytas integracijos pavyzdys; nėra dead code. Kiti nišų build skriptai turi savo vietinio atkūrimo paskirtį. |
| `SKILLS/**/SOURCE_*`, ankstesni auditai, approval/fingerprint/benchmark failai, žurnalai ir mokymosi registrai | Saugoma kilmė bei nekintami įrodymai. Jokie istorijos hash ar statusai neperrašyti. |

## Abejotina – palikta

`content-studio/scripts/seed-tractor-pilot.mjs`, `finalize-pinet-operator.mjs`, `migrate-network-contacts.mjs`, `repair-auksarankiams-page-types.mjs` ir `scripts/export-domain-inputs.mjs` atrodo kaip konkretaus etapo CLI. Jie gali būti kviečiami rankiniu būdu, turi atskirus modelio/API arba eksporto įėjimus, o privačios studijos būsenos šiame pavedime netikrinome. Pakeičiančio palaikomo scenarijaus ir užbaigtos duomenų migracijos įrodymų nepakanka, todėl jų nekarantinavome ir nevykdėme. Nėra numanomo leidimo atkurti migraciją ar patvirtinti turinį.

Root domenų/verslo idėjų TXT, neperkelti vietiniai įrodymai ir senos absoliučios nuorodos taip pat paliktos: unikali informacija ar prieigos trūkumas nėra nenaudojimas. Šis paketas nenustato automatinio karantino ištrynimo termino. Kitas konkretus valymo paketas turi iš naujo fetchinti main, rezervuoti failus ir pateikti savo įrodymus.

## Patikra ir perdavimas

Vietinė patikra:

- Originalo/payload lygybė: Git blob, 7 976 baitai, plano SHA-256 ir `quarantined` būsena PASS; originalus kelias neegzistuoja.
- Penkiuose priklausomuose dokumentuose tik po vieną pakeistą eilutę; septyniuose paveiktuose dokumentuose 36 santykinės nuorodos turi taikinius. Santykinių nuorodų skeneris, įtraukęs naują inventorių ir žurnalą: 905 trūkstami taikiniai prieš ir po, naujų 0. Absoliučių vietinių nuorodų sumažėjo keturiomis; likusios neperrašytos.
- `node --test scripts/core-upgrade.test.mjs`: **7 PASS, 0 FAIL, 0 SKIP**, 14,22 s; įskaitant restore, stale plan, collision/tamper, nutrūkusios operacijos recovery, symlink ir CRLF atkūrimą kitame fixture clone.
- `node SKILLS/business-agent-calibration/scripts/check-inputs.mjs`: **6 PASS_INPUTS**, 0 issues, model calls0; tai instrukcijų/corpus įvesčių, ne elgsenos ar gyvų kanalų patikra.
- `git diff --check`: PASS. Tikslus staged safety ir committed provenance vykdomi prieš PR; rezultatai pridedami upgrade įvykiuose.

**Palikta įrankio priklausomybė:** šios bazės `main` neturi `scripts/core-upgrade-check.mjs` (`git cat-file -e` exit128). Naujesnio Root lango failai čia neperkelti. Committed provenance patikrai naudojama išsaugotos `8413cfb4507fd8d919444c4c764f94b2f6c09b31` kopijos checkerio `--root/--base/--head` sąsaja, keičiant tik šio paketo Git objektų skaitymo tikslą. Įrankio source pin ir tikrinamo paketo SHA įrašomi atskirai; tai nėra checkerio pristatymas į main. Jo shared-path klasifikatorius neapima šių root/docs Markdown failų, todėl papildomai tikrinama visų devynių deklaruotų pakeistų source kelių atitiktis journal scope. Root informuotas issue193 koordinacijoje.

**Palikta staged-safety priklausomybė:** main scanneris su `--diff-filter=ACM` praleido Git atpažintą 100 % pervadinimą į karantino `source.txt`: pirmas jo PASS apėmė tik 13 failų. Išsaugotas ankstesnis kvitas nelaikomas viso paketo patikra. Ta pati spraga jau pataisyta Root priklausančio `8413cfb` scannerio source (`ACMR`), todėl svetima pataisa čia nedubliuojama. Read-only pinned scanneris patikrino visus tuometinius 14 staged blobų, įskaitant 7 976 baitų payload: PASS, 0 findings; po naujų žurnalo įvykių tikrinamas galutinis stage. Scannerio Git blob `2644b57413b113d6a3203ae1e645b3d6bed063cf`, coverage checkerio blob `4f782e96b5275108b332655e579feb0a8c40abe8`. Abu pending main adoption klausimai perduoti Root; cleanup PR tų source failų nekeičia.

Patikros ir Git perdavimo faktai įrašomi šio upgrade nekintamuose `events/*.json`. Source PR nėra main merge ar kito PC/runtime adoption. Tikri procesai, DB, mokami tiekėjai, Chrome, klientų duomenys ir svetimi checkout šiame pakete nekeisti.

## Antras paketas: istorinių planų autoritetas ir rankiniai CLI

2026-10-17, [issue197](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/197), šaka `codex/core-docs-authority-20261017`. Naujo worktree start: sėkmingas fetch ir bazė **9a46650a033d283dfb559d7b835a26384e3225fe**, 14:29:46 UTC. Root navigacijos [PR198](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/198) sujungus į main **8664e22da6bedd126d2a44e5c4ea1f80edcdce80**, tęstinumo gate teisingai sustabdė darbą su `main_not_in_current_base`. Savas patikrintas karantino ir žurnalo checkpoint `ab15e38993aff316a28ca3f7f9c7109f70c09063` išsaugotas, main integruotas merge `be6943d8c1da58bda2317863127037d26364111e`; vienintelis WORKSTREAMS konfliktas išspręstas išlaikant abiejų agentų pastraipas. Continue gate 14:34:12 UTC PASS; aktualios taisyklės perskaitytos, jų keitimų nebuvo. Root `README.md`, `START_HERE.md`, `docs/DOCUMENTATION_MAP.md` šiame pakete neredaguoti.

### Kas atlikta

| Failai / veiksmas | Pagrindas ir išsaugota riba |
| --- | --- |
| `BENDRA_30_SVETAINIU_SISTEMA.md`, `FABRIKO_IR_20_SVETAINIU_ARCHITEKTURA.md` | Viršuje nurodyta 2026-09-29 analizės ir bandymų paskirtis. Fabriko dokumento nuoroda į bendrą planą pakeista iš seno absoliutaus kelio į tikrą santykinį taikinį. Auditas, skaičiai, rekomendacijos ir vietinio eksporto kilmė išsaugoti. |
| `20_SVETAINIU_MODULIAI_IR_TEMU_PLANAS.md`, `MONETIZAVIMO_PLANAS.md`, `TOP_20_DOMENU.md` | Pažymėta, kad tai pradinės hipotezės, o dabartinę nišos kryptį nustato jos tyrimas ir galiojančios sutartys. Nepakeistos domenų lentelės, kainų prielaidos ar ankstesni variantai. |
| `agent-business-core/README.md`, `PROJECT_STATUS.md` | Pradinis architektūros planas ir datuotos būsenų suvestinės aiškiai atskirti nuo dabartinės realizacijos. Nurodytas runtime README, kalibravimo skill ir taikomos sutartys; naujo runtime priėmimo nepareikšta. |
| `PROJECT_STATUS.md`, `agent-business-core/runtime/README.md`, `MAIL_CORE.md` | Šeši į Git neperkelti JSON/HTML kvitai pažymėti kaip istoriniai vietiniai artefaktai su originaliais keliais. MAIL_CORE papildomai nurodo tikrą sekamą M5 QA dokumentą. Originalios datos, rezultatai ir ribos išsaugoti; trūkstami kvitai negeneruoti ir neskaityti. |
| [Rankinių CLI paskirties indeksas](LEGACY_CLI_REFERENCE.md) | Septyni konkretūs scenarijai aprašyti pagal šaltinį, poveikį ir išsaugojimo priežastį. Migracijos, patvirtinimai, eksportai ir bootstrap nevykdyti; visi CLI failai nepakeisti. |
| `PIRMAS_PILOTAS_GREITOS_SVETAINES.md` | Vienintelis šio paketo karantinas. Tai tik antraštė ir nuoroda į [sites/greitossvetaines.md](../sites/greitossvetaines.md), be unikalaus plano ar įrodymų. Ankstesnėje šio inventoriaus lentelėje jis konservatyviai sugrupuotas su hipotezių planais; detali dabartinio turinio peržiūra patikslina tik šio aliaso sprendimą. Sena lentelė palikta nepakeista. |

Karantino upgrade: `upgrade-cbb19e1b-1cef-4a9a-b6ed-5ab933768301`. Originalūs **264 worktree baitai**, SHA-256 **f1d916272fde48a591183a4851278549a23075dde242c27053fc6e36995dc293**, išsaugoti [payload](../core-improvements/entries/upgrade-cbb19e1b-1cef-4a9a-b6ed-5ab933768301/quarantine/source.txt); planas ir būsena yra tame pačiame įraše. Payload CRLF normalizavus į LF tiksliai sutampa su bazės Git blob. `sites/greitossvetaines.md` nepakito. Atkūrimas:

```powershell
node scripts/core-upgrade.mjs restore --id upgrade-cbb19e1b-1cef-4a9a-b6ed-5ab933768301
```

Prieš karantiną viso sekamo repo pavadinimo paieška rado tik pirmo inventoriaus istorinę eilutę. Peržiūrėti package/start/test, CI, studijos serverio, generatoriaus ir redakcinių instrukcijų įkėlimo keliai: jie nenaudoja šio root aliaso. Modelis svetaines atranda iš JSON, instrukcijų loaderis skaito aiškų SKILLS sąrašą; bendri inventory/safety skaitytuvai nėra aliasą vykdantis modulis. Kodo importas, palaikomas CLI ar aktyvi dokumento nuoroda į aliasą nerasti. Palaikomas tiesioginis svetainės dokumentas lieka vietoje. Tikras restore šiame pakete neatliktas; patikrinti išsaugoti baitai, planas, būsena ir esamo helperio atkūrimo sutartis, ji nepakeista.

### Kas palikta ir kodėl

Visi penki išsamūs root planai turi unikalias hipotezes ar ankstesnių bandymų analizę, todėl išsaugoti. Pirmojo inventoriaus 12 vienodų baitų grupių, SOURCE archyvai, handoff, approval, auditai ir per-site faktai neliečiami. Vien nepasiekiamas Fabriko eksportas ar senas kelias neįrodo jo istorijos nereikalingumo. Privačios studijos migracijų užbaigimas nežinomas, todėl keturi modelį/API keičiantys CLI išsaugoti su aiškiu poveikiu; du eksportavimo CLI ir nišos build pavyzdys taip pat turi dokumentuotą paskirtį.

Konkreti išsaugoto istorinio kodo riba: `content-studio/scripts/build-tractor-site.mjs:15` vis dar turi seno kompiuterio `createRequire` kelią, kitur – ankstesnį kontaktą ir tiesioginį patvirtinimą. Jo guard saugo jau patvirtintą svetainę, tačiau tai nėra dabartinės peržiūros ar naujo clone tinkamumo įrodymas. Radinys perduotas Root ir issue197; sutarta nekurti klaidingo palaikymo įspūdžio daline kelio pataisa. Naujas CLI indeksas aiškiai nurodo, kad šis bootstrap ir istoriniai migravimo scenarijai nėra prižiūrimas naujos svetainės ar publikavimo pradžios taškas. Dabartiniam darbui naudojama modelio, medijos ir peržiūros eiga pagal sutartis. Root navigacijos paketas turi atskirą šaltinį ir įrodymus; šio paketo rezultatai nepatvirtina viso PC katalogų, priklausomybių ar runtime švarumo.

### Patikros ribos

Šaltinio patikra palygina visus devynis redaguotus esamus dokumentus su main8664: pašalinus tik naujas paskirties pastabas ir grąžinus septynias tiksliai deklaruotas nuorodų pataisas, originalus turinys sutampa. Šio inventoriaus ankstesnė dalis išliko nepakeistas prefiksas; Root navigacijos ir svetainės dokumentai sutampa su bazės versija. Visa nauja proza atskirai perskaityta ir suredaguota lietuviškai. Produkto sąsajos, šriftai ir CSS nekeisti; naršyklės vaizdo patikra neatlikta.

Struktūrinis Markdown nuorodų tikrinimas yra šaltinio patikra, ne visų istorinių taikinių semantinis auditas. To paties šio paketo skenerio main8664 bazėje rasti 921 nepasiekiami santykiniai taikiniai; po šešių privačių kvitų aiškaus žymėjimo – 915, naujų trūkstamų taikinių 0. Šie skaičiai nelyginami tiesiogiai su pirmojo paketo 905: skiriasi bazė ir parserio aprėptis. Likusių istorinių/šabloninių kelių masiškai neperrašėme. Viena mašinos Markdown nuoroda pataisyta; kodu pažymėti istoriniai keliai išsaugoti. Galutinė paveiktų nuorodų suma, exact staged safety, committed coverage ir Git handoff registruojami naujuose nekintamuose įvykiuose.

Paskirties ir CLI dokumentacijos upgrade: `upgrade-69e3747f-1774-45a2-8af4-d5b13da081d9`. Main vis dar neturi naujesnio coverage checkerio, o jo staged scannerio ACM pasirinkimas gali praleisti rename payload. Kaip pirmame pakete, naudojami atskirai užfiksuotos Root priklausančios 8413cfb kopijos read-only įrankiai: safety blob `2644b57413b113d6a3203ae1e645b3d6bed063cf`, checker blob `4f782e96b5275108b332655e579feb0a8c40abe8`. Jų source čia neperkeltas. Papildomai tikrinama visų 13 šio paketo source kelių atitiktis deklaruotai sričiai. PR, main merge ir kito checkout/runtime pritaikymas lieka atskiri faktai.
