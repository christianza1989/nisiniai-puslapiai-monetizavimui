---
name: PhoneBridger guides
description: A readable extension of the selected PhoneBridger identity
colors:
  charcoal: "#101114"
  card: "#19191f"
  text: "#f7f7fa"
  muted: "#bcb4c3"
  prose: "#c7c1d0"
  pink: "#ff2d9a"
  prose-link: "#ffacd5"
  line: "#4a414e"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(36px, 4.8vw, 64px)"
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  article-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px, 4.3vw, 54px)"
    lineHeight: 1.16
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  image: "16px"
  mobile-image: "14px"
  mobile-toc: "12px"
spacing:
  card: "24px"
  hub-gap: "20px"
  article-gap: "64px"
---

# Design System: PhoneBridger guides

## Overview

**Creative North Star: the phone beside your PC, explained clearly.** This is an established-world **Read** extension. It inherits the selected homepage's charcoal, self-hosted Manrope, pink emphasis and authored SVG controls. It changes reading density and navigation for setup questions; it does not replace the homepage identity or establish a new visual world. The parent [DESIGN.md](../DESIGN.md), [PRODUCT.md](../PRODUCT.md) and [PAGE_PLAN.md](../PAGE_PLAN.md) remain authoritative for their existing surfaces.

The guide-specific direction contract is an agent decision documented from the implemented extension, not a retrospective claim of owner approval or a new-world seed exercise:

- **THESIS:** one setup question receives a direct answer, sequenced instructions, known limits and a useful next step.
- **OWN-WORLD:** keep the selected dark desk material, charcoal ground, Manrope and pink continuity. Contextual photography supports the topic; live English text and native vector controls carry exact instructions.
- **STORY:** choose a task → understand the immediate answer → follow the steps → check the failure case → consult a scoped primary source or ask support. The hub leads with first pairing, then connections, permissions and physical placement.
- **FIRST VIEWPORT:** the hub begins with a two-line setup invitation and the first guide. Articles begin with breadcrumb, descriptive title, answer, organizational/date context and a labelled topical image. The editorial page begins with responsibility and method.
- **FORM:** desktop uses a featured first guide beside three compact task cards, then a quiet support handoff. Articles use a TOC beside a bounded reading column; tablet uses balanced image cards and narrow screens move navigation into document flow. The editorial page is prose-led without decorative imagery.

**QUALITY BAR:** TYPE must use loaded Manrope with clear title/body hierarchy; MATERIAL must show decoded topic-relevant 3:2 scenes with visible subjects; GROUND must preserve the selected charcoal and restrained pink. A reader must find each guide's answer, steps, limits, sources and next links without interpreting ornamental labels. At 768px the hub must have four balanced vertical cards in two columns, without the original empty featured-column void or narrow crops concealing cable plugs/lock. At 390/320px it must stack naturally, retain reading order and avoid horizontal overflow. Inline prose links need a visible underline and keyboard focus must remain clear. Quiet motion suits reading; no ornament or new identity is required to satisfy this bar.

**FINISH:** documentation, editable sources, raster provenance and actual review evidence belong to the result. The initial independent review returned `fix`; its tablet framing and uppercase-label findings are implemented in source. Final confirmation remains a separate recorded review, not an assumed PASS. See [README.md](README.md) and [finish-review.md](../qa/knowledge-v1/finish-review.md).

## Colors

Pink marks the second hub headline, guide arrows, list markers and links. Charcoal carries the page; slightly lighter cards and fine borders separate tasks. Near-white is for headings, muted text for summaries/context and the brighter prose-link tone for actionable text. Color supports hierarchy rather than replacing words or link decoration. Existing lime remains an inherited platform/completion accent; the guides do not introduce a new lime motif.

## Typography

Use the inherited locally served Manrope family (400/600/800 files). Broad, tight headlines preserve brand continuity; article prose uses generous leading. The desktop reading column is bounded to 740px, with body text at the frontmatter role. At narrow widths prose becomes 15px with 1.85 leading, while headings remain clearly larger. Supplemental metadata is smaller than prose; keep it secondary and readable. Do not add repeated uppercase eyebrows above card headings: the task titles already name their purpose.

## Layout

Inherit the shared shell: maximum 1240px with desktop gutters, and the shared sticky header/footer. The desktop hub has two unequal columns (1.12fr/1fr); its first card is vertical and the other cards pair image and copy. From 761–1000px all four cards become vertical with proportional 3:2 imagery in a two-column grid. At 760px and below the hub is one column.

Articles use a 230px TOC and reading column with the documented article gap; below 1000px the TOC is 200px and the gap is 36px. At 760px and below the TOC becomes a normal-flow native disclosure above the prose. The inherited document scroll padding and heading scroll margin clear the sticky header for anchor jumps. Preserve ordinary page scrolling and the inherited reduced-motion behavior.

Every article hero retains its full 3:2 scene. Width/height, responsive srcset/sizes, decoding and loading priority come from actual imported media. The hub may use compact desktop crops; tablet/mobile must preserve the meaningful subject. Related guides stack earlier than the main article. Check full pages through the footer, not only the first viewport.

## Elevation & Depth

Depth comes mainly from tonal surfaces, fine borders and the photographed scene. The support panel has a restrained rose radial tint; cards do not need floating shadows or animation. Images provide material detail while HTML remains quiet enough for long reading.

## Shapes

Images and hub cards have gently rounded corners; the mobile TOC has a smaller rounded frame. Keep borders fine and consistent with the inherited form language. SVG arrows and shared controls stay editable. Do not rasterize navigation, text or exact permission instructions.

## Components

- **Task card:** one linked title, summary, topical image and reading time. Its decorative image link is removed from tab order; the title supplies the keyboard destination. No redundant category eyebrow.
- **Article:** breadcrumb, one H1, direct answer, honest preparation/review context, figure/caption, headings/lists, scope/source notes and related task links.
- **TOC:** native open details/summary plus section links; sticky only when enough width exists. “All guides” supplies an explicit return path.
- **Inline link:** brighter prose tone, underline and offset; inherited focus ring plus guide-specific focus treatment. Titles/navigation may use their own established link presentation.
- **Support handoff:** asks for visible status and app versions, cautions against sending secrets, and links to the existing contact workflow. It does not claim that email was sent.
- **Editorial profile:** centered reading column, organizational attribution, AI assistance, checking method, illustration limits and corrections. It needs no fictional expert portrait.

## Do's and Don'ts

- **Do** inherit the pinned homepage identity and preserve its source outside the authorized footer region.
- **Do** retain source-scoped beta limits, organizational attribution and the distinction between preparation and public publication.
- **Do** keep original PNGs/prompts private, use the shared imported WebP families, and preserve their ledger hashes.
- **Don't** imply that generated scenes prove customer use, hardware stock, certified compatibility or measured performance.
- **Don't** turn guide work into cursor tuning, native input changes, a transport-specific feature, or a simulator rewrite.
- **Don't** equate local visual/technical checks with launch approval, accessibility conformance, search rankings, AI citations or product demand.
