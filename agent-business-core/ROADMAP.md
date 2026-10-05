# Agentinių verslų core įgyvendinimo roadmapas

Data: 2026-09-30. Checkboxas žymimas tik kai yra patikrinamas rezultatas. Šiame darbe užbaigta planavimo fazė; runtime, keturių verslų simuliacijos ir jų savarankiškas tobulinimas dar neįgyvendinti.

Priklausomybės: `M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9`. Pirmas automatinis tobulinimas atsiranda M3, nelaukiant pilno keturių verslų įgyvendinimo M4. Eiliškumas paremtas patikrinamomis išėjimo sąlygomis; kalendorinių datų ir nepramatuotos trukmės nežadame.

M1 jau turi minimalų įrankių registrą, žurnalą ir sustabdymo kontrolę. M3 jau turi tikrą kūrimo izoliaciją, apsaugotus vertinimo vartus ir tikrinamo artefakto įjungimą. M5 bei M6 išplečia šias dalis; jų nereikia laukti, kad pirmas tobulinimas būtų kontroliuojamas. Iki M7–M8 visi pilni sandoriai ir automatinis kodo įjungimas vyksta tik simuliacijų aplinkoje.

Domenų AI vertinimas → DR ir istorijos patikra → TOP kandidatų atranka bei viešų pirmos fazės svetainių paklausos matavimas yra lygiagretus darbo srautas. Jis nelaukia M9. M9 prijungia šių tyrimų rezultatus prie jau patikrinto operacinio core; 100 domenų pirkimas nėra būtina pirmos simuliacijos sąlyga.

## M0 Planas ir darbo ribos

- [x] Perskaityti projekto taisykles ir koordinavimo žurnalą.
- [x] Atskirti turinio studiją, viešų svetainių core ir naują operacinį core.
- [x] Pasirinkti modulinę architektūrą ir patvaraus vykdymo principus.
- [x] Aprašyti keturis skirtingus simuliuojamus verslus.
- [x] Aprašyti simuliacijas ir tobulinimą nuo pirmo bandymo.
- [x] Aprašyti autonominį release ir savininko klausimų taisyklę.
- [x] Sukurti šį roadmapą su išėjimo sąlygomis.
- [x] Patikrinti domenų vertintojo tikrą `gpt-6.1-sol / xhigh` kvietimą.
- [x] Pakartotinai audituoti planą, ištaisyti priklausomybes ir dokumentuoti spragas [REVIEW.md](REVIEW.md).

Įrodymai: šio katalogo dokumentai; domenų vertintojo kodo pakeitimas ir tikras penkių domenų bandymas. Šio etapo dokumentai neįrodo veikiančio operacinio core.

## M1 Patvarus vykdymas ir kontrolė

- [ ] Sukurti Python modulio struktūrą, dependency lock ir paleidimo konfigūraciją.
- [ ] Paleisti vietinę PostgreSQL ir migracijų sistemą.
- [ ] Sukurti verslų, agentų, užduočių, vykdymų, įvykių ir artefaktų modelį.
- [ ] Atskirtai sukurti simuliacijos aplinką ir DB prisijungimus.
- [ ] Įgyvendinti DB roles, RLS ir serverio nustatomą verslo kontekstą.
- [ ] Patikrinti ryšio pakartotinį naudojimą dviem nišoms ir artefaktų prieigos ribas.
- [ ] Įgyvendinti patvarią eilę: lease, heartbeat, bandymai ir retry laikas.
- [ ] Pridėti `lease_generation` ir atmesti pasenusio vykdytojo rezultatą bei veiksmą.
- [ ] Įgyvendinti outbox, idempotency raktus ir išorinių kvitų registrą.
- [ ] Pridėti patvarų `action_id`, argumentų hash ir `unknown` sutikrinimo eigą.
- [ ] Įrodyti, kad naujas job bandymas nepakeičia to paties veiksmo idempotency rakto.
- [ ] Viena transakcija rezervuoti komercinį limitą ir išbandyti du konkuruojančius veiksmus.
- [ ] Įgyvendinti API, worker ir scheduler procesų paleidimą bei stabdymą.
- [ ] Pridėti laiko, žingsnių, kvietimų ir paralelumo ribas.
- [ ] Įgyvendinti aiškų mandato ir įrankių teisių tikrinimą.
- [ ] Sukurti minimalų versijuotą testinių įrankių registrą ir jo leidimų profilius.
- [ ] Pridėti Codex CLI adapterį: explicit modelis, schema, timeout, usage ir klaidos.
- [ ] Patikrinti techninio CLI profilio instrukcijų šaltinius ir kitų nišų konteksto nebuvimą.
- [ ] Nesuteikti operaciniams agentams projekto sekretų ar laisvo shell.
- [ ] Patikrinti paskyros limito laukimo būseną be tylaus modelio pakeitimo.
- [ ] Pridėti minimalų būsenos API, incidentų žurnalą ir sustabdymo valdiklį.
- [ ] Išbandyti, kad sustabdymas atmeta naujus veiksmus ir sutikrina jau išsiųstus.
- [ ] Išbandyti perkrovimą tarp užduoties paėmimo, veiksmo ir rezultato išsaugojimo.
- [ ] Įrodyti, kad viena niša negali skaityti ar keisti kitos nišos duomenų.

Išėjimo sąlyga: ta pati užduotis po perkrovimo pasiekia vieną teisingą galutinę būseną, o kartojimas nesudubliuoja šalutinio veiksmo. Įrodymas — pakartojimo ir procesų nutraukimo testų ataskaita.

## M2 Direktorius ir pirmas verslo procesas

- [ ] Sukurti verslo, mandato ir agento aprašų schemas.
- [ ] Sukurti bendrą direktoriaus instrukciją ir minimalų specialisto šabloną.
- [ ] Registruoti instrukcijų versijas ir hash kiekvienam vykdymui.
- [ ] Aktyvuoti tik nekintamą patikrintą agento paketą; išbandyti `proposed → active` eigą.
- [ ] Įgyvendinti direktoriaus kuriamo specialisto schemos bei teisių patikrą.
- [ ] Apriboti aktyvių rolių skaičių ir delegavimo gylį.
- [ ] Sukurti `pilot_physical` testinį verslo paketą.
- [ ] Leisti direktoriui suformuoti užklausos ir tiekėjo pasiūlymų komandos roles.
- [ ] Sukurti testinius kontaktus, pasiūlymus, kainas, pristatymą ir mandatą.
- [ ] Užfiksuoti pardavėjo, tarpininko, lėšų gavėjo ir komisinio vaidmenis sandoryje.
- [ ] Įgyvendinti `NextAction`, įrankio rezultatą ir patvarų pokalbio tęsimo ciklą.
- [ ] Sukurti pasiūlymo ir dokumento artefaktą iš struktūruotų duomenų.
- [ ] Parodyti pirmą pilną kelią nuo užklausos iki testinio rezultato.

Išėjimo sąlyga: direktorius registruoja reikalingą komandą, specialistai apsikeičia patikrintais rezultatais, o galutinis pasiūlymas egzistuoja DB ir artefaktų saugykloje.

## M3 Pirma simuliacija ir automatinė pataisa

- [ ] Sukurti scenarijaus kontraktą, pasaulio būseną ir virtualų laikrodį.
- [ ] Sukurti atskirus kliento ir tiekėjo aktorių kontekstus.
- [ ] Prijungti tik testinius pašto, pasiūlymų ir dokumentų adapterius.
- [ ] Sukurti pirmą scenarijų su teisinga etalonine būsena.
- [ ] Įterpti žinomą pataisomą transporto sumos klaidą į leistiną modulį.
- [ ] Programiškai aptikti klaidą ir automatiškai sukurti deduplikuotą issue.
- [ ] Sistemos agentui automatiškai sukurti pataisos planą ir kūrimo užduotį.
- [ ] Paleisti programavimo agentą izoliuotoje aplinkoje be produkcijos prieigų.
- [ ] Bandymu atmesti prieigą prie hosto, Codex prisijungimų, apsaugoto valdiklio ir tikro siuntimo.
- [ ] Užfiksuoti Git diff, instrukcijų ir bazinės versijos hash.
- [ ] Sukurti atskirą vertinimo vykdytoją ir apsaugotų patikrų rinkinį.
- [ ] Kalibruoti pokalbio vertintoją žinomais pavyzdžiais ir įgyvendinti `inconclusive` baigtį.
- [ ] Užfiksuoti bazę, metrikas, privalomą rinkinį ir leidimo politiką prieš kandidatą.
- [ ] Patikrinti pataisą, pakartoti simuliaciją ir palyginti su baze.
- [ ] Patikimu procesu surinkti paketą ir įjungti tik vertinto artefakto hash.
- [ ] Automatiškai įjungti sėkmingą pataisą tik praėjus fiksuotiems vartams.
- [ ] Tyčia pateikti blogą pataisą ir įrodyti automatinį atmetimą.
- [ ] Įrodyti, kad kūrimo agentas negali sumažinti slenksčio ar perrašyti release kontrolės.
- [ ] Atmesti pakeistą artefaktą, suklastotą ataskaitą ir pasenusios bazės leidimą.
- [ ] Patikrinti senos aktyvios bylos sustabdymą bei tęsimą iš patvaraus checkpoint.
- [ ] Apriboti pataisų bandymus; išnaudojus biudžetą pereiti į `deferred`.
- [ ] Įrodyti, kad `deferred` pratęsimas neatnaujina bendro incidento naudojimo limito.

Išėjimo sąlyga: nuo klaidos aptikimo iki pataisos įjungimo nereikia savininko programavimo ar rutininio patvirtinimo. Ataskaitoje matomi prieš ir po rezultatai, diff, testai ir release sprendimas.

## M4 Keturi skirtingi verslai

- [ ] Užbaigti fizinių prekių procesą: prieinamumas, transportas, komisinis ir atšaukimas.
- [ ] Sukurti `pilot_local`: teritorija, matavimas, vizito rezervacija ir kainos patikslinimas.
- [ ] Sukurti `pilot_project`: projekto apimtis, etapai, pakeitimai ir priėmimas.
- [ ] Sukurti `pilot_digital`: produktas, licencija, testinis mokėjimas ir failo prieiga.
- [ ] Kiekvienam direktoriui leisti suformuoti komandą pagal jo proceso poreikį.
- [ ] Įgyvendinti bendrus objektus be atskirų apskaitos ar pašto kopijų.
- [ ] Kiekvienai nišai paruošti bent 20 scenarijų, įskaitant sutrikimus.
- [ ] Kiekviename versle įrodyti atkūrimą po proceso nutrūkimo.
- [ ] Patikrinti dublikatus, pasenusias pasiūlymų versijas ir neaiškų API rezultatą.
- [ ] Patikrinti piktavališkas instrukcijas laiške ir tiekėjo dokumente.
- [ ] Patikrinti konflikto atvejus: paskutinis laikas, prekės likutis ir naudojimo biudžetas.
- [ ] Parodyti vienos bendro modulio pataisos naudą keliose nišose.
- [ ] Pateikti kūrėjui iš anksto nežinomą gedimą ir išmatuoti savarankiškai parinktos pataisos naudą.
- [ ] Išbandyti po priėmimo vykstančius atšaukimus, ginčus, grąžinimus ir vėluojančius kvitus.

Išėjimo sąlyga: keturių verslų procesai pasiekia patikrinamas teisingas būsenas; rezultatai pateikti kiekvienai nišai atskirai. Bendras sėkmės procentas nepaslepia vieno neveikiančio piloto.

## M5 Darbo aplinkos ir įrankių kūrimas

- [ ] Išplėsti M1 įrankių registrą naujų agento kuriamų adapterių priėmimui.
- [ ] Įgyvendinti naujo įrankio poreikio aprašą ir sutarties testų šabloną.
- [ ] Leisti specialistui inicijuoti trūkstamo adapterio kūrimo darbą.
- [ ] Išplėsti M3 patikrintą kūrimo izoliaciją naujų įrankių ir priklausomybių darbams.
- [ ] Kontroliuoti priklausomybių versijas, lock failus ir vykdomus diegimo žingsnius.
- [ ] Patikrinti automatiškai sukurto įrankio įėjimo, išėjimo ir klaidų schemas.
- [ ] Patikrinti aplinkos atskyrimą ir neleistino gavėjo blokavimą.
- [ ] Įregistruoti įrankį su konkrečia versija ir leistinais šalutiniais veiksmais.
- [ ] Parodyti specialistą, kuris sukuria, patikrina ir panaudoja naują leistiną įrankį.
- [ ] Įvertinti naują įrankį nematytuose scenarijuose ir palyginti su baze be šio įrankio.
- [ ] Įgyvendinti sekretų išdavimą tik tinkamam adapteriui ir jo paskirčiai.
- [ ] Sukurti `account_access` poreikį, kai naujai jungčiai būtina nepasiekiama registracija.

Išėjimo sąlyga: agentas pašalina tikrą testo proceso spragą nauju įrankiu, nepakeisdamas bendro teisių mandato ir negaudamas visų portfelio prisijungimų.

## M6 Apskaita ir savininko skydelis

- [ ] Surinkti keturių pilotų dokumentus per vieną apskaitos procesą.
- [ ] Susieti dokumentą su juridiniu asmeniu, niša ir sandoriu.
- [ ] Aptikti dublikatus, trūkstamus laukus ir neteisingas sumas.
- [ ] Susieti testinius mokėjimus su dokumentais ir užsakymais.
- [ ] Paruošti savininko dokumentų paketą ir neatitikimų suvestinę.
- [ ] Parodyti kiekvieno verslo sėkmę, naudojimą, trukmę ir testinę ekonomiką.
- [ ] Atskirai rodyti užsakymo vertę, mūsų pajamas, gautas lėšas, išlaidas ir grąžinimus.
- [ ] Aiškiai atskirti simuliacijos ir tikrus verslo rodiklius.
- [ ] Parodyti issue → pakeitimas → vertinimas → release istoriją.
- [ ] Sukurti vieną savininko klausimų eilę su dublikatų sujungimu.
- [ ] Leisti agentui klausti tik `account_access` ar `owner_fact` duomens.
- [ ] Gavus duomenį automatiškai pratęsti susijusius darbus.
- [ ] M1 sustabdymo API prijungti prie patogaus verslo, įrankio ir portfelio UI.

Išėjimo sąlyga: savininkas iš vieno vaizdo supranta būklę ir gauna dokumentų paketą. Įprasta techninė nesėkmė nesukuria jam užduoties programuoti ar patvirtinti pataisą.

## M7 Patikimumas ir ribotas realių sistemų prijungimas

- [ ] Išplėsti M3 užfiksuotus leidimo vartus visiems keturiems pilotams ir realių integracijų patikroms.
- [ ] Privalomus scenarijus pakartoti bent penkis kartus ir parodyti grupių rezultatus.
- [ ] Įrodyti, kad nėra kritinių pažeidimų privalomame išbandytame rinkinyje.
- [ ] Patikrinti pilną DB ir artefaktų atkūrimą į kitą aplinką.
- [ ] Patikrinti serverio perkrovimą, nutrūkusį CLI ir prarastą tinklą.
- [ ] Patikrinti rollback, kuris neištrina įvykusių dokumentų ar sandorių.
- [ ] Priskirti realiems procesams mandatą, operatorių ir aktualius faktus.
- [ ] Tikrinti konkrečių kanalų, sąskaitų šablonų ir adapterių realų funkcionalumą.
- [ ] Trūkstamas prieigas ar neviešus faktus surinkti per vieną savininko klausimų paketą.
- [ ] Prijungti esamo viešo core užklausas per koordinuotą, deduplikuojamą adapterį.
- [ ] Patikrinti, kad vieša forma veikia ir neveikiant agentų core.
- [ ] Paleisti stebėjimo režimą be papildomų komercinių veiksmų.
- [ ] Patikrinti realių duomenų minimizavimą, išsaugojimą ir prieigos atskyrimą.
- [ ] Išbandyti bendros dėžutės `unassigned` laiškus ir patikrintą pokalbio priskyrimą nišai.
- [ ] Įrodyti esamo turinio patvirtinimo ir publikavimo taisyklių išlaikymą per adapterį.
- [ ] Išbandyti operacijų pajėgumo rezervą, kai tuo pačiu metu vyksta domenų analizė ir eksperimentai.

Išėjimo sąlyga: pagrindinės gedimų grupės turi patikrintą atkūrimą, o realių sistemų funkcionalumas pagrįstas kvitais ir įrašais. Simuliacijos rezultatai nepateikiami kaip realių klientų aptarnavimas.

## M8 Realus autonominis procesas atrinktai nišai

- [ ] Dokumentuoti tikrą nišos paklausą ir pagrįstą sprendimą plėsti jos funkcijas.
- [ ] Patvirtinti tarpininko ir pardavėjo vaidmenis, pajamų įvykį ir dokumentų grandinę.
- [ ] Užtikrinti tikrą tiekėją ar paslaugos įvykdymą ir aktualias sąlygas.
- [ ] Įjungti tik mandato ir nišos fazės leidžiamus veiksmus.
- [ ] Naują versiją pradžioje taikyti ribotam naujų darbų srautui.
- [ ] Iš anksto fiksuoti srauto ribą, stebėjimo langą ir automatines sustabdymo priežastis.
- [ ] Stebėti realią maržą, konversiją, klaidas ir savininko minutes sandoriui.
- [ ] Realius incidentus paversti nuasmenintais atkuriamais scenarijais.
- [ ] Automatiškai grąžinti bloginančią programinę versiją arba apriboti susijusį veiksmą.
- [ ] Patvirtinti, kad autonominis tobulinimas nesumažina kritinių patikrų.
- [ ] Plėsti į kitas nišas pagal jų įrodytą naudą.

Išėjimo sąlyga: vienoje nišoje yra patikrinami tikri sandoriai ir ekonomika, o savininko įsitraukimas išmatuotas. Rezultatas nevertinamas vien apsilankymų ar gražių pokalbių skaičiumi.

## M9 Portfelio plėtra ir verslo perdavimas

- [ ] Core prijungti lygiagrečiai atliktų domenų, DR, nuorodų ir istorijos tyrimų rezultatus.
- [ ] Įgyvendinti naujos nišos paketą iš bendrų patikrintų modulių.
- [ ] Paskirstyti naudojimo biudžetą pagal išmatuotą nišos rezultatą.
- [ ] Turinio ciklą prijungti per esamos studijos ir paketo sutartį.
- [ ] Paruošti perleidžiamą verslo paketą: instrukcijos, procesai, teisėtos integracijos ir rezultatai.
- [ ] Numatyti atskirų prieigų keitimą, eksportą ir kliento duomenų perdavimo taisykles.
- [ ] Patikrinti vieno verslo iškėlimą neišardant kitų verslų.
- [ ] Pirmą pardavimo kanalą kurti pagal realiai turimus ir pagrįstai aprašomus verslus.

Išėjimo sąlyga: nauja niša nepaverčia core nauja atskira kodo kopija, o perleidžiama niša turi atsekamus rezultatus bei dokumentuotą eksploatavimą.

## Vieno darbo užbaigimo įrodymas

Kiekvienas įgyvendinimo punktas turi savininką arba agento rolę, rezultatą, patikrą, artefakto nuorodą ir versiją. Checkboxas nežymimas vien dėl to, kad agentas parašė „atlikta“. Nepavykęs darbas lieka su atsekama priežastimi, atkuriamu pavyzdžiu ir kita leistina užduotimi.

## Pirmas konkretus įgyvendinimo paketas

Artimiausias kodavimo darbas: M1 patvarus vykdymas ir kontrolė, M2 vienas fizinių prekių procesas, M3 pirmos simuliacijos aptikta automatinė pataisa. Šis paketas turi parodyti tikrą sistemos mechanizmą prieš pridedant platesnę keturių verslų apimtį.
