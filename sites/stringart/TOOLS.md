# Stringart - įrankių ir integracijų planas

2026-10-13 | BUSINESS 1 versija | siteId stringart, domenas nenustatytas | core SHA 7af6b9641012a30c5f95eac38a66daeff8f8cb39 | dabartinė apimtis: tyrimas / planas, ne runtime.

Mokamas rezultatas: pristatytas individualus paveikslas; priimta įranga; veikiančios vietinės studijos paketas. Tiekimo, aparatų API, mokėjimų ir kitų gamybos integracijų priėmimo įrodymų nėra.

| Sritis | Dabar | Vėliau / įjungimo sąlyga |
| --- | --- | --- |
| Poreikis ir pirkėjai | Pirminiai vieši produkto / rinkos puslapiai | Lokalizuoti SERP / apimčių duomenys tik su atskiru biudžetu ir geo patikra |
| Tiekėjas / produkto faktai | Savininko PDF, gamintojo pirminiai puslapiai ir prieštaravimų registras | Gamintojo patvirtinta specifikacija, atitiktis, bandymo priėmimas |
| Pokalbis / klientas | Peržiūrimas gamintojo laiško juodraštis | Esamo mail / case core adapteris po autorizuoto prijungimo; ne atskiras CRM |
| Vykdymas | Serverinio užsakymo / gamybos būsenų specifikacija | Įrangos failų adapteris ir apmokėjimo / siuntos patikra |
| Matavimas ir medija | Vieneto ekonomikos prielaidos; tikrų demonstracijų planas | Realios maržos, grąžinimai, partnerio / influencerio priskyrimas |

## Kandidatas: vieši pirminiai puslapiai ir savininko dokumentai

- Paskirtis: modelio, kainos, MOQ, konkurentų pasiūlymo ir produkto apribojimų patikra. Dabar.
- Tapatybė / šaltiniai: PLAN.md S1-S13 ir savininko stringmachine katalogas; peržiūrėta 2026-10-13. Įvestis URL / PDF → konkretus teiginys, data ir prieštaravimas.
- Rinkos / kalbos: LT, ES konkurentų EN / NL / PL, gamintojo EN, RingString RU. Oficialus puslapis patvirtina tik skelbiamą pasiūlymą; mūsų pristatymas / paklausa neįrodyti.
- Sąnaudos: naudojamo read-only viešo tyrimo naujų provider mokėjimų 0 USD. Prenumeratų / pirkimų leidimo nėra.
- Duomenys / teisės: tik vieši produkto faktai ir savininko pateiktos medžiagos; žali klientų duomenys nerenkami. Medijos pernaudojimo teisės nepatvirtintos.
- Alternatyva: gamintojo pasirašyta specifikacija ir savo bandymų žurnalas. Stop: prieštaraujantis modelis ar nepatikrinama tapatybė.
- Savininkas: MB Pinet. Priėmimas: SKU atitinkantys dokumentai ir fizinis bandymas. Būsena: **verified read-only source review**, ne patvirtintas tiekėjas.

## Kandidatas: limadata.google.serp.organic

- Paskirtis: būsimų bendrųjų paieškos temų šaltinių atranka; dabar tik katalogas. Treg search/get atlikta 2026-10-13.
- Provider: LimaData; [API dokumentacija](https://api.limadata.com/docs/basic_v2). POST /api/v1/search/web; įvestis query ir page → organic results.
- Geo / kalbos: katalogo įvestyje nėra šalies / kalbos kontrolės. Netinka patvirtinti TOP1 visose ES šalyse arba LT/lt rinkos pozicijos.
- Kaina: 0,002 USD už sėkmingą kvietimą, HTTP klaidos nemokestinamos pagal katalogą. Leidžiamas execution biudžetas šiame darbe 0; provider call neatliktas.
- Vendor reported HTTP sėkmė 0,9383 iš 21 049 imčių; tai nėra semantinio tikslumo ar indeksavimo įrodymas. Mūsų kokybė nematuota.
- Duomenys: tik bendros produkto užklausos, be asmens / klientų duomenų. Alternatyva: vieši pirminiai puslapiai; locale-aware endpoint atskirai tik po jo get ir leidimo.
- Stop: trūksta reikiamos geo sutarties. Trigger: apibrėžta rinkos užklausa, tinkamas įrankis ir biudžetas. Savininkas MB Pinet. Būsena **deferred**, netinka lokalizuotų pozicijų priėmimui.

## Kandidatas: serpstat.google.keywords.volume

- Paskirtis: būsimų konkrečios rinkos raktažodžių paklausos įvertinimas; dabar tik katalogas.
- Provider: Serpstat; [API sutartis](https://api-docs.serpstat.com/docs/serpstat-public-api/2brcbdgmr6rcx-get-keywords-info), Treg get 2026-10-13. POST JSON-RPC method SerpstatKeywordProcedure.getKeywordsInfo, id, params.keywords ir params.se → grąžintų frazių apimtis / CPC / konkurencija.
- Aprėptis: iki 1 000 frazių; reikia konkrečios bazės kodo. LT/lt ir pasirinktų ES rinkų aprėptis šiam darbui nepatikrinta. Negrąžinta frazė nėra nulinė paklausa.
- Kaina: 0,0005 USD už grąžintą frazę, tuščiam atsakymui 1 kredito minimumas pagal katalogą. 20 frazių vienos bazės būsimam bandymui orientyras iki 0,010 USD, patvirtinus dabartinę sutartį. Dabar execution leidimas 0, call neatliktas.
- Treg search rodė HTTP success 1,0 / 8 153; get apraše yra ribotos semantinės aprėpties atsiliepimų. Mūsų LT kokybė nematuota.
- Duomenys: produkto frazės, be PII. Alternatyva: pirmos šalies GSC, kai domenas / paskyra yra ir leista; viešas rinkos tyrimas be apimčių.
- Stop: geo nepalaikoma arba atsakymas ne toje rinkoje. Trigger: konkreti lokalizacija ir scoped biudžetas. Savininkas MB Pinet. Būsena **candidate / not executed**.

## Kandidatas: influencersclub.creators.enrich.analytics

- Paskirtis: prieš kūrėjo kampaniją vertinti auditorijos atitikimą ir veiklos rodiklius. Vėliau, ne automatinis influencerių kontaktavimas.
- Provider: influencers.club; [analytics sutartis](https://docs.influencers.club/openapi/enrich-by-handle-analytics/public_v1_creators_enrich_handle_analytics_create), Treg search/get 2026-10-13.
- Įvestis handle / viešas URL / YouTube @handle ir platform; platformos instagram, tiktok, twitch, twitter, youtube ir onlyfans pagal katalogą. Šiam verslui onlyfans nenumatyta. Output - auditorijos / posting / likes / comments ir modeliuotos analizės suvestinė, ne pardavimų rezultatai. include_lookalikes pradžioje false.
- Kaina 0,4784 USD už sėkmingą kvietimą (0,8 kredito). 5 kūrėjų būsimo bandymo riba 2,392 USD be papildomų kvietimų; tai pasiūlymas, ne autorizacija. Dabar provider spend 0.
- Aprėptis: LT / DE / NL auditorijų duomenų pilnumas nepatikrintas; patvirtinto patikimumo / samples šiame get nėra. Mūsų bandymas neatliktas. Modeliuoti duomenys nėra tikri pirkimai.
- Teisės: tik reikalingi viešų profesinių kanalų suvestiniai faktai; nekaupti nereikalingų asmens kontaktų. Sutartas saugojimas ir naudojimo teisės prieš provider testą.
- Alternatyva: rankinis viešų paskutinių 10 vaizdo įrašų peržiūrėjimas ir paties kūrėjo pateikta auditorijos suvestinė. Stop: nėra aktualios auditorijos / tinkamo turinio / teisėto naudojimo.
- Trigger: priimtas produktas, konkretūs 5 kanalai ir kampanijos biudžetas. Savininkas MB Pinet. Priėmimas: tinkama rinka, turinio teisės ir realaus pardavimo bandymas. Būsena **candidate / not executed**.

## Kandidatas: esamas turinio, case ir mail core + Stringart adapteris

- Paskirtis: lokalizuotos svetainės, kontaktai, užsakymo atvejis ir aptarnavimo tęstinumas; palaipsniui po sistemos pavedimo.
- Šaltinis / data: šios fresh main bazės CONTENT_CORE, SEO_GEO_CORE, MAIL_CORE ir agent-business-core sutartys; konkretaus Stringart runtime šio tyrimo metu nėra. Tai potencialus pakartotinis naudojimas, ne viso core vykdymo auditas.
- Įvestis: siteId / partnerId, patvirtinti faktai, peržiūros versija, apmokėjimas ir siunta → per-site / per-partner dokumentai ir užsakymo būsenos.
- Aprėptis: kalba, pardavėjas, valiuta ir PVM pagal realią rinką. Tikros išmokos, tenant isolation, failų saugojimas ir partnerių ecommerce nepriimti.
- Kaina / biudžetas: naujo modulio darbo valandos, hostingas, mokėjimų / siuntų / modelių kaina dar nesąmatuota. Naujos prenumeratos ir live įjungimas šiuo planu neautorizuojami.
- Teisės: duomenų minimizavimas, operatoriaus ir partnerių atskyrimas, nuotraukų ištrynimas, veiksmų istorija. Žalių klientų duomenų į Git nekopijuoti.
- Alternatyva: vienos studijos rankiniu būdu valdoma eiga prieš platesnę automatizaciją, naudojant priimtą duomenų saugojimą. Stop: nėra aiškaus pardavėjo / duomenų teisėtumo / gamybos kontrolės.
- Trigger: konkretus sistemos įgyvendinimo etapas. Savininkas MB Pinet. Priėmimas: viena pilna serverinė eiga, tikros autorizuotos operacijos ir partnerių atskyrimo patikra. Būsena **deferred implementation**.

## Kandidatas: gamintojo failų generatorius ir įrangos adapteris

- Paskirtis: patvirtintos nuotraukos failą paversti konkrečia gamybos užduotimi.
- Šaltiniai: PLAN S3-S5 ir pateiktas FAQ; data 2026-10-13. Viešame ALINEDECO yra design.alinedeco.com nuoroda; dokumentuotas API šio tyrimo metu negautas ir nenaudotas.
- Įvestis / output: nuotrauka, dydis, vinutės, siūlas / spalvos → peržiūra ir aparatui tinkamas failas. Konkreti formato / API sutartis nežinoma.
- Kaina: pateiktame PDF nemokama programinė įranga, tačiau licencijos partneriams, API, SLA, serverių ir būsimų mokesčių sąlygos nepatvirtintos. Neriboto nemokamo API nepažadėti.
- Aprėptis: PDF Windows ir aktualių puslapių browser režimai prieštarauja; patikrinti konkrečiam SKU. Mūsų hardware bandymas neatliktas.
- Duomenys / teisės: nuotraukų serveris, vieta, deletion ir komercinės integracijos teisės nežinomos. Reikalinga sutartis; realių nuotraukų nekelti į nepriimtą srautą.
- Alternatyva: operatoriaus priimtas vietinis failų perdavimas; licencijuotas alternatyvus generatorius tik po formato ir teisių patikros. Stop: nėra teisėto / tęstinio failo paruošimo arba atitikties.
- Trigger: suderintas SKU ir bandoma mašina. Savininkai MB Pinet ir gamintojo techninė komanda pagal būsimą sutartį. Priėmimas: patvirtintas vaizdas atitinka fizinį darbą, failas versijuotas, nutrūkimo / atkūrimo bandymas. Būsena **blocked by missing supplier contract**, ne runtime.

## Peržiūra ir išlaidos

Planui pritaikytas pilnas kliento kelias, įskaitant tiekimą, kokybę, garantiją, mediją ir partnerių ekonomiką. Paid provider calls 0 / spend 0 USD. Stripe Directory sąranka patikrinta per oficialią dokumentaciją; CLI / connector paieška neprieinama, paieškos rezultatų neišgalvojome. Tiekėjų pasirinkimas remiasi savininko dokumentais ir pirminiais viešais puslapiais. Naujo atkuriamo Stringart bendro core kodo defekto šiame planavimo darbe nenustatyta; shared code nekeičiama. App managed-worktree kūrimo klaida išsaugota QA ir apeita atskira švaria CLI worktree; tai ne core source pataisa.
