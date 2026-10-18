"""Genuine external provenance extends the same immutable customer agent core."""
from alembic import op

from pinet_core.acquisition import external_schema as acquisition
from pinet_core.business_attachment import schema as attachments

revision = "0049_existing_business_agents"
down_revision = "0048_native_acquisition_chain"

LEGACY = ("creation_id", "registration_id", "accepted_revision", "candidate_sha256", "accepted_source_revision")
COMMON = "user_id,organization_id,portfolio_id,environment_id,business_id,grant_id,site_id,canonical_host"


def upgrade():
    for sql in attachments.upgrade_sql():
        op.execute(sql)
    op.execute("ALTER TABLE control_customer_agent_modules ADD COLUMN external_binding_id VARCHAR")
    for name in LEGACY:
        op.execute(f"ALTER TABLE control_customer_agent_modules ALTER COLUMN {name} DROP NOT NULL")
    legacy = " AND ".join(name+" IS NOT NULL" for name in LEGACY)
    external = " AND ".join(name+" IS NULL" for name in LEGACY)
    op.execute(f"""ALTER TABLE control_customer_agent_modules ADD CONSTRAINT customer_agent_origin_check
      CHECK((external_binding_id IS NULL AND {legacy}) OR(external_binding_id IS NOT NULL AND {external}))""")
    op.execute(f"""ALTER TABLE control_customer_agent_modules ADD CONSTRAINT fk_customer_agent_external_binding
      FOREIGN KEY(external_binding_id,{COMMON},registration_fingerprint)
      REFERENCES control_business_source_bindings(id,{COMMON},fingerprint) ON DELETE RESTRICT""")
    op.execute("ALTER TABLE control_customer_agent_configs ADD COLUMN import_provenance JSONB")
    op.execute("ALTER TABLE control_customer_agent_configs ADD COLUMN external_binding_id VARCHAR")
    op.execute("ALTER TABLE control_customer_agent_configs ADD COLUMN external_binding_fingerprint VARCHAR")
    op.execute("""ALTER TABLE control_customer_agent_configs ADD CONSTRAINT customer_agent_config_origin_check
      CHECK((external_binding_id IS NULL AND external_binding_fingerprint IS NULL)
        OR(external_binding_id IS NOT NULL AND external_binding_fingerprint IS NOT NULL
          AND external_binding_fingerprint ~ '^[a-f0-9]{64}$'))""")
    op.execute("""ALTER TABLE control_customer_agent_configs ADD CONSTRAINT fk_customer_agent_config_external_source
      FOREIGN KEY(external_binding_id,user_id,organization_id,portfolio_id,environment_id,external_binding_fingerprint)
      REFERENCES control_business_source_bindings(id,user_id,organization_id,portfolio_id,environment_id,fingerprint)
      ON DELETE RESTRICT""")
    op.execute("""ALTER TABLE control_customer_agent_configs ADD CONSTRAINT customer_agent_import_provenance_check
      CHECK(import_provenance IS NULL OR(jsonb_typeof(import_provenance)='object'
        AND octet_length(import_provenance::text)<=16384))""")
    op.execute("""CREATE FUNCTION customer_agent_import_origin() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
      IF NOT EXISTS(SELECT 1 FROM control_customer_agent_modules a
        WHERE a.id=NEW.agent_id AND a.user_id=NEW.user_id AND a.organization_id=NEW.organization_id
          AND a.portfolio_id=NEW.portfolio_id AND a.environment_id=NEW.environment_id
          AND ((a.external_binding_id IS NULL AND NEW.external_binding_id IS NULL
            AND NEW.import_provenance IS NULL) OR(a.external_binding_id IS NOT NULL
            AND NEW.external_binding_id IS NOT NULL AND EXISTS(SELECT 1 FROM control_business_source_bindings b
              WHERE b.id=NEW.external_binding_id AND b.fingerprint=NEW.external_binding_fingerprint
                AND ROW(b.user_id,b.organization_id,b.portfolio_id,b.environment_id,
                  b.business_id,b.grant_id,b.site_id,b.canonical_host)=
                  ROW(a.user_id,a.organization_id,a.portfolio_id,a.environment_id,
                    a.business_id,a.grant_id,a.site_id,a.canonical_host)))))
        THEN RAISE EXCEPTION 'Exact configuration source parent required';END IF;
      RETURN NEW;END$$""")
    op.execute("REVOKE ALL ON FUNCTION customer_agent_import_origin() FROM PUBLIC")
    op.execute("""CREATE TRIGGER customer_agent_import_origin BEFORE INSERT ON control_customer_agent_configs
      FOR EACH ROW EXECUTE FUNCTION customer_agent_import_origin()""")
    op.execute("""CREATE OR REPLACE FUNCTION control_customer_agent_identity_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
      IF NEW.current_revision::BIGINT<>OLD.current_revision::BIGINT+1 OR NEW.updated_at<OLD.updated_at
        OR(OLD.external_binding_id IS NULL AND(to_jsonb(NEW)-'current_revision'-'updated_at') IS DISTINCT FROM
          (to_jsonb(OLD)-'current_revision'-'updated_at'))
        OR(OLD.external_binding_id IS NOT NULL AND(NEW.external_binding_id IS NULL OR
          (to_jsonb(NEW)-'current_revision'-'updated_at'-'external_binding_id'-'registration_fingerprint')
          IS DISTINCT FROM(to_jsonb(OLD)-'current_revision'-'updated_at'-'external_binding_id'-'registration_fingerprint')))
        THEN RAISE EXCEPTION 'Immutable agent identity; only next configuration/source pointer allowed';END IF;
      RETURN NEW;END$$""")
    op.execute("""CREATE FUNCTION customer_agent_current_source() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
      IF NOT EXISTS(SELECT 1 FROM control_customer_agent_configs c WHERE c.agent_id=NEW.id
        AND c.revision=NEW.current_revision AND c.user_id=NEW.user_id AND c.organization_id=NEW.organization_id
        AND c.portfolio_id=NEW.portfolio_id AND c.environment_id=NEW.environment_id
        AND((NEW.external_binding_id IS NULL AND c.external_binding_id IS NULL)
          OR(NEW.external_binding_id IS NOT NULL AND c.external_binding_id=NEW.external_binding_id
            AND c.external_binding_fingerprint=NEW.registration_fingerprint)))
        THEN RAISE EXCEPTION 'Current configuration and source pointer must agree';END IF;
      RETURN NEW;END$$""")
    op.execute("REVOKE ALL ON FUNCTION customer_agent_current_source() FROM PUBLIC")
    op.execute("""CREATE CONSTRAINT TRIGGER customer_agent_current_source AFTER INSERT OR UPDATE
      ON control_customer_agent_modules DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION customer_agent_current_source()""")
    op.execute("""CREATE INDEX ix_customer_agent_business_discovery ON control_customer_agent_modules
      (business_id,user_id,environment_id,created_at DESC,id DESC)""")
    for sql in acquisition.upgrade_sql():
        op.execute(sql)


def downgrade():
    raise RuntimeError("External attachment retains source/configuration/attempt history; use scoped source rollback")
