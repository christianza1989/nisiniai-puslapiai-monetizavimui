# Bounded authenticated customer live-preview runtime

Base b059995fda183ad38749016b7d14e12d704cb78d; companion remains clean
255fea0813bf1aabeaeea2f2de0b29564118f2fc. Wire JSON Git SHA256
d25040f6f7a279ca04bd5f2a9ed90eef8ab48e787a5eaf551c353686b37b6016
and wire.py Git SHA256
8dfffe2267a9cc604538d4f10835d2d089a8c44b3043cb55cc29c3196811e6a0
remain frozen for Root's consumer. Exact7 shared source paths are in record.json.

The ordinary four customer actions reuse current token scope/customer_session,
owned Creation, shared native/S6 guard and Foundation capture/verify. A lazy
registry owns the guarded studio callback. Only POST prepares; GET calls three
export-only readonly aliases added in one line to canonical Foundation. No
renderer, transport, auth schema, worker or lifecycle startup was duplicated.
Only the approved central router imports/mount and close-beforeDB hooks changed.

The private ledger admits one service-wide claim and at most64 retained request
UUIDs. Replay preserves exact observed revision/context and original Session;
terminal UUID never creates another child. There is no crash PID/URL adoption,
automatic lock stealing, audit eviction or arbitrary request origin/path/proof.
Ready is exclusively nonce/scope/proof-bound, exact127.0.0.1 validport,<=89seconds.
Heartbeat<=3seconds follows real canonical authority verification; Node also
checks native/readiness/media. Producer150/callback120 caps stay unchanged.
The bridge139/studio149 bounds are conservative; its wait timer is cleared after
canonical callback rejection so a completed child cannot leave a retained timer.

First meaningful runtime baseline3FAIL22PASS2.60s, retained private log SHA256
28b1e154fb0e241349c5269df0a56ca94eb9b93392ea9ab12b64e367e464cc7a.
Findings: shutdown could miss a concurrently admitted POST; JSON-null active
claim was treated as absent; malformed owner Session identity was accepted.
Fixed the causes: the entire admission-drain/task-join sequence survives repeated
cancellation; ledger reads require objects and canonical owner identities. The
same regressions pass. An intermediate mocked preparation asserted on revoked
authorization unlike maintained Foundation; corrected the fixture to its actual
ControlError401 behavior. No production expectation, timeout or guard weakened.

An initial test harness assertion matched the session_id key instead of a raw
token value; corrected before the meaningful25-test baseline. First broad run
204PASS/1FAIL21.83s was an invocation error: scripts was missing from PYTHONPATH;
log SHA2561ac6066ce18a5a6249f74ffbba4a30ab5346b3e8ed28ac74a6c60c457ec00e2b.
No frozen wire/generator or test expectation changed. Final invocation is
PYTHONPATH=src;tests;scripts from agent-business-core/runtime.

Final combined pure/mocked regression209PASS21.09s, one existing deliberate
invalid-UUID serializer warning. One existing actual process monitor test was
explicitly deselected to retain the helper's source/mock-only boundary.
Private log SHA256dab6c10ab8134ed027cc9288c22110c3384d7827569eae66a1d95615a2eb7496.
Includes34 new runtime tests plus frozen wire, opaque preparation, held-runner
inspection, supervisor cancellation and Foundation/receipt protocol checks.
Node19PASS329.94ms, private log SHA256
7fe9ef19a5daf070d6d789555eb3535e20f8b8159c4df036fab45c6200fd1991.
They mock producer/authority and test real exclusive private ready-file writes,
readonly readiness, nonce/claim/expiry/media/origin refusals and timer cleanup.
Seven changed/new Python files pass Ruff; diff whitespace check passes.

Opt-in real RLS/HTTP/native tests:6 collected only0.62s, log SHA256
131361f6e156759d87b7e71eb6fd67f1bea4697b3acd6f279b3c23f6c8fc9f44.
They preserve isolated synthetic native files, test readonly blocked GET, actual
revoked/expired Session, disabled owner, foreign owner and existing private/S6
refusal. Source-current seam in the last test is explicit and synthetic. Root
supplies/migrates the QA DB and executes them; collection is not SQL acceptance.

No helper actual DB/container/current-case/native mutation, preview/server/child
process/browser/provider, hosting or runtime adoption was performed. Root owns
actual maintained renderer/new-tab/current-case checks and child-tree/expiry/
revocation/shutdown evidence. The wire and runtime journals remain separate;
Root receives the final functional Git pin before appending actual acceptance.
Merge to main, another PC fetch and serving adoption remain distinct events.

Rollback: scoped source revert before adoption. After adoption, close and join
only this registry's owned canonical callbacks before replacing source. Retain
all original intake/proofs/session refusals, request/ready/terminal audit and
uncertain locks. Never reset other worktrees, adopt an unknown process or erase
immutable historical failures. Paid workers, external channels and deployment
remain held.
