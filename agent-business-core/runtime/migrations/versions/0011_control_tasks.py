"""Generic owned durable tasks independent of legacy conversations."""
from alembic import op

revision = "0011_control_tasks"
down_revision = "0010_control"

BINDING = "id,business_id,organization_id,user_id,environment_id"
OWNED = """id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, organization_id VARCHAR NOT NULL,
 business_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL"""
STATUS = "CHECK(status IN ('queued','running','succeeded','failed','cancelled'))"
DDL = (
    f"""CREATE TABLE control_task_threads ({OWNED}, last_sequence INTEGER NOT NULL CHECK(last_sequence BETWEEN 0 AND 20),
    UNIQUE({BINDING}), FOREIGN KEY(business_id,environment_id) REFERENCES control_business_grants(business_id,environment_id),
    FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id),
    FOREIGN KEY(organization_id,environment_id) REFERENCES control_organizations(id,environment_id))""",
    f"""CREATE TABLE control_tasks ({OWNED}, thread_id VARCHAR NOT NULL, session_id VARCHAR NOT NULL REFERENCES control_sessions(id),
    sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 20), kind VARCHAR NOT NULL CHECK(kind='chat.consult'),
    status VARCHAR NOT NULL {STATUS}, idempotency_key VARCHAR NOT NULL, fingerprint VARCHAR NOT NULL,
    message VARCHAR NOT NULL CHECK(length(message) BETWEEN 1 AND 1000), result JSONB, failure_code VARCHAR,
    run_id VARCHAR, lease_until TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL, event_sequence INTEGER NOT NULL,
    source_revision VARCHAR NOT NULL, UNIQUE({BINDING}), UNIQUE(user_id,environment_id,idempotency_key),
    UNIQUE(thread_id,sequence), FOREIGN KEY(thread_id,business_id,organization_id,user_id,environment_id)
    REFERENCES control_task_threads({BINDING}) ON DELETE CASCADE)""",
    f"""CREATE TABLE control_task_runs ({OWNED}, task_id VARCHAR NOT NULL, status VARCHAR NOT NULL {STATUS},
    model VARCHAR NOT NULL, effort VARCHAR NOT NULL, adapter_revision VARCHAR NOT NULL, finished_at TIMESTAMPTZ,
    usage JSONB, cost_microusd INTEGER, FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id)
    REFERENCES control_tasks({BINDING}) ON DELETE CASCADE)""",
    f"""CREATE TABLE control_task_events ({OWNED}, task_id VARCHAR NOT NULL, sequence INTEGER NOT NULL CHECK(sequence>0),
    status VARCHAR NOT NULL {STATUS}, failure_code VARCHAR, UNIQUE(task_id,sequence),
    FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id)
    REFERENCES control_tasks({BINDING}) ON DELETE CASCADE)""",
    "CREATE INDEX ix_control_tasks_queue ON control_tasks(environment_id,user_id,status,created_at)",
)
TABLES = ("control_task_events", "control_task_runs", "control_tasks", "control_task_threads")


def upgrade():
    for sql in DDL:
        op.execute(sql)
    for table in TABLES:
        condition = f"""{table}.environment_id=current_setting('pinet.environment',true)
        AND {table}.user_id=current_setting('pinet.control_user',true)
        AND EXISTS(SELECT 1 FROM control_business_grants g JOIN control_memberships m
          ON m.organization_id=g.organization_id AND m.environment_id=g.environment_id
          WHERE g.business_id={table}.business_id AND g.organization_id={table}.organization_id
          AND g.environment_id={table}.environment_id AND g.enabled AND m.enabled AND m.role='owner'
          AND m.user_id={table}.user_id)"""
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY task_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        privileges = "SELECT,INSERT" if table == "control_task_events" else "SELECT,INSERT,UPDATE"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")


def downgrade():
    for table in TABLES:
        op.execute(f"DROP TABLE {table}")
