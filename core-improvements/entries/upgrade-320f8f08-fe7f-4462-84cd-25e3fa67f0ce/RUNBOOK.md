# Private native continuity

An initial private intake stores the original native site hash. Maintained GUIDE,
media and editorial operations legitimately change that site. Replaying the
initial importer must still reject the changed site; it must not reconstruct or
overwrite the customer's evolved content to renew a source binding.

## Owner operation

Use the existing owner endpoint
`POST /customer/v2/creations/{creation_id}/private-preview-intake` with the exact
accepted revision and candidate SHA plus a **new explicit idempotency UUID**.
There is no additional endpoint or client-controlled filesystem/anchor field.
The ordinary current Session, owner, idle Creation, accepted material and source
checks run before admission and after the observer. Existing UUID replay, pending
lease and owner-at-commit fences remain in force.

For an already imported private case, the server anchors this append-only request
to an original successful non-continuity receipt for the same accepted revision,
owner, candidate, private host, source context, importer, companion and network
fingerprints. Only the historical Session/source revision may differ. The outer
binding remains `creation-private-intake-binding.v1`, compatible with migration
0042; the additive exact `continuity` marker pins the original request/receipt and
their digests plus the current observer script hash. Later renewals anchor that
original import directly, never a chain of renewed observations.

`customer-private-native-continuity.mjs` is a fixed server-only reader. It checks
the retained source, context and exact canonical manifest bytes, private V2 native
shape, owned page mappings and actual media bytes/hash/decoding. It reads no
arbitrary client paths and writes/imports/repairs nothing. The resulting receipt
retains every original intake field, including the **original** `siteFileHash`,
and adds current native site/media observations with all authority actions marked
`not-performed`. Blank private contact/operator facts and empty planned guides may
remain private unknowns; continuity is not publication readiness.

The current owner/source request supplies authority. The old receipt supplies
immutable provenance only. Explicit current-source S6 continuation remains a
separate operation; renewal grants no GUIDE execution, source/media verification,
editorial review, approval, release, deployment or channel activation. Non-null
canonical-host behavior and the initial importer/replay are unchanged.

## Failure and reconciliation

Changed candidate/revision/owner/native fingerprints, missing or revoked authority,
modified original artifacts, malformed current native state and missing/corrupt
media fail closed. A continuity request never falls back to the importer. An
existing terminal failed UUID is acknowledged without rerunning; only a new
explicit UUID can request a fresh observation after the cause is resolved. Keep
the failed receipt and all original Job/Attempt/Revision usage and hashes. Do not
rewrite historical records, manifests, private host fields or accepted payloads.

Retained pending requests follow the existing lease/reclaim rules and the same
pinned original anchor. Source/owner/anchor changes cannot commit a successful
receipt after observation. A successful replay acknowledges its immutable receipt;
it does not perform another import or renew S6.

## Integration validation

Local synthetic Node tests exercise the real initial importer, maintained GUIDE
writer and media attachment, then observe the evolved case and compare all file
hashes. Offline Python tests exercise admission/replay and strict observer-output
validation with explicit fake SQL/authority seams. These are not PostgreSQL proof.
A separate real Python-to-Node subprocess regression checks canonical digest and
strict observer receipt parsing after a maintained native mutation, preserving
all retained bytes. Its authorization callback is explicitly synthetic.

The integrating owner supplies an empty dedicated migrated QA database and the
normal native Node/companion/network configuration before opting into:

```powershell
$env:PINET_PRIVATE_PREVIEW_QA='1'
$env:PYTHONPATH='agent-business-core/runtime/src;agent-business-core/runtime/tests'
python -X utf8 -B -m pytest -p no:cacheprovider -q agent-business-core/runtime/tests/test_private_native_continuity_pg.py
```

The five QA cases use restricted owner HTTP/RLS, real Node operations and inert
synthetic content/media with explicit synthetic source identity seams. They retain
their own append-only QA rows/files and do not provision a database or call a paid
provider. They cover evolved-source renewal, immutable original artifact tampering
and revocation after observation. Helper collection alone is not execution,
serving adoption, actual customer continuity or approval evidence. Root owns those
checks and the subsequent ordinary owner renewal/S6 on the actual private case.

Rollback is a scoped source revert. Retain append-only requests/receipts and native
content/media; do not repair a source rollback by destructively restoring old data.
