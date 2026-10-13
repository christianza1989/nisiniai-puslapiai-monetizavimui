## Aktualus įgyvendinimo checkpoint — 2026-10-11

Facebook OAuth jau įdiegtas ir tikru Meta savininko prisijungimu patikrintas trial: relogin, unlink/session revocation, freshOAuth → OTP → relink,8visits preserved. App1827877621543839 Unpublished, Website platform ir test instructions saved. [Aktualus ROADMAP](../community-20261011/ROADMAP.md) ir [kvitas](../community-20261011/RECEIPT.json) pakeičia žemiau esančio pradinio tyrimo būsenų lentelę. AppReview submission1827877654877169 Not submitted; verifiedbusinessportfolio ir factualdatahandling atsakymai reikalingi, konkretūs Allowedusage sutikimai laukia savininko. PublicFBmain disabled; user_friends nepridėtas, pilnoFacebookdraugų sąrašo nėra. Toliau išsaugotas pradinis tyrimas.

# Madbeauty Facebook integracija: tyrimas ir įgyvendinimo planas

Tyrimas: 2026-10-11. Remtasi 14 tiesiogiai Chrome perskaitytų oficialių Meta dokumentų. Tai siūlomas produkto ir techninis planas. Savininkas patvirtino, kad Meta programėlės dar nėra; Facebook Login ir draugų atradimas dar neįdiegti. Meta leidimų patvirtinimas ir jo trukmė nežinomi.

## Rekomenduojamas rezultatas

**Tęsti su Facebook → Sekti meistrą → Pakviesti draugą → pasirenkamai Atrask draugus Madbeauty.** Prisijungimas, meistro sekimas, rekomendavimas ir Facebook draugų atradimas yra nepriklausomos funkcijos. Pagrindinis kelias veiks ir be draugų leidimo. Draugų atradimo peržiūra neturi stabdyti prisijungimo.

Klientams ir meistrams naudoti įprastą Facebook Login. Facebook Login for Business skirtas Meta verslo ištekliams prijungti ir būtų atskiras būsimas salonų Page / Instagram integracijos modulis. Tai nėra būtinas klientų ar meistrų prisijungimo produktas. [Meta Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business).

| Galimybė | Sprendimas | Būsena |
|---|---|---|
| Facebook registracija / login | Tikras serverinis OAuth, minimalūs leidimai, saugus esamos paskyros susiejimas | Reikia Meta programėlės |
| Pakviesti bet kurį draugą | Žmogus pats pasidalina vieša meistro nuoroda | Kvietimo langas jau veikia |
| Privatūs kvietimai telefone | Įrenginio bendrinimas; Messenger tik jei įrenginys jį pasiūlo; nuorodos kopijavimas | Veikia |
| Messenger mygtukas kompiuteryje | Send Dialog su App ID; gavėją pasirenka pats žmogus | Planuojamas po programėlės sukūrimo |
| Draugai, kurie dirba meistrais | Tik tos pačios programėlės draugai su abiejų suteiktu `user_friends` ir meistro atrandamumo pasirinkimu | Papildomas etapas, App Review |
| Pilnas Facebook draugų sąrašas | Draugų API jo nesuteikia | Tokiu būdu neįmanoma |
| Sekti meistrą / jo naujienos | Nuosavas Madbeauty modulis, visiems prisijungimo būdams | Dabar tik privatus išsaugojimas |
| Automatiškai rašyti draugams | Login ir draugų leidimas tokios galimybės nesuteikia | Nekuriama |

Graph API v26.0 dokumente patikrinta: `/friends` grąžina draugus, kurie naudoja tą pačią programėlę ir suteikė `user_friends`; užklausančiajam taip pat reikia šio leidimo. Vadinasi, net visi Madbeauty vartotojai automatiškai netaps matomu draugų sąrašu. [User Friends](https://developers.facebook.com/docs/graph-api/reference/user/friends/), [Permissions Reference](https://developers.facebook.com/documentation/development/permissions#user_friends).

## 0. Jau įgyvendintas pagrindas

Abiejuose domenuose įdiegtas naujas el. pašto kodo registracijos / prisijungimo dizainas ir „Pakviesti draugą“ viešuose meistrų bei salonų profiliuose. Kvietimo lange yra Facebook bendrinimo nuoroda, įrenginio bendrinimas ir kopijavimas. Lango atidarymas nieko neišsiunčia. Draugas gali peržiūrėti profilį, darbus, prisijungti ir išsisaugoti meistrą.

Esamas `sharer.php` kelias praktiškai patikrintas Chrome: atsidarė Facebook įrašo kūrimo dialogas su bandymo domeno nuoroda. Įrašas nepublikuotas; gavimas ar pristatymas netikrintas. Tai nėra dokumentuoto Share Dialog API garantija. Kopijavimas ir įrenginio bendrinimas lieka alternatyvos. Vieša sekėjų bendruomenė dar nesukurta.

## 1. Meta programėlės pasiruošimas

1. Sukurti savininkui priklausančią Madbeauty programėlę su Facebook Login naudojimo scenarijumi. App ID viešas; App Secret tik saugi serverio konfigūracija, ne pokalbis, JavaScript ar Git.
2. Pridėti tikrus domenus, programėlės ikoną, kontaktą, veikiančius privatumo / šalinimo puslapius ir tikslius HTTPS OAuth callback adresus. Siūlomas naujas adresas: `https://madbeauty.lt/api/auth/facebook/callback`; jis dar neįdiegtas.
3. Production ir development konfigūraciją atskirti. Rekomenduojama atskira testinė Meta programėlė; skirtingų programėlių app-scoped ID negalima laikyti universaliu žmogaus ID.
4. Skydelyje patikrinti `public_profile` ir `email` prieigos būsenas ir atlikti reikalingą išorinės auditorijos prieigos didinimą. Veikimas administratoriui nėra veikimas visiems klientams. `user_friends` prašyti atskirai tik realiai veikiančiam atradimui.
5. Kai reikia Advanced Access, atlikti reikiamą Business Verification ir App Review. Nepridėti reklamų / Pages / Instagram leidimų, kurių šis login nenaudoja.
6. Paruošti veikiantį peržiūros kelią, demonstraciją ir kiekvieno leidimo paskirties bei duomenų tvarkymo paaiškinimą. Dabartinė bandymo aplinka baigia galioti 2026-10-17; vien jos URL netinka ilgalaikei Meta peržiūrai. Reikės stabilios review aplinkos arba patikrinto riboto kelio tikrame domene.

Meta dokumentuoja prieigos didinimą vartotojams be app rolės ir papildomo personalizavimo App Review. Faktinis procesas priklausys nuo sukurtos programėlės būsenų. [Create an App](https://developers.facebook.com/documentation/facebook-login/create-an-app), [App Review](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review), [Business Verification](https://developers.facebook.com/documentation/development/release/business-verification).

## 2. Facebook Login ir esamos paskyros

Rekomenduoju serverio OAuth redirect srautą be nuolat įkeliamos Facebook SDK visoje svetainėje. Facebook atidaromas tik paspaudus mygtuką; el. pašto kelias lieka nepriklausomas. Meta dokumentuoja `state`, serverinį code exchange, tokeno patikrą ir atsisakymą. [Manual Login Flow](https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow).

**Pirmas kartas:** „Tęsti su Facebook“ → Facebook leidimas → „Patvirtink el. paštą vizitų laiškams“ → vienkartinis kodas → paskyra. Facebook grąžintą el. paštą pasiūlyti laukelyje, bet nelaikyti pakankamu esamos Madbeauty paskyros susiejimo įrodymu. Jei jo nėra, žmogus įrašo kontaktą. Vardą / avatarą rodyti kaip redaguojamą pasirinkimą.

**Vėlesni kartai:** tas pats patikrintas Facebook identifikatorius → esama paskyra → ankstesnis meistras ar rezervacijos žingsnis. Kodo kiekvieną kartą nereikia; jautriam paskyros keitimui gali reikėti papildomos patikros.

Šis sprendimas suderinamas su dabartiniu backend: `schema.sql` reikalauja `accounts.email NOT NULL`, o vizitų laiškai naudoja šį kontaktą. Nekurti fiktyvių email ar paralelinės paskyrų sistemos. Pirmo karto OAuth rezultatas laikomas nebaigta serverine autentifikacija; paskyra ir Facebook ryšys atominiu veiksmu sukuriami / susiejami tik patvirtinus kontaktą. Registracijai be jokio el. pašto reikėtų atskiros accounts, pašto, kliento kortelių ir atkūrimo sutarčių migracijos; šiame etape jos nerekomenduoju.

| Techninė dalis | Siūloma sutartis |
|---|---|
| Pradžia | `POST /api/auth/facebook/start`, esamas CSRF, 32 atsitiktinių baitų state, serverio hash, sesijos ryšys, 5 min. galiojimas, vienkartinis suvartojimas |
| Callback | Tikslus leistas host / redirect; serverinis code exchange; tikrinti tokeno `app_id`, `user_id`, galiojimą ir suteiktus leidimus |
| Saugojimas | Nauja centrinė `auth_identities`: site, provider, app_id, subject, account_id, timestamps; unikalus `(site, provider, app_id, subject)` |
| Susiejimas | Prisijungus pasirinktas „Prijungti Facebook“ su pakartotine patikra arba patvirtintas email kodas; ne automatinis merge pagal vardą / email |
| Sesija | Esama hash / CSRF / cookie sutartis; po login sesijos rotacija; tik leistas vidinis grįžimo tikslas |
| Secret / tokenai | Secret tik Worker secrets. Tokenai, kodai ir asmeniniai Graph URL nekeliauja į browser storage / viešus logus / assets / Git. Login-only tokenas nelaikomas ilgiau nei būtina patikrai |
| Leidimai | Login ir friends atskiros funkcijų vėliavos. Atsisakymas / sutrikimas leidžia grįžti prie email kodo |
| Avataras | Viešas meistro avataras publikuojamas jam pasirinkus per esamą medijos sutartį; darbų galerija atskira |

Tai nauji siūlomi endpointai ir saugojimo elementai. Realizacija turi apimti vietinį backend ir native Worker / Durable Object, versijuotą migraciją, atomines operacijas ir restart testus. Facebook patvirtina žmogų; salono owner / manager / practitioner teises nustato esamos Madbeauty narystės. Login nesuteikia operatoriaus ar salono valdymo prieigos.

## 3. Kvietimas ir graži meistro nuoroda

Meistro profilio kvietimo lange rodyti tikrą vardą, viešą nuotrauką ir aiškius pasirinkimus. Telefone pirmenybė – įrenginio bendrinimas, kompiuteryje – Facebook ir po programėlės sukūrimo privatus Send Dialog. Visur kopijavimas. Popup ar clipboard klaida nepanaikina nuorodos.

Send Dialog nereikalauja papildomų leidimų, tačiau reikia App ID, mobile nepalaikomas ir dokumente nėra siuntimo rezultatų duomenų. Nerodyti „Draugas pakviestas“, kai tik atidarytas langas. Gavėjus žmogus pasirenka pats. [Send Dialog](https://developers.facebook.com/documentation/sharing/reference/send-dialog).

Sukūrus programėlę vertinti dokumentuotą Share Dialog. Dabartiniame dokumente kai kurie redirect parametrai žymimi deprecated; konkretų būdą patikrinti su tikra programėle. Nenaudoti svetimos demonstracinės App ID. Žmogus pats pasirenka auditoriją ir įrašo tekstą. [Share Dialog](https://developers.facebook.com/documentation/sharing/reference/share-dialog).

Viešam patvirtintam profiliui serveris be JavaScript turi grąžinti `og:title`, `og:description`, `og:url`, absoliutų `og:image` ir matmenis. Siūlomas Madbeauty 1200×630 vaizdas: tikra meistro nuotrauka, vardas, miestas, paslaugos ir violetinė detalė. Reitingas tik iš tikrų patvirtintų atsiliepimų. Sintetiniai trial reitingai nepersikelia į realaus profilio kortelę.

Patikrinti crawler HTTP atsakymą, viešą vaizdą, canonical ir faktinį Sharing Debugger rezultatą. Bandymo aplinka lieka neindeksuojama ir pažymėta testine; jos dialogo atidarymas nėra production kortelės kokybės priėmimas. [Sharing Best Practices](https://developers.facebook.com/documentation/sharing/best-practices).

Nuorodoje nėra auth tokenų, vizitų ar gavėjų ID. Ateities rekomendacijų matavimui – atskiras atsitiktinis kvietimo kodas su galiojimu ir canonical į tikrą profilį. Siuntėjo vardas / avataras viešai nerodomi savaime. Share paspaudimas nėra pristatyta žinutė ar naujas klientas.

## 4. Nuosavas „Sekti meistrą“

Išplėsti išsaugojimą į „Mano meistrai“: nauji vieši darbai / paslaugos ir paprastas pakartotinis rezervavimas. Veikia visiems Madbeauty vartotojams, įskaitant email login.

Rekomenduoju atskirą `provider_follows`, kad esami `favoriteIds` automatiškai nevirstų naujienų prenumerata. Ryšys unikalus pagal klientą / organizaciją; sekimas ir pranešimų kanalas atskiri. Sekėjo tapatybė privati pagal nutylėjimą. Viešą skaičių galima rodyti tik iš realių aktyvių ryšių; vardai ir nuotraukos nepublikuojami be aiškaus pasirinkimo.

Pradėti nuo naujienų paskyroje. Email / push: atskiras įjungimas, dažnio ribos, atsisakymas, publikacijos idempotencija ir esama pašto eilė. Vienpusį ryšį vadinti „Sekti“, „Sekėjai“, „Mano meistrai“. „Draugai“ tiktų tik apibrėžtai abipusei draugystei.

## 5. „Atrask draugus Madbeauty“ – papildomas etapas

Diegti kai tikra programėlė gali prašyti `user_friends` ir meistrai pasirinko atrandamumą. Leidimo naudojimo atitiktį pateikti App Review; patvirtinimas negarantuojamas.

Kelias: atskiras paaiškinimas → leidimas → „Tavo draugai, kurie dirba Madbeauty“ → meistro vardas, jo pasirinkta vieša nuotrauka, miestas ir paslaugos. Atsisakius leidimo likusios funkcijos veikia. Tuščia būsena paaiškina ribotą sąrašą ir siūlo kvietimo nuorodą.

Serveris: patikrinti leidimą → puslapiuotas `/me/friends` → ASID susieti su tos pačios programėlės tapatybėmis → filtruoti aktyvų practitioner ryšį ir atrandamumo pasirinkimą → grąžinti tik patvirtintą viešą projekciją. Salono registratūros narystė pati savaime nepaverčia žmogaus viešai atrandamu meistru.

Nerodyti draugų klientų vizitų, lankytų salonų, išsaugotų meistrų ar kontaktų. Draugų grafo nekopijuoti kaip nuolatinės DB. Siūloma ne ilgesnė kaip 24 val. cache, išvaloma atšaukus leidimą / išjungus atradimą; konkretų tokenų laikymą patvirtinti realizacijos specifikacijoje. Meistro atrandamumo išjungimas galioja iškart, nepriklausomai nuo cache.

Mažame tinkle funkcija gali dažnai būti tuščia. Atskirai matuoti leidimo suteikimą, tikrus atradimus ir jų naudą. Kvietimas bei sekimas lieka pagrindas. Pilno sąrašo scraping nėra alternatyvus įgyvendinimo kelias.

## 6. Atsiejimas, šalinimas ir priežiūra

Paskyroje rodyti prijungtą Facebook ir „Atsieti“; prieš atsiejimą patikrinti alternatyvų login. Deauthorization callback pašalina atitinkamus tokenus ir friends cache. Facebook duomenų pašalinimas ir visos Madbeauty paskyros ištrynimas yra atskiri aiškūs veiksmai; platformai lieka jau patvirtinta saugojimo tvarka.

Siūlomas deletion callback: patikrintas HMAC-SHA256 `signed_request`, idempotentinis Facebook duomenų šalinimas pagal ASID, atsakymas su atsitiktiniu confirmation code ir HTTPS būsenos nuoroda be viešo asmens ID. Netinkamas parašas nieko nešalina. Išvalyti tapatybę, iš Facebook importuotus duomenis ir cache; backup atkūrimas neturi sugrąžinti pašalinto ryšio. Tai dar neįdiegta automatika. [Data Deletion Request Callback](https://developers.facebook.com/docs/apps/delete-data).

Meta gali reikalauti kasmetinių / situacinių patikrų. Technines klaidas ir tokenų būseną stebėti galima automatiškai; verslo patvirtinimai ir administratoriaus deklaracijos gali reikalauti žmogaus. Turėti atsakingą perspėjimų gavėją. Praradus Meta prieigą email login veikia toliau. [Data Use Checkup](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/data-use-checkup), [Maintaining Data Access](https://developers.facebook.com/documentation/development/maintaining-data-access).

Jei vėliau pasirenkama SDK, patikrinti automatinį App Events rinkimą. Login savaime nereikalauja Pixel / reklamos integracijos ar klientų procedūrų siuntimo Meta. [Facebook Login apžvalga](https://developers.facebook.com/documentation/facebook-login).

## 7. Darbų eilė ir priėmimas

| Etapas | Rezultatas | Priėmimo sąlyga |
|---|---|---|
| P0 – baigtas | Naujas login/register ir profilio kvietimas | 37 produkto/backend testai; native ir live patikros; realus trial OTP / copy |
| P1 – pagrindinis | Meta app, tikras login, susiejimas, atsiejimas, deletion | Tikra skydelio prieiga ir sėkmingas išorinis vartotojas, ne tik app administratorius |
| P2 – socialinis pagrindas | Sekimas, mano meistrai, OG kortelė ir kvietimai | Privatumas, tikri profiliai, crawler / Debugger, mobile / desktop |
| P3 – papildomas | Draugai-meistrai | `user_friends` patvirtinimas, abiejų sutikimas ir praktinė nauda |
| P4 – būsimas app | Native login, app links ir native sharing | Konkretus iOS / Android SDK ir atskiras dabartinių taisyklių tyrimas |

P1 testai: naujas / esamas klientas; nėra Facebook email; atsisakytas leidimas; tapatybė jau priklauso kitai paskyrai; email sutapimas be auto-merge; du tabai / concurrency; callback replay; kita sesija; expired state / token; klaidingas App ID; host ir vidinio return tikrinimas; sesijos rotacija; restart; pirmo OTP atominė idempotencija; atsiejimas; deauthorization; deletion parašas / pakartojimas; email login regresija; jokio role paaukštinimo.

P2/P3 testai: Android / iOS ir Facebook vidinė naršyklė; desktop; popup blokavimas; share atšaukimas; nepalaikomas Web Share; clipboard klaida; nebepublikuotas profilis; tuščias friends; tik vienas draugas davęs leidimą; išjungtas atrandamumas; narystės panaikinimas; Graph klaidos / pagination / limitai; klientų duomenų nebuvimas viešoje projekcijoje; unsubscribe ir pranešimų idempotencija. Sintetiniai trial meistrai nėra tikros Facebook tapatybės.

Naujas mygtukas įjungiamas tik išbandžius visą realios programėlės kelią ir taikomą prieigą. App ID, redirect sutartis ir Graph versiją fiksuoti release; tyrime dokumentas rodė v26.0, versiją patikrinti programėlės kūrimo metu. Šis planas nenumato naujų mokamų paslaugų, automatinių įrašų ar žinučių siuntimo.

## Oficialios dokumentacijos patikros žurnalas

Visi šaltiniai perskaityti Chrome 2026-10-11. Dalies web fetch užklausų atsakymas buvo 429, todėl naudota tikra naršyklė. Dokumento atnaujinimo data ir mūsų patikros data skiriasi.

| Dokumentas | Rodoma atnaujinimo data | Patikrinta |
|---|---|---|
| Permissions Reference | 2026-09-29 | Minimalūs leidimai ir jų paskirtys |
| Facebook Login | 2026-03-03 | Login produktas ir App Events |
| Manual Login Flow | 2026-06-30 | Code exchange, state, debug_token, callbacks |
| User Friends | Data nerodoma; v26.0 | Tos pačios app draugai ir jų leidimai |
| Share Dialog | 2026-06-30 | App ID / OG / deprecated parametrai |
| Send Dialog | 2026-06-30 | Mobile nepalaikomas, nėra siuntimo rezultato |
| Create an App | 2025-06-23 | Auditorijos prieiga ir review |
| Business Verification | 2023-07-07 | Advanced Access prielaidos |
| App Review | 2024-04-10 | Realios funkcijos demonstravimas |
| Sharing Best Practices | 2022-02-23 | Crawler / OG / Sharing Debugger |
| Data Deletion Callback | 2025-11-07 | Signed request ir šalinimo būsenos sutartis |
| Data Use Checkup | 2024-09-16 | Kasmetinės patikros |
| Maintaining Data Access | 2024-03-25 | Neaktyvumas ir prieigos priežiūra |
| Login for Business | 2026-06-30 | Atskiras verslo išteklių produktas |

Dar nepatvirtinta: būsimos programėlės prieigos būsenos, verslo patikra, Meta review trukmė / friends naudojimo patvirtinimas, native SDK ir tikrų meistrų dalyvavimas. Šios nežinomybės netrukdo veikiančiam kvietimui ir email login.
