# Verslomatika kūrimas ir testavimas kitame PC

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

## Tikras konsultanto worker

Pradinis setup palieka `PINET_CHAT_ENABLED=false` ir `PINET_CHAT_RUNNER_ENABLED=false`. Viena realizuota capability — `business-planner` / `chat.consult`; kitos agentų rolės nėra sukuriamos katalogo tekstais. Konsultantas teikia planą, neturi tools ir nevykdo klientų sistemų pakeitimų. Katalogo availability aprašo serverio konfigūraciją; worker health yra `unknown`, o ne išgalvotas „online“.

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
