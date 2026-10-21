# Promedical F02 — tikro puslapiavimo canonical

Owner directly authorized this Core change and live deployment in the current
chat with „Leidžiu“, following channel148 and the explicit Core/live exception.
Source baseline: Core72fec0b24138e2453b7e7153a9e918b07dd5a5bb,
public63e93420037d95d59ed4ae4379a401596ac20055. Own branch
`codex/promedical-f02-pagination-20261021`; issues private241 / public51.

Current production correctly renders distinct later catalog slices but all
canonical URLs point to page1. Historical audit574 entries represent287 HTTP
addresses, each with and without `#turinys`; fragments never reach the server.
The current complete catalogue has296 distinct page2+ URLs (nine additional
pages after catalog membership repair). All574 historical forms were fetched
read-only before implementation; a text-node whitespace parser diagnostic was
corrected and retained privately, not represented as a site failure.

## Implementation

- One `catalogueQuery` in public `lib/product-catalogue-query.mjs` retains exact
  catalog memberships, raw code search, filtering, order and page clamping.
- SSR layout uses that same decision for canonical and matching Open Graph URL.
- Proxy overwrites `x-niche-original-query` from actual URL search, including
  empty queries, so user-supplied context cannot spoof canonical metadata.
- Pure `p=N` pages self-canonicalize; first/invalid pages use the collection
  root; out-of-range duplicates use their actual clamped result page. Facets,
  sorting, tracking, unknown keys and repeated p values retain base canonical.
- Existing real HTML pagination anchors, title/meta/prose, package approvals,
  F01, publication filters and sitemap inventory remain unchanged.
- Other tenants retain their exact existing canonical behavior.

## Acceptance

Focused tests cover the complete production collection model, distinct page
slices, malformed/duplicate/filter/sort queries, products/guides/other tenants
and preserved exact catalog order / SKU search. Full test:core, typecheck,
focused lint, normal immutable-package build, actual HTTP canonical/pagination,
F01 1402, exact1402 title/meta/body and55 held guides404 are required. Verify
other9 tenants in the same build and desktop/320px catalog pagination.

Production sequence: fresh two-repo source → reviewed scoped PRs/main → existing
immutable package7950c133-596c-489d-a7a5-67dddcc05696 (SHA256
e84a27e204e9303258f7fa5e042993170537d745342ba71a6181d1191da98a8c) and assets →
candidate0% with explicit version attribution/full acceptance →100% with the
same unforced acceptance. Owner rollback triggers: changed product title/meta/
body, unexpected404/5xx on positive pages, exposed paused guide or other-site
regression. Retain prior active F01 version5f4fcc9f-1856-4597-ac15-7bbb8cea8e06.

Private raw evidence and checkbox plan: D:/Core/output/promedical-f02-preflight-20261021.
Deployment and local verification states are separate; this preparation record
alone does not prove either. Final checked results are added before PR delivery.

Primary guidance opened2026-10-21: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
