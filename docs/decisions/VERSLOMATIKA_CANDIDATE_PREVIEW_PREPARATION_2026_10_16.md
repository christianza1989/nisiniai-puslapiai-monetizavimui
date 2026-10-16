# Prepare an approved native candidate before final certification

The only maintained full native preview producer previously ran inside `localCompletion`, after `PHASE-1-AUDIT.json` and all eight final review areas were already PASS. This made the first authentic presentation/inquiry inspection depend on evidence that inspection should produce.

This repair adds a preparation operation and a separately owned inspection callback. It reuses the canonical immutable approved release, native importer/compiler/build and existing loopback process guardian. It adds no renderer, evaluator, route, permission table or persistent server. Final Foundation certification remains unchanged.

## Ownership and source

Private base: `7eb21e241625d46fb8a0770db94f12be4fd931d4`. Companion: `255fea0813bf1aabeaeea2f2de0b29564118f2fc`. Coordination: [issue 66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66), reservation comment 6205603581. Preparation owns `site_build/foundation.py`, `foundation_wire.py`, `customer-site-foundation.mjs`, `customer-site-preview.mjs` and new focused tests. A separate owner implements Session-bound editorial review/batch approval; this repair does not modify that workflow or its routes.

## Root interface

1. Through the existing maintained token-hash SQL scope, obtain `customer_session`, `creation.routes.owned`, then `foundation.capture(tx, session, creation_id)`. Capture carries the current real Session, owner, accepted material, approval, source, language mode and exact page/site snapshot. Never construct a replacement Session or supply a customer-selected artifact path.
2. Close the capture transaction. Supply a fresh authorization callback following `site_build.receipts.check`: on **each** invocation open a new token scope, call `customer_session`, require the same captured Session ID and call `foundation.verify(tx, captured_scope)`. Return literal `True` only after all succeed; errors return `False`. Do not borrow one live SQL transaction concurrently.
3. Call `await foundation.prepare_preview(captured_scope, still_authorized=authorized)`. It checks authorization before transport and after completion, monitors authorization through maintained `studio._execute`, rechecks execution/public source pins, environment and language mode, and derives all artifact paths server side. There is no new HTTP route or Foundation receipt persistence. Root owns any later portal wiring.

The fixed Node command is `prepare-preview` in the existing `customer-site-foundation.mjs` adapter. It accepts the same server-derived base/scope as `candidate`. Current native intake/site/page hashes, required pages, actual editorial approval, reviewed immutable revisions, media bytes, package/manifest/asset bindings and source identity remain mandatory. Missing approval/content is a conflict, not an automatic review or approval. Final audit/review files are deliberately not consulted by preparation.

The strict `PreparedPreview` result contains only the version/state, scope/source/site/page pins, required IDs, actual `Release`, build digest, deterministic artifact digest, synthetic marker and explicit inert/unverified status fields. Extra paths, URLs, commands, permission claims and certification labels are rejected. `artifact_sha256` is the canonical digest of all other fields; it identifies the exact canonical retained bytes in `candidate-preview.json`. The artifact contains no process command or customer-selected path. Replay validates the retained release and actual build; missing/changed retained build data fails closed and is never silently rebuilt under an existing artifact.

## Explicit bounded inspection

Trusted Root code may import `withPreparedCandidatePreview(input, proof, operation, stillAuthorized)` from `customer-site-foundation.mjs`. `input` is the same **server-derived** `prepare-preview` payload; `proof` is the exact typed preparation result. `operation` and `stillAuthorized` are trusted functions, never JSON supplied by a customer. The authorization callback must use Root's fresh, bounded real-Session/token verifier described above. Root supplies its own bridge to that verifier; the Node helper cannot authenticate SQL by itself.

Reopening first checks current authority, source, native intake/snapshot/readiness/media, cached candidate release, canonical preparation bytes, actual retained dependencies/build/import admission, package and host. It derives the prepared checkout internally via `retainedCustomerSitePreview`; no prepared path is accepted from the proof. It then uses the existing `withCustomerSitePreview` callback and existing IPC `--owned-runner` child tree. Only the trusted callback receives the actual loopback origin with matching package/source headers. No URL is added to `PreparedPreview` or made into a public authority token.

The callback is limited to 120 seconds after readiness; the existing owned child tree retains its 150-second hard lifetime. Authority is checked every second, with final checks before returning. Session loss, callback error or expiry closes the owned runtime through the existing `finally` guardian; foreign processes are never touched. Readiness requires the actual source/package headers, and channel/email/provider holds remain in the maintained producer. The retained build supports a new separately authorized inspection window if review needs longer. Preparation itself never starts a server.

Root can drive Chrome and real local inquiry probes within this owned callback. A small illustrative composition is:

```javascript
await withPreparedCandidatePreview(serverPayload, preparedProof,
  async ready => rootOwnedBrowserInspection(ready.origin),
  async () => rootFreshSqlSessionVerification());
```

The two Root callbacks above are integration responsibilities, not new executable commands provided by this repair. Root must retain a live owner and fresh SQL authorization monitor throughout an actual window.

## Certification and remaining acceptance

Legitimate order: actual draft-reader editorial/presentation review, genuine private content approval, immutable candidate release/preparation, actual full NativeContentSite desktop/mobile/enlargement/inquiry/measurement inspection, then existing `verify-local` certification. Private content approval describes what was actually reviewed. It cannot falsely certify the final renderer or launch.

`verify-local` still requires the original audit plus eight package/source/scope-bound PASS areas and existing completion checks. The new preparation artifact cannot substitute for any of them. Publication time, semantic guide-index requirements, immutable approval, source freshness and public launch gates remain unchanged. Any unresolved content facts in `page.factChecks` still block approval; final presentation/launch obligations require explicit separate truthful evidence, not invented PASS text or automatic note removal.

All preparation proofs say `server: not_started`, `full_site_status: UNVERIFIED`, `launch_status: UNVERIFIED`, with admission/deployment/channel activation not performed and calibration UNVERIFIED. These describe the preparation operation. Actual later observation and acceptance remain Root-owned.

## Verification boundary

The original missing-operation baseline is retained in the new upgrade journal. Focused Python tests cover wire integrity, namespace, auth/source/environment/language loss and error mapping; the maintained previous Foundation tests remain relevant. Node tests use real synthetic intake/review/release bytes in an isolated temporary directory while **mocking build/serve transports**. They exercise no server, provider or customer case. SQL regression tests are provided for Root to run against its fresh dedicated QA database; collection is not execution. Actual production build, HTTP, Chrome and native customer adoption are not claimed by this source delivery.
