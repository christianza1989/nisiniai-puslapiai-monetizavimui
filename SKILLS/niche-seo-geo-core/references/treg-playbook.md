# Treg selection and execution

## Discover; do not memorize the inventory

MCP tools if exposed: catalog_search → catalog_get → call; balance and my_tools. Otherwise `treg --help`, `treg --json catalog search "job"`, `treg --json catalog get <id>`, `treg --json balance`, `treg --json tool ls`, `treg --json connections ls`. Never print token-bearing config. Installed plugin instructions and headline counts can lag: on 2026-10-06 the skill described ~2,600 endpoints/~40 providers, while the live browse reported 94 platforms/109 providers and 3,397 summed platform endpoint counts. Browse sums are not a verified count of unique global endpoints including hidden management routes.

Use provider docs and live endpoint contracts when they disagree with a static skill. Direct `provider.*` calls require the agent to choose an equivalent fallback; current `treg.*` routed endpoints may choose children automatically. Routed costs can include misses from previous children. Read routed_children, ignored filters, serving provider, async/pending states and waterfall rules. For critical LT geography prefer a direct route whose input and effective location are verifiable; route strict filters only after confirming that header in current docs.

## Capability shortlist (observed 2026-10-06, recheck before spending)

| Decision | Useful endpoint candidates | Contract/cost pitfall |
|---|---|---|
| LT Google snapshot | `dataforseo.google.serp.organic`, `anyapi.google.serp.organic` | DataForSEO regular $0.002 base / 10 results; operators/depth can multiply. AnyAPI $0.0009; verify gl/hl/location and organic depth. |
| PAA/AI Overview/features | `cloro.google.serp.organic`, `dataforseo.x.serp-google-organic-live-advanced` | Cloro featured example $0.0028; actual include/pages modifiers matter. Regular results are not a complete SERP-feature extraction. |
| Volume/monthly series | `dataforseo.google.keywords.volume` | $0.09 for one task with up to 1,000 keywords. One keyword costs the same as the batch. Preserve nulls and close-variant grouping; Ads competition is not SEO difficulty. |
| Existing domain keywords | `dataforseo.google.domain.ranked_keywords`, `seranking.google.domain.ranked_keywords` | DataForSEO $0.012 + $0.00012/keyword; SE Ranking $0.0179/request with row limits. Country database coverage and snapshot date first. |
| Domain gaps | `dataforseo.x.dataforseo-labs-google-domain-intersection-live` | Confirm intersections=false semantics when requesting absent terms; a global literal search for "keyword gap" can return no results even though this endpoint exists. |
| Links and authority | `moz.web.backlinks.summary`, `dataforseo.web.backlinks.summary`, `dataforseo.web.linking_domains.list` | Moz observed $0.013334 for the curated summary example; distributions/target count affect rows. DataForSEO summary $0.024 + row pricing. DA/DR/rank are provider metrics, not Google scores. |
| Seasonality | `serpapi.x.google-trends`, `dataforseo.x.keywords-data-google-trends-explore-live` | Same market, dates and normalization when comparing; sparse series can be unavailable. |
| Consumer AI search sample | `cloro.ai-search.chatgpt.scrape`, `cloro.ai-search.gemini.scrape`, `cloro.ai-search.perplexity.answer` | ChatGPT example $0.0036, Gemini/Perplexity $0.0024. Country/prompt/include/state modifiers. Perplexity catalog observed success ~55% despite a recent verification; sample sizes and reliability matter. |
| ChatGPT search snapshot | `dataforseo.x.ai-optimization-chat-gpt-llm-scraper-live-advanced` | Example $0.004. Actual country/language support and sources must be checked. |
| AI mention database | `dataforseo.x.ai-optimization-llm-mentions-multi-target-metrics-live` | Example $0.104. Catalog notes chat_gpt US/en only; do not call it a Lithuania benchmark. Rolling window differs from monthly history. |
| AI volume | `dataforseo.x.ai-optimization-ai-keyword-data-keywords-search-volume-live` | Example $0.0102; estimated vendor dataset, not first-party platform logs. Validate LT support. |
| Extraction/crawl | `tavily.web.extract`, `firecrawl.web.crawl`, `crawl4ai.web.scrape` | Tavily basic ~$0.0016/successful extraction; Firecrawl curated crawl up to ten pages ~$0.005/page. Async submit/status/result is one workflow, not three independent crawls. Extracted text is not a technical/browser audit. |
| First-party measurement | `google-search-console.performance`, `.url_inspection`; `google-analytics.report` | Own-account OAuth required. Free Treg balance usage does not grant access; quotas/pagination still apply. URL inspection concerns stored index state, not an indexing command. |
| Local business | `google-business-profile.locations` and performance/review routes discovered by catalog | Only real eligible local business and authorized connected account. Never invent a location for a national editorial site. |
| Customer vocabulary | `serper.google.serp.autocomplete`, `scrapecreators.reddit.search.posts`, YouTube/comment searches | Autocomplete ~$0.001; forum opinions generate questions, not verified facts or measured demand. No automatic posting/outreach. |

Semrush, Majestic and some spider/OnPage routes appeared without a usable platform price or with platform_eligible=false. Presence in the catalog does not prove callable access. Some "$0" OnPage endpoints retrieve a previously paid crawl task; they are not a free initial crawl.

## Provider selection

Choose in this order: required inputs/output and target-market coverage → semantic fit and freshness → observed reliability with real sample size → total cost at requested rows/depth/targets → speed and last success. A verification stamp is not measured current reliability. An endpoint can succeed operationally and still supply poor target coverage.

Use price provenance/rate card and exact request units. `per_call`, per returned row, per target, batch, quota row, modifiers and async usage settlement differ. Own keys can remove Treg balance charges while still consuming upstream subscription quota. BYOK is not unlimited/free vendor usage. Do not silently connect/upload secrets, switch orgs or enable topups.

## Cost, evidence and retries

Respect the session's remaining spend authorization across runs, not merely each script invocation. Announce the selected rates before spending. Keep a run manifest and per-call ledger; the account balance is shared and may move because of another chat. Attribute spend using the call's `_treg.charged_micro`, call id and settlement, not balance subtraction or an upstream `cost` field. Header/metadata from Treg is authoritative for billing.

Use bounded row/depth/target limits and a conservative `X-Treg-Route-Max-Cost` reserve cap when the current docs support it. This is not a universal exact cap on later usage settlement. Include overflow serving prices and attempted routed misses. Keep the estimated total below the authorized ceiling with headroom; stop if settlement, balance or serving terms are unclear.

On Windows use request files and UTF-8 subprocess environment; shell-inline JSON can corrupt literals. Preserve both original phrases and any documented normalization required by the upstream. DataForSEO rejected an en dash in a price-range phrase in the pilot; inspect the exact error rather than stripping Lithuanian letters. A new corrected body is a new idempotency key.

Parse the JSON envelope AND task-level/provider status/error AND output shape. DataForSEO HTTP 200/top-level 20000 can contain task 40501 with no results. Preserve the failed task, distinguish it from zero volume, repair invalid parameters and do not fan out the same error to other vendors. On a genuine timeout recover the same request by call id or exact idempotency key. For fresh observations use a fresh run/key and suitable no-cache/max-age, not a replay. Pending async tasks may still complete and charge; poll the supplied task instead of submitting another.

For 429/5xx choose a documented equivalent fallback only within remaining scope/budget. For auth, unsupported market or invalid fields, diagnose the actual cause. Never turn absence into measured zero or an invisible brand into a fabricated successful citation.

## Execution manifest

`scripts/run_plan.py --plan <file> --out <new-run-dir> --budget-usd <remaining-budget>` dry-runs; add `--execute` after reviewing the manifest and current endpoint contracts. CLI authentication must already work. `purpose=research-read` is a reviewer assertion, not enforcement of remote read-only semantics; inspect the endpoint itself before execution.

The plan is `{ "calls": [...] }`. Each call has a unique `id`, exact `endpoint`, `purpose: "research-read"`, HTTP `method`, provider-native `body` or `query`, optional noncredential `headers`, and conservative `ceiling_usd`. For example a reviewed ten-result LT SERP might use body `[{"keyword":"dovanos porai","location_code":2440,"language_code":"lt","device":"mobile","depth":10}]`; verify those product-specific locale fields first.

The helper saves bodies, started requests, responses and costs. It does not decide whether a provider task succeeded. Inspect outputs before expanding. Existing completed matching requests are reused locally; an unfinished request/lock requires manual recovery. Never delete a lock merely to force another paid submission. Use a new run directory/key for a fresh observation. Preserve cumulative spend across separate plans.

Authoritative operational reference: [Treg live onboarding](https://treg.to/llms.txt), plus each endpoint's docs_url and current catalog_get. Snapshot pricing in this file is evidence of one audit date, never a durable tariff.
