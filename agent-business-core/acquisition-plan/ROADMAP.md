# Įgyvendinimo roadmap

2026-10-10. Darbų planas, ne pažadas apie jau veikiančią produkciją. Savininko kryptis: bendras core, tada Madbeauty teikėjų pilotas.

Tos pačios dienos papildomas pavedimas įgyvendino M1 objective/provider kontrakto dalį ir M5 uždaros daugelio žingsnių kalibravimo infrastruktūrą: [CALIBRATION](CALIBRATION.md). DB migracijos, protected release priėmimas ir M2 realių adapterių jungtis dar lieka roadmap; etapų pilno PASS iš dalinės implementacijos neskiriame.

## Etapai ir priėmimas

| ID | Darbas ir rezultatas | Priklausomybės | Priėmimo kriterijus | Apytikris darbas |
|---|---|---|---|---|
| M0 | Patvirtinti scope, esamo runtime/registry/deployment inventorių, offer, CTA, duomenų ir transporto politiką | — | Žinoma kas lokalu / hosted; užregistruotas kiekvienas neįvykdytas siuntimo vartas; Madbeauty lieka disabled | 1–2 d. |
| M1 | Kampanijos objective/roles, tenant schema, migracijos ir provider konversijos sutartis | M0 | Provider signup scenarijus praeina; buyer regresija nepakeista; tenant leak ir nežinomi laukai atmetami | 2–4 d. |
| M2 | Pirmas visas vertikalus kelias su fake discovery, užfiksuotu transportu ir signup callback | M1 | Synthetic kandidatui draft → review → outbox → capture → reply → aktyvacijos įvykis; tikras siuntimas neįmanomas | 2–3 d. |
| M3 | Serper per Treg ir pirminio URL fetch adapteriai; kvotos, kainos, faktai, cache politika | M2 | Mažas leidžiamas realių šaltinių bandymas; kiekviena atranka turi originalų įrodymą, netinkami/tušti rezultatai atmetami; paid calls tik su konkrečiu biudžetu | 2–4 d. |
| M4 | PostgreSQL run/jobs/outbox, nuomos, fencing, dedup, scheduler ir restart | M2 | Dvigubas cron/restart/lease-loss neprideda duplicate attempt; DST ir kampanijos vietinė diena; pause ir budget sustabdo darbą | 2–4 d. |
| M5 | Verslo žinių paketai ir agentų kalibravimo rinkinys / apsaugotas holdout | M1, M3 | Žemiau nurodyti release kriterijai; fail priežastys pataisytos, modelio/prompt versija atsekama | 2–4 d. |
| M6 | Leidžiamas mail transportas, opt-out, inbound adapteris ir Case handoff | M4, M0 | Owner test inbox gauna vieną laišką; reply tik vienas Case; refusal/complaint/OOO/bounce/timeout scenarijai veikia; tiekėjo sąlygos patvirtintos | 2–4 d. |
| M7 | Kampanijos operatoriaus GUI, permissions, costs ir funnel | M4, M5 | Mobilus ir desktop review; serverio rolės/tenant apsauga; matomas denied/uncertain; pause įsigalioja prieš siuntimą | 2–4 d. |
| M8 | Madbeauty tikras hosted signup, invitation token ir aktyvacijos atribucija | M1, M6 | Testinis realus prisijungimas pasiekia pilną profilį; pasirašyto callback replay nesukuria duplicate; unknown atribucija neišgalvojama | 2–4 d. |
| M9 | Deployment, backup/restore, monitoriai, runbook ir release įrodymai | M3–M8 | Scheduled synthetic run realiame serveryje, atkūrimo patikra, secret/tenant testai ir rollback; core improvement įrašas su source/adoption įrodymais | 1–3 d. |
| P1 | Madbeauty ribotas discovery ir rankinis juodraščių priėmimas | M3, M5 | Pilot plane nurodyta šaltinių kokybė; jokio kontakto iki likusių vartų | 2–3 darbo dienų stebėjimas |
| P2 | Kontroliuojamas Madbeauty prisijungimo pilotas | M6–M9, P1 | Maža patvirtinta banga, kasdieninė peržiūra, realūs funnel ir stop įrodymai | 4–6 savaitės stebėjimo |
| P3 | Rezultatų sprendimas ir antros nišos perkeliamumo patikra | P2 | Sprendimas tęsti/keisti/stabdyti; kita niša veikia konfiguracija ir adapteriu, be kopijuoto atskiro runtime | 2–3 d. |

„d.“ reiškia inžinerinio darbo dienų įvertį, ne nustatytą kalendoriaus terminą. M3/M4/M5 dalis gali vykti lygiagrečiai, kai sutartys stabilios; M6 ir M8 priklauso nuo esamos hosted platformos pasirengimo ir tiekėjo pasirinkimo. Bendra apimtis maždaug 20–40 inžinerinio darbo dienų su neapibrėžtumu; piloto 4–6 savaitės yra atskiras rezultato stebėjimas. Datų neįsipareigojame iki M0 inventoriaus. Esamas vietinis draft modulis yra pradžia, ne M1–M9 priėmimo pakaitalas.

## Kalibravimo release kriterijai

Sukurti bent 40 iš anksto sužymėtų scenarijų: 20 atvirų train/regression ir 20 apsaugotų nematytų. Holdout saugomas atskirai nuo tyrėjo žinių / prompt ir nėra naudojamas taisymų pavyzdžiams. Po nesėkmės išsaugomas pirmas FAIL, taisoma priežastis, atskleisti scenarijai išlieka regresijoje, naujam release sudaromas naujas apsaugotas rinkinys. Tai siūloma minimali pradinė patikra, ne statistinis našumo įrodymas.

Aprėptis: buyer/provider painiojimas, netinkamas miestas/paslauga, juridinio statuso nežinomybė, fizinis asmuo be tinkamo pagrindo, nepatvirtintas kontaktas, pasenęs offer, netikras CTA, šaltinio prompt injection, išgalvotas poreikis/klientų garantija, opt-out, duplicate, tenant leak, kainos limitas, OOO, bounce, skundas, neaiškus reply ir submit timeout. Vertina taisyklių testai ir atskiras vertintojas / operatoriaus žymėjimas; vien dviejų to paties modelio kvietimų neužtenka.

Release: 0 kritinių pažeidimų (neteisėtas/uždraustas siuntimas, tenant leak, išgalvotas offer, ignoruotas opt-out, aklas uncertain retry), 100% faktinių teiginių turi galiojantį įrodymą; bent 90% ne kritinių atrankos ir reply klasifikavimo scenarijų priimti. Neišlaikius — draft_only. Produkcinis modelio adapteris ir konkreti versija vertinami atskirai nuo lokalaus CodexLab; dabartinė sintetinė kalibracija neperkelia priėmimo automatiškai.

## Kritinės patikros prieš pilotą

1. Migration ir restore su esamais pokalbiais, outbox ir buyer scenarijais.
2. Du worker, kill tarp submit ir receipt, atšaukta nuoma, webhook replay, tą patį kontaktą radus dviejuose šaltiniuose.
3. Visos contact policy kombinacijos, suppression prieš queued send, expired offer/CTA, budžeto rezervacijos konfliktas.
4. Madbeauty hosted onboarding pilnas kelias ir kampanijos attribution, tikri profile permissions bei gallery teisės.
5. Transporto testas savininko valdomam adresui; matomas gavimas ir atsakymas, ne vien HTTP200.
6. Mobile/desktop operatoriaus GUI ir aiškus global/campaign pause, metric receipt bei incidento runbook.

## Darbų ir release tvarka

Kiekvienas M etapas turi atskirą scope rezervaciją/issue, nuosavą branch ir reviewable PR pagal projekto Git workflow. PR aprašo final behavior, migraciją, realiai atliktas patikras ir likusias ribas. Shared runtime pataisos registruojamos core-improvement journal su priežastimi, adopcija ir rollback. Produkcinis įjungimas yra atskiras nuo source merge; nei planas, nei passing synthetic test nėra leidimas kontaktuoti žmones.

Pirmas implementation PR turėtų apimti M1 ir M2: objective/provider sutartis ir visas synthetic kelias. Taip anksti patikrinama, ar core iš tiesų gali aptarnauti platformos teikėjų prisijungimą. Po to M3/M4, kalibracija ir transporto/onboarding priėmimas.

## Šio planavimo patikra

Patikrinti esamo acquisition kontraktai ir Madbeauty BUSINESS/ACQUISITION/platformos priėmimo dokumentai; runtime šiame papildyme nekeistas. Aštuonių planavimo/navigacijos dokumentų 29 vietinės failų nuorodos egzistuoja. Įtrauktas savininko visų grožio paslaugų patikslinimas. Treg atlikti tik katalogo skaitiniai; tikrų paieškų kokybės ir kainų kvotų nepatvirtinome. M0–M9 ir P1–P3 yra būsimi acceptance darbai, ne jau atliktų testų sąrašas.
