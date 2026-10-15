# Konfigūruoto companion naudojimas medijos regresijoje

Issue 66; koordinatorius aiškiai suderino papildomą tikslų `content-studio/test/media-import.test.mjs` failą. Upgrade `upgrade-d195793f-c76d-44e3-a5b2-ad83714356c5`.

Naujoje owned worktree nėra numanomo gretimo public checkout. Platesnis bandymas, nors turėjo teisingus `PINET_PUBLIC_CORE_PATH` ir `STUDIO_NETWORK_SETTINGS`, baigėsi 23 PASS / 1 FAIL per 52,705 s: testas importavo validatorį tiesiog iš `../../../dovanos-memorycasting/scripts/content-package-core.mjs`. Trūko būtent statinio failo; visi naujo connector scenarijai tame bandyme praėjo. Ankstesnis 21 PASS / 1 FAIL per 43,596 s neturėjo companion konfigūracijos ir yra atskiras išsaugotas nustatymo trūkumas.

Testas dabar parenka validatoriaus failą per esamą `publicCoreDirectory()` ir `pathToFileURL`. Tai tas pats operatoriaus konfigūracijos resolver, kurį jau naudoja studijos serveris. Fallback į tikrą gretimą checkout išlieka resolver sutartyje. Naujo resolverio, alias, junction, public source kopijos, runtime konfigūracijos ar provider įjungimo nėra.

Tikslus tikras HTTP → PNG → penki WebP → šeimos priskyrimas → approval/export → public validator scenarijus praėjo: 1 PASS, scenarijus 3,417 s, visas runner 3,746 s. Tai izoliuoti sintetiniai duomenys ir laikinas testinis localhost serveris; veikiančių kliento API/Studio ar priimtų bylų nepakeitė.

Rollback: revert tik šio testo importo pataisą. Pirmi FAIL lieka dokumentacijoje; vienas testinis PASS neįrodo production ar naujo runtime adoption.
