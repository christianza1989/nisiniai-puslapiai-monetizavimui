# Discount codes

The operator's **Nuolaidos** section manages one store's EUR discount codes using its existing `catalog` permission. No new operator grant or payment-provider permission is required. A code can be created, edited, scheduled or disabled; there is no destructive delete. Dates are entered and displayed in the operator browser's local time and persisted as UTC milliseconds. End time is exclusive and evaluated by the server.

Supported values are whole percentages1–99 or a fixed amount in EUR. The form accepts euros; the API persists integer cents. Codes contain3–40ASCII letters, digits, hyphen or underscore, beginning with a letter/digit; case and outside whitespace are normalized. One code applies to the entire merchandise subtotal, including configured product extras. It does not stack. The optional freeShipping checkbox additionally waives the customer delivery charge; the percentage or fixed reduction still applies only to merchandise. Codes are EUR-only, including percentage codes, so a minimum basket amount has one currency meaning. Other currencies remain available without a code.

After delivery is known, a coupon order must still total at least0.50EUR; this is a conservative local floor based on Stripe's standard EUR minimum ([primary documentation](https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts)). Preview before an address remains merchandise-only and does not imply that a sub-minimum payment is possible. Existing provider/account validation still applies.

Optional conditions: start/end dates, minimum merchandise subtotal, maximum uses. A fixed reduction must be smaller than the merchandise subtotal; this feature does not introduce a zero-payment order workflow. Unknown, disabled, future, expired, wrong-currency or exhausted codes are unavailable. A too-small basket has a separate recoverable error.

## Use accounting and concurrency

**A use is claimed when an order is created, including an unpaid order.** This is explicitly explained in the editor; the default is unlimited. Expiry, cancellation or refund does not automatically return a claimed use. An operator can increase the limit, but cannot lower it below the claimed count. This conservative policy prevents a delayed confirmed payment from exceeding a reused allowance. The limit is not described as paid sales.

Migration0027adds code definitions, append-only save commands and immutable order redemptions. Save commands have a stable caller-generated ID and expected version. Conflicting edits or a changed retry payload fail; a lost-reply replay does not create another code/version. Each order's redemption shares its atomic transaction with order creation, stock reservation and outbox events. A final database trigger checks the current definition/version, activation window and cap. A losing concurrent transaction rolls back its order and stock. Idempotent order replay does not consume another use.

The immutable order snapshot retains original unit/line prices plus `discountAmount` and `netLineAmount` per line, and a single `discount` with ID, version, code, kind, value, currency and total reduction. The order's amount is net merchandise plus the customer delivery charge. With freeShipping=true, delivery.amount is zero, delivery.amountBeforeDiscount retains the original validated tariff and discount.shippingAmount records the waived amount. The original carrier service/quote/dispatch/location remain unchanged. Later edits/expiry do not rewrite a saved order or stop an otherwise valid pending payment during its existing reservation window. An expired basket needs a new valid quote; no historical price is guaranteed for a new order.

Integer largest-remainder allocation distributes a reduction proportionally across lines with stable tie ordering. `settledLines` splits each quantity into at most two adjacent integer-cent prices, retaining exact total and quantity. The cart's existing20-line limit keeps Stripe below100items. Stripe receives those net unit prices through the existing Checkout Session integration, not newly created provider Coupons or an independent promotion-code field. Session amount, signed payment fact and immutable order amount must still match. No webhook or payment-truth gate is weakened.

Invoices show gross product lines, an explicit coupon reduction, delivery and the net paid total. Packing documents keep their existing amount-free behavior. Refund/document/journal amounts remain based on confirmed domain facts. Shipping declared merchandise value is net order value excluding delivery. Consented GA4 item prices/value are net, with exact quantity/cents; editable code strings are not sent to analytics. Catalogue/base metadata prices remain ordinary public prices.

## API and browser contract

- `GET /api/operator/discounts`: catalogue permission, up to1000current definitions with versions, conditions and claimed uses.
- `POST /api/operator/discounts`: catalogue permission. Body: `id`, stable `commandId`, `expectedVersion`, `code`, `kind` (`percent`/`fixed`), integer `value`, boolean `enabled`, optional boolean `freeShipping`, optional `minimumSubtotal` (cents, default 0), `startsAt`, `endsAt`, `maxUses` (nullable). Returns saved definition and `replayed`.
- `POST /api/discount-preview`: public same-origin, no-store, existing quote abuse bucket. Body: product `lines`, `country`, `currency`, `code`. No customer/address, carrier or Stripe call. Returns server-priced lines, subtotal, net merchandise amount and the applied code/reduction. It does not claim a use or disclose the private code list/count/conditions.
- Existing `/api/quote` and order creation accept optional `discountCode`. The quote binds the actual code version/reduction into `quoteHash`. Order request identity includes the normalized code. Browser-supplied monetary reductions are ignored.

One-page SDK adds an optional field before totals. Apply/Enter checks the code immediately before contact entry; remove clears it. Quantity/country changes revalidate against the server. Request tickets and cart fingerprints reject late replies; pending validation cannot create an order. Created-order fields lock and resume from the saved discount/amount without repricing. Classic checkout behavior is retained; this feature's code-entry UI is one-page only. LT/PL/LV/ET labels are included.

Memory Casting relays only the new buyer POST through its existing host/origin/size/trusted-ingress boundary. Operator APIs never enter the public relay. Anonymous private admin/module access retains its existing Access policy. Canonical client and checkout files must be synchronized through `sync-commerce-sdk.mjs` from the reviewed exact CORE commit.

## Deployment and rollback

Apply the additive migration through the canonical production migration operator first; never edit historical migration hashes or reset a store. Deploy the backend with actual current bindings/cron, then the exact SDK/relay/frontend. No coupon is auto-created or activated in production for testing; the operator creates their own commercial codes.

Rollback must preserve all code history, uses and discounted snapshots. Disable new code use via the versioned editor before removing entry UI. An old pre-discount payment adapter would send gross prices for new discounted orders and cannot be used as a complete rollback: retain the compatible `settledLines` payment/projection support, or stop creating new checkout sessions while recovering explicitly. Do not drop0027tables, restore stock/history or overwrite provider secrets to revert a screen.

Verification for the actual Memory Casting release is in `sites/memocasting/DISCOUNTS_2026_10_26.md`. Local fixture orders/payments/PDFs and a build are separate from hosted acceptance or a real paid transaction. The owner has deferred a real purchase; no new real payment/customer-message/shipment test is included.

## Optional free delivery

Migration 0028 adds free_shipping (default false) and the immutable redemption shipping_amount (default 0). Existing codes, versions, uses and saves are preserved. New editor saves include freeShipping:boolean. Legacy save commands without that property retain the current flag on edit and preserve their original command hash/replay behavior. No shipping-only/zero-merchandise-discount type is introduced: the checkbox combines with an existing percent or fixed-EUR merchandise discount.

Even with free shipping, the buyer must select a configured delivery method and a valid locker/address, and carrier-priced methods must obtain the usual current provider-bound quote. Only after validation is the customer charge waived. Provider/dispatch/currency/cart/expiry checks remain strict. Operator shipping quotes and booking costs stay independent; a zero customer delivery price never means free carrier service. A saved order retains the original waiver even when the coupon is later edited.

Public previews expose the freeShipping benefit immediately before contacts. The buyer sees 0 EUR delivery and net total, then still completes delivery details. Removing/changing a code invalidates that preview and restores ordinary pricing. A free-delivery code leaving under 0.50 EUR merchandise is rejected immediately, since shipping cannot lift that payment above the existing minimum. The editor and buyer message explain this.

Stripe receives net merchandise and no shipping line for a waived charge. GA4 shipping is 0 and merchandise value remains net; the invoice labels zero delivery as free under the code. Operator order detail shows the benefit; order_discounts.shipping_amount preserves its audit amount. Actual shipping plan declared value remains net merchandise, and separate carrier offers retain their real nonzero cost.
