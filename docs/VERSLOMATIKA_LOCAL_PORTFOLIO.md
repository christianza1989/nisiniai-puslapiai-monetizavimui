# Verslomatika local identity/portfolio implementation

2026-10-10. Scope issue64 / core PR65: I1a/I1b local-only read portfolio. Owner explicitly continued work in coordinator turn01a12316-8c34-7492-8197-8fcd7deb6a8b after the docs-only21a59d5 checkpoint. The existing [integration plan](VERSLOMATIKA_CORE_INTEGRATION_PLAN.md) remains the wider roadmap. This slice does not complete D1/D2 generic tasks/chat or hosted customer onboarding.

## Source and ownership

- Fresh private main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`; public read-only main `d0fd6b7d296303bfcaafadc4071945e675a72b96`. Own managed branch/worktree, source reservations in issue64/66 and WORKSTREAMS before shared edits.
- Core owns [control module](../agent-business-core/runtime/src/pinet_core/control/routes.py), additive [0010 migration](../agent-business-core/runtime/migrations/versions/0010_control.py), explicit [bootstrap](../agent-business-core/runtime/scripts/control_bootstrap.py) and [PostgreSQL tests](../agent-business-core/runtime/tests/test_control_portfolio.py). Existing models/db/legacy fixtures/acquisition/public packages are preserved. Minimal shared mount/settings/metadata import; legacy bootstrap now excludes control tables from its broad grants.
- Verslomatika coordinator owns portal branch `codex/portal-dashboard` in its own repo: login/BFF/dashboard and current audit/voice journey. It agreed this actual local session transport. Portal source/credentials are not copied into this PR.
- Canonical [OpenAPI0.2.0](contracts/verslomatika-portfolio.openapi.json), contract `portfolio.v1`, committed checkpoint `7e476e4ae58297579c3044a2b08f2bf0e0a0d11a`; exact Git blob SHA256 `ef003c901e2f45509d68242e0a28a89774104dc69b4200634cf7b06da3521154`. The proposed signer assertion remains a future hosted adapter and is not implemented here.

## Actual core behavior

Core-issued local credentials use salted scrypt16384/r8/p1 hashes. POST `/operator/v2/auth/login` accepts only bounded username/password JSON; returns a64-character random opaque Bearer and ISO UTC expiry, up to8h. Only token SHA256 is persisted. DB session/user enablement/revocation/expiry is checked on each request; current organization memberships and enabled business grants are enforced by queries and seven forced-RLS control tables. Organization roles are owner/viewer; both have portfolio read only. There is no customer signup or mutation endpoint in this slice.

POST `/operator/v2/auth/logout` commits revocation. Four GETs return the agreed allowlisted envelope/projection. No credential hashes, contacts, transcripts, finance, raw payloads or unpublished content. Foreign portfolio/business IDs return404; absent/invalid/expired/revoked sessions401. RLS context uses transaction-local user/environment/login/token values, cleared by commit/rollback; a pooled unscoped connection sees no control rows. The application role is neither superuser nor BYPASSRLS and cannot write control users/memberships/grants/organizations/portfolios. Only sessions and durable login counters have runtime INSERT/UPDATE grants.

Both pilot feature gates default disabled. Core permits only actual loopback socket clients and loopback Host, explicit local/test environment, configured source revision/cursor key and TTL. It rejects Origin and Forwarded/x-forwarded-* headers, including spoofed local headers. No CORS browser access. Core v2 bodies are limited4096bytes within the existing outer220KB limit; error/validation/DB messages are sanitized and no-store. Server-only BFF transport must use its configured fixed loopback URL, omit browser forwarding headers and store its token in HttpOnly/SameSite=Strict cookie; the coordinator owns that implementation/acceptance.

Login uses persisted atomic counters per hashed username and actual socket IP:10username attempts and30IP attempts per15min, successes included;429/Retry-After900 after the limit, even following process/pool restart. Unknown usernames use the same scrypt workload and generic invalid_credentials. This protects a disabled-by-default local pilot; hosted authentication/HTTPS/key provisioning requires separate acceptance.

Portfolio limit1–100, stable UUID sort. HMAC cursor binds current user, session, portfolio, environment, five-minute expiry and exact projected/evidence snapshot. Another session/tamper ->400; expired or changed snapshot ->409. Current grants are rechecked before pagination; cursor cannot restore revoked access. The local bootstrap admits at most100explicit source entries.

## Registry and private local setup

Dedicated loopback PostgreSQL port15438/container `pinet-portfolio-i1-20261010`, isolated named volume; actual core API127.0.0.1:8846 at committed source `e466bd16178ed467cd050bc7756c6149ef89b756`. Other containers/checkouts/databases preserved. Setup produced a separate ignored runtime `.env` and `artifacts/control-local/` configuration; none is in Git. Private files have restricted Windows ACL. SMTP, lab mail, voice, learning, knowledge refresh and job workers disabled.

The explicit private owner/source manifest registers exactly nine current clean public-package IDs, retaining the existing registry UUID when a site mapping already exists in this pilot. New UUIDs are created only for this dedicated local database with explicit `--allow-new-businesses`; the normal bootstrap rejects missing mappings. Bootstrap validates host/optional expected UUID, serializes writers with a PostgreSQL transaction advisory lock, creates one org/portfolio/membership and grants atomically, and refuses takeover, changed credentials, disabled/revoked mappings or conflicting evidence. Repeat/concurrent runs return the same IDs. It neither infers domain ownership from a hostname nor activates runtime capabilities.

The original shared/live runtime database was not read or migrated. Thus pilot UUIDs are stable in this pilot, not a claim that all historical main/production UUIDs have been adopted. A future shared-database adoption must inventory/verify those rows and run bootstrap without new-business creation, preserving every existing UUID. Standalone/branch-only projects and Dovanos123 staging are not silently added.

Every initial entry has `stage=null`, `connection_status=registered`, `runtime_status=not_connected`, `last_verified_activity_at=null`. Source package presence does not prove deployment, running agents, business phase or activity. The UI must display that distinction.

Fresh local setup in the runtime directory:

```powershell
uv sync --locked
uv run python scripts/control_local_setup.py --public-core <fresh-clean-companion>
docker compose --env-file .env -f artifacts/control-local/compose.private.yaml -p pinet-portfolio-i1 up -d postgres
```

Before fresh migration0009 the restricted `pinet_runtime` role must already exist; existing migration0009 grants to it. The canonical bootstrap's new role-only option provisions it from the private generated administrator configuration (NOSUPERUSER/NOBYPASSRLS/NOCREATEDB/NOCREATEROLE), without depending on migrated tables or resetting an existing role:

```powershell
uv run python scripts/bootstrap.py --role-only
uv run alembic upgrade head
uv run python scripts/bootstrap.py
uv run python scripts/control_bootstrap.py --manifest artifacts/control-local/operator-manifest.private.json --allow-new-businesses
uv run uvicorn pinet_core.api:app --host 127.0.0.1 --port 8846 --no-access-log
```

The flag above is exclusively for a new dedicated local pilot. Credentials are generated privately, not default public passwords. Do not print/copy their values to chat, logs, commits, bundles or public configuration. Before API start set the private `PINET_CONTROL_SOURCE_REVISION` to the actual committed implementation SHA. Keep role provisioning separate from API startup and never give the portal administrator/legacy operator credentials.

## Executed acceptance

| Check | Actual result | Scope/limits |
| --- | --- | --- |
| `uv sync --locked` | PASS | Existing107package resolution/lock preserved, no new dependency |
| `uv run pytest tests/test_control_portfolio.py tests/test_core.py tests/test_policy.py -q --tb=short` |45PASS /124.19s |14new control +31legacy core/policy; real restricted PostgreSQL, two isolated organizations |
| Targeted control run after logout timing repair |15PASS /31.36s | New actual uvicorn/TCP test with three immediate independent post-logout requests; overlapping reruns are not added totals |
| Isolated fresh DB migration rehearsal | PASS after repair | Full head upgrade ->0009 downgrade ->head upgrade; seven forced-RLS tables reappear. Dedicated rehearsal DB, pilot untouched |
| Ruff, changed Python scope | PASS | Imports/lint, no unrelated source formatting |
| `uv run pytest tests/test_mailbox.py tests/test_facebook.py -q --tb=short` |22PASS /25.50s | Existing legacy modules, substituted transport/model, no external sending |
| Docs/canonical structure and safety | PASS |3docs/26local links,6operations/58resolved refs; exact18staged blobs compared with both primary/pilot local secret values,0findings |
| Final combined scoped suite at repaired runtime source |68PASS /96.27s | One run:15control +31core/policy +22mailbox/Facebook. Earlier overlapping totals not added |
| Authorized empty portfolio boundary, added acceptance test |1PASS /1.77s | Empty authorized200/items[], foreign404, missing session401; runtime code unchanged |
| Actual loopback TCP HTTP | PASS | FourGETs,9source IDs/five pagination pages, matching private receipt UUIDs, three foreign404s, logout204/immediate401 |
| Actual API+PostgreSQL restart | PASS | Previously issued persisted session and organization binding survive; only dedicated processes/container restarted |
| Actual pg_dump/restore/new API process | PASS | Private custom archive ->separate fresh DB in same local cluster; same9BusinessUUID/user/portfolio/session; foreign404. No hostedP19 claim |
| Portal test/typecheck/build | PASS, reported by coordinator |119offlinePASS/1unrelated mailSKIP; focused10PASS; final production build/typecheck PASS. No paid inference/microphone calls |
| Actual portal browser/HTTP | PASS, coordinator plus bilateral source/visual review | Production Next127.0.0.1:3014 ->repaired core ->DB; both-org APIs/logout/replay/restart/keyboard/noindex/final desktop. Mobile/DOM on same code's initial dev run, not repeated on production |

The migration rehearsal first failed: control_organizations RLS policy still referenced control_memberships while downgrade attempted its drop. The transaction rolled back; fixed by explicitly removing all seven policies before FK-ordered drops. Original FAIL is preserved here. Setup first failed on incorrect source `site.domain`; repaired to canonicalHost and moved source validation before private configuration writes. Completed only the missing manifest in that owned ignored setup; existing generated credentials were retained. Initial additional legacy run16PASS/6FAIL was an environment-path failure: Facebook expects a sibling companion config. Added an own worktree sibling junction to the verified read-only public clone, then all22PASS. Facebook source/tests were preserved. The first safety invocation accidentally selected the primary checkout because its first positional argument was the secret-root path; that zero-file result is not acceptance. Corrected explicit `.` root and verified the actual18staged blobs twice.

Actual TCP acceptance at78f1aae passed four GETs, nine registrations/five pagination pages and three foreign-org404 denials, then **FAILED** immediate read after logout: default request-scope yield cleanup committed revocation after sending204. ASGITransport waits for that cleanup and had masked the race. Changed all authenticated v2 dependencies to function scope, so commit completes before response; added an actual separate uvicorn/TCP test with three independent immediate post204reads. That15-test run passed. Peer review also requested canonical WWW-Authenticate Bearer on401; added with focused assertion. Final repaired-source HTTP/browser receipt follows below.

## Paired local gate and applicability

Portal [implementation PR63](https://github.com/christianza1989/verslomatika/pull/63) at `5b7535e7f9ed7ba19a7e421077344cd23befa73d`, stacked on preserved customer-journey PR61, carries the agreed0.2.0 schema/types from exact7e476e4 Git blob. Its [acceptance receipt](https://github.com/christianza1989/verslomatika/blob/5b7535e7f9ed7ba19a7e421077344cd23befa73d/docs/handoffs/portal-dashboard.md) and [startup runbook](https://github.com/christianza1989/verslomatika/blob/5b7535e7f9ed7ba19a7e421077344cd23befa73d/docs/runbooks/portal-local.md) were read. Core bilateral review read actual fixed-URL/no-redirect/deadline/body/schema/no-store/cookie/login/logout/BFF code and bounded desktop/mobile screenshots; no P0/P1 issue found in this local scope. Coordinator peer-reviewed core78f1aae and repaired e466bd1;401header finding was fixed. Source review is not a production approval.

Final production frontend gate reported: nine owner registrations; four canonical reads; unauth401 and CSRF403; both organizations read own portfolio and receive404 for the other's portfolio/business API. Foreign detail shows denied UI and no business data. Next.js streamed not-found document can be HTTP200; authoritative API is404. This framework behavior is recorded explicitly and never counted as authorized access. Operator browser session survived API/DB restart; exact logout204 followed by immediate old-cookie401; browser redirected to login. Desktop/mobile detail/dashboard and keyboard3px focus/noindex verified. Initial bounded screenshots are private/ignored and are visual evidence only, not a claim of their exact production viewport/source timestamp. Public audit entry HTTP200 and119offline existing journey regressions passed; no new provider/paid inference/microphone test.

| Plan scenarios | Local evidence/status | Remaining wider scope |
| --- | --- | --- |
| P1 | PASS actual login/registry/browser/restart and private UUID comparison | Historical/shared DB UUID adoption unverified |
| P2 | PASS two-org current-grant API/RLS and paired BFF/UI denial; authorized empty API test | Public customer signup remains absent |
| P3 | Local replacement PASS forgery/expiry/legacy secret rejection; hosted signer cases NA for this slice | Future IdP/JWS/jti/request binding PLANNED |
| P4 | PASS local session/user/membership/grant revocation and immediate TCP/BFF logout replay | Streams/download/task execution not implemented |
| P5–P6 | PASS restricted forced-RLS/pool/environment boundaries and bound pagination/tamper/snapshot expiry | Hosted pools/key rotation operational acceptance pending |
| P7 | PASS atomic/concurrent/idempotent bootstrap, conflict refusal, fresh migration rollback/re-upgrade and actual local backup/restore | Shared/production inventory and hosted recovery pending |
| P8 | PASS registered/null stage/not_connected/no activity in API and UI; no capability inferred | Standalone/branch-only project adoption not done |
| P9 | PASS authorized-empty API and portal tested outage/schema/redirect/expiry/oversize fail-closed paths | No fake-live fallback;24/7 outage operations pending |
| P10–P11 | PASS allowlisted/sanitized API, server-only BFF token/cookie/source review, paired no rendered credentials/noindex/no-store/browser/focus/mobile | Secrets are private; full hosted security/design acceptance separate |
| P12 | PASS68scoped core checks;119portal offline/1unrelatedSKIP, public audit HTTP200 and production build | Public core unchanged; no fresh paid voice/microphone acceptance inherited |
| P13–P19 | PLANNED, outside this accepted I1a/I1b slice | Generic durable tasks/Codex chat/onboarding/hosted platform |

The agreed local read-only I1a/I1b slice has passed its actual DB/HTTP/browser gate. The platform remains incomplete: generic agent/task/chat and hosted/customer operations are separate increments. No production deploy, paid provider, SMTP/customer outreach or live agent was activated.

## Delivery and rollback

Core PR65 and portal PR63 must be reviewed/merged independently; source delivery does not imply main adoption/deployment. Runtime source `e466bd16178ed467cd050bc7756c6149ef89b756`; schema checkpoint7e476e4; subsequent receipt/test-only commits do not silently change the running code. Upgrade journal `upgrade-a7324869-02d4-4244-8644-7e4a6ec1044b` records the original failures, repairs and actual acceptance. Scoped handoff includes both repo freshness and exact staged-secret/whitespace checks; CI preflight at e466bd1 PASS. Shared runtime writing window closes for this checkpoint; any I2 migration/module must have a new exact issue66 reservation, not reuse this completion claim.

Rollback: disable portal/core feature flags and stop only the dedicated pilot API; preserve its registry/session database/volume. Scoped source revert restores legacy routes.0010downgrade is destructive for new identity/session data and was rehearsed only on a separate fresh disposable database; do not run it against the pilot/shared runtime as a UI rollback.
