# External business source authority for native acquisition

Source checkpoint for the Root-owned existing-business/account attachment work,
2026-10-18. This adapter reuses the current research/email/reply Tasks, Runs,
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

## Source checkpoint verification

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
