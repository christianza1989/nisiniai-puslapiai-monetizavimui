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
