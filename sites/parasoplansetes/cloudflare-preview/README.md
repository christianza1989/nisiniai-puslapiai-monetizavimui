# StepOver peržiūra Cloudflare be domeno

Savininkas 2026-10-09 aiškiai pavedė įkelti svetainę kol kas be domeno. Tai viešas laikinas `workers.dev` adresas su `noindex`, ne galutinis parasoplansetes.lt / SEO paleidimo priėmimas. Domeno / WordPress / 301 / Search Console ir SMTP priėmimo būsenos nesikeičia.

## Tikslas ir ribos

- Paskyra: `1c0a7407abfb959d5ff46540f5f7009d`, esama `Info@azprekyba.lt's Account`.
- Worker ir atskira D1: `parasoplansetes-preview`; jokio kito Worker ar DB perrašymo.
- Tik patvirtintas native paketas SHA `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b` / public source `7761a29a0464e6ed0544b17567cd68539df89109`.
- Adapteris įleidžia tik konfigūruotą peržiūros host. Bendras rendereris toliau tikrina publikavimo laiką, medijos tinkamumą, maršrutus ir užklausas. Originalios approved JSON versijos nekeičiamos.
- Kiekvienas atsakymas turi `X-Robots-Tag: noindex, nofollow` ir `private, no-store`; robots disallow all. Canonical / schemos išlaiko tikrą pagrindinį domeną. Tos pačios svetainės HTTP redirects grįžta į peržiūros host.
- Mail, voice išjungti. Forma gali saugoti užklausą tik savo D1; SMTP pristatymo nežada. Mokami planai ir periodiniai mokami kvietimai neaktyvuojami.

## Faktinė būklė 2026-10-09 08:37 UTC

**REMOTE NOT_DEPLOYED / AUTHENTICATION_REQUIRED.** Cloudflare connector skaitymo operacijos veikia: account, Workers ir D1 sąrašai. Workers ir D1 sąrašai buvo tušti. `GET workers/subdomain` grąžino 10007: paskyra dar neturi workers.dev subdomain. Bandymas registruoti `pinet-azprekyba` ir bandymas sukurti `parasoplansetes-preview` EU D1 abu grąžino `10000: Authentication error`. Nė viena užklausa nepranešė apie sukurtą išteklių. Naršyklė buvo neprisijungusi, CLI whoami taip pat neprisijungęs. PC Full access suteikia vietinius leidimus, bet nėra Cloudflare account autentifikacija.

Paruošti source adapteris, griežtas prepare helperis, 4 regresijos ir realaus runtime tikrintuvas. Project-local Wrangler 4.92.0 deploy dry-run exit0: 127 papildomi ES modules, total upload2543.50KiB / gzip679.43KiB; asset inventory perskaitytas. Tai paketavimo, ne remote įkėlimo įrodymas.

Tikras local Worker su šiuo adapteriu, savo state ir išjungtu SMTP: 19 puslapių200, 20 media200, canonical teisingi, noindex; 3 vidiniai / API maršrutai404, robots disallow, svetima Origin forma403. `self-audit/cloudflare-preview-local-20261009.json` turi 44 HTTP checks / PASS ir `remoteDeploymentProven=false`. D1 local forma su same-preview Origin gavo200, grąžino tikrą „išsaugota / el. pašto nepavyko perduoti“ tekstą. Patvirtintas sintetinės užklausos ID `4a34410c-3aec-4820-a8d3-70bdf9abf386`, site_id parasoplansetes, source_path /kontaktai, status new. Tik vietinė izoliuota DB; SMTP/INBOX PASS nėra.

Atvertas įprastas Wrangler OAuth prisijungimas su CLI leidžiamais `account:read`, `user:read`, `workers_scripts:write`, `d1:write`; Wrangler papildomai įtraukia offline_access. Savininkas pats prisijungia ir užbaigia autorizaciją. Jokių slaptažodžių / token į Git ar chat; OAuth URL ir PKCE nėra dokumentuojami. Pirmas sėkmingai pradėtas browser=false flow pasibaigė laukdamas callback. Savininkui pranešus apie prisijungimą, CLI whoami vis dar rodė unauthenticated; naujas flow atvertas numatytojoje naršyklėje, nes IAB išlaikė neprisijungusią sesiją. Agentui native / numatytoji naršyklė nėra prijungta, todėl jos Allow paspaudimas nėra atliktas per agento valdymą.

## Vykdymas, kai autentifikacija veikia

1. Iš companion root `node node_modules/wrangler/bin/wrangler.js whoami`; patikrinti numatytą paskyrą ir rašymo galimybę. Core freshness gate abiem repo prieš naują reikšmingą batch.
2. Paskyroje sukurti / patikrinti workers.dev subdomain. Sukurti tik dedikuotą `parasoplansetes-preview` D1 EU; tikslų UUID išsaugoti vietinėje konfigūracijoje. Nepririšti placeholder ar svetimos DB.
3. Iš private root nustatyti task env `PARASOPLANSETES_PREVIEW_HOST=parasoplansetes-preview.<verified-subdomain>.workers.dev` ir `PARASOPLANSETES_PREVIEW_D1_ID=<actual UUID>`. Tai nėra slaptažodžiai. `node sites/parasoplansetes/cloudflare-preview/prepare.mjs` be `--dry-run` reikalauja tikro host/DB.
4. Helperis sugeneruoja entry adapterį companion `dist/server` ir ignored private `output/parasoplansetes-cloudflare-preview/wrangler.json`. Neredaguoja Vite source ar approved paketo. Pakartojus build, prepare vykdyti iš naujo. Runtime compatibility_date lieka pagal jau patikrintą kompiliuoto framework konfigūraciją.
5. Iš companion root paleisti project-local Wrangler D1 execute --remote su generuotu config ir tik `drizzle/0004_niche_leads.sql`, `drizzle/0005_niche_interest_daily.sql` į savo preview DB. Patikrinti schema.
6. `node node_modules/wrangler/bin/wrangler.js deploy --config ../nisiniai_puslapiai_monetizavimui/output/parasoplansetes-cloudflare-preview/wrangler.json`. Įkėlimas tik į suplanuotą Worker, su workers_dev=true ir preview_urls=false, assets run_worker_first=true. Nejungti custom domain ar mokamo plano.
7. Iš private root `node sites/parasoplansetes/cloudflare-preview/check.mjs https://<actual-host> sites/parasoplansetes/self-audit/cloudflare-preview-remote.json`; patikrinti CSS/JS ir gyvą vaizdą naršyklėje. Vienas pažymėtas QA formos bandymas ir tikslus jo D1 ID, be email siuntimo. Remote receipt, Worker version ir viešą URL dokumentuoti atskirai nuo vietinio PASS.

Šaltiniai: [Wrangler konfigūracija](https://developers.cloudflare.com/workers/wrangler/configuration/), [autorizacija](https://developers.cloudflare.com/workers/authorization/). 60 minučių anonymous claim deployment nenaudotas kaip nuolatinio savo paskyros įkėlimo pakaitalas; originali Wrangler versija neupgradinta.
