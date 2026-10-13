# Deleguoto pašto metaduomenų valymas

Prieš taisymą [CAPACITY_OBSERVATION](CAPACITY_OBSERVATION.json) izoliuotame Node SQLite užpildė4096 užbaigtus kvitus, palaukė60 dienų ir gavoCAPACITY503 naujam kvitui. SMTP0, klientų įrašų0; tai nėra gyvas produkcinis incidentas.

Pataisa taiko esamą30 dienų terminalių pašto metaduomenų langą. Central completion laikas atskirtas nuo ACK retry / sukūrimo laiko. Istoriniams kvitams be completion laiko pradedamas konservatyvus naujas30 dienų langas. Tik signed active-target komanda, teisinga epoch / lease / hash ir terminali pakankamai sena eilutė leidžia pašalinti target outbox / claim metaduomenis; po patvirtinto atsakymo ištrinamas central kvitas. Prarastas atsakymas išlaiko central kvitą ir kitąkart patvirtinamas be SMTP. Vienai organizacijai vienu ciklu daugiausia32 kvitai.

Pending, reserved, ack-pending, naujas completion ir pending retry neliečiami. Vizitai / klientų įrašai išlieka. Užfiksuota originali source handoff kopija lieka fenced; ši pataisa nėra C02 klientų / visų istorinių kopijų trynimas. Trynimo komanda nepatenka į browser RPC. Po šio atskiro metaduomenų bandymo savininkas patvirtino customer12/24 mėn. ir backup30 dienų pasiūlymą. Šio dokumento268-testų kvitas savaime nėra vėlesnio C02 vykdymo įrodymas.

Prieš galutinę regresiją reikalaujami rinkiniai:

```
node --test --test-concurrency=1 sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs
node --test infrastructure/mail-relay/purpose.test.mjs
node --test --test-concurrency=1 sites/madbeauty/trial-20261010/native.test.mjs sites/madbeauty/trial-20261010/operations.test.mjs
```

Tikimasi268 produkto testų: ankstesni264 +3 Node +1 native Workers. Esamų testų pašalinta0. Naujas native fixture pirmiausia netinkamai lygino RPC rezultato proxy ir vėliau panaudojo poison stub lauką po restart; fixture pataisytas, actual signed target valymas / SQL restart / nepakeistas rezervacijos ID / mail nedubliavimas praėjo. Diagnostinis poisoned-stub log lieka private ignored output. Nė viena istorinio kvito suma nepavadinama nauju šios realizacijos testu.

Galutinių regresijų ir diegimo būsena bus užfiksuota atskirame kvite. Canonical pilno upgrade ši pataisa savaime neaktyvina.
