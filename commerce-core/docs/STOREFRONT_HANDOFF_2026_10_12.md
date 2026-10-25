# Memocasting svetainės perdavimas naujai sesijai

2026-10-12 savininkas paprašė naujos sesijos memocasting.lt svetainei pagal core taisykles, su pilnu SEO/GEO, vėlesniu turinio planu ir straipsniais. Tai atnaujina ankstesnę darbo seką: svetainės ir jos turinio vietinis kūrimas dabar gali vykti lygiagrečiai su šioje sesijoje tęsiamu prekybos moduliu. Tikras paleidimas vis tiek priklauso nuo realių mokėjimo/siuntimo/kontaktų/duomenų vartų. Aptarnavimo, partnerių paieškos ir apskaitos agentai kuriami po svetainės, ne šioje naujoje užduotyje.

## Šaltinis ir failų atsakomybė

Parent checkout commerce-core-20261011, branch codex/commerce-core-20261011, [draft PR96](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/96), issue95. Paskutinis modulių source f231401f583e0365b52fe0e9a2f6241682d62953: 39 vietiniai Node testai/native D1/build PASS, GitHub preflight PASS. Tai nesujungtas priklausomas source, ne main adoption.

Nauja sesija turi savo izoliuotą branch/worktree ir GitHub issue/PR rezervaciją. Ji perima sites/memocasting/**, sites/memocasting.md ir tik tai svetainei reikalingą renderer/config/media/content adapterių sritį atskirame aktualaus companion worktree. Commerce-core/** ir jo operator UI/src/migrations lieka parent; nekeisti jų ar kitų sesijų working files. WORKSTREAMS keisti tik savo eilutėmis. Shared schema/registry poreikį rezervuoti pagal repo taisykles; nedubliuoti SEO, medijos, turinio ar prekybos core.

Galima stacked svetainės šaka nuo remote parent branch source, su aiškia PR96 priklausomybe ir atskiru site-only diff; tai nereiškia neperžiūrėto PR sujungimo į main. Prieš peržiūros perdavimą paaiškinti PR bazę, priklausomybę ir sujungimo eilę. Parent neturi vienu metu redaguoti perleistų svetainės dokumentų.

Tikri repo šio PC aplanke: Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui ir Nisiniai_puslapiai/dovanos-memorycasting. Abu aktyvūs pirminiai checkout turi kitų darbų; jų neresetinti, nestashinti ir nenaudoti kaip savo rašymo vietos. Companion pirminė šaka atsilieka nuo remote main; naujas savo worktree turi pradėti nuo sėkmingai fetch patikrinto actual main, ne iš dirty working tree. Vykdyti docs/CODEX_GIT_WORKFLOW start/continue/handoff ir atitinkamus AGENTS/contracts/skills.

## Verslo tiesa

Operatorius MB Memocasting, pagal savininką ne PVM mokėtoja. Šiai nišai nenaudoti numatyto MB Pinet operatoriaus. Du patvirtinti produktai: poros rinkinys €32, pasirinktinai balti dažai +€3 pardavimo kainos; šeimos €48. Porai vienas alginato pakelis (€6 savikaina), 1200g gipso (€1), kibiras (€1), siunta2kg20×20×17cm. Šeimai du alginato ir du gipso pakeliai,4kg25×25×20cm; tikslūs family paketų svoriai/savikaina/indas ir dažų savikaina nepatvirtinti. Medžiagų santykiai/sauga/naudojimo amžiaus ribos turi remtis tiekėjo dokumentais ir tikru bandymu.

Stripe yra, tačiau jungtyje buvo tik live paskyra, realus sandbox API nepriimtas. Vežėjo sutarties nėra, pirmiau reikia be ilgalaikės sutarties veikiančios label API. Siuntimo iš LT adresas dar nežinomas. 0.3 turi testinius tarifus ir kainynus; jų nekopijuoti kaip patvirtinto Memocasting tiekimo. Production vartai uždaryti. Viešas atsiskaitymas negali atrodyti priimantis tikrus užsakymus, kol realios integracijos nepatikrintos; vietinis pirkimo kelias turi būti konkretus ir ištestuotas per esamą commerce API, be paralelinio backend.

Nuotraukas savininkas pateiks vėliau. Dabar galima įgyvendinti visą nuo jų nepriklausomą struktūrą, responsive media vietas, turinį, core integraciją ir naudojamus tikro seno produkto assets, jei jų kilmė/naudojimas patikrinti. Generuotos redakcinės iliustracijos negali apsimesti tikro rinkinio ar kliento rezultato nuotraukomis. Trūkstamų business facts neišgalvoti; nėra pagrindo stabdyti kitą įgyvendinamą darbą.

## Domenai, SEO ir turinys

Savininko GSC ekrano šeši seni adresai privalomi URL inventoriuje: homepage be www ir www, /pages/instrukcija, /products/alginato-papildymas-650g-dvieju-ranku-rinkiniui, /products/kudikio-pedutes, /products/liejimo-rinkinys-porai. Pastarosios poros prekės ir instrukcijos canonical išsaugomi senais keliais. Papildymas/baby nėra patvirtinti dabartiniai SKU; jų istorinis turinys ir būsenos atkuriami tik pagal faktus. Šeimos /products/seimos-rinkinys-1 rastas savininko landing page, kitas /products/seimos-rinkinys ten reiškia kitą pasiūlymą. GSC 79/31 homepage eilutės nesumuojamos. Paieškos screenshot #2 yra suasmenintas stebėjimas, ne nacionalinis ranking pažadas; GET grąžino402.

Savininko memorycasting.lt senas landing yra vizualinė ir adresų nuoroda, ne automatinis kainų,10k klientų/4.9reviews, saugos ar senų rekvizitų patvirtinimas. Jo idėjos atrinktos HOMEPAGE_BRIEF. Memorycasting.com savininko pasirinktas tarptautinio brendo ir lokalizuotos partnerystės centras; registracija/kontrolė nepatikrinta. Jo atskiros svetainės ir partnerių agentų šioje užduotyje nekurti.

Perskaityti sites/memocasting BUSINESS, TOOLS, SEO_GEO_PLANAS, MIGRACIJA, legacy-urls.json, landing-urls.json, HOMEPAGE_BRIEF, DOMENAI_IR_RINKOS ir PARTNERIU_SVETAINE. Taip pat commerce-core/docs API, IMPLEMENTATION_STATUS, ARCHITECTURE, ROADMAP. Nišos mokamas tyrimas jau atliktas: $0.3724 iš savininko patvirtinto bendro $1. LT170 ir PL1000 vid./mėn. pagal2026-08; LV/EE null nėra0. Raw tyrimas vietinis outputs/memocasting-tyrimas-20261011; į Git nekelti. Atlikto tyrimo nepirkti pakartotinai. Naujai sesijai rezervuojama daugiausia dar $0.25 Treg iš to paties bendro biudžeto, tik esant pagrįstai spragai ir patikrinus kainą; žurnale fiksuoti tikras išlaidas. Kitų mokamų paslaugų ši rezervacija neautorizuoja.

Svetainės pirkėjo kelias ir technical SEO/GEO pirmiausia; pilnas konkretus klausimų/URL/briefų sezoninis planas tęsiamas per esamą turinio core, po jo straipsniai. Guide hub, individualus Article layout, editorial identity, publication/hash/publishAt ir importo kelias įdiegiami anksti, prieš masinį tekstą. Reuse30URL bounded map, ne tušti dovanų synonym/city puslapiai. Teminis autoritetas nėra „tobulo SEO“ ar reitingo garantija.

Naudoti builder/planner/SEO-GEO/audit/impeccable/design-system/media/language/typography aktualias sutartis. Reikalingi realūs desktop/mobile/keyboard/error/empty/layout/SEO/HTTP įrodymai ir revision-bound straipsnių pilno teksto patikra; local/prototype/source/publication/deploy turi skirtingas būsenas. Svetainės užduotis nėra leidimas production deploy/DNS/Shopify atšaukimui, gyvoms mokėjimo operacijoms ar laiškams. Užbaigti reviewable vietinį rezultatą ir draft PR, savininkui parodyti screenshot bei tikslias likusias priklausomybes.
