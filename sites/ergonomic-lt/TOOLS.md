# Administravimo apimties priemonės

Esamas verslas ir mokamas rezultatas nesikeičia: biuro baldų parinkimas ir pasiūlymo užklausa. Šis pavedimas prideda savininko modelių patvirtinimą, ne naują pardavimų ar rinkimo runtime.

- Cloudflare Workers/D1: esamas variklis, atskira workflow DB, CAS dokumentas ir auditas; privatus draft owner login, atskiras patvirtintų modelių host. Esama paskyra ir CLI, jokių papildomų mokamų prenumeratų pirkimo.
- Gemini App 4 Argon / low: savininko pasirinktas esamas naršyklės kanalas, originalus atsakymas ir jo provenance. API modelio atitikmuo neišgalvojamas, paskyros limitai lieka iš tikro UI. Tekstų užduotys gauna tą pačią prioritetų dokumento versiją. Laukianti eilė nėra teiginys, kad unattended Gemini procesas veikia.
- Core content-workflow editorialReview/pageReadiness: tiksli revizija, šeši peržiūros aspektai, business adapterio 3D/photo sąlygos, žmogaus Approve ir atskiras release. Jokio automatinio modelių patvirtinimo.
- Ne kėdžių ROADMAP/manifestai: tik vietinis read-only adapteris; Native sesijų ir šaltinių failų nerašo.
- Naujas SEO tyrimas, klientų paieška, pokalbių agentai ir pašto automatika nereikalingi šiam administravimo pavedimui. Esama užklausų sistema išsaugoma, klientams testų nesiunčiama.

Cloudflare Access API write teisės šioje jungtyje nepakankamos; alternatyva yra jau veikianti vieno savininko Ergonomic.lt serverio sesija su esamais Worker secrets. Nei hash, nei session secret į source neįrašomi. Papildomas Access galimas gavus atitinkamą paskyros teisę, bet saugumas neturi priklausyti vien nuo frontend.
