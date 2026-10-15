# Madbeauty pilno atnaujinimo planas

2026-10-06 savininko užsakytas esamos platformos ir Fresha / Treatwell pavyzdžių auditas bei tobulinimo planas. **Planavimas užbaigtas; naujų platformos funkcijų įgyvendinimas šiuo paketu neatliktas.** Šaltinio bazė `c6516b7` atitinka paieškos pataisymo paketą.

- [Pilnas planas](PLAN.md): faktinė būklė, meistro ir kliento keliai, duomenys / API, migracija, etapai ir priėmimas.
- [Interaktyvi peržiūra](index.html): kategorijų paieška ir pažymėjimas, meistro kelias, darbų filtrai ir pilnas planas. Veikia atidarius failą, be išorinių bibliotekų.
- [Pilnas procedūrų sąrašas](CATALOGUE.md): 14 pagrindinių sričių / 194 procedūros, 7 plėtiniai / 31 procedūra; iš viso 59 subkategorijos.
- [Taksonomijos pasiūlymas](TAXONOMY_PROPOSAL.json): stabilūs ID, sinonimai, patikros pasiūlymai ir visų 10 senų tipų atitikmenys.
- [Darbų eilė](BACKLOG.json): 41 darbas, P0 / P1 / P2, penki etapai, priklausomybės ir konkretūs priėmimo kriterijai.
- [Audito įrodymai](AUDIT.md) ir [plano patikra](VALIDATION.md): pirminiai šaltiniai, apžiūrėti paviršiai, ribos ir patikros rezultatai.

Procedūrų kainų, trukmių, realių teikėjų ir klientų šiame pasiūlyme nėra. Sveikatos, sporto ir gyvūnų sritys aprašytos kaip atskirai įjungiami plėtiniai. Pagrindinis katalogas taip pat nepakeičia konkrečios procedūros tinkamumo patikros.

## Generavimas ir peržiūra

Iš repo šaknies:

```powershell
node sites/madbeauty/upgrade-plan-20261006/build-plan.mjs
node sites/madbeauty/upgrade-plan-20261006/validate-plan.mjs
node sites/madbeauty/upgrade-plan-20261006/serve.mjs
```

Peržiūra: `http://127.0.0.1:8811`. Serveris rodo tik šiame kataloge aiškiai leidžiamus planavimo failus ir klausosi loopback adreso. `data.mjs` ir `PLAN.md` yra redaguojami šaltiniai; generatorius atnaujina JSON, skaitomą katalogą ir HTML. `evidence/` bei PR teksto failas vietiniai, į Git neįtraukiami. HTML pasirinkimai yra tik šios peržiūros būsena; nesukuria platformos paslaugų ir nėra teikėjo katalogo redaktorius.
