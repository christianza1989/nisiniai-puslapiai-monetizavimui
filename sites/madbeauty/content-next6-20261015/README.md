# Madbeauty: kita šešių gidų partija

Pradinė būsena: 131 iš 295 gidų realiai įkeltas. Šios partijos tekstai dar neparašyti ir neįkelti. Ankstesnis 135 puslapių paketas `86c7595036970f905cec196d9090d712bfa11c113f09e4cd645c25611ed47509` tikrame domene išlikęs. Visos ankstesnės revizijos ir publikavimo datos turi išlikti.

Šio vykdymo darbo kopija pradėta nuo tinklo main `808581d919d06cb4a2d151cc7f9ec1be1782aba2`, companion main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; canonical freshness start PASS. Senos darbo kopijos ir tenant nekeisti.

Nustatyta bendra kliūtis: main `content-studio/src/generator.mjs` dar neturi native V2 kelio, privalomo Luna/xhigh vykdymo ir pilno brief perdavimo. Ankstesnis tikras rengimas naudojo nesujungto PR10 `8ce36cf7` realizaciją. Šiame worktree suderinamos tik reikalingos jos dalys, išsaugant dabartinį stable siteId ir domeno migracijos kodą. Tai nėra leidimas vykdyti pasenusį dirty checkout ar perrašyti istorinius fingerprint.

Rezervacija: `content-studio/src/{generator,model,content-schedule,draft-v2,editorial-cli}.mjs`, native V2 draft schema, jų dabartiniai testai, draft/brief/revision CLI, `docs/STUDIO_V2_DRAFTING.md`, atskiras core upgrade įrašas ir šios partijos katalogas. `scripts/core-upgrade-check.mjs` main taip pat nėra; jeigu reikalaujama perdavimo patikra neturi kanoninio atitikmens, bus pridėtas ribotas žurnalo/commit padengimo tikrintuvas. Public rendereris/schema, kitos nišos, Facebook ir klientų agentų šakos nekeičiamos. Gyvo Worker naujinimas tik pagal atskirą aktualios bazės ir lease patikrą.
