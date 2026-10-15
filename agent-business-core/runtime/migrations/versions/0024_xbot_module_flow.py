"""Isolated local X proposal admission, worker grants and durable acceptance tickets."""

from alembic import op

revision = "0024_xbot_module_flow"
down_revision = "0023_customer_source_refreshes"
TABLES = ("control_xbot_admissions", "control_xbot_slots", "control_xbot_workers", "control_xbot_tickets")
OWNED = "user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL"


def upgrade():
    op.execute(f"""CREATE TABLE control_xbot_admissions(id VARCHAR PRIMARY KEY,{OWNED},
      agent_id VARCHAR NOT NULL,config_revision INTEGER NOT NULL CHECK(config_revision>0),
      config_sha256 VARCHAR NOT NULL CHECK(config_sha256 ~ '^[a-f0-9]{{64}}$'),
      registration_id VARCHAR NOT NULL REFERENCES control_creation_registrations(id) ON DELETE RESTRICT,
      profile_id VARCHAR NOT NULL REFERENCES control_customer_profile_admissions(id) ON DELETE RESTRICT,
      business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,site_id VARCHAR NOT NULL,
      material JSONB NOT NULL CHECK(jsonb_typeof(material)='object' AND octet_length(material::text)<=65536),
      fingerprint VARCHAR NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{{64}}$'),created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>created_at),
      UNIQUE(id,user_id,organization_id,portfolio_id,environment_id),
      FOREIGN KEY(agent_id,user_id,organization_id,portfolio_id,environment_id,config_revision)
       REFERENCES control_customer_agent_configs(agent_id,user_id,organization_id,portfolio_id,environment_id,revision)
       ON DELETE RESTRICT)""")
    op.execute(f"""CREATE TABLE control_xbot_slots({OWNED},site_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,
      admission_id VARCHAR NOT NULL,generation INTEGER NOT NULL CHECK(generation>0),revoked BOOLEAN NOT NULL,
      PRIMARY KEY(environment_id,site_id),
      FOREIGN KEY(admission_id,user_id,organization_id,portfolio_id,environment_id)
       REFERENCES control_xbot_admissions(id,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT)""")
    op.execute(f"""CREATE TABLE control_xbot_workers(id VARCHAR PRIMARY KEY,{OWNED},admission_id VARCHAR NOT NULL,
      generation INTEGER NOT NULL CHECK(generation>0),token_hash VARCHAR NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{{64}}$'),
      created_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>created_at),revoked_at TIMESTAMPTZ,
      UNIQUE(id,user_id,organization_id,portfolio_id,environment_id),
      UNIQUE(id,admission_id,generation,user_id,organization_id,portfolio_id,environment_id),
      FOREIGN KEY(admission_id,user_id,organization_id,portfolio_id,environment_id)
       REFERENCES control_xbot_admissions(id,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT)""")
    op.execute(f"""CREATE TABLE control_xbot_tickets(id VARCHAR PRIMARY KEY,{OWNED},worker_id VARCHAR NOT NULL,
      admission_id VARCHAR NOT NULL,generation INTEGER NOT NULL CHECK(generation>0),request_id VARCHAR NOT NULL,
      request_sha256 VARCHAR NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{{64}}$'),
      state VARCHAR NOT NULL CHECK(state IN ('queued','reserved','accepted','rejected','quarantined','uncertain')),
      epoch INTEGER NOT NULL DEFAULT 0 CHECK(epoch>=0),lease_until TIMESTAMPTZ,
      job_id VARCHAR,proposal_sha256 VARCHAR CHECK(proposal_sha256 IS NULL OR proposal_sha256 ~ '^[a-f0-9]{{64}}$'),
      usage JSONB NOT NULL DEFAULT '{{}}' CHECK(jsonb_typeof(usage)='object'),reason VARCHAR,
      usage_status VARCHAR NOT NULL DEFAULT 'unknown' CHECK(usage_status IN ('known','partial','unknown')),
      started_calls INTEGER NOT NULL DEFAULT 0 CHECK(started_calls BETWEEN 0 AND 2),
      finished_calls INTEGER NOT NULL DEFAULT 0 CHECK(finished_calls BETWEEN 0 AND started_calls),
      created_at TIMESTAMPTZ NOT NULL,updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(worker_id,request_id),
      FOREIGN KEY(worker_id,admission_id,generation,user_id,organization_id,portfolio_id,environment_id)
       REFERENCES control_xbot_workers(id,admission_id,generation,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(admission_id,user_id,organization_id,portfolio_id,environment_id)
       REFERENCES control_xbot_admissions(id,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT)""")
    for table in TABLES:
        condition = f"{table}.environment_id=current_setting('pinet.environment',true) AND {table}.user_id=current_setting('pinet.control_user',true)"
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY xbot_owner ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        op.execute(f"GRANT SELECT ON {table} TO pinet_runtime")
    op.execute("GRANT INSERT,UPDATE ON control_xbot_tickets TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_xbot_immutable() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$ BEGIN RAISE EXCEPTION 'Immutable X module evidence'; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_xbot_immutable() FROM PUBLIC")
    op.execute(
        "CREATE TRIGGER xbot_admission_immutable BEFORE UPDATE ON control_xbot_admissions FOR EACH ROW EXECUTE FUNCTION control_xbot_immutable()"
    )
    op.execute("""CREATE FUNCTION control_xbot_fence() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$ BEGIN
      IF TG_TABLE_NAME='control_xbot_workers' THEN
        IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at')
          OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN
          RAISE EXCEPTION 'Immutable X worker identity'; END IF;
      ELSIF TG_TABLE_NAME='control_xbot_slots' THEN
        IF (to_jsonb(NEW)-ARRAY['admission_id','generation','revoked']) IS DISTINCT FROM
           (to_jsonb(OLD)-ARRAY['admission_id','generation','revoked']) OR NEW.generation<>OLD.generation+1
           OR NOT ((NOT OLD.revoked AND NEW.revoked AND NEW.admission_id=OLD.admission_id)
             OR (OLD.revoked AND NOT NEW.revoked AND NEW.admission_id<>OLD.admission_id)) THEN
           RAISE EXCEPTION 'X slot generation fence'; END IF;
      ELSE
        IF (to_jsonb(NEW)-ARRAY['state','epoch','lease_until','job_id','proposal_sha256','usage',
          'usage_status','started_calls','finished_calls','reason','updated_at']) IS DISTINCT FROM
          (to_jsonb(OLD)-ARRAY['state','epoch','lease_until','job_id','proposal_sha256','usage',
          'usage_status','started_calls','finished_calls','reason','updated_at'])
          OR OLD.state IN ('accepted','rejected','quarantined','uncertain')
          OR NEW.started_calls<OLD.started_calls OR NEW.finished_calls<OLD.finished_calls
          OR (OLD.job_id IS NOT NULL AND NEW.job_id IS DISTINCT FROM OLD.job_id)
          OR NOT ((OLD.state='queued' AND NEW.state='reserved' AND NEW.epoch=OLD.epoch+1
             AND NEW.lease_until IS NOT NULL)
           OR (OLD.state='reserved' AND NEW.state IN ('reserved','accepted','rejected','quarantined','uncertain')
             AND NEW.epoch=OLD.epoch AND NEW.lease_until=OLD.lease_until)) THEN
          RAISE EXCEPTION 'Immutable X ticket identity or terminal fence'; END IF;
      END IF;
      RETURN NEW; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_xbot_fence() FROM PUBLIC")
    for table in TABLES[1:]:
        op.execute(
            f"CREATE TRIGGER xbot_fence BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION control_xbot_fence()"
        )
    op.execute("""CREATE FUNCTION control_xbot_worker_lookup(h VARCHAR,e VARCHAR)
      RETURNS TABLE(id VARCHAR,user_id VARCHAR,organization_id VARCHAR,portfolio_id VARCHAR,environment_id VARCHAR)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
       SELECT w.id,w.user_id,w.organization_id,w.portfolio_id,w.environment_id FROM public.control_xbot_workers w
       WHERE w.token_hash=h AND w.environment_id=e AND (e='local' OR e LIKE 'test-%') $$""")
    # Lookup only establishes a retained worker identity for accounting. Fresh authority
    # is revalidated independently; expired/revoked identity cannot dispatch/accept.
    op.execute("REVOKE ALL ON FUNCTION control_xbot_worker_lookup(VARCHAR,VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_xbot_worker_lookup(VARCHAR,VARCHAR) TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_xbot_pin(aid VARCHAR,wid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE a public.control_xbot_admissions%ROWTYPE; BEGIN
      SELECT * INTO a FROM public.control_xbot_admissions WHERE id=aid
        AND environment_id=current_setting('pinet.environment',true)
        AND user_id=current_setting('pinet.control_user',true)
        AND (environment_id='local' OR environment_id LIKE 'test-%');
      IF NOT FOUND THEN RETURN false; END IF;
      -- Lock only this admission's canonical rows. No write and no arbitrary table/id input.
      -- Caller holds Registration lifetime first, matching maintained revocation ordering.
      PERFORM 1 FROM public.control_users WHERE id=a.user_id AND environment_id=a.environment_id FOR SHARE;
      PERFORM 1 FROM public.control_customer_accounts WHERE user_id=a.user_id AND environment_id=a.environment_id FOR SHARE;
      PERFORM 1 FROM public.control_memberships WHERE user_id=a.user_id
        AND organization_id=a.organization_id AND environment_id=a.environment_id FOR SHARE;
      PERFORM 1 FROM public.control_creations WHERE id=(SELECT creation_id FROM public.control_customer_agent_modules WHERE id=a.agent_id) FOR SHARE;
      PERFORM 1 FROM public.control_customer_agent_modules WHERE id=a.agent_id FOR SHARE;
      PERFORM 1 FROM public.control_business_grants WHERE id=(SELECT grant_id FROM public.control_creation_registrations WHERE id=a.registration_id) FOR SHARE;
      PERFORM 1 FROM public.control_customer_profile_admissions WHERE id=a.profile_id FOR SHARE;
      PERFORM 1 FROM public.control_xbot_slots WHERE environment_id=a.environment_id AND site_id=a.site_id FOR SHARE;
      IF wid IS NOT NULL THEN
        PERFORM 1 FROM public.control_xbot_workers WHERE id=wid AND admission_id=aid FOR SHARE;
        IF NOT FOUND THEN RETURN false; END IF;
      END IF;
      RETURN true; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_xbot_pin(VARCHAR,VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_xbot_pin(VARCHAR,VARCHAR) TO pinet_runtime")


def downgrade():
    for table in TABLES:
        op.execute(
            f"DO $$ BEGIN IF EXISTS(SELECT 1 FROM {table}) THEN RAISE EXCEPTION 'Retained X module history; destructive downgrade refused'; END IF; END $$"
        )
    op.execute("DROP FUNCTION control_xbot_worker_lookup(VARCHAR,VARCHAR)")
    op.execute("DROP FUNCTION IF EXISTS control_xbot_pin(VARCHAR,VARCHAR)")
    for table in reversed(TABLES):
        op.execute(f"DROP TABLE {table}")
    op.execute("DROP FUNCTION control_xbot_immutable()")
    op.execute("DROP FUNCTION IF EXISTS control_xbot_fence()")
