# Valdymo skydelis: struktūra, ekranai ir būsenos

2026-10-10. **Visi 35 paviršiai PLANNED**, išskyrus [AUDIT](AUDIT.md) aprašytas senas modulių konsoles. Tai įgyvendinimo UX brief ir screen registry, ne sukurtų ekranų ar screenshot priėmimas. Režimas **Operate**: greitai suprasti padėtį, rasti konkretų darbą ir veikti.

## 1. Pasirinkta struktūra

Planuojami trys lygiai: **Portfelis → Verslas → Agentas / konkretus darbas**. Viršuje pastovus verslo pasirinkimas, aplinkos žyma, laikotarpis, paieška ir savininko profilis. Kairėje stabili navigacija; content centre; pokalbio/rezultato kontekstas gali būti atidaromas šone. Agentas turi pilną darbo vietą, ne vien trumpą chat popup.

Svarsčius vieną didelį visų agentų pokalbį, būtų sunku suprasti scope ir atsakingą rolę. Viena konsolė kiekvienam agentui dubliuotų UI. Pasirinktas bendras trijų lygių shell: visiems tipams vienoda eiga, specialiems darbams registruoti papildomi paneliai.

Portfelis: **Verslai, Reikia dėmesio, Ataskaitos**. Verslas: **Apžvalga, Agentai, Užduotys, Veikla, Klientai, Žinutės, Dokumentai, Finansai, Integracijos, Nustatymai**. Agento vieta: **Apžvalga, Pokalbis, Užduotys, Vykdymai, Veikla, Ataskaitos, Žinios, Įrankiai, Kalibravimas, Mandatas**. Nereikalinga specializuota skiltis nerodoma kaip veikiančio agento galimybė; bendras status/chat/worklog vis tiek pasiekiamas.

Į pirmą ekraną dedame verslo rezultatą ir konkrečias išimtis: ką agentai atliko, kokie tikri outcomes, kiek laukia ir kas neveikia. Agentų skaičius nėra pagrindinis sėkmės rodiklis. Išsami metrika ir techniniai kvitai atsiveria iš konteksto, ne užpildo pradinį ekraną.

## 2. 35 paviršių registras

Įrašas registry papildomai turės route ID, permission, data adapter/version, komponentus, būsenų bandymų IDs, desktop/mobile capture ir aktualią implementation status. Čia nurodomas planuojamas duomenų kelias ir pirmas įgyvendinimo etapas; [D0–D9](ROADMAP.md).

| ID | Paviršius | Turinys / pagrindinis veiksmas | Duomenų kelias ir pirmas etapas |
| --- | --- | --- | --- |
| P01 | Portfelis / verslų sąrašas | Rezultatai, health, neprižiūrėti darbai; pasirinkti verslą | Scoped portfolio projection; D2 |
| P02 | Portfelio verslo santrauka | Verslo stadija, parengtis ir paskutinis report | Business/metric/receipt; D2 |
| P03 | Reikia dėmesio | Tikros išimtys, žmogaus faktai/prieigos ir critical incidentai | Incidents/owner_needs; D4 |
| P04 | Portfelio ataskaitos | Periodų palyginimas ir leidžiamas bendras report | Report snapshot; D3 |
| B01 | Verslo apžvalga | Outcomes, šiandienos darbai, kliūtys, pastarasis report | Business projection; D2 |
| B02 | Verslo agentai | Visi installed/proposed/available, vadovas, rolė ir trys statusų ašys | Agent registry; D2 |
| B03 | Užduotys | Atsakingas agentas, deadline, priority, dependencies, rezultatas | Task read/command API; D3 |
| B04 | Veiklos žurnalas | Filtrai pagal agentą/tipą/kampaniją/case ir trace | Operational events; D2 |
| B05 | Klientai / kandidatai | Fit/evidence, contact basis, atsakymo ir tikro conversion status | Cases + acquisition adapter; D5 |
| B06 | Žinutės | Incoming/outgoing/draft, sender, thread, atsakymų būsena | Scoped channel adapter; D4 |
| B07 | Dokumentai | Versijos, originalai, šaltinis, owner, parsavimo/issued/payment skirtumai | Document registry/store; D6 |
| B08 | Verslo finansų pjūvis | Pajamos/išlaidos/būsenos ir trūkstama banko aprėptis | Legal entity allocations; D7 |
| B09 | Integracijos | Tool, šaltinis, paskutinė sinchronizacija, trūkumas, limitai | Adapter health/config; D4 |
| B10 | Verslo nustatymai | Patvirtinti faktai, domenai, timezone, tikslai ir control | Revisioned business policy; D3 |
| A01 | Agento apžvalga | Atsakomybė, vadovas, parengtis, recent outcome ir kliūtys | Instance/run/status report; D2 |
| A02 | Direktoriaus pokalbis | Klausti, duoti užduotį, atverti šaltinį / report | Owner thread + task/report tools; D2 |
| A03 | Agento užduotys | Sąrašas, priėmimas ir eigų detalės | Tasks filtered instance; D3 |
| A04 | Agento vykdymai | Input, žingsniai, versijos, kvitai, klaidos ir usage | Run/action receipts; D3 |
| A05 | Agento veikla | Kas faktiškai įvyko, kontekstas ir trace | Event projection; D2 |
| A06 | Agento ataskaitos | Dienos/savaitės/ad hoc snapshot ir eksportas | Reports/metric schema; D2 |
| A07 | Žinios / atmintis | Šaltiniai, galiojimas, nurodymai, atšaukti faktai | Scoped facts/context refs; D3 |
| A08 | Įrankiai | Leidžiamos capabilities, coverage, kainos basis ir adapter status | Definition + effective policy; D4 |
| A09 | Kalibravimas / versijos | Originalūs FAIL, model profile, candidate/holdout/live proof | Eval/release metadata; D4 |
| A10 | Mandatas ir kontrolė | Limitai, grafikas, pause/resume, revision, scope poveikis | Typed control API; D3 |
| M01 | Gijos detalė | Pilni laiškų/atsakymų tekstai, priedai ir autoriai | Message/thread scoped lookup; D4 |
| M02 | Juodraščio peržiūra | Tikslus gavėjas/tekstas/offer facts; redagavimo versija | Draft + mode-specific review; D4 |
| M03 | Pristatymo / atsakymo detalė | Provider accepted/delivered/unknown/bounce ir inbound correlation | Action/channel receipts; D4 |
| F01 | Sąskaitos / dokumento detalė | Originalas, extraction, versijos, šalys, sumos, numeris, tiesos būsena | Document/invoice typed model; D6 |
| F02 | Mokėjimų sutikrinimas | Dokumentai, banko/payout įrašai, partial/net-fee/refund match | Payment/match service; D7 |
| F03 | Apskaitos išimtis | Trūkumas, įrodymai, agento bandymai ir konkretus sprendimas | Finance task/exception; D7 |
| F04 | Juridinio asmens laikotarpis | Coverage, likučiai, proposed/accepted entries, lock ir readiness | Accounting period projection; D7 |
| F05 | Buhalterio paketas | Manifest, versija, sumos, eksportas, gavėjo receipt ir korekcijos | Export batch + adapter; D7 |
| S01 | Prisijungimas / sesija | Individuali paskyra, prieigos atstatymas ir expired state | Auth/session service; D1 |
| S02 | Narystės / prieigos | Konkrečių verslų ir legal-entity rolės, audit | Membership/control; D1 |
| S03 | Verslo / agento prijungimas | Faktai, capabilities, trūkumai, testinė/live parengtis | Registry/onboarding validation; D2 |

## 3. Agentų sąrašas ir detalė

Eilutė: vardas/paskirtis, vadovas, aktyvi versija, parengtis, įjungimas, runtime health, paskutinis outcome, einantis/laukiantis darbas, paskutinis report ir duomenų laikas. Pagrindiniai veiksmai „Pokalbis“, „Užduotys“, „Veikla“. Control rodomas tik turint teisę; žalias taškas vien dėl heartbeat nepažymi agento kaip pilnai komerciškai veikiančio.

Demo kontraktas palaiko 1, 8 ir 40 agentų vienam verslui, 50 verslų portfelį, ilgus LT pavadinimus ir mišrius waiting/paused/unknown statusus. Tai testavimo apimtys, ne realus dabartinis agentų skaičius. Sąrašai serveriškai filtruojami/paginuojami; didelės istorijos nekrauname visos į browser.

## 4. Žinutės ir veiklos skaidrumas

Master/detail žinučių vaizdas: gijos sąrašas ir pasirinktos gijos turinys. Atskirai parodyti siuntimo statusą, gauto atsakymo statusą ir agento next action. Laiško detalė susieta su kampanija/case, draft versija, agentu, leidimo/policy revision ir kvitais. Draft pakeitus peržiūros įrodymas turi atitikti naują versiją. Kitas žmogus negali paskutinę sekundę pakeisti gavėjo ir naudoti seno leidimo.

Veiklos žurnalo įrašas aiškiai pasako „paruošė“, „provider priėmė“, „gautas atsakymas“, „registracija pradėta“ ar „aktyvus profilis patvirtintas“. Atidaromas trace rodo susijusius jobs/receipts/docs. Žmogaus, automatikos ir agento autorystė išlieka. Tiesioginis rankinis override taip pat yra audituotas veiksmas, ne iš istorijos dingęs pakeitimas.

## 5. Būsenų matrica

| Būsena | Privalomas elgesys |
| --- | --- |
| Loading | Išlaikyta navigacija/context, lokalūs skeleton ir žinomas paskutinis data_as_of; nesumaišyti seno verslo duomenų su nauju pasirinkimu |
| Empty | Nurodyti, ar nėra įrašų, agentas neįdiegtas, ar filtrai nerado rezultato; tinkamas kitas veiksmas |
| Disconnected / unknown | „Duomenų šaltinis neprijungtas“ ir kokio adapterio trūksta; nerodyti 0 kaip tikro rezultato |
| Stale / partial | Laikas, nepilni šaltiniai, watermark; leidžiama skaityti paskutinį snapshot, bet kontrolė tikrina dabartinę būseną |
| Validation / conflict | Konkretūs laukai arba revision conflict; išsaugotas žmogaus įvedimas ir galimybė palyginti dabartinį variantą |
| Permission denied / session expired | Nepateikti įrašo per alternatyvų endpoint/download; užbaigti stream, saugiai grąžinti į login |
| Running / waiting / retry | Užduoties ID, priežastis, checkpoint ir next retry; neapsimesti procentiniu progress kai jo nėra |
| Failed / unknown external | Atsekamas error/receipt; peržiūra ir leistinas sutikrinimas, be aklo „siųsti dar kartą“ |
| Success | Konkretaus rezultato nuoroda ir būsena; „užduotis priimta“ nėra „rezultatas atliktas“ |
| Paused | Kas sustabdyta ir kada; istorija/report pasiekiami, nauji operaciniai veiksmai valdomi gateway |

Statusams visada tekstas/ikona ir reikšmė, ne vien spalva. Grįžtant į sąrašą išlieka filtrai/scroll; URL gilioji nuoroda tikrinama serverio scope. Bendra paieška randa tik leistinus agentus/cases/messages/docs; kontaktų tekstai nepatenka į portfelio „visiems matomą“ indeksą.

## 6. Vizualinė ir techninė kryptis

Išlaikyti esamų modulių aiškų valdymo pobūdį, suvienodinti shell, navigaciją, tekstines būsenas ir komponentus. Naujo galutinio logo/palette šis planas nenustato. Žinomas Verslomatika vardas yra produkto tapatybė; vizualinis token dokumentas kuriamas iš faktinio pirmo shell, ne perrašant visų nišų dizainą.

Darbalaukyje navigacija + darbinė lentelė + konteksto panelis. Mobiliajame vienas darbas vienu metu: sąrašas → detalė → pokalbis, aiškus grįžimas; finansų lentelės turi pažymėtą horizontalų slinkimą. Sticky workspace navigation, ne marketingo autohide. Lietuviškas dienų/valiutų formatas, UTC saugojimas ir matomas pasirinktos aplinkos timezone.

Semantic HTML, keyboard navigation, matomas focus, prasmingi labels/status announcements, accessible dialogs ir tekstas 200 % zoom. UI escaping laiškams/modelio turiniui; raw HTML email neįvykdomas. Visos controls turi default/focus/disabled/loading/error, double submit išvengiame UI ir API. SSE bounded replay/poll fallback, serveriniai filtrai, export async; report generatorius nedaro LLM call vien perėjus į tabs.

## 7. Pagrindinės kelionės ir patikra

1. Portfelis → Madbeauty → klientų paieškos agentas → „kaip sekasi?“ → report → konkreti gija → tikras kvitas → next task.
2. Verslas → visi agentai → naujas tipas → readiness trūkumai → kalibravimo įrodymas → instance → chat/status, nekuriant naujo shell.
3. Direktoriaus aiškus nurodymas → viena užduotis → pranešta eiga → restart/reconnect → rezultatas → report/update.
4. Juridinis asmuo → laikotarpis → trūkstamas originalas → jo gavimas → partial payment → sutikrintas paketas → buhalterio korekcija.
5. Verslas A → deep link į verslo B message/doc/thread → denied be duomenų; scope switch ir revoked membership taip pat tikrinami.

Kiekvienam paviršiui: taikomų būsenų checklist, actual server adapterio HTTP patikra ir normalus desktop/mobile capture. Vieno bendro komponento įrodymas pernaudojamas tik jo tiksliai apimtoms būsenoms. Pirmas dizaino QA — viena bendra desktop/mobile peržiūra, vienas pataisų paketas, patvirtinimas; naują ratą pateisina konkretus likęs defektas. Šiame planavimo etape UI dar nerenderintas, jo craft/a11y/performance balai nepateikiami.
