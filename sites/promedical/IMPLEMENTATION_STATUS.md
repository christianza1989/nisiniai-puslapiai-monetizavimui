# Promedical turinio administravimas

2026-10-25 tiesioginis Roko pavedimas, issue259. Režimas: veikianti, autentifikuota
administravimo sąsaja esamai svetainei; viešo prisijungimo nuorodos nėra.
Pirmas administratorius sales@azprekyba.lt, el. paštas ir slaptažodis.

Savininkas: šis Codex chatas, Core/public branch codex/promedical-admin-20261025,
stacked on own homepage branches. Bases Core a37c8fe / public806cc031;
fetched mains d3fe34b1 /8e47c34e.

- [x] Patikrinti aktualius repo ir esamą Studio/public duomenų kelią.
- [x] Patikslinti administratoriaus adresą ir prisijungimo būdą.
- [x] Išskirti bendrus grynus redagavimo / patvirtinimo pagalbininkus iš Studio.
- [x] Įgyvendinti serverinį prisijungimą, sesijas ir patvarų D1 redagavimą.
- [x] Anksti patikrinti login → tekstas → juodraštis → reload kelią.
- [x] Įgyvendinti tekstų sąrašą, skaitymą, blokų redaktorių ir kalendorių.
- [ ] Sujungti patvirtintą publikavimą su bendromis HTML/SEO/media projekcijomis.
- [x] Patikrinti konfliktus, draft izoliaciją, datas/DST ir auth neigiamus atvejus.
- [ ] Peržiūrėti desktop/mobile ir įdiegti tik patikrintą versiją.
- [ ] Savininkas privačiai nustato pirmą slaptažodį per vienkartinį setup.

Išsaugoti esamus1908 įrašus/1407 produktus, galerijas, URL, kontaktus ir kitus9
tenantus. Pradinė55 gidų leidybos pauzė nepanaikinama automatiškai. Juodraščio
išsaugojimas nėra paskelbimas. Faktų ir exact-revision peržiūra išlieka; žmogaus
patvirtinimas audituojamas kaip jo veiksmas, ne fiktyvus agento PASS.

2026-10-25 patikslinimas: numatytai rodoma57 gidai. Produktai, kategorijos,
home ir pagalbiniai puslapiai atskirti į „Kiti tekstai“ skirtuką; serverio
sąrašas taiko tą pačią sritį prieš filtravimą ir puslapiavimą. Kalendorius
numatytai skirtas gidams. Tai nepakeičia pause / approve taisyklių.

Vietinis Node HTTP +tikras SQLite išsaugojimas, pakartotinis puslapio atidarymas
ir actual local workerd+D1 enrollment/login/save/publish/future/history/logout
patikrinti. Scrypt veikia tikrame workerd. Core Studio66/66 ir public105/105
testai praėjo prieš paskutinį skirtukų patikslinimą; jo tikslinė4 testų regresija
taip pat PASS. Bendras SEO smoke pirmą kartą neturėjo8787 serverio; tai ne PASS,
tikro framework bandymo laukiama. Tikri owner duomenys nebandyti, prod D1
migracija ir įjungimas dar neatlikti.

Aktualus kitas rezultatas: normalus framework build ir actual host privati
peržiūra su autentiškų1908 įrašų registru. Mokami tyrimai, naujas paslaugų planas, užsienio duomenų keitimas,
generavimas, masinis approve/resume ar main merge neužsakyti.
