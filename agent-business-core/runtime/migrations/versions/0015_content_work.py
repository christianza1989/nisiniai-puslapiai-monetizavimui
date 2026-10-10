"""Separate native GUIDE jobs/immutable role history and shared charged-attempt budgets."""
from alembic import op

revision = "0015_content_work"
down_revision = "0014_creation_team"
OWNED = "id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"
BINDING = "id,user_id,organization_id,portfolio_id,environment_id"


def parent(table, key):
    return f"FOREIGN KEY({key},user_id,organization_id,portfolio_id,environment_id) REFERENCES {table}({BINDING}) ON DELETE CASCADE"


def counts(include_content):
    for own in (False, True):
        name = "control_creation_own_attempt_count" if own else "control_creation_attempt_count"
        user = "AND a.user_id=current_setting('pinet.control_user',true)" if own else ""
        old_user = "AND j.user_id=current_setting('pinet.control_user',true)" if own else ""
        content = (f"+(SELECT count(*) FROM public.control_content_work_attempts a WHERE a.environment_id=e AND a.created_at>=s {user})"
                   if include_content else "")
        op.execute(f"""CREATE OR REPLACE FUNCTION {name}(e VARCHAR,s TIMESTAMPTZ) RETURNS BIGINT
          LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
          SELECT CASE WHEN e='local' OR e LIKE 'test-%' THEN
          (SELECT count(*) FROM public.control_creation_attempts a WHERE a.environment_id=e AND a.created_at>=s {user})+
          (SELECT count(*) FROM public.control_creation_jobs j WHERE j.environment_id=e AND j.created_at>=s {old_user}
            AND j.instruction_hash IS NOT NULL AND j.adapter_revision IS DISTINCT FROM 'codex-business-team.v1')
          {content} ELSE 0 END $$""")
        op.execute(f"REVOKE ALL ON FUNCTION {name}(VARCHAR,TIMESTAMPTZ) FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION {name}(VARCHAR,TIMESTAMPTZ) TO pinet_runtime")


def upgrade():
    op.execute("CREATE UNIQUE INDEX ix_content_revision_binding ON control_creation_revisions(id,creation_id,sequence,material_hash,user_id,organization_id,portfolio_id,environment_id)")
    op.execute(f"""CREATE TABLE control_content_work_jobs({OWNED},creation_id VARCHAR NOT NULL,revision_id VARCHAR NOT NULL,
      accepted_revision INTEGER NOT NULL CHECK(accepted_revision BETWEEN 1 AND 20),
      source_hash VARCHAR NOT NULL CHECK(source_hash ~ '^[a-f0-9]{{64}}$'),
      page_id VARCHAR NOT NULL CHECK(page_id ~ '^page-[a-f0-9]{{24}}$'),
      session_id VARCHAR NOT NULL REFERENCES control_sessions(id),sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 20),
      idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,
      source_revision VARCHAR NOT NULL CHECK(source_revision ~ '^[a-f0-9]{{40}}$'),
      status VARCHAR NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')),run_id VARCHAR,
      lease_until TIMESTAMPTZ,deadline_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,failure_code VARCHAR,
      binding JSONB CHECK(octet_length(binding::text)<=4096),result JSONB CHECK(octet_length(result::text)<=1000000),
      event_sequence INTEGER NOT NULL CHECK(event_sequence BETWEEN 0 AND 100),
      UNIQUE({BINDING}),UNIQUE({BINDING},creation_id),UNIQUE(user_id,environment_id,idempotency_key),UNIQUE(creation_id,sequence),
      FOREIGN KEY(revision_id,creation_id,accepted_revision,source_hash,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_creation_revisions(id,creation_id,sequence,material_hash,user_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      {parent('control_creations','creation_id')},{parent('control_creation_revisions','revision_id')})""")
    op.execute(f"""CREATE TABLE control_content_work_attempts({OWNED},creation_id VARCHAR NOT NULL,job_id VARCHAR NOT NULL,
      run_id VARCHAR NOT NULL,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 6),
      role VARCHAR NOT NULL CHECK(role IN ('creator','critic','coordinator')),round_number INTEGER NOT NULL CHECK(round_number BETWEEN 1 AND 2),
      stage VARCHAR NOT NULL CHECK(stage='content'),source_revision VARCHAR NOT NULL CHECK(source_revision ~ '^[a-f0-9]{{40}}$'),
      instruction_hash VARCHAR NOT NULL CHECK(instruction_hash ~ '^[a-f0-9]{{64}}$'),model VARCHAR NOT NULL CHECK(model='gpt-6-luna'),
      UNIQUE({BINDING}),UNIQUE({BINDING},creation_id,job_id),UNIQUE(job_id,sequence),
      FOREIGN KEY(job_id,creation_id,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_content_work_jobs(id,creation_id,user_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      {parent('control_creations','creation_id')},{parent('control_content_work_jobs','job_id')})""")
    op.execute(f"""CREATE TABLE control_content_work_events({OWNED},creation_id VARCHAR NOT NULL,job_id VARCHAR NOT NULL,
      attempt_id VARCHAR,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 100),
      state VARCHAR NOT NULL CHECK(state IN ('queued','reserved','succeeded','failed','cancelled','applied')),
      summary VARCHAR NOT NULL CHECK(length(summary) BETWEEN 10 AND 900),payload JSONB NOT NULL CHECK(octet_length(payload::text)<=262144),
      UNIQUE(job_id,sequence),UNIQUE(attempt_id,state),
      FOREIGN KEY(job_id,creation_id,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_content_work_jobs(id,creation_id,user_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      FOREIGN KEY(attempt_id,creation_id,job_id,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_content_work_attempts(id,creation_id,job_id,user_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      {parent('control_creations','creation_id')},{parent('control_content_work_jobs','job_id')},{parent('control_content_work_attempts','attempt_id')})""")
    for table in ("control_content_work_jobs", "control_content_work_attempts", "control_content_work_events"):
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
        op.execute(f"CREATE POLICY content_work_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        privileges = "SELECT,INSERT,UPDATE" if table == "control_content_work_jobs" else "SELECT,INSERT"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")
    op.execute("CREATE UNIQUE INDEX ix_content_one_active ON control_content_work_jobs(creation_id) WHERE status IN ('queued','running')")
    op.execute("CREATE INDEX ix_content_attempt_daily ON control_content_work_attempts(environment_id,created_at)")
    op.execute("""CREATE FUNCTION control_content_work_candidates(e VARCHAR)
      RETURNS TABLE(id VARCHAR,user_id VARCHAR,status VARCHAR,lease_until TIMESTAMPTZ)
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT j.id,j.user_id,j.status,j.lease_until FROM public.control_content_work_jobs j
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
    op.execute("REVOKE ALL ON FUNCTION control_content_work_candidates(VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_content_work_candidates(VARCHAR) TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_content_work_job_count(e VARCHAR,s TIMESTAMPTZ,own BOOLEAN) RETURNS BIGINT
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT count(*) FROM public.control_content_work_jobs j WHERE j.environment_id=e
        AND (e='local' OR e LIKE 'test-%') AND j.created_at>=s
        AND (NOT own OR j.user_id=current_setting('pinet.control_user',true)) $$""")
    op.execute("REVOKE ALL ON FUNCTION control_content_work_job_count(VARCHAR,TIMESTAMPTZ,BOOLEAN) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_content_work_job_count(VARCHAR,TIMESTAMPTZ,BOOLEAN) TO pinet_runtime")
    counts(True)


def downgrade():
    counts(False)
    op.execute("DROP FUNCTION IF EXISTS control_content_work_job_count(VARCHAR,TIMESTAMPTZ,BOOLEAN)")
    op.execute("DROP FUNCTION control_content_work_candidates(VARCHAR)")
    for table in ("control_content_work_events", "control_content_work_attempts", "control_content_work_jobs"):
        op.execute(f"DROP TABLE {table}")
    op.execute("DROP INDEX IF EXISTS ix_content_revision_binding")
