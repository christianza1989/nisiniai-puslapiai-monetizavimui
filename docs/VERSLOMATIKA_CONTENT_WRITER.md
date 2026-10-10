# Privatus native V2 turinio rašytojo tiltas

`content-studio/scripts/customer-content-write.mjs` yra prižiūrima serverio JSON stdin sąsaja vienam jau importuotam V2 puslapiui. Ji pati nekviečia modelio ir nekeičia legacy generatoriaus V2 atmetimo. Autorizaciją, aktualų kūrimo job / lease / sesiją, providerio kvotą, laiką ir atšaukimą užtikrina kviečiantis serveris. Šis vietinis tiltas nėra klientų HTTP API ar pilno F1 priėmimas.

`customerContentWrite(input)` ir `writerOutputSchema` yra eksportai. Kiekvienam izoliuotam data/output kontekstui naudoti naują Node procesą. Komanda:

```text
node content-studio/scripts/customer-content-write.mjs
```

Abiejų komandų serverio duomenys: `command`, `creationId`, `acceptedRevision`, `sourceHash`, `canonicalHost`, `artifactsRoot`, `dataDir`, `outputDir`, `pageId`. Katalogai turi tiksliai atitikti esamą `<runtime/artifacts>/customer-content/<creationUUID>/revision-N/{data,output}`; symlink/junction ir katalogų alias atmetami. Kliento tekstas negali tapti keliu ar svetainės ID. Tikrinami intake manifesto, originalo ir intake-context baitų hash bei tikslūs kūrimo / revizijos / domeno / puslapio ryšiai. Originalo ir manifesto tiltas neperrašo. Dabartinio site failo hash gali skirtis nuo istorinio intake po teisėtų privataus modelio pataisų.

`prepare` nieko neįrašo. Jis grąžina `state: prepared`, tikslų `expectedRevisionHash`, `expectedPlanningHash`, `expectedContextHash`, `instructionHash`, pilną `siteData`, `pageData.planningBrief`, šaltinių kandidatus / užklausas, esamus šaltinius / mediją / ryšius / pastabas, native `outputSchema`, kanonines plannerio / SEO-GEO / kalbos instrukcijas su jų metadata ir tikrą dabartinio snapshot workflow. Brief turi egzistuoti ir atitikti puslapio URL. Puslapis be brief gauna `writer_planning_brief_required`; homepage ar kitos užduoties brief šis tiltas neišgalvoja.

Kanoninis privatus SEO tyrimo snapshot įkeliamas vieną kartą paruošiant kontekstą. `researchSnapshotHash` ir bendras konteksto hash susieja jo tikrus baitus bei aktualias usable/stale būsenas, praleisdami vien kintantį assessment laiką. Pasikeitęs įrodymas iki apply reikalauja naujo prepare. Tyrimo kandidatai, tušti stebėjimai ar įkelta byla savaime nesukuria atliktos semantinės šaltinių patikros.

Kviesdamas tikrą providerį serveris naudoja grąžintas instrukcijas bei schemą ir rezervuoja bandymo kvotą prieš kvietimą. `apply` gauna tuos pačius serverio ryšius, tris paruoštus `expected*Hash` ir `output`. Output turi tik penkis laukus:

- `title`, `description`, `intent`: rišlus puslapio pažadas ir konkretus skaitytojo klausimas;
- `body`: iki300 tikros esamos V2 schemos blokų, įskaitant `richParagraph`, `richHeading`, `richList` ir tik jau priskirtos medijos `image`;
- `factChecks`: iki30 konkrečių neišspręstų pastabų, be automatinio review / PASS.

Body tikrinamas esamu `normalizeV2Blocks` schema validatoriumi, kuris neleidžia nežinomų laukų ir nekeičia rich teksto į V1. Nuorodų target definitions yra esamos V2 schemos page/external šakos. Vidiniai ID turi priklausyti aktyviam tos pačios svetainės puslapiui; self/foreign/network/commerce ryšiai nepriimami. Išorinės rich nuorodos gali naudoti tik jau esamo page.externalLinks atskirai pažymėtus verified URL. Kandidato URL neverifikuojamas vien dėl modelio išvesties. Image turi naudoti jau puslapiui priskirtą assetId; rašytojas negeneruoja ar neperžiūri vaizdo.

Privačiam tekstui leidžiami nežinomi operatorius ir kontaktai. Pilnas `validateV2Draft` tikrina viešą siteSnapshot ir reikalauja netuščio operatoriaus; todėl jis lieka kanoninio approval vartais. Tilto siauras output ir visas native body tikrinami prieš edit, neįrašant fiktyvių operatoriaus ar kontakto reikšmių ir nekeičiant viešos schemos. Semantinė faktų, šaltinių ir natūralios kalbos peržiūra vis dar reikalinga.

`editPage(siteId,pageId,input,expected)` papildomas optional CAS argumentas tikrinamas po realaus bendro crossprocess užrakto. Jis susieja `expectedRevisionHash`, `expectedPlanningHash`, `expectedSiteHash` su tikru page / planning / visos site struktūros snapshot. `studioContextHash(site)` apskaičiuoja pastarąjį. Esami trijų argumentų calleriai nekeičiami. Pasikeitęs puslapis, brief, faktai, kontaktai, inventorius ar priklausomybės sukelia `writer_context_stale`; antras lygiagretus rašytojas iš to paties snapshot negali perrašyti pirmo.

`apply` perduoda tik minėtus privačius laukus kanoniniam `editPage`. Ankstesnės factChecks neištrinamos, o naujos dedamos be tylaus sutrumpinimo; viršijus40 operacija atmetama. Brief, šaltiniai, medija, publishAt, autoriai ir datos nekeičiami. Edit panaikina dabartinio draft approval įprastu modelio keliu; ankstesnė `publishedRevision` ir immutable release baitai lieka tie patys. Naujam approval reikia naujos tikros tikslios revizijos peržiūros.

Receipt: `state: private-draft-written`, identity/source ryšiai, `outputHash`, `appliedRevisionHash`, `appliedPlanningHash`, `observedAt` ir faktinis po įrašymo `workflow`. `sourceVerification`, `mediaVerification`, `approval`, `deployment` yra `not-performed`, `fullF1` ir `launch` — `UNVERIFIED`. Tolesnės peržiūros ir publikavimo kliūtys rodomos bendro workflow rezultatu. Private prepare konteksto / raw receipt su vidiniais duomenimis negrąžinti klientui be root DTO projekcijos.

Testai naudoja tik sintetinius izoliuotus importus ir Node/modelio API, be providerio, klientų duomenų ar deployment. Tikras providerio adapteris, klientų job ir dashboard, redakcinė semantinė / kalbos peržiūra, media, bendras release ir visas F1 lieka atskiros serverio integracijos bei priėmimo užduotys.
