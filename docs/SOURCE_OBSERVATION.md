# One authority operation's Git source observations

The maintained Python source readers share one fixed primitive:
`pinet_core.source_observation.git_source_observation(root)`. It reads HEAD and
`status --porcelain=v2 --branch -z --untracked-files=normal` from a server-owned
absolute repository path, with stash display disabled. One NUL-framed native
response contains the40hex HEAD and dirty inventory. Exactly one HEAD and branch
record are required; dirty entries, unborn HEAD, unknown metadata, malformed or
unterminated frames refuse. Filename newlines cannot impersonate branch fields.
Its immutable
result contains only raw Git observations. A dirty/unavailable/path-replaced
repository raises `SourceObservationError`, whose fixed public-safe `code` and
message are `source_unavailable`. It contains no path, Git output or stderr.

Default calls remain fresh. `async with git_source_operation():` explicitly opens
an always-new operation, including when nested inside another explicit operation.
Only helper reads within that currently active operation reuse its entry Git
observations. The current topology is bounded to two repositories: execution core
and companion. Repo identity includes requested/resolved absolute path and filesystem
identity; path replacement invalidates the operation. Each first repository read
performs one fixed Git command. On normal exit, every observed repository
is freshly read again, bypassing the map, and must match its clean entry state.
Thus two repositories cost at most four successful raw commands per operation,
versus the prior eight. Both boundary observations remain fresh; no successful
authorization or completed source result is reused by the next invocation.
Failure can stop the exit fence early; a successful result cannot escape until
all observed repositories passed their fresh exit fence.

The intended caller is one complete `Authority.capture` or `Authority.verify`.
Root owns that integration in live_preview.py. This module does not activate it,
start a worker or change the transport. Do not wrap an entire HTTP request, lease,
producer lifetime or heartbeat. Finish the source scope before returning current
permission or writing a heartbeat. Root maps an escaping SourceObservationError
to the ordinary503source_unavailable response. Existing wrapper refusal codes stay
safe; a source_current caller still receives false on failed Git observation.

Every existing caller still compares its current expected execution revision on
every invocation. Importer/network/bridge/verifier/parser SHA reads are never
memoized. Neither SQL state, Session/user/membership, accepted/private intake/S6,
native content/media, Foundation proofs, nor authorization booleans are stored.
No historical fingerprint, receipt, source adoption or published version changes.
The Node producer retains its independent checks. Three-second heartbeat and
20/120/150-second transport/callback/producer bounds remain unchanged.

The ContextVar holds one in-memory state with OPEN/CLOSING/CLOSED phases. Reads
in structured child tasks and asyncio.to_thread inherit the same state reference;
a threading lock prevents duplicate entry commands from concurrent threads.
Explicit independent operations get separate states, never a completed-result
cache. Closing freezes admission to the map before fresh final validation. A
closed inherited context refuses immediately, even if a cancelled read-only Git
thread still holds its lock. A worker checks the shared phase again before
publishing a fresh result; cancellation cannot resurrect or repopulate old state.
Context reset occurs in finally. Original body exceptions/cancellation are
preserved; only a normal successful body performs the fresh exit fence.

Failures/dirty observations are not reusable values. They invalidate the current
operation, so catching an inner refusal cannot turn its later normal exit into
permission. A subsequent operation is empty and retries freshly. No state is
written to disk, source files, DB, logs, Lease or proof objects. Raw reads and the
normal exit fence run off the event loop in the maintained async call paths;
both direct Foundation capture calls and both continuation calls use to_thread.

Entry/exit fences establish current source equality at those observations. They
are not an atomic worktree lock and cannot prove that no transient ABA edit
occurred between reads. Existing repeated Git observations were not such a lock
either. Source delivery and mocked call-count improvement do not establish actual
latency, renderer/process acceptance, current-case continuation or runtime adoption.

Mock-only regression covers the original200-vs4 command failure, two-repository
entry/exit and next-operation freshness, changed HEAD/dirty/error/path replacement,
safe failures, current expected revision, unchanged live file SHA behavior,
structured threads/tasks, independent/nested operations, retained closed context,
bounded roots and cancellation during entry and final revalidation. All Git
commands are replaced by test doubles; no actual Git subprocess, Node child,
server, DB or provider is exercised by these tests.

## One native frame follow-up — 2026-10-17

Actual f53 timing retained eight Git subprocesses per two-repository verification
and authority samples exceeding the unchanged3s heartbeat budget. Each repository
boundary now reads the maintained Git porcelain-v2 branch/status frame once,
cutting those eight processes to four without relaxing a boundary or authority.
This is a process-count improvement, not a guaranteed end-to-end latency result.

The original one-process regression failed2vs1, with14other cases passing;
baseline log64264b3e79892ca5f4bba1088ab633ac6e6df9c33812d44c9978b53e410bf2c7.
The final related regression passed328tests in22.80s, including real owned inert
Git repositories for clean HEAD, dirty tracked files, untracked paths, rename
and unborn repository refusal; log8eb76e7d191e515b8dbbc7a2f03c9e1e923dea5b4b449f0dfbab5d169b6d93ac.
All older cancellation/path/fresh-exit/independent-operation assertions remain.
This new test module includes actual Git processes; the older mock-only module
described above still does not. No SQL, renderer, provider, current-case stability
or new source adoption acceptance follows from that source regression.
