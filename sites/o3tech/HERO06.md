# Owner-selected homepage hero06 · 2026-10-30

The owner selected variant06 from the second set, which preserves the complete four-circle image: “padaryk vinas prie vieno 06”. The visual reference is [variant06](https://o3tech-perziura-20261030.pinet-azprekyba.workers.dev/hero-variantai-su-paveiksleliu/06/), first published in preview Worker version56a235b1-7e6a-46bc-8641-a3265efafba9. This selection replaces the homepage hero presentation only.

The native site renderer now uses the same split title, four original paragraphs, product/contact actions, gradient, framed panel, image size and responsive layout. Styles are scoped to `.o3-hero-06` in companion `components/niche/o3tech-hero06.css`; the chosen decorative artwork is `public/brand/o3tech/hero-circles.png`. Its SHA-256 is `5e523b37fe9b949ccc47bda3bbd70c37ec70dfbe010ef798de6e09efafa895bf`, exactly matching the owner's PNG. No image recolouring, cropping, replacement or generated content.

Acceptance:

- All23local routes return200; text outside the hero is unchanged. All4hero paragraphs match the selected reference, including original inline links. Only the reference's two navigation actions are added.
- At1440×1000,1024×768 and390×844, the12sampled hero elements have identical bounding rectangles and computed typography, spacing, colours, backgrounds, borders and layout after fonts finish loading. No horizontal overflow. Initial measurements made during font loading are retained as unqualified evidence, not treated as design defects.
-303/303public tests pass. No real form submission or email test was performed in this continuation. The retained loopback preview was restarted with its existing private mail configuration; the Cloudflare static export continues to block all form submissions.

Private screenshots and full receipts: `private/hero06-adoption-20261030/`. The source PRs remain separate from native content approval/release and actual-domain deployment. This is the owner-authorized Cloudflare review copy; WordPress, DNS, other page presentations and shared Core rules are unchanged. The earlier remote-viewing artifact case was closed without a Core rule change at the owner's instruction.

## Subsequent owner refinement: smaller and balanced hero

The owner then requested a shorter left panel, a taller image to align the two, and a lower overall hero. This supersedes the initial exact-reference geometry above for the current homepage, while retaining the 06 identity, all copy and the unchanged image. At 1440 and 1280 px, the panel and square image are each 520 px tall with identical top/bottom coordinates, and the hero is 600 px instead of 818 px. Compaction uses spacing and line-height adjustments; body font sizes and image aspect ratio remain. At 1024 px the layout stays fluid; at 390 px the existing readable stacked presentation is preserved, with no overflow. CSS parsing and rendered checks at 1440/1280/1024/390 qualify this bounded stylesheet change; previous 303 tests/TypeScript belong to the prior renderer revision and were not rerun for a CSS-only refinement. Receipts: `private/hero06-balance-20261030/`.
