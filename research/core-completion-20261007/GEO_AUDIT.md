# GEO ir pilno nišos pristatymo core auditas

Patikrinta 2026-10-07. Apimtis: aktyvios bendros instrukcijos, skills atradimas, Studio plan/draft instrukcijų perdavimas, V1/V2 viešo turinio projekcija, HTML ir automatinės paieškos / AI skaitymo išvestys. Tai core auditas ir įgyvendintos pataisos, o ne visų domenų indeksavimo ar AI citavimo patvirtinimas.

## Sprendimas

GEO vykdomas įprastame turinio kūrimo ir publikavimo kelyje. Naudingas matomas atsakymas, patikrinami šaltiniai, tikra autorystė, aktualios datos, prasmingos nuorodos ir prieinami puslapiai yra pagrindas. `llms.txt` yra papildomas skaitymo indeksas; teisingas įprastas pavadinimas nėra `llm.txt`. `llms-full.txt` pateikia viešo turinio tekstą. Šie failai negali žadėti AI citavimo ar pakeisti tikrų puslapių kokybės.

Visi automatiniai rezultatai remiasi tuo pačiu patvirtintu paketu ir viešo turinio projekcija. Dokumentai nekuriami rankomis po kiekvieno straipsnio. Studio išsaugotas juodraštis savaime nepakeičia svetainės: nauja patvirtinta versija turi būti importuota, pastatyta ir įdiegta. Jau įdiegto būsimo straipsnio datai atėjus, dinaminis atsakymas įtraukia jį pagal esamą bendrą publikavimo filtrą.

## Radiniai ir pakeitimai

| Sritis | Audito faktas | Įgyvendinimas / likusi patikra |
|---|---|---|
| Esamos bendros taisyklės | AGENTS, CORE_BUILD_CONTRACT ir A–Z katalogas jau reikalavo tikros autorystės, schema/body atitikties, datų, kontaktų, trust/legal, medijos ir publikavimo patikrų. | Naujas trumpas first-delivery maršrutas sujungia vykdymą ir baigimo įrodymus; nekuriamas antras A–Z katalogas. |
| Skills atradimas | Šiame kompiuteryje builder/audit core entrypoints nebuvo įdiegti, nors kataloge deklaruoti. | Bendras idempotentinis installer susieja prižiūrimą šaltinį. Kitos nepriklausomos ar sugadintos kopijos išsaugomos ir aiškiai pranešamos. |
| Audito baigimo kodas | Ataskaitų scorer grąžino exit0 ir esant neužbaigtai vietinei patikrai. | Naujas `--require-local` blokuoja baigimą, kol visi taikomi local kriterijai nėra PASS; istorinė reporting funkcija lieka. |
| GEO perdavimas rašytojui | Išsamus matavimo reference buvo plan-only; nebuvo kompaktiško abiem režimams perduodamo publikavimo kontrakto. | `geo-publishing.md` tiesiogiai įkeliamas plan ir draft snapshotuose. Trūkstant failo darbas sustoja; naujas job gauna naują fingerprint, senas snapshot nekinta. |
| V1 dinaminiai rezultatai | Robots, sitemap ir abu TXT jau generuojami per viešą projekciją; V1 pilna išvestis turi teksto, tinklo autorystės/datų ir viešų nuorodų informaciją. Specialaus dizaino home turi aiškiai pažymėtą santrauką. | Esamas bendras kelias išlaikytas. V1 nesiūloma automatiškai perrašyti į V2, išgalvoti metaduomenų ar pakeisti patvirtintų paketų. |
| V2 dinaminiai rezultatai | HTML ir discovery naudoja bendrą due/approval projekciją ir no-store. V2 pilnoje skaitymo išvestyje trūko patvirtintų datų, autoriaus profilio ir atskirų related/external panel nuorodų. | Bendras V2 helper papildytas tik jau projektuotos versijos duomenimis. Nei datos, nei autoriai neišgalvojami. Būsimi / atšaukti puslapiai ir nuorodos lieka paslėpti. |
| Faktinis HTML / discovery priėmimas | Trūko bendros paketo, source, laiko ir tikro HTTP rezultato susiejimo patikros. | `verify-site-completion.mjs` importuoja esamą V1/V2 projekciją ir tikrina tikrus GET atsakymus: body, authors, dates, hub, breadcrumbs, schema, metadata, media, visų viešų URL įtraukimą ir būsimų URL nebuvimą. TXT teksto patikra siejama su konkretaus canonical puslapio skiltimi. |
| Robots grupės | Vien `Disallow: /` paieška klaidingai atmestų svetainę, blokuojančią tik mokymą. | Patikra atskiria pagrindinius paieškos agentus nuo mokymo politikos. Standard parser rezultatas nėra tikras patvirtinto roboto apsilankymas ar WAF įrodymas. |
| Google / Bing matavimas | Senas teiginys apie atskiros Google AI ataskaitos nebuvimą nebeatitiko šiandienos oficialių gairių. | Measurement reference atnaujintas: tikri property scoped reportai, impressions ir jų apribojimai; neegzistuojančių API/dimensijų neinventuoti. |
| Privatus turinys ir išlaidos | Prompts, tyrimų žaliava, klientų duomenys ir review įrodymai nėra viešas skaitymo indeksas. Treg discovery nėra faktinis AI matavimas. | Viešos išvestys negauna privataus tyrimo. Šiam auditui mokamų Treg calls nebuvo; recurring monitoring nesukurtas. |

## Šiandien patikrinti pirminiai šaltiniai

Toliau kiekvienas šaltinis pagrindžia prie jo nurodytą sprendimą; mūsų automatizavimo ir priėmimo realizacija yra projekto sprendimas, o ne tariamas variklio reikalavimas.

| Šaltinis | Ką patvirtina ir kaip taikome |
|---|---|
| [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=en) | Įprastas SEO, originali skaitytojui naudinga vertė, įprastas prieinamumas. Google nenaudoja llms.txt reitingams; nereikia specialios GEO schemos, smulkių token chunks, kiekvieno sinonimo URL ar dirbtinių paminėjimų. |
| [Google AI features](https://developers.google.com/search/docs/appearance/ai-features?hl=en) | Indeksavimo ir snippet tinkamumas, normalūs paieškos reikalavimai ir kontrolių ribos. Techninė atitiktis nesuteikia rodymo garantijos. |
| [Search generative AI inclusion](https://support.google.com/webmasters/answer/16908024) | Dabartiniai property inclusion / exclusion ir paveldėjimo nustatymai. Faktinio domeno nustatymo nepatikrinus jo būsena lieka UNVERIFIED. |
| [Google generative AI performance report](https://support.google.com/webmasters/answer/16984139) | Nuo 2026-08-31 aprašytas pasaulinis reportas AI Overviews / AI Mode impressions. Puslapiai, šalys, datos PT ir įrenginiai; skirtinga agregacija, preliminarūs duomenys, eilučių ribos. Export gali paversti nežinomybę į nulį, todėl saugome originalią būseną. |
| [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) | Citavimo / grounding query duomenys palaikomose Microsoft patirtyse, o ne bendras AI rinkos reitingas ar visų sistemų srautas. |
| [Bing intents/topics/citation-share update](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/) | Naujos preview analizės dimensijos; citation share siejamas su konkrečiu vardikliu, ne svetainės „authority score“. |
| [OpenAI bots](https://developers.openai.com/api/docs/bots) | OAI-SearchBot paieška, GPTBot mokymas ir ChatGPT-User veiksmai skiriasi. Faktiniam roboto leidimui svarbios oficialios IP gairės ir CDN/WAF; vien suklastotas User-Agent nėra įrodymas. |
| [Anthropic crawlers](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) | ClaudeBot, Claude-SearchBot ir Claude-User turi skirtingas paskirtis. Atskiros politikos vertinamos atskirai. |
| [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) | Paieškos PerplexityBot ir vartotojo Perplexity-User nėra tas pats. Oficialūs IP / taisyklės svarbūs realiam prieinamumui. |
| [llms.txt proposal v2](https://llmstxt.org/) | Savanoriškas Markdown skaitymo indeksas: tikras site H1, santrauka ir naudingi failų/puslapių sąrašai. Papildomas per-page Markdown / alternate kelias galimas per bendrą adapterį, nėra privalomas reitingų reikalavimas. |
| [Cloudflare managed robots](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) | Efektyvūs robots gali būti papildomi edge nustatymais. Robots pageidavimai nėra privačių duomenų prieigos kontrolė. |
| [Cloudflare AI bot controls](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/) | Faktinė zone politika gali riboti agentų prieigą. Naujos zonos negali būti pažymėtos PASS pagal prielaidą; saugumo neišjungiame dėl GEO. |
| [IndexNow documentation](https://www.indexnow.org/en_gb/documentation), [FAQ](https://www.indexnow.org/faq) | Neprivalomas tikrų viešų pakeitimų pranešimas dalyvaujantiems varikliams. Nepranešame būsimų/private URL; priėmimas nėra indeksavimo garantija. Nauja IndexNow integracija šiame pataisų pakete nekuriama. |
| [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page) | Naudingo turinio ir tikrų matomų identity/schema faktų pagrindas. Redakcija gali būti tikra Organization; netikras Person ar fiktyvios kvalifikacijos nekuriamos. |

## Automatikos eiga

1. Agentas naudoja builder/planner/audit ir bendrą SEO/GEO skill; konkretūs nišos faktai ir tyrimas lieka savo site scope.
2. Plan/draft procesas gauna versijuotas GEO instrukcijas ir privatų patikrintą tyrimo kontekstą. Modelis negali pats patvirtinti, publikuoti ar pakeisti crawler politikos.
3. Redakcinė peržiūra tikrina naudingumą, claim-level šaltinius, tikrą autorystę, dates semantics, media ir veikiančius link targets. Reikšmingas tekstų pakeitimas gauna naują revision/review; istorija nekeičiamas.
4. Patvirtintas paketas importuojamas ir autorizuotas leidimas įdiegiamas į tą patį shared runtime. Shared projection vienu metu nustato HTML, schema, sitemap, TXT ir būsimų nuorodų tinkamumą.
5. Dinaminiai TXT atsinaujina iš įdiegtos patvirtintos versijos, ne iš privataus juodraščio. Cache / tenant izoliacija ir T−1/T / revocation tikrinami prieš priimant realizaciją.
6. Tikro domeno HTTP ir A–Z įrodymai susiejami su konkrečiu SHA/source/laiku. Nepatikrinti account, WAF, tikro roboto log ar indeksavimo duomenys aiškiai išlieka UNVERIFIED; netampa automatiniu PASS.

## Faktiniai domenai ir ribos

Madbeauty 2026-10-07T08:02Z išplėstinė tikro HTTP patikra: paketas `75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4`, 7 vieši puslapiai, 3 vieši gidai, 32 būsimi puslapiai, 226 GET. Autorystė, datos, breadcrumbs ir schema praeina tos patikros apimtį; 7 puslapiuose trūko og:title/description/url. Platformos sesija patvirtino radinį ir ruošia bounded sharing metadata patch. Šis auditas neskelbia jo jau įdiegto.

Spalio 13 d. planuojamo `gidai/nagu-dizainas-gidas` 404 spalio 7 d. yra teisingas elgesys, ne platformos gedimas. Ankstesnis klaidingas radinys patikslintas; naujas verifier remiasi bendra projekcija. Ankstesni bandymų įrašai / PASS nekeisti.

Dovanos123 sesijai tiesioginiu savininko pavedimu perduota visų 23 straipsnių, hub, author profile, datų, schema, breadcrumbs ir sharing metadata patikra. Sesija pranešė apie tikslios 34 puslapių redakcijos naują review ir tikro MB Pinet operatoriaus autorystę; jos deployment ir priėmimo įrodymai yra atskiras site release darbas. Core pataisa jų nenukopijuoja ir neperrašo.

Tikro Google/Bing property inclusion, AI impressions, patvirtintų crawler IP/logs, citation prompt baseline ir konversijų šis auditas nematavo. Treg nemokamai patikrintas endpoint katalogas ir prieinamų jungčių inventory; tai nėra šių domenų visibility duomenys. Paid calls: 0; paid recurring monitor nesukurtas. Core source PR / vietinis preview nėra produkcinis deploy.

Git perdavimas: [primary PR31](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/31), [public-core PR10](https://github.com/christianza1989/niche-public-core/pull/10). Anksčiau atskirai perduota V1 hub schema pataisa [public-core PR6](https://github.com/christianza1989/niche-public-core/pull/6) lieka atskiras source integration darbas. Testų ir lokalaus įdiegimo įrodymai: [VALIDATION.md](VALIDATION.md). Core dokumentų pakeitimas savaime nepakeičia kitų kompiuterių senos bazės.
