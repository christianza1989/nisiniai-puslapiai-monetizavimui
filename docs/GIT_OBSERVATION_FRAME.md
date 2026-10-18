# Current Git observation frame

The maintained `pinet_core.source_observation` reader uses one native Git status
frame per fresh repository boundary. It runs `git -c status.showStash=false status
--porcelain=v2 --branch -z --untracked-files=normal` with a fixed absolute repository
path, a10s command bound and suppressed stderr. No customer-selected command,
shell or path is admitted. This replaces two processes at each boundary.

NUL framing, a terminated response, exactly one40hex `branch.oid` and exactly one
`branch.head` are required. Optional `branch.upstream` and numeric `branch.ab`
metadata are recognized literally, including the dot in each key. Unknown or
malformed fields, unborn HEAD and every tracked/untracked/rename/conflict/submodule
entry fail closed with the unchanged safe `source_unavailable`. Raw Git output,
filenames and stderr never become that error's message.

Two repositories still have independent fresh entry and exit observations: four
native processes per successful operation versus eight before. Repository identity
is checked before and after the raw frame. The operation's bounded map, lock,
OPEN/CLOSING/CLOSED lifecycle, cancellation cleanup and final revalidation are
unchanged. Explicit nested or independent operations start empty. Unscoped calls
remain fresh; a completed operation cannot authorize a later callback.

Each caller still compares its expected execution revision, and source-file hashes
remain fresh. No SQL/Session/user/membership/native content/media/Foundation proof
or authorization result is cached by this primitive. All authority checks and
the3/20/120/150-second runtime bounds are unchanged. Fewer native processes do not
establish an end-to-end latency or stability guarantee.

The earlier [source-observation checkpoint](SOURCE_OBSERVATION.md) is retained at
its originalf53 bytes, including its historical two-command/eight-process counts.
Use this document for the current frame; do not edit an existing `SOURCE_*`
checkpoint to update those counts. The initial incremental gate correctly refused
the attempted checkpoint edit. Its first BLOCKED report is preserved.

Initial count baseline1FAIL14PASS2.82s, logSHA256
64264b3e79892ca5f4bba1088ab633ac6e6df9c33812d44c9978b53e410bf2c7.
Initial related328PASS22.80s, log8eb76e7d191e515b8dbbc7a2f03c9e1e923dea5b4b449f0dfbab5d169b6d93ac.
That source8df passed seven dedicated PostgreSQL cases in170.15s, all88 operational
tables/original0032/native exact, log3b746715d2f612073ce4f5798a19138fa403649d7d00f6ca1980723b2dd288ba.

Independent read-only review then found unescaped dots admitting malformed metadata
keys. Root reproduced4FAIL1.12s, log99510e37a872d0f8096415e37e5e0dd8921fecd0edb6a4ea10b3b637aa2c2f43;
all four keys now match a literal dot. This is a parser grammar repair, not an
observed actual-Git dirty bypass. The malformed-key fixture and earlier failures
remain. Current-case renderer/runtime acceptance is recorded separately.

Final related regression332PASS25.34s, including all four malformed-key cases,
loge3b3a9307e8e8e47ebe377b349953a44122efdd1648154b272c763b47b6bf189.
Ruff/diff checks passed. The first checkpoint-edit BLOCKED report remains and
the archive/checker rule was not changed to bypass it.
