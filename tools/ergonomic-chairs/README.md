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

`export_text_tasks.py` exports factual Gemini inputs in admin priority order. It
does not simulate Gemini authoring. Text import still requires an original
Gemini App / 4 Argon / low conversation, original response and factual review.

The web candidate manifest is separate from the immutable legacy index. It is
currently empty. Every eventual entry requires the exact model and six sealed
proof references; incomplete candidates cannot become active through a token.
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
