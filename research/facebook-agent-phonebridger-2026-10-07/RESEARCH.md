# FB agento / PhoneBridger tyrimas

2026-10-07. Read-only. Nė vienas komentaras, narystė, DM, registracija, Checkout ar mokėjimas šiame tyrime neatliktas. Klientų duomenų, sekretų ir neanoniminių pokalbių nekopijuota.

## Produkto šaltiniai ir jų prioritetas

1. Canonical HTTP home/shop ir aktualus `/api/shop/catalog` 2026-10-07: dabartinis viešas pasiūlymas.
2. [Core PR1](https://github.com/christianza1989/niche-public-core/pull/1), head `830db334c0f53274d5b53f8f151b7fc450e86703`, perskaityti `deploy/phonebridger/LAUNCH_STATUS.md`, `COMMERCE.md`, `docs/PHONEBRIDGER_INTEGRATION.md`. Naujesnis source owner atnaujinimas, ne mūsų pakartotas payment testas. PR tebėra OPEN; jo buvimas nereiškia, kad main clone turi šį runtime.
3. Vietinio native projekto `InputShare/PRODUCT.md`, `PRODUCTION_PLAN.md`, `RELEASE.md`: produkto paskirtis ir beta istorija. Senas PRODUCT mini beta.4 / nepatikrintą domeną, o RELEASE prasideda beta.10 2026-10-03. Šios senos nežinomybės nenusveria naujo gyvo HTTP; testų deklaracijos nėra mūsų fresh native QA.

Native source perskaitytas savininko vietiniame `Documents/Codex/2026-10-01/labas-as-pasidares-kad-mano-telefonas/InputShare/`. Šis kelias nėra kito kompiuterio priklausomybė. Į mūsų Git kopijuojamos tik išvados, ne native projektas ar jo duomenys.

## Dabartinis pasiūlymas

| Patikra | Rezultatas | Ribos |
| --- | --- | --- |
| [Homepage](https://phonebridger.com/) | HTTP200, Windows+Android, iki trijų telefonų, USB/Wi-Fi, demo ir beta | Demonstracinė animacija neįrodo konkretaus fizinio telefono veikimo |
| [Shop](https://phonebridger.com/shop/) | HTTP200, app/1/2/3 holders, black/silver, one-time V1 | Static HTML turi planned/preparing fallback; JS aktualizuoja iš catalog. Vien HTML netinka spręsti live checkout būseną |
| [Catalog](https://phonebridger.com/api/shop/catalog) | HTTP200, mode=live, edition=phonebridger-v1-20261006, MB Memocasting, USD29/49/65/79, visi keturi offers available, manual_dropship, shippingAmount0 | Tik kainos/availability deklaracija. Ne actual supplier stock, naujas paid receipt, native activation ar fizinio pristatymo įrodymas |
| [Reviews](https://phonebridger.com/api/shop/reviews) | HTTP200, count0, average null | Nėra tikrų klientų įvertinimų šiame feed |
| Viešas kontaktas | hello@phonebridger.com | Priimta šio produkto išimtis; neveikia taisyklė perrašyti jį info@pinet.lt |
| LAUNCH_STATUS pabaiga | Owner deklaruoja live entry, du unpaid readiness Sessions ir expiry callbacks, naujausią worker eff640d2-76e6-4292-8ba0-75da4f4c5b8b | Root šių veiksmų nekartojo. Ne patvirtinti realūs pardavimai, paid-live webhook/receipt inbox, supplier fulfilment, payout ar native activation |

`/api/commerce/catalog` iš pradžių buvo mūsų spėjimas ir grąžino404. Tikras endpointas rastas perskaičius viešą `assets/shop-v2/shop.js`, tada `/api/shop/catalog` grąžino200. Neįrašyti klaidingo URL į integracijos kontraktą.

Gyvame homepage yra aiškiai sample pažymėtų atsiliepimų ir illustrative/demo ekranų. Acquisition neturi jų naudoti kaip social proof. Prieš kampaniją source savininkas turi parinkti reklamai tikrus demonstravimo įrodymus ir išspręsti klaidinančio citavimo riziką. Šis tyrimas homepage neperdaro.

## Konkurencijos pirminiai šaltiniai

| Šaltinis | Kas faktiškai perskaityta | Sprendimo reikšmė |
| --- | --- | --- |
| [Oficialus scrcpy GitHub](https://github.com/Genymobile/scrcpy), 2026-10-07 | Android valdymas Windows/Linux/macOS, USB/TCP, free/open source, mirroring, mouse/keyboard, audio; USB debugging įprastoje eigoje, OTG išimtis | Stiprus nemokamas pakaitalas. Negalime pristatyti USB/Wi-Fi/pelės kaip unikalios naujovės. Mokama vertė turi būti įrodytas konkretaus darbo patogumas |
| [DeskDock kūrėjo Google Play aprašas](https://play.google.com/store/apps/details?id=com.floriandraschbacher.deskdock.free&hl=en), 2026-10-07 | USB mouse sharing per kraštą, keli Android, Windows/Linux/macOS, atskiras PRO su keyboard/URL drag-drop | Artimas darbo modelis jau egzistuoja. Neteigti, kad ekranų krašto perėjimas vien mūsų funkcija; regioninę Play kainą neperkelti į USD benchmark |
| [Microsoft Phone Link pagalba](https://support.microsoft.com/en-us/windows/apps/phonelink/setting-up-and-using-phone-screen-in-the-phone-link), 2026-10-07 | Oficialus phone-screen naudojimo puslapis pasiekiamas | Alternatyva turi būti tikrinama pagal konkretų telefoną; nepublikuoti universalios nesuderinamumo ar mūsų pranašumo lentelės be realių bandymų |

Inference: pirmiausia vertinti žmones, kurių telefonas jau stovi prie Windows monitoriaus ir kurie nuolat persijungia tarp Android programų ir darbo PC. „Visi Android vartotojai“ būtų per plati, neįrodyta auditorija. Konkurentų siūlomos funkcijos neįrodo PhoneBridger paklausos ar konversijos.

## Facebook techninis kelias

| Pirminis šaltinis / bandymas | Kas patikrinta | Kaip naudoti |
| --- | --- | --- |
| [Meta How We Combat Scraping](https://about.fb.com/news/2021/04/how-we-combat-scraping/), paskelbta2021-04-15, perskaityta2026-10-07 | Meta aprašo automated collection be jos leidimo ribojimą ir atskiria įprastą prieigą | Nėra mūsų asmeninio collector leidimo. Būtina atual current terms/access patikra prieš live |
| [Zapier savo Groups integracijos pašalinimas](https://help.zapier.com/hc/en-us/articles/23970212345357-App-update-Facebook-Groups-app-removal), aktualus puslapis perskaitytas2026-10-07 | Vendor nurodo savo Groups app sustabdymą nuo2024-04-22 | Seno Zapier Groups tutorial nelaikyti veikiančiu keliu. Tai Zapier produkto faktas, ne pirminis įrodymas apie visas dabartines Meta galimybes |
| [Meta Graph v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) |429 / prieiga nepavyko | Tikslios dabartinės API galimybės UNVERIFIED; planas jų neprasimano |
| [Meta automated collection terms](https://www.facebook.com/legal/automated_data_collection_terms) | Login / block, visas tekstas neperskaitytas | Dabartinių sąlygų priėmimas UNVERIFIED; nenuspręsti, kad savininko autoriza pakanka |
| [Messenger platform](https://developers.facebook.com/docs/messenger-platform/), [send messages](https://developers.facebook.com/docs/messenger-platform/send-messages/), policy overview | Nepavyko /429 | Recipient scopes, API version, langai, permissions ir app review turi būti patikrinti actual adapterio etape. Nekoduoti atmintinai24h/7d išimčių |

Zapier puslapio siūlomas private-replies paaiškinimas neperkeltas į techninį kontraktą, nes tiesioginiai Meta dokumentai nebuvo patikrinti. Joks šio tyrimo šaltinis neįrodo, kad mūsų paskyra / Page turi konkretų programinį leidimą.

## Įrankio pasirinkimas

Pradžiai: esamas Python core/DB, operator GUI, bounded Codex CLI, vienas priimtas kanalo adapteris. Jau turima darbo eilė ir žinių projekcija svarbesnės už naują SaaS. Mokamų social-scraping/CRM prenumeratų ar paid ads neaktyvuoti. CUA/MCP/Playwright yra vykdymo priemonės, ne platformos teisių šaltinis. Local runner nedirba išjungtame PC.

Treg katalogo skill matytas, tačiau callable provider įrankių šioje sesijoje nebuvo. Neįdiegta, neprisijungta ir kreditai nenaudoti; nemokamas pirminių HTTP/web šaltinių tyrimas atliktas nepriklausomai. Tai nėra acquisition Treg integracijos priėmimas.

## Būtinos nežinomybės iki piloto

- Actual PhoneBridger Business įrašas ir approved knowledge feed bendrame agentų runtime.
- Konkretus valdomas FB Page, personal sesijos ir action scope, aktualios platformos / grupių taisyklės.
- Actual Windows/native release, fizinių telefonų kompatibilumas ir reprezentatyvus setup testas.
- App licence vykdymas, tikras paid-live outcome, payout ir tiekėjo pristatymas; istorinis unpaid readiness jų nepakeičia.
- AI/time/support/holder/shipping/payment/refund/tax sąnaudos ir actual įnašas. GyvasUSD katalogas neįrodo pelningumo.
- Live atribucija ir privacy / consent / retention pagal naudojamą kanalą; cookie ar el. pašto buvimas nėra marketing subscription.

Toliau vykdyti [roadmapą](../../FB_AGENT_ROADMAP.md), aktualias kainas/kanalų taisykles prieš live patikrinti dar kartą.

## V2 — Page turinys, grupės ir diskusijos

2026-10-07 savininkas paprašė platesnio pelno/aktyvausPage modelio. Nė vieno account action ar naujo runtime testo neatlikta. Šio tęsinio pirminiai šaltiniai:

| Šaltinis | Perskaitytas įrodymas / riba | Plano sprendimas |
| --- | --- | --- |
| [Meta Join a Facebook group](https://www.facebook.com/help/ipad-app/401492893195007) | Search ištrauka apima oficialų tekstą apie Pages prisijungimą, admin draudimą, dalyvavimo/membership skirtumą. Direct open nukreipė login/temporaryblock; actual mūsų grupės UI netikrinta | Page-as-group kanalas planuojamas sąlyginai su exactactor/membership/rules; nepretenduoti į priimtą grupių API |
| [Meta Original Creators2026](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/),2026-03 | Originalumo / meaningfultransform gairės perskaitytos; neprisiskiriame Meta bendrų growth skaičių kaip savo prognozės | Originalios mūsų demonstracijos ir savas naudingas turinys; reach nėra pažadas |
| [Meta Spam2025](https://about.fb.com/news/2025/04/cracking-down-spammy-content-facebook/),2025-04 su update | Fake/coordinated engagement ir netinkamas spam mažina vertę pagal Meta tekstą | Jokio fake cross-Page engagement, copybroadcast ar nereikšmingų linkcomment |
| [Meta Engagement bait](https://about.fb.com/news/2017/12/news-feed-fyi-fighting-engagement-bait-on-facebook/),2017su vėlesniaisupdate | Atskiriamas dirbtinis engagementbait ir tikras patarimo/rekomendacijos klausimas | Naudingi diskusijų klausimai leidžiami; „komentuok+“, tagbait nėra augimo taktika |
| [Pages posts](https://developers.facebook.com/docs/pages-api/posts/), [Reels publishing](https://developers.facebook.com/docs/video-api/guides/reels-publishing/), [Page webhooks](https://developers.facebook.com/docs/pages-api/webhooks-for-pages/) | Direct429; aktualūs endpoint/permission/media/metrics scope nepriimti | Konkretaus formato transportas priimamas per actual dokumentus/prieigą vėliau; neteigti, kad visi post/media/insights metodai prieinami |

Šio tyrimo išvada: būtinas originalus Page kalendorius ir public discussion/inbound kelias, tačiau Page UI funkcija nėra bendras leidimas programiškai veikti grupėse. Turinio/konversijos/kaštų darbo sutartis [PROFIT_ENGINE](PROFIT_ENGINE.md). Nepradėtos kampanijos, Page kūrimas, subscription, creator contracts ar paid ads.
