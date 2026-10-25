# Senų URL ir backlinkų atkūrimas · 2026-10-23

Savininkas užsakė `/password` 301 į pagrindinį ir pilną rastų neveikiančių istorinių nuorodų peržiūrą. Vienkartinį Treg tyrimą autorizavo; dvi užklausos kainavo **0,053816 USD**. Tai nesuteikia jokio naujo periodinio tyrimo ar prenumeratos.

## Įrodymai ir inventorius

DataForSEO `backlinks/domain_pages/live`: 331/331 tiekėjo domeno URL įrašas, iš jų 86 turi bent vieną įrašytą backlinką. Užklausa `f652e515e4e64e348abc2f0accf79bc1`, kaina 0,035916 USD. SE Ranking: 94 backlinkų eilutės, užklausos limitas 200, kaina 0,0179 USD, ID `9e87e1afba3f477a8ebba50c79a6f1af`. Duomenų bazės puslapiai turi individualias ankstesnio tikrinimo datas; tai nėra dabartinis Google indeksas ar visų interneto nuorodų garantija. Tyrimas papildytas ankstesniu 100 CDX adresų inventoriaus mėginiu ir dabartine gimtąja puslapių projekcija.

Sujungtas 429 unikalių pilnų URL inventorius prieš publikavimą patikrintas HEAD: 103 × 200, 15 × 301, 3 × 308, 308 × 404; klaidų ir 429 nebuvo. Jame yra ir jau dabartiniai, ir dar suplanuoti nauji adresai, ne vien istoriniai gedimai. Privatus pilnas CSV: `qa/redirects-20261023/inventory-before.csv`.

Prieš pataisą `/` grąžino 200, `/password` 404. Varnių Parko nurodyto straipsnio dabartinis HTML turi nuorodą į `https://memocasting.lt/`, ne į slaptažodžio puslapį. Orangeprojects tiesioginę patikrą ribojo 403. Treg `/password` 2026-05-21 įrašas yra senas Shopify „Opening soon“ puslapis. Todėl savininko ekrano 302 atitinka ankstesnio parduotuvės užrakinimo pėdsaką; naujos svetainės pagrindinis dabar į jį nenukreipia.

## Sprendimai ir realizacija

PUBLIC šaltinis `c6810dbe`, bazė `4fe8f0ac`; atskirame tiksliai išvardytų kelių registre pridėta 166 nuorodos. 76 jų tikslai tyrimo metu jau vieši, 90 saugo nekeistas būsimų straipsnių laiko filtras. Kartu su 12 ankstesnių tinkamų perkėlimų patikrinama 178 taisyklių. Registre nėra bendro visų 404 nukreipimo. Pasirinkimų pagrindimas: `REDIRECTS_2026_10_23_MAP.mjs`; privatus konkretus puslapio ID, datos ir priežasties registras: `qa/redirects-20261023/decisions.private.json`.

- `/password` GET/HEAD → `/`, HTTP 301; slaptažodžio ir return URL parametrai neperduodami. POST, paskyros atkūrimas ir gilesni autentifikacijos keliai nepatenka į migraciją.
- Prekių ir rinkinių katalogo keliai veda į atitinkamą dabartinę prekę ar katalogą. Kontaktai, DUK, pristatymas, grąžinimas, privatumas ir sąlygos — į dabartinius tos pačios paskirties puslapius. Galerija — į tikrą `/#galerija` sekciją. Latvijos ir Estijos senos instrukcijos išlaiko kalbą.
- Senų dovanų temų variantai sujungiami į tos pačios temos gidus. Būsimo tikslo 301 neįsijungia anksčiau už patį tekstą. Publikavimo datos ir 1–2 straipsnių paros ritmas nekeisti.
- Pašalintas klaidingas mamos ir vaiko seno SKU `/products/seimos-rinkinys` nukreipimas į kitą šeimos SKU. Archyvinis produkto turinys patvirtina skirtumą; jis priklauso atskirai jau užsakytai prekių atkūrimo apimčiai su dar laukiamais dabartiniais kainos, pakuotės ir kiekio faktais. Naujas klaidingas pardavimo pasiūlymas nesukurtas.
- Angliškas turinys be patvirtinto angliško atitikmens, išparduoti/atkuriami atskiri produktai, nebeveikiančios parduotuvės kuponų funkcijos, wallet/auth URL ir neturinčios lygiaverčio atsakymo temos nepaverčiami nesusijusio pagrindinio puslapio kopijomis. Jų pilnos būsenos pateikiamos inventoriaus CSV.

Atkurtas viešas gimtasis puslapis dabar turi pirmenybę prieš seną aliasą. Originalus `4fe8f0ac` to neapsaugojo: bandyme atkurtą seną poros produkto puslapį vis tiek paslėpė 301. Priežastis pataisyta bendrame Memocasting URL pagalbiniame modulyje, pridėta regresija ir canonical istorinių URL taisyklė. Upgrade `upgrade-38b33f22-ac2d-4573-8a47-d0af61029e51`.

## Patikra ir publikavimas

Vietiškai: 187/187 testai, TypeScript, scoped ESLint be klaidų ir įspėjimų, production build ir Wrangler dry-run — PASS. Local Wrangler/Workerd peržiūra du kartus nepasiekė Ready dėl `read ECONNRESET`, pirmiausia su generuotu šablonu ir tada su sutikrintu tikru config; abu originalūs logai išsaugoti. Todėl pilnas standartinis vietinis `test:seo-smoke` nepatvirtintas ir nevadinamas PASS. Ši aplinkos klaida nepasikartojo tikrame edge; ji neištaisyta spėjamu bibliotekų atnaujinimu ar svetimų procesų stabdymu.

**Tikra produkcija priimta:** versija `74bbe063-c0c0-4373-8ca7-b7d6a7e2dbab`, 100%, PUBLIC `c6810dbed52621fe564e6363d51214921e710215`, patikrinta 2026-10-22T22:32Z (2026-10-23 Lietuvoje). Deploy exit 0. Visos 178 taisyklės patikrintos HTTP: 88 aktyvūs 301, 90 būsimų tikslų tebėra už laiko filtro. Visi 23 skirtingi aktyvūs tikslai grąžina tiesioginį 200 ir teisingą canonical; galerijos fragmentas egzistuoja. Tiesioginiai www 301, password užklausos pašalinimas ir atsitiktinių/nested/auth kelių 404 — PASS. Canonical aliasų patikra netaiko vieno žingsnio pažado HTTP→HTTPS ar ankstesniam framework trailing-slash 308.

Visas 429 pilnų URL inventorius po publikavimo: **103 × 200, 94 × 301, 3 × 308, 229 × 404**, be transporto klaidų ar 429. Tai 79 mažiau 404; 94 apima ir ankstesnį domeno/HTTPS normalizavimą bei query variantus, ne tik 88 registruotus aktyvius kelius. Likę 404: 110 kalbos atitikmens neturinčių angliškų adresų, 89 inventoriuje esančios būsimų tikslų aliasų formos (dar viena turi pirmą trailing-slash 308), 5 atskiri atkuriami produktai, 4 retired utility ir 21 lygiaverčio temos ar komercinio pasiūlymo neturintis adresas. Tai sąmoningi atskiri sprendimai, ne pažadas, kad kiekvienas istorinis ar išgalvotas URL turi tapti 301. Pilnas po-publikavimo URL CSV su tikslais, datomis ir sprendimais: `qa/redirects-20261023/inventory-after.csv`.

Papildoma tikro edge discovery patikra: tikslus sitemap 103 indexable puslapiams, 107 public, 74 future; laiko filtrą išlaiko HTML, medija, sitemap ir abu LLM eksportai. Native paketo hash ir 32/48 € bazinės kainos nepakito. Chrome atidarius `/password` pasiektas pagrindinis; senas Kalėdų mamai straipsnio adresas pasiekė teisingą gidą. Faktinis mobilus plotis 390, dokumentas 390, neveikiančių įkeltų vaizdų 0. Ekranai ir HTTP įrodymai: `qa/redirects-20261023/{password-home-desktop.png,redirect-article-mobile.png,hosted.private.json,postflight.private.json,discovery.private.json}`. Tai nėra pilno naujo checkout ar visos WCAG sistemos auditas.

Tikslas — esamas `memocasting-site`, account `d102163f74a45ab6d33bca786ce281ec`. Prieš tai aktyvus frontend `23c651f6-62e6-49f0-b966-3ed229c5774c`; backend `380e46b2-9955-4feb-b604-8c1dce26fdd2`. Tikri bindings, domenai, stebėsena ir suderinamumo parametrai skaitomi prieš deploy. Native paketas lieka `65fd3278-fe56-4bfb-b7c6-7b8b41ef8f3c`, SHA `88f6bd82a3eb840594144bef0f800d674b883f571993dce661435e43e7312645`. DNS, slapti raktai, užsakymai ir mokėjimai nekeičiami. Git šaka/PR 31 ir CORE PR 101 nėra main sujungimo ar kito PC pritaikymo įrodymas.

Rollback: po intervenuojančių pakeitimų patikros grąžinti nurodytą ankstesnį frontend; šaltinyje atšaukti tik šios apimties commit ir taisyklės papildymą. DB ar studijos istorinių duomenų atkurti nereikia. Nauji Treg įrodymai į bendrą privačią studijos tyrimo sąsają importuoti išsaugant 61 ankstesnį stebėjimą.

## DR reikšmė

Savininkas pranešė Ahrefs DR 16 → 3; ankstesnio Ahrefs nuorodų profilio neturime, todėl kritimo priežastis neįrodyta. Tinkami nuolatiniai peradresavimai atkuria kelią iš senų nuorodų, bet negarantuoja konkretaus DR ar Google pozicijų. Pirminiai šaltiniai: [Google URL perkėlimas](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), [Ahrefs apie DR kritimą](https://help.ahrefs.com/en/articles/2061537-why-has-there-been-a-drop-in-my-domain-rating-dr-recently-did-your-crawl-algorithm-change).

Canonical CORE taisyklės aprėptis žurnale atskirta nuo PUBLIC kodo: upgrade-70536725-8e6d-43b6-9206-b732d68dc70e (CORE PR101), o upgrade-38b33f22-ac2d-4573-8a47-d0af61029e51 apima viešą realizaciją (PUBLIC PR31). Abiejų main sujungimas nepatvirtintas.
