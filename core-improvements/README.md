# Autonominių core patobulinimų žurnalas ir karantinas

Visiems su core dirbantiems agentams taikomas [privalomas patirties ciklas](../CORE_IMPROVEMENT.md#privalomas-visų-core-agentų-patirties-ciklas). Prieš push `node scripts/core-upgrade-check.mjs` tikrina committed shared diff, exact file / real directory scope ir naują local-verified PASS įvykį. CI tą patį tikrina PR base/head. Naujam tęsimui pridėti įvykius, neperrašyti bendroje bazėje esančio record/event. Checker netikrina pataisos semantikos ar kito adapterio adoption; tai lieka actual priėmimo dalis. Vienas įrašas neturi tyliai apimti nesusijusių pataisų.

Kanoninis procesas: [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md). Kiekvienam įgyvendinamam shared patobulinimui atskiras `entries/upgrade-<UUID>/record.json` ir nekintami `events/*.json`; naujas įvykis nurodo tikrą patikrą / PR / source / adoption. Kiekvienas agentas valdo savo įrašą. Suvestinė šiame procese generuojama iš įrašų, todėl skirtingi PC nekonkuruoja dėl vieno rankinio statusų failo.

`node scripts/core-upgrade.mjs list` pateikia bendrą suvestinę. Tai vietinės Git kopijos įrašai; fresh fetch būtinas norint teigti, kad skaitomas aktualus main. CLI rašymo komandos pačios fetch / tikrina current main protėvį ir savo šaką; susijusio companion bei scopes patikra pagal bendrą Git workflow lieka agento pareiga. Eksportuotas helper API testų fixtures nefetchina ir nėra agentų darbo entrypoint.

Suvestinės status yra paskutinis užrašytas įvykis, o sourceDelivery atskirai nurodo uncommitted / branch-only / on-fetched-main pagal įrašo paskutinį Git commit ir turimą origin/main. Todėl PR įvykis gali likti istorijoje po faktinio merge; Git source statusas įvertinamas be neįmanomos savireferencės į dar nesukurto commit SHA. Remote PR būsena ir naujausias fetch vis tiek tikrinami perdavimo metu; main source nėra visų PC adoption.

## Naujas įrašas

Prieš taisymą reserve issue / WORKSTREAMS, skaityti naujausią šaltinį. Savo ignored tmp faile parengti JSON:

```json
{
  "siteId": "core",
  "summary": "Konkretus atkuriamas defektas ir poveikis",
  "category": "skills",
  "evidence": ["Git-safe source arba bandymo įrodymo nuoroda"],
  "paths": ["SKILLS/example/SKILL.md"],
  "issue": "https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/N",
  "rollback": "Scoped revert arba exact quarantine restore"
}
```

`node scripts/core-upgrade.mjs record --input <input.json>` grąžina ID. Kategorijos rules / skills / prompt / code / cleanup / workflow. Sanitizuoti evidence; klientų pokalbių, asmens kontaktų, raw duomenų ir credentials nekopijuoti į įrašą. Laukai yra agento teiginiai, jų semantikos helperis neįrodo.

`node scripts/core-upgrade.mjs event --id <ID> --input <event.json>` prideda įvykį. Statusai finding / fixing / local-verified / pr / merged / adopted. local-verified reikalauja `checks: [{command, result:"PASS", evidence}]`; ankstesnį FAIL palikti fixing įvykio note / atskirame kvite. PR ir vėlesniems įvykiams reikalingas tikras GitHub PR URL; merged/adopted ir tikslus40hex commit. Helperis nepatvirtina GitHub būsenos: prieš įrašant patikrinti faktinį merge, o adoption turi įvardyti konkretų checkout / adapterį ir bandymą. Nebūtinas „adopted“ visiems PC.

## Tikslus karantinas

1. Record paths įtraukti konkretų kandidato failą. Evidence turi paaiškinti static/dynamic callers, registrus ir palaikomo kelio patikrą; agentas peržiūri, ne pats helperis.
2. `node scripts/core-upgrade.mjs plan --id <ID> --file lib/obsolete.mjs --reason "Konkreti nereikalingumo priežastis"` išsaugo planą, source nekeičia. Vienas planas vienam įrašui; jį peržiūrėti prieš kitą žingsnį.
3. `node scripts/core-upgrade.mjs apply --id <ID>` saugo originalo bytes `quarantine/source.txt`, checksum/plan/state, pašalina tik tikslų source. Peržiūrėti diff ir paleisti prasmingą regresiją bei repo safety prieš scoped commit/PR.
4. `node scripts/core-upgrade.mjs restore --id <ID>` sukuria originalą tik tuščioje vietoje ir tik teisingam payload hash. Payload/istorija lieka įrodymams; po restore patikrinti supported kelio veikimą.

Be recursive delete, kelių perkėlimo ar overwrite. Tekstas max1MiB; symlink, untracked/dirty, protected duomenys ir nesaugūs keliai atmetami. `.gitattributes` išjungia payload eol pakeitimą: atkūrimas kitame PC turi išlaikyti originalo bytes. Source .txt saugos skeneris vis tiek tikrina.

Procesui nutrūkus prepared būsenoje, source / payload neišmetami. Patikrinti būseną, hash ir source diff; apply atkuria trūkstamą payload iš nepakitusio source arba užbaigia būseną, kai originalas jau perkeltas. Jei proceso lock liko po crash, pirmiausia patvirtinti, kad savas procesas nebeveikia, ir tik tada pašalinti tik to įrašo `operation.lock`; automatinio svetimų lock perėmimo nėra. Jei restore spėjo sukurti source, bet nepavyko state write, sulyginti bytes su planu ir dokumentuoti atkūrimą; nenaudoti overwrite. State yra operacinis kvitas, Git events – patirties istorija.

Vietinis lock padeda vieno įrašo operacijoms, ne sprendžia distributed konkurenciją ar priešišką vienalaikį filesystem keitimą. Own worktree / failų scope / reviewed PR tebėra būtini.

## Naujas PC / nauja sesija

Po main merge naujas agentas fetchina abu repo, perskaito AGENTS ir susijusius Git skills, mato naują TOOLS sutartį bei žurnalą. Nepublikuoti vietiniai įrašai nepasiekia kitų PC. Pagal [šalto starto bandymą](../docs/CORE_UPGRADE_COLD_START.md) patikrinti pilną kelią; testo fixtures nėra tikras nišos klientų aptarnavimas.
