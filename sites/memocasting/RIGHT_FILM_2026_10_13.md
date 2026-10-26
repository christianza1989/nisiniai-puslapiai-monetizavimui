# Dešinėje esantis proceso filmas · 2026-10-13

Savininkas atšaukia full-width film testą: filmas dešinėje, tekstas kairėje. Papildomai pateikia stipresnio minkšto edge fade pavyzdį ir prašo pilką foną pašviesinti. Pataisa tik desktop story CSS: left text30%/max380px, right film iki63% su 16:9 contain, aukščio ribojamas plotis ir vertikalus centravimas virš rail. Dviejų ašių alpha mask platesnis už originalų7–8%; brightness1.12/contrast0.94 pašviesina foną. Produktui nededamas bendras blur. Manual mobile, captions/links/copy/type sizes, 840svh ir bounded smooth seeking nepakeisti.

Pirmas tikras tablet768 bandymas atskleidė kietą video-frame kraštą dėl contain letterboxing didesniame mask konteineryje. Pataisyta mask konteinerio geometrija į patį16:9 kadrą, o short-height bottom override pašalintas. Originalus video nepakeistas; nėra fake regeneration ar naujo content release.

Upgrade upgrade-ca598cf1-df87-4621-ba5d-113575a470ac. Tik CSS/site receipt/design/workstream/journal; paired current main7af6b964/ec8a9c03. ExistingPR101/31, local8817. Build ir actual rendered acceptance įrašomi po paskutinio bandymo. Šis siauras CSS pakeitimas nepraplečiamas naujais tests ar SEO/Lighthouse audit; ankstesnio98test priėmimo čia iš naujo neteigiame.

Final PASS: production build, actual1280x630 and768x740 rendered split/soft edge/text separation;320x740 manual video ready4, mask/filter none, scrollWidth305 <=320. Source video contain16:9, no horizontal overflow, compact timeline unchanged. Screenshot PUBLIC/output/right-film-final.png and browser receipt output/right-film-browser.private.json. Only CSS changed; no new tests or repeated broad SEO/perf audits required. Private original decoder/workerd failures preserved.
