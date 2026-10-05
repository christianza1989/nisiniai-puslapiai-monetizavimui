# Domenų atranka

Python langinė programa ir CLI, skirti expired domenų kandidatų sąrašui išvalyti,
nišoms sukategorizuoti per **Codex CLI** ir išsaugoti **CSV** bei tikrą **Excel 97–2003 `.xls`**.
Gemini ir OpenRouter nekviečiami. Projekto `.env` nekeičiamas ir AI procesui neperduodamas.

## Paleidimas

Šiame kompiuteryje Python aplinka jau paruošta. Dukart spustelėkite **`Paleisti.cmd`**.
Paspauskite **Kategorizuoti / tęsti**. Numatytasis TXT parenkamas iš tėvinio projekto katalogo.
Naujai aplinkai: Python 3.11+, `Idiegti.ps1`, įdiegtas Node.js ir Codex CLI, `codex login`.

„Tik ištraukti domenus“ veikia be AI. „Eksportuoti išsaugotus“ perkuria XLS iš SQLite.
„Stabdyti“ nutraukia aktyvius Codex procesus ir išsaugo jau gautus rezultatus.
Uždarykite XLS Excel programoje, kai vyksta automatinis eksportas.

Ilgam darbui Windows naudokite `Testi-fone.ps1`: paleidžiamas atskiras paslėptas Python
procesas su **dviejų etapų eiga**: pirminė atranka grupėmis po **100 domenų**, tada
išsamios **TOP 1 000** strategijos grupėmis po 6. Veikia 4 Codex vykdytojai;
**abiejuose etapuose naudojamas `gpt-6.1-sol / xhigh`**.
Prieš AI **visas šaltinio sąrašas surikiuojamas pagal pavadinimą**: vietinis komercinių
žodžių ir frazių žodynas, prasmingi vietų/produktų priedai, dirbtinių skaičių ir galimų
svetimų ženklų požymiai. Stiprūs atpažinti pavadinimai apdorojami pirmi. Šis greitas
eilės sudarymas nekviečia AI ir nematuoja paieškos populiarumo; tai preliminarus prioritetas.
Codex jį tikrina ir sudaro atskirą tikrą AI reitingą. Eiga tęsiama iš DB.
Žurnalai saugomi `output/logs/`, paleidimo PID ir jų keliai — `output/background_run.json`.
Antras paleidimas atmetamas, jei analizės OS užraktas jau užimtas.

Faktinę būseną tikrinkite `status.py`: skaičius skaitomas iš esamos vertinimo versijos
DB ir šaltinio kopijos, o gyvumas — iš OS užrakto. Taip pat rodomas aktyvus etapas
ir atskiras finalistų strategijų skaičius. Likęs `running` įrašas be gyvo
proceso rodomas kaip `interrupted`; tas pats patikrinimas naudojamas GUI. AI nekviečiamas.

Periodinio XLS eksporto klaida, įskaitant vietos diske trūkumą, AI analizės nenutraukia:
rezultatai lieka SQLite, ankstesnis XLS neperrašomas, o `run_summary.json` nurodo
`export_errors`. Suvestinė rašoma atominiu pakeitimu. Galutinio eksporto klaida
grąžinama kaip aiškus pranešimas; atlaisvinus vietą „Eksportuoti išsaugotus“
perkuria išvestis nekviesdamas AI pakartotinai.

Paprastai peržiūrai rinkitės **Atidaryti CSV**. Šis mygtukas perskaito naujausius SQLite
rezultatus ir veikia net tada, kai AI analizė vyksta kitame procese; papildomai AI nekviečia.
CSV išsaugomi šalia pasirinkto XLS failo. Nauji analizės paleidimai atnaujina abu formatus.

```powershell
# Visa dviejų etapų analizė, tęsiant iš išsaugotų rezultatų
& .\.venv\Scripts\python.exe .\pipeline.py

# Ilga analizė atskirame paslėptame Windows procese su išsaugomu žurnalu
.\Testi-fone.ps1

# Faktinė būsena ir naujausias DB skaičius, be AI kvietimo
& .\.venv\Scripts\python.exe .\status.py

# Pirminės atrankos bandymas: iki 100 dar neįvertintų, viena grupė
& .\.venv\Scripts\python.exe .\pipeline.py --limit 100 --workers 1

# Tik ištraukimas arba tik eksportas
& .\.venv\Scripts\python.exe .\pipeline.py --extract-only
& .\.venv\Scripts\python.exe .\pipeline.py --export-only

# Naujausias CSV, netrukdant vykstančiai analizei; AI nekviečiamas
& .\.venv\Scripts\python.exe .\export_csv.py

# CSV atnaujinimas kas minutę, kol aktyvi analizė tęsiama
& .\.venv\Scripts\python.exe .\export_csv.py --watch

# Aiškūs numatytieji abiejų etapų nustatymai
& .\.venv\Scripts\python.exe .\pipeline.py --batch-size 100 --workers 4 --top 1000 --strategy-batch 6

# Pasirenkama rankinė eilė vietoje viso sąrašo automatinės pavadinimų atrankos
& .\.venv\Scripts\python.exe .\pipeline.py --priority-file .\output\archive\2026-09-30-v3-before-strategy\domenai_reitingas.csv

# Kitas failas ar išvestis
& .\.venv\Scripts\python.exe .\pipeline.py --input C:\duomenys\domenai.txt --output C:\duomenys\atranka.xls
```

`classifier.py` lieka vieno etapo CLI: `--stage screen` reiškia pirminę atranką,
`--stage strategy` — išsamų vertinimą. GUI ir fono paleidimo numatytasis yra `pipeline.py`.
Ribotas bandymas neatrinks finalistų iš dalinio sąrašo: antras etapas prasideda tik tada,
kai įvertintas visas to paleidimo šaltinis. TOP 1 000 yra strategijų analizei;
galutinis maždaug 100 perkamų domenų sąrašas bus sudaromas po DR ir istorijos patikrų.

AI paleidžiamas per `codex exec --json --output-schema --output-last-message`, autentifikuojant
per esamą Codex prisijungimą. Savininko nustatymas: **`gpt-6.1-sol` ir `xhigh` (Extra high)**.
Abu nustatymai perduodami kiekvienam CLI kvietimui ir įtraukti į rezultatų versijos kontrolinę sumą.
Windows sistemoje pirmiausia naudojamas naujesnis Codex darbalaukio komplekte esantis CLI;
senas globalus npm CLI 0.139.0 šio modelio nepriima, o darbalaukio CLI 0.159.0 patikrintas sėkmingai.
Prireikus vykdomą failą galima nurodyti `DOMAIN_SORTER_CODEX_CLI` aplinkos kintamuoju.
Globalus `~/.codex/config.toml` nekeičiamas; `--ignore-user-config` užtikrina aiškius šios programos nustatymus.
Modelio klaida sustabdo analizę; tyliai pereiti prie kito modelio neleidžiama.
Ankstesni numatytojo CLI modelio rezultatai išsaugoti `output/archive/2026-09-30-cli-default/`;
Sol 6.1 vertinimui visi domenai peržiūrimi iš naujo, kad skirtingi modeliai nebūtų sumaišyti.
Shell, naršyklė, apps, plugins ir subagentai išjungti; domenai perduodami stdin kaip duomenys.

## Atrankos principas

Prioritetas bendriniams komerciniams raktažodžiams, pvz. `pervezimas.lt`, `padangos.lt`, `statyba.lt`.
Tai vertinimo pavyzdžiai; jie nepridedami į šaltinio sąrašą, jei jame jų nėra.

| Kriterijus | Svoris | Ką vertiname |
|---|---:|---|
| Raktažodžio stiprumas | 30 % | Aiškus ieškomas produktas, paslauga ar komercinė tema pavadinime |
| Komercinis ketinimas | 20 % | Kiek tikėtina, kad lankytojas ieškos sprendimo ar pateiks užklausą |
| Marža / kliento vertė | 25 % | Galimos vertingos užklausos ir maržos hipotezė |
| SEO įgyvendinamumas | 10 % | Galimybė pradėti nuo naudingos siauros turinio nišos |
| Monetizavimo įvairovė | 15 % | Užklausos, partnerystės, tiekėjai, katalogas, digital produktai |

Kriterijai 0–5. Balas = svertinė suma × (0,5 + semantikos pasitikėjimas / 200)
× pirmos fazės tinkamumo koeficientas, suapvalinta iki vieno skaičiaus po kablelio.
Tinkamumas a=0..5 naudoja koeficientus 0,55 / 0,64 / 0,73 / 0,82 / 0,91 / 1.
Modifikuotam raktažodžiui k≤3; brandui k≤1 ir balas≤35. Reguliuojamai nišai a≤3,
galimam svetimam ženklui a≤1. Neaiškiai nišai ar monetizacijai taikoma 25 balų riba.
Šie koeficientai yra mūsų portfelio atrankos politika, ne išmatuotas pelningumas ar tikimybė.
Vienodo balo tvarka: AI pasitikėjimas, tada domenas abėcėlės tvarka.
A prioritetas ≥75, B ≥50 ir <75, C <50.

**Pirmas etapas:** [prompts/domain_screening_v5.md](prompts/domain_screening_v5.md).
Kiekvienas domenas gauna kategoriją, nišą, natūralų raktažodį, pagrindinį monetizavimo būdą,
kriterijų balus ir trumpą konkretų argumentą. Ilgi verslo planai šioje atrankoje nerašomi.
Rezultatai rikiuojami ta pačia aukščiau aprašyta portfelio politika.

**Antras etapas:** [prompts/domain_strategy_v4.md](prompts/domain_strategy_v4.md).
Viso sąrašo TOP 1 000 papildomai gauna: klientą ir poreikį, pirmos svetainės idėją,
kas galėtų mokėti mums ir už ką, alternatyvius pajamų kelius, paklausos testą ir esminę kliūtį.
Argumentas ilgesnis nei ankstesni 12 žodžių. Neaiškiam vardui strategija neišgalvojama.
Skaičių ar brandinių priedų turintis vardas nevertinamas kaip grynas raktažodis;
prasmingi produkto matmenys, 3D ir panašūs tikri terminai savaime nebaudžiami.

Abiejų etapų rezultatai turi **atskirus cache parašus ir atskiras išvestis**. Pirminis
ir išsamus vertinimas gali skirtis: finalistai dar kartą rikiuojami pagal išsamų vertinimą.
Ankstesnės v3 versijos 1 305 vertinimai ir prompto
aprašas išsaugoti `output/archive/2026-09-30-v3-before-strategy/`. Naujas reitingas remiasi
viena strategijos ir skaičiavimo versija. Naujos schemos bandyme už šaltinio ribų pateikti
kontroliniai pavadinimai nepridedami į kandidatų sąrašą.

Prieš keičiant eigą **512 užbaigtų v4 strategijų** išsaugotos
`output/archive/2026-09-30-v4-before-screening/`, taip pat lieka bendroje DB.
Jeigu jų domenai pateks į TOP 1 000, ta pati strategija bus panaudota be naujo AI kvietimo.
V5 atranka šių ilgų strategijų balų neimportuoja.

V4 pateikia daugiau išvadų ir naudoja daugiau tokenų. Tikrame 24 domenų bandyme du 12 domenų
kvietimai naudojo 30 815 išvesties tokenų, įskaitant modelio naudojimą; tai nėra USD kaina.
Antrame etape numatyta mažesnė 6 domenų grupė, kad ilgos grupės rečiau pasiektų timeout ir klaidos atveju
nereikėtų kartoti daug domenų. Modelis ir `xhigh` nekeisti. [Kokybės auditas](QUALITY_REVIEW.md).

**Balai yra AI hipotezės pagal pavadinimą.** Raktažodžio populiarumas, paieškos apimtis,
CPC, reali marža, pajamos, DR, backlinkai, istorija, nuosavybė ir prieinamumas dar nematuojami.
Modelis negali išgalvoti šių rodiklių. Raktažodžio domenas ir aukštas DR negarantuoja Google pozicijos.

## Išvestys

- **`output/domenai_ai_eile.csv`**: visi šaltinio domenai nuo stipriausių atpažintų
  pavadinimų iki silpniausių. „Eilės balas (heuristinis)“ nustato darbo tvarką;
  tai nėra galutinis AI potencialo balas. Būsena yra eilės sukūrimo momento kopija.
  GUI mygtukas „AI apdorojimo eilė“ atidaro šį failą. Neatpažintos nišos gali būti
  nuvertintos; visas sąrašas vis tiek perduodamas Codex, iš jo kandidatai neišmetami.
- `output/priority_status.json`: pavadinimų eilės metodas, apimtis ir ribos.
- **`output/domenai_reitingas.csv`**: pirminės atrankos paprastas sąrašas, 17 stulpelių. Tik AI įvertinti domenai,
  stipriausi viršuje; domenas, kategorija, niša, balas, prioritetas, monetizavimas ir pagrindimas.
  Natūralus raktažodis ir trumpas argumentas padeda greitai peržiūrėti didelį sąrašą.
- **`output/domenai_pagal_kategorijas.csv`**: tie patys rezultatai vientisomis kategorijų grupėmis.
  Stipriausią domeną turinti kategorija pirma; jos viduje domenai rikiuoti pagal bendrą reitingą.
- `output/domenai_laukia_ai.csv`: dar neįvertinti domenai, be išgalvotų kategorijų ar balų.
- `output/csv_status.json`: tiksli CSV kopijos eiga, modelis, laikas ir failų kontrolinės sumos.
- `output/domenai_sukategorizuoti.xls`: šeši lapai — `Reitingas`, `Kategorijos`, `Nišos`,
  `Pagal kategorijas`, `Laukia AI`, `Metodika`. Reitinge yra tik įvertinti domenai, stipriausi viršuje;
  kategorija ir niša iškart šalia domeno. Neįvertinti domenai laikomi atskirame `Laukia AI` lape.
  Viršuje aiškiai rodoma, ar analizė baigta, kiek domenų įvertinta ir kada eksportuota.
  Vykstant darbui XLS atnaujinamas maždaug kas minutę; Google Sheets importuotą kopiją reikia importuoti iš naujo.
- `output/domenai_clean.txt`: tik unikalūs domenai, mažosiomis raidėmis, IDN punycode.
- `output/analysis.sqlite3`: patvari kiekvienos grupės eiga. Tęsiant jau įvertinti domenai nekviečiami iš naujo.
- `output/run_summary.json`: pilnumas, šaltinio SHA-256 ir būsena.
- `output/pipeline_status.json`: abiejų etapų būsena ir skaitikliai; gyvumas tikrinamas OS užraktu.
- `output/shortlist.json`: TOP atranka iš viso pirmo etapo sąrašo, sukuriama tik užbaigus jį.
- **`output/finalists/domenai_reitingas.csv`**: išsamiai įvertinti TOP kandidatai, 23 stulpeliai.
  Čia klientas, svetainės idėja, pinigų kelias, alternatyvos, paklausos testas ir kliūtis.
  Failas atsiras tik prasidėjus antram etapui; taip pat yra atskiri grupavimo ir laukiančių CSV.
- `output/finalists/domenai_finalistai.xls`: išsamios atrankos septyni lapai, papildomai `Idėjos`.
  Jo `Laukia AI` reiškia tik dar neišanalizuotus finalistus. Visų domenų ir finalistų vardai,
  metodika bei balai nesumaišomi į vieną išvestį.

CSV naudoja **UTF-8 su BOM**, skyriklį **`;`** ir lietuvišką dešimtainį kablelį (pvz. `82,5`).
Google Sheets pasirinkite File → Import → Upload ir skyriklį `;` (arba automatinį aptikimą).
Pirma eilutė yra stulpelių pavadinimai; joje nėra sujungtų langelių ar papildomų titulų.
Excel importuojant rinkitės UTF-8 ir kabliataškį. Į formules panašus AI tekstas išsaugomas kaip
literalus tekstas. CSV neturi XLS formatavimo, lapų ar automatiškai perskaičiuojamų formulių.
Importuota Google Sheets ar Excel kopija pati neatsinaujina — reikia importuoti naują CSV.

XLS yra BIFF8/OLE failas, eksportuojamas su `xlwt`, nes užsakytas senasis `.xls` formatas.
Tai nėra HTML ar pervadintas XLSX. 65 536 eilučių ribą viršijantis reitingas dalijamas į lapus.
36 pagrindinės kategorijos yra stabilios. AI nišų pavadinimai grupuojami ignoruojant raidžių dydį;
skirtingų sinonimų automatinio sujungimo kol kas nėra.

Iš šaltinio pašalinami numeriniai lentelės duomenys, el. pašto adresai ir platformų
`ExpiredDomains.net` / `Seo.Domains` paminėjimai. Originalus TXT neperrašomas.
Naujai papildžius TXT tęsiamas darbas tik naujiems domenams. Šaltinis nuskaitytas kaip viena
paleidimo kopija; vėliau pridėtos eilutės pateks į kitą paleidimą.

Kiekvienas priimtas įrašas privalo turėti vieną teisingą ID, kategoriją, leistinus balus
ir visus schemos laukus be papildomų. Jei dalis grupės netaisyklinga, patikrinti įrašai
išsaugomi iškart; dubliuoti/nežinomi ID ir blogi įrašai nepriimami. Kartojami tik likę
domenai, prireikus išskaidant iki vieno. Po nesėkmingų individualių bandymų domenas
lieka „Laukia AI“, o kitų analizė tęsiama. Tokie domenai ir priežastys yra
`run_summary.json` lauke `deferred_domains`; `status.py` rodo `deferred_count`.
Etapas nėra baigtas, kol bent vienas šaltinio domenas neįvertintas. Naudojimo limitas,
nepalaikomas modelis ar patvaraus saugojimo klaida vis tiek stabdo darbą.
Schemos klaidų duomenys saugomi `output/validation-errors/`: tik domenai, modelio
atsakymas ir patikros priežastis; CLI autentifikacija ar projekto konfigūracija nekopijuojami.
Modelio/metodikos pokytis sukuria atskirą cache versiją. OS failo užraktas neleidžia dviem
programos paleidimams vienu metu perrašyti tos pačios išvesties; dviejų etapų programa
laiko tą patį užraktą ir pereidama prie finalistų. Klaidos ar stabdymo atveju etapą galima tęsti.
Codex tokenų naudojimas saugomas, tačiau **USD kaina neteikiama**, nes CLI jos negrąžina.

## Vėlesnis Ahrefs etapas

XLS paruošti tušti **DR**, **DR patikrinta** ir **DR būsena** laukai. Ahrefs API šiame etape
nekviečiamas. Nematuotas DR nėra 0. Toliau reikia tikrinti ne vien DR, bet ir dofollow nuorodų
kokybę, teminį ankstesnės svetainės atitikimą, spam požymius ir registravimo prieinamumą.
Pirma kuriamos turinio svetainės ir matuojamas srautas bei tikros užklausos; tiekėjai,
partnerystės ar produktai pasirenkami pagal gautus rezultatus.

## Patikra

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Testai tikrina ištraukimo ribas, IDN, dublikatus, išgalvotus/praleistus AI ID,
balų tvarką, kalibracijos ribas, neaiškaus vardo fiktyvią strategiją, tikrą XLS/CSV struktūrą,
tuščią DR ir pakartotinį darbą be AI. Taip pat tikrinami viso pirmo etapo vartai,
TOP apimties atskyrimas, strategijų cache panaudojimas ir vienas užraktas abiem etapams.
Pavadinimų eilės patikros apima natūralias ilgas frazes, miestus, 3D, skaičių priedus,
galimų ženklų požymius, pilną apimtį ir atskyrimą nuo AI balų. 35 patikros praėjo,
įskaitant dalinį taisyklingų įrašų išsaugojimą, dubliuotų/nežinomų ID atmetimą,
individualią nesėkmę, saugų tęsimą ir sustojimą pasiekus naudojimo limitą.
Tikras 100 domenų atrankos bandymas: vienas kvietimas, 22 min. 14 sek., be pakartojimo;
modelis `gpt-6.1-sol / xhigh`. [Dviejų etapų patikra](TWO_STAGE_REVIEW.md).
Strateginio prompto tikras bandymas saugomas
`verification/strategy-review/comparison.json`; kontrolės tikrina programines taisykles,
o pats aprašymų naudingumas vertinamas perskaičius išvadas.

Šaltiniai (tikrinta 2026-09-30):
[Codex struktūruotas CLI režimas](https://learn.chatgpt.com/docs/non-interactive-mode),
[Google domenų raktažodžių vertinimas](https://developers.google.com/search/docs/appearance/ranking-systems-guide),
[Ahrefs DR ir paieškos reitingai](https://help.ahrefs.com/en/articles/907673-do-search-engines-use-domain-authority-domain-rating-as-a-ranking-factor).
