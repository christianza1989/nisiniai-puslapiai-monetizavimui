# Live inspection and its owned authorization

Actual source11f2 reached ready and returned native HTTP200, then failed its
three-second heartbeat during after_media. Chrome subsequently received
connection refused. This is not stable ready/close acceptance. The first receipt,
lease61ad29b0-96c5-4ca5-ba87-c8663ba1bf8d and prior failures remain preserved.

`Service.project` called the maintained native inspection, whose callbacks ran
full independent Authority verification alongside the producer's lease check.
A gated test executing real project/inspect with only a fake native leaf reproduced
two competing observations. Baseline1FAIL4.06s, SHA256
`1a67b5be80c0239881761f3e352ee3479b45abca00eccb7a873479954b9d8a04`.

The inspection now selects only a unique live in-memory lease with a nonempty
identical bearer token and equal complete FoundationScope. The lease must have
an unfinished task, active state and current lifetime. Standalone, foreign token,
different scope, ambiguous matches, missing token, completed task and inactive
state retain independent canonical verification. Selection is call-local: after
selection, closure/expiry fails closed rather than choosing another authority.
Tokens remain in existing server memory and are not written to evidence.

The internal canonical lease verifier preserves its existing task selection,
shield, cancellation, current-before/current-after and pulse order. It stops on
the original ControlError and rethrows that same object; the producer-facing
boolean wrapper catches it as before. Inspection preserves native401/404/409/503
at callback and final checkpoints, and rejects false at both checkpoints.

Only an unfinished observation of that exact lease is shared. A finished task
never authorizes another invocation. The explicit post-output fence additionally
drains any observation already running at its entry, then requires an observation
started after output. A first implementation missed this stronger boundary:
old last read → output → actor change → old task completion incorrectly passed.
Its gated1FAIL1.70s is retained, SHA256
`01600d0497d7108206aa931978aebaa8418e6774ecb63e08e03ec4108f0aad58`.
After repair, final verification remains serial and rejects that mutation.

Native inspection, source exit fences, three-second heartbeat, server lifetime,
deadlines, models, roles, schemas and cleanup ownership are unchanged. The initial
availability capture remains an independent full observation. This patch does
not claim all active availability work is coalesced, or guarantee stability under
unbounded database/event-loop delay. Actual ready/hold/close, expiry, revocation,
lifespan and browser checks remain required before accepting the runtime feature.

Focused bindings, typed refusals, fresh final barrier, lease protocol and cadence
checks passed78 cases in7.45s before two additional close-mid-check cases. A full
run then passed495 cases with one inert-child0.25s timeout test failing to reach
its final stage; the studio transport was unchanged. That exact test passed
unchanged on one rerun in0.41s. Both results remain recorded separately; this is
not a claim of a single496-pass run. The known deliberate invalid-UUID warning
and two explicit exclusions remain separate from runtime acceptance.
