# Purchase UI acceptance — 6 October 2026

The production overlay now includes private account order history, verified order status, subtotal/shipping/total, payment summary and licence record downloads, hardware tracking and qualified review submission. Shop count/finish choices use server prices and per-finish availability. A durable browser request identifier survives reload/retry; it clears after a verified completed payment. Sign-in restores the chosen setup, or returns to an allowlisted owned-order URL without arbitrary redirects.

Hosted Stripe Checkout keeps payment fields outside the website. The return page polls a bounded number of times and offers Refresh; a success URL alone never marks an order paid. Documents/order history require the buyer session. Refunds remove licence access and review eligibility. Operator actions use a separate protected server credential, never browser code or customer cookies.

Two actual browser sandbox payments succeeded: the $70 hardware fixture ($65 setup + $5 test delivery) and the $29 app-only fixture ($0 delivery). Real signed Stripe webhooks updated their orders. The test licence downloaded through the browser and the account history linked back to the owned order. A declined card, successful full test refund, review withdrawal, simulated dispatch/delivery and actual Session expiry were also checked. Synthetic stock, shipping, buyer and review data exist only in the dedicated playground, whose prominent banner/Checkout/documents clearly state that no actual purchase or shipment occurs.

Desktop and 320-pixel order views were inspected. The mobile order wraps its long identifier and has no horizontal overflow or broken visible images. Initial generated punctuation exposed a replacement character in the rendered confirmation; it was corrected and the rebuilt page inspected. Provider form-fill tools reported timeouts after filling the controls, so the visible state was checked before submission rather than repeating an uncertain action.

The immutable prototype, accepted homepage and original ZIP/APK remain untouched. Public production checkout is still disabled pending seller verification/live runtime credentials and factual shipping/tax/return/licence terms. The website entitlement is not a native activation key. Automatic purchase email and tax invoices are not included in this release. The core's `deploy/phonebridger/PLAYGROUND.md` holds reproducible operational instructions; private screenshots/fixtures/credentials stay outside Git.

## Purchase preparation update — 6 October 2026

The live available CTA is Buy now; disabled mode deliberately retains the enquiry action, and PLAYGROUND stays clearly labelled test checkout. One-time pricing and free manual-supplier shipping copy apply only to available live offers. Private live confirmations include the immutable accepted terms/seller/version; the application requires consent before requesting a provider Session. Buyer data stays private.

A separate isolated synthetic withdrawal request was saved and its downloaded confirmation matched the exact D1 identifier/time. The browser event reporter timed out despite a successful file download; filesystem/server reconciliation proved the result, without replaying the form. Mail was disabled and only the exact test row was cleaned up. Desktop/320-pixel canonical withdrawal form checks pass. No real withdrawal or live payment occurred.

The owner has supplied a publishable key only. Server restricted key, signing secret and factual live activation review remain unfinished; the current public Buy now action is therefore not enabled. The prepared browser key form awaits the human's final creation action. Test payments remain evidence of sandbox behavior, not real sales.
