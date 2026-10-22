# V1 preview heading wrapping verification

Issue: [231](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/231). Base: e231fe491e663949adbdda992286f5b8fb97513b. Rokas authorized this narrow preview CSS correction and isolated QA on 2026-10-20.

The private V1 preview H1 used a large responsive font without emergency word wrapping. On Windows at a 320 CSS px viewport, the document had 305 px available because of the vertical scrollbar. Long Lithuanian words extended beyond the right edge. Comparing scrollWidth only to innerWidth missed this failure.

The maintained H1 rule now uses `overflow-wrap:anywhere`. Normal word boundaries remain preferred. Title text, font family, responsive font sizes, body, metadata, IDs, URLs, public rendering and approval/publication behavior are unchanged. No other selector was modified.

## Actual verification

- `npm test` in content-studio: 47 tests passed, 0 failed. Existing preview HTTP, private-origin, revision, media and workflow checks passed.
- Playwright compared the old running preview against a separate fixed QA server using a private snapshot of the same data. The original studio process and data were preserved.
- Two failing long-word titles and two unaffected titles were tested at 1280, 390 and 320 CSS px: 12 paired observations. Both original 320 px failures reproduced; the fixed H1 had no text Range rectangle outside document.clientWidth in all 12 observations. All paired main text and computed font family/size values matched.
- The two failing titles also passed with a CSS root font size of 200% combined with H1 line-height, letter-spacing and word-spacing overrides. Text remained present. This is a CSS text-resize test, not a browser zoom or complete WCAG compliance claim.
- Actual before/after mobile screenshots were visually reviewed. The emergency break removes clipping and preserves readable hierarchy.

Private screenshot/DOM receipts remain under the operator's local task output. They are not committed with customer studio data. The separate QA server and owned browser pages are closed after verification. The existing running studio requires its own controlled adoption; this PR neither restarts it nor claims production adoption. No content approval, release or publication occurred.

## Rollback

Revert the H1 property and this scoped change. No content or database migration is required.

## Current-main revalidation — 2026-10-22

Rokas directly requested repair, verification and merge of PR232. Integrated fetched main `960a7a2aae6451034921554ea2a7d9bae8969ab7` into the existing PR branch; the sole conflict was the appended WORKSTREAMS log, resolved by retaining both histories. The source diff against current main remains the single H1 wrapping property. Companion source was checked at `d44128b10233fca0760416a9251fabdfd19a119a` with fetched main `705688622563e75b1ab044f416b75cdf5cf4fbf7` already included.

Verification plan and result:

- [x] Preserve the existing system-ui H1 family/weight, clamp scale and 1.16 line height; inspect H1 against unaffected body, H2, list, link and footer roles. No copy or semantic changes.
- [x] Full current content-studio suite: 62/62 PASS. The initial run was 61/62 with a fetch ECONNRESET in the existing media-byte-limit test. That test passed alone, then the entire unchanged suite passed; the initial interruption is retained in the private receipt. No media test or HTTP implementation was changed to obtain a pass.
- [x] Isolated loopback server9432 with synthetic fixture bodies and four existing title strings: 12 actual HTTP/Playwright views at 1280/390/320 CSS px. Every fixed H1 Range rectangle stayed inside document.clientWidth, and title/main copy plus computed H1 family/size matched its paired baseline.
- [x] Baseline in this new run is an explicit `overflow-wrap:normal` override on the same current HTTP preview, not the original live4317 renderer. One 320px title clipped in this synthetic layout; the other historical failure did not reproduce here. This does not replace the original snapshot-based observations above.
- [x] Both historically affected titles retained all H1 text at 320px with CSS root font200%, H1 line-height1.5, letter-spacing.12em and word-spacing.16em overrides, plus paragraph margin2em. This is a CSS text-resize/spacing check; native browser zoom remains unverified in this refresh.
- [x] Visually reviewed current desktop, narrow before/after and enlarged screenshots. The long word now breaks across lines without changing its characters or reducing type. Impeccable type detector returned no findings; visual evidence is assessed separately.
- [x] Own headless browser and isolated server closed. Existing studio4317 and its data were not opened for mutation or restarted. Public renderer, approval, release and publication remain outside this change.

Fresh receipts, synthetic fixtures and screenshots are local under the operator's `pr232-refresh-20261022` output directory; no customer data or browser profile is committed. Source merge and adoption by an already-running studio remain separate operations.

