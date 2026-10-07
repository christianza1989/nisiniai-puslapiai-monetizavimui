# Pasiūlymų ir migracijos sutartis

Tas pats `siteId=madbeauty`, Node SQLite ir SQL Durable Object adapteriai. Vienas transakcinis writer; snapshot / private draft / approved projection yra skirtingos paskirtys tame pačiame autoritetingame modelyje. Nėra antro lygiaverčio kalendoriaus writer ar production copy.

`taxonomy` viešai grąžina aktyvius canonical ID, medį ir versiją. `selectProcedures` autorizuota organizacijos narystė, kelių treatment ID partija, expected revision ir idempotency raktas; sukuria privačius `offers` juodraščius, neįrašo sugalvotos kainos/trukmės. `saveOffer` expectedVersion ir tikri variantų duomenys; `submitOffer` patikrina pilnumą; `moderateOffer` tik operatorius ir konkreti pateikta revizija. Tik šis patvirtinimas materializuoja viešus variantus esamoje `services` lentelėje. Vienas variantas gali turėti kelis tinkamus darbuotojus su atskira kaina/trukme/resursu; katalogas nedubliuoja varianto kiekvienam darbuotojui.

Draft edit neištrina ankstesnio approved meniu. Version conflict409, cross-org403, unknown ID404, invalid schema400. Archyvas išsaugo IDs ir booking snapshots, sustabdo naujus laikus. Hold ir confirm serveris pakartotinai tikrina konkretų variantą/darbuotoją/resursus, paslauga/schedule versijas ir pilną intervalą; EUR integer cents, UTC instants, Europe/Vilnius business time.

Legacy `services` ir senos10kategorijos lieka skaitomos, plati kategorija nepervadinama į spėjamą leaf/gender. Provider turi patvirtinti konkretų priskyrimą. Naujo varianto paslaugos ID stabilus; ankstesni vizitai išlaiko ankstesnę kainą/pavadinimą. Prieš live activation isolated kopijoje tikrinami ID/count/snapshot invariants, concurrent booking ir restart, o rollback negali prarasti naujų vizitų.
