# Ergonomic: launch homepage and contacts readiness

Status: source and local qualification complete; new preview publication waits for the chairs owner's full public SHA acceptance. No production/DNS/indexing change.

## Actual changes

- Reuse the existing owner-approved homepage and canonical metadata in preview and LAUNCH_SITE mode. The old launch-only fallback omitted the canonical and forced noindex. No new public copy.
- Disable only the contacts CTA's automatic quote-form prefetch. Clicking still opens the same real form.
- Preserve the latest qualified Souly source460d22fdc836bc38d3a951b6a0b1ceed11fb552f, all257 chair and88 desk model variants, original geometry/materials, K4ME and Souly groups, and all original asset rows. Own functional differences from that source are only src/app/page.tsx and src/app/kontaktai/page.tsx. Other checkouts/processes/leases were not changed.

## Source and evidence

Built code: cf3f1ede76d210c0d0e000af49043615de35daf5 (build-v11). Core main25292e20219b735df7f04c5807dd4c100f98addc; companionc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da.

- Both TypeScript projects: PASS. Latest owner's8 chair admission/palette tests:8 PASS.
- Preview desktop/phone, root/contacts, before/after:8 PASS; whole visible copy, title/H1, links, main/logo/hero rectangles identical. No overflow or page errors. Form loads after click; no submission sent.
- Local proposed production home: desktop/phone PASS, one header/footer, approved home, canonicalhttps://ergonomic.lt/, index,follow. Actual preview remains noindex.
- Full local proposed production sitemap:16 URLs, all200. Five approved homepage product-line links remain404 until proper product releases exist; no draft promotion to mask this.
- Paired mobile Lighthouse13.6 on this PC, latest combined source: contacts94→96; TBT177→11.5ms; transferred687367→278246B (59.5% reduction); CLS0. Earlier two-page-only run87→96 demonstrates score variance. These are local Lighthouse runs, not hosted Google PageSpeed results.

Evidence root: D:/Core/output/ergonomic-launch-readiness-20261102T1908. INTEGRATED-SOURCE-QUALIFICATION.json; browser-local-v2/SUMMARY.json; production-local-browser-v3/SUMMARY.json; contact-mobile-local-v2/SUMMARY.json; LAUNCH-LINK-AND-METADATA-AUDIT.json.

## Publication coordination

Chairs owner published3152714b-401a-469f-ae63-d44fc274b6c7 from460d22f. Read-only admission verified all188 deployed modules exact and both standard/versioned indexes show257 chairs+88 desks. Their full public original-file SHA check is still running.

The old f0-based preparation is preserved and will not be published over Souly. Its v1 script failed parsing before its claim; v2 stopped on OTHER_PUBLISHER_ACTIVE before authentication/upload/Worker PUT. Neither was replayed.

New publisher-v2 preparation:49889 rows,20 new generated-client hashes,188 modules. All49869 latest Native rows retained except generated entries updated to the frozen build; no original asset changed,0 aliases retired,0 physical files deleted. Old hashes must never be reuploaded. GLOBAL recovery budget carried (used2,limit8).

Prepared but unexecuted publish-launch-contact-once-v3.mjs requires exact latest API3152714b100%, completed owner PUBLIC-MERGED-NORMAL-HTTP-FULL-SHA.json, qualified composed source, reserve D≥60GB/E≥150GB, no OWNERSTOP/other publisher, immutable file identities and metadata, then exactly one Worker PUT. Documentation-only commits are admitted only if all web code remains identical to built cf3f1ed. Any unknown outcome is reconciled read-only; no blind retry. Actual adoption and public functional checks are required before marking deployed.

## Remaining text/release dependencies

START.md v2.4 assigns page/category text to the Gemini pages chat and product text/meta/review/release to the Antigravity product chat. This technical chat does not author their prose or fake approvals.

- Four canonical descriptions needed: /aktyvus-sedejimas/, /privatumas/, /shop/balansines-kedes/, /shop/priedai/. The last was found by the complete16-page audit. Existing UI collection summaries have interface-role bindings; they are not auto-promoted to approved canonical meta fields. Correct text chat should decide them.
- Actual live PUBLICATION_DB read-only: workflow revision0, no reviewed/approved/released models;0 desk text drafts. The unrelated existing2ME draft is untouched.
-87 active technical desk candidates overall;29 explicitly electric from original manufacturer fields are priority. Other entries are inventory only; no fixed desk collection started.88 desk model assets include an older extra variant, so counts are not interchangeable.
- Each intended desk needs source/options validation, proper product writing, actual current content/geometry acceptance, revision-bound review/owner approval, canonical release and sitemap eligibility. LAUNCH_SITE still refuses TECHNICAL_DRAFT desk candidates.

Private handoff: CONTENT-AND-RELEASE-HANDOFF-v2.json, DESK-TEXT-RELEASE-QUEUE.csv, DESK-PUBLICATION-QUEUE.json, EXPLICIT-ELECTRIC-DESK-PRIORITY.json. No production launch is claimed.
