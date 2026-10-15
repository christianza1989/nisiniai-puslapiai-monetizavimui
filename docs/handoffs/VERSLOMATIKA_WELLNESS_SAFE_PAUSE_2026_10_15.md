# Kubilų verslo kūrimas — saugus tęstinumo taškas

2026-10-15 savininkas pakeitė darbų eiliškumą: pirmiausia kuriamas visas įdomus, animuotas Verslomatikos homepage, įvertinant ir integruojant pasirinktą [REA projektą](https://github.com/morluto/rea). Po šio etapo grįžtama prie verslo kūrimo platformoje. **Kubilų verslo mokami bandymai palikti pauzėje.** Šis įrašas jų neatnaujina. REA šiame taške dar neatsisiųstas ir neintegruotas; nurodytas būsimam darbui, o ne kaip veikianti galimybė.

## Kur tiksliai sustojome

Užduotis: pats Verslomatikos koordinatorius turi iš originalių savininko žinučių ištirti kubilų, saunų ir mobiliųjų pirčių prekybos galimybes Europoje, parengti planą, o vėliau koordinuoti svetainės ir agentų komandos kūrimą. Savininkas pasirinko Maudis.lt tik kaip galimą pirmą gamintoją. Partnerystė, eksporto sąlygos, marža ir nuotraukų naudojimo teisės nepatvirtintos. Iš pradžių numatytas privatus pristatymo pavyzdys, po to galimas bendradarbiavimo pasiūlymas. Kelios gamintojų svetainės svarstomos tik atsiradus paklausai. Gamintojui ir potencialiems pirkėjams nerašyta.

Svarbi savininko pataisa: verslo tyrimą turi atlikti **platforma**, ne ši Codex sesija vietoje jos. Ankstesnis rankinis tyrimas `sites/wellness-export/` išsaugotas tik kaip atskiras palyginimo etalonas. Jo išvadų, kainų ar laukiamo atsakymo į modelio įvestį neimportuoti.

| Įrašas | Išsaugota būsena |
| --- | --- |
| Tikras platformos pokalbis | `e2436912-d0de-4267-9514-cb2fcc56f056` |
| Atvėrimas šiame PC | <http://127.0.0.1:3030/dashboard/kurti-versla/idejos/e2436912-d0de-4267-9514-cb2fcc56f056> |
| Pirmas Job | `3efc499e-89ee-4fb8-96d2-edcc87631993`, source `0f28432fd8fba136fb370b6443a58a28450a00b1` |
| Pirmas atsakymas | Išsaugota 1 redakcija: `needs_input`, `plan=null`; trys klausimai apie biudžetą, laiką ir komercinį vaidmenį. Kūrėjas baigė per63,81946s; kritikas ir koordinatorius nepradėti. Prašytas tyrimas nebuvo atliktas. |
| Antras Job | `854e8351-a7a9-4623-b910-b2fb9a567073`, source `c1b3a72373b3adc5a881d9c65167180bdf90b1ae` |
| Antras rezultatas | Tas pats originalus tekstas išsiųstas per įprastą UI;13 pirminio skaitytuvo įrašų ir6 CLI web veiksmai; `run_timeout` po409,172013s. Naujo plano / redakcijos nesukurta. |
| Dabartinis tęsinio pagrindas | Pokalbio būsena `failed`, `base_revision=1`; originalus pirmas atsakymas ir abu bandymai išsaugoti. Kubilų Creation, svetainės ar agentų priėmimo dar nėra. |

Antro bandymo promptas139435B, kontekstas104932B; paskutinė stdout veikla ties153,2103s. Pradinio bandymo promptas37752B. Didelis kontekstas yra pagrįsta kita hipotezė, bet vien jo dydžio sumažinimas dar neįrodė timeout priežasties ar sėkmės.

## Kas pataisyta ir kas dar nepritaikyta

- **S28 šaltinių perdavimas** integruotas Root šakoje ir dabartiniame API: tik konkretaus patvirtinto reporto tikro Job šaltiniai perduodami Creation/native intake kaip `external_source_claims`, `UNVERIFIED`. Faktai, kontaktai ir operatorius automatiškai nepatvirtinami. Tikra atskiros restricted SQL bazės / worker / native intake patikra5PASS49,47s; senos klaidos išsaugotos.
- **S29** pataisė nuorodas su lietuviškomis kabutėmis ir tyrimą prieš pasirenkamus savininko klausimus. Vietiniame naujame paleidime įjungta ribota web paieška. Vėlesnė nedidelė raw apostrophe URL pataisa yra Root šakoje, bet dar ne aktyviame nekintamame `c1b3a7` API. Galutinės URL ir esamos Discovery patikros34PASS1,52s / Ruff PASS. [S29 įrodymai ir ribos](../decisions/VERSLOMATIKA_DISCOVERY_RESEARCH_FIRST_2026_10_15.md).
- **S30 paruoštas, bet Root dar NEintegruotas ir actual API NEpritaikytas.** Imti funkcinį commit **`9012bc0af562dbc071a6374917666e86caf4ec45`**, kurio tėvas `c1b3a72373b3adc5a881d9c65167180bdf90b1ae`. Pagalbininko [draft PR161](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/161) galva `113a112e61a2f785cd97ed55e3635a5cf1135d12` papildomai turi tik Git sujungimo / perdavimo metaduomenis. Integruojant į Root pakanka funkcinio9012 commit; WORKSTREAMS pridėjimus išsaugoti abu.

S30 keičia tik `business_discovery/adapter.py` ir naują `source_projection.py`, taip pat savo testus / taisyklę / žurnalą. Modeliui siunčiamas ribotas šaltinių vaizdas, originalus capture ir S28 perdavimas neliečiami. Visos trys rolės fiksuoja projekcijos versiją bei SHA; trumpinimas ir neperskaityti URL aiškūs. Tikras privatus matavimas:95920B→22374B, visi13 puslapių atstovaujami;37 unikalios, tikrai stebėtos, dar neatstovautos nuorodos vietoje pasikartojančios navigacijos. Originalūs tekstai išsaugoti. Apskaičiuotas bendras promptas apie66538B yra **išvestinis įvertis, ne naujas mokamas bandymas**. Pagalbininko583PASS7SKIP22,35s, įskaitant27 naujus atvejus, Ruff ir scoped upgrade coverage PASS. Praleisti testai nėra PASS; sėkmingo modelio plano tai dar neįrodo.

## Repo ir vietinės peržiūros

| Paskirtis | Vieta / versija prieš šį dokumentavimo commit |
| --- | --- |
| Root darbas | `C:/Users/Lenovo/.codex/worktrees/verslomatika-ui-coordinator/CORE_SHARED`, `codex/verslomatika-workspace-ui-coordination-20261013`, `b907d0812711a3877c2815eba9b455f9adba1808`; pushed, draft PR123 |
| Aktyvus nekintamas API šaltinis | `C:/Users/Lenovo/.codex/worktrees/discovery-research-first/CORE_SHARED`, `c1b3a72373b3adc5a881d9c65167180bdf90b1ae`, API18871 |
| Paruošta, dar nenaudojama compact vieta | `C:/Users/Lenovo/.codex/worktrees/discovery-research-compact/CORE_SHARED`, `codex/verslomatika-discovery-compact-serving-20261015`, `b907d0812711a3877c2815eba9b455f9adba1808`; dependencies įdiegtos, S30 dar nėra, API iš jos nepaleistas |
| Pagalbininko S30 | `C:/Users/Lenovo/.codex/worktrees/discovery-source-projection/CORE_SHARED`, clean `113a112e61a2f785cd97ed55e3635a5cf1135d12` |
| Portalas | `C:/Users/Lenovo/Documents/verslomatika-workspace-ui`, clean `ad1fc64a004ac7cb79d4e5868e4dd0489f403b41`; UI3030 compiled source `d84100b8d4e141935806be516d6d87768078b38e`, build `ph3oE7XuXrCn4bHw01NIB` |
| Viešas companion | `C:/Users/Lenovo/.codex/worktrees/verslomatika-native-inquiry/dovanos-memorycasting`, `1a26f289092cecadc5799de898e809dc1769498a` |
| Patikrinti main šiame dokumentavimo darbe | private `808581d919d06cb4a2d151cc7f9ec1be1782aba2`, public `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; continue fetch PASS2026-10-15T10:14Z |

Šio checkpointo metu tikrai klausė loopback18871,3030,4319 ir3038. Iš prižiūrimo privataus controllerio atlikta **read-only IDLE** patikra: schema `0041_workspace_agent_episode`,84 lentelės, nėra queued/running darbų jo tikrinamose eilėse, provider_calls=0. Tai nėra pažadas, kad procesai išliks po perkrovimo. PID / seno exec session numerio nenaudoti kaip būsimos teisės stabdyti procesą: pirmiau iš naujo nustatyti jo tapatybę ir eilės būseną.

**Stabilus duomenų savininkas — nearchivuoti ir neperkelti:**

`C:/Users/Lenovo/.codex/worktrees/verslomatika-high-created-page/CORE_SHARED/agent-business-core/runtime/artifacts`

Senas baldų sintetinis bandymas `d29a3a1c-5609-46d2-b5b4-f7511e70b8e0` su9 puslapiais yra kita byla. Jo patvirtinto plano, turinio ar faktų nenaudoti kubilų verslui. Jo originalūs paketai, medija ir istorija išsaugoti.

## Privatūs atkūrimo įrodymai šiame PC

Root `agent-business-core/runtime/artifacts/workspace-ui/` (ignored, ne Git):

- `wellness-coordinator-original-brief.private.txt` — tikslus abiejuose bandymuose naudotas savininko tekstas.
- `wellness-coordinator-baseline-result.private.txt`, `wellness-coordinator-s29-timeout.private.txt` — faktinė UI būsena.
- `wellness-coordinator-s29-readonly-proof.private.json` — patvirtina2 Jobs, identišką žinutę ir nepakeistą pirmo reporto atsakymą; SHA `e4c54287dd26ae8568b6f2860f72e84e001106a4a55af9501157881facd7fe78`.
- `wellness-coordinator-s29-primary-sources.private.json` — originalus antro bandymo capture; jo ar rankinio tyrimo nepadaryti išgalvotu patvirtintu atsakymu.
- `ordinary-ui-discovery-research-adoption.private.py` / `ordinary-ui-discovery-research-state.private.json` — dabartinio c1b API paleidimo ir išsaugotos DB kopijos kvitai.
- `ordinary-ui-discovery-compact-adoption.private.py` — paruoštas vėlesniam naujos švarios versijos pritaikymui; **prepare/start dar nevykdyti**, compact state / naujas backup dar nesukurti. Controlleris išlaiko3 rolių rezervo patikrą ir ankstesnes ribas.

Abiejų CLI bandymų originalūs `execution.private.json`, `failure.private.json`, `trace.private.jsonl` ir išvestys yra atitinkamuose nekintamuose API checkout `runtime/artifacts/pipeline-ui-cli/`. Pirmo katalogas `discovery-creator-804b8453-2d3f-4105-af91-d807a4e146b1`, antro `discovery-creator-048decc7-ff94-4320-aa81-809e68e709a1`. Slaptažodžiai, sesijos, DB prisijungimai ir raw įrodymai į Git / chat nekopijuojami.

## Kaip tęsti PO homepage etapo

1. Savininkui grąžinus verslo kūrimo etapą, atlikti paired freshness ir patikrinti faktines naujas versijas. Perimti tik savo branch/worktree; neperrašyti svetimų checkout.
2. Integruoti S30 funkcinį9012 į aktualią Root šaką, išsaugant S29 URL / instrukcijų pataisas ir homepage darbus. Peržiūrėti actual taisykles / adapterį, atlikti tik prasmingą bendros integracijos regresiją, upgrade coverage ir safety. Nepaleisti dar vieno seno139KB prompto.
3. Paruoštą compact checkout atnaujinti iki priimto pilno SHA ir užfiksuoti švarią nekintamą versiją. Prieš vietinio API pritaikymą: IDLE, naujas backup, esamų84 lentelių / originalios0032 bazės išsaugojimas, provider-free preflight; modeliai / kvotos / autoriteto vartai išlieka.
4. Naudoti tą patį `local_sol61_high_v1` / `gpt-6.1-sol` High visoms rolėms. Vietinės ribos: daily36/global34/job3, web6, creator420s/reviewer90s/job600s, vienas testinis aktorius; finansinė suma UNVERIFIED. Jokių aklų kvotų / laiko ribų kėlimų.
5. Prireikus atnaujinti tos pačios testinės paskyros prisijungimo sesiją UI. Tame pačiame pokalbyje išsiųsti **tą patį originalų tekstą**, base_revision1, vieną naują įprastą užklausą. Tai bus pirmas actual S30 bandymas; dabar jis dar nepradėtas.
6. Išsaugoti tikrą naują atsakymą, dvi nepriklausomas peržiūras, šaltinius, laiką ir usage. Tada lyginti su atskiru rankiniu tyrimu: faktų kilmė, komercinės sąlygos, nežinomybės, įgyvendinamas modelis / ekonomika, tinkami pirkėjai ir kanalai, svetainės / komandos planas. Nepainioti teksto ilgio ar techninio PASS su gera verslo analize.
7. Jei rezultatas geras, tęsti aptarimą ir konkrečios redakcijos aiškų patvirtinimą → esamą Creation / native / media / Foundation kelią → esamą agentų kalibravimą. Jei nepavyksta, išsaugoti pirmą klaidą ir taisyti bendrą priežastį; neįrašyti Codex atsakymo rankomis į platformą. Publikavimas, partnerio pasiūlymas ir klientų kontaktavimas lieka atskiri etapai.

## Dabartinis homepage etapas

Savininko paprašyti septyni originalūs animacinio stiliaus juodais kostiumais vilkintys personažai ir interaktyvi hero kompozicija yra `design/agent-avatars/black-suit-v1/`. Koncepcija <http://127.0.0.1:3038/hero-concept.html>; septyni tikri1254px PNG su alpha ir manifestu išsaugoti. Tai vaizdinė koncepcija, ne visų septynių rolių aktyvavimas ar visas užbaigtas homepage. Homepage darbai neturi panaikinti šio verslo bandymo, originalių įrodymų ar S30 pataisos.

REA etapas turi prasidėti actual repo / dokumentacijos / priklausomybių ir integracijos ribų patikra. Toliau naudojamas tas pats core; svetainių tyrimo ir dizaino idėjų įrankis nėra leidimas perimti svetimus patvirtintus faktus, ženklus ar medijos teises. Jokio antro kūrimo / kalibravimo variklio. Šiame checkpointo pavedime REA kodas nevykdytas.
