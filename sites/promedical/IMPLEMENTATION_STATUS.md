# Promedical inline editorial workflow

Owner authorized implementation on 2026-10-30 in TX-GEM; deployment requires a separate decision. Current mode: local implementation, not deployed. Owner: TX-GEM, paired branch `codex/promedical-inline-editor-20261030`. CORE issue308, PUBLIC issue105.

Scope: authenticated browsing with inline title/description/body editing; full and selected-passage rewrite requests; durable owner-scoped queue; non-AI minute file bridge; exact-answer Codex factual/Core review then Claude approval; draft-only import; old/new comparison and explicit owner approval. Products are supported by this expressly authorized interface task; no existing product prose is rewritten by Codex.

Base CORE25292e20219b735df7f04c5807dd4c100f98addc / PUBLICc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Public main lacks deployed admin. Import only admin commits684df2c2,17ce0b1c,d3038a3d,692eb281,00959453, resolving current-main integration without the separate withdrawal PR75 or any package changes.

## Acceptance plan

- Owner login -> ordinary page -> in-place edit -> save -> private draft comparison. Public text stays identical until owner approval.
- Whole rewrite and exact selection + note -> durable queue -> stable numbered task file. Replays and crashes do not allocate a second task.
- Complete answer -> review notification -> hash-bound Codex verification and Claude approval -> one atomic draft write. Stale page/job/answer, missing review and changed source rejected.
- Auth, CSRF, tenant isolation, body/path limits, pending pagination, supersession, restart and conflict tests against SQLite and actual workerd/D1 fixtures.
- Desktop/mobile/keyboard/long content and enlarged text: controls inherit Promedical typography; restrained owner toolbar, local block editors, comparison columns stack on narrow screens. Readable labels/errors and visible focus, no public draft payloads.
- Existing core/SEO tests, TypeScript, scoped lint, production build, scoped Git safety and canonical journal coverage.

No production polling, DB migration, existing token access/activation, draft upload, approval, release, publishing, merge or deployment during implementation. Original001 Antigravity trial remains untouched. All test data is isolated. The 3510 program and installation procedure will be prepared; live activation remains pending deployment approval.

Status: local implementation and acceptance complete; paired draft PR delivery. PUBLIC feature commit: `9776ac971ade8973b623a22c5c4fd94357397ae3`. This is source prepared for review, not a deployed or activated service.

## Verified result — 2026-10-30

- PUBLIC `npm run test:core`: 311/311; CORE bridge tests: 3/3. The new PUBLIC rewrite suite includes six tests. Existing async public-site fixtures were updated to follow current main; their assertions remain active.
- Actual workerd + isolated D1 + the actual CORE bridge: one task export, one private draft write, no second write on retry, zero publications.
- TypeScript and scoped ESLint: pass. Final production build: pass, two asset manifests checked, zero missing files. Exact package bytes for all 11 tenants and the compiled registry match PUBLIC main; network configuration is unchanged.
- Compiled local Worker SEO smoke: Promedical 1,853 public pages and Memocasting 125 pages, including robots, sitemap, llms, schemas, host isolation and 404 handling.
- Browser acceptance uses the actual React StrictMode loader and isolated admin API: inline save, whole/selected rewrite, comparison, repeat request, conflict retention, 401 recovery, keyboard focus, mobile stacking and 200% text. Owner approval dialog was opened and cancelled; no publish request was made. Anonymous visitors see neither owner controls nor private draft text. The compiled Worker loads its editor module without page errors and shows zero owner controls anonymously.
- Final scoped Impeccable detector: zero findings; sequential self-review, no independent agent review. PowerShell scripts pass AST parsing and local cmdlet parameter checks. Scheduled-task registration and live execution were deliberately not performed.
- Own browser tab and local test servers closed; shared browser connection and other chats remain untouched.

Local evidence: `D:/Core/output/promedical-inline-20261030/` — `public-tests-final.log`, `bridge-tests.log`, `workerd-final.log`, `typescript-final.log`, `lint-final.log`, `build-release.log`, `seo-promedical.log`, `seo-memocasting.log`, `browser-verification.json`, `built-browser.json`, `unchanged-packages-build-assets.json`, `impeccable-final.json`, `cleanup.json`. Final build evidence is `build-release.log`; earlier interrupted builds are not acceptance evidence.

Remaining before activation: review/merge the paired PRs, obtain Rokas's separate deployment decision, then verify the exact live source and existing pending drafts, apply only the authorized additive migration, provision the separately scoped bridge token, and explicitly enable the prepared 3510 task. The source installer creates a disabled task. None of these activation steps was executed. Existing PR80 deployment and 20 pending drafts were not touched.

Operational limits and the exact Codex/Claude file approval contract are in [INLINE_EDITOR.md](INLINE_EDITOR.md). Partial replacement is plain text up to 3,000 characters; a selection spanning text blocks becomes one replacement fragment while preserving surrounding text and images. File hashes bind the review to exact bytes; authorship still depends on trusted channel access.
