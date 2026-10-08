## 2026-10-08 — CSV peržiūra ir rules/reports actual priėmimas

Runtime 91d1c87c0b709a3f431b4e8bd40f99f5073f8fc9 (CSV behavior281ea5a). Original D07 acceptance reikalavo dublikatų/neaiškių atitikmenų ir kainų pakeitimų peržiūros prieš rašymą; ankstesnis atominių juodraščių priėmimas šios trūkstamos sąsajos neapėmė. Naujas pirmas žingsnis skaito aktualų prisijungusios darbo vietos workspace, tikrina owned offer/variant/staff IDs, versijas, archyvą, dublikatus ir skaitines ribas; klaidos palieka CSV ir nieko neįrašo. Antras aiškus patvirtinimas rodo pasiūlymą/variantą/meistrą, seną ir naują kainą/trukmę. Backend final atomic version/capability/variant validation lieka autoritetas. Tas pats patvirtinimas po prarasto atsakymo naudoja originalų payload/key; pakeitus peržiūrimą intent sukuriamas naujas raktas. CSV uždarymo/reload key persistence garantijos nėra.

3 nauji prasmingi testai: pure preview taikomumas/ID/versions/limits/inherited staff rates/no mutation, real Node platform read-only preview/escaping/revision/org-change, explicit confirm concurrent version ir lost committed reply replay. Visos4 manifest suites regression-71-retest.log249/249,0pašalintų; exact75aa39page307asset build-preview249-retest.log.6source ir1copy safety PASS. Detector one inherited calendar CSSline7 warning (later existing override1px); no new CSV finding.

Actual native Worker8845/browser2 owner: authenticated CSVdownloadv3/31EUR -> duplicate/unmatched focused errors -> corrected named31->32 preview, no storage mutation; Back preserves text, Escape returns opener,320 Tab loop. Two-tab editor save33EUR/v4 -> old confirmation409 preserves exact newer state. Freshdownloadv4 ->33->32 preview -> explicit targetcommit lostreply503 -> same-dialog Enterretry returns exactv5/32EUR/two lifetime bulk events+receipts -> reload32. Four invalid/normal-preview-final/conflict/lostreply screenshot families viewed and measured; narrow modal confirm remains keyboard reachable. Detailed csv249-browser.md and exact read-only snapshots retain scope.

Rules unchanged cb8f path: precommit503/input retention/Enterretry -> v7; tab conflict409 retains90 and protects newer60/v8; explicit reload/review/re-entry90 -> v9. Four rules-outage widths viewed; rules246-browser.md. Reports read503 -> native retry retains Oct8–9 hash/fields -> scoped empty CSV header; original320 clipped native date year despite equal scrollWidth, repaired with<=380 one-column fields. Four final report249 widths viewed/readable. report249-browser.md. Initial local startup failure was specifically stale306-path bundled fixture vs rebuilt307th module404, fixed by only owned fixture restart with same SQL stores; this does not explain older unrelated cold-start observations.

Visas upgrade ACTIVE. No production writes/migration/deploy. Toliau complaints ir kiti likę I04; hosted restore/fence/load, actual booking inbox/pilot ir factual retention vartai lieka atskiri. Conditional full-completion deploy leidimas galioja, prerequisite unsatisfied.

## 2026-10-08 — meniu atkūrimas ir actual I04 patikros

Runtime cb8f37a30d2d4e634d169b52e752998bbad82a7d. Meniu grupės save priima optional actor-scoped idempotencyKey; org price capability ir grupės priklausomybė tikrinamos prieš replay. Fingerprint apima org/ID/original version ir normalized label/rank/active. Tas pats raktas ir duomenys grąžina originalų rezultatą prieš stale version check, be papildomos grupės/versijos/event. Kiti duomenys su tuo pačiu raktu atmetami. Esami caller be rakto lieka suderinami. Meniu formos raktas saugomas kartu su 8h account/org/record-version-bound same-tab draft; success išvalo, discard pradeda naują veiksmą. Galerijos/CSV savavališko reload replay garantijos nepridėtos.

Node reprodukcija prieš taisymą sukūrė antrą grupę (menu-replay-node-first.log); retest PASS įrodo create/edit replay, permission revocation ir changed intent. Native main Worker ordinary HTTP: committed create/edit response loss, two-store restart, same group/version/event/receipt and stale/conflicting intent guards PASS. Pirmas Worker fixture secret buvo trumpesnis už existing minimum; ištaisytas tik testinis raktas, pirmas logas išsaugotas. Visos4 manifest suites regression-70-retest.log246/246 (2 nauji,0 pašalintų); exact75aa39page306asset build-menu246-retest.log;5source safety PASS.

Actual browser2/tab6/8845 canonical owner, synthetic org: new menu Enter -> target commit -> lost reply503 -> same-tab reload -> both stores restart -> reopened restored fields -> Enter replay -> success. Read-only menu246-after-retry.json exactly equals committed-lost-reply projection; no extra group/version/event. Next new form blank, no restored draft; Escape returns opener focus. Four current restored screenshots -retest at320/390/820/1440 viewed: dialog288/358/700/700, form232/302/644/644, document320/390/820/1440 all client=scroll. Original ambiguous unsaved-form copy retained diagnostically, corrected copy says retry safe. Recovered390 viewed/embedded. Scope and exact evidence are menu246-browser.md.

Prior unchanged runtime31465 native I04 paths: menu precommit503/retry/loading/Escape; CSV Enter export/download and Escape focus, committed31EUR reply loss -> same-dialog/key retry preserves exact version3/one event/receipt -> reload; gallery precommit503 retains inputs/retry, two tabs version409 retains text and protects version5, explicit reload/review/re-entry saves version6. Four error widths viewed; i04-menu-csv-gallery244-browser.md and UI_MATRIX record scope. Gallery automatic draft replay after reload is not claimed.

Visas upgrade ACTIVE ir neužbaigtas. Production writes/migration/deploy0. Toliau rules/reports/complaints ir kiti likę I04; hosted restore/fence/load bei factual SMTP/pilot/retention vartai atskiri. Savininko leidimas deploy after full completion galioja, prerequisite unsatisfied.

## 2026-10-08 — aktyvus upgrade: vietinių nuotraukų perdavimas į SQL

Runtime 31465ffd1a616866f4089106abe25acfa9a53b6e: explicit Node filesystem importer parengia existing private asset.original ir WebP failus SQL handoff. Canonical operator tikrinamas prieš failų skaitymą ir dar kartą prieš commit; org writable fence, profile version ir exact visų media įrašų CAS atmeta pasikeitusią apimtį. Tikrinami legal asset/key names, real path/file type, exact size/SHA/MIME descriptor ir esamas SQL indeksas. Iki32MiB per asset; commit atominis vienam asset, organizacijos importas resumable. Source private original key tampa originals/ID; existing ID/variant URL/public DTO/gallery/profile version lieka tie patys. Diskiniai failai nekeičiami, nėra optimizerio kopijos/retransform ar trynimo.

5 Node cases priimti: actual real PNG files/public DTO/restart/signed physical transfer, foreign/missing/corrupt/path denial, later asset rollback/resume, current version/freeze/operator-revocation ir explicit CLI guard/replay. Native Worker case perduoda real Node file→SQL→signed calendar/context/media chunks į actual MadbeautyOrganizationStaging; current signed private owner read exact WebP hash/decode, guest404 ir abiejų runtime restart išlieka. Tai test bridge, ne remote production perkėlimas/native browser importo ekranas. Regresijos69 visos4suites244/244,6nauji0pašalintų; build-filesystem244 exact75aa39page306asset,4source safety PASS.

Visas upgrade ACTIVE. Toliau įvykdomi likę I04 vartotojo kelių būsenų bandymai. Hosted production restore/fence/load bei faktiniai SMTP/pilot/retention vartai lieka nepatvirtinti; production writes/migration/deploy0. Conditional full-upgrade deploy leidimas galioja, completion prerequisite unsatisfied.

## 2026-10-08 — aktyvus upgrade: atkuriamas nuotraukų įkėlimas ir galerijos forma

Runtime 13a0de78eafa04bdad9001f627756141125672a5: neperkeltos organizacijos Worker įkėlimas naudoja tą patį patvarų įkėlimo raktą ir sinchroninį SQL commit, kaip perkeltas salonas. Optimizavimo laukimas vyksta prieš final current-role/freeze tikrinimą. Baitai, talpa, media/profilio versija, receipt ir central completion įrašomi vienu commit. Pakartojimas atpažįstamas prieš 24 vaizdų talpos tikrinimą; naujas įkėlimas ties riba atmetamas. Source receipt table neperkeliama, todėl po fizinio perdavimo tas pats rezervuotas ID atkuriamas tik pagal current profile teisę, canonical actor ir exact private asset fingerprint.

Visos keturios manifest suites: regression-68.log 238/238 (5 nauji, 0 pašalintų). build-source238.log: exact 75aa, 39 puslapiai, 306 assets, candidate-not-deployed. 7 source blobs safety PASS. Actual main Worker/native IMAGES test: real 640×480 PNG, kontroliuotai prarastas jau committed source HTTP atsakymas, source restart, exact physical original/WebP transfer, target activation ir antras restart; vienas ID, exact SHA, guest404/owner200 ir vienas central intent. Tai vietinis Worker/SQL bandymas, ne realus teikėjo ar SMTP pilotas.

Native browser 2/tab5/8845 normal email-only owner kelias prie ankstesnio runtime93c020e: target commit → prarastas RPC atsakymas → formos klaida su išlaikytais laukais → dviejų saugyklų restart → page reload → to paties failo pakartojimas. Read-only DB comparison: vienas intent, vienas target receipt, tas pats asset ID ir trys exact hashes. Error/success plotis320/390/820/1440 išmatuotas, screenshots peržiūrėtos; upload233-browser.md. Current 13a0de78eafa04bdad9001f627756141125672a5 galerijos editorius pataisytas iš siaurų generic grid stulpelių; normal native Enter save/service/caption/reload išliko. Current editor card client=scroll:206/276/450/600; document client=scroll305/375/805/1425 prie viewport320/390/820/1440. gallery238-saved-* screenshots peržiūrėtos,820 embedded.

Visas upgrade ACTIVE, nebaigtas. Production writes/migration/deploy0. Toliau vykdomi Node filesystem medijos importas ir likusi I04 matrica. Hosted restore/load ir tikri SMTP/pilot/retention faktai lieka atskiri vartai; sąlyginis savininko deploy leidimas galioja, full-completion sąlyga dar neįvykdyta.

## 2026-10-08 — aktyvus upgrade: parengta salono saugyklos konfigūracija

Runtime93c020eff125da46471b3845695a290201ba6e7c: candidate Worker exports MadbeautyOrganizationStaging; both existing configs append ORGANIZATION_STAGING + v2-organization-storage new SQLite class. Original PLATFORM/MadbeautyPlatform and v1 migration, account/Worker/routes/compatibility/vars unchanged. No rename/delete/transfer-class directive or namespace reset. InstalledWrangler4.92.0 schema/help + official legacy migration docs checked; deploy --dry-run compiled exact candidate without uploading. Actual main Worker test preserves source object ID/session/confirmed booking after binding addition, then explicit staged handoff/current target reads and another two-store restart preserve booking ID. Four suites regression-67.log233/233 (1new0removed), exact75aa39page306asset build-binding233.log;5source safety PASS. Remote provisioning/migration/deployment0; entire upgrade ACTIVE.

Next: actual Worker browser upload and local source dedup, Node filesystem import, remaining I04. Production class creation is only a candidate; physical hosted restore/load and factual SMTP/pilot/retention gates remain. Both configs reference the same Worker/account; workers_dev preview is not an isolated remote environment. Full-completion deployment condition remains unsatisfied.

## 2026-10-08 — aktyvus upgrade: nuotraukos dabartinėje salono saugykloje

Runtime02d9872a05dd0d3f878b56d5de8a0df3e287ffdd: current transferred organization upload now uses fresh central actor/current target profile capability, existing shared IMAGES transformer, separate raw binary RPC and a single synchronous target SQL transaction for blob chunks/capacity/asset/profile/upload receipt/cache/nonce. A central bounded4096 intent journal reserves the same asset ID and original digest; lost committed replies recover the target receipt before repeating optimization. Target quota24 remains. Browser sessionStorage keeps only scoped key/fingerprint for same-tab retry/reload; blocked storage has in-memory fallback. No image/contact text stored in that intent. All4manifest suites regression-66.log232/232 (8new,0removed); exact75aa39page306asset build-upload232.log and13source safety PASS. Actual Workers native IMAGES processed16x24PNG toWebP, private guest404/owner200, source+target restart lost-response recovery, publication guest200 and second restart preserved ID/digest. This is HTTP/storage+raster decode, not native browser upload visual acceptance. Whole upgrade ACTIVE; production writes0.

Toliau vykdomi: actual Worker browser upload I04, production binding/migration candidate, Node filesystem import and remaining named UI states. Unmigrated source upload still uses its existing prepare/attach/discard adapter and has no new durable dedup guarantee; this remains a follow-up. Real SMTP/pilot/retention facts remain pending. Conditional full-upgrade deployment authorization persists, prerequisite unsatisfied.

## 2026-10-08 — aktyvus upgrade: archyvuotos procedūros juodraštis

Runtimeb541fa6f09bc54d516e6ac42244a657c621f366a: private original archived procedure draft remains editable, active selection/publication/booking remain strict. Professional DTO supplies current complete canonical labels; active select choices still derive from current public taxonomy. Actual8843 owner archived classic manicure, native Enter save/reload same ID, Escape focus return; four retest dialog widths320/390/820/1440 viewed with full accessible wrapped text. Initial raw ID/generic label, mobile native-select truncation and save rejection preserved in ignored evidence. Four manifest suites regression-65.log224/224 (0 new tests,3 extended); exact75aa39page305asset build-inactive224.log;7source safety PASS. Whole upgrade ACTIVE; target upload/binding, remaining I04 and factual launch gates continue. No production writes.

## 2026-10-08 — aktyvus upgrade: aktualūs vieši ir privatūs salonų vaizdai

Tarpinis224 paketas priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtime242c687b26d882ad2f634f585d55f9cb9ecc3fc5 / PR26, companionc7e0c9a / PR6.4suites224/224 regression-64.log ir exact75aa39page305asset build-media-read224.log. Canonical source session → signed target current profile permission → bounded binary variant + signed descriptor → source SHA/file/bytes verification. Actual Workers ordinary HTTP draft/private/published/restricted/corrupted/restart states ir Node foreign actor/binary tamper/outage priimti. Sealed source nepakeistas; nėra stale byte/access fallback. Tai synthetic HTTP/storage įrodymas, ne raster vizualinio rendering PASS.

Toliau dabar įvykdomi target upload ir production binding/migration, Node filesystem import bei likusi I04 matrica. Tikri SMTP/pilot/retention faktai atskiri vartai. Production writes0; full-completion deploy sąlyga neįvykdyta, leidimas galioja. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: fizinis salonų medijos perdavimas

Tarpinis222 paketas priimtas, visas pavedimas ACTIVE ir neužbaigtas. Runtimef03c1daf9539e147ad589e8dd34167e951e4b0a9 / PR26, companionc7e0c9a / PR6.4suites222/222 regression-63.log, exact75aa39page305asset build-media222.log ir8source safety PASS. Private signed256KiB chunks perduoda exact original/WebP variantų baitus ir esamus ID į atskirą SQL saugyklą; partial/replay/rollback/digest ir prepared/active fences priimti. Source lieka sealed su originaliais baitais; abort partial/prepared copy išvalo tik target reservation. Actual Workers two-object restart/complete/activate/restart hashes sutampa. Tai sintetinis storage bandymas, ne viešo vaizdo rendering įrodymas.

Toliau dabar įvykdomi: current HTTP media read/new target upload, production binding/migration ir likusi I04 UI matrica. Node filesystem medijai dar nėra SQL importo adapterio; faktiniai SMTP/pilot/retention vartai atskiri. Production writes0, conditional full-upgrade deploy leidimas galioja, completion prerequisite unsatisfied. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: perkeltų salonų pranešimų eilė

Tarpinis216 paketas priimtas, visas pavedimas ACTIVE ir neužbaigtas. Runtime24c05a1229d64e7b72c4c744986090bd21d81b85 / PR26, companionc7e0c9a / PR6. Visos4manifest suites216/216 regression-62.log, exact75aa39page305asset build-mail216.log ir6source safety PASS. Source centrinis siuntėjas gauna signed current target outbox claim, dar kartą tikrina dabartinius kliento nustatymus ir saugo patvarų acknowledgement kvitą be email/body. Prarastas jau priimto siuntimo ack kartoja tik ack; crash iki durable receipt lieka dokumentuota at-least-once riba su stable transport ID. Iki10 delegated admissions/cycle, durable round-robin cursor; vieno salonų taško outage nestabdo kito pažangos.

Actual Workers local transport/alarm→lost committed ack→source+target restart→receipt recovery PASS; sealed source outbox lieka nepakeistas. Tai nėra SMTP/inbox gavimo įrodymas. Target neturi savo transport/session/alarm, mailAuthorityfalse; central delivery admission jau priimtas.4096 journal bounds ir faktinė retention/backups policy atskiri vartai.

Toliau įvykdomi media transfer/binding ir likusi I04 UI matrica. Tikro booking laiško gavėjas/piloto teikėjas bei retention faktai dar nepateikti. Production writes0; conditional deploy leidimas galioja, full-completion prerequisite unsatisfied. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: aktualūs mėgstamieji, katalogas ir rodikliai

Tarpinis paketas210 priimtas, visas pavedimas ACTIVE ir neužbaigtas. Runtime1e4f9fc462cfab9f280d6035c1a2d07cb37aa977 / PR26, companionc7e0c9a / PR6. Visos4manifest suites210/210 regression-61.log, actual Workers globals/restart kelias22PASS ir exact75aa39page305asset build-globals210-final.log;8source files staged safety PASS. Mėgstamieji lieka central client patch, tikrina current target public profile, leidžia pašalinti jau nebeviešą bookmark. Indexed central catalogue scope nekeičia sealed org/global clients; target taxonomy tik signed cache. Metrics SQL counts current targets, excludes retained source scoped rows; demand nematuota. Legacy conversion kiekvienam org atomic, deterministic offer ID/service.offerId/no duplicate event leidžia pakartojimą po partial/lost reply; nėra whole-system transaction.

Actual8843 owner normal OTP session→taxonomy aliases keyboard save→r1→two-org legacy drafts/repeat→metrics13 events→favorite Space/reload checked. Po1draft/migrationevent source ir target, abu taxonomy r1. Taxonomy dialog390 bei metrics320/390/820/1440 visos peržiūrėtos; widths equal scrollWidths. Escape focus returns. Current archived bookmark/outage ir concurrent taxonomy UI klaidos Node-only, lieka I04.

Toliau įvykdomi: target mail admission/current preferences/alarm, media transfer/binding ir likusi I04 matrica. Tikri SMTP/pilot/retention faktai atskiri vartai. Production writes0, conditional full-upgrade deploy authorization galioja; completion prerequisite unsatisfied. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: naujo rankinio kliento patvarus pridėjimas

Tarpinis paketas207 priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtime7694c8d09453692cce7265c1ec08271cad2574d8 / PR26, companionc7e0c9a / PR6. Visos4manifest suites207/207 regression-59.log, actual Workers restart/alarm/replay ir exact75aa39page305asset build-manual207-final.log;8source files staged safety PASS. Central private account/client ir pridėjimo intent kuriami vienoje sync SQL transaction; target link/event/durable receipt/cache/nonce yra kita atomic transaction. Prarastas atsakymas palieka pending ir saugiai atkuriamas vienu source SQL parinktu account ID. Tai nėra distributed rollback: po target outage/revocation central private provisioned identity gali likti pending/failed; sessions/OTP ar komandos teisė nesukuriamos.

Actual8843 owner normal OTP→new manual email→controlled lost reply→pending→reload/restored fields→two stores restart→retry→applied. One central intent, one target version1 link/event/receipt, no target sessions/challenges; completed draft cleared, Escape focus returns. Pending dialog320/390/820/1440 visos peržiūrėtos ir measured without overflow; recovered client list390 peržiūrėtas. Naujo veiksmo pradžia sukuria naują key, seno patvaraus intent neatšaukia. Hidden key browser proxy redaction neapeita; reuse įrodytas actual storage single operation, ne redacted value comparison.

Toliau dabar įvykdomi: current favorites/metrics/catalogue controls, target mail/media/binding ir likusi I04 matrica. SMTP/pilot/retention faktai lieka atskiri vartai. Production writes0; conditional full-upgrade deploy authorization galioja, completion prerequisite unsatisfied. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: centrinės paskyros klientams ir komandos prieigoms

Tarpinis paketas203 priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtime ff917f2b9db35ac54ba951fc86016293f169efce / PR26, companion c7e0c9a / PR6. Visos keturios manifest suites203/203 regression-57.log; actual Workers identity/restart kelias PASS, exact75aa39page305asset build-identity203-final.log,6 source files staged safety PASS. CreateClient ir grantMembership jau esamam central email gauna tik source SQL parinktą recipient cache. Current target capability tikrinama prieš central email lookup ir pakartotinai prieš target admission/business commit. Recipient email/operation binding, operator0, minimal fields, current versions ir atomic link/access journal/nonce rollback priimti. Naujai nežinomai manual identity dar reikia atskiro central admission/recovery; target negali pats kurti global account.

Actual8843 owner normal OTP→target org→existing client link/private name→unknown team email error/input recovery→grant→two stores restart→current membership→revoke→client normal OTP nebeatveria org. Global vardas nepakeistas. Client-list ir team-access normal320/390/820/1440 bei team dialog visų pločių peržiūrėti ir išmatuoti; Enter/Escape priimti. Aptiktas reload organization-choice reset pataisytas account-bound/eligible selection storage; first/retest atskirai. SSR inventory privatumas label pataisytas, istorinių snapshot failų neperrašyta.

Toliau dabar įvykdomi: naujo manual client central admission ir uncertain-write recovery, likę globals/favorites/catalogue/metrics, target mail/media/binding ir likusi I04 matrica. Faktiniai SMTP/pilot/retention vartai lieka atskiri. Production writes0; conditional full-upgrade deploy leidimas galioja, užbaigimo sąlyga dar neįvykdyta. Darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: pranešimų nustatymų perdavimas

Tarpinis paketas200 priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtime6ce4e02 / PR26, companionc7e0c9a / PR6. Visos4manifest suites200/200 regression-55.log, exact75aa39page305asset build-controls200.log ir source7files staged safety PASS. Central preferences ir durable per-client/version/org intent įrašomi vienoje SQL transaction kartu su neperkelto org reminder reconciliation. Sealed target gauna private signed current-cache control; failed/lost reply palieka retry journal. Naujesnės revision nepanaikina ankstesnis ack, vėliau įvykusi užklausa grąžina superseded/current value. Target reconciliation ir jos cache/receipt/nonce commit atomic; source ir target nėra viena distributed transaction. Target mailAuthorityfalse išlieka iki atskiro central mail admission.

Actual Workers outage→pending central intent→dispose/restart→alarm recovery→suppressed reminder accepted; actual browser8843 fresh-booking client UI keyboard save→controlled target outage→saved/pending notice→recovery→suppressed job/queue0/one existing confirmation mail→reload false/0. Nustatymų320/390/820/1440 formos vaizdai peržiūrėti ir pločiai išmatuoti; žr. UI_MATRIX/ACCEPTANCE. Tikri SMTP/pilot/retention vartai dar atskiri; nėra production write/deploy.

Toliau įvykdomi: central existing-email/manual-client/membership admission, likę globals/favorites/catalogue/metrics, target mail admission/alarms/media/binding ir likusios I04 būsenos. SCREEN_INVENTORY laikinas SSR nustatymų title turi privacy žodį, kurį reikia sulyginti su galutiniu privatumas. Full-upgrade deployment sąlyga dar neįvykdyta; leidimas galioja, darbas tęsiamas.

## 2026-10-08 — aktyvus upgrade: naujo kliento tapatybė ir aktualus katalogas

Tarpinis paketas198 priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtimed60e077 / PR26, companionc7e0c9a / PR6.198/198 keturių manifest suites regression-53.log; Node cache/fences25 ir actual Workers2 priimti atskirais kvitais, exact75aa39page305asset build-cache198.log. Signed directory command gauna tik central SQL parinktą actor identity/preferences bei global taxonomy cache. Cache sequence ir bound tikrinami; pasenęs paketas neatstato seno pasirinkimo. Target admission ir business action lieka viena sync transaction; jokių target sessions/OTP/operator privileges. Confirm name effect patvariai susietas su booking; source receipt/references/global account/client update yra kita atomic central transaction. Lost reply recovery grąžina vieną booking/mail ir nesugrąžina seno vardo virš naujesnio central change.

Actual isolated8843 pirmas naujas email/OTP prisijungimas po handoff → salonas → variantas →18:00–19:00 → contact/name → confirm booking_44d462c1-70e7-476e-a551-29a628ae09bd. Vienas target booking/mail, source naujo booking neturi; abiejose accounts tas pats vardas, target operator0, sessions/challenges/cache permits0.390phone rezultatas peržiūrėtas. Žr. platform-upgrade-20261007/ACCEPTANCE.md.

Lieka dabar įvykdomi: jau turinčio migrated vizitą kliento central preference reconciliation/durable control delivery, existing/new manual-client/membership admission, global favorites/metrics/catalogue controls, target mail admission/alarm, media transfer ir likusi I04 matrica. Real SMTP/piloto/retention faktai atskiri vartai. Production binding/migration neįjungti, jokio deploy; conditional full-upgrade authorization tebegalioja. Darbas tęsiamas autonomiškai.

## 2026-10-08 — aktyvus upgrade: autoritetingas directory ir įprastas HTTP kelias

Tarpinis paketas194 priimtas; visas pavedimas ACTIVE ir neužbaigtas. Runtime7e9bb96 / PR26, companionc7e0c9a / PR6. Visos keturios deklaruotos suites194/194 regression-52.log, paired directory6PASS ir exact75aa39page305asset build PASS. Įprastas HTTP po central origin/session/CSRF/site patikrų siunčia signed trumpalaikę užklausą tik active matching organization/epoch objektui. Seni ID išlieka; naujų ID indeksas bei prarasto indekso atkūrimas priimti. Search/profile, client/professional/operator workspace, session memberships ir fresh-OTP customer export skaito current target; sealed source nelaikomas fallback.

Actual isolated8843 browser: klientas sukūrė booking_73f2c37f-20c8-4389-92ac-5436b7ae4f8a,17:00–18:00/25€, target vienas booking/mail, source naujo vizito neturi. Tas pats ID po dviejų stores restart matomas kliento detalėje ir owner kalendoriaus dialoge.320/390/820/1440 vaizdai peržiūrėti, dokumento/dialogo matavimai saugomi. Pirmas mixed migrated/unmigrated owner workspace503 išsaugotas, serverio fallback tik neperkelto org keliui pataisytas ir Node/actual Workers/browser retest priimtas. [Priėmimas](platform-upgrade-20261007/ACCEPTANCE.md).

Lieka įvykdomi I02: new central identity/cache admission, latest global preferences/taxonomy/name handling, favorites/metrics/catalogue control, target mail admission/alarm ir media transfer; production target binding/migration nėra įjungti. Pilot fanout sąmoningai ribotas32 targets, target atsakymas1MiB, mutacijų nonce journal1024/4MiB. Nauja neprijungta identity negali palikti orphan hold; createClient/grantMembership target keliui dar fail closed. Faktiniai SMTP/piloto/retention vartai ir I04 likučiai išlieka. Conditional deploy leidimas galioja, full upgrade sąlyga dar neįvykdyta.

## 2026-10-08 — aktyvus upgrade: vieno writer perdavimo protokolas

Tarpinis paketas187 priimtas; visas vietinis pavedimas ACTIVE ir neužbaigtas. Runtime4133849 / PR26, companionc7e0c9a / PR6.187/187 keturių manifest suites regression-49.log, final authority5PASS ir exact75aa39page305asset build PASS. Atskiras target atomically paruošia patikrintą kalendorių, bounded own identity/preferences/taxonomy caches, outbox ir reminder jobs; lieka fenced. Tik signed source seal leidžia active target. Actual Workers patvirtino retained hold→new booking/replay, exact old ID/price snapshot, two-object restart, SQL writer/mail/job fences ir post-insert/delete rollback. [Kontraktas ir likę keliai](platform-upgrade-20261007/STORAGE.md), [įrodymai](platform-upgrade-20261007/ACCEPTANCE.md).

Atšaukti leidžiama tik neaktyvią kopiją ir su source abort proof; naujos aktyvios kopijos, jos vizitų ar aukštesnės epoch senas abort neperrašo. Target neturi HTTP dispatcher, production binding/routing ar mail alarm; mailAuthorityfalse. Global auth/preferences/identity ir taxonomy tebevaldo source/directory, target kopijos nėra antras jų writer. Media-bearing organization prepare atmetamas iki actual blob migration. Šis private runtime priėmimas nėra full public routing ar production migracija.

Kitas įvykdomas darbas: directory/Worker routing ir opaque naujų ID resolution, central identity/preferences/customer fanout, current public projection ir target mail/media activation, likusi UI matrica. SMTP/piloto/retention/larger-adapter faktai atskiri ir nepriklausomo vietinio darbo nestabdo. Production upgrade nepaskelbtas; savininko sąlyginis leidimas galioja, viso upgrade užbaigimo sąlyga dar neįvykdyta. Žemiau istorija.

## 2026-10-08 — aktyvus upgrade: sesijos atkūrimas ir pasiūlymų būsenos

Tarpinis paketas182 priimtas; visas vietinis pavedimas ACTIVE ir neužbaigtas. Runtimed85cdc7 (sesijos barrier),b7f244f (pasiūlymų/priedų UI),2e39897 (tinkamumas ir matoma dialogo klaida), PR26 / companionc7e0c9a / PR6.182/182 keturių manifest suites regression-47.log ir exact75aa39page305asset build PASS. Vienas sesijos refresh aptarnauja konkuruojančius kvietimus; pasikeitus paskyrai, laukęs write neatkartojamas. Actual expired-session recovery keturiais pločiais priimtas.

Actual named synthetic8841 priimti nepilno/private pasiūlymo validation, archived pasiūlymo išjungimas, required-addon error→45min25€ actual laikas, operatoriaus priedų peržiūra ir expiry→matomas dialogo alert→Escape→public exclusion→operatoriaus renewal→public restored. Meistro perspėjimas ir operatoriaus galiojimo būsena pataisyti. Originalūs approved75aa baitai/datos išlieka. [Įrodymai ir jų ribos](platform-upgrade-20261007/ACCEPTANCE.md), [likusi matrica](platform-upgrade-20261007/UI_MATRIX.md).

Dabar vykdomi I02 target write authority / routing / directory / outbox ir likusios taikomos UI būsenos. Read-only staging3231472 nėra aktyvus kalendoriaus writer. SMTP/piloto/retention ir larger-adapter faktai tebėra atskiros priklausomybės; nepriklausomas vietinis darbas tęsiamas. Production upgrade nepaskelbtas; savininko leidimas diegti baigtą visą upgrade galioja, sąlyga dar neįvykdyta. Ankstesni įrašai žemiau yra istorija.

## 2026-10-08 — aktyvus upgrade: sustabdytas writer ir organizacijos kopija

Tarpinis paketas175 priimtas; visas vietinis pavedimas ACTIVE ir neužbaigtas. Runtime3231472 / PR26, companionc7e0c9a / PR6. Source kalendoriaus freeze turi SQL apsaugą ir prieš seną JSON writer, ir prieš tiesiogines normalized scope mutacijas. Immutable indexed snapshot perduodamas bounded pasirašytais puslapiais į kitą SQLite objektą; failure / replay / restart / abort priimti Node ir actual Workers. Kopija yra read-only ir neturi booking/mail authority. Naujas target writer, routing/directory, global identity/preferences/replay bei outbox/projection activation dar įvykdomi darbai — negalima šio pagrindo vadinti pilna fizine migracija. Kitas veiksmas: užbaigti šias sąsajas bei likusią UI matricą. [Tikslios ribos](platform-upgrade-20261007/STORAGE.md), [įrodymai](platform-upgrade-20261007/ACCEPTANCE.md).

175/175regression-43.log, final paginated-handoff6PASS ir exact75aa39page304asset build. SSR katalogas atskirtas nuo nesusijusio straipsnių paketo read: controlled malformed package anksčiau slėpė /paslaugos su404, dabar realus katalogas200, tušti/unknown lieka404. Production upgrade nepaskelbtas. Savininko sąlyginis leidimas diegti baigtą visą upgrade galioja; sąlyga dar neįvykdyta. Faktiniai SMTP/piloto/retention ir larger-adapter vartai ankstesniame įraše išlieka, jų trūkumas nestabdo kitų įvykdomų darbų.

## 2026-10-08 — aktyvus upgrade: organizacijų kūrimas ir rolių kalendorių priėmimas

Paketas priimtas, visas vietinis pavedimas ACTIVE ir neužbaigtas. Runtime4e38a55 (onboardingb04ed48), PR26 / companionc7e0c9a / PR6. Nauja organizacija ir rankinis klientas kuriami indexed SQL transakcijoje, išlaikant account-wide limitą ir esamą tapatybę; failure/rollback/restart priimti Node ir actual Workers.168/168 paired regresijų ir exact75aa39page304asset build PASS. Registratūros ir meistro calendar normal320/390/820/1440, empty/error/keyboard/recovery390, role-restricted nav ir partial-visit dialog priimti actual named synthetic8841. Calendar/retry fokusas pataisytas. [Aktualios ribos](platform-upgrade-20261007/PROGRESS.json), [actual UI matrica](platform-upgrade-20261007/UI_MATRIX.md), [įrodymai](platform-upgrade-20261007/ACCEPTANCE.md).

Savininkas tiesiogiai autorizavo gyvą diegimą **kai visas upgrade baigtas**. Sąlyga dar neįvykdyta; dalinio paketo nepervadinti visu priėmimu.2026-10-08 read-only Wrangler deployments check patvirtino esamą f8eba745100%; naujo production deployment, DB migracijos ar pašto nebuvo. Dabar vykdomi: I02 fizinis organizacijų routing / migracija, global operator keliai ir likusios konkrečios UI_MATRIX būsenos. Faktinės priklausomybės tebėra realus pilotinis teikėjas / SMTP gavėjas ir gavimas, saugojimo tvarka bei didesnio medijos adapterio aktyvavimas. Ankstesni checkpoint žemiau yra istorija.

## 2026-10-08 — aktyvus upgrade: indeksuotos tapatybės ir pradinio įkėlimo atkūrimas

Vietinis visas pavedimas ACTIVE, neužbaigtas. Runtime0617086 / PR26, companionc7e0c9a / PR6. Naujos ir importuotos patvirtintos paskyros tapatybė kuriama indexed SQL patch vienoje auth transakcijoje; account/challenge/session rollback ir actual Workers restart priimti. Public boot/media/content GET turi ribotą laukimą ir atsakymo patikrą; startup klaida turi native keyboard retry, išlaiko URL ir filtrus.167/167 paired Node/Workers PASS; exact75aa39page304asset kandidatas nepaskelbtas. [Aktualios ribos](platform-upgrade-20261007/PROGRESS.json), [actual UI matrica](platform-upgrade-20261007/UI_MATRIX.md), [įrodymai](platform-upgrade-20261007/ACCEPTANCE.md).

Likę dabar vykdomi darbai: fizinis organizacijų routing / migracija, organization creation/global operator keliai ir taikomos desktop/mobile UI klaidų būsenos. Realus meistro pilotas, SMTP gavimas, trynimo vykdymo tvarka ir didesnio medijos adapterio aktyvavimas laukia konkrečių faktų; tai nestabdo kitų vietinių darbų. Production platus upgrade nepaskelbtas; gyvas siauras39page turinio leidimas ir jo originalios datos išlieka. Žemiau ankstesni checkpoint yra istorija.

## 2026-10-07 — aktyvus platformos darbas ir atskiras turinio leidimas

Platus upgrade tebėra ACTIVE PR26. Paieškos rezultatai turi atskirus paslaugų, salonų ir meistrų tipus, teisingas darbuotojo kainos ribas ir laikus, patvirtintų koordinačių žemėlapį. Katalogo, pasiūlymų, prieigų, filialų, SQL eilučių ir paieškos patikros: 166 / 166 paired Node + Workers PASS. Faktiniai 320 / 390 / 820 / 1440 px ekranai be horizontalaus išstūmimo. Kelių paslaugų vizitas, visos sekos perkėlimas ir segmentų kalendorius priimti izoliuotai. Fazės ir atskiras meistro / kėdės užimtumas priimti izoliuotai. Priminimai ir laukiančiųjų pasiūlymai priimti izoliuotai. Pakartotinė rezervacija, privačios kortelės ir OTP eksportas priimti izoliuotai; trynimo vykdymas laukia faktinės saugojimo tvarkos. Registracijos taisyklės, ataskaitos ir skundų žurnalas bei peržiūrima galerija su paslaugų nuorodomis priimti izoliuotai. Indeksuoti vieno salono rezervacijos pakeitimai ir tikras filialo rezervavimas / perkėlimas priimti izoliuotai. Teikėjo katalogo, taisyklių ir komandos pakeitimai bei private darbo aplinkos naudoja indeksuotus salono/kliento įrašus. Tikras laiko konfliktas ir network recovery priimti. Fizinis organizacijų routing, didesnė medija ir visa UI matrica tęsiami. [Aktualus progresas](platform-upgrade-20261007/PROGRESS.json), [įrodymai](platform-upgrade-20261007/ACCEPTANCE.md).

Atskiras reviewed turinio batch30 gyvas madbeauty.lt: runtime b7a34b1, Worker f8eba745-b8ef-446e-aeff-3c8b95c762bd, 39 puslapiai / 180 tikrų WebP, dabar 7 vieši ir 32 pagal išlaikytas ateities datas. Narrow PR30 receipt 6777e97 ir writer PR10 nepriklausomas hosted acceptance 8ce36cf. Šis turinio leidimas nekeičia plataus upgrade production būsenos: platformos upgrade dar nepaskelbtas. Toliau pateikti senesni leidimai ir pauzės yra istorija.

## 2026-10-07 — upgrade pirmas uždaras kelias veikia, darbas tęsiamas

Aktualus visas 0–3 upgrade tebėra ACTIVE PR26. Pirmas katalogas → privatus pasiūlymas → operatoriaus versija → actual intervalas → rezervacija patikrintas Node ir izoliuotame Workers su SQL restart bei browser. Katalogo ir 103 miestų combobox, kelių darbuotojų variantai, migracija, meniu/priedų/tvarkymo/CSV pagrindas jau yra šakoje; likusių modulių ir pilnos UI matricos priėmimas dar vykdomas. Tai nėra production perjungimas ar viso upgrade COMPLETE. Dabartinis entrypoint: `platform-upgrade-20261007/preview.mjs` (own8841 + exact reviewed V2 SHA argumentai). Įrodymai ir ribos: [ACCEPTANCE](platform-upgrade-20261007/ACCEPTANCE.md). Source bazė159d7d7, branch ai/madbeauty-platform-upgrade-20261007; source runtime commit įrašomas šiame priėmime po check.

# Madbeauty — dabartinis įgyvendinimas

## Pilnas platformos upgrade atnaujintas — 2026-10-07

Savininkas tiesiogiai paprašė pradėti suplanuotą platformos upgrade; ankstesnė plataus darbo PAUSED būsena panaikinta. **Režimas: vietinis veikiantis upgrade ir izoliuotas Workers kandidatų priėmimas, darbas ACTIVE.** Šaka `ai/madbeauty-platform-upgrade-20261007`, bazė159d7d7. [Apimtis ir tęstinumas](platform-upgrade-20261007/README.md), [API ir migracijos kontraktas](platform-upgrade-20261007/API.md), [pilnas planas](upgrade-plan-20261006/PLAN.md). Pirmas rezultatas — pilnos taksonomijos meistro pasirinkimai, privatūs pasiūlymai, variantai su tinkamais darbuotojais, paieška pagal tikrą visą laiką ir patvarus hold/confirm. Toliau tęsiami kiti įvykdomi plano moduliai.

Publikuotas approved V2 paketas/source897ba83 ir Workeredf429e9 išlaikomi. Turinio generatorius/review/export yra PR10 atsakomybė. Production klientų DB, snapshots, DO tapatybė, secrets/mail/DNS ir nemokamo piloto modelis nepakeisti šiuo pavedimo atnaujinimu. Platesni mokami/integracijų aktyvavimai turi savo tikrus faktinius vartus. Žemiau pateiktos ankstesnės pauzės yra istorinė būsena.

## Gyvas patvirtintas V2 turinio paketas — 2026-10-07

Turinio sesijos tikras reviewed V2 release `b208596faea613be548c15423ec691c3d1cc01b2f0b1dcdcfb80f7411ea8fdd5` įdiegtas į tą patį madbeauty.lt Worker. Versija **edf429e9-2409-49bb-bf2b-88b5d53628f8**, runtime source897ba83 / PR24. [Priėmimas ir pakartojimo kelias](v2-release-20261007/README.md), [tikras deployment kvitas](v2-release-20261007/RECEIPT.json). Devyni tikrai patvirtinti puslapiai; dabar vieši septyni (home, indeksas, redakcija, organizacijos autorius, trys gidai), du ateities gidai lieka404 iki2026-10-13T07:00:00Z. Approved bytes ir datos nepakeisti.

92/92 testai, exact shadow import, admission, production dry-run PASS. Actualhost17pages/134assets/7private boundaries, due25media exact bytes, future5unsharedmedia404, JSON/schema/canonical/sitemap/LLM exclusion PASS. Visos257nationalSSRroutes/noindex/103cityoptions PASS;48extensionsPLANNED,0localREADY. Actual desktop1280/mobile390 indeksas, retained straipsnis, authorlink ir approvedhomefragment, loadedresponsiveimages ir0overflow PASS. Indekso/body/home/featuredimage renderer trūkumai pataisyti. Ta pati DO/secrets tapatybė, jokios DB/mail/DNS migracijos; rollback3ef780b8.

Tikras compiled reviewed paketas izoliuotai patikrintas realnow/T−1ms/T:7/7/9 pages,25/25/30media,14typed commerce href ties publikavimo laiku. Actualhost post-date elgesys dar **UNVERIFIED iki tikros datos**. PR10 writer valdo generavimą/review/export; PR24 nišos runtime/hosted acceptance. **Platesnis platformos upgrade tebėra PAUSED.** Toliau esantys ankstesni release įrašai yra istorija.

## Gyvas turinio pagrindo release — 2026-10-07

Savininkas turinio sesijoje paprašė užbaigti reikalingą generavimo ir publikavimo infrastruktūrą. Gyva Worker versija **3ef780b8-bfde-436d-ae01-f2cb1f842e80**, runtime source797a2a2 / foundationc1f1593. [Release ir likę vartai](content-publication-20261007/README.md), [tikras kvitas](content-publication-20261007/RECEIPT.json). Viešas content-targets.json200:257 nacionaliniai core browse tikslaiREADY,48 plėtiniųPLANNED,0 miestųREADY, nes actual patvirtintos pasiūlos nėra. Visos257SSRroutes/canonical/noindex/103miestųoptions patikrintos, catalogue ne sitemap; tušti miestai404.

Local92/92PASS, immutable V1 package7pages/20WebP išlaikytas; hosted17pages/124assets/7boundaries/3discovery ir medijos baitaiPASS. Actual desktop1280/mobile390 navigacija ir empty/Enter/0overflow, esamas gidas su tikru responsive vaizduPASS. Ta pati DO tapatybė/secrets, jokios DB migracijos/mail/DNS writes. Naujas privatus straipsnis neapproved ir nepublic; tikras full reviewed V2 home/retained/reference release/shadow/public priėmimas dar reikalingas. Sintetinis compiled laiko ribos testas nėra šio straipsnio review ar viešas V2 priėmimas. Private studio/generator valdo PR10. **Platesnis platformos upgrade tebėra PAUSED.**


## Aktualus straipsnių / katalogo pagrindas — 2026-10-06

Savininkas po pilno plano pauzės paprašė pirmiausia paruošti pagrindą turinio sesijai rašyti teisingai susietus straipsnius. **Šio pavedimo režimas: lokalus veikiantis pagrindas + Workers candidate; pilnas atnaujinimas tebėra PAUSED.** [Sąsaja ir entrypoint](content-foundation-20261006/README.md), [V2 kontraktas](content-foundation-20261006/CONTRACT.md), [priėmimas](content-foundation-20261006/VALIDATION.md). Source savininkas `ai/madbeauty-content-foundation-20261006`, bazė b422165. Turinio sesija PR10 patvirtino, kad305 node /225 procedūrų,103 miestų ir resolverio eksportų pakanka žemėlapiui, sidecar ir struktūrizuotiems V2 juodraščiams.

Pagrindo lokalus pavedimas užbaigtas: registry / SSR national→city→approved offer / empty404 / V2 immutable intake, projection, rich render, schema ir discovery. Regresija89/89; actual desktop1280 ir mobile390 kategorijos, procedūros, miesto ir V2 straipsnio peržiūra. Provider/workspace meniu lieka ankstesni10 ID; pilnas variantų / meistro procedūrų pasirinkimas ir kiti plano moduliai pristabdyti. Viešas naujo katalogo release neatliktas; gyva versija402a0fb5… lieka ankstesnė. Static draft registry visi planned, neleisti future href.

Kita konkreti priklausomybė: turinio sesijos private studio plan→V2 CLI/import kelias dar atskirai nepriimtas; V2 add/edit jau turi esamą modelį. Agentas gali rengti tyrimą ir struktūrizuotus juodraščius dabar pagal perduotą kontraktą. Vienos tikros straipsnio revizijos review/export/actual preview ir production deployment priėmimas lieka iki viešo leidimo; GSC / SEO pozicijos ir225 procedūrų temų aprėptis šiuo pagrindu nepriimti. Tai neužbaigia pilno platformos pavedimo.

## Aktualus katalogo atnaujinimo planas — 2026-10-06

Savininkas paprašė platformos peržiūros ir pilno tobulinimo plano pagal Treatwell kategorijas bei Fresha. **Šio pavedimo režimas: auditas ir planas.** Parengtas [pilnas planas](upgrade-plan-20261006/PLAN.md), [interaktyvi peržiūra](upgrade-plan-20261006/index.html) ir [41 darbo eilė](upgrade-plan-20261006/BACKLOG.json): 14 pagrindinių sričių, 194 procedūros, 7 papildomi plėtiniai, kelių paslaugų pasirinkimas meistrui, variantų / paieškos / rezervavimo / migracijos sutartys. [Įrodymai ir ribos](upgrade-plan-20261006/AUDIT.md). Naujo katalogo runtime dar neįgyvendintas; šis paketas nekeičia gyvų paskyrų, mokėjimų ar turinio kalendoriaus.

Planas remiasi `c6516b7` ir to paties domeno gyvu dropdown pataisymu: visi 10 esamų tipų bei bendri 103 Lietuvos miestai. Gyva pataisymo versija `402a0fb5-bd02-4a78-8a3b-de083aeb68e8`; [pataisymo kvitas](search-fix-20261006/RECEIPT.json). Ankstesniame gyvo release įraše žemiau nurodytas 119 assetų skaičius yra istorinis; paieškos pataisymo patikra apėmė 120. Naujų kategorijų, pilnos laisvo laiko paieškos ir meistro kelių procedūrų pasirinkimo šis senas PASS neapima.

Failų atsakingasis: `ai/madbeauty-upgrade-plan-20261006`; tik `upgrade-plan-20261006/**`, ši pradžios nuoroda ir savi WORKSTREAMS įrašai. Planavimo paketo priėmimas — [VALIDATION](upgrade-plan-20261006/VALIDATION.md). Kitas įgyvendinimo rezultatas: PLAN skiltyje „Pirmasis konkretus įgyvendinimo paketas“ aprašytas taksonomijos → pasiūlymo → laiko → rezervacijos kelias. Mokėjimai, pranešimų kanalų plėtra, trečiųjų šalių kontaktavimas ir papildomų sričių aktyvavimas šio planavimo metu nejungiami. Žemiau išlaikoma ankstesnių įgyvendinimo etapų istorija.

## Gyvas Cloudflare paleidimas — 2026-10-06

Veikia https://madbeauty.lt: Hostinger domenas prijungtas, Cloudflare DNS/TLS ir HTTP/www nukreipimai patikrinti. Produkcinis SQL Durable Object adapteris saugo paskyras, rezervavimus, privatų media ir laiškų eilę; realus info@pinet.lt OTP → operatorius → serverinis logout patikrintas, laiškas gautas pagrindiniame INBOX. Vieši17 puslapių/119 assetų/7 private404 ir canonical discovery PASS; desktop ir390px home/login vaizdai priimti. Pirmasis realių meistrų katalogas tuščias, užpildomas tik tikrais patvirtinamais profiliais.

Naujas Workers6, ankstesnis backend/platform/foundation74, studio33, core51 testų PASS. Actual Cloudflare Images EXIF/alpha/metadata/tall-image PASS; Miniflare apribojimas ir originalus FAIL užrašyti atskirai. Piloto saugojimo ribos, eilės, retention, privatus PITR bookmark ir atkūrimo/rollback tvarka dokumentuoti [OPERATIONS](cloudflare/OPERATIONS.md), faktiniai [RELEASE įrodymai](cloudflare/RELEASE.json). Šaltinis perduodamas draftPR8, main merge atskiras.

Ankstesnės UI69/70 priėmimo ribos bei sustabdyta demo/gallery peržiūra išlieka. Naujas produkcinis Lighthouse, paieškos indeksavimas, paklausa ir veikimo/apkrovos garantija nematuoti; mokėjimai/FB/voice neįjungti. Žemiau ankstesnės sesijos istorija aprašo tuo metu buvusias priklausomybes.

<!-- UIUX_V3_CURRENT -->
## Aktualus UI/UX V3 rezultatas — 2026-10-06

Vietinis funkcijų ir normalios desktop/mobile sąsajos pavedimas užbaigtas su savininko demo medijos išimtimi. Tai apima69 iš70 inventoriaus paviršių; public-gallery ir demo fotografijų/profilių estetika savininko sustabdyta. 219 V3 kadrai, 202 peržiūrėti konkretūs įrašai; baseline, pereinamo dažymo ir smooth-scroll kadrai nelaikomi PASS. Peržiūrą atliko tas pats įgyvendinantis agentas.

Veikia pilnas kliento rezervavimas→perkėlimas→atšaukimas→reload; meistro kalendorius ir rankinis vizitas; patvarios inquiry/waitlist užklausos ir jų būsenos kliento paskyroje; abiejų rolių pokalbiai; completed vizito atsiliepimas→operatoriaus approval/rejection; profilio revizija→operatoriaus patvirtinimas; kontaktų pranešimas→operatoriaus eilė. Tikras ryšio nutrūkimas išlaikė įvestą užklausą, pakartojimas po restart išsaugojo vieną įrašą. Tikras dviejų skirtukų409 neperrašė naujesnės paslaugos versijos. Visa tai privatus QA su example.com paskyromis.

Regresija **74 PASS /0 FAIL**: backend V17 **36**, platform/HTTP/calendar V11 **29**, foundation V11 **9**. Rinkinių manifestas įrašytas prieš paleidimą; pridėtas vienas prasmingas request-history izoliacijos testas, testų nepašalinta. **32 mjs sintaksės patikros PASS** (įskaitant backend testų failus), tikslūs sourceSHA256 galutiniame kvite. Prisijungusio mobiliojo kalendoriaus Lighthouse V10 **94/100/100/66**, LCP2,56s, TBT25ms, CLS0,094,205927baitai. Matuota pradinė QA darbo vieta, ne trijų meistrų apkrova; privatus noindex. Matavimas atliktas prieš galutinį operatoriaus tuščio turinio teksto pakeitimą; kalendoriaus kodas nepakito, pirmoji source versija išlaikyta.

Normalūs vaizdai priimti kiekvienam nestabdytam paviršiui. Loading/error/validation/permission/empty būsenų bendro komponento arba serverio kontrakto įrodymai matricoje pažymėti atskirai nuo konkretaus ekrano naršyklės bandymo. Fizinis200%zoom, OS reduced-motion, production įrenginiai ir papildoma visų paviršių planšetės matrica lieka UNVERIFIED. Ne visos įmanomos laiko/persidengimo kombinacijos priimtos.

Gyvas SMTP/INBOX, DNS/TLS/hosting/deploy, production katalogo SSR/SEO, tikri teikėjai ir paklausa yra atskiros neprijungtos priklausomybės. Mokėjimai/FB/voice neįjungti. A–Z rezultatas nepakeistas: vietinis7,6/gateReady=false; gyvas paleidimas0, paklausa nematuota. Root8786 ir bendras core nepakeisti.

**Paketas užbaigtas:** V3UX23–29 ir tuščio turinio paaiškinimas. **Vietinis funkcijų bei normalios desktop/mobile apimties pavedimas užbaigtas:**69paviršiai, savininko media išimtis. **Laukiama konkrečių priklausomybių:** fizinių browser/OS nustatymų, production adapterio/hosting/pašto ir tikrų komercinių faktų. Papildoma planšetės aprėptis matricoje UNVERIFIED, nėra visų įrenginių PASS.

Entry point: `node sites/madbeauty/prototype/app-server.mjs` → [vietinė platforma](http://127.0.0.1:8788/meistrui/kalendorius). Own procesas8788/PID7392; root8786/PID21428 nepakeistas. Failų ribos: sites/madbeauty/, sites/madbeauty.md, research/madbeauty-implementation/ ir savas WORKSTREAMS įrašas.

Aktualus [priėmimas](uiux/ACCEPTANCE.md), [kelionės](uiux/JOURNEYS.md), [tikslūs UNVERIFIED](uiux/REMAINING_GAPS.json), [galutinis kvitas](../../research/madbeauty-implementation/uiux-functional-final-v3.json).

## Ankstesnių etapų istorija

## Istorinis UI/UX V2 rezultatas — 2026-10-06

**Vietinės pataisos priimtos; visų 70 ekranų priėmimas tęsiamas.** Pagerintas trijų meistrų kalendorius su trumpais persidengiančiais vizitais, rankinio vizito kainos/trukmės santrauka, kliento ir vizito detalės bei 320 px antraštė. Actual naršyklės rankinis vizitas → perkėlimas → atšaukimo validacija → atšaukimas → reload PASS; galutinė to paties vizito canceled/version3 būsena patvari. Darbo vieta privati, nepatvirtinta viešam katalogui.

Regresija **73 PASS**: backend V16 35, platform/HTTP/layout V10 29 ir atskirai foundation V10 9. 27 nauji UI kadrai, 23 priimti konkretūs įrašai, devyni tiksliai pritaikyti ankstesni būsenų įrodymai. 13 JS sintaksės patikrų PASS. Mobiliojo prisijungusio kalendoriaus Lighthouse V9 **94/100/100/66**; tai vietinis privatus noindex puslapis, ne visos platformos ar production rezultatas.

Entry point: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Preview naudoja patvarų backend ir izoliuotą privatų QA katalogą. Šios sesijos failų ribos: tik `sites/madbeauty/`, `research/madbeauty-implementation/` ir savas WORKSTREAMS įrašas. Bendras core ir root 8786 nepakeisti. Demo profilių ir vaizdų peržiūra neatnaujinta.

Aktualus priėmimas: [uiux/ACCEPTANCE.md](uiux/ACCEPTANCE.md), patikrintos kelionės: [uiux/JOURNEYS.md](uiux/JOURNEYS.md), tikslūs tarpai: [uiux/REMAINING_GAPS.json](uiux/REMAINING_GAPS.json). Toliau nepriimti pilni inquiry/waitlist, kliento atsiliepimo, operatoriaus peržiūros ir booking-staff pasirinkimo keliai; dalis viešų normalios būsenos bei visų 70 ekranų būsenų/desktop/mobile įrodymų. Fizinis zoom, OS reduced-motion ir production naršyklių/įrenginių patikros UNVERIFIED. A–Z vietinis 7,6 su gateReady=false nepakeltas; SMTP/INBOX, DNS/deploy, visas katalogo SSR/SEO, tikri teikėjai ir paklausa atskiri nepriimti vartai.

## Istorinis UI/UX V1 priėmimas — 2026-10-06

Vietinės platformos formos, auth/booking atkūrimas, search/calendar ir variantų pasirinkimas pagerinti. 146 actual route/viewport įrašų per 46 paviršių,320/390/640/820/1440px. BackendV15 35/35, platformV9 30/30, HTTPV1 4/4;69PASS. Authenticated calendar LighthouseV8 94/100/100/66. Aktualios ribos ir70matrix: [uiux/ACCEPTANCE.md](uiux/ACCEPTANCE.md). Full70/all-state, physical zoom/reduced-motion ir production vartai vis darUNVERIFIED. Demo media/profilių peržiūra neatnaujinta.

## Ankstesnis platformos priėmimas

2026-10-06 · **Vietinė platforma įgyvendinta; išplėstinis priėmimas su ribomis**. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root8786 neliečiamas. Savininko naujausias nurodymas: nebeperžiūrėti demo vaizdų/profilių ir gerinti platformą.

Veikia email-only vietinis auth, atskiros narystės, naujos meistro darbo vietos ir kliento sukūrimas, pirmas rankinis vizitas dar prieš viešinimą, serverio laiko paieška, atomic hold/confirm/change/cancel, kliento ir meistro ta pati vizito projekcija, pokalbiai, profilinių versijų ir atsiliepimų moderavimas. Nauji klientai ir inquiry/waitlist klientai matomi tik savo darbo vietoje. Kalendorius turi7 dienas, datą/komandos filtrą, blokus, soft atlaisvinimą ir buferių/rezervacijų konfliktų apsaugą. Priedų redaktorius išlaiko kelis arba nulį priedų; paslaugos išjungimas saugo būsimus vizitus.

**Patikra:** backend V14 **35/35**, platform V7 **30/30**. Actual browser pirmas provider→client→manual visit, kliento email login ir restart persistence PASS; `platform-functional-final-v1.json` / `durable-functional-receipt-final.json`. Prisijungusio mobiliojo kalendoriaus Lighthouse V7 **94 performance /100 accessibility /100 best-practices /66 SEO**, LCP2.57s, TBT36.5ms, CLS0.094,194294bytes; privatus noindex sąmoningas. V6 84 ir ankstesnės klaidos išlaikytos.

70 ekranų/panelių įgyvendinimo ir konkrečių naršyklės įrodymų matrica: `SCREEN_STATUS.json`; originalus `SCREEN_INVENTORY.json` istorinis ir neperrašytas. Tai nėra visų70 × visų būsenų PASS. Platformos sample patikrintas1440/820/320, vieši paviršiai1280/390; fizinis įrenginys/visas zoom matrica nepatikrinti. Demo media jau120 originalų/600WebP/40rinkinių; paskutinė instrukcija sustabdė tolimesnę jų peržiūrą.

Turinio core:7 approved puslapiai/3 gidai/20WebP, common importer/projection/review-release, SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579, exported-not-deployed. 3/sav.,6mėn.,10:00Vilnius reiškia76planavimo langus, ne76straipsnius.

**Atskiri nepriimti vartai:** SMTP ir INBOX/el. pašto nuosavybė, tikri teikėjai/teisės/brand, visas katalogo production SSR/SEO/LLM, DNS/TLS/komercinis hostingas/deploy, production privacy/backup/monitoring, reali paklausa. Mokėjimai/FB/voice/gyvi laiškai neįjungti. A–Z85 ir scorer: `PHASE-1-AUDIT.md/json`, `PHASE-1-AUDIT-SCORE.json`; jokio10/10/domain-ready teiginio.



Galutinė papildoma pataisa: reschedule variantas prieš patvirtinimą rodo kainą ir trukmę. Atomic change atnaujina snapshot/meistrą/resursą, tikrina konkretaus vizito prieigą ir leidžia savo esamą nepublikuoto meistro vizitą perkelti klientui. BackendV13 pirmas naujo kontrakto testas FAIL: aptikta approval-dependent reschedule spraga. Pataisyta; V14 35/35PASS2049.8453ms, platformV7 30/30PASS2362.7397ms. V13FAIL išlaikytas. Actual320px reschedule panelė ir native dialog replacement focus retestuoti;1280px savaitė dabar rodo visus7stulpelius.

## Istoriniai įrašai (ankstesnė apimtis; ne dabartinis priėmimas)

# Madbeauty — actual įgyvendinimas

## Dabartinis entrypoint ir priėmimo ribos

2026-10-05 · **IN_PROGRESS / vietinis veikiantis pilotas**. Agentas rašo tik Madbeauty namespace ir sutartus studio tenant duomenis. Aktualus entrypoint: `node sites/madbeauty/prototype/app-server.mjs` → http://127.0.0.1:8788/. Root komponentų kit 8786 nestabdomas. Dabartinis serverio režimas preview: vienkartiniai 40 solo / 6 salonų įrašai atskirame DB, tas pats patvarus auth / booking backend. `MADBEAUTY_DATA_MODE=unseeded` atidaro pirminį izoliuotą registracijos QA DB; `demo` yra ankstesnis browser mock. `runtime/` privatūs duomenys ir OTP capture nėra paketo ar Git turinys.

| Modulis | Autorizuota ir actual | Priėmimas / source |
|---|---|---|
| Produktas / 70 ekranų UI | Savininko pasirinktas black/white/violet homepage yra visų paviršių kokybės etalonas. Savitos search/profile/booking/client/workspace/operator/legal/article kompozicijos | Inventorius įgyvendintas ankstesniame etape; galutinė individuali serverio desktop/mobile/keyboard matrica vyksta |
| Meistro ir kliento email-only | Savininko 2026-10-05 pavedimas per root: vietinis veikiantis backend, atskiros paskyros, patvarus vizitas | `backend/`, `BACKEND_DECISION.md`, 27/27 V7 ir actual `v2-server-*` / `v2-unified-server-*` |
| Testinė pasiūla / medija | ≥40 individualių meistrų, kiekvienam portretas + 2 atskiri vaizdai; demo kilmė įrašuose, normali produkto copy | **120/120** accepted originalų / 600 WebP, 40 pilnų rinkinių; `PROFILE_ASSET_MANIFEST_V2.json`, batch 001–019. Galutinis visų profilių crop priėmimas dar eilėje |
| Turinio core | Tas pats madbeauty siteId / V1 studio review-release-import / common projection-schema-SEO | **7 approved puslapiai / 3 gidai / 20 media failų**, `content/INITIAL_RELEASE_RECEIPT.json`, `CONTENT_READINESS.md`. SHA dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579. Exported-not-deployed |
| Turinio politika | Savininko patikslinimas per root: 3 straipsniai/savaitę, 6 mėn., 10:00 Europe/Vilnius | Planavimo langai ≠ parengti straipsniai. Esami publishAt / 5 approved puslapiai nepakeisti; `content-initial-release-import.json` |
| Gyvos operacijos | SMTP / INBOX, tikri teikėjai, DNS / hosting / deploy, mokėjimai, FB, voice, GSC ir paklausa neįjungti arba nepriimti | Atskirai UNVERIFIED, ne vietinio užsakymo atsisakymas |

Actual common first-guide draft / before-after publishAt / revoked-target / unknown-host / no-demo HTTP patikros PASS. Kontroliuojamas laikrodžio replay nėra istorinis domeno paleidimas. Bendras SEO tik importuotiems turinio puslapiams; viso katalogo production SSR atskiras vartas. `CORE_FEEDBACK.md` atskiria patirtas problemas ir siūlomus pakeitimus.

Kitas rezultatas: galutinis 3 gidų HTML / SPA schema / CTA, visi 40 profilių, Fresha per-kelio palyginimas ir 70 ekranų actual serverio priėmimas; A–Z/scorer ir prisijungusios darbo vietos Lighthouse. Jokio 10/10 / production-ready / domain-ready teiginio.

**Žemiau išlaikytas ankstesnio etapo įrašas turi savo istorinę apimtį. Dabartinę būseną nustato šis pradžios registras, ne jo frontend-only ar vaizdų tarpiniai skaičiai.**

## Ankstesnis išplėsto užsakymo tarpinis įrašas (2026-10-05)

Savininko papildymas pakeitė frontend demonstracijos priėmimą: galutinė produkto kalba visuose 70 ekranų, ≥40 skirtingų meistrų su individualiais portretais ir dviem portfolio / aplinkos vaizdais, veikiantis email-only prisijungimas ir meistro → kliento rezervavimas. Žemiau išlikęs demonstracijos aprašymas yra ankstesnio etapo istorija, ne dabartinis priėmimas.

- Backend pasirinktas ir įgyvendinamas: Node 22 `node:sqlite`, serverio sesijos / hashed vienkartiniai el. pašto kodai / CSRF / membership teisės / `BEGIN IMMEDIATE` / patvarus užklausų ir pranešimų saugojimas. Sprendimas: `BACKEND_DECISION.md`.
- 27/27 backend testai PASS: `research/madbeauty-implementation/backend-tests-v7.tap` (3873.26 ms). Actual HTTP persidengiančios užklausos — vienas 200, vienas 409; du atskiri procesai / SQLite connection su 60 ir 90 min. vizitais — vienas booking ir vienas outbox. Pirmas bandymas aptiko prisijungimo užraktą; taisymas ir pertestavimas dokumentuoti, neslepiami. V6 išsaugotas su 26 PASS / 1 FAIL: naujame preview kataloge trūko paslaugų active normalizavimo; pataisyta prieš V7. Patikrintos privačios medijos ribos, profilio city/kind revizija, tikros datos uždarymas ir būsimų vizitų išjungimo apsauga. Foundation / platform regresija 30/30 PASS (`foundation-platform-v2.tap`).
- Actual CUA browser provider email registration → profile → 32 € / 60 min. service → pending → atskira operatoriaus paskyra → approved → atskira kliento email paskyra → 2026-10-06 17:00–18:00 booking → 17:30–18:30 reschedule → message → server restart → session ir booking išliko → ta pati registracija meistro kalendoriuje. Įrodymai `v2-provider-*`, `v2-booking-confirmed-desktop.png`, `v2-client-after-server-restart-desktop.png`. Grafiko redagavimo ir cancel browser dalys dar atskiroje eilėje; testai jas tikrina.
- Pradinio unseeded serverio naršyklės patikra papildyta: meistras atsakė, klientas matė tą patį serverio pokalbį, klientas atšaukė vizitą, atšaukimas išliko po reload. Meistro absolute closedDate ir weekday pakeitimas išliko; būsimą vizitą panaikinantis weekday pakeitimas atmestas. Įrodymai `v2-server-*` ir `browser-qa-v2.json`.
- Vieningas privatus serverio preview katalogas įgyvendintas atskirame `platform-preview.sqlite`: 40 fiktyvių solo meistrų ir 6 salonai, tie patys auth / transactional booking API naujai registruojamam klientui ir meistrui. Įkėlimas vienkartinis, patvarus; preview failą atidaryti real storage režimu draudžiama. Pradinė `platform.sqlite` su browser QA išlaikyta atskirai. Naujo default preview naršyklės priėmimas dar vyksta. El. pašto transportas šiuo metu tik privatus serverio testų capture, be viešo OTP endpoint. Tai nėra SMTP ar INBOX įrodymas.
- Produkto copy perrašymas ir pastovi tamsi darbo vietos navigacija įgyvendinti, individualių 70 ekranų V2 priėmimas tęsiasi. Kalendorius turi valandų tinklelį ir duration-scaled vizitus, mobile agenda. Deterministinis 40 solo / 6 salonų sluoksnis dabar išsklaido vizitus ryte ir po pietų, tikrina visą intervalą su buferiais, neliečia istorinio foundation seed. 120 vaizdų planas `prototype/PROFILE_ASSET_PLAN_V2.json`; 45 originalai peržiūrėti ir importuoti / 225 WebP; 15 pilnų individualių rinkinių iš 40. Visa šeima NEBAIGTA. P14–P40 dar negeneruotų portretų įvairovės papildymas įrašytas prospektyviai `PROFILE_PLAN_AMENDMENT_001.json`.
- Realios galerijos upload API naudoja MEDIA_CORE `optimizeRaster`, originalai runtime privačiai. Actual browser įkėlė portretą ir du atskirus vaizdus → private profile draft → operatorius peržiūrėjo visas 3 miniatiūras / teises → priėmė versiją → public profile desktop/mobile rodo mediją. Mobile 390 px: visi vaizdai loaded, 360 WebP selected, overflow 0. Įrodymai `browser-qa-v2.json`, `v2-public-profile-approved-media-*.png`; nėra SMTP ar tikrų teikėjo darbų įrodymo.
- Root suderinta turinio eilė papildyta vieno gido brief→draft/assets→fact/link review→approved import→publishAt HTML/index/CTA/schema/sitemap/LLMs proof; prieš adapterio langą shared model/generator code nekeičiamas. Pusmečio generavimas neįjungtas.
- Full 70 ekranų V2, A–Z/scorer, shared SSR / core kontaktų integracija, komercinis hostingas ir realus pristatymas lieka atskiri nepatvirtinti vartai. Jokio production-ready, 10/10 ar paklausos teiginio.

### Ankstesnio privataus frontend etapo istorija

2026-10-05 · sesija 01a10c23-938f-7e62-9674-4b3bfef2dc29. Privati vietinė frontend demonstracija. Originalus SCREEN_INVENTORY ir ankstesni maketai / manifestai neperrašyti.

Preview: http://127.0.0.1:8788/ · start: `node sites/madbeauty/prototype/app-server.mjs`. Tik loopback, visi atsakymai noindex, jokio production sitemap ar LLM eksporto. Root UI kit 8786 procesas nepakeistas ir nesustabdytas.

## Įgyvendinta, tikrinimas vyksta

- Pilnas homepage pagal HUMAN_SELECTED homepage-modern-v2 kompoziciją: tikras HTML, DM Sans, white/black/violet, transparent blur / autohide header, fotografijos, keturių laukų paieška, kategorijos, demo laikų kortelės, tamsus paaiškinimas, trys gidai, darbo kalendoriaus blokas ir footer.
- Routinama paieška / filtrai / scheminis žemėlapis / pagination, paslaugų ir miesto hub, solo / salono profilis, galerija / variantų panelės.
- Paslauga → priedai → meistras → laikas → demo kontaktas → peržiūra → demo rezultatas; užklausa ir waitlist atskirai.
- Kliento, meistro / salono ir operatoriaus paviršiai, redagavimo / moderavimo panelės, onboarding, dienos / savaitės ir mobile agenda kalendorius.
- Trys pilni originalūs gidai, MB Pinet redakcijos ir autoriaus profilis, about/contact/help/privacy/cookies/terms/cancellation/verification tekstai šiam preview.
- Central seed, originalus foundation adapteris ir jo platformos extension; viena mutable modelio projekcija, isolated localStorage namespace ir reset. Foundation 9 testai iki plėtros PASS; galutinės regresijos ir platesnės patikros dar vyksta.
- 2 nauji built-in ImageGen originalai (hero violetinė fotografija, meistrės salonas), 9 WebP per shared optimizeRaster. Esami 11 originalų / 55 WebP ir jų historical manifest išlaikyti.

## Actual priėmimo įrodymai

Bus įrašyti po testų ir actual desktop/mobile/keyboard/flow/SEO/performance peržiūros į `research/madbeauty-implementation/`, `prototype/IMPLEMENTATION_QA.md`, atskirą `SCREEN_STATUS.json` ir A–Z auditą. Šis tarpinis dokumentas nėra full QA PASS.

## Neįjungta / vėlesni vartai

Tikras auth / tenant server security / patvarios inquiries / SMTP-INBOX / authoritative kalendoriaus ir atomic booking backend / mokėjimai / voice / FB outreach / PWA-native / production seed exclusion build / shared SSR SEO adapteris / teikėjų teisės ir tikri faktai / DNS-TLS-hosting / deployment / GSC-Bing / paklausa. Jie neįeina į privačios demonstracijos priėmimą ir nevadinami veikiančiais.

Nėra 10/10, domain-ready, realaus vizito ar išmatuoto pranašumo prieš Fresha teiginio.
