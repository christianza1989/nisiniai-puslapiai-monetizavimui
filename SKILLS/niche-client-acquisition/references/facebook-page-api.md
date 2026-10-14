# Oficialus Facebook Page API vykdytojas

Naudoti tik savininko valdomam Page, kai užsakytas publikavimas per API. Asmeninio profilio ir grupių publikavimui šis vykdytojas netaikomas. Jų leidžiamus veiksmus vykdo [Computer Use tiltas](facebook-browser-worker.md). Tai du tos pačios paskyros koordinuojami transportai.

Vykdymo sutartis: [FACEBOOK_PAGE_API](../../../agent-business-core/FACEBOOK_PAGE_API.md). Paslaptys laikomos privačiame runtime faile; jų nerašyti į chat, prompt, DB, žurnalą, testų kvitus ar Git. Page ID gaunamas ir patvirtinamas per Graph, ne spėjamas iš Business Manager asset ID. Tokenas turi priklausyti konkrečiai programai ir Page, turėti veiksmui reikalingas teises bei galiojančią prieigą.

Turinį agentas pats peržiūri pagal savininko pavedimą. Užduotis saugo nekintamą tekstą, medijos SHA, nišos faktų/kontakto/instrukcijų kontekstą ir Page prieigą. Nėra atskiro žmogaus patvirtinimo kiekvienam įrašui. Gyvas siuntimas vis tiek reikalauja įjungtos bendros FB ir Page API politikos. Platformos arba hosto atmetimas nėra peržiūros eilė; jo neapeiti kitu transportu ar tiesioginiu DB pakeitimu.

Vienai užduočiai leidžiama viena Meta POST užklausa. Prieš ją DB patvariai pažymi siuntimą ir užrakina bendrą paskyrą. Atsakymo praradimas palieka `uncertain`; gautas ID su nepavykusia patikra palieka `accepted`. Abiem atvejais draudžiama pakartotinė publikacija. Žinomo ID `check` atlieka tik GET. Nežinomam rezultatui pirmiausia reikia patikrinti tikrą Page istoriją ir užrašyti įrodymą; paskyros užraktas nesensta savaime.

Komentaras leidžiamas tik po to Page įrašu, kurio autorių patvirtina Meta. Atsakymas papildomai tikrina konkretaus pirminio komentaro buvimą tame įraše; iki 300 ID, be raw teksto ar provider `next` URL sekimo. Nepasiekta priklausomybė sustabdo veiksmą, nėra leidimas komentuoti svetimą postą.

Pirminiai šaltiniai, patikrinti 2026-10-14: [Page įrašai](https://developers.facebook.com/documentation/pages-api/posts), [Page komentarai](https://developers.facebook.com/documentation/pages-api/comments-mentions), [nuotraukos](https://developers.facebook.com/docs/graph-api/reference/page/photos/). Naudojama v26.0. Mock patikra nėra tikras siuntimas; gyvam priėmimui būtinas tikras provider ID, GET autoriaus/teksto patvirtinimas ir matomas Page rezultatas.
