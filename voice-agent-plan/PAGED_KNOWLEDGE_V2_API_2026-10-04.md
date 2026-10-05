# Puslapiuotų žinių V2 runtime sutartis

2026-10-04. Runtime įgyvendinimas atskirtas nuo naujo domeno įjungimo. Šaltinis yra tik M2 `projectContentPagesV2`, `visibleContentTextV2`, `projectedSnapshotV2`; raw package į šį API netinka. Root viešą HTTP/HMAC emitavimą valdo atskirai; runtime failai neperima viešų maršrutų.

## Payload ir hash

`scripts/knowledge_transport_v2.mjs` eksportuoja `transport(metadata, pages, baseRevision=0, transferId=randomUUID()) -> {header,batches,commit}`. `metadata` tik `site_id,canonical_host,contact_email,operator,deployment_id,generated_at`; generated_at ISO 8601 su timezone, producerio eilutė išlaikoma. `pages` tik `{id,title,url,text,revision_hash,projection_hash}`. Tekstas yra visa matoma seka, įskaitant viešą autorystę/šaltinius ir tinkamus merchant target; originalus approval hash nėra pakeičiamas teksto hash.

Header:

```json
{"schema_version":2,"transfer_id":"unikalus-perdavimas","base_revision":0,"metadata":{},"page_count":31,"fragment_count":35,"content_hash":"64-hex"}
```

Batch: `{transfer_id,fragments:[{ordinal,page_ordinal,part,parts,id,title,url,text,revision_hash,projection_hash}]}`. Ordinal globaliai 0..fragment_count−1, page_ordinal 0..page_count−1, part 0..parts−1; fragmentų gavimo eilė nesvarbi. Vieno puslapio metadata visuose jo fragmentuose turi tiksliai sutapti. Tekstas sujungiamas `part` tvarka be papildomų skirtukų. Vienodi retries idempotent; pakeistas tas pats ordinal grąžina 409. Skirtingi IDs negali atstovauti tam pačiam page_ordinal, vienodi IDs negali atstovauti keliems puslapiams.

Commit: `{transfer_id,content_hash}`. `content_hash = SHA256(UTF8(canonical({metadata,pages})))`, pages yra pilni sujungti puslapiai page_ordinal tvarka. Canonical: objektų ASCII raktai rikiuojami, masyvų tvarka išlaikoma, JSON be tarpų, Unicode neescapintas. Kontrakto objektų raktai visi ASCII, nėra floats/undefined. Python `json.dumps(...,ensure_ascii=False,sort_keys=True,separators=(',',':'))`; JS pateikta to paties skripto canonical funkcija. generated_at įeina į perdavimo hash, bet neįeina į aktyvaus turinio tapatybę: vien naujas refresh laikas nekelia revision.

Producerio deployment_id turi apimti site/host/operator/contact ir visą matomą inventorių. `.v2.json` eksportas nėra runtime priėmimo įrodymas. V1 `.json` failas ir jo hash algoritmas nepakeisti.

2026-10-05 operator delta: V2 operator imamas iš `contactsBySite[siteId].operatorName`, jei laukas aiškiai pateiktas, kitaip iš `network.operatorName`. Aiškiai pateiktas null/tuščias/netinkamo tipo laukas neleidžia grįžti prie default. Parinktas netuščias operatorius turi tiksliai sutapti su ingest-validated `pkg.site.operatorName`; nesutapimas nutraukia eksportą prieš V2 artefakto sukūrimą. Tas pats parinktas operatorius įeina į metadata ir deployment identity. Patvirtinti `siteSnapshot`/approval hash ateina iš M1 validatoriaus; emitter jų neperrašo. V1 operator parinkimas paliktas esamas global default.

## Ribos ir autentifikacija

Iki 1000 puslapių, 1000 fragmentų ir 8 MB fragmentų JSON viename perdavime. Fragmentas iki 18 000 Unicode simbolių, batch iki 10 fragmentų ir 512 000 UTF8 baitų. JS generatorius neskaido surrogate porų. Viršijimas grąžina klaidą, niekas netrumpinama; didesnis inventorius reikalauja naujo transporto kontrakto. Staging galioja 600 s nuo begin, retries termino nepratęsia. Vienas aktyvus staging per site/environment; pasibaigęs gali būti pakeistas nauju unikaliu transfer_id.

Privatūs runtime maršrutai naudoja esamą worker Bearer autentifikaciją (tik serverio adapteriui; raktas neduodamas naršyklei):

- `POST /internal/sites/{site_id}/knowledge/v2/begin` — header, status staging.
- `POST /internal/sites/{site_id}/knowledge/v2/batch` — batch, received/expected.
- `POST /internal/sites/{site_id}/knowledge/v2/commit` — commit, status complete + revision/page_count/fragment_count/content_hash/refreshed_at.

Site mapping imamas iš registruoto Business, aplinka tik iš runtime config/RLS. Body negali pasirinkti business/environment. Per-site policy/advisory užraktai serializuoja commit su kitais knowledge įrašais; base_revision yra tikslus fence, ne pasiūlymas. `GET /operator/sites/{site_id}/knowledge` rodo dabartinį base_revision; atskiro operatoriaus token. Nežinomas site neregi­struojamas automatiškai.

Puslapiuoto viešo source HTTP variantui siūloma index/header + opaque cursor į fragmentų batches. Produceris turi prisegti tą pačią nekintamą snapshot tapatybę visiems cursor; pasikeitus projection turi grąžinti conflict, ne tęsti naujo snapshot viduriu. Consumeris perduoda header su runtime base_revision, visus batches ir commit; neužtenka vien GET index. Šios HTTP funkcijos ir deployed HMAC paginacija dar nėra runtime fetch adapteryje įgyvendintos.

## Atominis priėmimas ir revocation

Staging saugomas tenant-scoped KnowledgeState JSONB; migracijos nereikia. Esama knowledge/revision/refreshed_at lieka nepakeista iki sėkmingo commit; pirmas staging be aktyvių žinių niekada nėra lookup prieinamas. Complete reiškia patikrintus visus ordinal, visus puslapius, visas dalis ir galutinį hash. Nutrauktas, pasibaigęs, pasikeitęs arba dalinis perdavimas negali pratęsti aktyvaus TTL.

`POST /operator/sites/{site_id}/knowledge/v2/revoke`: `{base_revision,revision_hashes:[1..1000 hex],reason}`. V1 revoke iki 30 hash nepakeistas. V2 vienu atominiu įrašu atšaukia daugiau nei 30; tiems patiems revision hash priklausantys visi fragmentai pašalinami iš retrieval. Revocation importo metu pakeičia revision ir užblokuoja seno base commit. Atšaukimų sąrašas išlieka po naujo importo; jau naudotus atšauktus faktus gavusios sesijos užbaigiamos pagal esamą mechanizmą. V1 register negali tyliai perrašyti aktyvaus V2 siauresniu V1 manifestu — 409.

## Parengtis ir mokymasis

Registracija nėra source acceptance ar learning admission. `onboarding.LEGACY_SITES` yra aiškus esamų šešių sąrašas; naujos PROFILES eilutės jo nepraplečia. Nauja niša numatytai source_ready=false/learning_admitted=false. Vietinis esamas V1 helperis ignoruoja naują neparengtą profilį ir tebeatnaujina esamus šešis. V2 šaltinių prijungimo loop dar atskiras inkrementas.

`GET/PUT /operator/sites/{site_id}/onboarding` naudoja atskirą operatoriaus auth, `{source_ready:false,learning_admitted:false}`. Keitimas reikalauja priimto aktyvaus šaltinio; learning=true dar reikalauja profilio, protected corpus ir registry hash sutapimo. Source/learning jungikliai nekeičia voice/SMTP/commerce/FB policy. Quality toliau registruoja problemą bei kandidatą, tačiau learning job nesukuriamas be admission; controller tikrina admission dar kartą prieš vykdymą.

**Dabartinis protected mokymosi harness ir Start modelis yra V1.** V2 learning admission blokuojamas, kol jis turi versijuotą corpus/pin/session adapterį. Dovanos123 profilio, Business registracijos, source įjungimo ar gyvų kanalų šiame inkremente nėra. Runtime lookup gali naudoti pilnai priimtą V2 šaltinį, bet tai nėra naujo V2 live/session kelio priėmimo įrodymas.

## Rašymo ribos

Core sesija: runtime knowledge_index/onboarding/knowledge/API, learning enqueue+controller admission, local_knowledge_sync, network_manifest version dispatch, knowledge_transport_v2 ir jų regresijos; šis dokumentas ir savo WORKSTREAMS. Root: viešo M2 API/renderer/niche-voice/host/compile; gift sesija: legacy gift adapteris/turinys. Aktyvūs v1 paketai, profiliai, learned releases, global DB registry ir production flags neperrašomi.

Actual QA rezultatai įrašomi atskirame M4 runtime validation dokumente po testų; šis kontraktas savaime nėra PASS.
