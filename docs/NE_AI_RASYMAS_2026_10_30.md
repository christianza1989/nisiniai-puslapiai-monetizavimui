# NE-AI-RASYMAS integration — 2026-10-30

Owner request: adapt the supplied Lithuanian editorial skill for all future website content without weakening SEO/GEO, factual fidelity or existing operational rules. Coordination: issue306.

## Source and delivery map

- CORE base: 25292e20219b735df7f04c5807dd4c100f98addc; own branch codex/ne-ai-rasymas-20261030.
- PUBLIC read-only base: c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Its AGENTS already points to the canonical Core language policy; no duplicate renderer policy needed.
- Canonical adaptation: SKILLS/niche-content-planner/references/language-quality.md. Existing AGENTS, PROJECT_CONTRACT, builder/audit references and Studio loader already route here.
- Planner entry and review explicitly invoke the adaptation. Only the planner entry hash changes in catalog.json.
- Studio src/editorial-skill.mjs already loads the full policy for both plan and draft and fingerprints each job snapshot. Runtime, schemas and historical fingerprints are unchanged.
- Owner-authorized Drive adoption: Tekstu-Sistema-v2 START.md2.4, CORE-TEKSTUI.md, NE-AI-RASYMAS.md, four Gemini writing/correction templates, Antigravity product instruction and review template. The browser writer receives the actual embedded text, not an inaccessible local path. Template replacement fields remain intact.
- This instruction-maintenance task does not start a writing batch or assume another chat's product/article assignment.

## Semantic conflict review

The supplied skill is editorial input, not a technical facts source. Manual rule review against the existing evidence, intent, GEO, schema, authorship and publication contracts produced these decisions:

| Input tendency / case | Adopted decision |
| --- | --- |
| Replace generic praise with detail | Keep verified model-specific detail; omit unsupported praise. |
| Replace vague associations with causes | Preserve uncertainty and association; require evidence for a cause. |
| Remove anonymous authority | Verify the named source or omit the claim; removing attribution does not validate it. |
| Every specification needs a benefit | Benefit only when supported; a standalone precise specification is valid. |
| Aluminium / IP rating / adjustable-height examples | Do not copy example numbers or infer non-overheating, installation permission or health outcomes. |
| Delete all negative constructions | Remove empty rhetorical contrasts; preserve real negation, component exclusions, safety limits and comparisons. |
| Ban words, triples, passive voice; enforce short sentence rhythm | Contextual editing, no lexical blacklist, count quota or forced rhythm. Exact terms and grammatical passive constructions remain valid. |
| No definitions | A useful definition remains valid for a “what is” intent. |
| Avoid repeated keywords | Preserve meaningful terminology and natural Lithuanian inflections, not exact-match positions or keyword density. |
| Remove unknown facts | Omit unnecessary details; unresolved consequential claims remain private blockers. Never remove a necessary limitation merely to shorten text. |
| Use prose, limited lists/tables | Choose the useful structure within the actual adapter; V1 format stays restricted. |
| Human-like voice | No fabricated human authorship, experience, expert review or detector guarantee. |
| Core author edits vs designated Gemini workflow | Preserve owner-designated roles; designated author self-edits, reviewer supplies precise corrections. |
| Edit approved prose | New revision review remains mandatory; no approval/hash/date rewriting. |

These are instruction-review decisions, not evidence of newly generated article quality. Existing sites were not rewritten or reapproved.

## Validation

- Actual paired freshness: PASS after the companion checkout completed. Earlier attempt while checkout was still being created returned BLOCKED; no source editing preceded successful paired gate.
- Existing editorial-skill integration suite: 6/6 PASS. It covers real prompt transport using a fake CLI, plan and draft full-policy inclusion, snapshot stability/new fingerprint, and fail-closed missing policy. No paid generation or public prose was generated.
- Initial test starts failed for missing sharp and missing companion network-settings path. Installed the repository's locked Studio dependencies in the isolated worktree and supplied STUDIO_NETWORK_SETTINGS; no source workaround.
- quick_validate.py for niche-content-planner: PASS with bundled Python and isolated PyYAML. Initial host Python/PyYAML unavailability was corrected only for this validation environment.
- Drive adoption integrity:13 guarded writes verified against before/after SHA256, four complete identical editorial prompt blocks inside the sent template body, unchanged replacement fields, exact canonical policy in the Drive copy, and matching planner catalog hash: PASS.
- git diff --check: PASS.
- Broad audit-skills reports unrelated existing discovery junction issues and niche-business-tools catalog drift. Those were not repaired or relabelled PASS. Planner structure/hash and changed-reference integrity are checked independently.
- Private receipts, original attachment, byte backups and verification helper: D:/Core/output/ne-ai-rasymas-20261030. No credentials, article drafts or customer data added to Git.

## Adoption and rollback

Drive files are updated locally in the synced folder; this does not prove remote Drive propagation or that an already-running writer has reloaded them. START requires the new template for the next writing/correction job; active jobs keep their original snapshots.

Core is delivered through the scoped PR. Until reviewed main merge, other checkouts do not automatically use the branch. After merge, their normal freshness gate and explicit instruction read load the update. Installed mirrors do not override the project checkout. No other agent's checkout or personal skill mirror was overwritten.

Rollback: scoped Core commit revert; Drive restore only the recorded files from byte backups after verifying their current hashes still match this update. If another writer has edited a file since, reconcile it instead of overwriting. Existing website content, author roles, review/approval/release rules and runtime remain intact.
