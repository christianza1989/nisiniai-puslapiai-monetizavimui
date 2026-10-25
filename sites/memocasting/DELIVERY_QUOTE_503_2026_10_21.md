# Delivery quote503 incident — 2026-10-21

Owner reported public `/prekyba/delivery-quotes`503 before payment. Reproduced before changes: two overlapping same-address, same-kit quote reads returned200 in9623ms and503`commerce_connection_failed` in10313ms. No order or payment was needed to reproduce. The public bridge10second deadline was shorter than canonical provider pacing10second wait plus15second bounded fetch. The browser20second deadline was also insufficient for that full budget. Auto650ms calculation and submit started different carrier calls for the same unchanged checkout revision.

## Repair and source

Canonical CORE65964f9b78b000f3078178ca619870e901bb1947 adds35second client deadline only for delivery quote; unchanged20seconds elsewhere. One-page checkout shares the pending promise for an unchanged revision, clears failed promise for an explicit retry, ignores old address results and does not let their finally clear the newer pending request. Full server amount/hash/currency/lines checks, field locking, original order replay and payment safeguards remain. Loading uses existing status typography; actual service failures explain temporary delivery unavailability in LT/PL/LV/ET instead of blaming valid customer data. No automatic retry or fabricated tariff.

PUBLICa866123af97070dbd237b4aa65feaff8f87ee1ad exports both canonical browser files through maintained exact-revision SDK pipeline and gives only POST delivery-quotes30seconds in the transport relay. Other routes retain10seconds; ingress/host/origin/body/redirect and private header boundaries retained.

Upgrades: canonical upgrade-0d7f5801-8435-46cd-81cc-694cec20ea2b; PUBLIC scope upgrade-2993766c-8fdb-473f-8bdd-d50c897748d0. Source pushed to existing PR101/31; main merge is separate from actual site adoption.

## Verification and actual adoption

Original failing regressions retained privately. After fix:33focused buyer/cart/embedded tests pass; includes auto quote+submit sharing, one create, retry after delivery failure, stale address rejection, lost create recovery and opaque Stripe credential. Actual11second bridge fixture changed503→200; public134tests pass, production build and100page local SEO smoke pass. Scoped formatting, staged safety and upgrade provenance pass. This is a narrow incident repair, not a new full-site audit.

Pinned Wrangler4.92 deployed frontendbb4d1e04-be77-494a-952c-db4416ae17b5 at2026-10-21~05:16UTC,100percent on both existing HTTPS custom domains. Upload4066.23KiB/gzip1059.90KiB/startup25ms. Exact SDK source65964f9b: clientSHA385cfbee944643f9088d92209e62d475c0a80d6f4b06f3b835fd7e52a90c4e9d; uiSHA717341043f055283aac7c437ca0bf4ac174ccbde002da745acd970f959c4885f. Fresh before/after settings prove identical ASSETS/leadsD1/MEMO_COMMERCE/MEMO_INSTAGRAM bindings and observability. Both existing domains preserved; backend remains bebb13b7-1e55-4dcc-85c1-b337c4f43396. No DNS, secret, DB, content release/date, cron, provider or admission changes.

Actual public repeated overlap reads after deployment:200 in8503ms and200 in16896ms, both524c. The second proves successful response beyond both original bridge10seconds and screenshot failure point. Native public cart1280 and390: real SmartPosti quote5.24EUR, total37.24EUR for couple1 at the business dispatch address; no generic error, no browser console errors, no horizontal overflow(document1265/375). Desktop/mobile screenshots privately retained. Existing typography and one-page/sidebar placement remain; no style changes. Viewport override reset; owner cart kept open, terms unchecked and no order created.

Private receipts and screenshots: ignored `qa/memocasting-delivery-20261021/`. Do not expose auth files/customer data. The checks exercised quotes only; no new LIVE payment, charge, invoice, carrier booking or wallet top-up. Earlier actual unpaid Stripe acceptance remains separately recorded in SALES_ACTIVATION_2026_10_20.md.

## Rollback

Previous frontendeec41153-3b79-41fd-bae9-40d8960c1390 after fresh actual settings comparison; this restores the demonstrated quote timeout, so prefer a compatible correction. Never restore business DB, replay unknown payments, roll back mail/backend, or replace bindings/content to reverse a frontend transport change. Preserve intervening owner orders and all existing secrets.
