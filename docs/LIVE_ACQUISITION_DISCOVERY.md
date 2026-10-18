# Bounded acquisition discovery evidence

`runtime/scripts/acquisition_discover.py` is the private operator entrypoint for
Google organization discovery through the existing authenticated Treg CLI. The
shared adapter can serve any site's admitted search plan. It does not create a
second CRM, model runner or calibration system.

A hash-pinned private `DiscoveryPlan` fixes the site/campaign, source revision,
Treg organization, UUID run, current approval/expiry (at most one day), one to ten
unique query/country/language triples, excluded hosts, expected per-query price
ceiling and zero to twenty primary reads. The CLI requires a clean matching Git
HEAD and the exact executable SHA256. No browser or model can select a different
endpoint or invoke a shell. The sole endpoint is `anyapi.google.serp.organic`;
each query requests one page of at most ten results.

Before each paid request the adapter reads the current catalogue and refuses an
unknown, variable-unit or above-ceiling price. The known fixed per-call price is
an admission estimate, not a guaranteed provider billing cap. The actual charge
and provider receipt are retained; unknown or excessive charges stop before the
next query. Both Treg organization and executable remain explicit. Windows CLI
JSON uses forced UTF-8: a real initial probe otherwise returned CP1252 German
text and failed JSON decoding after its known 500-micro-USD request completed.
The original bytes and charge are retained; that failed parse was not replayed.

An exclusive per-run directory retains the approved plan, a durable intent
before every provider call, exact result and actual charge. A deterministic
Treg idempotency key derives from run/query IDs. A failed or ambiguous query
does not automatically retry; an existing directory refuses replay. Stopped
receipts separate attempted queries from completed replies and unreconciled
queries. A new ID is a new authorized search, not reconciliation of a prior
uncertain request.

Results pass through canonical `review_discovery_urls()`. Local exclusions,
unsafe URLs, credentials and duplicate URLs remain enforced even when a search
provider ignores its filters. Only one URL per hostname becomes a primary read,
bounded by the operator's read allowance, using the existing `PublicResearch`
source catalogue, HTTPS/DNS/time/size rules and retrieval receipts. Unavailable
pages remain unavailable; the adapter does not invent a different source.

The private `evidence.private.json` retains search rows, requested market and
original source text. Requested geography is not verified geography. Qualified
and contactable prospect lists remain empty until actual evidence-based research
and qualification. Public email visibility is not consent or a send permission.
This stage neither imports contacts into CRM nor sends mail, enables a scheduler,
resumes suppression or automatically activates a campaign. Native saved-agent
research/qualification, current contact authority and reviewed transport are
separate consumers to connect and verify.

Run from the runtime directory after normal paired Git freshness:

```powershell
python scripts/acquisition_discover.py --plan ABSOLUTE_PRIVATE_PLAN.json --plan-sha256 EXACT_PLAN_SHA256 --treg-executable ABSOLUTE_TREG_EXECUTABLE --treg-sha256 EXACT_EXECUTABLE_SHA256
```

Plans, public-source captures, provider results and contacts remain ignored in
`runtime/artifacts/acquisition-discovery/<siteId>/<runId>/`. The command prints
only the bounded receipt. It does not install, sign in, expose credentials or
top up Treg. Use the configured organization and existing local CLI login.

Verification covers unsafe/excluded/deduplicated sources, primary read limits,
strict plan/expiry/identity, no contactability inference, retained unknown and
excess charges, no replay, fixed CLI arguments/endpoint, price-before-call,
executable integrity and Windows UTF-8. These inert checks do not prove scheduled
production discovery or live campaign readiness.
