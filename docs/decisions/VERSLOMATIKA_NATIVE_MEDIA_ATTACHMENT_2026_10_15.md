# Esamos medijos priskyrimas native juodraščiui

Bazė: coordinator `9c618026bb7f57dadfbe77f4e93e30dbdbf92b8c`, fetch patvirtintas main `808581d919d06cb4a2d151cc7f9ec1be1782aba2`; public companion `1a26f289092cecadc5799de898e809dc1769498a`, main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Issue 66. Upgrade `upgrade-0e38a8dc-d99e-43f4-b9b1-b0a3aec4f2db`.

## Atkurta spraga ir apimtis

Esamas native importas ir GUIDE rašytojas neįjungia vaizdų generavimo. Studijos `import-media` kuria responsive šeimą, o `amend-page` gali ją priskirti, tačiau nėra vienos runtime jungties su failo SHA ir atkūrimo kvitu tarp šių veiksmų. Pakartotinis senasis importas kuria naujus UUID. Du pirmi regresijos scenarijai nepraėjo: workflow atsakė `workflow_invalid_command`, todėl nebuvo nei priskyrimo operacijos, nei laukiamo failo SHA patikros. Originalus 2 FAIL / 2,265 s rezultatas išsaugotas šioje istorijoje.

Pataisa naudoja vieną esamą `saveResponsiveAsset` ir esamą `model.editPage`. Naujo optimizatoriaus, modelio vykdytojo, DB lentelės, provider konfigūracijos, HTTP valdymo endpointo ar automatinio patvirtinimo nėra. Koordinatorius atskirai valdo tikrą service/worker ir UI prijungimą. Šio paketo kodas nesuteikia teisės įjungti generavimą ar viešinti svetainę.

## Runtime sutartis

`pinet_core.creation.media.attach(tx, session, creation_id, request, *, seconds=20, still_authorized=None)` priima tikrą esamo savininko SQL Session ir griežtą `MediaAttachment`. Kvietėjas valdo transakciją; adapteris laiko esamus actor → Creation admission užraktus. Tai ne klientui skirtas bendras komandų endpointas.

Prašymo laukai: `accepted_revision`, `candidate_sha256`, `canonical_host`, `page_id`, `expected_site_sha256`, `expected_revision_sha256`, `expected_planning_sha256`, `source_name`, `source_sha256`, `mime`, `alt`, `rights`, pasirinktiniai `credit` ir tikslus `prompt`. Papildomi laukai draudžiami. Source_name yra tik paprastas raster failo vardas; absoliutaus ar santykinio kelio klientas nepateikia. Failą serveris randa vieninteliame konfigūruotame fiziniame kataloge:

`<stable runtime/artifacts>/customer-content/<creation UUID>/revision-N/media-inputs/<source_name>`.

Adapteris prieš child, vykdymo metu ir po atsakymo tikrina aktualų savininką, Session, source, priimtą reviziją, kandidatą ir host. Archyvuota, vykdoma ar pasikeitusi Creation bei bet kuri aktyvi tos Creation GUIDE užduotis sustabdo veiksmą. Istoriniam accepted source būtinas esamas aktualus aiškus S6 continuation; seno source ar istorinių approval kvitų neperrašo. Papildomas callback gali tik susiaurinti teisę. `studio.configuration/_execute` išlaiko ribotą aplinką, 20 s ribą, autorizacijos stebėjimą ir esamą child cleanup.

Grąžinamas bendras dabartinis content completion bei tikras attachment kvitas. Importas ir priskyrimas palieka `generation`, `approval` ir `mediaVerification` reikšmes `not-performed`. Failo buvimas nėra vaizdo peržiūra ar verslo teiginių patvirtinimas.

## Private kvito ir pakartojimo semantika

Trusted `attach-media` priima tik esamą importo metaduomenų formą, failo SHA ir tris konteksto hash. Paprastas `import-media` taip pat gali tikrinti pasirinktinį `expectedSourceSha256`; ankstesni kvietėjai išlieka suderinami.

Vieno prašymo raktas apima Creation, accepted revision, kandidato hash, host, pageId, šaltinio baitų SHA ir tikslius metaduomenis. Kvitas papildomai saugo originalius svetainės, puslapio ir plano hash. Kvitas ir vieno prašymo exclusive lock laikomi `revision-N/media-attachments/<requestHash>.json/.lock`, ne viešame pakete. Kito proceso užrakto neperima ir pagal amžių netrina.

1. Tikras failas turi būti to paties revision media-inputs kataloge. Alias, symlink, per dideli ar netinkami failai atmetami. SHA skaičiuojamas iš tų pačių baitų, kurie perduodami bendram importui.
2. Prieš importą įrašomas `prepared`. Jei operacija nutrūksta nepalikusi importo rezultato, pakartojimas sustoja su `workflow_media_import_uncertain`. Nežinomybė nėra leidimas kartoti importą.
3. Sėkmingas importas įrašomas kaip `imported` su tikrais šeimos ID, variantų matmenimis, baitais, hash ir po importo buvusiu svetainės hash. Tik tada atliekamas esamas fenced amend.
4. Priskyrimas išsaugo ankstesnę mediją ir kitus editorial laukus, pasirenka naują pagrindinį vaizdą. Bendra modelio operacija išplečia vieną ID į visą šeimą. Tikras pakeitimas natūraliai panaikina dabartinio review atitikimą; ankstesnė publishedRevision ir immutable release nekinta.
5. `attached` kvitas išsaugo tikrą po pakeitimo puslapio ir plano hash. Tas pats prašymas tampa read-only no-op. Kito puslapio pokytis nepaverčia jo nauju priskyrimu; pasikeitęs tikslinis tekstas ar planas atmetamas. Jau tinkamai priskirta šeima net pirmo kvito metu nekeičia puslapio ar aktualios peržiūros.

Jeigu tas pats originalas jau importuotas, naudojama vienintelė tiksliai sutampanti tos pačios svetainės šeima. Sutapimas tikrinamas pagal originalo SHA, MIME, baitus, pilną prompt, alt, teises ir credit; prieš priskyrimą patikrinami tikri originalo bei visų WebP variantų baitai. Keli tokie sutapimai yra konfliktas. Vien failo vardas ar alt nėra parinkimo įrodymas.

Jeigu amend nepavyksta, `imported` lieka ir tas pats nepakitęs prašymas naudoja tą patį importą. Pakeistas kontekstas tyliai neperrišamas. Išimtinis nutrūkimas po puslapio įrašymo, bet prieš galutinį kvitą palieka neapibrėžtą amend rezultatą; įprasta hash patikra jį sustabdo. Reikia aiškaus operatoriaus sutikrinimo, o ne kito importo ar menamo baigimo.

## Prijungimas ir priėmimas

Naujai bylai patikimas serverio operatoriaus inbox gali kviesti adapterį po tikro priimto native intake ir prieš GUIDE prepare/admission. Užbaigtai bylai visi Creation/GUIDE darbai turi būti neaktyvūs. Nevykdyti tarp writer prepare ir apply. Koordinatorius valdo konkretų inbox ir orchestratoriaus kvietimą; ši funkcija pati jo neskenuoja ir nepradeda proceso.

Vienu metu teikti vieną tiksliai užfiksuotą prašymą. Ankstesnio veiksmo pakeisti hash nėra leidimas tyliai perrašyti seno prašymo expected reikšmes. Jau sugeneruoto failo priskyrimas nėra autonominis vaizdo generavimas. Esamas mokamas Image API generatorius, raktai ir biudžetai nekeičiami.

74 Python offline scenarijai praėjo per 4,49 s: naujas adapteris, esami studio transport, dependency preflight ir stable root testai. Tikri Node raster/šeimos/review/release testai apima SHA neatitikimą, šeimos pakartotinį naudojimą, no-op peržiūrą, nutrūkusį amend, realų konkuruojantį modelio rašymą, sugadintus baitus ir istorinių approval/release išsaugojimą. Galutinis tikslus Node rezultatas pridedamas perdavime.

Išsaugoti pirmi platesnių testų rezultatai: 21 PASS / 1 FAIL per 43,596 s, nes nebuvo nurodyta companion konfigūracija; paskui 23 PASS / 1 FAIL per 52,705 s, nes senas `media-import.test.mjs` dar naudojo statinį gretimo checkout importą net su konfigūruotu companion. Šie FAIL nepaversti PASS. Papildomo failo apimtis perduota koordinatoriui prieš jo taisymą.

Rollback yra scoped source revert. Private intake, originalai, importo kvitai ir anksčiau priimtos versijos lieka išsaugoti. Branch/PR pristatymas nėra main merge, tikras runtime adoption ar vietinės svetainės priėmimo atnaujinimas.
