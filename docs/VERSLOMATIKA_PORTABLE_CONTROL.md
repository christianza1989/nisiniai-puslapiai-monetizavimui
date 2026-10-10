# Verslomatika kūrimas ir testavimas kitame PC

Final compact source regression216PASS/7opt-inSKIP20.88s ir nepriklausoma peržiūra be likusių P0–P2. BusinessFinding240 ribos patikrintos tiek provider schemoje, tiek hydration; senų saugomų tekstų ir GUIDE profilis nepakitę. Ankstesnis212-run žemiau yra tarpinė patikra, actual naujo formato provider/targetPC sėkmė dar nepatvirtinta.

Naujas verslo kritiko vidinis compact output nekeičia target DB/schema18 ar portalo HTTP sutarties. Perkelti tą patį švarų source; prieš kitą darbą creation preflight turi rodyti naują visos komandos instruction hash. Native GUIDE pilnos peržiūros schema/policy/hash ir jo CLI profilis išlieka tiksliai nepakitę. Source212offlinePASS/7opt-inSKIP yra suderinamumo patikra, ne tikro kito PC ar modelio priėmimas. Paskutinis actual074 job80cdde99 patvirtino katalogo klaidos pašalinimą, bet kritikas vis tiek nutrūko `max_output_tokens`;32charged/noaccepted/intake0. Naujo formato provider sėkmė ir visas perkėlimas lieka nepatikrinti.

Verslo review vykdytojas kartu su source turi `runtime/config/creation-review-models.json` ir jo fiksuotą SHA. Nepakeistą source-owned katalogą parenka adapteris; owner config/auth/cache nekopijuojami. Naujo PC creation preflight patikrina ir katalogą prieš pirmą rezervaciją. Tiksliai įdiegtos CLI0.156.1 production-argument loopback patikra su tuščiu auth katalogu7PASS; actual kito PC autentifikacija ir verslo rezultatas dar nepatikrinti. [Katalogo kilmė ir ribos](../agent-business-core/runtime/config/CREATION_REVIEW_MODELS.md).

Dabartinis source parengimas apima0017 kliento profilio admission ir additive0018 verslo peržiūros modelio CHECK. Naujas target PC vykdo `alembic upgrade head`, ne seną0016 komandą. Verslo kūrėjas, konsultacija ir native GUIDE naudoja Luna; tik verslo kritikas ir koordinatorius fiksuotai naudoja Sol. Prieš Sol rezervaciją portalas turi perimti tikslų atnaujintą team kontraktą. Tikras kito PC modelio veikimas, hosted ryšys ir kliento pipeline priėmimas lieka atskiros patikros. Jau esančios Sol istorijos downgrade į0017 atmetamas; grąžinant vykdymą į Luna reikia išlaikyti jos skaitymo suderinamumą.

2026-10-10 aktualus savininko sprendimas: dar kuriame ir testuojame, tęsiame su PostgreSQL be Supabase. Paruošti kitam PC; viešo paleidimo dabar nėra. Šis dokumentas yra paleidimo eiga, ne jau atlikto perkėlimo ar hosted priėmimo pažyma.

## Kas perkeliama

Kodas ir kontraktai perkeliami per atskiras peržiūrėtas Git šakas / PR. Naujos pataisos dar nėra `main` kol merger jų nepriėmė. Pradžia — [MULTI_MACHINE](MULTI_MACHINE.md) ir [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md). Abiejų core repo naujausias main turi būti patikrintas `git-freshness.mjs`; portalui jo atskiras Git procesas. Nekopijuoti šio PC `.env`, Codex prisijungimo failų, DB dump, testinių klientų ar private task istorijos į Git / viešą paketą.

Kitame PC reikalingi Git, Node pagal bendrą core reikalavimą, Python3.13+, uv ir Docker Desktop/Engine. PostgreSQL17 image ir Python `uv.lock` versijos prisegtos source. Portalo priklausomybės prisegtos jo lockfile. Codex savininkas prisijungia tame PC atskirai; jo autentifikacija automatiškai nepersikelia.

## Nauja izoliuota vietinė bazė

Po peržiūrėtų pataisų gavimo turėti gretimus `nisiniai_puslapiai_monetizavimui` ir `dovanos-memorycasting` checkout. Core šakos šaknis:

```powershell
node scripts/git-freshness.mjs --phase start --companion ../dovanos-memorycasting
cd agent-business-core/runtime
uv sync --frozen
uv run python scripts/control_local_setup.py --public-core ../../../dovanos-memorycasting --name pinet-dashboard-local --db-port 15438 --api-port 8854
docker compose --project-name pinet-dashboard-local --env-file .env -f artifacts/control-local/compose.private.yaml up -d --wait
uv run python scripts/bootstrap.py --role-only
uv run alembic upgrade head
uv run python scripts/bootstrap.py
uv run python scripts/control_bootstrap.py --manifest artifacts/control-local/operator-manifest.private.json --allow-new-businesses
uv run python scripts/control_portable.py check
uv run python scripts/control_portable.py api --port 8854
```

Setup nieko neperrašo: egzistuojanti `.env` ar privatūs setup failai sustabdo. Jei portai užimti, pasirinkti laisvus `--db-port` / `--api-port`, naudoti tuos pačius portalui ir API startui. Serveris klausosi tik `127.0.0.1`, nepripažįsta proxy headers; DB portas taip pat tik loopback. API naudoja atskirą ribotą RLS rolę, ne admin URL. Source turi būti švarus ir HEAD sutapti su `PINET_CONTROL_SOURCE_REVISION`. Atnaujinus kodą, prieš naują procesą patikrinti Git, sustabdyti tik savo procesą ir sąmoningai pakeisti private source pin į ištestuotą commit.

Windows sistemoje apriboti `.env` ir `artifacts/control-local` teises savo paskyrai, pvz. `icacls .env /inheritance:r /grant:r "${env:USERNAME}:(F)"`. Linux/Mac naudoti `chmod600 .env` ir privatus katalogas700. Slaptažodis yra `artifacts/control-local/credentials.private.json`; jo nerodyti ekrano įraše ar Git. Manifestas registruoja source metaduomenis, o ne domenų nuosavybės, gyvo runtime ar verslo rodiklių patvirtinimą. Nauja bazė neturi senų pokalbių ir testinių organizacijų. Seno DB backup/restore yra atskiras private operatoriaus veiksmas, ne šio setup automatinė dalis.

Portalo savininko paruoštas vietinis BFF turi jungtis į `http://127.0.0.1:8854`, dirbti vietiniu režimu ir klausytis loopback. Jo konkreti paleidimo instrukcija saugoma portalo repo. Prisijungus tikrinti: savo portfolio → verslas → katalogas → užduotis → jos istorija / ataskaita → reload → logout. Kito verslo / organizacijos UUID ir atšaukta sesija nesuteikia prieigos.

## Vietinės klientų paskyros ir viešų projektų katalogas

P3/P4 prideda migraciją0012 ir bendros tapatybės klientų paskyras. Po `alembic upgrade head`, švaraus source patikros ir private source pin atnaujinimo sąmoningai įjungti tik vietiniam bandymui:

```text
PINET_CUSTOMER_ENABLED=true
PINET_CUSTOMER_PORTAL_ORIGIN=http://127.0.0.1:3017
PINET_CUSTOMER_OUTBOX_DIRECTORY=artifacts/customer-outbox
PINET_PUBLIC_PROJECTS_ENABLED=true
PINET_CHAT_ENABLED=false
PINET_CHAT_RUNNER_ENABLED=false
```

Portalas ir BFF turi naudoti tą patį exact loopback origin bei core portą. Šiame PC naujas P3/P4 core yra8855, portalas3017; setup kitame PC leidžia pasirinkti kitus laisvus portus. Kitame PC bazė pradeda be testinių paskyrų, intakes ir viešų projektų. Registracija → private outbox nuoroda → el. pašto patvirtinimas → atskiras login → tuščias portfolio → verslo užklausa → atkūrimas → sena sesija401. Vien domeno įvedimas nesuteikia esamo verslo teisių. Atkūrimo ir patvirtinimo raw token nenurodyti žurnale, URL query, API atsakyme, ekrano įraše ar Git; nuorodos fragmentą portalas pašalina ir veiksmą atlieka same-origin POST.

`artifacts/customer-outbox` yra privati vietinė pranešimų saugykla, ne pristatymas į inbox. Taikyti tokias pačias OS teises kaip `.env`; katalogas turi likti runtime `artifacts` viduje. Neperkelti jo į public assets. Storage gedimas grąžina503 ir paskyros pakeitimo transakcija atšaukiama.

Admin procedūra nėra klientui prieinama HTTP funkcija. Privatus JSON `draft` įvesties failas turi `project`, `evidence`, timezone turintį `publish_at`; `approve` — `slug` ir exact dabartinį `expected_revision`; `revoke` — `slug`. `intake-decision` turi `intake_id`, `approve`, peržiūrėtą `note`, private `evidence_reference` ir tik patvirtinant explicit esamo registruoto `business_id`. Būtina local/test administracinė jungtis. Paleisti vieną pasirinktą veiksmą:

```powershell
uv run python scripts/customer_public_admin.py draft --input artifacts/private-review/draft.json
uv run python scripts/customer_public_admin.py approve --input artifacts/private-review/approve.json
uv run python scripts/customer_public_admin.py revoke --input artifacts/private-review/revoke.json
uv run python scripts/customer_public_admin.py intake-decision --input artifacts/private-review/intake-decision.json
```

Tai atskirų veiksmų pavyzdžiai, ne visų keturių iš eilės vykdymo nurodymas. Materialus projekto pakeitimas panaikina ankstesnį approval; public skaitymas grąžina tik patvirtintą, jau publikuotiną, neatšauktą reviziją. Viešo katalogo įrašas neperima private portfolio/grants ir nesuteikia automatizacijos veikimo įrodymo. AI verslo kūrimo vykdytojas nėra šio P3/P4 setup dalis. [Faktiniai bandymai ir ribos](VERSLOMATIKA_CUSTOMER_PUBLIC.md).

## Trijų agentų verslo kūrimas ir native GUIDE

Vėlesnis savininko pavedimas išplečia P3/P4 iki kliento idėjos, kūrėjo/kritiko/koordinatoriaus darbo, peržiūros ir pataisytos versijos. [Kūrimo eiga ir faktiniai bandymai](VERSLOMATIKA_CUSTOMER_CREATION.md), [trijų rolių patikra](VERSLOMATIKA_CREATION_REVIEW.md), [native GUIDE rašymas](VERSLOMATIKA_CONTENT_WORK.md), [pasiruošimo vartai](VERSLOMATIKA_AGENT_PREPARATION.md). Šios papildomos dalys turi būti gautos toje pačioje peržiūrėtoje source šakoje; vien P3/P4 setup jų nesukuria. Source PR nėra kito PC ar viešo paleidimo priėmimas.

Iš core repo šaknies įdiegti prisegtas studijos priklausomybes `npm ci --prefix content-studio`. Native intake turi rasti gretimo `dovanos-memorycasting/config/niche-network.json`; bendro viešo rendererio pataisas ir jų priėmimą tikrinti atskirai pagal jo PR. Toliau vykdyti aukščiau pateiktą restricted-role → `alembic upgrade head` → canonical bootstrap eigą. Dabartinis kūrimo source turi0013creation,0014team,0015GUIDE ir0016 kliento verslo registracijos migracijas. Registracijos source integruotas ir patikrintas atskiroje sintetinėje PostgreSQL bazėje; tai nėra veikiančios kliento bazės ar target PC migracijos priėmimas. Admin-only provision/revoke eiga ir jos neprijungti profile/source/channel vartai aprašyti [registracijos dokumente](../agent-business-core/runtime/docs/CUSTOMER_CREATION_REGISTRATION.md). Naują tik skaitymo [pasirengimo V2 kontraktą](VERSLOMATIKA_AGENT_PREPARATION.md) portal priima atskirai pagal exact source ir READY; seno V1 reader iš karto nekeisti.

Privati target PC konfigūracija, kai pasirinktas konkretus autorizuotas ribotas bandymas:

```text
PINET_CUSTOMER_ENABLED=true
PINET_CREATION_ENABLED=true
PINET_CREATION_RUNNER_ENABLED=true
PINET_CREATION_WORKSPACE=<esamas absolute katalogas runtime/artifacts viduje>
PINET_CREATION_RUNNER_SECONDS=300
PINET_CREATION_DAILY_LIMIT=0
PINET_CREATION_GLOBAL_DAILY_LIMIT=0
PINET_CREATION_WEB_SEARCH_ENABLED=true
PINET_CHAT_MODEL=gpt-6-luna
PINET_CHAT_CODEX_EXECUTABLE=<patikrintas absolute executable tame PC>
PINET_CHAT_CODEX_SHA256=<tikras executable 64hex>
PINET_CHAT_ENABLED=false
PINET_CHAT_RUNNER_ENABLED=false
```

Savininkas2026-10-10 aiškiai pašalino dirbtinį dienos testinių kvietimų limitą.0 išjungia atitinkamas dienos lubas; teigiamą reikšmę pasirinkus jos lieka taikomos. Kūrimui ir GUIDE galioja ta pati konfigūracija be ankstesnių20/100 maksimumų, išlaikant30..300s vieno vykdymo terminą. Ankstesni legacy/team/GUIDE vykdymai lieka bendroje apskaitoje ir po nesėkmės; ji nenulinama ir neperkeliama į kitą aplinką ar DB. Esama private `.env` reikšmė turi būti aiškiai atnaujinta: vien naujas source default nepakeičia anksčiau įrašyto20.

Kai source švarus, private pin sutampa su HEAD ir API/portal origin sutampa, runtime kataloge:

```powershell
uv run python scripts/control_portable.py check
uv run python scripts/customer_creation_worker.py check
uv run python scripts/customer_content_work_worker.py check
```

Šios patikros tikrina tapatybės/RLS/source/binary/instrukcijų ribas ir nekviečia modelio. Po kliento UI užklausos atskirame savo terminale paleisti tik pasirinktą vieno darbo komandą:

```powershell
uv run python scripts/customer_creation_worker.py once
```

Priėmus tikslią dabartinę verslo reviziją ir patikrinus jos native intake, klientas gali parengti vieno GUIDE užduotį; tik jai paleisti `uv run python scripts/customer_content_work_worker.py once`. Abiejų komandų `worker` režimas yra aiškiai paleidžiamas tęstinis vykdytojas, ne instaliuojama tarnyba. Shared mutex ir dienos apskaita galioja abiem. Keisti source tik tarp darbų ir sąmoningai sustabdyti savo procesus; senas gyvas darbas instrukcijų pats neatnaujina.

Target PC priėmimo kelias: nauja testinė kliento paskyra → private patvirtinimo nuoroda → login → atskira verslo idėja → tikri trijų rolių kvitai → priimtas juodraštis/peržiūra → kliento kritika → nauja priimta revizija → vienas pilnai parašytas ir peržiūrėtas native GUIDE. Kiekvieno originalo nesėkmė, modelis/instrukcijų hash, usage ir tikslus source išsaugomi. Tai nepatvirtina viešos medijos/editorial/release/SEO-GEO/kontaktų/paklausos ir paleidimo vartų. Dabartinis NEW `mokymai-ai.lt` vis dar neturi priimtos revizijos; kitame PC šio rezultato neišgalvoti.

## Tikras konsultanto worker

Pradinis setup palieka `PINET_CHAT_ENABLED=false` ir `PINET_CHAT_RUNNER_ENABLED=false`. Sustabdytas executor neblokuoja savo istorijos, įvykių ir ataskaitų skaitymo ar queued task atšaukimo; sesija ir aktualūs grants lieka būtini. Viena realizuota capability — `business-planner` / `chat.consult`; kitos agentų rolės nėra sukuriamos katalogo tekstais. Konsultantas teikia planą, neturi tools ir nevykdo klientų sistemų pakeitimų. Katalogo availability aprašo serverio konfigūraciją; worker health yra `unknown`, o ne išgalvotas „online“.

Target PC patikrinti Codex versiją, oficialaus paketo integrity ir faktinio executable SHA256. Ankstesnis vietinis priėmimas naudojo side-by-side CLI0.156.1, gpt-6-luna / medium; global0.139 netiko. To nepakanka kito PC actual priėmimui. Faktinio absolute executable ir SHA256 bei privataus tuščio workspace kelias įrašomi tik jo `.env`:

```text
PINET_CHAT_ENABLED=true
PINET_CHAT_RUNNER_ENABLED=true
PINET_CHAT_OPERATOR_USER_ID=<user_id iš private bootstrap receipt>
PINET_CHAT_CODEX_EXECUTABLE=<tikras absolute executable tame PC>
PINET_CHAT_CODEX_SHA256=<tikras 64hex>
PINET_CHAT_WORKSPACE=<privatus absolute katalogas>
PINET_CHAT_MODEL=gpt-6-luna
PINET_CHAT_DAILY_LIMIT=20
PINET_CHAT_RUNNER_SECONDS=120
```

Po API restart ir savininko login atskirame terminale:

```powershell
uv run python scripts/control_portable.py worker
```

Preflight nieko neklausia modelio, tikrina source, rolę, RLS, savininko registraciją/sesiją ir binary pin. Provider užklausa įvyksta tik paėmus konkrečią leistiną užduotį. Paleisti vieną patikrintą worker. Atšaukimas, logout, narystės panaikinimas, source pin pakeitimas ir lease expiry neleidžia vėlyvo rezultato įrašyti. Nutrauktas provider vykdymas automatiškai nekartojamas. Actual token usage saugomas kai pateiktas; neišmatuota kaina lieka `null`.

## Paruošta būsimo hosted ryšio sąsaja

Dabar nekurti viešo tunnel, Vercel env ar deployment. Būsimam hosted režimui naudoti **tik** `pinet_core.control_api:app` / `control_portable.py api`, kuris nemontuoja legacy balso/pašto/FB/operator API ar viešų docs. Core fixed backend Host `control.pinet.internal`, loopback transportas ir `PINET_CONTROL_MODE=hosted`; production aplinka, atskiras server-only `PINET_CONTROL_BRIDGE_SECRET`≥32 ir `PINET_CONTROL_OWNER_USER_ID` būtini. Core bootstrap kol kas local-only; production owner/DB duomenų migracija dar nepriimta, todėl šis hosted paruošimas nėra įjungimo komanda.

Portalas turi fixed HTTPS backend URL, exact HTTPS portal origin, Secure/HttpOnly/SameSite session cookie ir server-only bridge secret. Kiekvienos HTTP užklausos naujas lowercase UUID nonce, Unix timestamp ir lowercase HMAC-SHA256. `X-Pinet-Control-Timestamp`, `X-Pinet-Control-Nonce`, `X-Pinet-Control-Signature`. UTF8 kanoninė žinutė, newline tarp eilučių ir be paskutinio newline:

```text
pinet-control-bridge-v1
<timestamp>
<nonce>
<UPPERCASE method>
<exact encoded path + optional encoded query>
<SHA256 exact body bytes; empty bytes for no body>
```

Core priima tik45s laikrodžio langą ir patvariai užregistruoja nonce90s prieš veiksmą. Replay409, netinkamas host/origin/signature403; HMAC nesuteikia aktoriaus teisių: tikra core sesija ir aktuali narystė/grants tikrinami atskirai. Origin/Forwarded/X-Forwarded headers į core neperduodami. Privatūs error details neskelbiami. Actual TLS, restarto atkūrimas, target PC, produkcinė duomenų izoliacija, provider ir hosted naršyklės kelias lieka atskiri būsimo paleidimo vartai.

## Supabase vėliau

Esamas PostgreSQL, SQLAlchemy, Alembic ir RLS lieka dabartinis testavimo backend. Supabase CLI nereikalingas šiai eigai. Jei vėliau pasirinksime managed PostgreSQL, reikės ištestuoto restricted-role/private-schema/TLS adapterio ir migracijos bei backup/restore. Vien URL pakeitimas ar CLI buvimas neįrodo tokio priėmimo. Supabase Auth naudotinas tik po atskiro identity adapterio, ne kaip antras nesusietas dashboard login. Duomenų bazės hostingas nepakeičia Python API ir Codex worker.

Oficialios galimybių ribos: [PostgreSQL jungtys](https://supabase.com/docs/guides/database/connecting-to-postgres), [Edge Functions runtime](https://supabase.com/docs/guides/functions). Realus Supabase projektas, jo prieigos ir migracija šiame etape nekurti/nepatikrinti.
