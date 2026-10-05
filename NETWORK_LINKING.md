# Redakcinės nuorodos tarp nišinių svetainių

2026-09-30 įgyvendinta vietinėje studijoje ir bendrame viešame core. Tikslas – naudingas skaitytojo kelias tarp susijusių atsakymų. Bendras savininkas nesuteikia priežasties jungti nesusijusias nišas; autoriteto ar pozicijų augimas nežadamas.

## Agentas ir GUI

`content-studio/src/network-links.mjs` iš realių svetainių/puslapių sudaro katalogą ir suplanuotų ryšių žemėlapį. Codex CLI planavimo ir generavimo promptai gauna `networkCatalog`; abiejų rezultatų schema turi `networkLinks` su tikslo site/page ID, natūraliu anchor ir skaitytojo naudos paaiškinimu. Tuščias sąrašas leidžiamas. Puslapyje saugomi privatūs `networkLinkSuggestions`, tikslinis URL apskaičiuojamas iš registro.

Studijoje `http://127.0.0.1:4317` yra bendras ir kiekvienos svetainės **Nuorodų planas**, ateinančių/išeinančių planų skaičiai, straipsnių datos, anchor, priežastis ir būsenos. Redaktoriuje matomos šio juodraščio priklausomybės, HTTPS patikros data, teksto bloko vieta, klaidos. Kalendorius atidaro privatų redaktorių ir peržiūrą; nepublikuoja pagal datą. Platesniame kalendoriaus sąraše rodomi vidinių, išorinių ir tinklo planų skaičiai.

Vienas tikras privatus planavimo pavyzdys: `namudekoravimas.lt` kambario šviesos/privatumo gidas → roletų diena–naktis / blackout palyginimas. Data 2026-10-14; turinys dar tuščias ir nepatvirtintas, tikslinis domenas dar nepaleistas. Būsena „Domenas dar nepaleistas“. Tai ne viešas backlinkas ir ne paruošta namų dekoravimo svetainė.

## Patikra ir patvirtinimas

Generavimas įrašo pasiūlymus ir autonomiškai patikrina jau tinkamus tikslus. `verify-network` GUI/užduotis arba `node content-studio/scripts/verify-network-links.mjs <siteId>` gali pakartoti patikrą. Privati/future/paused/missing svetainė neskaitoma kaip viešas taikinys. Kai stage `live`, nepakitusi patvirtinta versija jau due ir anchor yra turinyje, tikrinamas HTTPS 200 HTML, canonical ir noindex. Redirectai nesekami, atsakymas ribotas. Patikros įrašas susietas su tikslinės patvirtintos versijos hash; po 7 dienų prieš naują patvirtinimą reikia pakartotinės patikros (tai programos šviežumo taisyklė, ne SEO kvota).

Tinkama nuoroda patenka į **naujo juodraščio** `externalLinks`. Tai nesuteikia šaltinio turiniui public approval. Agentas turi patikrinti ryšio/teiginio prasmę ir įprastai patvirtinti nepakitusią versiją. HTML prieinamumo testas nepakeičia šaltinio perskaitymo. Tikrinant pasikeitęs juodraštis neišsaugomas ant viršaus. Senos approved versijos neliečiamos; nesėkmės pataisymas turi būti peržiūrėtas ir iš naujo importuotas.

## Bendras publikavimo filtras

Vieša paketo schema **nekeista**. Tik peržiūrėtos nuorodos eksportuojamos per jau esantį `externalLinks`. Core `lib/niche-links.mjs` projekcija naudojama `publicNichePages` / `publicNichePage`, todėl HTML, JSON-LD ir LLM išvestys naudoja tą patį tikslo publikavimo filtrą. Pastraipos ir sąrašai jungia tikslius patvirtintus label per `LinkedText`: tekstas escape’inamas, HTML/Markdown neinterpretuojamas, nuoroda neįterpiama žodžio viduryje.

Core `config/niche-network.json` turi 20 `networkDomains`; `networkLiveDomains` dabar tuščias. Prieš pirmą viešą tinklo nuorodą būtina tikrai įdiegti tikslinį domeną/paketą, patikrinti jo HTTPS/DNS, atnaujinti šį diegimo registrą ir studijos stage, atlikti patikrą, patvirtinti šaltinį ir importuoti jį. Įtraukiant naują domeną išplėsti `networkDomains` **dar prieš** generuojant viešas nuorodas į jį; neimportuotas nuosavas tikslas filtruojamas. Ateities/atšaukti taikiniai nerodomi, o originalaus patvirtinto paketo baitai nekeičiami.

Nepriklausomi patikrinti išoriniai šaltiniai išlieka šaltiniais; nenaudojame savo komercinio puslapio vietoje gamintojo techninio dokumento. Operatoriaus footer nuoroda į verslomatika.lt yra atskira savininko prašyta žyma.

## Patikros

Studijos 10 testų: datos, statusai, katalogas, tikri ryšiai be all-to-all, evidence/hash, redirect/noindex/canonical, skill promptas. Core testai: tarp-domenų laiko/approval/diegimo filtras ir nepakitęs source; natūralūs anchor/žodžių ribos. GUI reali peržiūra: globalus planas → privatus redaktorius → spalio kalendorius; kadrai core `output/playwright/network-*.png`. Realių viešų kryžminių nuorodų dar nėra.

Google [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) draudžia reitingų manipuliavimui skirtas nuorodų schemas; [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) paaiškina tikrų kontekstinių anchor naudojimą. Todėl nėra visoms poroms privalomų mainų ar backlinkų skaičiaus pažado.
