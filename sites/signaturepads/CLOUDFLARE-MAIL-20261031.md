# Signaturepads: užklausų paštas Cloudflare peržiūroje

2026-10-31 tiesioginis savininko pavedimas: įjungti formos paštą esamoje
Cloudflare versijoje iš `kontaktuforma@kontaktuforma.lt`; veikiančios
`signaturepads.lt` WordPress svetainės kol kas nekeisti. Gavėjas iš
nekintamo native paketo / tinklo nustatymų: `sales@signaturepads.lt`.

## Įgyvendinimas

Peržiūra: https://signaturepads-preview.pinet-azprekyba.workers.dev/.
Esamas Worker `signaturepads-preview`; nauja atskira EU D1
`signaturepads-preview-inquiries`. Tiksliai šiam host pritaikytas
`hosted-inquiries` admission leidžia vienintelį papildomą veiksmą:
POST `/uzklausa`. Kitos mutacijos lieka uždraustos; noindex / no-store,
kanoninės `.lt` nuorodos ir atskiri production13 vartai išlieka.

Pilnas native pipeline naudoja esamą `/lead` validaciją, D1 įrašą,
durable mail-sending claim, Hostinger API ir to paties ID pakartojimo
apsaugą. Naujame scope papildomai tikrinami tikslus Origin / Referer,
site / sender / konfigūracija ir platformos dažnio ribojimo binding.
10/60 riba taikoma site + IP kiekvienoje Cloudflare vietoje apytiksliai;
ji nėra griežta pasaulinė ar bendro pašto limito garantija. Anoniminė
forma neturi prisijungusio naudotojo ID; bendrą IP gali dalytis klientai.

Naudojamas esamas canonical Hostinger HTTPS API transportas. SMTP AUTH
su savininko pateiktu slaptažodžiu ir tikro mailbox API identiteto
patikros praėjo; AUTH metu DATA ir tikrų laiškų nebuvo. Tiesioginio
SMTP iš Worker negalima naudoti, nes smtp.hostinger.com adresas patenka
į Cloudflare blokuojamą outbound TCP IP diapazoną.

Sukurtas atskiras API raktas, leidžiantis tik nurodytą siuntėjo dėžutę.
Raktas saugomas privačiai už repo ir Worker secret; jo nėra kode,
vars, receipt ar client/server build. Slaptažodis neperkeltas į Git.
Esamo o3tech relay, jo env / DB / slaptažodžių ir abiejų domenų DNS
šis darbas nekeičia. Hostinger API v1.1 nepalaiko pasirinktinės
Reply-To antraštės: kliento kontaktas pateikiamas laiško tekste;
atsakymo adresą operatorius pasirenka iš šio kontakto.

## Patikra ir ribos

319 Core testų PASS, TypeScript PASS, scoped lint 0 klaidų ir1
ankstesnis default-export perspėjimas. Nauji5 testai tikrina atskirą
autorizaciją, originalaus read-only išsaugojimą, exact POST kelią,
svetimą kilmę / trūkstamus bindings iki body skaitymo, ribojimą ir
konfigūraciją be paslapčių. Native paketas nekeistas:
`94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25`.

Viešas source: `4363ad2df6c85cd40bcd3e9159cc09179392a1d3`, PR108 / issue102;
privatus dokumentavimas PR318 / issue303. Upgrade
`395e5908-bd2f-4b3c-b89a-5f427e841a08`. Pilnas native build ir actual
hosted pašto patikros fiksuojamos atskiru galutiniu kvitu po šio įrašo.

Įrodymai: `D:/Core/output/signaturepads-migration-20261029/cloudflare-mail-20261031/`.
Provider204 / D1 notified / Sent kopija savaime neįrodo gavėjo INBOX.
Production operatoriaus ir privatumo kvalifikacija bei domeno pakeitimo
pavedimas nėra suteikiami šiuo peržiūros pašto priėmimu.

## Atstatymas

Atstatyti tik peržiūros Worker į išsaugotą veikiantį read-only build
`9041cad4-bdbd-4120-8fd0-42e8654956de` (prireikus naudoti retained config
ir artefaktus; D1 binding pasikeitimas gali riboti versions rollback).
Išsaugoti užklausų ir siuntimo įrodymus. Netrinti nežinomo siuntimo
claim ir automatiškai nesiųsti jo pakartotinai. Pašto raktą atšaukti
tik įvertinus jo priklausomybes; jis atskiras nuo esamo o3tech SMTP.

## Galutinis hosted kvitas

Aktyvi versija `f3de2d79-9a93-44b7-b655-1195a6186025`, publikuota
2026-10-31 08:40:27 UTC. Tai pilnas native Vite build iš aukščiau
nurodyto source; ankstesnis compiled-entry adapteris nenaudotas.
RSC patikra PASS; sugeneruoti tikro config binding tipai, dry-run PASS
(gzip2860.70KiB). Publikuojami289 failai,204 native asset SHA sutampa,
13625 kiti failai atmesti; secret nėra build ir išliko Worker vault.
Config SHA `731e86ed4c58f662e3f1485153b3550f02e998319acb63bd8b75c7c675404372`.

Actual browser form testas, vienas išsiuntimo ketinimas su išskirtiniu
ledger, ID `104777af-db4f-47e2-aa2d-1453af1f393b`:

- HTTP200 ir tikra UI žinutė apie operatoriaus pašto serverį;
  sėkmės metu forma išvaloma ir ID pakeičiamas.
- Dedicated D1 vienintelis įrašas `notified`; sutikimas, tekstas,
  telefono laukas ir susisiekimo pasirinkimas išsaugoti.
- Tas pats payload / ID: HTTP200, kitas payload / tas pats ID:409.
- Po replay Hostinger Sent tik1 kopija, tikslūs From / To ir visi
  formos laukai tekste. Message-ID
  `<1793436104325166426.1793436104@kontaktuforma.lt>`.
- Subject: `[signaturepads.lt] Poreikio užklausa 104777af`.
  Vardas ir žinutė aiškiai pažymėti BANDOMOJI UŽKLAUSA; kliento
  duomenys sintetiniai, atsakyti / skambinti neprašoma.
- Svetima / trūkstama kilmė403, netinkami duomenys / sutikimas400,
  honeypot200 be naujo įrašo / laiško; kiti POST503. Faktinis429
  pastebėtas23-iu papildomu tuščiu bandymu: dokumentuota apytikslė
  per-edge riba, ne pažadas sustabdyti tiksliai11-ą pasaulinę užklausą.
- Desktop1440 / mobile390 formos patikrintos ir screenshot peržiūrėtos;
  mobile be horizontalios slinkties. Fizinis telefonas netikrintas.

Visi26 HTTP puslapiai,204 asset SHA,237 media alias,50 legacy page
query ir25 slash redirect PASS. Bendras actual SEO smoke:26 puslapiai,
14 CSS / JS resursų, robots / sitemap / llms / schemas / host isolation
ir404 PASS. Local8956 išliko200. Originalo HTML SHA prieš ir po vienodas
`64d1cd11dabaa2760072305f57667cd7903d8df2ea4183d7bc475a4a116ae0cd`,
A194.59.166.37 ir tie patys Google MX; WordPress / domenas nepakeisti.
Siuntėjo SPF Hostinger, DMARC p=none ir aktyvus DKIM selector a yra;
DNS įrašų nekeista. Actual gavėjo INBOX dar NEPATVIRTINTA: prijungto
info@azprekyba.lt Gmail paieška pagal tikslų bandymą nieko nerado,
o tai nėra tiesioginė prieiga prie sales@signaturepads.lt dėžutės.

Ankstesni privačių CLI harness žingsnių FAIL neištrinami: pirmas
secret loader turėjo Windows --import kelią; types CLI netinkamą cwd;
D1 JSON skaitymą slopino log lygis, vėliau file-upload progress. Pataisyti
tik operaciniai skriptai; tikra forma po sėkmės nebesiųsta iš naujo.
