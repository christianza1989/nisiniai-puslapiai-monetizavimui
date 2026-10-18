# Calibration CLI transport diagnostics

`CodexLab` reuses `tasks.codex.arguments`, its fixed no-tools configuration and
`tasks.codex_transport.execute`. It does not own another process executor.
An explicit model/reasoning selection remains explicit; unspecified legacy
selections still use CLI defaults. The child receives the maintained environment
allowlist, without runtime database secrets or an API-key fallback.

The fixed authenticated provider alias has zero request and stream retries.
`BudgetedLab` also refuses an outer automatic timeout retry. Legacy callers that
explicitly request the old one-retry option remain separate from bounded
acquisition budgets; their failed-attempt usage is retained accurately.

## Private evidence

Each artifact attempt has an exclusive numbered directory. Existing directories,
symlink parents and Windows junction parents are refused before dispatch. Prompt,
schema, output and raw logs stay in that private directory, outside Git. Without
an artifact root, the same transport uses a temporary directory and removes it
after the attempt.

- `request.json` records the requested model, effort and timeout, not a claim of
  provider-confirmed model identity.
- `stdout.jsonl` is appended as bounded chunks arrive. `stderr.txt` retains
  bounded private diagnostics even if the process never exits naturally.
- `observation.json` records the actual process ID, stream and stdin timing,
  process exit, pre-cleanup liveness, output-file metadata and cleanup outcome.
  It contains no prompt or output body. `process.json` identifies transport,
  schema path and start time; use the observation for the actual PID.
- `failure.json` and `exit.json` are optional diagnostic summaries. A failure
  writing them cannot replace the actual timeout, cancellation or tool refusal.

Terminal usage received before a pipe/EOF hang survives timeout or cancellation.
It remains attached to a failed, charged attempt. A partial output file and a
usage receipt never turn an incomplete attempt into a successful answer. Without
valid terminal token counters, usage stays unknown; no refund, token estimate or
USD cost is inferred. Schema refusals retain their controlled error classification
in both artifact and temporary modes.

## Recovery and applicability

Inspect the retained observation and exact owned process before any cleanup.
Keep the original failed directory and durable budget. Do not rename the run,
reset counters, extend an old absolute deadline or repeat a whole paid suite
merely to obtain missing logs. Admit a new finite diagnostic operation with a
fresh source snapshot when necessary. A re-evaluation of an exposed known
transcript is a linked diagnostic result, never a rewritten original PASS or a
protected unseen case.

The observation change addresses calibration infrastructure. It does not change
the evaluator, protected cases, business facts, six saved agent configurations,
native Task authority, campaign permissions, mail transport or production
activation. Actual model acceptance remains a separate gate.

Regression: the committed predecessor fails fixed zero-provider-retry and
terminal-usage-on-timeout checks using inert Python children. The replacement
passes those checks and adjacent transport, cancellation, schema, bounded-budget
and diagnostics regressions. No model, provider, customer or database is used by
those checks. Private live evaluator timeouts are retained as incomplete results.
