# Dokumentacijos žemėlapis

Šis indeksas padeda pasirinkti dokumentą pagal užduotį. Jis nekopijuoja sutarčių, nekeičia savininko pavedimo ir nesuteikia leidimo įjungti mokamų paslaugų ar viešo runtime. Prieš darbą sėkmingai atnaujink `origin/main` per Git fetch ir patikrink savo šakos bazę pagal [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md).

## Pradžia pagal darbą

| Darbas | Kur skaityti |
| --- | --- |
| Taisyklės ir nuosava failų sritis | [AGENTS](../AGENTS.md), [WORKSTREAMS](../WORKSTREAMS.md) ir aktuali GitHub issue / PR rezervacija |
| Naujas kompiuteris, clone ir priklausomybės | [MULTI_MACHINE](MULTI_MACHINE.md), [GITHUB](GITHUB.md) |
| Nauja nišinė svetainė | [START_HERE](../START_HERE.md), [CORE_BUILD_CONTRACT](../CORE_BUILD_CONTRACT.md) |
| Didesnė platforma arba esamo projekto prijungimas | [PLATFORM_BUILD_CONTRACT](../PLATFORM_BUILD_CONTRACT.md), [INTEGRATING_A_PROJECT](INTEGRATING_A_PROJECT.md) ir konkretaus projekto būsena |
| Bendro core pataisa arba tikslus karantinas | [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md), [žurnalas ir plan/apply/restore](../core-improvements/README.md) |
| Skill parinkimas | [SKILLS/README](../SKILLS/README.md), [PROJECT_CONTRACT](../SKILLS/PROJECT_CONTRACT.md), [katalogas](../SKILLS/catalog.json) |

## Moduliai ir jų sutartys

| Sritis | Prižiūrimas įėjimas |
| --- | --- |
| Turinio studija ir redakcinė eiga | [content-studio/README](../content-studio/README.md), [CONTENT_CORE](../CONTENT_CORE.md) |
| SEO/GEO ir tyrimų duomenys | [SEO_GEO_CORE](../SEO_GEO_CORE.md), [SEO_RESEARCH_CORE](../SEO_RESEARCH_CORE.md) |
| Vaizdai ir tinklo nuorodos | [MEDIA_CORE](../MEDIA_CORE.md), [NETWORK_LINKING](../NETWORK_LINKING.md) |
| Verslo įrankių ir klientų paieškos planas | [BUSINESS_TOOLS_CORE](../BUSINESS_TOOLS_CORE.md), [ACQUISITION_CORE](../ACQUISITION_CORE.md) |
| Python/PostgreSQL agentų runtime | [runtime/README](../agent-business-core/runtime/README.md); [agent-business-core/README](../agent-business-core/README.md) saugo ir ankstesnio architektūros plano kontekstą |
| Verslo agento sukūrimas ir kalibravimas | [business-agent-calibration SKILL](../SKILLS/business-agent-calibration/SKILL.md), jo create-and-calibrate eiga ir konkrečios nišos patikros |
| Paštas ir balso prijungimas | [MAIL_CORE](../MAIL_CORE.md), [VOICE_CORE_INTEGRATION](../VOICE_CORE_INTEGRATION.md), [voice-agent-plan/README](../voice-agent-plan/README.md) |
| Facebook botas, kai tai užsakyta | [facebook-bot-setup SKILL](../SKILLS/facebook-bot-setup/SKILL.md), [FACEBOOK_SYSTEM](../agent-business-core/FACEBOOK_SYSTEM.md) |
| Domeno istorijos tyrimas | [builderio domain-history instrukcija](../SKILLS/niche-site-builder/references/domain-history.md) |

Viešo svetainių variklio rendererio, paketų ir diegimo instrukcijos yra companion `niche-public-core` checkout. Šio repo dokumentacija nėra antra jo realizacija. Modulį įdiegti, pritaikyti konkrečiam verslui ir patikrinti realiame kanale yra atskiri veiksmai.

## Kaip nustatyti tikrą projekto būseną

1. Patikrink konkretų repo, šaką, HEAD ir per fetch gautą main. Darbas PR šakoje laikomas pristatytu į main tik patikrinus tikrą sujungimą.
2. Skaityk konkretaus projekto naujausią būsenos dokumentą ir jo nurodytą perdavimą. Nišoms tai paprastai `sites/<siteId>.md`, `BUSINESS.md`, `DESIGN.md` ir auditas; platformoms – jų `IMPLEMENTATION_STATUS`, roadmap arba užduočiai priskirtas handoff. Pavyzdys: [Madbeauty roadmap](../sites/madbeauty/PROJECT_ROADMAP.md) ir [įgyvendinimo būsena](../sites/madbeauty/IMPLEMENTATION_STATUS.md).
3. Atskirai įvertink kodo patikrą, konkretaus checkout / adapterio pritaikymą, tikro proceso ar UI bandymą, viešą paleidimą ir verslo paklausą. Ankstesnis PASS galioja tik užrašytam šaltiniui, aplinkai ir bandymui.

[PROJECT_STATUS](../PROJECT_STATUS.md), [2026-10-06 perdavimas](NEXT_CODEX_HANDOFF_2026-10-06.md), [2026-10-08 kalibravimo perdavimas](AGENT_CALIBRATION_HANDOFF_2026-10-08.md) ir datuotos QA ataskaitos saugo ankstesnių etapų įrodymus. Naujausia data pavadinime savaime nesuteikia dokumentui aukštesnio autoriteto. Privačių artefaktų keliai, senų procesų ID, screenshot ir tuometiniai PR statusai nėra dabartinio paleidimo instrukcija.

## Kas išsaugoma tvarkant repo

[2026-10-17 inventorius](CORE_DOCUMENTATION_INVENTORY_2026-10-17.md) nurodo tikrintą aprėptį, karantiną, paliktus failus ir priežastis. SOURCE archyvai, auditai, approval, fingerprint, ankstesni bandymų rezultatai ir nišų faktai saugomi kaip kilmė bei įrodymai. Karantino `source.txt` yra atkūrimui skirti baitai, ne aktyvi instrukcija.

Vien failo amžius, vienodas hash arba nerastas importas neįrodo, kad jį galima ištrinti. Vienkartinės migracijos ir rankiniai CLI gali likti reikalingi atkūrimui. Konkretus pasenęs failas perkeliamas tik pagal [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md), patikrinus palaikomą naudojimo kelią ir išsaugojus atkūrimą.

Build kopijos, priklausomybės, DB, klientų duomenys ir vietiniai artefaktai nėra šio dokumentacijos indekso valymo objektas. Jų disko naudojimas ir saugus šalinimas vertinami atskirai; Git main tvarka nepatvirtina visų šio PC katalogų švarumo.
