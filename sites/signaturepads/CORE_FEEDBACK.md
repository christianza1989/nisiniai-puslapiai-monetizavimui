# Signaturepads: Core patirtis

2026-10-31, issue303 / public102. Savininko Cloudflare pavedimas reikalavo
tikros atskiros peržiūros, išlaikant veikiantį WordPress ir production
launch checks. Loopback admission teisingai neleido seno local-preview
tiesiog publikuoti. Įgyvendintas atskiras exact-host / readOnly / testOnly
hosted-preview su8 lokalių sričių įrodymais; production13 vartų ir paketo
baitai nekinta. Upgrade `cc4ba8c4-8141-4d57-8efe-944cf5db6cb7`.

Tikras edge browser testas rado bendrą integracijos spragą: Vinext rezervuoja
`/_next` ir Worker-first režimu neperduoda CSS / JS į ASSETS. Visi26 HTML,
204 vaizdai ir237 alias jau buvo PASS, bet tai neįrodė dizaino. Kanoninis
hostedPreviewAssetResponse perduoda tik viešą framework static namespace po
to paties host / method vartų; turinio ir medijos native vartai lieka Core.
ESM adapteris taiko tą patį helperį nekintamam compiled Core ir įrašo source /
artifact SHA. Pridėta prasminga regresija bei bendro SEO smoke realizuotų
CSS / JS tikrinimas ir V2 / exact hosted origin palaikymas. V1 prielaidos
išliko; native favicon redirect griežtai siejamas su metadata ir projekcija.
Upgrade `f2d7b5ba-5b0f-48ff-a51e-9ac2367f08e2`.

Galutinė priėmimo ataskaita: [Cloudflare peržiūra](CLOUDFLARE-PREVIEW-20261031.md).
314 testų, types, tikras SEO smoke ir4 pločių browser PASS. Tiksli dalinio
build / adapterio kilmė ir ankstesni FAIL išsaugoti. Nepriskirti production
launch, SMTP / INBOX, main merge ar automatinio kitų PC adoption.

2026-10-31: tiesiogiai užsakytas realus formos paštas tik Cloudflare
peržiūroje. Read-only admission negalima tyliai paversti rašančiu:
pridėtas atskiras hosted-inquiries su owner/auth įrodymais, vienu tiksliu
POST /uzklausa, pilnu native build, dedicated D1, fail-closed Origin /
bindings ir platformos per-edge ribojimu. Esamas native D1 claim /
Hostinger transportas pakartotinai panaudotas, production13 neapeiti.
Upgrade395e5908-bd2f-4b3c-b89a-5f427e841a08, public source4363ad2d,
versija f3de2d79-9a93-44b7-b655-1195a6186025.319 testų ir actual hosted
browser→D1notified→Hostinger204 / viena Sent kopija po replay PASS.
API neturi custom Reply-To: kliento adresas tekste, apribojimas pasakytas
savininkui. Gavėjo INBOX neprilyginta serverio kvitui; laukiama Roko
patvirtinimo. Esamas o3tech relay / env / DB, originalus WordPress ir DNS
nekeisti. Išsami ataskaita: CLOUDFLARE-MAIL-20261031.md.

2026-10-31 vėlesnis etapas: Rokas patvirtino gavęs konkretų pažymėtą104777af
testą. Gavėjo raw headers/aplankas neinspektuoti; šiuo pasiruošimo etapu
papildomų tikrų laiškų nesiųsta. Native transportas liko tas pats.

Paruošime rasta ir ištaisyta bendra priežastis: vien media failų egzistavimo
ar source hint analizės neužtenka, reikia actual head SSR / HTTP. Hero
konfigūracijoje yra familyID, favicon — konkretus assetID. Pirmasis neteisingas
ID palyginimas buvo patekęs į35a13d2b; jo84balų rezultatas išsaugotas.
f2344dfc tikro RootLayout regresija ir actual head patikra įrodo būtent
rodytos eligible šeimos preload. Galutinis mobile90/desktop100, LCP3.49s,
CLS0,TBT22ms; pagerėjimas nėra pažadas apie būsimą field CWV.
Upgrade3435043c-66ee-4481-9ec9-132430e95f87.

Seno GSC patvirtinimo meta negalima prarasti migracijos metu ar paskleisti
kitiems tenantams. Source registry siejamas su siteId+canonicalHost;
actual preview head turi tiksliai vieną originalią žymą, kiti scope jos negauna.
GSC duomenų API neprisijungęs/expired — tai ribotas tyrimas, ne tuščia istorija.
Upgrade1f07ccff-2b83-4b7f-8e74-8a681f92da90.

Prieinamumo heading-order radinys kilo ne iš šrifto, bet iš to paties card
naudojimo dviejose vietose: kataloge reikiaH2, related bloke poH2 reikiaH3.
Renderis priima kontekstą, CSS ir quick-view palaiko abi žymas. Galutinis
software Lighthouse a11y100 (buvo98), actual6korteliųH2 ir relatedH3 regresija.
Upgradeab120de1-7515-4ea3-9d86-d3eb11b2f0ab.

Production target nėra teisė pernaudoti review kvitą. Naujas Vite profilis
reikalauja compiler production admission, dedikuotos D1/mailbox/limiter ir
native guard prieš saugojimą. Tas pats guard bendras hosted formai; kitų
svetainių neįjungti profiliai nekeičia elgesio. EU D1 paruošta/0rows,
Worker nepaleistas, custom domenai nepririšti, DNS importas neįvykdytas.
325testai,TypeScript,RSC,types,dry-run ir actual invalid-only429 patikra PASS.
Approximate CF edge limit nėra globali siuntimo kvota. Pirmam tikram deploy
secret turi būti įkeltas su versija, ne vėliau po domeno prijungimo.
Upgrade81a679e2-b445-4d0a-819f-d2dc64f05d48.

Prieš galutinį priėmimą išlieka faktiniai ribojimai: juridinis operatorius /
retention nespėjami iš hosting sąskaitos, START2.4 viešos prozos rolės
neapeinamos, tikro200% zoom native klaida nežymima PASS, WindowsWebKit
nevadinamas fiziniu iPhone/Safari. Canonical private/public checkout nebuvo
skill nurodyto verify-site-completion.mjs; nenaudota sena asmeninė kopija ir
neišgalvotas SITE_COMPLETION. Ši naujo F1 verifier priklausomybė už dabartinės
rezervuotos mail/config/metadata srities, pažymėtaY3UNVERIFIED; atskiras
platesnis core įgyvendinimas nepakeičiamas šios migracijos HTTP testų suma.
Pilnas85kriterijų reporting rezultatas7.94local nėra viso pavedimo10/10.
WordPress backup praleistas savininko pavedimu; DNS rollback konfigūracija
neprilyginama backup. Aktualus rezultatas: PRELAUNCH-20261031.md.
