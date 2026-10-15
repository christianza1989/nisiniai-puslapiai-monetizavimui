# Verslomatikos produktas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pagrindinis naudotojas yra verslo savininkas, kuriam nereikia techninių žinių. Jis gali ateiti su idėja, tiekėjo nuoroda arba dar nežinodamas, kokį verslą kurti. Vienas savininkas gali turėti kelis verslus ir atskirus jų pokalbius.

## Product Purpose

AI komanda padeda pasirinkti kryptį, išsiaiškina poreikį, tiria galimybes, rengia aptariamą planą ir po savininko patvirtinimo kuria verslo svetainę. Kai jos pagrindas paruoštas, savininkas gali tobulinti dizainą ir rengti bei kalibruoti savo verslo agentus.

## Operating Context

Savininko 2026-10-13 prioritetas yra visa aiški UI/UX darbo erdvė prieš kitus realius generavimo bandymus. Pageidaujamas išdėstymas remiasi jo Codex ekranu: verslo pasirinkimas ir navigacija kairėje, pokalbis centre, išskleidžiama veiklos bei rezultatų sritis dešinėje. Dabartinis ilgas vertikalus kūrimo puslapis žmogui neaiškus.

## Capabilities and Constraints

Esamas Next.js portalas naudoja BFF ir bendro Python/PostgreSQL core sutartis. Išsaugoti savininkų, verslų, pokalbių, redakcijų ir apskaitos ribas. Šaltinio patikra, tikro modelio rezultatas, įprastas UI, kitas PC ir viešas paleidimas yra atskiri priėmimai.

Pilnas svetainės controller ir foundation priėmimas dar neužbaigti. Nauja sąsaja nesuteikia agentų, dizainerio, kanalų ar publikavimo teisių. Kalibravimui naudojama esama sistema. Scheduler, SMTP/voice/social, Supabase, viešas paleidimas ir pirkimai sustabdyti; kalbos-only taisymas/Gemini atidėti. Šiame etape nauji realūs modelių bandymai laukia UI/UX.

## Brand Commitments

Produkto ženklas yra Verslomatika. Aiški lietuviška vartotojo kalba; techninės detalės pateikiamos tik ten, kur jos padeda priimti sprendimą. Svetainių dizainai gali būti saviti, o darbo erdvės navigacija ir valdikliai nuoseklūs.

## Evidence on Hand

Savininko pateiktas Codex ekranas, tikras vietinis discovery portalas, esamos versionuotos sutartys ir išsaugoti originalūs bandymų kvitai. Ekrano privačių projektų, paskyros duomenų ir modelių traces į produkto dokumentaciją nekopijuoti.

## Product Principles

- Vienas pagrindinis pokalbis koordinuoja verslo komandą; naudotojas neprivalo pats vadovauti keliems agentams.
- Visada aišku, kuris verslas pasirinktas, kas vyksta, koks rezultatas ir kokio veiksmo reikia iš žmogaus.
- AI pats tiria ir rekomenduoja; žmogaus klausia tik sprendimą keičiančių nežinomų dalykų.
- Matomos būsenos remiasi tikrais core įrašais; planas, juodraštis, patikra ir viešas paleidimas nesuplakami.
- Pokalbiai, priimtos redakcijos ir ankstesnės nesėkmės išlieka; kito verslo duomenys neperkeliami.
