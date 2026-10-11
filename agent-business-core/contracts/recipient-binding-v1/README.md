# Recipient binding sub-contract 0.1.0

Additive to [acquisition0.1.1](../acquisition-v1/README.md). Its schemas/vector stay unchanged. This bundle does not mount routes, provision keys, persist a nonce or prove an actual signup. Canonical source: [recipient_binding.py](../../runtime/src/pinet_core/acquisition/recipient_binding.py); regenerate/check with `uv run --locked python scripts/acquisition_recipient_contracts.py` / `--check` from runtime. [schemas.json](schemas.json) is the strict wire authority, [recipient-vector.json](recipient-vector.json) a disclosed synthetic fixture, [JS codec](recipient-binding.mjs) the shared native normalizer/MAC implementation.

Agreed with native [PR68 exact proposal](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/blob/7f9a47b6ef09ac1f8e2f22377827a61d6800faa0/sites/madbeauty/acquisition-native-20261010/RECIPIENT_BINDING.md) in [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6092144585). Envelope recipient_contract_version="0.1.0", not proposal_version. Existing ResolveRequest/LifecycleEvent are not extended with proof fields.

## Server targets and grants

Proposed POST `/integrations/acquisition/v1/sites/{site_id}/recipient-challenge`: permission recipient-challenge, RecipientChallengeRequest → RecipientChallengeReceipt. Proposed POST `.../verify-recipient`: permission verify-recipient, RecipientProofRequest → RecipientProofReceipt. Both use acquisition's exact raw-body transport signature, registered current scope/adapter/permission and clock/body limits. Browser/LLM cannot assert verified identity. These routes are still **unmounted**.

Challenge request contains only scope, adapter_id, invitation_ref, request_id and recipient version. Receipt states issued/expired/stopped/already_bound; only issued has a challenge. Challenge contains a192bit random base64url nonce (32characters, no padding), registered recipient_key_id/address_rule, issue and expiry. Lifetime is at most300seconds and no later than invitation expiry. Core privately stores intended canonical email, scope, key/adapter and nonce in the same transaction as its immutable receipt. Token length alone is not an entropy test.

Proof contains scope/adapter/ref/request UUID, exact challenge nonce/key/address rule, recipient_digest, actual native_account_ref/native_verified_at/source_release. No raw email or made-up provider ID. Core checks all fields against the registered grant and stored challenge/invitation, validates native time against its clock policy, and compares the expected MAC from the **privately stored intended recipient**. It never calculates the expected recipient from request body or model text. Receipt contains scope/adapter/ref/request UUID, recipient_bound and bound_at, external_sent=false; it is not a provider conversion or active-profile metric.

Recipient keys must be random >=32bytes, <=1024bytes, purpose-specific and distinct from transport/session/booking keys, with separate environment grants. An unknown/retired key cannot be selected by the caller; challenge binds its registered key. Rotation needs an explicit accepted-key overlap bounded by existing unexpired challenges. No secret/default production key is included or installed here.

## Canonical identity and bytes

Madbeauty's actual auth source at ba911586 uses String(email||'').trim().toLowerCase(), then native validation. Authoritative proof input comes from the verified stored account inside native server logic. Shared JS canonicalNativeEmail deliberately accepts only that string and follows the native254UTF16-unit/whitespace/@/dot rule. Keep plus/dots; no Gmail folding, IDNA or casefold.

Core invitation creation must call/reuse that registered authoritative JS normalizer, retain its exact UTF-8 output privately and record the rule/source version. **Python MAC does not normalize email.** Actual local NodeUnicode17 and PythonUnicode15.1 differ; applying Python strip/lower and assuming equivalence would create another identity implementation. Node/registered normalizer availability and actual native runtime parity are deployment prerequisites; there is no silent fallback. A missing normalizer blocks invitation preparation. Neither wire request accepts a body-supplied canonical email. Invalid Unicode strings fail closed.

MAC bytes are compact UTF-8 JSON of the ordered string array, no final newline:

```
["madbeauty-recipient-binding-v1","madbeauty-email-v1-js-trim-lower",
 business_id,site_id,environment_id,environment_class,adapter_id,
 recipient_key_id,invitation_ref,challenge_nonce,canonical_email]
```

Digest is v1= + lowercase HMAC-SHA256 hex. Vector key bytes1..32 are public fixture values, never configured credentials. Python computes from stored canonical bytes; Web Crypto reproduces all three vectors, including dotted-I.

## Durable binding, replay and lifecycle

Runtime must authenticate, lock the invitation/challenge, check active scope/campaign/expiry, compare MAC, and atomically consume nonce/bind actual account/store exact receipt. Request key is scoped business/environment/adapter/operation/request UUID. Same UUID/same raw bytes returns the original receipt, even after expiry; changed bytes409. A different account/ref/key/challenge binding409. Fresh UUID after consumed nonce409; replay cannot create another binding. MAC helpers and DTOs do not implement this ledger. Missing invitation404; unbound expired ref/challenge410; stopped409. Stop states must not prevent required privacy processing of an existing binding.

Native OTP happens before ordinary createOrganization. Preserve private verified attribution until successful actual org creation, then atomically select one actual provider_<UUID> for provider_ref/profile_ref and enqueue buffered signup_started/account_verified with their original occurrence times and distinct monotonic acquisition sequence values. Never use revision UUID or organization.version as the aggregate key/counter. Multiple orgs need independent attribution. Bind provider before original invite expiry; recipient proof does not extend it. Later callbacks for an already attributed provider remain allowed after invite expiry. Stopped/expired refs cannot be reactivated; ordinary signup still works.

Profile-active needs current actual eligible offers and approved published revision. A newer pending draft must preserve an earlier valid published version. Qualification/offer withdrawal/deactivation/account removal need transactional hooks and durable reconciliation. Generic core tasks/0011 registry is separate; this bundle adds no duplicate runner.

Acceptance still requires isolated example.test native→actual core routes/DB, scope and recipient mismatch, duplicate/changed request, expiry, account conflict, native atomic buffer/outbox, provider eligibility/deactivation/deletion, restart and stop checks. Every receipt is external_sent=false; no SMTP, production account activation, scheduler or discovery is enabled by this contract.

Pre-provider account deletion additionally needs a defined authenticated recipient revocation/retention callback and durable native retry before enablement. Remove private pending attribution; never fabricate provider_ref to fit lifecycle0.1.1. That privacy operation is still a separate schema/runtime dependency. Preserve permitted minimal replay/suppression evidence without retaining deleted native account detail as an active binding.
