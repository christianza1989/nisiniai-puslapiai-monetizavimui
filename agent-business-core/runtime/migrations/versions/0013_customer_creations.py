"""Private customer creations over current verified identity/portfolio, immutable delivered artifacts."""
from alembic import op

revision = "0013_customer_creations"
down_revision = "0012_customer_public"

OWNED = """id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL, organization_id VARCHAR NOT NULL,
 portfolio_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL"""
BINDING = "id,user_id,organization_id,portfolio_id,environment_id"


def parent(table, key):
    return f"FOREIGN KEY({key},user_id,organization_id,portfolio_id,environment_id) REFERENCES {table}({BINDING}) ON DELETE CASCADE"


DDL = (
    f"""CREATE TABLE control_creations({OWNED}, display_name VARCHAR NOT NULL CHECK(length(display_name) BETWEEN 1 AND 100),
    idea VARCHAR NOT NULL CHECK(length(idea) BETWEEN 20 AND 2500), canonical_host VARCHAR,
    status VARCHAR NOT NULL CHECK(status IN ('queued','running','draft_ready','failed','cancelled')),
    stage VARCHAR NOT NULL CHECK(stage IN ('queued','research','drafting','validation','ready','failed','cancelled')),
    current_revision INTEGER NOT NULL CHECK(current_revision BETWEEN 0 AND 20),
    job_sequence INTEGER NOT NULL CHECK(job_sequence BETWEEN 0 AND 20), event_sequence INTEGER NOT NULL CHECK(event_sequence BETWEEN 0 AND 200),
    active_job_id VARCHAR, failure_code VARCHAR, latest_summary VARCHAR, source_revision VARCHAR NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL, idempotency_key VARCHAR NOT NULL, fingerprint VARCHAR NOT NULL,
    UNIQUE({BINDING}), UNIQUE(user_id,environment_id,idempotency_key),
    FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE,
    FOREIGN KEY(portfolio_id,organization_id,environment_id) REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE CASCADE)""",
    f"""CREATE TABLE control_creation_jobs({OWNED}, creation_id VARCHAR NOT NULL, session_id VARCHAR NOT NULL REFERENCES control_sessions(id),
    sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 20), base_revision INTEGER NOT NULL CHECK(base_revision BETWEEN 0 AND 20),
    message VARCHAR NOT NULL CHECK(length(message) BETWEEN 1 AND 2500), idempotency_key VARCHAR NOT NULL, fingerprint VARCHAR NOT NULL,
    status VARCHAR NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')), run_id VARCHAR, lease_until TIMESTAMPTZ,
    failure_code VARCHAR, source_revision VARCHAR NOT NULL, instruction_hash VARCHAR, model VARCHAR, adapter_revision VARCHAR,
    usage JSONB, cost_microusd INTEGER, finished_at TIMESTAMPTZ,
    UNIQUE({BINDING}), UNIQUE(user_id,environment_id,idempotency_key), UNIQUE(creation_id,sequence), {parent('control_creations','creation_id')})""",
    f"""CREATE TABLE control_creation_revisions({OWNED}, creation_id VARCHAR NOT NULL, job_id VARCHAR NOT NULL,
    sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 20), payload JSONB NOT NULL CHECK(octet_length(payload::text)<=262144),
    material_hash VARCHAR NOT NULL, source_revision VARCHAR NOT NULL, UNIQUE({BINDING}), UNIQUE(creation_id,sequence), UNIQUE(job_id),
    {parent('control_creations','creation_id')}, {parent('control_creation_jobs','job_id')})""",
    f"""CREATE TABLE control_creation_artifacts({OWNED}, creation_id VARCHAR NOT NULL, revision_id VARCHAR NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 20), kind VARCHAR NOT NULL CHECK(kind IN ('business_plan','website_preview','content_package')),
    display_name VARCHAR NOT NULL, media_type VARCHAR NOT NULL CHECK(media_type IN ('text/html','text/markdown','application/json')),
    content VARCHAR NOT NULL CHECK(octet_length(content)<=524288), sha256 VARCHAR NOT NULL, bytes INTEGER NOT NULL CHECK(bytes BETWEEN 0 AND 524288),
    UNIQUE(creation_id,revision,kind), {parent('control_creations','creation_id')}, {parent('control_creation_revisions','revision_id')})""",
    f"""CREATE TABLE control_creation_events({OWNED}, creation_id VARCHAR NOT NULL, job_id VARCHAR NOT NULL,
    sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 200), status VARCHAR NOT NULL, stage VARCHAR NOT NULL,
    message VARCHAR NOT NULL CHECK(length(message)<=1000), UNIQUE(creation_id,sequence),
    {parent('control_creations','creation_id')}, {parent('control_creation_jobs','job_id')})""",
    "CREATE INDEX ix_creation_queue ON control_creation_jobs(environment_id,status,created_at)",
    "CREATE UNIQUE INDEX ix_creation_one_active ON control_creation_jobs(creation_id) WHERE status IN ('queued','running')",
)
TABLES = ("control_creation_events", "control_creation_artifacts", "control_creation_revisions", "control_creation_jobs", "control_creations")


def upgrade():
    for sql in DDL:
        op.execute(sql)
    for table in TABLES:
        condition = f"""{table}.environment_id=current_setting('pinet.environment',true)
        AND ({table}.environment_id='local' OR {table}.environment_id LIKE 'test-%')
        AND {table}.user_id=current_setting('pinet.control_user',true)
        AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
          ON a.user_id=u.id AND a.environment_id=u.environment_id
          WHERE u.id={table}.user_id AND u.environment_id={table}.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
        AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
          ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
          WHERE m.user_id={table}.user_id AND m.environment_id={table}.environment_id AND m.organization_id={table}.organization_id
          AND m.enabled AND m.role='owner' AND p.id={table}.portfolio_id)"""
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY creation_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        privileges = "SELECT,INSERT,UPDATE" if table in {"control_creations", "control_creation_jobs"} else "SELECT,INSERT"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")
    # Fixed read-only queue discovery: IDs/state only, no customer content or bypass writes.
    # Per-user RLS and current authority are reapplied before claim, heartbeat and completion.
    op.execute("""CREATE FUNCTION control_creation_candidates(e VARCHAR)
    RETURNS TABLE(id VARCHAR,user_id VARCHAR,status VARCHAR,lease_until TIMESTAMPTZ)
    LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT j.id,j.user_id,j.status,j.lease_until FROM public.control_creation_jobs j
      WHERE j.environment_id=e AND (e='local' OR e LIKE 'test-%') AND j.status IN ('queued','running')
      AND ((j.status='running' AND j.lease_until>now()) OR EXISTS(
        SELECT 1 FROM public.control_users u
        JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
        JOIN public.control_memberships m ON m.user_id=u.id AND m.environment_id=u.environment_id
        JOIN public.control_portfolios p ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
        JOIN public.control_sessions s ON s.user_id=u.id AND s.environment_id=u.environment_id
        WHERE u.id=j.user_id AND u.environment_id=j.environment_id AND u.enabled AND a.verified_at IS NOT NULL
        AND m.enabled AND m.role='owner' AND m.organization_id=j.organization_id AND p.id=j.portfolio_id
        AND s.id=j.session_id AND s.revoked_at IS NULL AND s.expires_at>now()))
      ORDER BY CASE WHEN j.status='running' THEN 0 ELSE 1 END,j.created_at,j.id LIMIT 20
    $$""")
    op.execute("REVOKE ALL ON FUNCTION control_creation_candidates(VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_creation_candidates(VARCHAR) TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_creation_daily_count(e VARCHAR,s TIMESTAMPTZ) RETURNS BIGINT
    LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT count(*) FROM public.control_creation_jobs j WHERE j.environment_id=e
      AND (e='local' OR e LIKE 'test-%') AND j.created_at>=s
    $$""")
    op.execute("REVOKE ALL ON FUNCTION control_creation_daily_count(VARCHAR,TIMESTAMPTZ) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_creation_daily_count(VARCHAR,TIMESTAMPTZ) TO pinet_runtime")


def downgrade():
    op.execute("DROP FUNCTION control_creation_daily_count(VARCHAR,TIMESTAMPTZ)")
    op.execute("DROP FUNCTION control_creation_candidates(VARCHAR)")
    for table in TABLES:
        op.execute(f"DROP TABLE {table}")
