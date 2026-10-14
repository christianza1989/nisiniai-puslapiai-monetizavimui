---
name: MemoryString creator
description: A quiet workbench for preserving memories in thread.
colors:
  canvas: "#f7f5ef"
  paper: "#fffdf8"
  forest: "#164d40"
  forest-hover: "#103c31"
  ink: "#183d35"
  muted: "#52645e"
  outline: "#75877c"
  line: "#d7ded8"
  wash: "#e9ede5"
  copper: "#b57859"
  error: "#8b3d32"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(1.9rem, 6vw, 2.7rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  pin:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "clamp(2rem, 10.5vw, 3.4rem)"
    fontWeight: 600
    lineHeight: 1.1
rounded:
  field: "12px"
  surface: "14px"
  sheet: "24px"
  action: "99px"
spacing:
  compact: "8px"
  field: "16px"
  gutter: "20px"
  sheet: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.action}"
    padding: "0.7rem 1rem"
  button-secondary:
    textColor: "{colors.forest}"
    rounded: "{rounded.action}"
    padding: "0.7rem 1rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0.7rem 0.9rem"
---

# Design System: MemoryString creator

## Overview

**Creative North Star: "Quiet Workbench"**

The owner selected warm ivory, forest controls and copper thread accents. The home screen gives the artwork room; operational screens give the current task priority. Brand and home display text use Libre Baskerville. Functional headings, instructions, controls and large pin numbers use bundled Roboto.

This is the implemented Android phone creator. The 22 concept screens in mobile/design are visual references; real counts, paths, names and progress replace their illustrative values. Whole-screen concept PNGs are never used as app UI. The home illustration is decorative AI art; actual generated previews remain visibly separate.

**Key Characteristics:**

- Warm, flat work surfaces and outlined selections.
- Live thread geometry and a compact diagram beside the instruction.
- Prominent from/to numbers with a complete text alternative.
- English controls, offline assets and manual alternatives to speech.

## Colors

Forest carries primary actions, selection, focus and current pin numbers. Ink carries text, muted carries context, and outline defines control boundaries. Copper identifies the current chord and supplies the brand detail. Small canvas pin labels use ink for legibility. Destructive actions use the error colour with explicit wording.

**The Current Step Rule.** Colour and geometry support the written current connection; they never replace its instruction.

## Typography

Self-hosted variable fonts retain their OFL notices and real weights; font synthesis is disabled. Title and body roles wrap naturally. Project names accept up to 80 characters; older imported names are preserved and wrap. Pins use tabular numerals. The topbar's icon columns retain 48px width when text grows. Narrow library cards put their text below the thumbnail instead of squeezing it into a small column.

**The Readable Number Rule.** Show both pin values, their from/to labels and one complete sentence using the same live sequence.

## Layout

Phone pages use a centred 36rem shell and 20px gutters. At 350px and below, gutters become 16px, editor sliders use two rows, the library changes reading order and quiet guide actions stack. At 800px and above the guide/editor shell can expand to 62rem; the guide uses two columns. Short landscape guide layouts use two columns at smaller widths. Forms and enlarged text may scroll vertically.

The guide diagram is bounded by available screen height. Preview art uses a 38svh cap to leave room for real project details and actions. Android system bars, cutouts and the input keyboard are handled by the native root insets; their pixels are not imitated in HTML.

## Elevation & Depth

Flat tonal surfaces separate controls and supporting notes. A soft backdrop and lifted sheet indicate an interrupted task. Snackbars carry temporary results without becoming part of the permanent layout. No decorated card shadows surround artwork.

## Shapes

Pill actions, round icon hit areas, softly rounded text fields and bottom sheets share one vocabulary. Selection tiles have outlined radio indicators. The recurring circle and pin positions are mathematical, with pin 1 at the top and numbering clockwise. Frame diagrams carry actual declared counts.

## Components

Actions have at least 48px height; icon hit areas have 48px width. Primary, secondary, disabled, focus, selected, loading and error states are implemented. File selection uses the Android system picker. Voice options use one bottom sheet; rename, delete and recovery use protected dialogs. A colour layer cannot begin until the person confirms the thread is ready.

The guide distinguishes the connection currently being made from the completed count. Pressing Done advances and saves the completed count. Voice advancement waits for speech completion and the chosen pause. Navigation, manual changes, colour boundaries and app backgrounding cancel obsolete speech. The library resumes exact saved paths; exported JSON keeps frame, numbering, layers and position.

Motion is a brief view reveal and restrained colour transition. Reduced-motion preferences suppress both. The product currently ships the owner's pinned light palette; a separate dark scheme and tablet experience are not accepted implementations.

## Do's and Don'ts

- **Do** preserve the current instruction, real counts and manual controls.
- **Do** use the bundled font roles and original SVG icon family.
- **Do** draw previews from the actual solver output.
- **Don't** use the AI home portrait as evidence of algorithm or physical kit quality.
- **Don't** seed real-looking customers, activations or machine connectivity into this creator.

Recorded from the current source and Android device captures. Review is sequential, not independent. Phone behaviour and asset integrity are documented in mobile/ACCEPTANCE.md. Physical frame/thread validation, tablet coverage, a complete accessibility audit and measured pixel-for-pixel comp reproduction remain separate limits.

## Partner operations extension — 14 October 2026

The [local operations module](platform/README.md) extends Quiet Workbench in Operate mode. It uses the original brand mark, icons and bundled fonts directly. A forest workspace navigation and ivory work area frame country/studio coverage, action queues, order detail/revision previews, scrollable operational tables and transactional forms. The platform's scope-specific typography/asset and screen plan is in platform/PLAN.md; no second mobile identity or source kit is introduced.

Desktop sidebar widths use rems, while tablet/phone navigation scrolls horizontally. Intrinsic rem-based form/detail columns collapse as text grows. Dense table data stays readable through deliberate horizontal scrolling rather than compressed columns. Roboto uses real 400/500/600 weights and tabular numerals; Libre Baskerville 400 carries brand/display. Normal metadata is at least 14px. Headings, long names, status and actions wrap; primary SVG controls use white icons. The environment bar establishes the synthetic data boundary once and action copy names actual simulation where it matters.

Actual operator/partner/supplier desktop/mobile and adverse screens were reviewed. Main-only overflow checks initially missed enlarged sidebar clipping; the final focused tests include the brand/navigation and measured 200% text with spacing at 1280/768/320px. Initial failures and corrections remain in platform/proof/FIRST-FAILURES.md, with current evidence in platform/ACCEPTANCE.md. This is bounded sequential visual/accessibility review, not a blanket WCAG or physical-equipment certification.


## September fixture follow-up — 14 October 2026

Preserve Quiet Workbench and its existing fonts, colours and text roles. Scope: period banner, truthful cohort labels, daily/partner totals, readable dates/emails/channels and pagination for all orders, stock movements, purchases, commissions and audit. Reuse the existing tables and ledger strip; open supplier actions sort before received records. No new brand, photograph or font family.

Typography plan and result: inspect all ten populated partner overviews, operator monthly/daily lists, supplier demand, inventory, referrals and activity at desktop; inspect overview/order paging at 320px. Inspect measured 32px root/body (normal 16px), line-height 1.5, paragraph spacing 2em, letter spacing .12em and word spacing .16em at 320/1280 through an isolated local QA copy serving the unchanged HTML/JS and actual CSS plus only those user overrides. Initial count-tag/country and large currency metric overflow was retained and repaired: labels wrap, studio rows can wrap, and metric columns follow available text width. Final normal desktop/320 and enlarged/spacing containment pass; tables remain deliberate horizontal scroll regions. The keyboard zoom attempt had no effect and is not evidence. No blanket certification or untested device claim.
