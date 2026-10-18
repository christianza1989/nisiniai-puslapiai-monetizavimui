# External business source authority for native acquisition

Local implementation and isolated native verification for the Root-owned
existing-business/account attachment work,2026-10-18. Operating/account UI adoption
and the actual dealer calibration remain separate. This adapter reuses the current research/email/reply Tasks, Runs,
reservations, accounting and canonical Case/mail engine. It does not register a
dealer business, calibrate its agents or enable a model or transport.

## Origin and current authority

ModelAuthorization has exactly one origin: the complete existing Creation and
Registration pair, or a genuine reviewed business source Binding. External
authorizations have null Creation/Registration IDs and a nonnull external Binding
ID. The source fingerprint, owner, business, environment, portfolio and site are
protected by a composite FK. The existing authorization material is unchanged
when the external ID is absent; ModuleBinding material is unchanged for both.

External approval resolves the real Binding through the common source authority.
It uses the same verified owner/session/grant checks as business attachment and
caps the authorization/module expiry at the Binding and current session expiry.
The Binding review Git revision remains historical; it is distinct from the
current execution Git pin. A saved Config or imported source never grants a model
allowance or channel activation.

The Agent UUID survives source refresh. Its current source pointer can advance
only with the next immutable Config revision under Root's Agent/Config contract.
Native dispatch checks the current Agent pointer, Config source epoch, revision
and hash against the exact Authorization. Old authorizations and old Config
hashes remain immutable. History and privileged containment resolve their old
source pin without treating it as current dispatch authority.

Research/email share the same business Binding, session, Module and execution
scope while retaining distinct Agent/Config and import hashes. A mixed source
epoch, changed Config, revoked/expired/superseded Binding or changed owner cannot
become a current pair. No fake Creation or Website/Profile admission is created.

## Approved business data

Work projects an allowlisted, typed SourcePayload into reviewed_business_source:
the immutable Binding ID/fingerprint, business/site/host, expiry, external source
revision, artifact reference/hash, knowledge/profile hashes, review references
and approved facts. This is model data alongside the unchanged agent
specification. It does not modify saved instructions, Config hashes or tool
permissions. Legacy model packets omit this field entirely.

An external campaign may use a subset of the reviewed facts only when each
id/text/source matches the approved id/text/source_ref exactly. Duplicate IDs,
invented facts and an empty approved source with a nonempty campaign fail before
the maintained target gate. Existing campaign validity, recipient, purpose and
budget checks still apply. Source text never becomes a system instruction.

## Migration and proof boundaries

Root's0049 migration must install the source table/current helper and Agent/Config
origin extension before acquisition.external_schema.upgrade_sql(). The helper
adds the nullable authorization field, origin XOR/FK and replaces only the current
authorization and pair functions. The0046/0048 installers and legacy SQL branch
remain unchanged. Existing claim, reservation, heartbeat, settlement and Task
boundaries inherit those functions; their grants and accounting stay intact.

acquisition_model_authorization_current remains private to the existing SQL
callers. The final Python source check uses the common source is_current API
after the last Git/private-file observation; native effects use the existing
runtime-granted pair fence. Losing authority does not erase known or unknown
usage from already charged reservations.

## Original source checkpoint (a33c705)

Base653d1bcc66af0a3d77a01af650bd1fdbbb72672c; private main533597c,
companion HEAD255fea0/public mainec8a9c0, paired freshness PASS07:18Z.
Owned scope: issue66/comment6247060468; journal
upgrade-b6551865-704c-457e-8b86-dfea92d1ab08.

Initial source evidence:97 related offline cases passed3.02s, including the first
24 new external cases. After adding peer Config epoch checks, the current28 new
external cases passed2.37s. Scoped Ruff passed before the final four peer cases;
the final staged source receives a fresh Ruff/safety check.

Real SourcePayload/common-source authority, composed48→49 PostgreSQL/RLS,
external native R2→E2→reply2, late revocation/expiry, migration hash retention and
operating/UI adoption are **UNVERIFIED at this source checkpoint**. Root and the
source author own those dependencies. No paid, protected-corpus, actual dealer,
Serving or operating database action was performed. The initial disk hold and
misdirected test-log command are retained in the chat; the latter ran no tests.

Runtime frozen/pushed a33c705b0f6f27ca8ca16223044a5687e8e06c34; draft PR207.
Root merged this exact runtime after its own06ec23f source checkpoint. Current
28 new offline cases and final scoped Ruff pass;14 staged blobs passed safety.
Scoped653d1→a33 coverage passes8 shared paths with zero errors/uncovered paths.
The default origin/main audit is separately BLOCKED:489 inherited shared changes,
37 uncovered paths and38 errors. Its debt is not this adapter's scoped PASS.
No composed0049 or real external native acceptance is implied by the source PR.

## Composed isolated acceptance

Merged Rootad402cb and backbone correction299773f. Applied0049 only to the owned
retained QA container8f8488, loopback15549, databasepinet_acq_work_20261018042000.
Before any new test data, every old column value in94 tables/5518 rows matched
the pre48 snapshot, also after the corrected payload helper was replaced in place.
The private snapshot SHA256 is
e4a402f1c5e22d2e9b9797bf02f06b79b139b3ce9540cdb36fc58a4e5862a267.

The actual privileged CLI needs consumer scope before the common source SQL
guard. Its follow-up now sets transaction-local user/environment from the freshly
loaded server Session/settings, then retains the full live Session/owner/grant
checks. It accepts no caller-supplied owner or broader execution grant.

Five new PG items have split PASS evidence: run34 first3 items prove real verified
external ownership with zero Creation/Registration rows, actual customer HTTP
research/email configurations, R2→E2→reply2→reply2 in one Case with5 captured mail
records, exact replay and stale-source containment, unreviewed-fact denial and
stable Agent UUID/old Config hash after source adoption with old Auth denial.
Run35 passes the two remaining items17.41s: source revocation after the inert
provider retains the exact known/unknown charged reservation and creates no
Case/mail effect. Run36 passes the old Creation-based native chain47.72s on49.
Final related pure tests pass122 cases0.92s, including30 new external unit cases;
final scoped Ruff passes.

Original failures remain retained: run32 supplied the wrong fixture campaign mode;
run33 used the inbound decision receipt ID as an outbound parent; run34's two
negative metadata observations omitted customer_session and correctly saw no RLS
row. Those test errors were corrected without weakening a runtime guard. The
run34 aggregate command FAILED and is not represented as a clean five-case run.
The five item outcomes are supported by the explicit3+2 split above.

All provider roles were inert and all mail was synthetic captured data. The
actual dealer facts, model calibration/protected cases, scheduling/discovery,
live transport, operating migration and account UI acceptance were not performed
by this scope. Root owns the final platform integration/adoption.
