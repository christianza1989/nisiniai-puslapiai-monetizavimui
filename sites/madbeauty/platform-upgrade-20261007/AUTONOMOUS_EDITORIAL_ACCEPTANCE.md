# Autonominė straipsnių leidyba — 2026-10-09

Savininkas tiesiogiai nurodė pašalinti straipsnių specialisto žmogaus laukimą. [EDITORIAL_POLICY.json](../EDITORIAL_POLICY.json) nustato autonomous-agent režimą. Bendras content-studio workflow jau priima realią agento peržiūrą; neprireikė išjungti revision, faktų, ryšių ar medijos validatorių. Specialisto žmogaus peržiūra neįrašyta kaip atlikta. Agentas savarankiškai ištaisė ir patikrino konkrečius tekstus. Naujų briefų rengėjai taiko tą pačią per-site politiką.

## Faktiniai rezultatai

- Šeši esami bendro turinio eigos testai praėjo. Atomic linked approval, agento review, stale fact binding, source/media/foreign-link ir private-origin vartai išliko. [Testų įrodymas](acceptance-20261009/autonomous-editorial-policy.json) užfiksuotas prieš diegimą; jo ankstesnis not-yet-deployed žymuo yra istorinis bandymo momentas.
- Writer source `c7c3aeeb95c5abc625317560642ebe36f311673f` / PR56: realiai perskaityta 11 ankstesnių galutinių tekstų, source evidence, 22 actual native peržiūros1440/390, konkrečiai revizijai įrašyta agento evidence ir atominis approve11. Agentas neteigia žmogaus kvalifikacijos. Bendras release verifier patikrino69pages /330media.
- Tikslus naujas paketas `98882a2d62274315166757ebc581a1cc2b4aff98f4425b179a676e4bae8cf9b2`:69puslapiai /65gidai /330medijos failų. Visi58 baseline snapshots / datos ir275media baitai sutapo; papildomi11guides /55WebP priimti, specialisto žmogaus laukimas0. Pirmoji papildomos11grupės data2026-10-29T08:00Z. +60partija nepriskirta šiam leidimui.

## Gyvas turinio leidimas

[Production receipt](acceptance-20261009/autonomous-production.json) SHA256 `8a2a72e8ed3a669e47b6289e4b94723662b59f2b6189e0be92361e5c6d221ac8`, consumer PR57 / commit e9ea583. Production versija `4e43bd2d-e5ea-491f-ae3e-ea74d260fbe9`100%; incumbent runtime`b7a34b1703060c4d8d5e426fa29347a393c32dff`, core`63cfd8c2043eb2afa5eb6af638bae4dad9c86d46`, production artifact`f4bafa5ee9015c75a324e3888522329c3f37f517eb43834dd80fb056be77060a`.

Po124native / isolated hosted publikavimo ribas PASS. Canonical434paths:129served /305futureblocked;7duepages /62futurearticle404. Šeši realūs native canonical naršyklės vaizdai apima indeksą, ankstesnį straipsnį ir naujo antakių straipsnio neprieinamumą iki datos1440/390. Rendererio datos, sitemap, schema, LLM ir medijos ribos sutapo. Provider config sutapo prieš/po; originali2faf namespace /MadbeautyPlatform /v1, mail secret names ir domenai išliko. Raw klientų duomenų hash audito ar SMTP inbox bandymo čia nėra.

## Tas pats turinys platformos kandidate

Runtime1ba6c7d / corec7e0c9a nepasikeitė. [Native124](acceptance-20261009/autonomous-candidate-calendar.json) priimtos69pages /459assets; private clock override nepatenka į production. [Hosted preservation](acceptance-20261009/autonomous-hosted-preservation.json) versijoje `cb9fda75-dd22-4a1d-acc6-b058bd9b5fed`: source29 /target29,3physicalmedia,16mail captures ir abu vizitai sutapo tiksliai. Šio QA pakeitimo metu production4e settings/deployments nepasikeitė. [Hosted HTTP](acceptance-20261009/autonomous-hosted-http.json):459paths /154served /305futureblocked,7publicpages /62future404; anoniminė app/API/QA prieiga atmesta, empty-city303toexactsearch ir directunpublishedcity404 išliko.

Istoriniai320a /bb /fbc UI ir restarto įrodymai neperrašyti. Produkto kodas nuo1ba nepakitęs, ankstesni264/264 produkto testai lieka savo runtime apimtyje. Pilnas platformos backend neįjungtas; realaus meistro piloto, booking/reminder inbox ir retention/backup faktai išlieka atskirose produkto priklausomybėse, ne straipsnių žmogaus peržiūros vartais.
