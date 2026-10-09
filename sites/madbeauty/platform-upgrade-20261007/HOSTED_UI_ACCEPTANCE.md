# Privatus serverio bandymas — 2026-10-09

Tai atskiros testinės aplinkos priėmimas. Visas platformos pavedimas tebėra vykdomas; madbeauty.lt pilnas atnaujinimas nepaleistas. Tikras teikėjas, faktinis laiško gavimas, retention tvarka ir canonical release priėmimas šiuo bandymu nepatvirtinti.

## Leidimo tapatybė ir izoliacija

Worker `madbeauty-ui-acceptance-20261009` naudoja tikrą app handler, source ir organization klases. QA adapteris prideda rakto vartus, tris testinius gavėjus ir SQL laiškų capture; verslo metodai nekopijuojami. Viešos produkto, API, medijos ir turinio užklausos be rakto ar riboto HttpOnly QA cookie grąžina404. Naršyklės QA cookie nesuteikia maintenance / OTP capture prieigos; jai reikia atskiro Bearer rakto. Production host/mode ir kiti gavėjai atmetami.

Pirmas leidimas: sourceHEAD `6a3c9a49b0b599702441baf847d7937fc0535ea8`, runtime `39b71b18bd535eeb8d231fe497d26ca254b108d3`, artifact `31769c64bc13b3ee033d68bb15e99616e9803fb3371028a9af097a6cf55276ca`, deployed version `d28109c2-f9ed-416f-98a1-7820d84ccd61`. Jame atliktas pirminis onboarding / operator / rezervavimo / source restart kelias.

Antras istorinis75aa leidimas: runtime/sourceHEAD `3c16e4cec06a8c5ce6b015fc6196dd3f6c597d8c`, artifact `d6e89a98bda0bf6b5b96a2e10b57e6276ffc227e69d9136fb100b8e51863c58b`, deployed version `1bb1cd10-a6ba-45df-ac51-b1f5cd1118d2`. Jame atliktas fizinės medijos ir eilučių handoff / active target restart / normalus owner reschedule kelias.

Dvi naujos QA namespaces: source `45cdaa118d4f412b8616f9eb41a5b639`, target `ecd78b7e01e847a4a766f55edc17392d`. Production `2faf96eedef1425c8d4fc07444cde2f3` nepririšta prie QA. Provider before/after patikra išsaugojo production bindings ir secret vardus, QA neturi cross-script bindings ar domain routes. Nepakeisti paštas, DNS ir realių klientų duomenys. Šio istorinio produkto bandymo QA deployment atliktas; jis neįdiegė production upgrade. Vėlesnis atskiras datų leidimas aprašytas toliau.

Nejudintas approved content SHA `75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4`:39puslapiai /309assets. Hosted preflight patikrino visus309kelius:154pateikti failai sutapo baitų SHA,155būsimos medijos failai ir32būsimi puslapiai grąžino404. Viešo turinio projekcija turėjo7jau suėjusios datos puslapius. Native gateway patikra23/23; tai atskiras QA adapterio testas, nepridedamas prie produkto264testų.

## Įvykdytas produkto kelias

| Kelias | Rezultatas ir ribos |
| --- | --- |
| Normali paskyra / onboarding | Įprastas el. pašto start/verify UI su SQL capture kodu; sesija nepakeista per browser cookies ar hidden state. Sintetinis salonas, Vilnius, vienas meistras / darbo vieta. |
| Procedūrų pasirinkimas | Naršyklės dialoge14kategorijų, paieška, pasirinkti klasikinis manikiūras ir moterų kirpimas; du atskiri privatūs pasiūlymai. Tai nėra visų kategorijų naujas hosted interaction PASS. |
| Pasiūlymai / operatorius | „Be lakavimo“35€45min ir „Trumpi plaukai“45€60min, priskirtas meistras / resursas. Abu pateikti ir priimti operatoriaus UI; profilis pateiktas ir priimtas atskirai. |
| Medija | Nuosavas640×480testinis violetinis vaizdas per actual file chooser / IMAGES įkeltas su rights/alt/caption; originalas ir du WebP variantai. Viešas priimtas profilis iškodavo vaizdą. Po active-target restart įprastas klientas atidarė profilio / galerijos dialogą; fresh hosted HTTP360WebP baitai sutapo su SQL descriptor SHA. Tai nėra realių meistro darbų įrodymas. |
| Kliento paieška / visas vizitas | Normalus klientas pasirinko Vilnių / manikiūrą / spalio12d., gavo1paslaugos variantą, pridėjo antrą procedūrą ir patvirtino vieną105min /80€vizitą. |
| Abi rolės / source restart | Kliento kortelė ir meistro kalendoriaus dialogas rodė abi procedūras bei tą pačią sumą. Visi source normalizuoti read collections ir SQL capture mailbox išliko po actual source abort/reopen. |
| Hosted cutover / physical media | Viena organizacija: source frozen→signed rows/media→prepared target→source sealed→target active.11kolekcijų sutapo, originalas ir2variantai sutapo pagal metaduomenis ir SHA iš actual SQL chunks. Active target restart išsaugojo snapshot ir3objektus. |
| Normali mutacija po cutover | Owner UI perkėlė visą vizitą į spalio13d.09:00–10:45. Tas pats bookingID, targetversion2, source išsaugojo originaliąversion1.80€ /2segmentai ir medija išliko po dar vieno target restart. Klientas įprastai prisijungė iš naujo; jo sąraše ir to patiesIDdetalėje matoma spalio13d., abu intervalai ir80€suma. |
| Svetimas klientas | Trečia normaliai prisijungusi testinė paskyra atidarė tą patį detail URL po target restart; rodytas „Puslapis nerastas“, svetimo kliento vardas, procedūros ir suma neatskleisti. Atskirai `/operatorius` rodė „Prieiga ribota“. Tai konkretaus customer/operator boundary patikra, ne visų team roles priėmimas. |

Vizito ID: `booking_38f0783d-c30e-4f58-bfae-952bf0c5c3da`. Organizacijos ID: `provider_6267a38c-81d0-401a-bb7e-ba25212b5180`. Tikslūs vardai / adresai pažymėti kaip testiniai. Naujas handoff requestKey taikytas tik šiai QA organizacijai; realaus salono duomenys neperkelti.

## Patirtas defektas ir pataisa

Pirmame leidime profilis su jau pateiktais pending pasiūlymais grąžino „Pirmiausia pridėkite paslaugą.“ (`hosted-ui264-profile-review-error-1440.png`). Paslaugos įvestos, tačiau active service įrašas atsiranda po operatoriaus pasiūlymo priėmimo. Runtime `3c16e4c` paaiškina draft/pending/returned būsenos kitą veiksmą. Esama publikavimo sąlyga lieka patvirtintas aktyvus variantas.

Naujas integration testas patikrino draft→pending→returned→approved kelią, atmetimo rollback, neviešą profilį ir atskirą profile approval. Prieš pataisą testas nesėkmingas su originaliu tekstu; po pataisos offers15/15 ir visa regression-99:264/264PASS per66,390s,1naujas /0pašalintų. Exact staged source safety2failai /92883baitaiPASS. Produkto264suma nėra piloto / SMTP / viso pavedimo completion.

## Įrodymai ir likučiai

Ignored evidence: `hosted-ui264/manifest-first.json`, `manifest.json`, deploy/preflight/provider before-after logs ir receipts, `hosted-ui264-restart-proof.json`, `hosted-ui264-handoff-proof.json`, `hosted-ui264-cutover-proof.json`, `hosted-ui264-media-read-proof.json`, `hosted-ui264-views.json`, `hosted-ui264-client-after-dom.txt`, native screenshot PNG bei privatūs synthetic SQL snapshots. Rakto, sesijos paslapčių ir OTP failai neįtraukiami į Git ir nerodomi. Pirmas media-read QA helper nesėkmingas dėl neteisingo JSON field pavadinimo (`naturalWidth` vietoj capture įrašo `width`); diagnostika išliko, pataisa nelietė produkto ar vaizdo.

Production read-only at11:24UTC: currentdeploy100% `f8eba745-b8ef-446e-aeff-3c8b95c762bd`, deploymessage sourceb7a34b1 /core63cfd8c; actual `https://madbeauty.lt/content.json` HTTP200header75aa,7duepages. `hosted-ui264-production-read.json` fiksuoja skaitymą, ne naują production leidimą. Turinio sesijai perduota tiksli bazė ir skirtumas tarp QA handoff / dar neįdiegto production upgrade. Vėliau gautas atskiras kalendoriaus paketasbb1b90aa /sourcee165b75. Šio75aaQA priėmimo jis nepakeičia ir čia dar neįdiegtas; toliau reikalingas atskiras siauro datų leidimo source/build/host acceptance, išlaikant actual production runtime ir namespaces.

Screenshot/DOM patikros apima konkrečius390/1440pločius ir matomus dialogus / formas. Rastrai saugomi tokie, kokius grąžino native browser; dalis apima tik rendered content plotą, todėl jų nevadiname exact900px full viewport kadrais. Sąmoningai slenkama siaura darbo navigacija ir kalendoriaus regionas nėra automatiškai laikomi klaida. Šis kelias nepakeičia ankstesnių keturių pločių named error/stale/retry patikrų ir nepriima visų hosted rolių / formų iš vieno happy path.

SQL capture transport tik surenka pranešimą izoliuotoje saugykloje; SMTP ir gavėjo inbox šiame teste nenaudoti. Didelė hosted medijos apkrova ir coordinated active-pair PITR nebandyti. Canonical domaine cutover ir realaus teikėjo pilotas lieka atskiri [CURRENT_READINESS.md](CURRENT_READINESS.md) vartai.

## Paketo atnaujinimas, atšaukimas ir pakartotinis vizitas

Siauras datų leidimas 4dbdf361 jau gyvas: runtime b7a34b1 / core 63cfd8c, patvirtintas bb1b90aa paketas, originali production PLATFORM2faf / v1 ir nepakitę mail / DNS / bindings. Pilnas upgrade gyvai neįdiegtas. [PR48](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/48) saugo checked-in RECEIPT.json ir canonical screenshots. Aukščiau pateikti 75aa įrodymai lieka istoriniai.

Naujo candidate QA tapatybė: source HEAD 3a9ba489, runtime 3c16e4c, core c7e0c9a, artifact 0435a2c4, deployed version cdcf8bce-85df-4978-b1a4-cfaf40c635c6. Source45cdaa / targetecd78b namespaces išliko. Paketo 75aa→bb pakeitimas nekeitė nė vienos iš 29 source ir 29 target read kolekcijų, fizinės medijos faktų, mailbox ar binding identities. Dabartiniu hosted laikrodžiu patikrinti 7 vieši ir 32 būsimi puslapiai. Atskirame native compiled candidate 64 T−1 / T būsenos tikrina JSON, route, SSR, time, Article schema, sitemap, LLM ir medijos publikavimo taisykles. Testinis laikrodis yra tik vietiniame compile adapteryje. `calendar-candidate-acceptance.mjs` fiksuoja selectionAt, kad istorinis 32 gidų rinkinys būtų pakartojamas.

| Kelias | Rezultatas ir įrodymas |
| --- | --- |
| Visas atšaukimas | Normalus klientas atšaukė 105 min. / 80 € vizitą: target v2→v3, originalus source booking liko confirmed / v1. Items, segments, laikas, suma ir trukmė išliko. Pasikeitė tik target bookings / events read kolekcijos; authority ir 3 medijos objektai nepakito. Vienas naujas capture pranešimas. `hosted-cancellation.json`. |
| Klaida ir pakartojimas | Pirmas transport error išlaikė priežastį ir nekeičia snapshots / mailbox. Po įprasto QA access atnaujinimo explicit retry pavyko. Active target abort / reopen išsaugojo exact snapshot, authority ir media. Po įprasto re-login abi rolės matė atšaukimą. |
| Atlaisvintas intervalas | Actual anonymous hosted RPC ir normali naršyklės forma vėl pasiūlė tą patį 09:00–10:45 / 105 min. / 80 € / 2 segments intervalą. Ši read patikra pati nesukūrė hold ar booking. |
| Pakartotinis vizitas | Normalus klientas peržiūrėjo dabartinius abiejų variantų duomenis, pasirinko atlaisvintą intervalą ir atskirai patvirtino booking_ca8cc9ef-c382-4829-99cb-5e89874adb8a. Vienas naujas confirmed / v1 vizitas; senasis canceled / v3 liko exact. Target restart išsaugojo snapshots ir mailbox, klientas perskaitė naują įrašą, normalus owner kalendorius ir dialogas rodė abi procedūras. `hosted-rebooking.json`. |
| Centralizuotas kliento kontaktas | Įprastas booking contact žingsnis source clients kolekcijoje padidino esamo kliento version 2→3, nekeisdamas kitų jo laukų. Kitos 28 source read kolekcijos, įskaitant originalų booking, išliko exact. Pradinis helper klaidingai tikėjosi nulinio visų source kolekcijų pakeitimo ir naudojo accounts vietoj actual clients pavadinimo; diagnostika išsaugota, produkto defekto nepatvirtina. |
| Tikras vizito versijos konfliktas | Du normaliai prisijungę owner langai turėjo naujo vizito v1. Antras langas perkėlė jį į spalio 14 d. 09:00–10:45, v2. Senas langas pateikė atšaukimą ir gavo „Vizitas pasikeitė. Atnaujinkite.“ Priežastis liko, klaida fokusuota; source, target ir mailbox exact prieš / po atmetimo. Actual target restart išsaugojo v2, normalus seno lango reload parodė naują datą. Raw HTTP status atskirai nefiksuotas. `hosted-booking-version.json`. |

Ankstesnis `cancel-stale-1280` atmetė missing / expired session su CSRF403; jis lieka atskiras nuo vėliau priimto tikro vizito versijos konflikto. Du pirmi „390“ pavadinti kadrai iš tiesų buvo 1280×720 ir atmesti kaip mobile įrodymai. Atšaukimo priimti DOM vaizdai: 390×900, document / main / dialog client=scroll; PNG matmenys saugomi atskirai. Pakartojimo ir versijos konflikto receipts taip pat skiria measured viewport nuo tikro rastrų dydžio. Trys pakartojimo ir du versijos konflikto checked-in PNG peržiūrėti vizualiai. Tai konkrečių kelių priėmimas; kitų rolių / formų būsenos neperimamos.

Checked-in `acceptance-20261009/`: kalendoriaus manifest / proof, hosted preservation, cancellation, rebooking ir booking-version JSON bei septyni native PNG. Raw SQL, OTP, CSRF, session ir QA raktai lieka ignored evidence. SQL capture surenka testinį pranešimą, bet nepatvirtina SMTP inbox. Tikras teikėjas, faktinis autorizuotas gavėjas, retention / backup tvarka ir galutinis canonical upgrade priėmimas išlieka atskiri vartai.


## Vėlesnis miesto, paskyros ir kortelių bandymas

Aktualus `1ba6c7d` protected leidimas `016ae399` išsaugojo tuos pačius QA namespaces ir visus įrašus, mediją bei capture. Jo native kortelių vaizdas ir ankstesnio `fbc4bbc` normalūs miesto / kliento nustatymų / JSON atsisiuntimo / favorite restart keliai priimti atskirai [HOSTED_CITY_ACCOUNT_MEDIA_ACCEPTANCE.md](HOSTED_CITY_ACCOUNT_MEDIA_ACCEPTANCE.md). Istorinės šio dokumento versijos nepervadintos nauju runtime; realaus salono / inbox / retention vartai lieka atviri.
