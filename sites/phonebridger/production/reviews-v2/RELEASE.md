# Reviews carousel interaction repair — 11 October 2026

The human requested working automatic rotation and proportional horizontal wheel/mouse/touch scrolling on the existing homepage carousel. This explicitly authorizes this bounded homepage interaction repair.

## Behavior

Continuous fractional card position follows drag distance without the old one-card clamp. Recent release velocity projects a short decelerating fling capped at six additional cards, then settles to a card. Wheel input accumulates pixel/line/page deltas; trackpad momentum is consumed without adding a second fling. RAF controls easing with no competing CSS transform transition. Vertical touch and pinch zoom remain browser-owned, Ctrl-wheel is untouched. Buttons/keyboard and both loop seams remain usable.

Autoplay uses a 6.5–10.5 second reading interval. It pauses over the reading stage, during keyboard focus, direct interaction, explicit pause, hidden/offscreen state or reduced motion. Mouse clicks no longer leave an indefinite focus pause; explicit Play works while its button retains focus. Autoplay never announces every card to a screen reader.

## Validation and publication

Meaningful browser acceptance: weak/strong wheel advances 1/4 cards, slow/fast mouse drag 2/5, slow/fast CDP touch 1/3. Pixel/line/page modes, zoom, vertical touch page scroll, pointer cancellation, keyboard, forward/back loop, autoplay/hover/focus/user pause/resume, mouse-focus recovery, offscreen and reduced motion PASS. Desktop 1280 and mobile 390 captures inspected; no mobile body overflow. Touch evidence is browser emulation, not physical-phone testing.

Local preview has a pre-existing unrelated app.js:63:48 privacy-handler null error, documented separately. Canonical https://phonebridger.com/#reviews browser acceptance has zero browser errors, including zero legacy errors.

Reproduction: node design/source/reviews-v1/check-scroll.cjs in the PhoneBridger checkout; REVIEWS_TEST_URL=https://phonebridger.com/#reviews selects hosted acceptance. Private generated reports/screenshots are under homepage/.impeccable/reviews-scroll.

Two-file production overlay is sites/phonebridger/production/reviews-v2, exported by production/source.mjs and consumed explicitly by dedicated core deploy/phonebridger/build.mjs. Prototype byte attestations remain unchanged. Artifact comparison shows ONLY assets/reviews-v1/section.js and section.css changed; routes, approved content and installer hashes unchanged. No DB migration, accounts, commerce, affiliate, DNS, mail or native changes.

Previous Worker fef51fad-ab14-4718-a3bd-03e24ca9844b.
Published Worker 6f8c9fbf-e07d-4918-9b80-e9ecc0533743.
Canonical fetched assets match exact source SHA-256:
- JS c42603182087914b5861141dee8f8ea389063dda56c6f2420ab78bf49e8bee11
- CSS 4968c64ef4c30fff7fa5e54c97f5ba6cd59a0709590ce567ba06a05ac7d39845

Rollback is application rollback to the previous Worker version, preserving data; no database restoration required. Bindings, affiliate live flag, routes and cron were checked before deployment and preserved.

## Build lesson

productionSource is invoked only for HTML/JS in the incumbent build. CSS interaction overlays must be consumed explicitly by the build; adding a CSS branch inside productionSource alone has no effect. An artifact diff caught this before publication. Keep the prototype frozen and override only explicit reviewed asset paths.


## Follow-up: continuous auto motion and native vertical wheel

Human reported autoplay still appeared inactive and requested no incidental mouse scrolling. Supersedes the discrete reading interval above: autoplay now moves continuously at one card per eight seconds, starting/resuming after 700ms. Hover freezes the reading stage immediately; leaving resumes, and pointer clicks cannot leave a persistent focus hold. Keyboard focus, explicit pause, hidden/offscreen state and reduced-motion preference still pause. Hidden/offscreen stops preserve fractional position. data-rotation exposes the current pause reason for diagnosis; autoplay stays silent in the live region.

Ordinary vertical wheel remains native page scrolling. Only horizontal trackpad or deliberate Shift-wheel rotates proportionally. Slow/fast drag and touch flings remain proportional, with native vertical touch/pinch preserved.

Local and canonical acceptance PASS: visible autoplay within two seconds, immediate hover hold and leave recovery, keyboard hold/exit, Play with retained focus, pointer focus recovery, offscreen, reduced motion/exit, silent autoplay; ordinary real wheel scrolls page without rotating, pixel/line/page horizontal deltas and Shift-wheel handled, Ctrl-wheel untouched, loop and cancellation verified. Canonical weak/strong horizontal wheel 1/4, slow/fast mouse drag 2/4, slow/fast browser-emulated touch 1/3. Zero canonical browser errors. Separate wall-clock canonical browser check measured 58.47px movement over 2.2s, then no movement during 800ms hover hold. Desktop/mobile captures reviewed. Physical phone testing is not claimed.

Artifact diff: only assets/reviews-v1/section.js changed. Routes, release metadata except generatedAt, content, approved installers, CSS, Worker bindings/vars/cron preserved. Current published Worker 1ed6fa86-661a-49b4-9dec-7fb05e7a84e8; previous/rollback target 6f8c9fbf-e07d-4918-9b80-e9ecc0533743. Canonical JS bytes match SHA256 4bc9f2209e1dedfe66b24a80da62f80a075f7ce65456224b9b472033b603f098.
