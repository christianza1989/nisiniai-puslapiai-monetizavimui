# Promedical DNS perkėlimo būsena

2026-10-09. Savininkas patvirtino tikslų vienkartinį keturių Cloudflare nuskaitytų pagrindinio domeno IP įrašų pakeitimą Hostinger CDN nuoroda ir Hostinger vardų serverių pakeitimą. Hostinger prisijungimas per papildinį patvirtintas paties savininko „Allow“ veiksmu. Mokamas planas, nauji API raktai ir platesnės Cloudflare papildinio prieigos nesukurti.

## Atlikta ir patikrinta

Cloudflare nemokamame plane sukurta promedical.lt zona. Pilna Hostinger DNS zona nuskaityta ir išsaugota privačiai prieš pakeitimus. Cloudflare automatinio nuskaitymo keturi fiksuoti @ A/AAAA adresai pakeisti vienu CNAME, išlaikant Hostinger dinaminį CDN paskirties vardą. Pagrindinio domeno CNAME palaiko Cloudflare [CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/). Galutinė zona patikrinta per Cloudflare skaitymo API, tiksliai sutapo visi trys paskirties adresai, TTL ir DNS-only būsenos:

| Vardas | Cloudflare tipas | Paskirties vieta | TTL | Proxy |
|---|---|---|---:|---|
| @ | CNAME | promedical.lt.cdn.hstgr.net | 300 | DNS only |
| www | CNAME | www.promedical.lt.cdn.hstgr.net | 300 | DNS only |
| ftp | A | 194.59.166.37 | 1800 | DNS only |

Hostinger @ įrašas prieš migraciją buvo ALIAS į tą patį CDN vardą; www ir ftp paskirties vietos išsaugotos. DNS-only išlaiko dabartinį CDN ir HTTP kelią; tai nėra Cloudflare HTTP proxy / WAF aktyvavimo įrodymas.

Prieš delegavimą patikrinta vieša DS užklausa: Status 0, DS atsakymo nebuvo, .lt SOA neigiamas atsakymas išsaugotas. Jokia DNSSEC, TLS, registratoriaus užrakto ar ugniasienės apsauga neišjungta. Hostinger vardų serverių keitimo įrankis grąžino „Request accepted“, o paskesnis domeno nuskaitymas patvirtino:

- darwin.ns.cloudflare.com
- sue.ns.cloudflare.com

Ankstesni serveriai buvo ns1.dns-parking.com ir ns2.dns-parking.com. Cloudflare UI paspaustas „I updated my nameservers“. Patikros metu Cloudflare statusas tebebuvo **pending**, activated_on null; ekranas rodė „Waiting for your registrar to propagate your new nameservers“. Viešas Google resolveris dar grąžino kešuotus dns-parking serverius (likęs TTL apie 21 tūkst. sekundžių). Hostinger „Active“ yra registratoriaus domeno, ne Cloudflare aktyvavimo būsena. Pagrindinio domeno ir www HTTPS HEAD užklausos grąžino HTTP 200 per dabartinį prieglobą.

## Kas lieka

Po delegacijos sklaidos patikrinti Cloudflare active būseną ir viešus NS, A/AAAA, www bei HTTPS atsakymus. Nereikia dar kartą keisti serverių vien dėl kešuoto seno NS atsakymo. Faktinės .lt delegacijos ir įvairių resolverių kešai gali atsinaujinti skirtingu laiku.

Klaro svetainės naujas paketas dar nepaleistas į šį domeną; DNS perkėlimas išlaiko dabartinę Hostinger CDN paskirties vietą. Naujo turinio deployment / produkcinės užklausos / privatumo ir pašto vartai yra atskiras paleidimo darbas, aprašytas [HANDOFF.md](HANDOFF.md).

Pilnoje pradinėje Hostinger zonoje ir galutinėje Cloudflare zonoje MX, SPF, DKIM ar DMARC įrašų nebuvo. Viešas kontaktas sales@promedical.lt yra savininko pateiktas; jo pašto dėžutės ir pristatymo veikimas nepatvirtinti. Neįrašyti išgalvoti mail serveriai ir neaktyvuota automatinė pašto paslauga.

Cloudflare papildinys tebeturi skaitymo prieigas; zonos ir DNS pakeitimai atlikti per savininko prijungtą Chrome, o tikrinimas – per papildinio skaitymo API. Domeno prijungimas pats savaime papildinio leidimų neišplečia. Hostinger vardų serveriai pakeisti per jo paskirties įrankį. Platesnių Cloudflare prieigų grant nebuvo būtinas šiam perkėlimui ir neatliktas.

## Įrodymai ir grįžimas

Privatūs įrankių atsakymų eksportai ir DNS kopijos: content-studio/data/promedical-domain-20261009. Failai apima pre-migration-backup.json, parent-ds.json, parent-ns.json, cloudflare-dns-matched.json, hostinger-nameserver-write.json, hostinger-domain-after-nameservers.json, parent-ns-after-write.json ir cloudflare-zone-after-nameservers.json. Browser veiksmų laikini ekranai yra content-studio/tmp/cloudflare-*.png; jie neįtraukti į Git. Sekretai ir OAuth konfigūracija neįtraukti.

Jei reikėtų grįžti, išsaugotas visas pradinis trijų Hostinger įrašų rinkinys ir ankstesni vardų serveriai. Grįžimas taip pat būtų DNS pakeitimas su sklaidos / kešavimo priklausomybe; šiame darbe jis nevykdytas. Pradiniai Hostinger įrašai nebuvo ištrinti ar atstatyti kitu rinkiniu.
