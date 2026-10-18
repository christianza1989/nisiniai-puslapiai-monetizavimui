# Heartbeat locked snapshot

Heartbeat loads a Task while acquiring handler authority, then selects that Task
with `FOR UPDATE`. A retained ORM identity can still contain the earlier values:
row locking does not itself populate existing SQLAlchemy attributes. The locked
select now uses `populate_existing=True` before comparing status, Run ID, lease,
authority and database clock. Lease duration stays 15 seconds; no expired lease
or revoked authority gains a renewal path.

The dedicated retained PostgreSQL regression uses two real transactions and an
explicit strong-reference seam around the existing authority preflight. While
heartbeat waits, the other transaction commits a normal still-live lease renewal,
an actual lease expiry, a terminal Task or an authority stop. Before the repair,
the renewed lease was falsely refused, the expired DB lease was accepted, and the
terminal Task was accepted (three failures); authority stop was already refused.
The unretained normal-handler control passed before the repair and its initial
Task weak reference was released. The seam is therefore a generic retained-identity
regression, not evidence that the actual six-role production handler retained the
historical writer Task.

The actual writer completion cause remains unproved. Its model output and token
usage were durably retained; its optional guard trace was disabled. Separate
known-output replay with fresh own Config2/source/grants/Tasks passed all four
recorded roles under normal completion fences, proving compatibility only.
Neither this refresh nor that replay attributes the historical failure, edits
old stage/ledger data, authorizes provider retry or extends any limit.
