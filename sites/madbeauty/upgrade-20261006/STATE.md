# Madbeauty pilno plano įgyvendinimas

**Aktualu 2026-10-06:** savininkas pasakė „palauk kolkas pauze.“ – pilnas įgyvendinimas PAUSED. Vėlesnis atskiras pavedimas leidžia tik straipsnių / katalogo pagrindą turinio sesijai; jis vykdomas `ai/madbeauty-content-foundation-20261006`, [README](../content-foundation-20261006/README.md). Taksonomijos source pernaudotas šiam siauram pagrindui. Meistro pilnas pasirinkimas, variantai, multi-service booking, migracija ir kiti41 plano darbai neatnaujinti. Žemiau pradinė vykdymo tvarka išsaugota kaip istorija, ne aktyvus leidimas.

2026-10-06. Savininko pavedimas: „igyvendink prasau“ po pilno [plano](../upgrade-plan-20261006/PLAN.md). Režimas: veikiantis įgyvendinimas su realiu vietiniu / Workers adapteriu; gyvas release tik po priėmimo. Ankstesnis planas ir jo priėmimas yra istorinis planavimo paketas.

Šaka `ai/madbeauty-upgrade-20261006`, bazė `b422165`, izoliuotas checkout `madbeauty-upgrade-plan`. Failų langas: Madbeauty taxonomy/backend/prototype/cloudflare/acceptance ir savi dokumentai / WORKSTREAMS. Esami tikri tenant ID, vizitų snapshot, saugojimo tapatybė, paštas, sekretai ir patvirtinti turinio paketai išsaugomi. Kitų nišų ir paralelinio turinio kalendoriaus failai neperimami.

## Vykdymo tvarka

1. Hierarchinis registras ir legacy suderinamumas; meistro kelių paslaugų juodraščiai, pasiūlymai / variantai, realus laiko filtras.
2. Grupuotas meniu, priedų taisyklės, kelių paslaugų rezervavimo seka ir prieinamumo / tinkamumo kontrolė.
3. Normalizuotas saugojimas ir migracijos įrodymai, komandos / vietų prieigos, klientai, priminimai / laukiančiųjų procesas, importas / rodikliai.
4. Plėtinių duomenų ir rezervavimo modeliai bei likę pagrindinio plano keliai. Mokami išoriniai adapteriai nejungiami neturint konkrečios paslaugos ir sąnaudų sutarties; neužpildyti moduliai nežymimi įgyvendintais.

Kiekvienas dalinis paketas yra tarpinis rezultatas. Visas užsakymas nėra baigtas vien dėl katalogo arba testų sumos. 41 darbo eilės būsena ir konkretūs įrodymai fiksuojami vykdymo metu, istorinis BACKLOG nekeičiamas.

## Regresijos manifestas

- `node --test sites/madbeauty/backend/backend.test.mjs sites/madbeauty/backend/reschedule-contract.test.mjs sites/madbeauty/backend/fixture-runtime.test.mjs`
- `node --test sites/madbeauty/prototype/*.test.mjs`
- `node --test sites/madbeauty/acceptance/*.test.mjs`
- `node --test sites/madbeauty/cloudflare/*.test.mjs`

Prieš realų paleidimą tikslinti faktinį suite sąrašą; source, laikrodis, duomenų režimas, viewport ir nepavykę bandymai fiksuojami atskirai.
