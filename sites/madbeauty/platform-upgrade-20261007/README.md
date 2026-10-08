Aktualus207/207 checkpoint7694c8d: central new manual identity ir durable organization client admission, uncertain reply/restart/alarm recovery, actual pending/restored/mobile UI. Exact75aa kandidatas nepaskelbtas. Visas pavedimas ACTIVE; globals/mail/media/binding ir likusi UI matrica tęsiami.

Aktualus203/203 checkpoint ff917f2: esamo central email klientų ir komandos prieigų admission, atomic target journals, capability-before-lookup ir actual Workers/browser restart/revocation. Account-bound darbo vietos pasirinkimas išlieka po reload; SSR nustatymų label pataisytas. Exact75aa kandidatas nepaskelbtas. Visas pavedimas ACTIVE; new manual identity, globals, mail/media/binding ir likusi UI matrica tęsiami.

# Platformos upgrade — aktyvus įgyvendinimas

Aktualus200/200 checkpoint6ce4e02: central preferences/durable control journal, target reminder reconciliation, lost reply/newer revision recovery ir actual Workers alarm/restart. Actual new-client booking ir mobile preference outage/recovery accepted. Exact75aa39page305asset kandidatas nepaskelbtas. Full pavedimas ACTIVE ir neužbaigtas; manual identity/membership, globals, mail/media/binding ir likusi UI matrica tęsiami. [Saugykla](STORAGE.md), [priėmimas](ACCEPTANCE.md), [UI likučiai](UI_MATRIX.md).

Savininkas 2026-10-07 tiesiogiai atnaujino viso `upgrade-plan-20261006/PLAN.md` įgyvendinimą: „gali pradėti platformos tą upgrade kur darei planą“. Ankstesnė plataus upgrade pauzė panaikinta. Darbo šaka `ai/madbeauty-platform-upgrade-20261007`, bazė159d7d7 (gyvas reviewed V2 source897ba83 / Workersedf429e9). Vietinis veikiantis upgrade ir izoliuotas Workers kandidatų priėmimas; viešo perjungimo kvitas atskiras.

Apimtis: plano0–3 etapų vykdomi katalogo, pasiūlymų, variantų, meistrų, paieškos, profilio, rezervavimo, operatoriaus ir saugojimo darbai. Etapo4 plėtiniai rengiami su jų aktyvavimo vartais; mokėjimų gavėjas, kaina, realių teikėjų pilotas, jautrių anketų poreikis ir išorinės prieigos nėra išgalvojami. Nesiunčiami kvietimai ar rinkodara. Esamas nemokamas pilotas išlieka.

Pirmas serverinis kelias: kelių kanoninių procedūrų pasirinkimų partija → išsaugomi privatūs pasiūlymų juodraščiai → variantas su tikra kaina, trukme, tinkamais darbuotojais ir resursais → operatoriaus patvirtinimas → kategorijos paieška tik per approved projekciją → visas laisvas intervalas → atominis hold/confirm → abiejų rolių ID po restart. Toliau autonomiškai tęsiami likę įvykdomi plano moduliai; šio kelio PASS neužbaigia viso upgrade.

Rašomi tik own `sites/madbeauty/backend`, `prototype`, `cloudflare`, `acceptance`, šio katalogo dokumentai, own status/WORKSTREAMS. Shared content-studio ir turinio PR10 nekeičiami. Suderinta siaura bendro schema pataisa izoliuotame companion core PR6 (63cfd8c), aktyvaus shared checkout failai neliečiami. Publikuotas V2 paketas ir jo publishAt išlaikomi. Esami klientų, paslaugų, vizitų ID ir snapshots išlieka; realaus production DO duomenys neliečiami bandymų metu.

Regresijos manifestas: `node --test sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs`. Actual UI plotis320/390/820/1440, keyboard, normal/empty/error/stale/conflict būsenos pagal taikomumą. Istoriniai92testai ir ankstesni receipts neperrašomi. Synthetic fixtures tik izoliuotame store, jokių fake teikėjų production kataloge.

Kiti darbai: veiklos ataskaitos ir skundų žurnalas, saugojimo tvarkos faktinis patvirtinimas, apimties ribojimas mutacijoms bei likusi priėmimo matrica.


Paired source: core PR6 (`ai/madbeauty-editorial-schema-20261007`) ir pagrindinio projekto PR26. Lokalios preview/test komandos prieš paleidimą nustato `MB_CORE_ROOT` į tą companion checkout; Workers build perduodamas `--core-root`. Produkciniai publishAt, approvals ir package SHA išlieka iš tikro immutable release. Naujo 39 puslapių paketo rengimas yra turinio sesijos darbas, jo deploy receipt bus atskiras nuo platformos upgrade.


Istorinis165 checkpoint (dabartinis182 aprašytas pradžioje): 165 / 165 paired testų; peržiūrima galerija ir komandos portretai, registracijos taisyklės, ataskaitos, skundų žurnalas, priminimai ir laukiančiųjų pasiūlymai, pilno vizito fazės, SSR dalijimosi metaduomenys ir dinaminės GEO išvestys. Prieš testus nustatyk PowerShell `$env:MB_CORE_ROOT='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/madbeauty-editorial-core'`; Workers build `--core-root` įriša ir V2 projekcijos/GEO helper bytes, ne vien schema. Companion c7e0c9a integruoja rašytojo f27547c. Preview naudoja exact 39 puslapių SHA 75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4. Atskiras content PR30 live receipt 6777e97 jau priimtas; plataus upgrade production deploy dar nevykdytas.

Medijos checkpoint154/154, [apimties, kainos ir adapterio patikra](MEDIA.md): bounded SQL pilot, atomic assets/counter/hash, local failure cleanup ir Workers mixed load. Larger R2 perėjimas dar neaktyvuotas; viso upgrade darbas tęsiamas.

Indeksuotų rezervacijos pakeitimų ir actual filialo UI checkpoint157/157: [saugyklos ribos](STORAGE.md), [tikras naršyklės ir Workers priėmimas](ACCEPTANCE.md). W02 priimtas izoliuotai, I02 fizinis routing dar vykdomas.

Teikėjo mutacijų ir indeksuotų private workspace checkpoint160/160: [saugojimo ribos](STORAGE.md), [actual laiko conflict/network recovery](ACCEPTANCE.md), [taikomų UI būsenų registras](UI_MATRIX.md). Exact75aa39pagebuild302assets, candidate not deployed.

Indeksuotų paskyros kontrolės ir organizacijų automatikos checkpoint163/163: API/STORAGE/ACCEPTANCE. Actual stale candidate, keyboard slot ir expired hold priimti; pilnos matricos ir fizinio routing darbas aktyvus.

Checkpoint164/164: expiry marker pataisa ir actual390 recovery aria-pressed=false. UI_MATRIX išlaiko konkrečias likusias pločių/rolių būsenas.

Checkpoint165/165: pilnas city dropdown, faktinės ribos ir paieškos network/keyboard recovery; konkretūs gidai atrenkami pagal admitted taxonomy/city targets. Cold-start shell failure priežastis lieka UNVERIFIED.

Checkpoint166/166: naujos ir importuotos patvirtintos paskyros kliento tapatybė kuriama indexed patch, vienoje auth transakcijoje; rollback, unknown-account/new-client guards ir actual Workers restart priimti. Source7747a05; fizinis routing ir visa UI matrica lieka aktyvūs.

Checkpoint167/167: pradinis HTTP503 ir uždelstas boot atsakymas užbaigiami klaida / keyboard retry, URL ir pasirinkti filtrai išlieka. Actual isolated8843 proxy į own8841, keturi plotiai, brand/focus. Source0617086; exact75aa39pages304assets, candidate-not-deployed. Originalaus transient cold-start priežastis nepervadinta patvirtinta.
