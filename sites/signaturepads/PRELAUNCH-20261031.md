# Signaturepads — pasiruošimas prieš domeno perjungimą, 2026-10-31

Tai pirminio325testų / d6ac644e etapo istorinis rezultatas. Dabartinis source,
328testų, saugumo atnaujinimų,200% zoom ir Worker2a867b0c rezultatas pateiktas
[galutinėje techninėje ataskaitoje](DEPENDENCY-HARDENING-20261031.md).
Toliau esantys pirminiai matavimai ir tuometinės ribos neperrašyti.

## Rezultatas ir leidimo riba

Techninis paruošimas bei žemiau nurodytos peržiūros patikros atliktos.
Tai nėra leidimas keisti DNS, paleisti naują versiją signaturepads.lt ar žyma
„visas Core / phase-one auditas praėjo“. Privatumo faktai ir tikro mastelio /
fizinių įrenginių patikros lieka atviros. WordPress atsarginė kopija **nedaryta**
pagal tiesioginę savininko išimtį (5 punktas).

Peržiūra: https://signaturepads-preview.pinet-azprekyba.workers.dev/

- Worker: signaturepads-preview; aktyvi versija **d6ac644e-aada-4d00-9fb9-a17361768fb3**.
- Public programos source: f2344dfc9d03cb95b9a3e3c727e1f86ed7a977a8.
- Izoliuoto build checkout: a1f1caaf160129b0a4bf8cdccd5da65f014478f7;
  abiejų tikslus tracked Git tree 739e27e257613ecb7d05a9a9cf245a18877f5294.
- Private bazė: fae50645f197258dafb6e307e2dd09202e2cffb5.
- Fetched main: private25292e20219b735df7f04c5807dd4c100f98addc;
  publicc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Freshness kartojamas perdavimui.
- Native paketas **94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25**
  neperrašytas:26puslapiai,19produktų,3kategorijos,204WebP,237senų media alias.
- Build ir patikrų artefaktai: D:\Core\output\signaturepads-migration-20261029\prelaunch-20261031/. Ankstesnis35a13d2b build išsaugotas
  artifact-35a13d2b/ su tiksliais įkeltais289client failais ir serveriu.
- Source perduodamas savo draft PR108(public) /318(private), ne main merge.

## Kas pataisyta ir paruošta

1. Iš tikro originalo išsaugota viena Google svetainės patvirtinimo meta žyma,
   pririšta prie siteId ir tikro canonicalHost. Naujų sekimo skriptų nepridėta.
2. Hero nuotrauka ir pirmas naudojamas Open Sans failas aptinkami iš head.
   Nuotraukos hint remiasi ta pačia eligible media šeima kaip rodoma nuotrauka.
   Pirmasis35a13d2b bandymas klaidingai lygino assetID su familyID; to neslėpiame:
   84balų / trūkstamo background hint matavimas išsaugotas final-*.json. f2344dfc
   pataisa turi tikro RootLayout SSR regresiją ir actual HTTP head patikrą.
   Favicon lieka explicit assetID, jo negalima pakeisti family pasirinkimu.
3. Katalogo produkto antraštės H2 po H1; susiję produktai H3 po jų H2.
   CSS ir quick-view title selector palaiko abi prasmingas vietas, vaizdas išliko.
4. Paruoštas atskiras production build profilis. Jis nepriima hosted/testOnly
   kvito vietoje production admission ir nenaudoja kito projekto bindingų.
   Bendras formos origin/resource/rate guard naudojamas peržiūroje ir įjungiamas
   tik konkrečiai produkcinei svetainei; kitų konfigūracijų elgesys nepakeistas.
5. Sukurta tuščia EU D1 signaturepads-inquiries
   (fd8c2676-123d-4cdc-8574-33edd2d98b2d), įkelta canonical schema, **0įrašų**.
   Ji dar nepririšta prie jokio Worker. Preview lieka savo atskiroje DB.
6. Išsaugota14esamų DNS įrašų struktūra ir paruoštas importas bei perjungimo
   planas: apexA **ir AAAA**, www; atskirai saugomi GoogleMX,SPF,DKIM,DMARC bei
   kiti verifikacijos ir pašto įrašai. Importas **nepritaikytas**, NS nepakeisti.
7. [Privatumo faktų brief](PRIVACY-FACTS-20261031.md) rašytojui ir
   [production eiga](PRODUCTION-PREPARATION.md) paruošti. Juridinis valdytojas
   ir nevirtusių užsakymu užklausų saugojimo laikas neišgalvoti.

## Atliktos patikros

-325/325 Core testų; TypeScript PASS; scoped lint0klaidų,2ankstesni
  no-css-tags perspėjimai dėl tyčia išsaugotų stiliaus nuorodų.
- Pilnas framework build ir RSC manifestai PASS; Wrangler binding tipai bei
  dry-run PASS. Parinkti289assets;13625kitų tenantų build failai neįkelti.
  Tikras pašto API raktas nerastas build failuose; preview secret vardas išliko.
-26URL,204WebP tikslūs SHA,237media alias,50senų p/page_id query,
 25slash peradresavimai PASS. Dabartinio WordPress sitemap29adresai:
 27atsakymai200 (vienas pakartotinis URL) ir2sąmoningi410 — sample-page ir
 senas ozono puslapis. Nepriskirtų seno dabartinio sitemap URL nėra.
- SEO smoke:26puslapiai,14renderintųCSS/JS,meta/canonical,JSON-LD,
 robots,sitemap,llms,404 ir host isolation PASS. Tikros domeno patikros po
 perjungimo dar neatliktos. Istorinio GSC API duomenys neprieinami (expired /
 invalid prisijungimas); nepretenduojama aprėpti visų kada nors lankytų URL.
- Chrome ir Playwright WebKit:320,390,768,1024,1440px,10scenarijų PASS,
 nėra horizontalaus overflow ar pageerror. Išsaugoti hero ir dviejų darbuotojų
 fonai:desktopfixed,mobile/tablet≤1024scroll. Žiūrėti viewport scroll vaizdus:
 viso puslapio nuotrauka gali nerodyti už viewport esančio fixed fono.
- Native formos trūkstamo sutikimo ir telefono pasirinkimo validacija,
 quick-view keyboard/Escape, mobilus meniu, reduced-motion turinio matomumas
 patikrinti. Visuose browser bandymuose0POST ir0užklausų laiškų.
- Blogas/trūkstamasOrigin403,tuščia/nesutikta forma400,honeypot200nesaugant,
 neleistiniPOST503. Tik tuščios užklausos parodė429suRetry-After60.
 Cloudflare limit yra apytikris per edge; tai nėra globali10laiškų/min kvota.
- Nė vieno naujo lead:preview DB vis dar1ankstesnis pažymėtas testas/notified1;
 production DB0. Saugumo patikros nesiunčia tikrų papildomų el. laiškų.
- Ankstesnį pažymėtą104777af testą savininkas patvirtino gavęs. Tęsiamas tas
 pats HostingerAPI transportas, sender ir recipient; ankstesnė idempotency
 patikra200replay/409conflict bei Sent kopija išsaugoti. Gavėjo raw headers /
 aplankas neinspektuoti. API neleidžia customReplyTo:kliento adresas laiško
 tekste, atsakant jį reikia pasirinkti. Tai nėra SMTP transporto patvirtinimas.
-10viewports inventorius:0cookies,0local/sessionStorage ir0foreignrequests.
 Tai patikrintų įprastų sesijų rezultatas, ne absoliutus visų CF apsaugos
 būsenų pažadas. GA/GTM/reklamos pikseliai neįjungti.

## Lighthouse13.6.0 — tas pats įkeltas production build, preview režimas

| Puslapis | Režimas | Greitis/100 | Prieinamumas/100 | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|
| / | mobile | 90 | 100 | 3.49 s | 0.0000 | 22 ms |
| / | desktop | 100 | 100 | 0.65 s | 0.0001 | 0 ms |
| /iranga/programine-iranga/ | mobile | 95 | 100 | 2.96 s | 0.0262 | 31 ms |
| /iranga/programine-iranga/ | desktop | 100 | 100 | 0.61 s | 0.0001 | 0 ms |
| /musu-slapuku-politika/ | mobile | 100 | 100 | 0.83 s | 0.0023 | 13 ms |
| /musu-slapuku-politika/ | desktop | 100 | 100 | 0.24 s | 0.0009 | 0 ms |

Pradinis homepage mobile86,LCP3.52s,CLS0.0071,TBT189ms. Dabartinis mobile90,
LCP3.49s,CLS0,TBT22ms. Pagrindinis pagerėjimas — ankstyvas resource aptikimas
ir mažesnis blokavimas; LCP dar nesiekia2.5s gero field CWV slenksčio.
Tai Windows Chrome laboratorija su Lighthouse numatytu mobile throttling,
ne tikras telefonas, ne realių lankytojų CrUX ir ne garantija būsimo domeno balui.
Unused frameworkJS išlieka matavimo pastaba, jo nenaikinome nepagrįstai.
Preview SEO69siejamas su tyčiniu noindex; dėl balo jo neišjungėme.
Automatinis a11y100nėra WCAG atitikties patvirtinimas.

## Kas iš tiesų lieka iki galutinio paleidimo

- Faktinis juridinis valdytojas, kodas/adresas/privatumo kontaktas ir tikras
  nevirtusių užsakymu formų, D1 bei pašto kopijų saugojimo procesas. Senas
  prekybos/slapukų tekstas tebėra netikslus. Pagal savininko START2.4 viešą
  naują prozą rašo paskirtas rašytojas; Codex pateikia faktus, ne išgalvoja juos.
- Tikslios naujos privatumo revizijos writer/review/owner approval, naujo
  paketo hash import/compile ir aktualūs13production admission įrodymai.
  Čia nėra tokio kvito ar aktyvavimo. Visi85platesnio audito kriterijai su
  FAIL/UNVERIFIED/NA matomi [audite](PHASE-1-AUDIT.md), nepaslėpti po balu.
- Tikro200% naršyklės mastelio testą blokavo Windows native capture/input
  klaidos; viewport/DPR jo neatstoja. Fizinio iPhone/Android ir tikro macOS
  Safari netestuota. WebKit yra atskiras emuliuotas bandymas Windows aplinkoje.
- Atskiras savininko domeno perjungimo pavedimas. Tik tada vykdoma DNS/TLS,
  Worker signaturepads-site aktivacija su secret tame pačiame deploy, realaus
  domeno URL/formos/indexavimo/GSC patikra bei ankstesnės krypties atstatymo eiga.
  Būsimo Worker secret dar neįdiegtas, nes pats Worker nepaleistas. Esamas
  preview LEAD_HOSTINGER_API_KEY išliko; slaptažodžiai ir API rakto vertės Git nėra.

## Gyva svetainė nepakeista

Pabaigoje originalo HTML SHA toks pats kaip pradžioje:
64d1cd11dabaa2760072305f57667cd7903d8df2ea4183d7bc475a4a116ae0cd. NS ns1/ns2.dns-parking.com,
A194.59.166.37,AAAA2a02:4780:9:1481:0:2019:5ffb:8,GoogleMX išliko.
Žiūrėti incumbent-before/after.json ir DNS planą artefaktų kataloge.
Nė vienos WordPress/NS/DNS/publikavimo į signaturepads.lt mutacijos nebuvo.
