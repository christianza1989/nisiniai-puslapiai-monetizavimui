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
- [ ] Publish, verify actual cards/reviews/schema/prices and complete scoped Git delivery.

Assessment is sequential in this task. Native prices32/48, review counts166/48 and214 historical reviews/104 photos are data, not mockup values. No new customer review, email, order, payment or carrier action is authorized by this visual task.


Local verification:287PUBLIC tests and14focused homepage/review cases pass; TypeScript and scoped ESLint pass. One final vinext build, physical asset gate2manifests/missing0. Detector over final CSS/component returns[]. Actual component/markup render uses original public data read-only:1280px desktop and390px phone, photo stages around300–340px desktop/270px mobile, correct32/48prices and166/48ratings, native full-text disclosure666characters,20-to40unique product reviews, native horizontal touch movement with unchanged document scroll. One repair batch reduced long excerpts and section gaps. No autoplay, wheel interceptor or forced focus movement.

Framework previews are not misreported: a stale Vinext lock pointed to an unrelated reused conhost PID; its exact lock was quarantined without killing that process. Vite dev never opened its port; direct Next fallback did not admit the full niche route. The accepted local visual harness renders the actual product markup, review component and CSS, with cached public GET data and all writes denied; it does not claim compiled adapter acceptance. Final intended-host checks remain required.

Next16dev also appended generated instructions to tracked AGENTS.md. Supported agentRules:false prevents this; only the exact generated addition was removed, and canonical AGENTS has no diff. Production Cloudflare behavior stays on the original adapter. This separate shared workflow repair is recorded alongside the UI upgrade.
