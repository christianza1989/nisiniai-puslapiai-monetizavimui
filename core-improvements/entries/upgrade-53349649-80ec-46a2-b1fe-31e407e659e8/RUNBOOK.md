# Operation-scoped raw Git source observations

Exact base da578030f7c9afd5c4dd2d411edfa67e74c77c7b, clean companion
255fea0813bf1aabeaeea2f2de0b29564118f2fc. Own1684 was fast-forwarded to Root's
approved metadata checkpoint only; actual Root/serving checkout stays untouched.
Issue66/comment6231542941 and PR185/comment6231543121 reserve the exact five
shared source paths in record.json. Root keeps live_preview.py, its runtime test,
CUSTOMER_LIVE_PREVIEW.md and journal5c757425; none is changed here.

Root's actual unchanged timing traces established repeated source checks as the
dominant cost:176Git subprocesses/22.4728seconds across capture+inspect, individual
Git0.04-0.19s and native Node0.22-0.48s, outerstudio_timeout26.3614s. These actual
traces and original503 belong to Root. Helper did not run actual DB/process/Node/
preview/provider/current-case acceptance or modify those artifacts.

The new ContextVar operation stores only immutable raw HEAD/status observations
for at most execution+companion. Existing source_current/native_sources/source_pins
read the shared primitive; all expected-revision comparisons and live file SHA
reads remain. Both async Foundation capture and continuation source_pins callsites
are offloaded. Explicit scopes are always fresh, nested helper reads share only
the active operation, and normal exit freshly fences every observed repository.
Dirty/error/path drift invalidates the operation. No failed result is cached.
Cancellation/error resets and closes its shared state; inherited CLOSED readers
never return stale values or repopulate. ContextVar and thread safety are both
covered. No permission/S6/native/proof/filehash cache, TTL/deadline/wire/history
change or automatic operation scope was added to any caller.

Meaningful negative baseline before source implementation:100unchanged existing
source_current calls yielded200mockGit commands; expected4 entry+fresh-exit
commands.1FAIL1.29s, private SHA256
2f777d8e574a30e8d233ffde57f63917a2460aa4e4945318c97abca70f805d2b.
Initial primitive/source/Foundation run50PASS0.51s, one actual-process test
deselected and one existing intentional invalidUUID warning; private SHA256
628211957c671cc4ffef98feb37f6e6f0c61ac4d11ea77e4832e0d088d520036.

Added cancellation-during-final-fence regression first failed1/212PASS8.84s:
CLOSED reader waited on the still-running cancelled Git thread's lock. Kept the
same test and fixed the cause with a shared-phase fast refusal before lock
acquisition, retaining the in-lock and after-raw-read checks. Private failed log
SHA256976dc6183b8b3c9f3d291f3471a9fbbe7996ed51233bd4668a712d0821fffb5a.
No test threshold or expected refusal was weakened.

Final targeted pure/mocked213PASS2.19s,2actual-process tests explicitly deselected,
1existing deliberate invalidUUID serializer warning. Log SHA256
0e07eb953ca7a07df6ca0ab3676923509a74a015fd75925414c64225e3ab0b26.
Tests include19new source-observation cases plus private intake/paired native
continuity/S6 continuation/Foundation/preparation and held-runner inspection.
The directly related existing dirty-source test moves its subprocess mock seam
from Foundation to the shared source reader. It uses a real isolated temporary
directory and asserts both mocked Git commands ran, so the dirty-source refusal
cannot pass merely because the old fictional /public directory is absent.
Original refusal/synthetic-marker assertions remain unchanged.
After that fixture strengthening, the same213checks pass2.31s (same2deselections
and existing warning), final reviewed log SHA256
e8132806394b0e603f93f6b871990fa5eb7bd1bbf271c8196b5161b2c6a74da9.

Root integrates git_source_operation around each full Authority capture/verify,
maps SourceObservationError to503source_unavailable, reviews exact source and
measures real timing/heartbeat/renderer behavior. Root's separate in-flight auth
coalescing cannot reuse a completed result. Source commit, main merge/fetch,
actual QA and serving adoption are separate; no timing/heartbeat acceptance is
claimed from mocked command counts.

Rollback is a scoped source revert before adoption. There is no durable state,
schema or migration to undo. Preserve all Root actual and helper initial failures,
historical hashes/receipts/private data and existing transferred journals. Do not
change source or serving checkouts owned by other sessions.
