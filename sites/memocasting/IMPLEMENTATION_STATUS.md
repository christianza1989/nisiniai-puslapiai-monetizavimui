# Aktualus Memocasting homepage

2026-10-13: [įgyvendintas interaktyvus LT homepage](HOMEPAGE_IMPLEMENTATION_2026_10_13.md): 11 sekcijų, savininko mažesnio hero mastelio kryptis, native katalogo kainos, pasirinkimai, filmas ir Instagram nuorodos. Oficialus leidinys b0ec6830-275b-4beb-bb4e-90e300ddaad2, SHA256 fb7848132351ee1077e473a0223164bdaa1d94736a12deb447d97701c314a8be. 88 puslapiai / 84 indexable / 24 gidai / 172 WebP ir 19 dizaino assetų; kiti 87 puslapiai, SDK ir backend nepakito. Tikri GLB / nuotraukos / atsiliepimai laukiami iš savininko. Žemiau esantys 3b/bff/e69 kvitai ir SITE_COMPLETION.json yra ankstesnių auditų istorija, ne naujo homepage pilnas A–Z priėmimas.

---

# Ankstesnių Memocasting etapų kvitai

2026-10-13: [savininko pasirinktas LT homepage integruotas vietoje](HOMEPAGE_INTEGRATION.md). Oficialus7b65db24leidinys, SHA256 3b350683681814d4a1fb130f6f9bdb5761de89eb7fb97b2663de75ca92a7ef14,88puslapiai/84indexable/24gidai/172WebP ir19atskirųdizainoassetų. Canonical SDK0.12.1be32c223 irkitų87puslapių tekstai išsaugoti. Platesnis dizainas irproduction priėmimas tęsiami atskirai; žemiau esantys bff/e69 kvitai yra istorija.

2026-10-13: savininko nurodytas trijų LT URL pakeitimas užbaigtas vietoje. Nauji /rinkinys-porai, /seimos-rinkinys ir /ranku-liejimo-rinkiniai turi200; seni adresai turi301. [URL migracijos kvitas](URL_MIGRATION_2026_10_13.md). Aktualus turinio paketas bff9afcd88e2919b547a926ea230a034fc8a04b2ff8a9ff784aa2faf0f2be135, 88 puslapiai / 84 indexable / 24 gidai / 172 WebP; tik3 adresų revizijos pakeistos per Studio, tekstai ir datos išlaikyti. Žemiau pateiktas shopo e69 kvitas yra ankstesnio paketo istorija; SDK / backend / DB nesikeitė. Našumas, dizainas ir production vartai nepervertinti.

2026-10-12 savininko tęsinys: našumo darbus atidėti ir užbaigti visą parduotuvės veikimą. Aktualus režimas — veikiantis vietinis parduotuvės pagrindas su patikrintomis pirkėjo bei operatoriaus eigomis; viešas paleidimas ir tikrų tiekėjų prijungimas vertinami atskirai. Svetainės sesija valdo PUBLIC pirkėjo integraciją, o sesija „Įvertinti Shopify alternatyvą“ — canonical commerce backend ir operatoriaus ekranus. Aktuali šio tęsinio patikra: [SHOP_ACCEPTANCE.md](SHOP_ACCEPTANCE.md). Našumo ir galutinio dizaino darbai netęsiami šiame etape.

Aktualus 2026-10-12 leidinys: 88 puslapiai keturiomis kalbomis, 84 indeksuojami puslapiai, 24 gidai ir 172 WebP. Tikslus paketo SHA e69b16f2c764ad51d075f6700af9ad97ad9f1a7fb2248c30552f68efb9afa9c6; canonical commerce 0.12.1 `be32c223b2e45168b52a5eeec2d111006fe98214`, PUBLIC `a82c6da55ff53df895a5c6600adba421b51fbe37`. Susietas vietinis shopo kodo priėmimas užbaigtas: 117 canonical ir 80 PUBLIC testų, native 22 migracijos, tikros testinės pirkėjo / operatoriaus eigos ir standalone build. Struktūros, turinio ir vietinio SEO/GEO patikros atliktos. Visos svetainės 85 kriterijų priėmimas dar NEPATVIRTINTAS: tikras 200% didinimas ir reduced-motion režimo patikra nežinomi, realus SMTP / INBOX ir galutiniai teisiniai / operaciniai faktai nepateikti. Dizainas ir našumas atidėti savininko. Tai ne production-ready.

Aktualūs įrodymai: [88 puslapių kvitas](NATIVE-FOUNDATION-RECEIPT.md), [prieinamumo patikra](ACCESSIBILITY-VERIFICATION.md), [dabartinis A–Z auditas](PHASE-1-AUDIT.md) ir SITE_COMPLETION.json. Žemiau palikta ankstesnių etapų istorija; jos paketų/kiekių/apribojimų negalima pateikti kaip dabartinės būsenos.

---

# Memocasting dabartinis etapas

2026-10-12 tęsinys 0.3: bendras komponentų/partijų/surinkimo, normalizuotų finansinių šaltinių sutikrinimo ir didmenos pasiūlymų pagrindas bei privatūs ekranai veikia vietoje. 39 Node/native D1 patikros; fixture sudėtys ir didmenos kainos nėra Memocasting verslo faktai. Visas operacinis modulis dar nepriimtas.

2026-10-12 bendras modulis papildytas 0.2 paketu: kontaktų/pristatymo snapshot, koreguojami likučiai, numeruojami testiniai dokumentai, pasirašyti refund įvykiai ir vietinis administravimas.30 serverio testų ir native D1/browser priėmimas turi tikslias ribas bendrame commerce dokumente. Memocasting duomenys į operacinį katalogą dar neimportuoti; esamų testinių LT/PL kainų nelaikyti nišos kainynu.
2026-10-11 savininko pavedimas: pirmiausia pilnas bendras prekybos modulis ir roadmap, po jo Memocasting svetainė. Nuotraukos bus pateiktos vėliau. Aptarnavimo/partnerių agentus kurti po svetainės. AI apskaita yra numatyta plėtra.

Tai siteId planavimo vardas, ne priimta public/runtime registry registracija. Pagrindinis domenas, rekvizitai ir kontaktas dar tikslinami. Operatorius **MB Memocasting**, pagal savininką ne PVM mokėtoja; bendro MB Pinet numatytojo čia netaikyti.

[Aktualus commerce pavedimas](../../commerce-core/docs/IMPLEMENTATION_STATUS.md), [roadmap](../../commerce-core/docs/ROADMAP.md), [SEO/GEO ir temų planas](SEO_GEO_PLANAS.md). Backend pradžia nėra storefront/public content/deployment/agentų priėmimas.


2026-10-12 savininkas pateikė paieškos ir GSC nuorodų ekranus. [Šešių senų adresų atkūrimo planas](MIGRACIJA.md) ir [inventorius](legacy-urls.json) paruošti; poros produkto ir instrukcijos canonical lieka seni adresai. Tai planas, svetainė/DNS dar nepakeisti.

Savininkas patvirtino savo memorycasting.lt landing page. [Homepage briefas](HOMEPAGE_BRIEF.md) ir papildomų senų adresų inventorius paruošti iš teksto bei tikros naršyklės peržiūros. Tai atspirties taškas būsimam dizainui; senas kainas, teiginius ir rekvizitus pakeis patvirtinti verslo duomenys.

Savininko pasirinktas tarptautinis vardas **memorycasting.com**, orientuotas į lokalizuotą partnerystę ir vėlesnį agentų partnerių paieškos kelią. [Domenų/rinkų sprendimas](DOMENAI_IR_RINKOS.md), [partnerių svetainės planas](PARTNERIU_SVETAINE.md). Vardas patvirtintas, registracija ir veikiančio puslapio įrodymai dar nėra.
