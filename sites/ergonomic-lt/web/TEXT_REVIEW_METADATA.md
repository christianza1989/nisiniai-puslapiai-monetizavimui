# Independent search descriptions

Owner request: 2026-11-05, add an editable search description without changing existing titles or approved product bodies.

The product text review list includes **Aprašymas paieškai** with its own `content:<product>:<scope>:meta-description` key. It uses the existing optimistic revision, history and draft/publication storage. A metadata draft has no dependency on a body paragraph or title revision. Empty, untouched metadata retains the prior SEO fallback; title and body behavior are unchanged. The server and textarea accept at most 500 characters without truncation.

`generateMetadata` applies the separate displayed metadata to the HTML description and Open Graph description in both customer and catalogue presentations. Unpublished drafts appear only on the explicitly enabled text-review proposal site. This does not publish content to the live site.

Verification plan: existing Manrope review label and input roles; inspect the new field at desktop and 390px, check readable 16px input and no horizontal overflow. Save and reload exact owner text for five products; compare their pre-existing title/body edit rows and page titles. Verify anonymous page description and Open Graph description. Tests cover independent stable identity, exact draft persistence, production draft isolation and length validation.

Source base: `d48975b2be74a1a77e1554088c72def13455854c` on the existing product implementation branch; current main `25292e20219b735df7f04c5807dd4c100f98addc` is an ancestor. No companion interface changes.

Local operational evidence, screenshots and exact approved input remain under `D:/Core/output/ergonomic-gemini-20261105/meta-description/`; credentials and database snapshots are excluded from Git.
