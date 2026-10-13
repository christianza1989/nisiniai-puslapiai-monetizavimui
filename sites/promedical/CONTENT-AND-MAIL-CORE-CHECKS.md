# Promedical turinio ir pašto core patikra

2026-10-10, Europe/Vilnius. Source bazė core d4ea8bf7384b70c4ea62a344001e3f8158812c56 ir public d0fd6b7d296303bfcaafadc4071945e675a72b96; abi yra savo šakų HEAD protėviai pagal sėkmingą continue gate. Tai shared source pataisų patikra, ne visų 57 straipsnių ar gyvo domeno priėmimas.

## Juodraščio kontekstas

`upgrade-7a774e11-65b4-4422-b9c7-34f892f78d9d`: pirmo tuščio gido senasis prompt turėjo 3 561 966 baitus ir 3 518 328 simbolius, 1910 puslapių bei 3598 assets inventorius ir visą tinklą. Naujo to paties kandidato kontekstas 446 649 baitų, 61 redakcinio puslapio santrauka, 11 tikslių immutable patvirtintų šaltinių ir 6 medijos šeimos. Visi 89 privatūs SEO tyrimo stebėjimai išlieka. Planavimo kelias nepakeistas; nėra naujo per-site generatoriaus ar schema/approval išimties.

Actual native CLI sėkmingai parengė tekstus su fingerprint 69180300223ef3202e6e5af0be633b01d2115a9b63210ac8cfc621fa3a3e9ff2. Šios pataisos priėmimui pakanka actual baigtų juodraščių ir dviejų tikslaus šaltinių grafiko regresijų. Originalus nesėkmingas darbas bei perkrovimo nutrauktos užduotys lieka private job istorijoje; generavimas tęsiamas tik tuštiems body. Baigtas draft nėra peržiūrėta publikacija.

## Atominis peržiūros įrašymas

`upgrade-abafbfb7-815e-4a6b-b99b-d1e6492784fe`: bendras recorder priima 1–200 jau tikrai peržiūrėtų puslapių konkrečius šešių sričių įrodymus ir privalomą expectedBinding. Visą partiją validuoja iki vieno site įrašo. Stale revizija ar verslo kontekstas, foreign/duplicate ID, blogas paskutinis įrodymas bei per didelė partija nesukuria dalinės peržiūros. Tai ne automatinis evidence ar approval pildymas; individualus recorder ir immutable istorija išsaugoti.

Actual native kontaktai, apie-projekta ir redakcija puslapiai palyginti su ankstesniais patvirtintais snapshotais; tik savininko nurodytas sales → info kontaktų pokytis ir kontaktų description pataisa. Private HTTP 200 rodė dabartinį adresą. Trys puslapiai gavo tikros delta peržiūros įrašus ir naują native batch approval, istorinių snapshotų neperrašant. Kiti 1853 ankstesni konteksiniai review nėra automatiškai aktualūs: jų tikras konteksto delta patikrinimas lieka naujo release darbu.

2026-10-10 pakartota `node --test content-studio/test/draft-context.test.mjs content-studio/test/editorial-review-batch.test.mjs content-studio/test/content-workflow.test.mjs`: 11/11 PASS, įskaitant dvi draft konteksto, dvi recorder ir septynias workflow regresijas. Fixture izoliacija nepakeitė kitų nišų native duomenų.

## Siuntėjo tapatybė

`upgrade-13d12d97-d10f-4997-a07c-15da7fd40b6a`: public bendras SMTP kelias priima optional operatoriaus display-name iš canonical contact ir EHLO naudoja autentifikuotos pašto dėžutės domeną. Legacy MB Pinet default išsaugotas. UTF-8 antraštė koduojama RFC 2047; blank/type/CRLF/ilgio vartai neleidžia antraščių įterpimo. Kredencialai tik ignored private konfigūracijoje, ne source, journal ar pakete.

Actual Hostinger TLS SMTP 465 priėmė vieną pažymėtą sintetinį laišką 2026-10-09T20:58:10.942Z. TLS IMAP 993 read-only EXAMINE ir tikslinio savo Message-ID paieška patvirtino to paties laiško gavimą 2026-10-09T21:01:10.256Z. Neklausytas klientų laiškų turinys. Private kvitai `output/mail/promedical-smtp.json` ir `promedical-inbox.json` neperkeliami į Git.

2026-10-10 `node --test tests/smtp.test.mjs` 4/4 PASS. `npm run test:core` 55/55 PASS, kartu tikrinant likusias shared public projekcijos, media, schema, nuorodų, immutable paketo ir tenant izoliacijos regresijas. Tikras produkcijos formos POST → D1 → SMTP → INBOX patikrinimas lieka deployment priėmimui; transporto self-test jo nepakeičia.

## Perdavimas ir ribos

2026-10-10 pašto DNS actual įgyvendintas Cloudflare zonoje: du MX, SPF, DMARC, trys Hostinger DKIM CNAME bei autoconfig/autodiscover, išsaugant ankstesnius svetainės/www/ftp įrašus. Native Cloudflare GET patvirtino 12 įrašų. Viešas 1.1.1.1 resolveris grąžino darwin/sue vardų serverius, MX prioritetus 5/10 ir hostingermail-a DKIM CNAME. Private kvitai ir tikras naršyklės ekranas saugomi Studio data/tmp; API DNS mutacija buvo neprieinama, todėl panaudota savininko autorizuota Chrome UI. Tai nėra produkcijos formos pristatymo įrodymas.

Own šakos / draft PR53 ir PR20; main merge ir kitų PC adoption neįrodyti. Pakeistos datos nereiškia ankstesnių publikacijų istorijos perrašymo. Naujo kalendoriaus 57 puslapiai ruošiami galutinei peržiūrai. Public paketas, build, before/at-date HTTP, visų straipsnių source/media peržiūra, strict A–Z, DNS, HTTPS, pašto DNS ir actual hosted formos kelias priimami atskirai. Treg vienkartinės analizės settled suma 0,33176 USD, savininko riba 0,40 USD; ši patikra naujų mokamų calls neatliko.
