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
