"""Immutable three-role attempt reservations and safe timeline over the existing customer scope."""
from alembic import op

revision = "0014_creation_team"
down_revision = "0013_customer_creations"
OWNED = "id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"
BINDING = "id,user_id,organization_id,portfolio_id,environment_id"


def parent(table, key):
    return f"FOREIGN KEY({key},user_id,organization_id,portfolio_id,environment_id) REFERENCES {table}({BINDING}) ON DELETE CASCADE"


def upgrade():
    op.execute(f"""CREATE TABLE control_creation_attempts({OWNED},creation_id VARCHAR NOT NULL,job_id VARCHAR NOT NULL,
      run_id VARCHAR NOT NULL,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 6),
      role VARCHAR NOT NULL CHECK(role IN ('creator','critic','coordinator')),
      round_number INTEGER NOT NULL CHECK(round_number BETWEEN 1 AND 2),stage VARCHAR NOT NULL CHECK(stage='private_draft'),
      source_revision VARCHAR NOT NULL CHECK(source_revision ~ '^[a-f0-9]{{40}}$'),
      instruction_hash VARCHAR NOT NULL CHECK(instruction_hash ~ '^[a-f0-9]{{64}}$'),model VARCHAR NOT NULL CHECK(model='gpt-6-luna'),
      UNIQUE({BINDING}),UNIQUE(job_id,sequence),{parent('control_creations','creation_id')},{parent('control_creation_jobs','job_id')})""")
    op.execute(f"""CREATE TABLE control_creation_team_events({OWNED},creation_id VARCHAR NOT NULL,job_id VARCHAR NOT NULL,
      attempt_id VARCHAR NOT NULL,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 300),
      state VARCHAR NOT NULL CHECK(state IN ('reserved','succeeded','failed')),
      summary VARCHAR NOT NULL CHECK(length(summary) BETWEEN 10 AND 900),
      payload JSONB NOT NULL CHECK(octet_length(payload::text)<=32768),UNIQUE(creation_id,sequence),UNIQUE(attempt_id,state),
      {parent('control_creations','creation_id')},{parent('control_creation_jobs','job_id')},{parent('control_creation_attempts','attempt_id')})""")
    for table in ("control_creation_attempts", "control_creation_team_events"):
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
        op.execute(f"GRANT SELECT,INSERT ON {table} TO pinet_runtime")
    op.execute("CREATE INDEX ix_creation_attempt_daily ON control_creation_attempts(environment_id,created_at)")
    # Legacy calls stay charged across adoption. Revocation does not refund or hide global reservations.
    op.execute("""CREATE FUNCTION control_creation_attempt_count(e VARCHAR,s TIMESTAMPTZ) RETURNS BIGINT
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
        SELECT CASE WHEN e='local' OR e LIKE 'test-%' THEN
          (SELECT count(*) FROM public.control_creation_attempts a WHERE a.environment_id=e AND a.created_at>=s) +
          (SELECT count(*) FROM public.control_creation_jobs j WHERE j.environment_id=e AND j.created_at>=s
            AND j.instruction_hash IS NOT NULL AND j.adapter_revision IS DISTINCT FROM 'codex-business-team.v1')
          ELSE 0 END
      $$""")
    op.execute("REVOKE ALL ON FUNCTION control_creation_attempt_count(VARCHAR,TIMESTAMPTZ) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_creation_attempt_count(VARCHAR,TIMESTAMPTZ) TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_creation_own_attempt_count(e VARCHAR,s TIMESTAMPTZ) RETURNS BIGINT
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
        SELECT CASE WHEN e='local' OR e LIKE 'test-%' THEN
          (SELECT count(*) FROM public.control_creation_attempts a WHERE a.environment_id=e AND a.created_at>=s
            AND a.user_id=current_setting('pinet.control_user',true)) +
          (SELECT count(*) FROM public.control_creation_jobs j WHERE j.environment_id=e AND j.created_at>=s
            AND j.user_id=current_setting('pinet.control_user',true) AND j.instruction_hash IS NOT NULL
            AND j.adapter_revision IS DISTINCT FROM 'codex-business-team.v1') ELSE 0 END
      $$""")
    op.execute("REVOKE ALL ON FUNCTION control_creation_own_attempt_count(VARCHAR,TIMESTAMPTZ) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_creation_own_attempt_count(VARCHAR,TIMESTAMPTZ) TO pinet_runtime")


def downgrade():
    op.execute("DROP FUNCTION IF EXISTS control_creation_own_attempt_count(VARCHAR,TIMESTAMPTZ)")
    op.execute("DROP FUNCTION control_creation_attempt_count(VARCHAR,TIMESTAMPTZ)")
    op.execute("DROP TABLE control_creation_team_events")
    op.execute("DROP TABLE control_creation_attempts")
