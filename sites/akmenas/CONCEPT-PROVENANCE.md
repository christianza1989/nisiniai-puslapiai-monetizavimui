# Concept output evidence

The original build recorded actual CLI key `aea5f86f` and assigned candidate 5 in the conversation and research notes. Its full printed output was not persisted to a file. That limitation is retained; these notes are not an original CLI log.

2026-10-01 reproduction command, from this niche's directory containing PRODUCT.md:

`SKILLS/impeccable/scripts/impeccable.cmd concept-seed --scope direction --from aea5f86f --candidate-count 7`

The actual output is `concept-seed-reproduction-direction.log`: key aea5f86f, mode unscoped, source API, approved pool c3b204a1eed6, assigned index 5. This corroborates the stored assignment against the current catalog, not the original output's full provenance. The replay's challenger set differs from the notes of the initial selection. Initial mode/catalog output was not preserved, so full original-hand reproduction remains unverified. The replay did not change the selected direction or invoke a new design decision.

Two failed evidence-recovery commands are retained separately: `--seed` was not the replay parameter and printed a new random surface key; `--scope world` was invalid. Neither output is an approved concept or a replacement for the original roll. Only the explicitly labelled direction replay above is used as replay evidence.
