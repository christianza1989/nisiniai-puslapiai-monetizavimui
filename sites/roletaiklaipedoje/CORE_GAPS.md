# Bendro core spragos ir tikros pataisos

Izoliuota bazė private8653b48/public37208b8. Kitų nišų patvirtintos revizijos nekinta.

| ID | Reprodukcija ir pataisymas | Įrodymas |
|---|---|---|
| G01 | ignore-user-config be model/effort neleido vykdyti pasirinkimo. Explicit writer env/argv ir faktinis CLI header kvitas; mismatch stabdo, jokio fallback. | writer-execution.test;11 actual Luna/xhigh complete ir2 failed WRITER_RUNS išlaikyti. |
| G02 | Savaitinis režimas ribojo planą. Atskiras coverage leidžia dependency-ready same-day, įtraukia šiandieną; batch limit nėra redakcinė kvota. | coverage-schedule35 same-day, UI/config/autopilot. |
| G03 | LLM praleido home body; aklas legacy viso body eksportas atskleistų nerodomą tekstą. Optional pasirašytas V1 home-only bodyProjection canonical abiejuose validatoriuose/schema/hash; legacy hash/summary nekinta. | Hash parity, tamper, canonical/legacy reading ir own full HTML/LLM. |
| G04 | Antra studijos instancija atkūrė gyvą writer kaip failed. Hostname/PID owner saugo gyvą procesą; stale atkuriamas po exit, EPERM konservatyvus. | Tikras second-process job-owner bandymas ir original failure kvitas. |
| G05 | Node fetch ignoravo virtual Host, inline parser kūrė klaidingus tarpus. Native bounded HTTP/HTTPS ir tiksli inline concat/block separator analizė. | Host fixture, Python10, istorinis before ir final clean rendered. |
| G06 | Bet koks nonempty audit version buvo priimamas. Computed actual sorted source SHA fingerprint privalo sutapti. | Changed-source regression, SOURCE_BINDING ir final SITE_COMPLETION. |
| G07 | Formos verifier buvo hardcoded tractor. Explicit tenant/base/source, canonical guard ir exact UUID cleanup; legacy default išlaikytas. | Actual roletai9 scenarios/D1/consent. |

Savos browser pataisos atskirai: mobile word space, TOC prieš prose DOM ir desktop column2, keturių gidų indekso tekstas, About literal Markdown brackets. Jos neperkelia kitų nišų turinio.

R2 ir S2: tikras 200 % naršyklės mastelis nepatvirtintas. U3: pažymėtas laiškas rastas INBOX.Junk, o ne INBOX; SPF/DKIM/DMARC praėjo, pašto filtravimo nustatymai nekeisti. Pristatymo priežastis nenustatyta. Production legal/host/D1/rate/recovery/retention/processors/CWV ir demand vartai atskirai neįrodyti. Jokių site-ID LLM išimčių, suklastotų kvitų ar tylaus modelio pakeitimo.
