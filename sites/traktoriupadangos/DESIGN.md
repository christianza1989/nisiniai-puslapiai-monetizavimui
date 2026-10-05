---
name: "traktoriupadangos.lt"
description: "Agricultural tyre information presented as an equipment exhibition."
colors:
  graphite: "#272a24"
  chalk: "#f8f8f3"
  muted: "#555a50"
  divider: "#d9dcd2"
  stage-yellow: "#dec34c"
  inquiry-yellow: "#e6d888"
  field-paper: "#faf8ed"
  field-border: "#9c935d"
  guide-leading: "#eceee5"
  guide-hover: "#e1e5d5"
  primary-hover: "#3c4035"
  focus-light-surface: "#6c5a00"
  focus-dark-surface: "#ead572"
  footer-graphite: "#20241d"
  footer-text: "#f2f4e9"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(60px,6.2vw,88px)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-.02em"
  display-mobile:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(58px,12vw,78px)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-.02em"
  guide-headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(40px,4.6vw,65px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-.02em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(34px,3.4vw,48px)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-.02em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  article:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.65
  action:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.65
  field:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.65
rounded:
  square: "0"
spacing:
  field-block: "12px"
  field-inline: "14px"
  action-block: "16px"
  action-inline: "20px"
  page-mobile: "22px"
  page-desktop: "24px"
  panel: "30px"
  section-mobile: "55px"
  section-desktop: "80px"
  section-grid-gap: "65px"
  form-gap: "19px"
components:
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    padding: "16px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  link-secondary:
    textColor: "{colors.graphite}"
    padding: "5px 0"
  field:
    backgroundColor: "{colors.field-paper}"
    textColor: "{colors.graphite}"
    typography: "{typography.field}"
    rounded: "{rounded.square}"
    padding: "12px 14px"
  guide-panel:
    textColor: "{colors.graphite}"
    padding: "30px"
  guide-panel-leading:
    backgroundColor: "{colors.guide-leading}"
  guide-panel-hover:
    backgroundColor: "{colors.guide-hover}"
  form-submit:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.white}"
    padding: "17px 20px"
---

# Design System: traktoriupadangos.lt

## Overview

**Creative North Star: "The Agricultural Equipment Exhibition"**

A singular rubber object on a flat yellow stage gives the site its machinery character. Chalk reading surfaces, compressed headings, thin technical rules and plain native controls make the surrounding information feel useful and direct.

The visual system serves a first-phase Lithuanian tyre-information and inquiry site. The illustration is visibly disclosed as generated and is not inventory evidence; the technical example is explanatory rather than a compatibility recommendation. This document applies only to traktoriupadangos, not to the shared network brand.

**Key Characteristics:**

- One large unbranded tyre silhouette on a plain yellow stage.
- Condensed display typography paired with open reading text.
- Flat, square panels and thin technical dividers.
- Native reading, navigation and inquiry controls with visible keyboard focus.

This is a scan of the final implementation on 2026-09-30. Visual authority is the built [stylesheet](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.module.css) and [component](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/tractor-site.tsx), reconciled with [PRODUCT.md](PRODUCT.md) and [DIRECTION.md](DIRECTION.md). The owner delegated ordinary aesthetic choices; this is an agent-selected direction, not a human-approved comp.

The [review verdict](REVIEW-2026-09-30.md) is **ship for five scored fixes only**. The five direction blocks were persisted at finish; [the recovered original concept-seed output](concept-seed-output.json) supports seed 73d1912b and assigned index 3. No own-grounded QUALITY BAR card exists, so its card-based ceiling remains unscored. Performance is not finalized in this documentation pass; no Lighthouse score or production performance claim is recorded.

## Colors

The palette combines warm industrial yellow, chalk and green-tinted graphite. The frontmatter owns the exact values; names below explain their use.

### Primary

- **Stage Yellow:** the large tyre stage and the protected mobile disclosure strip.
- **Inquiry Yellow:** the lighter inquiry section, distinct from the object stage.
- **Dark-surface Focus Yellow:** the marking guide action and visible focus on the dark marking/footer surfaces.

### Neutral

- **Graphite:** default text, primary actions and the marking band.
- **Chalk:** page ground and marking-band foreground.
- **Muted:** supporting text on the light ground.
- **Divider:** header, editorial rows, guide panels and section separators.
- **Field Paper / Field Border:** light native controls on the inquiry field.
- **Guide Leading / Guide Hover:** tonal emphasis for the first guide and hover feedback for the guide panels.
- **Primary Hover:** the primary hero action's hover background.
- **Light-surface Focus:** keyboard outline and caret on light fields.
- **Footer Graphite / Footer Text:** footer ground and foreground.
- **White:** text on the primary action and native submit control.

**The Surface Contrast Rule.** Use the dark focus outline on light surfaces and the light yellow outline on the graphite marking band and footer. A single outline color does not serve every surface.

Other local supporting colors remain in CSS; they are not promoted into a broad reusable palette. The sidecar's tonal ramps are synthesized preview metadata, not colors used by the shipped page.

## Typography

**Display Font:** Barlow Condensed, sans-serif fallback.  
**Body Font:** Manrope, sans-serif fallback.

The condensed face makes the tyre topic and technical notation substantial without decorative lettering. Manrope gives prose, native labels and compact controls their separate reading voice. Fonts are self-hosted with Latin and Latin Extended coverage and swap loading; the [font provenance record](C:/Users/lenovo/Documents/dovanos-memorycasting/public/fonts/traktoriupadangos/provenance.json) retains the retrieval sources and file hashes.

### Hierarchy

- **Display:** uppercase homepage heading, using the display token; at the intermediate breakpoint the explicit size is 70px, and at widths up to 380px it is 57px.
- **Guide headline:** page title with balanced wrapping; its mobile override is 43px.
- **Headline:** section headings; the inquiry uses a larger observed clamp of 45px–66px and a 52px mobile override.
- **Title:** subordinate headings. Guide panels use 31px/1.12 on desktop, 28px at the intermediate breakpoint and 32px on mobile.
- **Body:** base rhythm; homepage supporting paragraphs commonly use 14px, with smaller metadata kept separate.
- **Article:** longer reading text; mobile uses 15px with the same line-height. The article cap is 35rem, producing the reviewed first line of 75 characters in the final desktop guide capture.
- **Navigation, Action and Label:** compact Manrope roles defined in the frontmatter. Mobile primary actions are 12px; link actions commonly use 12px and weight 700.
- **Technical notation:** Barlow Condensed at clamp(56px,6vw,85px)/1 with tabular numerals, changing to 67px on mobile and 58px at the narrowest breakpoint. Its separators use the stage accent.
- **Illustration disclosure:** desktop is 10px/1.5; mobile is 11px/1.5 in its own strip. It is a disclosure tied to the image, not a decorative eyebrow.

**The Two Voices Rule.** Barlow Condensed carries the main headings and wordmark; Manrope carries explanations, metadata, navigation and controls, including utility headings in the sidebar and footer. Keep this role separation.

## Layout

The header is capped at 1440px with a 106px desktop height and 5% horizontal padding. The homepage hero is capped at 1600px; its columns are .85fr and 1.15fr, giving the copy and object stage 42.5% and 57.5% of the split. The stage and hero have a 638px minimum height; the contained tyre is 560px high and 74% wide. At the intermediate 1100px breakpoint, the stage becomes 590px high and the image 505px high.

Most editorial sections share a 1296px cap and page gutters from the frontmatter. Their usual desktop split is .8fr / 1.5fr with the section-grid-gap token. Selection/work rows divide heading and explanation within the right column; rules, not rounded containers, separate them. The three guide panels use 1.2fr / 1fr / 1fr.

Longer pages keep an article capped at 35rem (560px at the site's base size), alongside a 220px–320px sidebar. The desktop grid distributes the remaining space between the two. The sidebar is sticky at 28px; the cap is a measured readability repair, not a mandate to stretch text into available space. Paragraphs and lists retain their own vertical rhythm.

At widths up to 760px, the 86px header presents the native mobile menu. The hero becomes one column with text and actions before the tyre. Most sections become one column; the tyre stage retains a 365px minimum height, a 318px contained image and 63% image width. Its bottom reserves 57px for the full disclosure, with 14px vertical and page-mobile horizontal caption padding. The low-opacity decorative word moves above this reserved strip.

Guides become a vertical stack. The article sidebar stops sticking and its contents navigation is hidden, while its inquiry panel stays reachable. The inquiry form retains two fields per row at ordinary mobile widths, switching to one column at 380px. The footer first uses a two-column link layout with a full-width brand block, then one column at 380px. Breakpoint values are also recorded in the sidecar.

Evidence used for this system is the actual final render:

- Homepage: [desktop](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-home-desktop.png), [desktop full](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-home-desktop-full.png), [mobile](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-home-mobile.png), [mobile full](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-home-mobile-full.png).
- Guide: [desktop](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-guide-desktop.png), [desktop full](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-guide-desktop-full.png), [mobile](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-guide-mobile.png).
- States: [mobile menu](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-mobile-menu.png), [marking focus](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-focus-marking.png), [footer focus](C:/Users/lenovo/Documents/dovanos-memorycasting/output/playwright/tractor-v2-final-focus-footer.png).

## Elevation & Depth

Static interface surfaces have no shadows. Depth comes from the real raster tyre's material, flat tonal fields, object scale and thin rules. The mobile menu is the sole floating interface layer; its implemented shadow is `0 10px 24px #252b211a`.

**The Flat Stage Rule.** Use flat fields and thin dividers for static content. The only implemented interface shadow belongs to the floating mobile navigation.

The only implemented transition is guide background color over .15s. It is removed under prefers-reduced-motion. Do not infer a broader motion system from the native FAQ symbol's open-state rotation.

## Shapes

The system uses square action rectangles, square fields with an explicit zero radius, thin one-pixel dividers and plain aligned text. The tyre supplies the curved silhouette; interface controls do not imitate tread or physical machinery. Icons are inline SVG strokes, including the arrow, mobile-menu lines and FAQ plus.

## Components

### Buttons and links

The hero primary action is a graphite rectangular link with white bold Manrope text, an inline arrow and the frontmatter padding. On mobile its padding becomes 15px 17px. It uses the primary-hover color on hover. The secondary action is a smaller plain link with a rotated SVG arrow; it has no filled container.

The native form submit is a full-width graphite button with 17px 20px padding and the same action hierarchy. The current CSS defines no separate submit hover or error color; do not document an invented state.

The universal focus treatment is a 3px solid outline offset by 5px. The marking band and footer override its color as recorded above. Body article links are underlined; navigation and compact actions use their existing hover behavior.

### Guide panels

The panels are linked, square, ruled editorial containers. They begin with a descriptive Barlow Condensed heading, then muted explanation and a reading action at the bottom. Desktop padding is the panel token, reduced to 24px at the intermediate breakpoint and 27px on mobile. The first panel has a tonal leading background; all panels use the guide-hover treatment.

The removed guideType eyebrow remains as an unused selector in CSS. It is **not canonized** as a component or token and must not be revived on future surfaces.

### Inputs and inquiry

Labels wrap their native controls. Inputs and textarea use the field tokens, a one-pixel border, square corners and dark text. The textarea can resize vertically and has a 152px minimum height. Consent is a native checkbox. The visually hidden honeypot is excluded from keyboard navigation.

The inquiry presents a need description rather than an order or fitment confirmation. The rendered form posts to the shared /uzklausa endpoint; visual documentation does not certify delivery. The visible operator and email are **MB Pinet / info@pinet.lt**. No telephone, price, stock or supplier capacity is represented.

### Navigation and FAQ

Desktop navigation is plain compact text, separated from the header inquiry action by a vertical rule. Mobile uses native details/summary and a right-aligned square dropdown with a 250px minimum width. The real mobile-menu capture shows the opening state.

FAQ rows use native details/summary with a one-pixel lower divider. The SVG plus rotates 45 degrees when open. These are useful disclosure controls, not card decoration.

### Tyre stage and technical band

The large unbranded raster object is contained on the yellow stage, without a visible ImageGen/model badge; source and rights are retained in the editorial ledger. The dark band connects each marking token directly to its approved definition using a ruled notation key: four columns on desktop, two on mobile. The same component is used in the marking guide, with explicit illustrative-example limits. No tyre geometry or fitment is inferred from the generated object.

Image provenance is retained outside immutable media bytes: [source PNG](tyre-source-2026-09-30.png), [full generation prompt](image-prompt.txt), and the approved [package credits/rights](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/output/traktoriupadangos/content-package.json). It is an original OpenAI ImageGen illustration created on 2026-09-30, not a real catalog photograph. These supersede the earlier farm-photo hero for this build.

| Immutable WebP ID | Dimensions | SHA-256 of imported public bytes |
| --- | --- | --- |
| 493665ac-7356-479b-a075-0a7352663df1 | 782×1001 | FD84481583B2E4D24006E13692416C23A15BA87B67FE94E5FCE943E3C4873FCD |
| 17c8f68e-1705-400d-870b-77fa2f63f164 | 720×922 | E3992C7EBED00E32A48143666F8B2FDE49C4B7B8AA3FEF68C3132D981FA0C48F |
| 1e2e3d87-e30c-4c1a-b476-4bbec2438618 | 480×614 | 8840726DFCD0663E526C7A329F51B897097363290842548515B95DDEA0508A89 |

**Provenance limitation:** full source, prompt and credit are retained externally. The embedded-prompt scan reported missing embedded metadata in the existing WebP assets. Embedded prompt metadata is not a publication gate in this project; immutable public bytes were not rewritten. External provenance remains available in the source, exact prompt and approved package credits.

## Do's and Don'ts

### Do:

- Do use the built palette and the heading/body font roles recorded above.
- Do keep honest image provenance in the editorial/media ledger; do not add generator badges to original imagery.
- Do begin guide panels with their descriptive heading, followed by explanation and reading action.
- Do keep article prose within the observed reading measure and check real rendered wrapping.
- Do preserve keyboard focus on both light and dark surfaces and native details/form semantics.
- Do retain exact published media bytes under existing immutable IDs; create a new ID for a changed asset.

### Don't:

- Don't inherit unused guide eyebrow styling as a component pattern.
- Don't add ambient card shadows or rounded dashboard containers to this flat equipment world.
- Don't represent generated imagery as a real product, customer project or available stock.
- Don't introduce unconfirmed prices, stock, supplier relationships or compatibility promises into the visual presentation.
- Don't treat the scoped reviewer verdict, a clean detector or Lighthouse as certification of the entire design.

## Craft refinement, 2026-09-30

An independent visual assessment and isolated technical evidence pass found a strong industrial opening but repeated middle-page layouts, a missed explanatory visual, lost mobile guide navigation and inconsistent inquiry destinations. Baseline reports: [A](CRITIQUE-A-2026-09-30.md) and [B](CRITIQUE-B-2026-09-30.md). The baseline Nielsen review was 25/40; it was not independently rescored after the repairs.

The implemented refinement preserves this identity. Work conditions form three contiguous comparison columns on desktop. A repeated homepage guide-promotion section was removed; each guide remains linked from its relevant selection topic and the guide index. The notation key uses the approved list text. The marking guide's quoted notes template is now a selectable ruled worksheet, with a real same-page inquiry link. Mobile guides retain a collapsed native contents disclosure. Header/menu inquiry actions stay on their current page when that page has a form; privacy routes back to the homepage form.

Mobile explanations are 15px, guide prose and input text 16px, form labels 14px, consent/essential caveats 13px. Fields stack on mobile; instructions persist outside the textarea and expose its 20-character minimum. Operator MB Pinet is named beside the form. Reading actions and FAQ summaries have at least a 44px target. These are niche-specific refinements, not a universal layout for every domain.

Fresh production captures and checks are recorded in [CRAFT-AUDIT-2026-09-30.md](CRAFT-AUDIT-2026-09-30.md). Current local mobile Lighthouse is 88/100/100/100; the earlier 91 performance result remains a historical measurement. This work does not establish a design ceiling or conversion improvement. The style and diagrams are implemented HTML/CSS; no new raster, claim, content approval or public deployment was created.


## Editorial imagery and acceptance update, 2026-09-30

This update supersedes the earlier caption and font-weight instructions. All display headings now use the shipped Barlow Condensed 700; Manrope remains the body font. Four font requests replace six. The original tyre stage remains, with no ImageGen badge. Three topic-specific guide images and one road/field photograph extend the homepage; the guide index reuses the correct previews. Each guide opens with text and image in two columns on desktop and a stacked composition on mobile. These are illustrative editorial assets, never inventory, client-project or construction-proof photographs.

The construction still-life does not assign radial/diagonal labels to tread appearance. The sidewall shows the reviewed 650/60 R38 code; the technical explanation remains accurate selectable HTML. Image source PNGs, brief/provenance limits, immutable WebP dimensions/bytes/SHA-256 and per-URL text-focused exceptions are in [MEDIA-2026-09-30.json](MEDIA-2026-09-30.json) and [media-prompts-2026-09-30.json](media-prompts-2026-09-30.json). Three briefs are not claimed as verbatim generation input. Public media use 1200/800/640/360 px variants; the 800 px quality-75 variant avoids jumping from 640 to 1200 on a 1.75-DPR phone.

[PHASE-1-AUDIT.md](PHASE-1-AUDIT.md) is the current acceptance status. Earlier Lighthouse and critique scores above remain historical measurements, not the current result. Originality/craft is a bounded agent assessment; independent post-repair aesthetic rescoring has not occurred.
