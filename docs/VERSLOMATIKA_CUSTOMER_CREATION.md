# Customer business draft creation and calibration

Direct human scope2026-10-10: autonomous customer UI registration/conversation → exact mokyai-ai.lt business preparation → delivered work → critique/revision and further synthetic businesses. Today's minimum is a usable test customer creation slice; continue broader business acceptance afterward. Domain dashboard categorization/top200 explicitly delegated under issue76. Creation scope [issue77](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77), upgrade-8487ac2f-6c9a-4487-8bfe-e7e9c70c95ec.

Separate own branch codex/verslomatika-customer-creation-20261010 from P3 source4db56be; actual start gate private13c9649/publicec8a9c0. Stable P3 API8855 and earlier pilots preserved; new creation API8860/portal3019 reserved. Frontend remains director-owned. Same User/Session/Organization/Portfolio and PostgreSQL; no second auth database and no grant of an existing Business merely from a entered hostname.

## Current implementation status

Canonical creation.v1 wire is specified at `docs/contracts/verslomatika-customer-creation.openapi.json`; runtime, migration, actual generation and UI acceptance are **in progress, not yet PASS**. First slice provides an actual AI business proposition and private website draft with immutable artifacts and revision feedback. `draft_ready` means this bounded draft is ready to inspect; it does not mean audited F1 site/public deployment, supplier/checkout/service execution, established demand or verified domain availability.

## Workflow and boundary

POST customer/v2/creations starts an idempotent persisted job in a currently owned verified customer portfolio. Status/events and private artifacts use the same current session/membership. A revision request names the exact delivered base revision and creates a separate job; late/conflicting feedback is409. Cancellation, session reset/logout, disabled user/membership, source mismatch or expired lease prevent late results from becoming a new revision. Failed revisions preserve prior drafts. Reads do not require runner admission to stay enabled.

The browser cannot choose executable/workspace/model/tool/provider permissions or arbitrary fetch/file paths. Codex adapter is fixed, instruction/source snapshot and budget bounded; structured data is validated and rendered by controlled preview components. All text escaped; no generated scripts/HTML execution, remote preview assets, forms, top navigation or same-origin iframe access. Downloads are exact owned artifact IDs, not a generic proxy. Content JSON is explicitly a private business draft, **not an approved shared content-package release**. Shared studio/release/public renderer/F1 audit integration is a separate remaining acceptance step.

## Required evidence

PostgreSQL fresh migration/downgrade/reapply; verified/foreign/current/revoked ownership; idempotency/content conflict/busy/stale revision; atomic artifact publication and persistence across process restart; cancel/lease/session revocation during execution; no tool/path override; unsafe output/schema rejection and escaped preview; real pinned CLI source/model/instruction/usage receipts. Actual paired frontend and test customer business/critique/revision, original FAILs and corrections retained. No test PII/token/outbox/DB contents in Git. Known-case regressions separate from new protected calibration cases; voice/SMTP outside expressly requested text UI slice. Bounded scenarios do not prove ideal behavior for every business.
