# Memocasting struktūra ir shopo integracija

Suderinta 2026-10-12 su sesija „Įvertinti Shopify alternatyvą“ pagal savininko pavedimą. Commerce source 09eac27 / PR96 sutartis: `commerce-core/docs/STOREFRONT_CONTRACT_2026_10_12.md`. Šis paketas vietinis, ne produkcijos paleidimas. Dizaino pasirinkimas ir realizacija atidėti.

| Paskirtis | Kanoninis adresas | Taisyklė |
|---|---|---|
| Pasiūlymas | / | Rankų liejimo rinkiniai porai ir šeimai |
| Katalogas | /collections/all | Dvi patvirtintos prekės; be tuščių kategorijų |
| Poros prekė | /products/liejimo-rinkinys-porai | SKU couple; 32 EUR, pasirinktiniai dažai +3 EUR |
| Šeimos prekė | /products/seimos-rinkinys-1 | SKU family; 48 EUR |
| Instrukcijos pradžia | /pages/instrukcija | Istorinis URL; dokumentų patikra, ne spėjami receptai |
| Gidų katalogas | /gidai | Dovanos pasirinkimas ir proceso/pagalbos grupės |
| Klausimo aprašymas | /pagalba | Originalus redakcinis gidas, ne forma |
| Kontaktas | /kontaktai | Pagalbos forma; vietinis gavimas, SMTP nepriimtas |
| Pirkimo veiksmas | /cart | noindex; ne sitemap ir skaitymo eksportuose |

Šeši gidai, operatoriaus/redakcijos puslapiai ir pristatymo/grąžinimo/privatumo/sąlygų puslapiai sudaro 20 patvirtintų URL. 19 tinkami discovery projekcijai. Įvardyti privatūs būsimų temų planai nėra publikuoti straipsniai. Visas 38 klausimų žemėlapis yra `CONTENT-PLAN.json`; sinonimai ir progų variantai nejungiami į atskirus tuščius puslapius.

www nukreipiamas308 į memocasting.lt išlaikant kelią ir užklausą. Senas šeimos be `-1`, papildymo ir kūdikio SKU lieka404, kol yra pagrįstas tikras turinys ar migracijos tikslas. Būsimų kategorijų/gidų URL404; jų nėra meniu, sitemap, schema ar eksportuose. Puslapių canonical yra be rinkodaros parametrų. Kitų rinkų kalbos/hreflang neįjungiami, kol nėra tikros lokalizuotos versijos.

Viena patvirtinto paketo projekcija valdo HTML, kontekstines nuorodas, Article/Breadcrumb/Organization schemas, sitemap bei llms.txt/llms-full.txt. Produkto kelias matomame HTML ir BreadcrumbList: pradžia → Rinkiniai → prekė. Katalogas CollectionPage turi tik tinkamas viešas prekes. Product aprašo tik patvirtintą tapatybę; nėra Offer, InStock, išgalvotų atsiliepimų, eksperto, produktų nuotraukų ar terminų. Offer bus pridėtas iš serverio patvirtintos produkcijos konfigūracijos, kai shopo sesija priims realius mokėjimo, siuntimo ir likučių duomenis. Dabartinis catalog API neturi aplinkos žymens, todėl jo fixture išvestis nėra tokios teisės įrodymas.

Checkout/užsakymų būsenos ir API yra prekybos integracijos dalis: noindex, no-store, tokenai tik antraštėse, jokio URL/schema/analytics. Mokėjimo grįžimo parametras nėra apmokėjimas. Svetainė nekeičia operatoriaus DB, kainų ar likučių; 8797 yra tik atskira QA kopija,8795 neliečiama. Naujas viešas shopo maršrutas turi būti pirmiau įtrauktas į šią sutartį.

Aiškus naudotojui skirtas atsakymas pateikiamas paprastu HTML, su tikrais šaltiniais ir jų taikymo ribomis. Patvirtinti faktai ir originalūs planavimo lapai atskirti nuo tiekėjo parametrų, kurių dar nėra. Gidų data yra patvirtintos versijos data, ne tariamas senos gyvos svetainės paleidimas. Skyrių fragmentai susieti su antraščių žodžiais; viešo skyriaus ID nėra bloko numeris.

Po paleidimo tikrinti tikrą GSC property, indeksavimo/canonical pasirinkimą, generative AI įtraukimo valdymą, crawl/WAF žurnalus ir matomumą. Vietinės patikros jų neįrodo. Dabartinių GSC/GA4/AI citatų nėra; tai ne nulinis srautas. Naudotas esamas LT tyrimas, be naujų mokamų calls ar automatizacijų.

Pirminės gairės patikrintos2026-10-12: [Google AI Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Product](https://developers.google.com/search/docs/appearance/structured-data/product). llms eksportai yra papildomas skaitymo patogumas; Google jų nenaudoja reitingavimui. Tikslūs faktiniai patikrų kvitai ir ribos — `GEO_READINESS.md`.
