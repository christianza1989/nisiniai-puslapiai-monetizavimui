# Minimalus Meta Page prijungimas

Ši eiga paremta tikru2026-10-14 own-Page prijungimu. Meta UI ir platformos taisyklės keičiasi: naują jungtį tikrink actual UI ir [oficialiame Pages gide](https://developers.facebook.com/documentation/pages-api/), o ne spėk pagal seną mygtuko vietą. Core Graph versija nustatyta page_api_graph.py; vien docs datos pakeitimas jos neatnaujina.

## Programa ir vieno Page pasirinkimas

1. Perskaityk pavedimą: konkretus Page, leidžiami veiksmai, tokenų privati saugojimo vieta ir naujos persistent API prieigos autorizacija. Įprasto login nereikia paversti kiekvieno posto approval. Nauji Terms / Developer Policies / materialiai nauja prieiga vertinami tuo veiksmu pagal actual browser tool; aiški ta pati jau suteikta autorizacija nekartojama.
2. Patikrink, ar savininko esama programa realiai turi Pages paskirtį ir reikiamas teises. App pavadinimas to neįrodo. Jei neturi, pagal pavedimą kurk tinkamą programą su „Manage everything on your Page“ paskirtimi; nelaikyk ads-only / Threads / WhatsApp programos automatiškai tinkama. Nepridėk svetimo Business portfolio, vien dėl to, kad jis rodomas sąraše.
3. Dabartiniam Page tekstui / photo ši realizacija reikalauja `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `pages_read_user_content`. Comment/reply naudoja pastarąsias3. Pradiniam savo Page sąrašui / pasirinkimui papildomai reikia `pages_show_list`; tai ne kitų žmonių profilių skaitymo leidimas. Neprašyk business_management, ads ar Messenger vien publikavimo testui.
4. Graph API Explorer pasirink tik tą programą, tada User Token ir konkrečias reikiamas permissions. OAuth pasirinkime pažymėk tik pavedimui priklausantį Page. Prieš galutinį save perskaityk pažymėtų Page sąrašą, ne vien viršutinį pavadinimą. Numatytasis „visi Page“ buvo realiai stebėtas — vien žodinis ketinimas nėra vieno Page apimtis.
5. Patikrink išsaugotą apimtį Facebook Business Integrations programos nustatymuose: Save→reopen, visų scope Page pasirinkimai. Jei netyčia suteikta platesnė apimtis, prieš kitą turinio / duomenų veiksmą susiaurink tik tą programą iki autorizuotų Page, iš naujo patikrink ir užfiksuok pradinę klaidą. Nekeisk kitų programų prieigų. UI veiksmo timeout gali reikšti jau pritaikytą click — pirmiausia perskaityk actual rezultatą.

`pages_read_user_engagement` buvo nesutampantis gido literalas; reali2026-10-14 UI teisė yra `pages_read_user_content`. Core tikrina pastarąją ir turi nepriklausomą actual-scope literal regresiją. Trūkstamo scope nepašalink vien dėl PASS. Nauja platformos kaita turi konkrečią sutarties / actual token patikrą ir source pataisą.

## Tokenai ir tapatybė

Explorer „User or Page“ pasirinkimas turi rodyti tik autorizuotus Page; paimk tik tikslų Page tokeną. Esamą password-manager login / reauthentication naudok pagal įrankio taisykles, neskaitant slaptažodžio. OTP / CAPTCHA ar credential keitimas atliekami pagal actual tool režimą. App Secret „Show“ po parodymo gali virsti „Reset“, o ne „Hide“ — Reset nėra paslėpimo mygtukas ir jo nespausk.

Tokeną perskaityk tik iš aiškaus credential UI lauko ir iškart saugok privačiai. Nesiųsk jo į pokalbį, operator API body, screenshots, Git ar browser URL. Patikrinimo programai reikalingas app tokenas; jei naudojama app_id|app_secret forma, visa reikšmė yra paslaptis. Naudok bounded server-side HTTPS užklausas, be redirects/proxy/retry ir be raw URL / response logging.

[Oficialus long-lived token kelias](https://developers.facebook.com/documentation/facebook-login/guides/access-tokens/get-long-lived): savo serverio pusėje exchange trumpą User Token per `/oauth/access_token` su grant_type=fb_exchange_token, client_id, client_secret ir fb_exchange_token; iš long-lived User Token per `/me` nustatyk app-scoped user ID, tada per to vartotojo `/accounts` gauk tik autorizuoto Page tokeną. Reikalauk tiksliai tikėtino Page sąrašo; netęsk, jei jame kiti neautorizuoti Page. App secret į browser Explorer užklausą nekopijuojamas. Šis vienkartinis bootstrap nėra job worker retry.

Long-lived Page tokenui gali būti expires_at0. Tai nėra garantija, kad jis nebus atšauktas, kad scopes / data-access nesikeis ar kad app yra production-ready. Esamo tokeno refresh su nepakitusia autorizuota apimtimi skiriasi nuo naujos prieigos suteikimo. Nekurk atskiro daemon vien tokenui refreshinti, jei pavedimas apima tik rankinį bandymą.

Tikras Graph Page ID gaunamas iš **Page Token GET `/me?fields=id,name`** ir palyginamas su tikėtinu vardu bei konkrečia savininko paskirtimi. Nenaudok browser profile ID kaip Graph ID ir nepriskirk Business asset ID automatiškai; jie gali sutapti, tačiau tai reikia įrodyti. Core verify papildomai tikrina debug_token PAGE tipą, programą, granular Page targets ir galiojimą. Browser binding saugo būtent actual UI profilio/Page ID.

## Privatus runtime ir verify

Failas turi būti po **šio checkout** `agent-business-core/runtime/artifacts/`, ignored, ne symlink, iki64KiB. Kiekviena jungtis turi visus Credentials laukus:

```json
{"credentials":[{"key":"business-page","site_id":"SITE","environment":"ENV","account_key":"SHARED_ACCOUNT_KEY","page_id":"GRAPH_PAGE_ID","app_id":"APP_ID","page_token":"PRIVATE_PAGE_TOKEN","app_token":"PRIVATE_APP_TOKEN"}]}
```

Tai schema, ne veikianti jungtis: realias reikšmes užpildyk tik privačiame faile. site/env/key turi duoti tiksliai vieną įrašą. account_key sutampa su to paties Facebook login Computer Use binding; skirtingi Page / verslai toje paskyroje netampa nepriklausomais locks. Windows failo ACL apribok savininkui / runtime tapatybei ir SYSTEM; Linux naudok tam runtime tinkamą0600. Vartotojui nerodyk paslapčių komandos išvestyje.

`PINET_FACEBOOK_PAGE_CREDENTIALS_PATH` įrašomas į to runtime privačią konfigūraciją. Serverį reikia normaliai perkrauti iš naujo source/config, ne laikyti, kad senas procesas pats pasikeitė. Patikrink konkretų loopback portą, proceso nuosavybę, database/environment ir STUDIO_NETWORK_SETTINGS arba PINET_PUBLIC_CORE_PATH. Nesustabdyk kito AI / svetainės proceso; nerodyk `.env` turinio.

Operator POST `/operator/sites/SITE/facebook/page-api/verify` priima tik `{credential_key}`. Galima vykdyti esant master/API off. Būtinas realus `state=verified`, `fixture=false`, tikėtinas Page vardas / ID, veiksmui reikalingas actions sąrašas ir būsimas valid_until. Core patikros proof galioja daugiausia24h net expires_at0 tokenui; prieš naują prasmingą partiją atlik naują GET verify. Nuolatinis automatinis proof refresh nėra įjungtas.

## Įjungimas ir pirmas tikras įrašas

Naudok [FACEBOOK_PAGE_API](../../../agent-business-core/FACEBOOK_PAGE_API.md) normalias operator policy / queue ir worker run-once sąsajas. Įjunk tik master ir API, jei nereikia Computer Use. Įjunk browser policy atskirai tik tam autorizuotam darbui. Abiem aktyviems transportams nustatyk tą pačią bendro testo kvotą. Pirmas tekstas ar vaizdas yra Codex peržiūrėta užduotis; ne vaizdinio vedlio „ready“ įrodymas.

Vienas actual POST turi durable provider ID, GET autoriaus / teksto patikrą ir, pirmo prijungimo metu, matomą Facebook rezultatą su teisinga auditorija. App Unpublished / testing režimas, savininko vaidmuo ir production App Review yra atskiros sąlygos. Šio core own-Page gyvas testas veikė Unpublished programoje; to neperkelk kaip kitų naudotojų / kitų programų production leidimo.

Baigus ribotą pavedimą pause ir sanitizuotas handoff. Git clone perduoda kodą, ne prisijungimą; kitame PC / runtime reikia iš naujo autorizuotos privačios jungties ir actual verify.
