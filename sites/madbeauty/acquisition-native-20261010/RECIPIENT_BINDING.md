# Native recipient binding proposal

2026-10-10. Dependency: acquisition contract0.1.1 at exact source `f629b76cfe3f9738d452b7734d6b6d72b8ff8f29`, schema SHA `35b0a87cbda836464beaff4a53acc80403ce3a97c50d02098fb23a443fff9034`, [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66). Current actual Madbeauty runtime: `ba911586feb2cc33591368a05b7566c3c34c8ef7`, Worker `fd24248a-9e0b-4bf5-9eb4-c5c4ee1f6131`, core5661d5d. This document and codec are a candidate, not shared-schema adoption, mounted HTTP, durable outbox, installed keys or production integration.

## Exact native identity

`backend/auth.mjs:createAuth.start` line22 uses `String(email||'').trim().toLowerCase()`, then the actual254-character/whitespace/@/dot validation. It persists that value in email_challenges.email. `createAuth.verify` checks OTP consumption, attempts, expiry and session binding before looking up/creating accounts with c.email; returns stored account ID/email and verifiedAt. The authoritative proof input must come from the verified native account inside that server operation, never the browser-provided email or an LLM claim.

Canonical rule ID: `madbeauty-email-v1-js-trim-lower`. No Gmail dot/plus folding, IDNA conversion or casefold. UTF-8 bytes are the resulting ECMAScript string. The proposal helper accepts a verified string rather than auth-start's convenience coercion. Core must retain matching canonical bytes privately at invitation creation; implementing a different normalization is not accepted. The executable fixture covers uppercase/space, plus/dots and Unicode dotted I.

`backend/primitives.mjs:randomId` line5 returns prefix plus randomUUID. `backend/platform.mjs:createOrganization` line99 creates stable organization ID `provider_<UUID>`; same method attaches owner membership to actual account. `createPlatform.profile(id)` line73 returns publicOrg with the same ID when approved. Proposed native `provider_ref` and stable `profile_ref` are both this selected organization ID, scoped by native site/environment. A `revision_<UUID>` from submitRevision changes each submission; use it only as revision evidence. Staff IDs, display names, email and profile URL are not the provider aggregate key.

The native organization mutation validates CITY_NAMES (for example `Vilnius`), whereas public route selection uses lower-case city IDs (`vilnius`). The first offline fixture mistakenly supplied a route ID and correctly failed INVALID_INPUT. The fixture was corrected, not the city gate. Adapter integration must use the maintained city ID/name mapping for all103 cities; it cannot copy a five-city shortcut.

## Dedicated recipient HMAC

Use a distinct random server secret of at least32bytes for this purpose, with separate test/production grant and key ID. Do not reuse SESSION_SECRET, booking relay or transport key. No runtime secret is generated/installed by this proposal.

Core issues a192bit unpredictable challenge nonce, stored with invitation, scope, adapter, expiry and private canonical intended recipient. MAC input is UTF-8 encoding of compact JSON.stringify of this ordered string array, no final newline:

```
["madbeauty-recipient-binding-v1", "madbeauty-email-v1-js-trim-lower",
 business_id, site_id, environment_id, environment_class,
 adapter_id, recipient_key_id, invitation_ref, challenge_nonce,
 canonical_verified_email]
```

Return `recipient_digest = "v1=" + lowercaseHex(HMAC-SHA256(key, bytes))`. Core calculates the same MAC from its privately stored intended recipient and verifies cryptographically. Native reads verified account; core reads stored invitation recipient. Neither service trusts a body-supplied canonical email. Public links expose only the opaque invitation reference; analytics must scrub it. The codec validates token syntax/minimum encoded length, while issuance must separately prove192bits of random entropy; length is not an entropy check.

Proposed server-only request fields: proposal_version, full scope, adapter_id, request_id, invitation_ref, challenge_nonce, recipient_key_id, address_rule, recipient_digest, native_account_ref, native_verified_at, source_release. No raw email. Every field and exact raw body is signed using existing acquisition transport HMAC and a distinct verify-recipient permission. Core must validate trusted registration/scope/adapter/environment/class, challenge expiry, native signer and recipient digest before an atomic single-use challenge/recipient binding and durable request receipt. Identical request/body returns original receipt; changed body/request reuse or another account/ref binding returns409. Recipient digest alone is not an account attestation or replay ledger.

This needs a separately agreed strict request/receipt schema and route `/integrations/acquisition/v1/sites/{site_id}/verify-recipient` (proposed only). Do not add fields to strict0.1.1 ResolveRequest or LifecycleEvent. Root owns that schema/version/HTTP/replay implementation. Resolution challenge delivery, overlap/key rotation and five-minute expiry are proposed dependencies; no endpoint is advertised as available.

Synthetic wire example (not a request to a live endpoint). Dedicated public test key bytes are integers1through32; the fixed digest is checked by the executable fixture. Real account/ref/challenge issuance must replace the synthetic values. The proposal_version field is candidate-only until root finalizes the strict envelope:

```json
{
  "proposal_version": "madbeauty-recipient-proof-candidate-v1",
  "scope": {"business_id":"business-test","site_id":"madbeauty","environment_id":"capture-native","environment_class":"test"},
  "adapter_id": "madbeauty-native",
  "request_id": "00000000-0000-4000-8000-000000000001",
  "invitation_ref": "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
  "challenge_nonce": "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  "recipient_key_id": "recipient-test-v1",
  "address_rule": "madbeauty-email-v1-js-trim-lower",
  "recipient_digest": "v1=a39e849704152919e268adec4d97256611429ed7ed9f0eae2ac678615476bdf4",
  "native_account_ref": "account_00000000-0000-4000-8000-000000000002",
  "native_verified_at": "2026-10-10T01:00:00.000Z",
  "source_release": "madbeauty-native-proposal-v1"
}
```

## Lifecycle/outbox dependencies

1. Existing account verification precedes native provider creation, whereas every0.1.1 LifecycleEvent requires provider_ref. Preserve verified invitation attribution privately; only after ordinary successful organization creation bind that invitation to its actual owner-account and selected organization. Then enqueue buffered signup_started and account_verified with their original native timestamps and distinct monotonic revisions in the same atomic native creation transaction. These are proposal semantics awaiting core agreement, not emitted events today. Do not invent provider UUIDs before ordinary native creation. One invitation selects one organization/profile; additional organizations need their own attribution, not silent rebinding.
   Recipient proof alone is not a conversion or provider attribution. If organization creation occurs after invitation expiry but before a real provider binding, the default candidate leaves ordinary signup available and does not reactivate acquisition attribution. Root must explicitly define whether any new timely recipient-bound intermediate state can extend attribution; current0.1.1 only guarantees later callbacks for a provider already attributed before expiry.
2. organization.version is not the lifecycle counter: submitRevision updates state without consistently incrementing that field. Add one native acquisition aggregate counter across every event kind, with outbox event bytes and mutation committed together. Root's generic tasks/** registry/migration0011 remains separate; no second generic task/run registry here.
3. profile_submitted follows actual native submitRevision. profile_active requires actual operator-approved published revision and current eligible service offer(s), using `backend/offers.mjs:serviceEligible` and `createPlatform.profile`/catalogue results. Approved=true with zero currently eligible offers is insufficient. A new pending draft does not erase the previously published approved version. Eligibility evidence must incorporate applicable offer/qualification/current publication revisions, not an assumed org version.
4. Current expiry/offer withdrawal/moderation/account removal can deactivate eligibility. Dedicated hooks and durable reconciliation are still required. account_deleted is terminal only after actual account deletion; stopping an outreach sequence neither creates deletion nor revokes ordinary signup.
5. Capture acceptance must run isolated example.test with external_sent=false, actual native→core routes/replay ledger and restart. Current offline fixture proves native OTP/account/provider identity and MAC separation only. No real SMTP/outreach or canonical runtime migration is part of this step.

## Scope and adoption

Own proposal/test paths only. Existing main Worker, namespaces, schema, mail, shared acquisition/task/portal sources remain unchanged. Contract acceptance, route/outbox implementation, native eligibility hooks, compiled Workers tests, core replay evidence and eventual source adoption are independent future records. A proof proposal does not establish an integrated provider_signup pipeline.
