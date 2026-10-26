# KSOO004 preview transport, owner065/066

The original KSOO004 runtime is42,127,248 bytes. Existing v1 assignment packing
produces23,705,904 bytes, exceeding the unchanged15,000,000-byte per-file limit.
The owner authorized a preview-only transport change on2026-10-26. Message066
requires exact dictionary/repeated-table packing first and permits one file when
it fits; multipart loading is needed only if that first step still exceeds15MB.

`runtime-tables.mjs` interns equal JSON subtrees in bottom-up tables, retaining
every field/value, array position, property, state/transition ID, FINISH value,
default and geometry reference. References point strictly backward; invalid
tags/references, cycles, duplicate object keys, unknown metadata and excessive
depth/counts fail closed. Negative zero is retained. No geometry bytes change.
Decoded equal objects share immutable references, avoiding repeated RSC objects.

The real pilot transport is2,350,399 bytes (20,387 table nodes), SHA-256
`cdf2fe7d1df963d66676d29361ecba977e3779e51303344f925b269184b70921`.
It reconstructs the entire original exactly. The actual loader/current engine,
independent transport checker and unchanged literal checker passed all3,888
states and54,432 transitions, tokens, original initial state, supplier options,
162 original GLB hashes and2D/4D/NONE armrest semantics. The source-based browser
plan covers23 option pairs in15 cases per viewport. These checks are distinct
from subsequent actual browser/PDF/public acceptance.

Only an explicit `runtime.encoding: "tables-v1"` on the KSOO004WW002
`TECHNICAL_DRAFT` candidate admits this format. Content-addressed paths, full
transport SHA verification, exact active product/sample identity, construction
class restrictions,15MB/25MiB limits and Launch exclusion remain enforced.
All other candidates retain their existing literal/v1 transport. The stager
requires `--transport=tables-v1 --jobs=b0a056b34baba0ae911994b2`; it does not
automatically convert other large models. No Native, frozen compiler, OBX,
session, queue, grant or supplier capture implementation changes are involved.

Rollback: revert this scoped source/data change to its reviewed preview base;
retain the content-addressed historical assets and all source/proof originals.
Do not deploy a stale earlier KINT006 build over a newer KSOO004 preview.

Coordination: issue269; branch `codex/ergonomic-ksoo004-transport-20261026`.
Private operational evidence is under
`D:/Core/output/ergonomic-ksoo004-transport-owner065-20261026T0531`.
