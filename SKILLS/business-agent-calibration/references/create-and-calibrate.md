# Sukurk agentą ir iš karto sukalibruok

2026-10-08. Savininko patikslinimas visoms nišoms: trumpas pavedimas „sukurk šiam verslui pokalbių agentą“ apima pilną nišos prijungimą, kalibravimą, klaidų taisymą ir deklaruotos apimties priėmimą. Agentas pats vykdo šią eigą, savininkas neturi atskirai paprašyti kalibravimo ar smulkių pataisų. Naujos svetainės F1 be aiškaus agento pavedimo nesikeičia.

**Numatytoji savininko apimtis:** išskyrus aiškiai siauresnį pavedimą, verslo agento sukūrimas apima veikiančią svetainės skambinimo mygtuko / mikrofono / gyvo balso eigą, kontaktų popup pokalbio metu ir po jo, tos pačios nišos konteksto tęstinumą, final transcript analizę, profesionalaus pažadą atitinkančio laiško parengimą / peržiūrą / išsiuntimą ir kliento reply tęsinį tame pačiame case/thread. Tai naršyklės skambutis; PSTN/SIP numeris turi savo atskirą provider integraciją. Atskiro „pridėk balsą / postcall email“ prašymo nereikia.

El. laiškų kalibravimas apima poreikio papildymą, „per brangu“, kliento atsisakymą, pasiūlymo patvirtinimą ir neatsakymo tęsinį su valdomu laikrodžiu, stop taisyklėmis bei actual follow-up mandatu. Pasiūlymai turi tikrais šaltiniais pagrįstą mūsų kainą / antkainį ir neatskleidžia neleistinų tiekėjo/konkurento nuorodų. Tiekėjų paieška/derybos ir profesionalus PDF po užsakymo patvirtinimo priklauso nišos tikram verslo modeliui bei užsakytai prekybos apimčiai; jų neprimeti kitai nišai ar nepakeiti fiktyviu sandoriu.

Trūkstamas šiai apimčiai reikalingas kodas yra įgyvendinimo darbas, ne priežastis pakeisti vartą į NA ar užbaigti tik tekstinį botą. Jį taisyk/prijunk bendrame core ir per-nišos adapteryje, atskirai tikrink main/PR ir hosted deployment. Išorinis credential, reali paskyra, budget ar deployment autorizacija gali būti konkreti priklausomybė; tęsk visus kitus įvykdomus darbus ir nepaskelbk live/PASS be actual įrodymo.

## 1. Prijunk actual core ir nišą

Sėkmingai fetch / įrodyk abiejų repo naujausią main bazę, perskaityk AGENTS ir [runbook](runbook.md). Užfiksuok svetainės siteId / host, BUSINESS, faktinį pajėgumą, approved žinių projekciją, kontaktų ir kanalų šaltinį. Perskaityk actual profilius, compose, tool policy/admission ir aktualų implementation status; senas planas negali paneigti vėlesnio veikiančio kodo ar pakeisti jo patikros.

Paruošk tipizuotą nišos profilį ir conversation / sales / supplier procedūras, bendrą quality kontekstą, patvirtintas žinias ir tinkamas per-site tools pagal tikrą verslo modelį. Rolės instrukcijų buvimas savaime neįjungia tiekėjų kontaktavimo, commerce ar papildomų kanalų. Naudok bendrą CRM/mail/knowledge/invoice/scheduler, ne naują atskirą core. Jei konkreti niša priklauso nuo nesujungto PR, įvertink jo actual kodą/merge, sutvarkyk autorizuotas priklausomybes savo scope ir pratęsk likusį įgyvendinamą darbą.

Sutarto pokalbio apimtis apima informavimą, poreikio tikslinimą, reikalingo kontakto laukelio kvietimą, savanorišką kontaktų išsaugojimą, tos pačios nišos pokalbio tęstinumą ir pažadui tinkamą postcall žingsnį / laišką, kai yra veikiantis kanalas ir mandatas. Kalibravimas turi tikrinti tikrai įdiegtus veiksmus. Kainos, atsargos, registracijos ar pristatymo galimybės turi actual šaltinius.

## 2. Kalibruok mūsų tekstinio lab metodu

Izoliuotoje runtime aplinkoje užfiksuok source/model/knowledge/instruction/evaluator/corpus snapshot ir kvietimų / laiko / išlaidų ribas. Parenk bent šešis skirtingus klientų archetipus: aiškus pirkėjas, specifikacijos nežinantis, skubantis/pataisantis poreikį, techninis skeptikas, kainai jautrus, kontakto/privatumo atsisakantis. Pridėk nišos rizikas, kalbos, grįžimo, nutrūkimo ir jau išsaugoto kontakto atvejus. Testų skaičius nekompensuoja trūkstamo kelio.

Vykdyk actual `network_lab.py` per core FastAPI/DB/tools, duodamas agentui natūralias kliento replikas; evaluator tikslų į dialogą nedėk. Tekstiniame lab popup ACK imituojamas ir modelis yra Codex CLI: ataskaitoje tai pažymėti, nevadinti Gemini Live audio bandymu. Konkretūs CLI argumentai ir protected corpus mechanizmas viename [runbook](runbook.md), jų nedubliuoti kitu runner.

Vertink naudingą konsultaciją ir need revision, tool rezultatus, contact shown/save atskirai, konteksto tęstinumą, final transcript, reviewed pažadą atitinkantį laišką, nepriklausomą quality ir tenant izoliaciją. Produkto vaizdas klientui profesionalus; testų kilmė operatoriaus kvituose išlieka ir nevirsta tikra paklausa.

## 3. Taisyk ir pakartok iki priėmimo

Išsaugok pirmą FAIL. Diagnozuok promptą / nišos faktą, serverio tool, transportą, STT, evaluator arba infrastruktūrą; taisyk mažiausią actual priežastį. Per-site sprendimas lieka nišoje, bendro fragmento pataisa tikrinama paveiktose nišose. Implementuoti shared upgrades turi [žurnalo](../../../core-improvements/README.md) įrašą ir scoped Git perdavimą. Istorinių rezultatų, apsaugoto holdout ar slenksčių nekeisti dėl geresnio balo.

Po pataisos vykdyk jos regresiją ir dar nematytus panašius atvejus. Candidate gauna tik train; holdout lieka atskiras. Neužtenka pakartoti tuos pačius jau išmoktus dialogus. Išnaudota riba, timeout ar missing source palieka incomplete / konkretų blocker, ne PASS; kitą prasmingą batch pradėk su aktualiu source ir tikra autorizuota kvietimų riba. Nevykdyk neriboto mokymosi.

## 4. Patikrink autonomiją ir actual kanalus

Įvertink tikrą mokymosi grandinę: quality issue → candidate → protected baseline/candidate palyginimas → promotion tik esant griežtam pagerėjimui arba pagrįstas rejection → naujos sesijos actual release → rollback. Kai baseline geras, rejection / no-change yra normalus rezultatas; nesukurk dirbtinės klaidos vien promotion pademonstruoti. Private conversation adaptive release ir žmogaus/kodo agento Git MD pataisa yra atskiri mechanizmai.

Pagal užsakytą kanalą atskirai patikrink actual Gemini audio, browser mikrofoną/pertraukimą/reconnect/contact ACK-save, postcall worker ir realų laiško gavimą; vien vietinis tekstas neįrodo šių vartų. Jev ON/OFF palygink, kai routeris įtrauktas į apimtį ir yra veikianti prieiga/biudžetas. Laiškų atsakymai / tyla / tiekėjai / pasiūlymai / PDF tikrinami, kai šie moduliai priklauso actual užsakymui; jų veikimo neišgalvoti.

Tęsk visus įvykdomus užsakytus darbus savarankiškai; prieigos trūkumas vienam kanalui nesustabdo profilio, tekstinio lab, faktų, kodo ir ataskaitos darbų. Jau autorizuotų veiksmų leidimo nekartok. Tikrą neprieinamą credential, išlaidų ar deployment priklausomybę įvardyk konkrečiai; nekurk naujų leidimų iš instrukcijos.

## 5. Užbaik įrodymais

Taikyk [acceptance matricą](acceptance.md), išsaugok `sites/<siteId>/AGENT-CALIBRATION-<date>.md`: source versijos, archetipai/split, originalūs ir pataisyti run, tikros intervencijos, checks/kanalų statuses, learning decision/adoption/rollback ir likusios priklausomybės. Pridėk kalibravimo nuorodą į nišos implementation status, kad kitas agentas matytų actual būklę.

„Sukurtas ir sukalibruotas“ galioja tik deklaruotai išbandytai apimčiai. Nepatikrintas garsas ar inbox lieka UNVERIFIED; veikiančio live agento nepaskelbti iš vien prompto/teksto. Baigtinis rinkinys neįrodo idealaus aptarnavimo visiems būsimiems klientams. Perduok safe source/ataskaitą per reviewed Git main ir atkurk private konfigūraciją pagal runbook, ne per klientų duomenų kopijavimą.
