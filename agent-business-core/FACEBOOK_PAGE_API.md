# Facebook Page publikavimas per oficialų API

Aktualus visos sistemos prijungimas: [FACEBOOK_SYSTEM](FACEBOOK_SYSTEM.md), [setup skill](../SKILLS/facebook-bot-setup/SKILL.md) ir [Meta Page/token eiga](../SKILLS/facebook-bot-setup/references/meta-page-connection.md). Vėlesnis tikras own-Page tekstinis POST/GET ir matomas Public įrašas priimti2026-10-14; photo/comment/reply API formos šiame gyvame teste atskirai nevykdytos. Visos policies po penkių užduočių paused; source nėra production/24/7 adoption.

2026-10-14, issue146 / PR135. Įgyvendinti Page tekstai, viena nuotrauka, komentarai po valdomo Page įrašais ir atsakymai į pirminius komentarus. Vykdomas Graph v26.0. [Izoliuota patikra](../docs/FACEBOOK_PAGE_API_CHECK_2026-10-14.md) nėra realios Meta prieigos ar viešo publikavimo įrodymas. Asmeninis profilis ir grupės lieka [Codex Computer Use](FACEBOOK_BROWSER_WORKER.md).

Agentas pats peržiūri turinį pagal savininko pavedimą ir saugo `review_note`; žmogaus patvirtinimo kiekvienam įrašui nėra. Bendra FB politika ir atskira Page API politika turi būti įjungtos. Naujos nišos lieka išjungtos. Platformos teisių ar hosto atmetimo įjungimas nepakeičia.

## Prieiga ir konfigūracija

Reikalingas konkrečios savininko valdomos Meta programos Page access token ir programos access token diagnostikai. Programos egzistavimas, Page administratoriaus UI ir Business Manager asset ID nėra Graph teisių įrodymas. `debug_token` tikrina PAGE tipą, programą, galiojimą ir granular Page scope; `/me` patvirtina tikrą Page ID. Meta programos access lygis / App Review ir žmogaus Page užduotys yra atskiros platformos sąlygos.

Actual Meta programos Pages leidimų sąsaja 2026-10-14 pateikia `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `pages_read_user_content`; komentarams / atsakymams trys pastarieji be `pages_manage_posts`. Page įrašų gide tuo metu buvo nesutampantis pavadinimas `pages_read_user_engagement`; jo negalima tiesiog reikalauti iš tokeno, kai reali platforma suteikia `pages_read_user_content`. Nepriklausomo literal scope testo originalus403 išsaugotas. Teisė nesumažinta, pataisytas tikras jos identifikatorius. Vaizdo, reklamos, Messenger ir kitų žmonių profilių duomenų šis inkrementas neprašo. Jei reali programa nepateikia šių leidimų, patikrinti aktualią Meta sutartį, o ne pašalinti trūkstamą teisę vien dėl PASS.

`PINET_FACEBOOK_PAGE_CREDENTIALS_PATH` nurodo privatų ignored JSON failą po `runtime/artifacts/`. Struktūra `credentials: [...]`; kiekvieno įrašo laukai: `key`, `site_id`, `environment`, `account_key`, `page_id`, `app_id`, `page_token`, `app_token`. Vienam site/env/key reikia vieno įrašo. Apriboti failo prieigą savininkui / konkrečiam runtime. Paslaptys nekeliauja į HTTP valdymo kūnus, DB, Codex prompt, užduoties paketą, logus ar Git. HTTP priima tik credential key.

`account_key` turi sutapti su tos pačios Facebook paskyros Computer Use binding; kitas raktas negali apeiti užrakto. Naudojami esami forced-RLS `FacebookRecord` ir `FacebookAccountLease`. Migracijos, svetainės generatoriaus ar atskiro schedulerio nereikia.

## Visa eiga

Operatoriaus keliai turi prefiksą `/operator/sites/{siteId}/facebook/page-api` ir esamą operatoriaus autentifikaciją. POST/PUT kūnai iki 20 000 baitų; kitos nišos ID ir pakeistas idempotency raktas atmetami.

| Kelias | Veiksmas |
|---|---|
| GET `/` | Atskira politika, Page patikros, eilė, medija; be task tokenų |
| POST `/verify` | `credential_key`; tik Meta GET patikra ir minimalus kvitas, galima prieš įjungimą |
| PUT `/policy` | Dabartinė revision, enabled/paused, daily_write_limit ir priežastis |
| POST `/media` | Vienas privatus PNG/JPEG/WebP, kilmė ir alt; iki 10 MiB / 20 MP |
| POST `/jobs` | `key`, `credential_key`, `action`, `body`, `review_note`, `purpose` ir veiksmui reikalingi laukai |
| POST `/jobs/{id}/check` | Tik žinomo Meta ID GET patikra; jokio POST į Meta |
| POST `/jobs/{id}/resolve` | Dabartinė revision, įrodytas `not_published` tik po tikros istorijos patikros |

`photo` reikia `media_key`; `comment` reikia `parent_post_id`; `reply` papildomai `parent_comment_id`. Page auditorija vieša. Gyvam verslo tekstui reikia galiojančios nišos faktų projekcijos. Savininko nekomercinis testas gali turėti `purpose=personal`. Nuotraukos baitai ir SHA tikrinami prieš siuntimą; multipart `source` nereikalauja viešinti privataus originalo URL.

Autentifikuotas worker kelias `/internal/sites/{siteId}/facebook/page-api/run-once` su `owner` vykdo vieną užduotį. Iš `runtime/` galima naudoti esamą `.venv/Scripts/python.exe -m pinet_core.facebook.page_api_worker --site <siteId> --owner <owner> --base-url http://127.0.0.1:<port>`. Worker paslaptis paimama iš runtime konfigūracijos. Nėra automatiškai įjungto 24/7 proceso.

Abu transportai skaičiuoja `browser_attempt` ir `page_api_attempt`. Bendrai 5 užduočių ribai abiem politikoms nustatyti 5; skirtingos ribos netampa savaime vienu mažesniu bendru limitu. Tai mūsų UTC dienos kvota, ne Meta leistina sparta. Master pause / disable sustabdo abiejų transportų queued/claimed užduotis; API pause — tik API. Pradėtos išorinės užklausos atšaukti vietiniu pause neįmanoma; vėlyvas tikras kvitas vis tiek išsaugomas.

## Patvarumas

`ready → claimed → sending → accepted → published`. Prieš vienintelį Meta POST DB patvariai įrašo `sending` ir bendrą account epoch. Nėra HTTP write retry. Pasikeitęs tekstas, medija, tokenas, instrukcijos, kontaktas, faktai ar API politikos revision sustabdo užduotį prieš leidimą. Meta kilmė fiksuota į HTTPS `graph.facebook.com`; redirect ir aplinkos proxy išjungti. Naršyklės cookies nenaudojami.

Aiškus Meta 4xx error su kodu yra `blocked`. Timeout, 5xx, neaiškus / per didelis / nepilnas write atsakymas yra `uncertain` ir palieka paskyros užraktą be automatinio senėjimo. Gyvam neaiškiam rezultatui `external_sending=null`; mock rezultatams visada false. Mock HTTP leidžiamas tik `allow_simulation` / `test-*` aplinkoje.

Gautas provider ID pirmiausia patvariai tampa `accepted`. GET patvirtina autorių ir exact tekstą; komentarui — tikslų parent edge. Tik sėkminga patikra tampa `published` ir atlaisvina paskyrą. `accepted` leidžia tik `/check`, taip pat po pause. Nežinomas `uncertain` neturi automatinio istorijos paieškos / retry. `/resolve` priima nepublikavimo įrodymą, kurį tikrintojas turi realiai gauti iš Page istorijos. Sena užduotis po resolution nekartojama.

Komentaro parent įrašo `from.id` ir `/me` turi sutapti su Page. Atsakymo pirminis komentaras turi būti tame įraše. Patikra skaito iki trijų 100 ID puslapių, nesaugo komentarų / žmonių tekstų ir neseka `paging.next` URL. Nepasiekta priklausomybė sustabdo veiksmą.

Gyvam priėmimui būtini realios programos/tokeno patikra, provider ID, exact autoriaus / teksto GET ir matomas Facebook rezultatas. Ankstesnis hosto `CreateProcess blocked by policy` neatskleidė deny priežasties; ši pataisa jo neišjungia ir neapeina master įjungimo atmetimo. PR, main merge, proceso perkrovimas, Meta prieiga ir gyvas priėmimas yra skirtingi etapai.

Pirminiai šaltiniai, skaityti 2026-10-14: [Page įrašai](https://developers.facebook.com/documentation/pages-api/posts), [Page komentarai](https://developers.facebook.com/documentation/pages-api/comments-mentions), [nuotraukos / multipart](https://developers.facebook.com/docs/graph-api/reference/page/photos/), [comment objektas](https://developers.facebook.com/docs/graph-api/reference/comment/).
