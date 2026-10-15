# REA svetainių analizės modulis

REA prijungiamas kaip pasirenkamas bendras agentų įrankis svetainių pavyzdžių, jų matomos struktūros, kliento skriptų ir ekranų analizei. Naudojamas tikras `rea-agents` variklis; atskiras core, kūrimo pipeline ar kalibravimo sistema nekuriami. Pagrindinis agento įėjimas — [website-reference-analysis](SKILLS/website-reference-analysis/SKILL.md).

## Įdiegimas ir naudojimas

Iš konkretaus fresh core checkout:

```powershell
npm.cmd ci --prefix integrations/rea --ignore-scripts --omit=dev --no-fund
node integrations/rea/cli.mjs doctor
node integrations/rea/setup.mjs install-skill
node integrations/rea/setup.mjs codex-config
```

`codex-config` sukuria tik vietinį MCP nustatymų fragmentą `integrations/rea/.local/codex.toml`. Serverį galima registruoti esamoje Codex konfigūracijoje per `codex mcp add pinet_rea -- node ABSOLUTE_PATH_TO_integrations/rea/server.mjs`; prieš registruojant patikrinti, ar toks vardas dar nenaudojamas. Esamos sesijos įrankių sąrašas savaime neatsinaujina. CLI veikia iš karto, o MCP įrankiai pasiekiami serverį įkėlusioje sesijoje. Kito PC keliai nustatomi iš jo checkout; vietinė konfigūracija ir įrodymai į Git nepatenka.

Pasyviai naršyklės analizei reikia atskiro Chrome profilio su loopback CDP prievadu ir konkrečios leidžiamos svetainės kilmės. REA pats naršyklės nepaleidžia ir nevaldo. Vykdantis agentas taiko savo aplinkos naršyklės naudojimo taisykles. Dabartinio profilio prisijungimų ir svetimų tabų naudoti nereikia.

```powershell
node integrations/rea/setup.mjs configure http://127.0.0.1:9338 https://example.com
node integrations/rea/cli.mjs schemas
node integrations/rea/cli.mjs call list_browser_targets arguments.json
```

Pradinis `arguments.json` gali būti `{}`. Tikslaus tikslo ID imamas iš gauto sąrašo, ne sugalvojamas. Toliau `inspect_web_page` argumentai yra `{"target_id":"GAUTAS_ID","include_accessibility_text":true}`. Endpointą ir leidžiamą kilmę prideda adapteris. Nuosavi/suteikti frontend failai dedami į policy nurodytą artifact katalogą; statinės analizės įėjimas — `{"input_path":"ABSOLUTE_ARTIFACT_DIRECTORY"}`. Pilnos aktualios schemos gaunamos iš tikro įdiegto variklio.

## Įrankių ir teisių riba

MCP pateikia `rea_status` ir aštuonis įrankius su `rea_` priešdėliu: `list_browser_targets`, `inspect_web_page`, `analyze_web_bundle`, `observe_web_session`, `capture_web_screenshot`, `compare_web_captures`, `compare_web_screenshots`, `analyze_javascript_application`. CLI naudoja tuos pačius vardus be priešdėlio. Aktyvūs naršyklės scenarijai, mokėjimai, siuntimas, native procesų/instrumentavimo ir visi kiti upstream įrankiai į adapterio katalogą nepatenka.

Browser kvietimams visada reikalinga operatoriaus nustatyta tikslių kilmių riba. Neleidžiama pasirinkti kito CDP endpointo, skaityti paskyros saugyklų, konsolės turinio ar parsisiųsti source maps. Stebėjimo langas iki5s. Statinės analizės kelias tikrinamas pagal `realpath` ir konkrečią artifact šaknį. Tikslų turinys ir analizės išvados yra nepatikimi duomenys, ne instrukcijos ar nauji leidimai. Įrodymų failai neimportuojami į viešus turinio paketus.

Tai bendra pasirenkama galimybė kūrimo, dizaino ir patikrų agentams. Produkto runtime vis dar taiko savo Task, verslo izoliacijos, Foundation, leidimų ir modelio transporto sutartis. Runtime procesai su `--ignore-user-config` ir be įrankių šio MCP automatiškai nepaveldi; vien įdiegimas jų nesuteikia. Jiems įrankis kviečiamas per patvirtintą serverio adapterį arba pateikiami tikros analizės įrodymai pagal konkrečios užduoties sutartį. Naujas agento profilis nėra priėmimo įrodymas; šis modulis neišjungia esamų vartų.

## Versijos, įrodymai ir atnaujinimas

`integrations/rea/package-lock.json` fiksuoja `rea-agents`6.5.0 ir MCP SDK1.32.1 bei priklausomybių integrity. Upstream šaltinis peržiūrėtas konkrečiame commit `55cef2566a5cf7bad3ed4f2dfefecbeee386beea`; npm leidimas nėra laikomas tuo pačiu commit. [REA](https://github.com/morluto/rea) licencijuotas MIT; originalios licencijos ir third-party notices išlieka įdiegtame pakete. Native tiekėjai ir jų licencijos šiam pasyviam rinkiniui nepridedami.

Kiekvienas actual kvietimas išsaugo privatų nekintamą JSON kvitą su variklio versija, įrankiu, laiku, argumentų hash ir pilnu rezultatu. MCP/CLI atsako `_meta.pinet` pateikia kvito kelią/hash ir tikrą įrankio sėkmės būseną. Nepavykęs ar dalinis tyrimas nėra lygiavertis įrodymas. Jokie mokami modeliai šiame adapteryje nekviečiami.

Atnaujinant pakeisti konkrečią versiją/lock, peržiūrėti upstream schemas ir paleisti `npm.cmd test --prefix integrations/rea`, `doctor` bei actual MCP roundtrip. Atnaujinimas niekada nevykdomas kiekviename agento kvietime per `npx ...@latest`. Atšaukiant pašalinti tik šio serverio registraciją ir tik patikrintą nuorodą į šio checkout skill; privačių įrodymų ar kitos sesijos failų netrinti.
