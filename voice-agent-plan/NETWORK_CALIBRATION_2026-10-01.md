# Šešių nišų agentų kalibravimas – 2026-10-01

Visi suplanuoti šio etapo ratai baigti. Galutinis ratas praėjo **28/36** griežtų atvejų; naujų scenarijų dalis – **19/24**. Po trijų techninių kontraktų pataisų tikslinės regresijos praėjo **3/3**. Originalus 28/36 rezultatas nepakeistas. Visų kokybės vartų priėmimo dar nėra.

[Pokalbių, laiškų ir visų ratų peržiūra](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-summary/index.html) · [JSON](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-summary/summary.json) · [Originalių klaidų sąrašas](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-summary/REPORT.md).

## Apimtis ir rezultatai

Šešios esamos nišos gauna atskirą profilį, conversation / sales / supplier instrukcijas ir bendrus core / role fragmentus. Žinios užšaldytos iš 62 patvirtintų vietinių puslapių projekcijos. Tai ne tikro domeno paleidimo įrodymas. Istorinio archyvo, kitų nišų kontaktų ar nepatvirtintų tiekėjų duomenys neperkelti į verslo faktus.

| Niša | Puslapiai | Bazinis | Kandidatas 1 | Kandidatas 2 | Galutinis | Nauji blind |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| akmenas.lt | 11 | 10/12 | 1/2 | 2/2 | 4/6 | 3/4 |
| auksarankiams.lt | 13 | 10/12 | 2/2 | 1/2 | 5/6 | 4/4 |
| greitossvetaines.lt | 7 | 9/12 | 2/2 | 2/2 | 3/6 | 2/4 |
| laiptucentras.lt | 11 | 10/12 | 2/2 | 2/2 | 5/6 | 3/4 |
| roletaiklaipedoje.lt | 9 | 10/12 | 2/2 | 2/2 | 5/6 | 3/4 |
| traktoriupadangos.lt | 11 | 10/12 | 1/2 | 2/2 | 6/6 | 4/4 |
| **Iš viso** | **62** | **59/72** | **10/12** | **11/12** | **28/36** | **19/24** |

96 unikalūs užšaldyti dviejų žinučių klientų scenarijai apima naujoką, tikslų poreikį, pataisytus duomenis, skubą, kainos prieštaravimą, ekspertą be kontakto, piktą klientą, tiekėją, pavojingą / ne nišos klausimą, instrukcijų manipuliaciją, anglų kalbą, tik telefoną, neaiškią ribą, tiekėjo paiešką be leidimo kontaktuoti ir neapibrėžtą užsakymo / mokėjimo teiginį.

Keturiuose ratuose 132 klientų scenarijų vykdymai, ne 132 unikalūs klientai. Su vienu diagnostiniu ir trimis vėlesnėmis regresijomis – 136. Pagrindiniuose ratuose 1 016 Codex CLI kvietimų, 63 įrankio inicijuotos formos ACK ir 65 faktiniai core laiškų juodraščiai. Telefonas ir atsisakymas palikti kontaktą neturi automatiškai virsti el. laišku. Po pokalbio pateikiamas kontaktas yra atskiras palaikomas kelias.

## Koks kanalas ir kas tikrai vykdyta

Dialogai naudoja tą patį `service`, izoliuotą tikrą PostgreSQL būseną, worker claim / epoch / events / tools, pasirašytas contact / UI / end procedūras bei analysis / quality / followup jobs. Kliento pusės parodymo ACK pateikia laboratorijos klientas; tai nėra šio rato realaus naršyklės popup ar mikrofono patikra. Modelio prašymai pereina per core kontraktus.

Pokalbio modelio įvestyje nėra persona, split, test žymų ar tikro gavėjo kontakto. Privatūs administraciniai įrašai išsaugo kilmę. Klientui skirtos temos ir tekstai atrodo kaip įprastas aptarnavimas. Modelis – vietinio Codex CLI numatytasis, **ne Gemini Live**. STT / TTS, tarimas, pertraukimas, gyvo skambučio delsa ir Gemini įrankių kvietimų kokybė nepatikrinti.

Rašytojas parengia kontekstinį laišką; atskiras modelio kvietimas tikrina teiginius pagal patvirtintas žinias. Patvirtinimas susiejamas su turinio hash, knowledge versija ir evidence ID. Tikras followup job parenka projekciją; neatitikus lieka grounded fallback. Quality tikrina faktinį core laišką. Vertintojai yra atskiri to paties providerio kvietimai; rubric suderinimas su žmogumi nepatvirtintas.

Šiame etape SMTP išjungtas: 65 juodraščiai nėra 65 gauti laiškai. Ankstesni keturi tikri savininko laiškai ir trys gauti atsakymai iki PDF išankstinės sąskaitos dokumentuoti [atskirame pardavimo etape](SALES_CALIBRATION_2026-10-01.md). Jo pristatymo įrodymas neperkeliamas visoms šešioms nišoms.

## Intervencijos ir savikalibravimas

1. Bazinis ratas išsaugotas prieš diagnozę. Jo anglų / telefono holdout po peržiūros laikomi panaudotais kalibravimui.
2. Codex kalibratorius sukūrė du append kandidatų variantus: 10/12, tada 11/12. Nė vienas neaktyvuotas; dviejų atvejų regresija nėra apsaugotas bendras priėmimas.
3. Vykdantis agentas pataisė bendras pirmos atsakymo kalbos ir neatidėliotino formos kvietimo instrukcijas. Tai vykdančio agento intervencija, ne įrodyta autonominė promptų evoliucija. 24 blind tekstai patch kalibratoriui nepateikti; perskaityti tik užbaigus ratą diagnozei.
4. Po galutinio rato count kontraktas normalizuoja aiškius `5 puslapiai` / `2 vnt.` į `5` / `2`, palieka originalą ir kliento event. Intervalų, matmenų ir dviprasmiškų kiekių nespėja.
5. Analysis / quality schema prieš generavimą apriboja evidence nuorodas šio pokalbio leistinais ID; serverio patikra palikta. Ankstesnio ValueError tiksli priežastis išvestyje užmaskuota, todėl konkretaus jo evidence kodo retrospektyviai nepatvirtiname.
6. Akmenas telefono scenarijus po CLI timeout, greitossvetaines telefono apdorojimas ir greitossvetaines `5 puslapiai` / nepatvirtinto mokėjimo scenarijus atskiruose pakartojimuose praėjo 3/3. Originalios klaidos išsaugotos.
7. Laiptų atvejyje `need.patch` nepasiekė core: Codex adapteris sugeneravo netinkamą `arguments_json`. Tai atskirta nuo serverio įrankio gedimo.
8. Vertintojui pridėtas tikras kontakto laikas. Keturiuose vertinimuose buvo reikalaujama dialoge patvirtinti po pokalbio pateiktą kontaktą. Tai neteisinga chronologija; originalūs įvertinimai į PASS neperrašyti ir be naujos peržiūros prie rezultatų nepridėti.
9. Worker shutdown atšaukia / užbaigia UI užduotis prieš HTTP kliento uždarymą; startup timeout nebelaikomas normaliu pokalbio pabaigos įvykiu. Testų DB pooling sulygintas su runtime, paliekant tą patį dviejų sekundžių UI kontraktą. Ankstesni kritimai lieka dokumentuota intervencija.

Penkių nišų galutiniuose quality rezultatuose tikras core sukūrė po issue / candidate / static_eval artefaktą. Static PASS nereiškia elgesio PASS ar aktyvavimo. Vienas hint siūlė pridėti kalbos regresijos testą – tai darbų pasiūlymas, ne pataisytas atsakymo elgesys. Auto-promotion nėra.

## Tiekėjai

12 atskirų scenarijų, po du kiekvienai nišai. Agentas pasirinko šaltinius iš riboto katalogo ir kvietė tikrą viešą HTTP fetch: 22 GET kvitai, 18 sėkmingų. Nepavykusio šaltinio turinys nesugalvotas. Pradinį katalogą atrinko vykdantis agentas, todėl tai nėra savarankiškos neribotos interneto paieškos įrodymas.

Pradinis RFQ / faktų rezultatas 11/12. Viename akmens atvejyje nepasiektas šaltinis pateko į findings vietoje fetch ribotumo; po atmetimo naujas juodraštis praėjo. Originalus 11/12 išlieka. RFQ lietuviškai ir vokiečių tiekėjui vokiškai parengti be siuntimo, duomenų perdavimo, partnerystės ar kainos / likučio patvirtinimo. [RFQ peržiūra](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-v1/suppliers/index.html).

Paieškos adapteris dar neprijungtas prie pokalbio keturių leistinų tools. Greitossvetaines tiekėjo paieškos laiškas pernelyg grįžo prie mūsų svetainės paketo ir kainos, užuot laikęsis prašyto vykdytojo paieškos duomenų sąrašo. Tai tikra aptarnavimo klaida. Pilnas savarankiškas tiekėjų derybų ciklas dar nepatvirtintas.

## Jev – faktinė būsena

`src/pinet_core/jev_router.py` – OpenRouter Decisions adapteris su `typesafe/jev-1.13` sutartimi: devynios intencijos, ankstesnės specifikacijos pataisymo požymis, pasiūlyta role ir tik leistini tools. Numatytai išjungtas; neprijungtas prie worker dialogo ar klientų kalibravimo. **Tikri Jev API kvietimai: 0.** Aštuoni testai su imituotu HTTP neįrodo lietuviškų intencijų tikslumo, kainos ar p95 delsos.

Numatyta paskirtis – fone pasiūlyti kitą užduotį / instrukcijų paketą. Pagrindinis modelis kalba; core tikrina teises, epoch / revision ir įrankių kvitus. Pasenusi užuomina atmetama. Klasifikatorius nenustato kliento sutikimo, patvirtinto mokėjimo, tiekėjo faktų ar teisės siųsti. [Routerio architektūra ir oficialūs šaltiniai](ROUTING_AND_INTELLIGENCE.md).

## Likę priėmimo darbai

- Auksarankiams pirmas atsakymas anglų klientui kartais lietuviškas. Laiško kalba tame atvejyje teisinga. Reikia patikimesnės kalbos kontrolės ir platesnės regresijos.
- Su tikru kontakto laiku pakartoti tiekėjų paieškos vertinimus; ištaisyti greitossvetaines prašymo konteksto praradimą ir adapterio JSON. Rezultatų iki pataisų neištrinti.
- Užfiksavus pataisas atlikti naują vertinimą su naujais nepanaudotais scenarijais bei žmogaus peržiūra. Pakartotas perskaitytas blind jau yra regresija.
- Jev ribotas realus shadow palyginimas po atskiros key / biudžeto konfigūracijos; aktyvuoti tik išmatuotą naudą teikiančią dalį.
- Tikras Gemini Live, garsas, naršyklės formos, perskambinimas ir kelių nišų laiškų pristatymas yra atskiri vartai. Gamybinio balso / SMTP flags kampanija nepakeitė.
- Pardavimo scenarijams būtini realūs komerciniai duomenys ir vykdymo teisės; nepakeisti jų išgalvotais tiekėjais, vizitais, meistrais ar likučiais.

## Techninė patikra

Galutinis visas Python rinkinys: **181 PASS, 0 FAIL, 155,33 s**. Siauras pakeistų Python failų Ruff ir `node --check scripts/network_manifest.mjs` praėjo. Prieš tai buvo 180 PASS / 1 FAIL: billing regresijos fixture trūko naujai privalomos evidence įvesties. Fixture papildytas pokalbio evidence, mokamo usage išsaugojimo assertion nepakeistas; tikslinis 14 testų rinkinys ir paskutinis pilnas rinkinys praėjo. Tai nėra 181 gyvas klientas ar 181 Gemini skambutis.

Tik savas vietinis 8840 API ir jo jobs procesas perkrauti, kad naudotų naują kodą. Tikras HTTP health ir operatoriaus registras rodo šešias nišas, voice_ready=false. Gamybiniai voice / SMTP flags liko išjungti; svetimi procesai nestabdyti. [Būsenos kvitas](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-summary/runtime-check.json).

Suvestinė atkuriama `scripts/network_release_report.py`; pirmų ratų katalogai neperrašomi.
