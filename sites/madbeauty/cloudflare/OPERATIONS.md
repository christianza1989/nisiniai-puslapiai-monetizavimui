## Candidate upgrade operations — 2026-10-08

Current candidate 39b71b18bd535eeb8d231fe497d26ca254b108d3; original production service/namespace/site/instance identity stays unchanged. The candidate appends ORGANIZATION_STAGING / v2-organization-storage; no remote production migration is applied yet. Both existing wrangler.json and wrangler.production.json name the SAME live Worker and include madbeauty.lt/www routes. wrangler.json is NOT isolated staging and must not be deployed for QA. The protected disposable storage acceptance Worker/config lives in ignored upgrade evidence, with separate namespaces and no live routes/mail/assets.

Current rows-v2 / directory/media/mail model and measured boundaries: [STORAGE_AUDIT](../platform-upgrade-20261007/STORAGE_AUDIT.md). The historic1MiB JSON paragraph below describes the old live edition; it is not the new normalized rows-v2 boundary. SQL512MiB /24assets media pilot remains, R2 is not activated here. Never restore the first legacy checkpoint as a current post-migration copy.

Current source scheduleRecovery rejects ANY handoff history, including aborted receipts/epochs. Expected refusal occurs outside blockConcurrencyWhile callback and leaves the running source instance intact. Target production class has no PITR/abort maintenance RPC. Single-object rewind of an active directory pair is unsupported: preserve current source/target identity, live bookmarks/key and writes, then fix forward or prepare a separately reviewed coordinated maintenance operation. Before a legitimate pre-handoff source recovery, pause incoming writes/jobs, preserve current/undo bookmarks privately, use the exact reviewed bookmark and encryption key, restart the session and verify current identities/tenants/bookings/roles/mail/media before resuming. Source-only guard is not a substitute for that pause.

Actual isolated hosted source/undo recovery before handoff and prepared-target recovery while source frozen passed at d58c7fd. Current39b71b1 isolated hosted refusal/lifecycle and exact retained rows passed; no production destructive rehearsal or active-pair PITR acceptance. See named receipts/scope in STORAGE_AUDIT. Canonical full-upgrade release remains conditional on CURRENT_READINESS gates. Preserve existing MAIL_RELAY secrets, original namespace and v1 migration. Migration addition uses the installed supported atomic deploy path after live configuration reconciliation; do not provision through an unrelated default Preview environment.

---

# Madbeauty Cloudflare release — 2026-10-06

Canonical origin: https://madbeauty.lt. The existing Worker service remains `madbeauty-platform-preview`; its name does not describe its current production mode. Production configuration disables workers.dev and binds apex + www. Account `d102163f74a45ab6d33bca786ce281ec`; SQLite Durable Object class `MadbeautyPlatform`, instance name `madbeauty-pilot-v1`. Keep this identity across releases or existing accounts/bookings will appear missing.

## Rebuild and deployment

The private repository and public core are sibling checkouts named `nisiniai_puslapiai_monetizavimui` and `dovanos-memorycasting`. Install their pinned dependencies using the existing bootstrap/lockfiles, including `content-studio` for local image processing. Never copy local runtime databases or `.dev.vars` into an artifact.

From the private repository:

```powershell
node sites/madbeauty/cloudflare/build.mjs
node --test sites/madbeauty/cloudflare/runtime.test.mjs sites/madbeauty/cloudflare/public-modules.test.mjs
node ../dovanos-memorycasting/node_modules/wrangler/bin/wrangler.js deploy --config sites/madbeauty/cloudflare/wrangler.production.json
node sites/madbeauty/cloudflare/verify.mjs https://madbeauty.lt
```

The asset allowlist contains 119 public files and the immutable 7-page/20-WebP content release. It excludes provider demo photographs, original uploads, backend source and local state. Unknown routes and unpublished profiles return 404; functional/account pages remain noindex. HTML, sitemap and LLM outputs share the approved content projection; trusted platform pages and approved real profiles are separate public modules, with no invented editorial dates, ratings or qualifications.

Required secrets: `SESSION_SECRET`, `MAIL_RELAY_URL`, `MAIL_RELAY_SITE=madbeauty`, `MAIL_RELAY_KEY`. Session/outbox encryption depends on the original `SESSION_SECRET`: preserve it privately with recovery records. The SMTP mailbox password is held only by the protected Hostinger relay. `OPERATOR_EMAIL=info@pinet.lt` grants operator access only after successful email verification. Do not set a test `MAIL_TRANSPORT` binding in production.

## Delivery, monitoring and retention

Durable Object alarms drain leased outbox jobs. SMTP acceptance marks accepted; failed attempts back off up to five attempts. Accepted/sending jobs cannot be manually replayed. The relay deduplicates stable message IDs for 30 days and rejects an ID reused with different content. A process crash between external acceptance and its durable receipt remains an at-least-once delivery boundary; stable Message-ID assists mailbox deduplication but is not a universal exactly-once guarantee.

Owner operator workspace exposes booking-mail state. Authenticated `GET /api/madbeauty/recovery-status` returns aggregate queue/storage/alarm status and a current recovery bookmark; guests and ordinary accounts receive 403. Save bookmarks privately. Workers observability is enabled with 0.1 sampling; logs omit recipients, OTPs, message bodies and session tokens. Use Cloudflare logs and the operator delivery view to inspect failures after a deployment; an external uptime/on-call service has not been configured.

Sessions expire after 8 hours or 30 minutes idle; OTP challenges last 10 minutes. Expired/consumed failed login payloads are cleared; challenge/login-mail metadata is removed after one day, other completed mail metadata after 30 days, and expired rate-limit rows are cleaned. Retention is driven by alarms and the operator recovery check. Requests concerning account, profile, booking or message erasure go to info@pinet.lt and need a scoped owner operation; do not indiscriminately delete client records or audit history.

## Capacity and recovery

This is a bounded pilot using SQL blob chunks because R2 is not enabled on this account. Per profile: 24 images; input 12 MiB/40 million pixels/8192 px edge; public WebP variants max 1600 px. State JSON is capped at 1 MiB and aggregate stored media at 512 MiB. Before approaching these limits, move media to an authorized R2 binding and split coordination by organization with a separately tested migration. No paid storage plan was enabled by this release.

The actual Cloudflare Images binding passed rotated phone JPEG, metadata removal, exact alpha preservation and tall-image bounding checks on 2026-10-06. Miniflare omits automatic EXIF rotation; local simulation alone cannot certify that behavior. `verify-images.mjs prepare` creates a bounded stateless temporary Worker fixture; deploy that exact generated config, run `verify-images.mjs check`, then remove only `madbeauty-image-acceptance-20261006`. It was removed after this release's verification.

SQLite Durable Objects provide [30-day point-in-time recovery](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api). The actual owner check obtained a bookmark; restarting a populated isolated Workers database preserved sessions/bookings/media. A destructive production PITR rehearsal was not performed. `scheduleRecovery(bookmark)` is a control-plane RPC only, absent from browser/HTTP dispatch. Recovery maintenance must pause incoming writes, privately preserve the pre-recovery/undo bookmark and encryption key, schedule the exact reviewed bookmark, restart that object session, and verify owner login/tenant boundaries/booking counts before resuming writes. Never use it as a smoke test or restore over newer owner changes.

Application rollback changes code, not stored data. Keep the previous deployment/version and compatible schema/bindings; do not rerun the `v1` migration under a new class name. DNS rollback is separate: initial parking address was `2.57.91.91`, www CNAME to apex, and registrar nameservers were athena/apollo.dns-parking.com. Compare current owner changes before any reversal. Cloudflare is now authoritative; the old Hostinger zone was bridged to Cloudflare edge addresses to accommodate resolver caches. Those old-zone addresses are a migration aid, not the long-term authoritative configuration.

## Acceptance limits

Canonical checks cover 17 public pages, all 119 assets, 7 private/missing boundaries, discovery, redirects, email login/operator access and server logout. Local runtime tests also cover tenant isolation, concurrent holds, booking persistence, private uploads, mail refusal/recovery and approved-profile discovery. The production catalog initially contains no real providers; no fictional provider or client booking was inserted. Existing 69/70 UI acceptance and the owner's stopped demo/gallery review are preserved. No current production Lighthouse score, demand, search indexing or uptime guarantee is inferred from these checks.
