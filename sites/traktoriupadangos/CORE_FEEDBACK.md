# Balso piloto core pamokos, 2026-10-07

Actual darbų šaltinis ir įrodymai: [VOICE_LAUNCH](../../voice-agent-plan/VOICE_LAUNCH_2026-10-07.md), core issue29/public issue8; atskiras Git langas, kitų nišų turinys nekeistas.

- Media room connect nėra agento readiness. Tikras RTC startup / greeting timeout atskleidė lenktynę; bendras server-owned first-speech atributas ir browser handshake pašalina netikrą „Pokalbis vyksta“ būseną. Keturi event/race/timeout testai ir tikras provider transportas tikrina skirtingas ribas.
- Browser hangup negali publikuoti postcall jobs prieš worker persistence flush. Cooperative stop+epoch/lease patikra ir finalizacija per owner išlaiko paskutinį atsakymą; naujas regresijos testas tikrina būtent šią tvarką.
- Strict Pydantic schema perduodant per legacy SDK schema transformą gautas tikras HTTP400. JSON Schema turi išlaikyti additionalProperties=false, o vieno leistino evidence ID const konvertuoti į palaikomą enum. Paid usage registruojamas ir nesėkmingo output validation atveju; modelio output vis tiek patikrinamas serveryje.
- Actual native AI laiško juodraštis ir priimtas laiškas yra skirtingi artefaktai. Core turi server-bound nepriklausomą review, pakartotinį šaltinio/hash patikrinimą ir saugų fallback. Patvirtintas LLM review vienas nepanaikina foreign-link filtro.
- Fresh clone testas negali priklausyti nuo ignoruoto privataus tyrimo ar savininko billing failo. Sintetiniai testai turi savo nekintančius šaltinius ir issuer fixtures; tikros verslo tapatybės į juos neperkeliamos.
- Process start / worker HTTP health nėra actual registration. Marker + PID/start time / namespace tikrinimas reikalingas paleidimo helperiui; PowerShell datos turi būti lyginamos kaip datos.

Šios actual problemos pagrindė bendras runtime/helper pataisas, ne naują visoms nišoms privalomą pokalbio scenarijų. Viešas paleidimas, inbox gavimas ir visų klientų archetipų kokybė lieka atskiri priėmimai. „Self-learning veikia idealiai“ nėra šio garso testo išvada.
