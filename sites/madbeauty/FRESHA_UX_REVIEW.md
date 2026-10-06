# Madbeauty — aktualus Fresha palyginimas ir actual keliai

2026-10-06. Fresha tyrimas atliktas2026-10-05 actual public desktop/mobile ir savininko autorizuotoje partnerio paskyroje tik read-only. Madbeauty jau turi vietinį backend, ne vien PLANNED maketą. Konkurento checkout, atomicity ir multi-staff vykdymas liko UNVERIFIED; jokio „geriau už Fresha“ išmatuoto teiginio.19savininko screenshotų nėra mano naršyklės bandymas. Privataus account/tenant finalURL nekopijuotas; partnerio sričiai tiksli peržiūros vieta pateikta sanitized observations, finalURL lieka nepaskelbtas, o ne išgalvotas.

| Kelias | Šaltinis / naudinga actual sritis | Sprendimas ir pokytis | Madbeauty actual įrodymas |
|---|---|---|---|
| search | https://www.fresha.com/; 2026-10-05; Homepage desktop/mobile search fields; date/window selection | PRITAIKYTA + PAKEISTA. Whole procedure must fit selected interval; Lithuanian24h and explicit dateKey, not start-time-only filtering. | screen-acceptance-v6.json; backend-tests-v12.tap |
| profile | https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2; 2026-10-05; Profile services/team/practical information and gallery | PRITAIKYTA. Separate solo/salon identity, moderation versions and true service variant records; fixtures remain private. | screen-acceptance-v6.json; browser-qa-v2.json |
| services-addons | https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2; 2026-10-05; Book now Services + partner service editor fields | PRITAIKYTA + PAKEISTA. Zero/multiple stable add-ons, total duration/price/buffers; editor retains all add-ons. | service-addons-browser-v1.json; platform-functional-final-v1.json |
| staff | https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2; 2026-10-05; Public selected single-provider service; partner team/assignment settings | PAKEISTA. Single provider skips choice, team service picks eligible actual practitioner/resource; competitor multi-staff flow not exercised. | salon-booking-browser-v3.json; backend-tests-v12.tap |
| time | https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2; 2026-10-05; Time screen: next day/empty day/time buttons; no slot selected | PRITAIKYTA + PAKEISTA. Authoritative version/date freshness, lunch/buffers/resources/lead/DST, expiring hold and SQLite race guard. Competitor atomicity unknown. | solo-booking-browser-v3.json; backend-tests-v12.tap |
| account | https://www.fresha.com/; 2026-10-05; Owner customer account screenshot + account entry observation | PAKEISTA PAGAL SAVININKĄ. Owner later authorized email-only session before hold/confirmation; reading and comparison stay guest. Earlier optional account plan superseded. | browser-qa-v2.json; first-provider-manual-browser-v1.json |
| review-confirm | https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2; 2026-10-05; Services→Time→Confirm navigation; final Confirm/payment NOT tested | MŪSŲ SPRENDIMAS. Local price/time snapshot, idempotent atomic confirm, one winner at overlapping slots. No payment module. | solo-booking-browser-v3.json; salon-after-server-restart-v3.json; backend-tests-v12.tap |
| cancel-change | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Partner existing appointment drawer and cancellation/reschedule settings read-only | PRITAIKYTA + PAKEISTA. Reason/history retained; change conflict leaves original visit; customer and provider share same persisted booking. | solo-booking-change-cancel-v3.json; browser-qa-v2.json |
| provider-first-visit | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Clients list + Calendar New appointment entry; no competitor client/visit created | PRITAIKYTA + PAKEISTA. New provider can add scoped first client and native manual visit before public approval, client later signs in without gaining provider access. | first-provider-manual-browser-v1.json; durable-functional-receipt-final.json |
| calendar | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Day grid toolbar/time/calendar/timezone/24h/DST settings | PRITAIKYTA + PAKEISTA. Monday-Sunday week, day, selected date, staff filter, duration grid, mobile agenda, scoped blocks/soft release; early times extend grid. | platform-functional-final-v1.json; screen-acceptance-v6.json |
| inquiry-waitlist | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Waitlist intro/automation preference, delivery linkage; no activation | PRITAIKYTA IŠ DALIES. Inquiry and waiting request differ from booking. Associated clients visible only own workplace. No auto-book or delivery promise. | screen-acceptance-v3.json; backend-tests-v12.tap |
| client-messages | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Customer screenshots show Messages; partner communication library read-only | PAKEISTA. Booking-scoped local server conversation; ordinary client/provider permissions. No SMS, live notification balance or campaign activation. | screen-acceptance-v3.json; browser-qa-v2.json |
| operator-moderation | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Partner Marketplace setup intro; not competitor review backend audit | MŪSŲ SPRENDIMAS. Version-bound provider approval, return reason, completed-visit review moderation with no hard deletion or public private-client IDs. | screen-acceptance-v6.json; backend-tests-v12.tap |
| external-integrations-reports | research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json; 2026-10-05; Link builder/QR, automations,59 reports library, integration add-ons | ATIDĖTA / ATMESTI PAŽADAI. Scoped booking URL current capability only. No paid module, QR activation, SMS, finance/POS, native app, export or59 working report claim. Diagnostic event/fixture counts are not demand. | SCREEN_STATUS.json; IMPLEMENTATION_STATUS.md |

Savininko vėlesnis email-only backend nurodymas pakeitė ankstesnę nepriverstinės paskyros rezervuojant hipotezę. Naršymas ir palyginimas lieka be paskyros; patvirtintas vizitas naudoja email sesiją. Konkurento nemokamumas, dydis, SMS ir AI santraukos netapo mūsų pažadais. Private demo UI copy pašalinta pagal savininką; noindex/loopback/fixture runtime guard lieka.

## Istorinis tyrimas ir ankstesnio frontend etapo planas

# Madbeauty — Fresha UX peržiūra ir prototipo sprendimai

2026-10-05. Viešos ir savininko prisijungusios partnerių UI peržiūra, ne Fresha vidinio backend auditas. Pilnos Madbeauty platformos pakeitimai PLANNED; atskira UI foundation įgyvendinta pagal [QA](prototype/QA.md). Savininkas pasiūlė naudoti Fresha kaip orientyrą ir iš anksto pasiruošti mobiliai programėlei.

## Kas faktiškai apžiūrėta

Naršyklėje peržiūrėti [homepage](https://www.fresha.com/) ir [savininko nurodytas Vilniaus profilis](https://www.fresha.com/a/ali-barbershop-seskines-g59-ernestas-vilnius-seskines-gatve-59-flsohzf2). Desktop DOM viewport 1280 × 720; mobile 390 × 844. Įrodymai ir SHA [manifest](../../research/madbeauty-fresha-2026-10-05/MANIFEST.json).

Profilis → Book now → paslaugos pasirinkimas → Continue → datos ekranas → artimiausia laisva diena → siūlomų valandų sąrašas. Konkretus laikas NEPASIRINKTAS; login, kliento duomenys, waitlist pateikimas, Confirm ir apmokėjimas netikrinti. Atidarant registraciją Fresha automatiškai sukūrė anoniminio krepšelio URL; jo tokenas į dokumentus nekopijuojamas. Nežinome jų serverio hold mechanizmo; matomas slotas neįrodo rezervacijos patikimumo. Vieno meistro profilyje nebuvo patikrintas kelių darbuotojų parinkimas.

Web tekstinis fetch ir actual naršyklė pateikė skirtingą atsiliepimų skaičių, kainas ir darbo valandas. Sprendimai remiasi actual UI struktūra, konkurento skaičiai neperkelti į mūsų seed ar pasiūlą. Pirmas screenshot iškart pakeitus viewport buvo neteisingai sumažintas; po reload patikrinti innerWidth/clientWidth=390, body=390 ir heading bounds. Nepatikimas kadras nesaugomas kaip mobile įrodymas. Tai emuliacija, ne fizinio iPhone / Android ar native programėlės bandymas.

## Prisijungusio meistro aplinka — faktinė peržiūra

Savininko autorizuotoje Chrome paskyroje apžiūrėtos pagrindinės darbo sritys. Tik navigacija ir neužrašomas redaktorių laukų stebėjimas. Nieko neišsaugota, grafikas/vizitai/planas nepakeisti, mokamas modulis neaktyvuotas. Pabaigoje grįžta į dashboard. Privatūs klientų kontaktai, tenant ID ir krepšelio tokenai nekopijuojami į tyrimą; verslo sričių išvados [PARTNER_OBSERVATIONS.json](../../research/madbeauty-fresha-2026-10-05/PARTNER_OBSERVATIONS.json).

| Sritis | Actual peržiūra ir išvada | Ribos |
|---|---|---|
| Dashboard / kalendorius | Vizitų ir pardavimų vertė atskirai, artimiausi vizitai, day grid, darbuotojai, waitlist/settings/add meniu. | Seed paskyros rodikliai nėra reali paklausa; vizitas nekurtas. |
| Service menu / esamo service redaktorius | Menu category ≠ treatment type; paslaugos kaina/trukmė, extra time, team/resources/add-ons, online booking availability ir gallery/form/settings panelių navigacija. Resources ir Online booking detail atidaryti. | Team/add-ons/form detail tik meniu; nieko nekeista. |
| Clients / team / scheduled shifts | Client list, search/filter, role list ir pamainų savaitė. Pamainos kontroliuoja booking ir nėra susietos su bendromis darbo valandomis. | Klientų profiliai ir privatūs eksportai netikrinti. |
| Workspace / Time and calendar / Availability / Booking options | Vilnius timezone, 24h, Monday/DST; book/cancel/reschedule windows ir interval increments; staff/service images/group/upsell/important info pasirinkimai. | Esamos konkurento reikšmės nėra mūsų defaults; Edit/toggle nespausti. |
| Waitlist / Resources / Dynamic assignment | Waitlist automate-book/first-in-line ir notification ryšys; resources intro leidžia rooms/equipment ir no-staff; new assignment pagal availability, galimas vėlesnis reassignment. | Resources nepradėti kurti. Assignment vykdymas ir atomicity netikrinti. |
| Appointments / esamo demo vizito drawer | Booked status, service/team/date, total To Pay, checkout/pay ir options. | Joks statusas nepakeistas, apmokėjimas ar vizito redagavimas neatliktas. |
| Link builder / Marketplace profile | Scoped services/location/team links ir QR; marketplace atidaro setup introduction, ne automatiškai viešą profilį. | Create link / Start now nespausti; QR generavimas netikrintas. |
| Automations / reports / add-ons | Priminimai, vizito update/review/waitlist/retention/chat kategorijos, communication balance; 59 report library; payments/resources/integrations/client inbox modulių biblioteka. | Actual report chart, sends, export ir paid activation netikrinti. |

Ne visi Fresha moduliai ar jų backend išbandyti. Finansai/POS, visi 59 reportai, reali registracija/checkout, klientų importas, tikras inbox, Google/Meta integracijos ir native apps lieka UNVERIFIED. UI rodo produkto galimybę, ne prieinamumo/kainos/konkurencijos/patikimumo įrodymą.

## Savininko klientų, verslo ir onboarding screenshotai

19 savininko vaizdų yra papildomi šaltiniai, pažymėti manifeste atskirai nuo mano naršyklės kadrų. Account menu: profile/activity/wallet/messages/favorites/forms/settings. Search atskiria treatments/venues/professionals, date calendar su today/tomorrow/day-parts. Results turi List/Map, day rail, matching service prices/durations/time buttons; dalis ilgo search capture dar skeleton, ne baigtas visos pasiūlos inventorius. M HOUSE profilis turi team/portfolio/reviews/hours/practical information.

Verslo landing rodo veikiančios programos calendar/product screenshot, kategorijas, marketplace ir atskiras consumer/professional apps. Tai jų reklaminis tekstas; mūsų /meistrams landing turi savo actual UI ir tikras piloto ribas. Onboarding: sukurti business arba prisijungti prie esamo; brand vs legal; primary + related categories; solo/team size; physical/mobile/virtual; adreso autocomplete/map pin; previous software/migration; 7 dienų trial pabaigos ekranas. Adreso modalo dubliavimosi ilgoje nuotraukoje nelaikome įrodytu produkto bug.

Mums pritaikome pakopinį onboarding ir išorinės registracijos pradžią. Home/mobile meistrui privatus namų adresas nepublikuojamas be atskiro patvirtinto matomumo sprendimo. Nereikalaujame kliento istorijos migracijos vien profiliui sukurti. Nėra Fresha nemokamo neriboto naudojimo ar SMS pažado iš trial screenshot.

## Stebėjimas → Madbeauty sprendimas

| Orientyras | Ką pritaikome prototipui | Ribos / įrodymas |
|---|---|---|
| Homepage paslauga / vieta / laikas | Pirmame ekrane naudinga trijų laukų paieška; mobiliame stulpelis, desktop eilė. Nuotraukos padeda pasirinkimui, ne nustumia paiešką už hero. | [Desktop](../../research/madbeauty-fresha-2026-10-05/homepage-desktop.jpg), [mobile](../../research/madbeauty-fresha-2026-10-05/homepage-mobile.jpg). Madbeauty spalvos / fotografija / žodinis brand lieka saviti. |
| Profilio galerija ir aiškus vietos kontekstas | Atpažįstama tapatybė, darbų / vietos galerijų skirtis, adresas ir praktinės sąlygos prieš booking. | [Desktop profilis](../../research/madbeauty-fresha-2026-10-05/profile-desktop.jpg), [mobile](../../research/madbeauty-fresha-2026-10-05/profile-mobile.jpg). Tik teisėtos tikrų teikėjų nuotraukos live. |
| Paslaugų sąrašas, trukmė, kaina; desktop šoninė registracija | Palyginamos eilutės, variantai ir priedai; desktop santrauka greta, telefone vienas pagrindinis veiksmas ir etapų ekranai. | [Paslaugos desktop](../../research/madbeauty-fresha-2026-10-05/profile-services-desktop.jpg), [mobile](../../research/madbeauty-fresha-2026-10-05/profile-services-mobile.jpg). Mobile Book now yra DOM, tačiau nuolatinis bottom-stick elgesys kadruose nepatvirtintas; mūsų sticky juosta yra pasirinktas reikalavimas. |
| Trumpas registracijos kelias | Madbeauty: paslauga / priedai → meistras tik jei yra pasirinkimas → data ir laikas → kontaktas / sąlygos / santrauka → patvirtinimas. Vienas darbuotojas automatiškai parenkamas be tuščio papildomo žingsnio. | Stebėtas Fresha Services → Time → Confirm; paskutinis etapas ir multi-staff neaudituoti. Madbeauty nepriverstinė kliento paskyra yra mūsų produkto sprendimas, ne teiginys apie Fresha. |
| Neužimamos dienos alternatyva | Aiškiai „šiai datai vietų nėra“, artimiausia diena, galimybė pakeisti intervalą / meistrą. Waitlist prototipas; realus įjungimas tik su priimtu delivery ir privatumu. | [Tuščia diena desktop](../../research/madbeauty-fresha-2026-10-05/booking-empty-desktop.jpg), [mobile](../../research/madbeauty-fresha-2026-10-05/booking-empty-mobile.jpg), [valandos](../../research/madbeauty-fresha-2026-10-05/booking-times-mobile.jpg). Užklausos ir confirmed booking skirtingos būsenos. |
| Viešos service / miesto ir gretimų profilių nuorodos | Kelias katalogas → profilis → susijęs katalogas / naudingas gidas. Mūsų URL registry atrenka eligible puslapius pagal SEO_GEO_PLAN. | Actual DOM yra kategorijų ir Vilniaus nuorodos. Tai nepateisina visų filtrų indeksavimo ar all-to-all tinklo. |

## Ką geriname pagal savo produkto užduotį

Tai projektuojamos hipotezės, ne išmatuotas pranašumas prieš konkurentą:

- LT 24 valandų formatas, EUR ir Europe/Vilnius visame kelyje; prototipe vienas valdomas clock, vieno teikėjo tapatybės ir kainų šaltinis.
- Užklausa „rytoj 17–20“ reiškia visą pasirinktą procedūrą tame intervale, priedai / buferiai įtraukiami į availability taisykles. Galime rodyti įtrauktus darbus ir trukmę aiškiau, užuot klientui spėliojus.
- Iš gido į paslaugą pereinantis klientas išlaiko pasirinktą miestą ir tinkamą paieškos kontekstą. Jokio tylaus miesto pakeitimo.
- Guest kelias, kliento istorija / išsaugoti meistrai / pakartotinis vizitas yra skirtingi ekranai; neverčiame susikurti paskyros vien skaitymui ar paslaugų palyginimui.
- Back / cancel išsaugo formos pasirinkimus; paslaugos pakeitimas perskaičiuoja kainą, trukmę ir anuliuoja netinkamą laiką. Santrauka rodo procedūros pabaigą ir kainos pagrindą, ne vien pradžią.
- Nenukopijuojame platformos dydžio skaitiklių, Featured, atsiliepimų, AI jų santraukų ar nemokamų SMS pažadų. Atsiliepimų matomumas nepadaromas mokamas; ankstesnė idėja atidėta.

## Prototipo priėmimas — PLANNED / NOT RUN

| ID | Scenarijus ir rezultatas |
|---|---|
| UX-01 | 390 px ir 1280 px paieška pasiekiama be dekoratyvaus bloko slinkimo; paslauga/vieta/laikas turi label, keyboard ir klaidos būsenas. |
| UX-02 | Service variant / addon pakeičia bendrą kainą ir trukmę; netelpantis ankstesnis slotas nepaliekamas pasirinktas. |
| UX-03 | Back iš datos grąžina paslaugų pasirinkimą; kliento duomenys neatsiduria URL / analytics; refresh tvarkingai atkuria tik leidžiamą kontekstą. |
| UX-04 | No-slots, stale-calendar ir provider-without-calendar rodomi skirtingai; nearest-date ir pakeisti meistrą veiksmai nepanaikina paslaugos. |
| UX-05 | Mobile CTA / sheet neuždengia footer, klaidos, klaviatūros ar paskutinio lauko; escape / back / focus return veikia. Physical-device testas atskiras. |
| UX-06 | Vienas meistras praleidžia parinkimą; keli meistrai / bet kuris tikrina pasirinktos paslaugos kompetenciją ir konkrečius resursus. |
| UX-07 | Demo confirmation aiškiai demo; retry/conflict nekuria dvigubo vizito. Realios transakcijos tik BACKEND ir AV vartai. |
| UX-08 | Article CTA, web ir app-link resolver sutampa entity IDs / eligible URL; app nebuvimas atidaro tą patį public web turinį. |

Art direction [DESIGN](DESIGN.md); etapų vieta [PROTOTYPE_ROADMAP](PROTOTYPE_ROADMAP.md); bendra app / API riba [MOBILE_ARCHITECTURE](MOBILE_ARCHITECTURE.md). Gražus screenshot nėra įrodymas, kad platforma veikia kaip laikrodis: tai patikrina kelias, availability, izoliacija ir backend acceptance.
