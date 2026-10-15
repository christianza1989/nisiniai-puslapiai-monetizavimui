# Model-only primary-source projection

2026-10-15. Upgrade `upgrade-9b6d7ee6-3877-44cc-8cc7-6a6da2293702`.
Issue66/comment6189151161; owned branch
`codex/verslomatika-discovery-source-projection-20261015`, exact base
`c1b3a72373b3adc5a881d9c65167180bdf90b1ae`. New managed checkout preserves the
completed S28 branch. Paired start09:39Z: main808581d9/publicec8a9c03 and
read-only companion1a26f289 PASS.

## Observed problem and scope

Root retained the real S29 attempt: original customer brief, new sourcec1b,
creator prompt139435B/context104932B, six unique web calls, last trace153.2103s,
timeout408.6575s/CLI409.172013s and no new report/output. The job captured13 pages;
UI14 observations was cumulative across attempts. Root's old report1/source0f
is preserved. These are Root's actual reported observations; prompt size alone
does not establish the sole cause of the timeout or prove that compaction will
make a future paid attempt succeed.

Before implementation, three inert adapter tests reproduced full serialization
for creator/critic/coordinator: **3FAIL2.20s**, each sending the same synthetic
96408B primary-source block. No provider or operational case was invoked.

Only `business_discovery/adapter.py` and new `source_projection.py` change shared
source. Full original captures, job usage, source snapshots and the S28
sourceContext bridge remain intact. Only the `primary_sources` value in the
derived model context is replaced. Customer messages, history, decisions,
candidate/reply and reviews retain their exact values and ordering; the existing
whole-prompt262144B limit still rejects oversized context without clipping them.
No worker/service/wire/source_context/DB/model/profile/quota/deadline or serving
configuration changes are made.

## Bounded contract and provenance

The deterministic `discovery-model-sources.v1` projection is at most28000 bytes
of the **actual model JSON serialization**, including UTF8, spacing and escaped
characters. It reserves6144B for omitted-page and reader-remaining URL metadata.
Up to24 whole page entries receive320-to1200B UTF8 prefix excerpts, with equal
allowances prioritizing breadth. A final partial code point is dropped safely;
actual byte/character counts and omitted bytes are recorded. Whole entries that
do not fit are omitted with explicit coverage counts. At most eight omitted
page metadata entries and eight exact reader-remaining URLs fit within the
shared metadata reserve; unshown metadata/URL counts remain visible.

Canonical S28 capture validation is reused before projection. Observed URL,
status, timestamp, title, HTTP/response metadata, original body/text SHA and
captured-text length are preserved. `projected_text_sha256` identifies only the
displayed excerpt. `reader_text_may_be_clipped` conservatively marks original
9000-code-point reader excerpts; `text_clipped` and omitted UTF8 bytes describe
the additional model projection. Unavailable/error entries remain unavailable,
and remaining URLs and link targets are not promoted to observed reads.
`reader_reported_complete` only reflects the original reader queue. Independent
fact/rights verification remains UNVERIFIED, with no full-page/catalogue claim.

At most three real links per included page are selected across pages. Exact
included page URLs seed a represented-target set; each round prefers actual
unrepresented targets in original per-page order, without URL normalization,
business keywords, guessed paths or extra queries. Duplicates and represented
navigation consume no link slots. Captured/included/omitted link counts remain
explicit. An intermediate real-data review found17 shown link occurrences but
only two unique URLs, thirteen occurrences already represented as pages and
only one new target; that witness was preserved and led to this generic repair.

All three roles use the same pure projection. Their instruction pins and job
fingerprint include its version, byte/count/link policy, implementation-file SHA
and canonical capture-validator-file SHA. A pinned directive treats external
instructions/claims as untrusted data. Private adapter receipts retain full
capture SHA, projected SHA, original/projected source bytes and unprojected
context bytes, including when an injected transport reports failure. No full prompt/capture
or source text is added to Git.

## Actual private measurement

Root explicitly supplied its read-only private S29 source_reads extraction.
Its normalized full-capture SHA is
`ac38efb06c9bcefc2afb20f4ca4fad85a984054a4baf9e7985e909831da2526a`.
Only aggregate metrics/hashes are recorded here; raw/derived source text stays
in ignored runtime artifacts. The original extraction's bytes were checked
unchanged after measurement.

- Actual primary block: **95920B ->22374B** (76.7% smaller), all13 pages retained.
- Five reader-clipped pages remain flagged; eleven excerpts are additionally
  clipped. Excerpts are at most640B in this fixture, with short605/399B excerpts
  intact and one639B UTF8 boundary.
- 360 captured links ->37 displayed, all37 unique targets not already represented
  as pages;323 omissions explicit.35 reader-remaining URLs ->8 displayed/27 omitted.
- Projection SHA:
  `7dcc3df47977ee112ab68de47912294ee902c2c987ce156f23370076122142eb`.
- Substituting only this value and the new directive into Root's reported byte
  totals gives context31386B and whole prompt approximately66538B. This is a
  same-other-fields byte derivation, **not a new paid execution trace**.

## Actual regression and delivery boundaries

Focused projection/Discovery/research-first/S28 suite:93PASS2.93s, then
94PASS2.49s after the navigation regression. Final source/receipt/path changes
are covered by the final Creation/Discovery-only cohort:
**583PASS7SKIP22.35s**, including all27 new projection cases; counts are not
additive. Its command selects `test_creation*.py` and `*discovery*.py` with `rg
--files`, then `python -B -m pytest -p no:cacheprovider <selected files> -q` with
`PINET_CREATION_LANGUAGE_REVIEW_ENABLED=true`. This is a test-process setting;
the held operational pilot setting is not changed. Skipped cases are not PASS.
Ruff for the two owned sources/new test module and `git diff --check`: PASS.

Tests exercise all three real adapter paths with inert execute, Unicode and
JSON escaping, whole-entry/metadata caps, exact hashes/dates/URLs, legal raw
apostrophe/Unicode paths, unsafe capture refusal, duplicate navigation,
immutability, instruction/job pins, unchanged large-customer rejection and
failure accounting. No unrelated Node/PG/full-platform test is invoked; S28's
earlier native proof is not re-counted as this packet's execution.

Root owns the later frozen integration, clean restart and ordinary-UI paid rerun.
Root's separate S29 raw-apostrophe fix and avatar/hero assets are outside this
scope. A local projection/test PASS is not actual model completion, plan quality,
case/report acceptance, admission, deployment or main merge. Rollback reverts
only the adapter/projection change and preserves historical full capture/usage.
