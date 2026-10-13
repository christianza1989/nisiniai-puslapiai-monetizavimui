# Promedical straipsnių publikavimo pauzė

Savininkas 2026-10-13 paprašė laikinai pristabdyti naujų straipsnių publikavimą tik šioje svetainėje. Pauzės riba: 2026-10-13T19:26:54.000Z. Du iki tol paskelbti gidai lieka vieši; 55 suplanuoti gidai lieka parengti ir nerodomi net pasibaigus jų pradinėms datoms.

Vienintelis bendras publikavimo filtras taiko svetainės gidų laiko ribą iš config/niche-network.json. Puslapių tekstai, approval/revisionHash, originalios datos, produktai ir kitų svetainių publikavimas nesikeičia. Tas pats filtras valdo HTML, schemas, sitemap, LLM išvestis, vidines ir tarp svetainių nuorodas bei medijos prieigą. Compiler atmeta nepažįstamą siteId ir netaisyklingą ribos laiką.

Patikra: esami ir nauji core/link/cache testai; faktinis būsimos datos RSC atvaizdavimas; visų 10 svetainių SEO smoke; vietinės ir gyvos Promedical 57 gidų būsenos bei eksporto ir katalogo kontrolė. Įprastas build ir Cloudflare versions diegimas išsaugo esamus bindings/routes/secrets/CPU/date. Jokio naujo laikmačio ar papildomų išlaidų.

Atnaujinimas vykdomas tik gavus savininko prašymą. Jei pradinis grafikas jau bus praėjęs, prieš pašalinant pauzę naujai suderinti likusių gidų publikavimo datas per patvirtintą turinio eigą; vien nuėmus ribą praeityje suplanuoti tekstai pasirodytų kartu. Senesnių vietinės studijos tekstų neimportuoti vietoj dabartinių perrašytų gidų. Istoriniai kalendoriai ir patikros kvitai išlieka.

Core upgrade: upgrade-ec4be78a-eafa-45ee-90c7-ac9d3ad112ae; public PR28 / core PR53.

Baigta 2026-10-13T19:39:19.588Z: pauzė įjungta ir patikrinta gyvoje svetainėje. Naujas kvitas verification-20261013/publication-pause-v1.json; originalus paketas ir ankstesni kvitai neperrašyti.
