# Agentų instrukcijų registras

Tikri vykdomi failai yra `src/pinet_core/instructions/`, kad būtų įtraukti į Python paketą. `agent_instructions.compose(site_id, role)` sujungia `core/common.md`, rolę ir tos nišos procedūrą. Pardavimų rolė taip pat gauna `core/email.md`. Kiekvieno fragmento ir viso rezultato SHA-256 saugomas; balso pokalbis išsaugo teksto snapshot ir nekeičiamas jam tęsiantis.

Tai darbo principai, ne uždaros replikos. Agentas laisvai renkasi klausimus, toną ir leistinus įrankius. Leidimus vykdo serverio `BusinessPolicy`; faktus teikia tik aktuali patvirtinta `KnowledgeState`. Nei instrukcija, nei naršyklės atmintis, nei aukštas balas nesukuria naujos komercinės teisės.

Rolės: pokalbis, pardavimas/el. paštas, tiekėjo užklausos parengimas, nepriklausomas kokybės vertinimas. Tai skirtingi instrukcijų ir įrankių profiliai; nereikia nuolat laikyti keturių modelių kiekvienai svetainei. Dabar įtrauktos traktoriupadangos, greitossvetaines, akmenas, auksarankiams, laiptucentras ir roletaiklaipedoje. Failo buvimas nesuteikia tiekėjų, komercinės kainodaros ar vykdymo pajėgumo; kiekviena niša remiasi atskirais patvirtintais faktais. [Šešių nišų kalibravimo įrodymai](../../../voice-agent-plan/NETWORK_CALIBRATION_2026-10-01.md).

## Savarankiškas tobulinimas

Kokybės agentas siūlo mažą bendravimo pataisą. Ji bandoma prieš esamą versiją, išlaikant atskirą holdout ir kritinius vartus. `adaptive_instructions.py` gali aktyvuoti pagerėjusią **vietinę** versiją atominėje `artifacts/instruction-releases/<siteId>/active.json` rodyklėje. Žemesni rezultatai, vienodas rezultatas, nepilnas bandymas ar pasenęs parent hash aktyvavimo nesuteikia. Senas pokalbis išlaiko savo snapshot; yra rollback į ankstesnę vietinę versiją.

Tai dar ne gyvo balso canary/promotion: nepriklausomo Gemini garso ir žmogaus sukalibruoto vertintojo įrodymų nėra. `calibration.py` static PASS vienas nieko neaktyvuoja. Agentas neturi savavališko failų rašymo, kainodaros, apskaitos ar kitų nišų teisių.

## Darbuotojų vertinimas

`employee_scores.py` skiria mėnesio (`YYYY-MM`) ir metų (`YYYY`) lenteles. Kokybės balas: 45 % tikslumas, 30 % pažadų įvykdymas, 25 % patvirtinta kliento patirtis. Jei kliento vertinimo nėra, jo neišgalvojame: rezultatas normalizuojamas tik per išmatuotas dalis, o trūkstamas vertinimas rodomas atskirai. Patvirtinti apmokėti sandoriai ir indėlis po sąnaudų yra atskiri rodikliai bei palyginimo kriterijus. Kritinė klaida arba nuostolingas sandoris neleidžia tapti laimėtoju. Minimum 5 atvejai yra pradinis valdomas parametras, ne statistinio patikimumo įrodymas.

Modelis pats neskiria savo balų. Lentelės įvestį turi projektuoti patikimas vertinimų/mokėjimų adapteris, ne kliento ar agento tekstas. Dubliuotas case atmetamas. Sintetiniai rezultatai atskiriami nuo tikro verslo; dabar realaus mėnesio/metų laimėtojo nėra. Premijos principas įtrauktas į common instrukciją, tačiau pagerėjimas dėl šio sakinio neįrodytas A/B bandymu.
