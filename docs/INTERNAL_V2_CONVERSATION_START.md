# Vidinio V2 bandomojo pokalbio paleidimas

`POST /internal/sites/{site_id}/simulation/v2` leidžia patikrinti bendrą pokalbio ir žinių įrankių veikimą su jau suregistruotu verslu, esamu nišos profiliu ir užbaigtu V2 viešų žinių indeksu. Prieiga suteikiama tik serverio `worker_auth`; reikia `allow_simulation=true` ir `local`, `test` arba atskiros `test-*` aplinkos. Kelias neiškviečia modelio ar LiveKit.

Prašyme pateikiama tiksli serverio šaltinio nuoroda:

```json
{
  "request_id": "a8fe4d9f-926b-4a66-871e-a1ad67643a7b",
  "knowledge_ref": {
    "schema_version": 2,
    "knowledge_revision": 7,
    "knowledge_hash": "<tikras 64 simbolių aktyvaus indekso SHA-256>",
    "deployment_id": "<tikras indekso deployment_id>"
  },
  "notice_version": "<bandymo sutikimo versija>",
  "consent": true,
  "mode": "simulation",
  "remember": false
}
```

Tai dokumentacijos šablonas: vietą žyminčios reikšmės nepraeis tikro prašymo patikros. `knowledge_hash` yra aktyvaus `KnowledgeState.payload.hash` reikšmė, kuri neapima kintančio `generated_at`; ji skiriasi nuo pilno perdavimo kvito `content_hash`. Tikslus `knowledge_revision` būtinas ir atšaukus šaltinį: atšaukimas pakeičia versiją, nors turinio hash lieka tas pats.

Paleidimas paima bendrą verslo politikos užraktą, tada esamą žinių indekso užraktą. Tikrinami dabartinė versija, turinio hash, diegimo ID, užbaigto indekso kvitas, tikras turinys ir jo domenas, galiojimo laikas bei atskiras `source_ready` leidimas. Politikos sustabdymas ir visiškai atšauktas turinys neleidžia pradėti pokalbio. Neužbaigtas perdavimas, kito verslo indeksas, nepatvirtintas šaltinis arba pasenusi nuoroda taip pat atmetami.

Bendras `Conversation`, įvykių, įrenginio atminties ir įrankių kelias išlieka tas pats. Pokalbyje saugoma šaltinio nuoroda ir metaduomenys be puslapių tekstų. `knowledge.resolve` skaito dabartinį indeksą, todėl gali pasiekti daugiau nei 30 puslapių ir ilgo gido pabaigą, kartu taikydamas atšaukimus. Šaltinio tekstai nekopijuojami į modelio instrukcijas. Naujas turinio importas ar atšaukimas gali pakeisti įrankio atsakymą; ankstesnė pokalbio nuoroda nėra įrankio rezultatų talpykla. Atšaukus jau pokalbiui parodytą faktą, esama revokacijos eiga užbaigia tą pokalbį.

Šis paleidimas neimportuoja naujo turinio, nepratęsia indekso galiojimo, nesuteikia šaltinio leidimo ir neįjungia mokymosi. Esamas V1 `Start` ir jo API lieka atskiri, o V2 pakeitimas V1 projekcija toliau draudžiamas. Balsas, viešas klientų kanalas, paštas, komerciniai įrankiai ir tiekėjų veiksmai lieka savo patikrų apimtyje.

Savavališkai sukurtam naujam kliento verslui dar reikalingas patvarus kūrimo revizijos susiejimas su `Business` ir kliento prieigos teisėmis, patikrintas nišos profilis bei tikro viešo šaltinio leidimas. Priimtas privatus verslo juodraštis nėra toks šaltinis. Vidinio bandomojo pokalbio sėkmė nepatvirtina klientų kanalo veikimo, garso, laiškų pristatymo ar agento kalibravimo.

Atkuriami bandymai: `uv run pytest -q tests/test_conversation_v2_start.py tests/test_knowledge_index.py tests/test_knowledge.py tests/test_policy.py`. Jiems reikia esamos izoliuotos PostgreSQL testų konfigūracijos su ribotu RLS vaidmeniu; kiekvienas bendras `client` fixture naudoja savo atsitiktinę `test-*` aplinką. Bandymų metu modeliai, SMTP ir gyvi klientų kanalai nekviečiami.

2026-10-10 koordinuojantis agentas savo patvirtintu privačiu vykdymo adapteriu paleido šiuos keturis testų failus: 61 patikra PASS per 66,79 s, naudojant tikrą PostgreSQL ir ribotą RLS vaidmenį. Adapteris į atskirą procesą perdavė tik savo du DB URL ir šio agento izoliuoto šaltinio `PYTHONPATH`; kredencialai nebuvo nukopijuoti į šaltinį ar perduoti šiam agentui. Naudotos tik atsitiktinės sintetinės testų aplinkos, be mokamų modelių kvietimų. Šaltinis bandymo metu buvo užfiksuotas: bazė `2f07cf0c1357b88b2ed1a0c0e1248b79143fea08`, skaitymo modulio integracija `0d20f339b4a6304cb3ff33bc41aad1b8f5d14d36` ir atskira šio inkremento pataisa. Agentas savarankiškai taip pat paleido 12 DTO patikrų (PASS per 4,72 s), 22 skaitymo modulio patikras (PASS per 2,66 s), Ruff bei diff patikrą. Tai šio vidinio serverio kelio įrodymai; tikri kanalai ir klientų agentų priėmimas lieka atskiri.
