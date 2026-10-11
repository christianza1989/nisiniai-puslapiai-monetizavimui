# Perdavimo instrukcija Verslomatika.lt integruojančiam agentui

2026-10-10. Savininkas perduos Git nuorodas kitame kompiuteryje su Verslomatika.lt dirbančiam AI agentui. Šis dokumentas yra konkretus paruoštas pavedimas ir šaltinių kelias. Integracija šiame planavimo lange dar nevykdyta; kito kompiuterio, Verslomatika source ir deployment būklė nepatikrinta.

## 1. Repo ir šaka

- Privatus bendras projektas: [nisiniai-puslapiai-monetizavimui](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui). Jame yra `agent-business-core`, runtime ir visas šis planas. GitHub `/settings` nėra šaltinio ar integracijos adresas.
- Viešų svetainių core: [niche-public-core](https://github.com/christianza1989/niche-public-core). Jis aptarnauja viešas nišų svetaines; jo nereikia laikyti operatoriaus dashboardo ar pilnos apskaitos backend.
- Dabartinis perdavimo [PR59](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/59), head `codex/acquisition-core-20261009`. Šioje šakoje yra acquisition parengimas/dialogų lab ir Verslomatika planas. Plano pirmas commit `ae7cfba`; perdavimo instrukcija pridėta vėlesniu to paties PR commit. Integruojantis agentas privalo užfiksuoti jo perskaitytą **aktualų pilną SHA**.
- [Scope issue61](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/61) yra dokumentų planavimo darbas, ne runtime/UI įgyvendinimo rezervacija.

Iki PR merge į main vien repo `main` peržiūros nepakanka. GitHub galima iškart skaityti [plano README šakoje](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/blob/codex/acquisition-core-20261009/agent-business-core/verslomatika-plan/README.md). Privačiam repo reikalinga reali paskyros prieiga; jokių prisijungimų šiame dokumente nėra.

Naujai švariai core kopijai (esamos darbo kopijos nesugadinti):

```powershell
git clone https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui.git verslomatika-core-reference
cd verslomatika-core-reference
git fetch origin
git switch --detach origin/codex/acquisition-core-20261009
git rev-parse HEAD
```

Tai read reference kopija, ne bendro svetimo checkout rašymo leidimas. Jei PR jau merged, paimti naują `origin/main`, patikrinti, kad šie failai ir acquisition paketai yra toje versijoje, ir užfiksuoti naują SHA. Įgyvendinimui kurti savo šaką/worktree pagal aktualų AGENTS ir užregistruoti tikslius failus. Nenaudoti `reset --hard`, dirty checkout ar kito agento worktree perėmimo.

## 2. Skaitymo tvarka

Pirmiausia repo `AGENTS.md`, `START_HERE.md`, `WORKSTREAMS.md`, Git freshness ir platformos kontraktas. Tuomet šio katalogo [README](README.md) → [AUDIT](AUDIT.md) → [ARCHITECTURE](ARCHITECTURE.md) → [DIRECTOR_CHAT](DIRECTOR_CHAT.md) → [SCREENS](SCREENS.md) → [FINANCE](FINANCE.md) → [TOOLS](TOOLS.md) → [ROADMAP](ROADMAP.md). Atliktų dokumentų patikrų ribos [QA](../../docs/VERSLOMATIKA_PLAN_QA_2026-10-10.md).

Patikrinti faktinį Verslomatika repo frontend, auth, server, storage ir duomenų modelį. Šis planas nurodo core pasirinktą React/TS kryptį, bet jau esanti Verslomatika technologija šiame lange nebuvo matyta. Derinti ją per bendrus API/contracts; nekurti naujo konkuruojančio dashboardo ar keisti visą framework vien dėl plano rekomendacijos.

## 3. Kas jungiamasi dabar, kas dar turi būti sukurta

| Sritis | Actual dabartinis kontraktas | Integracijos sąlyga |
| --- | --- | --- |
| Health | Core `GET /health` | Pasiekiamumas nėra all-agent readiness; production adresas dar nepatvirtintas |
| Verslų/pašto peržiūra | `GET /operator/mail/sites`, `GET /operator/sites/{site_id}/mail`, `GET /operator/sites/{site_id}/mail/{message_id}`, scoped attachment endpoint | Dabartinis operator auth yra serverinis Bearer secret, ne galutinis klientų auth. Jungti tik per patikimą serverio adapterį su savo membership/tenant kontrolės sluoksniu |
| Policy/knowledge/onboarding/routing | Actual `/operator/sites/...` API iš [api.py](../runtime/src/pinet_core/api.py) | Skaityti konkretaus input/output ir revision schemas; nepriskirti esančiam test signalui live teisės |
| Agent registry/tasks/owner chat/reports | [Siūlomas operator/v2](ARCHITECTURE.md) | **PLANNED, endpointų nėra.** Reikia D1+D2 core įgyvendinimo. Frontend negali siųsti į aprašytą, bet neegzistuojančią route ir teigti „sujungta“ |
| Documents/accounting | Esamas invoice draft renderer; naujos accounting routes PLANNED | D6/D7. Nei PDF, nei placeholder JSON nėra oficiali išrašyta/booked invoice |
| Gyva acquisition | Lokalus parengimas + uždaras `.test` lab | Discovery/DB/outbox/scheduler/send/inbound/Madbeauty backend dar užbaigiami pagal D5 ir acquisition roadmap |

Browser negauna operator/worker/edge/secrets ar banko credentials. Per-business narystę nustato serveris; bendras operator secret pats nesuteikia klientams saugaus kelių savininkų produkto. Private core negali būti tiesiog proxy su bet kokiu browser atsiųstu site ID.

## 4. Pirmas konkretus integracijos paketas

**D1+D2**: sutarti versijuotą shared schema/OpenAPI, įgyvendinti core scope/auth/agent registry/generic jobs bei owner thread/report tools ir prijungti vieną realų Verslomatika UI kelią. Shared scope/schema rašymo langas užregistruojamas prieš pakeitimus; kitų sesijų runtime, kanalų ir schema WIP neperrašomi.

Pirmas vertikalus kontraktas: leistinas business list → agent list/detail → owner message → async request/task ID → report/task status → result/evidence. Testas per actual local/staging API su dviem izoliuotais verslais ir bent vienu realiu struktūruotu Codex atsakymu. Role stub leidžiama tik izoliuotame fixture adapteryje; tai ne live agentas. Prie schema/version nesuderinamumo — aiški unavailable būsena ir jokio tylaus fallback į fake success.

Core komanda pateikia schema/version/capability endpoint ir test harness; Verslomatika UI komanda naudoja generated types arba vieną canonical schema, ne dvi ranka iš naujo rašytas API sutartis. Failų owners ir PR dependencies konkrečios. Neaiškus faktinis front/backend ID mapping išsprendžiamas discovery/migration, o ne naujais nesusietais customer duomenimis.

## 5. Kopijuojamas pavedimas kitam agentui

> Prijunk mano Verslomatika.lt valdymo platformą prie bendro agent-business-core. Verslomatika valdys visus mūsų verslus ir jų esamus bei būsimus agentus. Kiekvieną agentą turiu galėti pasirinkti, su juo kalbėtis kaip direktorius, duoti užduotis ir gauti tikrais duomenimis pagrįstas ataskaitas. Matyti darbus, veiklą, išsiųstus laiškus, atsakymus, dokumentus, rezultatus, išlaidas ir išimtis. Apskaita turi būti organizuota pagal juridinį asmenį, su sutikrintu paketu tikram buhalteriui.
>
> Šaltiniai: privatus christianza1989/nisiniai-puslapiai-monetizavimui, PR59/head codex/acquisition-core-20261009 (ar nauja main po merge), katalogas agent-business-core/verslomatika-plan. Viešų svetainių adapterio repo christianza1989/niche-public-core. Užfiksuok perskaitytas pilnas SHA, perskaityk AGENTS/WORKSTREAMS/Git freshness ir visą planą. Patikrink mano faktinį Verslomatika kodą. PLANNED operator/v2 endpointai dar neegzistuoja; visas acquisition pipeline ir accounting dar nepriimti.
>
> Pradėk nuo D1+D2 ir parodyk pilną tikrą vietinį UI→API→agentas→užduotis→ataskaita→veiklos/result kelią. Įgyvendink bendrą registry/generic durable runtime, owner chat ir report kontraktą, pernaudok esamas funkcijas, integruok į esamą Verslomatika programą. Rezervuok savo tikslius source failus ir dirbk savo worktree/branch. Nekeisk kitų agentų darbų. Nauji agentų tipai turi veikti bendrame sąraše/chat/report be hardcoded atskiro dashboardo.
>
> Patikrink dvi organizacijas ir du verslus, svetimos gijos/failo atmetimą, runtime restart, duplicate task, stale lease, trūkstamų duomenų unknown ir dashboard/chat metrikų sutapimą. Testinius duomenis atskirk pagal DEMO_DATA_POLICY. Pristatyk source/schema versijas, faktinius testus, UI keliones ir konkrečias likusias priklausomybes. Nei instrukcijų failas, nei fixture, nei jungiklis nėra gyvo agento įrodymas. Tikras SMTP/paid provider calls/finansinių įrašų/deployment aktyvavimas vykdomas atskiru tikru mandatu.

## 6. Perdavimo priėmimas

Kitam agentui užtenka Git repo/PR nuorodų ir šio pavedimo, jei jis turi realią private repo prieigą. Lokalaus Windows absoliutaus kelio jam nereikia. Prieš main sujungimą tikrinti PR statusą ir head; po merge/adoption — faktinę jo runtime/host versiją. Kito kompiuterio instrukcijų ar įdiegtos CLI aplinkos statuso šiame plane netvirtiname.
