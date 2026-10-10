# Verslomatikos domenų katalogas

2026-10-10 savininkas paprašė dashboarde naudoti visą ankstesnį expired domenų sąrašą, esamą TOP 200, kategorijų filtrus ir nišai tinkamų domenų siūlymus. Šis modulis pateikia ribotą skaitymo sąsają. Registracija, klientų autorizacija ir maršrutų prijungimas priklauso pagrindiniam platformos integravimo darbui; dashboardą valdo Verslomatikos direktorius.

## Šaltiniai ir reikšmė

Inventoriuje yra **45 324** normalizuoti unikalūs domenai. **9 200** turi ankstesnį DI atrankos vertinimą, **278** priskirti kategorijai pagal aiškius pavadinimo žodžius, **35 846** lieka nesukategorizuoti. Nepakankamas arba kelioms kategorijoms tinkantis pavadinimas negauna išgalvotos nišos. Rodomos visos ankstesnės 36 kategorijos ir atskiras nesukategorizuotų domenų filtras.

TOP 200 autoritetas yra `domain-sorter/output/top200-research-20261001/selected/selection.json`, kaip nurodyta [ankstesnio tyrimo apraše](../domain-sorter/TOP200_RESEARCH.md). To paties katalogo aukščiau esantis juodraštis nenaudojamas. Duomenys yra istorinė atranka: dabartinis domenų prieinamumas, nuosavybė ir teisė juos naudoti **nepatikrinti**. Modulis nekviečia registratoriaus, neperka domenų ir nekeičia DNS.

Paketui atrinkti tik domenai, kategorijos, trumpi ankstesnės atrankos nišų ir raktažodžių įrašai, rizikos kodai, reitingai, balai ir jų datos. Pirminė SQLite, žali tekstai, kontaktai, ekonomikos formulės, HTML ir vietinių failų keliai neperkeliami. `metadata.source_documents` saugo tikslius importuotų failų pavadinimus ir SHA-256. Originalaus raw inventoriaus SHA išsaugotas kaip kilmės žyma; jo turinys neimportuojamas.

`inputs/domain-research-20261001/top200_su_dr.csv` turi 200 eilučių, bet tik **50** baigtų rinkos tyrimų ir **150** laukiančių tyrimo. Tyrimo balas nevadinamas pelno ar paklausos įrodymu. Git LF kopija yra 158 017 baitų, SHA `8e48e8a460487bc6853289c78f528cea77559eb24b632e6d14af0451106cdd1e`; ankstesnio perkėlimo manifestas registravo CRLF kopijos baitus, todėl šių dviejų failų baitų SHA netapatinami. Importas remiasi faktiniais skaitytos kopijos baitais.

Keli istoriniai reitingai saugomi atskirai:

| Laukas | Reikšmė |
| --- | --- |
| `source_index` | Vieta normalizuotame pilname inventoriuje |
| `queue_rank`, `queue_score` | Ankstesnė viso sąrašo tyrimo eilė ir pavadinimo heuristika |
| `screening_rank`, `screening_score` | Ankstesnio 9 200 domenų DI atrankos reitingas ir balas |
| `top200.research_priority` | Frozen `selected/selection.json` tyrimo eilė, įskaitant DR prioritetą |
| `top200.potential_priority` | To paties manifesto ankstesnė komercinio potencialo eilė |
| `top200.initial_selection_rank` | Manifesto `initial_research_priority` |
| `top200.research_source_priority` | Kopijuoto tyrimo CSV tyrimo prioritetas |
| `top200.research_source_initial_rank` | Kopijuoto tyrimo CSV pradinė atrankos vieta |
| `top200.research_score` | Baigto istorinio rinkos tyrimo balas arba `null` |

Šie laukai nesujungiami tyliai. Pavyzdžiui, `autoelektrikaivilniuje.lt` manifesto pradinė vieta yra 157, kopijuoto CSV – 37; potencialo vieta 76, dabartinio istorinio tyrimo eilės vieta 1. Ahrefs DR 18 patikrintas 2026-10-01, tai nėra šiandienos matavimas ar rekomendacija pirkti domeną.

## Python sąsaja

```python
from pinet_core.domain_catalogue import CatalogueError, DomainCatalogue

catalogue = DomainCatalogue.default()
catalogue.metadata()
catalogue.facets()
catalogue.get("autoelektrikaivilniuje.lt")
catalogue.search(query="anglų kalbos", category="education", top200_only=True,
                 offset=0, limit=50, sort="research_priority")
catalogue.recommend("mokytojas ir kalbos", category="education", limit=5)
```

`default()` vieną kartą įkelia paketui priklausantį `catalogue.json`, patikrina jo SHA, griežtą schemą, visas unikalias narystes ir reitingų pilnumą. Klientas negali nurodyti failo kelio. Grąžinamos kopijos neleidžia pakeisti atmintyje saugomo katalogo.

`search` rezultatas: `{catalogue_version:"domains.v1", snapshot_id, query, category, top200_only, sort, offset, limit, total, items:[DomainView]}`. `total` reiškia visus filtrą atitinkančius įrašus, ne vien esamą puslapį. `offset` ribojamas 0–100 000, `limit` – 1–100. `query` turi daugiausia 120 ženklų; ignoruojamas raidžių dydis ir lietuviški diakritiniai ženklai, visi užklausos žodžiai turi sutapti su domeno, ankstesnės nišos, raktažodžio ar kategorijos tekstu. Rikiavimas: `source`, `queue`, `screening`, `research_priority` arba `potential`. Numatytasis pirmiausia pateikia TOP 200 pagal išsaugotą tyrimo eilę, tada likusią ankstesnę atranką ir viso inventoriaus eilę.

`DomainView` laukai: `domain`, `category`, `category_label`, `classification_source`, `category_evidence`, `niche`, `keyword`, `risk`, `risk_label`, `source_index`, `queue_rank`, `queue_score`, `screening_rank`, `screening_score`, `screening_evaluated_at`, `top200`, `availability`, `availability_checked_at`. `top200` yra `null` arba lentelėje aprašyti reitingai ir `selection_value_heuristic`, `source_niche_key`, `potential_tier`, `ahrefs_dr`, `ahrefs_dr_checked_at`, `ahrefs_dr_source`, `research_evaluated_at`.

`classification_source` yra `source_ai_screening`, `lexical_inference` arba `unclassified`. DI atrankos kategorija taip pat yra interpretacija, o ne patvirtintas verslo faktas. Numanoma kategorija turi iki aštuonių ją nulėmusių žodžių; ji negauna DI balo, vertinimo datos ar išgalvotos nišos. `risk=none` reiškia „Specifinė rizika nepastebėta; patikra neatlikta“, o ne garantiją, kad teisinių ar prekės ženklo rizikų nėra.

`facets()` pateikia visus `{id,label,count,top200_count}` filtrus. Tai viso katalogo skaičiai, nepriklausomi nuo šiuo metu atliktos paieškos. `get()` priima vien DNS pavadinimą, atmeta URL, IP, el. paštą ir failo kelią; nerastas domenas grąžina `None`.

`recommend` rezultatas: `{catalogue_version,snapshot_id,niche,category,matched_categories,items:[{domain:DomainView,match_kind,matched_terms,reason}]}`. Niša privaloma, ribojama 120 ženklų, `limit` – 1–20. Pirmiausia vertinamas tikslus pavadinimo sutapimas, tada užklausos žodžiai ir kategorija; lygybę išsprendžia ankstesnė tyrimo eilė. `match_kind`: `exact_name`, `keyword` arba `category`. Tai deterministinė paieškos pagalba, nenaudojanti naujo mokamo modelio ar rinkos balo. Nesusijęs tekstas gali grąžinti tuščią rezultatą. DI verslo kūrėjas gali naudoti šį rezultatą kaip kandidatų sąrašą, tačiau prieš domeno naudojimą turi atskirai patikrinti prieinamumą ir teises.

Kiekvienas įrašas turi `availability:"unknown"` ir `availability_checked_at:null`. Dashboarde rodyti „Prieinamumas nepatikrintas“. Pasirinkti domeną reiškia užpildyti kūrimo užklausą; tai nėra registracija ar nuosavybės suteikimas.

`CatalogueError` turi tik saugų priežasties kodą. Tėvinio API adapteris neteisingus parametrus grąžina kaip 400, nepasiekiamą ar neteisingą paketo katalogą – kaip 503. Skaitymo maršrutui privaloma esama patikrinto kliento arba operatoriaus sesija; modulis pats neapeina autorizacijos. HTTP atsakymas turi būti `private,no-store`; klientas nesirenka įrankių, failų ar tinklo adresų.

## Atkuriamas importas ir priėmimas

Importas atliekamas neprijungus tinklo:

```text
python -m pinet_core.domain_catalogue.build --inventory <domenai_clean.txt> --queue <domenai_ai_eile.csv> --screening <domenai_reitingas.csv> --selection <selected/selection.json> --research <inputs/domain-research-20261001/top200_su_dr.csv> --snapshot-date 2026-10-10 --output <catalogue.json>
```

Visi keliai yra administratoriaus CLI argumentai, ne HTTP įvestis. `snapshot_date` nurodo importo kopijos datą; tai nėra domenų prieinamumo patikros data. Prieš įrašymą tikrinama tikra visų šaltinių narystė ir schema. Paketas išsaugo atskirus reitingus, nekeičia pirminių failų ir nenaudoja SQLite ar klientų duomenų. Toks pats įvesties rinkinys ir data turi sukurti identiškus baitus.

Pradinė offline patikra: 30 PASS / 1 FAIL. Vienas testas klaidingai manė, kad pilno inventoriaus paskutinės eilutės niekada nebuvo DI vertintos; vertinimas vyko pagal tyrimo eilę, ne inventoriaus tvarką. Pataisytas testas saugo teisingą reikalavimą: tik domenai be faktinio DI vertinimo neturi DI balo ar nišos. Duomenys ir jų istoriniai reitingai dėl šio testo nekito. Tolimesni patikros ir Git perdavimo kvitai fiksuojami atskirai.

Pirmas tikslių baitų pakartotinio importo bandymas taip pat FAIL: semantinis JSON ir `snapshot_id` sutapo, bet Windows tekstinis įrašymas pridėjo CRLF. Importeris pataisytas įrašyti tiesioginius UTF-8/LF baitus; pridėta perkėlimo regresija. Pirmo FAIL kvitas saugomas vietiniame `artifacts/domain-catalogue/first-rebuild-fail.json`, nepakeistas į PASS.

Galutinė modulio vietinė patikra: **32 offline testai PASS**, scoped Ruff PASS, visas pakartotinis importas iš penkių faktinių įvesties failų identiškais UTF-8/LF baitais PASS, exact staged saugos patikra be radinių. Kataloge 5 314 004 baitai, failo SHA `b1571269bb0cf664fe0b4e63639c49de0656312f0a1215c5dd4cf52b13493e7d`, semantinis snapshot `52c232970da67024ae1e3cca551a6fe19f6600f71452e2b572ac8a9989a811cb`. Tyrimo eilės nesutapimų su CSV yra 0, pradinių vietų skirtumų 196; abi reikšmės išsaugotos. Pavyzdinė šios kopijos education paieška rado 286 domenus per maždaug32ms, penkių rekomendacijų užklausa per maždaug19ms; tai vienas vietinis matavimas, ne apkrovos garantija.

`uv build --wheel` PASS: wheel turi modulio JSON su tais pačiais baitais. Iš wheel iškelto modulio atskiras procesas sėkmingai įkėlė visus45 324 domenus ir TOP 200 iš savo paketo, nepriklausydamas nuo pirminio `domain-sorter/output` katalogo. Vietiniai kvitai `artifacts/domain-catalogue/rebuild-acceptance.json` ir `wheel-install-acceptance.json` į Git nekeliami. Visos šio modulio parašytos kategorijų etiketės, paaiškinimai, rizikų pavadinimai ir notices perskaityti bei suredaguoti; faktinis desktop/mobile dashboardo tekstų ir išdėstymo patikrinimas lieka UI adapterio priėmimui.

Šio paketo bazė `db23aee6ea446574b582ab7b88bf49391d0e7404`, fetched private main `13c9649c76dd48cdf426604cb721e1ccd58a9854`, companion `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Issue [76](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/76), upgrade `upgrade-ff5c8b39-4eee-43ac-a999-d70297bbd8cd`. Modulio source priėmimas nesuteikia visos platformos UI, viešo paleidimo ar kliento verslo kūrimo priėmimo. Atšaukimas – tik šio naujo modulio scoped revert ir atskiro API adapterio montavimo atšaukimas.

## Kanoninė HTTP sutartis

Integravimo papildymas rezervuotas issue76 ir upgrade `upgrade-a4801c93-17db-4f65-9209-61326cafe24f`. `scripts/domain_catalogue_contract.py` generuoja [domains.v1 OpenAPI](contracts/verslomatika-domain-catalogue.openapi.json) iš tų pačių griežtų request/response modelių, kuriais tikrinamos faktinės katalogo išvestys. Ankstesnės operatoriaus ir customer.v1 sutartys nekinta.

- `GET /customer/v2/domains`: pirmiau aprašyti `query`, `category`, `top200_only`, `offset`, `limit`, `sort`; išvestis `SearchData`.
- `GET /customer/v2/domains/facets`: išvestis `{items:catalogue.facets(),metadata:catalogue.metadata()}`.
- `POST /customer/v2/domains/recommendations`: privalomas JSON `{niche,category,limit}`, `niche` 1–120 ženklų, `category` galiojantis kategorijos ID arba `null`, HTTP `limit` 1–10. Python helperis leidžia iki20, bet HTTP adapteris naudoja siauresnę sutarties ribą. Išvestis `RecommendationData`.

Visi trys maršrutai reikalauja tos pačios Bearer sesijos. Tėvinis adapteris tikrina faktinę patvirtintą kliento arba operatoriaus paskyrą ir vietinę aplinką. Envelope: `{contract_version:"domains.v1",environment:"local"|"test",source_revision:<SHA40>,observed_at:<UTC ISO>,request_id:<UUID>,data:<projection>}`. Sėkmingas atsakymas 200, `Cache-Control: private, no-store`; neteisinga ribota įvestis400, nėra sesijos401, neįjungtas vietinis modulis ar nepatvirtinta paskyra403, veiksmo limitas429, nepasiekiamas/netinkamas katalogas503. Generatorius nepaleidžia ir nemontuoja HTTP maršrutų.

Pirmas sutarties testų surinkimas FAIL dėl pytest rezervuoto parametro pavadinimo `request`; pakeistas testinio parametro pavadinimas, produkto ribos ir sutartis nesušvelnintos. Originalus bandymas išlieka darbo istorijoje. Sutarties baitų sutapimas, visų schemų `$ref`, trijų operacijų autentifikacija, tikrų helperio išvesčių validacija ir griežtos request ribos tikrinamos atskirai.

Galutinė papildymo patikra **39 offline testai PASS /14.43s**, scoped Ruff PASS. Sutartis generuojama tiesioginiais UTF-8/LF baitais; visi `$ref` išsprendžiami, nėra prarastų operacijų. Request modelis `RecommendationInput`, data modeliai `SearchData`, `FacetData`, `RecommendationData`; bendras `Envelope[T]` yra tas pats dokumentui ir API adapteriui. Katalogo snapshot ir jo source duomenys dėl sutarties papildymo nekito.
