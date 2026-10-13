# Pilnas homepage išdėstymas · 2026-10-13

Šis dokumentas yra planavimo etapas. Aktualus [11 sekcijų įgyvendinimo kvitas](HOMEPAGE_IMPLEMENTATION_2026_10_13.md) papildytas savininko Instagram reikalavimu ir mažesnio hero mastelio screenshot.

Struktūros pasiūlymas pagal tiesioginį savininko pavedimą. Išsaugoma pasirinkta Memory Casting tapatybė: Manrope 400/600, balta, šiltas neutralus fonas ir rožinis akcentas. Tamsi 3D scena yra vienos sekcijos fonas, ne nauja viso puslapio tapatybė. Tai agento rekomendacija ir vietinė išdėstymo studija, ne paskelbtas naujas leidinys ar užbaigtas homepage.

Peržiūra: `node sites/memocasting/homepage-study/preview.mjs`, http://127.0.0.1:8841/. Studija naudoja jau turimas iliustracijas iš public companion; jos nėra tikrų klientų darbų įrodymas. 3D vietoje rodoma aiškiai įvardyta statiška iliustracija, kol nėra patikrintų GLB. Veikia proceso etapų, rinkinių sudėties ir progų pasirinkimai bei pastabų rodymas. Pirkimo nuorodos veda į esamą vietinę parduotuvę 8817; ši studija krepšelio nedubliuoja.

## Lankytojo kelias

Pajusti → suprasti, ką perkame → pasirinkti poros arba šeimos rinkinį → pamatyti kūrimą → apžiūrėti skulptūros rezultatą → patikrinti priemones ir pagalbą → pirkti.

Rinkinių pasirinkimas keliamas iš dabartinės gilios pozicijos į antrą sekciją. Hero turi du aiškius veiksmus: „Pasirinkti rinkinį“ ir „Pamatyti procesą“. Nereikia baigti ilgo filmo, kad būtų galima pirkti. Patyręs lankytojas trumpina kelią; pirmą kartą atėjęs turi visą pasakojimą.

## Visos sekcijos, iš eilės

| Nr. | Sekcija ir klausimas | Kompozicija / veiksmas | Dabartinė spraga ir įgyvendinimas |
| --- | --- | --- | --- |
| 01 | **Akimirka, kuri lieka.** Kas tai? | Esamas didelis hero, vienas stiprus vaizdas. Po H1 aiškiai „Rankų liejimo rinkiniai porai ir šeimai“. Du CTA. Logotipas, kalba, krepšelis. | Hero jau yra. Papildyti tiesioginiu rinkinių CTA, išlaikyti pasirinktą vaizdo kalbą. Nenaudoti įkėlimo užsklandos prieš turinį. |
| 02 | **Kam kursite prisiminimą?** Kuris rinkinys? | Dvi lygiavertės, didelės poros / šeimos kompozicijos, trumpa sudėtis, kaina ir atskiras produkto CTA. Mažas palyginimas ir pagalbos nuoroda. | Dabartiniai du produktai yra per vėlai ir be kainos. Dabartinės LT bazinės kainos 32 / 48 €; galutiniame UI jas gauna tas pats serverio katalogas kaip product/cart. Dažai+3€ ir pagrindas +10 € tik pagal admitted variantą / availability; nesiūlyti neaktyvaus SKU. |
| 03 | **Kaip gimsta jūsų skulptūra.** Ar galėsime patys? | Esamas šešių etapų filmas. Greta aiški etapų navigacija: priemonės, alginatas, atspaudas, gipsas, atidengimas, rezultatas. Veiksmas „Apžiūrėti rezultatą“. | Išlaikyti filmą, sutrumpinti jo scroll ruožą po tikros peržiūros. Dabar apie 610 svh desktop / 580 svh mobile. Projektinis tikslas apie 300–360 svh desktop, mobile vertikalūs etapai / trumpas pasirenkamas filmas; nevadinti patikrintu, kol neįgyvendinta. Instrukcijos pateikia tikrus laikus ir vandens kiekius. |
| 04 | **Jūsų ryšys. Iš visų pusių.** Kaip atrodo rezultatas? | Tamsi muziejaus tipo 3D vitrina, viena balta skulptūra ir švelnus kontaktinis šešėlis. „Pora / Šeima“, pasukimas, +/−, pradinis vaizdas, visas ekranas. „Rinkinys šiai idėjai“ veda į konkretų produktą. | Nauja pagrindinė interaktyvi sekcija. Po proceso rezultatas turi prasmę; prieš kitą informaciją leidžiame jį tyrinėti. Tik pasirinkus „Apžiūrėti 3D“ perimamas drag; mobilus puslapio scroll iki tol laisvas. Pirmas modelis pora, antras šeima. Trečias gestas vėliau, jei jo fizinis įgyvendinamumas patikrintas. |
| 05 | **Atidarykite savo rinkinį.** Kas įeina, ko dar reikės? | Viena tikra rinkinio nuotrauka ir poros / šeimos jungiklis. Hotspot arba priemonių sąrašas. Atskirai papildomai pasirenkami dažai / pagrindas ir pasiruošimo gidas. | Vienas DUK nepakeičia matomos sudėties. Pora: alginato pakelis, 1200 g gipso, kibiras, pagaliukai. Šeima: 2 alginato ir 2 gipso pakeliai, pagaliukai; kibiras / pakelių masės / tikslus rankų skaičius nežinomi. Nepridėti jų iš iliustracijos. Kol tikros foto nėra, sudėtis rodoma tekstu, ne netikru packshot. |
| 06 | **Ką norite pasilikti?** Kam ir kokiai progai? | Trumpas emocinis intarpas su2–3 scenarijais: poros vakaras, šeimos akimirka, dovana artimiems. Didelis vaizdas ir viena pastraipa, o ne dar viena ilga sticky scena. | Sujungti dabartinį meaning tekstą su naudingu progos pasirinkimu. Pasirinkimas pakeičia žinutę ir nuorodą, ne kainą ar neegzistuojantį produktą. Nedaryti kūdikių rinkinio CTA, kol SKU neaktyvus. |
| 07 | **Skirtingos rankos. Tikros istorijos.** Ar galiu pasitikėti rezultatu? | Asimetriška realių darbų galerija; atidarius nuotrauką – jos detalė ir tikras kontekstas. Greta 1–3 tikri, leidžiami naudoti atsiliepimai. | Dabartinė galerija iliustracinė, trys atsiliepimai pavyzdiniai. Tikri darbai / citatos / leidimai dar būtini. Iki tol viešame homepage lieka sąžiningai įvardyta įkvėpimo galerija, o pavyzdinių citatų sekcija pašalinama. Review / AggregateRating schema nenaudojama be tikrų duomenų. |
| 08 | **Kad pirmas liejimas būtų aiškesnis.** Kur rasti pagalbą? | Trys redakciniai įėjimai: pasiruošimas, dažnos klaidos, džiovinimas / apdaila. Trumpas konkretaus gido naudos sakinys ir iliustracija. | Gidai dabar paslėpti bendrame papildomos informacijos disclosure. Atverti tris naudingiausius esamus gidus su jų tikrais eligible URL, ne kurti dar vieną kopiją. |
| 09 | **Prieš pradėdami.** Ką svarbu žinoti? | 6–8 native DUK. Šalia trumpa pagalbos / pristatymo / grąžinimo juosta ir tikras kontaktas. | Išplėsti dabartinius 3 DUK: skirtumai, sudėtis, papildomos priemonės, stingimas vs džiūvimas, apdaila, pagalba, pristatymo ir grąžinimo nuorodos. Jokio nepatvirtinto pristatymo dienų skaičiaus, „viskas saugu“ ar rezultatų garantijos. |
| 10 | **Išsaugokite tai, ką jaučiate.** Ką daryti dabar? | Didelis ramus užbaigimas ir CTA atgal į rinkinius, mažesnis pagalbos veiksmas. | Dabartinis užbaigimas tinkamas; sujungti su ankstesniu pasirinkimu ir aiškiu pirkimo keliu. |

**Navigacija ir poraštė:** išlaikyti pasirinkto prototipo dock, bet skyriai turi atitikti galutinį kelią: pradžia / rinkiniai / procesas / skulptūros. Kalba ir krepšelis pasiekiami. Poraštėje MB Memocasting, kontaktai, tikri pristatymo / grąžinimo / taisyklių / privatumo URL ir gidai. Tikslus320px dock sprendimas peržiūrimas su naujais pavadinimais. Poraštė nėra vien logotipas ir socialinių ikonų dekoracija.

## Tyrimas ir konkretūs sprendimai

Naršykle 2026-10-13 apžiūrėtas [Awwwards Sites of the Year katalogas](https://www.awwwards.com/websites/sites_of_the_year/), o ne tik paieškos miniatiūros. Awwwards katalogas nesuteikia teisės kopijuoti jų failų. Skolinamės sąveikos principą ir kuriame savo sceną.

| Šaltinis | Ką faktiškai apžiūrėjau | Ką taikome mūsų produktui |
| --- | --- | --- |
| [Igloo Inc](https://www.igloo.inc/) / [Awwwards įrašas](https://www.awwwards.com/sites/igloo-inc) | Gyva pilno ekrano scena: šviečiantis atskirų blokų objektas, slenkant susidedantis į iglu, kamera atsitraukia. AX beveik tuščias; tai vizualaus efekto, ne HTML turinio pavyzdys. | Balta rankų skulptūra vienoje kontroliuojamoje šviesos scenoje, trumpas kameros atvykimas. Mūsų tekstas / CTA lieka tikru HTML, be infinite-scroll pasaulio ir be garso reikalavimo. Neteigiame, kad šaltinio visos sąveikos ar mobile buvo patikrintos. |
| [Mana Yerba Mate](https://en.manayerbamate.com/) / [Awwwards įrašas](https://www.awwwards.com/sites/mana-yerba-mate) | Gyvas hero su produktu centre, variantų rodyklėmis ir prie produkto susietu CTA. PageDown keičia skardinės kampą ir pereina į atskirą naudos paaiškinimą. Matėsi horizontalus scrollbar. |3D poros / šeimos pasirinkimas turi aiškų ryšį su rinkiniu. Keičiasi skulptūra ir tekstas; vienas objektas vienoje scenoje. Paliekame Memo spalvas ir sutvarkytą reflow, ne gėrimo iliustracijas ar žaidimo poraštę. |
| [Opal Tadpole – The hand flip](https://www.awwwards.com/inspiration/the-hand-flip-opal-tadpole) / [Awwwards įrašas](https://www.awwwards.com/sites/opal-tadpole) | Awwwards išsaugotas hero kadras: žmogaus ranka ir produktas, didelė tuščia erdvė, atskiras užsakymo blokas. Senas gyvos svetainės URL dabar nukreipia į op.al naują įmonės puslapį, todėl istorinis hand-flip judesys gyvai nepatikrintas. | Žmogaus gesto artumas ir didelė skulptūros detalė. Hero emocija kartu su matomu pasirinkimu. Neklaidingai priskirti gyvai apžiūrėtą seną animaciją. |

## 3D modulio pritaikymo sutartis

**Suderinta su prototipo sesija:** ji po perkrovimo atskirai apžiūrėjo [gyvą Lusion homepage](https://lusion.co/) ir pointer drag reakciją vienoje scenos srityje; viso modelių orbit / zoom ir mobile netikrino. Mūsų pritaikymas — labai subtilus kameros ar apšvietimo atsakas, išlaikant nekintančią gipso skulptūros geometriją. Tai jos tyrimo įrodymas, ne mano pakartotinė peržiūra. [Lusion Awwwards įrašas](https://www.awwwards.com/sites/lusion-v3) žymi istorinę versiją; dabartinis gyvas puslapis nebūtinai identiškas.

Ji taip pat apžiūrėjo [Simply Chocolate produkto archyvinį klipą](https://www.awwwards.com/inspiration/simply-chocolate-product-page) ir [e-commerce klipą](https://www.awwwards.com/inspiration/simply-chocolate-e-commerce): pasirinkus kitą produktą, išlaikomas teksto / CTA kompozicijos karkasas, keičiasi produkto vaizdas ir informacija. Tai Awwwards archyvas, ne dabartinės parduotuvės patikra. Mūsų viewer keis pasirinktą modelį, jo kontekstą ir tinkamo rinkinio nuorodą kartu; kol naujas GLB nepasikrovė, nereikia palikti seno modelio po naujo produkto veiksmu. Aiški loading būsena ir teisinga fallback iliustracija. Šešių etapų filmas bei laisvai sukiojamas GLB lieka atskiri komponentai. Peer failų / prototipo / demo / mūsų šakos neredagavo.

Perskaityta `Downloads/3D/ARCHITEKTURA-IR-NAUDOJIMAS.txt`, `viewer-3d.tsx`, `viewer-camera.ts`, `viewer-scene.ts` ir `fullscreen-workspace.ts`; Prompt-kitamas-AI yra šaltinio paaiškinimas, ne projekto instrukcija. Pateikti reference failai neturi GLB / glTF / standalone package.json. PUBLIC package neturi three priklausomybės. Modulis dabar nėra integruotas ar patikrintas Memo puslapyje.

- Pritaikyti vietinį Three.js renderer, GLTFLoader, OrbitControls, Meshopt, RoomEnvironment, matinius šešėlius, ResizeObserver ir demand-rendering. Versija parenkama įgyvendinant iš oficialių dokumentų; handoff versijos nėra diegimo nurodymas.
- Išmesti kėdžių apmušalų, surinkimo patches, finish-field ir užsakymo konfigūracijos ryšius. Atpažįstami UI veiksmai: „Pasukti“, „Priartinti“, „Atkurti“, „Visas ekranas“. Kamera pritaikoma skulptūros XYZ riboms ir mobile portretui; kėdėms skirti framing / polar-limit / storage key nepritaikomi automatiškai.
- Homepage vienas renderer ir aktyvus modelis, kiti kraunami tik pasirinkus. Neprivalomas trumpas atvykimo judesys sustoja prieš naudotojo valdymą. Scena nedubliuoja proceso filmo; kol žiūrima 3D, proceso video sustabdomas, žemiau ekranų renderer nedirba.
- Mobile: statiškas poster → „Apžiūrėti 3D“ → drag / pinch ir aiškus „Baigti apžiūrą“. Scroll turi likti valdomas. Desktop ratukas nekeičia modelio mastelio iki aiškaus aktyvavimo. Klaviatūros mygtukai, Escape, focus grąžinimas, fullscreen inert / scroll atkūrimas.
- Loading / error / retry / WebGLcontextlost visada palieka iliustraciją ar tikro modelio poster ir produkto nuorodą. reduced-motion panaikina automatinį atvykimą, ne rankinį tyrinėjimą. Pakeitus route / modelį – abort, renderer / geometry / texture / environment cleanup. Išorinius glTF resursų URL drausti arba iš anksto sudėti į savą GLB.
- Rinkinio kaina / likutis / variantas lieka serverio kataloge. Sukiojamas modelis nieko neprideda į krepšelį. Baltas / dažytas vaizdas, jei bus, yra apdailos idėja; ne naujas SKU ir ne automatinė garantija apie dažų rezultatą.
- Pradinis tikslas vienam GLB iki 3–5 MB, tekstūros iki 2K, geometrijos biudžetas pagal matomą kokybę telefone. Tai projektiniai tikslai, ne dabartinio asseto matavimas. Tinkamos rankos ir paviršius svarbiau už mechanišką triangle limitą. Supplied 32 MB po arrayBuffer riba nėra mūsų admission sutartis: tikrinti manifestą / dydį prieš parse, riboti išorinį download.

**Modeliai vėlesniam etapui:** poros susikibusios rankos; šeimos rankų kompozicija tik kaip patikrinta įkvėpimo idėja; trečias žiedų / detalės modelis tik jei duoda papildomą vertę. Meshy / Tripo generavimas dar nepradėtas. Pirštai, sąlyčio vietos, apačia, skylės ir 360° vaizdas tikrinami prieš optimizavimą, po jo ir naršyklėje. AI modelis įvardijamas kaip įkvėpimo vizualizacija, ne konkretaus kliento atspaudas ar tikslus fizinio rinkinio talpos įrodymas. AR „pastatyti namuose“ atidedame, kol turime tikrą mastelį ir patikrintą device palaikymą.

## Ko dar reikia pilnam homepage

1. Du kokybiški GLB ir jų posteriai; rankų anatomija, orientacija, provenance ir licencija.
2. Tikros poros / šeimos rinkinių foto su atskirai patikrinta sudėtimi. Iliustracijose matomos priemonės nepatvirtina tikros komplektacijos.
3. Bent 4–6 tikrų baigtų skulptūrų foto ir leidimai jas publikuoti. Tikros citatos / autoriaus parodymo pasirinkimas; dabartiniai pavyzdiniai atsiliepimai nėra socialinis įrodymas.
4. Patikslinta šeimos rinkinio sudėtis / talpa, jei norime apie tai kalbėti; pristatymo pažadai tik pagal realiai įjungtą paslaugą.
5. Įgyvendinti ankstyvą rinkinių pasirinkimą, matomą komplektaciją, gidus ir išplėstą pagalbą; sutrumpinti dubliuotą emocinį sticky ir filmą pagal tikrą peržiūrą.
6. LT pilnas priėmimas pirmiausia, tada PL / LV / ET adaptacija tuo pačiu turiniu ir eligible URL. Tikrinti visus CTA, native cart, mokėjimo klaidų kelią, media fallback, keyboard, 320/390/768/1440 reflow, teksto didinimą ir tiesioginį navigacijos grįžimą. SEO title / canonical / hreflang / Organization išlieka; naujos schemos turi atitikti matomą, patvirtintą turinį.

## Įgyvendinimo seka

A. Struktūros ir paspaudžiamų vietų studija → B. Esamų assetų / patvirtintų tekstų reorganizavimas per Studio → C. 3D įgyvendinimas ir du peržiūrėti modeliai → D. Tikri darbai / atsiliepimai → E. Bendras homepage responsive ir native shop priėmimas. Viena moderni patirtis kuriama aplink filmą, skulptūros apžiūrą ir aiškų pasirinkimą; kiekvienai pastraipai atskiros WebGL animacijos nereikia.

Task pradžios / po PCrestart paired freshness PASS: CORE c3cb82947b79536efad130d360f6cc68e764a795, main 7af6b9641012a30c5f95eac38a66daeff8f8cb39; PUBLIC d9eb1c70bd353eb13e3a201d44cdd49e1d2bdb7e, main ec8a9c032fe926d1d9722802d8eb26fa8bd02937. Tyrimo metu turinio paketas 3b350683 nepakito. Peer prototipo sesijai pasiūlymas perduodamas savininko autorizuoto bendro darbo ribose; ji nekeičia mūsų branch.

## Vietinės studijos patikra

Tikras browser desktop 1440×900, mobile 390×844 ir 320×800; document scrollWidth neviršijo viewport. 320 px antraštės / button / CTA ribos neperžengė ekrano; matomi button ir pagrindiniai CTA bent 44 px aukščio. Native DUK, šešto proceso etapo tekstas / vaizdas, šeimos poster / produkto URL / sudėtis, dovanos nuoroda atgal į rinkinius ir visų plano pastabų slėpimas patikrinti. Taisytas mobile anchor offset ir studijos navigacija padaryta tiesioginė, kad ilgas smooth scroll neklaidintų peržiūros.

11 HTTP patikrų: studija / CSS / JS / etapo assetas / planas ir esamas homepage / abu produktai / instrukcija / pagalba / apdailos gidas grąžino 200. JS ir serverio Node syntax patikros PASS. Tai išdėstymo studijos priėmimas, ne naujos parduotuvės / 3D / mokėjimų / Lighthouse patikra. Tikras 200% zoom, OS reduced-motion ir fizinis telefonas šiame etape nepatikrinti.

Private screenshot įrodymai public companion `output/`: homepage-plan-showroom.png, homepage-plan-320.png, homepage-research-igloo.png, homepage-research-mana.png. Šaltinio studija savarankiškai nepublikuojama, bind tik 127.0.0.1 ir noindex. Nėra naujo bendro core incompatibility ar shared upgrade: šis etapas yra konkrečios nišos planas / maketas, todėl dirbtinis upgrade įrašas nekuriamas.
