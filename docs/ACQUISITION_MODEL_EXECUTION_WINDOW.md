# Bounded native business-role execution

`PINET_ACQUISITION_MODEL_RUNNER_SECONDS` remains 90 seconds by default. An
operator may explicitly configure 10–300 seconds for the existing fixed native
High model. Settings and executable readiness share the same upper bound.
This accommodates a longer reasoning response without requiring a second
dispatch after an arbitrary 120-second interruption.

The per-call setting is a ceiling, not a grant. The adapter clips it to the
existing absolute execution deadline and recomputes remaining time after its
final source/hash/authority preflight. The shared transport checks the live
heartbeat throughout execution and terminates the owned process on timeout or
revocation. Owner/session/team/task deadlines, attempt limits, quota accounting,
model, output validation and independent quality review remain unchanged.
There is no automatic retry. A timeout with no terminal usage receipt remains
a charged unknown; a longer future configuration cannot erase or refund it.

The observed known-smoke failure reached all six roles: the first five native
outputs and initial exact-copy review succeeded, then the reply call ended with
`run_timeout` at 120 seconds. Seven calls including the persona were charged,
one with unknown usage. The incomplete case, original ledger and all stop
receipts are retained. This is transport failure, not a failed business-copy
grade or evidence of successful full calibration.

Regression uses inert dispatches: explicit configuration/readiness bounds,
unchanged default, a longer permitted call, a shorter absolute deadline, expiry
during preflight and single-dispatch timeout accounting. These checks grant no
provider, campaign, Gmail or production activation. A new source-pinned native
run with its own finite admission is required to establish actual acceptance.
