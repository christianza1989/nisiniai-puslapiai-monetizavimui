# Memory Casting PageSpeed follow-up

Owner asks to improve the supplied mobile report: https://pagespeed.web.dev/analysis/https-memocasting-lt/sbhsicwise?form_factor=mobile (2026-10-25 23:58 GMT+2). Actual report: performance93, accessibility96, best practices100, SEO100, agentic3/3; FCP1.8s, LCP3.0s, TBT20ms, CLS0.026, speed index3.3s. No real-user dataset was available. No score/ranking guarantee is inferred.

- [x] Read actual report audits and source dependencies. LCP image load delay1370ms; estimated image savings117KiB; render-blocking280ms. Partial-opacity pending text causes contrast failures. Hero character blur causes19 non-composited animations. Homepage imports the entire checkout component for its lightweight API helper. Navigation text/font/control enhancement moves the dock. A same-named section/catalogue link is ambiguous.
- [x] Add an early responsive hero preload matching the displayed image and sizes.
- [x] Separate the existing same-origin CommerceClient/cart helper from checkout UI; retain routes, storage format, stock/price/payment truth and recovery.
- [x] Match cutout sizes to their actual CSS boxes; derive14smaller logo/process frames through Studio saveResponsiveAsset/responsive-webp-v1, preserve originals and gated asset manifest.
- [x] Keep scroll effects with legible full-contrast text, stable dock control space and clearer section-link name. Batch reveal geometry reads before class writes.
- [x] Regression/build, actual desktop/mobile/motion/keyboard review, preserve provider configuration, deploy and compare a fresh real PSI report. First iteration reduced-motion and second keyboard toggle evidence retained.
- [x] Scoped journal/source self-review, both PUBLIC source PR merges, paired Git handoff checks and append-only CORE evidence; actual final scores and limits below.

Scope is Memory Casting presentation/loading only. Preserve187-page content package, publish dates, SEO/canonicals, other tenants, live orders, primary mail, shipping, analytics consent, recovery, auth, bindings and cron. Owner declined a real purchase; no financial/customer-message/shipment test is included.

## First hosted iteration and remaining cause

PUBLIC source8054134b63155057f81931fef48fe2963f420784, merged PR83 asb0f7179923a2100ed43e40f21d2263819c906dfc. Frontendc05ca9d6-a4c3-4b28-8025-b3eea9f84e45 deployed22:32:45UTC. Native5be826b7/packageSHA256b02879f7df3fdc9207248e3f45775a0f3e3f90ce88f1f525ae4c10e94c89a4dc unchanged. Backend5bc23acb/mail4b165ec7 unchanged, exact bindings/domain certificates/cron preserved.

Actual report tmm1t7726o at00:33GMT+2: mobile91/100/100/100 (FCP1.7s,LCP2.8s,TBT~10ms,CLS0,SI5.1s); desktop96/100/100/100 (FCP0.4s,LCP0.5s,TBT0,CLS0.005,SI2.2s). Original desktop was90/96/96/100, SI8.3s. These are retained observations, not a claim that every first-run metric improved. No test is dropped to select a better score.

The hero now starts about81ms after the document response, with one image request. The remaining1.7–3.8s variable document wait is traced to homepage RootLayout and NichePageView bulk commerce enrichment: storefront-context validates the actual Stripe account. Hero hydration also replays title/image arrival after SSR. Separate upgrade-c66e5be9-bf6c-4d7a-b21f-ad0f676ad9d3 / PUBLIC PR84 removes only the homepage's synchronous enrichment, uses its existing approved evergreen description and removes the redundant arrival effect. Actual product prices/offers/checkout retain strict LIVE admission; visible home catalogue still uses its existing client. No unsafe cache or fake payment readiness is introduced.

First iteration verification:268/268public tests, types/lint0errors (one pre-existing unrelated manual stylesheet warning), build/dry-run, actual compiled desktop/mobile320/motion-keyboard/cart-boundary and hosted5routes/14assetSHA passed. Own cart restored empty, preview servers stopped. Self-review is distinguished from earlier independent specialist reviews.

Second iteration source2f6e9881242698940c440eb4a9952e8276a65ae0, merged through PUBLIC PR84 as038b1f0f1ab207f1be1012f2714d03f0572beed7.269/269tests, TypeScript and scoped ESLint0errors, exact SDK, production build and actual compiled desktop/320px mobile pass. The new route/layout tests verify0home commerce reads while catalogue/products continue to enrich actual prices; existing false/incomplete LIVE context rejection remains tested. Desktop screenshot was captured before viewport emulation; an immediate screenshot after clearing an emulated viewport was transitional and is not the accepted desktop evidence. Phone320/scroll320, heading opacity1, hero animationnone; Enter toggles motion off/on and console errors are empty. Both isolated preview servers stopped, ports closed, and only their2own local binding lines were removed. Actual hosted acceptance follows.

## Final hosted acceptance, 22:58 UTC

Active frontend **88184164-9401-4ddc-b8ef-c6b391f3328a**, deployment **9cac52e7-e260-41d9-963e-e19e79dd10d7**, 100% at22:57:51.766556UTC. Annotation binds source2f6e9881/native5be826b7; merged application tree is identical. All actual service/D1/secret-name bindings, domains/certificates, compatibility settings and cron match the pre-deployment snapshot; backend/mail versions remain unchanged.

Actual final report: https://pagespeed.web.dev/analysis/https-memocasting-lt/zzh6keplwd?form_factor=mobile (26October00:58:53GMT+2, Lighthouse13.5, Moto G Power/slow4G and desktop). No real-user dataset is available.

| Category | Original mobile | Final mobile | Original desktop | Final desktop |
| --- | ---: | ---: | ---: | ---: |
| Performance | 93 | **95** | 90 | **99** |
| Accessibility | 96 | **100** | 96 | **100** |
| Best practices | 100 | **100** | 96 | **100** |
| SEO | 100 | **100** | 100 | **100** |

| Metric | Original mobile | Final mobile | Original desktop | Final desktop |
| --- | ---: | ---: | ---: | ---: |
| FCP | 1.8s | 1.7s | 0.4s | 0.4s |
| LCP | 3.0s | 2.7s | 0.6s | 0.6s |
| TBT | 20ms | 0ms | 10ms | 10ms |
| CLS | 0.026 | 0.001 | 0 | 0.005 |
| Speed Index | 3.3s | 2.4s | 8.3s | 1.3s |

These are single lab observations, not field p75, a100score guarantee or proof of ranking/traffic/revenue. The original, intermediate91/96 and final95/99 reports remain retained; no run was silently discarded. Remaining suggestions include roughly79KiB mobile image delivery,130ms render blocking and56KiB unused JS. No further unsafe commerce cache or visibility/animation test bypass is introduced to chase a score.

Read-only hosted5routes return200 with canonical/noindex behavior and correct checkout stylesheet isolation. All14derived assets match exact bytes/SHA; the187page package hash is unchanged. Product metadata remains32/48EUR and actual browser home price elements reach ready32/48EUR. Storefront context is verified LIVE/productionReady. Warm browser navigation response waiting measured139.5ms, DOM673.3ms; first cold HTTP request1608ms is retained separately and not replaced by the warm sample. Actual live320/scroll320 screenshot and desktop accepted, no console errors; viewport override cleared and ephemeral site tab closed. No real order/charge/refund/shipment/customer mail or new paid service was created.

Private evidence under ignored qa/pagespeed-20261026: original/intermediate/final PSI snapshots, second-build/tests/types/lint/dry-run/deploy logs, provider-before/after-second snapshots, hosted-second checks and second-preview/hosted screenshots. Public source PR83/84 are merged; CORE journal/doc handoff is tracked separately below. Rollback from this final edition: restore frontendc05ca9d6 with current actual bindings, or revert the narrow PR84 code. Original first-repair rollback remains8e9f1a79. Neither operation rewrites business data or content dates.
