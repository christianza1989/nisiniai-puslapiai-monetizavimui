# Dviejų etapų atrankos patikra

2026-09-30. Savininko patvirtinta eiga: visų domenų pirminė atranka grupėmis po 100,
tada TOP 1 000 išsamios strategijos. Abiejuose etapuose `gpt-6.1-sol / xhigh`;
4 vykdytojai. Galutinis maždaug 100 domenų pirkimo sąrašas šiame etape dar nesudaromas.

## Tikras 100 domenų bandymas

100 skirtingų šaltinio domenų parinkti iš išsaugotų 512 v4 strategijų: kiekvienos
kategorijos geriausias ir silpniausias, likusi dalis su fiksuotu atsitiktiniu seed.
Tai įvairių situacijų bandymas, ne reprezentatyvi visų domenų rinkos imtis.

- Vienas sėkmingas 100 domenų kvietimas, be dalijimo ar pakartojimo.
- 1 334,1 sekundės: 22 min. 14 sek., įskaitant šaltinio nuskaitymą ir eksportą.
- Įvesties naudojimas 18 954, išvesties 27 589 tokenai pagal CLI; USD kainos nėra.
- Visi 100 rezultatų priimti, visi ID po vieną, atskiros screening versijos DB.
- 85 iš 100 pagrindinė kategorija sutapo su ankstesniu išsamiu vertinimu;
  10 balų pasikeitė bent 20 punktų. Tai dviejų metodų skirtumas, ne tikslumo procentas.
- 26 domenai gavo A prioritetą. Patikrintos modified k≤3, brand balas≤35,
  rizikos brand a≤1, regulated a≤3 ir neaiškaus vardo tuščio raktažodžio taisyklės.

Vieno vykdytojo bandymo tempas apie 270 domenų/val. Keturiems vykdytojams tiesiogiai
perkėlus šį tempą, pirminė atranka būtų apie 42 val.; tai orientyras, o ne išmatuotas
keturių vykdytojų našumas ar baigimo pažadas. Skirtingos grupės, limitai ir pakartojimai
gali trukmę keisti. TOP strategijų etapas trunka papildomai.

## Perskaitytų išvadų vertinimas

Perskaityti visų 100 trumpos atrankos argumentai ir jų palyginimas su v4.
Aiškūs komerciniai pavadinimai išliko viršuje: `miniekskavatoriai.lt` 95,
`anglukalbospamokosinternete.lt` 95, `darborubas.lt` 92, `vertimaikaune.lt` 87.
Argumentai kalba apie konkrečios užklausos turinį ar palyginimo naudą, tačiau nekuria
ilgo verslo plano kiekvienam vardui. `illww.lt` ir `skigtisa.lt` liko 0 be išgalvotos nišos;
`virtuvesbaldai4u.lt` išliko modified, 68,2. Brangus užsakymas nelaikomas išmatuota marža.

Yra ribinių kategorijų: `vejosbortai.lt` žemės ūkis / statyba, `fotoklubas.lt`
bendruomenė / pramogos, `bendradarbystes.lt` NT / B2B. Jos nėra patikrinti rinkos faktai;
finalistų išsami analizė ir konkretaus ketinimo tyrimas turi spręsti, ką statyti.
`volkswagenservisas.lt` ir `cedraldailylentes.lt` pirminis vertinimas laiko produktiniais
raktažodžiais, bet pažymi galimo ženklo riziką; jų starto koeficientas sumažintas.
Tokie vardai nėra patvirtinti neutraliam komerciniam naudojimui. Šioje imtyje nė vienas
brand rizikos vardas negavo A prioriteto; didžiausias balas 57.

Atranka tinkama kandidatų eilės sudarymui. Ji nepakeičia paieškos apimties, konkurentų,
DR, istorijos, teisių, prieinamumo, tiekėjų atlygio ir vieneto ekonomikos patikrų.
Išsamūs v4 laukai išliko finalistų etape; jų kokybės vertinimas [QUALITY_REVIEW.md](QUALITY_REVIEW.md).

## Programos patikros

29 unit/integracinės patikros praėjo. Naujos patikros apima visų pavadinimų eilę,
natūralius ir modifikuotus vardus, galimo ženklo požymius, pilno pirmo etapo vartus,
TOP apimties atskyrimą, to paties v4 cache panaudojimą, vieną OS užraktą abiem etapams,
tęsimą be AI, eksportą be AI ir tikrą antro etapo būseną. GUI inicializacija su
100 / 4 / gpt-6.1-sol nustatymais praėjo be AI kvietimų.

Tikri išsaugoti CSV ir BIFF8 XLS perskaityti atskirai: 100 įvertintų + 45 224 laukiančių
= 45 324 unikalūs šaltinio domenai; nėra praleistų ar dvigubų vardų. Reitingas mažėjantis,
kategorijos vientisos, CSV atitinka DB ir kontrolines sumas. DR langeliai tušti.
Visų šešių pirmo etapo lapų peržiūros iš tikro XLS perskaitytų reikšmių patikrintos
vizualiai: kategorijos matomos, įvertinti ir laukiantys vardai atskirti, tarpinė būsena aiški.
Pirmo etapo CSV 17 stulpelių, XLS 6 lapai; antro etapo CSV 23 stulpeliai ir XLS 7 lapai
patikrinti pilno perėjimo integraciniame bandyme. Tikro 1 000 finalistų antro etapo
dar nėra: jis automatiškai prasidės tik baigus visus 45 324 pirminius vertinimus.

Bandymo įrodymai: `verification/screening-pilot/benchmark.json`, `sample.json`, CSV/XLS;
v4 archyvas `output/archive/2026-09-30-v4-before-screening/`. Iš jo 512 strategijų lieka
bendroje DB, tačiau į pirminį screening reitingą jų balai nekopijuojami.

Pradinis pilnas paleidimas 2026-09-30 18:07:57 UTC sustabdytas savininkui paprašius
pirmiausia surikiuoti visus pavadinimus. Iki šio pakeitimo jau užbaigti 100 atrankos
rezultatų išliko; neužbaigtos grupės į rezultatus neįrašytos. Nauja numatytoji eiga
prieš AI sukuria `domenai_ai_eile.csv` su visais 45 324 šaltinio domenais, tada
vertina pagal ją. Eilės balas atskiras nuo AI balo; žodyno spragos, nevienareikšmės
frazės ar kategorijų prioritetų politika gali preliminarų eilės numerį keisti.
Paieškos apimtis netirta. Ankstesni dabartinio Codex modelio semantikos laukai
padeda praplėsti žodyną ir sumažinti ženklo rizikos vardų prioritetą; jų galutiniai
AI potencialo balai į eilės balą nekopijuojami. Nė vienas žemas prioritetas nepašalina
domeno iš būsimo Codex vertinimo.

Pilna eiga tęsiama nauju paslėptu Windows paleidimu nuo 2026-09-30 18:26:35 UTC.
18:30 UTC patvirtinti worker 14016, keturi jo Codex procesai su `gpt-6.1-sol / xhigh`,
užimtas OS užraktas ir tuščias klaidų žurnalas. Pirmi dar neįvertinti eilėje:
`kasimo.lt`, `santechnikos.lt`, `stogu.lt`, `auto-pervezimai.lt`, `autotransportavimas.lt`.
Visos eilės CSV nepriklausomai patikrintas: 45 324 unikalūs šaltinio nariai, balai
mažėja, nepridėta ir nepraleista kandidatų. Darbo tvarka taip pat patikrinta
integraciniame bandyme, kuriame silpnas vardas iš šaltinio pradžios nukeliamas už
stiprių žodžių ir Codex grupė gauna prioritetinę tvarką.
Dabartinį gyvumą ir naujausią skaičių rodo `status.py`; paleidimo įrašas vienas pats
nėra gyvumo įrodymas. Atskiri žurnalai yra `output/logs/`, metaduomenys `background_run.json`.

2026-10-01 02:24 UTC operacinė patikra: išsaugota 1 150 pirmo etapo rezultatų, 398
A prioritetai. Ankstesnis worker nebegyvas; paskutinis įrašas 2026-09-30 20:07:45 UTC.
Sustojimo priežastis žurnale neužfiksuota, Windows perkrovimo nebuvo. Žurnale matomi
trijų grupių laiko limitai ir sėkmingi mažesnių grupių rezultatai, tačiau šie limitai
savaime neįrodo viso proceso dingimo priežasties. Pratęsta iš esamo cache 02:23:50 UTC;
patvirtinti worker 10076, keturi Codex vaikai ir aktyvus OS užraktas. Naujas klaidų
žurnalas tuščias, eksportas be klaidų. Modelis, grupės dydis ir metodika nekeisti.

2026-10-01 04:16 UTC: pirmo etapo cache turi 2 700 domenų. Ankstesnė eiga 03:26 UTC
baigėsi klaida, kai ta pati netinkama grupė neįveikė dviejų padalijimų. Pataisyta
atsakymų patikra ir kartojimas: visiškai patikrinti, unikaliam prašytam ID priklausantys
įrašai išsaugomi; dubliuoti, nežinomi, boolean ID ir netinkami laukai nepriimami.
Kartojami likę domenai, schemai nepavykus izoliuojama iki vieno. Po individualių
nesėkmių domenas atidedamas, kiti analizuojami toliau; laukiančių domenų turintis
etapas niekada nepažymimas baigtu ir neperduodamas TOP strategijoms.

35 automatinės patikros praėjo, įskaitant vieną blogą įrašą tarp gerų, trūkstamą ID,
klaidingą atsakymo wrapper, kelių lygių grupės nesėkmę, tik likusio domeno tęsimą
ir naudojimo limito stabdymą. GUI smoke patvirtino aiškiai rodomą nebaigtą būseną.
Tikros naujos eigos sėkmė visiems likusiems domenams dar nepatvirtinta; naujos
diagnostikos registruos konkrečius pažeidimus. Promptas, modelis, schema, balai ir
cache parašai nekeisti, ankstesni 2 700 rezultatai išliko. Paleista 04:14:39 UTC;
patvirtintas gyvas worker 3528 su keturiais `gpt-6.1-sol / xhigh` Codex procesais.
