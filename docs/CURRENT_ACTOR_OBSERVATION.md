# Fresh nonlocking current actor observation

`creation.service.current_actor(lock=False)` performs one canonical ORM SELECT
per call. It anchors on User, LEFT OUTER JOINs the exact Session and verified
Account, and optionally joins Portfolio plus enabled owner Membership. It uses
`populate_existing=True` for the whole result. It caches no permission or result.

The prerequisites remain optional joined rows so failed ownership cannot hide
authentication failure. Decode order is unchanged: missing/disabled User or
missing/revoked/expired Session =>401`unauthenticated`; only then missing verified
Account, Portfolio or owner Membership =>404`not_found`. Expiry uses fresh
`utcnow()` after the awaited statement. The returned value remains the actual
Account or Portfolio ORM object, refreshed in an existing identity map.

All optional filters are ON predicates, not child predicates in WHERE. Session
binds its exact ID, User ID and configured environment; Account binds User and
User environment plus non-null verification; Portfolio binds its ID and User
environment; Membership binds User, Portfolio organization/environment and
enabled owner status. WHERE contains only the declared User ID. RLS stays active
on every table; no definer bypass, schema, roles or new privileges are involved.

The cardinality follows the maintained models and migrations0010/0012: global
User/Session/Portfolio primary IDs, Account uniqueness on(user,environment), and
Membership uniqueness on(user,organization,environment). Explicit environment
bindings preserve that0..1 cardinality before `one_or_none`. Existing forced RLS
policies are environment-bound boolean predicates; Portfolio visibility uses
membership, and none of these read policies raises a later-stage authorization
exception that would mask the401 decode. Without a Portfolio request the query
does not touch Portfolio or Membership.

The original `lock=True` block is byte-for-byte unchanged after the new early
nonlocking branch: User FOR UPDATE, Session FOR SHARE, verified Account,
Portfolio get, owner Membership, in the same order. This package does not change
admission/write lock ordering or implement another actor authority helper.

## Evidence boundaries

The pure suite executes canonical `current_actor` with synthetic SQL and modeled
SQLAlchemy identity-map semantics. The original function performed3 reads for
Account-only and5 for initial Portfolio access. The baseline also reproduced
stale valid Account/Portfolio return fields and a stale Portfolio organization
that kept its old Membership authority after the actual row became hidden.
Baseline5FAIL19PASS1.66s, SHA256
`05f91fcf9ce8c00b1011ecc538019156c483d05833422c9b3ae3c58832a54ac7`.

First focused24PASS1.10s, SHA256
`5db6026b6e6f2544095a5f765fc20e071a32f4cb9f07772b8b2dbead93c13f30`.
It checks one statement, outer-join/WHERE/row-lock shape, typed hierarchy,
identity-map freshness, repeat-call mutations and original locking order.

The existing Authority graph's synthetic Tx initially lacked joined ORM result
support:1setupERROR6.48s, SHA256
`7d6aaf204b65753a86fa78ece94bf934e6a71bf3bb55fb15c21f8fc839100c9f`.
Its SQL leaf now reads IDs/environment from the real statement AST, models live
RLS/verification/membership, and returns the joined tuple. It does not replace
`current_actor`; all U/P/S and fail-closed assertions remain. Related regression
140PASS10.09s, SHA256
`a69dd44390ac0177e986014b1cef12053eb1aa199c09aba16f2cf82f188ca65d`.

`tests/test_current_actor_pg.py` retains the original User/Session revocation
tests and adds cached account/member/expiry, returned entity refresh, Portfolio
organization visibility and one ORM statement cases. Helper collected11 cases
only,0.22s, SHA256
`974e2e3b2adace22cd7491310a5c28b0e8f0c89aa4b42b7dfab570cf4e09a9a0`.
Root executes those cases on its dedicated actual PostgreSQL setup.

One-SELECT proof and modeled stale-map failures are not a full capture SQL or
latency measurement. Root's prior serving failure and worse actual capture/verify
timings remain failures, not optimization success. Root owns actual SQL timings,
DB/native/HTTP/browser/cutover and acceptance. This source packet changes only
`creation/service.py:current_actor` in production, under separate upgrade
`7f80fded-435f-4150-a029-0389e85adfcd`; all earlier journals remain frozen.
