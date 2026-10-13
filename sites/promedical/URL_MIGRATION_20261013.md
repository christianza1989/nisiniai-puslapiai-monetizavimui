# Lietuviški katalogo adresai

Savininko 2026-10-13 pavedimas: pakeisti čekiškus Promedical katalogo URL pagal dabartinius lietuviškus produktų pavadinimus ir Core SEO sutartį. Baseline public `039dbeaaeb1fe67e1d8d89dd7132d1c3b46dbb23`, core `8c9989e4c69245091d9685f166c4fde76ab35988`; fetched mains `ec8a9c032fe926d1d9722802d8eb26fa8bd02937` ir `7af6b9641012a30c5f95eac38a66daeff8f8cb39`. Own public PR28 / core PR53.

Gyvas sitemap HTTP200:1855 URL; pakete1910 puslapių,1408 produktai,437 kategorijos ir65 kiti/redakciniai puslapiai. Raw XML ir kandidato žemėlapis laikomi privačiame `url-migration-20261013/`. Nauji mokami Treg tyrimai nereikalingi: sprendimas remiasi gyvu sitemap ir patvirtintais pavadinimais. HTTP200 nėra indeksavimo įrodymas.

## Adresų taisyklės

- Produktas: `/produktai/<lietuviskas-pavadinimas>-<modelio-kodas>`. Mažosios ASCII raidės ir brūkšneliai, tikri serijų/modelių pavadinimai. Kodas gale vieną kartą. Išpardavimo/likučio ir ankstesnio modelio pakeitimo frazės nepatenka į URL; II/III kokybės rūšis lieka kaip varianto skirtumas. Ilgi pavadinimai trumpinami ties žodžių riba, išsaugant modelio kodą ir Core150simbolių slug ribą.
- Kategorija: `/kategorijos/<lietuviska-grupe>/<serija>/<pogrupis>` pagal esamus tėvų ID. BASIC/PROFI ir komplektacijų šakos išlieka atskiros. Segmentai pagal dabartinius pavadinimus, nekartojant ilgų serijos medžiagos paaiškinimų.
- Dvi „Gipsavimo vežimėlių“ kategorijos turi identiškus title/description/body/media/parent links ir tuos pačius du produktus. Paliekamas `kategorie-sadrovaci-voziky` puslapio ID; `kategorie` ID sujungiamas su juo. Abu seni adresai nukreipiami į tą patį naują URL. Produktų ryšiai pagal ID perrašomi ir deduplikuojami; papildomas numeruotas dublikatas nekuriamas.
- Visi1845 seni katalogo adresai gauna308 į tikslų viešą puslapį vienu žingsniu. Query išsaugomas, sena `category` filtro reikšmė atnaujinama. Alias negalioja kitam domene ar nepublikuotam/atšauktam tikslui.
- Produkto ID, tekstai, faktai, modeliai, nuotraukos ir datos nesikeičia.65 dabartiniai vieši redakciniai puslapiai išsaugomi tiksliai; senesnės studijos jų versijos neperrašo produkcijos. Gamintojo šaltinių URL lieka tikri originalūs Klaro adresai.

## Priėmimo planas

1. [x] Live sitemap/source, visas kategorijų medis, old→new žemėlapis, kolizijos ir ilgiai.
2. [x] Ribotos kanoninio studijos modelio URL redagavimo partijos su stale-revision/old slug/tenant vartais; ankstesni publishedRevision ir release išlieka. Esamas review/approve/release; peržiūros apimtis – URL ir išsaugotų faktų/medijos kontrolė.
3. [x] Importuoti tik naujas patvirtintas katalogo versijas į dabartinį paketą. Compiler/canonical/sitemap/schema/LLM projekcija lieka vieninteliai.
4. [x] Site-scoped senų adresų alias bendrame proxy, compiler patikra pagal pageID/tikslą; stabilūs ID homepage/grupių atrankai; anksčiau išsaugoto užklausos sąrašo adresų atnaujinimas.
5. [x] Modelio atomic/stale/collision/tenant ir viso URL žemėlapio regresija; publikavimo datos, host, query/trailing slash; core/compile/build/types/lint, tikras HTTP sitemap/canonical/nuorodos/LLM, desktop/mobile ir sąrašo veikimas.
6. [x] Scoped safety/commit/push į esamus PR; normalus Cloudflare versions pipeline su esamais D1/Email/routes/secrets, be QA laikrodžio. Produkcijoje visos senų308/naujų200 poros ir sitemap; source/version įrodymai.

Homepage prototipas localhost8837 lieka atskiras dizaino darbas. Migracija nekeičia DNS/billing, nesertifikuoja bendro svetainės priėmimo ir nežada reitingų ar AI rekomendacijų.

Baigta: source 82aa0cfb1bee40bb0e6bd451cac55246aee9a610, versija 983732bb-4f96-4fa9-ac2d-7a4285a08940,100 %. Tiksli patikra: verification-20261013/url-migration-v1.json. Originalios sitemap nuorodos – vieno308žingsnio; variantas su pasviruoju brūkšniu gale pirmiausia normalizuojamas vinext. Studijos65 senesni redakciniai įrašai neimportuoti – dabartiniai patvirtinti vieši tekstai išsaugoti.

[Google URL gairės](https://developers.google.com/search/docs/crawling-indexing/url-structure) patikrintos2026-10-13: aprašomieji auditorijos kalbos žodžiai, loginė struktūra, brūkšneliai ir nuoseklus raidžių dydis.
