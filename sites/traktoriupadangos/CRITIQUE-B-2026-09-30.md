# Assessment B — traktoriupadangos.lt

Method: isolated evidence assessment by `/root/tractor_evidence_critique`. Completed 2026-09-30 12:41 UTC. Assessment A output and prior REVIEW/AUDIT files were not read. Required AGENTS.md, WORKSTREAMS.md, the niche brief and DESIGN.md were read as context; their historical validation claims were not reused as results of this run.

## Scope and identity

- Source: `C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.tsx`.
- Styles: `C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.module.css`.
- Baseline preview: `http://127.0.0.1:8787/`; GET returned 200, 59,694 HTML bytes, title `Traktorių padangos: pasirinkimas pagal jūsų techniką`, canonical `https://traktoriupadangos.lt/`.
- Browser independently showed the tractor brand, tyre illustration, guides, and `MB Pinet / info@pinet.lt`. The exported package identified `siteId: traktoriupadangos`, host `traktoriupadangos.lt`, 8 pages and the same email.
- Representative browser surfaces: homepage, open mobile navigation, homepage inquiry anchor, and `/gidas/kaip-issirinkti-traktoriaus-padangas` at desktop/mobile sizes.
- Source SHA-256 at inspection: TSX `5CA907ABF4CDC6719F4596BEB2AAD96C0E23BC4AA24492B1C2B46340FCB38226`; CSS `0D52111D1719A70D30FCDE86F6A514B1A517D11442EB4B8757BC1F01FF7345D8`.

This is a baseline evidence report, not a Lighthouse run, delivery test, demand measurement, or full WCAG certification. No public code, shared build, skill, form data, email or contact state was changed.

## Deterministic detector

The installed Windows launcher ran once successfully:

```powershell
& 'C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/SKILLS/impeccable/scripts/impeccable.cmd' detect --json 'C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.tsx'
```

Exit code: **0**. Exact JSON:

```json
[]
```

**Detector count: 0. Detector rule names: none. Detector locations: none.** The target is markup TSX, not a CSS-only target. There was no crash, missing launcher or skipped attempt. No second detector run was needed.

`context --target <same TSX>` also ran once. It resolved the public core target, reported incumbent UI, and did not find PRODUCT.md, DESIGN.md or a surface brief inside that core repository. The network's scoped `sites/traktoriupadangos/DESIGN.md` was therefore read separately. A clean scan does not establish scoped design-token agreement or prove that computed text sizes and touch targets are adequate. Those were inspected directly below.

Target slug: `tractor-site-tsx` (successful launcher `critique-storage slug` command). `.impeccable/critique/ignore.md` was absent in the network workspace. No prior snapshot or trend was read.

## Browser and overlay provenance

CUA was available. Edge was not available; a browser inventory identified Chrome (id `3`). A fresh dedicated Chrome tab was created, id `44568012`, then bound for this assessment. Existing user tabs were not reused. The first binding assignment failed after the tab had already been created; the newly created tab was recovered by its returned id, without creating a duplicate.

The documented CUA Playwright `evaluate` API is **read-only**. The tab exposed `pageAssets` but no mutable script-injection capability. No permitted API supported the skill's required title mutation and script-tag append. The mutation preflight, detector overlay injection, `[Human]` overlay presentation and browser detector console scan were consequently skipped. A live-server was not started. No overlay success is claimed.

Fallback signal: the actual CLI JSON, native CUA screenshots, accessibility snapshots, read-only computed DOM geometry/styles and GET/asset hash checks. The native browser was visible during inspection, but no user-visible detector overlay exists.

## Measured layout and reader path

Viewport overrides were CSS viewport emulation in Chrome, DPR 1; these were not physical phone or synthesized-touch tests. The browser had a 15 px vertical scrollbar. Document client width and scroll width were equal for each measured surface:

| Surface / requested viewport | Client width | Scroll width | Result |
| --- | ---: | ---: | --- |
| Homepage 1440×1000 | 1425 | 1425 | No horizontal overflow |
| Homepage 390×844 | 375 | 375 | No horizontal overflow |
| Homepage 320×812 | 305 | 305 | No horizontal overflow |
| First guide 1440×1000 | 1425 | 1425 | No horizontal overflow |
| First guide 390×844 | 375 | 375 | No horizontal overflow |

At 390 px, the mobile visual order was header → title and explanation → primary CTA → secondary reading action → illustration → separated illustration disclosure → selection guidance. The primary action was visible before the image: y=401.6, 229×50 px, 12 px text. At 320 px the title and subtitle wrapped normally; no left-overflow offenders were found. The illustration was below the decision copy at both sizes.

The 390 px menu opened by a real locator click and appeared as an expanded native disclosure in the accessibility tree. Its links occupied x=126…338 within the 375 px content width; each was 212×43.8 px with 12 px type. Clicking its `Pateikti poreikį` link changed the URL to `/#uzklausa`, scrolled to y=4915, and placed the inquiry section 19.6 px below the viewport top. The form and submit control were reachable. No form was submitted.

The 390 px inquiry form had two 156.5×48.4 px name/email inputs, a 331×152 px textarea, and a 331×54 px submit button. Native controls have associated wrapping labels. The checkbox was 13×13 px, but its effective wrapping-label target was 331×35.2 px; reporting only the checkbox square as its usable target would be misleading. The hidden honeypot was excluded from the accessibility tree and keyboard order.

Guide body type measured 16 px / 29.6 px at desktop with a 560 px reading measure. Mobile measured 15 px / 27.75 px with a 331 px measure. The 390 px first guide title was 43 px, 180.6 px high, with the first body paragraph beginning at y=548.1. Body text wrapped well, without horizontal scrolling. All six desktop contents links and its inquiry link resolved to real IDs. The mobile contents navigation was `display:none`.

Keyboard focus was checked with the documented native key API: Tab from the brand moved focus to the collapsed mobile menu, and its outline was visibly present in a fresh screenshot. One initial Playwright locator `press` call timed out on the CDP helper; a fresh accessibility snapshot and the documented native alternative succeeded. No keyboard trap was observed in that step; a complete keyboard traversal was not performed.

## Verified manual findings

These are manual evidence findings, not bundled-detector rule names. Count: **4 findings — P0 0, P1 0, P2 3, P3 1.** No unsupported WCAG violation is asserted merely from a small font or a sub-44 px target.

| ID / priority | Evidence and location | Impact and concrete next step |
| --- | --- | --- |
| B-01 / P2 — Important explanatory text is very small | `tractor-site.module.css:102` desktop illustration disclosure 10 px; `:104` marking caveat 11 px; `:107` inquiry caveat and consent 11 px, form labels/placeholder 12 px, form hint 10 px; `:108` footer attribution 10 px. Browser measurements confirmed the desktop 10 px illustration caption and 390 px 11 px consent/caveat. The mobile image disclosure is correctly overridden to 11 px by `:120`. | The offer limitations and privacy consent require more effort to read than the main prose. Increase essential explanatory/consent text toward 13–14 px and form labels toward 14 px; keep nonessential metadata secondary through tone/spacing. Suggested: `$impeccable typeset`. |
| B-02 / P2 — Several secondary reading targets have shallow hit areas | `tractor-site.module.css:101,103,104,105,106,108`; the homepage secondary action was 109×30 px at 390, each `Plačiau gide` 331×20 px, marking guide link 232×20 px, hub/FAQ index links 40 px high, footer links 148×19.8 px with 13 px margins. Single-line FAQ summaries measured 331×23.1 px, whereas wrapped summaries were 46.2 px high; outer details padding should not be counted automatically as clickable summary padding. Primary CTA, fields, submit and full linked guide panels were large. | Narrow targets are harder to activate reliably when scanning or using a phone outdoors. Move vertical padding onto interactive links/summary elements so secondary actions also approach a 44 px usable height. Suggested: `$impeccable adapt`. This is the skill's ergonomic target, not an automatic WCAG 2.2 AA failure: spacing and inline-link exceptions must be considered. |
| B-03 / P2 — Form requirements are hidden until validation | `tractor-site.tsx:42`: name is required with `minLength=2`; email required; message required with `minLength=20`; consent required. The visible labels shown in the inquiry screenshot do not identify required fields, and the message label/helper does not expose the 20-character minimum. | A visitor can spend time preparing a short question before learning the constraint. Add a concise required-fields note and a message helper that explains the expected minimum/useful details. Associate that helper with the textarea. Suggested: `$impeccable clarify` / `$impeccable harden`. Native error behavior and server recovery were not tested because this task prohibited form POSTs. |
| B-04 / P3 — Mobile readers lose the guide jump list | `tractor-site.module.css:111` hides `.aside nav`; `tractor-site.tsx:67` places contents links in that aside. At 390 px browser computed display was `none`, while desktop had six valid section links. | Mobile readers must scroll to relocate a particular section. A compact native disclosure containing the section list before the article would retain navigation without a desktop sidebar. Suggested: `$impeccable adapt`. The numbered headings and narrow reading measure remain useful, so this is an efficiency refinement. |

## Positive signals and false-positive handling

- Primary CTA and menu-to-inquiry path worked in the live preview; no horizontal overflow was measured at 320 or 390 px. Heading order, native details, labels and the visible focus ring are useful foundations.
- Full guide panels are links with ample hit areas. Their 31/32 px descriptive titles and 13 px descriptions are distinct from the smaller compact reading actions.
- The guide body already uses a constrained 560 px desktop reading measure and comfortable line height. Broad desktop whitespace does not imply an overlong line.
- Detector false positives: **0**, because the detector returned no findings. Manual false-positive exclusions: hidden closed-menu descendants, the clipped honeypot, the checkbox's small native square without its wrapping label, and the menu's 43.8 px measured height rounding versus a nominal 44 px guideline.
- The ImageGen disclosure and alt text correctly identify an illustration rather than inventory or a real catalog product. Its placement below the image on mobile was deliberate and intact; it was not counted as an image-overlap bug.
- Same-page menu navigation leaves the native details open when later returning to the header. This was observed from the state after the anchor click, but not promoted to a counted issue: the dropdown was offscreen at the destination and could be closed normally.

## HTML image identity and size evidence

The homepage had one HTML image. Its `src` was `/content-assets/traktoriupadangos/493665ac-7356-479b-a075-0a7352663df1.webp`, with three width-descriptor candidates (782w, 720w, 480w), `sizes="(max-width: 760px) 60vw, 36vw"`, `width=782`, `height=1001`, high fetch priority and async decoding. Alt: `Iliustracinė nepaženklinta žemės ūkio padanga su V formos protektoriumi`.

At desktop DPR 1, `currentSrc` selected the 720 px candidate. The CSS image box measured 606.3×560 px, with `object-fit:contain` (actual raster aspect ratio constrains the drawn tyre width). At 320 px the image box measured 192.1×318 px. No image crop, obvious aspect distortion or visibly inadequate source resolution was seen. Browser `naturalWidth` was density-corrected by `srcset` (518 at desktop); it should not be mistaken for the physical file width.

All three live asset GETs returned 200 and `image/webp`. Live response bytes matched public source hashes exactly. `ffprobe` independently confirmed physical pixel dimensions, matching the approved package:

| Asset ID | Physical pixels | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `493665ac-7356-479b-a075-0a7352663df1` | 782×1001 | 89,156 | `FD84481583B2E4D24006E13692416C23A15BA87B67FE94E5FCE943E3C4873FCD` |
| `17c8f68e-1705-400d-870b-77fa2f63f164` | 720×922 | 82,900 | `E3992C7EBED00E32A48143666F8B2FDE49C4B7B8AA3FEF68C3132D981FA0C48F` |
| `1e2e3d87-e30c-4c1a-b476-4bbec2438618` | 480×614 | 42,240 | `8840726DFCD0663E526C7A329F51B897097363290842548515B95DDEA0508A89` |

## Fresh screenshots and storage limitation

Native CUA screenshot captures were emitted and visually inspected during this run, in tab `44568012`:

| Capture | Viewport / state |
| --- | --- |
| B-native-01 | Homepage 1440×1000, top |
| B-native-02 | Homepage 390×844, top |
| B-native-03 | Homepage 390×844, open menu |
| B-native-04 | Homepage 390×844, `/#uzklausa` |
| B-native-05 | Homepage 320×812, top |
| B-native-06 | First guide 1440×1000, top |
| B-native-07 | First guide 390×844, top |
| B-native-08 | First guide 390×844, keyboard focus on menu |

**Fresh filesystem screenshot paths: unavailable.** The documented native screenshot methods returned/emitted JPEG bytes and exposed no save-path or save-to-file operation. These capture names are transcript evidence labels, not fabricated local filenames. No terminal Playwright capture was substituted, because the native browser path was available and all browser interactions were required to use CUA. This report therefore provides actual screenshot observations and geometry, but does not claim persisted JPEG artifacts. The parent assessment's separately saved screenshots remain necessary for user-facing artifact links.

## Run notes and cleanup

- Isolation: A findings were not consumed; root was given only browser coordination until A finished. No other agent was spawned.
- Context and detector: successful real launcher commands; 0 detector findings; scoped tokens reviewed manually because core context did not discover the network design file.
- Overlay: skipped for documented read-only injection limitation; no live-server process started, so no live-server stop command required.
- Browser cleanup: viewport override reset successfully; only own tab `44568012` closed successfully. Existing tabs untouched. Browser viewport capability is browser-scoped; the parent was informed during inspection to avoid concurrent sizing.
- Server cleanup: no server started or stopped. Root-owned 8787 server left running. Shared `dist/` not rebuilt.
- Files: only this report was written. No temporary files, contact rows or local image downloads were created; no temp-file deletion required.
- Skips: full WCAG audit, Lighthouse, zoom/text-scale testing, physical/synthesized touch, all remaining pages, form validation/recovery and delivery were outside this evidence pass. No conclusions about those checks were borrowed from historical documents.
- Questions skipped: delegated Assessment B only; the parent owns synthesis and the final user-facing follow-up.
