# Optional commerce measurement

`src/analytics.mjs` is disabled without an admitted store entry in the private `COMMERCE_ANALYTICS` binding. An entry contains `enabled`, exact `environment`, `measurementId`, secret `apiSecret`, current `consentVersion` and allowed `countries`. Do not put this JSON or its identifiers in a product/content package, client bundle or logs. Malformed optional config disables only measurement, not the functional shop.

The buyer-authenticated `POST /api/orders/:id/analytics` binds a consented gtag client/session to a still-pending order. It cannot attach a new visitor to an old paid order, change totals or mark payment. A denied choice wipes identifiers and cancels unsent events; anonymous/cross-origin/foreign-store requests cannot use another order. No analytics context is required to buy. New purposes need fresh consent; do not silently expand old preferences.

Existing signed Stripe handlers remain the only source of confirmed payment. The existing scheduled Worker separately processes `PaymentConfirmed` / `PaidStockException` and `RefundConfirmed` facts for orders with consent. This consumer cannot block invoice, mail or shipping jobs. Migration 0026 is additive, changes no business tables and is applied through the canonical migration ledger. Keep the actual production scheduler rather than creating a second job.

Each purchase has one stable non-access-bearing transaction ID, a unique delivery row and a bounded lease. Retries reuse that ID for GA4 purchase deduplication. A 2xx collection response is transport acceptance, not proof of an ingested GA4 report. Validate payloads through `/debug/mp/collect` and confirm the real owned stream separately. Never manufacture a production paid order or send a synthetic purchase to production reports. Refunds have their own delivery row; uncertain network outcomes enter `review` rather than silently double-count a refund. The shop remains the financial truth.

Payloads project only SKU / enumerated options, quantities, cents-derived item value, separately identified shipping, currency and transaction ID. Editable order titles and customer/shipping/access/payment-provider information never enter GA4. Partial refunds carry verified monetary values without invented item quantities. Purchase/refund sum allocation cannot exceed the actual order amount.

Use the tag-generated client/session IDs. Session association is sent only within Google's documented 24-hour limit; later asynchronous payments can have unattributed revenue. Drop events older than 72 hours rather than falsify timestamps. Wipe client/session associations after withdrawal, consent expiry or 60 days; keep only delivery tombstones. Requests already in flight cannot be recalled. Browser blocking, no consent and missing attribution cause incomplete analytics; do not infer zero shop sales from GA4.

Rollback: disable/remove only the optional measurement binding, preserve all actual payment/mail/carrier/access secrets and bindings, and revert scoped code if required. Do not roll back order data or old migrations. Isolation tests use fake adapters/signed sandbox events and disposable databases; a live charge is not a prerequisite for testing this consumer.

Official references checked 2026-10-25:

- https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events
- https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events
- https://developers.google.com/analytics/devguides/collection/protocol/ga4/use-cases
- https://developers.google.com/analytics/devguides/collection/ga4/reference/events
