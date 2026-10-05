# Agentinių verslų core planas

Parengta 2026-09-30. Tai įgyvendinimo planas vieno savininko prižiūrimai nišinių verslų grupei: keturi skirtingi simuliuojami verslai, jų direktoriai ir specialistai, bendros paslaugos ir automatinis sistemos tobulinimas. Šiame kataloge dar nėra veikiančio core, paleistų simuliacijų ar realių verslo operacijų.

Rekomenduojama kurti vieną Python core su patvaria PostgreSQL būsena, atskirais vykdytojais ir įrankių valdymu. MD failai aprašo agentų darbą; duomenų bazė, programinės taisyklės ir izoliuota vykdymo aplinka užtikrina veiksmų teises. Kiekvienas verslas turi savo direktorių, specialistus ir duomenis. Apskaita, programavimas, integracijos ir vertinimas aptarnauja visą portfelį.

Autonominis tobulinimas įjungiamas nuo pirmos simuliacijos, kai jau veikia minimalus užduočių vykdymas, vertinimas ir pakeitimų tikrinimas. Nesėkmė automatiškai virsta užduotimi, pataisa ir palyginimu su ankstesne versija. Sėkminga pataisa įjungiama automatiškai pagal vykdomas taisykles; pabloginusi rezultatą atmetama arba grąžinama.

## Dokumentų skaitymo tvarka

1. [Architektūra ir priimti sprendimai](ARCHITECTURE.md) — komponentai, agentai, duomenys, teisės, patvarumas, integracijos ir savininko darbo modelis.
2. [Keturi bandomieji verslai](PILOTS.md) — skirtingi procesai, agentų komandos, scenarijai ir bendri moduliai.
3. [Simuliacijos ir autonominis tobulinimas](SIMULATION_AND_IMPROVEMENT.md) — bandymų aplinka, vertinimas, automatinės pataisos ir diegimas.
4. [Roadmapas su checkboxais](ROADMAP.md) — darbų seka, priklausomybės, patikrinamos išėjimo sąlygos ir įgyvendinimo būsenos.
5. [Pakartotinio audito išvados](REVIEW.md) — rastos spragos, jų pataisymai plane ir dar reikalingi įgyvendinimo įrodymai.

## Pirmo įgyvendinimo rezultatas

Vietinėje aplinkoje sistema užregistruoja keturis verslus, jų direktoriai sukuria reikalingas specialistų komandas, o klientų ir tiekėjų agentai su jais bendrauja per testinius kanalus. Sistema paruošia patikrinamus pasiūlymus, dokumentus ir veiksmus. Įterpta žinoma klaida aptinkama, savarankiškai pataisoma ir patikrinama pakartotiniais bandymais; bloga pataisa automatiškai atmetama. Proceso būsena išlieka po vykdytojo perkrovimo.

Pirmas siauras įgyvendinimo paketas yra M1–M3 su vienu pilotu; keturių verslų rezultatas pasiekiamas M4. Žinomos klaidos pataisymas įrodo mechanizmą. Toliau būtini savarankiškai diagnozuotas gedimas ir naujo įrankio sukūrimas, kad būtų tikrinama ir poreikių atradimo dalis. Pirminė izoliacija, žurnalas ir sustabdymas įgyvendinami prieš automatinį įjungimą.

Savininkas mato rezultatus, sąnaudas, tobulinimo istoriją ir vieną išimčių sąrašą. Klausimai jam kuriami tik tada, kai reikalinga nepasiekiama paskyros prieiga, registracija, tapatybės patvirtinimas arba trūkstami savininko verslo duomenys. Technines klaidas sistema taiso, pakartoja arba apriboja pati, nepaversdama jų rutininiu leidimo prašymu.

## Kas jau patvirtinta šiame projekte

- Yra atskiras `domain-sorter/` Python domenų vertintojas ir XLS/CSV eksportas. Jo aiškus nustatymas yra `gpt-6.1-sol` ir `xhigh` (Extra high); patikrintas tikras CLI kvietimas. Ankstesnio numatytojo modelio rezultatai archyvuoti atskirai.
- `content-studio/` turi Node.js turinio modelį, Codex CLI generavimą ir turinio paketo schemą. Jo eilė šiuo metu remiasi proceso atmintimi; tai nėra naujo core patvarus darbų vykdymas.
- `C:/Users/lenovo/Documents/dovanos-memorycasting` turi viešą kelių domenų rendererį, turinio importą ir D1 užklausų kodą. Šio plano metu jo kodas ir produkcija nekeičiami.
- Naujausias vietinis `AGENTS.md` savininko patvirtintu numatytu kontaktu nurodo `info@pinet.lt` ir operatorių `MB Pinet`. Tai savaime neįrodo SMTP pristatymo, banko duomenų, kitų rekvizitų ar konkrečios nišos pajėgumo.
- [MAIL_CORE.md](../MAIL_CORE.md) dokumentuoja atskirą tikros formos, D1, SMTP ir konkretaus Message-ID gavimo vietinį bandymą. Viešų domenų produkcijos prijungimas šiuo planu neatliktas.

## Apimtis ir darbo taisyklė

Šio darbo apimtis — pilna architektūra ir įgyvendinimo planas. Roadmapo įgyvendinimo checkboxai lieka nepažymėti, kol nėra atitinkamo įrodymo. Keturių verslų pilni sandoriai pirmiausia vyksta simuliacijoje. Viešos svetainės tęsia pirmą paklausos matavimo fazę pagal projekto taisykles; simuliacija nėra paklausos ar pelno įrodymas.

Šis planas išplečia esamą `AUTONOMY_ROADMAP.md` į verslo procesus. Turinio studija ir viešas SEO core prijungiami adapteriais. Jų failų, schemų ar kontaktų pakeitimai vėliau koordinuojami per `WORKSTREAMS.md`.
