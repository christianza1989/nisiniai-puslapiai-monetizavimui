# Automatinė straipsnių peržiūra ir papildoma partija

Savininkas tiesiogiai panaikino privalomą specialisto žmogaus straipsnių peržiūrą. Per-site [EDITORIAL_POLICY.json](../EDITORIAL_POLICY.json) reikalauja faktinės agento peržiūros ir savarankiško teksto pataisymo, bet straipsnių nebestabdo dėl žmogaus parašo. [AUTHORIZATION.json](AUTHORIZATION.json) užfiksuoja originalų nurodymą ir jau galiojantį leidimą patikrintus atnaujinimus diegti.

Šis atskiras content-only consumer išlaiko gyvą runtime b7a34b1 / core63cfd8c, production namespace / class / v1, paštą ir domenus. Dabartinis priimtas baseline yra320a8e0f / version1de389a7:58puslapiai ir275medijos failai. Jų snapshots / datos / baitai turi išlikti. Vienuolikos naujai automatiškai peržiūrėtų straipsnių paketas privalo turėti naują immutable SHA, actual revision-bound peržiūras ir atskirą ADMISSION.json tapatybę. Istoriniai next19 / PR55 ir dates-only / PR48 įrodymai neperrašomi.

Helpers prieš diegimą tikrina naują paketą, senus snapshots/mediją, kiekvieno naujo puslapio tikrą peržiūros hash ir publikavimo ribas. Production bundle neturi QA rakto ar laikrodžio override. Priėmimas naudoja tą pačią esamą isolated calendar QA namespace, o provider konfigūracija lyginama prieš / po.

Naujos partijos diegimo būsena fiksuojama tik pagal actual RECEIPT.json. Iki jo nėra completed deployment teiginio. Full platform backend šiuo straipsnių leidimu neaktyvinamas.

## Priimtas gyvas leidimas

[RECEIPT.json](RECEIPT.json) patvirtina gyvą versiją `4e43bd2d-e5ea-491f-ae3e-ea74d260fbe9` ir tikslų paketą `98882a2d62274315166757ebc581a1cc2b4aff98f4425b179a676e4bae8cf9b2`: 69 puslapiai, 65 gidai, 330 medijos failų. Pridėti 11 gidų nebėra žmogaus peržiūros laukimo būsenoje; jie publikuojami pagal savo išlaikytas datas, pirmasis 2026-10-29 08:00 UTC / 10:00 Lietuvoje.

Vietinės ir isolated hosted patikros praėjo po 124 publikavimo ribas. Canonical prieš / po HTTP ir šeši tikri naršyklės vaizdai 1440 / 390 patvirtinti. Visi 434 gyvo leidimo asset paths patikrinti: 129 dabartiniai pateikti, 305 būsimi neprieinami. Septyni puslapiai jau vieši, 62 gidai dar laukia savo datos. Visi 58 baseline snapshots ir 275 medijos failų baitai išlaikyti; actual provider konfigūracija sutapo prieš / po. Žmogaus eksperto peržiūra neįrašyta kaip atlikta.

Rollback baseline: `1de389a7-3f36-44f5-ad57-bb3a457f2146`. Pilnas platformos backend šiuo turinio leidimu nepaleistas.
