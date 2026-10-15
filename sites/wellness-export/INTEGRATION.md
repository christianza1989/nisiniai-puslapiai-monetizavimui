# Tyrimas turi pasiekti tikro svetainės kūrimo agentą

2026-10-15. Būsena: esamo kelio auditas ir realizuojamas siauras papildymas; ši byla dar nesukurta runtime. Root rengia verslo tyrimo dokumentus, esama pagalbinė sesija `01a13440` turi atskirą sourceContext failų langą nuo `d3d9c9f`. Veikiančių serverių ir dabartinių bylų ji nekeičia.

## Kas jau yra ir ko trūksta

UI pradeda Discovery iš portfolio ir žinutės. Esamas worker skaito jos HTTPS šaltinius su robots / viešo DNS / TLS ribomis, o actual `source_reads` saugomi konkretaus darbo usage. Patvirtinto tyrimo build veiksmas sukuria naują Creation, kuriai perduodamas patvirtintas planas. Sintetinė baldų byla lieka atskira.

Auditas nustatė dvi skirtingas ribas. Pirma, planas perduodamas, bet jo tikslaus darbo išsaugotos šaltinių ištraukos iki Creation konteksto ir native intake neperduodamos. Antra, gamintojo šaltinio tekstas nėra mūsų patvirtintas verslo faktas: dabartinis intake pagrįstai palieka `verifiedFacts`, kontaktus ir operatorių tuščius. SourceContext išspręs pirmą kilmės perdavimo spragą; antro faktų ir teisių priėmimo jis nepakeis.

## SourceContext failų langas

Helper realizuoja optional serverio bloką esamame `approved_build_context`, su atskiru context SHA. Šaltiniai paimami tik iš patvirtinto `Report.job_id` ir sutampančio savininko / Discovery / istorinio source / pavykusio darbo ryšio. Dabartinis report hash ir seni atsakymai nekeičiami. Nauja realaus reader darbo versijos žyma leidžia išlaikyti tikslų legacy praleidimą; sena istorija neperrašoma ir neatgaline data „pagerinama“.

Planuojamas blokas suriša Creation, Discovery, report redakciją / SHA, plano SHA, tikslaus tyrimo darbą, šaltinio Git versiją ir originalios `source_reads` struktūros SHA. Kiekviena ištrauka turi URL, datą, originalaus HTML ir teksto hash, bounded tekstą ir statusą; visi teiginiai `external_source_claims` / `UNVERIFIED`. Jokių browser pasirenkamų failų kelių ar prisijungimo duomenų.

Riba: iki 12 įrašų ir 64 KiB visam papildomam blokui, tik sveiki išsaugoti įrašai, aiški included / omitted / unavailable / remaining apimtis. Esamas reader trumpina tekstą iki 9 000 simbolių; būtina pažymėti ribą ir galimą nukirpimą. Reader `complete` neįrodo viso puslapio teksto, visų sąlygų ar pilno katalogo perskaitymo. Būtent kritines sąlygas į užklausą įtraukti tiesioginiais šaltiniais.

Tas pats nekintantis blokas turi pasiekti Creation worker / modelių kontekstą ir kanoninį native intake. Reikalaujamas Python / Node hash sutapimas, tiksli versija / identity, pakartojimo atpažinimas ir šaltinių drift patikra prieš bei po native įrašo. Trūkstamas / pašalintas pažymėtas kontekstas negali tyliai tapti legacy. Modelis nekuria šio kilmės bloko pats.

Sutarties ir testų detalės bus helper source / narrow rule / unique upgrade įraše, ne naujoje šio verslo programinėje sistemoje. Reikalaujami provider-free PG ir tikro Node bandymai, legacy suderinamumas, foreign / stale / malformed atmetimas, exact replay ir išsaugota istorija. Kol nėra konkretaus commito ir testų, jungties nevadinti veikiančia.

## Po kilmės perdavimo

1. Sukurti naują savininko Discovery su verslo tikslu, atrinktais kritiniais Maudis URL ir aiškiai nesutartomis partnerystės sąlygomis. Tiksli source versija ir naudojamas profilis išsaugomi įprastai. Gamintojo domenas yra įrodymo šaltinis, ne mūsų canonical host.
2. Patikrinti, kad tikro report šaltiniai ir jų ribos matomi kūrimo agentui, o ne tik šio repo Markdown. Priimti atskirą planą per esamą UI; negaminti approval kvito rankomis.
3. Prieš naują native intake aiškiai išspręsti mūsų operatoriaus / kontaktų ir patvirtintų faktų priėmimą esamomis sutartimis. Gamintojo kontaktų automatiškai nekopijuoti. Tiekėjo teiginį priskirti jo šaltiniui, ne mūsų garantijai.
4. Pirminiam pristatymui pakanka mažo gaminių šeimų / konkrečių modelių rinkinio. Dabartinis Creation renderer neturi atskiro `Page.type` įėjimo, nors native V2 turi product tipą. Tikrą produktų puslapių projekciją ir locale reikia atskirai suderinti esamame renderer / intake; nežinomų product URL negalima tyliai laikyti priimtu katalogu. Pilno SKU / likučių variklio šiame etape nereikia.
5. Nuotraukas importuoti kanoniškai su realiomis teisėmis ir gaminio ryšiu. Vėliau GUIDE, kopijos korekcijos, tikras redakcinis review, atominis approval / release ir Foundation naudoja esamą core. Viešumas, agentų source/profile admission, kalibravimas ir kanalai lieka atskiri realūs priėmimai.

## Keli gamintojai ir svetainės

Jungtis turi likti bendra: Maudis URL ar pavadinimas negali būti įkoduotas shared validacijoje, promptuose ar leidimų patikrose. Vienos svetainės kontekste galima turėti kelių gamintojų šaltinių, bet gaminio kilmė, komplektacija ir prieštaravimai turi išlikti atskiri. Vieno gamintojo kaina, garantija ar medijos leidimas negalioja kitam.

Kiekviena vėliau kuriama svetainė turi atskirą siteId / host / BUSINESS / faktų ir medijos priėmimą. Bendri komponentai, šaltinių validatorius ir darbo eiga naudojami pakartotinai; jokio bendro visų klientų pokalbių ar slapto kryžminio faktų sujungimo. Nauja svetainė kuriama dėl pagrįstai skirtingo pasiūlymo / rinkos ir tikros paklausos, su savo matavimu; keli vienodo pasiūlymo perrašymai nelaikomi verslo išplėtimo įrodymu.
