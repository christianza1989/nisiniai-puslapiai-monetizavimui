# Call-local Authority dependency observations

`site_build.Authority.capture/verify` owns exactly two sequential dependency
graphs in its existing token-bound transaction: entry and final. Each graph
calls the maintained accepted-material/team/profile, approved-plan, selected
private-intake, S6, Foundation and media validators. It shares named dependencies
only inside that graph. There is no generic SQL memoizer, permission TTL,
completed callback cache, persisted observation or lease-attached authority.

The private ContextVar carries the current phase pointer. The phase checks its
owner task, exact transaction and Creation identity, operation/phase lifetime,
and current Session `(id, user_id, environment_id)`. Nested phases, operation
reentry, inherited child tasks, wrong transaction/Creation, closed callbacks and
checks without a running task fail with503`source_unavailable`. Every awaited
dependency is checked again before publishing or returning, and cached copied
data is checked before return. Closing clears accepted data and
the transaction-local mutable Creation reference. Caller cancellation propagates.

U is the authenticated current customer. P is selected by the private request's
own referenced Session; S is selected by S6's own referenced Session. Their SQL
Session selections and existing error transformations stay independent. Every
`Phase.actor` invocation calls canonical `current_actor` afresh, including repeated
P/S reads inside the same phase. No actor permission facts are retained. Historical
authority never substitutes for U. The immutable approval Session ID is not
implicitly renewed. Current actor's standalone implementation remains unchanged.

Entry finishes the entire required private/material/S6 graph before reading
native status, using the same canonical native guard as Authority. Selecting S6
for the first time after native output would miss a valid selector replacement
during that read; two regression failures preserved that initial implementation
mistake. The final graph calls the validators afresh and compares accepted
proof/payload/job usage, approval context, private latest request/receipt/anchor
identities and digests, and S6 latest identity/context/referenced Session.
Every existing Creation refresh, status/archive/Guide-busy check and native/source
file hash check remains. Material observation precedes approved-plan observation
inside the optimized Foundation graph, with a fresh canonical source guard after
the material await. This keeps late source/approval loss a503 failure.

One native status output is retained only inside the same Authority invocation,
bound to full U identity, Creation and exact accepted proof. The final graph
does not spawn the status producer again. Its fresh explicit post-output
authorization still runs. Native transport pre/monitor/final callbacks call the
original fresh `current_actor`, User, Creation and source checks; they never use
the phase actor path. Public standalone reader signatures and their fresh behavior
are unchanged. The surrounding `git_source_operation` final fence remains after
the observation closes. Limits3/20/120/150, models, roles, quotas, wire and
schemas are unchanged. Monitor cadence is separate Root work.

## Evidence and classification

Pure tests execute the real canonical Python validator graph over fake SQL,
synthetic source/native bytes, report/source-context projection data and a native
transport output stub. They do not run a DB, native producer, server or provider.
The private/historical-S6 baseline atd904 was material/team8, selected private
latest5, native output1; the new target is entry1+final1 =>2/2/1. With ready profile
schema and attempts, the modeled profile SQL count is40→10. Two separate verify
calls read four graphs and invoke the native output stub twice. These are not
measurements of Root's306SQL trace or a latency/serving acceptance claim.

The pinned d904 source-overlay comparison separately established four formerly
admitted valid replacements during native output: private request identity,
receipt identity, S6 row identity and S6 referenced Session. New final selector
fences reject them with an existing409 code. Source overlay only executes Git
source snapshots in an isolated pure test process; it rewrites no checkout.

Root explicitly approved three classification changes during native output:
P revoke, P expiry and private schema absence formerly reached Foundation's
late direct selector and503`invalid_foundation_source`. The new final proof
detects them earlier through canonical409`private_intake_missing`, the same
code used before native output atd904. They are not claimed as unchanged status
parity. There is no general error translation and no new wire code. U401,
owner/account/member404 and actual source/approval503 refusals stay distinct.
An executed second-material-reader seam atd904 retained503 for physical source
and approval loss; the new canonical source guard and read order retain503 too.

Original logs remain private and their hashes are recorded in upgrade events:

- Original count/mutation baseline1FAIL10PASS6.92s:
  `9b6264e9699825f2599cad07248d06f62c99a7a84e13b1a9b4736aaa00df2970`.
- Root-reviewed lifetime/identity baseline9FAIL11deselected11.32s:
  `dd27e89b0b18c1d16ef6670b11742f0049d4ecb7eac9a74644c96ddb90834806`.
- Expanded first graph56PASS5FAIL32.03s, including two missing entry-S6 fences:
  `f12d2af84854f7b2bdceef6dfeb5c3bf4676159da1f400183643398b30127656`.
- d904 native mutation comparison9PASS7FAIL6.30s: four admitted replacements
  and three503-versus409 classifications, separately explained above:
  `8c122ccaad7b11726dc32ae15215f135237892bc97289b2af9e41983b3870fda`.
- d904 physical-source/approval material seam2PASS2.02s:
  `1c157bcd40bf7e28516b4439f09fdb60537d2ef3a99371873b07e6c7805377ce`.

Upgrade`93226de5-b71a-42ce-b4d0-62277193a1f7` covers the nine scoped observation
runtime files. Its record is not expanded for the separate canonical ORM refresh
repair documented in[APPROVED_CONTEXT_FRESHNESS](APPROVED_CONTEXT_FRESHNESS.md).
Before the late-S review, related regression was389PASS24.35s, one actual-process test deselected and one
existing deliberate invalid-UUID serializer warning; log SHA256
`6cab486bcbf0600ad3d3c7b0c463c3c32b610298b61d2ca03f47b01d9f160957`.
Additional approved-context regression:36PASS4.05s, SHA256
`025e975efee978e89071496262ac1e68e4325aa29943dc738f5b506f3b0384e0`.
Both use the existing supplied QA Python, with no dependency or environment setup.

A later canonical graph gate found three further failures after S had already
been checked in the final phase: revocation, expiry, and clock-only expiry during
the retained-output post-authorization callback. The following S6 Session select
returned the changed Session, but the first implementation's actor facts skipped
canonical `current_actor`. Baseline3FAIL79deselected13.89s SHA256
`0f08a526c085f70c0f5f2e6d03a5bbbab560bcaf48bcf1df035110611da293b4`
is retained. Actor reuse was removed entirely, retaining post-await/full-identity
checks and material/proof/intake grouping. The same three gates then passed5.51s,
each through409`build_continuation_stale`, SHA256
`6a6757d5b0b259fbd11dbcdf61a0670dbacbbf8dfcbc2e6b7e48909c05a53917`.
Earlier passing counts are historical evidence, not proof of completeness.

Final regression after removing actor reuse:428PASS67.15s, one actual-process
test deselected and one existing intentional invalid-UUID serializer warning.
SHA256`b08aa6a62e62bbed66938ad49803c59291f3b5a71239842d87874b3528bf02f6`.
This single run includes all twelve pure/offline test modules from the earlier
389-case and36-case runs plus the three late-S regressions. Exact Python Ruff
checks cover the ten runtime files and two changed test files.

Root owns actual DB/native/HTTP/renderer/browser acceptance and serving adoption;
pure test success is not platform acceptance.
