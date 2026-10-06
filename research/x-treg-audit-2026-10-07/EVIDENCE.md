# X/Treg audito įrodymai ir ribos

2026-10-07. Auditui naudotas švarus own worktree, šaka `codex/facebook-phonebridger-roadmap-20261007`, audito pradžios source `edd9a68`; [PR20 rezervacija](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/20#issuecomment-6027414580). Originalus aktyvus/dirty checkout nekeistas.

## Pirminiai šaltiniai

- [Treg X lentyna](https://treg.to/tools/x), [platesnis X katalogas](https://treg.to/catalog/x) ir [onboarding](https://treg.to/llms.txt): perskaityti. Viešas pateiktos app URL atvėrimas IAB nukreipė į tools/x; tai ne paskyros capability patikra.
- Esama autorizuota Chrome Treg sesija: Connections → X provider → post.create detail → Billing and limits → media detail. X neprijungtas; read/write not requested yet; actual post URL modifier perskaitytas. Matomas Connect disabled; priežastis nežinoma. Nieko nejungta / nesuteikta. Paskyros email ir nesusijusių tabų / jungčių duomenys nesaugomi.
- [X automation](https://help.x.com/en/rules-and-policies/x-automation): perskaityta aktuali 2026-04 taisyklių redakcija. [Account labels](https://help.x.com/en/using-x/automated-account-labels): perskaityta atskirai, ne laikoma platformos approval.
- [X kainodara](https://docs.x.com/x-api/getting-started/pricing), [post kūrimo API](https://docs.x.com/x-api/posts/create-post) ir [query kūrimas](https://docs.x.com/x-api/posts/search/integrate/build-a-query): perskaityti. URL/modifier/pagination ir savo app owned-read kontekstas neperkeliamas į tariamą universalų nemokamumą.
- Treg vieši `/catalog/endpoints/<id>` GET: devyni JSON kontraktai perskaityti; tai metadata, ne `/call` vykdymas. Raw public JSON ir santrauka laikomi tik ignored `tmp/x-treg-audit-20261007/`; clone jų neperkelia.

Endpoint metadata baitų SHA256, atskiras paralelinis read-only snapshot (observed traffic gali keistis net tos pačios dienos užklausose):

| ID | SHA256 |
| --- | --- |
| x.x.post.create | 70fd6991cad7ffc8b733a73ee496d9800f68f650e60b1ee86e391d016a4a29b0 |
| x.x.post.reply | a2a533d9b799a464d72a6c5ada0232bcb7117f95c19ebdcb2413b70a7ac898a5 |
| x.x.search-posts-recent | c8664eeb8e89046815d20cfd91fa6c784559faa58776e50ce25847a9b9b3b250 |
| anyapi.x.search.posts | eda7416b156c9dcb56014f343828edac4a0cbdfb1446bef2efb1d977bda0db1d |
| treg.x.search.posts | 5b790f521fe87a4cad936957a322ec452c4fa7cc4d29dffd38f75268bc1c113c |
| x.x.get-users-mentions | 9c0f2e25b37ca90e6b1e7a6c100019fb3821d1228a2258f31d504358c5fada4a |
| x.x.media-upload | 90ff4d02c21147ddd4606dd21e0f9d0140080f60f9739b0795a366ca6cec60fb |
| x.x.create-direct-messages-by-participant-id | d10dc81e1acc8b2b91046ce039e6180d04156fe813c2ef24b3274542686f0d54 |
| x.x.get-posts-analytics | 7a5703e52f28cca073606e42f1efe362e5aa380d74c894013807b68935f27bf8 |

## Nedeklaruojami testai

Jokios paid paieškos ar tikrų postų rezultato nevadiname patikrintu buyer demand. Nepatikrinta: X OAuth įjungimas, disabled priežastis, actual media upload/publishing, DM, bot approval, mūsų app rate limits/settlement/replay, views/activations/purchases. Runtime / Lighthouse / core testai šiam dokumentiniam auditui nekartoti.

Installed Treg skill perskaitytas; jo senas katalogo dydis ir bendras own-key nemokamumo aprašas nepanaudoti vietoje aktualaus X kontrakto. Sign-in setup / naujų tools registracija auditui nereikalingi: public metadata ir esama owner-authorized UI davė atsakymą. Nėra slapto auth/config skaitymo ar tokenų perdavimo.

Code inventorius: tikrinto own worktree runtime src turi facebook modulį; api.py importuoja ir įtraukia facebook_router, X router neaptiktas. [Ankstesnis Treg SEO acceptance](../../docs/TREG_SEO_INTEGRATION_QA_2026-10-07.md) skaitytas kaip istorinis source, ne mūsų pakartotas PASS. [FB v2](../facebook-agent-phonebridger-2026-10-07/DELIVERY.md) hash ir checkboxai neliečiami.

## Dokumentinis perdavimas

PASS: 13 vietinių nuorodų tikrintuose trijuose dokumentuose turi esamus taikinius; 18 unikalių priėmimo ID tiksliai X-01–X-18; septyni kainų pavyzdžiai patikrinti nepriklausomu Decimal skaičiavimu; devyni raw metadata SHA256 sutampa su lentele. `git diff --check` PASS. FB v1/v2 dokumentai ir istorinių fingerprint failai nekeičiami.

Git scope — tik šie trys nauji Markdown dokumentai ir viena own WORKSTREAMS eilutė. `node scripts/repository-safety.mjs . --staged` PASS keturiems exact index Markdown failams, findings=0; `git diff --cached --check` PASS. Safety yra pattern / local-secret atitikmenų patikra, ne visų galimų asmens duomenų nebuvimo įrodymas; papildomai peržiūrėta apimtis. Privatūs paskyros duomenys ir raw snapshot į scope neįtraukti. M0 dokumentinės patikros nėra X1–X6 runtime priėmimas: visi 18 scenarijų lieka NOT RUN. Nauji įgyvendinimo failai, skills/capabilities ir schema bus atskiras pavedimas / suderintas PR. Tiksli perdavimo commit tapatybė lieka Git istorijoje, o ne būsimo SHA pažadas.
