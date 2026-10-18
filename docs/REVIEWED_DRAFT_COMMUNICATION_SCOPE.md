# Reviewed draft and future communication are separate

Copy review validates the exact proposed text. It does not authorize unrelated
future outreach. Every new private reviewed capture leaves the recipient's
marketing state held, with reason `initial_reviewed_capture_no_marketing`.
An existing active state is contained as part of the new capture; a prior hold
or stop continues to prevent a new initial capture. Authenticated inbound and
the existing reviewed requested-reply path can continue the specific exchange
while marketing remains held. No real send or scheduler is enabled here.

The first protected six-role exchange exposed the old deterministic capture
effect creating an active recipient state after its prose review. Both typed
reviews approved their copies, but the end-to-end grader rejected that state
widening. The defect belongs to the effect boundary rather than a model fact
or translation error. The original FAIL, all calls and grader remain intact;
the exposed case is regression evidence and the other held cases stay separate.

Canonical completion uses an exact receipt/thread/policy predicate to finish
the same atomic capture after it has set the hold. The scope, request ID,
recipient, complete campaign/prospect, initial thread revision, absent inbound,
hold reason and matching creation/update timestamps must all match. A caller
cannot pass a boolean to bypass containment. This exception does not let a new
Task or another campaign reuse the recipient. Changing the policy or receiving
a later message invalidates it. A final-fence failure rolls the effects back
with the Task while retaining observed model accounting.

The private `.eml` lab annotation defaults to `reviewed_draft`. Its former
`marketing` default did not prove an external send or describe every message's
purpose. Explicit privacy-information captures retain their distinct annotation.
This changes evidence accuracy, not the protected cases, actor instructions,
evaluator or quality thresholds. A new source-pinned model run is still required.

The transport gateway independently requires an exact current-owner plan,
recipient/contact basis, source/expiry pins and durable single send intent.
Draft quality and this internal hold do not substitute for that authority.
