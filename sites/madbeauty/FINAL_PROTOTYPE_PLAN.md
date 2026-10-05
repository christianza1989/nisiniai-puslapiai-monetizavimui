# Madbeauty — galutinis privataus prototipo planas

2026-10-05. Agent-selected sprendimas po viešos Fresha desktop/mobile ir savininko prisijungusios meistro aplinkos peržiūros. [Kas tikrai apžiūrėta](FRESHA_UX_REVIEW.md), [SEO/GEO](SEO_GEO_PLAN.md), [turinio ryšiai](CONTENT_LINKING_PLAN.md), [būsima app](MOBILE_ARCHITECTURE.md). Šis planas pakeičia ankstesnį mažo 12 meistrų seed pasiūlymą. Mokami atsiliepimai lieka atidėti.

## Produkto sprendimas

Kuriame aiškią grožio paslaugų paiešką ir registraciją klientui, patogią kasdienę darbo vietą meistrui ir duomenų kokybės valdymą operatoriui. Pirmiausia visa privati sąsaja su centralizuotais fiktyviais duomenimis. Realų backend jungiame per sutartis po visų kelių peržiūros; tikras F1 paleidimas ir vėlesnė booking plėtra turi savo verslo, duomenų ir vykdymo vartus.

Fresha yra stiprus orientyras. „Geriau“ čia reiškia patikrinamas produkto hipotezes, ne įrodytą pranašumą. Tikslas: lietuviui lengviau rasti tinkamą procedūrą, suprasti visą trukmę ir gauti aiškų registracijos rezultatą. Nemokami pradiniai profiliai ir naudojimas; infrastruktūra, SMS, žemėlapiai, mokėjimai ir programėlių platinimas neturi išgalvoto neribotai nemokamo pažado.

## Ką perimame ir ką pasirenkame kitaip

| Fresha orientyras | Mūsų prototipo sprendimas | Priėmimas |
|---|---|---|
| Trijų laukų paieška, paslaugos / salonai / specialistai | Paslauga, vieta, data ir intervalas pirmame ekrane; tekstinis autocomplete atskiria bendrą paslaugą nuo konkretaus pasiūlymo. Salonai ir meistrai du rezultato režimai. | Tas pats intent iš homepage, gido, profilio, atgal ir bendrinamos nuorodos. |
| Rezultatų kortelės su konkrečiomis paslaugomis ir laisvais laikais | Kaina, trukmė ir greiti laikai siejami su konkrečiu service variant, darbuotoju, vieta ir snapshot. Laiko paspaudimas pradeda tą patį rezervacijos kelią. | Netelpa visas vizitas — nerodyti sloto. Stale ir kalendoriaus nebuvimas nėra „laisva“. |
| Žemėlapis šalia sąrašo | Desktop sąrašas + pasirenkamas žemėlapis; telefone List/Map. „Ieškoti šioje srityje“ aiškus veiksmas, be tylaus miesto pakeitimo ar privalomo GPS. | Veikia ir be žemėlapio paslaugos; demo scheminis vaizdas nėra tikras žemėlapis. |
| Profilis: galerija, paslaugos, komanda, darbai, praktinė informacija | Salono erdvė atskirai nuo konkretaus meistro darbų. Paslaugų eilutės su aiškiais variantais ir priedais; desktop santrauka, mobile pagrindinis CTA. | Kainos, trukmės, autoriai ir media iš vieno šaltinio; jokio kopijuoto konkurentų turinio. |
| Services → Time → Confirm | Paslauga/priedai → darbuotojas tik jei reikia → laikas → kontaktas ir santrauka → demo patvirtinimas. Galima svečio eiga. | Santraukoje pradžia, pabaiga, galutinė kaina / jos pagrindas ir taisyklės; back nepraranda pasirinkimų. |
| Darbuotojų grafikai, resursai, online booking taisyklės | Organization, Location, Practitioner, Resource ir ProviderService atskiri ID. Viešos darbo valandos nėra automatiškai darbuotojo pamaina. Taisyklės viename availability kontrakte. | Pertraukos, atostogos, uždarymai, kompetencija, lead-time, buferiai, busy ir hold konfliktai. |
| Automatinis waitlist booking ir galimas staff reassignment | Pradžioje atsilaisvinusio laiko pasiūlymas su galiojimu ir kliento patvirtinimu. „Bet kuris“ parenkamas pagal dokumentuotą taisyklę; po patvirtinimo meistro tyliai nekeičiame. | Pranešimas nėra rezervacija; pasikeitus pasiūlymui reikia naujos peržiūros. |
| Onboarding ir pakopinis verslo setup | Solo arba komanda, brand atskirai nuo legal operatoriaus, kategorijos, vieta, paslaugos, grafikas, media, registracijos būdas, peržiūra. Draft/pending/returned/approved skirtingi. | Išorinė registracija leidžia pradėti be migravimo. Klientų importas tik atskirai priimtas vėliau. |
| Automatiniai pranešimai, klientų sąrašas ir ataskaitos | Pranešimų peržiūra su delivery būsenomis; apsilankymai atskirai nuo užklausų, mokėjimų ir įvykdytos paslaugos. Marketing ir service consent atskirti. | Demo outbox neišsiunčia. „Išsiųsta“, „gauta“, „užregistruota“ ir „apmokėta“ nėra sinonimai. |
| Daugybė commerce / retention modulių | Modeliai plėtrai, bet pirmo pilno prototipo meniu koncentruotas į paiešką, vizitą, grafiką, klientus ir pasiūlą. | Neveikianti piniginė, POS, loyalty, produktai, dovanų kortelės, mokami planai ir voice nesimuliuojami kaip įjungti. |

## Keturi paviršiai ir visa navigacija

Mašininis [SCREEN_INVENTORY.json](SCREEN_INVENTORY.json) yra būsimų puslapių / panelių registras; tai nėra esamų veikiančių URL sąrašas. Kiekvienas būsimas ekranas turi normal, loading, empty, validation/error ir permission/stale variantą, kai taikoma. Drawer ar modal nebūtinai turi SEO URL.

**Viešas portalas.** Homepage su paieška, fotografiniu kategorijų ritmu, tikrais eligible pasiūlymais, kaip veikia ir gidais. Paieškos autocomplete, results List/Map, date rail, tikslus intervalas, filtrai, sorting ir pagination. Paslaugų hub, miesto hub ir naudingi service/city katalogai. Solo meistro ir komandinio salono profilis, galerija, paslaugos, variantai, priedai, praktiškos sąlygos. Gidai su konkrečiais paslaugų CTA, redakcija/autoriai ir trust/legal/help footer. Atskiras /meistrams landing rodo mūsų pačių kalendorių ir realias piloto ribas; jokių konkurento klientų skaičių ar sertifikatų.

**Klientas.** Demo role entry, būsimi/buvę/atšaukti vizitai, detalių ir pakeitimo kelias, išsaugoti meistrai, su vizitu susieti demo pokalbiai, asmeniniai/komunikacijos nustatymai, atsiliepimo po demo įvykdyto vizito scenarijus. Paskyra neprivaloma katalogo skaitymui. Atsiliepimai nemokami; fiktyvūs tik privačioje demonstracijoje, nėra Google review schema.

**Meistras / salonas.** Onboarding, apžvalga, kalendoriaus diena/savaitė ir mobile agenda, vizito drawer ir manual vizitas, paslaugos/priedai, komanda/kompetencijos/teisės, grafikai/pertraukos/uždarymai, resursai, klientai ir vizitų istorija, užklausos, waitlist, profilio/galerijos versijos, pranešimų šablonų ir delivery peržiūra, paprastos iš seed apskaičiuotos ataskaitos, išorinės registracijos ir viešos scoped nuorodos. Kalendoriaus drag veiksmas turi alternatyvą klaviatūra ir per laikų laukus; pakeitimas su konfliktu palieka seną vizitą.

**Operatorius.** Approvals ir grąžinimo priežastys, taxonomy ir katalogo eligibility, atsiliepimų/medijos skundų eilė, inquiry/delivery diagnostika, content publikavimo/nuorodų statusai ir per-site matavimas. Viešame puslapyje nėra privačių klientų, kontaktų, grafiko blokų ar operatoriaus reikšmių.

## Duomenys ir laikas

[DEMO_DATA_CONTRACT.md](DEMO_DATA_CONTRACT.md) yra autoritetas: 30 fiktyvių organizacijų (24 solo ir 6 salonai), 42 darbuotojai, 126 paslaugų variantai, 120 klientų, 480 vizitų, 96 atsiliepimai, 24 waitlist ir 30 inquiries. Trys miestai yra struktūros testas, ne pažadas, kad turime teikėjų. Visi vardai, darbai ir sumos fiktyvūs.

UI skaito adapterį, ne seed importą. `demo.enabled` + serverio aplinkos vartas; išjungus nėra fallback į fiktyvią pasiūlą. Vienas seed generatorius, centralizuotas clock, santykinės dienos ir scenarijai; demo duomenų nereikės rankiniu būdu ištrinti iš puslapių. Kainos centais, trukmės minutėmis, UTC + IANA zona. Browser UI jungiklis nėra tikra autorizacija.

## Vaizdinė sistema ir assetai

Savininko atnaujinta Madbeauty kryptis: juoda, balta ir violetinė, DM Sans antraštėms ir valdikliams su LT ženklais, self-host ir OFL. Permatomas sticky blur header pasislepia žemyn ir grįžta aukštyn; detalės bei naujas raster konceptas DESIGN.md. Kalendoriui proporcingas sans, informacijos tankis ir neutralūs paviršiai. Publikuoti nereikia vienodos kortelių sienos kiekvienoje sekcijoje.

[ASSET_PLAN.json](ASSET_PLAN.json) sieja kiekvieną vietą su originalu, crop, alt ir fallback. Paruošti 11 originalių ImageGen master vaizdų: trys nagų stiliai, plaukai, antakiai, blakstienos, pedikiūro erdvė, veido priežiūra, studija, masažo erdvė ir meistro darbo stalas. Foto tinka originaliai redakcinei iliustracijai ir aiškiai privačiam demo; negalima paversti tikro salono, kliento rezultato ar meistro biografijos įrodymu. Portretams pradžioje nuoseklūs initials avatarai, ne fiktyvus realių žmonių tapatumas. Viešas live portfolio turi būti tikro teikėjo media.

Paruošiame vieną originalų SVG wordmark, nuoseklias SVG piktogramas, tokens, buttons/form/selection/status/slot/dialog/table komponentų bazę ir peržiūrimą UI kit. Nepanaudojame Fresha fotografijos, logotipo, tekstų ar programos screenshots kaip mūsų assetų. Gidai turi savo temos vaizdo pasirinkimą. Teisiniai tekstai be dekoratyvios foto. Responsive WebP per esamą MEDIA_CORE; originalai privatiems failams, tik WebP variantai frontendui.

## Įgyvendinimo tvarka

| Etapas | Rezultatas ir baigimo vartai |
|---|---|
| PUI-1 | Nuosavi tokens/icons/fonts/photos, izoliuotas demo adapteris ir clock, scenarijų panelė. Tai foundation, dar ne pilna platforma. |
| PUI-2 | Homepage → search/filter/map → profile → demo booking/inquiry → klientas. Testas iš gido su miesto kontekstu ir netelpančio laiko atvejis. |
| PUI-3 | Meistro onboarding, kalendorius/agenda ir redagavimas, komanda/resursai, operatoriaus approvals. Visi seed ryšiai ir permissions mock patikros. |
| PUI-4 | Trys pilni gidai, legal/trust/help, SEO rendererio ir URL/link resolver sutartys, visi inventoriaus ekranai. Laikini filtrai nekuria indexable Cartesian puslapių. |
| PUI-5 | Visi keliai, desktop/mobile/keyboard, A–Z, tikri vaizdai/srcset, schema ir Lighthouse; faktinės spragos ir score, be 10/10 išgalvojimo. |
| BACKEND | Tikras auth/tenancy, patvarios inquiries ir delivery, vėliau authoritative availability/transactions. Tas pats contract, ne tik API URL pakeitimas. |
| LAUNCH | Patvirtinti tikri faktai/pasiūla, domenas/host/privacy, patvarus kontaktų kelias, demo exclusion, per-site monitoring. Paklausa atskirai nuo UI kokybės. |

## Privalomi scenarijai

- Paslauga + Vilnius + rytoj 17:00–20:00: įtraukti priedai, trukmė ir pasirinkta viso vizito taisyklė, nerodyti per vėlai pasibaigiančio varianto.
- Solo ir salonas su kelių meistrų kompetencijomis; vienas resursas negali būti skiriamas dviem vizitams.
- Nėra laiko / tuščias rajonas / kalendorius neprijungtas / stale source skirtingi atsakymai; aiškus fallback į užklausą tik pagal teikėjo patvirtintą būdą.
- Hold expiry, užimtas slotas, double-submit, pakeitimo konfliktas, atšaukimo/delivery klaida; nėra melagingo success.
- Demo off ir production vartai: nei profilis, nei review, nei rezervacija, nei seed klientas nepatenka į public projection, sitemap, schema, laiškus ar demand metrics.
- Mobile paieška, galerija, CTA, dialogų focus, calendar agenda ir formų klaviatūra; 200 % zoom bei reduced-motion.
- UTC/Vilnius DST ir vienas persiduodantis clock; datos visur tos pačios, ne April2024 iš raster.
- Meistras mato tik savo klientus; salonų roles ir operatoriaus specialios teisės būsimame backend tikrinamos serveriu.

Visi šie scenarijai prieš pilną UI realizaciją PLANNED/NOT_RUN, išskyrus aiškiai įvardytą foundation QA. Local UI priėmimas neįrodo realaus dviejų klientų concurrency, mokėjimų, laiško gavimo, native app ar pelningumo.
