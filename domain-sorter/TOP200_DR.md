# TOP200 Ahrefs DR

Savininko užsakymu 2026-10-01 patikrinti visi 200 `selected/selection.json` domenų.
Du tikri POST kvietimai po 100 į `https://api.ahrefs.com/v3/public/domain-rating-free`.
200 sėkmingų atsakymų: 45 DR > 0, 155 DR = 0. Tikrinta 2026-10-01 11:16:04 UTC.

Attribution: **Domain Rating by Ahrefs** — https://ahrefs.com/ .
[API dokumentacija](https://docs.ahrefs.com/en/api/reference/public/post-domain-rating-free),
[duomenų licencija](https://ahrefs.com/legal/domain-rating-license).
Nemokamas API metodas reikalauja APIv3 rakto. Raktas paimtas tik iš AHREFS_API_KEY;
.env reikšmės nespausdinamos, nevykdomos kaip instrukcijos ir neperduodamos Codex.

## Rezultatai

- `output/top200-research-20261001/selected/ahrefs_dr.json`: originalūs API atsakymai, domenų ryšiai, tikrinimo datos ir atsakymų SHA-256. Jokio rakto.
- `top200_su_dr.csv`: esamas 200 nišų prioritetas ir tyrimų santraukos, pridėti tikri DR, būsena, data ir API šaltinis.
- `top200_su_dr.xls`: tikras BIFF8 Excel, tie patys TOP200 / Analizės / Šaltiniai / Metodika lapai; DR matomas iškart prie domeno.

DR yra Ahrefs santykinis nuorodų profilio rodiklis, logaritminė 0–100 skalė.
DR 0 išsaugotas kaip skaičius. API atsakymai siejami pagal domeną, ne eilutės numerį;
trūkstami, pasikartojantys, svetimi ir netinkami rodikliai atmetami, nekeičiami į nulį.
DR savaime negarantuoja Google pozicijų. Istorija, backlink kokybė, registravimo būsena
ir nuosavybė šiuo darbu netikrintos. Tyrimo prioritetas ir verslo hipotezė neperskaičiuoti.

## Tęstinumas

`ahrefs_dr.py` numatytai naudoja jau gautus DR ir praleidžia API kvietimus.
`--refresh` autorizuotam pakartotiniam tikrinimui; `--export-only` visai nesiekia rakto/API.
`Atnaujinti-top200-DR-fone.ps1` paleidžia atskirą paslėptą eksportų procesą:
jis iš read-only SQLite skaito naujas baigtas rinkos analizes ir atnaujina tik
`top200_su_dr.*` bei `top200_dr_status.json`. API užklausų nekartoja, AI nepaleidžia,
originalios SQLite, MD, prioritetų ir `research_status.json` nekeičia.
Užraktas atskiras `dr-runtime/.run.lock`. Procesas baigia, kai nišų tyrimo procesas sustoja;
pratęsus tyrimą šį atnaujinimą galima paleisti dar kartą.

Esamas worker 20628 buvo paleistas prieš DR eksportų papildymą: naujieji `top200_su_dr.*`
failai dėl to atnaujinami atskirai, nenutraukiant jo pradėtų AI kvietimų.
Ateityje perkrautas `niche_research.py` pats įtraukia tą patį patikrintą cache ir į bazinius
eksportus. Duomenų sąrašas, tyrimo schema/modelis/promptas/signature nepakeisti.

## Patikra

49/49 programos testų PASS: domenų ryšys nepriklausomai nuo API eilės, tikras nulis,
negaliojančios/trūkstamos reikšmės, dvi 100 eil. grupės ir pakartotinė eiga be API,
atskiras DR eksportas nepakeičia gyvų failų, 200 unikalių domenų ir tušti nebaigtų
tyrimų balai. Tikras eksportas taip pat iš naujo perskaitomas ir kiekvienas DR lyginamas
su API cache. Vizualinė peržiūra vykdoma iš išsaugoto XLS duomenų ir formatų.

## Naujas tyrimų prioritetas: DR ≥ 10

2026-10-01 savininkas nurodė tęsti visus TOP200 tyrimus, pirmiausia imant DR10+.
`prioritize_dr.py --minimum 10` pakeičia gyvą eilę per atomic `selection.json`,
neperkrauna AI proceso, nekeičia domenų rinkinio ar baigtų išvadų. Penki pirmi:
autoelektrikaivilniuje.lt 18, rusuvertimai.lt 15, baidarestaurageje.lt 12,
visazisteskursai.lt 10, fotoseimai.lt 10. Vienodo DR atveju išlaikytas ankstesnis
komercinis prioritetas; likę 195 lieka ankstesne potencialo tvarka.
Potencialo grupių kodai išlaikyti, jų užrašai dabar nurodo pirminio potencialo vietų
intervalą (pvz., P4 — potencialo vietos151–200), kad senas „vėliau tirti“ užrašas
neprieštarautų naujam DR pirmumui. Ankstesnės etiketės išsaugotos `potential_tier_before_dr`.

Ankstesnė eilė išsaugota `potential_order_before_dr`, kiekvieno domeno
`potential_priority` / `potential_priority_reason`; prieš pakeitimą padarytas
`selection-before-dr-priority-20261001.json`. Potencialo grupės nesupainiojamos
su nauju DR tyrimo prioritetu. Jau pradėti keturi tyrimai gali užsibaigti;
po jų nauji kvietimai ima šios eilės pradžią. Cache tyrimai nekartojami.

Aktualus eilės SHA-256 saugomas `selection.json` ir `top200_dr_status.json`;
`dr-priority-v2` apima tą pačią DR tvarką ir aiškesnes potencialo grupių etiketes.
Pilno tyrimo schema, prompt/modelio parašas ir pirminiai balai nekito.
DR eksporto procesas jau perėmė naują SHA ir visų 200 eilę.
50/50 testų PASS, įskaitant slenkstį tiksliai10, 9.9 atmetimą, lygaus DR tvarką,
baigtos analizės praleidimą, pirminių source ID ir potencialo eilės išsaugojimą.
