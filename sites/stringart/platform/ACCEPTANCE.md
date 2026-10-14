# Local platform acceptance

## Complete September month — owner follow-up, 14 October 2026

Current local data profile: `eu-ten-september-2026-v1`, built on PR129 `689053db3502bfad6aabb3f20edc23344443e642` in root's `codex/memorystring-month-fixtures-20261014`. The original small-fixture acceptance below is preserved as historical evidence.

**Month extension: local complete.** 489 September-created orders (186 portraits, 303 kit orders / 621 kits ordered), ten August carry-over orders, 40 assembly batches / 212 assembled kits, 100 purchases (70 received / 30 open), 20 transfers, 12 creator sources, 382 commission rows, 4,180 audit events and 2,893 movements. All ten studios have orders on every September day. Sixteen machines, 825 opening packed kits, 612 reconciled current kits. Current paid-minus-refunded September cohort: €85,232.08; refunded September orders: €6,259.71. These are explicitly synthetic examples, not observed business performance.

**24/24 Node/backend/actual HTTP tests PASS**, including the original 17 cases and seven month checks: deterministic generation / all days / distinct volumes, every intermediate movement and final reservation balance, receipt-only stock, chronology and exact project hash, non-overlapping machine jobs and declared capacity, money / refund / commission reconciliation, all ten role projections and supplier privacy, normal live-clock continuation / rollback / reopen / reset, and a real HTTP month response. New initialization preserves existing databases; CLI load saves the prior SQLite database before replacement. Two consistent pre-load backups remain ignored under `.local/backups/`.

Sequential CUA rendered review covers all ten completed partner overview responses (each identity and exact studio totals checked), operator overview and expanded 30-day table, order page 2, inventory / commission lists, supplier demand and open requests first, activity page 2 (51–100 of 4,180), normal 1440 desktop and 320 phone widths. Actual 200% CSS text (32px from 16px) plus simultaneous text-spacing overrides are measured at 320/1280 through a temporary isolated local QA server. Initial studio-tag/country and large-metric overflow is retained and repaired; final document widths 305/320 and 1265/1280, no unintended container overflow. Orders at enlarged 320 also pass. Browser zoom was attempted but did not change size and is not claimed. Readable two-dimensional tables deliberately scroll horizontally.

The first rapid identity sampling loop observed pending states; its record is retained separately and the final loop waits for the completed identity. The switch is disabled while loading. An initial full-state serial replay took about 230 seconds; a fixture-only disposable retained-state batch reduced the measured build to about 0.6 seconds. It runs the same business command engine and aborts the entire build on an invalid command; the final fixture load and every normal operation still use SQLite transactions. No runtime caller can set fixture timestamps or deterministic IDs.

Local raw proof: `proof/month-state.json`, `proof/month-browser.json`, `proof/month-initial-observations.json`, `proof/month-text-first-failure.json`, and `proof/captures/month-*.jpg`; originals are not reclassified as successful views. New copy was self-edited in context. The design detector returned incumbent typography/radius advisories; they do not establish visual acceptance or authorize a broader redesign. No mobile/shared-core/public runtime change, supplier message, paid service, real payment, physical acceptance or deployment occurred. Git fingerprints and delivery are in proof/EVIDENCE.md.


14 October 2026. Scope: English persistent local manufacturer demonstration, siteId `stringart`. Mode: synthetic fixtures and simulated external adapters. Current plan: PLAN.md. Dependency: PR126 / `5aa9eab3e355292f2f0ee725e74e9029520e1467`; current main fetched successfully at start/continue: `7af6b9641012a30c5f95eac38a66daeff8f8cb39`. Final source fingerprints and Git delivery are recorded in proof/EVIDENCE.md.

**Local authorized scope: complete.** Production launch and physical hardware/frame acceptance: not established. These results do not certify a real distributor network, tax model, machine interface or production identity system.

## Executed suites

`node scripts/git-freshness.mjs --phase continue -- node --test sites/stringart/platform/tests/*.test.mjs`: **17/17 PASS**, no skipped checks. Includes a native hostile-Host request, actual child-process restart and competing HTTP requests to two live server processes sharing one temporary SQLite database.

`node sites/stringart/platform/verify-browser.mjs <installed-playwright-index.mjs>` on local Microsoft Edge: **complete PASS**, 51 captures / ten recorded scenario groups in `proof/accepted-browser.json`. Real URL `http://127.0.0.1:8946`, measured 1440×1000 desktop, 390×844 phone, 320×800 narrow and 768×1024 intermediate. The logged-in test identity is selected per captured role, and all data is `eu-ten-v1` synthetic fixture state. No browser page errors.

Focused subsequent checks verify the added supplier receipt-date control and machine service, loading/network-error recovery, and final typography changes. `proof/final-states-browser.json` has nine captures. `proof/delivery-layout-browser.json` records an actual JSON download matching the stored project plus normal and measured 200% text/spacing at 1280/768/320 widths, including sidebar brand/navigation and main fields. Actual normal body font is 16px; resized body font is 32px. Simultaneous overrides: line height 1.5, paragraph spacing 2em, letter spacing .12em, word spacing .16em. These are CSS text-resizing tests, not claimed browser zoom. Document width equals each viewport, and tested narrow containers have no unintended overflow. Tables/navigation intentionally scroll with visible clipped continuation, scrollbar/accessibility affordances and table guidance.

Raw JSON/PNG captures and test DBs remain local/ignored. Selected actual images were inspected directly and in contact sheets for normal operator/partner/supplier families and adverse states. Initial failures are retained in proof/FIRST-FAILURES.md; screenshots were not overwritten by later-prefix results. The original complete browser suite's successful behavior remains evidence for unchanged components; targeted checks cover later typography and supplier-control changes. Extra targeted typography checks were necessary to repair concrete clipping; they were not cosmetic rerolls.

The collaborating chat's final live overview review found a singular purchase label error. Source follow-up `5f2fc47c55e4749d10fbee9493a399c871388342` fixes it; one actual pristine operator render plus browser-only zero/two fixtures confirm all three forms. Source/proof binding is appended in proof/EVIDENCE.md without overwriting original acceptance hashes. No backend or broader visual retest was needed for this copy-only change.

The same review then included the adjacent order and stock-line counters. Current copy source `c4fd8f4a4f0f3293a0a41ca3144e7516be6784b4` handles zero/one/two forms across all three queue labels, with a focused rendered matrix and unchanged persistent state. The collaborating chat independently reran all 17 backend/HTTP cases against handoff head `14c033b204cb09b2f22c804a1e3f86a65ac8cff2` and reported PASS; this copy batch changes no backend source.

The released consolidated-plan documentation scope is now version 6 in both existing language files, source `64952feb12ea4c362fdee09af5c3e1109fb63736`. Stable English/Lithuanian PDFs and supplier text exports were regenerated and their affected pages rendered/reviewed. Protected facts/economics/source chapters and URLs remain unchanged; physical/commercial uncertainties and the unsent proposal boundary remain explicit. PDF/source fingerprints and exact QA scope are appended in proof/EVIDENCE.md. No functional code or runtime data changes belong to that document batch.

## Acceptance matrix

| Requirement | Result | Evidence |
| --- | --- | --- |
| Exact ten-country seed / 16 machines / 825 opening packed kits | PASS | Seed totals test; fresh overview |
| Independent opening stock and historical fixture sales | PASS | Opening ledger; orders and explicit reporting notes |
| Operator overview, studio details, stock and machine/capacity records | PASS | Desktop/mobile captures and real authoritative state; capacity labelled hypothetical |
| Server-side partner read/write isolation | PASS | Foreign order/stock/production attempts rejected, own projections only; role browser journey |
| Supplier aggregate-only/private-field boundary | PASS | Sanitized state and normal/cached command responses; foreign supplier/receive/customer actions rejected |
| Approval tied to latest project revision | PASS | New preview invalidates approval; old revision/stale version rejected; exact JSON renders and downloads |
| Declared synthetic mono42/200 profile | PASS | Hash/revision/BOM snapshot; diameter/layout/colour mismatch tests; station profile checked |
| Actual physical frame/machine compatibility | UNVERIFIED | No equipment or supplier format accepted; JSON is hand-threading only |
| Portrait review → simulated payment → production/rework → quality/packing/shipment/delivery | PASS | Real browser journey with failed-QC replacement issue and cross-machine rework; persisted order ID |
| Production versus packing material consumption | PASS | Production issue consumes board/pins/thread once; packing only cover/box; cancellation does not restore used materials |
| Rework assignment and cancellation | PASS | Exactly one assigned machine, foreign validation rollback, completion/cancel release, unrelated jobs intact |
| Kit BOM assembly / packed sale / return | PASS | Atomic full BOM; kit sale uses packed SKU only; browser unopened-kit return/full refund; no duplicate restock |
| Reservations, cancellation, traceable adjustments | PASS | Reserved balance/invariants, release, mandatory reason and multi-component rollback tests |
| Transfer and purchase incoming/receipt | PASS | Dispatch does not credit destination; receipt credits once; supplier date/dispatch and operator receipt tested |
| Idempotency / stale edits / competing reservations | PASS | Principal-scoped cached response, body mismatch conflict, stale 409 UI, two-process last-unit winner |
| Restart persistence | PASS | Actual server process stop/start with the same DB and re-login; order survives, old in-memory session does not |
| One referral commission / partial, shipping-only and full refund | PASS | Integer cents, one row, goods-only basis, 30-day hold; historical simulated payout recovery |
| Role-specific empty/error/loading/conflict states | PASS | No results, unassigned supplier, stock shortage with values preserved, network error/refresh, delayed load, stale conflict |
| English copy and typography | PASS within tested scope | Same-author full UI/docs self-edit; original fonts/identity; long buyer/studio names; measured resize/spacing and visual review |
| Keyboard / accessible basic controls | PASS within tested scope | Semantic labels with unique targets, skip link, visible focus and actual tab reach; no blanket accessibility certification |
| Local fixture isolation / noindex / live adapters off | PASS | Loopback/Host/Origin gates, production refusal, no public projection or outbound execution |
| Audit / linked stock movement provenance | PASS | Actor, reason, transaction/order IDs, material issues, batch versions and original failures retained |
| Shared publishing/CRM/core adoption | NA | Private business adapter; no functional shared changes or companion interface |
| Public deployment, production auth, payment/email/shipping/payout adapters | Deferred / not authorized here | No external service, money movement, messages, domains or public release |

## Review boundaries

The collaborating original chat independently reproduced the machine reassignment defect, then verified its targeted regression and isolated cancellation/chronology reproduction against Store SHA-256 `e8ccffce2e1cd12a221caaf76c2dc7821e7a3adf7cf4670acdb76fb1cc01c6d5`. That is one scoped external check, not independent acceptance of the complete backend or UI. The rest of this review is sequential work by the implementing agent.

Final 7–10 minute supplier presentation is specified in RUNBOOK.md and exercised through the browser scenario. Actual presentation to a manufacturer, commercial demand, exclusive territory, brand clearance, physical equipment, production auth/hosting/adapters and a broader browser/device/assistive-technology matrix remain separate. Retail and partner subdomain sites and activation are intentionally deferred.

`scripts/core-upgrade-check.mjs` is absent from the fetched main, confirmed by the collaborating chat. This platform-only work implements no functional shared code/rule/skill upgrade, so shared-upgrade coverage is NA; no checker PASS is claimed. Git freshness and exact-staged repository safety are separate handoff checks. Android/mobile source, the original checkout and other agents' files are preserved.
