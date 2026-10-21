# Same-view payment — 2026-10-21

Owner requested keeping contact details, delivery, items, total and payment in one cart view. Previously one-page create replaced its form with a separate receipt/payment presentation even though URL stayed /cart. Original same-form regression failed; screenshot and actual existing unpaid owner order reproduced that view.

## Implemented source

CORE759c0cd84218628ab1c5a106d66b957fc754d926 keeps the original form DOM and values while renderPayment mounts below delivery in checkout-details. Confirmed customer/quantity/terms controls lock to the original order; initial submit hides. Provider rendering failures retry the same order, never create another. Unknown create responses retain original recovery identity in place. Compatible pending orders restore snapshot details and amounts without quote/create or cart resurrection; only server payment state permits final receipt. Cleanup covers navigation, late mounting and abort. Classic/non-embedded flows remain supported. No provider API, Session mode, keys or backend changes.

PUBLICfe26549d3ae8fa8bfbad8a3a5d6b260d389ea37e exports that exact canonical SDK and applies scoped inline styles: existing19px payment heading, full-width row below contact/delivery, white surface with one separator, readable locked fields and44px action controls. Existing branded form, sidebar and mobile linear flow retained.

## Checks and deployment

35focused buyer/cart/embedded tests pass; final20cart tests also cover locked +/-/remove controls. Tests include one original create, same form identity, saved order amount, no new quote/cart resurrection, failed payment mount retry, late abort cleanup and pending versus paid server completion.134PUBLIC tests, production build and100page SEO smoke pass. Scoped style detector has no findings; source scans are separate from native rendering. Original FAILs and private logs retained under ignored qa/memocasting-delivery-20261021.

Pinned Wrangler4.92 deployed memocasting-site190ee50b-90e7-4b19-bda4-ac5f0b964ef9 at100percent on existing HTTPS apex/www. Upload4068.53KiB/gzip1060.52KiB, startup21ms. Automatic asset upload retry succeeded; no second deployment or runtime workaround. Fresh before/after bindings and observability exact-equal. Backend remains bebb13b7-1e55-4dcc-85c1-b337c4f43396; mail/content/DNS/DB/admissions/cron/keys unchanged. Exact UI SHA0a9ff8ff56eaf619d59ebc8b72f5c2ecbb5c2db72150ff838aa755d9ffb90f0f; client SHA385cfbee944643f9088d92209e62d475c0a80d6f4b06f3b835fd7e52a90c4e9d unchanged.

## Native evidence and its boundary

Actual owner Chrome on /cart after reload: one same-view form, original customer/address values locked, original couple1, delivery5.24EUR, total37.24EUR, payment pane directly within checkout-details, one Stripe iframe, document1265/viewport1280. No parent console errors. Initial iframe paint was still about:blank; the owner subsequently closed that Chrome tab during verification. Its complete hosted iframe paint was therefore not certified. No owner card values were entered or discarded.

To avoid generating a new order, a read-only exact original-order lookup plus original Stripe Session retrieval confirmed pending/reserved, open embedded_page, correct3724c and matching order metadata. No token minted, Session recreated, order changed, confirmation or payment call. A private loopback-only QA page then used those original public client details and exact canonical UI/payment renderer with all order mutation methods disabled. Real Stripe card fields and Pay button loaded successfully in that same form; no mocked card frame. Desktop1280/mobile390, document375px at390, product image decoded and one form/iframe confirmed. This is same-Session component/layout acceptance, not a claimed new production transaction or a substitute for the interrupted hosted iframe-paint check. The loopback HTTP warning is development-only; public site remains HTTPS. Private QA data/credentials never enter Git, public content or URLs. Private preview closed after verification; no payment made.

Screenshots include original hosted layout and isolated same-Session desktop/mobile views. Isolated preview omits site chrome and uses fallback font; it is labelled as a preview, not a public screenshot. No additional whole-site aesthetic audit, resizing certification or paid-payment test claimed.

## Rollback and delivery

Previous frontendbb4d1e04-be77-494a-952c-db4416ae17b5 after a fresh actual settings read. Revert only UI/SDK adoption/style if needed; preserve original live orders, Sessions, keys, provider pacing, admissions, mail, article dates and all data. Source branch PR101/31 and actual site adoption are separate from main merge and other PCs.
