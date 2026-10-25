# Trijų LT adresų perkėlimas

2026-10-13 savininko nurodymu:

| Senas URL | 301 tikslas |
|---|---|
| /products/seimos-rinkinys-1 | /seimos-rinkinys |
| /products/liejimo-rinkinys-porai | /rinkinys-porai |
| /collections/all | /ranku-liejimo-rinkiniai |

Nauji adresai grąžina 200 ir yra vieninteliai šių LT puslapių canonical. Seni adresai grąžina 301 GET / HEAD, išsaugo query parametrus; www nukreipia vienu žingsniu į galutinį HTTPS adresą. Peradresavimas galimas tik į autoritetingos viešos projekcijos tikslą: unpublished / future / revoked puslapis negauna veikiančio redirect. Kitų kalbų produkto ir katalogo URL nekeičiami; jų LT / x-default hreflang atnaujinti.

Vienas route taisyklių šaltinis — PUBLIC `lib/memocasting-routes.mjs`; jį skaito ir CORE Memocasting turinio paruošimas. Loginis puslapio vaidmuo išlaiko SKU, produkto pirkimo bloką, katalogo korteles ir lokalizuotus atitikmenis. Nuorodos pagal stabilų page ID, navigacija, breadcrumbs, JSON-LD, sitemap ir LLM išvestys naudoja naujus URL.

Tik trys LT slug perėjo official Studio edit → revision-bound review → approve → release → official PUBLIC import. Release `2ebf04c8-5e2d-4261-b2c3-801b9c0fdb78`, paketo SHA256 `bff9afcd88e2919b547a926ea230a034fc8a04b2ff8a9ff784aa2faf0f2be135`. 85 kiti puslapiai bitų prasme išlaiko ankstesnį JSON; visų trijų tekstas, media, nuorodų ID / etiketės ir originali publishAt išsaugoti. Nauja tikslinė revizija patvirtinta įprastu modelio API, hash rankomis neperrašytas. Ankstesnis e69 paketas ir jo priėmimo kvitai yra istorija.

PASS: 82 PUBLIC testai, TypeScript, build, 103 actual SEO HTTP patikros (88 / 84 indexable / 24 guides / visos 88 viduje pasiekiamos), visų 10 nišų SEO smoke. GET ir HEAD faktiniai trijų senų adresų 301, query ir naujų 200 patikrinti atskirai. Pirmas HTTP pagalbinio bandymo `new URL(relativeLocation)` buvo netinkamas testui; retest nurodė bazinę kilmę, nes relative Location yra tinkamas HTTP atsakymas. Seną breadcrumb fixture pritaikėme prie naujo canonical; assertions nesusilpninti. Actual browser tikrina galutinį produkto / katalogo maršrutą ir pirkimo bloką; žali kvitai lieka private QA.

Pakeitimas veikia vietiniame localhost; viešo domeno diegimas ir DNS neatlikti. SDK / serveris / DB / mokėjimai / siuntos / laiškai nekeisti. Dizainas ir našumas atidėti. Ankstesnis pilnas shopo kodo kvitas išlaikomas; bendras svetainės auditas nėra naujai paskelbtas production-ready.

Galutinis bendras verifier atliko 267 HTTP patikras su nauju bff paketu, be HTTP / render radinių. SITE_COMPLETION išlaiko NOT_COMPLETE: AUDIT_TARGET_OR_PACKAGE_MISMATCH (istorinis A–Z auditas skirtas e69 paketui) ir LOCAL_AUDIT_INCOMPLETE. Seno audito hash / PASS neperrašyti ir platus naujo paketo A–Z priėmimas šiai URL pataisai neteigiamas. Actual IAB `qa/url-migration-browser.json` patvirtino galutinį katalogo adresą, abiejų produktų canonical ir veikiantį Add, taip pat naują tuščio krepšelio katalogo href; peržiūrėtas `qa/url-migration-family.png`.
