# Production edition

## Shop overlay — 6 October 2026

`source.mjs` replaces shop/checkout main content and adds account-owned order history using the maintained `shop-v2/` kit and exports an exact five-file frontend asset allowlist. The immutable prototype is still byte-checked. Changed shop and terms bodies are reviewed through the same Studio flow. The core emits 14 public and five private routes; the private checkout/order page has no canonical, schema or public-discovery entry.

The gallery/configurator, selection restoration, setup enquiry, FAQs and honest customer-review empty state are implemented. Desktop and 390/320-pixel mobile views were rendered, gallery/count/finish/save behavior checked, and the selected setup actually appeared in the contact form. No visible broken images or console errors were observed. The production backend supplies account-owned orders and qualified/moderated real reviews, with payments gated off.

The owner-selected proposed seller is MB Memocasting. Stripe account payouts/verification, protected runtime credentials, confirmed inventory/shipping, tax/return terms and actual paid delivery remain pending. Actual hosted sandbox purchases and provider webhooks are now verified in shop-v2/PURCHASE_FLOW.md. No live sale is claimed. The beta is still free; the action remains a working enquiry. See the sibling core's `deploy/phonebridger/COMMERCE.md` and release evidence for activation. A prototype fixture, plugin login or local signed test is not live commerce acceptance.

This directory contains an isolated production transform, reviewed public content package and editorial review tool. The accepted prototype and its manifest remain immutable. The companion has no Cloudflare credentials or live database. Hosting is supplied by the sibling core's `deploy/phonebridger/` adapter, which consumes shared core publication and SEO helpers.

`transform.mjs` replaces private-preview service copy and mail drafts with the live-service contract, removes the private banner, restores existing download destinations and adds required enquiry/consent fields. The website contact service stores enquiries before notifying the owner-created Hostinger mailbox. Account pages stay noindex; email verification, automatic recovery, live checkout and creator features are not enabled. Sandbox purchase/order services are available separately. These limitations are reflected in account/privacy copy.

`package/content-package.json` is the exact Studio-reviewed production edition: 14 public pages, with approved revision hashes and the admitted media families. It is not a source of credentials, private originals or client records. The deployment build cannot mint approvals or silently replace its contact/privacy content.

Run `review.mjs <isolated-editorial-workspace>` only after reviewing changed facts and copy under the owner's current scope. It updates the applicable pages through maintained Studio APIs and exports an exact edition. It requires an existing private workspace and does not manufacture a new editorial state. Original images remain private; public responsive families are admitted through the maintained media workflow.

Public acceptance evidence is recorded in the sibling core's `deploy/phonebridger/LAUNCH_STATUS.md`. The owner resolved Cloudflare account verification; phonebridger.com now uses the dedicated Worker and preserved Hostinger mail DNS. Actual edge auth/download/canonical/form-inbox checks pass, with a documented local DNS-cache limitation during propagation. A local preview alone is never public acceptance. The frozen native mouse baseline and original installers remain unchanged. Checkout/creator are deferred and account verification/recovery limitations remain disclosed.
