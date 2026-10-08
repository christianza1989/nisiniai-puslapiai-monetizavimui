# Kaip prijungti projektą prie bendros sistemos

Naujo BUSINESS / reikšmingos plėtros metu companion Git [niche-business-tools](../SKILLS/niche-business-tools/SKILL.md) ir [BUSINESS_TOOLS_CORE](../BUSINESS_TOOLS_CORE.md) numato nišos TOOLS.md visam mokamo kliento rezultatui ir ateities capabilities. Praktines shared spragas agentai patys taiso pagal [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md), kiekvienam įgyvendinamam upgrade veda [bendrą žurnalą](../core-improvements/README.md) ir naudoja atkuriamą karantiną. Imported archyvai, kitos sesijos failai, secrets ir klientų duomenys nekeičiami šia eiga.

Šis dokumentas yra startas AI, gavusiam vien GitHub nuorodą. Projektas jungiamas pagal actual sutartis, ne kopijuojant visą ankstesnį verslą ar numanant, kad dokumentuoti API jau veikia.

## Pirmas perskaitymas

Pirmiau actual Git gate pagal [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md): start / continue / handoff režimai ir kiekvieno PC global bootstrap. Vienas senas AGENTS arba asmeninis skill mirror nesuteikia aktualaus main įrodymo.

1. Root README → AGENTS → docs/MULTI_MACHINE → WORKSTREAMS.
2. Nauja niša: START_HERE → CORE_BUILD_CONTRACT → SKILLS/PROJECT_CONTRACT ir builder/business-validation.
3. Esamas projektas: `sites/<siteId>.md` ir tos nišos BUSINESS/PRODUCT/roadmap/DESIGN. Didesnei savininko užsakytai platformai taikyti [PLATFORM_BUILD_CONTRACT](../PLATFORM_BUILD_CONTRACT.md). Madbeauty aktualų išplėstą pavedimą ir priėmimą skaityti `sites/madbeauty/IMPLEMENTATION_STATUS.md` / `BACKEND_DECISION.md`; PROJECT_ROADMAP istorinius etapus vertinti pagal jų apimtį.
4. Bendros sutartys: SEO_GEO_CORE, MEDIA_CORE, MAIL_CORE, NETWORK_LINKING; reikalingiems būsimiems moduliais ACQUISITION_CORE ir VOICE_CORE_INTEGRATION. Dokumentus lyginti su aktualiu companion code.

5. Jei pavedime yra verslo pokalbių, laiškų ar tiekėjų agentai: [business-agent-calibration skill](../SKILLS/business-agent-calibration/SKILL.md), jo runbook ir acceptance matrica. Tai vienas atkuriamos nišos kalibravimo startas; [perdavimo būklė](AGENT_CALIBRATION_HANDOFF_2026-10-08.md) atskiria jau main esantį kodą, nesujungtus audio PR ir private artefaktus.

Nauja svetainė pradeda pirmoje fazėje. Madbeauty savininkas 2026-10-05 praplėtė privatų frontend užsakymą iki veikiančio vietinio meistro / kliento backend su email-only testavimo registracija pagal DEMO_DATA_POLICY ir docs/MADBEAUTY_BACKEND_ACCEPTANCE. Ankstesnis frontend-only etapas šio pavedimo neberiboja; kitoms nišoms plėtra automatiškai nepridedama.

## Bendras branduolys ir verslo modulis

| Bendra dalis | Konkrečios nišos atsakomybė |
|---|---|
| Turinio schema, redakcinė approval/hash/publishAt eiga, content-studio | Tikri faktai, pasirinktas pasiūlymas, useful puslapiai ir kalendorius |
| Medijos optimizavimas ir responsive šeimos | Originalūs assets, kompozicija, alt, teisės ir tikri portfolio |
| Host-aware viešo turinio projekcija, canonical/sitemap/robots/schema pagal actual rendererį | Tikras domenas, atskiri URL ketinimai, nišos rendereris/adaptuotas layout ir matavimas |
| Numatyti kontaktai ir kontaktų/delivery sutartis | Per-site patvirtintos išimtys, aiškus užklausos veiksmas ir testai |
| Agentų site/business ryšys ir admission vartai | Pirkėjas, vykdymas, pasiūla, knowledge ir ekonomika; moduliai defaultoff iki priėmimo |
| Git ir susietų PR tvarka | Savitas domeno dizainas ir reikalingi mažieji įrankiai |

Madbeauty grožio taxonomy, paslaugų variantai, availability, kalendorius, paskyros ir registracijos yra verslo modulis, ne visuose nišų homepage privalomas komponentas. Bendra sutartis nereiškia vienodo dizaino. Dabar privatus prototipas atskiras; actual public/agent runtime integracija turi vėlesnius patikros vartus.

## Prijungimo eiga

- [ ] Išsirinkti vieną stabilų `siteId` ir canonical host. Visuose adapteriuose tas pats ID; prieš įregistruojant tikrinti abiejų repo aktualius registrus ir kolizijas.
- [ ] Dokumentuoti BUSINESS, patvirtintus kontaktus, pirmos fazės signalą ir išmatuojamą plėtros kriterijų. MB Pinet/info@pinet.lt default; kitų nišų telefono/adreso nepersinešti.
- [ ] Sukurti branch/PR ir WORKSTREAMS įrašą su failų ribomis. Shared schema/renderer/registry pakeitimus serializuoti; kito PC lokalaus įrašo nematyti savaime.
- [ ] Naudoti dabartinę `content-studio/schemas/` ir companion `schemas/`/paketo validatorius. V1 nekeisti aklai į V2: actual V2 staging/admission ir legacy adapterių ribos tikrinamos kodu bei integracijos dokumentais. Suderinamumas ir rollback abiejų repo PR.
- [ ] Turinio/medijos importą vykdyti bendrais studijos bei companion import/compile helperiais, ne JSON rankiniu kopijavimu ar nauju image optimizeriu kiekvienam projektui. Demo/draft turi atskirą namespace ir neįeina į public paketą.
- [ ] Prijungti nišos viešą rendererį/registry tik mažame sutartame lange, laikantis host izoliacijos ir bendro publikavimo predikato. Sitemap/schema/LLM išvestys turi rodyti tik eligible matomą turinį. Private prototype visas noindex.
- [ ] Matavimą atskirti pagal siteId. Paspaudimas nėra gauta užklausa, UI success nėra patvarus įrašas ar pristatytas laiškas.
- [ ] Jeigu reikia agentų: per-site profile, knowledge projection, contact source ir policy/admission fail-closed. Balso/SMTP/FB/payment įjungimo leidimas nepridedamas registruojant siteId; viešas turinys ir private klientai izoliuoti.
- [ ] Testuoti aktualių failų sąsajas, publication/hash/host/media, tikrą kontaktų kelią ir regresijas. Audituoti pagal niche-site-audit. Atskirti local/launch/demand.
- [ ] PR aprašyti įrodymus ir neužbaigtus vartus, sujungti nustatyta eile; tik tada kitas kompiuteris atnaujina bazę. DNS/deployment ir realios operacijos yra atskiri veiksmai.

## Kai jungiamas tik turinys

Aiškus savininko pavedimas palikti projektą jo esamame hostinge turi pirmenybę prieš pilno core prijungimo checklist. Tokiu atveju `siteId` registruojamas studijoje, o į target perduodamas tik patikrintas turinio bundle pagal [CONTENT_CORE nepriklausomo projekto adapterį](../CONTENT_CORE.md#nepriklausomo-projekto-turinio-adapteris--2026-10-06). Nekurti public registry, antro publisher ar paskyrų migracijos vien straipsniams. Target išlaiko savo aktualų roadmap, dizainą, veikiančias funkcijas, realius faktus ir priėmimo vartus. Content transporto testai nėra jo UI, kontaktų, deployment ar piloto priėmimas.

Namudarbas.lt (`siteId=mokytoja-ai`) konkretus trijų repo startas, aktyvaus viešo snapshot inventorius ir GitHub perdavimo būsena: [NAMUDARBAS_INTEGRATION](NAMUDARBAS_INTEGRATION.md). Jo `AI_teacher` source lieka viename atskirame repo; privatus studijos kalendorius, reviews ir šeimų duomenys klonuojant Git neatsikuria.

## Naujo AI pirmo atsakymo kriterijai

AI turi gebėti įvardyti savo siteId, verslo tikslą, dabartinį etapą, rašymo ribas, kokį esamą core/adapterį naudos, kas tik suplanuota ir ką testuos. Neužtenka „padariau landing“ ar švaraus Lighthouse. Jei neprieinamas companion repo ar tikri verslo faktai, įvardyti konkrečią spragą ir tęsti nepriklausomą autorizuotą darbą — neišgalvoti veikiančių API, tiekėjų ar klientų.
