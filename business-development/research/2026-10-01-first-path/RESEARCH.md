# Pirmas Verslomatikos mokamo rezultato bandymas

2026-10-01, heartbeat 14:00 UTC. Tyrimo klausimas: kuris savininko jau pasirinktas įėjimo kelias leidžia pigiausiai patikrinti konkretų mokamą rezultatą, kol kuriamas platesnis autonominis core? Registras: [BDEV-0003](../../ideas/BDEV-0003.md). Naujo ID nekuriame: tai esamos turimo verslo audito krypties konkretinimas. Siūlomo bandymo statusas **proposed**, savininko patvirtinimo nėra.

## Sprendimas ir pagrindas

Siūlome vieno proceso automatizavimo planą mažai paslaugų įmonei: **užklausa → trūkstamų duomenų patikslinimas → pasiūlymo juodraštis**. Domenas padeda suprasti viešą pasiūlymą; mokamas rezultatas remiasi kliento pateikta darbo eiga ir nuasmenintais pavyzdžiais. Klientas gauna įgyvendinimui tinkamą planą, taisykles, trūkstamas priklausomybes ir priėmimo scenarijus. Nuosavo agentų core atsiradimas nėra būtina vien diagnostikos sąlyga. Pilnas autonominis pardavimas / įdiegimas lieka vėlesnis darbas pagal faktinį mandatą ir patikras.

Pirkėjas — paslaugų įmonės sprendimų priėmėjas, reguliariai gaunantis panašias užklausas ir pats ruošiantis pasiūlymus. Signalas — gali parodyti tikrą kartojamą procesą, pavyzdžius ir jo darbo apimtį. Mūsų patikrinto tokio pirkėjo ar jo mokėjimo kol kas nėra. Konkurentų viešos paslaugos yra pasiūlos / kainodaros įrodymai, ne mūsų paklausa ar jų atliktų sandorių patikra.

## Pirminiai šaltiniai, peržiūrėti 2026-10-01

| Šaltinis | Matytas pasiūlymas / taisyklė | Reikšmė sprendimui |
|---|---|---|
| [I will](https://iwill.lt/) | Procesų auditas 0–300 €. Nemokamo varianto sąlyga — automatizavimo užsakymas ir sėkmės istorijos viešinimo leidimas. | Yra vietinis mažesnės kainos / sąlyginai nemokamas pakaitalas. |
| [Oktoja](https://oktoja.lt/sprendimai/procesu-auditas/) | 1–2 procesų mini auditas nuo 900 €; aprašytas savarankiškai panaudojamas planas. Puslapio kainodara pažymėta be PVM. | Mokamas atskiras audito rezultatas egzistuoja LT pasiūloje; platesnė apimtis nėra tiesioginis mūsų kainos etalonas. |
| [Retos galimybės](https://retos.lt/ai-auditas/) | Nemokamas sričių / komandos dydžio vertinimo įrankis ir konsultacija; skaičiai orientaciniai. | Bendrų AI galimybių sąrašas turi nemokamą alternatyvą. Formos neveikėme. |
| [Running Start Digital](https://runningstart.digital/ai-services/workflow-audit) | 500 USD auditas, darbo eigos aprašas ir pirmo projekto pasiūlymas; mokestis gali būti įskaitomas į įgyvendinimą. | Užsienio atskiro mokamo rezultato modelis; USD nekonvertuojame. |
| [Samer Hany](https://samerhany.com/process-audit-blueprint) | 3 000 USD vieno apibrėžto proceso analizė ir įgyvendinimo planas, liekantis klientui. | Siaura apimtis gali turėti savarankišką vertę; jo kaina ir klientų segmentas mums neperkeliami. |
| [Flippa](https://support.flippa.com/hc/en-us/articles/360000217435-Making-potential-revenue-claims-on-sites-without-revenue) | Pajamų neturinčio turto pardavimas galimas su įrodymų / potencialo atskyrimu; starter svetainėms nurodomas užsakymo funkcionalumas. | Phase 1 užklausų puslapio negalima automatiškai laikyti tinkamu starter verslu šiam kanalui. Straipsnis senas, bet šiandien viešai pasiekiamas; prieš skelbimą reikės aktualios kategorijos patikros. |
| [Acquire](https://help.acquire.com/what-pre-revenue-businesses-are-allowed) | Be pajamų priimami funkciniai, perleidžiami ir konkretūs SaaS / AI produktai; kitų įvardytų verslų tipams reikia pajamų. | Paprastas pirmos fazės turinio / paslaugų puslapis nėra pagrįstas šio kanalo pardavimo planas. |

Acquire paieškoje rastas [senesnis FAQ](https://help.acquire.com/frequently-asked-questions-1) nevienodai apibūdina pre-revenue priėmimą. Lentelė remiasi išsamia konkrečios temos dabartine instrukcija; realios mūsų turto priėmimo patikros nėra. Flippa / Acquire išvados taikomos jų kanalams, ne draudimui savininkui parduoti mūsų svetainėje ar užsakyti kuriamą verslą.

## Esama bazė ir deduplikavimas

Perskaityti aktualūs registro sprendimai, [WORKSTREAMS](../../../WORKSTREAMS.md), [PROJECT_STATUS](../../../PROJECT_STATUS.md), [core ROADMAP](../../../agent-business-core/ROADMAP.md), [greitossvetaines briefas](../../../sites/greitossvetaines.md) ir viešo core domenų registras. Briefas rodo paslaugų užklausų kryptį, bet nėra mokamo automatizavimo audito patikra. `sites/verslomatika/BUSINESS.md` nerastas; viešame tikrintame `config/niche-network.json` nėra verslomatika įrašo. Tai šių failų stebėjimas, ne domeno nuosavybės / interneto būsena. Runtime / kitų nišų failai nekeisti.

Core M5–M6–M9 jau numato įrankius, apskaitą ir perleidimą. Jų neteikiame kaip naujos idėjos. BDEV-0002 yra kitas konkretus mokamas rezultatas — vienos Excel ataskaitos įgyvendinimas — ir nebuvo patvirtintas. BDEV-0003 bandymas tiria pirmą išorinio kliento kelią į Verslomatiką ir pasiūlymų rengimo procesą.

## Alternatyvos ir prieštaraujantys įrodymai

1. Bendras nemokamas domeno / nišos galimybių vertinimas: tinkamas atrankai, tačiau vien jo mokamos vertės pagrindas silpnas dėl nemokamų pakaitalų ir neviešų procesų trūkumo.
2. Nemokama diagnostika ir mokamas įgyvendinimas: realus konkurentų modelis, geresnis jei klientas jau žino ką kurti; mums dar nepatikrintos įgyvendinimo sąnaudos / pajėgumas. Jei pilotiniai klientai nori tik veikiančio rezultato, keisti pasiūlymą šia kryptimi.
3. Paruoštų verslų pardavimo pirmumas: sutampa su savininko vizija, tačiau reikia konkretaus turto, veikimo / perleidimo įrodymų ir pirkėjų. Išoriniai kanalai priima ne visus pirmos fazės tipus. Tai lygiagretus portfelio etapas, ne atsisakymas jo.
4. Nieko naujo nediegti, tęsti core ir nišų darbus: mažiausios naujos sąnaudos; šiuo atveju išorinio kliento mokamo rezultato hipotezė lieka nepatikrinta.

Vien mažesnė kaina ar AI naudojimas nėra įrodytas pranašumas. Klientas gali nemokamai konsultuotis arba būti nepajėgus pateikti naudingo pavyzdžio. Mūsų planas turi būti tiek konkretus, kad jo taisykles ir priėmimą suprastų kitas vykdytojas. Prognozuojamas laiko sutaupymas nėra automatinis pinigų sutaupymas: tai gali būti tik laisvas pajėgumas. Ekonomiką bei atsisakymo priežastis tikrina [konkretus pilotas](PILOT.md).

## Nežinomybės, kaštai ir pakeitimo kriterijai

Nežinoma mūsų paklausa, tinkamo pirkėjo pasiekimo kaina, realus parengimo laikas, modelio naudojimo sąnaudos, klientų sistemų prieigos / licencijos ir kiek mokamas planas padeda įgyvendinimui. Pirmo mėginio nereikia grįsti mokamomis prenumeratomis, reklama ar 50 domenų pirkimu. Esamų išteklių naudojimas nėra nulinė savikaina. [Pilote](PILOT.md) pateikti tik hipotetiniai 299 € / 30 €/h / 15 € skaičiai ir stabdymo sąlygos; kainynas nepatvirtintas.

Sprendimą pakeistų faktinės darbo sąnaudos, naudingumo vertinimas, aiškus noras mokėti arba pakartotinis atsisakymas dėl rezultato tipo. Techninio prototipo sėkmė atskira nuo realaus mokėjimo. Tyrimas užbaigtas; pilotas neįgyvendintas, siuntimas / viešas puslapis / apmokėjimai neįjungti.
