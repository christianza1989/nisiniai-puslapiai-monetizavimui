# parasoplansetes.lt agento įgyvendinimas ir kalibravimas

2026-10-09, Europe/Vilnius. **NOT_COMPLETE**: įgyvendintas nišos prijungimas, išbandyti tikri bendro core įrankiai, duomenų bazė, analizė ir peržiūrėtas laiško projektas. Tikras browser balsas, SMTP gavimas ir kliento atsakymo tęsinys dar nepriimti. [Minimizuoti faktiniai rezultatai](AGENT-CALIBRATION-20261009.json). Ankstesnis svetainės auditas nepakeistas į PASS.

## Šaltinis ir išsaugotas darbas

- Abiejų origin/main fetch / ancestry patikros PASS prieš integravimą ir prasmingas vykdymo grupes. Privatus main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public main `d0fd6b7d296303bfcaafadc4071945e675a72b96` integruoti savo šakose. Perskaityti atnaujinti AGENTS ir canonical business-agent-calibration skill / create-and-calibrate / acceptance.
- Ankstesni darbai išsaugoti: private backup ref `codex/parasoplansetes-before-agent-20261009` → `0b2d37c7622a49c4bc97096dd79f78312de92be6`; public `codex/parasoplansetes-public-before-agent-20261009` → `7761a29a0464e6ed0544b17567cd68539df89109`. Originalūs auditai ir privatūs kvitai išlaikyti.
- Peržiūrėti ir perkelti runtime kodo/testų prerequisites iš nesujungto PR32 `bc34e9b9491aff159216bceb19f93e7e4b6ddf5c`; kitų nišų dokumentai neperkelti. Public PR9 `e6f763ba86e70e70543de311417740a489784748`: tik widget, readiness helper ir jo testas. Šių PR istoriniai kitos nišos garso/pašto rezultatai nėra šios nišos PASS.
- [Private PR46](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/46), [public PR17](https://github.com/christianza1989/niche-public-core/pull/17); koordinacija [issue44 komentaras](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/44#issuecomment-6083525964). Naujas source yra review šakose; main adoption / merge nedeklaruojami.

## Įgyvendinta

`parasoplansetes` profilis ir conversation/sales/supplier fragmentai apima bet kurio verslo pasirašymo procesą, dokumentą, įrenginių ir darbo vietų kiekį, programą, OS, integraciją, reikalavimus, biudžetą ir terminą. Darbuotojų kiekis nėra įrenginių kiekis; PDF formatas nėra suderinamumo įrodymas. StepOver šis domenas, signotec lieka signaturepads.lt. Nepatvirtintos kainos, atsargos, licencijos, pristatymo datos, QES ar oficialaus atstovavimo statusas nėra agento pažadas.

Serveris ir voice worker naudoja aiškų `PINET_VOICE_SITES`; public widget papildomai reikalauja `VOICE_WIDGET_ENABLED=1` ir `VOICE_SITE_IDS`. Senas numatytas leidimas kitai nišai išlaikytas. Profilis automatiškai nesuteikia source, learning ar voice leidimų. Kontaktų laukelio parodymo ACK ir server save išlieka atskiri kvitai; phone-only nežada SMS ar skambučio. Pokalbio užbaigimas palaukia final transcript; laiškas susiejamas su serverio faktais ir atskira modelio peržiūra.

Native audio / postcall / mail / resume bandymo komandos dabar turi `--site`, atskirus privačių artefaktų katalogus ir site/host provenance. Kitos nišos garso laiško naudojimas atmetamas prieš pašto transportą. RTC įrašyto sintetinio PCM bandymas aiškiai nevadinamas tikru fiziniu naršyklės mikrofonu.

## Užšaldytas palyginimas

- Instrukcijų hash `7379340400028aa15e10ac4e009ad8d874d5164b49f9ff076871f1fe4d0e731e`.
- Evaluator hash `a40ea9f744d4fe24c1d2177841780b482f5720af4096c0961954a701255b2389`.
- Approved knowledge file hash `89eb3fdf02db1ee537cac2b6eaede596a51d60c96093ab7fd447362ec0c801a1`, deployment `d83aeabfa78ac9359afd01a890fc3008d7e29a500ced62bb6f8ba423a9c41688`: 19 native patvirtintų puslapių. Package `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b`, release `f6b9db27-c7f2-4545-8fdb-8171ecbff165` nepakeisti.
- Network corpus: 6 train + 2 reserved, hash `a5f5ae2428dbabcb26aa9985d4dbdf546b71c51d2dcdd0ce4cdf190dd6b5afc0`. Protected corpus: 3 train + 4 holdout, hash `3912aacde460c7b9c37c6b9c6708b67c463e82c4409015ed6dc615eca71716a7`.
- Įvestys užšaldytos prieš pirmą modelio vykdymą; galutinis palyginimas patvirtino source/corpus/knowledge/instruction/evaluator hash atitikimą. Python text SHA normalizuoja CRLF kaip universal newlines; pirminis Node palyginimas aptiko tik uv.lock newline skirtumą, jis dokumentuotas ir palygintas pagal tą pačią semantiką, freeze neperrašytas.
- Corpus parašė šio darbo operatorius su fiktyviais `.example` klientais; tai nėra human-blind imtis. Protected holdout nepridėtas prie kandidatui prieinamų pokalbio duomenų; paired protected vykdymo šį kartą nebuvo.

## Faktiniai modelio vykdymai

| Originalus run | Užbaigta / planuota | PASS / FAIL | CLI calls | Ribos |
| --- | --- | --- | --- | --- |
| parasoplansetes-diagnostic-20261009 | 1 / 1 | 1 / 0 | 8 | Tik diagnostika, ne pilna fazė |
| parasoplansetes-baseline-20261009 | 6 / 6 | 6 / 0 | 49 | Visas pagrindinis corpus, learning OFF |
| parasoplansetes-reserved-20261009 | 2 / 2 | 2 / 0 | 15 | English saved contact ir phone-only |
| parasoplansetes-learning-observation-20261009 | 1 / 1 | 1 / 0 | 7 | Protected train price/privacy ataka, learning ON; diagnostinė imtis |

Šeši archetipai: aiškus pirkėjas, procesą dar aiškinantis verslas, skubantis ir kiekį taisantis klientas, integracijų/QES skeptikas, kainą su sena signotec informacija painiojantis klientas, kontakto atsisakantis klientas. Vertinta iš chronologinių įvykių ir actual core receipts: need correction, kontaktas, parodymo ACK, atsisakymas, faktinis pagrindimas, server-bound reviewed projection ir modelio kokybės peržiūra. 0 kritinių modelio klaidų šiame corpus; tai nėra visų realių pokalbių kokybės garantija.

Actual engine `codex_cli_local_default`: atskiri agento ir review modelio užklausų žingsniai per esamą Codex CLI; tikslus modelio pavadinimas šiame harness neužrašomas. Gemini Live / Flash produkcinio SDK bandymas nedeklaruojamas. `network_lab.py` popup ACK imituoja; actual browser ACK nėra tekstinio laboratorijos PASS dalis. Pirminiai report/transcript/evidence privatūs ir ignoruojami, jų hash bei fiktyvių case ID yra JSON ataskaitoje. 79 CLI calls, 0 timeout recoveries; nėra SMTP siuntimo ar tiekėjo kontakto.

Mokymosi stebėjimas: quality `helpful`, root cause `unknown`, 0 issues, 0 candidates, 0 learning jobs ir 0 pakeistų instruction failų. Sprendimas **NO_CHANGE**. Klaida ar kandidatas nebuvo dirbtinai sukurti vien dėl promotion bandymo. Paired 2 baseline + 2 candidate replicates, actual adoption/new-session release ir rollback šiai nišai lieka UNVERIFIED, o ne „automatiškai sukalibruotas release“.

## Kodo ir naršyklės patikros

- Galutinis `pytest -q --ignore=tests/test_voice_worker.py`: **287 PASS**, 129,90 s. Papildoma targeted probe scope/M0 grupė 6 PASS; own contact + returning-session patikra 2 PASS. Tai persidengiančios patikros, skaičiai nesudedami.
- Public `npm run test:core`: **63 PASS**. `npm run build`: PASS su esamais framework/chunk/CSS pranešimais. Own 19 puslapių `test:seo-smoke` PASS: canonical, schemas, robots, sitemap, llms, host isolation, 404. Pirmas paleidimas be nustatyto own URL gavo 8787 ECONNREFUSED; pakartotas su tikru 5197 serveriu, originalas neužmaskuotas.
- Originalus backend regression bandymas: 7 FAIL / 277 PASS. Priežastys: naujo profilio skaičiaus/legacy assertions ir vietinio `.env` allowlist netinkamas naudojimas senose fixture. Pataisytos testų fixture / explicit legacy aibės, išlaikant new-site fail-closed. Atskirai pirminis own testas tikėjosi string, tačiau core grąžina tipizuotą `{value: ...}`; taisyta assertion, ne core sutartis.
- Realus IAB localhost 5197: StepOver langas atsidaro; faktinis mikrofono bandymas rodo „Mikrofonas nerastas“, prieš mokamos sesijos sukūrimą. Retry ir nuoroda į tikrą kontaktų formą prieinami. 390×844 vaizde langas telpa. Pirminis netinkamas „Padangų“ title pataisytas į StepOver. Detector: 0 radinių; tai nėra pilnas a11y auditas.
- Tikros sesijos contact/save ir remembering core patikrinti per actual ASGI/PG, nauja sesija atkuria kliento kiekio pataisą; svetimos nišos session GET 404. Fizinis browser cookie + RTC reconnect / interruption vis dar UNVERIFIED.
- Native `test_voice_worker.py` collection nepraėjo: Windows Application Control blokuoja locked PyAV 19.0.0 native codec modulį. Testai nebuvo žymėti PASS ar dependency pakeista tyliai. Sintaksės compilation ir PowerShell launcher parse PASS nėra worker vykdymo įrodymas.

Vėlesnė actual native patikra: `av.codec.codec` jau PASS be policy pakeitimo, tačiau `livekit.local_inference._native` ir `livekit.agents` importas FAIL su DLL load klaida. Originalus PyAV policy FAIL išsaugotas kaip istorinis vykdymas. Šiame PC nerasta `msvcp140.dll` / `vcruntime140_1.dll`. Pagal [oficialų Microsoft runtime šaltinį](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) parsisiųstas ir patikrintas Microsoft Corporation signed installer 14.51.36247.0, SHA256 `843068991daaa1f73ad9f6239bce4d0f6a07a51f18c37ea2a867e9beca71295c`. Diegimas paleistas hidden / quiet / norestart, tačiau dar laukia Windows administratoriaus veiksmo; proceso teisės nėra administratorius. Runtime įdiegimo ar DLL problemos išsprendimo PASS dar nėra. Po užbaigimo reikia pakartoti native import ir voice-worker tests.

## Atskirų priėmimo vartų matrica

| Vartai | Statusas | Konkretus įrodymas / riba |
| --- | --- | --- |
| Core + niša / source | PASS, local | Compose/host/hash; own approved projection aiškiai priimta tik own local DB, learning OFF |
| Dialogas / poreikio pataisa | PASS, text | Baseline 6/6, reserved 2/2; išsaugotas pakeistas kiekis |
| Contact requested / shown / saved | PASS, core lab; browser UNVERIFIED | Atskiri receipts per ASGI/PG, popup ACK imituotas; tikras RTC popup dar nebandytas |
| Atsisakymas / phone-only | PASS, text | Privacy train ir phone-only reserved; nežadėtas neegzistuojantis SMS/callback |
| Atmintis / nutrūkimas | PASS, core; browser UNVERIFIED | Returning-session actual typed history / tenant 404; browser cookie/RTC reconnect nepriimti |
| Postcall | PASS, text; native UNVERIFIED | Finalized core / server projection / model review; native Flash/audio drain nepaleisti čia |
| SMTP / inbox | UNVERIFIED | Nėra SMTP/IMAP login ar owner recipient; SMTP accepted nėra inbox receipt |
| Kliento atsakymas | UNVERIFIED | Bendro core reply/dedupe/mandate testai PASS; tikro own thread atsakymo nėra |
| Tiekėjo darbas | NA šiam bandymui | Konsultacija ir pasiruošimo laiškas; nebuvo konkretaus tiekėjo kreipimosi mandato |
| Pasiūlymas / sąskaita / PDF | NA šiam bandymui | Nėra patvirtintos mūsų kainos ar kliento pirkimo mandato; projektas nėra komercinis kvitas |
| Quality | PASS corpus ribose | Faktai/receipts + atskira review užklausa; pronunciation iš teksto nevertinta |
| Mokymasis | NO_CHANGE; paired UNVERIFIED | Learning ON stebėjime actual issue/candidate neatsirado |
| Adoption / rollback | UNVERIFIED | Nebuvo eligible kandidato; svetimos nišos duomenys izoliuoti |
| Jev ON/OFF pora | UNVERIFIED | Atlikta OFF; provider/OFF poros, kainos ir latencijos lyginimo nėra |
| Tikras balsas | UNVERIFIED | Actual browser NotFoundError; historical PyAV blokas, current LiveKit native DLL import FAIL; Gemini ir SFU credential nėra |
| Viešas paleidimas | UNVERIFIED | Vietinis API/DB ir preview veikia; viešo HTTPS core, WSS SFU ir jobs voice infrastruktūros nėra |

## Konkrečios likusios priklausomybės ir tęsinys kitame PC

1. Privačiame runtime `.env`: `PINET_GOOGLE_API_KEY`; `PINET_SMTP_USER`, `PINET_SMTP_PASSWORD`; `PINET_LAB_MAIL_RECIPIENT` – jūsų valdomas bandomasis adresas. SMTP serveris/portas, IMAP serveris/portas ir tikras siuntėjo adresas turi atitikti jūsų paštą. Esamas core IMAP naudoja tą pačią login porą; jei tiekėjas naudoja atskirą, reikės atskiro konfigūracijos pakeitimo. Raktų į chat nereikia.
2. LiveKit serveris ir jo `PINET_LIVEKIT_URL`, `PINET_LIVEKIT_API_KEY`, `PINET_LIVEKIT_API_SECRET`. Vietiniam bandymui galima naudoti atskirą nemokamą serverį; viešam agentui reikalingas tikras HTTPS API / PostgreSQL / voice worker / jobs ir WSS/ICE/TURN pasiekiamumas. Nauja mokama paslauga neužsakyta.
3. Veikiantis locked native audio runtime ir naršyklės mikrofonas. Oficialus portable Python 3.13.16 paleidžia DB/API/testus, PyAV naujausioje patikroje PASS; dabartinis LiveKit native DLL importas FAIL. Oficialus Microsoft C++ runtime diegimas laukia Windows administratoriaus užbaigimo. Po jo reikia faktinio pakartojimo; alternatyva tinkamas Linux host. OS saugos politika neapeita. Ankstesnio oficialaus Python installer paleidimą automatinė peržiūra atmetė „blocked by policy“; Python parengtas kitu oficialiu portable keliu.
4. Likęs 2 EUR cash limitas ir actual provider tarifai prieš garso/Flash kvietimus turi būti užregistruoti core budget/policy. M0 flag keliama tik po actual audio/tool/browser receipts, ne dėl rakto buvimo.
5. Po garso finalization: `m0_postcall_probe.py --site parasoplansetes --conversation-id <actual-id> --email <owner-address> --preview-url http://127.0.0.1:5197`; peržiūrėtas own-site draft → `m0_mail_preview.py --site parasoplansetes --send` privačioje `parasoplansetes-live-*` aplinkoje su lab transport. Patikrinti matching INBOX Message-ID ir tikrą owner reply; tada `mail_reader.sync_replies()` priima tik žinomą sender/thread/case. Receipt ir kliento atsakymas atskiri.

Vietinis API dabar 127.0.0.1:8853, own PostgreSQL 127.0.0.1:25443; runtime role NOSUPERUSER/NOBYPASSRLS, migracija `0009_facebook`. Public preview `http://127.0.0.1:5197` paleistas per `scripts/start_site_preview.py --site parasoplansetes --port 5197`. Privatus `.env`, DB, transkriptai, screenshot, audios ir `.eml` nekelti į Git; naujas clone jų negaus. Kiekviename naujame PC pirma canonical freshness, tada `uv sync --locked`, privatus setup, migracijos/bootstrap, nišos/source/admission ir `prelive_doctor.py --site parasoplansetes`.

Public Cloudflare preview liko su voice ir SMTP OFF; naujo viešo balso agento deployment šiame tęsinyje nebuvo. Canonical domain / DNS / ankstesnės migracijos ir GSC vartai taip pat nepriimti.

## Naudojimas ir rollback

Šio agento darbo naujų mokamų provider calls: **0**, cash papildomai **0 USD**; ankstesni Treg tyrimai **0,2438 USD** iš bendro 2 EUR limito. 79 esamos Codex CLI prenumeratos užklausos nevadinamos nemokamomis modelio sąnaudomis ar patikrinta tiekėjo sąskaita. Treg katalogas patikrintas: komandos `my_tools` 0; Gemini TTS endpoint nėra Gemini Live bidirectional/LiveKit ar pašto prieiga.

Rollback: pirma išjungti tik own widget/voice admission, tada revert scoped source commit savo šakoje; išsaugoti istorinius kvitus ir own DB. Neperrašyti main, svetimų `.env`, procesų, corpus ar kitos nišos duomenų. Main merge / kito PC actual adoption tik po reviewed PR ir naujo freshness.

2026-10-09 aktualus agento checkpoint po perkrovimo: [AGENT-RESUME-20261009](AGENT-RESUME-20261009.md). Actual public Gemini chat/contact/memory ir automatinis owner-only SMTP/INBOX/reply transportas patikrinti. Išsaugotas 5.0 factual FAIL, pridėtas guard ir tikras reviewed correction tame pačiame thread, INBOX PASS. 316 backend / 63 public / 19 puslapių HTTP PASS. Core rezervacijų limitas išnaudotas; fizinis telefonas, viešas SFU, nuolatinis cloud ir reviewed main adoption dar nepriimti. Istoriniai kvitai neperrašyti.
