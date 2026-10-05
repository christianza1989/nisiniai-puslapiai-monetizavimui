# Evidence for enlargement and reflow

Use for A–Z R2/S2 alongside the contrast, focus and narrow-layout evidence. A high Lighthouse accessibility score does not perform these checks. Relevant primary guidance reviewed 2026-09-30: [W3C resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) and [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). This is a scoped acceptance check, not a WCAG certification.

## Actual browser enlargement

1. Open an agent-owned audit tab/window for the intended local production site. Confirm its URL/title, active window and loaded images/fonts. Do not operate an unrelated foreground page. Use the supported Browser/Computer Use APIs and read their instructions; never invent a helper protocol or browser method.
2. Record the baseline browser zoom, viewport, DPR and representative text/control sizes. Clear any temporary viewport emulation that would obscure a real browser change. Do not change the user's global font/zoom preferences merely to get a score.
3. Use a real supported browser zoom control to reach 200%; inspect intermediate steps if they change the composition. A shortcut sent to a page DOM is not proof that the browser accepted the shortcut. Record the browser percentage and the resulting viewport/DPR relationship or other actual enlargement evidence.
4. Inspect the homepage, index, all initial guide openings and the longest article's body, source list, breadcrumb/byline, contents, form and footer. Check readable wrapping, no obscured/cropped controls, overlapping text or lost content. Exercise the menu/contents, contextual inquiry link and empty native form validation without submitting a customer message.
5. Record screenshots and observed results for the exact package/build. Distinguish browser page zoom, text-only enlargement and narrow reflow. A existing genuine text-size control may be a valid enlargement mechanism when tested; do not add a cosmetic control solely to manufacture a pass.
6. Restore the original zoom and close only agent-owned audit tabs. Stop immediately if the user stops Computer Use; do not continue the same interaction through another automation mechanism. Preserve the last known outcome as unknown if interrupted.

## Narrow reflow and verdict

Test the actual page at a narrow viewport (including 320 CSS px where appropriate), independently of enlargement. Observe all content rather than concealing overflow with `overflow-x:hidden`. Necessary two-dimensional content is an explicit, justified exception, not an excuse for ordinary paragraph clipping.

Use `PASS` only after the required enlargement and relevant narrow content have been inspected with evidence. If the browser control is unsupported, the percentage is not established, the user interrupts, or actual text/control behavior was not inspected, keep the affected check `UNVERIFIED`. An attempted Ctrl+Plus, a screenshot at 320 px, a modified DPR alone or a source-code assertion cannot close the missing enlargement check.

Write a per-site `ACCESSIBILITY-VERIFICATION.md`/JSON with date, URLs, package hash/build, mechanism, original/final zoom, viewport/DPR, screenshots, tested actions, defects/repairs, restoration and limitations. Reuse only relevant unchanged evidence, not another niche's PASS status.
