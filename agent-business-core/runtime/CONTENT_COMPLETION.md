# Native content corrections

The customer completion and page endpoints remain read-only observations. The
server-owned `creation.content_amendment.amend` operator applies deterministic
private corrections through the existing `customer-content-workflow.mjs`
`amend-page-reviewed-copy` command. It is not a generation job, a model tool, or
an editorial approval endpoint. Existing metadata-only `amend-page` still refuses
body writes. No additional content engine, HTTP route or provider is introduced.

The operator requires the caller's real current owner Session in a restricted SQL
transaction. It reuses media attachment's `native_mutation_guard`: actor then
Creation locks, current accepted revision/candidate/host, no active Creation or
GUIDE job, no archive, clean pinned execution source, and explicit current S6
continuation when accepted material crosses a source release. Those checks run
before, during and after the bounded native subprocess. The caller never supplies
artifact paths, executables, provider arguments or a substitute Session ID.

An amendment has one operation UUID and exact expected site, page and planning
hashes. The strict patch supports only title, description, intent, native body,
fact notes and external-link metadata. Native body/link/media validation remains
in the maintained studio workflow. A fact note removal or `verified` field is not
evidence that a claim, source, identity or business fact has been checked.

The workflow retains private operation receipts and original page evidence under
the existing case revision. The original accepted source, intake, GUIDE attempts,
usage and immutable releases remain historical facts. Ordinary edits invalidate
current review through `model.editPage`; they never synthesize review, approval,
Foundation, admission, deployment or channel activation.

After timeout, cancellation or authorization loss, SQL rollback does not prove
that the native file write failed. Preserve the same operation UUID and original
request. Reconcile it under fresh current authority against its durable receipt;
never automatically refresh hashes and overwrite a changed page. A retained lock
is not stolen. A forcibly killed Node process can leave an operation or native
model lock; injected exception recovery does not prove hard-kill recovery. Such
locks require separately verified recovery of the known stopped operation before
replay. Before the next independent amendment, reread current native state:
any page change also changes the whole-site context hash.

Before a real local adoption, freeze and test the exact source with a real
restricted PostgreSQL transaction and native Node workflow. Mocked subprocess
tests alone do not prove filesystem writes or replay. Keep original failures,
unknown facts and separate editorial/Foundation/calibration gates visible.
