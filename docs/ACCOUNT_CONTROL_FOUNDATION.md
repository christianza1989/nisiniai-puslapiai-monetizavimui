# Account and control foundation

This fresh-main slice delivers persisted owner/customer identity, portfolio reads,
reviewed business intakes and registration, and an independently approved public
project projection. It selects the maintained implementation from
`965ce3388ba3c250c1a9a74b21b038483c334ac9` onto main
`d0d08be67033e29457367ddcc2ca5eeccdf0230c` under
[issue 223](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/223).
It imports no old feature-branch journal entries or private runtime artifacts.
All original feature history and failure evidence remain unchanged.

## Source and schema boundary

The three maintained packages are `control/`, `customer/` and `public_projects/`.
The legacy API gains only those three router mounts. The independent
`pinet_core.control_api:app` imports those routers and a restricted-role lifespan;
it exposes no legacy mail/voice API, documentation endpoint, worker or scheduler.
Its resolved surface contains 17 paths and 18 HTTP operations. The legacy API's
existing lifespan and routing coordinator are preserved.

The dependency set and `runtime/uv.lock` remain unchanged. The pyproject change
only resolves test imports from `src`, `tests` and `scripts`. No frontend,
Gmail, CRM, acquisition, saved-agent, Task runner, source-binding or channel
activation is included.

Migrations `0010_control`, `0011_control_tasks` and `0012_customer_public` are byte-exact
selected-source migrations with their original linear predecessors. They add 15
forced-RLS tables. The four 0011 Task tables are inert schema prerequisites for
the 0012 linear history: this slice adds no Task ORM, dispatch API or runner.
Alembic metadata covers the three mounted packages; it does not claim complete
autogeneration coverage for those inert tables. The two named registration
identity uniqueness declarations introduced by later 0016 are omitted from this
through-0012 ORM metadata. No 0010–0012 SQL constraint or authority check is removed.

All surfaces remain opt-in. The 12 added settings are `control_enabled`,
`control_mode`, `control_bridge_secret`, `control_bridge_host`,
`control_owner_user_id`, `control_cursor_secret`, `control_source_revision`,
`control_session_seconds`, `customer_enabled`, `customer_portal_origin`,
`customer_outbox_directory` and `public_projects_enabled`. The enable flags
default false. Local control also requires a loopback request, a current source
revision, a sufficiently long cursor secret and bounded sessions. The signed
hosted bridge retains its nonce, body/query, clock and owner restrictions;
including its code is not hosted deployment acceptance.

## New local database preparation

Use a separately owned, empty database and private credentials. Never point this
procedure at an existing operating or foreign database. Follow the canonical
`agent-business-core/runtime/scripts/setup_local.py` credential format, but
review its default host/database before running it. Secrets and generated
outbox files stay ignored. Merely cloning this PR does not authorize any live
service, migration or customer action.

From `agent-business-core/runtime`, with reviewed private admin/runtime URLs:

```powershell
uv sync --locked
uv run python -B scripts/bootstrap.py --role-only
uv run python -B -m alembic upgrade 0012_customer_public
uv run python -B scripts/bootstrap.py
```

The first step provisions only the restricted role/schema usage so immutable
migrations may reference it. It never changes an existing role's password or
options. Full bootstrap accepts a complete 0009 legacy schema or exactly the
complete 0012 account schema, rejects partial/future control schemas or missing
forced RLS, and restores an explicit per-table privilege map. It never grants
CRUD on all tables or grants new/foreign tables implicitly. It verifies effective
privileges too, so unexpected inherited/PUBLIC rights fail the transaction.
The only seeded data are the existing two stable site mappings, preserved when
already present. No customer or business ownership is inferred from a hostname.

The runtime receives SELECT only for business grants and public projects;
SELECT/INSERT/UPDATE for users, sessions, login buckets, accounts, tokens and
the three inert mutable Task tables; SELECT/INSERT for organizations,
memberships, portfolios, intakes and inert Task events. Business registry writes
and Alembic access remain unavailable to the runtime role. Review/publication
and new-business registration require the explicit local administrative CLIs
`scripts/control_bootstrap.py` and `scripts/customer_public_admin.py`.

Customer verification/recovery writes a private development outbox under
`customer_outbox_directory`; it sends no actual email. It must be explicitly
enabled with a reviewed local portal origin. A customer intake grants no
ownership until a current verified account and administrative evidence review
admit it. Public publication uses separate revision-bound approval and revocation;
customer or portfolio data never become public automatically.

## Acceptance and delivery

The four retained behavioral suites contain 53 items. Two unused later chat
fixture flags are absent, and registration uses the existing 0012
verified-account/intake/admin path instead of a 0049 attachment fixture. One
negative Task assertion expects 404 with zero Task rows, since this slice has
no Task HTTP route; the original full-runtime test expected 403 from its later
operator-only executor. No route is added to satisfy that old status. Foreign
ownership, concurrent claims, changed evidence, revocation and runtime-role
rejection remain tested.

`tests/test_account_foundation_scope.py` adds no-DB bootstrap/route boundaries and
explicit disposable-PG checks. The opt-in PG lane requires
`PINET_ACCOUNT_FOUNDATION_QA=retained-isolated` and a database whose name begins
`pinet_account_foundation_`. CI uses its own postgres17 service, random runtime
credentials, locked main dependencies and disabled voice/SMTP/model access.
It first migrates to 0009, seeds synthetic legacy rows, then invokes the one-time
upgrade test with `PINET_FOUNDATION_UPGRADE_FROM_0009=1` and an owned
`PINET_FOUNDATION_PROOF_DIR`. The proof stores only projection hashes of all 20
legacy tables before/after the exact 0010–0012 upgrade. The remaining suite tests
the 15 forced-RLS tables and exact effective privileges before/after bootstrap,
direct-SQL rejection, physical-schema/ORM agreement and the 18-operation isolated
API surface. Existing legacy API, policy, budget, knowledge and Facebook tests run separately with inert
providers. The legacy Facebook regression receives a minimal private test network
configuration through the existing `STUDIO_NETWORK_SETTINGS` input, rather than
depending on a missing sibling checkout or importing a public-site package.

Retained local acceptance on 2026-10-19 used only the separately authorized new
database `pinet_account_foundation_20261019_001`; no operating or previously
retained QA database was connected. The existing runtime role/password and
service were unchanged. Results:

- Actual seeded legacy upgrade: 1 PASS, all 20 old table projection hashes exact.
- Account/control and new boundaries: 80 PASS, 1 intentional skip of the already
  completed one-time upgrade; includes all 53 retained behavioral items.
- Existing legacy regression: 89 PASS with inert providers.
- Canonical freshness/bootstrap/upgrade Node regression: 25 PASS; scoped Ruff and
  calibration input checks PASS. All 13 installed direct dependencies match the
  unchanged main lock versions.

Private logs and safe projection proof remain ignored under
`.local/account-foundation/`. The first focused run's 78 PASS / 1 FAIL / 1 skip
(`6f7671dcfbcee9e5e5e892e7e24710460975390801b3010eb7967cc9ce434807`)
preserves the inherited Task-status scope mismatch. The first legacy run's
60 PASS / 29 FAIL
(`6217c1f4870ad7b471ff4b0e85bbd6f1a112c0736174aa011632a834aa3a6da8`)
preserves the missing sibling test configuration. Both were fixed in bounded
test/setup scope; no product authorization was weakened. CI results belong to
the actual PR checks; workflow source alone is not a CI PASS.

Source checks, a draft PR, reviewed main merge and actual deployment/database
adoption are separate steps. This slice authorizes neither operating adoption
nor a schema downgrade containing account data. Before adoption, back up the
owned database and prove existing rows unchanged on a disposable copy. A source
rollback is a scoped revert; do not automatically downgrade a populated database.
