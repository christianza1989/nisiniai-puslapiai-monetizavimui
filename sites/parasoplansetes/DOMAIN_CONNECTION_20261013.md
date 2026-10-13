# parasoplansetes.lt domeno prijungimas — 2026-10-13

Savininko užsakytas pagrindinio domeno ir `www` prijungimas prie esamos svetainės. Konfigūracija pritaikyta; viešas DNS ir HTTPS priėmimas dar laukia delegavimo sklaidos. Šis įrašas nepakeičia ankstesnių auditų ir nėra viso verslo paleidimo PASS.

## Atlikta

- Abiejų repo freshness `continue` PASS: private main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Darbas savo esamose šakose; svetimi failai neperrašyti.
- Hostinger pradinės zonos eksportas išsaugotas privačiame `output/parasoplansetes-domain-20261013/hostinger-dns-before.txt`. Buvo tik parkavimo A ir `www` CNAME, MX/TXT nebuvo. Viešas DS tyrimas deleguoto DNSSEC neaptiko.
- Esamoje Cloudflare paskyroje sukurta `parasoplansetes.lt` zona `33081a4424660cf38063c57e02639dad`, Free Website planas (0 USD). Bot Preference Sync išjungtas, kad platforma savavališkai nepapildytų svetainės robots.txt.
- Hostinger išsaugoti `darwin.ns.cloudflare.com` ir `sue.ns.cloudflare.com`; UI patvirtino „DNS valdomas pas kitą tiekėją“. Domeno registracija ir atnaujinimo nustatymai nekeisti.
- Prie `parasoplansetes-preview` production Worker pridėti abu Custom Domains: `parasoplansetes.lt` ir `www.parasoplansetes.lt`. CF API patvirtino enabled=true abiem. Laikini parkavimo A įrašai pakeisti automatiškai valdomais proxied AAAA `100::`; tai Cloudflare Worker įrašai, ne išorinio serverio adresas.
- Naujas adapteris priima tik aiškiai įjungtus šio domeno hostus; `www` ir HTTP grąžina 308 į HTTPS pagrindinį domeną, išsaugodami kelią ir parametrus. Preview visuomet noindex, svetimų Origin formos blokuojamos.
- Įkelta Worker versija `19f7c2fb-d4d8-4359-ace0-83e4b32796ec`. CLI code-only konfigūracija naudota dėl esamų OAuth scope ribų; domenai prijungti autentifikuotoje Cloudflare UI, paskyros rolės neplėstos.
- D1 UUID `98f4d3c5-11a4-4d19-a6ec-d568a96da0f7`, esami sekretai ir išjungti mail/chat/voice jungikliai išlaikyti. Mokamos paslaugos neįjungtos.

## Patikros ir ribos

10 adapterio regresijų PASS; Wrangler deploy dry-run ir realus code deploy PASS. Gyvo workers.dev runtime 284 HTTP patikros PASS: 46 puslapiai, 24 pagal datą matomi / 22 būsimi, medija, framework failai, indeksai ir netinkamos užklausos. Šis rezultatas įrodo naujos versijos peržiūros veikimą, ne pagrindinio domeno TLS.

2026-10-13 12:47 UTC Cloudflare zona dar `pending`, observed nameservers dar parkavimo serveriai, activated_on=null. Vieši 1.1.1.1 ir 8.8.8.8 resolveriai taip pat dar rodė senus NS. Tiesioginis domeno HTTP bandymas pasiekė seną Hostinger parkavimo svetainę: tai FAIL laukiamam naujos svetainės vaizdui ir peradresavimams. TLS patikra nebuvo išjungta. Cloudflare paskatino naują NS patikrą; UI nurodo įprastai 1–2 val., iki 24 val. propagavimą.

`CUSTOM_DOMAIN_ENABLED=1`, `SITE_INDEXING_ENABLED=0`. Domeno prijungimas atskirtas nuo SEO priėmimo: būsimas indeksavimo įjungimas dar būtinas. Preview lieka noindex nepriklausomai nuo šio jungiklio. Veikiantys laiškų pranešimai, domeno analitika/GSC ir galutinis launch auditas šiuo veiksmu nepatvirtinti.

## Tęsinys po propagavimo

1. Patikrinti Cloudflare status=active, sertifikatą ir viešus NS.
2. Iš private repo vykdyti `node sites/parasoplansetes/cloudflare-preview/check-domain.mjs output/parasoplansetes-domain-20261013/domain-http-final.json`; tada tą patį pilną publication-aware `check.mjs` pagrindiniu HTTPS domenu. Nepriimti parkavimo 200 kaip PASS.
3. Naršyklėje patikrinti pagrindinį ir gidų puslapį, assetų gavimą; tik realūs 308 ir galiojantis TLS yra domeno priėmimas.
4. Prieš indeksavimo įjungimą užbaigti taikomus realaus paleidimo vartus (kontaktų pristatymą, matavimą, SEO/GEO auditą). Publikavimo tvarkaraščio ir immutable paketo nekeisti vien dėl domeno prijungimo.

Privatūs kvitai ir screenshot: `output/parasoplansetes-domain-20261013/`; juose nėra prisijungimo kodų, raktų ar registranto WHOIS asmens duomenų. Dabartinis immutable release `cb6be84b-426e-45d2-a117-4bd6c1cf2880`, package SHA256 `9d94e82ae07be3a28406373e6b4f0c9808549e26a057e9b81aad7633f73e2cfa`, public source `9c436733ee9b102d9e11ae459a6536a0359dfe92`.

Cloudflare Custom Domains sutartis: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
