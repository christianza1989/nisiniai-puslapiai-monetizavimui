# Synthetic correspondence recipient namespace

At source84983aba4cdf5343f0cb3e8c231c6ad5309017e9, independent native manifest
validation rejected a known-case address under a subdomain of `example.test`.
The dialogue lab accepts `.test` recipients, but native correspondence accepted
only the exact `example.test` host. Source/corpus validation alone therefore did
not prove native admission. The first sealed manifest remains rejected and
immutable; no model call or Task binding was created for it.

`correspondence.recipient_hash` now accepts the legacy exact host and valid ASCII
DNS subdomains of `example.test`, with total address length at most254. The
existing lowercase local-part and consecutive-dot rules remain. Real domains,
other `.test` namespaces, suffix lookalikes, malformed/oversized labels and
header injection remain rejected. This is a non-sending synthetic identity
allowlist, not a production email validator or mail transport permission.

The digest version and input bytes are unchanged. Existing exact-host identities
remain byte-identical; different subdomain addresses keep distinct identities.
No stored identity, original address, corpus, protected expectation or historical
manifest is rewritten. A corrected runtime must use a newly reviewed source
snapshot and genuine matching authorizations; it cannot execute an old failed
manifest by ignoring its source or hash. A pre-model failure is not a customer
quality result. Unknown/spent attempts are never refunded by this change.

Regression:23 new boundary cases first reproduced5FAIL/18PASS, then passed in a
combined80 tests and39 subtests with maintained correspondence, native-chain and
dialogue suites (3.63s). Legacy hash, distinct subdomain identities and denial of
live domains are covered. Actual sealed native validation and model execution
remain separate evidence.

## Native inbound follow-up

The first paid positive known case at16199341 passed research and email review,
and committed one native Case/original outbound MailMessage. Its first reply
then failed BEFORE inbound persistence or reply Task dispatch: the separate
`work_interfaces.SyntheticAddress` still rejected reserved subdomains. The
boundary-only first correction did not prove that actual MIME→DTO bridge.
Original failure and charged calls remain; no successful full dialogue is claimed.

The maintained SyntheticAddress type now contains the bounded pattern, strict
string/254-character limit and local-part checks. Both InboundCapture and
recipient_hash consume this same type. The compiled TypeAdapter is a schema
validator, never a permission/proof cache. No digest, persisted original,
transport authority or migration changes. New actual MIME→parse_bound_reply→DTO
tests reproduced4FAIL/32PASS before repair; the combined maintained selection
then passed115 tests/64subtests. Real domains and malformed sender values remain
denied at both entry points. A retained PostgreSQL two-reply regression separately
exercises canonical Case/MailBinding/common Task/Run with inert model roles.
That retained SQL test passes1/18.40s: one Case, five originals, two MIME inbound
captures and two completed native reply Tasks. Its first helper-signature miss
and then an unpinned test work-scope SELECT are retained separately; correcting
only the test's canonical scope pin exposed the committed row, without changing
runtime RLS. Operating data and paid calls were excluded from this regression.
