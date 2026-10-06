# Patirta turinio ir katalogo integracija

Problema: Madbeauty V1 links gali rodyti tik į approved redakcinius pageId; naujas katalogo mazgas / reali miesto pasiūla nėra redakcinis straipsnis. Priskirti jam fiktyvų editorial pageId arba apeiti owned-domain vartus `external` nuoroda būtų neteisingas modelis. Patikrinta actual V1 adapteris ir core V2 commerceDestination, turinio sesijos private makePage/generator spraga.

Sprendimas: nišos versioned registry ir stable routeRegistryId, approved-public-only pasiūlos projection. Esamas V2 commerce snapshot + current fresh registry sprendžia href; nišos rich HTML tik atvaizduoja projektuotas nuorodas. Common immutable validator, public projection, giftSchemas ir contentSeoV2 naudojami iš esamo source, ne kopijos. Node shadow importas – esamas common importer `--shadow`, prieš tai verifyContentRelease. Shared core source nepakeistas.

Patirtos regresijos: V1 neturi operatorName – lyginti jį tik V2, V1 operatorių imti iš tinklo config. Senas Node city route200 be pasiūlos nesutampa su sutartu404; pakeistas konkretus lūkestis, testas išlaikytas. V2 media preview negali naudoti seno V1 assets root – paketo assets skaitomi iš naujo immutable release, publication predicate tikrina ir media href, future/unknown404. Konkretūs tests/Workers/browser – VALIDATION ir TEST_MANIFEST.

Plačiau bendrinti reikia tik jei kitoje nišoje pasikartoja domain-specific target admission. Šios Madbeauty taxonomy / supply / city taisyklės nėra bendras visų nišų paslaugų modelis. Private studio plan→V2 generation/bindings sprendžia turinio sesija savo PR10 lange; šis adapteris neįrodo jos prompto/generatorio import e2e, GSC ar viso225 procedūrų temų plano.
