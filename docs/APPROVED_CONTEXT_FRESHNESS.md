# Approved context and the ORM identity map

Clearing an Authority phase does not clear its caller's SQLAlchemy AsyncSession
identity map. `approved_build_context` previously used `get(Discovery, id)` without
`populate_existing`; a later call in the same transaction could reuse an earlier
mutable parent status or linked Creation. A fresh phase alone was insufficient.

The narrow canonical repair adds `populate_existing=True` to the existing
BuildApproval select and Report/Discovery/DiscoveryJob get calls in that one
function. Its signature, validation body, RLS scope, error transformations,
other discovery functions and database schema are unchanged. Standalone calls
also get fresh rows, rather than relying on an Authority-specific workaround.

The fakeTx reproduces SQLAlchemy's identity-map behavior only for those get
calls: a native-time replacement of the stored Discovery with status cancelled
used to let final Authority capture succeed. The retained initial failure is
1FAIL68deselected13.37s, SHA256
`1588c826cd67792a10d55d811b98c52bed167d873eb82f2cc87c6a506309a710`.
The same test after the repair must refuse through canonical503
`invalid_approved_plan`. Standalone repeat reads additionally test changed
Discovery linkage and Report revision. This is modeled ORM evidence, not an
actual PostgreSQL isolation/RLS acceptance claim.

The final389-case pure/offline regression includes this exact former failure and
the standalone identity-map cases:389PASS24.35s, SHA256
`6cab486bcbf0600ad3d3c7b0c463c3c32b610298b61d2ca03f47b01d9f160957`.
The existing approved-context suite separately passes36 cases4.05s, SHA256
`025e975efee978e89071496262ac1e68e4325aa29943dc738f5b506f3b0384e0`.

After the separate late-S actor fix, a final combined run passes428 cases67.15s,
with one actual-process case deselected and one existing invalid-UUID warning:
`b08aa6a62e62bbed66938ad49803c59291f3b5a71239842d87874b3528bf02f6`.

Root explicitly authorized this tenth runtime source path after the original
nine-file observation plan. Separate upgrade
`fd868d05-f4d3-449b-b2e8-510855bf5207` owns only
`agent-business-core/runtime/src/pinet_core/business_discovery/service.py`.
The original upgrade record remains immutable. No eleventh runtime source path
is included, and Root owns actual DB/serving/adoption checks.
