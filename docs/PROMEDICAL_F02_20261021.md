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
Deployment and local verification states are separate. Local normal build,
80/80 core tests, TypeScript and focused lint PASS. Actual local HTTP checks:
401/401 covering296 genuine later-page URLs, all574 historical forms and26
controls; eight desktop/320px browser states PASS. All1402 exact title/meta/body
comparisons PASS against the immutable package. Other9 tenant SEO smoke checks
PASS against the same built Worker. The baseline96 URLs of those domains fail
DNS on this PC; they are not described as healthy live endpoints. Registry
parity preserves all10 packages and3780 release assets match byte hashes.
Local F01/F19 also PASS1402/1402: all5557 related anchors resolve, visible and
LLM links agree, maximum product href depth3. The2212-response crawl includes
all55 held guides404 and a synthetic unknown404. Production activation still
requires the same complete candidate gate; these source checks alone are not
a live-deployment or search-indexing claim.

Primary guidance opened2026-10-21: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading

## Actual production acceptance

2026-10-21: source PR52(public) and242(Core) merged; actual promedical Worker
4262d312-9ee9-4324-8344-24ef2e98bf54 deployed at0% then100%. At both stages all1402
exact product title/meta/body and F01 checks PASS,296 genuine pagination and574
historic forms PASS,55 held guides404 and8 browser states PASS. 130 uploaded
module byte hashes match the built source. Immutable package and3780 assets
preserved; no rollback trigger. Retain prior F01 version5f4fcc9f-1856-4597-ac15-7bbb8cea8e06.

The final authenticated API control initially returned401 after an OAuth token
captured before upload expired. Standard Wrangler refresh and a separate
control-only confirmation resumed after all site checks passed; no deployment
was repeated. Original failure receipts retained. Long acceptance clients must
reload refreshed credentials rather than reusing a captured expired token.
Raw private receipts: success.json, auth-resume.json, final-confirmation.json
under the existing output directory. No claim about other PCs, Google indexing
or healthy live DNS of the9 baseline-unavailable domains.
