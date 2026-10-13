# Promedical production deployment — 2026-10-10

Actual URL: https://promedical.lt/. Scope: owner preview, not accepted full production operation. Public source aa21f4d1542902d8608e0da8d74bc029d901fdb1; release c6d20d9f-bdd9-4744-a8a3-886a6714c182; package cc7f7ab02d304b8b3a4b269ebdcfb6f0eacdccc1b229738dc6c690e811aff259.

Worker promedical version 608be43e-ca4c-4089-af73-26448482274f, uploaded 2026-10-10T05:38:33.244878Z. Normal build, no QA clock and no development host selector. Its ASSETS binding, isolated D1 083a8bd9-8989-4fc9-a9bc-3211067b629d and three secret bindings were read back. Secret values are excluded. workers.dev and preview URLs remain disabled.

Cloudflare account1c0a7407abfb959d5ff46540f5f7009d, zone184a6a40d42a0678291338c4a1fc031e; darwin/sue nameservers. Existing @ CNAME promedical.lt.cdn.hstgr.net and www CNAME www.promedical.lt.cdn.hstgr.net now proxied/TTLauto. All other ten DNS records unchanged; no mail/ftp replacement. The old Hostinger origin has not been overwritten.

Two ordinary routes, promedical.lt/* and www.promedical.lt/*, invoke Worker promedical with fail-open false. Their IDs are672c5c30b46349be92b1b2404b7a492a and63bf784bc56741f7b4f6287f03ad718e. Custom-domain creation failed because external DNS records existed; it was cancelled and those records were preserved. Native/CLI zone writes are still restricted. UI route edits succeeded without changing connector permissions.

Canonical redirect rule9888bebb98fe497983146fa0a643ea85 in rulesetf47e729dc3724e6897a323cfa16d0324: (http.host eq "www.promedical.lt") or (http.host eq "promedical.lt" and not ssl); target concat("https://promedical.lt", http.request.uri.path),308,preserve query string. The actual rootHTTP/wwwHTTPS/wwwHTTP path/query probes all returned the exact target.

The 57 articles are already in the deployed bundle and use the canonical shared publication predicate. They become eligible 2026-10-12–2026-11-22 without daily regeneration or redeployment. Do not publish the local future-clock test entrypoint to production. Currently all57 are excluded from routes/discovery/links; actual sampled future route returns404. Full scan current errors are retained.

Acceptance limitations: full runtime scanNOT_COMPLETE, confirmed exceededCpu503 on Workers Free; actual browser form→D1 saved, SMTP notificationfailed. Owner explicitly kept Free after the concrete5USD/month Paid proposal. No purchase/upgrade or new sending service enabled. Existing mailbox/MX/DKIM/SPF still Hostinger. Direct email/phone contacts are available; synthetic tests are not demand.

For a future deployment, fetch both main branches and pass the canonical freshness gate. Build through the existing framework, then create an exact scoped deployment config from dist/server/wrangler.json containing namepromedical, the same isolatedD1/assets, no testvars, and the two ordinary pattern routes with the explicit zoneID. Preserve secret bindings and UI redirects. Do not reuse the failed custom-domain configuration; it is historical private evidence. A CLI upload may succeed before its route phase fails: read back active version, routes and real domain rather than interpreting exit1 as either total failure or complete acceptance. Run scoped checks/dry-run and actual current-host verification.

Rollback, only if requested: disable the two own Worker routes and the one own canonical redirect, restore only the two web CNAME proxy/TTL values from the private predeployment backup. Keep nameserver delegation and all mail/ftp records unchanged. Old Hostinger files remain available. Worker-code rollback does not restore D1 data. No customer/test row or mailbox message is deleted by this handoff.

Sources: [Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [CPU limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [TCP restrictions](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).


## Free-plan optimization and actual recheck — 2026-10-10

Owner explicitly chose Workers Free. Public source 5c5d704774fa1d1fbfbcba57ac860e347bd64d1d; deployed version 15935a3c-6cd6-4ace-b1b4-da5cf4d6f59d,100% at2026-10-10T06:13:38.546167Z. React reuses the default publication projection only within one server render; explicit clocks and non-component calls retain the pure time-aware path. JSON-LD consumes the same public page list; catalogue parent checks use a request-local identity Set instead of93,923 old identity comparisons. No package, approvals, dates, tenant content, DNS, routes or secrets changed.

Actual source RSC regression passed all57guide boundaries/114renders, including cache clearing between requests and independent explicit/backward clocks. Public core56/56, focused TypeScript/lint, normal build, dry run, all10current-host SEO cases and full future inspector1910pages/57guides/3777assets/5694GET/zeroissues pass. Wrong build working directory, Windows output lock, missing generated binding and unsupported CLI log-level attempts remain in private logs; corrected commands passed. These execution failures are not hidden or counted as tests.

The actual production recheck made5694GETs and returned NOT_COMPLETE with386issues, including NO_PUBLIC_ARTICLE_TO_INSPECT and503 HTTP failures. Earlier version's1391issues remain preserved in production-completion-v1.json. Twelve isolated own GETs returned200 with native CPU16–66ms; successful samples do not replace the failed full check or prove reliable Free hosting. SMTP notification remains failed after durable D1 saving. No paid upgrade or new sending provider was activated. See production-completion-free-v2.json, production-free-cpu-observations.json and all-site-seo-free-v1.json.

Bounded shared repair upgrade-cd4fc042-6c6f-40ea-9d68-b263ceb3f38a is source/PR-local, not merged/adopted. Full-task acceptance remains open. A reliable Free deployment still needs a separately scoped prerender/static-delivery design or equivalent measured CPU reduction; mail needs a compatible HTTPS transport/relay and actual matching INBOX proof. Neither is claimed implemented by this bounded repair.
