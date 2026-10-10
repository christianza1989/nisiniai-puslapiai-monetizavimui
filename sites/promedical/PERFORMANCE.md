# Promedical local performance evidence

Final actual Lighthouse13.5.0 mobile run at2026-10-09T17:55:04.992Z: performance95, accessibility100, best practices100, SEO100; LCP2.6s, CLS0, TBT50ms. The report is performance/home.report.json with the original HTML. Chrome155, local production Workers transport through the read-only canonical-Host8790 proxy. The report's CPU calibration warning is retained. This is lab emulation, not field Core Web Vitals, production latency or a visual-quality score.

The original baseline is preserved in home-baseline.report.json/html: performance96, LCP2.3s, CLS0, TBT150ms. An intermediate pre-brand-label-fix run is preserved in home-before-brand-fix.report.json/html: performance93, LCP2.7s, TBT110ms. Timing variation in this local environment prevents a causal claim that the aria repair increased speed.

Responsive card sizes were corrected to the actual two-column mobile layout. Reported image-delivery waste fell from roughly261KiB to55,492bytes in the intermediate check, with the same approved source images. Small cards retain some waste because360px is the smallest immutable exported variant; the real hero image stays proportionate. No extra image-generation, animation or design restyling was added to chase a score.

The brand-link accessible-name finding was a separate unscored serious diagnostic. Removing the redundant aria-label gives the natural visible wordmark/tagline as its name. Final label-content-name-mismatch is notApplicable/score:null with no failing nodes; actual DOM/keyboard evidence confirms the name. It is not described as an audit score1.

Approved assets stay immutable. The earlier shared responsive-webp-v2 encoder effort4 change had a narrowly measured speed improvement on two actual source images with modest byte growth, documented in CORE_FEEDBACK.md; it is not a universal performance guarantee or permission to rewrite existing v1 media.


## Actual production follow-through — 2026-10-10

The unchanged normal build was uploaded and activated as Worker promedical version 608be43e-ca4c-4089-af73-26448482274f, created 2026-10-10T05:38:33.244878Z. DNS/route configuration through signed-in Cloudflare UI now serves https://promedical.lt/. The two existing web CNAME records are proxied; all other ten DNS records, including Hostinger mail and ftp, are byte-equivalent in normalized read-back. One narrow 308 redirect preserves path, query and HTTP method for HTTP/root and www. The failed connector and CLI zone writes remain recorded; no broader token/access was granted. See DEPLOYMENT.md and production-redirects-v2.json.

The actual complete production inspector made 5694 GETs and returned NOT_COMPLETE with 1391 issues. The report is retained, not replaced by the later successful sample. Native Cloudflare logs confirm an actual category request returned503/exceededCpu with29ms CPU; a later isolated request returned200 with40ms. Workers Free is therefore not accepted as reliable full-catalogue production hosting. The owner chose to keep the free plan; no paid plan was activated.

The actual browser inquiry saved one clearly marked synthetic record to the isolated remote D1 with status new; SMTP notification failed and the browser disclosed it. No production-delivered-mail or matching-INBOX claim is made. Four rejected form cases passed their expected status checks and stored zero matching records. The earlier standalone Hostinger SMTP/IMAP receipt proves a different transport scope. The Hostinger SMTP hostname currently resolves to172.65.255.143; the documented Workers TCP restriction on Cloudflare ranges is a strong diagnosis, not an invented captured error code. A compatible notification transport still needs integration and end-to-end receipt.

Final actual mobile lab samples: current production homepage Lighthouse13.5 99/100/100/100, LCP1.989s/CLS0/TBT19.5ms; isolated future QA guide94/100/96/100, LCP2.724s/CLS0/TBT2.5ms. These do not prove field Core Web Vitals, true200%zoom or all-page availability. Indexing/citation remain unmeasured. Strict A–Z local acceptance is incomplete; details in PHASE-1-AUDIT.json.


## Free-plan optimization and actual recheck — 2026-10-10

Owner explicitly chose Workers Free. Public source 5c5d704774fa1d1fbfbcba57ac860e347bd64d1d; deployed version 15935a3c-6cd6-4ace-b1b4-da5cf4d6f59d,100% at2026-10-10T06:13:38.546167Z. React reuses the default publication projection only within one server render; explicit clocks and non-component calls retain the pure time-aware path. JSON-LD consumes the same public page list; catalogue parent checks use a request-local identity Set instead of93,923 old identity comparisons. No package, approvals, dates, tenant content, DNS, routes or secrets changed.

Actual source RSC regression passed all57guide boundaries/114renders, including cache clearing between requests and independent explicit/backward clocks. Public core56/56, focused TypeScript/lint, normal build, dry run, all10current-host SEO cases and full future inspector1910pages/57guides/3777assets/5694GET/zeroissues pass. Wrong build working directory, Windows output lock, missing generated binding and unsupported CLI log-level attempts remain in private logs; corrected commands passed. These execution failures are not hidden or counted as tests.

The actual production recheck made5694GETs and returned NOT_COMPLETE with386issues, including NO_PUBLIC_ARTICLE_TO_INSPECT and503 HTTP failures. Earlier version's1391issues remain preserved in production-completion-v1.json. Twelve isolated own GETs returned200 with native CPU16–66ms; successful samples do not replace the failed full check or prove reliable Free hosting. SMTP notification remains failed after durable D1 saving. No paid upgrade or new sending provider was activated. See production-completion-free-v2.json, production-free-cpu-observations.json and all-site-seo-free-v1.json.

Bounded shared repair upgrade-cd4fc042-6c6f-40ea-9d68-b263ceb3f38a is source/PR-local, not merged/adopted. Full-task acceptance remains open. A reliable Free deployment still needs a separately scoped prerender/static-delivery design or equivalent measured CPU reduction; mail needs a compatible HTTPS transport/relay and actual matching INBOX proof. Neither is claimed implemented by this bounded repair.
