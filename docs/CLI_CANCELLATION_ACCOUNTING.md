# Usage observed before CLI cancellation

The shared `tasks.codex_transport.execute` may receive a complete bounded
`turn.completed` usage line before the child process exits or closes its pipes.
External cancellation in that interval must retain already known accounting.
Cancellation is still propagated as the original `asyncio.CancelledError`, with
the caller's cancellation arguments and the existing owned process/task cleanup.
It never returns a successful output or starts a retry.

The exception's `.receipt` uses the same `observed_receipt()` path already used
for timeout and execution failures. It parses only retained complete bounded
stdout lines using the adapter's maintained parser. An adapter's explicit
`partial_receipt` callback retains its existing opt-in shape. No raw stdout,
message, stderr, prompt or output content is added by the transport. With the
default consultation parser, unknown usage remains an empty receipt; opt-in
non-token metadata does not imply known usage. Explicit known zero remains zero. The transport
does not change an adapter's token whitelist or its receipt format.

A usage event is accounting evidence, not authority to publish the output.
Even an already present valid output file does not make a cancelled operation
successful. Callers must consume `getattr(error, "receipt", None)` in their failed
or interrupted accounting path and rethrow cancellation; the receipt grants no
retry, output publication, provider, mail or business effect permission.
This change does not alter worker/model settlement, database schema, configured
execution identity or any historical reservation or closed ledger.

`offline_tests/test_cli_cancelled_receipts.py` reproduces this timing with an
inert local Python child that emits complete JSON usage and holds its pipes
open. Tests wait until the parent has observed the lines, cancel the execution,
and assert process termination, drained/cancelled owned tasks, cancellation
identity, sanitized known receipt and private diagnostic outcome. Additional
cases cover unknown/invalid usage, explicit zero/bounds, parser failure with a
known receipt and the opt-in pipeline format. No Codex executable, model,
network, database, provider or live channel is involved.
