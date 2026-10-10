---
name: Madbeauty services directory extension
description: Illustrated /paslaugos surface within the incumbent black/white/violet DM Sans identity
colors:
  ink: "#111114"
  paper: "#ffffff"
  accent: "#7040e8"
  soft: "#f1edff"
  illustration-field: "#faf8ff"
  illustration-field-alternate: "#f6f2ff"
  category-border: "#e7e1f2"
  category-border-hover: "#b598f0"
  search-border: "#dcd4ef"
  caption: "#665d76"
typography:
  display:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 62px)"
    fontWeight: 850
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 750
    lineHeight: 1.22
    letterSpacing: "-0.025em"
  caption:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.6
rounded:
  search: "12px"
  panel: "16px"
spacing:
  category-gap: "18px"
  category-gap-mobile: "12px"
  hero-gap: "40px"
components:
  category-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  guide-panel:
    backgroundColor: "{colors.soft}"
    rounded: "{rounded.panel}"
    padding: "26px 32px"
---

# Design System: Madbeauty /paslaugos addendum

## Overview

2026-10-10. This is an ordinary extension of the incumbent identity documented in [DESIGN.md](../DESIGN.md). The human selected the [illustrated services concept](../design-previews/services-20261010/services-concept-v1.png), then requested transparent assets and implementation. The existing black/white/violet palette, DM Sans, wordmark and platform navigation remain the visual authority. The earlier serif/coral/sage entries in DESIGN.md remain historical records.

The surface uses fine black and violet illustrations to make fourteen actual service categories recognizable, followed by their established procedure routes and a guide link. Its task and composition contract remains in [SURFACE.md](SURFACE.md); this addendum records the implemented visual mechanics and reusable representation. The extracted frontmatter applies to this surface only; shared primitives still come from [tokens.css](../prototype/public/tokens.css), with implementation in [services.css](../prototype/public/services.css) and [catalogue-page.mjs](../prototype/catalogue-page.mjs). It does not redefine the global design world or require a new global `.impeccable/design.json`.

**Finish disposition:** the scoped reviewer handoff says **ship**, with no material blocker. That verdict covers four content-area viewport captures and the desktop full-page composition. The documentation pass visually compared the selected concept with these exact local evidence files:

| Evidence | Scope compared |
| --- | --- |
| [desktop-final.jpeg](../cloudflare/output/services-release-20261010/desktop-final.jpeg) | Desktop first viewport, nominal 1440px class |
| [mobile-final.jpeg](../cloudflare/output/services-release-20261010/mobile-final.jpeg) | Mobile first viewport, nominal 390px class |
| [narrow-final.jpeg](../cloudflare/output/services-release-20261010/narrow-final.jpeg) | Narrow mobile first viewport, nominal 320px class |
| [tablet-final.jpeg](../cloudflare/output/services-release-20261010/tablet-final.jpeg) | Tablet first viewport, nominal 820px class |
| [desktop-round1.jpeg](../cloudflare/output/services-release-20261010/desktop-round1.jpeg) | Earlier full-page desktop evidence: all fourteen categories, guide panel and existing footer |

Viewport class labels describe the browser test widths, not the JPEG pixel widths. The full-page capture precedes the final hero sizing confirmation; it proves that earlier full composition, while the final captures are the current first-viewport comparison. Invalid captures from the full-page timeout/sizing incident were excluded as recorded in SURFACE.md. This review does not establish every search state, every category route, the entire site shell, production acceptance, Lighthouse performance, physical zoom or assistive-technology behavior.

Separate release evidence belongs in [RECEIPT.json](RECEIPT.json), maintained by the release workflow. The release handoff reports live deployment `fd24248a`, 104 HTTPS checks, all seventy-six variant byte comparisons and all fourteen categories passing, with the user's own account, data and bindings preserved. Those release checks do not certify the entire platform or broaden the visual review scope above.

Pre-existing documentation drift remains: PRODUCT.md's local capability description and older PRODUCT/DESIGN acceptance entries have a narrower or historical scope than the current platform. They were read as context and preserved, not treated as fresh acceptance evidence or rewritten by this surface task.

## Colors

The incumbent ink, white, violet action color and pale violet surface are reused. Category art alternates between two near-white violet fields; the card copy rests on white. This tonal distinction keeps the transparent drawings legible without turning each category into a separate brand color.

The category outline and its stronger violet hover outline define the link boundary. Search has a slightly stronger pale violet outline; category captions use the scoped muted violet-gray. Other supporting text colors are local CSS values, not newly promoted global tokens. Selection within the page uses a pale violet highlight (`#e5d8ff`) with dark violet text (`#261342`).

## Typography

DM Sans comes from the existing self-hosted variable font and inherited Arial/sans-serif fallback. The directory adds no typeface. Its title is heavy and tightly spaced; the rendered black title, restrained supporting paragraph and violet search button carry the first-view hierarchy.

The display role uses the frontmatter clamp on desktop; mobile fixes it at (38px), dropping to (34px) at widths of (360px) or less. Supporting hero copy is (19px, line-height 1.55, maximum 52ch), becoming (16px) on mobile. Section headings are (30px), becoming (25px). Category titles use the frontmatter desktop role, then (18px) on mobile and (16px) at the narrow breakpoint. Category captions become (12px, line-height 1.55) on mobile. Text remains live HTML; illustration files contain no interface labels.

## Layout

The directory inherits the app container: maximum (1280px) with total width subtraction (96px), changing to (48px) at (1050px) and below and (32px) at (760px) and below. The existing page/header spacing comes from [app.css](../prototype/public/app.css).

Desktop hero copy and art use two flexible columns (1.35fr / 1fr), the frontmatter hero gap and centered alignment. The art slot and image are explicitly (270px) high; the image uses `object-fit: contain`, which preserves the full transparent composition. At (761–1100px), both become (220px). At (760px) and below, the hero becomes one column with (10px) gap and a (150px) art slot below the copy/search. The hero's lower margin changes from (42px) to (26px).

The category grid has four columns on desktop, three at (761–1100px), and two at (760px) and below. All columns use `minmax(0, 1fr)` and cards/copy use `min-width: 0`. Desktop art slots are (190px) high with (12px 24px) padding; mobile slots are (140px) with (10px 12px) padding, reducing to (120px) at the narrow breakpoint.

For the complete fourteen-card directory, the last two desktop cards each span two columns and use a horizontal art/copy arrangement; their art is (43%) wide and (175px) high. This selector is conditional on the complete fourteen-item grid. Filtered subsets use normal cards. Tablet/mobile restore the final two cards to normal single-column cards. Category copy flexes vertically, with space reserved below for the arrow, so different label lengths wrap without covering the action cue.

The guide panel follows the grid with (28px) top margin. Desktop uses a flex row with copy, link and a botanical art slot (160px × 90px). Tablet reduces the art width to (100px); mobile uses a two-column grid with a (65px × 80px) botanical slot beside copy and the link on the next row. Procedure results below a search use two columns on desktop and one on mobile.

## Elevation & Depth

The added directory panels are flat at rest: no new panel shadow, gradient backdrop or animation. Fine borders, pale fields and whitespace separate the art from the copy. The drawn assets have shading within the depicted objects; that is raster illustration detail, not a CSS elevation token. Existing shared button hover/active behavior and reduced-motion rules remain in tokens.css.

## Shapes

Category, guide and empty panels share gently rounded corners from the panel token. Search input and button share the search radius. Category panels clip their internal fields to the outer shape, while `object-fit: contain` keeps the complete illustration within its slot. The restrained arrow and search glyph are inline native SVG with (1.7px) strokes; navigation arrows render at (22px × 22px).

## Components

### Illustrated category link

The whole category panel is one anchor to the existing `/paslaugos/<taxonomy-id>` route. It contains a decorative art region, live category heading, the first three child taxonomy labels and a violet arrow. Its hover changes the border; focus uses a visible violet outline (3px, offset 4px). The text supplies the meaning, so the image uses empty alt and its art wrapper is `aria-hidden`.

### Directory search and results

The search form uses GET `/paslaugos`, parameter `q`, a native search input and the incumbent violet button. A visually hidden label retains the full question “Kokios paslaugos ieškai?”; the form also has a search landmark label. The wrapper receives a violet focus-within outline (3px, offset 3px). The input has no separate outline, so the wrapper is the visible focus treatment.

Queries are trimmed and capped at (80) characters. [taxonomy.mjs](../prototype/taxonomy.mjs) normalizes Lithuanian case/diacritics and matches all query terms against category paths and aliases within the core taxonomy. Matching categories retain their illustrated links. Related non-category procedures link to their established routes, with up to twelve displayed. A query exposes a clear link back to the full directory; an empty result provides a status message, examples and a full-directory action. [app.mjs](../prototype/public/app.mjs) handles the client navigation to the same query URL with `#kategorijos`; the rendered form retains its GET contract.

At the reviewed (320px) width the placeholder's final characters are slightly clipped. The full hidden accessible label remains intact. The reviewer treated this as a minor observed limitation, not a material ship blocker. That source inspection does not substitute for a screen-reader test.

### Guide panel

The guide link opens the existing `/gidai` destination. The pale violet panel carries the copy and a decorative transparent botanical drawing. Its link remains underlined, with a geometric arrow; on mobile it moves to a full-width second row.

### Transparent asset family and reuse

[ASSET_INPUTS.json](ASSET_INPUTS.json) stores exact prompts for sixteen individually generated masters: fourteen category drawings, `services-hero` and `services-guide`. The retained originals live in [services-assets-20261010/originals](../design-previews/services-assets-20261010/originals/). [ASSET_MANIFEST.json](ASSET_MANIFEST.json) records dimensions, alpha checks, SHA-256 hashes and seventy-six WebP derivatives. The importer asserts an alpha channel, non-opaque content and alpha minimum (0) for every master, then checks derivative alpha preservation.

The representation is a transparent raster PNG master plus responsive transparent WebP family; “vector-like” describes the drawing style, not an SVG source. [import-assets.mjs](import-assets.mjs) calls the shared `optimizeRaster` pipeline from `content-studio/src/image-pipeline.mjs`, without upscaling. Width families include (360px), (640px), (800px), eligible (1200px), and a capped/original-size largest variant; narrower masters omit sizes they cannot supply. Shapes and white/pale backgrounds belong to CSS, not baked image rectangles.

[services-media.mjs](../prototype/services-media.mjs) maps each asset to its variant files/dimensions, alongside the existing public media registry. The renderer emits `srcset`, intrinsic width/height, `decoding="async"` and slot-specific `sizes`: category `(max-width:600px) 42vw, (max-width:1100px) 28vw, 290px`; hero `(max-width:760px) 90vw, 480px`; guide `180px`. These are the current source hints, not a claim of optimal network selection at every intermediate width. The preferred fallback source is the (640px) derivative. Hero is eager/high priority; other illustrations are lazy.

[provenance.mjs](provenance.mjs) invokes the pinned prompt-provenance tool: exact prompts are embedded inside the PNG masters, while WebP prompts are retained in adjacent versioned `.webp.json` sidecars. The WebP binary bytes do not contain embedded prompts. Pixels and alpha remain unchanged; the manifest retains file hashes, and the separate live release checks compare all seventy-six WebP byte hashes. Source sidecars are committed as provenance records and are not served as public assets. Reuse the full family through the map and preserve the PNG embedded prompts and versioned WebP sidecars when importing or replacing it; do not publish a whole-page concept raster as a runtime asset. These drawings illustrate service categories and do not represent real provider work, offers, prices or availability.

## Do's and Don'ts

- **Do** keep the incumbent identity, shared font/button primitives and existing route facts when extending this directory.
- **Do** keep illustration alpha, `object-fit: contain`, intrinsic dimensions and live taxonomy labels together.
- **Do** compare the final desktop/mobile content captures and the full grid when changing slot sizes or card structure.
- **Don't** apply the two wide ending cards to filtered subsets or tablet/mobile layouts.
- **Don't** promote this page's illustration arrangement into a global requirement for other Madbeauty surfaces.
- **Don't** treat the scoped ship verdict, earlier acceptance entries or generated concept text as production or whole-platform acceptance.
