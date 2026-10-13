# Verslomatikos perdavimas kitam kompiuteriui

Tęsti tą patį Verslomatikos platformos pavedimą naujame PC. **Dabartinis prioritetas yra visos darbo erdvės UI/UX įgyvendinimas pagal paruoštą planą; tik po jo priėmimo tęsti tikrus modelių pipeline bandymus ir pokalbių kalibravimą.** Platforma dar neužbaigta. Vien source perdavimas, draft PR ar sena testų suma nėra naujo PC paleidimo priėmimas.

## Pirmiausia perskaityti

1. Repo AGENTS.md, docs/MULTI_MACHINE.md, docs/CODEX_GIT_WORKFLOW.md, docs/GITHUB.md ir aktualų WORKSTREAMS.md po tikro fetch.
2. [Pilnas darbo erdvės UI/UX planas](../VERSLOMATIKA_WORKSPACE_UI_UX_PLAN.md) ir [produkto kontekstas](../../sites/verslomatika/PRODUCT.md).
3. [Discovery sutartis ir būsena](../VERSLOMATIKA_BUSINESS_DISCOVERY.md), [atsakymo išsaugojimo QA](../VERSLOMATIKA_DISCOVERY_RESPONSE_RECOVERY_QA_2026-10-13.md), [svetainės statymo tęsinys](../VERSLOMATIKA_SITE_BUILD_CONTINUATION.md) ir jo QA.
4. PLATFORM_BUILD_CONTRACT.md, CORE_IMPROVEMENT.md, SKILLS/PROJECT_CONTRACT.md bei kanoninis SKILLS/impeccable/SKILL.md su PROJECT_ADAPTATION.md. Esama kalibracija: SKILLS/business-agent-calibration/SKILL.md. Nekurti naujo evaluator/scorer/corpus.
5. Portalo repo docs/runbooks/frontend-next-pc.md, docs/handoffs/customer-discovery-build-ui.md ir docs/runbooks/customer-discovery-local.md. Naudoti naujausią jo Git šaltinį; senų aktyvių procesų ar privačių failų nekopijuoti.

## Git šaltiniai

Visi trys repo privatūs; naujame PC reikia savininko GitHub prieigos. Reikalingi nesujungti checkpoint yra darbo šakose, todėl vien default main clone viso tęsinio neturi. Main savavališkai nejungti.

| Repo ir gretimo katalogo vardas | Tęsinio šaka | Patikrintas checkpoint |
| --- | --- | --- |
| christianza1989/nisiniai-puslapiai-monetizavimui → nisiniai_puslapiai_monetizavimui | codex/verslomatika-workspace-ux-plan-20261013 | UI planas6bfdbe5711e82c983ea02f1e58c8b719c5374e6d; imti šios šakos naujausią handoff commit. Funkcinis recovery9030e0289d00317ca6426e689b9f3e70015f151b. |
| christianza1989/niche-public-core → dovanos-memorycasting | codex/customer-editorial-helper-20261011 | 5924a2eb858cf45e736bc5e79a2f07cfbbc39af2 |
| christianza1989/verslomatika → verslomatika.lt | codex/customer-discovery-ui | Patikrintas nuotolinis HEAD41e8a020f88e1ed7c9f908df233bb6618d053768 su frontend-next-pc runbook; recovery funkcinis7d08707c1b11178249dc2976e34b266848f6f2d6. |

Core stacked draft PR117–120 saugo discovery, agentų foundation vartą, initial-content tęsinį ir atsakymo recovery. PR121 saugo UI/UX planą ir šį perdavimą. Portalo draft PR66 saugo UI/BFF source. Companion šaka jau pushed. Commit/main merge/kitame PC adoption yra atskiri dalykai.

## Naujo PC paruošimas

Pavyzdinė nauja bendra direktorija yra pinet-workspace; seni Lenovo absoliutūs keliai nėra reikalavimas. Jei checkout jau turi darbų, jo neperrašyti, naudoti atskirą naują direktoriją.

```powershell
mkdir pinet-workspace
cd pinet-workspace
git clone --branch codex/verslomatika-workspace-ux-plan-20261013 https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui.git nisiniai_puslapiai_monetizavimui
git clone --branch codex/customer-editorial-helper-20261011 https://github.com/christianza1989/niche-public-core.git dovanos-memorycasting
git clone --branch codex/customer-discovery-ui https://github.com/christianza1989/verslomatika.git verslomatika.lt
cd nisiniai_puslapiai_monetizavimui
node scripts/git-freshness.mjs --repo . --companion ../dovanos-memorycasting --phase start
```

Prieš keitimą kiekvienas agentas susikuria nuosavą darbo šaką/worktree iš šio tęsinio ir sėkmingai patikrina fetched main protėvį. Jei main pasikeitęs ir gate nepraeina, išsaugoti checkpoint ir integruoti current main tik į savo šaką, spręsti konfliktus bei skaityti atnaujintas sutartis. Neresetinti kito agento failų ir neforce-pushinti main.

Priklausomybės: Git/GitHub, Node22.22+ ir npm; backendui Python3.13+, uv, Docker/PostgreSQL. Naujo PC Codex/CLI prisijungimas atliekamas tame PC, ne kopijuojant seno profilio failus. Repo bootstrap ir skills įdiegti pagal MULTI_MACHINE, tada perkrauti/new session kaip nurodyta ten.

```powershell
node scripts/install-agent-git-bootstrap.mjs
node SKILLS/scripts/install-core-skills.mjs
npm ci --prefix content-studio
npm --prefix ../dovanos-memorycasting run install:ci
cd agent-business-core/runtime
uv sync --locked
uv run python scripts/setup_local.py
docker compose up -d postgres
uv run alembic upgrade head
```

Tai sukuria naują vietinę aplinką su naujais privačiais credentials; neperkelia senos DB ir nepradeda modelių/kanalų worker. UI etapui realūs modeliai nereikalingi. API konfigūraciją ir clean source preflight parengti pagal runtime docs; naujas source pin yra tikras to PC Git HEAD. Prieš runtime naudojimą išlaikyti vietinį režimą, language-review=false, site-build/live kanalų ir modelių hold. Nekeisti istorinių fingerprint ar originalių bandymų kvitų.

Portalo priklausomybes įdiegti švariai verslomatika.lt/web kataloge. Node_modules ir Next build katalogai per Git neperkelti; juos naujame PC reikia sukurti. Įprastas source build yra npm run build -- --webpack, o izoliuoto discovery preview BuildDir ir loopback helper pateikti portalo runbook. Frontend18870 API→3025 preview portai yra vietinio bandymo pavyzdys, ne viešo paleidimo konfigūracija. Jei naujo PC helper neveikia, taisyti portable priežastį savo scope, nekopijuoti seno PC junction/credentials ir neapeiti automatinės veiksmų peržiūros bloko.

Minimalūs portalo konfigūracijos KEY pavadinimai: CORE_PORTAL_MODE, CORE_CUSTOMER_MODE, CORE_API_BASE_URL, VERSLOMATIKA_BUILD_DIR. Portable start helper nustato šias loopback reikšmes; pradinis discovery UI nereikalauja modelio rakto frontend'e. Naujo PC modelio autentifikacija, local DB ir core admission lieka backend dalimi. Nė vieno private value kopijuoti nereikia. Nauja normali kliento paskyra ir jos tikra naujos bazės prieiga priimamos atskirai.

## Kur sustojome

**UI planas paruoštas, naujas trijų sričių workspace dar neįgyvendintas.** Jo esmė: verslo pasirinkimas ir to verslo skiltys/pokalbiai kairėje, vienas pagrindinis komandos pokalbis centre, išskleidžiama dešinė sritis Veikla/Planas/Rezultatai/Patikros. Visa informacija neturi būti viename ilgame scrolinamame puslapyje. Designer bei agentų kūrimas išlieka tikro foundation ir modulio teisių priklausomybe.

Šiame sename PC: core API18870 funkcinis9030e028, UI3025 vis dar ankstesnis A06 build. Portalo N9 recovery build yra sukompiliuotas, bet neadopted; naujas workspace nepradėtas. Naujame PC nė vieno iš šių procesų nėra. Native code/media/editorial/renderer/source/Profile/istorijos/Xbot patikros turi atskirus ankstesnius kvitus; nekartoti jų be naujo gedimo ar source pokyčio vien pažangai imituoti.

Tikras minimalus naujo kliento discovery bandymas pats skaitė13 tiekėjo šaltinių, bet iškart sukūrė didelį planą be savininko išteklių/vaidmens klausimų. Per du peržiūros ratus buvo5 successful outputs ir paskutinis coordinator transport FAIL. Originali užklausa liko failed/revision0, klientas negavo atsakymo. Tai nepagražintas FAIL; modelių usage ir privačių originals istorija palikti sename PC, digest ir minimizuota išvada yra QA dokumente.

Recovery pataisa išsaugo validuotą kandidatą po peržiūros klaidos kaip failed, nebuildable ataskaitą su visais session/source/deadline/lease/archive vartais. Instrukcijos išskiria svarbius neištiriamus savininko sprendimus.14 susijusių PG atvejų ir Ruff PASS; **naujo realaus modelio elgesio pagerėjimas dar nepatikrintas**, nes savininkas pakeitė prioritetą į UI/UX. Originalaus FAIL atgaline data nepildyti ir counters nenulinti.

Discovery pokalbis/ataskaita/explicit build veikia source lygiu. Pilnas funkcinės svetainės controller, katalogas/palyginimas/local inquiry, media/editorial/renderer/SEO-GEO foundation ir vėlesni Designer/agents vartai dar OPEN. Vien Registration ar private draft nesuteikia foundation READY. customer-agents.v1 ir esama kalibravimo sistema jau yra: jų nedubliuoti.

## Pagrindinė ir pagalbinė sesija

Savininkas tiesiogiai paprašė, kad nauja pagrindinė sesija sukurtų **vieną atskirą pagalbinę Codex sesiją tame naujame PC** ir pasiskirstytų darbus. Tai yra šio perdavimo dalis; naujo helper dabar sename PC nekurti.

- Pagrindinė sesija valdo visą UI/UX planą ir frontend workspace: shell, navigacija, pokalbis, dešinė sritis, modulių ekranai, dizaino sistema ir desktop/mobile priėmimas.
- Pagalbinė sesija valdo sutartą atskirą esamų core duomenų adapterių/teisių/būsenų integracijos bei tikslinių regresijų sritį. Ji neperdaro pagrindinės sesijos layout/CSS ir nestato antro core ar kalibravimo framework.
- Pradžioje susitarti tikslius failų sąrašus, sąsajas ir darbo tvarką per issue66/WORKSTREAMS. Kiekvienai rašančiai sesijai nuosava šaka ir darbo kopija. Shared schema/BFF/root stiliai turi vieną paskirtą rašytoją.
- Nauja sesija naudoja list_projects/create_thread, kai tokie app tools prieinami; nekopijuoja senų thread IDs kaip naujų užduočių. Kuria vieną helper, palieka vartotojo numatytą modelį ir nesiunčia vienodos didelės istorijos visiems agentams. Jei naujame PC šių tools nėra, tiksliai įvardyti ribą ir tęsti pagrindinės sesijos įvykdomą darbą.
- Savininko kopijuojamas promptas žemiau tiesiogiai autorizuoja darbines žinutes tarp šių dviejų naujų sesijų. Trečiųjų šalių laiškai, scheduler, papildomų nesusijusių sesijų ar live kanalų įjungimas tuo neautorizuojami.
- Pagalbinė sesija dirba su savu worktree prieš bet kokį rašymą; pradiniame shared checkout failų neredaguoja. Root integruoja tik scoped įrodytas pataisas į savo šaką ir PR; ne jungia main be review.

## Kas per Git neperkeliama

Codex pokalbių istorija/profilis, auth/password/token/keys, .env, browser cookies, runtime/klientų DB, private modelių traces/learning releases, studijos data/output/tmp, node_modules ir compiled local build katalogai nepatenka į šį source perdavimą. Senos tikros paskyros/history naujame PC nėra vien dėl clone. Naujoje aplinkoje reikia naujo scoped bandymo arba atskiro savininko patvirtinto privataus duomenų perkėlimo; nieko iš šio sąrašo nekelti į Git/issue/screenshot.

Visas mokymai/Spaorio ir kitų bandymų originalus senas PC saugo; naujos tuščios bazės nenavadinti tų pačių originalų pratęsimu ar jų apskaitos atstatymu. Git sutartys, kodas, saugūs dokumentai ir esami sintetiniai tests yra perduoti šakomis.

## Ribos ir pirmas kitas darbas

Scheduler PAUSED. Nauji realūs generavimo/kalibravimo kvietimai sustabdyti iki UI/UX etapo; Supabase, kalbos-only blokavimas/Gemini, Madbeauty laiškų/inbox apdorojimas, SMTP/voice/social, tiekėjų/klientų kontaktavimas, viešas tunnel/DNS/deployment ir domenų pirkimas nejungiami. Naudoti tik loopback ir vietinį PostgreSQL; modelių/paid research biudžeto neišgalvoti. Nežinomos prekybos/nuotraukų teisės, kainos, garantijos ir domenų nuosavybė lieka nežinomos.

Pirmas įvykdomas darbas: patikrinti Git/freshness ir parengti savo darbo kopijas, perskaityti UI planą, sukurti vieną helper, rezervuoti failus ir įgyvendinti **vientisą workspace struktūrą su esamu pokalbio/planų duomenų keliu**. Atskirai priimti įprastą desktop/mobile/keyboard/klaidos/history kelią. Tada pagal savininko etapą atnaujinti tikrus modelių bandymus ir taisyti faktinius kalibravimo radinius. Nepradėti naujo verslo, evaluator ar corpus ir nekurti vėl tų pačių jau esančių backend modulių.

Naujos sesijos promptas: [VERSLOMATIKA_NEW_SESSION_PROMPT.txt](VERSLOMATIKA_NEW_SESSION_PROMPT.txt).
