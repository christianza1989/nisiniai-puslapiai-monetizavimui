"""One typed capture binding; common tasks own queue/runs/events/leases."""

from .ledger_schema import KEY, SCOPE

KIND = "acquisition.reviewed_capture"
TABLE = "acquisition_task_bindings"
DDL = f"""CREATE TABLE {TABLE} ({SCOPE}, task_id VARCHAR NOT NULL,
 organization_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL,
 kind VARCHAR NOT NULL CHECK(kind='{KIND}'),
 input JSONB NOT NULL, input_sha256 VARCHAR NOT NULL CHECK(input_sha256 ~ '^[a-f0-9]{{64}}$'),
 registration_sha256 VARCHAR NOT NULL CHECK(registration_sha256 ~ '^[a-f0-9]{{64}}$'),
 campaign_id VARCHAR NOT NULL, prospect_id VARCHAR NOT NULL, campaign_day VARCHAR NOT NULL,
 created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY({KEY},task_id), UNIQUE({KEY},campaign_id,prospect_id),
 FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id,kind)
 REFERENCES control_tasks(id,business_id,organization_id,user_id,environment_id,kind))"""


def grants_sql():
    return [f"REVOKE ALL ON {TABLE} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {TABLE} TO pinet_runtime"]


def isolation_sql():
    predicate = " AND ".join(f"{c}=current_setting('pinet.acq_{c}',true)" for c in KEY.split(","))
    return [
        f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY",
        f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
        f"CREATE POLICY acquisition_scope ON {TABLE} USING ({predicate}) WITH CHECK ({predicate})",
        *grants_sql(),
    ]
