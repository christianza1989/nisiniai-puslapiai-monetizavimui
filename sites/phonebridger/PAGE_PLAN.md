# PhoneBridger inner pages — 2026-10-06

Owner scope: autonomously extend the approved English website through shop, contacts and email/password login/register; creator system deferred. Homepage byte content outside the footer is frozen. Native app, installers, simulator engines, pairing and device geometry stay unchanged. Owner delegates pricing research and decisions, with $8 USD per holder as the supplied acquisition cost. No sale, shipment, payment provider or production hosting is established by that decision.

## Research and decisions

Official current references retrieved 2026-10-06:

| Reference | Evidence / observation | Adaptation |
|---|---|---|
| https://screen.studio/ and /dashboard | Desktop rendered homepage/account; grouped Product/Help/Account footer, compact email-led account form. No account submitted. | Separate learning, downloads and account paths; quiet form-led account screen. Keep our requested email/password rather than copy their email/SSO model. |
| https://symless.com/synergy/purchase | Actual desktop DOM and screenshot: EUR15 Lite/19 Plus/29 Max in this locale, one-time personal purchase, capability tiers and FAQ. | One clear software offer; hardware counts are accessories, not artificial feature tiers. Price comparison is locale/date specific. |
| https://www.vysor.io/ | Official current pricing $2.50/month, $10/year, $40 lifetime; actual desktop/mobile composition inspected at 390px after AX settling. | Trial/beta before purchase. Our edge-to-physical-phone workflow differs from mirroring; no copied iPhone support or native file-drag claim. |
| https://www.sharemouse.com/shop/ | Official text/feature matrix: perpetual usage of covered versions, optional maintenance; price not exposed in retrieved text. | Explain version/maintenance boundaries; do not infer an unknown price. |
| https://www.airdroid.com/pricing/airdroid-personal/ | Official indexed pricing $3.99/month or $29.99/year; broader remote-device product. Text evidence, not visual inspection. | Reject subscription as initial local-workspace positioning; no comparison claiming equivalent capability. |
| https://cleanshot.com/ | Actual desktop rendered homepage and DOM: strong product outcome, product-specific demonstrations, separate licence manager/cloud account/help/legal. | Keep public marketing and account completion distinct. Do not copy their proof, testimonials or guarantees. |
| https://www.twelvesouth.com/products/hoverbar-duo/ | Official $79.99, colour choice, compatibility/specifications and manuals/shipping regions. Actual DOM; screenshot affected by their intrusive overlay. Not the same hardware as our folding mount. | Show finish and inclusions beside the choice. Reject unverified dimensions, shipping dates, warranties and free-shipping thresholds. |

Reference visual views are direct CUA screenshots, not borrowed website assets. Temporary viewport changes need an AX observation before capture/measurement; reading immediately after set initially returned the prior width. This is a tool timing finding, not evidence of inspected mobile. Only measured 390px views count. Further inner-page contact/account review supplements this record. No measured conversion/traffic claims.

## Commercial decision

Agent-selected launch-price hypothesis, USD: App $29; App + 1 holder $49; App + 2 holders $65; App + 3 holders $79. Standalone accessory valuation $20, bundle increments $20/$16/$14. Hardware cost supplied: $8/each, excludes freight, duty/tax, engraving, packaging, QA, returns, support and fees. Proposed app entitlement: one Windows PC and up to three Android phones, one-time V1 licence; future paid major versions not included automatically. This is website pricing configuration, not implemented native enforcement or active paid entitlement.

Illustrative stress test (private, assumptions): 21% VAT-inclusive gross to net, 5% + $0.50 payment allowance, $4 packaging/handling per hardware bundle, $3/holder inbound/engraving allowance, $3 software support/refund reserve. Contribution before acquisition/fixed development: about $19.02 / $19.55 / $20.97 / $20.84 at the proposed bundle prices. Shipping charged separately; actual landed costs/tax obligations unknown. At $8 hardware cost alone the apparent margin would be misleading. Avoid fake crossed-out prices, countdowns, 'best seller' or manufactured scarcity. User authorised pricing decisions, not a transaction or binding new refund policy.

Store presently selects and saves a setup; interest handoff opens the user's email draft. No payment/order placed, stock/shipping/tax unverified. Beta downloads remain freely accessible. Pricing displayed as planned launch pricing until the genuine payment/licence/fulfilment contracts exist. Seller identity and production terms remain launch dependencies.

## Routes and jobs

All new routes nested under existing preview root, static semantic HTML plus shared CSS/native SVG and small JS:

- `shop/index.html`: choose App / 1 / 2 / 3 holders, Black/Silver; large faithful layered product stage on left, tactile selector/summary on right, live price/inclusions, save setup and email-interest handoff, beta/support alternatives.
- `contact/index.html`: select reason, collect only useful context; prepare editable email draft to approved hello@phonebridger.com. Clear 'opens your email app, send there' status, no fake submitted success or reply-time promise.
- `help/index.html`: readable task index; Wi-Fi pairing, USB preparation, permissions, limits, short local diagrams, source-faithful instructions.
- `downloads/index.html`: exact existing Windows/Android release metadata and links, setup path, signing/permission caveats. No new package builds.
- `about/index.html`: explain physical-phone mechanism and present beta, no invented team, certifications or results.
- `privacy/index.html`: factual website local-data/email/account behaviour; production operator/hosting/legal review dependency. Do not invent compliance certification.
- `terms/index.html`: current beta/preview and no-order limits; planned pricing/major-version policy clearly prospective, not a full invented sale agreement.
- `login/index.html`, `register/index.html`: email/password only, visible labels/autofill, show password, native validation, pending/server errors; no social auth.
- `account/index.html`: minimal authenticated account identity/session/logout and saved setup; no creator data/dashboard/payouts.
- `recover/index.html`: real current recovery route through support; no fake emailed reset link until an actual mail token provider exists.

Account architecture: no existing customer auth API in shared core (ChatGPT infrastructure auth is a different job). Implement one isolated loopback account adapter using built-in cryptographic password hashing, server sessions, same-origin guards, bounded input/rate limits and private storage outside public/static exports. Local account test data is isolated; no browser password store. Frontend failure when no adapter is present remains clear. Hosted deployment/verification/recovery provider are separate integration gates. Keep adapter reusable as one module instead of duplicate implementations.

## Visual direction / asset inventory

THESIS: buying a desk arrangement is one simple choice; the physical product stage and live configuration form are its focal point. Do not repeat the homepage's many feature cards.
OWN-WORLD: existing self-hosted Manrope, charcoal #101114, near-white text, pink #ff2d9a emphasis/action, lime limited to platform/completion accents. Fine borders, soft contact shadows, quiet readable form surfaces.
STORY: choose → understand inclusions/compatibility/planned cost → save or ask → try beta; support and account stay findable.
FIRST VIEWPORT: inner-page nav Home / Shop / Help / Contact / Account; shop headline followed by two-column product stage and chooser; mobile stage then full-width controls and summary.
FORM: established-world extension selected autonomously from product stage + inline configuration, comparison grid and editorial offer list; product stage chosen for variants with only four meaningful packages. Concept is agent-selected, not owner-approved.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Reuse exact `assets/closing-conversion-v1/software-package-pink-v1-*`, Black/Silver holder derivatives and photographed background; quantity repeats one master at equal scale, no new inconsistent holder generations. Existing brand-mark.svg, Windows/Android SVG and fonts; new exact native stroke SVG for bag/mail/eye/arrow/download/help/profile. Complex visual exploration uses one ImageGen shop concept; concept pixels/text are not production assets. Contact/auth/help/legal no-image decisions where live forms/prose do the job. Generated concept and prompts private; production masters retain existing provenance.

## Acceptance

Real routes/return paths, decoded product layers and variant changes, app-only hides irrelevant finish, live total/inclusions, localStorage setup only (no credentials), email handoff actual mailto, invalid/pending/error/account register-login-logout/private access checks, no fake payment/recovery messages. Relevant 1280/1024/768/390/320 widths, mobile menu/keyboard/focus/reflow/reduced motion and full-page/footer inspection. Record desktop/mobile visual judgement independently from assertions. Preserve hash of every old runtime file; only index footer allowed to differ. Scoped Git snapshot/whitelist includes routes but excludes source/accounts/stores/test data; noindex/private serving preserved. No production launch or demand claim.
