# Safe owner-requested PC restart checkpoint

Stopped at owner's explicit request, 2026-10-25 18:34 UTC. Do not resume operations until the owner asks to continue. No new automation was created.

## Verified live safe state

- Frontend remains the already accepted SEO/image release: `memocasting-site` version `4b56b34b-db77-4d15-8a63-07816abc0e92`, native release `b3c37f72-970e-4ccd-9d94-9597e2ac1500`, package `03c1893367547e524cc1546ee9c683056916112788668ce8c50e175918765646`. Seven192px catalogue thumbnails reduce their transferred bytes96%; original/main/zoom images retained.
- Commerce backend restored to previously verified version `1b5782c8-1fc1-42f7-b5f4-db3d833310d2` at100%, deployment `c45fe171-0316-4ee5-aa58-cac5ca51ff0d`. New source was briefly deployed before the stop request, then rolled back before the mailbox migration. No secret rotation or mail Worker deployment occurred.
- The temporary notification pause was reversed by guarded D1 update. Existing primary sender is still **info@pinet.lt**, `sendNotifications:true`. The new sender is not activated and the new12h reminder/24h recovery policy is not enabled. Do not describe those features as live.
- Actual read-only hosted check after restore: `/cart` HTTP200; `productionReady:true`, Stripe `paymentConnected:true`, environment `live`, shipping connected. Checkout was never paused. No charge, customer test message, shipment, refund, new order or inventory mutation was performed by this work.
- Dedicated production D1/R2/provider/mail bindings and old commands remain. Before migration:5orders, total20168minor units, inventory1998;4accepted/1unknown OrderPlaced notifications. Unknown send must never be blindly replayed.

## Source and local evidence

- CORE branch `codex/memocasting-final-seo-fixes-20261025`, feature source `5526d8c8ef01f13437445528b83048b57fb092fc`, JSDoc SDK `564c5a3720d064d9a87fa444a2993f24d035b60f`; checkpoint begins from journal commit `f7f28447e878cba95c9fab69bbc76da31e608d6e`.
- PUBLIC branch `codex/memocasting-final-seo-public-20261025`, source `7f09fb2bfa25e3db961d38b96fd7723f04f2525d`; exact SDK564c5a37. No new frontend build/deployment for recovery yet.
- Paired Git freshness passed18:30UTC against COREmain83b2ec3e/PUBLICmaina12d1365. Fetch again on resume and read canonical instructions. Issues CORE261/PUBLIC78 hold scope; never reset foreign files.
-234Node checks PASS in serial mode, actual workerd/nativeD1 smoke PASS,266PUBLIC checks PASS, focused mail/fragment14PASS, direct TypeScript with768MiB heap PASS, final scoped ESLint PASS. Mail HTML visually inspected320px/desktop. Original parallel Node/TypeScript OOM failures retained; no assertions relaxed. First journal note prematurely described an in-flight final type check as PASS; later immutable event explicitly corrects it and supplies actual direct-command exit0 evidence.
- Affected docs: `PAYMENT_RECOVERY_2026_10_25.md`, `commerce-core/docs/PAYMENT_RECOVERY.md`; unique upgrades04f78404 and311ac59f. Original SEO source/docs remain owned work to finish committing; other untracked media/outputs/upgrade-fd906851 and PUBLICskills-lock are foreign and preserved.

## Primary mailbox credentials and authorization

Owner approved creating/connecting a full SMTP/IMAP/webhooks API key for **info@memorycasting.lt**; no paid plan. Hostinger key creation first succeeded but copying failed and its tab closed. A replacement with identical access was created, captured privately through a real native clipboard into a loopback-only form, and authenticated against the official `/api/v1/me` for the exact mailbox. No credential was printed or put in Git. Owner explicitly chose **keep** the unused first19:50key; do not revoke it or ask the same question again. The replacement19:57key is the one to install.

Private ignored folder `sites/memocasting/qa/final-seo-20261025/` contains:

- `memorycasting-mail-credential.private.json`: saved replacement key + exact mailbox resource ID; `memorycasting-mail-identity.private.json`: authenticated receipt. Never print either secret value.
- `mail-secrets.private.json`: prepared new API key/mailbox/SMTP_USER tuple; **not installed**.
- `recovery-secrets.private.json`: prepared independent per-store recovery key; **not installed**.
- `mail.wrangler.private.json`: actual production private-mail profile; `commerce-recovery.wrangler.private.json`: preserves actual production resources and adds mail-only sender override. Recovery remains disabled until explicit D1 policy activation after privacy/frontend acceptance.
- `mail-store-before.private.json`: COMPLETE123023-character original store config, obtained in bounded read-only chunks. Do not use the earlier truncated Cloudflare config result as a full backup. `mail-provider-before.private.json`: actual settings/deployments snapshots.
- `recovery-backend-deploy.private.txt`: temporary deployment before rollback; `recovery-*-dry-final.private.txt`: successful packaging. Unsupported `--log-level` initial attempts retained. Wrangler deploy4.149 needs `WRANGLER_LOG=error` environment, not that CLI flag; correct the observed stale canonical MAIL_CORE instruction in a scoped upgrade on resume.
- Mail previews, test logs, original SEO hosted acceptance61checks and187route crawl, all private. The original `cloudflare-after.private.json` is mid-SEO-deploy, not final settings acceptance.

All own local Studio/frontend/mail-preview processes were stopped; deployed website and cron run independently of this PC. No pending browser approval remains. Browser tabs are not an authority after restart; select the actual current surfaces through CUA.

## Resume order

1. Fresh paired Git gates/instructions; inspect actual production and existing work before a meaningful batch.
2. Complete the authenticated primary sender migration with brief mail-only pause, exact preserved bindings, private bulk secrets and mail Worker deployment. New backend source must align with new store From. Existing accepted/unknown mail commands remain immutable; old unknown only receipt reconciliation. Verify one clearly labeled owner self-test via actual Worker and exact owner INBOX; then resume notification sending. Do not test on Laura or other customers.
3. Finish recovery: privacy notice through native Studio review/release; build/deploy frontend with exact SDK and preserved bindings; install private recovery key; activate opted-in24h/one12h future-order policy with current enabledAt. No retrospective reminders. Confirm actual /cart notice, capability isolation, expiry restore/fresh quotes and resource preservation. Original token unchanged; only signed webhook marks paid.
4. Finish already deployed SEO acceptance/runbook/source handoff and PRs; preserve97guide dates and actual publication filter. No new paid research.
5. Owner additionally authorized a **complete professional ecommerce admin UI/UX review and redesign after this work**: orders, products, inventory, shipments, documents/settings. Apply actual canonical design/impeccable instructions, inspect current flows, plan a coherent modern dashboard and verify real desktop/mobile states. This redesign is not started or complete; do not lose this request.

Local machine had only~225MiB free C: and severe Windows commit pressure. An attempt to delete the npm cache was automatically rejected by safety review; **nothing was deleted** and no bypass was attempted. Stopping own unused runtimes and serial/direct checks allowed verification to finish. Avoid simultaneous Node/build jobs; the requested new frontend build is still pending. Do not repeat an unsafe cache deletion through another shell/language.
