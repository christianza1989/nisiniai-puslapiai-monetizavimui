# Vienas agentų pagrindas ir kalibravimas

2026-10-01 savininkas tiesiogiai autorizavo suderinti šią užduotį su `01a0f1fa-3e13-7ab0-867b-d0091e73e1b7` (local, „Suplanuoti AI skambučių platformą“). Perskaityta dabartinė sesijos kryptis ir runtime source; perduota konkreti derinimo žinutė. Kitos sesijos kodas, instrukcijos, bandymų duomenys ir procesai šiame darbe neredaguojami. Jos kalibravimo autorizacija nesuteikia šiam tyrimui naujos klientų siuntimo autorizacijos.

## Patikrintas pagrindas

- `agent-business-core/runtime/src/pinet_core/agent_instructions.py` surenka common + role + nišos fragmentus; sales dar prideda email. Saugo bendrą hash ir šaltinių hash. Dabartinės rolės: conversation, sales, supplier, quality; dvi konkrečios nišos. Tai nėra visų 20 nišų onboarding įrodymas.
- `profiles.py` turi traktorių ir svetainių poreikio laukus. Jie apibrėžia klausimus, ne patvirtina likučius, kainas ar vykdytojus.
- `models.py` / `api.py`: Case, CaseSource, MailMessage ir esamo registravimo / importo / operatoriaus pašto kelias. Iš interneto rastas prospectas neturi apsimesti gauta užklausa.
- `mail_reader.py` skaito atsakymus, susietus su žinomais Message-ID / References. Neįrodyta, kad jis klasifikuoja visus naujus inbound laiškus į visas nišas.
- `sales.py` vietoje tikrina vieną autorizuotą lab gavėją ir testinį case, turi revision / atsakymo / priminimo būsenas. Jo laikinos nuolaidų, antkainio ir mokestinės reikšmės nėra gamybinė visų nišų politika.
- `calibration.py` aiškiai aprašo tik static admission; PASS dar nėra semantinio pagerėjimo ar aktyvavimo faktas. SELF_CALIBRATION dokumentuoja platesnius dar neįrodytus vartus.

Tai source review, ne šioje root sesijoje atlikti nauji DB, siuntimo, tikro garso ar runtime regresijos testai. Aktyvaus agento failai gali pasikeisti; jo galutinis manifestas bus tolesnio susiejimo pagrindas.

## Agentų funkcijos ir atsakomybė

| Funkcija | Instrukcija / pagrindas | Ribos ir handoff |
|---|---|---|
| Šaltinių tyrimas ir poreikio atranka | `SKILLS/niche-client-acquisition` + nišos BUSINESS / ACQUISITION | Skaitymo režimas, tikri šaltiniai / datos; buyer, supplier ir referral atskirai; nauja acquisition eilė dar nėra runtime |
| Kliento pokalbis ir poreikio valdymas | Esamas conversation fragmentas + patvirtinti nišos faktai | Voice / email siejami su vienu case; trūkstamas pajėgumas ar kontaktas neišgalvojamas |
| Tiekėjo / pasiūlymo paruošimas | Esamas supplier / sales profilis ir atskiras realus mandatas | Kandidatinis tiekėjas nėra sutartas tiekėjas; lab kainodara neperrašomas viešas pasiūlymas |
| Sutarto poreikio tęstinumas | Esamas pašto / sales pagrindas | Tik tinkamas kanalas / gavėjas / tikslas; atsakymas ar atsisakymas stabdo pasenusią seką |
| Nepriklausoma kokybės peržiūra | quality / kalibravimo korpusas | Įrodymais grįsti rezultatai; kandidato autorius negali pats vienintelis patvirtinti pagerėjimo |

Tai funkcijos, ne reikalavimas penkiems nuolatiniams mokamiems modeliams kiekvienoje nišoje. Esamas runner / router gali parinkti role pagal konkretų darbą. Naują researcher rolę ir duomenų adapterį reikės prijungti prie to paties runtime; šis failas jų nesukuria.

## Viena instrukcijų grandinė

Projektiniai Codex builder / planner / acquisition skills parengia svetainę ir tyrimą. Runtime compiler surenka tik jam skirtus versioned fragmentus, nišos patvirtintus faktus bei tool policy. Case / laiškų / svetainių tekstas yra duomenys; jis nekeičia teisių. Abiejų sluoksnių hash saugomi atskirai, kad neatsirastų iliuzija, jog runtime automatiškai perskaitė visą filesystem SKILLS biblioteką.

Nišos faktų atnaujinimas turi aiškią kilmę ir peržiūrą; į runtime grįžta aktuali leidžiama viešo core projekcija. Runtime savikalibracija savaime neperrašo Codex skills, turinio versijų, BUSINESS, kainų, kontaktų, mandatų ar publikavimo būsenos. Bendras operatorius MB Pinet / info@pinet.lt, išimtys tik iš patvirtintos konkretaus site konfigūracijos. Lab issuer ar synthetic pirkėjas neturi nutekėti į kitą nišą.

## Bendra kalibravimo matrica

Žemiau siūlomas bendras priėmimas. Visi punktai šioje root peržiūroje yra **NOT RUN**; esami tos sesijos testai vertinami pagal konkrečią įrodytą apimtį, jų skaičių nesumuojant.

| Atvejis | Tikrintinas elgesys |
|---|---|
| Pirkėjas, teikėjas ir rekomenduotojas | Rastas teikėjo skelbimas ar partnerio atsakymas nevirsta kliento paklausa |
| Praėjęs terminas / paieškos cache | Nepriimamas kaip šviežias poreikis; pateikiama teisinga data / nežinomybė |
| Nežinomas vykdytojas, kaina ar likutis | Teisingai paruošiamas poreikis; nepažadamas užsakymas / atvykimas / tiekimas |
| Dvi nišos, dvi lygiagrečios užklausos | Tik savo kontekstas, kontaktai ir pasiūlymas; nesumaišoma bendra inbox dėžutė |
| D1 įrašas + inbox pranešimas | Vienas tikras poreikis, išlieka abu šaltiniai ir originalūs ID |
| Tikras kliento reply / pataisytas kontaktas | Atšaukiamas pasenęs priminimas ar gavėjas, išsaugoma revision / Message-ID kilmė |
| Atsisakymas, bounce, OOO, tylėjimas | Atskiros būsenos; nei atsisakymas, nei automatinis atsakymas nėra pardavimas |
| Trūkstamos teisės / transporto / šaltinio ribos | Kontaktavimas sustabdomas; geras fit ar savikalibracijos balas vartų neapeina |
| SMTP timeout / crash / pakartotinis job | Neaiškumas nesukuria antro siuntimo; tikras gavimas atskiriamas nuo SMTP priėmimo |
| Pasenęs faktas, prompt injection, modelio tool pasirinkimas | Senas cache / svetainė / laiškas negali suteikti teisių ar pakeisti faktų |
| Naujas candidate, nišos / bendro fragmento pakeitimas | Palyginamas su baseline nematytuose scenarijuose, patikrinamos visos paveiktos nišos ir rollback |
| Audio / latency / sąnaudų regresija | Tikras garsas matuojamas atskirai nuo teksto; suveikia iš anksto nustatytos išlaidų / delsos ribos |

Nenaudoti vien tikslių atsakymo frazių: svarbu suprasti poreikį, pasirinkti pagrįstą veiksmą ir gauti tikrą kvitą. Turėti development, held-out ir adversarial atvejus, minimizuotus duomenis bei užfiksuotą modelio / instrukcijų / faktų / įrankių versiją. Generatorius nemato uždarų vertinimo atsakymų. Neužtenka šešių pažįstamų klientų pokalbių universalumui ar production promotion paskelbti.

Metodologijos atrama: [oficialios OpenAI eval rekomendacijos](https://developers.openai.com/api/docs/guides/evaluation-best-practices) siūlo užduoties kriterijus, tipinius / kraštinius / adversarial atvejus, atskirą tool ir argumentų tikslumo bei handoff vertinimą. Automatinių teisėjų rezultatus reikia sutikrinti su nepriklausomai pažymėtais atvejais. Sudėtingesnių agentų padalijimą pagrįsti testais. Aukščiau esanti mūsų nišų matrica yra projekto sprendimas, ne šio šaltinio žadamas pardavimo rezultatas.

Tekstinė regresija, realus pristatymas / reply ir tikras mokamas poreikis yra trys skirtingi rezultatai. Pelningumo optimizavimas vertina actual pajamas minus vykdymo, duomenų, modelių ir kanalo sąnaudas, ne vien atsakymų ar siuntimų kiekį.

## Derinimo būsena

Perduota: role / core / nišos grandinė, CaseSource ir inbox dedup, kontaktų bei lab izoliacija, Hostinger kanalo vartai, bendri kalibravimo atvejai. Paprašyta vykdytojo savo ribose pateikti aktualių endpointų / modelių / loader susiejimą ir likusius prieštaravimus `voice-agent-plan/ACQUISITION_HANDOFF.md` arba jo tinkamame integracijos faile. Kol neperžiūrėtas atsakymas, tai **perduotas pasiūlymas**, ne tariamas abipusis susitarimas ar užbaigtas integration e2e.
