# Verslomatika.lt produkto kontekstas

<!-- impeccable:product-schema 1 -->

## Platform

Web. Darbalaukio ir mobiliosios naršyklės valdymo aplinka. Šis dokumentas aprašo planuojamą produktą, ne jau veikiantį deployment.

## Stack

Esamo [core pasirinkimas](../ARCHITECTURE.md): Python/FastAPI, PostgreSQL, versijuoti adapteriai ir atskiri vykdytojai; operatoriaus sąsajai React/TypeScript. Dabartinės HTML pašto/Facebook konsolės ir Node turinio studija yra prijungiami esami moduliai. Galutinis hostingas, autentifikacijos teikėjas ir verslomatika.lt deployment dar nepriimti. Nauja frontend technologija šiuo planu neįvedama.

## Users

Savininkas kaip visų verslų direktorius. Vėliau deleguoti konkrečių verslų operatoriai, buhalteris ir atskirų klientų organizacijos. Tai būsimos rolės; dabartinis operatoriaus Bearer secret nėra individualių naudotojų sistema. Savininkas nurodė, kad kito PC agentas jau dirba su Verslomatika.lt ir bandys ją jungti prie šio core. Faktinis tos platformos kodas/stack šiame audite nebuvo pateiktas; integracija pritaikoma joje per bendrus kontraktus pagal [perdavimo instrukciją](INTEGRATION_HANDOFF.md).

## Product Purpose

Savininko tiesiogiai patvirtinta 2026-10-10: verslomatika.lt yra centrinė verslų valdymo ir automatizavimo platforma. Pasirinkus verslą matomi visi jo agentai, jų veikla, siunčiami laiškai, atsakymai, dokumentai ir rezultatai. Galima pasirinkti kiekvieną agentą ir su juo kalbėti kaip direktoriui, duoti užduotis, klausti, kaip sekasi, ir gauti faktais pagrįstas ataskaitas. Agentų tipų skaičius ateityje plečiamas, įskaitant apskaitos parengimą tikram buhalteriui.

## Operating Context

Savininkas sprendžia kryptį ir trūkstamus verslo faktus; kasdienį darbą agentai vykdo patvirtinto mandato ribose. Valdymo pokalbis yra atskiras nuo susirašinėjimo su klientais. Verslas/prekės ženklas, domenas, juridinis asmuo ir platformos kliento organizacija turi skirtingas tapatybes. Vienas juridinis asmuo gali turėti kelis verslus.

## Capabilities and Constraints

Patikrinta dalinė vietinė pašto, pokalbių, užduočių, dokumentų juodraščių ir kalibravimo realizacija. Pilnas klientų paieškos pipeline, agentų valdymo UI, direktoriaus chat ir apskaita nepriimti. Naujasis planas pateiktas [README](README.md); esamos būklės ribos [AUDIT](AUDIT.md).

Madbeauty būsimas paieškos pilotas apima visas grožio paslaugas; aktualus paslaugų registras ir aktyvaus teikėjo kriterijai tikrinami per jo backend. „Užsiregistravo“ ir „aktyvus teikėjas“ skirtingi įvykiai. Agentų ataskaitos negali jų sutapatinti.

## Brand Commitments

Savininko pasirinktas vardas ir domenas **Verslomatika.lt**. Lietuviška valdymo sąsaja. Domeno vardas nėra jo DNS, nuosavybės, veikiančio pašto ar deployment įrodymas. Patvirtinto naujos platformos logotipo ir galutinės vizualinės sistemos šiame audite nėra.

## Evidence on Hand

[Esamo kodo inventorius](AUDIT.md), [platformos vizija](../../business-development/VISION.md), [klientų paieškos planas](../acquisition-plan/README.md) ir uždaras Codex dialogų bandymas. Ankstesni testų ir SMTP rezultatai turi savo datas bei ribas; šiame planavimo etape jie neperpaleisti.

## Product Principles

- Vienas verslų core ir bendri kontraktai; agentai registruojami kaip versijuotos rolės.
- Pokalbis, užduotis, vykdymas ir patvirtintas rezultatas turi atsekamus ryšius.
- Ataskaitos remiasi aktualiais leistinais duomenimis ir rodo spragas.
- Kasdienis darbas automatizuojamas; savininkui lieka kryptis ir tikros išimtys.
- Apskaita tvarkoma juridinio asmens lygiu, verslai yra analitiniai pjūviai.

## Open Decisions

Prieš gyvą paleidimą reikės tikrų paskyrų/prieigų, hostingui tinkamo 24/7 CLI vykdymo, mandatų ir biudžetų. Apskaitai: juridinių asmenų/PVM profiliai, bankų duomenų kelias, buhalterio naudojama programa ir priimamas formatas. Planas šių faktų nesugalvoja; nuo jų nepriklausomi vietiniai etapai vykdomi pirmi.
