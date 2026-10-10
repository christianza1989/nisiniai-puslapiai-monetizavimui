# Maintain the complete text presentation system

Apply to new sites and existing-site text/interface changes. Typography is continuously maintained from the first draft through implementation, review and later updates. The user’s current scope and the site's selected identity remain authoritative. This contract defines a method, not a shared skin, font choice, palette or mandatory size scale for unrelated sites.

## Plan before changing styles

Use the site's current DESIGN and actual source. Inspect the rendered baseline and write a compact plan in DESIGN or a linked site document, with checkboxes for inventory, evidence-backed defects, planned repairs and confirmation. For a small change, a short affected-role checklist is enough; do not require an unrelated redesign or a new document for every typo.

Inventory all relevant page families and states: homepage, catalogue/cards, product or service detail, articles, navigation/breadcrumbs, forms and validation, modal/fullscreen controls, contact/legal pages and footer. Include headings, statements, body text, list/table content, links, labels, buttons, captions, metadata, hints and errors. Distinguish roles that really differ from accidental near-duplicate styles.

For each affected role record its source/token, font family and actual weight, size or responsive range, line height, letter spacing, colour/background, reading width, alignment and expected wrapping. Label findings with the actual URL, viewport, state, screenshot region or computed measurement and their consequence for reading. Do not call every intentional display treatment a defect merely because an automated detector dislikes it.

## Use one maintained project system

- Keep the project's canonical text-role tokens/styles and DESIGN consistent. Components reuse the role appropriate to their job. Avoid accumulating one-off font sizes or late cascade overrides without removing or explaining the conflict. A display heading and an efficient configurator can differ within the same documented system.
- Select compatible families by their visible proportions, x-height, tone and real roles. One well-set family is valid. If pairing families, test them together using actual language, headings and paragraphs rather than a Latin-only sample. Verify the required glyphs, including Lithuanian `ąčęėįšųūž`, actual loaded weights, italics when used, source/licence and a readable fallback. Avoid accidental synthetic bold or a missing-weight fallback changing the hierarchy.
- Establish a clear hierarchy through placement, scale, weight and spacing together. Limit competing emphasis; do not make every heading heavy, every secondary line tiny, or every paragraph pale. A fluid display scale may use bounded relative values; body, navigation and controls need stable readable sizes that also respond to user enlargement. Do not size text solely in viewport units or lock the root size to defeat browser preferences.
- Treat size ranges as audience/font-specific choices. Body text around 16–18 CSS px and utility text around 14–16 px can be useful starting points, not universal acceptance thresholds. Inspect the real glyph size and density; document a smaller caption exception where it remains comfortable. Never shrink important labels, consent, caveats or errors just to fit a narrow design. Preserve usable control areas when adjusting text.
- Tune leading and tracking by role. Body text normally uses natural tracking and enough leading to follow each line; long reading text often benefits from roughly 1.5–1.75 line height. Display headings can be tighter when all lines and diacritics remain clear. Avoid collisions, excessive vertical gaps, isolated words, widely spaced body copy or aggressive negative tracking. These are starting heuristics, not compulsory values for every font.
- Aim for approximately 45–75 characters per line in long prose where the viewport allows it; natural mobile lines can be shorter. Keep tables/code and necessary two-dimensional views as deliberate exceptions. Coordinate paragraph/list spacing with leading, heading-to-copy spacing, section rhythm and consistent alignment. Do not create huge paragraph gaps as a substitute for a clear hierarchy.
- Check text against its actual background in every relevant state, including images, overlays, hints and placeholder text. Under [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), normal text needs at least 4.5:1 and qualifying large text 3:1; account for the stated exceptions. Contrast is a floor, not proof that a thin font or a whole page of heavy emphasis feels readable. A faded secondary role still has to communicate its information.
- Preserve the approved words, facts, numbers, negations, links, semantic heading order and original SEO intent. Typography fixes can change line breaks and layout without replacing the copy, hiding paragraphs or turning text into a raster image. Any actual editorial change follows the existing exact-revision review/publication contract.

## Inspect the real result and confirm once

Review actual desktop and mobile rendering before relying on source scans. Include a narrow viewport such as 320 CSS px where relevant, an intermediate width, long local-language headings/product names, multi-line labels, article lists/sources and the footer. Check the actual loaded font and weights, line breaks, density, contrast, clipping, overlaps and touch/control text. Exercise affected expanded menus, dropdowns, fullscreen views and validation states.

For new systems or changes that can affect enlargement, inspect actual text resizing to 200%, narrow reflow and user text-spacing overrides. Follow the audit's [enlargement/reflow evidence contract](../../niche-site-audit/references/accessibility-verification.md); a viewport change or attempted shortcut alone does not prove browser zoom. Under [W3C resize-text guidance](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), resizing must preserve content and functionality. Under [W3C text-spacing guidance](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), check simultaneous user overrides for line height 1.5, paragraph spacing 2 times the font size, letter spacing 0.12em and word spacing 0.16em without losing content/function. These are override tests, not the site's prescribed default styles. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) permits necessary two-dimensional content exceptions; ordinary copy does not qualify merely because its container clips.

Keep the confirmation proportionate: inspect all affected roles/page families and a representative unaffected surface when shared styles change. Repair verified defects in a coordinated batch and confirm the affected views; further work needs a specific unresolved issue. Do not expand a small copy edit into repeated whole-site tests when existing relevant evidence remains current.

Save the exact URL/build or source version, viewport/state, actual test mechanism, screenshots, findings, repairs and remaining limits. A source scan or computed-size table complements visual inspection; it cannot prove compatible font rendering, craft or complete WCAG conformance. If the actual enlargement mechanism is unavailable or interrupted, mark that part UNVERIFIED and retain the limitation rather than inventing PASS. No second agent is mandated by this contract.

## Maintain it after delivery

After a meaningful text length, component, font, responsive rule or palette change, recheck the affected roles and layout. Longer articles, translated labels and newly introduced errors can expose defects even when old screenshots passed. Update the same project tokens, DESIGN and current evidence instead of creating a separate style system for the new section. Keep original failures and historical acceptance records; this new rule does not retroactively approve or migrate older sites.

Before accepting the current task confirm:

- [ ] All affected text roles and page families are mapped to the maintained project system.
- [ ] Font pairing/glyphs/actual weights, size, leading, tracking, reading width, contrast, alignment and wrapping are inspected.
- [ ] Known defects are fixed without lost copy, changed facts, hidden content or broken SEO semantics.
- [ ] Actual desktop/mobile, relevant states and applicable enlargement/reflow/text-spacing evidence are saved; missing tests are explicit.
- [ ] DESIGN/source agree and later meaningful changes trigger the same focused check.

Primary W3C guidance reviewed 2026-10-10. The inspection checklist provides bounded evidence of the implemented text system, not a certification, conversion prediction or automatic acceptance of other projects.
