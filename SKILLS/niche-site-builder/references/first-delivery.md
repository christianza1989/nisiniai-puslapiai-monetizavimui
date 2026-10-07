# Complete first delivery in any niche

Use this checkpoint when creating a new site or a new public page family. It routes existing core requirements into the build; it is not a new publishing system or a substitute for the A–Z audit. A narrow edit repairs its affected paths, not every unrelated historical site. An explicitly requested platform also retains its platform/business-route acceptance.

## Decide before generating pages

In the site's build brief record the real operator, contact, language/timezone, editorial responsibility and eligible profile URL; public guide index URL; article/category/service/location roles; inquiry route and applicable trust/privacy/terms pages. Use current network contacts and site facts. A truthful organization such as `<brand> redakcija` can be the author when that responsibility is established. Do not invent an expert, portrait, qualification, test, review or medical approval.

Read the full current intent/topic map and separate it from the reviewed first release. No weekly article quota applies. Choose output batches by useful distinct questions, evidence, actual media, review capacity and dependencies. A service+city target needs a real eligible catalogue result; articles link to registered ready targets, not guessed filters or empty indexable city pages. Gifts, technical equipment and beauty may need different journeys and schemas.

Define one page-family contract before bulk generation: body/H2/lists/figures, linked byline, stable date fields, visible breadcrumb, source section, topical image, relevant contextual links and truthful CTA. Use the shared core metadata/schema/public projection with the site's configured hub and identity. Test one fully rendered article plus its actual index/profile/supporting routes before producing the batch. A working homepage does not establish these other layouts.

## Assemble and inspect the first complete release

Initial release and supporting pages follow [CORE_BUILD_CONTRACT](../../../CORE_BUILD_CONTRACT.md), [CONTENT_CORE](../../../CONTENT_CORE.md) and the [A–Z audit](../../niche-site-audit/SKILL.md). In particular:

- Every prepared article must render its approved body, original inspected thematic image, attribution/profile, meaningful publication date, reviewed sources and helpful next action. Topic plans, image prompts or imported records do not prove rendered content.
- Every public URL has one H1/title/description/canonical, correct language and matching sharing metadata. Homepage has truthful Organization/WebSite; the guide hub has CollectionPage; articles have truthful Article and BreadcrumbList. Product/Offer/LocalBusiness/reviews/FAQ/ProfilePage depend on the actual entity and visible facts, not the domain name. ProfilePage can describe a real Person or Organization under the official eligibility; it is not proof of expertise.
- Visible dates and schema agree with approved semantics. Never substitute the current request time or an arbitrary approval date for first publication or a meaningful content update. Preserve original history; scheduled availability is not evidence of an earlier live launch. Legacy V1 dates require actual review of their meaning, not an automatic approved-content rewrite.
- One shared projection supplies HTML, links, media, sitemap and LLM output. Verify hidden pages/assets and future target links before publication, then verify the same prepared revision after its publishAt in an isolated clock-controlled preview. For a scheduled batch, inspect each prepared article at an eligible preview time; testing only today's visible subset is incomplete batch acceptance.
- Inspect desktop/mobile and enlarged-text reading, real loaded pixels, sources/byline/crumbs/footer and navigation. Check contact form validation, durable storage, actual operator notification boundaries and measurement/privacy with the existing dedicated checks. HTML inspection does not replace these.

## Commands that block an incomplete delivery

Initialize the new site's audit early, leaving unverified facts visible. Record the actual prepared package SHA in `audit.version.packageSha256`, inspected source/build in `audit.version.sourceVersion` and real `evaluatedAt`. Keep all applicable criterion evidence; do not generate PASS from these commands or blanket-NA missing access.

```powershell
node SKILLS/niche-site-audit/scripts/init-audit.mjs <siteId> <canonicalHost>
node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/<siteId>/PHASE-1-AUDIT.json --require-local
node SKILLS/niche-site-audit/scripts/verify-site-completion.mjs --package <approved-content-package.json> --origin <isolated-preview-origin> --core <current-public-core-checkout> --article-index <real-guide-hub-slug> --audit sites/<siteId>/PHASE-1-AUDIT.json --output sites/<siteId>/SITE_COMPLETION.json
```

The completion verifier requires Node22+, Python3 and the current public core. It validates the actual package, imports that core's V1/V2 publication projection and checks all eligible package URLs and hidden counterparts, metadata, article bodies/authors/dates/crumbs/images, assets, sitemap/LLM/robots and private/unknown paths via GET. It uses no second scheduler and adds no package/schema fields. `--core` can be omitted when `PINET_PUBLIC_CORE_PATH` or `STUDIO_PUBLIC_CORE_DIR` is configured. Preview origins must be loopback; hosted origins must be the package's exact canonical HTTPS origin.

For a controlled local preview use `--now <ISO-instant>` only when the runtime itself is set to the same clock. It is rejected for live origins. If the runtime exposes an edition header, add `--package-header <header-name>` to verify the deployed package bytes. An explicit `--render-only` omits the full audit and returns `RENDERED_CHECKS_PASS_NOT_SITE_ACCEPTANCE`; never present it as finished site/platform acceptance.

The visible breadcrumb should be a semantic labelled container; use a breadcrumb class/label or `data-niche-breadcrumbs` for language-independent inspection. The checker accepts JSON-LD arrays/graphs, Person/Organization authors and arbitrary eligible author profile paths; it does not copy Madbeauty's path, labels, topics or identity into other sites.

Repair missing in-scope implementation autonomously and rerun affected checks. Complete local delivery needs every applicable local criterion PASS plus the bound rendered receipt, not just the gate subset or a command that exited normally. Launch/DNS/TLS/delivery/data operations and demand remain separate. Recheck hosted output after an authorized deployment; an old receipt describes its captured revision and time only. Core rule changes are versioned and discoverable after Git synchronization; they do not retroactively certify older websites or change their approvals.

Official guidance checked 2026-10-07: [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page). The completeness checks above are this network's delivery policy; recommended schema properties are not universal Google ranking requirements or guarantees.
