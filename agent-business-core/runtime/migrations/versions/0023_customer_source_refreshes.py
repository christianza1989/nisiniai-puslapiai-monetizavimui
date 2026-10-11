"""Immutable unchanged-source revalidation evidence; original identities stay intact."""
from alembic import op

revision = "0023_customer_source_refreshes"
down_revision = "0022_customer_agent_configs"
TABLE = "control_customer_source_refreshes"
BINDING = "id,user_id,organization_id,portfolio_id,environment_id,fingerprint"


def upgrade():
    op.execute(f"ALTER TABLE control_customer_profile_admissions ADD CONSTRAINT uq_source_refresh_profile UNIQUE({BINDING})")
    op.execute(f"""CREATE TABLE {TABLE}(
      id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
      portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL,
      admission_id VARCHAR NOT NULL,admission_fingerprint VARCHAR NOT NULL,
      authorizing_session_id VARCHAR NOT NULL,request_key VARCHAR NOT NULL,request_fingerprint VARCHAR NOT NULL,
      previous_refreshed_at TIMESTAMPTZ NOT NULL,refreshed_at TIMESTAMPTZ NOT NULL CHECK(refreshed_at>previous_refreshed_at),
      public_source_revision VARCHAR NOT NULL CHECK(public_source_revision ~ '^[a-f0-9]{{40}}$'),
      package_sha256 VARCHAR NOT NULL CHECK(package_sha256 ~ '^[a-f0-9]{{64}}$'),generated_at VARCHAR NOT NULL,
      projection_receipt JSONB NOT NULL CHECK(jsonb_typeof(projection_receipt)='object' AND octet_length(projection_receipt::text)<=4096),
      fingerprint VARCHAR NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{{64}}$'),
      UNIQUE(admission_id,environment_id,refreshed_at),UNIQUE(user_id,environment_id,request_key),
      CONSTRAINT fk_source_refresh_exact_profile FOREIGN KEY(admission_id,user_id,organization_id,portfolio_id,environment_id,admission_fingerprint)
        REFERENCES control_customer_profile_admissions({BINDING}) ON DELETE RESTRICT,
      CONSTRAINT fk_source_refresh_authorizing_session FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""")
    condition = f"""{TABLE}.environment_id=current_setting('pinet.environment',true)
      AND ({TABLE}.environment_id='local' OR {TABLE}.environment_id LIKE 'test-%')
      AND {TABLE}.user_id=current_setting('pinet.control_user',true)
      AND EXISTS(SELECT 1 FROM control_customer_profile_admissions a JOIN control_business_grants g
        ON g.id=a.grant_id AND g.business_id=a.business_id AND g.environment_id=a.environment_id
        WHERE a.id={TABLE}.admission_id AND a.user_id={TABLE}.user_id
        AND a.environment_id={TABLE}.environment_id AND a.organization_id={TABLE}.organization_id
        AND a.portfolio_id={TABLE}.portfolio_id AND a.fingerprint={TABLE}.admission_fingerprint
        AND g.enabled AND g.organization_id=a.organization_id AND g.portfolio_id=a.portfolio_id)"""
    op.execute(f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY")
    op.execute(f"CREATE POLICY customer_source_refresh_scope ON {TABLE} USING ({condition})")
    op.execute(f"REVOKE ALL ON {TABLE} FROM pinet_runtime")
    op.execute(f"GRANT SELECT ON {TABLE} TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_customer_source_refresh_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      RAISE EXCEPTION 'Immutable source revalidation evidence'; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_customer_source_refresh_immutable() FROM PUBLIC")
    op.execute(f"""CREATE TRIGGER customer_source_refresh_immutable BEFORE UPDATE ON {TABLE}
      FOR EACH ROW EXECUTE FUNCTION control_customer_source_refresh_immutable()""")


def downgrade():
    op.execute(f"""DO $$ BEGIN IF EXISTS(SELECT 1 FROM {TABLE}) THEN
      RAISE EXCEPTION 'Source revalidation history exists; downgrade would destroy evidence'; END IF; END $$""")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("DROP FUNCTION control_customer_source_refresh_immutable()")
    op.execute("ALTER TABLE control_customer_profile_admissions DROP CONSTRAINT uq_source_refresh_profile")
