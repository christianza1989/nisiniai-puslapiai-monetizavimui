# Automatinė straipsnių peržiūra ir papildoma partija

Savininkas tiesiogiai panaikino privalomą specialisto žmogaus straipsnių peržiūrą. Per-site [EDITORIAL_POLICY.json](../EDITORIAL_POLICY.json) reikalauja faktinės agento peržiūros ir savarankiško teksto pataisymo, bet straipsnių nebestabdo dėl žmogaus parašo. [AUTHORIZATION.json](AUTHORIZATION.json) užfiksuoja originalų nurodymą ir jau galiojantį leidimą patikrintus atnaujinimus diegti.

Šis atskiras content-only consumer išlaiko gyvą runtime b7a34b1 / core63cfd8c, production namespace / class / v1, paštą ir domenus. Dabartinis priimtas baseline yra320a8e0f / version1de389a7:58puslapiai ir275medijos failai. Jų snapshots / datos / baitai turi išlikti. Vienuolikos naujai automatiškai peržiūrėtų straipsnių paketas privalo turėti naują immutable SHA, actual revision-bound peržiūras ir atskirą ADMISSION.json tapatybę. Istoriniai next19 / PR55 ir dates-only / PR48 įrodymai neperrašomi.

Helpers prieš diegimą tikrina naują paketą, senus snapshots/mediją, kiekvieno naujo puslapio tikrą peržiūros hash ir publikavimo ribas. Production bundle neturi QA rakto ar laikrodžio override. Priėmimas naudoja tą pačią esamą isolated calendar QA namespace, o provider konfigūracija lyginama prieš / po.

Naujos partijos diegimo būsena fiksuojama tik pagal actual RECEIPT.json. Iki jo nėra completed deployment teiginio. Full platform backend šiuo straipsnių leidimu neaktyvinamas.
