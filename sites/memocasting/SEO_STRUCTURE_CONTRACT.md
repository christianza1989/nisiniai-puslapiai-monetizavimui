# Memocasting struktūros ir shopo sutartis

Atnaujinta 2026-10-13 pagal savininko URL pakeitimus, dabartinį paketą ir suderinimą su sesija „Įvertinti Shopify alternatyvą“. Pakeičia 2026-10-12 inventoriaus prielaidas; senų kvitų neperrašo. Vietinis projektas, ne produkcijos priėmimas.

Release 60c80be9-e039-4482-9099-a7d8567a1c1d, SHA-256 983ec0c06cb3dd59d28002aeffc3a73f5d7f0bea6520eea74a27ff6ae9da07cf. **88 puslapiai = 22 paskirtys × LT/PL/LV/ET, 84 indeksavimo projekcijos URL, 24 gidai.** Keturi krepšeliai neįtraukiami į sitemap / llms. Tai ne Google indekso skaičius.

| Paskirtis | LT canonical | Taisyklė |
|---|---|---|
| Pradžia | / | 89 custom sekcijų dalies + 9 ankstesni turinio blokai |
| Katalogas | /ranku-liejimo-rinkiniai | Dvi patvirtintos prekės |
| Poros prekė | /rinkinys-porai | Native SKU couple; LT bazė 32 EUR, papildomi dažai +3 EUR |
| Šeimos prekė | /seimos-rinkinys | Native SKU family; LT bazė 48 EUR |
| Instrukcija | /pages/instrukcija | Istorinis URL; parametrai tik pagal IFU/SDS |
| Gidai / pagalba | /gidai, /pagalba | Šeši originalūs sprendimų / proceso / pagalbos gidai |
| Kontaktai | /kontaktai | Vietinė forma neįrodo SMTP gavimo |
| Pirkimas | /cart | noindex, nofollow; checkout / atkūrimas / patvirtinimas dabar viduje |
| Alginato informacija | /products/alginato-papildymas-650g-dvieju-ranku-rinkiniui | 200 informacinis, be aktyvaus SKU / Product / pirkimo |
| Pėdučių informacija | /products/kudikio-pedutes | 200 informacinis, be baby SKU / tinkamumo pažado |

Likę LT adresai: /gidai/dovana-porai, /gidai/dovana-vestuviu-metinems, /gidai/ranku-liejimo-rinkinys-ar-paruosta-dovana, /gidai/dziovinimas-ir-isemimas, /gidai/liejinio-dazymas-ir-prieziura, /apie-projekta, /redakcija, /pristatymas, /grazinimas, /privatumas, /naudojimo-salygos. Tikslūs 88 ID/adresai yra PAGE_BRIEFS_2026_10_13.json.

## Migracija ir kalbos

- /products/liejimo-rinkinys-porai → **301** /rinkinys-porai.
- /products/seimos-rinkinys-1 → **301** /seimos-rinkinys.
- /collections/all → **301** /ranku-liejimo-rinkiniai.

www perkėlimas išlaiko kelią / užklausą; senam LT keliui patikrintas galutinis Location jau naujas canonical. /products/seimos-rinkinys lieka404. /checkout ir /uzsakymas šiuo metu404; nerodyti tariamų funkcionalių maršrutų. Nepriimti būsimi URL ne meniu / schema / sitemap / eksportuose.

PL/LV/ET turi atskiras kalbines versijas, self-canonical ir abipusį hreflang. Prefiksuoti istoriniai produktų / katalogo keliai išsaugomi; LT migracija jų nepervadina. Canonical be rinkodaros parametrų; visų kalbų nekanonizuoti į LT. Kalbinė projekcija nepatvirtina realios prekybos kiekvienoje rinkoje.

## Turinio ir prekybos tiesa

Oficiali patvirtinta projekcija valdo HTML, kontekstines nuorodas, kalbas, schema, sitemap ir llms. Katalogas / Breadcrumb naudoja dabartinius canonical. Bespoke LT homepage tikrinamas pagal tikrus jam priskirtus landmark ID; klasikiniai puslapiai — pagal semantinius heading ID. Visos vidinės fragmentų nuorodos tikrinamos.

Product aprašo patvirtintą tapatybę ir matomą vaizdą. Dabartiniame pakete nėra Offer / InStock / AggregateRating / Review / fiktyvaus Person. Offer / ProductGroup tik iš patvirtintų serverio komercinių duomenų, sutampančių su matoma kaina, pasirinkimu ir tikru likučiu. FAQ rich rezultatai ir AI citavimas nežadami.

Shopo suderinimas: SDK **0.12.1**, manifest **be32c223**, CommerceClient → /prekyba/catalog ir /prekyba/markets. Pirkimas tik aktyviam SKU, teigiamam parduodamam kiekiui, rinkos kainai, tikriems pakuotės matmenims; priedui addonFor. LT kainų faktai nepatvirtina kitų šalių komercinių kainų. 4.50 EUR sandbox siuntimas nėra vežėjo tarifas. Frontend nekeičia operatoriaus DB / kainų / likučių.

Asmeniniai order API / dokumentai / būsenos: no-store ir noindex; tokenai ne viešame URL / schema / analytics. Grįžimo parametras neįrodo apmokėjimo. Vieša grąžinimo informacija atskirta nuo individualios privačios procedūros. Mokėjimai, siuntimas, laiškai, atsargos / galiojimas, priedų pakavimas ir rinkų teisiniai tekstai priimami atskiru shopo / savininko etapu.

## Dabartinė patikra

88 HTML puslapiai,84 sitemap URL,88 vidinėmis nuorodomis pasiekiami,103 SEO HTTP užklausos PASS;227 img/srcset resursai200. Kanoninio Host vietinė imitacija nėra produkcija. localhost peržiūra turi noindex apsaugą. Produkcijos DNS/WAF, crawl/index, Google canonical, pozicijos, CWV ir AI citatos neįrodomi. GSC neprijungta — tai ne nulinis srautas.

[Puslapių planas](OTHER_PAGES_PLAN_2026_10_13.md), [88 briefai](PAGE_BRIEFS_2026_10_13.json), [dabartinis auditas](SEO_AUDIT_2026_10_13.md). Ankstesni SITE_COMPLETION / PHASE-1-AUDIT lieka istoriniai.

Pirminės gairės: [ecommerce](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure), [kalbos](https://developers.google.com/search/docs/specialty/international/localized-versions), [AI Search](https://developers.google.com/search/docs/appearance/ai-features).
