# Šviežias privataus konteksto pradžios patikros taškas

Issue66, upgrade `upgrade-51e2d1b2-a4ec-466c-8069-42f0ac8774eb`. Atskiras Source57 pagrindu sukurtas worktree; bazė `57a2e6857352c22f84422f8d67d1c8a68d7bba5f`, companion `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Root valdo tikrą PostgreSQL, serving ir UI; šis paketas tikrinamas offline.

## Išsaugotas pradinis elgesys

Prieš keičiant production failus atlikta:

- Naujas `test_private_parent_checkpoint.py`: **1 FAIL, 1 PASS**, 5,72 s. Karšto `private_preview.current` kelio tikras fixture Tx operacijų skaičius **6** (`scalar`3, `execute`2, `refresh`1); naujas 3 užklausų limitas teisingai nepraeina. Log SHA-256 `2f676670109f379107ae1f36bbca8b04b63900844b8977fe6e2a188b094dd937`.
- Ta pati pilna kanoninio Python grafo fixture: **166 Tx operacijos** (`scalar`103, `execute`23, `refresh`20, `get`20), **10 private-current checkpoint kvietimų**, dvi material fazės ir vienas native status kvietimas. Tai fake SQL ribų skaičiavimas, ne PostgreSQL matavimas.
- Esami `test_current_actor_observation.py`, `test_authority_observation.py`, `test_foundation_actor_checkpoint.py`, `test_retained_anchor_observation.py`: **141 PASS**, 18,31 s. Log SHA-256 `48411c63b6bd96505ed53e0432b9c89f2229f27bd7a668bdf9a63924a3abb630`.
- Root pateikto tikro Source57 trace metaduomenų peržiūra: visos 86 `Authority.verify` patikros tame pačiame taske turėjo po 10 `private_preview.current` ir `capture` kvietimų; 70 patikrų rodė 188 SQL, 14 – 194, 2 – 193. Įdėtų wrapper SQL skaičiai nesumuojami. Šie skaičiai nepakeičia atskiro 166 operacijų offline baseline.

Testams naudojamos esamos bendro QA interpreterio bibliotekos, bet `PYTHONPATH` nurodo tik šio worktree `runtime/src`; pytest įkelia tik savo `tests` pagalbinius modulius. Nekraunama operatoriaus `.env` ar DB konfigūracija, neįjungiami DB, native Node, modeliai ar serving.

## Pakeitimo riba

Tik aktyvaus vienos `Authority` invokacijos `Observation` privataus current/capture kelio pradžios skaitymai jungiami į naują RLS užklausą. Kiekvienas iš dešimties kvietimų turi savo šviežią SQL; baigtas leidimas ar parent snapshot nesaugomas fazės cache. P, S6 ir dabartinė U sesija nesutapatinamos. Esami entry/final/native, source ir cancellation/cross-task vartai lieka.

Standalone bei admission capture ir S6 keliai išlaiko esamą eigą. Non-lock actor SQL bei klaidų prioritetas turi vieną bendrą builder/validator šaltinį; lock=True šaka nekeičiama. Archive schema tikrinama tuo pačiu predikatu, o archyvo lentelė skaitoma tik tada, kai leidžia ankstesnė schema ir parent/status patikrų tvarka. Receipt ir material/source/continuity validacija nesusiaurinama. Pulse, TTL, cadence ir Node kodas neliečiami.

## Galutinė realizacija ir offline patikra

Vienas naujas SELECT grąžina šviežius actor ORM objektus, visas Creation kolonas kaip scalar Bundle ir tą patį archive schemos predikatą. `SimpleNamespace` saugo tik P sesijos lookup raktą; leidimą kiekvieną kartą tikrina tas pats canonical actor SQL builder ir row validator. Actor objektams taikomas `populate_existing`. Creation scalar duomenys taikomi per `set_committed_value` tik buvusio refresh vietoje, po originalios `Phase.actor` post-await binding patikros; merge, add ir commit tam nenaudojami. LEFT JOIN all-NULL Bundle vertinamas pagal jo ID, ne Row truthiness. Trūkstamas parent paliekamas originaliam refresh atsisakymui. Standalone, admission ir S6 default keliai nekeičiami.

Papildomas portfolio palyginimas buvo būtinas: pirmas ORM Creation JOIN per anksti atnaujino caller objektą ir grąžino 503 vietoje originalaus `current=False`. Originalių Source57 `capture/current` funkcijų offline AST replay: **1 PASS**, 2,25 s, vienas pytest importų warning; log SHA `5315dca3b097aee872fdd1571035448441dd832d3ae01f8b54f16ac8398e9171`. Pirmas naujas variantas: **1 FAIL**, 5,14 s, log SHA `813859fab3db49368ae1430fc085cc9bf7ba8747e4592d79f64121511b772b2e`. Scalar Bundle ir atidėtas visų Creation kolonų pritaikymas išsaugo originalų False rezultatą bei atskirą in-memory portfolio pasikeitimo post-fence atsisakymą. Guardas neišmestas. Reference replay importavo savo worktree runtime ir tik tikslias Source57 funkcijų definicijas; Root runtime ar DB nebuvo naudojami.

Po šios pataisos:

- Karštas `P.current`: **6→3** SQL ribos (`execute`2, `scalar`1). Antras kvietimas vėl atlieka tris šviežias užklausas.
- Ta pati pilna offline fixture: **166→136** Tx operacijos; lieka **10** private checkpoint kvietimų, **2** material fazės ir **1** native status kvietimas. −30 operacijų yra šios fixture matavimas. Realiojo PG 188→158 projekcija dar nepatikrinta.
- **30 fokusuotų PASS**, 6,11 s, log SHA `32e25f1884327f78ae13db9bf47c4261a5b8739abc5d1c68e1349882c8a4ce1d`: actor401 prieš owner404 ir parent refresh, paslėptas parent, all-NULL Bundle, schema absent short-circuit, P sesijos user/env/revocation/clock, visi Creation scalar laukai bei švari jų ORM atributų istorija, portfolio DB ir in-memory skirtumas, cancellation/cross-task.
- Galutinė **402 PASS, 1 aiškiai deselected**, 22,28 s Python regresija. Vienintelis deselected – esamas tikras Python→Node observer smoke, kurio šis helper pavedimas nevykdo. Log SHA `83cc4c777717874b0f1983a6cbb57342ad4bfb5a5200b9bfa1dfb4cae38d03ed`. Tai apima actor/Authority/Foundation/retained/private recovery/continuity/live-preview pulse/inspection/cadence ir business-discovery/registration kelius.

Tarpinės nesėkmės išsaugotos žurnale: pradinis 6 vietoje 3, seno fake SQL result formos neatitikimas, optional pilno Source57 snapshot importo kolekcijos klaida dėl trūkstamo instruction resource ir aukščiau parodytas portfolio atsisakymo skirtumas. Jos nepavadintos PASS. Galutiniai lint, scoped source coverage, safety ir freshness kvitai pridedami žurnalo įvykiuose.

Šis source paketas neįrodo 3 sekundžių stabilumo, actual PostgreSQL, UI ar serving adoption. Root atskirai integruoja ir matuoja; jo Sharp/importo paketas turi kitą šaltinį ir įrodymus. Istoriniai Source57, DB ir native bylos nekeičiami.
