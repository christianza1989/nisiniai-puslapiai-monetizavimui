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

## Vėlesnis užbaigtas gyvas testas —2026-10-14 apie19:28UTC

Toliau pateiktas naujas etapas pakeičia dabartinę būseną, išlaikant visą ankstesnių nesėkmingų bandymų istoriją aukščiau.

### Naujo etapo įrodymai

2026-10-14, own `codex/facebook-full-audit-20261014`, issue142 / PR135. Savininko mandatas: penkios rankinės užduotys, tada pause. Jokio periodinio worker ar klientų duomenų rinkimo.

## Dabartinis rezultatas

- Page API įrašas: **PASS actual**. Vienas Graph POST, patvarus provider ID, GET tikslus Page autorius / tekstas, actual Facebook UI tas pats įrašas ir Public žyma.
- Computer Use grupės paieška: **PASS actual**. Modulį atstovaujantis Codex gavo read-only užduotį, actual Facebook Search rado vieną viešą Lineage2 grupę ir išsaugojo tik root metaduomenis.
- Page grupės komentaras: **SUBMITTED / PENDING_MODERATION actual**. Vienas submit permit ir vienas Post comment. Facebook paaiškinimas: pirmą kiekvieno dalyvio komentarą grupės administratoriai peržiūri prieš rodydami kitiems; tapimas nariu šios peržiūros nekeičia. Provider comment ID dar nerodomas. Komentaras nekartojamas, viešo matomumo PASS nėra.
- Profilio įrašas su AI vaizdu: **PASS actual**. Tikslus tekstas, Public auditorija ir nekintama vietinė iliustracija patikrinti. Chrome file chooser iš pradžių grąžino konkrečią trūkstamos Allow access to file URLs prieigos klaidą. Savininkas patvirtino pakeitimą; chrome://extensions įrankio protokolo atmetimas neapeitas. Savininkui rankiniu būdu įjungus jungiklį, įkėlimas pavyko. Actual Next→galutinė peržiūra→vienas permit→vienas Post→„Your post has been published“, tikras profilio permalink, Public ir AI caption / vaizdas.
- Profilio komentaras: **PASS actual**. Iš Christian Za profilio paskelbtas vienas komentaras po jo paties nauju viešu AI įrašu. Actual autorius / tikslus tekstas / real comment ID / timestamp permalink ir serverio visible kvitas.

Page komentaras po pradinės moderavimo būsenos **PASS actual visible**: po pause atliktas tik read-only patikrinimas iš asmeninio profilio. Matau tą patį Page autorių, tekstą, tikrą comment ID / permalink, reakciją ir parent autoriaus atsakymą. Atsakymas nėra kliento užklausa; papildomas reply nesiųstas.

2026-10-14T19:26Z normalūs master/API/browser pause HTTP200. Visos penkios job užduotys išliko, bendri quota records5 (API1 + desktop4), priimti tikri išoriniai veiksmai4; discovery nėra send. Po pause external_sending=false; jokio nuolatinio worker / automatinio pakartojimo. Tikrų provider ID / asmens duomenų šis Git dokumentas nekopijuoja.

Privatūs kvitai, screenshot ir credential failai lieka ignored runtime artifacts; jų turinys, tokenai ir socialinio įrašo žalias turinys į Git nekeliami.

## Bendros spragos ir prasminga regresija

`upgrade-442058cf-c49f-4682-bc4e-fdd0c8783f0d`: pirmo komentaro moderavimui Facebook nerodo provider comment ID. Originalus atkūrimo testas gavo422 `extra_forbidden moderation_notice`. Naujas aiškus `facebook_admin_review` kvitas leidžia tik grupės exact parent URL / provider parent ID, current actor/body/tab stebėjimą ir jau suteiktą submit permit; būsena lieka pending_moderation. Visible vis dar reikalauja tikro comment ID / permalink. Wrong parent / fake query / visible withoutID atmetami; late knownID visibility ir kitos paskyros užduoties lease tikrinami. **72 PASS,55.56s** browser/browser_extensions/Page API rinkiniams ir scoped Ruff PASS.

`upgrade-7c072f48-9736-494e-a14f-99fc075cc7ad`: po tikro API įrašo master skydelis vis dar rodė static not_connected / zero sends. Planas prieš pakeitimą: parodyti ryšio patikros galiojimą atskirai nuo transporto policy ir master pause; suskaičiuoti tik provider accepted / visible / pending real kvitus, nepaversti jų gauta paklausa. Išlaikyti esamą16px system-ui status rolę / kontrastą / responsive; patikrinti actual desktop ir320px ilgo connected/paused teksto vaizdą bei enlargement. Pirmas FAIL, galutinė regresija ir UI įrodymai pridedami po pataisos.

Status testas pirmiausia gavo `not_connected != api_verified`. Po pataisos isolated positive, pause, expired binding, fixture/uncertain netraukimo ir demand0 testas PASS. Tikras localhost po perkrovimo patvirtino Page api_verified, abi siuntimo galimybes išjungtas per master pause ir accepted real count4.

Galutinė paveiktų Facebook/API/browser/audit/core/policy/Codex Lab rinkinių partija: **125 PASS,101.07s**, scoped Ruff PASS. Po istorinio resume reason pateikimo sutvarkymo pre-submit/post-permit resume patikra **2 PASS,2.50s**; pakartotiniai testai nepridedami kaip nauji unikalūs testai. Skills hash ir27 vietinės nuorodos PASS, du ankstesni privatūs kvitų taikiniai išlieka UNVERIFIED.

Galutinio statuso UI patikra: actual localhost1365×900 ir320×900, Page verify patvirtintas, master/API/browser paused,4 siuntimai,0 realių poreikių, undefined audit teksto nebėra. Status rolė16px/24px system-ui, rgb82/98/119 ant balto fono, mobilus status241px pločio, document scrollWidth305≤320, clipping/overlap nerasta. Keyboard Control+plus bandymas nepakeitė devicePixelRatio/innerWidth, todėl tikras200% browser zoom **UNVERIFIED**, nepervadintas viewport patikra. Fontai/stiliai nekito; laikini viewport override atstatyti.

Savininko vėlesniu pavedimu sukurtas [setup skill](../SKILLS/facebook-bot-setup/SKILL.md), [Meta connection reference](../SKILLS/facebook-bot-setup/references/meta-page-connection.md) ir [pilnas system entrypoint](../agent-business-core/FACEBOOK_SYSTEM.md). Skill/pakeisto acquisition frontmatter validacijos PASS; installer portable idempotency/preserved-copy testas1PASS. Actual naujas facebook-bot-setup įdiegtas kaip junction į own Git source; keturios jau esančios kitų core skills kopijos išlaikytos ir praneštos, neperrašytos. Active sesijos instrukcijos ir kitų PC įdiegimas nesikeičia automatiškai.

Autoriaus praktinė instrukcijų peržiūra: naujas Page→API su minimaliais persisted scopes ir real verify; profilis/vaizdas→desktop/chooser, ne Page API; pending beID→moderation kvitas, ne išgalvotas visible; API timeout→lock/check, ne POST retry; expired pre-permit→reconcile/explicit resume, po permit resume draudžiamas; du PC su atskiromis DB→nėra bendro lock; like request→ši eilė nepalaiko, nevadinti comment reakcija. Tai paties autoriaus scenarijų pritaikymas ir source patikra, ne nepriklausomas kito AI bandymas ar papildomas live postas.

`upgrade-e48965d5-9c0b-4de5-8239-5e4f9f40eeec`: privalomam extension handoff užsitęsus, nepradėtas image job lease baigėsi, original renew409 `facebook_stale_account_lease`. Actual composer teberodė nepaskelbtą tekstą; jokio submit permit / attempt / receipt nebuvo. Esamas normalus operator reconciliation→naujas explicit resume tai pačiai job→fresh epoch/token→vienas vėlesnis actual submit. Resume po bet kokio permit atmetamas, foreign job404, stale capability409, quota charge lieka1. Šių dviejų atvejų ir statuso testo partija **3 PASS,3.83s**, scoped Ruff PASS. Originalus expiry lieka reconciliation ir journal istorijoje.

Ankstesni trys pre-execution host atmetimai lieka istorijoje be pateiktos konkrečios rizikos priežasties. Šiame tęsinyje normalūs master/API/browser HTTP policy veiksmai200; jokių DB approval overrides, kitos nišos kelio ar išorinio publikavimo už eilės.

Main merge, produkcinis deployment ir24/7 autonomija nėra šio rankinio testo PASS.
