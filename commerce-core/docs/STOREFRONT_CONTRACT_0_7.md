# Commerce browser and runtime contract 0.7

This is a checked source checkpoint in the continuing full-foundation work.
Shipping commands, jobs, backup and remaining operations follow in the same
workstream. It is not a production release or the complete foundation receipt.

`GET /api/storefront-context` is host/store/environment scoped and no-store.
It returns `storeId`, `environment`, `testOnly`, `legalName`,
`paymentConnected`, `shippingConnected`, `shippingQuotesConnected`,
`productionReady`, `publishOffers`, `canCreateTestOrder`, `fixtureCheckout`.
The last flag is true only in explicit sandbox fixture harnesses. The catalog
has no independent publication authority. Emit no Offer in sandbox or when
`publishOffers !== true`; production-ready flags require independently bound
payment/shipping accounts, operational/document admission and private storage.

Browser source is `public/commerce-client.mjs`; import into the site adapter
or serve its audited source with the shared assets. `initialize()` returns
context/catalog/markets. `quote(input)` and `create(input)` use server totals.
`create` retains the same request key/access token and pending body in tab
storage before POST; lost responses replay one reservation. Once recovered,
the body with buyer PII is removed. The credential remains in tab storage
for 30 days for authorized order retrieval; pending create data expires in
one hour. Do not put these values in URLs, metadata, analytics or logs.
`resume()`, `checkout()`, `receipt()`, `withdrawal()` and `document(id)`
complete the buyer workflow. Explicit `newOrder()` starts a separate attempt;
it does not cancel an earlier order. A failed create response must first be
recovered rather than silently changing its key.

`public/checkout-ui.mjs` exports `mountCheckout(root, { language, country,
client, termsUrl })`. Languages lt/pl/lv/et have actual form/status strings.
The minimal `/commerce` preview is a noindex functional test surface and has
no final brand design. Caller styles and product-page cart integration belong
to the website owner. Same-origin API routing is required; no wildcard CORS.

0.10.2: termsUrl additionally accepts a synchronous resolver receiving
{ country, language, policyVersion }. The country and version come from the
selected admitted market; language remains the interface language. Return
the actual same-origin URL for that approved legal revision, or null when
there is no match. The caller must not invent approval/version mappings.
An empty, invalid, foreign, credential-bearing or throwing resolver disables
acceptance and order submission. Changing country refreshes the link and
clears prior consent. A fixed same-origin string remains supported for one
shared legal document. Changing SDK bytes requires the site adapter's normal
manifest regeneration and its actual integration test.

`GET /api/orders/:order/receipt` requires the buyer bearer credential.
`GET /api/orders/:order/documents/:document` exports only that order's sale
or credit PDF. It never grants buyer access to operator attachments or
packing documents. PDFs use immutable numbered snapshots and embedded Noto
Sans with validated SHA-256. Unsupported glyphs become explicit Unicode
notation. Operator `GET /api/operator/documents/:document/pdf` exports all
allowed document kinds; private uploaded PDFs have separate file endpoints.

Worker source loads SDK adapters from private `COMMERCE_CONNECTIONS` and
trusted core grants from `COMMERCE_CORE_GRANTS`. R2 binding `COMMERCE_FILES`
is private; ASSETS serves only the host-guarded allowlist. No production grant
or provider credential is supplied in this source package. Production runtime
also needs `COMMERCE_RUNTIME_ADMISSION=approved`, valid admitted store config,
document series/legal facts and operational policy. The single-merchant
non-VAT document mode refuses VAT-registered configuration until an explicit
tax-policy implementation is provided. No tax filing or agent action occurs.

Checked: 68 Node tests, actual workerd/D1/R2/core-grant PDF export and dry-run
bundle (744.92 KiB gzip). Actual local browser: pending order 54D973F0 created
and restored after reload; 320px no overflow; payments disabled while absent.
Private 13KB PDF uploaded, downloaded and hash-compared; 320px no overflow.
Two rendered sandbox PDFs checked with LT/PL/LV Unicode and correct credit
amount/original reference. Full hosted Checkout and website integration remain
part of the continuing foundation acceptance.
