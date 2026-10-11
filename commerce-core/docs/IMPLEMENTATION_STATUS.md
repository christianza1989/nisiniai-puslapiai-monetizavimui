# Aktualus pavedimas ir būsena
2026-10-11. Savininkas šiame pokalbyje užsakė pilną bendro prekybos modulio planą, roadmap ir pradėti įgyvendinimą pagal core taisykles. Ankstesnis tik tyrimo etapas pakeistas. Svetainė kuriama po modulio; nuotraukos bus pateiktos vėliau; klientų aptarnavimo ir partnerių paieškos agentai — po svetainės.

Režimas: veikiantis vietinis modulio pagrindas su D1/Workers suderinamumo bandymu, ne production parduotuvė. Pirma dabartinė apimtis: rinkos/katalogas, kainos, rezervacijos, užsakymai, Stripe adapteris, siuntų adapterio sutartis, grąžinimų ir apskaitos įvykių pagrindas, privataus API sąsaja, idempotency, outbox ir dviejų parduotuvių izoliacija.

Source bazė: 7af6b9641012a30c5f95eac38a66daeff8f8cb39, branch codex/commerce-core-20261011. Savininkas /root valdo commerce-core/**, sites/memocasting/**, savo WORKSTREAMS įrašą ir upgrade žurnalą. [GitHub rezervacija](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/95).

Pradinė būsena: planas parengiamas prieš kodą. Priėmimo įrodymai ir tikri likę darbai atnaujinami docs/ACCEPTANCE.md. Vietinis testas negali automatiškai suteikti production admission.

Gyvos operacijos: išjungtos. Mokėjimo paskyros/vežėjo prieigos/saugos/PVM/pakuočių sprendimai lieka konkretūs vėlesnio prijungimo vartai. Agentai nekurti; jų įrankių sutartis numatyta iš anksto.

