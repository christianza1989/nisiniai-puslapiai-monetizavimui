# StepOver agento tęsinys po perkrovimo

2026-10-09, Europe/Vilnius. Nauja dabartinės būsenos ataskaita; ankstesni AGENT-CALIBRATION ir AGENT-PAUSE kvitai bei užšaldyti scenarijai išsaugoti. Visa užsakyta apimtis **NOT_COMPLETE**: fizinis telefono balsas ir nuolatinis cloud runtime dar nepriimti.

## Source ir įdiegtos ribos

Canonical continue gate po Codex restart sėkmingai fetched abu main: private `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public `d0fd6b7d296303bfcaafadc4071945e675a72b96`. Own branches PR46 / PR17; mains nekeisti. Šio tęsinio source prasideda nuo private `b432fa544af3609453b4ff918c326a859c7d1bac` / public `91513b560e7393172ebaea6cb6764e0ee587f513`; galutinis committed/pushed SHA nurodomas GIT_DELIVERY papildyme.

Runtime Python tree SHA256 `7bea6f30baa7e3707bda49107135cf44247e23b09b2814143fe1d06d47117cea`. Current compose hashes: conversation `fa7bfe37b744ec9174efe2862f23d9f9d7826860a4ae634b3a9528b825bb01f5`; sales `789251afe8c03015106a477ed546432adaf36891f0d49767f84256a5cc6cb507`; quality `903db3254cd908e61e04254f63d06bdce23748061b04caa2cbd7bbbff048a342`. Ankstesni model/corpus/evaluator/knowledge fingerprint neperrašyti. Naujų sesijų source skiriasi nuo istorinio šešių archetipų corpus.

Actual Worker preview: https://parasoplansetes-preview.pinet-azprekyba.workers.dev/ , version `329cec18-07b0-4cbe-b13b-fe915d565ff3`. Tas pats approved release `f6b9db27-c7f2-4545-8fdb-8171ecbff165`, package `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b`. Tik svetainės rendereris/edge yra Cloudflare; FastAPI/PG/jobs tebėra šiame PC. Po restart atkurtas laikinas HTTPS core tunelis; jo URL generuojamas iš naujo, o deployment naudoja faktinį naują adresą. Domeno DNS nekeičiami, preview išlaiko noindex.

Chat įjungtas šiai nišai; jo mokami kvietimai šiuo metu užblokuoti išnaudotu konservatyvių rezervacijų limitu. Voice production ir M0_VERIFIED lieka OFF. SMTP leidžia tik savininko bandymo adresą, IMAP skaito tik žinomų priimtų laiškų atsakymus read-only. D1 formos SMTP OFF; klientų, marketingo ir tiekėjų siuntimas neįjungti. Sekretai tik ignoruojamame runtime `.env`; į Worker perduotas tik signed edge secret.

Actual browser po restart ir šio deployment parodė homepage ir pokalbio langą; paspaudus tekstinio pokalbio pradžią išnaudotas serverio limitas grąžino „Paslauga laikinai nepasiekiama. Pateikite užklausą įprasta forma.“ ir kontaktų formos nuorodą. Naujas paid model kvietimas nepaleistas. Šis checkpoint nesako, kad šiuo metu galima atlikti neribotą chat bandymą.

## Tikros kanalų patikros ir pirmi FAIL

Public Gemini chat užfiksavo 2 įrenginius / 1 Windows darbo vietą / PDF, tikrą popup shown ACK ir server contact save. Tikras grįžimas naujame pokalbyje atkūrė poreikį; cookie identifikuoja įrenginį, ne įrodytą žmogaus tapatybę. Pirmo grįžimo invalid provider JSON paliktas private api-preview-source.log; pataisa LOW thinking / didesnė išvesties riba ir saugus finish_reason kvitas. Pakartotas actual grįžimas PASS, ne naujas nematytas holdout.

Public chat → final transcript → actual Gemini analysis → independent review → Outbox → SMTP → exact INBOX PASS. Shared MailMessage dabar registruojamas prieš SMTP, išlaiko tą patį Case/thread ir nežinomų rezultatų nekartoja aklai. Savininko tikras Reply importuotas automatiniu IMAP worker; inquiry job succeeded, sugeneravo nepriklausomai reviewed atsakymą ir gavėjo INBOX patvirtintas. Kliento / agento private mail evidence leidžia tęsti bylą nekeičiant viešo finalizuoto chat.

**Turinio FAIL:** inquiry atsakyme duraSign Pad 5.0 nepagrįstai atmestas dokumentų rodymui vien dėl ekrano dydžio. Nepriklausomas AI reviewer klaidos nepagavo. Gamintojo [duraSign Pad 5.0](https://stepover.com/en/products/signature-pads/durasign-pad-5-0/) tiesiogiai pateikia document view; 4.3 apribojimas negali būti išplėstas 5.0. Originalus laiškas ir jo review kvitai išsaugoti, faktų vartas nepriskiriamas PASS pagal vien siuntimą.

Root cause pataisa: nišos conversation/sales procedūra reikalauja šaltinio ir neigiamiems techniniams teiginiams; bendras mail reviewer atskiria rodymą, skaitomumą ir PDF apdorojimą. Per-nišos server guard blokuoja šį nepagrįstą 5.0 atmetimą net jei reviewer pritarė. Tai siaura apsauga, ne universalus faktų tikrintuvas.

**Tikra regresija/patikslinimas PASS:** dvi actual Gemini Flash writer/reviewer užklausos parengė trumpą pataisą. Ji išsiųsta per tą patį shared Outbox ir Case, In-Reply-To į klaidingą laišką. Exact Message-ID rastas gavėjo INBOX. Aiškiai pripažintas perkategoriškas atmetimas; neskleidžiama patvirtinto programinio suderinamumo, kainos ar užsakymo fikcija. Pakartotinis helper vykdymas deduped ir nepadarė naujo modelio ar SMTP kvietimo. Laiškų gavimas nereiškia, kad klientas jau perskaitė patikslinimą ar atsakė į jį.

Private INBOX body hashes: pirmas postcall `08dbf8ab47b87101c74bb50733facc032c476ee083c1c23a7cec683226c2c2c6`; klaidingas inquiry atsakymas `2533a52f43b35fb042639e37fd818a82970b4d836db8421bd52f8d89d9909a18`; patikslinimas `ababbaac76d5118fea5fb05370c224e89d41e7bf66e7050c78c2a93ceccf84b4`. Raw mail, dialogai, adresai ir DB Git neperkeliami. Originalus owner-only HTML reply bandymas atskiras nuo šio automatinio public chain.

## Regresijos ir priėmimo matrica

Galutinis backend: **316 PASS / 155.61 s**; public core **63 PASS**, final build exit0; deployment dry-run ir actual **19 puslapių / medijos / HTTP PASS**. Proporcingi testai tikrina pilot fail-closed, originalaus modelio atmetimo guard, priimto laiško dedupe / stale reply / opt-out / contact-revision race / recipient allowlist / unreviewed draft rejection / tenant ribas. Jie modelį ir SMTP imituoja, todėl actual channel įrodymai nurodyti atskirai. Private logs: pytest-final-calibration.log, public-final-calibration.log, preview-final-resume-http-correct-base.log. Pirmas checker kvietimas turėjo trailing slash ir generavo // URL: jo 404 išsaugoti preview-final-resume-http-check.log, tai operatoriaus klaida, ne rendererio defektas. Pirmas tunelio atkūrimas timeout; tas pats owned tunelis pakartotas su IPv4 ir sėkmingai registruotas. Ankstesni praleisto failo, neteisingo PG porto ir provider bandymų FAIL išsaugoti.

| Vartas | Būsena ir ribos |
| --- | --- |
| Source/niša/approved knowledge | PASS šio checkpoint; source refresh per tikrą admitted HTTPS projekciją |
| Istorinis 6 train + 2 reserved Codex lab | PASS ankstesnio užšaldyto source; ne Gemini ir ne šio pataisymo blind sertifikatas |
| Actual typed Gemini chat, contact, memory | PASS išbandytai grandinei; nauji mokami kvietimai dabar budget-blocked |
| Actual postcall SMTP + inbox | PASS owner-only; ne visi klientai |
| Actual klientas Reply → automatic continuation → inbox | Transport PASS; pirmo tęsinio factual FAIL išsaugotas |
| 5.0 faktinės klaidos pataisa | Guard/unit ir actual corrective letter PASS; ne universalus quality PASS |
| Learning decision/adoption | Ankstesnis NO_CHANGE/no candidate; ši Git pataisa žmogaus/kodo agento, ne adaptive promotion |
| Naujas protected Gemini archetipų ratas | UNVERIFIED; mokamų kvietimų rezervas išnaudotas, istorinis corpus nekeistas |
| Actual įrašyto PCM/RTC/Gemini audio | Istorinis PASS 33.65 s; ne fizinis telefonas ir ne naujas pilot worker |
| Telefono mikrofonas/interruption/reconnect | UNVERIFIED; viešas SFU dar nesukurtas |
| Jev ON/OFF | UNVERIFIED; naujų paid calls neįjungta |
| Tiekėjai/kainų pasiūlymai/PDF/order | NA šio autorizuoto konsultavimo rato; realus pajėgumas neišgalvotas |
| Nuolatinis cloud/domeno paleidimas | UNVERIFIED; laikinas PC tunelis nėra pilnas hosting |

## Biudžetas ir likusios priklausomybės

Core konservatyvus lifetime/day rezervas **1.866 USD**, visa ši suma rezervuota; actual provider usage rate-card įvertis **0.492610 USD**, nėra tiekėjo sąskaita. Patikslinimo dviejų kvietimų observed **0.004291 USD**, rezervas **0.016 USD**. Treg istorinis **0.2438 USD**, papildomų diagnostikų planavimo allowance **0.01 USD**. Esamas šios dienos FX planavimo kursas 1.1206 USD/EUR ir būsimo pilot 0.10 EUR allocation duoda **1.9917 EUR** konservatyvią ribą. Nepanaudotos rezervacijos tyliai negrąžinamos vien daugiau bandymų paleisti. Google invoice / mokesčiai / trial kreditai nėra išmatuoti invoice įrodymai.

1. Būsimiems mokamiems chat/phone/kalibravimo kvietimams reikia naujos pagrįstos išlaidų autorizacijos arba įrodomo faktinės sąskaitos ir rezervacijų suderinimo. Dabartinis 2 EUR mandatas nedidinamas savavališkai.
2. Paruošti disposable Google SFU startup/create scripts: tik viena e2-small VM, 2 h max lifetime su DELETE ir disk auto-delete, 100 MiB egress quota, SSH per IAP ir public media TCP7881/UDP7882, be Google/SMTP/DB raktų. Script shell syntax/hash patikrinti Cloud Shell. **Neįvykdyti**: ankstesnis action-time security confirmation dėl public media access negautas. Cloud Shell autorizacija jau patvirtinta ir nekartojama; nauji IAM grants nedaromi.
3. Po leidimo ir budget sutvarkymo: VM actual startup/WSS/ICE, private keys į `.env` saugiu failo perdavimu, explicit per-site voice_pilot worker/deploy. Production M0 flag lieka nepakeistas iki tikro priėmimo. Telefonu patikrinti skambutį, LT garsą, pertraukimą, reconnect ir popup/save. Restrictive-network TURN dar neįrodytas.
4. Nuolatinis API/PG/jobs/SFU hosting, domain/DNS, production mail admission ir monitoring lieka atskiros faktinės priklausomybės. Native/tunnel bandymo nevadinti nuolatiniu cloud agentu.
5. Source perduodamas esamiems draft PR46/PR17, reviewed merge ir kito PC/runtime adoption dar neįrodyti. Journal entries upgrade-74f435d6 / upgrade-58469d71 / upgrade-d29a57e9.

## Atkūrimas

Pradėti canonical abiejų repo freshness --phase continue/handoff ir perskaityti actual Git instructions. Private `.env` / owner data lieka šiame PC. PostgreSQL data `runtime/artifacts/parasoplansetes-20261009/db`, port25443; FastAPI8853, preview5197. Naudoti savo `.venv` ir `scripts/start_site_preview.py --site parasoplansetes --port 5197`; jobs `python -m pinet_core.jobs`. Neatstatyti istorinio DB dump virš dabartinių laiškų. Naujam HTTPS tuneliui atnaujinti preview prepare CHAT_CORE_URL ir atlikti Wrangler dry-run/deploy/actual HTTP check. Nenaudoti seno automatinio delivery helperio, perrašančio istorines ataskaitas.

Papildomas private DB backup po actual laiškų: 291401 baitai, SHA256 `4b8de386a89bf7e1da33fafb320d387746fc3ccbcb346195c4b49d04358db4b9`, `artifacts/parasoplansetes-20261009/preserved-after-calibration-admin-20261009.dump`. Ankstesnis pre-reboot backup neperrašytas. Pirmi passwordless / least-privilege role dump bandymai atmesti ir išsaugoti; backup pavyko naudojant esamą private admin konfigūraciją, jokių naujų rolių/grant nesukurta. Patikslinimo helper pradžioje turėjo connection-dispose kito asyncio loop klaidą jau po SMTP; ji pataisyta, dedupe patikrintas ir antras laiškas nesiųstas.
