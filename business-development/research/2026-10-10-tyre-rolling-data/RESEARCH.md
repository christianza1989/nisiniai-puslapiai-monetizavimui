# Traktoriaus padangų riedėjimo duomenys prieš 4WD pasiūlymą

2026-10-10 heartbeat. Klausimas: ar agentui pakanka nominalaus dydžio arba išorinio skersmens, kad palygintų priekinės ir galinės ašių padangas? Rezultatas — **esamo kvalifikavimo reikalavimo įrodymų papildymas**, ne nauja BDEV idėja, kode nustatytas defektas ar naujas įgyvendinimo mandatas.

## Dabartinė apimtis ir deduplikacija

[Nišos produkto tiesa](../../../sites/traktoriupadangos/PRODUCT.md) numato pirmos fazės poreikio užklausą, ne inžinerinį parinkimo patvirtinimą ar veikiančią prekybą. [Briefas](../../../sites/traktoriupadangos.md) jau numato 4x4 derinimo gidą. [Pokalbio instrukcija](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/traktoriupadangos/conversation.md) reikalauja kitos ašies, gamintojo riedėjimo apimties ir traktoriaus leidžiamos proporcijos; [tiekėjo instrukcija](../../../agent-business-core/runtime/src/pinet_core/instructions/niches/traktoriupadangos/supplier.md) jau reikalauja tikslaus modelio ir riedėjimo duomenų. [Komercinis planas](../../../voice-agent-plan/PROCUREMENT_AND_INVOICING.md) taip pat numato 4WD adapterio patikrą. Todėl atskiro suderinamumo modulio ar naujos idėjos nesiūlome.

[Ankstesnis pristatymo tyrimas](../2026-10-02-tyre-delivery/RESEARCH.md) atskiria padangos matmenį nuo siuntimo pakuotės. Šiandien tikrinamas kitas to paties tiekėjo pasiūlymo laukas: riedėjimo apimtis nėra geometrinio apskritimo ar pakuotės matmens pakaitalas. Peržiūrėtos instrukcijos, ne viso runtime vykdymas.

## Pirminiai įrodymai ir jų ribos

[Firestone 2022 paaiškinimas](https://www.firestone-agriculture.eu/blog/what-affects-my-agricultural-tyres-lead-ratio) nurodo, kad priekinės ir galinės ašių padangų nusidėvėjimas, apkrova, slėgis bei technologijos gali keisti efektyvią riedėjimo apimtį. Vienos ašies pakeitimas naujomis tokio pat nominalaus dydžio padangomis savaime neužtikrina ankstesnio derinimo. Tai bendras gamintojo paaiškinimas, ne mūsų kliento traktoriaus patvirtinimas.

[Firestone 2025 dydžio keitimo straipsnis](https://www.firestone-agriculture.eu/blog/how-to-change-the-size-of-my-tractor-tyres) atskirai pateikia nominalią skersmens geometriją ir lead skaičiavimą iš abiejų ašių riedėjimo apimčių bei mechaninio ašių santykio. Pavyzdžio 4488 mm / 5885 mm / 1,340 rezultatas yra apie 2,19 %. Skaičius patikrintas tik kaip dokumento aritmetika; tai nėra leidimas naudoti šią porą kitam traktoriui. Straipsnyje bendro diapazono formuluotės skiriasi: vienur 1–5 %, kitur 0–5 %. Šių gairių nesukonfigūruoti kaip universalios visų traktorių PASS ribos.

[DLG bandymo ataskaitos HTML](https://www.dlg.org/en/tests/agricultural-technology-and-farm-inputs/test-reports/test-balkrishna-industries-ltd-vf-reifen-fuer-traktoren-bkt-agrimax-v-flecto) 4 lentelė lygina vienodų nominalių priekinių ir galinių dydžių rinkinius. Nurodytos skirtingos riedėjimo apimtys; teorinis ir išmatuotas lead taip pat atskirti. Pavyzdžiui, BKT stulpelyje teorinis 0,99 %, išmatuotas 0,80 %, o referencinio B rinkinio — 1,00 % ir 4,33 %. Sąlygos: Fendt 724 Vario Gen6, lentelės matavimas prie 2 bar; ataskaitos 0,5–4,5 % intervalas priklauso jos bandymo kontekstui. Lentelė nėra kitų traktorių suderinamumo sąrašas, gamintojų reitingas ar mūsų sutaupymo įrodymas. Tyrimas atliktas 2023 m.; šiandien perskaityta ataskaita nėra naujas 2026 m. bandymas.

[Maxi Traction IF techninio puslapio HTML](https://www.firestone-agriculture.eu/en/technical-datasheets/firestone-maxi-traction-if) nesuteikė perskaitomos rolling circumference lentelės šiame išraše. Neįrašytas RC katalogo importo PASS. PDF neskaitėme, dealer paskyros / įrankio nejungėme. Dviejose Treg katalogo užklausose tinkamo padangų techninio adapterio nerasta; artimiausi kitų užduočių endpointai netinka. Tai nėra viso katalogo neįmanomumo įrodymas; mokamų provider calls nėra.

## Mažiausias praktiškas patikrinimas

Esamo autorizuoto kalibravimo metu galima peržiūrėti [šešis sintetinius kontrolinius atvejus](CHECK_CASES.json), pasiūlytas limitas iki 1 agento darbo valandos be naujų prenumeratų. **Atvejai čia nevykdyti ir vykdytojui nesiųsti.** Tai esamo reikalavimo testavimo medžiaga, ne atskiras proposed pilotas ar naujas runtime.

Tiekėjo duomenų lape pakanka išsaugoti tikslią prekę ir ašį, gamintojo RC lauką su vienetu / šaltiniu / sąlygomis, abiejų ašių esamų padangų informaciją, traktoriaus modelį ir patvirtintą mechaninio santykio orientaciją bei OEM leidžiamą intervalą. Slėgio, apkrovos, nusidėvėjimo ar duomenų trūkumo agentas nepakeičia spėjimu. Bendra skaičiavimo išraiška gali padėti tikrinti aritmetiką; konkrečios mašinos tinkamumo įrodymui reikalingi jos gamintojo duomenys ir atsakingas techninis patvirtinimas. Vien geometrinis skersmuo negauna RC provenanso.

Priėmimas būsimoje patikroje: trūkstant RC / ašių santykio / konkretaus leidžiamo intervalo nėra galutinės tinkamumo būsenos; vienetai ir ašių orientacija aiškūs; sutampantis nominalus dydis nesukuria PASS; matematiškai tinkamas rezultatas nevadinamas realiu matavimu. Stabdyti galutinį pasiūlymą, jei priklausomybės neišspręstos, bet tęsti nepriklausomą poreikio ir tiekėjo informacijos surinkimą. Stabdyti laboratoriją po 1 valandos ar prireikus tikrų klientų duomenų, mokamo adapterio ar svetimo kodo pakeitimų.

Alternatyvos: palikti esamą rankinį specialisto patvirtinimą; agentui parengti trūkstamų faktų sąrašą; vėliau tame pačiame autorizuotame core prijungti patikrintą gamintojo adapterį. Dabartinė pirmenybė — esamas procesas su aiškiu duomenų provenansu. Naujo BUSINESS modelio, reikšmingos plėtros ar TOOLS migracijos nėra.

Tikslas — tinkamesnė užklausa ir mažiau nepagrįstų suderinamumo pažadų; tai hipotetinis poveikis, ne išmatuotas pajamų ar grąžinimų rezultatas. Tikras klaidų dažnis, paklausa, tiekėjo atlygis, marža ir peržiūros laikas nežinomi. Naujų pirkimų / prenumeratų 0; faktinės AI / darbo sąnaudos neišmatuotos. Specialisto darbo poreikis nepaverstas nuolatiniu savininko patvirtinimo žingsniu.

## Tęstinumas ir ribos

Naujausi root savininko nurodymai sustabdo jo integracijos darbą; core savininkas paprašė pabaigti roletų agentą ir privačiai perduoti prieigų konfigūraciją. Šie pavedimai nesuteikia šiai sesijai mūsų pending bandymų approval ar teisės skaityti asmeninį paštą. Jų darbai neperimami. BDEV-0002 ir P1–P4 approval lieka null.

Pradinė žieminių keleivinių padangų kryptis atmesta pagal vietinį inventorių; paieškos rezultatai neperkelti į traktorių nišos taisykles. Nerastas atidėtos metalo-tvoros BUSINESS nėra naujos nišos pavedimas. Windows glob rg paieška pataisyta tiksliais keliais. Companion checkout turi kito vykdytojo devynis working pakeitimus; jo source, šaka ir procesai nepakeisti. Tik privatus tyrimas / STATE, be svetainių, runtime, klientų, SMTP, DNS, paskyrų ar kampanijų pakeitimų. [Šaltiniai](SOURCES.json), [patikra](QA.json).
