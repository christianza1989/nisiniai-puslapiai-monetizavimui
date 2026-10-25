# Operator workspace

The authenticated `/admin` surface is a shared commerce workspace. Memory Casting uses https://login.memocasting.lt/admin behind its existing access policy; no new operator grants are introduced by the interface.

## Daily tasks

- Orders: search the loaded window by reference, buyer, email or product. Filters distinguish active unpaid reservations, confirmed payments, preparation, expired reservations and refunds. The count states how many rows are loaded; load older records before searching beyond that window.
- Order detail: buyer/delivery and item/amount summaries precede fulfillment, documents and reconciliation actions. Payment and refundable balance come from server records, never a redirect or browser inference.
- Products: choose a row's Edit action, then edit descriptions, prices, images, paint/base choices, parcel measurements and SEO fields. Save draft, preview and publish remain separate. Versions preserve previous order snapshots; a draft cannot change historic prices or reservations.
- Stock, documents, finance and wholesale keep existing permission checks and durable APIs. Interface completion is not evidence of a bank transfer, refund, shipment or mail receipt.
- Automatic jobs displays the configured sender, sending switch and payment recovery policy. These are read-only operational facts, not unimplemented setting controls.

## Interaction rules

The desktop sidebar stays present; the mobile menu expands explicitly. Every asynchronous section owns a detachable panel. Order requests also carry a latest-request ticket, and product-save completions are bound to the opened product. A late response cannot redirect navigation or clear another product's dirty state. Global feedback has an ownership revision: an older operation cannot replace newer feedback, while a normal refresh completes after rebuilding its panel.

Unsaved product changes require a focused discard dialog before switching products, leaving the editor, changing sections, refreshing or logging out. Browser unload uses its native guard. Discard abandons unsaved input; it does not delete a stored draft. A canceled or stale publication returns a silent outcome, never a publication-success message.

## Verification and scope

The 2026-10-25 redesign was inspected with isolated data: desktop order/finance views, a 320 CSS-pixel layout, keyboard focus, search/filter behavior, real draft API roundtrip, dirty-dialog choices, and deliberately delayed section/order/draft requests. The production release record belongs in `sites/memocasting/ADMIN_DASHBOARD_2026_10_25.md`. Private screenshots, fixture data and customer/provider receipts stay outside Git.

This is a bounded visual and functional acceptance, not a complete assistive-technology conformance audit, production load test or real payment experiment. Preserve the current provider bindings, mailbox identity, reservation policy and customer records when deploying the shared backend.
