# Inner pages and local accounts — 2026-10-06

The existing selected homepage is preserved. Its source changes are confined to
footer links; 471 saved pre-existing files retain their hashes. The private
integration copy additionally carries its documented noindex/preview transforms.
The owner's latest scope defers the creator system. Earlier creator simulations
are historical homepage functionality, not authorization for a new creator backend.

Eleven routes extend the selected Manrope/charcoal/pink identity: shop, contact,
help, downloads, about, privacy, terms, login, register, recovery and account.
Shop is a product-choice surface; contact/account are task forms; help/policies
use reading density. Shared native SVG controls, real HTML copy and CSS surfaces
remain editable. No new component framework, icon service or dependency is added.

## Offer and behavior

Planned USD prices: App $29; +1 holder $49; +2 $65; +3 $79. Owner delegated the
pricing decision and supplied an $8/holder acquisition cost. Official dated
research, assumptions and the margin stress test are in [PAGE_PLAN](PAGE_PLAN.md).
These prices are not an open checkout. Shipping, stock, landed costs, legal seller,
tax handling and paid licence activation remain unresolved launch dependencies.

Shop updates count, finish, exact product layers, price and inclusions, and saves
only a package/finish choice to this browser. App only hides holder controls.
The contact form prepares an editable mailto draft to hello@phonebridger.com;
it does not send email or store a lead. Support and download paths remain usable.
The nested installers are retained only in the native workspace preview; the
portable private snapshot links to its installer notice instead of copying binaries.

## Run and verify

The core Vite plugin now accepts the companion's optional account module in
development. Use its `127.0.0.1` URL; accounts enforce that exact origin and actual
listening port. A missing companion/module leaves existing core routes alone.
No preview/auth code is mounted in the production build.

For a lightweight preview through the same real core middleware:

```powershell
node sites/phonebridger/preview.mjs C:/path/to/dovanos-memorycasting
# http://127.0.0.1:4187/__projects/phonebridger/
node sites/phonebridger/verify.mjs
node --test sites/phonebridger/server/accounts.test.cjs
node --test sites/phonebridger/core-preview.test.mjs
```

`PHONEBRIDGER_PREVIEW_PORT` selects a loopback preview port. The core test accepts
`PHONEBRIDGER_CORE_PATH` when sibling checkout names differ. Store overrides
`PHONEBRIDGER_ACCOUNT_STORE` (standalone) and `PHONEBRIDGER_CORE_ACCOUNT_STORE`
(Vite) must point outside the served snapshot. Default stores live under the
user's home `.phonebridger-preview/`, with separate per-port names. Tests use
disposable isolated stores and synthetic `.invalid` addresses.

`server/accounts.cjs` is the single maintained account implementation. It uses
async salted scrypt, opaque random sessions with stored SHA-256 digests,
HttpOnly/SameSite=Strict path-scoped cookies, eight-hour expiry, exact Host/Origin,
bounded JSON/password/email input, rate limits and serialized atomic writes.
No password/session credential is stored by the frontend. Guest account access
redirects to sign-in; missing backends expose an honest unavailable state.

This is a loopback-only account adapter. HTTPS/Secure cookies, production storage,
verification, password-reset delivery, retention/deletion operations and paid
entitlements need a hosted-auth contract before live accounts open. The local
file store is single-process; it is not a production multi-worker database.

## Asset and review record

Production imagery reuses the exact selected package, Black/Silver holder and
pink-lit background derivatives. Both dynamic finishes are explicitly included
in the manifest. Existing source generation records and font licence remain the
authority. A newly generated shop concept informed composition only: it invented
the wrong holder shape, was rejected as product imagery and was not shipped.
Its original PNG/prompt metadata remain in the native workspace's private concept
folder. No raster logo or fake generated interface replaced live text/controls.

Desktop/mobile route captures and original detector results are in
`qa/site-pages-v1/`. The first scan found small supplemental text and prose-button
contrast; current CSS sets a 12px minimum for this supplemental text, excludes
buttons from generic link-hover colour and keeps prose CTA labels white. No second
detector or clean-scan claim was made. A fresh independent reviewer inspected all
22 route captures, requested two copy fixes and refreshed account captures, then
returned **ship** with all three findings resolved. This is visual/source review,
not production security, legal or conversion certification.

Practical generator/snapshot defects and the installed-skill improvement are
recorded in [CORE_FEEDBACK](CORE_FEEDBACK.md). See [VERIFY](VERIFY.md) for actual
checks and their limits. Shared/native mouse engines, releases and pairing remain
unchanged. No DNS, deployment, payments, SMTP, real orders or creator system opened.
