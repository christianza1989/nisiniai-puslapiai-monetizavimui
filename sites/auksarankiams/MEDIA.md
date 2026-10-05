# Vaizdų ir šriftų kilmė

Keturi originalūs ImageGen vaizdai peržiūrėti prieš importą; exact prompts — media-handyman/prompts.json. Ne klientų projektai, ne gamintojo instrukcijos ar išmatuotos detalės. Kilmė saugoma MEDIA-REVIEW.json ir redakcijoje, prie originalų nėra generatoriaus ženklelių. Trečiųjų šalių fotografija nenaudota.

Bendras saveResponsiveAsset per image-pipeline sukūrė 20 WebP (360/640/800/1200/1536), originalai išsaugoti privačiai. qa/MEDIA-BINARY-VERIFICATION.json patvirtina decoding, dimensions, kiekvieną SHA-256, EXIF nebuvimą ir no-upscale. qa/HTTP-AUDIT patikrino tikras srcset šeimas/URL; BROWSER-VERIFICATION — currentSrc ir natūralų dydį. Homepage turi hero ir tris gido vaizdus, indeksas tikras kiekvieno gido miniatiūras, visi trys gidai — skirtingą temos vaizdą. Trijų poreikių kategorijų foto pateikia atitinkamą darbo kontekstą.

Apie/redakcija/privatumas/sąlygos/kontaktai — pagrįstos tekstinės išimtys, kiekviena inventoriuje. Nenaudojame foto kaip fiktyvaus autoriaus veido ar juridinio pasitikėjimo įrodymo.

Bricolage Grotesque savarankiškai laikomas fonts/auksarankiams; SIL OFL ir oficialių Google Fonts šaltinių žurnalas — FONT-PROVENANCE-HANDYMAN.json. Atsisiųsti failai yra TrueType, nors vietiniai paveldėti vardai baigiasi .woff2: CSS teisingai deklaruoja format('truetype'), visi trys realūs FontFace browseryje loaded (qa/CONTRAST-CONTROLS). Negalima jų vadinti WOFF2 kompresijos įrodymu. system-ui body neprideda atsisiuntimo. Lietuviškos raidės peržiūrėtos realiuose pavadinimuose. Prieš production patikrinti font MIME/cache; tai nėra nauja mokama priklausomybė.
