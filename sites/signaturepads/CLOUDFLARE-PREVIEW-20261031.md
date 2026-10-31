# Signaturepads Cloudflare peržiūra, 2026-10-31

Roko pavedimas: „ikelk svetaine i claudflare“. Įkelta atskira viešai pasiekiama,
neindeksuojama peržiūra: https://signaturepads-preview.pinet-azprekyba.workers.dev/.
Worker `signaturepads-preview`, paskyra `1c0a7407abfb959d5ff46540f5f7009d`,
priimta versija `9041cad4-bdbd-4120-8fd0-42e8654956de`. Domeno perkėlimas
neatliktas: `signaturepads.lt` tebėra ankstesnis WordPress / Hostinger puslapis.
Prieš ir po įkėlimo vienodi A bei MX įrašai ir pagrindinio HTML SHA-256
`64d1cd11dabaa2760072305f57667cd7903d8df2ea4183d7bc475a4a116ae0cd`.

Tas pats native Studio release `2ac181d0-267a-4216-8900-844dd180a9cd`, paketo
SHA-256 `94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25`:
26 puslapiai, 19 produktų, 3 kategorijos, 204 WebP failai, 237 senų vaizdų
nuorodos. Tekstai, kontaktai, kainos, vaizdai, dizainas ir kanoniniai adresai
šiame pavedime nekeisti. Vietinė8956 peržiūra išliko veikianti.

Peržiūrai naudojamas atskiras hash-bound `hosted-preview/testOnly/readOnly`
admission su vienu tiksliu HTTPS host. Tai nėra production priėmimas. Tik GET
ir HEAD; POST atmetamas prieš body skaitymą, DB, įvykius ir paštą. Vienintelė
resurso binding – ASSETS; nėra D1, R2 ar pašto binding, nėra custom routes.
SMTP / Hostinger / native-email / voice išjungti. Kontaktų forma matoma
peržiūrai, tačiau užklausos neišsaugomos ir neišsiunčiamos. Išsaugotas tikras
`sales@signaturepads.lt` kontaktas. Visi atsakymai turi noindex / nofollow /
noarchive ir private / no-store; robots draudžia indeksavimą.

Build pagrindas PUBLIC `10f0efe555fabe54b0d7c83b02b36e1f973b14eb`. Jo Core
bundle nepakeistas. Native Vite build ir2 RSC manifestai /0 trūkstamų failų
PASS. Tikram Worker-first vykdymui prireikė kanoninio `/_next/static/` ASSETS
perdavimo: pirma publikacija grąžino CSS404 ir naršyklės patikra teisingai
nepraėjo. PUBLIC `6c1a9d50a465f443e2cf5887d69b3b3f086b25e3` pataiso bendrą
Worker ribą; standartinis `prepare-hosted-preview-runtime.mjs` pritaikė tą
patį helperį esamam nekintamam build, nekeisdamas paketo, admission ar
originalaus config. Adapterio bei visų įvesčių SHA išsaugoti
`runtime-adapter.json`. Tai nėra teiginys, kad pilnas Vite build buvo iš naujo
vykdytas po ribos pataisos. Vėlesni PUBLIC commit keičia tik SEO patikrą.

Faktinės galutinės patikros:

- 314 Core testų, TypeScript, scoped lint be klaidų; esamas anoniminio default
  export stiliaus perspėjimas užfiksuotas. Bandomasis deploy PASS.
- Tikras Cloudflare:26 puslapiai su vienu H1 / title / description / canonical;
  204 vaizdų tikslūs baitų SHA,237 vaizdų alias,50 `p` / `page_id` senų
  adresų ir25 slash peradresavimai su query išsaugojimu PASS.
- Bendras `tests/seo-core-smoke.mjs` tikrame HTTPS host:26 puslapiai,14
  realizuotų CSS / JS resursų, sitemap, llms, schema, favicon iš native
  projekcijos, svetimo host izoliacija ir404 PASS. V1 favicon / robots
  prielaidos išplėstos V2 sutarčiai, ne silpnintos: native ikonos307 taikinys
  turi sutapti su matomu metadata ir eligible media, preview robots – Disallow.
- Chrome:320 /390 /1024 /1440 px pagrindinio puslapio6 sekcijų geometrija,
  responsive vaizdų taikiniai, fonai ir jų attachment bei header elgesys
  sutapo su vietine8956 versija.32 accordion atvėrimai,3 mobilūs meniu,
  8 papildomi puslapių vaizdai, desktop hover/click bei mobile-width keyboard
  quick view / Escape ir2 tikros formos read-only būsenos PASS.16 ekrano
  vaizdų; desktop hero ir telefono darbuotojų fono vaizdai peržiūrėti.
- Noindex / no-store tikrinti HTML, vaizdams, alias ir klaidoms. Native HTML
  ir JSON POST gauna503, jokio sėkmės kvito; įvykių POST taip pat atmetamas.
- Nusiųsti287 statiniai resursai; vietinis289 failų manifestas apima ir
  Wrangler valdymo failus.13625 kitų nišų / nereikalingi failai nekeliami.

Įrodymai:
`D:/Core/output/signaturepads-migration-20261029/cloudflare-preview-20261031/`.
Išsaugoti pirminis CSS404 / unstyled palyginimas, browser failure1, papildomo
vietinio Vite serverio `Network connection lost` ir patikros prielaidų FAIL.
Browser failure2 kilo nepadarius originaliai reikalingo hover prieš quick
view; galutinis testas atlieka tikrą hover/click arba keyboard focus. Produktas
dėl šios prielaidos nebuvo keistas. Galutinis tikras Core SEO smoke vyko edge,
ne nepasileidusiame papildomame vietiniame serveryje. Savo Chrome procesų0.

Tikras SMTP / INBOX ir užklausų privatumo operatorius tebėra būsimo gyvo
paleidimo priklausomybės. Fiziniai telefonai, Safari / Firefox, tikras200%
browser zoom ir produkcijos našumo skaičiai šiame deploy nepatvirtinti.
Koordinacija issue303 /102; šaltinio perdavimas atskiras nuo main merge ir
kito PC adoption. Bendri upgrade: `cc4ba8c4-8141-4d57-8efe-944cf5db6cb7`
ir `f2d7b5ba-5b0f-48ff-a51e-9ac2367f08e2`.

Šaltinis perduotas per draft PR: [PUBLIC108](https://github.com/christianza1989/niche-public-core/pull/108)
ir [CORE318](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/318).
Main nesujungtas; tai atskira nuo veikiančios peržiūros ir nekeičia gyvo domeno.
