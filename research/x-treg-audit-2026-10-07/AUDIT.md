# Treg ir X: verslo augimo galimybių auditas

2026-10-07 · būsena: tyrimas ir siūlomas modulis, ne įjungtas X agentas. [Įrodymai](EVIDENCE.md), [roadmapas ir piloto priėmimas](ROADMAP.md). Apimtis — katalogas, jungties sąsaja, naudojimo sutartys, ekonomika ir mūsų core tinkamumas. Tai nėra nepriklausomas viso treg saugumo ar visų jo API veikimo auditas.

## Sprendimas

X verta išbandyti **PhoneBridger**: originalios produkto demonstracijos, tikslinių klausimų ir konkurentų problemų tyrimas, kūrėjų atranka, tinkamas inbound. Tai auditorijos hipotezė; šiame audite nepirkti tikri paieškos rezultatai, todėl paklausa ir pirkimų potencialas dar UNVERIFIED. Antras kandidatas — Verslomatika su tikru, patikrintu automatizavimo pasiūlymu. Neįjungti X visoms vietinėms nišoms vien dėl prieinamo API.

Pirmas techninis rezultatas turėtų būti viena prižiūrima X kanalo realizacija esamame agent-business-core. Ji naudotų bendrus verslo faktus, darbų registrą, per-nišos izoliaciją ir pardavimų matavimą. Treg yra išorinio transporto / duomenų tiekėjas; jis nepakeičia strategijos, planuoklio, CRM ar pelno vertinimo.

## Ką turime dabar

| Sritis | Faktinė būsena |
| --- | --- |
| Treg paskyra | Esama prisijungusi naršyklės sesija apžiūrėta read-only; nekurta nauja paskyra ir nekeistos jungtys |
| X jungtis | Connections inventoriuje X nėra; X puslapyje read/write „not requested yet“, viršutinis Connect mygtukas disabled. Priežastis nepatvirtinta; nebandyta jungtis |
| X leidimų sąrašas | Read: tweet.read/users.read/offline.access. Write papildomai tweet.write. Tai siūlomi, ne suteikti leidimai; matomame sąraše nėra DM/media scopes |
| Įrankiai | Prisijungusioje sąsajoje 123 pagrindiniai + 50 setup; vieša tools lentyna 173, platesnė catalog/x lentyna 217 su alternatyviais tiekėjais. Tai skirtingi inventoriai, ne mūsų įjungtų funkcijų skaičius |
| MCP / CLI šiame vykdytojuje | Treg MCP metodų nėra tarp iškviestų tools; `treg` nerastas PATH, TREG_TOKEN env nėra. Tai nereiškia, kad kitame procese ar kompiuteryje nėra prieigos |
| Mūsų Treg core | [SEO/GEO tyrimo modulis ir privatus evidence adapteris](../../docs/TREG_SEO_INTEGRATION_QA_2026-10-07.md) jau dokumentuoti. Tai ne socialinio publikavimo adapteris; jo ankstesni testai nevadinami šio audito testais |
| Mūsų social runtime | Source turi facebook preparation modulį ir routerį. Tikrintuose runtime failuose atskiro X modulio / routerio nerasta. FB plano kodas neįrodo X siuntimo |
| Šio audito veiksmai | Vieši metadata GET ir naršyklės inventorius; jokių `/call`, mokamų provider užklausų, postų, reply, DM, OAuth suteikimo, tokenų eksporto ar topup |

Account savininko email, kitų jungčių asmeniniai identifikatoriai, žali paskyros ekranai ir naršyklės OAuth URL į Git nekopijuoti.

## Naudingiausios katalogo galimybės

Žemiau — perskaityti endpoint kontraktai, o ne mūsų vykdytų provider užklausų rezultatai. `platform_eligible=false` nėra „niekada neveikia“: own-account veiksmams reikia tinkamos jungties. Konkretaus endpoint vardas ir JSON kūnas nėra viso kanalo leidimo įrodymas.

| Paskirtis | Konkretus endpoint | Audito radinys |
| --- | --- | --- |
| Problemos / produkto paminėjimų paieška | [x.x.search-posts-recent](https://treg.to/catalog/endpoints/x.x.search-posts-recent) | Oficialus GET, paskutinės 7 d., $0,005 už grąžintą postą; max_results/pagination riboti |
| Pigus viešas tyrimas | [anyapi.x.search.posts](https://treg.to/catalog/endpoints/anyapi.x.search.posts) | POST query/limit/cursor/queryType; $0,00075 už sėkmingą užklausą. Tiekėjo sąlygų ir duomenų kilmės priėmimas atskiras |
| Kelių tiekėjų tyrimas | [treg.x.search.posts](https://treg.to/catalog/endpoints/treg.x.search.posts) | Routed POST su q; children AnyAPI/TikHub/JustOneAPI, nurodomas served_by. Bazinė kaina nėra visų fallback bandymų viršutinė riba |
| Originalus įrašas | [x.x.post.create](https://treg.to/catalog/endpoints/x.x.post.create) | POST /2/tweets; reikia write. Kontrakte aiškus URL kainos padidėjimas; body neapima media |
| Atsakymas / savo thread tęsinys | [x.x.post.reply](https://treg.to/catalog/endpoints/x.x.post.reply) | reply.in_reply_to_tweet_id; kiekviena dalis atskira operacija, thread gali likti dalinis |
| Inbound paminėjimai | [x.x.get-users-mentions](https://treg.to/catalog/endpoints/x.x.get-users-mentions) | GET su since_id / pagination; paminėjimas dar turi būti įvertintas pagal jo tikslą |
| Medija | [x.x.media-upload](https://treg.to/catalog/endpoints/x.x.media-upload) | Input body laukai atrodo kaip schema descriptor type/required/note; nepakanka teisingam upload sukonstruoti |
| DM | [x.x.create-direct-messages-by-participant-id](https://treg.to/catalog/endpoints/x.x.create-direct-messages-by-participant-id) | Tas pats body descriptor trūkumas; DM galimybė nepriimta pagal mūsų matomus scopes |
| Privatūs post analytics | [x.x.get-posts-analytics](https://treg.to/catalog/endpoints/x.x.get-posts-analytics) | Own-account prieiga; kataloge nėra observed rezultato. Nepriskirti mums impressions/conversion laukų be actual atsakymo |

Paieškos empty rezultatas gali reikšti query / coverage / recency problemą. HTTP sėkmė ir katalogo observed success rate neįrodo tinkamų pirkėjų, pilnos istorijos ar mūsų patikros. Skirtingų provider formatų, cursor ir semantikos nesuplakti į tariamai vienodą X API.

## Kainų ir nemokamumo patikra

Iš pirmo žvilgsnio publikavimo kaina buvo nevienoda. Išskleidus paskyros Billing and limits ir perskaičius endpoint cost.note, neatitikimas paaiškėjo: tekstinis postas $0,015, su URL — $0,20. Tai ne patvirtintas Treg atsiskaitymo defektas. [Oficialus X kainoraštis](https://docs.x.com/x-api/getting-started/pricing) atitinka šią skirtį; post read $0,005/resource, user read $0,01/resource, DM create $0,015/request.

Pagal [Treg dabartinį onboarding](https://treg.to/llms.txt), X jungtis per Treg programą yra išimtis iš bendro own-connection nemokamumo. BYO developer app nereiškia nemokamo X: Treg tarpininkavimo mokestis gali būti 0, bet lieka upstream usage. Owned Reads $0,001 taikomi tik atitinkantiems savo app/savo duomenų atvejams, ne vien todėl, kad prijungėme savo profilį prie Treg app. Bendras UI „your account“ ar „never metered“ tekstas nėra endpoint tarifo įrodymas.

**Iliustraciniai 30 d. skaičiavimai, ne užsakytas biudžetas ir ne realios sąnaudos:**

| Vienos nišos veiksmai | Skaičiavimas | Tik šios API dalies suma |
| --- | --- | --- |
| 60 sėkmingų AnyAPI paieškų | 2/d. × 30 × $0,00075 | $0,045 |
| Oficialios paieškos, po 10 apmokestinamų postų | 2/d. × 30 × 10 × $0,005 | $3,00 |
| 20 originalių postų be URL | 20 × $0,015 | $0,30 |
| 20 originalių postų su URL | 20 × $0,20 | $4,00 |
| 300 apmokestinamų inbound paminėjimų | 300 × $0,005 | $1,50 |
| 100 tinkamų automatinių reply be URL, tik po priėmimo | 100 × $0,015 | $1,50 |

Šios alternatyvos nesumuojamos kaip vienas pasirinktas planas. Read pavyzdžiai konservatyviai laiko kiekvieną resource apmokestinamu; X dedup / Treg cache ar replay negarantuoti ir nevertinti kaip sutaupymas. Neįtraukti media upload, threads papildomos dalys, webhook / monitoring, AI, palaikymas, turinio gamyba ir konversijų infrastruktūra. 30 nišų vien URL-post pavyzdys reikštų $120/mėn.; „po truputį“ nėra „nemokamai“.

Pirminė live spend riba lieka 0, kol nesuderintas konkretus mažas bandymas. Esamas sąskaitos balansas nėra šio agento biudžetas. Kiekvienam vykdymui — actual price modifiers, reserve ir settled charged_micro/call_id; account/tag biudžetai nepakeičia atominio vietinio išlaidų valdymo. Nepiginti klaidinančiai perkeliant sales URL į automatinį reply: tai dar vienas veiksmas su savo kaina ir taisyklėmis.

## X apribojimai, kurie keičia mūsų architektūrą

[X automation taisyklės, atnaujintos 2026-04](https://help.x.com/en/rules-and-policies/x-automation): AI reply botams reikia išankstinio aiškaus rašytinio X patvirtinimo; vien keyword search neleidžia automatiškai atsakyti svetimam žmogui. Atsakymams reikia tinkamos žmogaus iniciatyvos, opt-out ir vieno automatinio atsakymo per sąveiką. DM galimybė ar follow nėra pakvietimas. Automatiniai likes / reply hiding draudžiami; X svetainės scripting nelaikomas API pakaitalu.

Todėl mūsų projektinis sprendimas:

| Režimas | Siūlomas kelias |
| --- | --- |
| Tyrimas | Leistinas source → nišos klausimų / kampų analizė; nerinkti visų profilių į kontaktų sąrašą |
| Originalus savo turinys | Patvirtinti faktai / assets → peržiūrėtas postas → API; atskiras publikavimo mandatas, o ne reply bot approval pakaitalas |
| Atsakymai į svetimas keyword užklausas | Draft-only / rinkos analizė; default live reply OFF. Maža kvota nepanaikina platformos vartų |
| Tinkamas inbound AI reply | Tik po X approval, actual scopes ir sąveikos pagrindo. Kiekvienas naujas inbound tikrinamas; nėra neribotos follow-up sekos |
| DM | Atskiras priėmimas ir aktualūs leidimai; neįtraukti į pirmą pilotą, kol kontraktas nepriimtas |
| Savo thread tęsinys | Publication paskirtis, tik patikrintas savo parent postas; negali apeiti reply vartų svetimam parent |

Automatizuotos paskyros atpažinimą įvertinti pagal [X automated account label pagalbą](https://help.x.com/en/using-x/automated-account-labels). UI label savaime nesuteikia reply bot leidimo. Treg tokenas ir savininko FB mandatas taip pat nesuteikia X approval. Nė vienas dokumentas čia neprašo savininko tvirtinti kiekvieno būsimo įprasto posto: reikės konkretaus kanalo mandato ir jo ribų, o ne per-post ritualo.

## Komercinė kryptis ir kūryba

PhoneBridger pirmam bandymui rinkčiausi anglišką originalų produkto profilį su vienu use-case: Windows pelė / klaviatūra ir šalia stovintis Android. Pirkėjo kelias remiasi tikra dabartine versija, suderinamumu ir beta/licencijos skirtimi iš [ankstesnio produkto tyrimo](../facebook-agent-phonebridger-2026-10-07/RESEARCH.md); tą informaciją atnaujinti prieš live. Nežadėti iOS, universalaus suderinamumo ar fake fizinės demonstracijos.

- Tikri desk-setup veiksmai ir aiškus „kam verta / kam užtenka alternatyvos“.
- Android/Windows poravimo ir leidimų paaiškinimas, aktualūs release pokyčiai.
- Tikrų klausimų temos ir kūrėjų bendradarbiavimo hipotezės; kūrėjas nėra jau pirkėjas ar sutartas partneris.
- Naudingi palyginimai su scrcpy/DeskDock/Phone Link, patikrinus aktualius faktus; negaminti tariamų benchmarkų.

Pradinis siūlymas: 4 originalūs įrašai per savaitę keturias savaites. Dvi produkto pamokos/demonstracijos, viena alternatyvų ar setup išvada ir vienas realus diskusijos klausimas. Tik sąmoningai pasirinktuose konversijos postuose tiesioginis URL; nėra pažado, kad X „baudžia nuorodas“ ar kad toks santykis laimi algoritme. Kol medijos kelias nepriimtas, ši kadencija negali būti vadinama paruoštu vizualiu kanalu.

Paieškos briefai: `(PhoneBridger OR DeskDock) lang:en -is:retweet`, `"Android" "keyboard" "PC" lang:en -is:retweet`, `"phone" "desk setup" lang:en -is:retweet`. Tai hipotetinės query, ne rasti signalai; [oficiali query semantika](https://docs.x.com/x-api/posts/search/integrate/build-a-query) turi būti patikrinta pasirinktam provider. Pirmiausia žiūrėti Latest ir klausimo tikslą, ne vien Top ar didelį like skaičių. Search → useful topic/partner candidate, ne search → automatinė reklama komentare.

Verslomatika galima antram B2B bandymui tik su aiškia teikiama paslauga ir įrodytu rezultatu. Madbeauty galėtų tirti salonų programinės įrangos / partnerių poreikį; vietinių rezervacijų srauto efektyvumas X neįrodytas. Traktorių padangos, pastoliai, tvoros ir smulkūs namų darbai lieka SEO/FB ir kitų vietinių kanalų hipotezėmis; X įjungti tik radus konkrečią auditoriją ir geresnę ekonomiką.

## Core spragos ir įgyvendinimo išvada

Reikia: kanalo capabilities/permission registro, original-content job, X account/site susiejimo, atskiro inbound policy, provider-native cursor ir cost ledger, patvaraus dispatch ir receipt, GUI kalendoriaus bei actual conversion feed. Nesiremti FB browser lease kaip X API autentifikacija. D1/pašto forma išlieka nepriklausoma; tik projekto adresu gautas kontaktas tampa esamu CaseSource.

Didžiausi nepriimti vartai: X jungtis ir tikras actor, disabled Connect priežastis, media/DM parametrų ir OAuth kelias, AI reply approval, paid runtime/spend mandatas, actual PhoneBridger aktyvacijų / pardavimų matavimas. Juos spręsti etapais pagal [ROADMAP](ROADMAP.md); šis auditas neprideda veikiančio runtime ar naujų išlaidų.
