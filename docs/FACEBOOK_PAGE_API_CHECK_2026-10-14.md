# Oficialaus Page API inkremento patikra

2026-10-14, issue146 / PR135, own `codex/facebook-full-audit-20261014`. Bazė main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`; ankstesnis own HEAD `39cfc288ebd3eb875f6f55e6b295eb2dacc5dec5`. Viešo core sąsaja / schema nekinta; companion nenaudotas. Kitų checkout, svetainių, klientų DB ar procesų nekeista.

Rezultatas: įgyvendintas modulinis Page Graph v26.0 transportas ir vieno bandymo durable vykdytojas. Asmeniniam profiliui / grupėms liko esamas Computer Use tiltas. Nėra papildomo žmogaus patvirtinimo kiekvienam įrašui. Tikra Page prieiga, viešas API siuntimas, main merge, production adoption ir 24/7 procesas **UNVERIFIED**.

## Actual įrodymai

- Pirmas visas ASGI/DB/HTTP-Mock Graph kelias: **1 PASS, 1.90 s**, dar prieš papildomas formas / ataskaitą. Eilė → committed sending → vienas POST → provider ID → GET autorius/tekstas → published. `external_sending=false`.
- Pradinė API regresija: **27 PASS, 26.10 s**. Originalus Ruff FAIL: vienas nepanaudotas `timedelta`; importas pašalintas, slenksčiai nekeisti.
- Originalus mišrios kvotos FAIL: `test_browser_limit_includes_completed_api_attempts` gavo `claimed`, kai po API bandymo ir desktop limit=1 turėjo gauti `limited`. Ištaisyta bendra browser/API bandymų apskaita; pirmas FAIL išsaugotas šiame įraše ir upgrade finding.
- Pilna paveiktų rinkinių partija: **120 PASS, 131.63 s** — `test_facebook_page_api`, `test_facebook_browser`, `test_facebook_browser_extensions`, `test_facebook_audit`, `test_facebook`, `test_core`, `test_policy`, `test_codex_lab`.
- Workspace offline regresija: **3 PASS, 3.82 s**. Tai atskiras rinkinys, ne 120 dalis.
- Po galutinio API neaiškaus rezultato / dashboard lock tvarkos ir token scopes tikslinimo: **30 API PASS, 13.02 s**, scoped Ruff PASS. 120+3 yra partijos rezultatų suma; nereikalaujama jų laikyti 153 unikaliais testais kartojant API.
- Tikras localhost HTTP iš naujo own source: neautentifikuotas API GET **401**, autentifikuotas **200**, master/API disabled, API limit5, bindings0/jobs0. Verify be credential failo **503 facebook_page_credentials_unavailable**; worker **503 facebook_disabled**. Šie testai nesukūrė Meta užklausų ar įrašų. Privatus kvitas `runtime/artifacts/facebook-live-2026-10-14/page-api-http-smoke.private.json`.
- Skills struktūra / katalogo SHA / 25 esamos vietinės nuorodos ir visos naujos nuorodos PASS. Pirmas platesnis nuorodų patikrinimas aptiko du jau HEAD buvusius privačių istorinių JSON kvitų taikinius (`UI-CHECK.json`, `CLI-PROBE.json`), kurių šiame clone nėra; jie lieka UNVERIFIED, naujais įrodymais nepakeisti. Pirmas validatorius per sisteminį Python neturėjo PyYAML; tas pats canonical validatorius per esamą runtime venv PASS, naujas paketas nediegtas.

Izoliuoti testai naudoja restricted runtime DB / forced RLS atskiruose `test-*` environment, synthetic Graph MockTransport ir vieną privatų testinį PNG. Mock transportas už sim/test ribų atmetamas. Žali HTTP requestai, privatūs app ID, tokenai, socialiniai feed ir ekranai į Git nekelti.

## Audito matrica

| Sritis | Būsena | Konkreti patikra / riba |
|---|---|---|
| Oficiali Meta sutartis | PASS | Actual Chrome pirminiai Pages posts / comments / photos / Comment dokumentai; v26.0, multipart source ir scopes |
| Page / profilio / grupės atskyrimas | PASS | API tik owned Page; profilio/groups publishing API nėra |
| Operator / worker auth | PASS | Atskiri esami Bearer vartai; neautentifikuotos užklausos 401 |
| Site/env/RLS | PASS | Esamos forced-RLS lentelės; foreign job ID 404, scoped fixtures |
| Defaultoff / master pause | PASS | Tikras HTTP disabled; pause prieš permit atšaukia claim; pause po permit išsaugo vėlyvą receipt |
| Meta aktorius / programa | PASS izoliuotai | PAGE token tipas, app ID, `/me` Page ID; netinkami tipai/ID atmetami |
| Galiojimas / granular teisių apimtis | PASS izoliuotai | Expired/data expiry, wrong target grants, veiksmui trūkstamas scope atmetami; verify kvitas iki 24 h |
| Privačios paslaptys | PASS | SecretStr failas ignored artifacts, jokio tokeno DB/packet/error/INFO log; specialus debug_token log redaction testas |
| Fiksuotas išorinis adresas | PASS source | Tik HTTPS graph.facebook.com/v26.0, riboti paths, no redirects/proxy; paging.next nevykdomas |
| Nekintama peržiūrėta užduotis | PASS | Submitted input hash, body SHA, media SHA, contact/facts/instruction snapshot, API revision ir token thumbprint |
| Page tekstas / nuotrauka | PASS izoliuotai | Tikras HTTP form / multipart apdorojimas MockTransport, provider post/photo ID ir GET tikslus tekstas |
| Valdomo Page komentaras | PASS izoliuotai | Parent post prefiksas + Meta `from.id`; kitas autorius sustabdo prieš POST |
| Atsakymo parent | PASS izoliuotai | Pirminis comment ID yra tame Page post edge; receipt tikrina exact parent, max300 ID |
| Media pasikeitimas | PASS | Po queue pakeista PNG neįkeliama; bytes hash prieš POST |
| Vienas POST / idempotency | PASS | Pakartotinis worker idle / quota; pakeistas raktas 409; timeout / 5xx / missingID nepakartojami |
| Nežinomas rezultatas | PASS | `uncertain`, nenusenantis bendros paskyros užraktas; gyvas rezultatas null; explicit evidence resolution |
| Žinomas ID / nepavykusi GET patikra | PASS | `accepted` receipt patvarus, check-only veikia po pause; vienas POST išlieka |
| Bendras account epoch | PASS | API uncertainty blokuoja kitos nišos desktop; expired desktop lease blokuoja API; recovery neatlieka POST |
| Bendras 5 užduočių limitas | PASS | Abu transportai skaičiuoja abiejų bandymus, abiem policies reikia nustatyti5; originalus FAIL išsaugotas |
| Teksto / UI kokybė | PASS scoped / NA | Nauji techniniai dokumentai saviredaguoti; naujos produkto UI formos ar stiliai nekuriami, ankstesnė desktop/mobile patikra nepakeista |
| Tikras Meta tokenas / Page API | UNVERIFIED | Local runtime neturi credentials; katalogo Facebook ryšio nėra |
| Vieši FB API įrašai / komentarai | UNVERIFIED | Real external sends0; nėra provider live ID ar matomo paskelbto rezultato |
| Ankstesnis hosto įjungimo atmetimas | UNRESOLVED | Trys pre-execution blocked-by-policy atsakymai; deny detalės nepateiktos, jokių bypass / config override |
| Main / production / nuolatinis worker | UNVERIFIED | Scoped PR source nėra automatinis sujungimas, deploy ar scheduler aktyvavimas |

## Prieigos tyrimas ir likusi eiga

Treg `catalog_search/get` parodė Page post/photo/reply galimybes su 0 USD / call katalogo kaina ir savo ryšio poreikiu. `my_tools` Facebook ryšio nerado. Mokamų calls0. [Lineage2ai TOOLS](../sites/lineage2ai/TOOLS.md) atskiria katalogą, tiesioginį Graph pasirinkimą, limitus ir nežinomą verslo ekonomiką.

Actual Meta Developer UI perskaitytos esamos programos. Pirmame tinkamame pavadinimo kandidato app nėra Page use case; jo Add use cases dialogas siūlė tik app ads, todėl to neįjungėme. Kita patikrinta publisher app turėjo ads / Threads / WhatsApp use cases, ne patvirtintą Page prieigą. Tai nėra įrodymas, kad visose savininko programose nėra jokių teisių.

Paruoštas naujos `Pinet Page Publisher` programos vedlys su `Manage everything on your Page` paskirtimi; business portfolio pridėjimas atidėtas, trečiųjų verslų duomenų prieigos neprašoma. Programa / nauji persistent tokenai dar nesukurti. Galutinis kūrimas ir naujos Page API prieigos suteikimas reikalauja naršyklės įrankio numatyto patvirtinimo tuo veiksmu; tai nesukuria per-post approval modulio logikoje. Actual vedlio ekranas privatus.

Po tikros minimalios Meta prieigos: privataus credential failo prijungimas → verify → įjungimas per įprastą leidžiamą master/API kelią → pirmas jau autorizuotas tekstas → vienas run-once → provider ID / GET / matomas FB rezultatas → pause. Ankstesnė hosto įjungimo klaida lieka atskira ir neapeinama kitu transportu. Jei ji pasikartoja, neįrašyti fiktyvaus live PASS.

Upgrade IDs: `aeaa2ac8-6c85-47e3-81a7-6373e9a829b8` oficialiam Page transportui; `06e6ba33-e9fb-4262-9576-ed0531b68e1d` bendrai kvotai. [Runbook](../agent-business-core/FACEBOOK_PAGE_API.md) aprašo įjungimą, check-only ir scoped rollback.
