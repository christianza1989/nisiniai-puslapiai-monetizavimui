# Whole-corpus calibration execution window

The six-role saved-agent calibration validates the entire sealed corpus before
admission. Its campaign, every offer fact and every evidence item from every
case must expire strictly after the admitted execution deadline. The deadline
is the earliest of the six model authorizations and the owner session, using
the database clock. A timezone-less, elapsed or insufficient window fails with
`agent_role_calibration_window_too_short` before a Task or ModelAttempt exists.
The same check runs during current-authority observation, so queued work cannot
silently reuse a changed or expired seal. Ordinary non-calibration requests
retain their existing authority and campaign rules.

This fixes an observed boundary: four known six-role cases completed, then the
first protected task crossed the campaign/fact expiry before its CLI dispatch.
The original failed stage and its conservatively unknown attempt remain in the
ledger. No usage refund, expired authority extension or evaluation PASS follows
from identifying that cause.

Before a paid stage, also call `validate_execution_window` in its read-only
preflight with the intended full execution deadline. Recheck the sealed
manifest and the current canonical authorities before creating the Root GO.
Do not merely compare expiry with the current moment or selected case.

If synthetic operational timestamps need renewal, preserve the original source
and create a separately sealed version under independent custody. Preserve case
text, splits, personas, expected outcomes, grader, source fact text/references
and original evidence-check timestamps. Explicitly record the allowed timestamp
delta and both raw hashes. This is neither newly verified supplier knowledge
nor a newly unseen corpus. Real business fact renewal requires its own evidence
and approval; the window validator never performs it.

A continuation may execute only the remaining protected cases when actor
instructions, Configs, cases and evaluator are unchanged and previous known
reports are sealed as historical evidence. Declare that limited stage profile,
fresh finite grants/ledger/clock, original conservative charges and exact source
delta. Do not copy historical PASS reports into the new output directory or
claim the complete corpus was rerun on the new source. Hidden case content stays
with the independent custodian/evaluator.

Acceptance is split between offline boundary tests, retained restricted-PG
tests proving zero Task/attempt/provider work on admission failure, and actual
source-pinned model execution. A passing code test is not model calibration or
live mail acceptance.
