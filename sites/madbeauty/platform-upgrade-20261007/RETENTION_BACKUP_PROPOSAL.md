# Saugojimo ir atkūrimo pasiūlymas — 2026-10-10

Savininkas patvirtino: nustatytos tvarkos nėra. Žemiau — konkretus techninis pasiūlymas sprendimui, **ne jau galiojanti politika**. Nauji terminai viešame privatumo tekste nepaskelbti, klientų duomenų trynimas neaktyvintas. Įprastų grožio rezervacijų apimtis; medicininių dokumentų, apskaitos ir mokėjimų saugojimo šis pasiūlymas neapibrėžia.

BDAR reikalauja pagrįsti saugojimo būtinybę, įgyvendinti taikytiną trynimą ir užtikrinti atkūrimą; jis nenustato vieno bendro rezervacijų termino. [Oficialus reglamentas, 5, 17 ir 32 str.](https://eur-lex.europa.eu/legal-content/En/ALL/?uri=CELEX%3A32016R0679). Toliau siūlomi skaičiai yra platformos eksploatavimo pasirinkimai, kuriuos turi patvirtinti duomenų valdytojas pagal realią veiklą.

## Siūlomi numatytieji terminai

| Duomenys | Siūlomas terminas ir pradžia | Veiksmas |
| --- | --- | --- |
| Prisijungimo kodas | 10 min.; panaudojus — iš karto nebegalioja | Pašalinti kodo turinį; techninius iššūkio įrašus po 24 val. nuo galiojimo pabaigos |
| Sesija | 8 val. arba 30 min. neveiklumo | Nebeprileisti ir pašalinti iš pasibaigusių sesijų saugyklos |
| Priimtų / galutinai nepavykusių laiškų metaduomenys | 30 dienų nuo galutinės būsenos | Pašalinti gavėją ir šifruotą turinį; nejudinti laukiančių ar nepatvirtintų pristatymų |
| Kliento žinutės, užklausos ir meistro kortelės pastabos | 12 mėn. nuo paskutinio susijusio užbaigto vizito ar užklausos uždarymo | Ištrinti turinį; ateities vizitas arba aktyvus ginčas atideda tik konkrečios dalies valymą |
| Vizito istorija | 24 mėn. nuo vizito pabaigos / atšaukimo | Pašalinti kliento identifikaciją ir laisvą tekstą; agregatai lieka tik jei nebeidentifikuoja kliento |
| Paskyra be ryšių | 24 mėn. neveiklumo | Pranešti apie uždarymą prieš 30 dienų; po termino pašalinti identifikaciją ir prisijungimo galimybę |
| Savanoriškas kliento paskyros ištrynimas | Pradėti iš karto po naujo el. pašto patvirtinimo | Sesijas atšaukti iš karto; nuorodas / profilį / pasirinkimus pašalinti; atskirai parodyti konkrečius dar išlaikomus įrašus ir priežastį |
| Viešas atsiliepimas | Iki jo pašalinimo arba paskyros ištrynimo | Pašalinti tekstą ir autorystę; reitingo perskaičiavimą atlikti atominiu veiksmu |
| Trynimo vykdymo techninis kvitas | 24 mėn. nuo įvykdymo | Tik prašymo ID, veiksmo versija, datos ir rezultatų skaičiai; be el. pašto, teksto ar atkuriančio profilio snapshot |
| Laikinas dummy bandymas | Pradinė galiojimo pabaiga 2026-10-16 21:10:47.982 UTC | Prieiga uždaroma jau dabar numatytu kodu; atskiras savo namespace šalinimas ir kopijų terminas turi būti įvykdyti bei užfiksuoti, ne vien pažymėti410 |

Konkrečiai išimtis saugoti tik su `reason`, `scope`, `expiresAt`, atsakingu valdytoju ir leidžiama peržiūra. Neįrašyti bendro „teisės aktai reikalauja“ visiems kliento įrašams. Sveikatos duomenų ir naujų mokėjimų funkcijų neįtraukti į įprastas pastabas.

## Dabartinė realizacija ir spragos

Patikrintas šaltinis: runtime7f08f8a / platform-object SHA3f6a8fe9. Esamas centrinis valymas apima sesijas, OTP, rate limits ir užbaigtų laiškų / pranešimų metaduomenis. Kodo30 dienų riba skaičiuojama nuo `created_at`, ne nuo galutinio pristatymo; lentelė aukščiau siūlo tikslesnį terminą. Organizacijų su handoff istorija eilučių centrinis valymas sąmoningai neliečia, kad neatgaivintų seno rašytojo.

Aktyvus organizacijos target neturi tokio pat metaduomenų valymo. Central `directory_organization_mail` ir target `organization_mail_claims` talpa4096; užbaigti kvitai automatiškai nedingsta. Tai perskaitant nustatyta talpos rizika, **ne dar atliktas apkrovos ar gyvo sutrikimo įrodymas**. Prieš pataisą reikia izoliuoto talpos / lost-ACK / restart bandymo, koordinuoto terminalių kvitų valymo ir apsaugos nuo pakartotinio SMTP.

Kliento export, tapatybės patvirtinimas, prašymas, jo auditas ir atsiėmimas veikia. `erasureCase.executionEnabled=false`: nėra tikro paskyros / rezervacijų / target / medijos / pašto trynimo vykdymo. Siūlomos tvarkos dokumentas šios spragos neužbaigia.

## Atsarginės kopijos ir atkūrimas

1. Naudoti jau turimą SQLite Durable Objects30 dienų PITR. [Oficiali Cloudflare dokumentacija](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api) apima SQL ir KV; tai nėra nepriklausomas kito tiekėjo backup.
2. Kasdien fiksuoti privatų source ir visų aktyvių target checkpoint manifestą: instance ID, epoch / handoff state, schema / source versiją, bookmark ir šifravimo rakto nuorodą. Pats manifestas nėra suderinto porinio atkūrimo įrodymas.
3. Prieš migraciją / negrįžtamą veiksmą padaryti privačią šifruotą kopiją. Siūlomos kopijos galioja30 dienų; senesnių kopijų automatinis valymas turi turėti atskirą kvitą. Dar nėra įdiegtos nepriklausomos tokios kopijos, tvarkaraščio, rakto escrow ar išbandyto importo — jų nevadinti esamais backupais.
4. Source ir aktyvų target atkurti tik kaip koordinuotą porą sustabdžius rašymus bei mail alarmus. Dabartinis kodas source-only rewind po bet kokio handoff blokuoja; aktyvios poros PITR nepriimtas. Iki jo įgyvendinimo — fix-forward, ne savavališkas vieno objekto rewind.
5. Trynimo kvitų / tombstone žurnalas turi būti atkūrimo proceso įvestis: po restore, prieš grąžinant prieigą, pakartoti visus jau įvykdytus trynimus. Nesiųsti atkurtų senų pranešimų ir neatkurti pašalintų paskyrų. Provider PITR išlikimą iki jo30 dienų ribos atskirai paaiškinti klientui; nežadėti momentinio visų kopijų išnykimo.
6. Kartą per mėnesį izoliuotai išbandyti atkūrimą ir patikrinti paskyrų ribas, rezervacijų / medijos skaičius, pašto nedubliavimą bei trynimo pakartojimą. Siūlomi RPO24 val. ir RTO4 val. yra tikslai; dabartiniai bandymai dar neįrodo jų laikymosi.

Papildomos mokamos saugyklos nepirkti. Pirmiausia realizuoti privatų automatizuotą eksporto / šifravimo / importo kelią esamose autorizuotose saugyklose; jei jų netinka, pateikti atskirą kainos ir vietos sprendimą.

## Įgyvendinimo priėmimas po sprendimo

- Vienas versioned policy objektas serveriui, operatoriui ir privatumo tekstui; draft politika negali įjungti vykdymo.
- Klientas mato konkrečių šalinamų ir atidedamų dalių preview. Fresh OTP, serverinis own-account guard ir užrakintos pasenusios versijos. Jokio browser flag, kuris pats įjungia trynimą.
- Vykdymas ribotomis atominėmis partijomis source ir kiekviename target; audit / idempotency / atsiųstas arba prarastas atsakymas išlieka. Meistro arba darbuotojo paskyrai — atskiras paslaugų tęstinumo / narystės sprendimas.
- SMTP laukiantys dar neišsiųsti pranešimai nutraukiami, visos sesijos uždaromos, paieškos / paskyros / export / nuotraukos nebeatiduoda ištrintų duomenų. Neprarandami kitų klientų vizitai.
- Native SQLite restart, lost-reply, concurrent booking / erasure, active future visit, target neprieinamumas ir tikslių kopijų restore + tombstone replay bandymai. Tada actual izoliuotas HTTPS kelias ir canonical leidimo priėmimas.

Sprendimui reikia patvirtinti siūlomus12/24 mėn. veiklos terminus bei30 dienų kopijų langą arba pateikti konkrečius kitus terminus. Tai reikalinga ne pakartotiniam leidimui diegti, o tam, kad platforma negrįžtamai nešalintų duomenų pagal agento spėjimą.
