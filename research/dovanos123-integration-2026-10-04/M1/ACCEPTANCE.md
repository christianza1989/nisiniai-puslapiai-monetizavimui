# M1 adapterio ir studijos patikra

2026-10-05 Europe/Vilnius. Priimtas vietinis bendro modelio inkrementas, ne Dovanos123 turinio ar production paleidimas.

SchemaVersion2, lossless rich inline/list/heading ir editorial/siteSnapshot hash veikia. Stabilūs ID ir originalūs UTC momentai išlaikomi. V1 schema, hash algoritmas ir devyni aktyvūs v1 paketai neperrašyti. Abiejų v2 schema/helper kopijų equality ir legacy hash sutapimas tikrinami testais.

Tikras GUI bandymas M1/studio-v2-editor-desktop.png ir studio-v2-private-preview.png: redaktoriaus išsaugojimas išlaikė inline seką, author/source metadata ir UTC laiką; būsimo įrašo peržiūra privati/noindex. Šie ekranai užfiksuoti prieš vėlesnę version label/disabled generator UI pataisą, todėl neįrodo tų vėlesnių pikselių.

V2 generavimo plan/draft/batch/autopilot dar nepritaikytas: serveris atmeta prieš job/provider kvietimą, UI mygtukai disabled. V1 generavimas veikia pagal esamą sutartį. Negalima skelbti, kad v2 CLI generatorius jau priimtas.

Studijos source mutacijos turi process queue + crossprocess wx lock; 30s bounded wait, token/pid owner, nėra stale-lock stealing. Po crash atlikti tik explicit recovery patikrinus tikrą savininką ir DATA kelią; ne automatiškai trinti pagal amžių. Normalus CLI initialize nebežlugdo kitų procesų queued/running jobs; vienas GUI/queue serverio savininkas explicit restart-recovery. Eksportams naudoti savo output katalogus ir neimportuoti/tmp fixture į main.

Actual tests: M1/studio-tests.log 22/22 po lock inkremento; galutinė initialize recovery delta dar turi atskirą galutinį pilną log. Dviejų atskirų Node modelio procesų testas išsaugojo visas30 nepasikartojančių puslapių mutacijų; abandoned lock paliktas nepakeistas po bounded rejection. Senas jau paleistas modelio procesas naujo lock neįgauna iki reload: senų svetimų serverių neperkrauta, iki reload vienas aktyvus DATA rašytojas.

Shadow import neaktyvina host/paketų registro/assets. Aktyvavimui nauja `--acceptance <receipt>` sutartis: exact package bytes SHA, renderer/host/site ir local/production ribos. Local-fixture tik reserved .example ir explicit testOnly, ne PASS deklaracija; production atskirai reikalauja M2/M3/M5 ir ownership/DNS/contact/INBOX/privacy PASS įrodymų hash. Compiler be tokio receipt v2 atmeta. Šiuo metu admission tik lt-LT/gift; naujos nišos lieka įprastu v1 procesu.

Papildomas `local-preview` skirtas actual kanoninio domeno peržiūrai tik izoliuoto output/outputs checkout viduje; import/compiler atmeta main kelią, proxy atmeta realų host ir leidžia tik localhost/127.0.0.1. Noindex/no-store išlieka. Scope pure tests ir compiler kontraktas nėra actual r2 HTTP įrodymas; jį užfiksuoti atskirai po redakcinio priėmimo. Production kriterijai nesušvelninti.

Galutinis lock/recovery pilnas log `studio-tests-final.log` 22/22 PASS; vėlesnis `editDraftAssetMetadata` private-only inkrementas turi `studio-tests-media-metadata.log` 23/23 PASS. API keičia tik niekada nepatvirtintų šeimų alt/credit, draft hash ir review status, išsaugo privačią istoriją; approved snapshots ir originalūs failai neliečiami.
