# Lossless checkpoint encoding

Chair capture replaces its complete checkpoint after each measured transition. A preserved 1,728-state / 10,566-edge checkpoint occupies 12,536,086 bytes with indentation. An alternating comparison of twelve durable writes per encoding on the same input measured median 0.332237 s for the accepted v6 encoding and 0.130664 s for compact JSON (10,209,351 bytes). Every written file was parsed and compared with the complete input. These are local checkpoint-write measurements, not an end-to-end speedup claim.

Only checkpoint persistence opts into compact JSON. Default metadata encoding, all fields, sorted keys, Unicode handling, atomic replacement, flush and fsync after every write remain unchanged. Capture results report actual checkpoint write count, bytes and elapsed time. Raw exchanges, state metadata, observations, geometry, closure computation, restoration, scheduling, session and limits are unchanged.

Regression tests cover complete JSON equivalence, unchanged default bytes, fsync before replacement, and preservation of the previous checkpoint when fsync fails. A separate immutable candidate must complete a real finite capture with independent full-file SHA, original-prefix, source-wire and geometry identity verification before adoption. Passing unit tests or a write benchmark alone does not authorize adoption. Accepted frozen v3/v5/v6 and offline/compiler dependencies remain immutable.

Private measurement and execution receipts are under the task output performance directory; no session, raw source or geometry is committed. Rollback uses the preserved accepted immutable runtime-v6 with the same checkpoint; compact JSON is readable by its existing JSON reader. Full graph/model acceptance and preview publication are separate gates.
