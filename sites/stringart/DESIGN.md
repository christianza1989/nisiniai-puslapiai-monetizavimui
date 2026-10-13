---
name: MemoryString creator
description: A quiet workbench for making one connection at a time.
colors:
  forest: "#164d40"
  forest-hover: "#103d32"
  canvas: "#f7f5ef"
  paper: "#ffffff"
  ink: "#182c26"
  muted: "#52635b"
  line: "#d6ded5"
  wash: "#edf1e9"
  focus: "#a35724"
  error: "#a02e25"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.55
  pin:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
rounded:
  control: "8px"
  surface: "12px"
spacing:
  small: "8px"
  field: "16px"
  surface: "24px"
  workspace: "40px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  reader:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: MemoryString creator

## Overview

**Creative North Star: "Quiet Workbench"**

The creator uses a warm canvas and forest controls around the actual generated artwork. Its character is calm and practical: a device sits beside a numbered frame while the person works. White work surfaces distinguish settings and current instructions without competing with the thread preview.

The current connection receives the largest numbers. The preview, text alternative and manual controls remain understandable together. This is the implemented local creator's visual system; the paused sales site and partner platform have no accepted visual implementation.

**Key Characteristics:**

- Flat tonal surfaces.
- Prominent current pin numbers.
- Native geometry and device typography.
- Responsive wrapping and visible focus.

## Colors

### Primary

Forest marks the current stage and principal action. Its deeper hover shade provides a small, immediate state change.

### Neutral

Canvas surrounds white paper work surfaces; ink carries instructions, muted text carries context, and line/wash separate or soften controls. Focus and error colours are functional signals rather than alternate brand themes. Normative values are in the frontmatter.

**The Current Step Rule.** Use the forest emphasis to clarify the selected stage and current task.

## Typography

One native device family serves the operational app, with actual 400/600/700 weights and font synthesis disabled. The body role supports prose up to 70ch; hints use the smaller utility scale and 1.5 line height. Headline size becomes 1.75rem on the mobile breakpoint. Pin numbers retain the fixed rem size and tabular numerals. Long project titles wrap anywhere.

**The Readable Number Rule.** Keep both the from-pin and to-pin labels beside their values and retain a full text instruction.

## Layout

The desktop main container is 1,248px including side padding; studio/guide use two columns with a generous workspace gap. At 760px and below, views stack with 16px outside padding. The mobile guide's overview is 160px wide, making room for instructions. Export remains available through My projects; the desktop guide has an additional shortcut.

At 400px and below, reader buttons fit automatically into columns of at least 6rem, stacking when enlarged text needs more width. Pin groups wrap without clipping. Header, stage navigation and project actions wrap naturally. Text enlargement and spacing are supported by the shipping CSS; the preview server's QA query only supplies the test override.

## Elevation & Depth

Flat tonal layering separates canvas and white work surfaces. No shadows are used. The result is an unobstructed workspace around the generated line art.

## Shapes

Controls use gently curved corners; workspace/reader surfaces use a slightly softer corner. The recurring circular frame, pin dots and current chord are real instruction geometry. The mark is our own simple ring-and-thread vector.

## Components

Primary and secondary buttons share a minimum 48px height, visible three-pixel focus ring and restrained hover. Disabled controls dim and stop accepting input. Inputs have labels, flexible width and native range/file interactions. Stage navigation uses forest for the active stage.

The guide combines an overview, clearly separated from/to numbers, progress and manual controls. A faint complete preview supplies orientation; completed spans and the current chord convey state. Narration settings sit below the manual controls. The project library wraps long names and supplies continue/export/delete actions. Errors use text and a distinct surface, never colour alone.

Motion is limited to a short view reveal and control-colour transition; reduced-motion preferences suppress them.

## Do's and Don'ts

- **Do** keep the current pin pair and its text instruction prominent.
- **Do** preserve wrapping, visible focus and manual alternatives to speech.
- **Do** use generated geometry as actual artwork evidence within the creator.
- **Don't** present the synthetic sample as a real customer portrait or machine result.
- **Don't** replace readable state labels with decorative symbols alone.

Recorded inline from mobile/index.html, style.css and actual browser views on 13 October 2026. The detector's cream-palette warning is an intentional material choice, not a clean detector PASS. Physical-phone and complete WCAG acceptance remain unverified; these limits are not visual-system rules.

The owner subsequently selected the warm ivory/forest/copper screen concept. Its 22 separate screen references, precise copy and prepared asset pack are in [mobile/design](mobile/design/README.md). That future visual system uses bundled Roboto for operations and Libre Baskerville for the brand/home, larger pill actions and a compact guide. It is recorded separately because it has not yet replaced the implemented prototype described above.
