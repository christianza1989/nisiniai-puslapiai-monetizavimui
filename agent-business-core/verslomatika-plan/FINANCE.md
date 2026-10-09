# Apskaitos agentai ir buhalteriui paruoštas paketas

2026-10-10. **PLANNED.** Dabartinis [invoicing.py](../runtime/src/pinet_core/invoicing.py) yra deterministinis juodraštis, neturintis tikro numerio ir `issued=False`. Naujo tikslo negalime laikyti įgyvendintu vien dėl PDF generavimo. Siekiamas rezultatas — kuo daugiau sutikrinto ir techniškai paruošto darbo, kad tikram buhalteriui liktų konkretūs neaiškūs klausimai, profesionalus priėmimas ir jo atsakomybės darbai.

## 1. Organizacija pagal juridinį asmenį

Vienas **apskaitos koordinatorius kiekvienam juridiniam asmeniui**, su atskiru ledger/import/period scope. Jis mato jam teisėtai priskirtų verslų dokumentus ir analitiką. Penki MB Pinet verslai gali sudaryti vieną įmonės paketą su penkiais verslo pjūviais. Kitos įmonės dokumentai/likučiai neįmaišomi. Koordinatoriaus servisą galima pernaudoti, agento scope išlieka atskiras.

| Rolė | Darbas | Patikrinamas rezultatas |
| --- | --- | --- |
| Dokumentų agentas | Surenka originalus iš leidžiamų kanalų, gauna trūkstamus, išskiria duomenis | Originalas/hash, field provenance, dublikatų klasifikacija, trūkstamų sąrašas |
| Sąskaitų agentas | Iš patvirtinto sandorio paruošia dokumentą; išrašymas tik su patikrintu issuer/rules/numbering adapteriu | Dokumento tipas, snapshot, numeravimo/issued/send receipt kai tokia funkcija priimta |
| Sutikrinimo agentas | Susieja dokumentus su banko/mokėjimų/payout duomenimis | Tikslus match, partial balance, fees/refunds, neaiškios išimtys |
| Apskaitos parengimo agentas | Pagal buhalterio priimtą politiką siūlo kategorijas ir įrašus, tikrina pilnumą | Versioned proposed entries, taikytų taisyklių ir originalų nuorodos |
| Apskaitos koordinatorius | Diriguoja šiems darbams, tikrina periodą, pateikia report, surenka eksportą ir seka korekcijas | Sutikrintas period snapshot, accountant-ready paketas ir atviros išimtys |

Tai registry roles; pradžioje viena instance gali atlikti kelių rolių siaurus darbus. Papildomas LLM agentas kuriamas pagal matuojamą darbo poreikį, ne vien dėl gražios struktūros. Pagrindinę finansinę būseną keičia vienas programinis apskaitos servisas su transakcijomis/lease, o ne penki nepriklausomi agentų JSON ledger failai.

## 2. Parengimo kelias

```mermaid
flowchart LR
    O[Originalai ir tikri sandoriai] --> I[Patvarus importas / hash / dedup]
    I --> E[Duomenų išskyrimas su kilme]
    E --> V[Šalys / sumos / juridinis asmuo / taisyklės]
    V --> M[Mokėjimų ir dokumentų sutikrinimas]
    M --> P[Siūlomi įrašai ir išimčių sprendimas]
    P --> C[Laikotarpio pilnumo / kontrolės patikra]
    C --> B[Nekintamas buhalterio paketas]
    B --> A[Buhalterio priėmimas / korekcijos]
    A --> R[Registruotas priimtas rezultatas]
```

Originalas ir extracted fields skirtingi objektai. OCR/model confidence yra tik nuskaitymo signalas. Kiekviena reikšmė turi dokumento/puslapio/lauko nuorodą, extraction versiją ir validation state. Blogai perskaitytas IBAN ar data neužpildomi tikimybe. Užkrėstą/nepalaikomą failą adapteris izoliuoja; saugus preview neduoda script/shell teisių.

Importas deduplikuoja provider ID ir originalo hash. To paties invoice perskenavimas kitu failu tikrinamas pagal issuer+series+number+date+currency/amount; panašumas nepaverčiamas aklu delete. Korekcija arba credit note yra naujas susietas dokumentas, ne „dublikatas“. Priskyrus neteisingą įmonę kuriama korekcija ir audit, neištrinamas ankstesnis receipt.

Sumos fiksuoto tikslumo Decimal/mažiausiais valiutos vienetais, aiški currency ir versijuotas rounding. PVM/net/gross taisyklės tik iš patvirtinto konkretaus juridinio asmens profilio pagal galiojimo datą. Nežinomas PVM/SVS statusas yra kliūtis atitinkamam veiksmui; agentas nepasirenka 21 % ar ne-PVM vien iš seno fixture. Valiutos kursui saugomas šaltinis/data ir patvirtinta politika.

## 3. Dokumento ir sąskaitos gyvavimo ciklas

Statusų ašys atskirai:

- Dokumentas: imported → parsed → validated arba needs_source/needs_review.
- Parengimas: draft → prepared → issued tik gavus tinkamo issuing serviso kvitą; taisymas/credit/void pagal priimtą taisyklę ir naują dokumentą.
- Kanalas: unsent/prepared/provider_accepted/delivery_unknown/delivered, pagal realiai prieinamus kvitus.
- Atsiskaitymas: unpaid/partially_paid/paid/overpaid/refunded/disputed, pagal patikrintas payment allocations.
- Apskaita: unprepared/proposed/accepted/exported/import_confirmed/period_locked, pagal konkretaus serviso ir buhalterio priėmimo ribas.

Issued nėra paid; PDF nėra issued; exported nėra import_confirmed. Invoice serial/number unikalūs juridinio asmens/profile riboje ir gaunami atominiu būdu. Prieš oficialų išrašymą reikia patvirtinto pardavėjo/komercinio vaidmens, sandorio, rekvizitų, taisyklių ir adapterio. Išrašyto snapshot nesikeičia pakeitus verslo adresą ar modelio instrukciją.

Jeigu pagrindinė apskaitos programa išrašo sąskaitas, ji lieka numeravimo/ledger source of truth. Core saugo jos IDs ir kvitus, nedaro antro konkuruojančio numeravimo. Neaiškus issuance timeout išlaiko unknown ir ieško to paties invoice prieš bandant dar kartą. Pirmas finansų etapas dar gali būti juodraščių/eksportų parengimas iki issuing adapterio priėmimo.

## 4. Sutikrinimas ir įrašų kontrolė

Banko/mokėjimų importas turi account/statement period, pradžios/pabaigos balansą, source ID/checkpoint ir aprėptį. Neprijungtas bankas nerodo „viskas sutikrinta“. Banko ir PSP įvykiai susiejami, kad vienas mokėjimas nebūtų įskaičiuotas du kartus.

Match gali būti 1:1, 1:n ir n:1. Daliniai mokėjimai, avansai, overpayment, credit/refund, provider fee ir net payout turi atskiras allocations. Paslaugos pardavimo gross, platformos komisinis ir payout nėra trys savarankiškos pajamos. Madbeauty komercinis vaidmuo/payments faktai dar tikrinami; teikėjo apyvarta nepriskiriama mūsų įmonei automatiškai.

LLM siūlo kategorizavimą ir paaiškina išimtį. Priimti įrašai tikrinami deterministiškai, taikant accountant-approved policy: debit=credit kai naudojamas dvejybinis modelis, dokumento/valiutos sumų ryšys, unikalūs source IDs, period locks ir reconciliation constraints. Pirminis etapas saugo proposed entries bei buhalterio programos importo ryšį; nereikia statyti pilno ERP visiems galimiems mokesčių režimams.

Leistinų pasikartojančių operacijų taisyklės gali automatizuoti parengimą ir įkėlimą per priimtą adapterį. Neaiški operacija lieka exception su pasiūlymu ir įrodymais, o ne „patvirtinta“ vien agentui parašius taip. Laikotarpį užrakinus naujas dokumentas/effect neperrašo priimto snapshot; korekcija remiasi buhalterio priimtu procesu.

## 5. Išimtys ir veikimas savarankiškai

Trūkstamas dokumentas → agentas patikrina leistiną kanalą/šaltinį ir paprašo dokumento tik su suteiktu komunikacijos mandatu → susieja gavimą → pakartoja validation. Numerio/datos/sumos neatitikimas → palygina originalus ir pasiūlo tikslų pataisymą. Nepasiekiama paskyra arba neviešas savininko faktas → viena sujungta owner_need su jau atliktais veiksmais.

Vėluojantis banko feed sukuria partial period; modelis negali „uždaryti“ jo optimistiškai. Užrakinto periodo, mokestinės kvalifikacijos ar specifinio buhalterio sprendimo išimtis perduodama buhalteriui su šaltiniais ir konkrečiu klausimu. Žmogui nereikia rankiniu būdu peržiūrėti visų normalių agento techninių retry.

## 6. Buhalterio paketo sutartis

Nekintamas `AccountingExportBatch`: legal_entity, period/timezone, scope/business allocation refs, revision, generated_at/data_as_of, coverage, policy versions, snapshot hash, original document hashes, source checkpoints, totals, exceptions ir adapter format/version. Nauja korekcija sukuria naują paketo versiją, susietą su ankstesne.

Paketo turinys:

1. Trumpa laikotarpio suvestinė ir completeness; kokie duomenys sutikrinti, ko trūksta.
2. Originalūs dokumentai saugiame archyve su manifest/SHA ir dokumentų registru.
3. Pardavimo/pirkimo įrašai, payments/matches, partial/unpaid likučiai, credits/refunds/fees ir verslų allocation.
4. Siūlomi arba adapterio patvirtinti apskaitos įrašai, aiški jų būsena ir taisyklių šaltiniai.
5. Neatitikimų sąrašas su konkrečiu klausimu, įrodymais ir jau atliktais agento veiksmais.
6. Buhalterio programai priimtas eksportas ir import validation report; bazinis neutralus CSV/JSON + originalai + skaitoma suvestinė neįrodo konkrečios programos importo.
7. Korekcijų, ankstesnių paketų ir buhalterio atsakymų istorija.

Parengti paketą galima autonomiškai. Perduoti tikram buhalteriui automatizuotai galima tik prijungus tikrą leistiną gavėją/kanalą ir siuntimo mandatą; šiame planavimo etape niekam nesiunčiame. Siuntimas, gavimas ir buhalterio priėmimas skirtingi kvitai. Atsakymų adapteris korekcijas priskiria batch/dokumentui; neturi perrašyti priimto originalo.

Priėmimą atlieka tikras buhalteris su jo programa: eksportas importuojamas be pakartotinio rankinio suvedimo, totals sutampa, originalai pasiekiami, dublikatai neįkeliami, atviros išimtys aiškios. Matuojame jo pataisymų skaičių ir sugaištą laiką prieš/po, automatiškai sutikrintų dokumentų dalį ir klaidas; „jam liks minimaliai darbo“ yra siekiamas išmatuojamas rezultatas, ne jau garantuotas faktas.

## 7. Leidimai, saugojimas ir platesnė apskaita

Dokumentų kategorijoms — versioned retention/access/delete/legal-hold politika, šifruota privati saugykla ir backup/restore. Tikras teisines pareigas atitinkantis terminas nustatomas pagal jurisdikciją/subjektą/dokumentų rūšį; šis planas nesugalvoja universalaus termino. Trumpalaikiai pasirašyti download URL nepakeičia naujos serverinės permission patikros. Banko prisijungimai neįdedami į modelio kontekstą.

Pirma apimtis: prekybos/paslaugų dokumentai, banko/PSP sutikrinimas ir buhalterio paketas. Turto apskaita/nusidėvėjimas, atsargos, darbo užmokestis, komandiruotės, užsienio operacijos ar kiti konkretūs režimai pridedami kaip kalibruoti procesai ir atskiros priimtos politikos. Koordinatorius rodo, ko trūksta visai įmonės apskaitai; nevadina ribotos apimties „pilna buhalterija“.

Mokėjimų vykdymas, deklaracijų pateikimas ir oficialių ataskaitų tvirtinimas lieka atskiros capabilities su atskiru tikru mandatu ir priėmimu. Buhalterio funkcijos nėra vien prompt, o išrašymo/deklaravimo teisės neatsiranda automatiškai davus dokumentų skaitymo prieigą.

## 8. Oficialūs šaltiniai ir jų ribos

2026-10-10 peržiūrėti pirminiai HTML šaltiniai. VMI i.SAF puslapis aprašo PVM sąskaitų registrus, duomenų teikimą, e. sąskaitų ir sutikrinimo paslaugas; tai įrankių šeima, kurios konkretus taikymas nustatomas pagal realų subjektą. Plano išvada: vien i.SAF duomenų nepakanka šio plataus originalų, banko, likučių ir buhalterio priimto paketo tikslui. [VMI i.SAF](https://www.vmi.lt/evmi/i.saf)

AVNT apskaitos skiltyje nurodomos apskaitos standartų, vidaus kontrolės, paslaugų organizavimo ir dokumentų/perdavimo rekomendacijos. Tai pagrindas prieš konkretų finansų įgyvendinimą patikrinti taisykles kartu su buhalteriu; šio audito metu konkreti MB Pinet apskaitos politika nenustatyta. [AVNT apskaita](https://avnt.lrv.lt/lt/veiklos-sritys/apskaita-1/)

Prieš i.SAF/EDS ar konkrečios programos adapterį būtina patikrinti aktualią oficialią schemą/teises, juridinio asmens statusą, formatą ir gavėjo mandatą. Šaltinio atvėrimas nėra to adapterio API, VMI paskyros ar realaus deklaravimo bandymas.
