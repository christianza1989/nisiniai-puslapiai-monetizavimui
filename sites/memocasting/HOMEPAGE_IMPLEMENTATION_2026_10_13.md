# Interaktyvus LT homepage · 2026-10-13

Savininkas tiesiogiai pavedė įgyvendinti visą homepage planą, pridėjo Instagram profilį ir pasirinko mažesnio hero mastelio screenshot. Šis etapas keičia LT homepage. Tikri GLB, naujos nuotraukos ir seni atsiliepimai bus pateikti vėliau; PL / LV / ET bei kitų puslapių dizainas lieka atskiras etapas.

## Įgyvendinta kompozicija

11 sekcijų: hero → rinkinių pasirinkimas → šešių etapų procesas → skulptūrų idėjos → komplektacija → progos → įkvėpimo galerija → Instagram → gidai → DUK ir pagalba → užbaigimas. Native krepšelis, kalbos, legal / kontaktų poraštė išsaugoti.

Hero pagal savininko etaloną: Manrope 400, iki 58 px, visas produktas matomas iš toliau, papildoma erdvė prieš dock, du ramūs tekstiniai CTA. Bendros H2 iki 48 px, closing iki 64 px; kūno tekstas 16 px, hero desktop 15 px / mobile 16 px, kontrolės / antrinės etiketės 14–15 px. Tikri Manrope 400/600 failai ir OFL nepakito. Tamsi skulptūrų scena išlaiko baltos / rožinės tapatybės ritmą.

Slinkimo choreografija: hero raidžių atvykimas ir mažas vaizdo poslinkis, antraščių eilutės, pastraipų atsivėrimas, vaizdo atidengimas ir galerijos gylis. Naudojami vietiniai CSS / IntersectionObserver ir demand-rAF, naujos animacijų bibliotekos nėra. Default HTML yra matomas; judesio išjungimas išsaugo visus tekstus ir pasirinkimus. Observer / listener / rAF / media išvalomi atsijungiant nuo homepage.

Filmo desktop ruožas 360 svh su monotonišku žingsnių laiko žemėlapiu; kiekvienas etapo mygtukas naudoja to paties žemėlapio progresą. Baigtai skulptūrai paliktas final-pose hold. Mobile turi šešis aiškius paveikslų / tekstų etapus ir pasirenkamą native filmą su tikrais valdikliais bei uždarymu prie video. Trumpame viewport ir motion-off lieka visos šešios iliustracijos. Tai esamas savininko priimtas DI filmas; modelių anatomijos ribos nepervertintos.

Poros / šeimos skulptūros, rinkinio sudėties ir progos pasirinkimai keičia tinkamą turinį bei produkto CTA. Jie nekeičia krepšelio. Kainos ateina iš to paties canonical CommerceClient / catalog / markets kaip produktų puslapiuose; loading / error / retry / unavailable nėra išgalvotos 32/48 kainos iš seno Instagram. Be JS lieka nuoroda į produkto kainą. Priedų prieinamumas tikrinamas produkto puslapyje.

## Instagram ir laukiančios medžiagos

Savininko profilis https://www.instagram.com/memocasting.lt/ tikrai atidarytas. Prototipo sesija atskirai apžiūrėjo viešas miniatiūras / autorių aprašus; visų video eigų nepatvirtino. Atrinkti trys tikri proceso / atidengimo / detalės permalinkai. Rodomi autoriai, šaltinio reklaminė žyma ten, kur matyta. Tai ne nepriklausomi klientų atsiliepimai ir ne dabartinė akcija.

Root naršyklės Options→Embed veiksmas gavo aiškų Browser Use security rejection. Originalus blokas neapeitas: nėra /embed/ spėjimų, iframe, embed.js, nuotraukų parsisiuntimo ar automatinio feed. Šiame etape yra įprastos tikrų įrašų nuorodos. Gavus savininko originalius video / nuotraukų failus, juos galima įtraukti per patikrintą media pipeline ir papildyti natyviomis peržiūromis.

Skulptūrų sekcijos stage ir poros / šeimos pasirinkimas paruošti būsimiems modeliams. Dabar yra įvardytos įkvėpimo iliustracijos; tikro Three.js sukimo / zoom, GLB ar AR dar nėra. Download3D reference įvertintas plane; modelius reikės tikrinti 360° anatomijai, geometrijai, tekstūrai ir telefono peržiūrai. Tikrų nuotraukų / atsiliepimų vietoje nepaskelbiami fiktyvūs duomenys; ankstesni pavyzdiniai atsiliepimai pašalinti.

## Oficialus turinys ir apimtis

Studio edit → pilna saviredakcija → revision-bound review → batch approval → release → public import. Aktualus leidinys `b0ec6830-275b-4beb-bb4e-90e300ddaad2`, SHA256 `fb7848132351ee1077e473a0223164bdaa1d94736a12deb447d97701c314a8be`. Homepage turi 88 naujus nuolatinio teksto blokus; runtime media-error / native kainų klaidos neįtraukti į SEO body. Originalūs title / description / media / internal-link IDs / publishAt ir naudingas ankstesnis home body išsaugoti. Instagram šaltiniai pridėti po realios peržiūros. Visi 87 kiti puslapiai iš oficialaus ankstesnio paketo byte-for-JSON palyginti ir nepakito.

88 puslapiai / 84 indexable / 24 gidai / 172 WebP; tie patys 19 dizaino assetų su ankstesniu exact manifestu. Nebuvo backend / SDK / DB / mail / provider / DNS / deployment / mokamo generavimo pakeitimo. Canonical SDK lieka `be32c223b2e45168b52a5eeec2d111006fe98214`.

## Patikros ir radiniai

93 PUBLIC testai, TypeScript ir 10 paketų build PASS. Meaningful regresijos apima finite film map / chapter inversion / native catalogue admission / late unmount response / eligible guide-service CTA / tikrų IG permalinkų validaciją / jokio external script-frame.42 native HTTP patikrų tikrina19 exact assetų, abu MP4 Range / HEAD / If-Range / 416 / 405 ir host izoliavimą. Memo SEO smoke patikrino 88 puslapius, robots / sitemap / llms / schemas /404. Detektorius prieš ir po pagrindinio repair grąžino []; globalios kitos nišos design-system palyginimas nenaudotas, Memo tokenai peržiūrėti tiesiogiai. Tai ne Lighthouse ar WCAG sertifikatas.

Actual browser: desktop 1440×900 filmo5→2 etapai 15.202159→5.040473s, readyState 4 ir skirtingi kadrai. Mobile 390×844 native Play 0→20.041667 / ended / ready4; close pašalina src ir grąžina fokusą. Skulptūros / sudėties / dovanos pasirinkimai, DUK, tikros kainos, IG 3 nuorodos ir 0 external iframe/script patikrinti. 320×800 po pataisos scrollWidth 305 prie innerWidth 320, penki dock valdikliai 44 px aukščio ir right≤294; 768×1024 scrollWidth 753 prie 768, matomos antraštės / CTA ribos neišlenda. Tikri Manrope 400/600 loaded.

Originalus mobile radinys: 390 px puslapyje scrollWidth 460, material-type eilutės wrapper suspaudė tris žodžius į vieną; dock buvo ankštas. Repair: material block / min-width:0, trumpesnis mobile dock ir footer nuorodos. Taip pat pataisytas hero-scroll / dock susikirtimas ir prarastas gallery padding. Perėjime mobile→768 užfiksuotas native controls=true likutis; close / configure turi jį išvalyti. Prototipo sesijos atskiras media-error / broken-image radinys saugomas; jis galėjo sutapti su preview restart, todėl tikro naujo build patvirtinimas vertinamas atskirai, ne panaikinamas senas radinys.

Galutinė patikra: išjungus savo 8827 backend, abi kainos parodė klaidą ir du retry valdiklius; paleidus tą patį backend ir pakartojus užklausą grįžo 32 / 48 €. Grįžimas produktas→home ir PL→LV→ET→LT paliko po vieną homepage root, motion toggle ir filmo close. Mobile filmas→768 px desktop dabar išvalo native controls (false), rodo desktop.mp4 ir neturi MediaError. 93 testai ir TypeScript pakartotinai PASS po galutinių pataisų.

Nepriklausoma prototipo sesijos peržiūra užfiksavo 320×740 hero CTA / vaizdo persidengimą. Pataisyta natūralia mobile copy→image dokumento eiga; galutinis root patvirtinimas: CTA bottom 456.60, copy bottom ir image top 494.60 px, innerWidth 320 / scrollWidth 305, persidengimo nėra. Peer patvirtino desktop 5→2 skirtingus kadrus, telefono native filmą ir jo uždarymą, pasirinkimų nuorodas bei dock. Ankstesnis broken-media radinys po galutinio build reload nepasikartojo; jis išlieka istorijoje. Native workerd bendri internal-error logai nėra paskelbti sutvarkyti ar produkcijai priimti.

Private įrodymai companion output/: homepage-complete-http.private.json, homepage-complete-tests.private.txt, homepage-complete-overflow-before.private.json, homepage-complete-browser.private.json, homepage-complete-hero.png ir homepage-complete-mobile-320.png. Core qa/: tikslus leidinio kvitas, originalus hero screenshot ir du detektoriaus rezultatai. 200% browser zoom / OS reduced-motion / fizinis telefonas nepatikrinti; motion-off yra tikras atskirai bandytas puslapio režimas, ne OS emuliacijos įrodymas.

Upgrade `upgrade-70071bf8-a382-4cee-a2c3-3d6328d5fa8c`, issue100/30, esami draft PR101/31. Compiler-generated public inventory įtrauktas į savo įrašo scope prieš source commit; istorinių events pakeitimų nėra. Šis kvitas nepaverčia ankstesnio bendro A–Z `SITE_COMPLETION.json` nauju auditu. Visos svetainės / produkcijos priėmimas ir savininko medžiagų etapas lieka atskiri.
