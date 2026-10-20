# Chair construction capture

This is the Ergonomic business adapter around the existing EAIWS SOAP transport
and existing catalogue engine. It does not replace either engine or create a
supplier session. The active task authority is
`D:/Core/output/ergonomic-chairs-structure-20261017/STATE.json`.

Only the 259 active non-Xilium original variants enter the queue. Eleven active
Xilium cards remain unchanged; two missing-source chairs are explicitly reported.
No FINISHES setters are allowed, but real implicit finish changes participate in
state identity. Missing finite DIMENSIONS domains are reported, never sampled.

`run_chairs.py` uses a frozen build, a single Windows Native ownership lock and
matching worker identity/grant/release. Existing OBX bytes are pinned. Each real
HTTP exchange has private request/URL/response bytes and a receipt before parsing.
Unknown mutations are not replayed. Graph budgets preserve the checkpoint; a
growing graph is continued up to ten chunks per visit and then deferred.

`verify_structure_wire.py` reparses original responses independently of the
transport/parser. `prepare_closed.py` runs the complete original-GLB compiler
and the actual catalogue runtime checker in a separate, finite offline queue.
It never starts Native, authors text, approves a model or publishes anything.
Unchanged offline results can be reused only with matching source/tool/artifact
hashes. Failed checks preserve their logs and do not stop independent models.
The cached compiler hashes every complete input buffer before lookup and runs
the unchanged full geometry/PBR inspection once per distinct SHA-256. Byte
changes and truncation cannot reuse a prior inspection. Rebuilding archives
previous proof files; tool drift prevents a PASS. This changes inspection cost,
not source capture, geometry bytes, graph coverage or acceptance requirements.

`export_text_tasks.py` exports factual Gemini inputs in admin priority order. It
does not simulate Gemini authoring. Text import still requires an original
Gemini App / 4 Argon / low conversation, original response and factual review.

The web candidate manifest is separate from the immutable legacy index. It is
initially empty. The owner's later instruction permits TECHNICAL_DRAFT entries
after full sealed source/geometry/runtime PASS, before Gemini descriptions.
These entries load on draft only and cannot pass review, approve or release.
DRAFT_READY still requires the exact model and all six sealed proof references.
Incomplete source graphs cannot become active through a token.
Legacy saved tokens fall back to their own loader, and Xilium is excluded.
Launch release still requires the owner's exact-revision review and Approve.

Local technical QA is explicitly restricted to development plus private env
flags. It serves only checksum-verified assets named in a private manifest,
binds localhost, and cannot expose files when NODE_ENV is production. HTTP/SSR
checks do not count as actual desktop/mobile browser acceptance.

Run checks from the Core worktree, after the paired canonical freshness gate:

```
python -B -m unittest discover -s tools/ergonomic-chairs -p test_*.py
python -B tools/ergonomic-chairs/status_chairs.py
python -B tools/ergonomic-chairs/save_progress.py
```

Do not restart a capture because an old PID vanished. Check the current worker,
global ownership, checkpoint and unknown-outcome receipts first. Do not edit
live frozen builds or start the deliberately drained nonchair lane without a
reviewed compatible second-slot implementation.

## Source payload storage

New frozen captures use `immutable_payloads.py` for large, immutable HTTP
payloads and completed geometry downloads. Every distinct payload is stored by
its complete SHA-256; ordinary source paths are hardlinks to those bytes.
The original wire bodies, URLs, filenames, source JSON, geometry/PBR and
verification inputs remain available. Checkpoints and receipts stay independent
mutable files. Small payloads stay separate; large objects roll over before
900 hardlinks, below the observed NTFS limit. Existing objects are fully hashed
before reuse, and changed downloads or objects stop capture.

This affects physical storage only. It does not remove requests, graph states,
transitions, source evidence or quality gates. Existing frozen builds are not
edited; adopt a new build only at a verified safe boundary with a finite pilot.
Cold source directories may be moved to the owner's external archive only
after full copy/hash and old-path junction readback verification. Markdown
documents locate and explain the data; they do not replace 3D or wire bytes.

The independent wire verifier streams complete response and geometry hashes.
Its receipt index keeps metadata and response paths rather than retaining all
binary replies in RAM. Graph state keeps only the original identity/domain
fields; complete snapshots are still hashed and raw source descriptions,
geometry origins, session/item ownership and construction setters are checked.
This avoids model-sized memory growth without skipping any byte/readback gate.
Adopt a new offline freeze only at a safe boundary, with tamper/memory tests,
old/new real-source parity and a complete affected-model proof.

When adopting an equivalent verifier, an optional freeze-pinned certificate
can preserve exact prior sealed rows under their original tool fingerprints.
It lists complete row hashes and both exact tool sets. Changed rows, current
compiler dependencies, checkpoints or prepared artifact hashes cannot use it;
new/unlisted models must pass the current independent verification chain.

## Offline scheduling boundary

`watch_closed.py` is a separate outer scheduler around an explicitly pinned,
immutable `prepare_closed.py` worker. It changes when that same finite worker
runs, not its source/tool/artifact hashes, raw-wire verification, compiler,
geometry/PBR or runtime checks. A startup full audit is mandatory. New closed
jobs, missing/changed input metadata and unresolved rows wake another full
invocation on the next poll (at most 20 seconds after the previous child).
Unchanged inputs receive a full audit at most 900 seconds after the last child
returned; a long child finishes before the next invocation. The periodic audit
also covers content changes that preserve file metadata.

Metadata polling never creates or revalidates a PASS. Idle status explicitly
reports zero new proofs. The snapshot from before the child is retained so an
input mutation during verification forces a confirming invocation. Pin drift
and a failed subprocess stop the watcher; neither becomes a model failure or a
successful audit. One renewal lock is held for the outer lifetime, preventing
concurrent schedulers and the legacy renewal helper from duplicating work.
An explicit stop request or owner STOP is honored between finite invocations.

Adopt scheduling changes only after an isolated full affected-model proof,
actual child/outer identities, successful idle polls, exact frozen worker and
compiler parity, and the normal source/pins/session/reserve gates. Keep the
prior accepted watcher for rollback, but never start it while a candidate
watcher or its verifier/compiler children are alive. Scheduler efficiency is
distinct from total Native throughput and completed configurator count.

## Diagnosed offline command timeouts

The default compiler and runtime execution limits remain 1800 seconds. After a
recorded execution timeout, a new immutable finite worker may explicitly use
`--compiler-timeout-seconds 7200` (bounded to 1800–7200 seconds). This permits the
same complete compiler to finish; it is not a speed improvement or a change to
geometry/PBR/runtime correctness criteria. Each command records a flushed start,
real exit or timeout, elapsed time and its budget. Nonzero exit and timeout still
produce REVIEW, and exit zero alone still cannot produce PASS.

An isolated affected-model run can select `--only-job JOB`. The job must already
be in the real completed-source queue; partial or unknown jobs are rejected.
Other prior sealed rows remain in the ledger. A freeze-pinned schema-2
preservation certificate can list exact row hashes and their individual original
tool sets across earlier generations. Current tools, checkpoint and every
prepared artifact are still checked before reuse; unlisted or modified rows
cannot borrow a prior PASS. Adoption requires the actual full affected-model
wire, geometry/PBR and runtime proof at an exclusive offline boundary, all pins,
same session/inventory/reserve and preservation of prior published drafts.

## Owner-directed completion mode

`run_chairs.py --finish-started` preserves explicit admin model priorities, then resumes saved unfinished graphs before unknown work, choosing the smallest currently observed missing-edge frontier within that tier. It persists `completionFocus` across restarts so discovery of more states does not redirect the lane. Finite 900 s / 120 new states / 800 new edges portions continue the same model even after ten portions; only a real closed graph with no stop reason enters completedSource. Owner pause, reserve, grant, unknown mutation and review gates retain their original outcomes. The legacy mode still defers after ten growing portions. Partial progress, frontier size and exit0 never imply offline/full acceptance or a whole-task ETA. Adopt only after an actual finite full-SHA/identity pilot and source/session/pin/reserve/poststart gates.
