# Platformos upgrade — aktyvus įgyvendinimas

Savininkas 2026-10-07 tiesiogiai atnaujino viso `upgrade-plan-20261006/PLAN.md` įgyvendinimą: „gali pradėti platformos tą upgrade kur darei planą“. Ankstesnė plataus upgrade pauzė panaikinta. Darbo šaka `ai/madbeauty-platform-upgrade-20261007`, bazė159d7d7 (gyvas reviewed V2 source897ba83 / Workersedf429e9). Vietinis veikiantis upgrade ir izoliuotas Workers kandidatų priėmimas; viešo perjungimo kvitas atskiras.

Apimtis: plano0–3 etapų vykdomi katalogo, pasiūlymų, variantų, meistrų, paieškos, profilio, rezervavimo, operatoriaus ir saugojimo darbai. Etapo4 plėtiniai rengiami su jų aktyvavimo vartais; mokėjimų gavėjas, kaina, realių teikėjų pilotas, jautrių anketų poreikis ir išorinės prieigos nėra išgalvojami. Nesiunčiami kvietimai ar rinkodara. Esamas nemokamas pilotas išlieka.

Pirmas serverinis kelias: kelių kanoninių procedūrų pasirinkimų partija → išsaugomi privatūs pasiūlymų juodraščiai → variantas su tikra kaina, trukme, tinkamais darbuotojais ir resursais → operatoriaus patvirtinimas → kategorijos paieška tik per approved projekciją → visas laisvas intervalas → atominis hold/confirm → abiejų rolių ID po restart. Toliau autonomiškai tęsiami likę įvykdomi plano moduliai; šio kelio PASS neužbaigia viso upgrade.

Rašomi tik own `sites/madbeauty/backend`, `prototype`, `cloudflare`, `acceptance`, šio katalogo dokumentai, own status/WORKSTREAMS. Shared content-studio, companion public-core ir turinio PR10 nekeičiami. Publikuotas V2 paketas ir jo publishAt išlaikomi. Esami klientų, paslaugų, vizitų ID ir snapshots išlieka; realaus production DO duomenys neliečiami bandymų metu.

Regresijos manifestas: `node --test sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs`. Actual UI plotis320/390/820/1440, keyboard, normal/empty/error/stale/conflict būsenos pagal taikomumą. Istoriniai92testai ir ankstesni receipts neperrašomi. Synthetic fixtures tik izoliuotame store, jokių fake teikėjų production kataloge.

Kitas rezultatas: pasiūlymų duomenų ir API sutartis, atgal suderinama migracija ir serverinis pilno kelio priėmimas; tada meistro ir kliento sąsajos.
