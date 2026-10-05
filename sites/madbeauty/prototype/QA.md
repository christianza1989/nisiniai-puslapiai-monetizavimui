# UI foundation QA — faktinė apimtis

2026-10-05. Vertintojas root, sequential, ne nepriklausomas auditas. Tai privataus UI rinkinio ir demo-data pagrindo priėmimas, ne 70 ekranų platformos A–Z, Lighthouse, backend-ready ar launch-ready.

## Patikros

`node --test sites/madbeauty/prototype/foundation.test.mjs`: **9/9 PASS**. Tikri testai: production demo draudimas ir off empty; real transport failure be mock fallback; reproducible fixture/tenant ryšiai ir fictional contacts; approved/city/service public projection ir private scope; stale/missing/empty skirtis; whole-visit + addon intervalas; Vilnius DST gap/ambiguity; 11 media/55 WebP SHA; noindex/GET-only serverio private-file ribos.

Naršyklės actual peržiūra per CUA: desktop 1280×720, mobile 390×844. Pirmas mobile body 531px FAIL; pataisytas grid child min-width, galutinis body 375px <=390, wideContainers=0. Taisytas img height/aspect-ratio konfliktas: card 335×223.33px, gallery 160.5×107px, teisingas 3/2. Ši papildoma tikslinė peržiūra buvo būtina įrodytam crop trūkumui, ne estetinis reroll. Favorite būsena sinchronizuota visoms to paties demo Practitioner kortelėms.

Actual public kortelių WebP: desktop 374px plotis →640 variantas; mobile 335px →360 variantas. Visi 11 gallery vaizdų po scroll loaded, broken loaded images 0. Vienas gallery neutral image buvo reuse iš naršyklės 1536px cache; kiti 10 mobile 360px. Nežadame visada mažiausio failo po jau lankytų breakpoint/cache/screenshot operacijų. Actual `sizes` pagal CSS ir visi šeimos failai patikrinti. Individualūs originalai peržiūrėti; ne tik promptai.

UI veiksmai PASS: Vilnius+gelinis-lakavimas grąžino 3 tinkamus variants; demo off →0 cards/0 times/no demo bookings; stale →visi rodomi stale; empty scenarijus patikrintas adapterio testu; tuščio vardo validation parodė klaidą ir sutelkė focus; dialog Escape uždarė ir grąžino focus į `open-example`; clock +7 pakeitė datą2026-10-05→2026-10-12, day rail ir appointments kartu. Tai valdikliai, ne realūs laisvi laikai ar serverio autorizacija.

Savų fontų naršyklės status loaded, computed display DM Serif. Actual coral button foreground rgb(24,33,29), background rgb(244,102,74); spalvų kontrastai [VERIFY](../../../research/madbeauty-fresha-2026-10-05/VERIFY.json). SVG wordmark ir 26 icons loaded; CSS focus-visible/reduced-motion ir disabled/loading/error/empty/selected būsenos yra bazėje. Physical-device, screen reader, 200% browser zoom ir visos būsimos formos dar UNVERIFIED.

Static impeccable own public source scan su `--no-config --json`: **[]**. Atskirai saugomas [tikras output](../../../research/madbeauty-fresha-2026-10-05/IMPECCABLE_STATIC.json). Naudotas failų scan, ne kitu mechanizmu valdoma naršyklė. Globalios kitos nišos DESIGN ir ignore nepaveldėti. Tai heuristika, ne gero dizaino, konversijų ar Lighthouse balo įrodymas. Po crop pataisos pakartotas static scan dėl pakitusio CSS.

## Įrodymai ir ribos

Desktop/mobile/default-off kadrų SHA bei kitų current-turn failų fingerprint: [MANIFEST](../../../research/madbeauty-fresha-2026-10-05/MANIFEST.json). Galutinis desktop katalogo kadras `madbeauty-kit-catalog-desktop.jpg`; visas kit `madbeauty-kit-desktop.jpg`, mobile `madbeauty-kit-mobile.jpg`, off `madbeauty-demo-off.jpg`. Ankstesni 3 raster konceptai nepakeisti. Fresha privataus account full screenshots/klientų duomenys į savo failus nekopijuoti.

**NOT_IMPLEMENTED / NOT_RUN:** pilni booking/inquiry/contact delivery/account/onboarding/day-week-calendar/map/approvals/guides ir 70 screen flow; auth/tenancy/atomic holds/recovery; tikras SEO renderer/package/sitemap/schema/public publishing; production build seed exclusion; GSC/field CWV/native app; Lighthouse visai platformai; paklausa ir ekonomika. Devynios foundation patikros neperduoda PASS šiems vartams. Atskirų katalogų performance/load prieš užbaigimą bus matuojami, viešas public core nekeičiama pagal šį kit.

Medija: 11 originalių ImageGen master, 55 responsive WebP, private provenance. Vienas pradinis masažo vaizdo generavimas atmestas; paruošta kita, peržiūrėta erdvės iliustracija. Vieno workspace paralelaus rezultato nebuvo galima priimti po batch klaidos; pasirinktas vėliau sėkmingai sugeneruotas originalas. Galutiniai originalai ir promptai manifeste; nenaudojame neprieinamų ar nepamatytų rezultatų kaip įrodymų.


2026-10-05 naujos juoda/balta/violetinė krypties QA yra atskiras research/madbeauty-modern-2026-10-05/ registras. Ankstesni spalvų kontrastai ir Fresha manifesto hash aprašo ankstesnę versiją, nėra naujos versijos įrodymai. Actual node syntax/desktop/mobile/header direction PASS; pilna keyboard/zoom/Lighthouse patikra vis dar nepriskiriama.
