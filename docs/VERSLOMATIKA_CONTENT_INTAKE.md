# Privataus verslo juodraščio perdavimas į bendrą turinio studiją

`content-studio/scripts/customer-creation-intake.mjs` priima serverio patikrintą verslo juodraštį ir perduoda jį į esamą turinio modelį. Tai atskiras privatus importas, po kurio lieka tikros bendros turinio eigos kliūtys. Helperis nekuria redakcinės peržiūros, publikacijos, release ar viešo diegimo ir nekviečia DI.

## Serverio sąsaja

Kiekvienam importui paleisti naują Node 22+ procesą. JSON perduoti per stdin į `content-studio/scripts/customer-creation-intake.mjs`; sėkmės kvitas grįžta stdout, sanitizuotas klaidos kodas – stderr ir exit1. Importuojant modulį galima kviesti `intakeCreationDraft(input)`, bet tame procese leidžiamas tik vienas studijos data/output kontekstas: esamas modelis susieja katalogus importo metu. Kito konteksto bandymas atmetamas `studio_context_conflict`.

Serveris pats patikrina dabartinę kliento autorizaciją, priimtą reviziją ir jos tikslų hash. Helperio JSON nėra autorizacijos ar kliento sutikimo įrodymas. Jo absoliutūs keliai, kontaktai ir patvirtinti faktai negali ateiti tiesiai iš kliento užklausos ar AI teksto.

Privalomi įvesties laukai:

- `creationId`: kanoninis mažųjų raidžių UUID; `acceptedRevision`: teigiamas saugus sveikasis skaičius.
- `sourceHash`: serverio normalizuoto `Draft` kanoninio JSON SHA-256. Objektų raktai surūšiuoti, masyvų tvarka išsaugota, UTF-8, be įtraukų ir papildomos naujos eilutės. Atitinka `creation.review.draft_sha256`.
- `draft`: serverio `creation.renderer.Draft` normalizuotas objektas. Helperis papildomai tikrina importuojamus laukus, turinio dydį ir V2 blokų struktūrą; jis nepakeičia serverio pilno typed tikrinimo.
- `canonicalHost`: serverio parinktas kanoninis domenas, be protokolo, kelio ar registracijos pažado. Galutinį domeno tikrinimą atlieka bendras `createSite`; hostname nėra failų kelio dalis.
- `artifactsRoot`: serverio valdomas, jau egzistuojantis absoliutus `runtime/artifacts` katalogas.
- `dataDir`, `outputDir`: tiksliai `<artifactsRoot>/customer-content/<creationId>/revision-<acceptedRevision>/data` ir to paties katalogo `output`. Kitokie keliai, symlink / junction ir išėjimas iš šios ribos atmetami.

Neprivalomi serverio laukai:

- `verifiedFacts`: tik serverio atskirai patvirtinti verslo faktai. Numatyta tuščia reikšmė. AI `confirmed_facts` išsaugomi originale ir automatiškai neperkeliami į svetainės patvirtintus faktus.
- `knownContact: {email, phone}`, `operatorName`: tik patvirtinti kliento duomenys. Nežinomos reikšmės lieka tuščios. Bendro `MB Pinet` / `info@pinet.lt` numatytojo kontakto importas nepriskiria klientui. Sintetiniame teste šios reikšmės naudojamos tik tada, kai jas aiškiai pateikia testą vykdantis serveris; tai ne pristatymo patikra.
- `contentPlan`: tikras jau pateiktas planas; jei jo nėra, naudojamas `draft.content_plan`, jei nėra ir jo – tuščias masyvas. Nesukurti plano vien užpildant numatytą dažnį.

Prieš procesą nustatyti `STUDIO_NETWORK_SETTINGS` į kanoninio companion `config/niche-network.json` absoliutų kelią. Modeliui šis failas reikalingas registruojant V2 svetainę; jei jo nėra, helperis sustoja prieš užimdamas nekintamą revizijos katalogą. `STUDIO_DATA_DIR` ir `STUDIO_OUTPUT_DIR` nustatomi pagal patikrintą įvestį. Pačios šaltinio konfigūracijos nekeičiamos.

## Tikras bendro modelio rezultatas

Svetainės ID yra `creation-` ir UUID be brūkšnelių. Jis nepriklauso nuo verslo pavadinimo, domeno, URL teksto ar būsimo domeno pakeitimo. Puslapių ID stabiliai išvedami iš patikrinto puslapio kelio; revizijos importuojamos į skirtingus katalogus su tais pačiais loginiais ID.

Naudojami tik kanoniniai `createSite`, `editSite`, `addPage`, tikro plano `mergePlan`, `editPage` ir `getContentWorkflow`. `initialize` nekviečiamas: tuščiame kataloge jis sukurtų istorinių dvidešimties nišų registrą. Naujoje izoliuotoje studijoje yra tik šio kliento svetainė, be darbo eilės, senų nišų ir viešų paketų.

Verslo pavadinimas patenka į `name`, trumpa `tagline` – į `offer`, klientas – į `audience`; visas detalesnis verslo planas nepakeistas lieka `source-draft.json`. Taip ilgas verslo pasiūlymas neprarandamas dėl modelio trumpesnio summary lauko. Faktai ir kontaktai perduodami atskirai. Kiekviena sekcija virsta V2 heading / paragraph / list blokais be teksto trumpinimo. Pradinis puslapis yra `home`, kiti pradiniame importe laikomi `guide`, kol tikra redakcinė patikra patvirtina jų paskirtį. Nėra išgalvoto autoriaus ar medijos ID.

Išsaugant konkrečias faktų, šaltinių ir nuorodų pastabas, esamas modelis pakeičia puslapio būseną į `review`. Tai privatus juodraštis: `approval` ir `publishedRevision` lieka null. Statusas rankiniu JSON rašymu neperrašomas. `contentWorkflowVersion` yra1, o grąžinta `workflow` yra tikras `getContentWorkflow` rezultatas.

Pirmas gidas patikrinamas su visu perdavimo keliu: nepakitę tekstai, tikra V2 struktūra, privatūs faktų klausimai, kandidatiniai šaltiniai, dar neprijungti prasmingi navigacijos ryšiai ir tikro vaizdo nebuvimas. Šios kliūtys matomos bendro modelio rezultatuose. Globalūs AI tyrimo URL nėra perskaitytų dokumentų įrodymas: pirmajam gidui jie perduodami kaip aiškiai nepatikrinti kandidatai, o tikrame plane nurodyti kandidatai susiejami su atitinkamu planuotu puslapiu. Jokios `editorial.sources` ar `verified:true` reikšmės neišgalvojamos.

## Plano perdavimas ir kalendoriaus ribos

Platformos planas gali pateikti `path`, `title`, `intent`, `month` (`YYYY-MM` arba tuščias), `audience_problem`, `business_goal`, `primary_topic`, `reason`, `outline`, `source_urls`, `internal_links`, `media_brief`, `media_alt`, `priority` ir `seasonal_hook` / `seasonalHook`. Visas objektas išsaugomas nekintamas. Bendram modeliui perduodama tik jo palaikoma dalis; outline ir medijos užduotys netampa sukurto teksto ar vaizdų įrodymais.

Nauji tikro plano URL sukuriami per `mergePlan(..., months=0)`. Vienas transportas turi iki12 įrašų; didesnis pateiktas planas suskaidomas nekeičiant apimties. Jau egzistuojantis URL nedubliuojamas. Naujo planinio puslapio body lieka tuščias, o jo readiness turi „Turinys neparengtas“. Turimas juodraštis nekeičiamas vien dėl nesutampančio plano: neatitikimas tampa faktų patikros pastaba.

`publishAt` yra privataus importo laiko žyma. Pateiktas mėnuo lieka planavimo hipoteze, o tuščias mėnuo nereiškia parinktos publikavimo dienos. Helperis nekuria kito schedulerio ir neįrodo bendros studijos numatyto dažnio tinkamumo. `policyDecision` aiškiai lieka `unverified-studio-defaults`, ir visiems puslapiams išsaugoma tikro planavimo sprendimo kliūtis. Evergreen `seasonalHook` turi būti tuščias.

Kvitui galimos `contentPlanState` reikšmės: `not-provided`, `partial`, `imported-unscheduled`. Netaisyklingi įrašai paliekami originale, jų tikslios pozicijos pateikiamos `planIssues` ir faktinėse puslapių `factChecks`. Pradinis platformos planas turi bent tris prasmingas gidų užduotis; mažesnė pateikta apimtis laikoma daline. Tai nėra universali mėnesinė straipsnių kvota. Nežinomi ar savo puslapį nurodantys ryšių tikslai lieka konkrečiomis kliūtimis, o žinomi ID – `linkSuggestions`, be automatinio visų puslapių tarpusavio jungimo.

## Nekintami originalai, replay ir klaidos

Revizijos kataloge išskirtinai sukuriami `source-draft.json`, `intake-context.json` ir galutinis `intake-manifest.json`. Manifestas susieja creation UUID, priimtą reviziją, šaltinio, tikslios įvesties, importerio šaltinio ir pradinio studijos failo digest bei tikrą puslapių atvaizdavimą. Tas pats nepakeistas importas grąžina `replayed:true` ir dabartinį `getContentWorkflow`, nekeisdamas failų. Pakeisti kontaktai, hash, serverio faktai ar plano duomenys toje pačioje revizijoje sukelia `intake_revision_conflict`.

Kita priimta revizija visada turi kitą izoliuotą katalogą. Originalai ir senos studijos nepakeičiami. Po teisėto tolesnio medijos, redakcinio ar faktų darbo pradinio importo failo hash jau skirsis: replay sustoja `intake_artifact_changed`, o būsenai skaityti reikia įprasto modelio `getContentWorkflow`, ne reimporto. Tai ne rollback komanda.

Nutrūkęs importas be galutinio manifesto saugomas ir grąžina `intake_interrupted`; jis automatiškai neperrašomas ar neslepiamas. Serveris turi pažymėti nepavykusį perdavimą ir tęsti tik po dokumentuoto savo artefaktų atkūrimo sprendimo. `.intake.lock` saugo vieno serverio lygiagrečius importus; svetimas ar po crash likęs lock niekada neperimamas pagal amžių. Helperis nepretenduoja išspręsti priešiško failų sistemos keitimo tuo pačiu metu; katalogai yra privataus serverio valdomi.

Grąžintas kvitas yra serverio vidaus artefaktas su absoliučiais keliais. Į kliento dashboardą projektuoti tik patvirtintą DTO ir tikras readiness kliūtis; neviešinti originalo, manifesto ar failų sistemos kelių. `fullF1` ir `launch` visada `UNVERIFIED`, `deployment` – `not-performed`. Privatus agentų accept nėra bendros turinio eigos peržiūra ar svetainės paleidimas.

## Patikra

`node --test content-studio/test/customer-creation-intake.test.mjs` vykdo tikrus modelio importus izoliuotuose sintetiniuose kataloguose. Tikrinami nepakitę ilgi V2 tekstai, tikras readiness, istorinių seed nebuvimas, nežinomų kontaktų atskyrimas, tikslus replay, hash ir revizijų konfliktai, senos revizijos išsaugojimas, path / junction ribos, neištrinti nutraukti importai, tikro plano pending kūrimas ir source / link / media / review / fact kliūtys. Modelio ar providerio imitacija šiems readiness bandymams nenaudojama. Ši patikra neįrodo klientų UI, tikro tyrimo, rašytojo, medijos, publikavimo ar SEO / GEO priėmimo.
