# LT pardavimo įjungimas — 2026-10-20

Užsakymų priėmimas https://memocasting.lt/cart įjungtas. Tai pakeičia ankstesnį sustabdytos prekybos checkpoint, tačiau nėra atlikto realaus mokėjimo ar išsiųstos siuntos įrodymas.

## Faktinis leidinys ir duomenys

- CORE source `30e86bb106b21a7f6621bde09494da741b29246f`; reviewed SDK client SHA256 `3a357fa218937f2fc98dbff35375c5f65cb355f0471d35b0e9eeb5a9f0366fc1`, checkout-ui `7741c30fca32570cfd734bcb601e8aeb02e6d74745d8cf04fe6f98d8dfc59cac`.
- Frontend `memocasting-site`: `0409e620-3e07-46f1-9a23-9fcffbcfa5e1` (PUBLIC `55477b624f88e228926ad796bf38494193cf246e`); commerce `bebb13b7-1e55-4dcc-85c1-b337c4f43396`; private mail `d06410b6-9250-4e77-9494-e58d41db125f`. Actual deployments re-read 2026-10-20 17:13 UTC.
- Content release `d1c35033-395f-4749-b9bb-c29a19db8248`, package SHA256 `adab7ea4f614f43edd5d3f770770bff133318d34aa0df31dac63e1dbbe07a5d0`:181 pages/757 media. Includes four LT policy/contact revisions from prior9fcc5cd3 and three product/catalog corrections: real2.2/4.5kg, no test-price/payment-disabled claims, unavailable wooden base not offered as purchasable. Two misleading base image references detached from these pages, original assets/history retained. Other178 page snapshots unchanged in final batch; all92 article dates preserved.
- LT terms revision `1ac82535e2a42bff2f1864275e013309afb26e0f6099cd690e254d25125dc685` matches backend market policy. PL/LV/EE checkout remains disabled and excluded from cart selection.
- Exact-old-config CAS enabled LT retail/production/document admissions at16:20 UTC; second CAS enabled notifications at17:00 UTC. Current `/prekyba/storefront-context`: productionReady, live Stripe, embeddedCheckoutConfigured, shippingQuotesConnected, documentReady, publishOffers true; eligibleCountries LT only.
- Existing commerce D1 `534c0277-9563-4ec3-91fc-8e1e89e7f2c9` and EU R2 `memocasting-commerce-private` preserved. R2 owned probe put/get/hash passed. No customer table reset or rollback performed.
- Private notification D1 `a991978e-2af2-4a53-8950-000e811c30f1`, dedicated new database with canonical0001 migration. Commerce cron `* * * * *` and COMMERCE_AUTOMATION_ENABLED=1 active. Frontend leads DB, Instagram binding, routes and observability preserved.

## Actual acceptance and limits

1. Native carrier failure reproduced: Workers rejects redirect:error. Canonical adapter now uses manual redirects and rejects3xx before parsing, with native no-credential-forwarding regression. Real public quote returned200; owner route showed couple32€ + SmartPosti5.24€ =37.24€. A route quote is not a fixed nationwide price.
2. Actual LIVE Stripe embedded Session created for one clearly marked, unpaid owner technical order. Original428-character percent-encoded client_secret exposed an invalid heuristic. Server and SDK now pass opaque nonblank bounded credential unchanged; exact Session/account/order/amount/currency/mode checks and original idempotency remain. Same original Session recovered twice200; no duplicate order, charge or invoice. Actual paid acceptance and visual payment iframe are not certified by this receipt.
3. Dedicated approved Hostinger token for existing info@pinet.lt installed only as private Worker binding. Exact sender verified through `/api/v1/me`. HTTPS API self-test accepted204 and its exact internal marker found in owner Gmail INBOX. First failed SMTP attempt remains unknown and is not replayed.
4. Real cron processed the technical OrderPlaced event: notification accepted, six outbox deliveries done, no last error at17:05 UTC. Order was pending/reserved; documents0. OrderPlaced does not imply payment.
5. Canonical195 tests, native D1/R2/restart/transport smoke and build passed. PUBLIC133 tests and11 mail tests passed. Original failures retained in ignored private QA. Scoped source delivery and main adoption are separate.

## Operator handoff

Orders: https://login.memocasting.lt (existing Access identity). Customer cart: https://memocasting.lt/cart. Prices32€/48€, white paint included in both, temporary bucket inventory999 retained by owner instruction. Packed weights2.2kg/4.5kg, dimensions20×20×17cm /25×25×20cm. Document series MCWEB/MCWEBK/MCWEBP; seller non-VAT. Shipping/returns address Molynės g.2C differs from registered Pupinės g.10-55.

Sendparcel prepaid wallet last observed0€, credit0€. Owner deferred top-up. This does not disable customer checkout: fulfillment is manual after actual payment and physical packing. Before purchasing a label, fund the wallet, verify actual packed parcel and current carrier quote. All autoPrepareIndividualShipments/autoExecutePreparedShipments/autoCollectShipmentDocuments remain false. No paid label or wallet payment was performed.

Customer support remains info@memorycasting.lt. Notification display name Memocasting, authenticated From info@pinet.lt. Hostinger API does not promise custom Message-ID or Reply-To headers; reply address is explicitly included in body. Internal accepted reference is not a provider queue ID or inbox proof.

## Recovery

Preserve actual new orders, payments, document numbering, outbox, private bindings and cron. Do not restore a complete pre-launch DB/config snapshot. On a reproducible sales incident, compare fresh actual settings and narrowly disable affected admission if necessary, then apply a compatible source correction; keep paid-order recovery available. Prior frontend8fcc/4f5e lacks latest fixes, old backend lacks valid edge transport/opaque credential behavior, old mail SMTP cannot connect from this runtime. Blind version rollback is unsafe. Unknown mail/carrier attempts must be reconciled by original IDs, never replayed with new IDs.

Private receipts, original failure logs, CAS snapshots and credentials remain only under ignored `qa/memocasting-launch-20261020/` and provider secret bindings. No secrets or customer payload are part of this handoff.

Final local route-free production artifact SEO smoke passed:100 currently public pages, canonical/schema/robots/sitemap/LLM outputs/host isolation/404. Initial custom-domain preview Host rewriting failure preserved separately; the maintained route-free preview configuration resolves it without production config changes. Mobile390 cart and real quote37.24EUR reviewed; no horizontal overflow.
