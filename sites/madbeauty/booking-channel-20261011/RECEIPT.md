# Vienas rezervavimo kalendorius — gyvas inkrementas

2026-10-11T08:39:35.673Z. **BOOKING_CHANNEL_LIVE_ACCEPTED** savo apimtyje. [Tikslus kvitas](RECEIPT.json), [planas](ROADMAP.md), [dizaino palyginimas](DESIGN_CHECK.md).

| Aplinka | Versija | Native / hosted |
| --- | --- | --- |
| Madbeauty | 87e6c536-aa20-4f9c-a052-62ab21f9526c | 100 / 100 |
| Bandymas | 283f9d36-88a3-44ba-87f0-dbf25e3e0f65 | 139 / 139 |

Runtime source 9dcd67cf1f5bd1500564b47ea6b4a2dbd8ce8f63; frozen129 e20c3b95 ir core566 išsaugoti. Main ir trial atskirai priimti tikslaus compiled artefakto testais; main rezervavimo testas apima URL, savininko teises, būsimo vizito/laikymo/laukiančiųjų apsaugas, išorinį atsisakymą, viešą projekciją, istoriją, SQLite perkrovimą ir perjungimo/laikymo lenktynę. Trial tikslus compiled bendruomenės testas išlaiko45 esamus profilius ir jų įrašus. Backend88 ir frontend28 regresijų PASS.

Actual IAB trial: demo-client-5@example.com prisijungė, sukūrė aiškiai sintetinį privatų saloną, patikrino privalomą nuorodą, išjungtą kalendorių, perkrovimą, grafiko patvirtinimo klaidą, grįžimą į native ir perjungimą atgal. Salonas nepatvirtintas ir nepaskelbtas; vieši40meistrų+5salonai nepakito po bandymo. Realus paštas ir išorinis vizitas nekurti. Main IAB patikrintas guest login vartas, ne tikro kliento registracija.

Savininkui: darbo vieta → Rezervavimas. Treatwell pasirinkimas priima viešą HTTPS Lietuvos salono URL ir išjungia mūsų laikus, registraciją bei grafiko redagavimą; Madbeauty pasirinkimas leidžia vietinį kalendorių. Būsimi vizitai, aktyvūs laikymai ir laukiančiųjų pageidavimai turi būti sutvarkyti prieš pakeitimą; istorija lieka. Tai nuorodos perdavimas, be Treatwell API ir laikų nuskaitymo.

Tikros vietinės naršyklės desktop/mobile peržiūra **ship**, dokumentuota atskirai; gyva trial peržiūra tikrina būtent save/create/reload kelią. Provider after patikros išlaiko duomenų namespace, secrets pavadinimus, paštą, content ir trialexpiry 2026-10-16T21:10:47.982Z; reviewer ir protected QA nekeisti. Main bendruomenė aktyvi, Facebook viešas prisijungimas išjungtas; savininko atidėtas Meta patvirtinimas ir grupės/events lieka už šio inkremento ribų.

Pradinis provider401 išspręstas įprastu Wrangler sesijos atnaujinimu. Shell buvo paruošęs vietinį kandidatą pagal pasenusį before, bet jo neįdiegė. Jis atskirtas kaip INVALID, ankstesnis compiled9e4 atkurtas su SHA sutapimu; naujas before ir build atlikti prieš visus native vartus bei deploy. Senų leidimų proofai nepervadinti. Grąžinimas iki šios funkcijos turi išlaikyti išorinio režimo serverio apsaugą, kitaip sena programa galėtų vėl leisti native vizitus.
