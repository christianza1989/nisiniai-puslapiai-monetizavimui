# Grand Vila vaizdo ir prieinamumo patikra

2026-10-14. Tikra esama produkcinė svetainė. Patikra atlikta per Codex in-app browser ir Chrome computer-use įrankius; naujo rendererio nėra.

| Kelias | Patikrinta | Įrodymai |
|---|---|---|
| Homepage | Desktop DOM 1440 × 900; mobile 390 × 844; mobile meniu atsidarymas. | `artifacts/screenshots/chrome-home-desktop-1440.png`, `chrome-home-mobile-390-confirmed.png`, `home-mobile-menu-confirmed.png`, DOM JSON. |
| Kontaktai | Mobile 390 × 844; formos laukų tipai, etiketės, būtinumai, privacy nuorodų buvimas. | `contacts-mobile-390.png`, `contacts-dom.json`. Žinutė nesiųsta. |
| Pokylių salės paslauga | Desktop pradžia; mobile 390 × 844 aprašymas; 320 px persilaužimas. | `service-desktop.png`, `service-mobile-390.png`, `service-mobile-body.png`, `service-mobile-320.png`. |
| Galerija | Šaltinio ir naršyklės AX inventorius su 121 nuotraukos nuoroda; mobile LH. | Browser screenshot bandymas nutrūko dėl CDP timeout. Visų galerijos vaizdų vizualinė peržiūra **UNVERIFIED**. |
| Tablet | Neatlikta visos sistemos patikra. | **UNVERIFIED**. |
| Tikras 200 % browser zoom ir text-spacing | Nepatvirtintas supported tikro didinimo mechanizmas. | **UNVERIFIED**. 320 px viewport nėra 200 % zoom įrodymas. |

Chrome screenshot gali būti matomo paviršiaus kopija, kurios PNG matmenys nesutampa su emuliuotu viewport. Po viewport keitimo pirmasis screenshot kartais buvo ankstesnio išdėstymo kadras; jis nėra priėmimo įrodymas. Naudojamos pažymėtos confirmed kopijos ir atitinkamas DOM; senieji bandymai palikti archyve. Tikro fizinio telefono, synthesized touch ir visos klaviatūros eigos įrodymų nėra. Browser resize grąžintas į default po 320 px peržiūros.

Pastebėti trūkumai: homepage ir kontaktų baltas mobile logotipas baltame fone; didelis tuščias kontaktų pradžios plotas; paslaugų 14 px Open Sans / 28 px leading tekstas lygiuotas abipusiai ir turi didelius tarpus tarp žodžių. 320 px paslaugos DOM: `innerWidth=320`, `document.scrollWidth=305`, teksto plotis apie 274,67 px; tik toje patikrintoje būsenoje horizontalus overflow neaptiktas.

Forma turi Vardas, El. paštas, Tema, Žinutė placeholder, tačiau neturi susietų matomų label ar aria-label; el. pašto input yra `type=text`; `required=false` visiems matomiems laukams. Tai neįrodo serverinės validacijos nebuvimo – ji nebandyta. Submit, DB ir SMTP veikimo ši patikra nepriima.

Lighthouse radiniai ir kontrasto santykiai yra [LIGHTHOUSE.md](LIGHTHOUSE.md). Kiekvieno puslapio heading/source inventorius yra [URL-INVENTORIUS.json](URL-INVENTORIUS.json). Naujoje versijoje privaloma pilna klaviatūros, menu/lightbox, labels/errors, reduced-motion, 200 % zoom ir text-spacing regresija su tikru atnaujintu turiniu.
