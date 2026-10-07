# Traktorių padangų balso paleidimas ir actual priėmimas

Aktualus pavedimas: [IMPLEMENTATION_STATUS](../sites/traktoriupadangos/IMPLEMENTATION_STATUS.md). 2026-10-07, dvi izoliuotos šakos `codex/tractor-voice-launch-20261007`; nešvarūs pirminiai checkout neperrašyti. Tai vietinio tikro garso priėmimas ir parengta paleidimo eiga, ne veikiantis viešas domenas.

## Patirti defektai ir pataisos

1. Naršyklė media-room jungtį laikė prasidėjusiu pokalbiu, kai agento dar nebuvo. Dabar mikrofono leidimas gaunamas prieš mokamą sesiją, o mikrofonas publikuojamas tik po serverinio `pinet.voice.ready=true` iš tikro agento dalyvio. Worker signalizuoja po pirmo generuoto garso. Startup klaida išlieka matoma, neišpublikuoti mikrofono takeliai uždaromi; blokuotam audio yra „Įjungti garsą“.
2. Browser pabaiga galėjo užbaigti bylą prieš paskutinio agento transkripto išsaugojimą. Aktyviam owner dabar siunčiamas `end_requested`; worker ištuština tekstų ir usage eiles, tada finalizuoja. Offline / be-owner kelias išlieka iš karto baigiamas. Trūkstama persistence fiksuojama coverage gap.
3. Fresh DB migracijos reikalavo dar nesukurtos runtime rolės; `bootstrap.py --role-only` sukuria ją prieš migracijas. Fresh clone suite priklausė nuo ignoruojamų tyrimo / billing / calibration failų: perkelta nekintanti sintetinė V2 fixture, kiti testai kuria savo aiškias fixtures.
4. Tikras Flash grąžino HTTP 400: legacy SDK `response_schema` perdavė API neatpažįstamą `additional_properties`. Dabar siunčiama griežta `response_json_schema`. Pydantic vieno ID `const` pakeičiamas vieno elemento `enum`, promptui pateikiami leistini įrodymų ID. Serverio validavimas išlieka; ankstesnė literal_error nelaikoma PASS.
5. Native Flash laiškas anksčiau likdavo juodraščiu ir public follow-up rinkdavosi šabloną. Pridėtas atskirai biudžetuojamas nepriklausomas faktų / veiksmų review ir source/revision/evidence/body-hash binding. Nepatvirtintas ar konkurento nuorodą turintis laiškas neprojektuojamas; lieka esamas pagrįstas informacinis fallback.
6. Windows launcher dabar skiria private probe ir live agentų vardus, tikrina actual registration marker, namespace, PID ir start time, išsaugo kitus procesus ir išsekus laukimui meta klaidą. PowerShell 7 JSON datos konversijos klaida aptikta actual antru paleidimu ir pataisyta. Health port tik loopback.

## Įrodymų matrica

| Patikra | Būsena ir actual ribos |
| --- | --- |
| SDK / modelių prieiga | PASS: Google genai 2.25.0, LiveKit Google/Agents 1.8.3, RTC 1.1.18; API model metadata patvirtino 3.8-live ir 3.8-flash. Metadata nėra audio įrodymas |
| Native generuotas LT garsas | PASS: 36 audio ir 11 output transcription dalių; privatus PCM WAV |
| Tikras RTC worker + tools | PASS šiam scenarijui: `9c009ef2-2d35-476b-b547-43231965e760`, 32.33 s gauto garso, UI ACK, `ui.open_contact_form`, `need.patch`, 420/85 R30, finalized, išsaugotas agento atsakymas, 1 interruption event, coverage_gap=false. SDK įvertis 17 166 microUSD, ne provider sąskaita |
| STT pilnumas | UNVERIFIED / ribotas: įrašas praleido pirmus sintetinio kliento žodžius ir kiekį; transkriptas nėra pilno garso išsaugojimo garantija. Flash teisingai paprašė kiekio patikslinimo. Visų situacijų idealaus supratimo nėra įrodyta |
| Provider session resumption | PASS: nauja Gemini jungtis su ankstesniu opaque handle prisiminė 420/85 R30; 19/21 audio dalių. Handle neišsaugotas / neparodytas. Tai nepakeičia browser/RTC reconnect bandymo |
| Contact HTTP / outbox | PASS: tos pačios actual audio bylos kontaktas išsaugotas per HMAC+capability; follow-up outbox `prepared`; smtp_sent=false |
| Actual Flash analizė / quality | PASS po JSON schemos pataisos; ankstesni HTTP 400 ir neteisingos evidence nuorodos FAIL išlaikomos aprašyme. Measured script nekeičia synthetic bylos į realų klientą. Oficialus synthetic jobs analysis yra baseline; atskiras actual Flash draft/review įrodymas nesumaišomas |
| Backend / public regresija | Pirmas fresh suite: 275 PASS / 10 FAIL dėl private fixtures; po portable pataisų 285 PASS; galutinis pilnas suite 292 PASS / 217.99 s. Po paskutinės sales-prompt pataisos 13 tikslinių PASS ir Ruff PASS. Skaičiai nesumuojami |
| Viešo core | 53 PASS; TypeScript ir focused ESLint PASS; HTTP voice smoke PASS: alias/method/host/origin/HMAC/readiness reject; SEO smoke PASS: 11 puslapių / robots / sitemap / llms / schema / 404 |
| Naršyklės vaizdas | Actual IAB `http://127.0.0.1:5187/`: pradinis AI panelis peržiūrėtas 1280×720 ir 375×812. Mobile panel clientWidth326 / scrollWidth326, height283 / scrollHeight283. Tai nėra active/contact/error būsenų ar fizinio telefono audio PASS |
| Viešas domenas / hostingas | UNVERIFIED: traktoriupadangos.lt ir www DNS nepavyko; Wrangler neprisijungęs. Esamas Sites „Gift SEO Platform“ aktyvus, bet neturi VOICE konfigūracijos. Jo kito aktualaus source neperrašėme |
| Pašto gavimas / SFU failover / backup / vieša apkrova | UNVERIFIED šiame garso etape. Ankstesni SMTP laboratorijos kvitai nepervadinami šio bandymo gavimu |

Papildomas actual rezultatas: native laiško review pirmą juodraštį atmetė dėl nepatvirtinto pristatymo įspūdžio. Generatorius pradėjo naudoti core+nišos sales instrukcijas ir actual capabilities; kitas juodraštis priimtas (`approved=true`, unsupported_claims=[]), body/revision/evidence binding PASS. Jo peržiūra atlikta tikru Flash; sintetinis core outbox išlieka `prepared`. Savininko anksčiau autorizuotam vienam gavėjui išsiųsta šio laiško peržiūra per bendrą owner lab mail core iš `info@pinet.lt`: SMTP `accepted_by_smtp`, Message-ID `<38d3c7c5-7aa1-419b-a491-6b45590ec102@pinet.lt>`. Tai atskira autorizuota peržiūros siunta, ne automatinio production postcall pristatymo įrodymas. Gmail jungtis grąžino reauthentication required, todėl inbox gavimas UNVERIFIED. Gavėjo adresas ir SMTP prisijungimai šiame dokumente nesaugomi.

Patikrintos source SHA-256: `voice_worker.py` = `0a4313066aa1f02f184508871e9dab73b1b6047a615542057b9feb0e7fb8f881`; `jobs.py` = `7b2b89a1bb46b842a60388f3116dd2453b6c874291915b2523ab1d8a264a494b`; `voice-widget.tsx` = `1d3c1918ab614c77bda48a98d45544e0b71b4f3550029e9c1f5ba5589434cd63`; `voice-connection.ts` = `fa481c5b34af433cab506e7b5fb2d23d766f8d8f58923f54224b5e180ac93512`. Privati konfigūracija ir garso įrodymai nėra šių source hash dalis.

Privačių įrodymų vieta šiame worktree: `agent-business-core/runtime/artifacts/tractor-voice/` (`rtc-probe-<id>.json`, WAV, `provider-resume.json`, `postcall-probe-<run>.json`). Jie ignoruojami Git ir neperkeliami į kito kompiuterio clone. Pilnas M0 PASS lieka false. Bounded pilot cap 2 000 000 microUSD, viena balso sesija vienu metu; realios išlaidos nesutapatinamos su rezervacijos suma.

## Atkuriamas vietinis paleidimas

Komandas vykdyti `agent-business-core/runtime/`; naudojamas atskiras private `.env`, o ne klientui pateikiami raktai.

```powershell
uv sync --locked
uv run python scripts/setup_local.py
docker compose up -d postgres
uv run python scripts/bootstrap.py --role-only
uv run alembic upgrade head
uv run python scripts/bootstrap.py
uv run python scripts/prelive_doctor.py
```

LiveKit SFU paleidžiamas atskirai arba naudojamas Cloud projektas. Šioje sesijoje Docker daemon nesuveikė, todėl naudoti atskiri official PostgreSQL17.11 ir LiveKit1.13.8 Windows procesai, loopback DB25432 / SFU7880; senos DB nekopijuotos ir Docker volumes nepakeisti. Tai nėra universalus Docker pataisymas ar Linux deployment bandymas.

Private provider/RTC priėmimui operatorius privačiai nustato `PINET_M0_PROBE_ENABLED=true`, `VOICE_ENABLED=false`, `M0_VERIFIED=false`, `ALLOW_SIMULATION=false`, tikras provider/LiveKit prieigas, aiškius global/site/time/USD limitus ir source admission/policy. Public core kelias per `PINET_PUBLIC_CORE_PATH` arba portabilią gretimą `dovanos-memorycasting` struktūrą.

```powershell
scripts/start_voice_background.ps1 -Probe -WithPreview
uv run python scripts/m0_probe.py
uv run python scripts/m0_rtc_probe.py
uv run python scripts/m0_resume_probe.py
# Naudoti naujausio savo privataus audio bandymo ID ir savininko autorizuotą gavėją:
uv run python scripts/m0_postcall_probe.py --conversation-id <private-probe-id> --email <authorized-recipient>
# Tik po priimto native review ir esamo vieno gavėjo owner-lab konfigūracijos:
uv run python scripts/m0_mail_preview.py --send
```

Launcher nekuria OS service, nekilnoja DB, nekeičia M0/live vėliavų. Antras to paties režimo paleidimas išsaugo owned procesus; unknown occupied port ar kitas režimas stabdo paleidimą. Probe CLI klaida grąžina nonzero; `measured` nereiškia viso M0 PASS. Nauji mokami modelio bandymai turi atskiras rezervacijas. Nepradėti kartoti mokamų bandymų be naujo klausimo / pataisos ir biudžeto.

## Konkreti viešo įjungimo eiga

1. Gauti konkretaus esamo VPS / LiveKit Cloud ir domeno privačią konfigūraciją; paskyros / mokamo serverio pirkimas šiuo dokumentu nesuteikiamas. Serverio PG+API+jobs+voice procesai turi išlikti po restart, su backup / restore ir nustatyta retention. API binds loopback8840, viešame TLS reverse proxy reikalingi `/v1/*` HMAC endpointai; operator/worker keliai išlieka privatūs.
2. Prijungti visitor pasiekiamą LiveKit WSS ir ICE. Self-hosting reikalauja trusted TLS, public IP, media UDP/TCP ir TURN tinkamoje konfigūracijoje. Vien HTTP tunnel neišsprendžia WebRTC. Managed LiveKit Cloud sumažina SFU tinklo administravimą, bet vis tiek reikia API+DB serverio.
3. Privačiai konfigūruoti provider/budgets/secrets ir tik traktoriupadangos policy/source admission. Worker vidinis `PINET_CORE_URL` lieka privataus API adresas; LiveKit URL turi būti tinkamas ir browser visitor. Public API URL turi atitikti HMAC endpointus be redirect / path prefix perrašymo.
4. Prieš bet kokį Sites publish perskaityti jo actual source ir taikyti tik suderintą widget delta. Dabartinio Gift/network deployment negalima pakeisti šios šakos senesniu viso repo snapshot. Public serveriniai laukeliai: `VOICE_CORE_URL=<TLS API origin>`, `VOICE_EDGE_SECRET=<tas pats kaip PINET_EDGE_SECRET>`, `VOICE_WIDGET_ENABLED=1`; tik tractor render allowed. Gemini/LiveKit/worker/operator secrets niekada nepatenka į browser bundle.
5. Nustatyti core žinių refresh į `https://traktoriupadangos.lt`, tikrinant tikrą host ir patvirtintų puslapių hash. Private m0 probe išjungti production aplinkoje. Atlikti trusted HTTPS/domain/host/unknownhost/audio/perskambinimo/final-transcript/contact/postcall/SMTP+inbox kelią iš nepriklausomo tinklo.
6. Išsaugoti actual priėmimą, tada sertifikuoti M0, įjungti live tik vienai nišai ir siauriems limitams. `scripts/start_voice_background.ps1` be `-Probe` paleidžia `pinet-consultant`; perjungiant režimą prieš tai užbaigti owned sesijas ir procesus. Ne įjungimo vėliava, o pilnas bandymas yra priėmimas.

Diegimo seka: serverinis worker su readiness → public widget; naujas widget su senu worker lauktų atributo ir timeout. Rollback: pirmiausia išjungti public widget / per-site priėmimą, užbaigti aktyvias sesijas, grąžinti ankstesnę source versiją. Duomenų trinti nereikia. Kitų nišų, tiekėjų pirkimų, naujų mokamų planų ar autonominio taisyklių promotion šis paleidimas neįjungia.

Aktualios pirminės dokumentacijos: [Google structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [LiveKit production deployment](https://docs.livekit.io/transport/self-hosting/deployment/), [Gemini Live](https://ai.google.dev/gemini-api/docs/live-api). Actual SDK ir provider bandymai aukščiau yra atskiri nuo dokumentacijos skaitymo.
