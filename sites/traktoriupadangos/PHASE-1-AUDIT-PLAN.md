# Pirmos fazės etalono priėmimo planas

2026-09-30. Savininkas autorizavo pilną auditą ir patvirtintų spragų taisymą. Dabartinis dizainas yra kandidatas, ne 10/10 ar viešam domenui jau paruošto etalono įrodymas.

1. Inventorizuoti visus 8 dabartinius URL, 3 gidų turinį, archyvo sprendimus, peržiūrėtą paketą ir schemas. A–Z kriterijai: `SKILLS/niche-site-audit/references/checklist.md`.
2. Užfiksuoti baseline spragas prieš kodą: trūksta matomo autoriaus/profilio ir redakcinės metodikos, gidai trumpi, 3 žingsnių matomi breadcrumbs turi 2 žingsnių schema, data matoma kaip review bet schema kaip publish, privatumas yra techninis aprašymas, mobilus LH performance 88.
3. Patikrinti pirmines Google/schema/AI ir privatumo gaires, gamintojų teiginius. Išplėsti 3 gidus pagal jų skirtingus klausimus; nekaupti teksto dėl žodžių skaičiaus.
4. Pridėti tikrą MB Pinet organizacijos autoriaus profilį, projekto/metodikos informaciją ir informacinio naudojimo sąlygas; pataisyti poraštę, datas ir bendrą schema/breadcrumb autoritetą. Nepridėti netikrų žmonių ar e-parduotuvės grąžinimo sąlygų.
5. Patikrinti prozos ir panelių internal/external nuorodas, viešinimo/host/time/hash/medijos izoliaciją, robots/sitemap/LLM/404 ir realius įrašų maketus. Archyvo atidėti URL nėra automatiškai trūkstami vieši puslapiai.
6. Išmatuoti naują production paketą izoliuotai nuo balso sesijos ir esamo 8787 dist. Core/SEO regresijos visoms nišoms, desktop/mobile, formos ir actual Lighthouse; taisyti konkrečius nustatytus trūkumus.
7. Pateikti evidence-backed A–Z JSON/Markdown rezultatą su atskiromis local/launch/operations būsenomis. Tikrus operatoriaus, duomenų politikos, production saugyklos/delivery/DNS/GSC faktus laikyti neįrodytais, kol yra įrodymas. Dokumentuoti core ir skills pamokas, peržiūros URL, likusius vartus.

Tai vienas priėmimo ir taisymų ciklas, ne nesibaigiantis poliravimas. Papildomas taisymas reikalingas tik dėl konkretaus likusio trūkumo. Balso runtime šiame audite netaisomas ir neįjungiamas.

Vėlesnė savininko pastaba išplėtė vaizdų priėmimą: visiems 3 pradiniams gidams paruošti teminiai vaizdai, homepage papildomi vizualai, indeksui teisingos miniatiūros; pašalintas ImageGen badge. Dabartinis inventorius 11 puslapių. Sukurtos 4 naujos kompozicijos, 1200/800/640/360 variantai; vidurinio dydžio trūkumas nustatytas realiu gido Lighthouse ir pataisytas. Šeši tekstiniai URL turi dokumentuotą išimtį. Galutiniai 85 kriterijų rezultatai: [PHASE-1-AUDIT.md](PHASE-1-AUDIT.md), JSON ir scorer.
