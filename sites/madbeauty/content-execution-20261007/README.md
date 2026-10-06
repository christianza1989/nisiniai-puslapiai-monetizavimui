# Madbeauty: pirmas tikras Luna straipsnis

2026-10-07. Tai pradėtas pilno 300 naujų gidų plano vykdymas: **1 parašytas privatus straipsnis**, 299 dar neparašyti. Trys esami gidai turi atnaujinimo planus. Nėra savaitinės kvotos.

Peržiūra: [registracijos gidas](REGISTRACIJOS-GIDAS.html). HTML gautas iš bendro studijos preview, su tikrais WebP failais; tai nėra galutinio viešo portalo dizaino ar deployment priėmimas. Gyva privati studija: `http://127.0.0.1:8827/` (reikia veikiančio vietinio serverio).

## Kas atlikta

- GPT‑6 Luna / xhigh faktiškai parašė tekstą ir jo redakcinę pataisą. [Paleidimo įrašas](GENERATION-RECEIPT.json) patvirtina CLI modelį/effort, instrukcijų SHA, pradžios/pabaigos laiką ir išsaugoto teksto SHA. Aktyvaus pokalbio modelis teksto generavimo modelio nepakeičia.
- Straipsnis turi konkretų paslaugos apimties pavyzdį, kopijuojamą registracijos žinutę ir penkis patvirtinto vizito laukus. Išgalvotos sumos/adresas/trukmė aiškiai pažymėti kaip hipotetinis pavyzdys.
- Perskaityti ir siauram teiginių mastui patikrinti VVTAT/NVSC šaltiniai; nuorodos prie jų palaikomų pastraipų išsaugotos kaip typed V2 nuorodos. Medicininių instrukcijų ir konkrečių Madbeauty rezervavimo valdiklių aprašymo nėra.
- Luna parengė [tikslų vaizdo aprašą](IMAGE-PROMPT.txt); tikrus pikselius sugeneravo built-in ImageGen. Originalas ir promptas išsaugoti privačiame studijos media-originals kataloge. Bendras `saveResponsiveAsset` sukūrė 5 WebP variantus; originalas nėra viešo paketo dalis.
- Visos 300 naujų temų ir 3 esamų gidų atnaujinimai gavo tikrus stabiliai išsaugotus studijos UUID: [tapatybių žemėlapis](STUDIO-IDENTITY-MAP.json). Esamų gidų UUID atitinka ankstesnį paketą, tačiau jų istorinės approvals šioje naujoje privačioje kopijoje neišgalvotos ir neperkeltos.
- [V2 juodraštis](DRAFT-V2.json) faktiškai susietas su siteId, šaltiniais, organizacijos autoryste ir tikra vaizdo šeima. Bendras V2 struktūros validatorius praėjo. Visos 303 studijos publikacijos privačios, approval nėra.

## Peržiūros ir publikavimo ribos

[Vykdymo būsena](EXECUTION.json), [faktinė peržiūra](REVIEW.md). Planuojama šio gido data **2026-10-13 10:00 Europe/Vilnius**. Tai nėra garantuotas viešas paskelbimas: reikės baigti nuorodų/funkcinio CTA patikrą, tikros revizijos review/approval, išleisti ir importuoti patvirtintą paketą bei patikrinti deployment. Tik tada jau įdiegta patvirtinta revizija atsivers atėjus jos datai; Google indeksavimas atskiras.

Bendras V2 autopilot lieka išjungtas. Šis ribotas file-first CLI tekstą paverčia tik tiksliai palaikomais heading/paragraph/list/richParagraph blokais ir naudoja įprastas studijos API. Jis neperrašo jokio jau patvirtinto turinio. Medijos ir autorystės metaduomenys nėra bandomasis viešas patvirtinimas. Platesnis platformos atnaujinimas nepratęstas.

## Pakartojimas

`content-studio/scripts/draft-reviewed-brief.mjs <reviewed-brief.json> <private-output-directory>` patikrina pilną tos pačios svetainės planą ir naudoja bendrą Luna/xhigh runner. `bind-private-draft.mjs` priima faktiškai peržiūrėtą vaizdą ir **naują** privatų studijos katalogą; neleidžia reset/overwrite esamo Madbeauty tenant. Jis skirtas šio vieno piloto atkūrimui, o ne bendro V2 generatoriaus įjungimui. `capture-preview.mjs` iš bendro vietinio serverio išsaugo pernešamą HTML su medija.
