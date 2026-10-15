"""Durable customer agent task drafts with immutable history; no module activation."""
from alembic import op

revision = "0022_customer_agent_configs"
down_revision = "0021_customer_profile_history"

OWNED = """id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
 portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"""
BINDING = "id,user_id,organization_id,portfolio_id,environment_id"
REGISTRATION_KEYS = "creation_id,user_id,organization_id,portfolio_id,environment_id,business_id,grant_id,site_id,canonical_host,accepted_revision,candidate_sha256,accepted_source_revision"
MODULES = "control_customer_agent_modules"
CONFIGS = "control_customer_agent_configs"


def upgrade():
    op.execute(f"""CREATE TABLE {MODULES}({OWNED},creation_id VARCHAR NOT NULL,
      registration_id VARCHAR NOT NULL,registration_fingerprint VARCHAR NOT NULL,
      business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,site_id VARCHAR NOT NULL,canonical_host VARCHAR NOT NULL,
      accepted_revision INTEGER NOT NULL,candidate_sha256 VARCHAR NOT NULL,accepted_source_revision VARCHAR NOT NULL,
      purpose VARCHAR NOT NULL CHECK(purpose IN ('site_chat','customer_research','email','custom')),
      current_revision INTEGER NOT NULL CHECK(current_revision>=1),updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE({BINDING}),FOREIGN KEY(registration_id,{REGISTRATION_KEYS},registration_fingerprint)
        REFERENCES control_creation_registrations(id,{REGISTRATION_KEYS},fingerprint) ON DELETE CASCADE)""")
    op.execute(f"""CREATE TABLE {CONFIGS}({OWNED},agent_id VARCHAR NOT NULL,
      revision INTEGER NOT NULL CHECK(revision>=1),payload JSONB NOT NULL
        CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=65536),
      config_sha256 VARCHAR NOT NULL CHECK(config_sha256 ~ '^[a-f0-9]{{64}}$'),
      saved_source_revision VARCHAR NOT NULL CHECK(saved_source_revision ~ '^[a-f0-9]{{40}}$'),
      idempotency_key VARCHAR NOT NULL,request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint ~ '^[a-f0-9]{{64}}$'),
      authorizing_session_id VARCHAR NOT NULL,
      UNIQUE(agent_id,user_id,organization_id,portfolio_id,environment_id,revision),
      CONSTRAINT uq_customer_agent_request_key UNIQUE(user_id,environment_id,idempotency_key),
      FOREIGN KEY(agent_id,user_id,organization_id,portfolio_id,environment_id)
        REFERENCES {MODULES}({BINDING}) ON DELETE CASCADE,
      CONSTRAINT fk_customer_agent_authorizing_session FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""")
    op.execute(f"""ALTER TABLE {MODULES} ADD CONSTRAINT fk_customer_agent_current_config
      FOREIGN KEY(id,user_id,organization_id,portfolio_id,environment_id,current_revision)
      REFERENCES {CONFIGS}(agent_id,user_id,organization_id,portfolio_id,environment_id,revision)
      DEFERRABLE INITIALLY DEFERRED""")
    for table in (MODULES, CONFIGS):
        owner = f"""{table}.environment_id=current_setting('pinet.environment',true)
          AND ({table}.environment_id='local' OR {table}.environment_id LIKE 'test-%')
          AND {table}.user_id=current_setting('pinet.control_user',true)
          AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
            ON a.user_id=u.id AND a.environment_id=u.environment_id
            WHERE u.id={table}.user_id AND u.environment_id={table}.environment_id
            AND u.enabled AND a.verified_at IS NOT NULL)
          AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
            ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
            WHERE m.user_id={table}.user_id AND m.environment_id={table}.environment_id
            AND m.organization_id={table}.organization_id AND m.enabled AND m.role='owner'
            AND p.id={table}.portfolio_id)"""
        grant = f"""EXISTS(SELECT 1 FROM control_business_grants g WHERE
          g.id={table}.grant_id AND g.business_id={table}.business_id AND g.enabled
          AND g.portfolio_id={table}.portfolio_id AND g.organization_id={table}.organization_id
          AND g.environment_id={table}.environment_id)""" if table == MODULES else f"""EXISTS(
          SELECT 1 FROM {MODULES} a WHERE a.id={table}.agent_id AND a.user_id={table}.user_id
          AND a.environment_id={table}.environment_id AND a.portfolio_id={table}.portfolio_id
          AND a.organization_id={table}.organization_id)"""
        condition = f"{owner} AND {grant}"
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY customer_agent_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        privileges = "SELECT,INSERT,UPDATE" if table == MODULES else "SELECT,INSERT"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_customer_agent_identity_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF (to_jsonb(NEW)-'current_revision'-'updated_at') IS DISTINCT FROM
         (to_jsonb(OLD)-'current_revision'-'updated_at')
         OR NEW.current_revision::BIGINT<>OLD.current_revision::BIGINT+1
         OR NEW.updated_at<OLD.updated_at THEN
        RAISE EXCEPTION 'Immutable customer agent identity; append the next configuration'; END IF;
      RETURN NEW; END $$""")
    op.execute("""CREATE FUNCTION control_customer_agent_config_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      RAISE EXCEPTION 'Immutable customer agent configuration'; END $$""")
    for function in ("control_customer_agent_identity_immutable", "control_customer_agent_config_immutable"):
        op.execute(f"REVOKE ALL ON FUNCTION {function}() FROM PUBLIC")
    op.execute(f"""CREATE TRIGGER customer_agent_identity_immutable BEFORE UPDATE ON {MODULES}
      FOR EACH ROW EXECUTE FUNCTION control_customer_agent_identity_immutable()""")
    op.execute(f"""CREATE TRIGGER customer_agent_config_immutable BEFORE UPDATE ON {CONFIGS}
      FOR EACH ROW EXECUTE FUNCTION control_customer_agent_config_immutable()""")
    op.execute(f"CREATE INDEX ix_customer_agent_discovery ON {MODULES}(creation_id,created_at DESC,id DESC)")


def downgrade():
    op.execute(f"""DO $$ BEGIN IF EXISTS(SELECT 1 FROM {MODULES}) OR EXISTS(SELECT 1 FROM {CONFIGS}) THEN
      RAISE EXCEPTION 'Customer agent history exists; downgrade would destroy retained configurations';
      END IF; END $$""")
    op.execute(f"ALTER TABLE {MODULES} DROP CONSTRAINT fk_customer_agent_current_config")
    op.execute(f"DROP TABLE {CONFIGS}")
    op.execute(f"DROP TABLE {MODULES}")
    op.execute("DROP FUNCTION control_customer_agent_config_immutable()")
    op.execute("DROP FUNCTION control_customer_agent_identity_immutable()")
