# Vietinės signaturepads.lt versijos vizualinis atkūrimas

2026-10-29 Rokas tiesiogiai pavedė sutvarkyti visas [vizualinio audito](VISUAL-AUDIT.md) skirtumų grupes ir išlaikyti nuorodas. VF01–VF09 apimtys įgyvendintos per-site renderer, CSS ir client; bendro Core runtime, publikavimo, SEO ar kitų svetainių kodas nepakeistas. Gyvas WordPress ir domenas nepakeisti.

| Grupė | Rezultatas |
|---|---|
| VF01 | Abi originalios kategorijų iliustracijos rodomos; desktop įvadinis tekstas šalia paveikslo, kitas tekstas platesniame bloke; mobile – paveikslas virš įvado. Originalus HTML tekstas išlaikytas. |
| VF02 | Planšečių, monitorių ir panašių produktų tinkleliai mobile – 2 stulpeliai; programinės įrangos ir bendras katalogas – 1 stulpelis, pagal originalo šeimas. Patikrinta 390 ir 320 px. |
| VF03 | Footer grąžintas originalus logotipas ir jo nuoroda; kategorijų eiliškumas pritaikytas originalui. |
| VF04 | Home kategorijų ir klientų logotipų kortelių rėmeliai / kampai, 250×200 logotipų plotai ir apvalinta kontaktų nuotrauka grąžinti. Papildoma kontaktų eilutė po nuotrauka pašalinta; visi kontaktų href išliko footer. |
| VF05 | Du natyvūs kainos intervalų slankikliai, kintantis kainos tekstas, matomas rikiavimas pagal kainą abiem kryptimis. Formos išlaiko filtrus, rikiavimą ir kiekio query; GET paieškos funkcija ir visi esami adresai lieka. Papildomo paieškos lauko vizualioje eilutėje nebėra. Nenaudojami prekybos populiarumo / reitingų modeliai neįjungiami. |
| VF06 | Antroji produkto nuotrauka ir „Greita peržiūra“ rodomos užvedus pelę arba sufokusavus kortelės veiksmą klaviatūra; 16 px pavadinimai išlaiko originalo 600 svorį. |
| VF07 | Panašūs produktai desktop – 3 stulpeliai, mobile – 2; grąžintas galerijos didinimo ženklas, išliekantis keičiant nuotrauką. Originalo rekomendacijų sąrašas dinaminis, todėl fiksuota jo kopija nelaikoma nuolatine taisykle. |
| VF08 | Originalo #276d72 antraštės, Open Sans, 32 px pagrindinės home antraštės, ~142 px mobile viršutinis logotipas ir aktyvaus meniu žymėjimas. Mygtukų / mažo teksto mėlyna kiek tamsesnė skaitomumui; tapatybė išlaikyta. |
| VF09 | Spaudos ir slapukų puslapiuose vienas H1 iš originalios turinio antraštės, 720 px antraštės plotas, 560 px teksto stulpelis ir 16 px / 28,8 px tekstas, patvirtintas palyginus originalo DOM. |

Taip pat grąžintas grįžimo į viršų valdiklis. Užsakymų, Paysera ir dviejų sutartai pašalintų senų puslapių negrąžinome. Šeši nauji aprašymai ir jų metaduomenys nepakeisti.

## Patikros įrodymai

- Dedicated HTTP/source regresija PASS: 26 aktyvūs URL, 160 unikalių vidinių puslapių / failų tikslų. Originalūs kanoniniai adresai, produktų vardai, kainos ir kontaktai išlaikyti; kiti tekstai palyginti su capture, šeši aprašymai su tiksliais review SHA. Pagrindinių puslapių senos nuorodos, query, trailing slash ir legacy ID elgsena patikrinti.
- Pirminė naršyklės partija: 8 puslapiai × 1440 / 390 / 320 px = 24 vaizdai ir 16 pilno puslapio nuotraukų. Toliau – 6 software produktai × 3 pločiai ir du tiksliniai statinių puslapių patvirtinimai po vieno 560 px teksto stulpelio pataisymo. Nėra horizontalios slinkties ar paslėptų aprašymų blokų; po vieną H1.
- Tikri Playwright veiksmai: rikiavimo pasirinkimas ir filtrų išlaikymas, range klaviatūros žingsnis ir tempimas pele, filtro submit, hover nuotrauka / quick view, modalas / Escape, galerija / magnifier, mobilus meniu / originali nuoroda, scroll-to-top. 320 px vienalaikiai teksto tarpų override išlaikė turinį be overflow.
- Rendereris / CSS surinkti esbuild; JavaScript sintaksė patikrinta. Impeccable mechaninės pastabos: Open Sans ir originalo 2 px spalvinis žymeklis prie filtro antraštės – pagrįstos originalo išsaugojimo išimtys.
- Pirmas screenshot timeout išspręstas pakartojant su išjungtomis animacijomis; visos 16 nuotraukų išsaugotos. Pirmas gallery testas klaidingai lygino santykinį ir tą patį absoliutų URL; pataisytas testas, produkto implementacijos dėl to keisti nereikėjo. Pradiniai įrašai išsaugoti.

Įrodymai: `D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/verification.json`, `PREVIEW-VERIFICATION.json` output šaknyje. Originalo nuotraukos lieka atskirame `visual-audit-20261029` aplanke.

- [Pagrindinis, desktop](D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/home-1440.png).
- [Katalogas, desktop](D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/software-1440.png).
- [Planšečių katalogas, telefonas](D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/hardware-390.png).
- [Monitorių kategorija](D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/monitors-1440.png).
- [Spaudos puslapis](D:/Core/output/signaturepads-migration-20261029/visual-restoration-20261029/press-1440.png).

Ribos: tikras browser zoom 200% ir fizinis telefonas nepatikrinti. CDP sintetinis lietimas buvo bandytas, bet naršyklės protokolas neleido prisijungti, todėl jo PASS neteigiame; natyvių slankiklių tempimas pele ir klaviatūra patikrinti. Tai vietinė peržiūra, ne pilnas WCAG, Lighthouse ar production Core admission patvirtinimas. Production email ir paleidimas lieka kitas etapas.
