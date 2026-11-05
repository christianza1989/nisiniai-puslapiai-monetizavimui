# Tekstų tikrinimas produkto puslapyje

Mode: Operate. Prižiūrimas esamas Manrope, miško žalios ir baltos tapatybės administratoriaus įrankis.

2026-11-05 22:10 naujausias Roko pavedimas išplečia apimtį visiems produktams: struktūrinių pasirinkimų sąrašuose rodyti turimą lietuvišką pavadinimą ir visą patvirtintais šaltiniais pagrįstą pasiūlymą. Administratorius papildomai mato kodą. Tai pakeičia ankstesnę vienos Bjarg kėdės rodymo ribą. Spalvų pavyzdžių ir tikrų pasirinkimų priklausomybių nekeisti. Gamintojo techninio lapo QC/QE/Power Frame ir išsaugoto konfigūratoriaus konteksto ryšiai sutvarko porinius kabelių įvadus bendriems stalams; nežinomų kitų kodų reikšmių neišgalvoti. Anoniminių lankytojų duomenyse gamintojo kodai lieka paslėpti.

2026-11-05 22:05 naujausias Roko bandymo patikslinimas: vienos Bjarg kėdės išskleidžiamame sąraše pradžioje rodyti visą jau parengtą paaiškinimą; prisijungusio administratoriaus peržiūroje kartu rodyti mechanizmo kodą. Vėliau informacijos kiekį bus galima sumažinti. Anoniminio lankytojo duomenyse gamintojo kodai lieka paslėpti. Šis pakeitimas neplečia bandymo kitoms kėdėms.

Administratoriaus juosta su produkto pažanga ir veiksmu įjungti redagavimą. Ekrane pasirinktas tekstas pažymimas; skydelis dešinėje rodo esamą variantą, turimus originalus ir vieną redaguojamą pasiūlymą. Pirmas veiksmas – išsaugoti arba patvirtinti; paskelbimas atskiras. Sąrašas skydelyje leidžia pasiekti ir tuo metu nepasirinktų opcijų tekstus. Tinkamus tekstus galima patvirtinti vienu aiškiai apibrėžtos peržiūros partijos veiksmu.

Viešas turinys ir įprastas konfigūravimas išlaikomi. Telefone įrankis naudoja visą plotį, o grįžimas į produktą išsaugo redagavimo kontekstą. Matoma uždarymo priemonė, Escape, klaviatūros fokusas, 44px veiksmai, 16px įvedimas. Naršyklės išsaugojimo klaidos nevaizduojamos kaip sėkmė; konfliktas parodo, kad reikia atnaujinti tekstą. Tikra DB ir išsaugota versija yra pažangos autoritetas.

Targets: src/components/text-review-provider.tsx, src/components/text-review-panel.tsx, src/app/text-review.css, src/app/admin/tekstai/page.tsx.

2026-11-05 Roko apimties patikslinimas: naujas mechanizmų pasirinkimo rodymas bandomas tik viename Bjarg modelyje KBJA001WW002, tik tekstų peržiūros aplinkoje. Išskleidžiamame sąraše kiekvienas variantas turi trumpą lietuvišką funkcijų paaiškinimą; platesnis pasirinkto varianto paaiškinimas pasiekiamas per „Daugiau apie pasirinktą mechanizmą“. Lankytojo ir administratoriaus rodinys naudoja tą patį komponentą, o visas paaiškinimas išlieka taisomas TVS. Kitų modelių rodymas nesikeičia. Bandymas remiasi naujausiu paruoštų modelių katalogu ir nekeičia jo atrankos.

2026-11-05 Roko pavedimas: bandomojoje ergonomic-text-review svetainėje po pasirinktu konfigūratoriaus variantu rodomas 1–2 sakinių lietuviškas paaiškinimas. Jis keičiasi kartu su pasirinkimu ir taisomas vietoje tuo pačiu TVS redaktoriumi. Naudojamas esamas Manrope kūno teksto vaidmuo (14px/1.6, #314c43); valdiklių ir antraščių sistema nekeičiama. Paaiškinimas susietas su select per aria-describedby. Anoniminiam lankytojui perduodamas tik tekstas, be gamintojo kodų ar šaltinių nuorodų.

Paaiškinimų bendrinimo riba: kėdės/stalai + laukas + tikslus gamintojo originalas + patikrintas paaiškinimas. Vienas kodas ar vienodas viešas pavadinimas nėra bendrinimo įrodymas. Administratoriaus /admin/paaiskinimai/ sąrašas turi paiešką, kėdžių/stalų filtrą, nuorodą į produktą ir gamintojo šaltinį. Tikros svetainės rodymas neįjungiamas. Nežinomam naujam mechanizmui iš originalo automatiškai perkeliamos tik aiškiai nurodytos funkcijos; be jų inventorius žymi spragą ir nekuria išgalvoto paaiškinimo.
