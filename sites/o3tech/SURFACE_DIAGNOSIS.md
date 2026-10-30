# Subtle background rectangles · 2026-10-30

Owner reports recurring faint rectangles on this and other Core sites, visible in both ordinary Chrome and the in-app browser. Uploaded PNG near footer Nuoma/Taisyklės contains opaque base RGB225,241,245 (#e1f1f5) and secondary RGB230,238,247 (#e6eef7).

Current PUBLIC source e8395f42be84d0c86a1202b0f6135090bce6487a has a single opaque footer background; links and intervening ancestors are transparent, with no filter, transform, shadow or opacity change. Chrome forced-colors/more-contrast/dark-scheme/HDR are false, reduced motion true. This does not establish a general palette defect across the network.

An isolated loopback fixture without the Core renderer or scripts reproduced the owner's live observation:

- A: original variable Open Sans, transparent link background — owner sees patches.
- B: same font, exact matching opaque link background — owner sees patches.
- C: Arial, otherwise matching presentation — owner reports clean.
- D: intentional secondary-colour control, excluded from defect assessment.

The second font-only comparison keeps all backgrounds equal. Owner reports that Lithuanian glyphs are clean only in H:

- E: current variable Open Sans14px — affected.
- F: static Open Sans14px, actual400/600 faces — affected.
- G: links use variable Open Sans16px, but the separate glyph row was still14px when the owner inspected it — the owner's glyph-only reply does not qualify16px as affected.
- H: Arial14px — clean.

FontFaceSet status/check and computed families confirm the static face is loaded; it is not an accidental Arial fallback. Static400/600 Latin+Latin-ext coverage includes all tested Lithuanian letters. All4current variable files match both their preserved SHA and a new fetch from their exact Google Fonts v44 URLs. Fontkit identifies Open Sans3.003 with weight axis300–800, ordinary outline tables and no colour-glyph tables. Static Fontsource package5.3.0 has no variation axes. No corruption introduced by this checkout was found. Fontkit's WOFF2 variation-layout helper failed; the separate default400 layout/coverage checks succeed and that tooling failure is not attributed to browser font validity.

Supported conclusion: this specific visible defect is font-dependent in the owner's rendering environment. Matching opaque backgrounds and static instances do not resolve the reported symptom. The earlier progress claim that larger text also failed exceeded the glyph-row evidence and was explicitly corrected. G's fixture styling was then repaired for future use; no new owner16px result is claimed. It is not established that the variable format, a specific GPU/driver or every other Core font is defective. Replacing the palette or universally banning variable fonts is not justified by these results.

Automatic captures are JPEG despite earlier .png filenames; they cannot certify small exact colour differences or override the owner's live result. Native Chrome window capture was denied by its current-URL confidence guard; chrome://gpu was blocked by protocol policy. Neither restriction was bypassed and no graphics settings were changed.

Separate Arial homepage review: http://127.0.0.1:4790/arial-preview/. It proxies the existing local homepage with an explicit font-only override and review notice; CSP blocks form submission. Original content/assets/colours are retained. This is not the actual4783 server or a production change. Browser check found0non-Arial descendants and no overflow at1280/390; temporary viewport reset. Screenshots are private/surface-diagnosis-20261030/arial-footer.jpg and arial-mobile.jpg.

Arial is a supported workaround in the isolated tests, not a visually identical replacement. It changes metrics: at40px the exact hero heading measures595.527px in Open Sans500 versus629.063px in installed Arial400. The candidate heading wraps to2lines in the observed desktop panel. The owner previously pinned the hero to the original; do not silently apply a global font swap or claim one-to-one fidelity. Actual whole-page workaround acceptance remains a separate choice.

Private evidence: diagnosis.json, font-inspection.json, font-metrics.json, comparison.jpg, font-comparison.jpg and CHECKPOINT.json. Fontsource/fontkit are pinned, script-disabled diagnostic dependencies outside both Git checkouts; no app dependency changed. Root fixture and font comparison remain at4790 for review, while4783 retains its original fonts and the already-qualified mail connection. No additional mail was sent.

Reusable QA finding: compare authored CSS with actual pixels; use a system-font control plus variable/static/font-size controls before attributing rectangles to token drift. Preserve font identity and wrapping constraints, verify loaded faces/Lithuanian coverage, and label lossy screenshots. Other domains need their own reproduction before any shared rendering change.
