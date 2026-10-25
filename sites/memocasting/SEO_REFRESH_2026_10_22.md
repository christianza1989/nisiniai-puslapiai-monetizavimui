# SEO plano įgyvendinimas — 2026-10-22

Savininkas autorizavo seno turinio / techninių klaidų pataisas, aštuonių P0 straipsnių sustiprinimą ir tikrą publikavimą. Pagrindas: 2026-10-22 auditas ir 21 temos planas. Šis failas yra vykdymo įrašas; neužbaigti punktai nėra PASS.

## Partija

- [x] Devyni papildomi prasmingi seni adresai sutaisyti. Visi13 naujų ir ankstesnių allowlist nukreipimų tikrinti viešai GET/HEAD:301 → atitinkamas200. Pasitraukusiems produktams, pašalintai EN versijai ir nepakeistoms senoms kategorijoms nėra sukurto klaidinančio nukreipimo į pradžią.
- [x] Product / Offer gauna tikrą paskelbto katalogo kainą ir pardavimo tinkamumą; neveikiantis ar testinis ryšys nesukuria tariamo gyvo pasiūlymo. Viešai patikrinta32.00/48.00EUR,InStock,abiejųcanonical.
- [x] Aštuoni P0 gidai perrašyti tame pačiame URL.13 skirtingų kitų pardavėjų pasiūlymų, patikrinti pirminiai šaltiniai, kainos ir ribos, originalios pasirinkimo priemonės.676–810 žodžių pagrindinio teksto; žodžių skaičius nėra kokybės kriterijus.
- [x] Atskirai sustiprinti2 jau suplanuoti bendri gidai: dovanos mamai ir dovanos moterims. Mamos gide atskirai atsakyta į personalizavimo,50-mečio,rankų darbo,jaunos/vyresnės mamos ir didesnio biudžeto klausimus; jie yra6 istorinių straipsnių semantinis tęsinys.
- [x] Išlaikyta10 skirtingų originalių hero ir pridėtos4 naujos peržiūrėtos scenų iliustracijos /20 responsiveWebP variantų. Kiekviename atnaujintame gide2 vaizdai. Nė viena sugeneruota scena nepateikta kaip konkretaus pardavėjo SKU,dirbtuvių ar tikro kliento darbo dokumentinė nuotrauka.
- [x] Native redagavimas, kiekvienos tikslios revizijos6 sričių peržiūra ir atominis10 puslapių patvirtinimas. Kiti171 paketo puslapiai identiški ankstesniems. Kitų10 svetainių generuoto registro įrašai identiški.
- [x] Tikras HTTPS leidimas, schema, sitemap, LLM failai, senų URL, vaizdų ir desktop/mobile patikros. Naujas frontend25712c28-54a9-4a77-ae0d-68b66da0774a aktyvus; deployment nėra sprendžiamas iš lokalaus eksporto.

## Teksto pateikimo patikros planas

Išlaikoma balta / Manrope / rožinio akcento sistema. Prozos vaidmuo 1rem, iki68ch; h1 / h2 ir valdiklių dydžiai nemažinami. Naujas ilgesnis tekstas skaidomas į trumpus prasmingus H2/H3, pasirinkimų sąrašus ir nuotraukas. Greita pasirinkimų santrauka turi būti prieš ilgą TOC / pagrindinį vaizdą. TOC turi likti klaviatūra pasiekiamas; mobile nereikia kelių ekranų bendrų patarimų iki pasirinkimo.

Tikrinama: ilgos LT antraštės, kainos, nuorodų linksniai, ąčęėįšųūž, 320 /390 /1280px reflow, teksto didinimas ir tarpai pagal canonical typography sutartį, faktinės nuotraukos ir atidaromi turinio skyriai. Actual vaizdų / įrodymų sąrašas bus užpildytas po patikros; vien šis planas nepatvirtina pateikimo.

## Išlaidos ir operacinės ribos

Naujų mokamų Treg / generavimo CLI / mokamų partnerystės paslaugų nejungiame. Built-in ImageGen užsakytai medijai; kitų rinkinių, siuntų, Stripe ar privačių vartotojų duomenų nekeisti. DPD lieka atidėtas. Publikuoti pasirinktą pataisytą partiją dabar pagal naują pavedimą; likusio turinio kalendoriaus nekeisti be konkrečios priklausomybės. Paskelbimas, GSC priėmimas ir tikras indeksavimas bus žymimi atskirai.

## Tikslus turinio ir paleidimo rezultatas

Parengta / peržiūrėta / eksportuota / faktiškai įkelta: **8 P0 +2 istorinio turinio priklausomybės**. Tai10 pakeistų esamų URL, ne10 papildomų dubliuojančių straipsnių. Iš jų7 jau buvo vieši; šiame autorizuotame pataisų leidime iš ankstesnės ateities eilės perkelti tik nebrangių dovanų ir2bendri gidai, į faktinį2026-10-22T19:20:55.005Z laiką. Joks kitas kalendorius ir tikros senų publikacijų datos nepakeisti. Ši vienkartinė istorinių URL pataisų partija neįjungia kasdienio masinio skelbimo ar naujo schedulerio.

Native release `65fd3278-fe56-4bfb-b7c6-7b8b41ef8f3c`,181pages/777assets,packageSHA256 `88f6bd82a3eb840594144bef0f800d674b883f571993dce661435e43e7312645`. Dabartinė vieša projekcija107puslapiai, iš jų103 indeksuojami; visų74ateities URL nėra sitemap ir LLM failuose. Ateities puslapis404, jo išskirtinis vaizdas404, kitos svetainės vaizdas404. Visi20 naujų viešų vaizdų tiksliai sutampa SHA256 su patvirtintais failais. Visų10 gidųHTML200,teisingascanonical,ArticleJSON-LD,veikiančios kontekstinės nuorodos ir santrauka prieš hero. AbuProduct/Offer tikrinti tikrame domene.

180 PUBLIC testų,TypeScript,build,pinnedWranglerdry-run PASS. ScopedESLint0klaidų,1ankstesnis nenaudojamoMemoAddimporto įspėjimas. Tikras vietinis viešo rendererio vaizdas tikrintas visiems10gidų390px; mamosdesktop ir klaviatūrosTOC;320px su200%tekstu ir WCAGtarpų bandymu – be horizontalaus slinkimo. Paveikslų originalūs pikseliai peržiūrėti prieš native importą. Po publikavimo pakartotinai patikrintas tikras viešas straipsnis.

Pilnas senasis `seo-core-smoke` nėra deklaruojamas PASS: jo unknown-host tikrinimas vietiniame Wrangler/dev preview grąžina200; tikras atnaujintų URL/native laikų/medijos/LLM/robots/sitemap kelias patikrintas atskirais nurodytais HTTP įrodymais. Preview `.dev.vars` ir localhost host elgsena nėra produkcijos nežinomo domeno priėmimas. Nežinomo produkcijos domeno ranka neprisegėme ir kitų domenų TLS nekeičėme. Esamas source host guard nebuvo keistas. Ši riba išsaugota originaliuose QA žurnaluose, nepakeičiant nepraėjusių tikrinimų į PASS.

Actual Cloudflare prieš/po: ASSETS,leadsDB,MEMO_COMMERCE,MEMO_INSTAGRAM,compatibilitydate/flags ir visas observability išsaugoti. Backend `380e46b2-9955-4feb-b604-8c1dce26fdd2` ir viešas katalogas identiški. NebuvoDBmigracijos,užsakymo,mokėjimo,siuntos,sekreto,DNSarcron pakeitimo. Generated adapterio config prieš realų deploy sutikrintas su actual4bindings ir2customdomains; lokalusNICHE_DEV_SITE_ID neįkeltas. Upload21629.33KiB/gzip2703.38KiB;startup202ms.

Privatūs įrodymai: `qa/seo-refresh-20261022/` – originalios nesėkmės,13pasiūlymų faktų registras,promptai/originalai,native exactreview/release,local/hosted/discovery acceptance,actualpre/postflight ir browser screenshots. Tyrimų snapshot48 ankstesnius įrašus išsaugo ir prideda13aiškiai pažymėtų vietinių pirminių puslapių peržiūros įrašų; mokamų call0.

Rollback: pirmiausia iš naujo perskaityti actualsettings ir išsaugoti intervening owner writes. Frontend prieš leidimą `b46c7cd0-d9eb-408b-9c71-e8e56fad40b6`,ankstesnis nativepackageSHA `dd5f50b1ae41043323ebc510eb820d0240de64bb0c1a92dd24ab99ddb227a34e`. Grąžinamas tik tikslus frontend/code/content leidimas; backend,užsakymai,Stripe,mail,DNS ir kiti duomenys neatkuriami iš senos kopijos. Senieji ir naujieji nekintami medijos failai išsaugoti.

## Google priėmimas

2026-10-22 memocasting.lt domain property pašalinta10 senų Shopify/XML ir klaidingų HTML sitemap pateikimų; likęs dabartinis `https://memocasting.lt/sitemap.xml`. Pašalintas pateikimas nėra puslapių šalinimas iš Google, atkuriamas pakartotinai pateikiant URL. Productklaidos „Reikia nurodyti offers,review arba aggregateRating“ spartusis pradinis tikrinimas priimtas: **Patvirtinimas pradėta,2026-10-22**. Sitemap pakartotinis pateikimas patvirtintas UI **„Svetainės schema pateikta sėkmingai“**, pateikimo data2026-10-22. Viešas XMLdabar103URL, tačiau GoogleUIkolkasrodo seną85URLnuskaitymą iš10-15; tai nėra103URLindeksavimo įrodymas. GalutinėGooglepatikra ir paieškos indeksavimas dar nėra patvirtinti.

Pakartotinis visų51 istorinių GSCadresų HTTPcrawl po leidimo:40 baigiasi200,11–404,0transportoklaidų. Devyni buvę404atkurti tikrais semantiniais301. Likę11priklauso pašalintaiENversijai,nebetiekiamam papildymui,password ir3senoms kolekcijoms be tapataus veikiančio katalogo; blanket301nenaudotas. Tiksli šio leidimo matrica `SEO_REFRESH_2026_10_22_URLS.csv`; pradinis auditas neperrašytas.

## Git perdavimas

PUBLIC source `b25ed2b2c55b5300c79e447990d69bd3f8af72d3`,50scopedfiles; kitos10svetainių paketų projekcijos nepakeistos. Foreign `skills-lock.json`,ankstesni media masters,outputs ir upgrade-fd906851 neįtraukti. Own upgrade records:9c4f69e0(Offer) ir0425cdfb(legacy/presentation), su180testų/build/actualhosted įrodymais. BranchPR31/101 yra atskirai nuo mainmerge ir kitųPCadoption. Pairedfetched main bazės26493054/70568862; source bei nativeleidimas čia perduodami tiksliai, tačiau mainmerge neatliekamas automatiškai.
