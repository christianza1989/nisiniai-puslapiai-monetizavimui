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
schema, output and raw logs stay in that private directory, outside Git. The CLI
always runs in a short exclusive temporary workspace with owned cleanup. This
avoids the reproduced Windows267 failure when a valid durable
audit directory has a319-character path. No model was reached in that failure;
the original failed reservation and unknown usage are retained.

The same bounded executor explicitly validates the separate durable diagnostic
directory: absolute, existing, no symlink/junction ancestors, every supplied log
directly inside it, and output inside the execution workspace. Other adapters
retain the default cwd-only diagnostic boundary. An opt-in audit never widens
model tools, environment or file access. Without an artifact root, diagnostics
remain temporary as before.

- `request.json` records the requested model, effort and timeout, not a claim of
  provider-confirmed model identity.
- `stdout.jsonl` is appended as bounded chunks arrive. `stderr.txt` retains
  bounded private diagnostics even if the process never exits naturally.
- `observation.json` records the actual process ID, stream and stdin timing,
  process exit, pre-cleanup liveness, output-file metadata and cleanup outcome.
  It contains no prompt or output body. `process.json` identifies transport,
  schema path and start time; use the observation for the actual PID.
- `process.json` also identifies the temporary execution directory. Durable
  stdout, stderr and observation remain live while the child runs. Raw output is
  retained before temporary cleanup, including on timeout or cancellation;
  oversized output is kept only as a bounded `result.partial.json` prefix with
  explicit retention metadata. It remains a failed result, never an answer.
- A prelaunch OS failure records only its exception class and numeric errno /
  winerror in the observation, never the exception message, argv or environment.
- `workspace-cleanup.json` separately records temporary-directory cleanup. A
  locked Windows file is recorded as `completed:false` with its error class;
  it cannot overwrite the CLI timeout, cancellation, usage or validated result.
  Process cleanup and storage cleanup are distinct outcomes.
- `failure.json` and `exit.json` are optional diagnostic summaries. A failure
  writing them cannot replace the actual timeout, cancellation or tool refusal.

Terminal usage received before a pipe/EOF hang survives timeout or cancellation.
It remains attached to a failed, charged attempt. A partial output file and a
usage receipt never turn an incomplete attempt into a successful answer. Without
valid terminal token counters, usage stays unknown; no refund, token estimate or
USD cost is inferred. Schema refusals retain their controlled error classification
in both artifact and temporary modes.

## Recovery and applicability

The generic Task ownership lease remains15seconds. Source-fixed acquisition
model preparation, reply and six-role handlers use a60-second ownership lease
at claim, heartbeat and role settlement, clamped to the current authority
deadline. The same fresh source, owner, Config, module and SQL checks still run.
An already expired lease or changed run is rejected before renewal. This bounded
profile allows native proof/settlement waits that exceeded15seconds in an actual
known-usage run; it does not extend a model timeout, authorization or Root GO.
Crash recovery for those model kinds may consequently wait up to60seconds.

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
