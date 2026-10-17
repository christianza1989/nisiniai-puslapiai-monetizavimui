# Ergonomic.lt administravimas ir paleidimas

Atnaujinta: 2026-10-17. Savininko pavedimas: atskiras apsaugotas `/valdymas/` esamame draft ir atskiras laikinas tik patvirtintų modelių leidinys. Viešo draft turinio nekeisti. Tikras operatorius UAB A-Z Prekyba; jokio Pinet / Verslomatika paleidimo turinyje. Ergonomic.lt DNS nekeisti.

## Šaltiniai ir ribos

- Own branch abiejuose repo: `codex/ergonomic-admin-launch-20261017`.
- Core base `808581d919d06cb4a2d151cc7f9ec1be1782aba2`; public base `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; canonical start PASS 2026-10-17 04:22Z.
- Dabartinio draft autoritetas: `D:/Core/workspaces/ergonomic-configurators-vcare-after-dedupe-20261016/web`, Worker `4c1a69ca-6476-43c4-afe6-7befa7856df3`.
- 1111 originalių modelių, 797 aktyvios kortelės. Administravimas išsaugo originalius ID ir alias; nedubliuoja modelių skaičiaus.
- Ne kėdžių roadmap, manifestai ir 3D darbai tik skaitomi. Jokio Native paleidimo, stabdymo, grant ar jų failų rašymo.
- Esamas `/admin/` ir jo užklausos išsaugomi. Naujas saugus skyrius atskiras.
- Patvirtinimas tik savininko, konkrečiai nekintamai modelio revizijai. Esami techniniai PASS nėra savininko Approve.

## Checklist

- [x] Abiejų repo fetch ir canonical start, atskira šaka/worktree.
- [x] Perskaitytos platformos, kalbos, tipografikos, tekstų review→approve→release sutartys.
- [x] Nustatytas dabartinis draft šaltinis, tikras operatorius ir kontaktai.
- [x] Esamas priminimas pakeistas į admin užduotį; Native neatkuria.
- [x] Vienas prioritetų JSON, serverio CAS ir vietinis veidrodis kitam chatui (vienkartinis sync PASS; watcher pradėti po publikavimo).
- [x] Read-only šaltinių adapteris:1111 originalių /797 aktyvių, tikras runtime SHA; pending grafo matavimas, nežinomybės aiškios. 16 originalui tiksliai sutampančių Gemini prozų ir visų359 originalių 3D binding;16 turi ir opcijų vartus. 12 istorinių redakcijų nesutampa su originaliu Gemini tekstu ir nelaikomos baigtomis.
- [x] Serverinis Core review→approve→release ir atšaukimas, tikslūs live DB turinio/galerijos/konfigūracijos/source revizijų ryšiai. Atominis CAS, atskiros modelių eilutės ir nekintamos veiksmų versijos (ne vien didėjantis JSON su1111 raw atsakymų).
- [x] Apsaugotas `/valdymas/`, visi API ir peržiūros failai, owner-only neigiamos patikros.
- [x] Katalogo stiliaus UI, filtrai, eilė ir desktop/mobile peržiūra.
- [x] Gemini4Argon/Low tikras UI patikrintas esamoje anksčiau naudotoje paskyroje. Ta pati prioritetų eilė; originalaus atsakymo/hash/URL/faktų peržiūros privatus importas; jokio automatinio owner approval ar viešo draft redakcijos pakeitimo. Tikras 2ME16088543 pilotas: Gemini originalas, faktų pastabos, Gemini saviredakcija ir privatus importas200. Viešas draft nekeistas; savininko approval neduotas.
- [ ] Atskiras laikinas launch tuo pačiu varikliu, tik patvirtinta projekcija visuose keliuose.
- [x] Tikros duomenų/patvirtinimo/concurrency/host isolation patikros ir desktop/mobile vaizdas.
- [ ] Publikavimas, draft pariteto ir launch turinio/projekcijos HTTP patikros.
- [ ] Kanoninis handoff, būsenos įrašymas ir adresų/prioritetų kelio perdavimas.

## Dizaino ir tipografikos patikros planas

Išlaikyti katalogo Manrope, forest/chalk/sage ir kompaktiškas korteles. Administratoriaus užduotis: pasirinkti modelius, matyti tikras kliūtis, keisti eilę, peržiūrėti ir patvirtinti. Desktop 5 / mobile 2 kortelės, filtrai ir veiksmai bent 44px, mobile įvedimas 16px. Tikrinti ilgus modelių vardus, nežinomą kainą, tuščią filtrą, tinklo klaidą, stale-revision konfliktą, loading, fokusą ir 200% mastelį. Peržiūrai tikras esamas modelio variklis, ne maketas. Viena bounded vizuali korekcija po implementacijos.

## Apsaugos pasirinkimas

Cloudflare connector Access/D1 write grąžino Authentication error10000, dashboard neprisijungęs. Esamas Wranger OAuth turi Workers/D1 write; atskira publication DB ir trys migracijos jau paruoštos. Owner-only skiltis naudoja esamą vieno savininko Ergonomic.lt admin sesiją, esami Worker secrets nekeičiami. Tikra seno produkcinio owner session patikra PASS; naujos skilties remote patikra po deploy. Vietinės401/200/403 auth/CSRF patikros PASS. Nėra slaptažodžių source, jokių Access apsaugos teiginių.

## Patikros ir eiga 2026-10-17 05:01Z

- Canonical continue abiem repo PASS; ta pati base šaka, main nepasikeitė.
- Core runtime importo radinys: eager fs schema sugadino review importą Next/Workers. Sutaisyta pure body helpers abiejuose repo, tapatūs v2 source/hashes išlaikyti.13 Core regresijų PASS; issue186, upgrade-ed65dfe5-546f-4a5f-9a4a-e462a0e2d05e. Pirminė vykdymo aplinkos/fixture priklausomybių klaida išsaugota loguose, nevadinama sėkme.
-26 scoped app regresijos PASS (naudojant PREVIEW_CATALOG=true ir own research temp); papildomi8 workflow/copy/CAS/istorijos testai PASS po paskutinio per-model storage pakeitimo. TSC ir Cloudflare TSC PASS prieš paskutinį storage pakeitimą; final TSC vykdomas.
- Build-deployment.log: paskutinis build vyksta own app; ankstesni build PASS nėra paskutinio source publikavimo įrodymas. Deploy dar nebuvo.
- Išsaugotas5 viešų draft URL DRAFT-BEFORE.json ir tikra aktyvi Worker versija4c1a69ca. Paritetas tikrinamas po deploy, ne spėjamas.
- Prioritetų veidrodis: D:/Core/output/ergonomic-admin-launch-20261017/PRIORITETAI.json. Dokumento authority serverio JSON; local mirror read-only, versija/sync data aiškios. Ne kėdžių failai nekeisti.
- Tikras Gemini4Argon+Low screenshot: own output/gemini-argon-low.png. Pradinis UI esama Manrope/katalogo tapatybe; galutinė desktop/mobile ir iframe patikra dar nepriimta.

## Kitas žingsnis

Baigti final build (exec session8493) ir TSC (79645); parengti launch config per scripts/admin-release.mjs iš TOS PAČIOS sukompiliuotos aplikacijos. Prieš deploy dryrun ir paslapčių/client bundle patikra. Publikuoti explicit užsakytus du hostus, patikrinti anonymous/auth/CSRF, draft5URL tekstų paritetą, launch0modelių/404nepatvirtintų, tikrą desktop/mobile/iframe. Paleisti vieną priority mirror watcher, išsaugoti jo PID/komandą. Užbaigti scoped Git/PR ir handoff. Neperimti Native.

## Patikrinta 2026-10-17 05:34Z

- Canonical continue05:18Z abiem repo PASS. Public helper commit7d648b8 ir draftPR42; ne main adoption.
- Viešas admin Worker4ffcd3ca-7070-4543-bb60-9aa8c4e6dd52. Savininko aiškiai nurodytas slaptažodis nustatytas kaip ADMIN_PASSWORD_HASH; tikras login200, Secure/HttpOnly PASS, plaintext į source neįrašytas.
- Anonymous401 / authenticated200 /1111modelių. Tikra vidinė preview200/SAMEORIGIN po Cloudflare1042 korekcijos; užklausos į savo Worker tinklu atsisakyta. Peržiūros proxy perrašo į tikrą produkto rendererį, galutinė edge apsauga leidžia tik same-origin frame.
-11 publication/copy regresijų PASS, atskiras preview rewrite1PASS,25 tikrų engine/product/consolidation regresijų PASS. Nauja TSC/CloudflareTSC ir build PASS. Reviewer abu radinius uždarė be naujų materialių scoped findings.
- Runtime/index pakeitimas invaliduoja ankstesnį approval ir stabdo geometry acceptance, kol source snapshot neprilygsta release. Build preflight reikalauja tikslaus4techninių failų hash; generatorius neadoptuoja nepaskelbtų kandidatų vien dėl lokalios bylos.
- Ši saugos versija konservatyviai susieja review su bendra technine3D versija. Atnaujinus ją reikia naujos savininko peržiūros; vien naujas tekstas ar prioritetas tos versijos nekeičia. Tai sąmoningas saugus ribojimas, ne pažadas apie granular incremental3D approvals.
- Istorinis nepaskelbtas preset grąžina controlled not-found; atskirai paskelbtas Xilium alias/4ME išlaiko savo tikrą embeddedengine ir užsakymoID.
-5 draft URL tikslus visible-text SHA paritetas PASS: homepage,katalogas,Xilium23636152,4me20402096,privatumas. Final proof D:/Core/output/ergonomic-admin-launch-20261017/DRAFT-PARITY.json.
- Tikra desktop ir375px content/390px iframe peržiūra veikia; SA3-ST pasirinkimas pakeitė tikrą mechanizmo techninį aprašą. Bounded mobile patikra aptiko filtro min-content overflow; pataisyta.390px UI:20kortelių,2filtrai,scrollWidth375PASS.
- Priority mirror PID2996, tikra komanda scripts/priority-mirror.mjs --watch, atnaujinama kas30s. Dabartinė eilė rev0/0prioritetų;343→342 Gemini jobs po vieno tikro privataus piloto.
- Paleidimo atskiras asset upload tęsiamas, ankstesnis nebaigtas bandymas išsaugotas deploy-launch.log. Naujame bandyme >11000/12822 likusiųassetų jau įkelta; tai dar nėra viešo launch PASS.
- Native, ne kėdžių ROADMAP/manifests, sesijos ir grant nekeisti. DNS ergonominic.lt nejungtas.

## Likusi baigtinė eiga

Baigti dabartinį frozen launch upload, patikrinti tikrą hostą ir fail-closed projekciją, no-Pinet/operator/canonical/robots/privacy, auth/CSRF ir private-copy izolaciją. Nepatvirtinti modeliai turi404; viešai0owner-approved. Pakartoti final5URL paritetą po paskutinioUI build. Išsaugoti final WorkerID, patikrų ir procesų checkpoint; scoped Core commit/push/PR, abu handoff gates. Jokio Native ir papildomo Gemini masinio rašymo šiame admin įdiegime.
