# Studio text groups

Owner request: distinguish guides, category descriptions and product descriptions in the current pages list, including counts and filters. Existing comparison/edit/preview actions and all editorial/publication states stay in place.

Source starts at `3f223ed0e028c631a379d68c221537be406b2f52`; fetched core main `e231fe491e663949adbdda992286f5b8fb97513b`, companion main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Scope reserved on issue233 / draft PR234.

## Bounded implementation and check plan

- [x] Inspect existing changed-text list: all text types mixed, category rows display the backend FAQ label.
- [x] Separate list sections and native type filter buttons. Categories are recognized by the category route, while real FAQ and information pages remain Other.
- [x] Counts follow the selected editorial status; the all-status view includes plans. Do not imply file presence, review or import is owner approval.
- [x] Preserve Inter/system fallback, green controls and existing row typography. New group headings20px/1.4, controls and utility copy14px/1.5, readable dark green on white/pale green,44px controls and wrapping on320px.
- [x] Check type/status combinations, reloadable links, empty states, keyboard focus, comparison/draft navigation and no data writes. Inspect desktop1280, mobile390/320, enlarged text and spacing overrides together.
- [x] Adopt static files on the existing local4317 server only after QA, with backup/hash checks and identical active-site bytes; no restart or publication.

## Result

Six targeted Node tests pass (group classification, real revision counts, reloadable filters, immutable archives and comparison API). Actual isolated QA9431 reads a private copy of the current1908-page site, empty job queue, read-only media junction; all non-GET browser requests are blocked and none were attempted.

At1280/390/320, the changed view groups709 rows into35guides,37category descriptions and637products. The all-status view retains1908plans/current pages and8other pages; the reviewed view has706rows. Group selection, reload, empty state, comparison and same-tab draft navigation pass. Native44px buttons retain keyboard focus after re-render; no page errors or horizontal overflow. These are current data observations, not permanent expected inventory or approval counts.

The first browser attempt exposed the static server's asset allowlist: a new imported module was404. Helpers now remain in app.js, with no server change/restart or duplicate maintained implementation. The first count expectation for Other was7, actual data showed8; corrected the private test expectation only. Initial visual inspection also found labels touching counts, then a specific residual enlarged-label overflow. Separate text spans/spacing and min-width/wrapping repaired these; the focused enlarged320 confirmation verifies every label/count child remains inside its button. Original failed attempts remain in the tool/evidence history.

Desktop/mobile screenshots and JSON are private under the task output's `studio-revision-comparison/content-groups/`. Explicit CSS text enlargement to200% plus line/letter/word-spacing overrides passed after the recorded repair. Native browser zoom is UNVERIFIED; no general WCAG certification is claimed. The Impeccable detector reports three pre-existing font/decorative-border warnings outside this refinement; incumbent identity retained. Lithuanian labels and changed user journey read in the actual screenshots.

Local4317 adoption at2026-10-20T09:39:18Z replaced only public/app.js and style.css after exact before-hash checks and private backups. HTTP responses match new source bytes. ServerPID19444 remains in place, no restart. Active-site SHA256 remains `672e8c37ec46db582b3dc4a0e3e0c149e8c825f43a31e7ef8180de50ab75c231`. Actual4317 browser confirms the three populated headings and category filter surviving reload with37rows. No content, ID, URL, review or approval changes are part of this patch.

Final helpers are inline in app.js to preserve the server's existing asset allowlist. The originally reserved standalone page-groups.js was removed before delivery; its functions have one maintained source, exercised in a VM by the focused unit test.
