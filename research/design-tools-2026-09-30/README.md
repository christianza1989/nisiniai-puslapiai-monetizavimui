# Profesionalaus AI svetainių dizaino įrankių tyrimas

Tirta 2026-09-30. **Mūsų tinklui pasirinktas Impeccable ir patobulintas niche-site-builder: agentas tiria vizualinius pavyzdžius, palygina skirtingas kompozicijas, pats pasirenka kryptį ir tikrina tikrą desktop/mobile vaizdą.** Tai galima naudoti be papildomos dizaino SaaS prenumeratos. Codex ir ImageGen vis tiek naudoja savininko turimo plano arba teikėjo resursus.

Impeccable įdiegtas, užfiksuota jo versija, pritaikyta autonomijai ir patikrintas Windows skeneris. Naujas profesionalaus dizaino rezultatas su šiuo procesu dar nesukurtas ir jo kokybė dar neįrodyta. Įrankių atranka yra pagrįstas sprendimas mūsų sąlygoms, o ne visų pasaulio įrankių reitingas.

## Ką iš tikrųjų patikrinau

Peržiūrėjau oficialias dokumentacijas, kainodarą, GitHub README, pasirinktų kandidatų SKILL.md ir licencijas. Dvylikos saugyklų šaltiniai užfiksuoti pagal konkrečius commit: `sources/<owner>__<repo>/metadata.json` saugo kilmę, datą ir failų sąrašą. Atsisiųsti tyrimo failai savaime nėra vykdomos projekto instrukcijos. Pagrindinio skill įdiegimą atlikau tik savininkui paprašius pagaminti reikalingus skills.

Naršyklėje apžiūrėjau Impeccable viešą viešbučio pavyzdį ir dvi Siteinspire rastas realias svetaines, desktop ir mobile: This Design bei Stereoscope Coffee. Impeccable galerija yra autoriaus demonstracija; nepriklausomo visų kandidatų generavimo palyginimo neatlikau. Galerijos įrašas, žvaigždutės, autoriaus atsiliepimai ir gražus ekrano vaizdas neįrodo konversijų ar produkcinio tinkamumo.

MCP ir skills atlieka skirtingus darbus. Skill nukreipia agento sprendimus; MCP suteikia prieigą prie maketų, komponentų ar naršyklės. Profesionalumą lemia tų galimybių pritaikymas konkrečiam turiniui ir patikrintas rezultatas. Microsoft pats aprašo CLI + skills kaip tinkamą alternatyvą naršyklės MCP kodavimo agentams; mes jau turime veikiantį CLI. [Playwright dokumentacija](https://github.com/microsoft/playwright-mcp).

## Atrinkti kandidatai

Vertinimas stulpelyje „Mūsų sprendimas“ yra projekto sprendimas, ne gamintojo teiginys. Kainos ir limitai gali keistis; ši lentelė aprašo tyrimo dieną.

| Įrankis | Ką suteikia | Nemokamumo / licencijos ribos | Mūsų sprendimas |
|---|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | Dizaino kryptis, tipografija, kompozicija, peržiūra, patobulinimas ir deterministinis skeneris; Codex palaikymas | Apache-2.0; skeneriui nereikia LLM API rakto. Dizainą kuriančiam agentui reikia savo modelio | **Įdiegtas pagrindinis dizaino skill**, papildytas projekto adaptacija |
| [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Glaustos instrukcijos dėl savitos tapatybės, tikro turinio, tipografijos ir pasikartojančių modelio įpročių | Šio skill aplanke patikrinta Apache-2.0 licencija; tai nėra nemokamas Claude modelis | Tyrimo šaltinis. Antro konkuruojančio bendro dizaino skill neįdiegiau |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Kelios kryptinės instrukcijos, vaizdo → kodo procesas, esamo projekto peržiūra | MIT. Numatytoji v2 versija pažymėta experimental; kai kurie variantai stipriai primeta judesį ir maketą | Naudingos idėjos; viso rinkinio aklai netaikyti |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Vietinė dizaino rekomendacijų / tipografijos / UX duomenų paieška | Atviro rinkinio MIT; Python paieška naudoja standartinę biblioteką, be tinklo. Atskirai siūloma premium versija | Pagalbinė informacija konkrečiam klausimui; savaime nesukuria savitos kompozicijos |
| [OpenPencil](https://github.com/open-pencil/open-pencil) | Redaguojama dizaino drobė, vietinis MCP, failai, eksportas, Codex integracija | MIT; Windows palaikymas. Integruotas AI reikalauja modelio / teikėjo; projektas nurodo aktyvų vystymą ir likusius trūkumus | Stiprus **būsimo vietinio canvas bandymo kandidatas**; šiame tyrime neįdiegtas ir nepatikrintas praktiškai |
| [Penpot](https://penpot.app/pricing) ir [oficialus MCP](https://github.com/penpot/penpot/tree/develop/mcp) | Profesionalios dizaino drobės skaitymas ir redagavimas per plugin API | Platforma MPL-2.0; cloud Professional $0, iki 8 komandos narių, 10 GB. Reikia veikiančio MCP ir naršyklės plugin ryšio | Nemokama alternatyva redaguojamiems maketams; pradžioje papildoma integracija nebūtina |
| [Figwright](https://github.com/awdr74100/figwright) | Vietinis dvikryptis Figma MCP per plugin ir WebSocket | MIT; autoriaus dokumentacija numato free Figma ir desktop app plugin importui | Jei reikės būtent Figma. Veikimas mūsų aplinkoje nepatikrintas; tai nėra oficialus Figma MCP |
| [pen.dev / buvęs Pencil](https://www.pen.dev/pricing) | Agentui pasiekiama drobė, .pen dokumentai ir MCP | Šiuo metu nemokamas; gamintojas aiškiai numato galimus mokamus planus ateityje. Tai nėra MIT atviro kodo pažadas | Patogus kandidatas, tačiau jo nemokamumu ilgalaikio core negrįsti |
| [Paper](https://paper.design/pricing) | HTML/CSS dizaino drobė su MCP | Free: 100 MCP iškvietimų per savaitę, ribota vaizdų generacija. [Windows versija yra](https://paper.design/downloads) | Bandymui galėtų tikti; 30 svetainių autonominiam procesui ribotas free limitas |
| [Figma oficialus MCP](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) | Struktūruoti dizaino duomenys ir maketo perdavimas agentui | Tyrimo dienos pagrindinė dokumentacija Starter nurodo iki 20 skaitymo iškvietimų per mėnesį; kai kurie rašymo įrankiai nuo limito atleisti. Seni tekstai mini kitus skaičius | Free limitais pagrindinio proceso negrįsti. Tikrinti aktyvios paskyros teises, ne seną straipsnį |
| [Google Stitch](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) ir [oficialūs skills](https://github.com/google-labs-code/stitch-skills) | Teksto / pavyzdžių → UI, dizaino sistemos aprašas, eksportas, MCP / SDK | Skills Apache-2.0; paslaugos prieiga ir kvotos atskiros. Tikslios dabartinės nemokamos MCP kvotos patikimai nepatvirtinau | Perspektyvus alternatyvių maketų generatorius, bet „neribotai nemokama“ netvirtinu |
| [shadcn/ui MCP](https://ui.shadcn.com/docs/mcp) | Komponentų paieška ir importas iš registrų | Pagrindinė biblioteka MIT; kitų registrų licencijos ir kainos atskiros | Naudoti konkretiems komponentams, kai jie reikalingi. Tapatybės ir kompozicijos už agentą nenusprendžia |
| [Magic UI](https://github.com/magicuidesign/magicui) | Pasirenkami React vizualiniai komponentai ir [MCP](https://magicui.design/docs/mcp) | Viešo repo MIT; mokami pasiūlymai nėra automatiškai įtraukti į MIT rinkinį | Vienam pagrįstam efektui, ne visos nišos dizaino šablonui |
| [React Bits](https://github.com/DavidHDev/react-bits) | React vizualai, animacija, interaktyvūs elementai | **MIT + papildoma Commons Clause sąlyga**, ne paprastas MIT. Licencija leidžia naudojimą svetainėje / produkte, tačiau riboja pačių komponentų pardavimą / perplatinimą | Tik su peržiūrėta licencija ir pamatuota kaina našumui; ne privaloma biblioteka |
| [21st / buvęs Magic MCP](https://21st.dev/plans) | Komponentų / šablonų atradimas ir importas, agentų integracija | Dabartinis Free: kopijuoti / diegti 2 kartus per dieną, AI kreditų nėra; naršyti galima nemokamai. Senas [Magic Chat kainų puslapis](https://help.21st.dev/magic-chat/pricing) rodo kitą produktą / kainodarą | Idėjų šaltinis; netinka kaip neribotai nemokamas pagrindas |
| [Playwright CLI / MCP](https://github.com/microsoft/playwright-mcp) | Tikra naršyklė, mobilūs dydžiai, navigacija, ekrano vaizdai | Apache-2.0; vietinės priemonės, agento resursai atskiri | **Esamą CLI paliekame** vizualinei ir funkcinei patikrai |
| [Siteinspire](https://www.siteinspire.com/) | Profesionalių svetainių ir kūrėjų atranka | Viešai peržiūrima galerija; peržiūra nesuteikia teisės kopijuoti dizaino turinio / vaizdų | Reguliarus realių craft pavyzdžių atradimas |
| [Landbook](https://land-book.com/) | Svetainių, sekcijų, tipografijos ir kitų sprendimų pavyzdžiai | Nemokamas Basic turi ribotas kategorijas, paiešką ir iki 3 boards; visas rinkinys mokamas | Naudoti viešą dalį ir tiesioginius svetainių URL; Pro nereikia kaip būtinos priklausomybės |

Penpot senoji atskira [penpot-mcp saugykla](https://github.com/penpot/penpot-mcp) archyvuota 2026-02-03: dabartinis oficialus šaltinis yra pagrindinio repo `mcp/`. OpenPencil, Penpot, pen.dev ir Paper yra skirtingi produktai; panašūs pavadinimai nereiškia bendros licencijos ar kvotų.

## Kas buvo silpna mūsų traktorių puslapio dizaine

Peržiūrėjau anksčiau išsaugotą mūsų desktop maketą ir esamą TSX/CSS. Vertinimas mano: tvarkinga techninė struktūra turėjo per silpną savitą vizualinę idėją. Kartojosi pusiau padalintas hero, bendrinis šriftų nustatymas, antraštės fragmento nuspalvinimas, smulkios išretintos didžiosios raidės, rodyklės ir panašios kortelių sekcijos. Atskirai šie sprendimai gali būti geri; kartu jie atrodė kaip greitai surinktas universalus landing page.

Lighthouse, schemos ir SEO šios problemos neišsprendžia. Ankstesnis aukštas techninis balas negalėjo būti pateikiamas kaip profesionalios kompozicijos patvirtinimas. Naujame builderio procese vizualinis priėmimas turi savo kriterijus ir ekrano vaizdų įrodymus.

### Praktinis skenerio bandymas

Vietiniame Windows kompiuteryje, su Node 22.18.0, paleidau skaitymo režimą esamiems `tractor-site.tsx` ir `tractor-site.module.css`. Pirma patikrintas npm Impeccable 4.1.0; tada įdiegtas užfiksuoto skill Windows launcher su engine 0.1.8. Abu rado du įspėjimus:

- `side-tab`: kairio krašto spalvotas akcentas, CSS 32 eilutė;
- `overused-font`: Arial pasirinkimas, CSS 1 eilutė.

Rezultatai: `detector.json`, `detector-installed.json`, `detector-native.json`. Tai **šaltinio kodo** patikra, ne mobilios kompozicijos matavimas. Arial ar vienas kraštas nėra savaime blogas dizainas; rekomendacija yra įvertinti kontekstą. Skeneris neaptiko visos pasikartojančios kompozicijos problemos, todėl vizualinė agento peržiūra išlieka būtina. [Skenerio paskirtis ir iškvietimai](https://impeccable.style/docs/detector/).

Praktikoje aptikau ir Windows paleidimo trūkumą: originalus `.cmd` grąžino 0, nors tiesioginis engine grąžino 2 dėl rastų įspėjimų. Vietinėje adaptacijoje įrašiau aiškų `exit /b %ERRORLEVEL%`. Pakartotas įdiegtos priemonės bandymas grąžino 2, `engine-probe` – 0. Pakeitimas pažymėtas `SKILLS/impeccable/UPSTREAM.json`; parsisiųsta upstream versija užfiksuota atskirai tyrimo šaltiniuose. Tai svarbu automatizacijai, kuri turi matyti tikrą patikros rezultatą.

## Ką parodė realūs vizualiniai pavyzdžiai

| Pavyzdys ir įrodymas | Pastebėtas sprendimas | Ką galime taikyti / ko neperimti |
|---|---|---|
| [Impeccable boutique hotel demo](https://impeccable.style/gallery/view/eac7aa5710b8a35e/), 1440 × 1000 | Viešbučio istorijai sukurta žemėlapio / aukščio anotacijų kompozicija, susieta tipografija ir nuotrauka | Iliustruoja vientisos vizualinės idėjos principą. Autoriaus Opus 5.5 demo, ne mūsų agento bandymas; demonstracijos formos išjungtos |
| [This Design](https://this.design/), 1440 × 1000 ir 390 × 844 | Desktop tipografinė kompozicija ir portfolio darbai; mobile vaizde darbai iškeliami į pirmą planą | Layout turi aiškų scenarijų abiem dydžiams. Kūrybinio portfolio struktūra nėra automatiškai tinkama techniniam padangų pasirinkimui |
| [Stereoscope Coffee](https://www.stereoscopecoffee.com/), 1440 × 1000 ir 390 × 844 | Produkto pakuotė kaip pagrindinis vaizdinis objektas, santūri monochrominė aplinka | Pats produktas gali suteikti tapatybę vietoje dekoratyvinių kortelių. Mobile consent uždengė dalį turinio; užfiksuoti ir console įspėjimai, todėl tai ne mūsų kokybės etalonas visais aspektais |

Ekrano failai yra `output/playwright/impeccable-hotel-desktop.png`, `this-design-desktop.png`, `this-design-mobile.png`, `stereoscope-desktop.png`, `stereoscope-mobile.png`. Tai tyrimo įrodymai, ne mūsų viešai naudojami paveikslėliai. Awwwards pagrindinio sąrašo tekstinis atvėrimas nepavyko dėl timeout; jo nelaikiau apžiūrėtu pavyzdžiu.

## Autonominis procesas mūsų 20–30 nišų

1. **Faktai ir kliento klausimas.** Agentas perskaito tos nišos brief, patvirtintą paketą, tikrą veiksmą ir verslo ribas. SEO URL susiejami su konkrečiais klausimais.
2. **Dvi tyrimo kryptys.** Nišos konkurentai / gamintojai paaiškina užduotį, profesionalūs vizualiniai pavyzdžiai padeda nustatyti kompozicijos kokybės kartelę. Abiems išsaugomi šaltiniai ir apžiūros ribos.
3. **Skirtingos maketo kryptys.** Atvirai naujai tapatybei agentas paprastai palygina 2–3 realiai skirtingas kompozicijas su tikru turiniu, desktop ir mobile. Tai gali būti lengvi vietiniai HTML eskizai arba ImageGen comps, kai jų reikia. Maža CSS korekcija tokio etapo nekartoja.
4. **Savarankiškas pasirinkimas ir DESIGN.md.** Agentas pasirenka pagal klientą, aiškumą, savitumą ir įgyvendinamą našumą, dokumentuoja vieną kompromisą. Žmogaus pasirinkimo laukti nereikia; agento pasirinkimas nevadinamas žmogaus patvirtinimu.
5. **Tikras įgyvendinimas bendrame core.** Kiekvienos nišos vizualinis sluoksnis savitas. Host-aware rendereris, patvirtinimo/publikavimo predikatas, schema, sitemap, kontaktų ir matavimo izoliacija bendri. Generuoto maketo tekstai netampa verslo faktais.
6. **Vizualinis ir techninis priėmimas.** Pirmiausia agentas apžiūri tikrus vaizdus pagal konkrečius kompozicijos kriterijus; po to skeneris, funkcija, prieinamumas, realus mobilus Lighthouse ir reikiami core/SEO testai. Viena sutelkta taisymų serija ir patvirtinimas; daugiau iteracijų tik dėl konkretaus likusio trūkumo.

Šio proceso esmė – stipri vizualinė idėja ir tikro kliento klausimas. Privalomas 3D, GSAP, animuotas fonas ar atsitiktinis layout pasirinkimas nėra profesionalumo kriterijus. Patikrintas `gpt-taste` variantas, pavyzdžiui, reikalauja statinių sąsajų atsisakymo ir imituoto Python RNG išvedimo; tai nesuderinama su mūsų našumu ir tikrų įrankių rezultatų reikalavimu. Jo neįdiegiau.

## Kas įgyvendinta ir kas lieka patikrinti

Įdiegta `SKILLS/impeccable/`, išsaugota Apache-2.0 licencija, commit `0d6b47ea19b63afe15e3f93a44d5d9fbbc6fd275`, skill 4.4.0, engine 0.1.8. Codex kataloge sukurtas junction į tą patį projekto šaltinį, todėl pakeitimai nesidubliuoja. Skill bus atrandamas nuo kito pokalbio ėjimo.

Patobulinta `niche-site-builder/SKILL.md`, pridėtos `references/art-direction.md` ir `references/tooling.md`, atnaujinta projekto `AGENTS.md` ir skill katalogas. Impeccable projekto adaptacija panaikina įprastų dizaino sprendimų interviu / rankinio patvirtinimo priklausomybę, saugo atskirų domenų kontekstą ir neleidžia apsimesti atlikta nepriklausoma peržiūra.

Abu skills praėjo `quick_validate.py` (`-X utf8` reikalingas upstream Unicode tekstui šiame Windows). Patikrinta reali engine paleidimo grandinė ir išėjimo kodai. Šis validatorius patvirtina failo struktūrą, ne dizaino kokybę. Automatiniai edit hooks neįdiegti, mokamos prenumeratos ir papildomi canvas/MCP neprijungti. Viešos svetainės rendererio šiame tyrime nekeičiau.

**Kitas praktinis vertinimas:** su nauju procesu perkurti vieno pilotinio puslapio vizualinę kryptį ir parodyti tikrą naršyklės rezultatą. Tik po tokio bandymo galima spręsti, ar pasiekėme pageidaujamą dizaino kokybę. Tikros užklausos vėliau parodys, ar dizainas ir pasiūlymas padeda verslui.
