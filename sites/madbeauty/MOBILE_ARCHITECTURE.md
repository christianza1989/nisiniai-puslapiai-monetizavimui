# Madbeauty — web, PWA ir būsimos programėlės pagrindas

2026-10-05. ADR: pasirinktas API-first web pagrindas; visa implementacija PLANNED. Šis dokumentas neaprašo Fresha vidinės architektūros. Jo UI tik produkto orientyras pagal [peržiūrą](FRESHA_UX_REVIEW.md).

## Sprendimas dabar

Tęsti visą privatų web prototipą pagal [PROTOTYPE_ROADMAP](PROTOTYPE_ROADMAP.md), mobile-first, su mock adapteriu. Vieši SEO katalogai, profiliai ir straipsniai lieka bendro host-aware SSR core paviršius. Kliento, meistro ir operatoriaus darbo vietos web gali turėti kitokią navigaciją / kompoziciją; paskyrų bundlas neturi apkrauti viešo gido.

Nuo pirmo kodo atskirti UI nuo sutarties: entity ID, tipai, runtime input/output validacija, klaidų kodai, route resolver, valdomas clock ir transporto adapteris. Backend kalendorius / rezervacijos / autorizacija yra vienas autoritetas visiems klientams. Web peržiūros adapterio kontraktas turi tikti realiam HTTP adapteriui; local role switch ar fixture state nepakeičia serverio.

Etapais: responsive web → išbandyta web PWA galimybė → prireikus native kliento app su Expo / React Native. Meistro ir operatoriaus web workspace nuo to nepriklauso. Native app reikalingumą grįsti grįžtančių naudotojų poreikiu, priminimų / pakartotinio vizito verte ir palaikymo ekonomika; neįrašome fiksuoto išgalvoto vartotojų slenksčio.

[Expo Router](https://docs.expo.dev/router/introduction/) palaiko web/iOS/Android navigaciją. Mums jis kandidatas būsimai native sąsajai, ne priežastis dabar perkelti esamą public SEO core į kitą framework. [PWA gairės](https://web.dev/learn/pwa/) aprašo web įdiegiamumo galimybes; actual platform support ir naudotojo pasirinkimas turi būti patikrinti. Nėra pažado, kad bet kuris PWA yra pilna native app.

## Paieškos ir tapatybės sutartys

SearchIntent: entityKind (treatment/category/venue/practitioner), taxonomyServiceId, konkretus providerServiceId tik pasirinkus, resultMode, explicit cityId, ribota mapArea, date ir visas kliento intervalas. Žemėlapio judinimas automatiškai nepakeičia miesto; būsimas /paieska išlaiko context. SearchResultServiceOption ir SlotCandidate turi konkretų variantą/priedus, location/practitioner/resource, UTC pradžią/pabaigą ir source/asOf/expiry. Serveris dar kartą perskaičiuoja tinkamumą prieš hold/confirm.

Organization, Location, Practitioner, Resource, authUser ir membership atskiri ID; solo vardas nėra universalus tenant raktas. Public hours ir darbo pamainos skirtingos; jos su closed periods/competence/resursais jungiamos explicit booking taisyklėje.

Pirmoji native app, jei reikės — klientui. Meistro ir operatoriaus web neprivalo tapti atskiromis app; professional native tik pagal actual poreikį. Vienas API/tenancy/calendar autoritetas aptarnauja abi būsimas sąsajas. Map adapteris lieka optional: demo galima originali aiškiai scheminė vietos panelė, live paslaugos licencija/kaina/quota prieš integraciją dar nepatvirtinta.

## Mažiausia bendra kodo riba

Siūlomos loginės ribos, dar ne sukurti katalogai / npm paketai:

| Riba | Bendra web / native | Kas lieka atskirai |
|---|---|---|
| contracts | Provider/Location/Practitioner/ProviderService, SearchIntent, Availability, Inquiry, Booking ir revision modeliai; serializuojami DTO ir runtime validatoriai | Public projection neduoda tenant kliento kontaktų ar privataus grafiko. |
| domain helpers | EUR minor units, duration, aiškus laiko formatavimas, booking status labels, idempotency-key naudojimas, route context | Nepriima sprendimo, ar slotą galima rezervuoti; serveris perskaičiuoja visas taisykles. |
| transport | Tos pačios API operacijos, error codes, pagination, retry / cancellation sutartis; mock / HTTP adapteriai | Web auth ir native auth skirtingi platformos adapteriai. Sekretų į bendrą klientinį paketą nedėti. |
| design tokens / content | Spalvos, spacing, tipografikos skalė, LT tekstai / pranešimai, media metadata | HTML/CSS komponentai ir native komponentai bei kalendoriaus gestai turi savo realizaciją. Nežadame 100 % UI reuse. |
| routes | Service/catalog/profile ID → stabilus web URL + pasirinktas leidžiamas UI kontekstas | Native screen mapping, PWA shell, SSR metadata / JSON-LD ir service-worker lifecycle. |

Nepradedame mikroservisų, kelių duomenų bazių ar antros booking logikos dėl būsimos app. Viešo tinklo core adapteris teikia approved public projekciją; marketplace privatus runtime projektuojamas atskirai ir sujungiamas pagal WORKSTREAMS, nekeičia esamos bendros content-package schemos vien dėl šio plano.

## Būsimos API operacijos — sutartis, ne veikiantys endpointai

| Operacija | Reikalavimas |
|---|---|
| catalog.search / provider.read | Approved siteId / provider / revision; bounded filters; stable pagination; jokio kitų tenantų privataus turinio. |
| availability.search | providerServiceId, locationId, practitionerId arba any, paslaugų priedai, localDate, timezone, viso vizito intervalas; grąžina concrete resource, start/end UTC, asOf, expiresAt, scheduleVersion ir viešą kainos/trukmės santrauką. |
| inquiry.create | Tikras page/source kontekstas; dedup, patvarus ID, atskira delivery būsena. Užklausa nėra Booking.confirmed. |
| booking.hold / confirm | Serverio resursų konfliktai ir atominė intervalų patikra; idempotency key; hold expiry; kainos/trukmės/sąlygų snapshot ir tikro patvirtinimo rezultatas. |
| booking.read / change / cancel | Serverio ownership ir version precondition; atomic change nepraranda seno vizito nesėkmės atveju; tas pats rezultatas po nutrūkusio atsakymo retry. |
| provider.schedule / profile / media | Scoped roles, versioned edit, patvirtinimas, audito trail, media rights ir revocation; viešai tik approved projekcija. |
| notification.preferences / delivery | Atskiras kanalo leidimas, outbox ir dedup; pranešimas nesukuria / nepatvirtina vizito. Push / SMS išlaidos ir teikėjas dar neparinkti. |

Transportas versijuojamas; error codes bent INVALID_INPUT, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, SLOT_CONFLICT, STALE_AVAILABILITY, HOLD_EXPIRED, VERSION_CONFLICT, RATE_LIMITED ir TEMPORARILY_UNAVAILABLE. Toliau įgyvendinant aprašyti request/response schema ir retryability; UI neturi spėlioti pagal error tekstą. Price EUR integer cents, laikas UTC + IANA timezone ir local-date kontekstas; nėra vietinio įrenginio laikrodžio kaip vienintelio authority.

## PWA, offline ir prisijungimas

PWA nėra pirmojo HTML prototipo sąlyga. PUI-1 numatyti manifest/icon kilmę ir versijas; PUI-5 patikrinti mobile web, vėliau PWA sutelkti į realią patvirtintą web patirtį. HTTPS, manifest, icons, update/recovery ir platformų instalability actual acceptance būtini prieš vadinant PWA paruošta.

Pagal [cache gairių](https://web.dev/learn/pwa/caching) galimybes mūsų pasirinkta griežta politika: public versioned assets / shell gali būti cache; aktualūs availability, booking mutations ir privatūs klientų / provider duomenys nėra service-worker offline cache. Be ryšio aiškus pranešimas, jokio offline „vizitas patvirtintas“ ir tyliai vėliau užsakymą sukuriančios eilės. Logout / tenant switch / schema update išvalo atitinkamą vietinę būseną. Nepublikuota ar atšaukta public revision neturi būti amžinai rodoma stale-cache.

Web real auth: serverio sesija, saugūs cookies ir CSRF/ownership kontrolė. Native auth projektuojamas su provider-supported Authorization Code + PKCE ir saugiu OS token storage, o ne kopijuojant cookie/localStorage. Tai projektavimo reikalavimas, auth vendor / dabartinio core API dar nepriimti. Deep link vienas pats nesuteikia teisės skaityti rezervacijos; atidarius privatų vizitą reikia autentifikacijos ir serverio ownership.

## Nuorodos ir SEO/GEO

Stable public HTTPS URL yra authority pagal [SEO_GEO_PLAN](SEO_GEO_PLAN.md) / URL_POLICY. [Android App Links ir iOS Universal Links](https://docs.expo.dev/linking/overview/) ateityje gali atidaryti atitinkamą app ekraną, o be app — web puslapį. Tam reikės actual domain association failų ir signed development build testų; jie dar nekuriami / nediegiami.

Provider/service ID nekeičiamas tarp web ir app; filtrų leidžiamas kontekstas parsintas ir validuotas. Article CTA / city fallback taisyklė lieka [CONTENT_LINKING_PLAN](CONTENT_LINKING_PLAN.md). Nuorodose nėra telefono, email, session/booking tokenų ar privačių eksportų. PUI-2 testuoti abstract incoming-link resolver ir pasirinkimo išlaikymą; real OS universal-links tik native etape.

Programėlė nedidina indexable filtrų skaičiaus. SSR approved canonical/sitemap/JSON-LD/LLM lieka web; mobile time/date/price state nekeičia SEO katalogo pagal hash politiką. App shell ir asmeninės paskyros nėra viešo SEO turinio šaltinis.

## Priėmimas — PLANNED / NOT RUN

| ID | Etapas / tikras reikalaujamas įrodymas |
|---|---|
| MOB-01 | PUI-1: mock ir HTTP transporto contract fixtures naudoja tuos pačius DTO / error modelius; isDemo fail-closed, jokio production siuntimo. |
| MOB-02 | PUI-2: web desktop / 390px gauna tą patį service / city / pricing context; back/refresh saugo tik leistiną būseną. |
| MOB-03 | BACKEND: du klientai iš web / app-like HTTP runner pretenduoja į persidengiančius slotus — patvirtinamas tik vienas; retry po response loss nedubliuoja. |
| MOB-04 | BACKEND: kitas provider / siteId / client negali skaityti ir keisti vizito; user-supplied tenant ID neauthority. |
| MOB-05 | PWA: offline / session logout / app update nepateikia stale availability ar privataus kito naudotojo turinio ir nesukuria booking. |
| MOB-06 | PWA / native: 24h/EUR, DST, keyboard, safe areas, screen reader, mažas plotis ir lėtas tinklas actual devices; vien emuliacija nėra native PASS. |
| MOB-07 | NATIVE: signed build + domeno association; app-installed / not-installed / logged-out / revoked profile / private booking link tinkamas rezultatas. |
| MOB-08 | BACKEND / native: outbox retry, opt-out, invalid push token, notification deep link ownership; delivery nesupainiojama su vizito įvykimu. |
| MOB-09 | LAUNCH: dummy, mock login / calls / notifications nepasiekia production; ta pati approved public projekcija SEO ir app read API. |

Nemokamo piloto ribos lieka BUSINESS; nepažadame neriboto nemokamo infra, SMS, push teikėjo ar App Store platinimo. Native build / platform distribution / maintenance biudžetas vertinamas prieš atskirą plėtros sprendimą. Šiuo metu runtime, contracts paketai, PWA, native ir šie testai neįgyvendinti.
