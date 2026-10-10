# StepOver peržiūra Cloudflare be domeno

Savininkas 2026-10-09 aiškiai pavedė įkelti svetainę kol kas be domeno. Tai viešas laikinas `workers.dev` adresas su `noindex`, ne galutinis parasoplansetes.lt / SEO paleidimo priėmimas. Domeno / WordPress / 301 / Search Console ir SMTP priėmimo būsenos nesikeičia.

## Aktualus rezultatas: įkelta 2026-10-09

Veikiantis adresas: **https://parasoplansetes-preview.pinet-azprekyba.workers.dev/**. Savininko užbaigtas Wrangler OAuth dabar veikia, paskyra patvirtinta per whoami: info@azprekyba.lt / numatytas account ID. Pasirinkti workers_scripts:write ir d1:write leidimai pakako realiam įkėlimui; bendras whoami įspėjimas dėl kitų numatytųjų produktų scopes nėra šio diegimo klaida.

Sukurtas account subdomain pinet-azprekyba, atskiras Worker parasoplansetes-preview ir D1 UUID `98f4d3c5-11a4-4d19-a6ec-d568a96da0f7`, jurisdiction EU / EEUR. Į DB įdiegtos tik lead ir interest lentelės. Galutinė Worker versija **15c617c3-e85c-4e05-9e68-a961056f0678**. Jokių mokamų planų, custom domain, SMTP, DNS ar WordPress pakeitimų.

Galutinė patikra: **5 regresijos ir60gyvų HTTP checks PASS**: 19 puslapių, 20 medijos failų, 16 CSS/JS failų, 3 draudžiami vidiniai/API maršrutai, robots ir cross-origin formos guard. `self-audit/cloudflare-preview-remote-20261009.json` turi tikrą workers.dev bazę ir remoteDeploymentProven=true. Naršyklėje stylesheet9/123rules, matomas teisingas dizainas, natūrali navigacija homepage → pasirinkimo gidas → homepage. Galutinis vietinis screenshot: ignored `output/parasoplansetes-cloudflare-preview/cloudflare-live-home-fixed.png`.

Gyva sintetinė forma gavo200, o remote D1 patvirtino tikslų ID `3dd70299-1700-4daa-afbe-e3a23a9a9f87`, site_id parasoplansetes / source_path /kontaktai. Forma pateikia tikrą išsaugojimo tekstą ir aiškiai nurodo, kad el. laiškas neperduotas. Tai ne SMTP/INBOX ar tikros klientų paklausos įrodymas. Vienintelis bandymas aiškiai pažymėtas QA, be tikrų klientų duomenų.

Naršyklė aptiko pirmo įkėlimo CSS/JS404: assets run_worker_first=true nukreipė framework failus į rendererį, kuris paprastai juos palieka Cloudflare static assets sluoksniui. Vietinis adapteris dabar tik /_next/static/ ir /fonts/ perduoda ASSETS binding; publication-controlled medija tebelieka native guard. Pridėta prasminga regresija ir16frameworkfailų HTTP patikra, įkelta pataisyta versija. Pirmo44checks kvitas išsaugotas kaip `cloudflare-preview-remote-initial-20261009.json`; jis neapėmė CSS/JS ir nėra viso dizaino PASS.

Autorizacijos callback problema išspręsta: originali CLI funkcija po120sekundžių uždaro localhost8976, todėl savininko vėlesnis callback nebeatsidaro. Tik vienam Node procesui ignored preload pratęsė šį konkretų laukimą iki30minučių; state, PKCE, scope ir provider token galiojimas nepakeisti, dependency source neredaguotas. Naujas flow sėkmingai užbaigtas; auth code / PKCE / token į Git nepateko. Žemiau išsaugota ankstesnės kliūties istorija.

## Tikslas ir ribos

2026-10-10 turinio atnaujinimas: ankstesnis žemiau nurodytas ed39 paketas yra istorinis. Dabartinis verified immutable release `924b8844-749e-41ba-828e-3c2ee3494806`, SHA `78bb031a0c2686bc01a448ef6619d4534400f1ba7411d5f3a5e48b1f09163678`, 46 approved puslapiai / 170 variantų. `prepare.mjs` papildomai priima `PARASOPLANSETES_CONTENT_RELEASE_DIR`, tikrina jį bendru release verifier ir lygina tiksliai importuoto paketo bytes. Be šio įrodymo kitoks paketas atmetamas. Worker version `8534e038-e884-49e3-99db-0991573677d4`; 241 actual HTTP PASS, publication-aware checker atskiria due200 / future404 ir tik jų mediją bei indeksus. Visos naujos partijos iki lapkričio14; tikras pilotas private. Ataskaita: [CONTENT_PRODUCTION_20261010](../CONTENT_PRODUCTION_20261010.md). Noindex peržiūra ir ankstesni chat/voice jungikliai išlaikyti; tai nėra production domeno ar hosted chat priėmimas.

- Paskyra: `1c0a7407abfb959d5ff46540f5f7009d`, esama `Info@azprekyba.lt's Account`.
- Worker ir atskira D1: `parasoplansetes-preview`; jokio kito Worker ar DB perrašymo.
- Tik patvirtintas native paketas SHA `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b` / public source `7761a29a0464e6ed0544b17567cd68539df89109`.
- Adapteris įleidžia tik konfigūruotą peržiūros host. Bendras rendereris toliau tikrina publikavimo laiką, medijos tinkamumą, maršrutus ir užklausas. Originalios approved JSON versijos nekeičiamos.
- Kiekvienas atsakymas turi `X-Robots-Tag: noindex, nofollow` ir `private, no-store`; robots disallow all. Canonical / schemos išlaiko tikrą pagrindinį domeną. Tos pačios svetainės HTTP redirects grįžta į peržiūros host.
- Mail, voice išjungti. Forma gali saugoti užklausą tik savo D1; SMTP pristatymo nežada. Mokami planai ir periodiniai mokami kvietimai neaktyvuojami.

## Ankstesnė būklė 2026-10-09 08:37 UTC (išspręsta)

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
