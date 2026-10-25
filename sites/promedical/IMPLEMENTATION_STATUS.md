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
- [x] Sujungti patvirtintą publikavimą su bendromis HTML/SEO/media projekcijomis.
- [x] Patikrinti konfliktus, draft izoliaciją, datas/DST ir auth neigiamus atvejus.
- [x] Peržiūrėti desktop/mobile ir įdiegti tik patikrintą versiją.
- [x] Rodyti teksto viršelį, miniatiūras ir priskirtas iliustracijas.
- [x] Virš skaitymo peržiūros pridėti datą, „Išsaugoti datą“ ir „Publikuoti“.
- [ ] Savininkas privačiai nustato pirmą slaptažodį per vienkartinį setup.

Išsaugoti esamus1908 įrašus/1407 produktus, galerijas, URL, kontaktus ir kitus9
tenantus. Pradinė55 gidų leidybos pauzė nepanaikinama automatiškai. Juodraščio
išsaugojimas nėra paskelbimas. Faktų ir exact-revision peržiūra išlieka; žmogaus
patvirtinimas audituojamas kaip jo veiksmas, ne fiktyvus agento PASS.

2026-10-25 patikslinimas: numatytai rodoma57 gidai. Produktai, kategorijos,
home ir pagalbiniai puslapiai atskirti į „Kiti tekstai“ skirtuką; serverio
sąrašas taiko tą pačią sritį prieš filtravimą ir puslapiavimą. Kalendorius
numatytai skirtas gidams. Tai nepakeičia pause / approve taisyklių.

2026-10-25 įgyvendinimas ir diegimas patikrinti. Core Studio 66/66 ir public
107/107 testai, typecheck ir lint PASS. Normalus framework build5 PASS;
visų10 svetainių paketai ir tinklo konfigūracija išliko nepakitę. Tikro framework
1853 viešų puslapių SEO smoke PASS (build4; vėliau keista tik privati API ir UI).
Build5 su izoliuotu D1 ir tikru1908 įrašų paketu praėjo27 užklausų priėmimą:
prisijungimas, juodraštis/reload, exact-revision patvirtinimas, SSR/LLM išvestys,
ateities datos, ankstesnės publikacijos istorija, pauzės idempotentiškumas,
privati medija, CSRF/Origin atmetimas ir normalus logout po atmestos užklausos.
Sintetiniai patvirtinimai atlikti tik izoliuotoje vietinėje DB.

Desktop1440 ir mobile390/320 peržiūrėti; viršelis ir publikavimo valdikliai
patikrinti tikroje sąsajoje. Datos išsaugojimas ir šešių nepažymėtų peržiūros
kriterijų atidarymas išbandyti vietiniame fixture; pradinė data atkurta.
Native200% zoom / vartotojo text-spacing override atskirai nepatikrinti.

Production D1 pridėtos tik CMS lentelės, esamos užklausos ir analitika nekeistos.
Po 0% kandidato priėmimo versija3b3892ab-6920-4544-935c-532617d13495 įjungta100%,
deployment43e57957-6fcb-4844-8ec7-c41060d41e2e. Tikro domeno HTTP priėmimas PASS:
8 vieši maršrutai,98 ištekliai,33 sidebar nuorodos, sitemap/robots/LLM, privati
API401, neteisingas login401, cross-origin403, tikslūs admin JS/CSS hash.
Bindings ir veikimo nustatymai išsaugoti; pridėtas CONTENT_ADMIN_ENABLED=1.

Viešas prisijungimo URL https://promedical.lt/admin; nuorodos svetainės meniu
nėra. Pirmas administratorius sukurtas, vienkartinis24h setup paruoštas privačiai.
12:40Z savininko slaptažodis dar nenustatytas; agentas jo nesukūrė ir neįvedė.
Savininkui pateiktas privatus vietinis setup langas; prisijungimas su tikru
savininko slaptažodžiu dar nėra patvirtintas. Setup token į Git ar ataskaitą nepatenka.

Pradinė55 gidų publikavimo pauzė ir patvirtinto paketo SHA
626bb42b68a583b14793393b6abb7a43de08c266417d5cc964b3cd632c0e74b5 išsaugoti.
Tikri tekstai nepatvirtinti/paskelbti, paštas/DNS nekeičiami. Mokami tyrimai,
naujas planas, generavimas, masinis approve/resume ir main merge neatlikti.
Core PR260 ir public PR71 pateikia scoped pakeitimus virš ankstesnės homepage
šakos; private įrodymai D:/Core/output/promedical-admin-20261025/.
