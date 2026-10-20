---
version: 1
slug: "inner-density"
primary_target: "src/app/site-theme.css"
related_targets: ["src/components/catalog-page.tsx","src/components/product-card.tsx","src/app/kolekcijos/page.tsx","src/app/typography.css"]
---

# Vidinių puslapių tankis

## Authority

Savininko 2026-10-13 patikslinimas sumažina visų vidinių puslapių informacijos, tarpų ir valdiklių vizualinį mastą bei kataloge desktop nustato penkis produktus eilėje. Homepage lieka patvirtintos kompozicijos autoritetas. Tai esamos [site-style.md](site-style.md) sistemos patikslinimas; vienodas [shared-header.md](shared-header.md) headeris, footer, root default tokenai ir homepage vietiniai vaidmenys išlaiko savo geometriją.

## Direction contract

2026-10-13 savininko katalogo prioritetas: teminės sidebar navigacijos pirmoje vietoje „Ergonominės kėdės“. Bendras `/produktai/` pagal numatytąją tvarką pirmiausia rodo registro ergonominių kėdžių modelius, kiekvienoje prioriteto grupėje A–Z; bendras modelių skaičius ir 20 modelių puslapiavimas išlieka. Rikiavimo lauke numatytasis pasirinkimas „Ergonominės kėdės“, A–Z / Z–A / naujumo pasirinkimai vykdomi atskirai. Vidiniai kategorijų puslapiai išlaiko savo numatytąjį A–Z, pasirinkus naują prioritetą naudojamas tas pats ergonominių kėdžių registras. Nedaryti paslėptos atrankos ar pakeitimų homepage.

2026-10-13 savininko gamintojų privatumo pakeitimas: katalogo filtrai turi paiešką, tris select (tipas, linija, rikiavimas) ir veiksmą — penki desktop stulpeliai. Paieška minmax(180px,1.4fr), trys minmax(0,1fr), veiksmas auto. Žemiau pateiktas ankstesnis keturių select / šešių stulpelių aprašas yra pakeistas šiuo patikslinimu. Gamintojo filtro ir brand eilučių lankytojams nėra; produktų bei opcijų kodai išlieka. Baldų grupėms vartojama „linija“: filtro prieinamas pavadinimas „Produktų linija“, numatytasis pasirinkimas „Visos linijos“. Esamas `seima` GET parametras ir linijų ID išlieka, kad veiktų išsaugoti filtravimo adresai.

MODE: Operate katalogui, produktams, užklausai ir administravimo prisijungimui; Read gidams, privatumo ir SEO straipsniams.

THESIS: daugiau tikrų modelių ir reikalingo turinio viename vaizde, aiškus teksto vaidmenų skirtumas ir patogus telefono įvedimas.

FORM: site-theme.css vidiniai pakeitimai taikomi main.site-content, kuriame nėra .approved-home. Inner max 1640px, gutter clamp(20px,4vw,64px), ≤650px 20px; produkto puslapio max 1440px. Sekcijos clamp(28px,3vw,44px), puslapio intro/heading bottom 28px, section-heading 20px. Default/home/header/footer tokenai ir esami sidecar preview komponentai nėra šio tankio prievartinis pakaitalas.

TYPE: Manrope, tiksli dabartinė inner-* lentelė DESIGN.md. Kūnas .9375rem/400/1.6, skaitymas 1rem/400/1.65/68ch, pagalbinis .8125rem/400/1.6, veiksmų tekstas .9rem/600/1.5. Page H1 clamp(1.75rem,2.7vw,2.375rem)/650/1.16/-.025em; skyrius clamp(1.375rem,2vw,1.75rem)/650/1.2. Produkto H1 clamp(26px,2.5vw,34px)/650/1.16, kortelė 16px/650/1.35, kolekcija 16px/650/1.3, gidai 19px/650/1.35, kontaktų H2 19px/650/1.2. Kontaktų nuoroda 22px/400/1.5, ≤650px 20px. Kortelių metadata ir kategorijų nuorodos 13px/1.5; breadcrumbs 13px/1.6. 13px ir 19px yra sąmoningi vaidmenys. Skaitomos antraštės H2 24–28px/1.25, H3 20px/1.3, H4 17px/1.4; pastraipų bottom 16px. Quote H2 20px/1.2, item H3 17px/1.3; visi 650 ir -.025em. Tikrų produktų pavadinimai ir tekstai nekuriami iš naujo.

GRID: produktai ir kolekcijos – 5 stulpeliai ≥1200px, 4 ties 1001–1199px, 3 ties 651–1000px, 2 ties ≤650px. Produktų gap 28px/14px, kolekcijų 28px/16px, mobile 24px/12px. Puslapyje 20 produktų. Image sizes abiejuose aktyviuose šaltiniuose – 46vw ≤650px, 30vw ≤1000px, 23vw ≤1199px, kitu atveju 18vw. Desktop filtrai turi paiešką, keturis select ir veiksmą vienoje 6 stulpelių eilėje; ≤1199px 3, ≤800px 2, ≤650px search/action per visą eilę, ≤380px 1. Filtrų padding 12px, mobile 10px; gap 8px. Katalogo sidebar 184px/24px gap, ≤1100px 160px/20px, ≤800px viena kolona ir kategorijų rail.

CONTROLS: įprasti desktop mygtukai/laukai ≥42px; mygtuko padding 9px/18px ir gap 10px, laukų 8px/10px, label gap 5px/bottom 14px, textarea ≥112px. Desktop filtrų laukai/mygtukai ≥38px/14px/1.45. ≤900px įprasti input/select/textarea/search ir visi filtrų įvedimo/veiksmų tekstai 16px; mygtukai/input/select/search bei filtrų valdikliai ≥44px. Text link, puslapiavimas, galerijos rodyklės, photo/3D switch ir viewer toolbar ≥44px; finish trigger ≥46px. 4px kampai, matomas focus ir hover išlieka.

PRODUCT: nefullscreen detail 1fr/1.12fr, 32px gap, 8px/28px padding; ≤800px viena kolona/24px gap. Pagrindinės galerijos max 520px, šeimos galerijos 620px, normali viewer-stage 380px aukščio, ≤650px 340px. Miniatiūros 60px/8px gap. Configuration sekcijų/grid tarpai 12px, summary ≥42px/15px/650, select ≥42px desktop/≥44px ≤900px, finish sample 32px. Tikrų fullscreen/dialog/options, foto/3D, URL/storage/PDF/užklausos elgsena išlieka.

READ/CONTACT: gidai 2 stulpeliai/32px gap, 20px row padding; ≤650px 1. Editorial gap 36px/≤800px 24px; TOC 210px/16px padding, ≤1100px 190px/14px, ≤800px sraute su 2 link stulpeliais, ≤650px 1. Contact padding 28px/gap 32px, ≤650px 20px/24px. Quote gap 32px, item plane padding 24px, item 76px/16px gap; ≤380px 65px/14px. Layout stack ≤800px išsaugotas.

TRUTH: saugomi 8 SEO puslapiai/76 blokai, tikri modeliai ir jų nuotraukų fonai/siluetai, 3D medžiagos bei vartotojo scenos nustatymai. Patvirtinta homepage kompozicija, vienas header/footer ir saugumo/formų kontraktai išsaugomi. Saved request nėra pristatytas laiškas; SMTP lieka neįjungtas.

## Verification and handoff

Dokumentavimo užduotis perskaitė šaltinius ir esamą kanoną; naujo context, detector, browser, test ar build nevykdė. Originalus detector.json išsaugotas: 5 typography advisories dėl dokumentuotų 13px/19px vaidmenų. Vykdančios užduoties pateikti rezultatai ir tikslios dokumentavimo ribos yra [documentation.md](../review/site-density-20261013/documentation.md). Naujo tankio viešo diegimo kvitą pateikia vykdanti užduotis atskirai; ankstesnė header versija 295713e8-1b51-43a0-acb6-dce96e57b5b6 yra ankstesnio etapo istorija.
