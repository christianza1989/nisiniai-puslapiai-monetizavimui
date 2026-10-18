# Server UTC context for business roles

The six-role native worker supplies `runtime_time` after canonical owner, source,
team and campaign/evidence admission. Its `checked_at_utc` comes from PostgreSQL
`clock_timestamp()`, normalized to UTC; `execution_deadline_utc` remains the
existing bounded authority deadline. The role instruction uses that snapshot
when interpreting expiry, rather than a local calendar that may already show
tomorrow. Missing, naive or elapsed temporal context refuses model execution.

This is ordinary runtime context for every business using these roles. It adds
no test persona, expected answer or protected label. Callers cannot submit it
through the strict RoleRequest. Job text and source content remain untrusted.
The time-check flag records only temporal admission; factual truth, fit, contact
basis, transport and later fresh fences remain separate. A snapshot never renews
an expiry or grants future action rights.

The observed failure occurred after local midnight while the UTC campaign and
facts were still valid. Research and qualification incorrectly treated them as
expired; the server's expiry checks had passed. The known four-call failure,
original cases/grader, historical clocks and all accounting remain retained.
Regression covers a local next-day clock with a still-valid prior-day UTC offer,
invalid clocks and an attempted caller override. Actual model behavior requires
a fresh source-pinned run; static tests do not establish that acceptance.
