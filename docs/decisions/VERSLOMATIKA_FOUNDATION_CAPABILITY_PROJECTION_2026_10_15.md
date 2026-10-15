# Foundation-dependent customer-agent draft capabilities

2026-10-15. Owner-authorized independent completion review, coordinated with
the primary Verslomatika chat. Own branch
`codex/verslomatika-completion-review-20261015` starts at
`9c618026bb7f57dadfbe77f4e93e30dbdbf92b8c`. Paired freshness fetched private
main `808581d919d06cb4a2d151cc7f9ec1be1782aba2` and companion main
`ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; inspected companion source is
`1a26f289092cecadc5799de898e809dc1769498a`.

Reservation: [issue 66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6182939715).
Primary owns portal generated-contract/label synchronization and coordinated
runtime adoption. This change does not touch native preview, media, running
services, original business artifacts or operational databases.

## Observed contradiction and correction

For a plan-linked current Registration without current Foundation evidence,
`check_binding(writing=True)` correctly rejects create/revise with
`website_foundation_not_ready`. Previously listing and detail derived
`can_create_draft` and `can_edit_configuration` solely from Registration
currency and advertised those writes as available. A customer could therefore
be invited to perform an operation that the same server would reject.

Both projections now consult the same maintained `require_agent_foundation`
using the current authenticated Session. Missing, stale or unavailable evidence
disables draft writes with the bounded `website_foundation_not_ready` blocker.
The saved specification remains readable. Authentication/ownership denials
401/403/404 propagate; they are never converted to readable history. A stale
Registration keeps its existing `agent_business_not_current` blocker. Legacy
unlinked businesses retain the existing Foundation policy.

The original POST checks, immutable configurations, calibration/module/channel
admission and execution capabilities are unchanged. Foundation completion
unlocks only draft preparation; it does not activate an agent. The existing
customer-agents contract adds the single blocker value to its two projections.

## Checks and delivery boundary

- New no-DB/no-provider regression first reproduced the mismatch. Initial
  fixture setup omitted `registration_id`; after fixing only that fixture,
  the unchanged implementation produced 9 failures / 1 pass in 0.72 s,
  including true create/edit flags under a denied Foundation gate.
- Fixed projection, native provisioning and Foundation receipt wire tests:
  28 passed in 0.37 s. These cover blocked/current/stale projections, current
  Session forwarding, retained history, unavailable evidence and authorization
  denials. No database or model is called by this selected group.
- Scoped Ruff passed for the changed source, wire and tests.
- The existing PostgreSQL HTTP regression was extended to assert both GET
  capability flags while its POSTs remain 409 and stored Agent/Config counts
  remain unchanged. It is deliberately **pending primary integration QA**:
  `tests/test_customer_agents.py::test_plan_linked_registered_business_cannot_skip_foundation`.
  It uses the existing `text_customer` fixture chain and needs the maintained
  disposable migrated PostgreSQL/restricted-role harness. No operational DB,
  `.env` or existing private harness state was copied or used here.
- Own dependencies were synchronized from the existing `uv.lock` with the dev
  group. Dependency manifests and lock files are unchanged.

Canonical export, from `agent-business-core/runtime`:

```powershell
.venv/Scripts/python.exe -c "import json; from pathlib import Path; from pinet_core.customer_agents.contract import document; Path('../../docs/contracts/verslomatika-customer-agents.openapi.json').write_text(json.dumps(document(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')"
```

Upgrade: `upgrade-a358dc1b-8b48-4cd1-82f0-f79b3d02468d`. Source-only local
verification is separate from PostgreSQL HTTP acceptance, portal adoption,
browser acceptance, main merge and whole-platform completion. Rollback is a
scoped revert; there is no migration or private-data rewrite.

## Remaining dependency findings for the primary

The existing synthetic `.test` draft cannot authorize a non-test environment:
`receipts.current` rejects synthetic observations unless the environment starts
with `test-`. Required language review and the existing editorial, release,
renderer and local audit evidence are also independent of media attachment.
Use a genuine isolated test environment for synthetic full-chain acceptance,
or a factually configured business. Do not weaken those gates or repeat paid
generation to resolve missing deterministic evidence.

Even after Foundation, customer-agent readiness intentionally remains draft
only (`can_calibrate=False`, `provider_execution=False`). Actual specialist
dispatch is a separate remaining implementation item, not completion obtained
by saving another configuration.
