# Patvirtintos saugojimo tvarkos vykdymas

2026-10-10 savininkas tiesiogiai patvirtino [pasiūlytus terminus](RETENTION_BACKUP_PROPOSAL.md). Serverio versija `madbeauty-2026-10-10-v1`: kliento žinutės ir pastabos 12 kalendorinių mėnesių nuo paskutinio atitinkamos organizacijos vizito / įrašo veiklos, vizitų istorija 24 mėnesius, neaktyvi kliento paskyra 24 mėnesius, kopijos iki 30 dienų. Tiksli riba įskaitytinai išlieka; kalendorinė data apskaičiuojama ir keliamaisiais metais.

Klientas pašalinimą patvirtina nauja savo el. pašto patikra, tuo pačiu adresu ir dabartine serverio politikos versija. Profilis, visos sesijos, kliento tekstai, atsiliepimai ir nepristatytas paštas šalinami vienoje transakcijoje. Būsimas vizitas lieka teikėjo kalendoriuje su anonimine tapatybe, be kontakto ir priminimų. Kita paskyra ir jos vizitai išlieka. Pakartotinė registracija tuo pačiu adresu sukuria naują ID ir negrąžina senos istorijos.

Aktyvios organizacijos gauna pasirašytą pašalinimo komandą. Dingęs jau įvykdytos komandos atsakymas palieka patvarią eilę; signalas kartojamas be prisijungimo. Senas pasirašytas kliento veiksmas, ankstesnis perdavimo paketas ir istorinė žalių eilučių kopija negali atkurti paskyros. Įprasto kalendoriaus rašytojo tvora lieka uždaryta. Privilegija taikoma tik privačios transakcijos konkretiems įrašams ir neišlieka po commit ar rollback.

Praradus HTTP atsakymą klientas atnaujina sesiją ir gali gauti tik neasmeninį pašalinimo kvitą su prieš veiksmą išduotu 256 bitų prieigos raktu. Raktas saugomas serverio hash pavidalu, galioja 24 valandas; el. paštas nėra kvito paieškos raktas. Vidinis minimalus pašalinimų žurnalas saugomas 24 mėnesius.

Neaktyvumo laikmatis remiasi faktiniu prisijungimu. Senoms paskyroms be tokio įrodymo laikotarpis prasideda aktyvinus tvarką. Paskyra neuždaroma, kol yra būsimas vizitas, aktyvi užklausa / laukiančiųjų pageidavimas arba veiklos prieiga bet kurioje tikrinamoje organizacijoje. Prieš uždarymą turi būti priimtas perspėjimo laiškas ir praėję bent 30 dienų; naujas prisijungimas atšaukia ankstesnį perspėjimą. Meistro / operatoriaus paskyros klientų pašalinimo veiksmas atsisako, nes jo veiklos prieigoms reikalinga atskira tęstinumo tvarka.

Kopijos šifruojamos AES-256-GCM, tikrinamas SHA-256, 512 KiB dalys neviršija SQLite eilutės ribos. Tikrinamos galiojimo datos ir visų dalių vientisumas. Atkuriama tik į tuščią izoliuotą saugyklą su nepriklausomai patvirtintu dabartiniu pašalinimų žurnalu; prieš prieigą kartojami pašalinimai ir amžiaus valymas. Sesijos, OTP ir senas paštas neimportuojami. Žalias gyvos DB PITR atsukimas su šia politika blokuojamas, nes atsuktų ir pašalinimų žurnalą. Šis klientų duomenų atkūrimas neatkuria aktyvių source/target rašytojų epochų ar fizinių vaizdų.

## Patikros

Manifestas: ankstesni 264 produkto testai, 4 papildomi pašto metaduomenų testai ir 9 nauji saugojimo testai, iš viso 277; pašalintų testų 0. Nauji testai apima 5 Node SQLite, 2 native Workers SQLite ir 2 vartotojo sąsajos scenarijus. Papildomai tikrinamas PHP paskirčių kontraktas ir 3 atskiros bandymo aplinkos native integracijos.

Reikšmingi atvejai: tikslūs 12/24/30 terminai, kito salono pastabų pašalinimas nepaisant būsimo vizito kitoje organizacijoje, sesijos ir pašto kvitų pašalinimas, nesėkmės rollback, prarastas target / HTTP atsakymas, abiejų SQL saugyklų restart, kito kliento išsaugojimas, nauja registracija, atkūrimas su žurnalu, pakeistos kopijos atsisakymas ir daugiau nei 2 MB kopijos dalių restart bei trūkstamos dalies atsisakymas. Ankstesnis 275-testų kvitas ir realių rezervacijos / priminimo laiškų kvitai neperrašomi.

Pirmas papildomas native trūkstamos dalies testas parodė fixture RPC klaidos serializavimo skirtumą. Klaida fixture grąžinta kaip tekstas ir patikrinta tiksli tikro decoder atsisakymo priežastis. Vėlesnė pilna regresija atskleidė senesnio pašto fixture target-name proxy naudojimą po restart; prieš restart išsaugotas paprastas tekstas. Pakartotinė pilna regresija parodė, kad kontroliuojamo laikrodžio fixture kartu paleisdavo realaus laiko alarm: perkėlimas susidurdavo su jau siunčiamu laišku. Šiame viename fixture alarm išjungtas ir kiekvienas pristatymas / valymas vykdomas aiškiu drain; įprasto alarm ir restart produkto testai liko nepakeisti. Fixture freeze atsakymas serializuojamas tiesiogiai su tikra klaidos priežastimi. Originalūs nesėkmių logai lieka private output, testai nepašalinti. Final testų ir gyvo bandymo tapatybės fiksuojamos atskirame naujame leidimo kvite.

## Diegimo apimtis

Šio etapo aktyvinimas pirmiausia skirtas `bandymas.madbeauty.lt`: ta pati atskira namespace, sesijos paslaptis, fiktyvūs profiliai, 69 patvirtintų puslapių paketas ir pradinis galiojimas iki 2026-10-16T21:10:47.982Z. Tikrinamas vienas naujas disposable `example.com` klientas; esamos siūlomos bandymo paskyros nešalinamos. SMTP šioje aplinkoje nėra. Pagrindinio domeno turinio diegimas vyksta atskiru lease; jis nėra šios politikos ar pilno platformos atnaujinimo aktyvinimas.

Ribos: kopijų duomenų vokas iki 24 MiB, šifruotų dalių saugykla iki 256 MiB; pasiekta riba grąžina aiškią klaidą ir neleidžia dalinio trynimo. Tai riboto piloto priėmimas, ne neribotos apkrovos ar nepriklausomos nuo Cloudflare nelaimių atkūrimo paslaugos įrodymas. Galutinio pagrindinio domeno aktyvinimo kvitas ir pilnas veiklos paskyrų tęstinumas lieka atskiri užbaigimo darbai.
