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
