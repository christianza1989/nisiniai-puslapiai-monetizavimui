# TOP200 nišų tyrimas

2026-10-01 savininko prašymu visas 45 324 domenų procesas sustabdytas ties 9 200.
Tikras pagrindinio proceso OS užraktas atlaisvintas, vaikai baigė darbą, galutinis
stopped eksportas ir visi įrašai išliko. Jis nepaleidžiamas kartu su šiuo tyrimu.
Vėliau pagrindinę atranką galima tęsti įprastu Testi-fone.ps1; cache panaudojamas.

Savininkas papildomai patvirtino pilną kiekvienos iš 200 nišų ir monetizacijos analizę.
Galutinė užfiksuota atranka: `output/top200-research-20261001/selected/selection.json`.
Pradinė `top200-research-20261001/` kopija yra peržiūros juodraštis; ji nenaudojama
tyrimo eilėje. Atrankos policy ir kiekvieno kandidato priežastis / alternatyvūs domenai
išsaugoti selection.json. Tai nėra nauji rinkos faktai ar galutinis pirkimo sąrašas.

Iš 9 200 jau įvertintų šaltinio domenų aptikta 1 304 tinkamos suvienodintos nišos.
Atrinkta 200 unikalių jų raktų iš 30 kategorijų, pirminiai balai 82–95. Papildomo
kandidato prioritetas mažėja kaupiantis vienai kategorijai; silpnos nišos neįtraukiamos
vien dėl kategorijų kvotos. Sinonomų / miesto / vienodo pasiūlymo dubliai, pvz.
pastolių nuoma, švenčių maitinimas ir kapų paminklai, netiria kelių iš esmės tų
pačių variantų. Gretimos nišos gali turėti bendrų tiekėjų; tyrimas turi atskleisti
konkretų skirtingą mokėtoją ir geriausią pasiūlymą arba rekomenduoti atidėti.

30 ankstesnių tos pačios v4 strategijos įrašų nukopijuoti su originaliomis datomis
tik kaip hipotezių kontekstas. Jie NIEKADA neskaičiuojami kaip naujas pilnas rinkos
tyrimas. Nauja v1 schema, promptas ir business-validation instrukcija turi atskirą
SHA-256, SQLite `research.sqlite3`, atskirą OS užraktą ir `.research.stop.request`.
Pagrindinė DB ir senų ekranų / strategijų parašai nekeičiami.

Kiekvienas tyrimas naudoja gpt-6.1-sol / xhigh Codex CLI su aiškiai opt-in live web.
Senas vardų vertinimo režimas tebenaudoja tiksliai savo ankstesnį prompt wrapperį ir
web_search=disabled. Shell, apps, plugins, browser_use ir multi_agent neįjungiami;
projektinės API_KEY reikšmės neperduodamos. Jokių Gemini/OpenRouter/Ahrefs kvietimų,
registracijų, tiekėjų laiškų, kampanijų ar pirkimų šiame tyrime nėra.

Pilnas tyrimas turi bent 2 Lietuvos ir 1 užsienio konkurento / alternatyvos pasiūlymą,
bent 4 skirtingus pirminius šaltinių puslapius, 3–4 palygintus pajamų modelius,
pasirinkto modelio paaiškinimą, mūsų pajamų / sąnaudų / break-even / jautrumo logiką,
partnerių ir vykdymo ribas, pirmos fazės tikro ketinimo testą, 3–5 skirtingus SEO
ketinimus, pirkėjų kanalus, automatizavimą, prieštaraujančius įrodymus ir nežinomybes.
Originalūs šaltiniai ir patikrinimo data atsekami; šaltinių reikšmę pirmiausia vertina
AI. Vien pateiktas URL nelaikomas savininko verslo ar paslaugos faktų patvirtinimu.
Reikalaujama tikrų CLI web_search įvykių. Modelio teiginiai ir priėmimo schema nėra
visų ekonominių prielaidų nepriklausomos faktų patikros įrodymas.

Kiekviena baigta analizė iškart įrašoma į DB ir savo `analizes/<domenas>.md` su
citatomis. `top200_pilna_analize.csv` ir tikras `top200_nisu_analize.xls` atnaujinami
po kiekvieno rezultato. XLS: TOP200 / Analizės / Šaltiniai / Metodika. Kol nebaigtos
visos 200, laukiantys domenai rodomi be tyrimo balų / mokėtojų / šaltinių; aiškus
NEBAIGTA ir N/200. Nuo 10:45 UTC visi200 rodomi savininko paprašyta individualia
potencialo prioriteto tvarka1–200, nepriklausomai nuo tyrimo baigimo. Tyrimo balas
atskiras; išsaugoti pirminis balas ir originali atrankos vieta. Žema payer/execution
kokybė arba „atidėti“ riboja tyrimo balą iki60.
DR lieka nematuotas, rinkos pasiūlymų egzistavimas nėra mūsų paklausos įrodymas.

Paleisti / tęsti tik TOP200:

```powershell
& .\Tirti-top200-fone.ps1
```

Faktinė būsena (įskaitant OS užraktą):

```powershell
& .\.venv\Scripts\python.exe -X utf8 .\niche_research.py --directory .\output\top200-research-20261001\selected --status
```

Sustabdyti tik nišų tyrimą:

```powershell
Set-Content -LiteralPath .\output\top200-research-20261001\selected\.research.stop.request -Value stop
```

Schema / ryšiai / score caps / source bindings / tikro XLS+CSV 200 kandidatų ir
199 laukiančių aprėptis patikrinti naujais meaningful testais. 43/43 programos,
senų etapų ir naujo tyrimo regresijos praėjo 2026-10-01 10:17 UTC.

Pirmas realus tyrimas `anglukalbospamokosinternete.lt` baigtas 10:08:11 UTC:
6 šaltiniai, 5 konkurentai / alternatyvos, 4 pajamų modeliai. Analitiko balas69
(pirminis95), sąlyginis testas; mūsų atlygis ir vykdymas lieka nepatvirtinti.
S1–S5 originalūs puslapiai dar kartą nepriklausomai atverti; kainų vienetai,
iCAN minimumas ir vieša Preply programos mokėjimo logika atitinka analizę.
Tai nėra visų būsimo TOP200 ekonominių prielaidų nepriklausomos patikros įrodymas.

Pilotą pirmiausia atmetė source ID18 / TOP200 ordinal0 konfliktas. Originalus
atsakymas išsaugotas `output/validation-errors/81652b700005426a9b6708000aa9dfd3.json`;
abi jo asociacijos tikrai nurodo tą patį vienintelį prašytą domeną. Pilnas
atsakymas pervaliduotas naudojant tikrą source ID, originali data išsaugota,
vienintelė turinio redakcija – sutrumpinta nutrūkusi siūlomo formos lauko etiketė.
CLI PID15244 faktiniame events.jsonl prieš jo pašalinimą suskaičiuoti9 baigti
web_search įvykiai; įrašo web_calls9 yra patvirtinta apatinė riba, galutinis
įvykių skaičius nežinomas. Tai aiškiai įrašyta manual_review. Ateities invalid
atsakymai kartu saugo ir call_info su tikrais web įvykiais.

Naujas vienos nišos kvietimas naudoja jos pradinės grupės source ID; senų
konteksto hipotezių i pašalinamas, requested_id išskirtas. Pradinių grupių ID
gali kartotis tarp atskirų vienos nišos kvietimų. Limituota peržiūra taip pat
ima aukščiausią research_priority prieš taikydama limitą. Tiek šis susiejimas,
tiek cache skip / prioritetas / tikros kategorijos pagrindiniame XLS patikrinti.

2026-10-01 10:17:51 UTC paleista likusių199 eilė su4 Sol6.1 / xhigh / live-web
darbininkais. Galutinė faktinė būsena yra research_status.json ir OS užraktas;
vien launcher PID nėra vykdymo įrodymas. Pirmas galutinis XLS stilius peržiūrėtas
iš tikro BIFF8 read-back: kategorija pagrindiniame TOP200 lape, visas tekstas
Analizės lape, URL atskirame Šaltiniai lape. Kol analizių ne200, darbas NEBAIGTAS.

2026-10-01 10:45 UTC savininkas paprašė pirmiausia individualiai surikiuoti visus
200 pagal agento nuomone didžiausią potencialą. Autoritetinga tvarka ir konkretus
kiekvieno domeno argumentas: `priority_top200.tsv`, pritaikymas: `prioritize_top200.py`.
Peržiūrėti visi200; užfiksuotas tas pats domenų rinkinys, nepadidinta kategorijų kvota
ir nepridėta naujų kandidatų. Raktažodis ir aiškus užsakymas, galimas mūsų mokėtojas,
maržos/atlygio hipotezė, kartotinė paslauga, vykdymas, automatizavimas ir išsiskyrimas
vertinami individualiai. Skaitinės rinkos apimtys, maržos ar mūsų partneriai nesugalvoti.
P1/P2/P3/P4 yra santykinės keturios prioriteto grupės, ne pelno tikimybė.

Pirmi10: miniekskavatoriai.lt, naujasstogas.lt, rekuperacijosmeistrai.lt,
svetainesprieziura.lt, kompiuteriu-prieziura.lt, klientuvaldymas.lt, metalo-tvoros.lt,
atliekukonteineriai.lt, santechnikupaslaugos.lt, kiemodanga.lt. Jau baigtų nišų
tyrimo balai ir jų nepatvirtintos mokėjimo/vykdymo sąlygos parodytos atskirai nuo
preliminarios prioriteto vietos. Nišos potencialo hipotezė nereiškia jau veikiančio
pelningo tarpininkavimo. Galutinis plėtros sprendimas remsis tyrimu ir savo paklausa.

Pradinė atrankos tvarka, ankstesnis research_priority ir priežastys išsaugoti
manifesto initial_top200_order / selection_details; visa ankstesnė selection.json
kopija – selection-before-priority-20261001.json. Naujas tvarkos SHA-256:
70bcc5c81985439cc6f8f6b4f5270d7da61219377a37de11314d7268b562de99.
Pritaikymo metu research.sqlite3 SHA-256 prieš ir po identiškas: visos5 pilnos
analizės ir originalios datos išliko. Tiriami tik195 dar nebaigti kandidatai.

CSV ir XLS pirmas stulpelis dabar turi1–200 visiems domenams; potencialo grupė
ir individualus argumentas matomi pagrindiniame lape. Jokia baigta analizė
neperkeliama aukštyn vien dėl jos baigimo. Dar nebaigtų tyrimo balai lieka tušti
net tarp baigtų eilučių. Visas tekstas ir šaltiniai rikiuojami ta pačia tvarka.
Išsaugojimai kiekvieną kartą paima aktualų selection.json; darbo eilė taip pat
atnaujina prioritetus prieš naują kvietimą, išlaiko retry skaitiklius ir atmeta
domenų rinkinio ar šaltinio pakeitimą. Jau vykdomas tyrimas neturi būti kartojamas
vien dėl būsimo prioriteto pakeitimo.

45/45 testai PASS: įskaitant baigtos200-os vietos palikimą gale, visų200 tikslų
prioritetą, pending blank scores, cache skip, aktualios tvarkos perėmimą ir
portfolio/source pakeitimo atmetimą. Visi4 XLS lapai peržiūrėti iš tikro BIFF8
read-back. Actual worker20628 / launch12188 nuo10:45:42 veikia su4 Sol6.1/xhigh/liveweb;
pradėti prioritetai2/3/4/6 (1 ir5 jau cache). Pagrindinė atranka tebėra stopped9200.

Ribota papildoma krypties patikra: Avesco Rent originalus miniekskavatorių puslapis
https://www.avesco-rent.lt/lt/parko-kategorija/mini-ekskavatoriai/ ir WPspace originalūs
periodinės priežiūros planai https://wpspace.lt/planai/ atverti2026-10-01. Jie rodo
atitinkamus pasiūlymų formatus, ne mūsų pajamas ar LT paieškų apimtis. Arfolis
kainų puslapis nepateikė perskaitomo turinio, AVStogai grąžino502; jų snippet
nelaikomas pilnos analizės įrodymu. Visų kitų kandidatų eiliškumas preliminarus;
gilus vietinės ir užsienio rinkos tyrimas tęsiamas per pagrindinę TOP200 eilę.
# Savininko laikina riba — 50 pilnų analizių

2026-10-01 20:26 UTC savininkas pakeitė tęsinio apimtį iš dar30 į dar6:
iš esamų44 iki bendro50. Neribotas naujas worker graceful sustabdytas ties44;
visi ankstesni rezultatai liko. Tyrimas tęsiamas su `-StopAfterTotal 50`.

`niche_research.py --stop-after-total 50` riboja **sėkmingai patikrintų** rezultatų
skaičių. Kiekvienas aktyvus kvietimas rezervuoja galimą vieną sėkmę, todėl keturi
lygiagretūs kvietimai nepereina ribos, net jei užsibaigia kartu. Nesėkmingas ar
atidėtas tyrimas nelaikomas nauja analize; jo vietą gali užimti kitas kandidatas.
Pasiekus50 nauji kvietimai nebesiunčiami, galutinis status `limited`, normalus
exit0. Tai nėra viso TOP200 užbaigimas: likę150 laukia naujo savininko nurodymo.

`research_status.json` ir DR išvesties būsena saugo `stop_after_total`,
`run_baseline_count`, `remaining_in_run`. Jei anksčiau sustabdo API limitas ar
klaida, būsena nėra skelbiama kaip pasiekta riba. 51/51 testų PASS, įskaitant
44→50, in-flight rezervacijas ir nesėkmingo kvietimo vietos atlaisvinimą.
Modelis/promptas/schema/tyrimo signature, DR ir prioritetai nepakeisti.

