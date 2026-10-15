# Bounded complete source groups

`xbot.source_facts.project(pages, canonical_host=...)` is the single projector for new PG Xbot admissions and every current-source recheck. It returns exact `facts`, a typed `source_fact_manifest` (`xbot.source-facts.v1`) and its separately pinned `source_fact_manifest_sha256`. Inputs are the maintained complete nonrevoked public projection, never private intake or a search snippet.

Pages are ordered by unique page ID. Text is split into contiguous1800Unicode-code-point pieces without trimming, normalization, rewriting, summarization or dropped characters. Joining each group must reconstruct the full original text and UTF8 SHA256. Each group retains page ID/title/canonical URL, original revision/projection hashes, original text length/hash and all fact indices. Each fragment retains index, page ID, part/parts, exact code-point start/end and UTF8 text SHA256. Metadata and ordered spans/hashes are validated before use. Code-point offsets are not UTF16 or byte offsets.

Existing bounds remain35facts/1800characters and10citation indices. One page needing11pieces, a projection exceeding35pieces, empty/invalid pages or foreign URL produces an explicit blocker. No page is silently selected or discarded to fit. The root-reported approved source lengths4126/1656/3099 reconstruct into3+1+2pieces. Its authorized historical private snapshot is tested only as a pure reconstruction fixture; it has no current authority/admission proof and its text stays out of Git.

`facts_sha256` always uses maintained `xbot.store.fingerprint(exact facts list)` (sorted JSON with its existing serialization). Manifest SHA uses compact sorted UTF8 JSON of the separately versioned manifest. Full-page/fragment text SHA hashes raw UTF8 text. These hashes are not interchangeable. Both manifest and exact facts are recomputed from the current locked public projection; a matching facts hash alone cannot hide changed provenance.

## Generation and acceptance

The maintained Agent sends the same full ordered facts and source-group/provenance maps to both draft and independent reviewer. No duplicate full text or invented summary is added. Instructions require reading a source group as a complete source, preserving conditions/negations/qualifiers. A factual citation must include every index of any referenced group, within the unchanged10index limit. Partial groups, duplicate/out-of-range/noninteger indices fail. Empty indices support only a question without a fabricated fact.

The library validates complete-group citations before recording a new grouped draft, and again when a reviewed draft is used for a write. PG local proposal acceptance independently validates groups, completed state, model-review approval, unsupported claims, text/URL rules and verified usage. Full-group citation is structural evidence, not proof that a claim is truthful; semantic review/model usefulness still needs separate calibration. A reviewer veto is not overridden by a complete citation.

## Compatibility and ownership

Library `Profile.source_fact_manifest` and `Binding.source_fact_manifest_sha256` are additive optional fields. When absent, serializers omit them so legacy hydration does not append null fields to `model_dump()` or its material hash. Fixed synthetic prepatch29ca serialized/persisted Profile/Binding witnesses check exact shape/bytes/hash plus read/replay without writes. Existing legacy flat facts remain readable; they are not silently converted. The initial witness fixture errors and original failure evidence are retained privately and documented in QA.

New PG admissions require the manifest and its exact binding digest. No existing PG Profile/admission/receipt/history is overwritten or re-admitted. Module code/instruction changes invalidate old execution source; a new explicit admission is required. Reads do not renew deadlines, source freshness or grants. No SQL/schema/permissions/API/UI/public changes are included.

Root owns the actual caller/dashboard/operational adoption. This increment is a synthetic-local projection/acceptance bridge with fake providers; it enables no model/calibration/live X activity. See [QA](QA-SOURCE-FACTS.md) and [PG bridge](PG_BRIDGE.md).
