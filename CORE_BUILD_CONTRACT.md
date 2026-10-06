# Vieno sakinio užduoties vykdymo sutartis

2026-09-30. Nauja Codex sesija šiame projekte gauna domeną, perskaito `AGENTS.md` ir `START_HERE.md` bei autonomiškai įgyvendina vietinę pirmą fazę. Šis failas yra trumpas patikrintų realizacijų indeksas; jis nepakeičia skills ir A–Z įrodymų. Bendras core neįpareigoja kopijuoti traktorių kompozicijos, spalvų, tekstų ar vaizdų.

## Kas jau veikia ir kur

| Poreikis | Realizacija | Naujo agento veiksmas |
|---|---|---|
| Vieno domeno viešos revizijos | Viešo core `lib/niche-sites.ts`, `lib/niche-links.mjs` | Į rendererį perduoti route paruoštus `pkg/page/livePages`; nefiltruoti antrą kartą savais kriterijais |
| Host, data, hash, atšaukimas ir tikslo diegimas | Tas pats public projection, nišų route/proxy | Nežinomas domenas/privatus URL negauna kitos nišos turinio |
| SEO/schema/sitemap/robots/LLM | `lib/niche-seo.ts`, `lib/niche-schema-core.mjs`, esami route | Nekurti atskiro SEO variklio kiekvienai nišai; schema turi sutapti su matomais faktais |
| Matomas gido autorius/datos | `components/niche/article-meta.tsx` `ArticleMeta({pkg,page,pages,className?})` | Tikras organizacijos profilis `/redakcija`; ne fiktyvus ekspertas |
| Matomas breadcrumb | `nicheBreadcrumbs(pkg,page,livePages)` | Rodyti tą patį kelią kaip schema, su realiu `/gidai` hub |
| Prozos nuorodos | `components/niche/linked-text.tsx` | Naudoti patvirtintus page link/externalLinks ir matomą kontekstą; ne all-to-all kvotą |
| Automatinė medija | Studijos `saveResponsiveAsset` / `scripts/import-image.mjs`, `MEDIA_CORE.md` | Tikras source → WebP šeima → vienas pasirinkimas → patvirtinta revizija; be domeno resize skripto |
| Vaizdo dydžio pasirinkimas | Core `lib/niche-media.mjs` `imageSrcSet(page.media,asset)` | `sizes` pagal realų CSS, width/height/alt, atidarymui eager/high, vėliau lazy |
| Kontaktai/operatorius | Core `config/niche-network.json`, `lib/niche-network.ts`, `MAIL_CORE.md` | Numatytai MB Pinet / info@pinet.lt; telefonų/adresų nekopijuoti |
| Formos patvarumas/pristatymas | Core `/uzklausa` alias ir `app/niche/[siteId]/lead/route.ts` | Perskaityti realią payload sutartį. Esami rendereriai turi savo native formos markup; atskiro bendro `lead-form.tsx` komponento šiuo metu nėra |
| Domenu atskirti skaitikliai | `InterestTracking`, `/ivykius`, D1 aggregate | Peržiūra/paspaudimas nėra unikalus lankytojas ar gautas laiškas/skambutis |
| Savitas dizainas | `components/niche/<siteId>-site.tsx` ir CSS module | Prijungti mažą dynamic import šaką, išsaugant kitų sesijų šakas ir voice sutartį |
| Pilnas priėmimas | Projekto `SKILLS/niche-site-audit/` | Naujas UNVERIFIED scaffold, per-site įrodymai, shared scorer |

Šių realizacijų keliai patikrinti faktiniuose failuose 2026-09-30. Viešas repo: `C:/Users/lenovo/Documents/dovanos-memorycasting`; studija/instrukcijos: šis projektas. API planavimo dokumentas nelaikomas veikiančia realizacija. Naujos nišos balso nejungia; dabartinis runtime widget tik traktorių nišai ir tik su `VOICE_WIDGET_ENABLED=1`. Būsimo plano `voice.enabled=false` nėra dabartinės turinio paketo schemos laukas. Balso kūrimas neįtraukiamas į trumpą svetainės užduotį.

## Privalomas rezultatas iš pirmos užduoties

- Prieš dizainą ir turinį parengtas `sites/<siteId>/BUSINESS.md` pagal [komercinės krypties patikrą](SKILLS/niche-site-builder/references/business-validation.md): konkretus klientas/mokamas rezultatas, pajamų mechanizmo hipotezė, rinkos šaltiniai ir sąžiningas pirmos fazės poreikio užklausos testas. Senas kalendorius nėra sprendimas dėl verslo, redakcinis interesas nėra prekybos/paslaugos paklausa; neišgalvoti vykdymo galimybių. Gidai, dizainas ir matavimas turi palaikyti pasirinktą kryptį.

- Savitas pilnas homepage ir naudingas skaitytojo kelias, ne vien hero demonstracija.
- Prieš vaizdų generavimą parengtas brand/sekcijų/asetų planas ir tikrų artimiausių tinklo dizainų palyginimas pagal [design-diversity](SKILLS/niche-site-builder/references/design-diversity.md). Sąmoningai įvertintas klientui naudingas mažas įrankis; jei pasirinktas, veikia su patikrintomis taisyklėmis ir aiškiomis ribomis. Bendras techninis core nenustato visų nišų kompozicijos ar fotografijos stiliaus.
- Viešam pilotui skirtas hub, bent trys atskiri naudingų klausimų gidai su tikrais teminiais vaizdais, kontaktai/privatumas, projekto paaiškinimas, redakcinis profilis ir informacinės naudojimo sąlygos. Papildomi poreikio/DUK puslapiai tik pagal nišą.
- Atskiras ketinimų, šaltinių, vaizdų ir sezoninio būsimo turinio planas. Būsimos nepatikrintos publikacijos lieka privačios; kalendorius neapsimeta deployment.
- Pirmos fazės užklausa ir domeno matavimas per esamą backend. Jokios netikros parduotuvės, likučių, tiekėjų, atliktų projektų ar ekspertų.
- Savas faktų/research/history/DESIGN/media žurnalas, visas 85 kriterijų auditas, realios ekrano nuotraukos ir produkcinio build laboratorinis Lighthouse. Didinimo įrodymas atskiras nuo viewport/100 a11y balo.
- Veikianti vietinė peržiūra su aiškiai išjungtais realiais bindingais `LEAD_SMTP_ENABLED=0` ir `VOICE_WIDGET_ENABLED=0`. Patikrinti aktualų `voiceWidgetEnabled` kodą; neįrašyti neegzistuojančio per-nišos voice lauko į paketo JSON ir nelaikyti vien sugalvoto env pavadinimo modulio išjungimo įrodymu.

Paleidimo komandą ir bindingų pavadinimus tikrinti aktualiame package/runtime. Neskaityti ir nekopijuoti prisijungimų TXT į paketus, GUI, promtus ar viešą dokumentaciją. Testiniai kontaktai/užklausos lieka izoliuoti; neištrinti realių duomenų. Build/import langai ir procesai derinami per `WORKSTREAMS.md`.

## Turinio priėmimas privalomas kiekvienai naujai svetainei

Taikyti [CONTENT_CORE.md](CONTENT_CORE.md) nuo pirmo paketo, nepriklausomai nuo domeno ar dizaino. Iki vietinio užbaigimo agentas parengia `sites/<siteId>/CONTENT_READINESS.md` su PASS/FAIL/UNVERIFIED ir tikrais įrodymais:

- [ ] Tas pats stabilus siteId studijoje, pakete ir viešame maršrute; įjungta contentPolicy / contentWorkflowVersion=1 ir nišai pagrįstas sezoninis planas.
- [ ] Veikia paketo priėmimas / importas ir gidų indeksas bei straipsnio maketas su vaizdais, atribucija, datomis, šaltiniais ir tikrais nišos CTA. Turinio tekstai ar publikavimo datos nėra nukopijuoti į rendererio hardcode.
- [ ] Privatus juodraštis atsidaro studijos peržiūroje, bet nerodomas viešame URL, meniu, sitemap, schemose ar LLM išvestyse.
- [ ] Savo izoliuotoje peržiūroje faktiniais HTTP bandymais patikrintas jau įdiegtos patvirtintos būsimos revizijos ir jos paruoštų nuorodų elgesys prieš / po publishAt. Nekurti antro schedulerio ar publikavimo predikato; nelaikyti kalendoriaus įrašo šio bandymo įrodymu.
- [ ] Peržiūra, vidiniai / išoriniai / tarpdomeniniai ryšiai ir WebP šeimos naudoja bendrus vartus. Neveikiančio katalogo/filtro nuorodos nepublikuojamos; jei reikia adapterio, tikri registruoti tikslai ir jų eligibility patikrinti.
- [ ] Release patikrintas bendru verify-content-release CLI; įrašyti package SHA, source versija ir lokalaus importo / HTTP įrodymai. Privatus review manifest nepatenka į viešą svetainę.

Trūkstant šio kelio svetainė dar nėra vietiškai užbaigta. Tikras production deployment, DNS, indeksavimas ir paklausa lieka atskiri vartai. Pusmečio plano paruošimas nereiškia, kad visi jo būsimi tekstai jau sugeneruoti, peržiūrėti ar vieši; faktinį parengtų juodraščių / release kiekį įrašyti aiškiai. A–Z auditui šiuos įrodymus priskirti jo taikomiems publikavimo, URL, ryšių ir turinio kriterijams, neperrašant istorinių auditų.

## Kokybės kartelė

Tikslas — visi taikomi **local** kriterijai PASS, o vizualinis sprendimas įvertintas atskirai. Local 10/10 nėra tikro paleidimo, teisinės atitikties, pasaulinio dizaino reitingo ar paklausos pažadas. Tikros produkcinės/DNS/operatoriaus/privatumo ir paklausos spragos lieka launch/operations stulpeliuose. Neaiški didinimo patikra negali virsti PASS vien dėl nurodyto tikslo.

Audito komandos iš projekto root:

```powershell
node SKILLS/niche-site-audit/scripts/init-audit.mjs <siteId> <domain>
node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/<siteId>/PHASE-1-AUDIT.json
```

Nenaudoti `sites/traktoriupadangos/write-audit-2026-09-30.mjs` kitai nišai: tai to konkretaus audito snapshot, ne bendras PASS generatorius. Paketo fields/schemaVersion tie patys; medijos riba dabar suderinta iki 60 variantų, o senų patvirtintų failų ID/pikseliai neperrašomi.

Nuorodos: [pradžia](START_HERE.md), [media](MEDIA_CORE.md), [SEO/GEO](SEO_GEO_CORE.md), [paštas](MAIL_CORE.md), [nuorodų tinklas](NETWORK_LINKING.md), [cold-start bandymas](AUTONOMY_BENCHMARK.md).
