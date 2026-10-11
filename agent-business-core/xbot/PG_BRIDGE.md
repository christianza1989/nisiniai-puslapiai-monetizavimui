# Restricted PostgreSQL module bridge

Issue97 adds `runtime/src/pinet_core/xbot_bridge/` on the maintained platform Registration/Profile/Agent/Config path. The module is default OFF (`PINET_XBOT_BRIDGE_ENABLED=false`), local/test only, and requires the existing customer/control/customer-agents gates with voice/SMTP OFF. Migration0024 follows0023. It has not been applied to the operational platform.

## Implemented path

1. Current verified owner Session authorizes a privileged **synthetic-local-proposal-only** mandate against exact Registration, current immutable Config SHA/revision and current Profile. Evidence includes a distinct Xbot library/instruction fingerprint and retained proof hash. A saved `customer_research`/`custom` purpose alone is insufficient.
2. Immutable module admission retains those identities, execution Git source and public KnowledgeReferenceV2/index receipt. One slot per environment/site binds the business/owner and monotonic generation. A new slot requires the old slot's explicit revocation; histories are retained.
3. A separate short-lived worker credential is issued privately once; only its hash is stored. BrowserSession is never execution authority. Browser logout does not erase this independently authorized mandate. User, verified Account, membership, business grant, Registration, Config, Profile, knowledge/source, module fingerprint, worker revocation and fixed deadline remain current gates.
4. PG durable draft tickets use UUID idempotency and a single reservation epoch/lease. Job ID is bound before model dispatch. At most2 calls are recorded individually before dispatch, with known/partial/unknown usage independently persisted after each call. Unknown usage does not imply zero cost. Token quantities in QA are synthetic; currency costs remain unverified.
5. The server coordinator uses one private SQLite database per ticket and the maintained Xbot Agent/AsyncModuleAdapter. No PG or SQLite transaction is held across a model await. Context is revalidated before/after each call. A private server-injected synthetic adapter is required; the maintained actual `CodexRunner` is explicitly rejected. Arbitrary trusted Python dependency injection is not a general sandbox.
6. SQLite completion is a **proposal**. PG final acceptance rechecks authority/source under the same Registration lifetime and canonical row barriers used for revocation, then compares ticket epoch/generation/lease/job/usage. Late authority failure quarantines the proposal and retains observed usage. Model review rejection is retained separately. No publish/reply/DM/Treg transport is supplied; all channels remain disabled.
7. Terminal tickets cannot be rewritten or promoted. A lost process is never blindly resent; explicit reconciliation after lease expiry yields `uncertain`, preserving already observed usage. Private SQLite may retain further known receipts after a database outage; recovering missing PG accounting requires explicit reconciliation, not an invented zero or rerun.

## Rights and concurrency

The runtime role remains NOSUPERUSER/NOBYPASSRLS. All4 new tables force owner/environment RLS. It can read admissions/slots/workers and insert/update tickets, but cannot create a module admission, worker grant, mutate pins or delete history. Admission/worker identity, slot generation and ticket lifecycle have database triggers; Config, Registration and Profile continue using maintained contracts. Composite FK binds a ticket to the exact worker/admission/generation/owner tuple.

PostgreSQL `FOR SHARE` requires UPDATE privileges. A scoped `SECURITY DEFINER control_xbot_pin(admission_id, worker_id)` acquires only that admission's canonical row locks after the Registration lifetime barrier. Exact owner/environment GUC and local/test environment are required; foreign scope returns false. It performs no writes and accepts no arbitrary table input. PUBLIC execution is revoked; canonical table UPDATE grants are not broadened. A separate narrow hash lookup establishes retained worker identity for accounting; it does not admit execution.

## Dashboard integration

`GET /customer/v2/creations/{creationId}/agents/{agentId}/xbot/tickets/{ticketId}` is registered in existing `api.py` and `control_api.py`. Its strict `xbot-local-receipt.v1` allowlist includes ticket/job/proposal hash, state, usage counters/status and explicit `calibration_status=UNVERIFIED`, `live_module_admitted=false`, `provider_execution=false`, `channel_activation=not_performed`. It returns no worker credential, Config prose, facts, private proposal or model output. Current owner/creation/agent authority is required. This is an HTTP receipt, not an accepted portal/BFF tile or current UI screen.

Platform UI should display this as a **local integration test** separately from canonical calibration/admission/activation. Root owns the actual portal/BFF changes. Ticket enumeration, a calibrated run issuer, production worker lifecycle, and live module admission need separate acceptance. Do not change maintained readiness from `not_admitted` using this proof.

## Reproducibility and limits

Use locked runtime dependencies (`uv sync --locked`); the existing Xbot `tzdata>=2025.2` requirement is also declared in runtime and locked to2026.5 for Windows IANA zones. Use the fetched companion as read-only sibling `dovanos-memorycasting`; canonical bootstrap provisions nonglobal runtime table rights while respecting control migration grants. Private QA environment files, DB, tokens, raw proposals and logs stay ignored.

QA uses actual restricted PostgreSQL17 and maintained Xbot with fake model calls, not a fake database/resolver. Development source-verifier injection is labeled; final clean Git QA sets `XBOT_QA_FROZEN=1` and pins the actual HEAD before preparing the Registration/Profile. Tests preserve initial failures. See `QA-PG-BRIDGE.md` for exact evidence and source.

Public facts are deliberately bounded current page texts (1–35, each<=1800characters), not private intake or silently truncated content. A larger real projection requires a separately accepted curated facts/calibration path. Same-content source refresh0023 can pass maintained freshness checks, but never changes an existing module's binding/worker deadline. Source drift requires explicit re-admission against the new exact source; GET never renews it.

Actual customer/model calibration, portal/BFF/dashboard acceptance, target-PC adoption, deployment, live Treg transport and business demand remain OPEN. No operational15438 DB/API8860 adoption, paid model/provider call, main merge or live acquisition was performed by this increment. Populated downgrade refuses destruction; disable the module and use a scoped revert while retaining history.
