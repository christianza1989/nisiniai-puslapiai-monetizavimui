# Studijos priklausomybių patikra prieš vietinio vykdyklės darbą

Šio paketo rezultatas: įjungiamas vietinis site-build supervisor prieš SQL priėmimą ir modelio darbą patikrina tikrus Node studijos modulius. Tai nėra puslapio, visos platformos ar gyvo paleidimo priėmimas.

## Pradinis radinys ir apimtis

2026-10-15 vietiniame užšaldytame `c99094cae712d085e06314af39d166b9492028d3` worktree studijos importas baigėsi `ERR_MODULE_NOT_FOUND`: trūko deklaruoto `sharp`. Ankstesnė patikra tikrino Node kelią, source ir profilius, bet ne visą studijos importų grandinę. Dėl to modelio darbą buvo galima pradėti dar neparengus vėlesnio turinio intake / medijos kelio. Pirmas klaidos kvitas išsaugotas privačioje koordinacijos istorijoje; modelio ar serverio tame atkūrime nepaleista. Pradinė per anksti pateikta gretimo media modulio priežastis aiškiai atšaukta: pirmas stebėtas gedimas buvo `sharp`; atskirą gretimo GUI media modulio gedimą pagrindinė sesija vėliau atkūrė sutvarkiusi priklausomybes.

Pagrindinė sesija delegavo tik `creation/studio.py`, minimalų `site_build/lifecycle.py` kvietimą, naują fiksuotą Node helper, savo testus ir šio paketo žurnalą. GUI serverio resolveris priklauso kitam paketui. Aktyvus API / modelio bandymas, jo `c99094c` source ir instrukcijos nekeičiami.

Bazė: core `c99094cae712d085e06314af39d166b9492028d3`; sėkmingai fetched main `808581d919d06cb4a2d151cc7f9ec1be1782aba2`. Read-only companion `1a26f289092cecadc5799de898e809dc1769498a`, main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Darbo sritis registruota GitHub issue66 ir WORKSTREAMS.

## Kanoninis sprendimas

`studio.preflight_dependencies` naudoja esamą `configuration()` ir `_execute`, fiksuotą helper kelią, 10 sekundžių ribą, esamus output / stderr limitus ir dabartinės source autorizacijos callback. Kliento ar modelio pateikti keliai, moduliai, kontaktai bei case duomenys nepriimami. Node helper importuoja tik esamus intake, native writer, workflow, model ir `sharp` modulius; tikrina jų eksportus. Jis nekviečia `initialize`, neperskaito case, neatlieka vaizdo transformavimo, nerašo studijos duomenų ir nepaleidžia serverio ar provider.

Missing-module klaida grąžinama kaip `studio_dependency_missing`; kitų importų gedimai turi saugų kodą. Python tikrina uždarą response formą, įskaitant providerCalls=0 ir neatliktą inicializaciją. Nežinomas / papildytas response nėra PASS. Esamas timeout ir autorizacijos atšaukimo kodas išlieka.

`lifecycle.preflight` vykdo importų probe po source guard, prieš adapterių / SQL priėmimo patikras. Numatytoji išjungta vykdyklė preflight neatlieka. Ši patikra neįdiegia priklausomybių ir nepakeičia canonical package / lock failų. Naujo worktree priklausomybes parengti iš esamo `content-studio/package-lock.json`, tada kartoti tik šią vietinę patikrą. Įjungto supervisor startup negali laikyti vien `node --version`, esamo failo ar CLI modelio patikros pilna studijos parengtimi.

## Patikra ir ribos

- 50 Python patikrų PASS, 4,21 s: naujas preflight, esamas studio transportas / autorizacija / cleanup ir lifecycle default-OFF.
- 6 Node patikros PASS, 600,45 ms: tikri izoliuoti Node procesai, missing Sharp, blogi eksportai, netinkamas / per didelis input; fixture eksportai uždraudžia initialize, case reads bei transforms. GUI modulis neprivalomas.
- Tikrų įdiegtų modulių probe savo worktree per paired freshness wrapper: ready, Sharp0.35.5, 5 moduliai; provider0, server nepaleistas, data/output buvimas nepakitęs.
- Pirmas Ruff radinys I001 (vien naujo importo tvarka) išsaugotas; sutvarkyta prieš perdavimą. Galutinis Ruff ir diff patikra PASS.

Modelio kvietimų, DB operacijų, runtime flags / migration / manifest / lock pakeitimų ir actual adoption šiame pakete nėra. Pilnos platformos vartai, medija, reali redakcinė peržiūra, vietinis rendereris ir main merge lieka atskiri rezultatai. Ši importų patikra nepatvirtina apskritai visų Node funkcijų, verslo faktų ar kokybės.

Kanoninis upgrade: `upgrade-02ed414d-b42d-44a6-afad-18df2ca37ebc`; local-verified įvykis `55399946-ab24-458d-91d3-0af9bf321933`. Tai source patikra, ne main merge ar runtime adoption.
