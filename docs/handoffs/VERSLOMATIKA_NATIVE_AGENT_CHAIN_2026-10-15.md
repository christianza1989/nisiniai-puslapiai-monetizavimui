# Koordinatoriaus pavedimas ir esamas agento bandymo kelias

Tęsiamas [grandinės integravimo paketas](VERSLOMATIKA_CHAIN_INTEGRATION_2026-10-15.md). Kitų repo integravimas atidėtas savininko prašymu. Šis paketas prijungia vieną aiškų savininko scenarijų prie esamų Task, lab ir Quality; nekuriama kita kalibravimo sistema.

## Įgyvendinta ir patikrinta

Savininko `team/agent-tests` užklausa parenka tik jau išsaugotą nuosavo verslo agentą ir tikslią redakciją. Galimos 1–8 normalizuotos kliento žinutės arba pirmas išsaugotas pavyzdys. Atskiras kanoninio snapshot preflight užbaigiamas prieš admission/Task užraktus. Tas pats priimtas UUID pirmiausia sutaikomas su istorija, nesukuriant kito pavedimo.

Vienas native-only allowance pakeičia įprastą trijų kvietimų rezervą. Užfiksuojami konkretūs scenarijaus, įvesties, Quality ir High profilio hash. Esamas worker vykdo native lab ir nepriklausomą Quality, o rezultatas grįžta į tą patį pokalbį per 0041 tikrų kvitų kilmės patikrą. Papildomas įprastos rolės Attempt neklastojamas. Apskaita perskaito tikrus native usage kvitus vieną kartą; nežinoma piniginė kaina lieka nežinoma. Atšaukimas išsaugo jau panaudotus kvietimus ir neleidžia paskelbti pavėluoto atsakymo.

Senesnis planas be High profilio lieka skaitomas su nepatvirtintu profiliu, bet nesuteikia naujo High kvietimo leidimo. Netinkamai bendrajai temai grąžinamas aiškus403 prieš native preflight. Didesnė Unicode kūno riba taikoma tik naujam scenarijaus endpoint; kitos team užklausos išlaiko ankstesnę ribą.

## Bounded įrodymai

| Tikrinta | Faktas |
|---|---|
| Galutinis koordinatoriaus API/worker | 7 PASS / 129.64 s, švarus source `cda4a596e00190e143cdbdfe918e945319a8e227` |
| Native allowance ir 0041 provenance | 27 PG PASS / 209.22 s, užfiksuotas f81 source |
| High ir caller jungtinis paketas | 13 PG PASS / 344.94 s, užfiksuotas877 source |
| Riboti offline/controller kontraktai | 60 PASS / 0.91 s ir Ruff PASS |
| Nepriklausoma peržiūra |Du konkretūs P2: senesnio profilio istorija ir netinkamos temos klaidos atsakymas; abu pataisyti su actual API regresija |

Originalūs nesėkmingi bandymai neperrašyti. QA naudoja tikrą restricted PostgreSQL, autoritetą, modelio argumentų sudarymą, native įrašus, patikras ir apskaitą. Tik provider transportas yra inertinis: šie PASS neįrodo mokamo modelio semantinės kokybės. Legacy tekstinio/Quality core suderinamumo su High praplėtimu cohortai bei helper release gate fiksuojami atskirai.

## Priėmimo ir tęsinio riba

Tai vieno scenarijaus bandymas, ne pilnas agento kalibravimas ar įjungimas. Baseline, protected holdout, palyginimas, Config-bound sprendimas, admission, pritaikymas/rollback ir tikri kanalai lieka esamo kalibravimo core vartais. Universalių buhalterio, reklamos ir kitų profesijų integracijų leidimai iš šio scenarijaus neatsiranda.

Ankstesnis API18871/UI3030/Studio4319 ir devynių puslapių privati svetainė išsaugoti. Nauja schema ir UI priimami atskiru dokumentu po duomenų kopijos ir procesų quiescence patikros. Faktai, Foundation, redakcinis approval, release, domenas ir tikri išoriniai kanalai dar nėra priimti. Main merge ir kito PC pritaikymas nefiksuojami iš vietinio PASS.
