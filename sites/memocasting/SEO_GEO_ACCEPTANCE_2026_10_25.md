# Memory Casting · 2026-10-25 priėmimas

Vieša svetainė: https://memocasting.lt/

## Tikslus leidinys

- PUBLIC source: 5cff95dbd416f1541f30339daebbb5d218c0ba89; PR31 OPEN draft, ne main merge.
- Native release:49a05952-54ce-4d2e-a9dd-7e31379af818; SHA2562844fc35a6963a5e28f77d05eff0fe4e0ea73f5d15adec61f4551a13bfdfc87f;187puslapiai/800medijos failų.
- Actual Worker:f5212538-6ecb-4fad-aaad-143ed08ce6ce;100%. Ankstesnis9fd8a2bc-44e9-4226-9a0f-7889904cc3b6 yra scoped code rollback.
- OriginaliosASSETS/leadsD1/MEMO_COMMERCE/MEMO_INSTAGRAM bindings, abu customdomains ir observability tiksliai išsaugoti. Pridėti tik2 vieši GA4 config kintamieji; jokių naujų secret ar backend/DB/DNS/pašto pakeitimų. Commerce380e46b2-9955-4feb-b604-8c1dce26fdd2 liko tas pats.

## Įgyvendinta

- Du atskiri18žingsnių instrukcijų puslapiai pagal originalius ownerPDF; hub, atmintinė, TOC, print, atitinkamų produktų / pagalbos / techninių gidų nuorodos. Poros2l/700ml, šeimos3,2l/1400ml ir skirtingos temperatūros; nėra automatinio dvigubinimo ar naujų medžiagų gramų / amžiaus ribų.
- Page title/description/OG/Twitter suderinti, WebSite pageidaujamas vardasMemory Casting; legalMBMemocasting išsaugotas. Aktualūs32/48EUR iš to paties LIVE katalogo, esami balti dažai komplekte. Tikri Offer, tinkami vaizdai ir didelių peržiūrų leidimas; nėra išgalvotų reviews/ratings/GTIN/HowTo.
-70esamų turinio puslapių peržiūra13LT+57PL/LV/ET;2naujos instrukcijos. Vėlesnis privatumo papildymas pakeitė tik1puslapį; kiti186 ir visos datos tiksliai išsaugoti.
-17GSCsenųURL formų,15distinctpaths sutvarkyti;2pasenę indexpage parametrai šalinami išsaugantUTM. /en/ ir /ru/ turi framework308 normalizaciją, tada tikslų301→200.11future formų išlaiko tikro publishAt guard.6nebeturinio/actionURL ir2nepatvirtintos semantikos adresai negauna blankethomepage301.
- Google priėmė sitemap pateikimą2026-10-25. Senos indeksavimo ataskaitos atnaujinimo data2026-10-16;56indexed/133not nėra naujo leidinio rezultatas. Homepage buvo Google indekse; naujos skubaus indeksavimo užklausos Google nepriėmė dėl reCAPTCHA ryšio, tai užfiksuota.
- Nauja izoliuota GA4: account413338025/property560554153/stream16198963010/G-LHHK61WT8T. Savininkas atskirai patvirtino Terms/BDAR ir seno GSC susiejimo perkėlimą. GSC abiejų UI aktyviai rodo naują ryšį, Merchant Center asociacija ir senos GA4 duomenys išsaugoti.
- GA4 papildomas sharing,Enhanced,Signals,user-provided,ads personalization,detailedgeo/device OFF; abu retention2m/resetOFF. Basic consent LT turiniui,180dienų pasirinkimas/slapukai, laisvas atmetimas ir atšaukimas; krepšelis be automatinio skydelio / analitikos, kitų kalbų puslapiuose GAnekraunama.

## Tikras priėmimas

-250/250Node regresijų,TypeScript,scopedESLint ir productionbuild/dryrun PASS. Build prieš checkoutUI pataisą sąmoningai nutrauktas; originalūs logai išsaugoti.
- HTTPS113sitemapHTML:200,vienasH1/title/canonical,validiJSONLD;2PDFGET/HEAD/SHA256/range206 ir raw404;17redirects→200;abuLLMexportai;futureHTML ir unikaliosmedijos404 PASS.
- Actualdesktop1280/1024 ir mobile390/320 instrukcijų figūros pilnos, be overflow; print paslepia nav/TOC/footer, išlaikoarticleheader ir18steps. Consent actual320/390/desktop, keyboard ir checkoutmanualsettings patikrinti.
- Realus hosted Chrome:74networkevents prieš sutikimą/0Google/0GAcookies; po atmetimo ir revisit71events/0Google; po aiškaus opt-in gtag200 ir collect204 į tinkamąG-ID. Tik clean publicURL/title, be QAquery ir HTTPReferer.
- Abiejų_GA slapukų tikraSecure/Lax/180d būsena; actualGA4Realtime1page_view,1first_visit,1session_start yra sintetinisQA, ne klientai ar pirkimai. Atšaukimas:GA scripts0,cookies0,newGoogleRequests0 po tikro reload. Cart su grant64networkevents/Google0/panelnone/settingspresent;foreignlocale87events/Google0.
- Chrome savo autoTranslate pakeitė PL DOMlang įlt (translated-ltr); tai atskirta nuo serverioHTML, kuriame pl/lv/et lang ir canonical yra teisingi. Naršyklės vertimo nuostatų nekeitėme.
- Tik mūsų QA consent įrašai pašalinti po atšaukimo ir grąžinta pradinė unknown būsena; mokėjimų / krepšelio duomenys neliesti.

## Turinys ir ribos

Tikras GSC pradinis palyginimas: žiniatinklio paieška, 2026-09-26–2026-10-23 imtinai, be papildomų filtrų — 54 paspaudimai, 1 451 parodymas, 3,7 % CTR ir 38,5 vidutinė pozicija. Vidutinė pozicija apima visas užklausas, o ne vien pagrindinį raktažodį. Ataskaita patikros metu atnaujinta prieš 2,5 valandos; ji neapima šiandienos leidinio poveikio ar GA4 QA. Tai istorinis atskaitos taškas, ne šių pataisų rezultato įrodymas. Tikslūs duomenys ir ekranas: privatūs `gsc-baseline-last28days-2026-10-25.*` įrodymai.

97LTgidai suplanuoti, parašyti, peržiūrėti, eksportuoti ir įkelti. Šio kvito metu 27vieši,70su ateities datomis; serveryje atsiranda sutartais10:00/16:00EuropeVilnius laikais bePC/scheduler.

Google pats sprendžia indeksavimą, site name, snippet, kainos ir nuotraukos parodymą; AIcitavimas ir naujas organinių pozicijų pakilimas nematuoti. Merchant Center0products: oficialiame Shopping/free-listing šalių / kalbų sąraše nėraLT/lt; techniškai veikiantis2MPN XML nepateiktas apsimetant kita rinka. GTINnėra ir neišgalvoti.

GA4 ši partija yra turinio peržiūrų matavimas. Pirkimo / pajamų / reklamos kampanijų atribucija neįgyvendinta; query/hash šalinami ir referrer tuščias. Tikrus pardavimus rodo prekybos užsakymai, ne vienasQAįvykis. Penkių spalvų miniatiūrų1,56MB yra našumo optimizavimo rezervas, ne nustatytas šio leidinio LCPvartų nepraėjimas. FieldCWV ir Lighthouse naujo balo nežadame.

## Rollback ir perdavimas

Pirmiausia galima išjungti MEMO_GA4_ENABLED, išsaugant kitus actual bindings. Scoped code rollback į9fd8; jokio backendDB ar vėliau gautų užsakymų atstatymo iš senos kopijos. Nekeičiami DNS, Stripe, carrier, Google originalūs duomenys. CORE102sharedpaths scopedcoverage PASS; senas whole-branch gate turi ankstesnių journal blokavimų, tai nėra mainmergePASS. Source / native / hosted / GSCindexing / GAQA / realūs pirkimai yra skirtingos būsenos.

Privatūs įrodymai: sites/memocasting/qa/seo-geo-20261025 ir D:/Codex-build-cache/memocasting-20261025/seo-account-evidence/. Public/source docs nepublikuoja cookies reikšmių, credential ar kliento duomenų.
