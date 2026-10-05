# Bandomasis TOP 20

Savininko 2026-10-01 užsakytas atskiras bandymas iš jau įvertintos dalies.
`output/top20-test-20261001/selection.json` užfiksuoti 20 kandidatų iš 8 900
pirminių vertinimų; šaltinyje iš viso 45 324 domenai. Vienodo balo atranką
lemia semantikos aiškumas, tada domeno abėcėlinė tvarka. Tai nėra galutinis TOP
iš viso sąrašo ir ne įvairovės pagrindu sudarytas nišų krepšelis.

`preview_top.py` pagrindinę SQLite atveria read-only ir seedingui naudoja tik
tikslią dabartinę Sol 6.1 / xhigh v4 strategijos versiją. Keturių ankstesnių
strategijų originalios AI datos išlaikytos. Likę 16 vertinami šešetais, dviem
Codex CLI procesais. Testas turi savo DB, OS užraktą, stop failą ir žurnalus;
pagrindinio proceso pristabdymo ar galutinio TOP1000 etapo perjungimo nėra.

Vartotojui skirti `top20_bandomasis.csv` (UTF-8 BOM, kabliataškis) ir tikras
BIFF8 `top20_bandomasis.xls` atnaujinami po kiekvienos baigtos grupės.
CSV turi visas strategijos skiltis ir papildomai pirminį balą bei atrankos
vietą. XLS turi TOP20 su pirminiu ir išsamiu balu greta, konkrečias Idėjas
ir Metodiką. Išsamiai neįvertintų kandidatų išsamūs balai, vietos ir idėjos
lieka tušti; jų kategorija ir trumpas pagrindimas yra iš pirminio vertinimo.
Išsamūs balai perrikiuoja tik šio bandymo kandidatus, ne atrankos narius.

DR, istorija, nuorodų kokybė, registravimo būsena, paklausa ir ekonomika dar
nepatikrinti. Idėjos yra konkrečios, bet ne patvirtinti rinkos faktai.

Tęsti nutrauktą bandymą, jei jo OS užraktas laisvas:

```powershell
& .\.venv\Scripts\python.exe -X utf8 -u .\preview_top.py --directory .\output\top20-test-20261001 --run
```

Skaityti faktinę proceso būseną, nes vien saved `running` nėra gyvybės įrodymas:

```powershell
& .\.venv\Scripts\python.exe -X utf8 .\status.py --directory .\output\top20-test-20261001\work
```

Dvi naujos patikros patvirtino šaltinio ir analizės etapų atskyrimą, tik
įvertintų šaltinio domenų atranką, originalių datų išlaikymą, pagrindinės DB
nepakeitimą, skirtingą išsamų eiliškumą ir tuščius laukiančių kandidatų balus.
Kiekvienas tikras eksportas nepriklausomai perskaitomas su xlrd ir CSV:
20 unikalių domenų, sutampanti tvarka, mažėjantys išsamūs balai ir OLE/BIFF8.
Visi trys lapai peržiūrėti iš tikro išsaugoto XLS renderio; šis patikrinimas
nereiškia automatinio Google Sheets importo ar jo kopijos atsinaujinimo.
