"""Immutable admin-admitted customer profile history, with no runtime activation."""
from alembic import op

revision = "0017_customer_profile"
down_revision = "0016_creation_registration"

REGISTRATION_KEYS = "creation_id,user_id,organization_id,portfolio_id,environment_id,business_id,grant_id,site_id,canonical_host,accepted_revision,candidate_sha256,accepted_source_revision"


def upgrade():
    op.execute(f"""ALTER TABLE control_creation_registrations ADD CONSTRAINT uq_profile_registration_identity
      UNIQUE(id,{REGISTRATION_KEYS},fingerprint)""")
    op.execute(f"""CREATE TABLE control_customer_profile_admissions(
      id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
      portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL,
      registration_id VARCHAR NOT NULL,creation_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,
      grant_id VARCHAR NOT NULL,site_id VARCHAR NOT NULL,canonical_host VARCHAR NOT NULL,
      accepted_revision INTEGER NOT NULL CHECK(accepted_revision BETWEEN 1 AND 20),
      candidate_sha256 VARCHAR NOT NULL CHECK(candidate_sha256 ~ '^[a-f0-9]{{64}}$'),
      accepted_source_revision VARCHAR NOT NULL CHECK(accepted_source_revision ~ '^[a-f0-9]{{40}}$'),
      registration_fingerprint VARCHAR NOT NULL CHECK(registration_fingerprint ~ '^[a-f0-9]{{64}}$'),
      execution_source_revision VARCHAR NOT NULL CHECK(execution_source_revision ~ '^[a-f0-9]{{40}}$'),
      knowledge_revision INTEGER NOT NULL CHECK(knowledge_revision>=1),
      knowledge_hash VARCHAR NOT NULL CHECK(knowledge_hash ~ '^[a-f0-9]{{64}}$'),
      deployment_id VARCHAR NOT NULL CHECK(length(deployment_id) BETWEEN 1 AND 100),
      index_receipt_sha256 VARCHAR NOT NULL CHECK(index_receipt_sha256 ~ '^[a-f0-9]{{64}}$'),
      profile_version VARCHAR NOT NULL CHECK(profile_version='customer-profile.v1'),
      conversation_sha256 VARCHAR NOT NULL CHECK(conversation_sha256 ~ '^[a-f0-9]{{64}}$'),
      quality_sha256 VARCHAR NOT NULL CHECK(quality_sha256 ~ '^[a-f0-9]{{64}}$'),
      sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 20),authorizing_session_id VARCHAR NOT NULL,
      fingerprint VARCHAR NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{{64}}$'),revoked_at TIMESTAMPTZ,
      UNIQUE(creation_id,environment_id,sequence),UNIQUE(creation_id,environment_id,fingerprint),
      CONSTRAINT fk_profile_exact_registration FOREIGN KEY(registration_id,{REGISTRATION_KEYS},registration_fingerprint)
        REFERENCES control_creation_registrations(id,{REGISTRATION_KEYS},fingerprint) ON DELETE CASCADE,
      CONSTRAINT fk_profile_authorizing_session FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE CASCADE)""")
    condition = """environment_id=current_setting('pinet.environment',true)
      AND (environment_id='local' OR environment_id LIKE 'test-%')
      AND user_id=current_setting('pinet.control_user',true)
      AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
        ON a.user_id=u.id AND a.environment_id=u.environment_id
        WHERE u.id=control_customer_profile_admissions.user_id
        AND u.environment_id=control_customer_profile_admissions.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
      AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
        ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
        WHERE m.user_id=control_customer_profile_admissions.user_id
        AND m.environment_id=control_customer_profile_admissions.environment_id
        AND m.organization_id=control_customer_profile_admissions.organization_id
        AND m.enabled AND m.role='owner' AND p.id=control_customer_profile_admissions.portfolio_id)"""
    op.execute("ALTER TABLE control_customer_profile_admissions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE control_customer_profile_admissions FORCE ROW LEVEL SECURITY")
    op.execute(f"CREATE POLICY customer_profile_scope ON control_customer_profile_admissions USING ({condition})")
    op.execute("REVOKE ALL ON control_customer_profile_admissions FROM pinet_runtime")
    op.execute("GRANT SELECT ON control_customer_profile_admissions TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_customer_profile_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at')
        OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN
        RAISE EXCEPTION 'Immutable customer profile; only terminal revocation is allowed'; END IF;
      RETURN NEW; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_customer_profile_immutable() FROM PUBLIC")
    op.execute("""CREATE TRIGGER customer_profile_immutable BEFORE UPDATE ON control_customer_profile_admissions
      FOR EACH ROW EXECUTE FUNCTION control_customer_profile_immutable()""")


def downgrade():
    op.execute("DROP TABLE control_customer_profile_admissions")
    op.execute("DROP FUNCTION control_customer_profile_immutable()")
    op.execute("ALTER TABLE control_creation_registrations DROP CONSTRAINT uq_profile_registration_identity")
