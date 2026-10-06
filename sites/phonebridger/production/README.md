# Production edition

This directory contains an isolated production transform, reviewed public content package and editorial review tool. The accepted prototype and its manifest remain immutable. The companion has no Cloudflare credentials or live database. Hosting is supplied by the sibling core's `deploy/phonebridger/` adapter, which consumes shared core publication and SEO helpers.

`transform.mjs` replaces private-preview service copy and mail drafts with the live-service contract, removes the private banner, restores existing download destinations and adds required enquiry/consent fields. The website contact service stores enquiries before notifying the owner-created Hostinger mailbox. Account pages stay noindex; email verification, automatic recovery, checkout and creator features are not enabled. These limitations are reflected in account/privacy copy.

`package/content-package.json` is the exact Studio-reviewed production edition: 14 public pages, with approved revision hashes and the admitted media families. It is not a source of credentials, private originals or client records. The deployment build cannot mint approvals or silently replace its contact/privacy content.

Run `review.mjs <isolated-editorial-workspace>` only after reviewing changed facts and copy under the owner's current scope. It updates the applicable pages through maintained Studio APIs and exports an exact edition. It requires an existing private workspace and does not manufacture a new editorial state. Original images remain private; public responsive families are admitted through the maintained media workflow.

Acceptance evidence and the current Cloudflare account-verification blocker are recorded in the sibling core's `deploy/phonebridger/LAUNCH_STATUS.md`. A local production preview is not a publicly accepted launch. The frozen native mouse baseline and original installers remain unchanged.
