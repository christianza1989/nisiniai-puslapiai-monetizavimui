# Bendras nišinių svetainių paštas

2026-09-30 savininko patvirtintas bendras kontaktas **info@pinet.lt**, operatoriaus pavadinimas **MB Pinet**. Naudojama jau egzistuojanti Hostinger dėžutė; nauja pašto paskyra nesukurta ir papildoma mokama siuntimo paslauga neprijungta. Viešos užklausos nepaverčiamos pardavimo ar tiekimo pažadu.

## Įgyvendinta

- Visų 20 studijos nišų kontaktas atnaujintas; esamų patvirtintų kontaktų tekstų versijos peržiūrėtos, paketas iš naujo eksportuotas/importuotas. Greitų svetainių telefonas lieka tik tam domenui; traktorių ir roletų nišoms telefono nepriskirta.
- Core `config/niche-network.json`: `defaultEmail`, `operatorName`, `contactsBySite`, `mailRecipientsBySite`. Naujo domeno numatytas kontaktas skaitomas iš šio failo. Kontaktas turinio pakete yra rodomo adreso autoritetas, o atskiras gavėjo override gali pakeisti pristatymą.
- Užklausa pirmiausia patvariai išsaugoma atskiro `site_id` D1 įraše, tik tada siunčiama SMTP. Laiško temoje domenas ir užklausos ID; tekste domenas, pradinis puslapis ir kliento duomenys. `Reply-To` – klientas. Bendras siuntėjas MB Pinet / info@pinet.lt; neatliekamas siuntėjo domeno apsimetimas.
- Hostinger SMTP `smtp.hostinger.com:465`, IMAP `imap.hostinger.com:993`, patikrintas TLS sertifikatas. SMTP `250` žymi pašto serverio priėmimą, ne galutinį pristatymą. Po priėmimo įrašas `notified`; SMTP nesėkmė nepanaikina užklausos ir nežada, kad laiškas išsiųstas.

## Patikros įrodymai

Core `output/mail/hostinger-smtp-verification.json`: prisijungimas ir aiškiai pažymėtas savininko self-test. `output/mail/niche-form-verification.json` (2026-09-30 09:51 UTC): tikra Worker forma → D1 → SMTP priėmimas → konkretaus Message-ID radimas Hostinger INBOX. Bandymo įrašas pašalintas iš D1 pagal tikslų ID; kitų įrašų ar laiškų turinys neskaitytas/nešalintas. Tai vietinio integravimo įrodymas, ne viešo domeno paleidimo faktas.

## Paslaptys ir paleidimas

2026-09-30 A–Z audito validator pataisa: formos parseris išlaiko daugiausia 10 KB; nedidelį perteklinį body perskaito ir išmeta be kaupimo, tik iki 64 KB, kad vietinis Worker nepaliktų neperskaityto body ir nesugadintų kito atsakymo. Virš hard cap ryšys gali būti nutrauktas. Body ribojamas prieš origin patikrą; joks atmetamas duomuo nepasiekia D1/SMTP. Faktiniai fixed/chunked 10010 B HTTP bandymai gavo 400, origin 403, honeypot 200, unknown host 404; tinkama pažymėta užklausa išliko D1 ir po patikros išvalyta tik pagal tikslų ID/site. Įrodymai core `output/audits/tractor-form-local.json` ir `output/tractor-audit-interest-tests.log`. Tai nepakeičia būtinos produkcinės rate/abuse ir pranešimų recovery kontrolės. Ankstesnis matching INBOX testas panaudotas su jo tikslia data; klientams testinių laiškų nesiųsta.

Savininko failo slaptažodis nekopijuojamas į Git, GUI, paketą ar šią dokumentaciją. Core `scripts/setup-hostinger-mail.mjs` sukuria ignoruojamą `.dev.vars.hostinger`; jis įjungiamas tik aiškiam pašto bandymui. Įprastoje peržiūroje SMTP išjungtas. Wrangler su `dist/server/wrangler.json` santykinį `--env-file` ieško prie config; bandymui būtinas **absoliutus** privataus failo kelias. Naudoti `--log-level error`, kad paslaptys neatsirastų bindingų sąraše.

Viešame Worker saugiai nustatyti `LEAD_SMTP_ENABLED=1`, `LEAD_SMTP_USER`, `LEAD_SMTP_PASSWORD` kaip paslaptis, su tikru D1 ir galiojančiu komerciniam projektui hostingu. Produkcijos paslaptys ir DNS šio darbo metu nediegti. Po diegimo pakartoti aiškiai pažymėtą tikros formos self-test ir patikrinti konkretaus laiško gavimą. Nenaudoti masinio tikrų klientų testavimo.

## Atskirti dėžutę vėliau

2026-10-01 agentų core papildymas: atskira autorizuota sesija `agent-business-core/runtime/` jau turi per-site operatoriaus pašto UI, Case / MailMessage, ribotą žinomų Message-ID gijų IMAP skaitytuvą ir testinio gavėjo pardavimo eigą. Aktualią realizaciją / įrodymų ribas tikrinti [runtime README](agent-business-core/runtime/README.md). Tai nepakeičia aukščiau išsaugoto D1 self-test įrodymo ir savaime neįjungia production reply visoms nišoms. Aktyvios klientų paieškos / siuntimo taisyklės: [ACQUISITION_CORE](ACQUISITION_CORE.md); naujas prospectas nėra gauta forma, o Hostinger transporto buvimas nėra cold kampanijos leidimas.

1. Patikrinti naujo adreso veikimą Hostinger.
2. Nustatyti `contactsBySite[siteId].email` ir studijos kontakto/teksto laukus; peržiūrėti ir patvirtinti pasikeitusias versijas, eksportuoti/importuoti paketą. Konfigūracijos pakeitimas nepakeičia jau patvirtinto teksto automatiškai.
3. Jei tik pristatymas keičiamas, `mailRecipientsBySite[siteId]` pakanka; rodomas kontaktas nesikeičia.
4. Atlikti vieno domeno self-test. Bendras autentifikuotas siuntėjas gali likti info@pinet.lt, gavėjas atskiras.

Hostinger sąranka patikrinta pagal [oficialias instrukcijas](https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/); Worker transportas pagal [TCP sockets dokumentaciją](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

## V2 gift formos tęstinumas (2026-10-05)

Shared `publicSiteByHost/publicSitePage` resolveris tą pačią POST formą ir agreguotus įvykius aptarnauja V1 arba priimtam V2. V2 užklausai papildomai reikia public contact ir policy `/privatumas`; private/missing/revoked policy išjungia formą ir interest endpointą. D1 įrašas lieka nepriklausomas nuo voice runtime; name/email/message/UUID/ms/consent/source-path/status sutartis nepakitusi.

[M5 HTTP-QA](research/dovanos123-integration-2026-10-04/M5/HTTP-QA.json) įrodo tik sintetinę užklausą izoliuotoje vietinėje fixture D1: valid1, wrongorigin403, noconsent400, honeypot0, statusnew, sourcepath tinkamas, consentAt=createdAt. SMTP/voice0. Tai nėra actual INBOX receipt ar Dovanos123 production D1/legacy CaseSource backfill priėmimas.
