# Production edition

## Shared header and footer — 6 October 2026

The owner explicitly authorized changing the homepage header/footer to match every inner page. `shell.mjs` is the single structural source for all 19 pages; `shared-shell/` supplies scoped CSS, accessible menu behavior and native SVG assets. Production builds keep the original prototype attestation and main content. The old homepage navigation block is replaced by shared navigation without changing its demo engine or detail handlers.

Links are absolute, active destinations are marked, the narrow menu supports Escape/outside-click/focus exit and the demo can hide the header during pointer lock. The footer contains product/help/legal/account routes, the owner-selected seller, contact and four card network badges. It explicitly leaves method availability to Checkout; badges are not proof of live activation or every card being accepted. Payment documentation consulted: https://docs.stripe.com/payments/cards.

Run `node sites/phonebridger/production/check-shell.mjs` from the companion after the core build to verify exactly one identical shell on all 19 routes, actual route destinations and valid navigation scripts. Actual rendered acceptance is recorded in the core release log separately.

## Shop overlay — 6 October 2026

`source.mjs` replaces shop/checkout main content and adds account-owned order history using the maintained `shop-v2/` kit and exports an exact five-file frontend asset allowlist. The immutable prototype is still byte-checked. Changed shop and terms bodies are reviewed through the same Studio flow. The core emits 14 public and five private routes; the private checkout/order page has no canonical, schema or public-discovery entry.

The gallery/configurator, selection restoration, setup enquiry, FAQs and honest customer-review empty state are implemented. Desktop and 390/320-pixel mobile views were rendered, gallery/count/finish/save behavior checked, and the selected setup actually appeared in the contact form. No visible broken images or console errors were observed. The production backend supplies account-owned orders and qualified/moderated real reviews, with payments gated off.

The owner-selected proposed seller is MB Memocasting. Stripe account payouts/verification, protected runtime credentials, confirmed inventory/shipping, tax/return terms and actual paid delivery remain pending. Actual hosted sandbox purchases and provider webhooks are now verified in shop-v2/PURCHASE_FLOW.md. No live sale is claimed. The beta is still free; the action remains a working enquiry. See the sibling core's `deploy/phonebridger/COMMERCE.md` and release evidence for activation. A prototype fixture, plugin login or local signed test is not live commerce acceptance.

This directory contains an isolated production transform, reviewed public content package and editorial review tool. The accepted prototype and its manifest remain immutable. The companion has no Cloudflare credentials or live database. Hosting is supplied by the sibling core's `deploy/phonebridger/` adapter, which consumes shared core publication and SEO helpers.

`transform.mjs` replaces private-preview service copy and mail drafts with the live-service contract, removes the private banner, restores existing download destinations and adds required enquiry/consent fields. The website contact service stores enquiries before notifying the owner-created Hostinger mailbox. Account pages stay noindex; email verification, automatic recovery, live checkout and creator features are not enabled. Sandbox purchase/order services are available separately. These limitations are reflected in account/privacy copy.

`package/content-package.json` is the exact Studio-reviewed production edition: 14 public pages, with approved revision hashes and the admitted media families. It is not a source of credentials, private originals or client records. The deployment build cannot mint approvals or silently replace its contact/privacy content.

Run `review.mjs <isolated-editorial-workspace>` only after reviewing changed facts and copy under the owner's current scope. It updates the applicable pages through maintained Studio APIs and exports an exact edition. It requires an existing private workspace and does not manufacture a new editorial state. Original images remain private; public responsive families are admitted through the maintained media workflow.

Public acceptance evidence is recorded in the sibling core's `deploy/phonebridger/LAUNCH_STATUS.md`. The owner resolved Cloudflare account verification; phonebridger.com now uses the dedicated Worker and preserved Hostinger mail DNS. Actual edge auth/download/canonical/form-inbox checks pass, with a documented local DNS-cache limitation during propagation. A local preview alone is never public acceptance. The frozen native mouse baseline and original installers remain unchanged. Checkout/creator are deferred and account verification/recovery limitations remain disclosed.

## Reviewed purchase edition — 6 October 2026

purchase-terms.mjs owns phonebridger-v1-20261006 and its editable public terms. The deployment adapter must use the same edition for immutable live order confirmations. Current reviewed shop/privacy/terms and account copy distinguish purchase records from native activation and include manual supplier fulfilment and withdrawal routes. Actual public register details belong to MB Memocasting; other niches keep their own operators. The additive contact withdrawal view uses the existing saved enquiry service and offers a confirmation download only after durable acceptance.

The final canonical release is c66c19b6-9747-4787-b811-410ffbe0719e. Its 14 editorial revisions/descriptions, account copy and all 19 shared shells/assets are verified. Live Checkout remains disabled pending the owner's restricted-key handoff, runtime webhook and reviewed activation configuration; pk_live alone is insufficient. See the sibling core's latest LAUNCH_STATUS/COMMERCE sections.

## Current live purchase state — 6 October 2026

The owner subsequently supplied the restricted key and canonical live Checkout is now active on Worker 2f63ee9b-5775-4418-9837-281d21296a20. Earlier preparation/disabled-state descriptions above are historical. Reviewed public terms remain the same edition; the Buy now action is a native button, preserves the selection through login and requires consent before any Session creation. A pending submission disables the button; disabled mode retains an enquiry fallback. No private credential is present in this companion. Canonical public/private/download/shell checks pass. Two live technical Sessions were inspected unpaid and expired through real signed callbacks; no actual charge occurred. Payout verification, native unlocking, invoice/email delivery and physical fulfilment remain distinct business outcomes.
