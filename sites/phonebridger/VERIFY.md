# Integration verification — 2026-10-05

Environment: Windows, Node24.19.0/npm11.17.0, fresh sibling GitHub checkouts.
Private base: 0544d6a; core base: bb0a0e5. Implementation PRs are unmerged.

| Check | Actual result |
| --- | --- |
| Runtime snapshot byte verification | PASS: 140 served files + 6 private test/licence files, 64,121,430 bytes |
| Source simulator preservation | PASS: every non-HTML snapshot entry retains source SHA256; immutable Git attributes prevent LF/CRLF rewriting |
| Simulator VM tests | PASS 55/55 |
| Shared studio suite | PASS 25/25, including English locale, unchanged defaults and invalid input before write |
| Core suite | PASS 48/48, including HTTP preview/ranges/isolation/hash checks and absent companion |
| Studio bootstrap twice | PASS: phonebridger/en/planning; second call unchanged |
| Draft inspection | One homepage, status draft, approval null, publishedRevision null |
| Existing content compilation | PASS: 9 approved packages; PhoneBridger absent |
| Production Vinext build | PASS after documented clean-clone prerequisite repair |
| TypeScript | PASS, npx tsc --noEmit |
| ESLint | PASS (0 errors, 18 existing warnings); changed core files separately clean |
| Existing nine-site production SEO smoke | PASS: 96 public pages, robots/sitemap/LLM/schema/host/media/404 checks |
| Actual dev/production adapter smoke | PASS: all 140 assets, both MP4 ranges, public-host denial, prototype absent from production/dist and content registry |
| Browser desktop at 1265px | English; no broken loaded images, no horizontal overflow, no console errors |
| Browser media | Relax 180.013s, Kato 180s; Play/Pause and Next keyboard actions verified |
| Core-served creator UI | Payouts view and desktop Chrome reopening verified through keyboard controls |
| Exact staged safety | PASS: both repositories, zero findings |
| Fresh Git checkout (e88b1da) | PASS: all146 byte hashes and55/55 simulator tests, with no dependency on original source directory |

Actual core preview: http://127.0.0.1:5188/__projects/phonebridger/
Own production smoke server: http://127.0.0.1:5189 (stopped after testing).
Screenshot: [core-preview.png](qa/core-preview.png).

Exact staged-blob safety passed for 164 companion files / 64,335,570 bytes and
8 core files (final documentation is rechecked before commit). New authored
files pass diff whitespace checking. The copied Manrope OFL line21 retains
one upstream trailing space; that exact licence file is the sole documented
diff-check exception rather than rewriting its source hash.

Tested core implementation: 646345ce2252468d90d1b637f6f44a8396f3d616.
Tested private implementation: e88b1da5892c36ea7045e8afe3f3dae23bf70dd2.
Later verification documentation does not change those tested runtime bytes.

## Reproduce

```powershell
node sites/phonebridger/verify.mjs
node --test sites/phonebridger/prototype/tests/*.cjs
npm test --prefix content-studio
```

Core commands:

```powershell
npm run test:core
npm run content:compile
npm run build
npx tsc --noEmit
npm run lint
node tests/phonebridger-preview-smoke.mjs
```

The adapter smoke needs the own loopback dev5188 and production5189 servers;
override PHONEBRIDGER_DEV_URL/PHONEBRIDGER_PRODUCTION_URL if needed. The
existing SEO smoke uses SEO_SMOKE_BASE_URL and each actual package siteId.
No secret file or production binding is required. Native baseline checker is
not applicable to this website-only snapshot: no native app work or packaging
occurred.

## Simulator follow-up — 2026-10-05

Current snapshot: 141 runtime files + 7 private verification/licence files, 64,134,317 bytes; byte verifier PASS and simulator tests 60/60. Chrome has Creators, Sheets, Gmail, Drive, Google, News and YouTube; no removed tabs in its Search tabs menu. Phones retain all apps and show no native/custom scrollbars.

Actual browser DOM fixture with simulated Pointer Lock exercises the real scene, controllers and styles: PC scrollTop 0-to160, left chat 84-to0, right Files 0-to160 while website scrollY stays444. All displays fit at1280x632 and1280x480, the header is hidden during capture, and Escape restores it and clears the fit constraint. This fixture substitutes only the capture API and emits test mouse/wheel events; it is not a physical Pointer Lock acceptance test. [Focused viewport screenshot](qa/focused-demo.png) is explicitly marked simulated capture. Failed physical capture leaves normal presentation untouched.

Original core/studio/build/SEO results above describe the integration baseline; no shared core code changed and those broader checks were not rerun for this simulator-only follow-up.

## Limits

The in-app browser cannot capture physical Pointer Lock; a pointer-click
activation attempt did not navigate the creator panel. Keyboard navigation
verified the panel and media. The original 55 tests and the current 60-test simulator suite pass, but
physical captured-cursor acceptance is still unverified. No cursor engine was
changed to make automation pass. A new mobile/Lighthouse/A–Z design audit was
not run for this integration; earlier website QA is not relabelled as new QA.

No production content package, public renderer, live domain, SEO indexing,
hosted D1/R2/auth, durable PhoneBridger lead, SMTP delivery/receipt, real agent,
creator attribution/payout backend, paid demand or production acceptance was
created. The build has no optional hosted bindings in this clean clone. Demo
rows and monetary amounts are not business evidence. MIT runtime licence and
Manrope OFL are included; production rights for supplied reference imagery and
video remain a launch review item.

## Slower alignment follow-up — 2026-10-05

Automatic captured-demo page alignment now uses a 1100ms eased animation.
The lifecycle test verifies intermediate positions, gentle start/finish, final
alignment, reduced-motion instant positioning, viewport fit and cancellation
on exit. Source and copied prototype suites both PASS 60/60; byte verification
PASS for 141 served + 7 verification files / 64,135,992 bytes. Cursor engines,
wheel routing and alignment destination are unchanged. No new physical Pointer
Lock acceptance or core/studio/build/SEO run is claimed for this narrow change.

## Duplicate scrollbar removal — 2026-10-05

Removed generated vertical/horizontal range scrollbars and their CSS across
all simulator apps and dialogs. Native PC content overflow remains; phone
scrollbar hiding and wheel routing remain unchanged. Source syntax and all
60 simulator tests PASS. Browser DOM confirms zero generated scrollbar
controls and Gmail native overflow with 739px content / 199px viewport;
[desktop screenshot](qa/no-duplicate-scrollbars.png). Snapshot verification
PASS: 141 served + 7 verification files / 64,133,902 bytes. Physical captured
input was not newly tested; previous integration test evidence remains scoped.

## Six-card asset preparation — 2026-10-05

Six 1536×1024 transparent ImageGen illustrations, 30 responsive WebP variants,
15 reused/adapted SVG icons plus sprite, component CSS and English preview.
Source masters visually reviewed; sixth illustration revised to Android camera
cutouts. Every variant decodes with correct dimensions, RGBA transparency and
transparent corner, and source/output hashes match; SVG XML parses correctly.
Shared optimizeRaster used, responsive WebP total 1,565,626 bytes.

Actual browser preview at desktop1280/content1265 and mobile390/content375:
all six images and Manrope load, no horizontal overflow, mobile one-column grid
and six >=44px buttons. Transfer preview button only updates its status text.
Desktop/mobile proof in qa/section-assets-desktop.png and section-assets-mobile.png.
Snapshot verification PASS: 189 runtime + 7 verification files / 65,717,174 bytes;
original masters are kept in the application workspace and not copied to GitHub.
Assets are ready for integration; the homepage and simulator action hooks were
not changed. No new native, captured-input, full-site audit, core/backend/SEO or
publication result is claimed for this asset-only increment.

## Six-card homepage integration — 2026-10-05

Six responsive cards integrated below the laptop. Existing public APIs prepare movement, chat, Sheets handoff, PC File Explorer transfer, Audio and PhoneBridger scenarios. PC file drops to either side phone open a receiving-folder picker; Save here queues into that folder and Cancel leaves the queue unchanged. No input/cursor geometry changes or native files.

Source/copy 60 simulator tests PASS. Explicit synthetic app-action DOM fixture: 13 assertions PASS for the six scenarios, capture invitations and deferred transfer/selected folder/cancellation/top exclusions. Actual 390px homepage one-column/no overflow and Files/Audio/Sheets touch destinations PASS. Actual desktop six responsive images/h2-h3 structure/no overflow PASS. Screenshot qa/homepage-six-cards.png. Snapshot: 190 runtime + 7 private verification files / 65,729,170 bytes; hashes PASS. Physical Pointer Lock is not newly verified; existing core/studio/build/SEO audits are not relabelled as new evidence. Shared core remains unchanged.

Holder photo plan only, following the owner's marked upper-face logo position. Preliminary shop layout was generated before holder references and is not a final product asset. No price, fulfilment, cart, checkout or shop backend is implemented.

## Four-offer conversion integration — 2026-10-05

Selected V8 hybrid implemented after the six demo cards. Integrated package
photograph, editable English copy/icons, charcoal/rose card surfaces, equal-scale
holder counts, finish legend and local selected-offer summary CTA.

Actual original homepage at 1440/1280/768/390/320px: images decoded, no horizontal
overflow or clipped artwork, correct 0/1/2/3 counts, all four mouse selections,
keyboard wrap/End, matching CTA summary, Escape/focus restoration and beta-link
navigation PASS. qa/conversion-homepage-review.json contains measured results.
Section capture hides floating header/skip-link only for isolated evidence;
no application styles are changed by this capture step.

Copied simulator tests: 60 PASS. Snapshot/importer recognizes srcset candidates,
so all photo widths travel with the prototype rather than only default src.
No new physical Pointer Lock, full-site Lighthouse, deployment, real checkout
or native application acceptance is claimed. Source masters/provenance remain
private; this preview is still excluded from public production output.

Final snapshot: 207 served runtime + 7 private verification files,
68,466,818 bytes; manifest/byte hashes PASS. Actual core preview middleware on
an isolated loopback HTTP server returned exact hashed bytes for index plus
17 conversion assets (all 18 requests 200). Existing vinext preview was not
restarted; it retains its startup manifest until its owner restarts it.
Evidence: qa/conversion-core-http.json. No shared-core source changed.
