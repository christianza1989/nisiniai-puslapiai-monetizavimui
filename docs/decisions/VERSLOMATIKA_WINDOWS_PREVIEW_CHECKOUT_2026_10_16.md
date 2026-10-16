# Windows preview checkout

The real private Wellness preparation at core834df57/public255fea failed before
compilation. Retained Git Trace2 reported `Filename too long` while checking out
tracked migration source below the generated scope directory. The operator's
global `core.longpaths=true` was unavailable in the intentionally restricted
subprocess environment, which omits user profile configuration.

The preview transport sets `-c core.longpaths=true` for each of its Git
invocations, including checkout and subsequent exact source reads. The first
regression found that applying it only to checkout left source reads reporting
the deep files as changed; that failure is retained. This does not import user
credentials/configuration, change global
or repository settings, shorten an evidence identity, or relax any source,
owner, Session, package or storage check. Failed attempts remain preserved.

Regression creates a real detached deep checkout with a tracked file beyond260
characters, an absent global configuration and repository longpaths explicitly
false, verifies file bytes/current source, then proves local config stayed false.
Existing guardian/source/environment/admission tests remain applicable. This is
checkout transport correctness; full visual, language, inquiry, measurement and
launch acceptance remain separate.

Actual adoption of83d9de4 preserved88tables/222native files and all11approved page
bytes; normal owner current-source intake/S6 succeeded. The generated site
compiled. Retained retry identified a separate storage mismatch: Wrangler emits
`queues:{producers:[],consumers:[]}` with no queue bindings, while the validator
rejected any nonempty container. Separate upgradeadac5aa7 permits only known
empty arrays; actual queues, unknown keys, null and arrays remain refused.
The original compiled config SHA2678f2ac75bc329d53d1f128d0e7607443a2e8746e074ad4986051fbbf208c92
reproduces refusal under83d and passes the corrected validator without edits.
Updated guardian/storage/preparation regression26PASS18.45s. Actual guarded
serve, inquiry and retention remain required; no Foundation certification follows.
