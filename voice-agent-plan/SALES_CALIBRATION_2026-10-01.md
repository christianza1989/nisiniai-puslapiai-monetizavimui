# Laisvas aptarnavimas, instrukcijų tobulinimas ir tikras pašto bandymas

2026-10-01. Įgyvendinimas: `../agent-business-core/runtime/`. Viešo svetainių rendererio, kitų nišų turinio, DNS ir production konfigūracijos šiame etape nekeista.

## Ką agentas gali pasirinkti pats

Modelis laisvai pasirenka klausimus, toną, paaiškinimus ir laiško tekstą pagal konkretų klientą. Pokalbis nėra fiksuota klausimų seka. Bendras `common.md` jungiamas su rolės ir konkrečios nišos failais per `agent_instructions.compose`; saugomi fragmentų SHA-256, visas promptas ir pokalbio versija. Dabar yra traktorių ir greitų svetainių profiliai. Tiekėjo, kliento, kokybės ir pašto rolės turi atskiras instrukcijas; kiekvieno verslo dalykiniai faktai atskiri.

Kainas, leidimus ir įvykusių veiksmų įrodymus tikrina serveris. Modelio teiginys apie išsiųstą laišką, atliktą paiešką, mokėjimą ar pardavimą negali pakeisti kvito. Laisvė bendrauti nesukuria išgalvotų likučių ar pažadų. Kompetenciją geriname stebimais rezultatais, o ne pažadu, kad modelis jaus piniginę premiją.

## Automatinis skills tobulinimas

`adaptive_instructions.py` palygina baseline ir candidate tų pačių šešių scenarijų faktinius rezultatus. Mažiausiai trys scenarijai atskirti holdout. Leidžiamos nedidelės bendravimo pataisos; negalima keisti teisių, kainodaros ar faktų. Kandidatas turi parodyti pagerėjimą be regresijos. Praėjęs vartus gali būti automatiškai aktyvuotas vietinėms naujoms sesijoms; manifestas išlaiko istoriją ir rollback. Esami pokalbiai lieka prie savo snapshot.

Šio bandymo baseline ir candidate surinko 6/6. Kandidatas **atmestas** su `no_demonstrated_improvement`; niekas neaktyvuota. Tai veikiantys vietinio palyginimo ir grąžinimo mechanizmai, bet dar ne įrodyta nuolatinė produkcinė savioptimizacija. Audio, žmogaus ir vertintojo sutapimas, nepriklausomos regresijos bei gyvas canary lieka UNVERIFIED. Vertintojas yra atskiras CLI kvietimas, tačiau tas pats modelio tiekėjas.

Metodika remiasi [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices): konkrečių užduočių scenarijai, klaidų žurnalai, holdout, nuolatinės regresijos ir žmogaus vertinimo suderinimas. Šeši ištaisyti scenarijai negarantuoja visų būsimų klientų aptarnavimo.

## Mėnesio ir metų AI darbuotojas

`employee_scores.py` apskaičiuoja mėnesio/metų lentelę iš įrodymų: tikslumas 45 %, pažadų įvykdymas 30 %, stebėtas kliento vertinimas 25 %. Trūkstamas įvertinimas neįrašomas kaip teigiamas. Patvirtinti mokami sandoriai ir pelno indėlis saugomi atskirai; savęs deklaruoti ir sintetiniai pardavimai netampa pajamomis. Kritinis pažeidimas ar nuostolingas užsakymas diskvalifikuoja. Esant mažiau nei penkiems atvejams rezultatas preliminarus. Tai realizuotas skaičiavimo modulis, dar ne baigta GUI, tikro mokėjimo/CSAT integracija ar išrinktas tikras laimėtojas.

## Šeši klientai ir kontaktų tools

Užfiksuotas `evals/clients-adaptive-v2.json`: ūkininkas su aiškiu matmeniu ir dviem kontaktais; nežinomas žymėjimas/foto; pataisytas matmuo bei skuba; 4WD suderinamumas; tik telefonas; bandymas primesti administratoriaus ir premijų instrukcijas. Contact popup ir įvedimas atliekami tiek pokalbio metu, tiek po jo. Phone-only atveju nėra išgalvoto el. pašto ar siunčiamo laiško. Pokalbio modeliui neperduotas lab/synthetic flagas; administracinis scope lieka viduje.

Baseline: `../agent-business-core/runtime/artifacts/client-lab/b98d3bf7-2cf0-4cdf-9e3a-1a3399e5c063/round-1/report.json`.

Candidate: `../agent-business-core/runtime/artifacts/client-lab/c1f1b574-1aab-4f24-bafe-c00895f343e8/round-1/report.json`; priėmimo sprendimas to paties katalogo `adoption-decision.json`. Trijų training atvejų pagrindu siūlytas aiškesnis poreikio užklausos patvirtinimas; likę trys holdout. Candidate pilnas pakartojimas sunaudojo 35 CLI kvietimus.

## Tikras pašto kelias iki PDF

Vienas case `4c45ca57-a0b8-4daf-943f-d499f470de6c`, gija „Jūsų pasiūlymas · 4C45CA57“. info@pinet.lt → mrchristian90210@gmail.com; root kaip klientas atsakė per savininko Chrome. Ankstesnė pheng paskyra nenaudota siuntimui.

1. Du variantai su mūsų antkainiu; GTK pradžioje 671,66 EUR/vnt., 2 vnt. 1 343,32 EUR.
2. Gavus 660 EUR/vnt. biudžetą, serveris pritaikė leistiną pakopą: 654,14 EUR/vnt., 1 308,28 EUR. Viešoji savikaina tik viduje; klientui tiekėjų nuorodų nėra.
3. Gavus 600 EUR/vnt. biudžetą, papildoma nuolaida nepadaroma žemiau grindų. Laiškas laisvai paaiškina ribą ir teiraujasi apie tolesnį pasirinkimą. Tiekėjo paieška nebuvo atlikta ir taip nepristatoma.
4. Klientas tiksliai patvirtino V1, kiekį, sumą ir pirkėją. Bounded worker **pats** importavo atsakymą per IMAP, interpretavo, sugeneravo profesionalų PDF ir išsiuntė toje pačioje gijoje. Gmail gavimas bei PDF priedas patikrinti UI.

4 priimti outbound ir 3 tikri inbound to paties case įrašai. PDF: PF-20261001-B81224A6, laikina MB Memocasting non-VAT pagal savininko paskutinį nurodymą, 1 308,28 EUR. Tai **išankstinė sąskaita**, be fiskalinio išrašymo, tikro užsakymo ar mokėjimo. Kliento vaizde nėra TEST ar sintetinių žymų; vidinis scope užkerta kelią siųsti kitiems adresatams.

Įrodymai: `../agent-business-core/runtime/artifacts/sales-lab/receipt.json`, `qa.json`, `gmail-invoice-received.png`, `invoice-review.png`, `4c45ca57-a0b8-4daf-943f-d499f470de6c.pdf`. PDF vienas puslapis peržiūrėtas Poppler rasterizacija; scoped HTTP priedas tikrinamas atskirai nuo Gmail gavimo.

## Intervencijos ir nepaslėptos klaidos

Pirmas naujo contact-during lab bandymas sustojo dėl driverio job eiliškumo prielaidos: followup eilėje atsirado prieš analysis. Driveris taisytas aiškiai claiminant analysis/quality/followup; nesėkmė palikta žurnale. Candidate antras round sustojo ties CLI 100 s timeout; pilnas pakartojimas atliktas su 180 s riba, ankstesnis dalinis rezultatas nevadinamas užbaigtu.

Derybų laiške faktų vertintojas iš pradžių atmetė AI tapatybės sakinį dėl neperduotų runtime faktų. Pridėti tikri capability/identity faktai ir vienas patikros/taisymo bandymas. Root sukeltas eilutės sujungimo TypeError aptiktas testuose ir ištaisytas. Mutable JSON alias neleido patvariai pakeisti pending mail ID; siuntimo vartai teisingai blokavo tą draftą. Pataisyta deepcopy ir pridėta regresija. Tik savo neįvykdytas draftas po hash patikros sutaisytas vieną kartą; tai root intervencija, ne autonominė sėkmė. Kliento galutinio patvirtinimo → PDF kelias po pataisų vyko be rankinio per-case vykdymo.

Pilnas runtime suite: **135 PASS** (427,91 s). Po paskutinės JSON alias pataisos: **18 susijusių PASS** (29,39 s); skaičiai nesumuojami. Ruff PASS. Tests SMTP/provider mockinti; tikras savininko pašto gavimas įrodytas atskirai.

## Likusios ribos

Priminimas suplanuojamas po SMTP accepted + 24 h, daugiausia vienas šio case, atsakymas/atsisakymas jį atšaukia. Virtualaus laiko testai praėjo; tikros paros laukimas ir bounce/OOO dar neįrodyti. Worker šio bandymo metu ribotas 30 min. ir 30 CLI kvietimų; tai ne 24/7 deployment. Kitos nišos nepaveldi traktorių kainodaros ar laikino issuer.

Tikras Gemini lietuviškas garsas, M0, tiekėjų paieška/derybos, patvirtintas landed-cost, apskaita/mokėjimai, global suppression, viso inbox priskyrimas ir production per-channel mandatai lieka neužbaigti. Vienas savininko Gmail bandymas nėra rinkos paklausos ar pelningumo įrodymas. Acquisition integracijos ribos: [ACQUISITION_HANDOFF](ACQUISITION_HANDOFF.md).
