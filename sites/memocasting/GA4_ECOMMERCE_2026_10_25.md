# Memory Casting · GA4 pirkimai ir šaltiniai

Savininko pavedimas 2026-10-25: prijungti GA4 pirkimų, pajamų ir pirkėjų atėjimo šaltinių matavimą iki veikiančio leidinio. Nauja GA4 nuosavybė 560554153 / srautas 16198963010; jau veikiantis turinio matavimas yra šio tęsinio pagrindas. Ankstesnių priėmimų ribos lieka istorijoje.

- [x] Sėkminga porinė Git aktualumo patikra: CORE a78b56ea / main d3fe34b1; PUBLIC 5cff95db / main 8e47c34e.
- [x] Perskaitytas tikras order → Stripe signature → paid → outbox / serverio cron kelias. Pajamos negali kilti iš mygtuko, iframe callback ar neapmokėto užsakymo.
- [ ] Sutikimu valdomas šaltinis ir kampanija, švarūs adresai be privačių parametrų; atnaujintas pranešimas ir privatumo tekstas.
- [ ] Atskiras pasirinktinės analitikos order kontekstas; parduotuvės / aplinkos / galiojančio sutikimo ribos ir atšaukimas.
- [ ] Serverio patvirtintų pirkimų ir grąžinimų adapteris; patvari eilė, pakartojimų kontrolė, unikalus transaction_id ir sumų sutikrinimas.
- [ ] Google srauto nustatymai, serverio paslaptis tik privačioje konfigūracijoje, jokio PII ar mokėjimo prieigos duomenų perdavimo.
- [ ] Izoliuotas pasirašyto TEST įvykio ir pakartojimo priėmimas, Google validation be fiktyvių LIVE pajamų.
- [ ] Tikslus native privatumo leidinys, build ir actual bindings palyginimas, saugus production įkėlimas ir tikro host patikra.
- [ ] Naudotojui prieinamos pirkimų ir šaltinių ataskaitos bei aiškios matavimo ribos.

Analitika apima tik sutikusius lankytojus. Visų pardavimų apskaitos šaltinis lieka prekybos užsakymai. Nepriskiriame istorinių pardavimų naujiems lankytojams ir nedarome tikro bandomojo mokėjimo.

Darbo sritis: esama CORE commerce pasirinktinės analitikos galimybė, jos HTTP / runtime / cron integracija ir atskira papildanti migracija; PUBLIC Memo analitikos bei checkout adapteris ir tikslūs testai. Jokių katalogo, kainų, likučių, senų migracijų, pašto, vežėjo, Stripe teisių ar straipsnių datų pakeitimų. Esamas cron išsaugomas. Rollback: išjungti tik analitikos integraciją ir grąžinti ankstesnį kodą, neatstatant užsakymų DB.
