# Madbeauty grožio bendruomenės įgyvendinimo planas

2026 m. spalio 11 d. Būsena: parengtas planas, bendruomenės funkcijos dar neįdiegtos. Savininko apimtis: darbų srautas, reakcijos, komentarai, meistrų sekimas, draugystės, asmeninės žinutės, vartotojų kuriamos grupės ir renginiai, įskaitant mokymus, konkursus bei konferencijas. Dabartinis pavedimas – pirmiausia suplanuoti visą sprendimą.

## Produkto kryptis

Madbeauty taps vieta, kur žmogus atranda grožio idėją, pamato ją įgyvendinantį meistrą, paklausia, išsisaugo ir užsiregistruoja. Bendruomenė papildo paslaugų paiešką ir rezervacijas. Pagrindinė auditorija – grožiu besidominčios moterys ir grožio specialistai; esamos vyrams skirtos paslaugos lieka prieinamos.

Rekomenduojamas kelias: **darbas → meistro profilis → pokalbis arba paslauga → vizitas**. Antras kelias: **diskusija → grupė → mokymai, konkursas ar konferencija → registracija**. Viešą turinį galima peržiūrėti neprisijungus; rašymas, reakcijos, ryšiai ir registracija į renginius reikalauja patvirtintos paskyros.

Pradiniam paleidimui siūloma suaugusiųjų bendruomenė. 18+ ribą ir jos įgyvendinimą reikia patvirtinti kaip produkto politiką prieš atveriant registraciją į bendruomenę; tai dar nėra savininko priimtas sprendimas. Lyties nereikalauti paskyrai ir nedaryti jos prieigos kriterijumi.

## Esamas pagrindas

| Dalis | Patikrinta dabartinė būsena | Panaudojimas |
|---|---|---|
| Paskyros | El. pašto kodas, serverio sesija, CSRF, paskyros ir organizacijos teisės | Viena tapatybė visai platformai |
| Meistrų profiliai ir galerijos | Vieša patvirtintų profilių bei paskelbtos medijos projekcija | Darbo įrašo nuotraukos ir nuoroda į tikrą paslaugą |
| Išsaugoti meistrai | Privatus `favoriteIds` sąrašas | Išsaugojimas lieka privatus; sekimą žmogus pasirenka atskirai |
| Kvietimo langas | Viešo profilio nuoroda, kopijavimas, įrenginio ir Facebook bendrinimas | Tas pats aiškus kvietimo principas grupėms ir renginiams |
| Žinutės | Susietos su konkrečiu vizitu ir jo teisėmis | Vizitų pokalbiai lieka; bendriems pokalbiams kuriamas naujas modelis |
| Facebook Login | Programėlės dar nėra, integracija suplanuota | Nepriklausomas etapas, nestabdantis Madbeauty bendruomenės |
| Bandymo duomenys | Atskira laikina aplinka, 40 solo profilių ir 5 vieši salonai | Tik aiškiai pažymėti sintetiniai bendruomenės bandymai |

Faktinis gyvas pagrindas: [auth ir kvietimų priėmimas](../auth-social-20261011/RECEIPT.md). Facebook galimybės ir apribojimai: [atskiras tyrimas](../auth-social-20261011/FACEBOOK_INTEGRATION_PLAN.md). Senesni bendri būsenos dokumentai nėra šių naujų modulių įdiegimo įrodymas.

## Navigacija ir dizainas

Viršutinėje svetainės navigacijoje atsiranda „Bendruomenė“. Jos viduje: „Atrask“, „Sekami“, „Grupės“, „Renginiai“, „Žinutės“. „Atrask“ rodo darbus, aktualias diskusijas ir artėjančius renginius; „Sekami“ – pasirinktų meistrų bei žmonių įrašus pagal laiką.

Kompiuteryje: siaura navigacija kairėje, aiškus nuotraukų srautas centre ir vietinės grupės bei artėjantys renginiai dešinėje. Telefone: penki apatinės navigacijos punktai „Srautas“, „Grupės“, „Renginiai“, „Žinutės“, „Paskyra“. „Atrask / Sekami“, paieška ir įrašų kūrimas pasiekiami viršuje. Rezervavimo kelias išlieka lengvai pasiekiamas per meistro ir paslaugos korteles.

Naudoti esamą Madbeauty baltą, juodą ir violetinę tapatybę, DM Sans, originalų logotipą. Nuotraukos yra svarbiausias turinys; violetinė išryškina veiksmus, pažymėtus filtrus ir aktyvų punktą. Srautas neturi atrodyti kaip vienodas pastelinių kortelių katalogas. Atskirą ekranų ir vaizdų planą aprašo [SURFACE.md](SURFACE.md).

## Darbų srautas ir įrašai

Meistras arba teisę turintis salono darbuotojas kuria įrašą: 1–8 nuotraukos, aprašymas, paslaugos žyma, miestas ir pasirenkama nuoroda į aktyvią savo paslaugą. Pasirenkama, kieno vardu skelbiama: asmens ar salono. Organizacijos vardu publikuoti gali tik atitinkamą teisę turinti paskyra. Galerijos nuotrauką galima pasirinkti dar kartą jos neįkeliant, jei jos viešumo ir teisių sąlygos tinka įrašui.

Klientai gali skelbti grožio idėjas ir savo patirtis pasirinktai auditorijai. Jie netampa patvirtintais meistrais ir negali publikuoti svetimo salono vardu. Prieš paskelbiant matyti auditorija: viešai, draugams arba konkrečiai grupei. Tai serverio prieigos taisyklė, o ne vien ženklelis kortelėje.

Įrašo kortelė: autorius ir pasirinkta tapatybė, nuotraukos, trumpas tekstas, paslauga, miestas, „Patinka“, komentarai, išsaugojimas ir bendrinimas. Meistro darbui – „Peržiūrėti paslaugą“ arba „Rasti laiką“, jei tikras pasiūlymas tinkamas rezervuoti. Archyvuotai paslaugai nerodyti neveikiančio rezervavimo pažado.

Komentarai leidžia vieną atsakymų lygį, redagavimą ir šalinimą. Autorius gali išjungti komentarus. Reakcijų skaičius nėra vizitų įvertinimas ir nepatenka į meistro `AggregateRating`. Kolekcijos, pavyzdžiui, „Mano vestuvinis įvaizdis“ ar „Nagų idėjos“, pradžioje privačios. Kito kliento išsaugotos idėjos viešai nerodomos.

Pirmas srauto reitingavimas paprastas: sekamų autorių įrašai pagal laiką; atradimui – pasirinktas miestas, kategorija ir naujumas. Puslapiai po 20 įrašų, stabilus serverio žymeklis, „Rodyti daugiau“ ir atskiras naujų įrašų pranešimas. Atnaujinimas nekeičia skaitomo įrašo pozicijos. Tuščias srautas siūlo tikrus meistrus, grupes ir filtrų išvalymą.

## Sekimas ir draugystė

| Veiksmas | Prasmė | Numatyta sutartis |
|---|---|---|
| Sekti meistrą ar žmogų | Vienpusis ryšys ir jo vieši įrašai sekamų sraute | Galima nutraukti bet kada; el. laiškų automatiškai neįjungia |
| Pridėti į draugus | Abipusis asmeninių bendruomenės paskyrų ryšys | Prašymas, priėmimas, atmetimas, atsiėmimas ir draugystės nutraukimas |
| Išsaugoti meistrą | Privatus patogus grįžimas prie profilio | Jau esamas sąrašas nevirsta viešu sekimu |
| Blokuoti | Apriboti nepageidaujamą bendravimą | Užkerta naujus ryšius, žinutes, paminėjimus ir tiesiogines sąveikas |

Kliento bendruomenės vardas bei nuotrauka pasirenkami atskirai nuo rezervacijų kontaktų. Viešai nerodyti el. pašto, vizitų istorijos ar lankytų salonų. Sekėjų skaičius gali būti viešas, žmonių sąrašų matomumas valdomas privatumo nustatymuose.

Blokavimas privačius įrašus paslepia ir nutraukia tiesioginius ryšius; viešo turinio negalima laikyti paslėptu nuo žmogaus, kuris jį gali perskaityti atsijungęs. Bendroje grupėje blokuotų žmonių atsakymus sutraukti, neleisti asmeninių paminėjimų ir palikti moderatoriams būtinas teises. Nutraukta draugystė iškart panaikina draugams skirtų įrašų prieigą.

## Asmeninės žinutės

Bus bendras pokalbių langas su sąrašu, paieška, neperskaitytomis žinutėmis, pokalbiu ir užklausomis. „Rašyti meistrui“ nukreipia į paskyros asmeninį pokalbį; „Rašyti salonui“ – aiškiai pažymėtą bendrą salono dėžutę. Prieigą prie jos turi tik paskirtos organizacijos rolės. Salono administratorius dėl savo rolės negauna darbuotojo asmeninių pokalbių.

Ne draugo pirmas kontaktas numatytai tampa žinučių užklausa: viena tekstinė žinutė, be priedų. Gavėjas priima, atmeta arba blokuoja. Meistras gali leisti klientų užklausas, o žmogus gali pasirinkti tik draugų žinutes. Priėmimas leidžia tęsti pokalbį. Vizito pokalbiui taikomos esamos vizito teisės; naujame lange jis pateikiamas atskirai ir nesumaišomas su asmeniniu pokalbiu.

Žinutė pirmiausia patvariai įrašoma serveryje. Pakartotinis siuntimas pagal `clientMessageId` nesukuria kopijos. „Išsiųsta“, „Pristatyta“ ir „Perskaityta“ rodomi tik pagal atitinkamą serverio arba gavėjo patvirtinimą. Perskaitymo žymos pasirenkamos; prisijungimo laiko viešai pagal nutylėjimą nerodyti. Nutrūkus ryšiui – aiškus laukimo ir pakartojimo veiksmas, išsaugotas juodraštis.

Po tekstinio pokalbio priėmimo pridėti nuotraukas su atskira prieigos kontrole, optimizavimu ir ribomis. Pokalbio failai nepatenka į viešą meistro galeriją. Šiame leidime nenumatyti balso / vaizdo skambučiai ar Facebook Messenger pokalbių importas. Nevadinti žinučių šifruotomis nuo siuntėjo iki gavėjo, jei tokia sistema nesukurta.

## Vartotojų kuriamos grupės

**Grupių kūrimas yra sutartos apimties dalis.** Patvirtintos paskyros gali kurti grupę: pavadinimas, viršelis, aprašymas, tema, pasirenkamas miestas, taisyklės ir viešumas. Pavyzdžiai – „Vilniaus nagų idėjos“, „Nuotakų įvaizdžiai“, „Grožio meistrų mokymai“. Tai iliustraciniai pavadinimai, ne jau veikiančios bendruomenės.

Pradiniai režimai: vieša grupė ir privati randama grupė. Viešos grupės įrašai prieinami lankytojams; privačios grupės turinys, narių sąrašas ir renginių detalės prieinami tik aktyviems nariams. Privačios grupės pristatyme galima rodyti tik pavadinimą, viršelį, bendrą aprašymą ir prisijungimo veiksmą. Paslėptos grupės – atskiras vėlesnis režimas, ne būtina pirmo leidimo sąlyga.

Rolės: savininkas, administratorius, moderatorius ir narys. Savininkas valdo taisykles, roles, grupės uždarymą ir nuosavybės perdavimą. Moderatorius tvarko įrašus ir skundus; narys diskutuoja ir, jei leidžia grupės taisyklė, kuria renginius. Į grupę ateinama pačiam: tiesioginis prisijungimas arba prašymas pagal nustatymą. Nuoroda ar kvietimas neprideda žmogaus automatiškai.

Grupėje bus įrašai, diskusijos, prisegti pranešimai, narių valdymas ir „Renginiai“. Administratorius pasirenka, kas gali skelbti ir ar konkrečiai grupei reikia įrašų patvirtinimo. Numatyta normalių įrašų automatinė publikacija po techninių patikrų; privaloma visų grupių įrašų žmogaus peržiūra neįvedama.

Iš viešos į privačią galima pereiti įspėjus apie jau buvusio viešo turinio ribas. Privatų turinį viešinti vien grupės nustatymo pakeitimu draudžiama; pradiniame leidime privačios grupės pavertimas vieša išjungtas. Pašalinus narį, visi nauji API ir medijos prašymai tikrina narystę iš naujo.

## Renginiai ir konferencijos

**Renginių kūrimas yra sutartos apimties dalis.** Tipai: mokymai, meistriškumo pamoka, konkursas, konferencija, paroda ir bendruomenės susitikimas. Renginys turi savo puslapį ir gali priklausyti grupei. Randamas renginių sąraše pagal tipą, temą, miestą ir datą; pasirinktinai rodomas kalendoriaus režimu.

Organizatorius įrašo pavadinimą, viršelį, aprašymą, temą, pradžią ir pabaigą, vietą arba nuotolinį formatą, organizatoriaus tapatybę, dalyvavimo sąlygas, registracijos terminą, vietų skaičių ir kontaktavimo kelią. Lietuvos renginių numatyta zona `Europe/Vilnius`; saugoti UTC laiką ir pasirinktą zoną, patikrinti vasaros laiko perėjimus. Dalyvavimo kaina ir jos sąlygos rodomos tik organizatoriui įvedus faktinius duomenis.

| Renginio tipas | Papildomi laukai | Dalyvio kelias |
|---|---|---|
| Konferencija | Dienų ir sesijų programa, pranešėjai, temos, vieta ar salės | Peržiūrėti programą → registruotis → gauti patvirtinimą ir kalendoriaus įrašą |
| Procedūrų mokymai | Vedėjas, kam skirta, pradinės žinios, praktikos pobūdis, ką reikia atsinešti | Perskaityti sąlygas → pateikti registraciją → matyti patvirtinimo būseną |
| Konkursas | Kategorijos, tinkamumo sąlygos, paraiškos terminas, vertinimo tvarka ir organizatoriaus skelbiami rezultatai | Pateikti paraišką → gauti priėmimo arba atmetimo sprendimą |
| Susitikimas ar paroda | Programa, vieta, prieinamumo informacija | Domina arba registruotis pagal renginio nustatymą |

Konferencijos programa ir pranešėjai kuriami tame pačiame redaktoriuje: sesijos laikas, pavadinimas, vedėjas ir aprašymas. Pranešėjo vardą bei nuotrauką publikuoti tik turint teisę; pateikta organizatoriaus informacija savaime nėra Madbeauty patvirtinta kvalifikacija. Konkursų sudėtingas komisijos vertinimo ir balsavimo mechanizmas gali būti papildoma plėtra; baziniame leidime reikalingos sąlygos, paraiškos ir organizatoriaus rezultatų publikacija.

Organizatorių rolės: renginio savininkas ir paskirti bendri organizatoriai. Asmenys gali kurti bendruomenės susitikimus. Viešiems profesionaliems mokymams, konkursams ir konferencijoms reikalinga patikrinta organizatoriaus tapatybė; tai atskira teisė, ne automatinis profesionalios kvalifikacijos patvirtinimas. Grupės narys gauna organizavimo teisę pagal tos grupės taisykles.

Renginio būsenos: juodraštis, paskelbtas, užpildytas, atšauktas ir pasibaigęs. „Domina“ tik išsaugo renginį. „Registruotis“ sukuria registraciją, kurios režimas nurodytas iš anksto: automatinis vietos patvirtinimas arba organizatoriaus sprendimas. Nepriimta paraiška ir laukimo eilė nėra patvirtintas bilietas. Vienam žmogui – viena aktyvi registracija; vietų skaičius tikrinamas atominiu serverio veiksmu.

Laukimo eilėje rodyti aiškią būseną. Atsilaisvinusią vietą pasiūlyti vienam žmogui su terminu; vieta rezervuojama jam iki termino ir negali tuo pačiu būti atiduota kitam. Dalyvis gali atsisakyti registracijos; organizatorius gali ją atšaukti su priežastimi. Datos, vietos arba programos pakeitimai turi versiją ir pranešimą užsiregistravusiems. Renginio atšaukimas sustabdo registraciją ir nepanaikina dalyvio ankstesnio patvirtinimo istorijos.

Privačios grupės renginiai prieinami tik jos nariams, o pakvietimas neapeina narystės. Nuotolinio susitikimo prisijungimo nuoroda rodoma tik teisę turintiems patvirtintiems dalyviams. Dalyvių el. paštai neviešinami; viešai galima rodyti bendrą skaičių ir savanoriškai pasirinktą dalyvavimą. Organizatorius mato tik registracijai reikalingus kontaktus ir neturi jų automatiškai naudoti rinkodarai.

Pradiniame renginių modulyje: nemokama registracija, aiškiai pažymėta mokamo renginio registracijos užklausa arba patikrinta organizatoriaus išorinė registracijos nuoroda. Madbeauty mokamų bilietų atsiskaitymas, grąžinimas ir išmokėjimas organizatoriui būtų atskira mokėjimų integracija. Nepaspaudus ir negavus faktinio mokėjimo patvirtinimo nerodyti „Apmokėta“. Automatiniai profesiniai sertifikatai ir kvalifikacijos suteikimas neįtraukiami.

Renginio priminimai: pasirinktas pranešimas platformoje, pasirinktinai tikras operacinis el. laiškas ir atsisiunčiamas `.ics` įrašas. Priminimo būsena atskiria eilę, transporto priėmimą ir faktinį pristatymo įrodymą. Organizatoriaus klaidingai įvesta programa ar data gali būti redaguojama, bet jau registruoti dalyviai informuojami.

## Kvietimai ir Facebook

Kiekvienas viešas meistras, įrašas, grupė ir renginys turi dalinamą nuorodą su tinkamu peržiūros paveikslėliu. Žmogus pasirenka Facebook, įrenginio bendrinimą arba kopijavimą. Privatūs kvietimai naudoja atšaukiamą, galiojančią tik ribotą laiką nuorodą ir neišviešina grupės turinio per socialinės nuorodos peržiūrą. Kvietimo atidarymas, registracija ir narystės priėmimas yra atskiros būsenos.

Madbeauty draugystės ir sekimai veiks visoms paskyroms. Facebook Login pridedamas pagal esamą [integracijos planą](../auth-social-20261011/FACEBOOK_INTEGRATION_PLAN.md). Facebook draugų API leidžia ribotą tos pačios programėlės draugų atradimą, kai suteikti reikalingi leidimai; tai nesuteikia viso draugų sąrašo. [Meta User Friends](https://developers.facebook.com/docs/graph-api/reference/user/friends/).

Facebook grupės ir įvykiai nesinchronizuojami vien prisijungus. Čia kuriamos nuosavos Madbeauty grupės ir renginiai. Bendrinimas gali padėti pasiekti meistro auditoriją, bet srauto dydis ar virusinis augimas nėra garantuojamas.

## Techninė architektūra

Esamas `PLATFORM` lieka tapatybės ir vizitų autoritetas. Socialiniam turiniui siūlomas naujas `COMMUNITY` modulis su SQLite Durable Object, atskirta nuo vizitų koordinatoriaus. Pradinis vienos svetainės objektas – ribotas pilotas, ne neriboto masto socialinis tinklas. Matavimais nustatyti apkrovos ribą ir prieš plėtrą turėti skaidymo planą. Naujos namespace ir saugyklos dabar nekuriamos.

Worker iš esamos serverio sesijos išsprendžia vartotoją bei organizacijos teises ir vidiniu kvietimu perduoda patikrintą principal. Naršyklės atsiųstas `accountId`, `operator`, `organizationId` ar rolė nėra prieigos įrodymas. Kiekviena socialinė operacija tikrina auditoriją, narystę, blokavimą ir objekto savininką.

| Duomenų grupė | Naujos lentelės ir esminės sąlygos |
|---|---|
| Asmens projekcija | `community_profiles`: ryšys su esamu account, pasirenkamas vardas, avataro medija, nustatymai |
| Ryšiai | `follows`, `friend_requests`, `friendships`, `blocks`; unikalios poros, draugystei normalizuota dviejų ID tvarka |
| Turinys | `posts`, `post_media`, `comments`, `reactions`, `collections`, `collection_items`; viena reakcija žmogui ir įrašui, komentaro auditorija paveldima |
| Grupės | `groups`, `group_members`, `group_invites`; viena narystė žmogui grupėje, atšaukiami kvietimai |
| Pokalbiai | `conversations`, `conversation_members`, `message_requests`, `direct_messages`, `read_positions`; unikalus siuntėjo `clientMessageId`, serverio eiliškumas |
| Renginiai | `events`, `event_hosts`, `event_sessions`, `event_speakers`, `event_applications`, `event_registrations`, `event_waitlist`; vietų ir pasiūlymų atominis paskirstymas |
| Kontrolė | `notifications`, `notification_outbox`, `reports`, `moderation_actions`, `appeals`, `deletion_tombstones` |

Visos lentelės turi `siteId` ir teisėms reikalingus ryšius. Indeksai apima srauto `(audience, createdAt, id)`, autoriaus, grupės, pokalbio sekos, vartotojo pranešimų ir renginio datos / būsenos užklausas. Grupių ir ryšių auditas saugomas atskirai nuo viešų projekcijų. Nė viena kolekcija negrąžinama visiems vien dėl prisijungimo.

API grupės: `/api/community/profile`, `/posts`, `/relationships`, `/groups`, `/conversations`, `/events`, `/notifications`, `/reports`. Tai siūlomi nauji adresai, šiuo metu neveikiantys endpointai. Įrašymo užklausos naudoja CSRF, idempotencijos raktą ir reikalingą versiją. Vienodos klaidos: `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `VALIDATION_FAILED`. Privačių objektų nebuvimo ir prieigos atmetimo atsakymas neturi atskleisti jų buvimo.

Tekstinį pokalbį pirmiausia patikrinti per patvarų HTTP kelią, tada įjungti realaus laiko atnaujinimą. Realaus laiko srautams numatyti atskirus pokalbių / kanalų objektus, kurie neperima vizitų operacijų. Cloudflare dokumentuoja WebSocket hibernation kaip rekomenduojamą būdą išlaikyti ryšius leidžiant objektui miegoti; atkuriama būsena turi būti patvari. Konkrečias sąnaudas reikia išmatuoti savo plane. [Cloudflare WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

Ryšiui taikyti WSS, tikslų Origin sąrašą, sesijos galiojimo ir teisės tikrinimą, pranešimų dydžių / dažnio ribas. Atsijungimas arba teisės atšaukimas uždaro netinkamus ryšius. Autorizaciją tikrinti kiekvienai reikšmingai žinutei, o tokenų ir žinučių teksto nerašyti į įprastus logus. [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).

## Nuotraukos ir failai

Viešus meistrų darbus pradžioje sieti su tinkama paskelbta galerijos medija, jos nekopijuojant. Vartotojų įrašams, privačioms grupėms ir pokalbiams reikia naujos medijos sutarties: savininkas, auditorija, leidimai, atšaukimas ir ryšys su įrašu. Esama viešos galerijos kvota savaime nėra bendruomenės failų kvota.

Pradinės siūlomos ribos: iki 8 nuotraukų įraše, iki 10 MB originalui, JPEG / PNG / WebP; SVG, vykdomi failai ir savavališki dokumentai nepriimami. Originalo tipą tikrinti pagal turinį, perrašyti atsitiktinį failo vardą, optimizuoti per bendrą medijos sistemą, pašalinti GPS / EXIF ir generuoti atsakingus responsive variantus. `Content-Type` vienas nepakankamas. [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Privačios medijos atsakymas tikrina dabartinę teisę ir nėra viešai cache'inamas. Trumpai galiojantis URL nėra vienintelis narystės atšaukimo mechanizmas. Pašalintą įrašą ar narystę turi lydėti medijos prieigos ir cache kontrolės atnaujinimas. Viešos medijos cache leidžiamas tik pagal jos viešą projekciją. Automatinė svetimų nuorodų peržiūra pradžioje išjungta; ją įjungiant reikėtų SSRF apsaugos.

## Privatumas ir moderavimas

Normalūs įrašai bei grupių diskusijos veikia be privalomos išankstinės žmogaus peržiūros. Iš karto reikalingi skelbimo limitai, pasikartojančio spamo aptikimas, pranešimas apie įrašą / komentarą / grupę / renginį, blokavimas ir operatoriaus skundų eilė. Didelės rizikos turinys gali būti laikinai paslėptas su priežastimi. Sudėtingiems skundams reikia atsakingo moderatoriaus ir apskundimo; vien automatikos pažado nepakanka.

Pranešimo gavėjas mato sprendimo priežastį, apskundimo veiksmą ir būseną. Operatorius gauna tik reikalingą skundo turinį; operatoriaus rolė nesuteikia neriboto visų asmeninių pokalbių skaitymo. Skundžiant žinutę įrodymui perduodamos pasirinktos žinutės, o ne visas dėžutės turinys.

Prieš viešą UGC paleidimą patikslinti taikomas skaitmeninių paslaugų taisykles pagal platformos vaidmenį ir dydį. Numatyti pranešimų, sprendimų paaiškinimo ir apskundimo kelią; šis techninis planas nėra teisinio atitikimo sertifikatas. [Europos Komisija apie DSA](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act).

Anksčiau patvirtinta tvarka: esamos žinutės / pastabos 12 mėn., vizitų istorija ir neaktyvios paskyros 24 mėn., kopijos 30 dienų. Bendruomenės tekstinėms žinutėms siūloma tokia pati 12 mėn. tvarka. Viešų įrašų ir grupių turiniui reikia atskiro patvirtinto termino: siūloma laikyti iki autoriaus pašalinimo ar paskyros šalinimo, su aiškia grupių / moderavimo įrodymų išimtimi. Naujas turinys dėl šio plano automatiškai nešalinamas.

Paskyros eksporte įtraukti savo įrašus, komentarus, ryšius, registracijas ir teisėtai eksportuojamas žinutes. Šalinimas panaikina profilį bei prieigą, sutvarko autoriaus mediją, grupės savininkui siūlo perduoti valdymą. Organizuojami būsimi renginiai negali likti su neegzistuojančiu atsakingu asmeniu. Ištrynimo žymos neleidžia atkurtai 30 dienų kopijai iš naujo viešinti pašalintų duomenų; kopijų rotacija ir restore patikrinami praktiškai.

Pranešimų numatymas: svarbios užklausos, atsakymai ir renginio pakeitimai platformoje; rinkodaros el. laiškai tik atskiru pasirinkimu. Grupės pranešimai gali būti išjungti arba apibendrinti. Privačių žinučių tekstas pagal nutylėjimą nekeliauja į el. laiško ar telefono pranešimo peržiūrą.

## Vieši puslapiai ir SEO

Siūlomi maršrutai: `/bendruomene`, `/bendruomene/irasai/:id`, `/bendruomene/grupes/:slug`, `/renginiai`, `/renginiai/:slug`. Žinutės ir ryšių valdymas – prisijungusio žmogaus darbo aplinkoje. Esamų meistrų / salonų profilių URL nekeisti; bendruomenės turinys juos papildo.

Indeksuoti tinkamus viešus, prasmingus įrašus bei patikrintų organizatorių renginius. Privačios grupės, draugams skirti įrašai, žinutės, asmeniniai sąrašai ir testinė aplinka neindeksuojami ir apsaugomi serverio teisėmis. `noindex` nėra prieigos kontrolė. Viešos grupės SEO įjungti tik turint tvarkingą pristatymą ir turinį; vien automatiškai sukurta tuščia grupė neturi patekti į sitemap.

Renginio puslapyje naudoti matomus faktus atitinkančią `Event` JSON-LD: pavadinimą, datą, būseną, tinkamą vietą, vaizdą ir organizatorių. Keitimus ir atšaukimą atspindėti schemoje. Google renginių išplėstinių rezultatų tinkamumas priklauso nuo dokumentuotų sąlygų, šalių ir formato; schema negarantuoja rodymo, o nuotoliniams renginiams nežadėti tokio pat rezultato kaip fiziniams. [Google Event dokumentacija](https://developers.google.com/search/docs/appearance/structured-data/event).

UGC nuorodoms taikyti atitinkamą `rel="ugc"`; tai nekeičia savininko patvirtintos `verslomatika.lt` footer dofollow nuorodos. Viešai pasiekiamą puslapį testuoti ir pirminiame HTML, ir po JavaScript. Sitemap, canonical, Open Graph bei schema remiasi ta pačia publikavimo ir auditorijos taisykle.

## Įgyvendinimo etapai

| Etapas | Konkretus rezultatas | Priėmimo vartas |
|---|---|---|
| C0 Pagrindas | Sutartys, schemos migracija, teisės, projekcijos, auditorijos ir vizualūs pagrindinių ekranų maketai | Vienas įrašas sukurtas, perskaitytas abiejų rolių ir išlikęs po native restart |
| C1 Srautas | Įrašai, nuotraukos, sekimas, reakcijos, komentarai, privatūs albumai ir tikras paslaugos kelias | Du naudotojai sąveikauja, trečias negauna privataus turinio, pakartojimai nesidubliuoja |
| C2 Ryšiai ir žinutės | Draugystės, blokavimas, užklausos, asmeniniai / salono pokalbiai, realaus laiko atnaujinimas | Du browser langai, offline / reconnect / logout / teisės atšaukimas, jokio svetimo pokalbio nutekėjimo |
| C3 Grupės | Kūrimas, narystės, rolės, diskusijos, kvietimai ir moderavimas | Viešos / privačios grupės visas kelias, pašalinimas iškart atima turinio ir medijos prieigą |
| C4 Renginiai | Mokymai, konkursai, konferencijų programa, registracija, laukimo eilė, pakeitimai ir priminimai | Vietų konkurencija, organizatoriaus sprendimai, privatumas, laiko zonos, atšaukimas ir .ics |
| C5 Paleidimas | Moderavimas, privatumo tekstai, eksportas / šalinimas, SEO, mobilumas, apkrova ir etapinis aktyvinimas | Native ir gyvos aplinkos įrodymai, saugus grąžinimas į ankstesnį leidimą, jokių demo duomenų canonical |
| F1 Facebook | Tikras Login ir paskyrų susiejimas pagal atskirą tyrimą | Veikia paprastam išoriniam vartotojui, ne tik programėlės administratoriui |

Visi C0–C5 priklauso numatytam bendruomenės rezultatui. Vien srauto demonstracija neužbaigia draugysčių, žinučių, grupių ir renginių pavedimo. F1 priklauso nuo Meta programėlės ir leidimų; kitus modulius galima įgyvendinti el. pašto tapatybei. Konkrečių dienų ir biudžeto nespėti be pirmo backend kelio, medijos ir apkrovos matavimo.

Kiekvieną etapą įgyvendinti frontend, vietiniame backend ir native Worker, su savo įrodymais. Pradėti nuo vieno tikro serverinio kelio, tik tada plėsti ekranus. [BACKLOG.json](BACKLOG.json) saugo priklausomybes, ekranus ir priėmimo kriterijus; visų darbų dabartinė būsena `planned`.

## Patikrų ir paleidimo tvarka

Svarbiausios patikros: kito žmogaus / organizacijos ID, auditorijos pakeitimas, narystės atėmimas, blokavimas, moderatorius be privataus pokalbio teisės, dubliuota reakcija / žinutė / registracija, SQL restart ir pasenusio redagavimo konfliktas. Viename renginyje 20 vienalaikių registracijų į paskutinę vietą turi duoti vieną patvirtintą vietą; kiti gauna tikrą laukimo arba pilno renginio būseną.

Vizualiai tikrinti bent 390, 768 ir 1440 px, klaviatūrą, fokusą, dialogs, kontrastą ir reduced motion. Kiekvienam pagrindiniam ekranui reikia loading, empty, error, success ir prarastos teisės būsenų. Tikrinti didelį tekstą, ilgas pavardes, grupių pavadinimus ir daug nuotraukų. Prieinamumo tikslas – WCAG 2.2 AA, priėmimas pagal faktinius matavimus.

Izoliuotame bandyme panaudoti esamus 40 meistrų ir salonų profilius, nekeisti jų ID ar dabartinių atsiliepimų. Bendruomenės įrašai, registracijos ir žinutės aiškiai sintetiniai. Dabartinės laikinos aplinkos galiojimas baigiasi 2026-10-17; ilgalaikiam bendruomenės / Meta priėmimui parinkti stabilią izoliuotą aplinką, o ne tyliai keisti jos galiojimo ar duomenų taisykles.

Kiekvienam gyvam aktyvinimui saugoti tikslius source / core / content / deployment ID, prieš ir po palyginti bindings, namespaces, secrets vardus, mail ir stebėseną. Socialines funkcijas jungti atskiromis vėliavomis, leidžiant jas išjungti be vizitų praradimo. Migracijos pridedančios ir versijuotos; rollback neištrina sukurtų įrašų. Esamų pašto, DNS, rezervavimo ir turinio publikavimo sutarčių nekeisti vien socialinio modulio patogumui.

## Vertės matavimas ir tolimesni sprendimai

Matuoti tikrus kelius: kvietimo atidarymas → registracija → sekimas; darbo peržiūra → paslaugos peržiūra → rezervacijos pradžia → patvirtintas vizitas; grupės prisijungimas → prasminga diskusija; renginio peržiūra → patvirtinta registracija. Paspaudimas nėra išsiųstas kvietimas ar patvirtintas dalyvis. Analitika nesaugo privačių žinučių tekstų ir neperduoda jų Meta.

Prieš atveriant bendruomenę reikia realių pradinių autorių ir bent kelių tikrų organizatorių; fiktyvūs testai neužpildo production srauto. Pagal naudojimą spręsti apie video / reels, paslėptas grupes, mokamus bilietus, konkursų komisijos įrankius ir mobilią programėlę. Šios papildomos plėtros nepaslepia privalomų šiame plane numatytų grupių bei renginių funkcijų.

## Sprendimai prieš atvirą paleidimą

Produkto politikos: amžiaus riba, naujo viešo turinio saugojimas, moderavimo atsakingas asmuo ir profesionalių organizatorių tikrinimo tvarka. Infrastruktūra: tikros medijos ribos bei kaina, pilotui išmatuota apkrova ir atkūrimas. Išorinė integracija: Meta programėlė ir jos patvirtinimai. Mokamos registracijos: atskiras atsiskaitymo, atsakomybės ir grąžinimo sprendimas, jei norėsime priimti bilietų pinigus platformoje.

Šie faktai netrukdo pradėti vietinio C0–C4 įgyvendinimo su izoliuotais duomenimis. Jie turi būti aiškiai sutvarkyti prieš atitinkamą viešą arba mokamą funkciją. Šio plano parengimas nekeičia gyvos svetainės ir nėra bendruomenės funkcijų priėmimas.
