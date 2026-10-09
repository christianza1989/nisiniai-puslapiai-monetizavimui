# Priėmimo matrica ir perdavimas

Pavedimui sukurti pokalbių agentą taikyti [create-and-calibrate](create-and-calibrate.md): prijungimas, baseline, klaidų pataisos / pakartojimai, protected patikra, autonomijos ir actual kanalų vartai yra vieno pavedimo dalys. Atskiro kalibravimo prašymo nelaukti; deklaruotą priėmimą grįsti šiomis eilutėmis.

Numatytoje sukūrimo apimtyje tikras browser balsas, contact popup/save, postcall reviewed email siuntimas/gavimas ir reply tęsinys būtini, nebent savininkas aiškiai susiaurino pavedimą. Nepakankamas kodas nėra NA pagrindas: tęsti įgyvendinimą, o tikrą išorinę priklausomybę žymėti konkrečiai UNVERIFIED. Prekybos/PDF/tiekėjų vartai pagal nišos actual modelį ir mandatą.

Ataskaitoje kiekvienai nišai nurodyk testuotą apimtį ir šias atskiras eilutes su PASS / FAIL / UNVERIFIED / pagrįstu NA, case/run nuoroda ir source SHA. Nesumaišyk skirtingų etapų į vieną „sukalibruota“.

| Tikrinama | Pakankamas konkretaus vartų įrodymas |
|---|---|
| Core + niša / source | Actual compose fragments/hash, site/host, approved current knowledge, admission ir policy |
| Dialogas / poreikio pataisa | Chronologiniai kliento/agentų įvykiai, taisyta need revision, naudinga konsultacija ir next step |
| Kontaktas pokalbio metu / po jo | Tool receipt, atskirai `shown` ACK, atskirai server save; jau išsaugoto kontakto nekartoja |
| Atsisakymas / phone-only | Pagalba be prievartinio kontakto; nežada neveikiančio pristatymo kanalo |
| Atmintis / nutrūkimas | Tikras cookie/tenant ryšys, klientui leidus; nauja sesija mato ankstesnį kontekstą, nepainiota tapatybė |
| Postcall | Final transcript iki analysis; faktams / pažadui tinkamas reviewed draft, quality su actual evidence IDs |
| Laiško siuntimas / gavimas | Atskiri reviewed outbox, SMTP Message-ID ir matching inbox receipt; retry/dedupe / ambiguous būklė |
| Kliento laiškų tęsinys | Reply tas pats site/case/thread; per brangu / pakeitimas / atsisakymas / patvirtinimas / tyla tik pagal actual worker |
| Tiekėjo darbas | Tikra paieška/šaltinis ir actual mandato kvitai; kalba, kainos/delivery/tax palyginimas; draft nėra išsiuntimas |
| Pasiūlymas / sąskaita | Tipizuota klientui mūsų kaina ir antkainio skaičiavimas, be neleistinų konkurento nuorodų; current acceptance, actual profesionalus PDF |
| Quality patikimumas | Kritinių klaidų detekcija pagal faktus/kvitus; evaluator nesutarimas / false-positive išsaugotas |
| Mokymasis | Issue → candidate → protected paired complete eval → griežtas pagerėjimas arba pagrįstas rejection |
| Adoption / rollback | Naujas actual claim release, seno pokalbio snapshot, other-tenant nekinta, exact rollback/restore |
| Jev ON/OFF | Ta pati užšaldyta įvestis, actual provider/fallback/stale ir elgesio / delsos / sąnaudų palyginimas |
| Tikras balsas | Realūs mikrofono PCM/RTC/provider, tool ir browser receipts, LT transkriptas, pertraukimas/reconnect; akustinės ribos |
| Paleidimas | Realus domenas, HTTPS, veikiantis API/DB/SFU/jobs, secret/runtime/privatumo konfiguracija ir monitoring |

`network_lab.py` leidžia tekstinį Codex+ASGI kelią ir imituoja popup ACK. Native Gemini RTC bandymų kvitai, browser UI, background HTTP ir tikras inbox gavimas yra papildomi skirtingi įrodymai. Tekstinis „Gemini prompt“ nesuteikia Gemini audio PASS. Nepilnas transkriptas gali slėpti prarastą kliento kiekį, matmenį ar paskutinę repliką; vertink garso/transkripto atitikimą, ne vien įvykių buvimą. Esamas paleidimo kodas ir jo nesujungti PR: [handoff](../../../docs/AGENT_CALIBRATION_HANDOFF_2026-10-08.md).

## Minimizuotos ataskaitos formatas

Sukurk `sites/<siteId>/AGENT-CALIBRATION-<date>.md` savo Git šakoje; jei privati pirminė medžiaga neleidžia kelti į Git, joje palik tik šį minimizuotą rezultatą. Kiekvieną originalų vykdymą išlaikyk, pataisytą run įrašyk atskirai.

```text
siteId / canonical_host / laikas ir timezone
deklaruota apimtis, kanalai, aiškiai nebandyti vartai
core ir companion commit; actual model/SDK; policy/admission
core/role/niche/adaptive/evaluator/corpus/knowledge hash
archetipai / case IDs / train-holdout kilmė / pakartojimai
originalus run: užbaigta iš planuotų, PASS ir FAIL atskirai
kritinės klaidos ir jų receipts; coverage / timeout / STT / evaluator ribos
intervencijos: kas keitė kodą, faktus ar instrukcijas; neperkeltas baseline
candidate: parent/diff hash, protected results, decision ir priežastys
adoption / rollback / sesijos stabilumas / tenant izoliuota
Jev pora: actual calls, delsa, sąnaudos, rezultatas
laiškai/PDF: klientui rodoma kokybė, mūsų kaina, actual send/receive vartai
matrica: kiekvieno vartų statusas ir minimizuota evidence nuoroda
naudojimas/sąnaudos, palyginimo ribos ir tęstinumo priklausomybės
Git PR / merge būsena / naujo PC atkūrimo komandos
```

Saugūs Git duomenys: fiktyvūs `.example` klientai, atkūrimo scenarijai, kodo testai ir anoniminiai klaidos aprašai. Privati pirminė medžiaga: tikri email/telefonai, transkriptai, audio, `.eml`, provider sąskaitos, `.env`, runtime DB, aktyvios individualios release ir private instruction artifacts. Vien vardų pašalinimas laisvo teksto neanonimizuoja. Ataskaita gali nurodyti private artefakto tipą / minimizuotą hash, bet neprivalo perkelti jo į Git ir neteigia, kad naujas clone tą failą turės.

Pajamų rodikliai vertinami atskirai: tinkama užklausa, kliento patvirtinimas, apmokėjimas, faktinės išlaidos ir indėlis. Sintetinis pasiūlymo priėmimas, premijos tekstas ar modelio 5/5 nėra komercinės sėkmės įrodymas. Mokymosi svoriai šiame mechanizme nesikeičia; keičiamos versijuotos leidžiamos elgesio instrukcijos.
