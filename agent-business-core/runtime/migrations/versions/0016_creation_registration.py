"""Administrative private creation registration; restricted readers cannot self-grant."""
from alembic import op

revision = "0016_creation_registration"
down_revision = "0015_content_work"

KEYS = {
    "businesses": ("uq_registration_business_identity", "id,site_id,canonical_host"),
    "control_business_grants": ("uq_registration_grant_identity", "id,business_id,organization_id,portfolio_id,environment_id"),
    "control_sessions": ("uq_registration_session_identity", "id,user_id,environment_id"),
    "control_creation_revisions": ("uq_registration_revision_identity",
        "id,creation_id,sequence,material_hash,source_revision,user_id,organization_id,portfolio_id,environment_id"),
}


def upgrade():
    for table, (name, columns) in KEYS.items():
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {name} UNIQUE({columns})")
    op.execute("""CREATE TABLE control_creation_registrations(
      id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
      portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL,
      creation_id VARCHAR NOT NULL,revision_id VARCHAR NOT NULL,
      accepted_revision INTEGER NOT NULL CHECK(accepted_revision BETWEEN 1 AND 20),
      candidate_sha256 VARCHAR NOT NULL CHECK(candidate_sha256 ~ '^[a-f0-9]{64}$'),
      accepted_source_revision VARCHAR NOT NULL CHECK(accepted_source_revision ~ '^[a-f0-9]{40}$'),
      business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,
      site_id VARCHAR NOT NULL CHECK(site_id ~ '^creation-[a-f0-9]{32}$' AND site_id='creation-'||replace(creation_id,'-','')),
      canonical_host VARCHAR NOT NULL CHECK(length(canonical_host) BETWEEN 1 AND 253),
      authorizing_session_id VARCHAR NOT NULL,coordinator_event_id VARCHAR NOT NULL
        REFERENCES control_creation_team_events(id) ON DELETE CASCADE,
      coordinator_sha256 VARCHAR NOT NULL CHECK(coordinator_sha256 ~ '^[a-f0-9]{64}$'),
      intake_sha256 VARCHAR NOT NULL CHECK(intake_sha256 ~ '^[a-f0-9]{64}$'),
      intake_request_sha256 VARCHAR NOT NULL CHECK(intake_request_sha256 ~ '^[a-f0-9]{64}$'),
      intake_importer_sha256 VARCHAR NOT NULL CHECK(intake_importer_sha256 ~ '^[a-f0-9]{64}$'),
      intake_site_file_sha256 VARCHAR NOT NULL CHECK(intake_site_file_sha256 ~ '^[a-f0-9]{64}$'),
      fingerprint VARCHAR NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),revoked_at TIMESTAMPTZ,
      UNIQUE(creation_id,accepted_revision,environment_id),
      FOREIGN KEY(revision_id,creation_id,accepted_revision,candidate_sha256,accepted_source_revision,
        user_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_creation_revisions(id,creation_id,sequence,material_hash,source_revision,
          user_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      FOREIGN KEY(business_id,site_id,canonical_host) REFERENCES businesses(id,site_id,canonical_host),
      FOREIGN KEY(grant_id,business_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_business_grants(id,business_id,organization_id,portfolio_id,environment_id) ON DELETE CASCADE,
      FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE CASCADE)""")
    condition = """environment_id=current_setting('pinet.environment',true)
      AND (environment_id='local' OR environment_id LIKE 'test-%')
      AND user_id=current_setting('pinet.control_user',true)
      AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
        ON a.user_id=u.id AND a.environment_id=u.environment_id
        WHERE u.id=control_creation_registrations.user_id AND u.environment_id=control_creation_registrations.environment_id
        AND u.enabled AND a.verified_at IS NOT NULL)
      AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
        ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
        WHERE m.user_id=control_creation_registrations.user_id AND m.environment_id=control_creation_registrations.environment_id
        AND m.organization_id=control_creation_registrations.organization_id AND m.enabled AND m.role='owner'
        AND p.id=control_creation_registrations.portfolio_id)"""
    op.execute("ALTER TABLE control_creation_registrations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE control_creation_registrations FORCE ROW LEVEL SECURITY")
    op.execute(f"CREATE POLICY registration_scope ON control_creation_registrations USING ({condition})")
    op.execute("REVOKE ALL ON control_creation_registrations FROM pinet_runtime")
    op.execute("GRANT SELECT ON control_creation_registrations TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_creation_registration_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at')
        OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN
        RAISE EXCEPTION 'Immutable registration; only terminal revocation is allowed'; END IF;
      RETURN NEW; END $$""")
    op.execute("REVOKE ALL ON FUNCTION control_creation_registration_immutable() FROM PUBLIC")
    op.execute("""CREATE TRIGGER registration_immutable BEFORE UPDATE ON control_creation_registrations
      FOR EACH ROW EXECUTE FUNCTION control_creation_registration_immutable()""")


def downgrade():
    op.execute("DROP TABLE control_creation_registrations")
    op.execute("DROP FUNCTION control_creation_registration_immutable()")
    for table, (name, _) in reversed(KEYS.items()):
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT {name}")
