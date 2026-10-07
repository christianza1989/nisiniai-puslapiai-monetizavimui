# Platformos upgrade — aktyvus įgyvendinimas

Savininkas 2026-10-07 tiesiogiai atnaujino viso `upgrade-plan-20261006/PLAN.md` įgyvendinimą: „gali pradėti platformos tą upgrade kur darei planą“. Ankstesnė plataus upgrade pauzė panaikinta. Darbo šaka `ai/madbeauty-platform-upgrade-20261007`, bazė159d7d7 (gyvas reviewed V2 source897ba83 / Workersedf429e9). Vietinis veikiantis upgrade ir izoliuotas Workers kandidatų priėmimas; viešo perjungimo kvitas atskiras.

Apimtis: plano0–3 etapų vykdomi katalogo, pasiūlymų, variantų, meistrų, paieškos, profilio, rezervavimo, operatoriaus ir saugojimo darbai. Etapo4 plėtiniai rengiami su jų aktyvavimo vartais; mokėjimų gavėjas, kaina, realių teikėjų pilotas, jautrių anketų poreikis ir išorinės prieigos nėra išgalvojami. Nesiunčiami kvietimai ar rinkodara. Esamas nemokamas pilotas išlieka.

Pirmas serverinis kelias: kelių kanoninių procedūrų pasirinkimų partija → išsaugomi privatūs pasiūlymų juodraščiai → variantas su tikra kaina, trukme, tinkamais darbuotojais ir resursais → operatoriaus patvirtinimas → kategorijos paieška tik per approved projekciją → visas laisvas intervalas → atominis hold/confirm → abiejų rolių ID po restart. Toliau autonomiškai tęsiami likę įvykdomi plano moduliai; šio kelio PASS neužbaigia viso upgrade.

Rašomi tik own `sites/madbeauty/backend`, `prototype`, `cloudflare`, `acceptance`, šio katalogo dokumentai, own status/WORKSTREAMS. Shared content-studio ir turinio PR10 nekeičiami. Suderinta siaura bendro schema pataisa izoliuotame companion core PR6 (63cfd8c), aktyvaus shared checkout failai neliečiami. Publikuotas V2 paketas ir jo publishAt išlaikomi. Esami klientų, paslaugų, vizitų ID ir snapshots išlieka; realaus production DO duomenys neliečiami bandymų metu.

Regresijos manifestas: `node --test sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs`. Actual UI plotis320/390/820/1440, keyboard, normal/empty/error/stale/conflict būsenos pagal taikomumą. Istoriniai92testai ir ankstesni receipts neperrašomi. Synthetic fixtures tik izoliuotame store, jokių fake teikėjų production kataloge.

Kiti darbai: B04/B05 priminimai ir struktūruotas laukiančiųjų sąrašas, klientų kortelės ir pakartotinis rezervavimas, apimties ribojimas mutacijoms bei likusi priėmimo matrica.


Paired source: core PR6 (`ai/madbeauty-editorial-schema-20261007`) ir pagrindinio projekto PR26. Lokalios preview/test komandos prieš paleidimą nustato `MB_CORE_ROOT` į tą companion checkout; Workers build perduodamas `--core-root`. Produkciniai publishAt, approvals ir package SHA išlieka iš tikro immutable release. Naujo 39 puslapių paketo rengimas yra turinio sesijos darbas, jo deploy receipt bus atskiras nuo platformos upgrade.


Aktualus checkpoint: 128 / 128 paired testų; pilno vizito fazės, SSR dalijimosi metaduomenys ir dinaminės GEO išvestys. Prieš testus nustatyk PowerShell `$env:MB_CORE_ROOT='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/madbeauty-editorial-core'`; Workers build `--core-root` įriša ir V2 projekcijos/GEO helper bytes, ne vien schema. Companion c7e0c9a integruoja rašytojo f27547c. Preview naudoja exact 39 puslapių SHA 75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4. Atskiras content PR30 live receipt 6777e97 jau priimtas; plataus upgrade production deploy dar nevykdytas.
