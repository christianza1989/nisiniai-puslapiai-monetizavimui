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
