# Independent wire ownership after a wall-clock rollback

KINT005WW001's original ordered checkpoint chain contains an insertion,
getArticleData, then getAllChoiceLists for the same item. During the last
request the recorded wall time moved backwards8.127153s, while monotonic
request duration was0.0469898s. Sorting receipt completion timestamps puts
the choice-list request before its insertion and raises UNOWNED_SOURCE_ITEM.
The clock adjustment's cause is unknown. This is a verifier ordering defect,
not evidence of a geometry criterion failure.

The existing raw SHA, URL, service/session, original article/series/variant,
snapshot, construction setter, edge, geometry and closure checks remain.
Chronologically unowned requests additionally require a matching verified
insertion earlier in an original observation's sourceWireProof sequence.
The same check rejects foreign items, later/missing causal insertions,
unobserved ambiguous tails and raw tampering. It never rewrites original
timestamps, source data or prior sealed PASS rows.

Validation: all100 chair Python tests pass, including six chronology and
negative ownership regressions and existing raw/geometry/memory tests.
Source delivery is separate from a full affected900-state/12600-edge model
pilot, preserved prior sealed proofs, guarded immutable worker adoption,
continuous scheduler renewal, technical preview and human acceptance.
No compiler, Native, geometry/runtime criteria or transport caps change.
