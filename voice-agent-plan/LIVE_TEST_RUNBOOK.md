# Tikro traktorių padangų skambučio paleidimas

2026-09-30. Integracijos peržiūra: **http://127.0.0.1:5187/**. API 8840, PostgreSQL 15432, jobs procesas jau paleisti vietoje. Viešas `traktoriupadangos.lt` šiuo darbu dar nediegtas. Su dabartine konfigūracija skambučio pradžia grąžina neparuošto balso būseną; naršyklė siūlo esamą užklausos formą.

## Vienkartinis prieigų ir limitų įvedimas

Privačiame `C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/agent-business-core/runtime/.env` pridėti šiuos laukus iš savos Google/LiveKit paskyros. Reikšmių nedėti į chat, Git, svetainės JS ar promptus. `.env.example` pateikia tik pavadinimus; esamų DB/edge/worker/operator prisijungimų nekeisti.

- `PINET_GOOGLE_API_KEY`
- `PINET_LIVEKIT_URL` (savos LiveKit paskyros WSS adresas)
- `PINET_LIVEKIT_API_KEY`
- `PINET_LIVEKIT_API_SECRET`
- `PINET_GLOBAL_DAILY_BUDGET_MICROUSD`
- `PINET_VOICE_COST_CEILING_MICROUSD`
- `PINET_ANALYSIS_COST_CEILING_MICROUSD`

Biudžetai yra savininko pasirinkti teigiami sveikieji skaičiai mikro-USD; 1 USD = 1 000 000 mikro-USD. Bendras biudžetas, balso skambučio rezervas ir vieno post-call modelio darbo rezervas turi būti tarpusavyje suderinti. Analizė ir kokybė yra atskiri modelio darbai. Faktinis billing ir LiveKit transportas dar turi būti sutikrinti. Rezervas nėra garantija, kad provider tiksliai sustos ties ta pinigų suma.

Iki išmatuoto M0 palikti `PINET_VOICE_ENABLED=false`, `PINET_M0_VERIFIED=false`, `PINET_SMTP_ENABLED=false`. Vien raktų įrašymas viešų skambučių neįjungia.

## Autonominis pirmas provider bandymas

Komandos vykdomos `agent-business-core/runtime/`. Pirma restartuoti tik šio runtime API/jobs procesus, kad perskaitytų pakeistą `.env`. Pagalbinis `scripts/start_local_background.ps1` jau veikiančių procesų neperkrauna; jų PID ir komandos turi būti patikrinti prieš stabdant. Kitų projektų procesų nestabdyti.

```powershell
uv run python scripts/prelive_doctor.py
uv run python scripts/operator_policy.py --site traktoriupadangos
```

Atskira operatoriaus politika taip pat turi turėti pasirinktą teigiamą nišos dienos biudžetą, `enabled=true`, `paused=false`. CLI `--daily-budget-microusd`, `--enable`, `--resume` ir `--reason` įrašo versijuotą pakeitimą; konkreti suma įvedama pagal savininko pasirinktą limitą. Core konfiguracijoje išjungtas balsas ir nepraeitas M0 toliau neleidžia browser admission.

```powershell
uv run python scripts/m0_probe.py
```

Šis probe rezervuoja sumą bendrame registre ir tikrina native setup, tekstinį LT prašymą bei grįžtantį garsą/transkriptą, su 25 s bendru timeout. Jis pats **neįrodo pilno M0**, neperjungia flagų, nesutikrina sąskaitos ir neatstoja mikrofono/WebRTC bandymo. Nesėkmės tekstas slaptai konfigūracijai neatskleisti nepublikuojamas; rezultatas saugomas ignoruojamame `artifacts/m0-probe.json`.

## M0 ir savininko bandomasis skambutis

Pilnam M0 dar būtina su tikrais provideriais patikrinti LiveKit/Gemini LT audio, abiejų pusių transkriptus, 3–5 s async tool, UI formos ACK, interruption, mute, pabaigą, reconnect/resume ir kumuliacinį usage. Užfiksuoti modelio/SDK versijas, tinklą, trukmę ir faktinį sąnaudų sutikrinimą. Tokio bandymo rezultato dar nėra. Testų pakaitalai neleidžia iš anksto nustatyti `PINET_M0_VERIFIED=true`.

Tik įrodžius šį kontraktą galima nustatyti `PINET_M0_VERIFIED=true`, `PINET_VOICE_ENABLED=true`, `PINET_ALLOW_SIMULATION=false`, iš naujo paleisti API/jobs ir balso worker:

```powershell
uv run python -m pinet_core.voice_worker dev
uv run python scripts/prelive_doctor.py
```

Tuomet savininkas atveria peržiūrą, paspaudžia pokalbio mygtuką ir leidžia mikrofoną. Scenarijus: „Ieškau 420/85 R28, galinių padangų, bet nežinau apkrovos. Ką turiu patikrinti?“ Agentas turi remtis patvirtintomis žiniomis, tikslinti neaiškumus ir siūlyti palikti kontaktą ekrane. Išbandyti lango atidarymą kalbant, pabaigą, kontakto pataisą ir grįžimą su pasirinkta atmintimi. Paprašius kainos/tiekėjo negalima išgalvoti likučio ar pardavimo pažado.

## Laiškas ir viešas domenas

Automatiniam laiškui papildomai reikalingi bendro siuntėjo SMTP prisijungimai, patikrinta siuntėjo/domeno tapatybė ir voice nišos follow-up politika. Tikras gautas laiškas tikrinamas atskirai nuo SMTP priėmimo. Sintetiniai vietiniai artefaktai niekada nesiunčiami; savininko realus self-test turi būti atskirai sužymėtas ir nesumaišytas su klientų rodikliais. Telefono įrašas nėra veikianti SMS/callback paslauga.

Viešam domenui reikalingas HTTPS API, nuolat veikiantis worker/jobs/PostgreSQL hostingas, secrets, realaus deployment žinių manifesto adresas, privatumo/retention ir kopijų politika. Cloudflare valdiklis turi kalbėti su pasiekiamu HTTPS core, ne `127.0.0.1`. M6-A ir tikro domeno e2e dar nepraeiti. Vietinio mygtuko buvimas nepatvirtina šio paleidimo.

Sustabdymas: operatoriaus `--pause` užbaigia aktyvias sesijas ir neleidžia naujų veiksmų. Neaiški SMTP būsena nesukelia automatinio pakartojimo. Išsiųsto laiško atšaukti negalima.

Aktualių patikrų žurnalas: [PRELIVE_QA](PRELIVE_QA.md). Likusių darbų ribos: [IMPLEMENTATION](IMPLEMENTATION.md).
