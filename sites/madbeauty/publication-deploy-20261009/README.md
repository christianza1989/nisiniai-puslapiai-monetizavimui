# Madbeauty publication dates — 2026-10-09

This narrowly scoped release reschedules 25 future approved guides in the existing live 39-page / 35-guide edition. Fourteen page snapshots remain unchanged. All page bodies, source citations, illustrations, editorial claims and historical guide dates remain unchanged. The separately planned 295-guide calendar includes unwritten briefs; this release does not claim that those articles already exist.

The full platform upgrade remains active and its draft PR26 is not merged or deployed by this release.

## Immutable identities

| Component | Source / SHA256 |
| --- | --- |
| Incumbent production runtime | `b7a34b1703060c4d8d5e426fa29347a393c32dff` |
| Incumbent production core | `63cfd8c2043eb2afa5eb6af638bae4dad9c86d46` |
| Calendar package source | `e165b75101655527681c4eed6f72c4e2b6aee566`, writer PR47 |
| Previous package | `75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4` |
| New package | `bb1b90aa2929d9cc63607afb9b77977203eb9bc45031a6c8ae5e8775ce378511` |
| Actual incumbent renderer | `0c48d38915c7ab442c362d292b5250a91a33f0d604eeb0564f3bcea129d61ae0` |
| Production compiled artifact | `1898da08cc32f5e23f6dcf9c89fa5f04601a28f63cd5b8bb21afd47b00b98245` |
| Private QA compiled artifact | `5f7bc18d2ec8fd92c172bb77941db97882e3245972f8440c9d426cf4e1c7d70a` |

The producer's prior local review used renderer `52ec0a75...` and core `37208b8`. It is not evidence of consumer acceptance on the actual live b7/63 code. Consumer acceptance in this folder uses the exact incumbent renderer/core, without rewriting the immutable package or the historical producer review.

## Build and consumer acceptance

`build.mjs` invokes the maintained Cloudflare builder with the exact core63 snapshot, then pins every runtime shared-core import to that same snapshot during compilation. It does not change any incumbent runtime source. Production keeps normal `Date.now()`, class `MadbeautyPlatform`, migration `v1`, and the existing `PLATFORM` namespace.

The isolated QA artifact has a per-request publication clock hook and a separate `CalendarSource` SQLite namespace. Its gateway requires a private bearer credential, permits only read-only content requests, blocks the entire application API, and has no SMTP bindings. The hook and credential gateway do not enter the production artifact. Private compiled bundles, secrets, manifests and detailed receipts stay in ignored `cloudflare/output/calendar-private`; secrets are never committed.

`accept.mjs native` and `accept.mjs hosted` verify all 32 future guide instants at T−1 ms and T: exact JSON page projection, route status, SSR title/date/Article schema, all guide URLs in sitemap and both LLM discovery outputs, and actual media bytes. Shared media eligibility is derived from every currently public page. Native unknown-host rejection is distinct from hosted gates; an unregistered external hostname cannot reach the QA Worker, and no DNS/TLS bypass is used.

`accept.mjs live-before` compares every currently public asset byte against the canonical domain before deployment. `live-after` verifies the actual package header, current projection, future route/media exclusion, canonical redirects, robots and private-file denial after deployment. All 284 registered static paths are checked: 129 served exact files and 155 blocked future media at today's real clock.

`provider.mjs before|predeploy|after` compares actual Cloudflare settings, plain vars, secret names, domain assignments, class/namespace and migration tag. Predeploy requires the incumbent version `f8eba745-b8ef-446e-aeff-3c8b95c762bd`. It never reads secret values or writes business data. A changed baseline must be reconciled before deployment.

## Results

Local consumer acceptance: 64 publication states, eight gateway checks, 284 asset paths PASS. Hosted acceptance on version `2b39ad0a-e114-4793-919f-cc38ef20f2b1`: 64 publication states, seven gateway checks, 284 asset paths PASS. Its isolated namespace is `66b5a76fd6864563b5c3248e2290e55b`. Canonical pre-deployment byte comparison PASS. Final canonical deployment results are recorded in the release receipt when completed.

The first canonical test observed a normal Cloudflare 307 encoding redirect for a font filename; the harness now verifies its same-origin decoded path before comparing the returned bytes. The first hosted test tried an unregistered foreign hostname and failed DNS lookup; that check remains explicitly native-only. A later hosted run timed out after the Christmas guide; the final complete run passed. Read-only HTTP requests now log transport failures and allow one bounded retry, without changing assertion failures into retries. The initial provider helper queried migration metadata from the settings endpoint, which does not expose it; the corrected helper reads the actual script metadata and normalizes optional fields consistently with its persisted JSON receipt. Earlier diagnostic logs are retained privately.

Future dates are tested through the isolated clock. They are not claimed as elapsed production-time publication. Native browser views of the canonical domain are separately recorded after release. No real salon onboarding, booking/reminder delivery, retention deletion, storage handoff or paid feature activation is performed by this dates-only release.
