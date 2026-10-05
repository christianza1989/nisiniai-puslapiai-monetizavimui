# Pakartotinis architektūros auditas

Data: 2026-09-30. Apimtis: plano teisingumas, komponentų sutartys, tobulinimo įrodymas ir darbų priklausomybės. Šiame audite patikslinti dokumentai; operacinio core testai ir simuliacijos dar nevykdyti. Lentelės pataisymai yra įgyvendinimo reikalavimai, ne jau veikiančios apsaugos.

## Vertinimas

Pagrindinė kryptis pagrįsta: vienas modulinis core, patvari būsena, atskiri verslo paketai, bendri adapteriai ir keturi skirtingi procesai. Python ir PostgreSQL pasirinkimas išlieka. Pirmiausia vienas pilnas kelias su automatine pataisa, tada keturi pilotai leidžia tikrinti architektūrą prieš ją plečiant.

Ankstesnis planas buvo per silpnas vykdytojų konkurencijos, tikros programavimo izoliacijos ir pataisos įrodymo vietose. Žodžiai „idempotency“, „izoliuotas katalogas“ ir „praėjo vertinimą“ turėjo konkrečias įgyvendinimo spragas. Jas patikslinus planas tinkamas M1–M3 įgyvendinimui; pasirengimą realioms operacijoms dar turi įrodyti runtime ir M7–M8 rezultatai.

## Rastos ir plane patikslintos spragos

| Spraga | Pataisytas reikalavimas | Kur ir kada įrodyti |
| --- | --- | --- |
| Įrankių registras, skydelis ir izoliacija numatyti po pirmo autonominio taisymo | Minimalus registras, žurnalas ir stabdymas M1; techninė izoliacija ir fiksuoti vartai M3; M5–M6 tik išplėtimas | [Roadmapas](ROADMAP.md), M1/M3 |
| Pasibaigęs lease neapsaugo nuo vėl atsakiusio seno vykdytojo | `lease_generation`, sąlyginis DB įrašymas ir gateway patikra; sustabdymas atšaukia naujų veiksmų leidimą | [Architektūra](ARCHITECTURE.md), 9 ir 15 skyriai; M1 |
| Timeout gali įvykti jau sukūrus išorinį užsakymą | Patvarus loginio veiksmo ID, argumentų hash, ta pati kartojimo tapatybė, `unknown`, kvitų sutikrinimas ir rezervacijos išlaikymas | Architektūra, 9 skyrius; M1/M4 |
| Du agentai gali vienu metu panaudoti tą patį limitą | Bendra transakcinė rezervacija ir patvirtinto kvito sutikrinimas; mandato atšaukimas galioja seniems procesams | Architektūra, 10 ir 18 skyriai; M1 |
| Atskiras katalogas ar Git worktree nėra pakankama nepatikimo kodo izoliacija | Atskira bazės kopija ir techninis aplinkos ribojimas; nėra hosto, aktyvaus repo, verslo paslapčių ar vertinimo valdiklio prieigos | Architektūra, 8 skyrius; M3/M5 |
| Patikrintas diff gali skirtis nuo įjungto paketo; kandidatas gali paveikti vertinimą | Patikimas surinkimas, nekintamas `release_manifest`, tas pats vertintas hash, apsaugoto serviso įrodymai ir neprieinama etaloninė būsena | Architektūra, 16 skyrius; M3 |
| Vienas LLM įvertinimas ir žinomos klaidos pataisa per silpnai įrodo tobulėjimą | Kalibruotas vertintojas, `inconclusive`, iš anksto fiksuotos metrikos, A/B palyginimas, grupės ir pakartojimai; nežinomas gedimas ir naujo įrankio poreikis | [Simuliacijos](SIMULATION_AND_IMPROVEMENT.md), 4–6 skyriai; M3–M5/M7 |
| Kontekstas gali nutekėti per DB pool, failus arba automatiškai įkeltus instrukcijų šaltinius | `SET LOCAL`, objektų taikymo sritis, artefaktų teisės, atskiras CLI profilis ir nekintamas aktyvus agento paketas | Architektūra, 5–8 skyriai; M1/M2 |
| Bendras paštas ir sandorio vertė gali būti klaidingai priskirti nišai ar mūsų pajamoms | Patikrintas pokalbio priskyrimas, `unassigned`; aiškus pardavėjo/tarpininko vaidmuo, komisinis, faktinės pajamos ir atskiros pašto būsenos | Architektūra, 12 ir 17 skyriai; M2/M6/M7 |
| Eksperimentai gali užimti visą pajėgumą arba be galo kartoti tą pačią problemą | Operacijų rezervas, bendros paskyros apkrovos įvertinimas, incidento limitas ir konkreti `deferred` pratęsimo sąlyga; kritinės senos bylos stabdomos | Architektūra, 16/18; simuliacijos, 9 skyrius; M1/M3/M7 |

Papildomai keturi pilotai gauna įvykius po sandorio priėmimo: atšaukimus, ginčus, grąžinimus ir vėluojančius kvitus. Domenų/DR atranka ir pirmos fazės svetainių matavimas aiškiai palikti lygiagrečiu srautu, todėl nereikia laukti viso core ar pirkti 100 domenų prieš simuliacijas.

## Pirmas įrodymas

M1–M3 paketas turi parodyti vieną teisingą sandorį, vėluojančio seno vykdytojo atmetimą, neaiškaus išorinio veiksmo atkūrimą be dublikato, konkurencinio limito kontrolę ir veikiančią kūrimo izoliaciją. Tik tada žinoma klaida aptinkama, taisoma ir pataisa automatiškai įjungiama simuliacijoje. Blogas kandidatas, pakeistas artefaktas ir suklastotas vertinimas privalo būti atmesti. Savininko rutininio pataisos patvirtinimo nepridedame.

Tobulinimo ciklas gali veikti nuo pirmos simuliacijos tik po šio minimalaus bootstrap. Simuliacija patikrina procesą; realią paklausą, tiekimą, gautas pajamas ir klientų aptarnavimą vėliau įrodo atskiri realūs duomenys. Rezultatų ir apribojimų negalima pakeisti agento parašyta sėkmės deklaracija.

## Audito šaltiniai ir patikra

Perskaityti visi šio katalogo planavimo dokumentai, projekto `AGENTS.md`, `WORKSTREAMS.md` ir [MAIL_CORE.md](../MAIL_CORE.md). Naujas pašto įrodymas pridėtas kaip dokumentuotas konkretaus vietinio bandymo rezultatas; šiame audite jis nebuvo kartotas. Techninės prielaidos patikrintos pagal [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [SET LOCAL](https://www.postgresql.org/docs/current/sql-set.html), [Git worktree](https://git-scm.com/docs/git-worktree) ir 2026-09-30 atnaujintą oficialų [Codex instrukcijų](https://learn.chatgpt.com/docs/agent-configuration/agents-md) bei [sandbox](https://learn.chatgpt.com/docs/sandboxing) vadovą.

Galutinė dokumentų patikra tikrina vietines nuorodas, Markdown blokus, etapų pilnumą ir checkboxų būsenas. Ši patikra nevadinama lease, izoliacijos ar autonominio tobulinimo runtime testu.
