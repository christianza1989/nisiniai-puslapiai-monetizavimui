# Read-only Treg discovery example — 2026-10-08

Purpose: future supplier/product discovery for a tyre sourcing business. This is a capability example, not confirmed stock, an accepted tractor BUSINESS migration, provider execution or a promise of fulfilment. No provider call, payment or outreach occurred.

## Product page extraction: tinyfish.web.fetch

Catalogue search/get returned POST with urls (1–10), format html/markdown/json, links and ttl; ttl 0 requests a fresh fetch. Output example contains results and errors. Catalogue cost reports USD 0 per URL, checked 2026-09-23 ([provider pricing](https://www.tinyfish.ai/pricing)). Re-check current price/quota before use; this is not a permanent price guarantee.

Future input: relevant public supplier product URLs. Output: extracted size, brand, load/speed rating, stock/price assertions and source timestamp, each checked against the actual source. Catalogue access does not verify LT/LV/EE/PL/DE coverage. Our multilingual/product accuracy is UNVERIFIED. Vendor observed HTTP ok_rate 0.9993 over 193570 decided samples is technical evidence only.

Fallback: source inspection / manufacturer's technical data or another bounded extraction provider. Stop on size mismatch, missing country/VAT/shipping terms, blocked access or unbounded cost. Trigger: real sourcing inquiries and authorized adapter experiment. Owner: niche implementer. Acceptance: known source fixtures with exact tyre identity and dates, missing-price handled explicitly, no competitor links leaked into our customer offer. Status: candidate, future; no live adapter provisioned.

## Supplier discovery: openmart.businesses.search

Catalogue get returned POST query / limit / estimate_total. Shared-key limit documented as 1–25; upstream schema's max1000 is not the shared allowance. Cost is per returned record, 0.3 credits, rounded per operation; catalogue USD equivalent 0.00894 per record, checked 2026-09-17 ([pricing](https://www.openmart.com/pricing), [API](https://app.openmart.com/api-docs)). Ten separate one-record calls can differ from one ten-record operation; do not budget from search headline alone.

Future input: explicit supplier category/name and required country; output candidate companies, then inspect original domain / legal identity / relevant product. Catalogue match_score0 is a miss, and vendor review reports a Belgium query returning a US business even with high match score. Country/entity relevance and tyre supplier coverage therefore UNVERIFIED despite vendor reported ok_rate1.0. Never treat an enriched record as buying intent or outreach permission.

Alternative: manufacturers' public dealer lists and actual regional distributors. Test requires correct geography, entity/domain and relevant supply evidence; discard mismatches, cap returned rows and total cost under a separately authorized budget. Store minimum nonpersonal provenance; supplier messaging follows current authorization/source terms. Trigger: qualified sourcing demand, positive economics and scoped test permission. Status: deferred until those conditions. No customer contacts stored.

## Catalogue conflict handling

Discovery also returned routed treg.web.extract. Its actual catalogue describes provider routing and billable misses, contrary to a general statement in the installed Treg skill that it does not route. Verify the particular endpoint; do not import a stale blanket rule or treat routed headline USD0 as free. Not selected here: cost varies and no operational route budget was authorized.
