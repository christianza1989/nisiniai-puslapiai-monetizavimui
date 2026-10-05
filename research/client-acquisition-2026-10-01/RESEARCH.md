# AI klientų paieška mūsų nišoms

Tyrimas atliktas 2026-10-01. Sprendimas: prie SEO reikia pridėti bendrą klientų paieškos procesą, kurio atranka ir pasiūlymas konfigūruojami kiekvienai nišai. Pirmiausia automatizuoti tyrimą, poreikio signalų aptikimą ir gaunamų užklausų paruošimą. Siuntimas yra atskira, leidimus ir tiekėjo sąlygas tikrinanti operacija. Šiame darbe parengti tyrimas, integracijos sutartis ir skill; klientai nekontaktuoti, mokamos paskyros neprijungtos, veikiantis pardavimo agentas nesukurtas.

## Ką jau daro praktikoje

| Modelis ir patikrintas šaltinis | Kas konkrečiai vyksta | Įrodymo ribos ir pritaikymas mums |
|---|---|---|
| [Clay / Intercom atvejis](https://www.clay.com/customers/intercom) | CRM duomenų papildymas ir nuolatinė įmonių atranka pagal darbuotojų skaičių, samdymą, technologijas ir svetainės požymius. Pardavėjui matomi atrankos argumentai. Atvejyje deklaruojamas 140 % iš aktyvios paieškos kilusių pardavimo galimybių augimas. | Tiekėjo paskelbtas konkretaus kliento atvejis, ne nepriklausomas eksperimentas. Tai nėra mūsų pajamų prognozė. Vertingiausia perimti paaiškinamą atranką ir patikrintus signalus, o ne jų kontaktų kiekius. |
| [Claygent / OpenAI atvejis](https://openai.com/index/clay/) | AI lankosi įmonių svetainėse, renka ir apibendrina informaciją, kurią anksčiau tikrindavo pardavimų tyrėjas. | Patvirtina naudojimo modelį. Bendras tiekėjo augimas neįrodo, kad bet kuri niša ar automatinis laiškas atsipirks. |
| [HubSpot agentas](https://www.hubspot.com/products/sales/ai-prospecting-agent), [naudojimo dokumentacija](https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent?swcfpc=1) | Įmonių stebėjimas pagal pirkimo signalus, kontaktų atranka, individualūs laiškai ir suplanuoti veiksmai. Dokumentacija numato ribotą kontaktavimą, sustabdymą po atsakymo ir eilę. | Mokamų planų / kreditų produktas. Mums tinka būsenos, signalų logika ir sustabdymas; nereikia pirkti visos sistemos prieš paklausos įrodymą. |
| [Apollo AI Research](https://knowledge.apollo.io/hc/en-us/articles/29193277882125-AI-Research-Overview), [Apollo MCP](https://docs.apollo.io/docs/apollo-mcp) | Įmonių ir žmonių paieška, duomenų papildymas, AI tyrimas, kontaktų ir kampanijų valdymas iš agento. MCP autentifikuojamas ir naudojasi paskyros teisėmis bei kreditais. | Priėjimas prie kontakto nėra pirkimo ketinimo ar leidimo reklamuoti įrodymas. Lietuvos mažų ūkių / meistrų aprėptis ir duomenų tikslumas mūsų atveju neišbandyti. MCP savaime nėra nemokama duomenų bazė. |
| [n8n bendruomenės workflow](https://n8n.io/workflows/8269-automate-b2b-lead-generation-and-email-campaigns-with-google-maps-sendgrid-and-ai/) | Apify surenka Maps įmones, svetainėse ieškoma adresų, informacija keliauja į lentelę, laiškai siunčiami per SendGrid, atsakymai klasifikuojami AI, vyksta pakartotiniai kontaktai. | Tai už 150 USD parduodamas trečiosios šalies šablonas su mokamomis priklausomybėmis, ne patikrintas klientų įsigijimo rezultatas. Nekopijuoti jo Maps kaupimo, blokavimo apėjimo, siuntimo ar atidarymų matavimo kaip mūsų numatytos praktikos. |

Išvada iš šių šaltinių: naudojamas visas procesas — surasti, patikrinti, atrinkti, pasiūlyti vertę, suvaldyti atsakymą ir pamatuoti rezultatą. Mano rekomendacija mums: pradėti nuo siauro proceso, kuriame kiekvienas pasirinktas adresatas turi patikrintą priežastį. Vien AI parašytas individualus tekstas nepaverčia netinkamo kontakto klientu.

## Iš kur ieškoti potencialių pirkėjų

**Tinkamumas ir momentas turi būti atskirti.** Įmonė gali naudoti traktorių techniką, bet dabar nepirkti padangų. Naujas įmonės registracijos įrašas gali būti tinkamumo signalas svetainėms, bet ne įrodymas, kad ji neturi svetainės ar biudžeto. Rangovas gali būti pirkėjas, rekomenduotojas arba mūsų vykdymo partneris. Šias roles laikyti atskirai.

| Kanalas | Ką agentas galėtų aptikti | Kada naudingas | Prieiga ir ribos |
|---|---|---|---|
| Įmonių svetainės ir jų naujienos | Tikras paslaugų pobūdis, naudojamos technologijos, nauja lokacija, naujas projektas, viešas verslo kontaktas | Svetainės, IT, BI, padangos įmonėms, rangovų poreikiai | Tikrinti faktinį puslapį ir datą; nepasikliauti vien paieškos santrauka. Skaityti leidžiamus puslapius ribotai, nesaugoti ištisų kopijų. |
| Viešai paskelbtos darbų užklausos | Žmogus ar įmonė jau įvardija darbą, vietą, apimtį ir laiką | Meistrai, statyba, laiptai, roletai, remontas | [Paslaugos.lt](https://paslaugos.lt/klientu-uzklausos) turi realų viešą užklausų kelią. Kontaktavimui / automatiniam naudojimui reikia konkrečių platformos teisių ir tikro vykdymo; jos šiame tyrime nepatvirtintos. |
| Viešieji pirkimai ir užklausos pasiūlymui | Aiškus perkamas rezultatas, terminas, pirkėjo reikalavimai | B2B, prekės ir rangovų darbai, kai turime vykdymą | [TED Search API](https://docs.ted.europa.eu/api/latest/search.html) leidžia anonimiškai skaityti paskelbtus skelbimus. [VPT](https://vpt.lrv.lt/lt/svetaines-medis/) nurodo dabartinę CVP IS. Ne visi Lietuvos maži pirkimai yra TED; pasiūlymų teikimas ir kvalifikacijos reikalavimai yra atskiras etapas. |
| Atviri įmonių duomenys | Įmonės identifikavimas, kodas, geografija, kai kurie registrų požymiai | Sąrašo tikslinimas ir dublikatų šalinimas | [RC buveinių rinkinys](https://data.gov.lt/datasets/1562/) turi kodą, pavadinimą ir adresus su CC BY 4.0. Jis nėra el. pašto adresų ar naujų pirkėjų sąrašas. Portalo metadata data neįrodo paskutinio kiekvieno įrašo atnaujinimo. |
| OpenStreetMap / Overpass | Vietos ir veiklos kategorijos, kartais svetainės | Papildomas vietinių įmonių atradimas | [ODbL licencija](https://www.openstreetmap.org/copyright) ir [viešų Overpass serverių ribos](https://wiki.openstreetmap.org/wiki/Overpass_API) galioja. Aprėptis nepilna; ne garantuotai tikslus ar neribotas katalogas. |
| Google Maps | Vietinių įmonių paieškos orientyras | Verslo tipų ir lokacijų pažinimas | [EEA sąlygų 3.3.2](https://cloud.google.com/terms/maps-platform/eea) riboja turinio išgavimą / saugojimą už paslaugų ribų. Nepaversti Maps ar jo API nuolatine mūsų prospectų duomenų baze. Kitus duomenis rinkti nepriklausomai iš leistinų šaltinių; paslaugos API naudojimas savaime nepanaikina naudojimo ribų. |
| Profesinės bendruomenės ir socialiniai kanalai | Aiškiai paprašyta rekomendacija ar pagalba | B2C poreikiai ir partnerių ryšiai | Atviras įrašas nėra leidimas masinėms privačioms žinutėms. Skaitymo, dalyvavimo ir automatizavimo teises tikrinti konkrečiai platformai / grupei. [LinkedIn](https://www.linkedin.com/legal/user-agreement) draudžia neleistiną scraping ir žinučių botus. |
| Mūsų pačių svetainės / inbox | Tikra užklausa, papildomi klausimai, grįžtantis klientas | Visos nišos | Didžiausia artimiausia nauda: neprarasti gauto poreikio, greitai paruošti tikslų atsakymą. El. pašto paspaudimas nėra gautas laiškas; anoniminio lankytojo nevadinti identifikuotu pirkėju. |
| Rekomendavimo partneriai | Įmonė jau turi mūsų nišai tinkamą auditoriją ar klientų srautą | Būsto administravimas, baldų pardavėjai, servisai, projektuotojai | Partnerio pokalbis nėra pirkėjo užklausa. Susitarimas, atlygis, kontaktų perdavimas ir paslaugos pajėgumas tikrinami atskirai. |

Praktinis atrankos pavyzdys iš viešo Paslaugos.lt puslapio: vienas montavimo poreikis kartu apima elektros pajungimą. Mūsų auksarankių pilotui tokios užduoties negalima priimti kaip paprasto kabinimo. Kitas įrašas turi rugsėjo 28 d. terminą, jau praėjusį tyrimo dieną; „prieš valandą“ paieškos kopijoje nėra šviežio poreikio įrodymas. Šiuos įrašus naudojau tik atrankos logikai, ne kaip kontaktuotinų žmonių sąrašą.

Nekursime 30 fiktyvių Google Business profilių paklausos surinkimo puslapiams: [Google taisyklės](https://support.google.com/business/answer/13763036?hl=en-en) lead generation įmones ir tik internetu veikiančius verslus įvardija kaip netinkamus. Profilį svarstyti tik pagal tikrą tinkamą veiklą.

## Nemokami įrankiai ir jų tikra kaina

| Variantai | Patikrinta būsena 2026-10-01 | Sprendimas mums |
|---|---|---|
| Esami Codex, Node ir vietiniai failai / SQLite | Jau turime generavimo ir darbo aplinką; duomenų paieškos / CRM runtime dar nėra | Pirmą tyrimo ir atrankos bandymą atlikti čia. Papildomos SaaS prenumeratos nereikia, tačiau esamas AI naudojimas, kompiuteris ir elektra turi kaštą bei ribas. Miegantis kompiuteris nėra 24/7 agentas. |
| n8n Community savame kompiuteryje | [Oficiali licencija](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md) leidžia savo vidinius verslo procesus; nėra įprasta neribota OSS licencija | Galimas būsimas jungiklis tarp šaltinių, duomenų ir inbox. Dabar neinstaliuotas; nekurti atskiro n8n kiekvienai svetainei. Viešai parduodamos / klientų valdomos sistemos licenciją vertinti iš naujo. |
| Firecrawl API / MCP | [Kainynas](https://www.firecrawl.dev/pricing) nurodo 1 000 kreditų per mėnesį be kortelės. [Oficialus MCP](https://github.com/firecrawl/firecrawl-mcp-server) siūlo paieškos ir išgavimo priemones, įskaitant ribotą keyless kelią | Geriausias papildomas kandidatas mažam leidžiamų šaltinių paieškos / išgavimo testui, jei esamo browser / HTTP nepakanka. Naudoti tik būtinus skaitymo įrankius, be mokamo papildymo. Mūsų prieiga ir faktinis limitas dar neišbandyti. |
| Apollo | [Dabartinis kainynas](https://www.apollo.io/pricing) turi nuolatinį ribotą free planą; laisvame plane pašto integracija nurodyta su Gmail. Kreditų skaičiai paieškos kopijoje ir dabartinio puslapio išvestyje nesutampa | Tik neprivalomas mažas Lietuvos B2B aprėpties testas. Free Hostinger SMTP integracijos neįrodyta; 900 metinių kreditų nelaikyti patvirtintu dabartinės paskyros faktu. |
| Clay | [Kainyno DUK](https://www.clay.com/pricing) nurodo Free: 100 Data Credits ir 500 Actions/mėn., Launch nuo 185 USD/mėn. | Mažas palyginamasis testas galimas, masinis procesas neatitinka mūsų nemokamo starto. Kainyno sekcijos apie free kampanijas prieštarauja viena kitai; faktines paskyros teises būtina patikrinti. |
| Apify | [Kainynas](https://apify.com/pricing) nurodo 5 USD/mėn. free panaudojimą, skirtingus Actors / compute / proxy kaštus | Ne numatytoji Maps surinkimo sistema. Kreditas negarantuoja nemokamo konkretaus Actor ar jo šaltinio naudojimo teisių. |
| HubSpot Breeze | [Produkto puslapis](https://www.hubspot.com/products/sales/ai-prospecting-agent) nurodo planus ir HubSpot Credits | Geras proceso etalonas, ne mūsų pasirinkta nemokama infrastruktūra. |
| TED / RC / OSM | Aukščiau nurodyti vieši arba atvirai licencijuoti šaltiniai | Pirmiausia tikrinti tikslumą ir tinkamumą nišai. TED docs, Swagger konfigūracija ir OpenAPI šiame kompiuteryje grąžino 200; paieškos verslo užklausa nebuvo vykdyta. RC / Overpass realus duomenų importas nebandytas. |

Kainynų skaitymas nėra mokamo produkto pirkimas ar funkcijos patikra. MCP prijungia įrankį prie agento; nepadaro duomenų, tokenų ar siuntimo nemokamų. Neprijungti įrankio vien dėl „AI SDR“ pavadinimo.

## Lietuvos laiškų siuntimo sprendimas

[VDAI 2026-05-19 DUK](https://vdai.lrv.lt/public/canonical/1779182967/1405/05-19_DUK_Tiesiogin%C4%97%20rinkodara_juridiniai_asm_svetainei.pdf) aiškina nuo 2026-04-22 galiojančią ERĮ 81 str. pataisą: juridinio asmens abonentui išankstinio rinkodaros sutikimo nebereikia, tačiau kiekviename pranešime būtinas aiškus nemokamas atsisakymas, jis vykdomas nedelsiant, išsaugant įrodymą. Tai gali apimti įmonės darbuotojo darbinį kontaktą. Fizinio asmens atvejis lieka atskiras; ūkininko ar individualios veiklos vykdytojo negalima automatiškai laikyti juridiniu asmeniu. Esamo fizinio kliento panašių prekių išimtis turi savo sąlygas; vien pateikta užklausa nėra įvykęs pardavimas.

[Hostinger taisyklės](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/) draudžia unsolicited emails adresatams be opt-in. Todėl šaltos B2B kampanijos iš `info@pinet.lt` dabar nenumatytos, nors nacionalinė išimtis gali leisti patį B2B kontaktavimą. Iš šios dėžutės numatyti gautų poreikių atsakymus, sutartą partnerių komunikaciją ir tinkamai prenumeruotą kontaktavimą. Pirkėjų paieška gali prasidėti be šaltų laiškų siuntimo.

Vardinis įmonės kontaktas gali būti asmens duomuo. [EDPB pagrindai](https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en) reikalauja tinkamo tikslo, būtinų duomenų, jų tikslumo ir saugojimo ribų. [Teisėtas interesas](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en) vertinamas konkrečiai, ne įjungiamas vien žodžiu „B2B“. [Informavimo ir prieštaravimo teisės](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en) galioja ir netiesiogiai gautiems duomenims: informavimas paprastai per mėnesį, anksčiau pradėjus bendrauti — pirmame kontakte. Atsisakymas rinkodarai sustabdo jos vykdymą. Tarptautinėms kampanijoms Lietuvos taisyklės neperkeliamos automatiškai.

Mūsų projektinis pasirinkimas: vienas viso MB Pinet tinklo rinkodaros atsisakymo registras su aiškia apimtimi; neperskambinti iš kito domeno, kai žmogus atsisakė visos komunikacijos. Atsakymas į naują jo užklausą vertinamas atskirai nuo reklamos. Laiško siuntėjo, nišos ir operatoriaus tapatybė turi sutapti su tikrais faktais.

## Kaip pritaikytume 20 nišų

Tai kanalų hipotezės, ne nauji patvirtinti BUSINESS sprendimai. Auksarankių ir laiptų atvejais remiamasi jų aktualiais BUSINESS; likusioms nišoms prieš naudojimą patikrinti faktinį pasiūlymą, vykdymą ir auditoriją. Seni studijos seed aprašai nėra autoritetas.

| Niša | Pirkėjo / nuolatinio kliento paieškos kryptis | Atskira partnerio kryptis ir pirmas tikras signalas |
|---|---|---|
| greitossvetaines.lt | Paslaugų įmonės su patikrintu kontaktavimo ar svetainės naudojimo trūkumu | Marketingo specialistai; įvardytas noras sutvarkyti konkrečią svetainę ir laikas |
| traktoriupadangos.lt | Žemės ūkio bendrovės, technikos / teritorijų priežiūros įmonės | Padangų tiekėjai ir servisai; tikras dydis, kiekis, panaudojimas, terminas |
| auksarankiams.lt | Būsto administratoriai, nuomos valdytojai; gyventojų konkretūs darbų poreikiai | Baldų pardavėjai, kraustytojai, meistrai; darbų sąrašas ir vieta be nepatvirtinto atvykimo pažado |
| laiptucentras.lt | Statybos įmonės ir savininkai konkrečioje vidaus laiptų įrengimo stadijoje | Projektuotojai / gamintojai; aukštai, stadija, vieta ir pageidaujamas rezultatas |
| roletaiklaipedoje.lt | Biurų / patalpų valdytojai, realiai įsirengiantys klientai | Langų specialistai / montuotojai; langai, patalpos ir sprendimo poreikis |
| akmenas.lt | Virtuvių gamintojai ir konkretaus stalviršio ieškantys klientai | Akmens apdirbėjai; matmenys, apdirbimas, paskirtis ir terminas |
| autoelektrikaivilniuje.lt | Automobilių parkai, taksi / pristatymo įmonės su konkrečiu gedimu | Remonto įmonės; automobilis, simptomas, vieta; neskelbti turint meistrą |
| tvirti-pamatai.lt | Statybų įmonės ir projektų užsakovai | Projektuotojai / rangovai; realus projektas ir statybos stadija |
| businessintelligence.lt | Įmonės, kurioms realiai reikia pasikartojančių ataskaitų | Apskaitos / ERP specialistai; konkretus duomenų šaltinis ir mokamas rezultatas |
| pliusstatyba.lt | Būsto valdytojai ir konkretūs vonios atnaujinimo poreikiai, jei patvirtinta ši kryptis | Rangovai; apimtis, vieta, laikas |
| mtaisykla.lt | Įmonių įrenginių parkai ir konkretūs remonto poreikiai | Remonto partneriai; modelis / gedimas, be išgalvotos diagnostikos ar kainos |
| klaidu-taisymas.lt | E. prekybos įmonės su atkuriama svetainės klaida | E. prekybos agentūros; konkretus klaidos scenarijus, be neautorizuoto saugumo testavimo |
| e-statybai.lt | Rangovai, perkantys konkrečią medžiagų partiją, jei BUSINESS tai patvirtina | Medžiagų tiekėjai; kiekis, specifikacija, terminas |
| smulkusurmas.lt | Maži prekybininkai / gamintojai su pasikartojančiu pakuočių poreikiu | Pakuočių gamintojai; pakuotės specifikacija ir kiekis |
| namudekoravimas.lt | Būsto / nuomos valdytojai ir konkrečių patalpų užsakovai | Interjero / apdailos partneriai; patalpa, tikslas ir apimtis |
| apartmentstrakai.lt | Kelionių organizatoriai ir žmonės su konkrečiomis apsistojimo datomis | Tikri apgyvendintojai; data ir žmonių skaičius; jokių netikrų laisvų kambarių |
| tiknamams.lt | Nuomos valdytojai su būsto paruošimo poreikiu, jei ši kryptis išlieka | Valymo / remonto partneriai; konkretus būstas ir darbai |
| rentbook.lt | Nuomos administratoriai su realiu administravimo procesu | NT specialistai; konkretus proceso sunkumas; neparduoti neegzistuojančios platformos |
| storyline.lt | Įmonės, kurioms reikia konkrečios kliento istorijos / medžiagos | Marketingo agentūros; tikras turinio užsakymas ir leidimai naudoti istoriją |
| estrategija.lt | Įmonės su konkrečiu užklausų ar pardavimo proceso trūkumu | Apskaitos / integracijų specialistai; konkretus audito / automatizavimo poreikis |

Nuolatinės prekės / paslaugos hipotezė geriausiai tikrinama ten, kur pirkėjas jau turi pasikartojantį darbą: technikos parkas, nuomos būstai, pakuočių sunaudojimas, ataskaitos. Laiptus žmogus paprastai perka epizodiškai; nuolatinių užklausų šaltinis galėtų būti rangovas ar projektuotojas. Vien sezonas ar AI spėjimas nepagrindžia automatinės reklaminės sekos.

## Ką galime sugalvoti ir pastatyti patys

1. **Vieno konkretaus poreikio mini tyrimas.** Svetainių nišoje agentas patikrina leidžiamus viešus puslapius ir parengia vieną atkuriamą UX problemą su siūlomu rezultatu. Ne masinis „jūsų SEO blogas“ laiškas. Tyrimą pateikti tik tinkamu, autorizuotu kanalu; neišgalvoti pajamų nuostolio.
2. **Poreikio paruošimo įrankis.** Padangų matmenų užklausos ruošinys, kelių darbų sąrašas, laiptų sąmatų apimties palyginimas. Naudingas viešas įrankis gali atvesti iš bendruomenės / partnerio į tikrą užklausą ir padėti atskirti konkretų poreikį nuo straipsnio skaitymo. Atiduoti naudą be privalomo naujienlaiškio.
3. **Partnerio rekomendavimo kelias.** Projektuotojas ar administratorius gali nukreipti klientą į tinkamą puslapį su neasmeniniu šaltinio kodu. Pirmiausia susitarimas ir aiški atsakomybė; neveikianti partnerių platforma neimituojama.
4. **Signalų santrauka vietoje didelio kontaktų sandėlio.** Agentas periodiškai peržiūri leistinus nišos šaltinius, išskiria naujus / pasibaigusius poreikius ir rodo tik aktualius. Kiekvienas turi šaltinį, datą, tikrumą ir kitą veiksmą.
5. **Atsakymo greitis ir kokybė.** Gautoje užklausoje ištraukti trūkstamą dydį, vietą ar darbą; paruošti vieną aiškų klausimą. Geras agentas neprašo to, ką klientas jau parašė, ir nepažada kainos ar vykdytojo be faktų.
6. **Pakartotinių poreikių kalendorius.** Po tikro sandorio užfiksuoti paties kliento sutartą priminimą / reguliaraus poreikio laiką. Reklaminį priminimą atskirti nuo užsakymo aptarnavimo, atsižvelgti į kontaktavimo pagrindą. Nevykdyti visų 30 domenų pardavimo tam pačiam žmogui vien dėl bendros dėžutės.

## Bandymai ir rekomenduojama seka

Pirmam mažam tyrimo bandymui rinkčiausi greitų svetainių B2B kryptį ir auksarankių administratorių / partnerių kryptį. Traktorių padangų B2B atranką vykdyti kartu kaip sezoninę ir pasikartojančio poreikio hipotezę, bet pardavimo pažadą atidėti iki tikro tiekimo. Visoms 20 nišų parengti kanalų konfigūraciją; aktyvią paiešką riboti keliais aiškiais eksperimentais, kad būtų galima suprasti priežastis.

Tai siūlomi eksperimentų parametrai, ne paklausos prognozė:

- Per vieną bandymą ištirti iki 20 realių tinkamų organizacijų ar konkrečių poreikio signalų. Tai tyrimo riba, ne siuntimo kvota.
- Pasirinkti vieną auditoriją, vieną pasiūlymą ir vieną leidžiamą kontaktavimo / platinimo kelią. Atskirai tirti iki 5 vykdymo / rekomendavimo partnerių, jų nelaikant pirkėjais.
- Per 14 dienų vertinti aktyvaus kanalo rezultatus tik nuo jo realaus veikimo; SEO dar vertinti ilgesniame esamame nišos plane. Pirminis aktyvaus bandymo signalas — bent 3 įvardyti tinkami poreikiai; tai dar ne pelningo verslo patvirtinimas.
- Esant 0 tinkamų poreikių iš užbaigto mažo bandymo, pirmiausia patikrinti pristatymą, aktualumą ir pasiūlymo tinkamumą, tada keisti vieną kintamąjį. Neužsakyti daugiau kontaktų vien dėl menko atsako.
- Plėtra galima tik žinant, kas mokės, ar priimsime / įvykdysime poreikį, kokia tikra išlaida ir kokia gauta vertė. Įmonių sąrašo dydis, partnerių susidomėjimas ir automatiniai atsakymai nepakanka.

Matuoti atskirai: ištirti → tinkami → leidžiami kontaktuoti → išsiųsti / paskelbti → atsakymai → konkretūs tinkami poreikiai → partnerio priimti → įvykdyti → pajamos. Pridėti atsisakymus, bounce, skundus, darbo laiką, AI / duomenų / siuntimo kaštą. `kaštas vienam tinkamam poreikiui = visi bandymo kaštai / tinkami poreikiai`; kai poreikių 0, rezultatas ne „0 EUR“, o neapskaičiuotas / nepasiektas. El. pašto atidarymų nelaikyti svarbiausiu rodikliu.

Techninė eiga ir būsenos aprašytos [ACQUISITION_CORE.md](../../ACQUISITION_CORE.md). Naujas [niche-client-acquisition skill](../../SKILLS/niche-client-acquisition/SKILL.md) leidžia tai kartoti kitai nišai. Dabartinė forma ir SMTP lieka savarankiška bazė. Autorizuotos balso sesijos vietinis agentų runtime jau turi case / pašto UI / žinomų gijų skaitytuvą ir lab pardavimo kelią; klientų paieškos modulį jungsime ten. [Bendrai perduotas agentų / kalibravimo planas](COORDINATION.md) ir [source auditas](SYSTEM-AUDIT.md) atskiria tai nuo visų nišų autonominio production aptarnavimo ar jau veikiančių acquisition kampanijų.
