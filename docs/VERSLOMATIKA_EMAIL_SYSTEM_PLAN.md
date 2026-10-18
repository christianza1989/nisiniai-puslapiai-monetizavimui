# Verslomatikos pašto, kampanijų ir agentų sistema

2026-10-18. Būsena: įgyvendinimo planas, ne jau veikiantis modulis.
Audituotas platformos šaltinis:40abff139f2207f06fd2a2b74064bc9cd3934111;
veikianti vietinė API tebėra5fdf946/schema0049. Naujo tiekėjo prijungimas,
mokėjimai, DNS ir gyvas kontaktavimas šiuo planu neatliekami.

## 1. Sprendimas ir pirmas naudojamas rezultatas

Vienoje verslo paskyroje sujungti klientų paiešką, atranką, kampanijas,
tikrą siunčiamą ir gaunamą paštą, agentų darbą ir pamatuojamus rezultatus.
Naudoti esamą Business/Agent/Config/Case/MailMessage/Task/Run core.
Nekurti antro CRM, pašto variklio ar kalibravimo sistemos kiekvienai nišai.

Pirmoji nauja jungtis: Gmail API. Komercinei tapatybei siūloma Google Workspace
dėžutė su verslo domenu; esama asmeninė Gmail paskyra tinka izoliuotam bandymui.
Tai rekomendacija, ne užsakyta prenumerata ar jau sukurtas adresas.
Google Workspace palaiko [adresus su savu domenu](https://workspace.google.com/products/gmail/).
Hostinger SMTP/IMAP išlaikomas kaip kitas to paties kontrakto adapteris.

Pirmas vertingas priėmimas: autentifikuotas savininkas mato vieną savo verslo
giją; kontroliuojamas testinis laiškas išsiunčiamas vieną kartą, tikras atsakymas
grįžta į tą patį Case, matomas originalas ir lietuviškas vertimas, o statistika
rodo įrodytas būsenas. Skaitymas, siuntimas ir agento automatinis atsakymas
priimami atskirai. Visas naujienlaiškių redaktorius šio pirmo kelio nestabdo.

## 2. Kas jau yra ir ką reikia papildyti

| Dalis | Dabartinis pagrindas | Trūkstama realizacija / priėmimas |
| --- | --- | --- |
| Verslas ir agentai | Tikras BusinessGrant, išorinio šaltinio binding, Agent ir nekintamos Config revizijos | Konkretaus naujo verslo registracija, šaltinio peržiūra, kalibravimas ir kanalų admission |
| Gijos ir laiškai | Case/MailMessage; acquisition CorrespondenceThread/MailBinding; modelių darbas per bendrus Task/Run | Įprastam vartotojui tinkamas gyvas siuntimo ir gavimo adapteris |
| Siuntimas | Esamas SMTP ir conversation Outbox, aiškus accepted/rejected/unknown atskyrimas | Bendras kampanijų dispatch, eilės, leidimai, kvotos ir atkūrimas be dublių |
| Gavimas | Ribotas žinomų gijų IMAP skaitytuvas | Gmail sinchronizacija, patvarūs žymekliai, bounce/OOO/atsisakymų ir rankinių atsakymų importas |
| Lietuvių kalba | mail_view, originalo hash susieti vertimai, atskira vertimo Task/policy | Tikrų naujo adapterio laiškų ir vertimų priėmimas; originalo nekeisti |
| Klientų paieška | acquisition research/draft, šaltinių ir kontaktavimo politikos, vietiniai/natyvūs laboratoriniai keliai | Gyvas Treg discovery, nuolatinė kampanijų eilė ir autorizuotas transportas |
| Statistika | Atskiro capture ledger rodikliai; tai nėra išsiųstų laiškų statistika | Bendri pašto įvykiai, teisingi skaitikliai, šalys, kampanijos ir siuntimo problemos |

Svarbu: dabartinis acquisition/projection.py aiškiai grąžina trūkstamus
outreach_sent/received_replies šaltinius kaip nežinomus. Jų negalima parodyti
kaip realiai pamatuotų nulių ar pakeisti šio ledger semantiką į marketingo ataskaitą.

## 3. Visa darbo eiga

1. Savininkas pasirenka verslą, pasiūlymą, auditoriją, šalis ir ribas.
2. Paieškos agentas per ribotą Treg/Google/Maps adapterį randa organizacijas.
   Paskui tikrina originalias svetaines ir kontaktų šaltinius. Paieškos filtro
   rezultatas savaime nepatvirtina šalies, veiklos, pirkimo ketinimo ar teisės rašyti.
3. Atranka atskirai vertina tinkamumą, konkretų poreikio signalą, kontaktą,
   kontaktavimo pagrindą ir realią galimybę įvykdyti pasiūlymą.
4. Rašantis agentas parengia laišką pagal aktualius produkto faktus ir kalbą;
   nepriklausomas kokybės agentas peržiūri tikslią temą, tekstą, nuorodas ir priedus.
5. Serveris rezervuoja vieną siunčiamą veiksmą, prieš tinklo operaciją iš naujo
   patikrina dabartines teises, kontaktavimo draudimus, faktus ir kampanijos ribas.
6. Adapteris siunčia, išsaugo kvitą ir atskiria priėmimą nuo neaiškaus rezultato.
7. Sinchronizacija susieja tikrą atsakymą, nepristatymo pranešimą ar atsisakymą.
8. Koordinatorius pirmiausia apdoroja atsakymus. Poreikio turintį klientą perduoda
   konsultantui, pasiūlymui ar žmogui; neleidžia keliems agentams atrašyti kartu.
9. Savininkas mato tą pačią giją, agento veiksmus, kitą žingsnį ir statistiką.

Paieška pildo eilę iki nustatytos ribos, užuot laukusi visų ankstesnės partijos
atsakymų. Atsakymų ir draudimų apdorojimas visada turi pirmenybę prieš naują partiją.
Naujas rastas kontaktas automatiškai netampa prenumeratoriumi ar siuntimo leidimu.

## 4. Kampanijos, šalys ir laiškų sekos

Kampanija turi versiją, tikslą, segmentus, šalis, kalbas, faktų revizijas,
siuntėją, gavėjų tinkamumo taisykles, pradžią/pabaigą, laiko juostą, tylos valandas,
gavėjų/siuntimo/modelių/paieškos limitus ir stabdymo veiksmą.

Pradinis geografinis bandymas gali turėti tris panašaus dydžio šalių grupes,
pavyzdžiui, po30 patikrintų organizacijų. Segmentas ir pasiūlymas turi būti panašūs.
Tai tyrimo pavyzdys, ne aktyvuota kampanija ar pakankamas statistinis šalies įrodymas.
Fiksuoti pradines grupes, stebėjimo langą ir variantų priskyrimą prieš siuntimą.
Lyginti užklausos kainą ir tikrus poreikius, ne vien atidarymus.

Koordinatorius siūlo didinti perspektyvią rinką, kai sukaupta pakankamai stebėjimų;
rodoma imtis, neapibrėžtumas ir skirtingas laiškų amžius. Tyrimo biudžeto dalis
paliekama kitoms rinkoms. Neapeiti kvotų kuriant papildomas kampanijas ar siuntėjus.

Sekos būsenos: atranka → peržiūrėtas juodraštis → suplanuota → išsiųsta / problema
→ laukiamas atsakymas → atsakyta / sustabdyta / baigta. Laiško būsena ir kliento
pardavimo etapas yra atskiri duomenys. Follow-up turi aiškų maksimalų skaičių,
intervalą ir aktualų pagrindą; jokio begalinio priminimų ciklo.

Bet koks žmogaus atsakymas sustabdo automatinį pirmojo kontaktavimo follow-up.
Atsisakymas, skundas ir nuolatinis nepristatymas slopina naujus marketingo veiksmus.
OOO ir laikinas sutrikimas turi atskirą laukimo būseną. Teigiamas atsakymas
leidžia rengti tinkamą tęsinį pagal tikrą klausimą, ne savavališkai praplėsti leidimus.
Savininko rankinis atsakymas taip pat turi sustabdyti besirengiantį agento atsakymą.

Naujienlaiškiams numatyti segmentus, žymas, patvirtintą prenumeratą, šablonus,
testinę peržiūrą, planavimą, paprastą atsisakymą ir A/B bandymus. Paslaugos
pranešimai, klientų konsultavimas ir rinkodara gauna skirtingas paskirtis bei politiką.

## 5. Rodikliai ir tikslios reikšmės

| Rodiklis | Kas skaičiuojama | Ko iš jo negalima spręsti |
| --- | --- | --- |
| Paruošta | Unikalūs patvirtinti juodraščiai | Kad laiškas išsiųstas |
| Eilėje | Dabartiniai leistini laukiantys dispatch | Kad serveris juos jau priėmė |
| Išsiųsta / tiekėjas priėmė | Unikalūs teigiami siuntimo kvitai | Kad pasiekta gavėjo INBOX |
| Pristatymas patvirtintas | Tik turimas aiškus konkretaus laiško pristatymo įrodymas | Kad laiškas perskaitytas ar buvo INBOX, jei šaltinis to netvirtina |
| Nepristatymas | Patvirtintas bounce, atskirai nuolatinis ir laikinas | Kad kiekvienas neatsakęs gavėjas turi blogą adresą |
| Rezultatas neaiškus | Nutrūkęs siuntimas be patikimo galutinio kvito | Kad saugu siųsti dar kartą |
| Atidarymo signalas | Įjungto sekimo vaizdo užklausa ar tiekėjo įvykis | Kad konkretus žmogus perskaitė tekstą |
| Nuorodos signalas | Unikali stebėta nuorodos užklausa; botų signalai atskirai | Kad pirkėjas domisi ar užsisakė |
| Atsakyta | Tikras susietas įeinantis laiškas, automatiniai atsakymai atskirai | Kad atsakymas teigiamas |
| Teigiamas atsakymas | Versijuotas agento vertinimas su įrodančios žinutės nuoroda | Kad įvyko pardavimas |
| Kvalifikuota užklausa | Konkreti patvirtinta poreikio informacija | Kad pateiktas/priimtas pasiūlymas |
| Pasiūlymas / pardavimas | Tikras susietas dokumentas arba užsakymo/apmokėjimo kvitas | Kad agento pažadas yra mokėjimo įrodymas |
| Atsisakymai ir skundai | Patvarūs draudimai bei turimi realūs skundų įvykiai | Kad nepalaikomas skundų šaltinis reiškia nulį skundų |

Kiekvienas rodiklis turi prieinamumą, šaltinį, paskutinės sinchronizacijos laiką,
skaitiklį ir vardiklį. Nepalaikomas rodiklis rodomas „Nėra duomenų“.
Null ir nulis skiriasi. Procentas be vardiklio nerodomas.

Ataskaitos turi du aiškius režimus: pasirinktu laikotarpiu įvykę veiksmai ir
pasirinktos išsiuntimo grupės vėlesni rezultatai. Vienas naujausias gavėjo statusas
negali pakeisti visos įvykių istorijos. Bendras atsakymų procentas skaičiuojamas
pagal unikalius kontaktuotus gavėjus; atskiras laiškų dažnis apima ir follow-up.
Filtrai: verslas, kampanija, šalis, segmentas, kalba, siuntėjas, variantas,
laikotarpis ir synthetic/real. Testiniai laiškai neįtraukiami į komercinius KPI.

Atidarymai yra apytiksliai: Apple privatumo apsauga gali parsisiųsti turinį fone
gavus laišką, o ne žmogui jį atidarius. Tai aprašo [Apple](https://support.apple.com/guide/mail/protect-email-privacy-mlhlp1205/mac).
Numatyta jų nenaudoti kaip pagrindinio kampanijos optimizavimo signalo.
Sekimas įjungiamas tik pagal per-kampanijos privatumo politiką; jo išjungimas
netrukdo susirašinėjimui, atsakymų ar užklausų apskaitai.

## 6. Bendras pašto branduolys ir duomenų sutartys

MailMessage saugo vieną nekintamą originalą ir jo tikslius ryšius. Case yra
kliento darbo gija, ne antra laiškų saugykla. Esamas acquisition MailBinding
išlaiko kampanijos, gavėjo ir source ryšį; nepridėti laiško teksto į statistiką.

Papildyti tik tai, ko trūksta bendrame modulyje:

- Pašto jungtis: tikras tiekėjo paskyros identifikatorius, patvirtintas siuntėjas,
  saugiai užšifruota credential nuoroda, leidimų apimtis, revizija, būsena ir scope.
- Siuntimo politika bei dispatch: tikslus MailMessage, patvirtinto turinio hash,
  kampanijos/sekos žingsnis, gavėjas, vienas action key, bandymo ir nežinomybės kvitai.
- Nekintami pašto įvykiai: scoped mail ID, tipas, tiekėjo event ID, occurred_at,
  received_at, šaltinio klasė, schema ir deduplikavimo raktas. Jokio plaintext
  asmeninio adreso viešame sekimo URL, analitikoje ar loguose.
- Jungties sinchronizacijos žymekliai, vieno vykdytojo lease ir importo kvitai.
- Bendri gavėjo draudimai ir rinkodaros leidimo įrodymai, suderinti su jau esančia
  acquisition ContactPolicy; nauja kampanija negali panaikinti seno atsisakymo.
- Perskaičiuojamos statistikos projekcijos su vandens ženklu ir šaltinių coverage.

Dabartinis Outbox yra ConversationChild. Jo negalima pririšti prie fiktyvaus
Conversation, kad veiktų kampanijos. Prieš migraciją aprašyti ir peržiūrėti vieną
bendrą MailMessage siuntimo ribą: conversation Outbox ir acquisition pateikia
ketinimą tam pačiam transporto vykdytojui. Perėjimas išsaugo senus action keys,
ryšius, kvitus ir nežinomus rezultatus; joks lygiagretus nišos sender nekuriamas.

Numatyti adapterio operacijas: ryšio patikra, tikslus siuntimas, siuntimo
nežinomybės sutikrinimas, ribota sinchronizacija ir atjungimas. Kiekvienas adapteris
deklaruoja, kokius įvykius tikrai pateikia. OAuth/SMTP sėkmė neįjungia kampanijos.
Siuntimas per UI, koordinatoriaus chat ir scheduler naudoja tą pačią ribą.

Procesui nutrūkus po išsiuntimo ketinimo, bet prieš kvitą, būsena lieka nežinoma.
Joks naujas request ID, worker restart ar kampanija negali aklai pakartoti efekto.
Prieš aiškiai pakartojamą veiksmą tikrinama tiksli tiekėjo ir Message-ID istorija.
Vien siuntimas su tuo pačiu Message-ID nėra garantuota SMTP deduplikacija.

## 7. Gmail ir Hostinger adapteriai

Gmail prijungimas vyksta per serverio OAuth su state/PKCE ir dabartinio savininko
sesijos ryšiu. Tokenai nepatenka į naršyklės localStorage, agentų promptus ar Git.
Užklausti mažiausių funkcijai būtinų scope; nenaudoti permanent-delete leidimo.
Skaitymui ir siuntimui aktualūs gmail.readonly bei gmail.send, o galutinis rinkinys
priklauso nuo pasirinktų funkcijų. Viešai platformai būtina iš anksto įvertinti
Google verification ir taikomo security assessment reikalavimus, ne pristatyti
asmeninį testinį OAuth kaip daugiaklientę produkciją. [Google scope dokumentai](https://developers.google.com/workspace/gmail/api/auth/scopes).

Gmail watch/Pub/Sub pranešimas yra žinia apie dėžutės pasikeitimą. Po jo reikia
history.list ir patvaraus cursor; tai nėra laiško pristatymo ar atidarymo kvitas.
Watch galiojimą būtina atnaujinti, o prarastą istoriją atkurti ribota idempotentine
sinchronizacija. [Google push dokumentai](https://developers.google.com/workspace/gmail/api/guides/push).
Pirmam mažam vietiniam bandymui leidžiamas ribotas polling; ilgalaikis scheduler
negali priklausyti nuo atidaryto Codex lango ar savininko Chrome.

Asmeninėje dėžutėje pagal nutylėjimą neimportuoti visų senų laiškų. Pirmiausia
tiksliai pažymėtas testinis laiškas ir jo žinoma gija. Produkcijai pirmenybė
atskirai verslo dėžutei. Bendra dėžutė keliems verslams reikalauja patikimo scope
susiejimo; vien From/Subject, etiketė ar modelio spėjimas nesuteikia prieigos.

Hostinger naudoja palaikomą SMTP/IMAP. Esamas skaitytuvas apima paskutines100
INBOX antraščių; jį reikia plėsti patvariu UID/UIDVALIDITY žymekliu ir ribotu
backfill, o ne laikyti pilna sinchronizacija. Naudoti PEEK ir neperrašyti
vartotojo perskaitymo, aplankų ar trynimo būsenų be atskiro pavedimo.
Oficialūs [SMTP/IMAP nustatymai](https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/).

Hostinger leidžia solicited laiškus, bet draudžia nepageidaujamus; viešai rastas
adresas nepakeičia šios transporto politikos. [Oficiali siuntimo politika](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/).
Gmail taip pat turi [siuntėjų ir nepageidaujamų laiškų taisykles](https://support.google.com/mail/answer/81126).
Tiekėjo pakeitimas pats savaime nepatvirtina rinkodaros leidimo.

Didesnio masto prenumeruojamų kampanijų adapteris gali būti prijungtas vėliau,
jei jo API, eventų ir auditorijos sąlygos patikrintos. Šiuo planu alternatyvus
tiekėjas neišrenkamas, neužsakomas ir neįjungiamas.

## 8. Bounce, atsisakymai, sauga ir tiekėjo duomenys

Nepristatymo adapteris atskiria SMTP atmetimą, DSN, laikino pristatymo vėlavimą
ir nežinomą klaidą. Naudoti ribotą MIME/DSN parserį pagal [RFC3464](https://www.rfc-editor.org/rfc/rfc3464),
tikslų išsiųsto laiško/gavėjo ryšį ir patikimumo įvertinimą; neklasifikuoti
bet kokio laiško su žodžiu „undelivered“ kaip autoritetingo bounce.

Marketingo atsisakymas turi matomą nuorodą ir, kur taikoma, RFC8058 one-click
antraštes. [RFC8058](https://www.rfc-editor.org/rfc/rfc8058) naudoja POST;
paprastas GET dėl skenerio neturi sustabdyti prenumeratos be tikro veiksmo.
Tokenas yra nepermatomas, deduplikavimas patvarus, atsisakymas galioja visiems
to paties verslo marketingo agentams. Būtinas kliento aptarnavimas išlieka
atskirai vertinamas, ne paverčiamas naujienlaiškiu.

Klientui skirti agentai gauna tik jiems leistiną žinių projekciją. Vidiniai
tiekėjo kontaktai, derybos ir nepatvirtintos komercinės sąlygos atskiriami nuo
produkto faktų. Tiksli tema, tekstas, nuorodos, parašai ir priedai tikrinami
po generavimo ir prieš siuntimą. Nepakanka vien prompto „neatskleisk kontaktų“.
Tiesioginis prašymas, vertimas, įterpta instrukcija ar persiunčiamas dokumentas
negali apeiti šios ribos. Nežinoma kaina ar terminas perduodami patikslinimui.

Tenant/RLS ir dabartinis BusinessGrant tikrinami serveryje. Kampanijos stabdymas
užkerta naują marketingo siuntimą, bet neištrina istorijos ar tikro inbound.
Kliento HTML/nuorodos/priedai nevykdomi; nuotoliniai vaizdai savininko inbox
automatiškai nekraunami. Retention, eksportas ir pašalinimas veikia pagal scope;
atskiras auditas įrodo, kad po pašalinimo senas eventas neatkuria asmens profilio.

## 9. Patogi sąsaja esamoje trijų dalių darbo erdvėje

Verslo meniu pridėti vientisą „Klientai ir paštas“ sritį. Jos viduje:
„Gautieji“, „Kampanijos“, „Kontaktai“, „Statistika“, „Pašto nustatymai“.
Tai vidinė navigacija; visų funkcijų nedėti į bendrą kairį pagrindinį meniu.

Gautieji rodo būseną, klientą/organizaciją, paskutinę žinutę, atsakingą agentą
ir kitą veiksmą. Atidarius centre rodoma gija, dešinėje poreikis, pasirinkti
produktai, kampanija, agento darbas ir siuntimo įvykiai. Aiškiai atskirti
„Agentas rengia“, „Laukia peržiūros“, „Išsiųsta“, „Gautas atsakymas“ ir „Problema“.
Savininkas gali perimti giją, pataisyti juodraštį ir sustabdyti automatinius veiksmus.

Numatyta lietuviška peržiūra su vienu perjungimu į originalą. Vertimas neredaguoja
originalo ar išsiųsto laiško. Pataisytą laišką siunčiant aiškiai rodoma tikroji
siuntimo kalba. Trūkstant vertimo matomas originalas, o ne tuščias ekranas.

Pirmame kampanijos vaizde rodyti keturis pagrindinius rodiklius: siuntimą,
atsakymus, kvalifikuotas užklausas ir problemas. Išsamesnė diagnostika atveriama
pagal poreikį. Kiekvienas rodiklis paaiškina šaltinį ir duomenų šviežumą.
Ataskaita „neturime duomenų“ negali atrodyti kaip prastas 0 % rezultatas.

Išlaikyti Codex artimą esamą tapatybę, tipografiką ir15/60/25 numatytas sritis.
14 colių ekrane šonines sritis galima sutraukti; mobiliajame rodoma viena užduotis
vienu metu. Būtini ilgi DE/PL tekstai, klaviatūra,320/390/1280 pločiai ir tikras
200 % mastelis, be susigrūdusių KPI ar paslėptų klaidų. Šis planas nėra vaizdinis PASS.

## 10. Įgyvendinimo ir priėmimo eilė

| Etapas | Konkretus rezultatas | Priėmimo įrodymas |
| --- | --- | --- |
| A. Kontraktai ir inventorius | Šis planas, tikslus MailMessage/dispatch/event/sync kontraktas, ownership langai | Peržiūrėta esama realizacija; nėra paralelinio core ar fiktyvių conversation ryšių |
| B. Viena tikra dėžutė | Gmail OAuth, saugūs tokenai, žinomo testinio laiško siuntimas ir atsakymo importas | Owner OAuth/revoke, tikslūs IDs, restart/cursor/replay; vienas išsiuntimas, tikras gavimas; jokio visos asmeninės dėžutės importo |
| C. Pagrindinė statistika ir UI | Eilė, priimta siuntimui, klaidos, gauti atsakymai, LT/originalas | Skaitikliai sutampa su DB kvitais, foreign denial, browser kelias, originalo nekintamumas |
| D. Konkretūs verslo agentai | Research/email/reply/quality, šaltinių ir kontaktų apsauga | Naujas deklaruotas train/regression/protected protokolas, root cause pataisos, adoption/rollback; source ir budget pinai |
| E. Kampanijos ir seka | Ribota atranka, schedule, follow-up, suppression, šalių grupės | Pause/expiry/OOO/atsisakymas/rankinis atsakymas laimi prieš siuntimą; concurrent worker dublių0 |
| F. Pristatymo diagnostika | Tikri palaikomi bounce, galimas click/open signalas, duomenų coverage | DSN/webhook dedupe, netvarka, forgery, late events; proxy/open nevadinami žmogaus perskaitymu |
| G. Pilna marketingo aplinka | Prenumeratos, šablonai, naujienlaiškiai, A/B, išsamios šalys ir rezultatai | Tinkama auditorija, konkretus transportas, proporcinga gyva mažos apimties priėmimo partija |

Techninės regresijos: RLS ir source/grant revocation; crash prieš/po tinklo
efekto; neaiškaus rezultato nepakartojimas; keli agentai/vykdytojai; pasikartoję
ir pavėluoti įvykiai; atšauktas OAuth; kvotos ir429; expired cursors;
HTML/injection; tiekėjo kontaktų nutekėjimas; originalo/vertimo neatitikimai.
Tikri SMTP/API gavimo ir atsakymo bandymai atskiriami nuo imituotų transportų.

## 11. Darbų pasiskirstymas ir dabartinė riba

Pagrindinė sesija valdo šį pašto/platformos planą, bendrus kontraktus, transporto
adapterį, metrikas ir UI. Atskirai užsakyta agentų sesija rengia konkretaus verslo
faktus, klientams saugias žinias, rolių specifikacijas ir naują kalibravimo protokolą.
Kiekvienas naudoja savo branch/worktree; shared failų langai rezervuojami prieš kodą.

Pirmame etape nėra naujų mokamų modelių/paieškos bandymų, gyvų kampanijų ar
prenumeratos. Ankstesni uždaryti kalibravimo limitai ir protected korpusai
neatidaromi. Naujas konkretus protokolas turi savo ribas ir įrodymus.

Savininko atverta Gmail naršyklė tinka patikrinti paskyrą ir kontroliuojamą
testą, bet nėra serverio OAuth jungtis. Google leidimo patvirtinimas atliekamas
tik tiksliai paruoštai programai ir scope. Nereikia siųsti slaptažodžio į pokalbį.
Tikras Workspace adreso sukūrimas, domeno nuosavybė ir DNS patikra lieka būsimi
konkretūs prijungimo veiksmai; asmeninis Gmail testas jų nepakeičia.

Ankstesnis live-preview blokas tebėra atskiras: 40abff13 turi 138 susijusių
offline PASS, bet naujas pacing dar neadoptuotas į Serving ir tikras ciklas
nepriimtas. Ši pašto plano užduotis nekeičia senų78/c3finding/fixing įrašų.
