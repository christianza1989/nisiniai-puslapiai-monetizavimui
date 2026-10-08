# Dabartinė saugyklos ir atkūrimo patikra — 2026-10-08

Runtime: `39b71b18bd535eeb8d231fe497d26ca254b108d3`. Šis auditas atskiria įgyvendintą riboto piloto saugyklą, vietines apkrovos diagnostikas ir tikrą izoliuotą serverio bandymą. Visas platformos atnaujinimas dar nepriimtas paleidimui; gyvos platformos deployment ir migracijų šiame etape nėra.

## Įgyvendintas modelis

`rows-v2` saugo normalizuotas atskirų kolekcijų eilutes, metaduomenis ir indeksus. Senos JSON kopijos veidrodžio išjungimas virš nustatytos ribos nedidina vieno JSON failo limito. Istorinis migracijos checkpoint nėra dabartinių vizitų atsarginė kopija. Viešas indeksuotas katalogas ir atskira taksonomijos projekcija neįkelia visos privačios istorijos. Pasirašytas organizacijos perkėlimas parengia target, patvariai užantspauduoja source, tada suteikia target rašymo teisę; source senų būsenos, eilučių, laiškų ir darbų rašytojai užblokuoti. Centralizuota paskyrų, sesijų, taksonomijos ir pašto pristatymo teisė lieka source.

Ankstesnės konkrečios patikros išlieka [STORAGE.md](STORAGE.md), [MEDIA.md](MEDIA.md) ir [ACCEPTANCE.md](ACCEPTANCE.md): pasirašytas current actor/cache, customer controls, scoped client admission, mail claims/ack, fiziniai SQL originalai/WebP ir Node filesystem importas. Medijos originalai nepaverčiami viešais; aktyvaus target skaitymas negrįžta į pasenusią source kopiją. SQL medijos pilotas išlieka ribotas: 24 assets organizacijai, iki 6 objektų asset, 12 MiB objektui / 32 MiB asset ir 512 MiB saugyklos skaitiklis. R2 ar naujas mokamas planas neaktyvinti.

## Aktualūs vietiniai matavimai

`evidence/storage260-current-measure.json`, 2026-10-08T19:33:44.565Z; sintetinė Node `:memory:` SQLite, po 12 matavimų. Tai nėra Workers latencija ar production pajėgumo garantija.

| Vizitų | Rows įrašų / baitų | Visos būsenos read median / p95, ms | Katalogo read median / p95, ms | Mažos organizacijos read median / p95, ms | Organizacijos patch median / p95, ms |
| --- | --- | --- | --- | --- | --- |
| 100 | 112 / 71 823 | 0,59 / 0,89 | 0,13 / 0,34 | 0,18 / 0,67 | 3,43 / 5,85 |
| 1 000 | 1 012 / 710 823 | 3,99 / 6,17 | 0,10 / 0,38 | 0,20 / 0,36 | 11,33 / 21,14 |
| 4 000 | 4 012 / 2 843 823 | 21,28 / 32,40 | 0,09 / 0,23 | 0,18 / 0,22 | 1,58 / 3,95 |

4 000 eilutėje `legacyMirrored=false`; tai paaiškina mažesnį organizacijos patch laiką. Pilnos būsenos vieno įrašo write median / p95 ten yra 56,20 / 59,37 ms. Šis matavimas rodo likusių globalių visos būsenos operacijų kainą, ne teiginį, kad visos operacijos tapo pastovaus laiko. Ankstesnis native Miniflare 4 000-vizitų / 24-vaizdų scenarijus lieka atskira medijos diagnostika.

## Source-only atkūrimo defektas ir pataisa

Ankstesnis `scheduleRecovery` tikrino tik bookmark formatą ir po pradėto perkėlimo vis tiek pasiekdavo PITR API. `storage263-recovery-before.log` išlaiko FAIL: actual native Worker po frozen handoff pasiekė vietinę nepalaikomą PITR funkciją, užuot atmetęs nesuderintą atkūrimą. Tai nėra vietoje atlikto tikro PITR teiginys.

Dabartinis metodas atsisako source-only PITR, jei source turi bet kokią tos svetainės handoff istoriją, įskaitant aborted epoch / receipts. Tikrinimas ir PITR scheduling vyksta viename `blockConcurrencyWhile`; metodas lieka privačiu control-plane RPC, be naršyklės / HTTP dispatcher maršruto. Esamas native authority testas papildytas frozen, sealed ir aborted atmetimais; testų nepašalinta. `regression-97.log`: keturi rinkiniai, 263/263 PASS, 76 210,0601 ms; 0 naujų / 1 papildytas / 0 pašalintų. Testų failai vykdomi su `--test-concurrency=1`; originalūs konkurenciniai veiksmai testuose išlieka. Exact staged safety: 2 failai / 27 955 baitai PASS.

Blokavimas neįrodo, kad source galima saugiai atkurti po perkėlimo, ir nepakeičia visų įeinančių rašymų bei jobs sustabdymo prieš recovery. Production `MadbeautyOrganizationStaging` neturi target PITR ar abort maintenance RPC. Nesuderintas aktyvios poros rewind nepalaikomas: taisyti į priekį arba pirmiau parengti atskirą, patvirtintą poros maintenance operaciją. Negalima grįžti į seną vieno JSON / directory routing nemokantį runtime virš naujų target vizitų.

Cloudflare [SQLite PITR API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api) aprašo bookmark / undo ir restart veikimą; local development PITR nepalaiko. [Durable Object concurrency API](https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile) paaiškina callback metu blokuojamus events ir reset, jei callback išmeta klaidą. Todėl tikras atkūrimo bandymas atliktas atskiroje serverio saugykloje.

## Tikras izoliuotas serverio bandymas

Privatus QA Worker `madbeauty-upgrade-acceptance-20261008`, versija `2d7b6e7e-5f54-40f2-bdf2-6a43bceeeaa7`; source runtime d58c7fd, artifact SHA256 `6318696324a0d2fc8875fe97b32cfb2fefd21dcd4ed5e7d4fec91f05d17d85a7`. Wrangler 4.92.0 / compatibility 2026-05-22 / nodejs_compat atkartoja tikrinamą esamą runtime. Tai atskiras patikros adapteris su dviem naujomis SQLite namespaces, ne produkcinis UI leidimas. Sintetiniai `.example.com` aktoriai ir aiškiai fiksuotas vizitų setup clock; nėra production duomenų, assets, routes, mail relay / SMTP / MAIL_TRANSPORT binding.

Visi QA maršrutai prieš object RPC reikalauja private Bearer credential, exact origin ir isolated mode. Secret reikšmės lieka ignored faile / provider secrets; nėra Git, URL ar logų reikšmėse. Vietiniai native gateway host/key/mode atmetimai: 6 PASS. Tikrame hoste svečio health ir setup grąžino 404. Provider read-only before/after patvirtino skirtingas dvi namespaces, 0 cross-script binding ir nepakitusią gyvos platformos binding tapatybę / secret vardus. Paskyros `usage_model=standard`; billing subscriptions skaitymas OAuth tokenu gavo 403, todėl konkreti sąskaita / tarifo pakopa netvirtinama. Subscription / plan activation komandos nevykdytos.

`evidence/storage263-hosted-proof.json`: 13 konkrečių patikrų PASS, 53 HTTP užklausos:

- Iki bet kokio handoff tikras source PITR atkūrė atšauktą sintetinį vizitą su exact visomis application SQL lentelėmis. Undo bookmark atkūrė ir naujesnę atšaukimo būseną; grįžimas į peržiūrėtą pradinę kopiją taip pat sutapo.
- Po frozen ir sealed source-only recovery atmestas; prieš / po exact application SQL lentelės sutapo.
- Kol source frozen ir target prepared, tikras target PITR pašalino sintetinį recovery probe ir atkūrė exact prepared SQL lenteles. Target PITR / explicit abort metodai pridėti tik QA subclass; jų nėra production target API.
- 8 vienalaikiai identiški patvirtinimai grąžino vieną naują booking ID / 2 500 ct; senas booking snapshot liko exact, naujo booking outbox įrašas vienas. HTTP round-trip median 123,75 ms / max 147,51 ms; tai nėra CPU / throughput / population capacity matavimas.
- 5 seni source state/SQL/mail/job writers ir 4 foreign target writers atmesti. Abiejų objektų restart išsaugojo exact application SQL lenteles ir active target / mailAuthority=false.
- QA gateway atsisakė aktyvaus target rewind. Šis gateway guard nepriskiriamas production target kodui. Aktyvios source+target poros koordinuotas PITR neįgyvendintas ir nepriimtas.

Palyginimai neapima Cloudflare vidinių KV lentelių. Šiame fixture nėra medijos baitų, tikro meistro, SMTP pristatymo ar hosted naršyklės vartotojo kelio. QA kopijos ir privatūs bookmarks išsaugoti ignored evidence. Gyvos platformos paskutinė perskaityta versija liko `f8eba745-b8ef-446e-aeff-3c8b95c762bd`, originali namespace `2faf96eedef1425c8d4fc07444cde2f3`; jai deployment / migration / duomenų writes nevykdyti.

## Paleidimo ribos

I01 apibrėžtas izoliuoto tikro Workers read / recovery kriterijus įrodytas. I02 rašymo teisės, stale source ir dalinio perkėlimo atmetimo kriterijai turi named local / hosted fixture įrodymus. I03 ribotas SQL pasirinkimas ir išmatuotas vietinis scenarijus nėra R2 ar neribotos production apkrovos aktyvinimas. Viso atnaujinimo completion ir conditional deploy sąlyga dar neįvykdyta.

Reikia tikro piloto teikėjo, autorizuoto rezervacijos / priminimo gavėjo ir atskiro provider acceptance / inbox receipt įrodymo. Reikia faktinės saugojimo / trynimo bei backups tvarkos prieš aktyvinant destruktyvų C02 vykdymą; istorinis JSON checkpoint, normalized rows, mail ir backup kopijos negali būti laikomos ištrintais vien pakeitus klientų kortelę. Hosted canonical UI / media / current roles ir production perjungimo acceptance atliekami tik tiksliai pasirinktam leidimui. Mokamos / išorinės ketvirtos fazės priklausomybės savaime neaktyvinamos.


## Current lifecycle retest — 39b71b1

Pradinio d58c7fd guard callback expected exception perkraudavo source. storage263-lifecycle-before.log išlaiko FAIL su pasikeitusiu actual instance UUID. Dabartinis callback grąžina blocked sprendimą, Error išmetamas po callback, todėl frozen/sealed/aborted refusal palieka tą patį live instance. Native after1/1; regression98 visi keturi263/263 PASS per76 473,0144ms;0new/1extended/0removed. Current2source exact safety28 833B PASS, immutable75aa39pages309assets.

Atnaujintas tas pats privatus QA Worker, versija65df717f-7bf7-4a5b-9975-bad678cd228d / artifact36089a71e3062854364154f34046cc43bb2c411d871834d0eccbccf51d049544. storage263-hosted-lifecycle-proof.json4checks/12HTTP PASS:3expected refusals same running source instance, both application SQL tables exact, prior booking/roles/mail/history retained after QA deployment. Production bindings re-read unchanged. Tai current refusal lifecycle, ne naujas activated pair PITR ar realus mail/browser pilotas. Pirmo tikro PITR d58c7fd runtime/artifact/receipts ir jų ribos aukščiau lieka atskiri.
