# Laiptų centro dizainas

2026-10-01. Agentas pasirinko savarankiškai pagal projekto adaptaciją; savininko patvirtinimo neimituojame. BUSINESS.md sukurtas pirmiau. Homepage Persuade, gidai Read, kontaktai Operate. Pagrindinis veiksmas: registruoti konkretų vidaus laiptų poreikį su aiškia prieinamumo riba.

## Kryptys ir pasirinkimas

Svarstytos 7 sistemos: 1 architektūros žurnalo viršelis, 2 medžiagų pavyzdžių katalogas, 3 objekto užduoties lapas, 4 rami namų paroda, 5 darbų eigos dienoraštis, 6 architektūrinis specifikacijų albumas, 7 sutarties apimties palyginimo lentelė. Skirtingi pirmi ekranai ir tankis, ne spalvų keitimai. Impeccable seed 1d9ae3b2 paskyrė 6. Paruošti ir vizualiai lyginami study-a (split paroda), study-b (6, panorama + tipografinė įžanga), study-c (užduoties lapas); screenshot įrodymai research/.

Paskirti challengers (oscilloscope, cracktro queue, Greiman collage) perkelti į laiptų informacijos užduotį praranda namų / medžiagų atpažįstamumą ir teikia mažiau aiškų išankstinį užklausos kelią. Declined. Perimta disciplina, ne dekoras: oscilloscope – aiškūs duomenų ir nežinomybės skirtumai; queue – tvirta tipografinė hierarchija; collage – didelio vaizdo drąsa. Judantis grafikas, bitmap eilė ar sluoksnių žaislas neatlieka šio kliento užduoties. Adaptacija leidžia pasirinkimą be žmogaus interviu ar automatinių subagentų; peržiūra vieno agento.

Pasirinktas B: platus laiptų vaizdas žemiau dviejų skirtingo mastelio tekstinių kolonų; jis iš karto rodo medžiagas ir realų įrengimo mastą. Viduryje – skirtingų užduočių sąrašas, viena medžiagų studija, trys gidai su tikromis miniatiūromis, užklausos užduotis. Kompromisas: iliustracija rodo vieną estetinę kryptį, nors pilotas registruoja platesnį vidaus laiptų poreikį. Nuotraukų galerijos / darbų portfelio nėra.

## Tyrimų pritaikymas

Roberto desktop/mobile: trumpas gamybos proceso paaiškinimas ir vietovė naudingi; daugelio kategorijų meniu neperkeltas. Style Stairs desktop/mobile: konstrukcijos ir medžiagų atskyrimas bei didelis vaizdas; kainų konfigūratorius ir jų įvykdymo pažadai atidėti. Stadler: panoraminė architektūra ir aiškūs komponentų keliai; specialisto lokatorius, CE ir garantijos atmetamos be mūsų įrodymų. Nuotraukos ir jų vardai netransplantuojami.

## Sistema

Spalvos: popierius #f3efe7, baltas #fffdf8, tamsus žalias #293e34 (tekstas ir veiksmas), muted #536153, linijos #c6cabb. Šilta mediena iš originalių iliustracijų; spalvinės metaforos pakanka be gradientų ar dekoratyvinės tekstūros.

Newsreader 400/500 antraštėms, Manrope kūnui. Esami teisėti OFL fontų failai kopijuojami į savo public/fonts/laiptucentras; vardai ir licencijos išsaugomi. Lietuviškų simbolių patikra naršyklėje. H1 iki 80px, mobilus 46px; body 18px/1.75, utility ≥15px. Skaitymo plotis 740px, visas maketas max1320px, kraštai 5% / mobile22px. Tarpai 8/16/24/40/64/96. Be dekoratyvių badge, eyebrow, kortelių ant kiekvienos pastraipos ar išgalvotų statistinių skaičių.

Skaitiniai gidai: aiškus breadcrumb, MB Pinet byline su profile link, nekintamos datos, teminis vaizdas, turinys su tikrais anchor ir šaltiniai po tekstu. Kontaktai ir teisiniai puslapiai tekstiniai – nereikalinga dekoratyvi fotografija. Mobilus meniu native details/summary, nespraudžiamas ilgas desktop meniu. Keyboard focus 3px tamsus kontūras, sumažintas judesys palaikomas; dekoratyvinės animacijos nėra.

Formos: native server action /uzklausa pagal esamą core sutartį. Viename laukelyje nuolat matomas aprašymo šablonas: darbas, vietovė, etapas ir laikas. Nėra fiktyvaus failų įkėlimo ar papildomų laukų, kurių backend nesaugotų. Consent yra poreikiui aptarti, ne marketingui. SMTP / voice QA išjungti.

## Vizualinės priėmimo išvados

Galutinė vietinio production peržiūra: `qa/home-desktop-final.png`, visas `qa/home-desktop-full-final.png`, visas `qa/home-mobile-final.png`, `qa/gidai-{desktop,mobile}-final.png` ir visi trys `qa/laiptu-*-{desktop,mobile}-final.png`. Vaizdai tikrai įkrauti (desktop-guides / mobile-guides JSON), 320/768 px patikrinti visi 11 URL. 390 px panorama išlaiko laiptų kryptį ir medžiagas; miniatiūros rodo atskirą kiekvieno gido temą. Fontų lietuviškų glifų ir WOFF2 failų patikra `qa/fonts.json`.

Iki pirmo final pataisyti dubliuoti heading anchor, indekso H2, tarpas po miniatiūrų ir skip link fokusas į MAIN. Native Meniu atveriamas klaviatūra, tuščia forma fokusuoja vardą, tikra sėkmės būsena patvirtinta D1. `qa/form-empty.png`, `qa/form-success.png`, `qa/skip-final.json`. Kontrastas pagrindinėse porose 5,21–11,27:1. Utility ≥15px; nevadinama WCAG sertifikatu. Tikras 200% didinimas neįrodytas, R2/S2 UNVERIFIED.

Newsreader pirminiai mislabeled TTF pakeisti tikrais lossless WOFF2 39/42 KiB ir pridėti trijų fontų preload. Kainos gido mobile Lighthouse pagerėjo 87→93; pradžia92. `qa/performance-summary.json` išsaugo ir ankstesnį matavimą, ne vien geriausią. Accessibility/best practices/SEO100 yra techninis lab rezultatas, ne originalumas ar konversija. Bendro build didelio chunk perspėjimas nepaslėptas, faktiškai išmatuota viso puslapio perduodama apimtis ~325/262 KiB.

`qa/impeccable.json`: detector radinių nėra. `CRAFT-SELF-REVIEW.json`: šio agento septynių kriterijų 13/14 (9,28/10), ne parent/savininko patvirtintas balas. Mobilus kriterijus1: skaidrus piloto paaiškinimas nustumia hero vaizdą žemyn, o atvertas gido turinys gana ilgas; kelias vis tiek aiškus ir readable. Kiti kriterijai2 paremti išvardytais tikrais ekranais ir funkcija. Techninis A–Z local9,72 lieka sąlyginis dėl zoom. Konversijos, fizinių telefonų ir tikro domeno įrodymų nėra.
