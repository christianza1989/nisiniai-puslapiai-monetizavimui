# Lineage2AI prijungimas prie bendro core

Patikrinta 2026-10-11 pagal savininko prašymą įvertinti prijungimą,
vėlesnį pilną svetainės perkūrimą, turinio planą ir publikavimą pagal datą
be cron. Šis rezultatas yra techninė specifikacija. Svetainės source,
runtime, studijos duomenys, hostingas ir DNS šiame darbe nekeisti.

## Sprendimas

Rekomenduoju išlaikyti vieną `Lineage2ai.com` aplikacijos repo ir prijungti
jį kaip atskirą verslo modulį prie bendros turinio sistemos. Core rengia
planą, juodraščius, mediją, peržiūras ir nekintamus patvirtintus leidimus.
Lineage2AI priima patikrintą leidimą, pateikia savo dizaino HTML ir naudoja
bendrą turinio matomumo filtrą. Šio pasirinkimo nereikia laikyti Vercel
hostingo migracija: hostingą galima spręsti atskirai, įrodžius suderinamumą.

Straipsnių atsidengimui pagal datą **naujos cron sistemos nereikia**.
Dabartinis Lineage2AI straipsnių modulis jau įgyvendina šį principą. Trūksta
bendro core adapterio ir parengtų būsimų leidimų. Tuo tarpu `/news` yra
atskiras statinis turinio modulis; jo datos dar nekontroliuoja matomumo.

## Ką patikrinau

| Dalis | Faktas ir jo riba |
|---|---|
| Core | Freshness gate PASS; `main` SHA `7af6b9641012a30c5f95eac38a66daeff8f8cb39`. |
| Public core | Companion gate PASS; SHA `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. |
| Lineage2AI | Privatus repo; patikrintas `main` SHA `d7d1311e72a6e47988041fca5eff87d1b1ad1fea`; Next.js 16.3.2 pagal package.json. |
| Aplikacija | Yra auth, žaidimo DB/gateway, Forge, mokėjimų, streaming ir launcher API source. Šiame darbe jų veikimas nebandytas. |
| Viešas turinys | Septyni anoniminiai GET grąžino HTTP 200: hub, registras, sitemap, llms, vienas Markdown, kontaktai ir naujienų feed. |
| Viešas registras | Šeši straipsniai, visi `en`; atsakyme nėra `sourceMarkdown` ir `revealAt`. Viešo snapshot generatedAt yra 2026-10-03, repo snapshot — 2026-10-07. Tikslus deployed commit nenustatytas. |
| Datos filtras | Esami Lineage2AI testai 2/2 PASS: prieš/po datos pasikeičia matomumas bei nuoroda ir vertimo alternatyva. Tai unit testai, ne gyvas būsimo straipsnio atsidengimo bandymas. |
| Bendras eksportas | Esami core external-content testai 3/3 PASS: tikslūs patvirtinti baitai ir SDK, datos ribos, netinkamos tapatybės bei pakeistų baitų atmetimas. Testo turinys priklauso ankstesnei nišai, ne naujam Lineage2AI leidimui. |
| Cron | GitHub workflow API grąžino 0 workflows. Scheduled-deploy YAML yra tik `topical_blog/integration/vercel/` istorinis šablonas; jo README aiškiai sako neįjungti esamai svetainei. Tai nėra visų Vercel paskyros nustatymų auditas. |

Source nuorodos: [Lineage2AI matomumo filtras](https://github.com/christianza1989/Lineage2ai.com/blob/d7d1311e72a6e47988041fca5eff87d1b1ad1fea/lib/topical-visibility.ts),
[request-time skaitymas](https://github.com/christianza1989/Lineage2ai.com/blob/d7d1311e72a6e47988041fca5eff87d1b1ad1fea/lib/topical-content.ts),
[publisher](https://github.com/christianza1989/Lineage2ai.com/blob/d7d1311e72a6e47988041fca5eff87d1b1ad1fea/topical_blog/tools/topical.mjs),
[viešas hub](https://lineage2ai.com/ai-research).

## Esamas publikavimas be cron

1. `topical_blog/tools/topical.mjs` build metu patikrina turinį, būseną,
   author ir editorial/media/release approvals. Į serverio runtime snapshot
   įtraukia ir patvirtintus būsimus straipsnius; jų vaizdus laiko už
   kontroliuojamo serverio media route.
2. `scheduledAt` tampa runtime `revealAt`. `getPublicTopicalArticles()`
   kiekvieną kartą lygina šią datą su `Date.now()`.
3. Catchall straipsnių route ir hub yra `force-dynamic`; sitemap bei LLM
   route naudoja tą patį viešų straipsnių sąrašą. Markdown ir media turi
   savo patikrą prieš grąžindami turinį. Būsimos straipsnių bei vertimų
   nuorodos išjungiamos iki jų datos.
4. Parengtą partiją reikia įdiegti **iki pirmos jos publikavimo datos**.
   Vėliau pirmas naujas serverio atsakymas po datos gali pateikti straipsnį
   be atskiro cron ar redeploy. Atidarytas naršyklės puslapis pats
   neatsinaujina; lankytojas gauna naują atsakymą per naują užklausą.

Source JSON/Markdown/LLM route turi trumpą CDN cache, kai kur `s-maxage=60`.
Gyvo GET antraštėse matėsi `max-age=0`, o hub — `no-store`; Vercel gali
atskirai valdyti edge cache. Tikslaus atsidengimo sekundės pažado nėra.
Prijungimo priėmimas turi tikrinti ir anksčiau užpildytą cache bei future
404. Prireikus HTML, sąrašams, discovery ir būsimiems 404 naudoti `no-store`
ar TTL, kuris nesiekia už artimiausios publikavimo datos.

**Datos filtras neparašo straipsnio.** Vien kalendoriaus eilutė nesukuria
teksto, vaizdo, peržiūros ar įdiegimo. Jau įdiegti patvirtinti tekstai gali
atsidengti išjungus vietinį kompiuterį, nes veikia hosted serveris. Naujo
turinio rengimui reikia agento ar atskiro generatoriaus proceso. Pastarasis
nėra būtinas užsakytam publikavimui iš anksto pagal datą.

## Bendro core ir projekto ribos

| Bendra sistema | Lineage2AI modulis |
|---|---|
| [CONTENT_CORE](../../CONTENT_CORE.md), studija ir revision-bound review/approval/release | Tikri žaidimo faktai, auditorija, originalūs straipsniai ir nišos dizainas |
| [MEDIA_CORE](../../MEDIA_CORE.md), WebP variantai ir medijos SDK | Teminiai vaizdai, kompozicija, teisės, alt ir actual vizualinė peržiūra |
| Patikrintas external bundle ir bendri validator/projection helperiai | Atominis bundle importeris, HTML komponentai, straipsnių/hub ir media routes |
| Tapatybės/host, exact revision ir `publishAt` vartai | Esami `/register`, `/login`, `/app`, `/download`, Forge ir launcher URL |
| [SEO_GEO_CORE](../../SEO_GEO_CORE.md) publikavimo sutartis | To paties matomo snapshot metadata, sitemap, autoriai, schema ir LLM adapteris |

Žaidimo accounts, MariaDB/gateway, serverio veiksmai, Forge vykdymas,
mokėjimai ir launcher išlieka šio produkto atsakomybė. Juos susieti tik per
konkrečias patikrintas sąsajas, jei vėlesnis pavedimas jas apims. Vien
svetainės perkūrimas nesuteikia leidimo perrašyti žaidimo balansų ar
aktyvinti kitų nišų pokalbių, SMTP, prekybos ir FB runtime.

Asmeninis `l2-client-studio` skill yra žaidimo `dist_battle` įrankių
valdymo pradžia; šiame web repo tokio control plane nėra. Turinio tiltą
valdo aktualios Git core sutartys. Gyviems gameplay teiginiams vėliau
reikės atskiros žaidimo source ir tikro veikimo patikros.

## Spragos, kurias reikia sutvarkyti įgyvendinant

1. **Anglų kalbos registracija.** `content-studio/src/model.mjs` `makeSite`
   įrašo `lt-LT`; `createSite` ir `editSite` šiuo metu nepalaiko locale
   nustatymo. Generatorius vadovaujasi site locale. Reikia mažo bendro
   locale API papildymo su validacija, tikslios per-site kalbos išsaugojimu
   ir testais. Nekoreguoti studijos JSON ranka ir neklaidinti generatoriaus
   vien anglišku briefu, paliekant lietuvišką metadata.
2. **Turinio formato suderinamumas.** Esami tekstai yra MDX su inline
   nuorodomis, sąrašais ir bent viena lentele. V1 netinka aklam jų
   supaprastinimui. Bendras V2 turi rich tekstą ir editorial snapshot,
   tačiau `generator.mjs` V2 plan/draft/autopilot aiškiai atmeta. Esamų
   šešių straipsnių perkėlimo pilotas turi patikrinti visus reikalingus
   blokus, autorius, šaltinius ir nuorodas; nepalaikomo formato nepašalinti.
   Jei vėlesnis pavedimas apims V2 automatinį rengimą, reikės atskirai
   priimto generatoriaus kontrakto. V1 naujiems paprastesniems tekstams
   galimas tik sąmoningai pasirinkus ir patikrinus jų formatą.
3. **Dar nėra core turinio tilto.** Repo neturi šio core bundle importerio
   ir bendros projekcijos vartotojo. Naudoti esamą
   `export-external-content.mjs`, trusted/pinned SDK, hash/host/siteId
   validaciją ir atominį importą. SDK hash iš nepatikimo upload pats savaime
   nepatvirtina kodo kilmės.
4. **Vienas autoritetas kiekvienam URL.** Migracijos žemėlapis susieja
   seną articleId/topicId/canonicalPath su nauju pageId. Legacy šeši
   straipsniai lieka tol, kol jų nauja peržiūrėta versija priimta.
   Importeris ir resolveris turi atmesti dubliuotus URL; migrated URL
   nebegali grįžti iš seno publisher vien pakeitus paieškos eiliškumą.
   Senų approvals, fingerprint ir datų neperrašyti kaip naujos review.
5. **Statinės naujienos.** `lib/news.ts` tik surikiuoja `publishedAt`;
   `/news/feed.json` ir RSS yra `force-static`, detail turi
   `generateStaticParams`. Jeigu ir naujienos turi atsidengti pagal datą,
   jų list/detail/feed/sitemap/LLM bei media prijungti prie to paties
   patikrinto request-time snapshot. Launcher feed formato suderinamumą
   išsaugoti ir testuoti.
6. **Kontaktų ir tapatybės tikslumas.** Viešame projekte yra
   `hello@lineage2ai.com`; core numatytasis kontaktas yra `info@pinet.lt`.
   Prieš leidimą dokumentuoti per-site pasirinkimą ir operatorių. Esamo
   viešo pašto įrašas nėra savininko patvirtinta MB Pinet išimtis ar inbox
   gavimo įrodymas. Telefono, teisinių rekvizitų ir žaidimo pajėgumo
   neperkelti iš kitų nišų.

## Įgyvendinimo eiga

1. **Prijungimo pilotas.** Naujo darbo pradžioje pakartoti freshness gate
   ir patikrinti visų trijų repo bei actual studijos ID/host kolizijas.
   Numatyti `siteId=lineage2ai`, canonical `lineage2ai.com`, anglų kalbą ir
   Europe/Vilnius publikavimo laiką. Sutvarkyti locale spragą, tada
   registruoti oficialiu modelio API. Parengti vieną izoliuotą peržiūrėtą
   straipsnį ir vieną aiškiai sintetinį būsimą QA straipsnį; fixture
   nepatenka į realų public leidimą.
2. **Target adapteris.** Patikrintas release → external bundle → atominis
   Lineage2AI importas → bendros projekcijos duomenys → savi HTML
   komponentai ir discovery/media routes. Nekopijuoti naujo publisher ar
   per-domain approval algoritmo. Pilotą priimti per vieno serverio
   prieš/po datos HTTP ir cache bandymą be rebuild/restart.
3. **Pilnas svetainės perkūrimas.** Atskirai užfiksuoti apimtį ir tikrus
   produkto faktus; atlikti builder/design tyrimą. Perkurti homepage,
   paaiškinamuosius puslapius, hub, straipsnio šabloną, autoriaus profilį,
   kontaktus ir teisinius tekstus pagal savitą Lineage2AI tapatybę.
   Išlaikyti veikiančių produkto funkcijų URL ir API kontraktus. Domeno
   istoriją, konsolidavimą ir redirect spręsti pagal semantinį inventorių.
   Tikrinti tikrą desktop/mobile, tipografiką ir taikomą A–Z auditą.
4. **Naujas turinio planas.** Tik po aktualaus pasiūlymo/auditorijos ir
   URL inventoriaus tyrimo taikyti planner bei SEO/GEO skills. Senas
   20/mėn. dokumentas yra pasiūlymas, ne patvirtintas ar įdiegtas turinys.
   Atskirti žaidėjų klausimus nuo kūrėjų architektūros ketinimų, patikrinti
   konkurentus/SERP ir turimus GSC duomenis. Nepildyti jau praleistų datų
   atgaline data. Dažnį pagrįsti naudingomis temomis ir rengimo pajėgumu.
5. **Parengimas ir paleidimas.** Parengti bei faktiškai peržiūrėti tekstus,
   šaltinius, ryšius ir vaizdus, patvirtinti partiją, sukurti nekintamą
   release ir įdiegti iki pirmos datos. Core ir target PR susieti su SHA,
   testais bei sujungimo eile. Hostingas, tikri kontaktai ir produkcinis
   pirmos publikavimo ribos stebėjimas turi atskirą įrodymą.

Eksporto sąsaja po parengto tikro leidimo:

```text
node content-studio/scripts/verify-content-release.mjs <release-directory>
node content-studio/scripts/export-external-content.mjs <release-directory> <new-bundle-directory> lineage2ai lineage2ai.com
```

Lineage2AI importo komandos dar nėra; ją turi įgyvendinti target adapteris.
Šios komandos nekuria teksto, nesuteikia approvals ir nedaro deployment.

## Prijungimo priėmimas

- [ ] Core locale, stable ID/host ir per-site kontaktai registruoti
  oficialiu API; esamų nišų ir istorinių snapshot reikšmės nepakeistos.
- [ ] Bundle pakeistų tekstų/medijos, netinkamo host/ID, nepalaikomos
  schemos, dubliuoto URL ir neteisingo SDK kilmės bandymai atmetami.
- [ ] Viena proceso instancija be rebuild/restart: prieš datą realus
  būsimo straipsnio HTML, Markdown ir media grąžina 404; hub, sitemap,
  schema, LLM, nuorodos ir prireikus feed jo nerodo. Po datos visi
  atitinkami paviršiai pateikia tą pačią patvirtintą reviziją.
- [ ] Tas pats bandymas užpildžius HTML/list/404/CDN cache; nustatyta
  leistina vėlinimo riba ir netinkamos arba DST datos atmetamos.
- [ ] Esami šeši URL, originalios datos, autorius, šaltiniai, rich blokai,
  responsive media ir launcher feed neprarasti; rollback į ankstesnį
  patikrintą snapshot išbandytas.
- [ ] Actual target instrukcijų reikalaujami validate/status/audit/link,
  topical testai, typecheck/build ir desktop/mobile patikra atlikti
  galutiniame source. Core pakeitimams taikomi jų prasmingi regresijos ir
  publikavimo/SEO checks.
- [ ] Atskirai užfiksuota: source merged, bundle imported, deployed,
  pirmoji hosted datos riba patikrinta, GSC/organinis srautas ir tikri
  produkto rezultatai. Vien ankstesni unit PASS nėra šių vartų priėmimas.

Šio vertinimo Git koordinavimas: [issue93](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/93).
Toliau naudojamas aktualus [integravimo startas](../../docs/INTEGRATING_A_PROJECT.md),
o ne šio momento instrukcijų kopija. Šis dokumentas neįregistruoja domeno,
neįjungia generatoriaus ir nėra atlikto pilno perkūrimo deklaracija.
