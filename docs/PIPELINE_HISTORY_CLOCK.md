# Historical team deadlines

`TeamView.deadline_seconds` describes its latest retained job's execution
profile. Selecting a profile for a future job must not rewrite this historical
metadata. An actual legacy PostgreSQL regression found that selecting High
changed only this field from360 to900 for an unchanged default job.

The team reader uses the profiles already freshly validated by its bounded
attempt observation. The local returned mapping is discarded with this read;
it is no cross-request cache or authorization receipt. A latest job that has no
attempts yet receives the existing fresh `stored` profile validation. Without
any job, the selected profile still describes the prospective new work.

All existing binding/model/schema validation and typed invalid_content_source
refusals remain. No model, profile selection, production execution clock, role
budget, quota or database row changes. The normal attempt projection still uses
one profile query, with the exact bounded job ID set asserted by regression.

Verify both default-to-High and High-to-default configuration changes, a latest
job without attempts and its changed source, then repeat actual isolated
PostgreSQL admission, old-row fingerprint and source/parent refusals. Original
failed logs remain evidence; source tests alone do not establish serving health.
