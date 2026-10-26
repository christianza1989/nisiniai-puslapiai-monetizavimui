# Product choice and review carousel refinement

Owner scope: smaller homepage product images, clearer product cards, and manual review carousels on homepage and product pages. CORE issue292 / PUBLIC issue94; bases7e8b8bc2 /69e7dab7. Dedicated product-cards branches. Existing white/warm/Manrope/rose identity and all native business data retained.

Spatial direction: centered two-column product choice, maximum1240px content, image stage around340px tall rather than near-full-width photographs. Product name leads; rating has its own reserved row, then original description and price/action group. Mobile uses one column, a smaller image and a comfortably sized action. No new imagery, claims, product data or dates.

Reviews use horizontal native scroll-snap cards, three on wide screens, two on intermediate widths and one with a next-card hint on phones. Controls act only on explicit click/key or native swipe; no autoplay, hover/wheel interception or forced focus scrolling. Original long text stays reachable through native disclosure; visible photographs remain linked. Product pagination and actual rating/schema source remain unchanged.

- [x] Fetched paired main; own branches and issue scope.
- [x] Existing implementation/screenshot inspected; layout and typography direction selected.
- [x] Implement product structure, separate rating slot and consistent star display.
- [x] Implement reusable review carousel, navigation states, native full-text disclosure and pagination.
- [x] One combined desktop/mobile rendered pass, one repair batch if needed; final mechanical scan.
- [x] Relevant data/DOM regressions, types/lint/build and preserved production configuration.
- [x] Publish and verify actual cards/reviews/schema/prices on the intended host.
- [x] Deliver reviewed source through PUBLIC PR95 and companion acceptance/journal through CORE PR293.

Assessment is sequential in this task. Native prices32/48, review counts166/48 and214 historical reviews/104 photos are data, not mockup values. No new customer review, email, order, payment or carrier action is authorized by this visual task.


Local verification:287PUBLIC tests and14focused homepage/review cases pass; TypeScript and scoped ESLint pass. One final vinext build, physical asset gate2manifests/missing0. Detector over final CSS/component returns[]. Actual component/markup render uses original public data read-only:1280px desktop and390px phone, photo stages around300–340px desktop/270px mobile, correct32/48prices and166/48ratings, native full-text disclosure666characters,20-to40unique product reviews, native horizontal touch movement with unchanged document scroll. One repair batch reduced long excerpts and section gaps. No autoplay, wheel interceptor or forced focus movement.

Framework previews are not misreported: a stale Vinext lock pointed to an unrelated reused conhost PID; its exact lock was quarantined without killing that process. Vite dev never opened its port; direct Next fallback did not admit the full niche route. The accepted local visual harness renders the actual product markup, review component and CSS, with cached public GET data and all writes denied; it does not claim compiled adapter acceptance. Final intended-host checks remain required.

Next16dev also appended generated instructions to tracked AGENTS.md. Supported agentRules:false prevents this; only the exact generated addition was removed, and canonical AGENTS has no diff. Production Cloudflare behavior stays on the original adapter. This separate shared workflow repair is recorded alongside the UI upgrade.

## Intended-host acceptance

Production frontend version `f45cbb3c-3f39-4041-82b9-f376a3e70f83`, deployed and read back on2026-10-26UTC (2026-10-27local). Runtime implementation source PUBLIC192ba64adb65f5fe52be3e3a2669f9f22cc92908; final branch6f9ded7bc6c7d24730fe454cea139fb7f94dd935 adds only a stronger test assertion. PUBLIC PR95 merged as82ae4607922e16ce28a734ef5ae8c715cb776d21. CORE PR293 carries this receipt and immutable upgrade events. No fresh full build was needed for the test-only or documentation changes.

HTTPS homepage and both product pages return200. Homepage retains its observed client-side review loading; both product pages render20initial review cards in HTML. Native API and Product schemas agree: couple32EUR/166reviews/4.86, family48EUR/48reviews/4.81. All38referenced CSS/JS assets return200. The native catalogue and production readiness remain live. Content package, projection, dates and AGENTS have no diff.

Actual Chrome verification:1280px desktop product cards have smaller images with title/rating/description and separate price/action;390px phone has one column,270px image stages and no horizontal document overflow. Homepage8review cards render with real photographs after lazy loading. Native swipe moves the review track2to190px while documentYstays9422.667; an explicit coordinate arrow moves product track403.333to805.333 with unchanged documentY3007.333. Native full text opens; product pagination loads20to40unique cards. Both product carousel sections were visually inspected; browser warnings/errors are empty in the checked product session. No autoplay or customer/provider write was exercised by these checks.

Before/after provider comparison passes for all6frontend bindings, compatibility flags/date and the same3domain attachments. Commerce remains6018f8c2-be68-485d-9f95-00679e0654aa; mail remains4b165ec7-466e-4b29-8c0b-29bfaecf32e7, with unchanged bindings/settings. No backend deployment, migration, mail, order or payment was performed. Rollback frontend version is2a991e90-4ba5-45b1-874d-d5ec95c58640.

Local raw provider/HTTPS/browser evidence remains ignored under sites/memocasting/qa/product-cards-20261026. Public source: https://github.com/christianza1989/niche-public-core/pull/95 ; companion delivery: https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/293 . Assessment was sequential; no additional agents were spawned.
