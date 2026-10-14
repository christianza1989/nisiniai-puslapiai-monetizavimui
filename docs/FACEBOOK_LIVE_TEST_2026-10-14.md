# Ribotas Facebook gyvas bandymas — 2026-10-14

Savininkas užsakė penkis rankiniu Codex desktop vykdymu atliekamus veiksmus nišai `lineage2ai`: Page įrašą, grupės paiešką, Page komentarą, asmeninio profilio įrašą su AI vaizdu ir profilio komentarą. Atskirai patvirtino penkių užduočių limitą bei pirmą viešą Page tekstą. Vėliau aiškiai delegavo įprasto turinio / kanalo patikrą ir vykdymą be žmogaus patvirtinimų kiekvienai užduočiai. Tai yra šio bandymo autorizacija, ne nuolatinio scheduler, kitų verslų ar DM įjungimas.

## Faktinis rezultatas

Visas gyvas priėmimas neužbaigtas. Realių Facebook postų ir komentarų paskelbta **0**; nėra jų provider receipt. Dvi scoped localhost aktyvavimo komandas prieš vykdymą atmetė Codex automatinė komandų saugos patikra. Po atmetimų read-only API patikra parodė abi live policy išjungtas, neįrašytus realių paskyrų binding ir nepradėtą eilę. Platesnis savininko mandatas nepanaikina host tool atmetimo. Jo neapeita kitu shell, DB, kita niša ar tiesioginiu publikavimu už modulio eilės. Naujo patvirtinimo kiekvienam postui neprašoma.

| Užsakytas veiksmas | Būsena ir įrodymo riba |
| --- | --- |
| Page bandomasis įrašas | BLOCKED: host aktyvavimas atmestas; nebuvo submit / FB receipt. |
| Grupių paieška per modulį | INCOMPLETE: actual Facebook search UI rasta vieša teminė grupė. Skaitymas atliktas už neįjungtos eilės ribų, todėl modulio discovery receipt ir viso kelio PASS nėra. |
| Page komentaras grupėje | UNVERIFIED: matomas Join, Page dalyvavimo / komentarų composer teisė ir actual taisyklės nepatvirtintos. Komentaras nesiųstas. |
| Profilio įrašas su AI vaizdu | BLOCKED live; actual vietinis image chooser → peržiūra → permit → vienas click → UI / backend receipt PASS, `external_sending=false`. |
| Profilio komentaras | UNVERIFIED live; konkretaus parent / comment ID kontraktas ir kvitas patikrinti izoliuotuose backend testuose. |

Atmetimo pranešimas pateikė tik bendrą „blocked by policy“, konkretesnės taisyklės neatskleidė. Tai nėra Facebook klaidos diagnozė ar modulio žmogaus approval būsena.

## Įgyvendintas kelias be per-task žmogaus patvirtinimo

Įjungtoje autorizuotoje aplinkoje Codex pats patikrina tekstą, faktus, paskirties vietą ir kanalo sąlygas; `review_note` išsaugo patikrą. Įrašas / komentaras pereina ready → claimed → submitting → visible / moderation. Grupių paieška pereina ready → claimed → searched be submit permit. Publisher / policy / facts / instrukcijos / media / group proof yra nekintamo task snapshot dalis. Pasikeitęs kontekstas atmetamas, vienas permit riboja galutinį click, neaiškus siuntimas užrakina account iki check-only sutikrinimo. Nėra `awaiting_approval` žmogui ar kiekvieno teksto patvirtinimo mygtuko.

Komentaras susietas su konkrečiu parent URL ir tikru comment ID. Grupės prieigos įrodymas galioja konkrečiam Page arba profiliui, daugiausia vieną dieną, ir užfiksuoja tos grupės taisyklių / prieigos patikrą. Paieška registruoja daugiausia tris minimalias grupių metadata; negali join, komentuoti ar rinkti žmonių / raw feed. Vienas timeline vaizdas registruojamas privačiai, tikrinamas formatas, ribos, SHA256 ir actual browser preview. Seno v1 post replay paliktas suderinamas.

## Actual vietinis vaizdo bandymas

Savininko užsakytas originalus AI fantasy fan art sukurtas built-in ImageGen. Tai iliustracija, ne oficialus Lineage II screenshot. PNG 1254 × 1254, 2 719 991 bytes; prompt, originalas ir SHA256 išsaugoti privačiuose ignored artifacts. Jokio paid third-party fallback nenaudota.

Chrome chooser bandymas sustojo dėl ChatGPT extension „Allow access to file URLs“ trūkumo; platesnis leidimas savarankiškai neįjungtas. Palaikomas Codex in-app browser vieno failo chooser įkėlė tik tą patį PNG į isolated `test-*` loopback fixture. Actual preview peržiūrėtas; viena permit / click eiga užbaigta 2026-10-14 apie 14:07 UTC. UI ir backend rodo visible su fixture permalink, `external_sending=false`. Pirmas pasenęs Observation buvo atmestas iki permit / click; atnaujinta galiojanti lease ir šviežia UI patikra. Tai nėra tylus išsiuntimo retry.

## Regresija ir perdavimas

- 93 PASS: browser extensions / browser / Facebook / audit / workspace / core / policy / Codex lab bounded pytest paketas, 44,78 s.
- Scoped Ruff PASS. HTML static detector ir actual desktop/mobile patikra registruojami [UI patikroje](FACEBOOK_BROWSER_UI_CHECK_2026-10-14.md).
- Izoliuoti testai apima netinkamą media hash / failo pakeitimą / kelią, grupės kito autoriaus / pasikeitusių taisyklių proof, tikslų parent / comment kvitą, read-only discovery ir draudžiamą permit, idempotency bei ready → claimed be žmogaus approval.
- Pradinis HTML detector FAIL dėl tuščio img be src pataisytas: img kuriamas tik pasirinkus tikrą failą. Actual hidden label defektas išsaugotas ir pataisytas; pakartotinė vizualinė patikra atlikta.

Source: scoped [issue142](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/142), [PR135](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/135), own branch `codex/facebook-full-audit-20261014`. Fresh main SHA `7af6b9641012a30c5f95eac38a66daeff8f8cb39` yra šakos bazėje; companion šiam private runtime pakeitimui nenaudotas. PR / main merge / kito PC adoption ir actual Facebook publication vertinami atskirai. Raw paskyrų duomenys, capability / operator / worker secrets, DB, PNG ir ekrano įrodymai lieka ignored runtime artifacts; Git ataskaita sanitizuota.

Nuosavas Docker konteineris ir preview procesai užbaigiami išsaugant nuosavą persistent DB volume bei įrodymus. Kitų agentų checkout, DB, procesai ir vartotojo Facebook tab nepakeisti. Live modulis neįjungtas, todėl neribotas background darbas nepaliekamas.

## Papildoma atmetimo diagnostika pagal savininko tęsinį

2026-10-14 patikrintas tik šio pokalbio actual session transcript, aktuali lokali config ir šio pokalbio / atmetimo laiko programos žurnalai. Credentials, cookies, privatūs pokalbiai ir visos originalios shell komandos į report / Git nekopijuojami. Source patikra atlikta iš `0020d560fb37417f4321686cb4deeb7300732301`, fresh main nepakito.

- Abu tikri atmetimai užfiksuoti 13:28:05 ir 13:30:46 UTC (16:28:05 ir 16:30:46 Europe/Kiev). Įrankis grąžino `CreateProcess ... Rejected ... blocked by policy` prieš proceso vykdymą. Todėl šių komandų HTTP pakeitimai nepasiekė mūsų modulio; tai nėra Facebook API / login / core CAS klaida.
- Tų actual turn konfigūracija: `approval_policy=never`, `approvals_reviewer=user`, `sandbox_policy=danger-full-access`, permission profile disabled. Ankstesnis įvardijimas kaip standartinio Auto-review buvo nepakankamai pagrįstas; išsaugotas istorijoje ir šiuo įrašu patikslintas. [Oficiali dokumentacija](https://learn.chatgpt.com/docs/sandboxing/auto-review) aiškina, kad standartinis Auto-review veikia su interaktyviu approval policy. Šių duomenų neužtenka nustatyti papildomo host gate vidinę taisyklę.
- Lokali config neturėjo explicit approval_policy / approvals_reviewer / guardian_approval / guardianv2 / custom auto_review policy; projekto ir global vartotojo patikroje tokio atmetimo paaiškinančių rules / hooks nerasta. App žurnale buvo techninis pranešimas, kad thread-owned Guardian context always enabled; jis savaime neįrodo konkretaus atmetimo priežasties. Programos ir scoped runtime log nepridėjo risk / user-authorization / rationale / deny-rule duomenų. Tiksli rizikos klasifikacija lieka UNKNOWN.
- Projekto HTTP autentifikacija ir worker bridge grąžintų HTTP būseną / `desktop_bridge_http_*`, jei užklausa pasiektų serverį. Tai skiriasi nuo stebėto CreateProcess atmetimo. Codex / managed policy, autentifikacija ir naršyklės saugos leidimai nepakeisti; kitas transportas ar tiesioginis FB submit už neįjungtos eilės nenaudotas.

Praktiškai užbaigta nepriklausoma skaitymo patikra: pasirinktos viešos grupės About aprašymas leidžia temines nuotraukas / video / serverių pristatymus. Asmeniniam profiliui actual UI matomas editable `Comment as Christian`, Page actual AX matomas settable `Comment as Lineage2ai.com` ir tuščio teksto disabled Post comment. Tuo pat metu matomas Join group, todėl ankstesnė prielaida, kad Join savaime atmeta komentavimą, netinka. Ši patikra įrodo composer pasiekiamumą, ne sėkmingą siuntimą, moderavimą ar Meta automatizavimo teisę. Formose nieko neįvesta ir neskelbta; pradinis profilis atkurtas. Trumpas Chrome DOM helper timeout pašalintas naudojant dokumentuotą browser AX alternatyvą, be CDP / cookies / hidden runtime workaround.

Sanitizuotas diagnostikos kvitas ir tuščios Page komentaro formos ekranas saugomi ignored runtime artifacts. Pilnas live testas ir host atmetimo pataisa **neužbaigti**: nėra išviešintos taisyklės, kurią būtų galima pagrįstai pataisyti šiame repo, ir nėra palaikomo agentui prieinamo šio atmetimo override. Naujas žmogaus patvirtinimas neprašytas. Paaiškinimo / canonical diagnostikos pataisa nėra saugos gate pašalinimo ar Facebook publikavimo PASS.

## Savininko paprašytas pakartotinis bandymas

Po savininko pateikto Browser permissions ekrano ir tiesioginio „gal vėl pabandyk“ 2026-10-14 16:11:35 UTC (19:11:35 Europe/Kiev) pakartota ta pati ankstesnė ribota penkių užduočių įjungimo komanda per įprastą `exec_command` patikrą. Nekeistas transportas, host policy, approval režimas ar autentifikacija. Komanda trečią kartą atmesta prieš proceso paleidimą su tuo pačiu `CreateProcess ... rejected: blocked by policy`. Read-only actual localhost API po atmetimo: module enabled=false, browser enabled=false, bindings=0, jobs=0. Naršymo / downloads / full CDP nustatymų ekrane nematyti konkrečios šio shell atmetimo taisyklės; jie nėra jo pašalinimo įrodymas.

Paties modulio įjungimo ir browser vykdymo regresija pakartota izoliuotais ASGI / `test-*` duomenimis: `pytest tests/test_facebook_browser.py tests/test_facebook_browser_extensions.py -q` — **40 PASS, 24,02 s**. Ji apima policy įjungimą, autentifikaciją / tenant ribas, Page / profile queue ir receipt, komentaro / grupės proof ir vaizdo tikrinimą. Gyvas Facebook siuntimas šioje regresijoje neįmanomas. Šis bandymas projekto defekto neparodė ir neatstoja realaus FB post / comment kvito. Tikri paskelbimai lieka 0; nuosavi preview procesai užbaigti, private DB volume ir diagnostikos kvitas išsaugoti.
