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
| Repository staged safety and fresh snapshot checkout | Recorded in the final PR evidence after exact blob review |

Actual core preview: http://127.0.0.1:5188/__projects/phonebridger/
Own production smoke server: http://127.0.0.1:5189 (stopped after testing).
Screenshot: [core-preview.png](qa/core-preview.png).

Exact staged-blob safety passed for 164 companion files / 64,335,570 bytes and
8 core files (final documentation is rechecked before commit). New authored
files pass diff whitespace checking. The copied Manrope OFL line21 retains
one upstream trailing space; that exact licence file is the sole documented
diff-check exception rather than rewriting its source hash.

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

## Limits

The in-app browser cannot capture physical Pointer Lock; a pointer-click
activation attempt did not navigate the creator panel. Keyboard navigation
verified the panel and media. The existing 55 VM/input/state tests pass, but
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
