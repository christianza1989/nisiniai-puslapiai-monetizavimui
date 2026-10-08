---
name: business-agent-calibration
description: Sukurk, prijunk ir iš karto kalibruok šio projekto verslo pokalbių agentą naujoje ar esamoje nišoje; taikyk ir laiškų bei tiekėjų agentų kalibravimui. Patikrink autonominį instrukcijų mokymąsi, versijos pritaikymą ir rollback pagal tikrus core kvitus.
---

# Verslo agentų kalibravimas

**Sukūrimas apima kalibravimą:** savininko pavedimas „sukurk šiam verslui pokalbių agentą“ (ar analogiškas) yra pavedimas prijungti nišą ir iš karto savarankiškai kalibruoti agentą iki deklaruotos apimties priėmimo. Atskiro „dabar pakalibruok“ prašymo nelaukti. Vykdyti [sukūrimo ir kalibravimo sutartį](references/create-and-calibrate.md), tada actual runbook ir acceptance matricą. Vien prompto, profilio, valdiklio ar baseline rezultatų pateikimas neužbaigia tokio pavedimo.

Šaltinis yra šis Git skill ir actual `agent-business-core/runtime`, ne ankstesnio Codex pokalbio atmintis. Taikyk savininko užsakytam agentų darbui; naujos svetainės F1 savaime neįjungia balso, pašto ar prekybos. Perskaityk [projekto sutartį](../PROJECT_CONTRACT.md), nišos BUSINESS bei dabartinį implementation status ir rezervuok failų ribas pagal [MULTI_MACHINE](../../docs/MULTI_MACHINE.md).

## Pasirink bandymo kelią

Prieš darbą ir prieš naują ratą vykdyk [Git aktualumo eigą](../../docs/CODEX_GIT_WORKFLOW.md). Baseline/candidate turi vieną užfiksuotą source/instruction snapshot; main atnaujinimas vyksta tarp darbų, ne palyginimo viduryje. Naujas ratas po integravimo iš naujo įkelia actual Git skill, ne seną global kopiją.

- Nauja niša ar tekstinis aptarnavimo ratas: [vykdymo eiga](references/runbook.md). Ji aprašo esamus komandų argumentus, private knowledge parengimą ir admission, o ne žada universalų onboarding installerį.
- Savarankiško mokymosi priėmimas: tame pačiame runbook tikrink quality → candidate → apsaugotą palyginimą → actual naujos sesijos versiją → rollback. `candidate` ar MD failas dar nėra pritaikytas mokymasis.
- Tikras balsas, kliento ekranas ar laiško pristatymas: [priėmimo matrica ir ataskaita](references/acceptance.md), [LIVE_TEST_RUNBOOK](../../voice-agent-plan/LIVE_TEST_RUNBOOK.md) ir [Git perdavimo būklė](../../docs/AGENT_CALIBRATION_HANDOFF_2026-10-08.md). Patikrink reikalingo kodo SHA / sujungimą prieš naudodamas vėlesnio PR komandas.

## Core + nišos ribos

`agent_instructions.compose(site_id, role)` jungia packaged `core/common.md`, rolės instrukciją ir nišos procedūrą. Sales papildomai gauna `core/email.md`; quality gauna nišos conversation kontekstą. Failai yra `runtime/src/pinet_core/instructions/`, profilis — `profiles.py`. Faktai ateina iš actual public projekcijos; policy, leidimai ir kvitai — iš serverio. Dalinės nišos istorija, kaina, tiekėjas ar įmonės rekvizitai netampa bendru core faktu.

Leisk laisvai, natūraliai kalbėti. Vertink išspręstą poreikį, teisingus veiksmus ir naudingą kitą žingsnį, ne replikos sutapimą su šablonu. Nedėk visos klaidų istorijos į promptą. Pirma atskirk komunikacijos, faktų, įrankio, transporto, STT ir vertintojo priežastis.

## Scenarijai ir vertinimas

Iš nišos mokamo rezultato sukurk skirtingus klientus: aiškus pirkėjas; nežinantis specifikacijos; skubantis ir pataisantis poreikį; techninis skeptikas; kainai jautrus; privatumo / kontakto atsisakantis. Papildyk tos nišos rizikomis, kitos kalbos, perskambinimo, jau išsaugoto kontakto ir nutrūkimo atvejais. Tiekėjų ir sales testai turi savo vaidmenis bei įgaliojimus.

Prieš pirmą vykdymą užfiksuok scenarijų split, code / model / evaluator / corpus / knowledge / instruction hash, kvietimų ir išlaidų ribas. Pokalbio agentas gauna įprastą kliento tekstą; testų žymos bei tikėtini atsakymai lieka runner / evaluator pusėje. Testai lieka sintetinėje serverio aplinkoje, net kai kliento laiškas ir PDF atrodo kaip galutinis produktas.

Kandidatui duok tik train atkūrimo įrodymus. Jam nematytas holdout privalo likti atskiras; operatoriui jau matyta klaida yra regresija, ne blind. Pokalbio agentas, proposer ir controller negali pakeisti apsaugoto korpuso ar vertinimo vartų. Bendro fragmento pataisą tikrink visose paveiktose nišose; dalykinį pataisymą palik nišai.

Vertink state ir receipts: žmogaus pataisytas poreikis, tool rezultatas, popup `shown` ACK, serverio contact save, final transcript, pažadą atitinkantis reviewed follow-up, nepriklausomas quality rezultatas. Kontaktą atsisakęs klientas vis tiek turi gauti naudingą konsultaciją. Be veikiančio SMS / callback kanalo telefono išsaugojimas nesuteikia pristatymo pažado. Cookie atpažįsta įrenginį, ne įrodytą asmenį.

## Iteracija ir perdavimas

Pirmą FAIL ir visas intervencijas išsaugok. Taisyk mažiausią pagrįstą priežastį; paleisk jos regresiją ir dar nematytus artimus scenarijus. Infrastruktūros timeout, neprieinamas šaltinis ir netinkamas evaluator nėra aptarnavimo PASS. Nei vienodas kandidato balas, nei daug kartų kartotas žinomas testas neįrodo pagerėjimo.

Autonominis controller keičia versijuotą vietinį conversation elgesio papildymą, ne bazinius Git MD, kainas, teises ar žinių approval. Sales / supplier atskirų rolės versijų promotion ir production/audio canary vertink atskirai nuo vietinio conversation mokymosi. Neaktyvuok balso versijos vien pagal Codex tekstą.

Naudok acceptance matricą su PASS / FAIL / UNVERIFIED / pagrįstu NA ir konkrečia source versija. Užbaigimas reiškia deklaruotos apimties įrodymus; „visais atvejais idealu“ iš baigtinio korpuso neišplaukia. Sintetiniai balai nėra klientų pasitenkinimas, paklausa ar pelnas.

Į Git dėk atkuriamą kodą, bazines instrukcijas, sintetinius korpusus ir minimizuotą ataskaitą. Privačius dialogus, kontaktus, audio, `.eml`, DB, `.env`, active release ir mokymosi artefaktus palik ignoruojamame runtime `artifacts/`. Išmoktos versijos clone savaime neperkelia: naujoje aplinkoje jas iš naujo patikrink arba perduok per aiškiai autorizuotą privatų release procesą. Patikrintas bendras elgesio pataisymas gali tapti Git MD tik per atskirą peržiūrėtą core pakeitimą su regresijomis.
