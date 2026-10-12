"""Pre-build discovery/report history, explicit build approval and recoverable test archival."""
from alembic import op
from sqlalchemy import text

revision = "0029_business_discovery"
down_revision = "0028_director_read"

OWNED = "id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"
BINDING = "id,user_id,organization_id,portfolio_id,environment_id"
TABLES = ("control_business_discoveries", "control_business_discovery_jobs", "control_business_discovery_reports",
          "control_business_discovery_attempts", "control_business_build_approvals", "control_creation_archives")


def parent(table, key):
    return f"FOREIGN KEY({key},user_id,organization_id,portfolio_id,environment_id) REFERENCES {table}({BINDING}) ON DELETE CASCADE"


def counts(discovery=True):
    extra = "(SELECT count(*) FROM public.control_business_discovery_attempts a WHERE a.environment_id=e AND a.created_at>=s {own}) +" if discovery else ""
    for name, owned in (("control_creation_attempt_count", False), ("control_creation_own_attempt_count", True)):
        own = "AND a.user_id=current_setting('pinet.control_user',true)" if owned else ""
        job_own = "AND j.user_id=current_setting('pinet.control_user',true)" if owned else ""
        op.execute(f"""CREATE OR REPLACE FUNCTION {name}(e VARCHAR,s TIMESTAMPTZ) RETURNS BIGINT
          LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
          SELECT CASE WHEN e='local' OR e LIKE 'test-%' THEN
            {extra.format(own=own)}
            (SELECT count(*) FROM public.control_content_work_attempts a WHERE a.environment_id=e AND a.created_at>=s {own}) +
            (SELECT count(*) FROM public.control_creation_attempts a WHERE a.environment_id=e AND a.created_at>=s {own}) +
            (SELECT count(*) FROM public.control_creation_jobs j WHERE j.environment_id=e AND j.created_at>=s {job_own}
              AND j.instruction_hash IS NOT NULL AND j.adapter_revision IS DISTINCT FROM 'codex-business-team.v1')
            ELSE 0 END $$""")
        op.execute(f"REVOKE ALL ON FUNCTION {name}(VARCHAR,TIMESTAMPTZ) FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION {name}(VARCHAR,TIMESTAMPTZ) TO pinet_runtime")


def upgrade():
    op.execute(f"""CREATE TABLE control_business_discoveries({OWNED},
      title VARCHAR NOT NULL,initial_message VARCHAR NOT NULL CHECK(length(initial_message) BETWEEN 1 AND 2500),
      status VARCHAR NOT NULL CHECK(status IN ('queued','running','needs_input','plan_ready','failed','cancelled','archived','build_started')),
      current_revision INTEGER NOT NULL CHECK(current_revision>=0),job_sequence INTEGER NOT NULL CHECK(job_sequence>=0),
      active_job_id VARCHAR,linked_creation_id VARCHAR,failure_code VARCHAR,source_revision VARCHAR NOT NULL,
      idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE({BINDING}),UNIQUE(user_id,environment_id,idempotency_key),
      FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE,
      FOREIGN KEY(portfolio_id,organization_id,environment_id) REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE CASCADE,
      {parent('control_creations','linked_creation_id')})""")
    op.execute(f"""CREATE TABLE control_business_discovery_jobs({OWNED},discovery_id VARCHAR NOT NULL,
      session_id VARCHAR NOT NULL REFERENCES control_sessions(id),sequence INTEGER NOT NULL CHECK(sequence>0),
      base_revision INTEGER NOT NULL CHECK(base_revision>=0),message VARCHAR NOT NULL CHECK(length(message) BETWEEN 1 AND 2500),
      idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,source_revision VARCHAR NOT NULL,
      status VARCHAR NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
      run_id VARCHAR,lease_until TIMESTAMPTZ,deadline_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,
      failure_code VARCHAR,instruction_hash VARCHAR,usage JSONB,
      UNIQUE({BINDING}),UNIQUE(discovery_id,sequence),UNIQUE(user_id,environment_id,idempotency_key),
      {parent('control_business_discoveries','discovery_id')})""")
    op.execute(f"""CREATE TABLE control_business_discovery_reports({OWNED},discovery_id VARCHAR NOT NULL,
      job_id VARCHAR NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),
      payload JSONB NOT NULL CHECK(octet_length(payload::text)<=262144),
      material_hash VARCHAR NOT NULL CHECK(material_hash ~ '^[a-f0-9]{{64}}$'),source_revision VARCHAR NOT NULL,
      UNIQUE({BINDING}),UNIQUE(discovery_id,revision),UNIQUE(job_id),
      UNIQUE(id,discovery_id,revision,material_hash,user_id,organization_id,portfolio_id,environment_id),
      {parent('control_business_discoveries','discovery_id')},{parent('control_business_discovery_jobs','job_id')})""")
    op.execute(f"""CREATE TABLE control_business_discovery_attempts({OWNED},discovery_id VARCHAR NOT NULL,
      job_id VARCHAR NOT NULL,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 6),
      role VARCHAR NOT NULL CHECK(role IN ('creator','critic','coordinator')),round_number INTEGER NOT NULL CHECK(round_number BETWEEN 1 AND 2),
      run_id VARCHAR NOT NULL,instruction_hash VARCHAR NOT NULL,source_revision VARCHAR NOT NULL,
      model VARCHAR NOT NULL CHECK(model IN ('gpt-6-luna','gpt-6.1-sol')),
      UNIQUE({BINDING}),UNIQUE(job_id,sequence),{parent('control_business_discoveries','discovery_id')},
      {parent('control_business_discovery_jobs','job_id')})""")
    op.execute(f"""CREATE TABLE control_business_build_approvals({OWNED},discovery_id VARCHAR NOT NULL,
      report_id VARCHAR NOT NULL,report_revision INTEGER NOT NULL,report_sha256 VARCHAR NOT NULL,
      creation_id VARCHAR NOT NULL,session_id VARCHAR NOT NULL REFERENCES control_sessions(id),
      idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,
      UNIQUE({BINDING}),UNIQUE(discovery_id),UNIQUE(creation_id),UNIQUE(user_id,environment_id,idempotency_key),
      {parent('control_business_discoveries','discovery_id')},{parent('control_creations','creation_id')},
      FOREIGN KEY(report_id,discovery_id,report_revision,report_sha256,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_business_discovery_reports(id,discovery_id,revision,material_hash,user_id,organization_id,portfolio_id,environment_id))""")
    op.execute(f"""CREATE TABLE control_creation_archives({OWNED},creation_id VARCHAR NOT NULL,
      session_id VARCHAR NOT NULL REFERENCES control_sessions(id),idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,
      UNIQUE({BINDING}),UNIQUE(creation_id),UNIQUE(user_id,environment_id,idempotency_key),
      {parent('control_creations','creation_id')})""")
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
        op.execute(f"CREATE POLICY discovery_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        privileges = "SELECT,INSERT,UPDATE" if table in TABLES[:2] else "SELECT,INSERT"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")
    op.execute("CREATE UNIQUE INDEX ix_discovery_active_job ON control_business_discovery_jobs(discovery_id) WHERE status IN ('queued','running')")
    op.execute("""CREATE FUNCTION control_discovery_candidates(e VARCHAR)
      RETURNS TABLE(id VARCHAR,user_id VARCHAR,status VARCHAR,lease_until TIMESTAMPTZ)
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT j.id,j.user_id,j.status,j.lease_until FROM public.control_business_discovery_jobs j
      WHERE j.environment_id=e AND (e='local' OR e LIKE 'test-%') AND j.status IN ('queued','running')
        AND ((j.status='running' AND j.lease_until>now()) OR EXISTS(
          SELECT 1 FROM public.control_users u JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
          JOIN public.control_memberships m ON m.user_id=u.id AND m.environment_id=u.environment_id
          JOIN public.control_portfolios p ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
          JOIN public.control_sessions s ON s.user_id=u.id AND s.environment_id=u.environment_id
          WHERE u.id=j.user_id AND u.environment_id=j.environment_id AND u.enabled AND a.verified_at IS NOT NULL
          AND m.enabled AND m.role='owner' AND m.organization_id=j.organization_id AND p.id=j.portfolio_id
          AND s.id=j.session_id AND s.revoked_at IS NULL AND s.expires_at>now()))
      ORDER BY CASE WHEN j.status='running' THEN 0 ELSE 1 END,j.created_at,j.id LIMIT 20 $$""")
    op.execute("REVOKE ALL ON FUNCTION control_discovery_candidates(VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_discovery_candidates(VARCHAR) TO pinet_runtime")
    counts()


def downgrade():
    if any(op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {table})")) for table in TABLES):
        raise RuntimeError("Populated discovery/accounting/archival history cannot be downgraded")
    counts(False)
    op.execute("DROP FUNCTION control_discovery_candidates(VARCHAR)")
    for table in reversed(TABLES):
        op.execute(f"DROP TABLE {table}")
