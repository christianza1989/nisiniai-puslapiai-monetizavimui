# Contextual links across the owner's sites

Read for every plan and draft. `siteData.networkCatalog` contains registered pages, including private/future pages. It is inventory, not evidence that a domain or page is publicly deployed. Never invent a target ID or URL.

Start from the reader's next question. Link only when another page answers a concrete adjacent question better than repeating it. Shared ownership is not relevance. Return an empty `networkLinks` array when nothing helps. Never create all-to-all networks, reciprocal obligations, exact-match anchor schedules or backlink counts for rankings. Operator footer attribution is separate.

Each proposal has `targetSiteId`, `targetPageId`, a natural `label`, and a `reason` identifying the reader need and destination contribution. In a draft put the exact label naturally into a paragraph or list item. Do not include HTML/Markdown links. The renderer links the approved label to the separately approved target. Avoid "click here", repeated keyword phrases and unrelated link-bearing sentences. Same-site targets belong to `internalLinks`; independently sourced documents to `externalSources`.

Those proposal field names describe the legacy V1 contract. In a native V2 task, follow its supplied schema: an inline `link` node has reader-facing `text` and a typed `target` inside `richParagraph`, `richHeading` or `richList`. Use only the actual same-site page IDs or independently verified external URLs admitted by that task. Do not emit legacy page/citation control tokens inside plain or rich text, or invent V1 proposal fields in a V2 envelope. A text marker has no native target, dependency or publication semantics. Cross-site proposals remain a separate maintained workflow unless the native schema explicitly supports them.

When the supplied native output schema enumerates external URLs, use those exact strings, including hostname, path and trailing slash. A similar address, www alias, homepage or unchecked source candidate is not a verified substitute. If the task admits no external-link branch, keep the source reference as plain text until its exact destination has been separately reviewed and admitted; do not create a URL or claim verification.

Planned targets may be recorded as dependencies and shown in the GUI. They remain inactive until approved, due, actually deployed and checked over HTTPS with the expected canonical. The verifier checks availability; the editorial agent must still read the destination and verify relevance and claims. Publication requires a reviewed unchanged source revision too. Revoked/future network targets must disappear from public HTML and LLM outputs through the common predicate.

Choose the best evidence even if it belongs to an independent manufacturer or government body. Never substitute the owner's commercial landing page for primary evidence or invent independent endorsement. After publication measure referral visits and qualified inquiries; neither a planned link nor a click proves improved authority/ranking.

Primary rules checked 2026-09-30: Google [spam policies](https://developers.google.com/search/docs/essentials/spam-policies), [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). There is no universally safe backlink quota in these rules.
