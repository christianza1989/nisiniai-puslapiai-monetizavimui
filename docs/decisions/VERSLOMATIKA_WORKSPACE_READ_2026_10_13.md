# Workspace read projection before general team conversation

Status: proposed implementation contract,2026-10-13. Owner: primary UI/integration continuation. Existing independent UX peer reviews read-only. This implements the next provider-zero integration step under the owner's instruction to continue; it does not accept or activate general team conversation/runtime.

## Problem and decision

The portal currently composes legacy topic identity from separate authenticated discovery/creation lists. Its right pane is request-local; there is no canonical scoped task/result index. Client title/domain matching or a visible role card cannot provide the missing authority or team identity. Extend the existing core with additive `workspace-read.v1`, keeping all existing discovery, creation, artifact and registration contracts intact.

Initial read scope is explicit portfolio plus selection kind/ID (`portfolio`, `discovery`, `creation`, `business`). The portfolio selection ID must equal the portfolio ID. Three independently paged collections expose legacy topics, saved jobs and exact result metadata. The core binds each record to its underlying discovery/creation topic and original result revision/hash. The UI labels saved job state; it cannot infer currently running model work from an old job row.

## Authority and relationships

Reuse ordinary customer authentication/current verified owner checks, local customer guard and existing RLS. Every root and child is constrained to the same user, environment, portfolio and organization, with current session/account/membership rechecked on every page. Business selection additionally requires its current enabled grant; registration identities/fingerprints bind the eligible private creations. A relationship never grants access to a child. Foreign or revoked roots fail without exposing counts or labels.

Discovery/creation association uses the persisted link and exact build approval. Business association uses registration plus grant, not hostname/title/intake guesses. Historical private records remain owner-scoped even if another owner shares a business grant. Unknown/unregistered associations stay explicitly unbound. There is no lifecycle migration, phantom business or widened grant in this slice.

Select the latest registration before inspecting revocation; never fall back to an older non-revoked row. Association metadata deliberately uses `latest_saved`/`stale_saved` with literal `association_basis=saved_registration_identity`, rather than claiming the canonical verified `current` registration projection. This index validates identity/fingerprint/FK/grant and labels historical relationships; it does not execute the full accepted-candidate/native-intake proof. Canonical registration/profile/foundation readers remain authoritative for their stronger readiness and action claims. No consumer may promote readiness, grant execution or infer approval from this relationship index.

## Pagination and projection

Lists have bounded page sizes and deterministic immutable creation-time/typed-ID ordering. A signed cursor reuses the maintained cursor signing primitive and binds session/user, environment, portfolio, selection, collection, source revision, query and resolved relationship snapshot. Cursor expiry, source/relationship change or invalid anchor requires an explicit restart; errors never silently become an empty page. Search is a bounded literal substring of safe titles. Data is a live observation of saved records, not an execution receipt.

Results are grouped before filtering/pagination using only the supported legacy families: one latest saved report per discovery and one latest saved artifact per `(creation_id, kind)`. An old explicitly inspected revision remains independent. Group keys, maps, page deduplication and parent references use source kind plus ID throughout; equal UUIDs in different legacy tables cannot replace each other's metadata.

Return only customer-safe metadata, underlying topic/result references and exact revisions/hashes. Do not return raw messages, prompts, secret/provider fields, usage payloads, generated content or guessed URLs from this index. Artifact/report content is fetched separately through its existing exact reader after current authorization. A document selection must leave the outgoing composer/topic and draft intact; document loading/failure must not reopen another cached object.

An additive fixed result-detail GET resolves an exact report/artifact inside the same currently authorized graph and reuses the existing report/material validators. It requires revision and SHA256, supports an explicitly selected older result, and refuses a changed reference rather than reopening another object. Artifact raw content has the maintained512KiB storage bound; the portal allows at most3,200,000 serialized JSON bytes for this exact known document route (including worst-case escaping), validates original bytes/hash, then sanitizes HTML before browser delivery. Other response limits retain their previous bounds.

## Boundaries and later ADR

No model/external call, persistence write, migration, new memory/permission/scheduler/executor or calibration mechanism is introduced. No legacy assistant becomes an invented specialist author. Fixed execution roles remain observed workflow roles; general participant membership, tasks/delegation and durable generic topics/messages are still absent.

The next lifecycle ADR must define additive aggregate/segment FK and RLS constraints, trusted author/participant identity, durable owner-message/reply references, idempotency and current authority before any new message persistence. Real coordinator/specialist calls follow provider-zero contracts and accepted corresponding UI. All foundation/calibration/channel/deployment gates retain their existing authority.

## Acceptance and rollback

Verify strict schema/query bounds; unauthenticated/unverified/foreign-owner/foreign-portfolio/foreign-environment and revoked-grant denial; linked-child denial; exact relationship grouping despite identical names; duplicate typed IDs, paging and scope/source-bound cursors; original metadata hashes and historical job labels; corrupt source fail-closed; read-only storage and zero provider/job mutations. Portal verifies fixed paths, strict imported DTOs, stale/failed pages, independent document/draft context and small-screen keyboard interaction.

Revert the additive module/router mounts and corresponding portal adapter/UI to return to existing request-local readers. Preserve existing database/history/authentication and old builds. Source delivery, runtime adoption, human UI acceptance and main merge remain separate receipts.
