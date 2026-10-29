# Reproduce the o3tech migration preview

This is the site-scoped tooling source. It does not modify shared Core code or approve/publish content. The owner brief is in `sites/o3tech.md`; approval and source-copy boundaries follow the current external START2.3.

Use sibling checkouts under one migration root: `core` and `dovanos-memorycasting`. Source scripts default to the root four levels above this directory; `O3TECH_MIGRATION_ROOT` can explicitly name an equivalent isolated workspace. Keep raw data, originals, Studio data and all output under its `private`directory. Never point these tools at another chat's live Studio data.

From that root, after the paired freshness gate:

```powershell
npm ci --prefix core/content-studio --no-audit --no-fund
npm install --prefix tools --no-audit --no-fund linkedom@0.18.12
node core/sites/o3tech/migration/capture.mjs
node core/sites/o3tech/migration/import-drafts.mjs
node core/sites/o3tech/migration/fonts.mjs
node core/sites/o3tech/migration/preview.mjs
```

Open `http://127.0.0.1:4783/`. It binds only127.0.0.1, checks Host, always noindexes, disables public discovery and never sends mail. Native lead-route source is transpiled into ignored preview runtime and receives isolated loopback/SQLite bindings. Its original validation/origin/storage/error behavior remains in use. The local DB contains clearly marked synthetic test fixtures and must never be imported into production.

With the server running:

```powershell
node core/sites/o3tech/migration/check-preview.mjs
```

This checks all23draft paths, original imported text blocks, internal URLs/fragments, actual media, absence of plugin/ecommerce runtime, negative private/unknown paths and native local form behavior. It does not grant publication or replace the approved-package completion verifier. Public-source tests and type/build checks run in the companion checkout. Any testing tool that inspects local drafts must keep them out of production registry/discovery.

`capture.mjs` is bounded to80pages, public same-domain WordPress/WooStore data and sitemap/category discovery. It saves raw bytes/SHA/time, never account/order data. The normal inventory has23keptpaths,11products,5categories; account/cart/payment/sample and one brokencategory are excluded. Duplicate sitemap forms and a shipping-taxonomy query are private evidence, not additional pages.

No live deployment, DNS mutation, email, new prose, paid research or Core/index exception is enabled by these commands. Read CONTENT_READINESS before release.

Fidelity continuation: importer now invokes `presentation.mjs` to recover source formatting/section boundaries without duplicating text. For a presentation-only recapture, run that script directly after preserving existing inputs. The preview serves the same site-local progressive UI script as the actual renderer and passes GET facet values; its CSP permits only same-origin script/connect. Synthetic email-only inquiries are accepted for o3tech, retaining mandatory native consent and all other tenants' minima. See `../FIDELITY.md`; old no-client-script/old form-minimum acceptance belongs to the earlier source revision.
