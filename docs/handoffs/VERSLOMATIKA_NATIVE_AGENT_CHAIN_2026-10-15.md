# Koordinatoriaus pavedimas ir esamas agento bandymo kelias

Tęsiamas [grandinės integravimo paketas](VERSLOMATIKA_CHAIN_INTEGRATION_2026-10-15.md). Kitų repo integravimas atidėtas savininko prašymu. Šis paketas prijungia vieną aiškų savininko scenarijų prie esamų Task, lab ir Quality; nekuriama kita kalibravimo sistema.

## Įgyvendinta ir patikrinta

Savininko `team/agent-tests` užklausa parenka tik jau išsaugotą nuosavo verslo agentą ir tikslią redakciją. Galimos 1–8 normalizuotos kliento žinutės arba pirmas išsaugotas pavyzdys. Atskiras kanoninio snapshot preflight užbaigiamas prieš admission/Task užraktus. Tas pats priimtas UUID pirmiausia sutaikomas su istorija, nesukuriant kito pavedimo.

Vienas native-only allowance pakeičia įprastą trijų kvietimų rezervą. Užfiksuojami konkretūs scenarijaus, įvesties, Quality ir High profilio hash. Esamas worker vykdo native lab ir nepriklausomą Quality, o rezultatas grįžta į tą patį pokalbį per 0041 tikrų kvitų kilmės patikrą. Papildomas įprastos rolės Attempt neklastojamas. Apskaita perskaito tikrus native usage kvitus vieną kartą; nežinoma piniginė kaina lieka nežinoma. Atšaukimas išsaugo jau panaudotus kvietimus ir neleidžia paskelbti pavėluoto atsakymo.

Senesnis planas be High profilio lieka skaitomas su nepatvirtintu profiliu, bet nesuteikia naujo High kvietimo leidimo. Netinkamai bendrajai temai grąžinamas aiškus403 prieš native preflight. Didesnė Unicode kūno riba taikoma tik naujam scenarijaus endpoint; kitos team užklausos išlaiko ankstesnę ribą.

## Bounded įrodymai

| Tikrinta | Faktas |
|---|---|
| Galutinis koordinatoriaus API/worker | 7 PASS / 129.64 s, švarus source `cda4a596e00190e143cdbdfe918e945319a8e227` |
| Native allowance ir 0041 provenance | 27 PG PASS / 209.22 s, užfiksuotas f81 source |
| High ir caller jungtinis paketas | 13 PG PASS / 344.94 s, užfiksuotas877 source |
| Riboti offline/controller kontraktai | 60 PASS / 0.91 s ir Ruff PASS |
| Nepriklausoma peržiūra |Du konkretūs P2: senesnio profilio istorija ir netinkamos temos klaidos atsakymas; abu pataisyti su actual API regresija |

Originalūs nesėkmingi bandymai neperrašyti. QA naudoja tikrą restricted PostgreSQL, autoritetą, modelio argumentų sudarymą, native įrašus, patikras ir apskaitą. Tik provider transportas yra inertinis: šie PASS neįrodo mokamo modelio semantinės kokybės. Legacy tekstinio/Quality core suderinamumo su High praplėtimu cohortai bei helper release gate fiksuojami atskirai.

## Priėmimo ir tęsinio riba

Tai vieno scenarijaus bandymas, ne pilnas agento kalibravimas ar įjungimas. Baseline, protected holdout, palyginimas, Config-bound sprendimas, admission, pritaikymas/rollback ir tikri kanalai lieka esamo kalibravimo core vartais. Universalių buhalterio, reklamos ir kitų profesijų integracijų leidimai iš šio scenarijaus neatsiranda.

Ankstesnis API18871/UI3030/Studija prievade `4319` ir devynių puslapių privati svetainė išsaugoti. Nauja schema ir UI priimami atskiru dokumentu po duomenų kopijos ir procesų quiescence patikros. Faktai, Foundation, redakcinis approval, release, domenas ir tikri išoriniai kanalai dar nėra priimti. Main merge ir kito PC pritaikymas nefiksuojami iš vietinio PASS.

## Faktinis vietinis pritaikymas ir svetainės suvestinė

2026-10-15 priimtas švarus vietinis API šaltinis `5309c1d2d0178c5c727ae73909b90a8acd94f841` prievade `18871`, atskiroje darbo kopijoje `verslomatika-site-context/CORE_SHARED`. UI prievade `3030` naudoja portal `d84100b8d4e141935806be516d6d87768078b38e`, build `ph3oE7XuXrCn4bHw01NIB` iš `.local/workspace-native-agent-reviewed-next`. Studija prievade `4319` ir stabilūs svetainės artefaktai palikti savo ankstesnėje darbo kopijoje. Viešo companion šaltinis `1a26f289092cecadc5799de898e809dc1769498a`.

Prieš pirmą pritaikymą0039→0041 išsaugotos 82 ankstesnės lentelės ir jų duomenys; naujas nullable provenance laukas išskirtas tik palyginimui. Prieš dabartinį 0041 schemos šaltinio pakeitimą pakartotinai patikrintos visos 84 lentelės, visų savininkų aktyvios eilės buvo tuščios, išsaugota atskira kopija, ankstesni duomenys nepakito. Originalus 0032 DB liko nepakeistas. API neturi admin prisijungimo, leidžiamas vienas ankstesnis sintetinis savininkas, kanoninis High profilis; bendras chat actor/day limitas 12, Creation 36 / global 34 / per-case 3 liko nepakeisti. Išoriniai kanalai neįjungti.

Esamo priimto Creation administracinė registracija atlikta per kanoninį vietinį provision kelią, su tikra savininko Session ir nepakitusiu priimtos redakcijos įrodymu. Dabartinis Creation candidate yra `f04425e9e2683c886145749f720dfc3a8c6b402f3e3ded4311513b531658ac25`; Discovery kandidato hash nėra šio Creation kandidatas. Verslas matomas paprastai kliento paskyrai. Tai nesuteikia faktų, public-source, Foundation ar vykdymo admission.

Tikras pirmas ordinary team bandymas sustojo `runner_unavailable`: privatus paleidimas neperdavė absoliutaus chat darbo aplanko. Originalus nesėkmės įrašas ir nežinomas usage palikti. Privatus paleidimas pataisytas, o bendras S25 readiness dabar tikrina tą pačią kanoninę runner konfigūraciją prieš priėmimą ir Attempt. Neprofiluotas Luna/Medium vykdymas po pasirinktu High atmetamas per ankstesnį atskirą policy paketą.

Pirmas tikras pakartotas coordinator→adviser→synthesis darbas sėkmingai baigėsi su trimis `gpt-6.1-sol/high` kvietimais ir 41 088 įvesties / 2 095 išvesties tokenais; kaina nežinoma. Jis parodė kitą spragą: komanda matė tik registraciją, todėl prašė jau platformoje saugomų puslapių. [S26 jungtis](../../agent-business-core/runtime/WORKSPACE_TEAM.md) dabar perduoda vieną tikslios redakcijos, tik skaitymui skirtą svetainės suvestinę visoms trims rolėms. Dabartinės ir istorinės approval redakcijos atskiriamos pagal tikrą hash; nei review, nei admission vartai nekeičiami.

Tikras S26 UI darbas užbaigė visas tris roles su tuo pačiu snapshot `e4ed896dd18701e0a7b2a521f6cd554928e19f642af58b8b2ebad2a8478a0ba8`: 9 pateikti puslapiai, 0 praleistų. Priimtas site context `a9e53d49cdc7d010723eca1e99577f1a6bb0fa687cc73cbef380cb440aad7828` nepakito. Stebėta 58 960 įvesties / 1 781 išvesties tokenų; 676 mąstymo tokenai įtraukti į naudojimo kvitą; piniginė kaina nežinoma. Tikri atsakymai, užduoties būsena ir apskaita išsaugoti tame pačiame chate. Privati ekrano kopija `native-agent-real-website-context-20261015.png` atskirta nuo sintetinių UI fixtures.

S26: 28 restricted-PG PASS / 353,29 s ant frozen b8; galutinio approval-hash pataisymo native workflow 1 PASS / 18,70 s ant 5309;146 unikalių workspace offline PASS / 1,00 s ir Ruff. Vieno scenarijaus pakartojimas bei mažesni cohortai nėra pridedami kaip nauji unikalūs testai. S25 turi 24 skirtingus native atvejus per atskirai aprašytus 21 PASS / 3 setup errors, 1 PASS / 2 FAIL ir galutinius 5 PASS / 41,06 s; originalūs rezultatai palikti. Tarpinės trys intake klaidos buvo naujos QA darbo kopijos nenurodytas companion, dvi preparation klaidos – neparengta inertinio runner fixture konfigūracija; vartai ir assertions nesumažinti.

## Dar neužbaigta grandinė

Visų devynių puslapių turinys jau yra native studijoje, 20 atskirų responsive medijos failų ir 25 vidinės nuorodos prijungti. Tai failų ir ryšių įrodymai, ne vaizdų kokybės patvirtinimas. Kanoninė gyva suvestinė vis dar rodo neišspręstas faktų pastabas ir trūkstamą redakcinę peržiūrą; trijuose giduose nėra autoriaus snapshot, dviejuose puslapiuose yra 5 nepatikrinti šaltinių įrašai (3 skirtingi URL). Toliau reikia perskaityti faktinį turinį/šaltinius, peržiūrėti vaizdus ir desktop/mobile rezultatą, tiksliai sutvarkyti žinomas pastabas, po to atlikti tikrą review ir atominį approval per esamą bendrą workflow. Vien GUIDE writer pakartojimas šių vartų neuždaro.

`.test` prototipo Foundation nepervadinamas tikru vietinio verslo admission. Tikri verslo faktai, kontaktų/vykdymo pajėgumas, pilnas editorial/Foundation, protected kalibravimas, actual adoption/rollback, išorinių kanalų prijungimas ir viešas paleidimas tebėra atskiros likusios užduotys. Šis perdavimas nepatvirtina visos platformos baigtumo ar main merge.
