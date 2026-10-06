# Turinio sesijos sąsaja

Versija `madbeauty-catalogue-v1`; taxonomy `2026-10-06-v1`; siteId `madbeauty`. Kontaktas iš bendros config – MB Pinet / info@pinet.lt. Neperkelti kito tenant ar private state.

`taxonomy.json` nodes turi `kind:category|group|treatment`, parentId/categoryId, label/path, scope ir reviewRequired. 225 procedūrų aprėptis skaičiuojama tik pagal `node.kind==='treatment'`, ne pagal305 visų mazgų skaičių. Turinio planas procedūrą gali padengti atskiru URL arba prasmingu platesnio gido skyriumi; tai sprendžia turinio tyrimas, ne automatinis vienas-mazgas-vienas-straipsnis.

## Planavimo sidecar

```json
{
  "taxonomyNodeId": "kirpimai-moteru-kirpimas",
  "cityId": "vilnius",
  "routeRegistryId": "mb:catalog:kirpimai-moteru-kirpimas:vilnius",
  "canonicalPath": "/paslaugos/kirpimai-moteru-kirpimas/vilnius",
  "status": "planned",
  "deployed": false,
  "indexEligible": false
}
```

Tai `planTarget({taxonomyNodeId,cityId})` rezultato dalis; nebūtinai V1 plan-result schema field. Bendro straipsnio `cityId:null` reiškia nacionalinį puslapį ir miesto pasirinkimą. Lokalus cityId tik esant tikram miesto kontekstui. Turinio sesija ID generuoja šiuo helperiu; nekopijuoja slug spėliojimo ir neprideda103 city href į kiekvieną straipsnį.

Stabilus target ID `mb:catalog:{canonicalNodeId}` arba `mb:catalog:{canonicalNodeId}:{cityId}`, iki100 simbolių. Paslaugos pasiūlymo / kainos / trukmės ID yra atskiri ir nesukuria naujo straipsnio. Invalid node/city → null. Extensions planned iki atskiro aktyvavimo; jų route404.

## Runtime registras

`GET /content-targets.json`: schemaVersion1, siteId, version, taxonomyVersion, generatedAt, expiresAt, deployed, routes, targets. Public endpoint grąžina tik katalogo metaduomenis, ne klientus / paskyras / OTP / privačią pasiūlą. Node preview visada `deployed:false`; Workers production-mode flag taikomas tik deployed runtime, testuose naudojamas izoliuotai ir nėra tikro release įrodymas.

`routes` – national ir tik esamos approved pasiūlos local variantai. Viešas commerce core vartoja tik:

```json
{
  "targets": [{
    "id": "mb:catalog:lakavimas-gelinis-lakavimas:vilnius",
    "status": "ready",
    "canonicalUrl": "https://madbeauty.lt/paslaugos/lakavimas-gelinis-lakavimas/vilnius",
    "allowedQueryParams": [],
    "verifiedAt": "2026-10-06T10:00:00.000Z",
    "expiresAt": "2026-10-06T11:00:00.000Z",
    "purpose": "information"
  }]
}
```

Čia formos pavyzdys, **ne dabartinio gyvo target pažyma**. TTL1 valanda; iš `registry.planned.json` negaminti ready. Kiekviename HTTP projection adapteris iš naujo skaito actual approved catalog ir atnaujina registrą: panaikintas profilis / paslauga panaikina local target ir local route404. Atsisiųstas senas snapshot gali galioti iki TTL, todėl viešas rendereris nesiremia archyvuotais readiness failais. Kalendoriaus / kainos / rikiavimo query, hash, laiko ar rezervacijos action nėra leidžiami CTA canonical.

`resolveContentTarget(input,registry,{now,fallbackNational:false})` exact ir fresh target; nepraranda miesto konteksto tyliai. Aiškus `fallbackNational:true` leidžia nacionalinį tikslą, tačiau tekstą reikia atitinkamai pakeisti ir reviziją iš naujo peržiūrėti. IndexEligible visų šio pagrindo katalogo route yrafalse: funktionalus CTA-ready neįrodo SEO puslapio priėmimo.

## Esamas V2 rich link / snapshot

Straipsnio body:

```json
{
  "type": "richParagraph",
  "content": [
    {"type":"text","text":"Palygink pasiūlymus: "},
    {"type":"link","text":"gelinis lakavimas Vilniuje","target":{"kind":"commerce","targetId":"mb:catalog:lakavimas-gelinis-lakavimas:vilnius"}}
  ]
}
```

`editorial.commerceTargets` to paties ID snapshot:

```json
{
  "id": "mb:catalog:lakavimas-gelinis-lakavimas:vilnius",
  "url": "https://madbeauty.lt/paslaugos/lakavimas-gelinis-lakavimas/vilnius",
  "label": "Gelinis lakavimas · Vilnius",
  "relationship": "Platformos paslaugų katalogas",
  "verified": false,
  "checkedAt": null
}
```

Privatus draft iš pradžių `verified:false`. `verified:true` ir checkedAt tik po faktinės tikslo patikros; redakcinis snapshot ir current fresh registry būtini kartu. Runtime nekeičia approval bytes. Bendras `commerceDestination` tikrina origin/path, expiry ir query; nepraėjus link virsta tekstu. Nuosavo domeno nuorodų neapeiti kaip `external`.

Article→article: `kind:'page',pageId`; susiję `editorial.relatedPageIds` / `links.targetPageId`. Target turi būti to paties paketo due+approved public projekcijoje; future/revoked neaktyvus. Source citation ir autoriaus metaduomenys taip pat ateina iš V2 projekcijos. Tikrieji schemas ir validatoriai – esamo bendro core; šis MD jų nekeičia.

## Failų atsakomybė ir perdavimas

Ši šaka: Madbeauty registry/routes/catalog ancestor filtering/Node+Workers V2 adapter/acceptance/doc. Turinio PR10: private studio model/generator/plan schema/CLI prompt/data, temų aprėptis ir actual straipsnio review/export. Bendro public core lib/config nekeisti lygiagrečiai; abi pusės naudoja esamą source. Static plan export galima vartoti read-only iš šios šakos, vėliau persikelti per Git aiškiu commit.
