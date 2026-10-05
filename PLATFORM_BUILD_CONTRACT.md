# Didesnės platformos kūrimo sutartis

2026-10-05. Taikyti, kai savininkas aiškiai užsako platformos maketą arba veikiančią platformą. Vien domeno užduotis lieka [pirmos fazės sutartis](CORE_BUILD_CONTRACT.md). Šis dokumentas yra darbo ir priėmimo taisyklės, ne bendras jau veikiančių auth, booking ar hosting API aprašymas.

## Viena aktuali apimtis

`sites/<siteId>/IMPLEMENTATION_STATUS.md` pradžioje laikyti aktualų pavedimą, režimą (maketas / vietinis veikiantis pilotas / production), failų savininką, dabartinį entrypoint ir kitą rezultatą. Roadmap ir projekto README turi nukreipti į šią aktualią būseną. Pasikeitus savininko pavedimui, pažymėti pakeistas ankstesnio plano dalis ir atnaujinti pradžios nuorodas; istorinius testus, maketus ir priėmimą išlaikyti su jų ankstesne apimtimi. Naujam agentui nereikia rekonstruoti aktualios apimties iš viso pokalbio.

Prie pradžios įrašo fiksuoti per-modulio apimtį: savininko pavedimo datą / šaltinį, autorizuotus modulius, darbo režimą, dar neįjungtas gyvas operacijas, priėmimo dokumentą ir source versiją. Šis registras dokumentuoja gautą autorizaciją; jis negali pats suteikti naujų leidimų. Nevadinti jo įgyvendintu runtime admission mechanizmu, jei tokio kode nėra.

Madbeauty savininkas autorizavo vietinį email-only meistro / kliento backend. Ankstesnis frontend-only planas šio darbo neberiboja. Tai nėra kitų nišų plėtros ar viešo paleidimo leidimas.

## Bendras core ir verslo modulis

Bendrai naudoti turinio paketo / review / release / publikavimo projekciją, host izoliaciją, SEO/GEO helperius, media importerį ir kontaktų šaltinį. Konkretus modulis valdo savo paslaugų taksonomiją, roles, narystes, pasiūlą, availability, rezervacijas ir jų verslo taisykles. Visur tas pats siteId; kitų nišų privatūs duomenys nepasiekiami.

Prieš platesnį įgyvendinimą aprašyti tik reikalingas sąsajas: įvestis / išvestis, ID, serverinį leidimų tikrinimą, klaidas, laikrodį / timezone, idempotency ir persistence. Įvardyti faktinį adapterį bei nepajungtas priklausomybes. Node SQLite vietinis priėmimas savaime neįrodo Cloudflare D1/Workers suderinamumo. Migracijos sprendimas turi realaus deploy runtime patvarumo ir konkurencinių operacijų bandymus; ne vien pakeistą connection URL.

Adapterio priklausomybių sąrašą ir bendrų šaltinių versiją / hash fiksuoti prieš integracijos bandymą. Minimalus isolated importas turi veikti su tikromis aktualaus importerio priklausomybėmis; V1 paketas nereiškia, kad bendras validatorius neturi kitų schemų priklausomybių. Paketo validavimo klaidą tirti pagal actual klaidą, nepildyti homepage nereikalingu tekstu vien dėl skaitinės kvotos. Patikrinti bendro turinio modelio tinkamumą platformos puslapio paskirčiai; runtime validatoriaus keitimą vykdyti tik atskirame suderintame lange su regresijomis.

Shared failus keisti tik suderintame WORKSTREAMS lange. Nekopijuoti SEO/scheduler/media variklio į kiekvieną domeną; jei integracija dar neprijungta, dokumentuoti konkretų trūkstamą adapterį. Į bendrą core kelti pakartotinai pagrįstą kontraktą ar helperį, o ne visą vienos nišos UI ir verslo modelį.

## Ankstyvas veikiantis kelias

Pilnas dizaino ir ekranų inventorius išlieka užsakymo dalis. Veikiančiai platformai anksti patikrinti vieną visą kelią: teikėjas prisijungia → įrašo pasiūlą / grafiką → klientas suranda → atlieka veiksmą → abi rolės mato tą patį serverio ID → reload / restart išlaiko. Tai mažina riziką masiškai statyti sąsajas pagal netinkamą duomenų modelį. Maketo užsakymui naudoti keičiamą adapterį ir aiškias ribas, ne apsimesti jau veikiančiu backend.

Ekranų inventoriuje prie kiekvieno paviršiaus nurodyti rolę, paskirtį, veiksmą, duomenų šaltinį ir taikomas loading / empty / error / stale / conflict / success būsenas. Bendras panelis ar ekranų skaičius nėra pilno produkto priėmimas. Galutiniai produkto tekstai ir keičiamas seed pagal [DEMO_DATA_POLICY](DEMO_DATA_POLICY.md); actual testinius duomenis laikyti izoliuotai, išjungus jų negrąžinti kaip tikros pasiūlos fallback.

Savininko pasirinktas homepage nustato viso produkto vizualinės kokybės kartelę: vientisi brand tokens, tipografija, tarpai, ikonų kalba, valdikliai ir vaizdų kokybė taikomi ir vidiniams prisijungusių rolių ekranams. Search / profile / booking / account / workspace / operator / editorial / legal paviršiams kurti paskirčiai tinkamas kompozicijas. Vien spalvų perėmimas ar homepage išvaizda neįrodo jų kokybės; priėmimas remiasi jų actual desktop/mobile vaizdu ir sąveika pagal builder / impeccable instrukcijas. Nedeklaruoti visų paviršių vizualinio PASS vien pagal pirmą homepage.

Savininko įvardytą analogą išlaikyti visų pagrindinių kelių tyrime ir priėmime. Madbeauty atveju tai Fresha: search / service-city-date-time filtrai, salonų ir meistrų profiliai, booking, klientų paskyra, onboarding ir partnerių workspace / kalendorius. Savo tyrimo dokumente kiekvienam keliui nurodyti apžiūrėtą ekraną / datą ir šaltinį, pritaikytą arba atmestą sprendimą, pasirinkto pagerinimo naudą ir actual Madbeauty patikrą. Nepasiektos prisijungusios dalies nežymėti apžiūrėta; vartotojo screenshot atskirti nuo actual naršymo. Fresha UX tyrimas nepakeičia pasirinkto Madbeauty dizaino ir nesuteikia teisės kopijuoti jos brand, tekstų, klientų ar medijos. „Geriau už Fresha“ negalima laikyti patikrintu rezultatu vien iš agento nuomonės.

## Patikra pagal riziką

- [ ] Auth ir narystės tikrinamos serveryje; kito naudotojo / organizacijos duomenų read/write bandymai atmetami.
- [ ] Svarbus verslo veiksmas patvarus ir atominis. Rezervacijoms tikrinti visą intervalą / buferius, konkurencines užklausas, pakartojimą, cancel ir reschedule; serveris atmeta pasenusį pasiūlymą.
- [ ] UI, paieška ir paskyros skaito tą patį autoritetingą modelį; tikras browser kelias sutampa su HTTP / storage įrodymu ir išlieka po restart.
- [ ] Test / real duomenys ir medija izoliuoti; production exclusion įrodoma atskirai. Galutinis produkto copy nesuteikia tikrumo fiktyviems profiliams ar portfolio.
- [ ] Asset planas turi konkrečią paskirtį, įvairovę ir actual importo / peržiūros progresą. Vien promptų ar pakaitinių to paties vaizdo crop nepakanka; taikyti MEDIA_CORE.
- [ ] Vieši provider / katalogo faktai turi atskirą patvirtintos revizijos projekciją. Redakcinis straipsnio approval automatiškai nepatvirtina tiekėjo profilio, kainos, grafiko ar atsiliepimų.
- [ ] Turinio intake tikrinamas pagal CONTENT_CORE ir CONTENT_READINESS: draft privatus, imported release, prieš / po publishAt, nuorodos, medija ir aktualios SEO/LLM išvestys. Kalendorius ar export nėra deployment.
- [ ] Prieš masinį turinio generavimą vienas pilnas gidas pereina šį kelią; izoliuotai patikrinti ir revoke, atšaukto tikslo nuorodas bei unknown host. Negative bandymai nekeičia tikrų tenant duomenų.
- [ ] Asmeniniai ekranai, rezervacijos ir laiko kombinacijos neindeksuojami; SEO katalogų URL turi naudingą turinį, realią eligible pasiūlą ir bendrų helperių įrodymus pagal nišos URL planą.
- [ ] Actual desktop / mobile / keyboard ir reikšmingos klaidų būsenos tikrinamos kiekvienam svarbiam keliui. Vienos homepage Lighthouse rezultatas nepriskiriamas visai platformai.
- [ ] Testinė pranešimų saugykla, SMTP siuntimas ir gavimas skiriami. OTP / sekretai nepatenka į viešą UI, API, logus, Git ar QA artefaktus; laikytis esamo pašto kontrakto.

Kiekvienas taikomas kriterijus turi PASS / FAIL / UNVERIFIED / NA su komanda ar naršyklės įrodymu ir tikslia source versija. Tai platformos papildymas prie taikomų niche-site-audit kriterijų, ne jų pakeitimas ar automatinis balas. Madbeauty konkretūs backend vartai: [MADBEAUTY_BACKEND_ACCEPTANCE](docs/MADBEAUTY_BACKEND_ACCEPTANCE.md).

Naršyklės / Lighthouse įrodyme fiksuoti actual URL, pasirinktą tabą, išmatuotą viewport, prisijungimo rolę ir duomenų režimą. Prisijungimo puslapio balas nėra darbo kalendoriaus balas; viewport nustatymo komanda be išmatuoto lango pločio nėra mobile patikra. FAIL → taisymas → retest saugoti atskirais įrodymais, nekeisti seno balo ar screenshot. HTTP Host izoliacijai naudoti transportą, kurio actual Host header patikrintas, ne numanytą browser fetch override.

## Vietinis rezultatas, paleidimas ir pamokos

Vietinis funkcionalumas, pilnos sąsajos kokybė, production adapteris / hostingas, tikras email pristatymas, viešas deployment ir komercinė paklausa yra atskiros būsenos. Savininko užsakytą vietinį darbą užbaigti autonomiškai; trūkstamų paleidimo faktų neišgalvoti. Produkto modulis ir jungiklis nėra jau įjungta gyva operacija.

Po reikšmingo integracijos etapo agentas įrašo `sites/<siteId>/CORE_FEEDBACK.md`: patirta problema, source / bandymo įrodymas, vietinis sprendimas, siūlomas bendras taisyklių arba kodo pakeitimas ir patikra. Hipotetinį patobulinimą atskirti nuo patirto defekto. Root peržiūri ir perkelia tik bendras pamokas, neperrašo agento istorinių rezultatų ar failų lygiagrečiai. Naujo kontrakto tekstas nėra jo įgyvendinimo visose senose svetainėse įrodymas.
