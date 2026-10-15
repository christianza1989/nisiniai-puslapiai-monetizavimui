# Production connection and schema deployment

This is an operator runbook, not a production acceptance receipt. The site deployment owner controls the real Cloudflare account, database, Stripe Dashboard and secret storage. Source tests do not prove remote adoption, an actual payment, shipping, mail delivery or launch readiness.

## Schema deployment

An actual Memocasting deployment with Wrangler 4.149.0 rejected original `0001_commerce.sql` with Cloudflare 7500 `incomplete input: SQLITE_ERROR`. The site owner also reported the documented HTTP whole-statement batch failing, with rollback confirmed. Preserve those failures. Do not rewrite the 23 historical migrations, split trigger bodies, reset the database or claim that this alternate path is remotely verified before receiving a real receipt.

`scripts/migrate-production-d1.mjs` uses the existing `applyMigrations` through a native D1 binding obtained with Wrangler's Node-only [getPlatformProxy API](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy). Each canonical trigger remains one prepared statement; each migration and its SHA256 ledger entry use the existing atomic batch. The historical SQL and migration parser remain unchanged.

Run from `commerce-core/` with Node 24 and the pinned dependencies installed. Use the deployment owner's existing Cloudflare authentication. Confirm account, database UUID and name from the actual deployment configuration; do not use the local sample configuration or its placeholder database.

```sh
node scripts/migrate-production-d1.mjs --account ACCOUNT_ID --database DATABASE_UUID --database-name DATABASE_NAME --confirm-database DATABASE_UUID
```

Without `--apply-remote`, this only validates the target and prints the local migration manifest: `PLAN_ONLY_NO_REMOTE_CONNECTION`. It does not load Wrangler or connect to Cloudflare. The repeated database UUID is an explicit target check, not proof that the operator owns that database.

The authorized deployment owner adds `--apply-remote` to that exact command to apply schema changes. It creates a temporary minimal configuration containing only the confirmed D1 target, sets `remote:true`, enables `remoteBindings`, disables persistence and dotenv loading, and disposes the proxy afterward. It never deploys Worker code, seeds a demo, creates a store, copies customer data or activates checkout.

Before any schema write, the tool inspects `sqlite_master` and both ledgers. An empty database may contain Cloudflare/SQLite system objects and an empty Wrangler `d1_migrations` table. An existing canonical ledger must be a complete, hash-matching prefix of the current migrations. Unknown tables/views, an unmanaged Wrangler migration history without a canonical ledger, changed hashes and unknown future migrations are blocked. No automatic adoption or repair occurs. A valid prefix can resume after a failed later migration.

Success is `SCHEMA_VERIFIED`, with matching `after.applied` and manifest count and `after.pending:0`. Save a sanitized receipt and independently verify the actual target and empty business tables. If the native remote binding still returns 7500 or any other failure, stop, inspect schema/ledger read-only, preserve the failure and investigate the provider behavior. Do not fall back to repeated SQL rewrites. This tooling has local regression coverage; actual remote results belong to the deployment owner.

2026-10-15 deployment-owner receipt: the actual dedicated Memocasting production D1 returned `SCHEMA_VERIFIED`, before 0 applied / 23 pending / 0 Wrangler rows, after 23 applied / 0 pending / 0 Wrangler rows, with no store or customer data created. The owner reviewed source `2b755fde6ed1a1edc30d740aa2c52ad0a7505bfc` into its branch `e614b030c802583869bb6288bcc6fd5e8c57502f`. This confirms that remote schema path for that database; it is not main merge, LIVE payment acceptance or launch.

## Register a closed store through the existing service

`CommerceService.provisionStore` requires products and verified packages. It is not appropriate for a metadata-only prelaunch store; do not invent a SKU or package to satisfy it.

The supported existing path is to validate the actual store configuration with `validateStore(config)`, then use the service's existing D1 statement interface:

```js
await service.stmt(
  'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
  config.id, config.environment, JSON.stringify(config),
).run();
```

Use a one-time parameterized insert, not an upsert. Duplicate registration must fail rather than overwrite established configuration. Keep the full validated configuration private; only non-secret metadata is stored here. Runtime connections stay in secret bindings.

For production webhook/context access the store is `environment:'production'`, `testOnly:false`, `enabled:true`, `requireCustomer:true`, with `productionAdmission.approved:true` and the actual payment account reference. Include the public canonical hosts and the actual backend hostname in `hosts`. Keep every market's `checkoutEnabled:false`, all delivery methods disabled, and operational/document/automation/notification admissions unapproved until their real requirements are met. No products, inventory, orders or financial rows are created. Later real SKU registration uses `CatalogOperations.revise`; `provisionStore` must not be called again for the same store.

A disposable local proof of this unchanged path returned context 200, a correctly signed LIVE-shaped unsupported event 200 and invalid signature 400, while order creation returned 503 `checkout_not_admitted` and all product/inventory/order counts stayed zero. This was fixture verification, not a remote LIVE Stripe event.

## Runtime and Stripe secrets

Deploy the canonical `src/worker.mjs` with a separate production Wrangler configuration and actual D1/ASSETS bindings. Configure private R2 storage, abuse protection and the approved operational/document/shipping requirements before allowing checkout. The checked-in local Wrangler configuration is for sandbox development.

`runtimeOptions` requires `COMMERCE_ENV='production'` and `COMMERCE_RUNTIME_ADMISSION='approved'`. `COMMERCE_CONNECTIONS` is a JSON **string**, keyed by the exact store ID. Each `stripe` object uses `apiKey`, `accountRef` and `webhookSecret`. Separate `STRIPE_*` variables and the local sandbox file's `secretKey` property are not runtime configuration. A `wrangler secret bulk` input maps each secret name to a string; serialize the nested connections first. Do not commit keys, signing secrets or secret bulk files, print them in receipts, or send them between chats.

The actual account must be verified in its LIVE environment. Use the real HTTPS backend `/api/stripe/webhook` endpoint; the public shop's `/prekyba/*` buyer bridge is not a webhook relay. Its hostname must resolve to this store. Configure Snapshot events compatible with the pinned Stripe SDK API version, and use that exact destination's signing secret. The Checkout event handlers support `checkout.session.completed` and `checkout.session.async_payment_succeeded`; subscribe to refund/dispute events only when their ledger and handling are ready.

For a shared merchant account, version0.14.1 scopes Checkout **after** SDK signature and livemode verification. An explicitly foreign store, or an unmarked session with no local association, is acknowledged without business writes. A lookup scoped to this store/environment checks the stored Checkout ID, metadata order ID, client reference and payment ID before ignoring it. Known own references with missing/conflicting store metadata remain errors. Own store metadata follows all existing strict order/session/money checks. Missing store metadata accompanied by core environment/order markers is ambiguous and remains an error. Completely stripped unknown references cannot establish ownership; investigate such provider changes separately. Direct adapter callers without the HTTP scope callback keep the previous strict contract. This filtering is Checkout-only: refund/dispute handling remains unchanged, so broader account subscriptions need separate review.

`COMMERCE_CORE_GRANTS` is a separate JSON-string array of scoped, hashed, expiring operator grants (maximum eight hours); the public buyer bridge does not expose operator commands. Keep `COMMERCE_AUTOMATION_ENABLED` absent or `0` and store automation unapproved during connection work. LIVE credentials and a verified webhook do not imply `productionReady:true`: checkout remains closed until all actual store/runtime, document, shipping, storage, customer and abuse gates pass.

## Verification boundaries

`npm run verify` checks formatting, Node regression tests, native local workerd/D1/R2/Queue behavior and a dry-run bundle. The production migrator tests inject disposable databases and never contact Cloudflare or Stripe. The module's test-only demo and fixture checkout must never be imported into production. Record source commit, fetched core/companion SHAs, remote schema receipt, actual account and webhook receipt separately. A real paid acceptance test requires its own specific authorization and limit.

## Owner admin and temporary production grants — 0.15.0

The existing direct admin entry is `https://memocasting-commerce.phonebridger-app.workers.dev/admin`, subject to that exact hostname being present in the actual store configuration. The public buyer bridge intentionally excludes operator routes. `/admin` on the public storefront is not this backend entry unless the site owner adds a deliberate link/redirect. Do not widen the buyer allowlist to make admin work.

The runtime and host/store must be admitted before the admin HTML/API can run. A valid production `read` grant can then show actual empty orders, catalog and stock while checkout, delivery, operational and document gates remain closed. This has been verified with a disposable production-shaped metadata store; it is not an actual deployed credential or owner-login receipt.

The current login accepts a temporary Bearer token kept only in browser memory. It has no email/password account creation, SSO or automatic session renewal. `npm run operator:token` remains a **local dev** issuer: its `runtime/operators.json` records are not read by the production Worker and do not meet its full identity contract. The production login no longer suggests this dev command or synthetic order seeding.

The new helper prepares a production grant using the existing canonical identity contract. Run from `commerce-core/`, using the actual validated **raw store configuration** saved privately; a `prepareBusiness` proposal with unapproved production metadata is not an admitted store. The trusted deployment owner must already have authorized the operator identity and its store membership. The helper validates structure and scope, but does not verify a human, create an account or infer ownership from an email address.

```sh
npm run operator:grant -- --store-file runtime/store-production.json --confirm-store store_memocasting --operator owner_memocasting
```

Default output is `PLAN_ONLY_NO_CREDENTIAL_CREATED`: no token generation, files or external operation. Default permission is `read`; default/max lifetime is 480 minutes. `--ttl-minutes` may shorten it to a whole number from 1 to 480. The operator ID in the example must be replaced by the identity admitted by the trusted deployment owner.

After reviewing scope, add explicit permissions and `--write`:

```sh
npm run operator:grant -- --store-file runtime/store-production.json --confirm-store store_memocasting --operator owner_memocasting --permissions read,stock,catalog,document,pack,ship,operate --write
```

Only `--write` creates a fresh ignored `runtime/operator-grants/grant-*/` directory containing `operator-token.txt` and hash-only `grant.json`. The token uses 32 random bytes; neither the token nor its hash is printed in the sanitized receipt. Files are exclusive, with private POSIX modes; Windows access follows the account's inherited ACLs. Linked output ancestors are rejected. Independent runs create distinct material and never replace a previous token file. Do not include the directory in backups intended for Git or public site assets.

The receipt is `CREDENTIAL_PREPARED_NOT_DEPLOYED`, not login acceptance. The deployment owner must merge `grant.json` into the **actual existing** `COMMERCE_CORE_GRANTS` array, preserving other valid grants and avoiding duplicate hashes/ambiguous identities. Upload it as a JSON-string secret through the established private deployment path; the helper does not read or replace remote grants, upload secrets, deploy, mutate business data or activate runtime/checkout. Deliver the token privately to the authorized owner, not in chat, URLs, logs or public files. Grant expiry is absolute from preparation time. Reissue through the same trusted process after expiry; revocation means removing the actual grant or setting `revoked:true` in its authoritative loader. Do not make a permanent token by increasing the core limit.

Grants distinguish `read`, `stock`, `catalog`, `document`, `pack`, `ship`, `finance`, `wholesale`, `refund`, `operate` and `restore`. Catalog revisions require **catalog**, finished lots require **stock**. Finance/refund/restore are not default permissions. A grant never supplies missing legal facts, inventory quality, provider credentials or operation admission. Production refund-command creation in the present UI still has sandbox-only presentation guards; backend refund support is a separate protected contract, not a claim that all owner UI flows are complete.

## Long-term owner login: proposed Access integration contract

This is a design analysis only. No Access app, IdP, policy, DNS, JWT adapter, cookie session, library dependency or new identity table was created or inspected in the actual provider account. The current commerce package contains only the scoped Bearer grant adapter; niche-specific auth elsewhere is not an established shared owner identity service.

Cloudflare documents Access as an authentication layer for a self-hosted web application. Its Worker example validates the `Cf-Access-Jwt-Assertion` signature against the team's JWKS, with configured issuer and application audience. The documentation also describes application session expiry and IdP reauthentication. Sources checked 2026-10-15: [JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) and [self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/). These facts support the following **proposed application contract**, not actual account readiness. The preliminary Stripe Directory lookup failed with `Invalid user agent` despite using the installed CLI; no resource was provisioned, and no alternative identity provider was selected.

1. Put the owner interface on a deliberately scoped admin hostname/path with a self-hosted Access app and an explicit owner allow policy. A dedicated `admin.memocasting.lt` is a candidate, not an existing configured hostname. Protect its HTML, modules and operator API together. Keep buyer checkout and Stripe's webhook public under their existing independent authentication contracts; protecting the entire shared backend hostname would also block those callers. The alternate Workers hostname must not become an unintended unverified operator route.
2. Validate Access JWTs server-side against a **fixed configured** team issuer/JWKS and exact app audience, allowed signing algorithm, signature/key ID and time claims. Reject invalid or missing tokens, spoofed email headers, arbitrary issuer/JWKS URLs and unsupported service identities. Use a maintained JWT implementation with bounded key refresh and failure handling. Do not paste real tokens into external debugging sites. The existing Bearer adapter does not parse JWTs; merely putting Access in front of it is insufficient.
3. Map a verified stable issuer/subject to an **explicit, revocable core membership** scoped to operator ID, store ID, legal entity, production environment and named permissions. Email is supporting identity information, not an automatic grant to a store. No body/header supplied role, store or legal entity may choose the membership. Cloudflare authentication alone must not replace this authorization layer.
4. Add a trusted session exchange/loader that issues and enforces commerce grants bounded by both the validated Access session and the existing maximum eight hours. Normal reauthentication may create a new bounded session after rechecking membership; it must not silently extend an expired grant forever. Reuse the current scope/permission/time constraints rather than loosening `identity.mjs`. The current static `COMMERCE_CORE_GRANTS` loader cannot provide durable automatic session issuance by itself; this is missing source work.
5. If browser sessions use cookies, use a server-controlled Secure/HttpOnly/SameSite session, with explicit CSRF and same-origin checks on mutations. Current memory-only Bearer behavior must remain a distinct, deliberate bootstrap path. Add logout/revocation and disable accidental fallback from failed SSO to another identity method. Private session storage needs expiry/revocation/audit records and bounded retention; no password hashes or long-lived operator tokens need to be exposed to the UI.
6. Before activation, prove allowed-owner login/relogin/logout, denied owner/nonmember/service identities, revoked memberships, stale/wrong-issuer/wrong-audience/invalid-key JWTs, signing-key rotation/fetch failure, cross-store denial, CSRF, alternate-host denial and unchanged public checkout/webhook delivery. Preserve real authorization in Node and native Worker tests, then obtain actual hosted acceptance. All business/payment/shipping/document gates remain independent.

Missing decisions/evidence: actual Access team issuer, application/AUD and reusable owner policy, chosen IdP and verified owner subject(s), approved core membership authority/permissions, final admin hostname and alternate-origin routing, session/grant storage and revocation ownership, and hosted acceptance. The temporary helper is an initial access path, not completion of this long-term login work.

## Siųsk pigiau naming and current inventory preparation

Siųsk pigiau is the branded account interface for this integration's Sendparcel API. Runtime configuration is `COMMERCE_CONNECTIONS[storeId].sendparcel`; there is no separate `siuskpigiau` adapter or credential alias. The authoritative supported protocol is [the 2026-10-14 v1 correction](SENDPARCEL_V1_2026_10_14.md): `apiPassword` in the password header, not JWT/Bearer. The 2026-10-12 shipping continuation and local `sdk.json` accessToken instructions remain historical evidence and must not override the correction. File absence or static prepared flags do not constitute a current provider credential probe.

Latest owner facts relayed by the website deployment session on 2026-10-15: owner-declared quantity 999 for each kit, registered address Pupinės g. 10-55, Vilnius, couple packed weight 2200 g and dimensions 200×200×170 mm. The owner subsequently clarified family dimensions as 25×25×20 cm, so its package is 4500 g and 250×250×200 mm. This task does not update the business config or real DB on that basis; the deployment owner owns those changes.

Existing `CatalogOperations.revise` accepts a new couple definition with `prices:{LT:3200}`, package above, `enabled:true`, `lotTrackingRequired:true` and `basisHash:null`, without inventing prices for disabled foreign markets. Family likewise accepts `prices:{LT:4800}` and its clarified package. Each creates stock zero. The owner-declared 999 is not a physical quality/batch verification: `FinishedStock.receive` also needs supplier/source provenance, quality confirmation, expiry semantics and quarantine decision. The existing UI specifically attests to physically checking quantity/origin/expiry and labels the provenance as a manufacturer/supplier batch; do not relabel a made-up batch or a display limit as such a check. No complete executable receipt is implied by quantity alone, and no tracking bypass is justified. Preserve unknowns in a non-executable draft until their facts exist.

## Current Memocasting simple counts — 0.16.0

The owner's subsequent explicit instruction on 2026-10-15 **supersedes the preceding lot-receipt preparation for Memocasting**: use temporarily configured balances of 999 couple kits and 999 family kits, without supplier batches, expiry or BOM for this niche. These are owner-configured balances, not a claim of physically counting or inspecting 999 kits. No finished-lot receipt or `qualityChecked` assertion is needed for a simple-count product. Other stores/products retain their tracked mode.

The backend already supports this per-product distinction; version0.16 makes preparation/admin honor it explicitly:

| Product setting | Admin mode | Supported stock path |
| --- | --- | --- |
| `lotTrackingRequired:false` | `simple` | Optimistic/idempotent stock adjustments |
| `lotTrackingRequired:true` | `lots` | Existing traced lots, expiry and quality controls |
| Field absent in existing data | `legacy` | Existing behavior retained |

The new operator-only `stockMode` field distinguishes explicit simple counts from legacy data. A simple-only active catalog hides the materials/BOM navigation and irrelevant empty lot forms, with neutral balance labels. Mixed catalogs retain tracked/legacy forms and exclude simple products from the new lot-receipt selector. Historical lots, holds and control records remain visible when present. Disabled untracked add-ons do not force a simple-only shop to display materials; disabled tracked products still retain that interface.

`prepareBusiness` preserves an explicit `lotTrackingRequired:false` on each supplied business product, while its default remains true for other customers. It still prepares stock zero and closed live gates. The deployment owner updates the actual business config and applies the declared balances separately; this source change does not seed or modify the real database.

For a **new** SKU, call `CatalogOperations.revise(store,'production',input,actor)` via the protected `POST /api/operator/catalog-revisions` route with a catalog grant. A couple input is:

```json
{"id":"memo_couple_simple_20261015","basisHash":null,"definition":{"sku":"couple","title":"Rankų liejimo rinkinys porai","enabled":true,"lotTrackingRequired":false,"prices":{"LT":3200},"package":{"weightGrams":2200,"dimensionsMm":[200,200,170]}}}
```

For family use a separate ID, `sku:'family'`, its actual title, `prices:{LT:4800}` and `package:{weightGrams:4500,dimensionsMm:[250,250,200]}`. Foreign prices need not be invented; leave those markets closed. For an existing SKU, first inspect the actual definition/basis hash and history. Original SQL deliberately prevents disabling an existing tracked policy; do not delete history or force that transition. The last store receipt was metadata-only, not proof that no later catalog write occurred.

After reading actual available zero, an initial `POST /api/operator/stock-adjustments` with a stock grant is:

```json
{"id":"memo_couple_balance_20261015","sku":"couple","delta":999,"expectedAvailable":0,"reason":"Savininko nustatytas laikinas likutis 999; ne fizinis perskaičiavimas"}
```

Use a separate family ID/SKU. This is a delta, not a blind set operation: if actual stock differs from zero, recompute from the real read or investigate the conflicting state. Replaying the same ID and identical payload returns the existing result without adding another 999. A changed payload under that ID, stale expected balance or negative final balance is rejected. The actor comes from the trusted grant, not a body field.

Order creation atomically reserves/decrements each SKU. Order replay does not reserve twice. Paid confirmation and packing keep that already-reserved quantity, rather than decrementing it again. Expiration releases unpaid reservations once through the existing expiry job/command; a paid late event must safely reallocate current stock or enter the existing stock-exception path. Failed multi-SKU orders roll back all lines, and concurrent orders cannot reserve the same last unit. Stock expiry processing still needs its admitted job/command; a runtime whose automation is disabled does not suddenly run a scheduler because counts were configured.

Native D1 regression exposed a separate counter issue: its `meta.changes` includes the restoration trigger, so one expired reservation reported two changes. `expire` now counts IDs returned by the guarded update, retaining the Node adapter's direct-change fallback, in the same atomic event batch. Original23 migrations, lot-policy triggers, identity and checkout admissions remain unchanged. Tests cover Node and native simple reserve/payment/packing/expiry/replay, zero fictional lot/BOM rows, plus preserved tracked quarantine/policy guards and legacy/mixed UI.
