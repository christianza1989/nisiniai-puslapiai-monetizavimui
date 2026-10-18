"""Additive0049 external-origin barriers;0046/0048 installers stay frozen.

The common business-source table/current helper and Agent XOR must exist first.
No SQL executes on import. Existing Task/Run/attempt/heartbeat/settlement callers
retain the same function names, grants, accounting and immutable old material.
"""
from . import model_schema, native_schema

TABLE_BINDING = "control_business_source_bindings"
ORIGIN_CHECK = (
    "(external_binding_id IS NULL AND creation_id IS NOT NULL AND registration_id IS NOT NULL) "
    "OR (external_binding_id IS NOT NULL AND creation_id IS NULL AND registration_id IS NULL)"
)
BINDING_KEYS = ("user_id", "organization_id", "portfolio_id", "environment_id", "business_id", "site_id")


def replace_once(source, before, after):
    if source.count(before) != 1:
        raise RuntimeError("Unknown or ambiguous acquisition external predecessor")
    return source.replace(before, after, 1)


def current_sql():
    source = replace_once(model_schema.current_sql(), "CREATE FUNCTION ", "CREATE OR REPLACE FUNCTION ")
    anchor = "      RETURN EXISTS(SELECT 1 FROM public.control_creation_registrations r"
    external = f"""      IF a.external_binding_id IS NOT NULL THEN
        IF NOT coalesce(public.business_source_binding_current(a.external_binding_id),FALSE)
          THEN RETURN FALSE;END IF;
        RETURN EXISTS(SELECT 1 FROM public.{TABLE_BINDING} b
          JOIN public.control_sessions s ON s.id=a.session_id AND s.user_id=a.user_id AND s.environment_id=a.environment_id
          JOIN public.control_customer_agent_modules agent ON agent.id=a.agent_id
          JOIN public.control_customer_agent_configs cfg ON cfg.id=a.config_id AND cfg.agent_id=agent.id
          WHERE b.id=a.external_binding_id AND b.fingerprint=a.registration_fingerprint
          AND b.business_id=a.business_id AND b.site_id=a.site_id AND b.environment_id=a.environment_id
          AND b.user_id=a.user_id AND b.organization_id=a.organization_id AND b.portfolio_id=a.portfolio_id
          AND a.creation_id IS NULL AND a.registration_id IS NULL AND a.expires_at<=b.expires_at
          AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
          AND agent.external_binding_id=b.id AND agent.registration_fingerprint=b.fingerprint
          AND agent.creation_id IS NULL AND agent.registration_id IS NULL
          AND agent.business_id=b.business_id AND agent.grant_id=b.grant_id
          AND agent.site_id=b.site_id AND agent.canonical_host=b.canonical_host
          AND agent.user_id=b.user_id AND agent.organization_id=b.organization_id
          AND agent.portfolio_id=b.portfolio_id AND agent.environment_id=b.environment_id
          AND agent.purpose=a.purpose AND agent.current_revision=a.config_revision
          AND cfg.revision=a.config_revision AND cfg.config_sha256=a.config_sha256
          AND cfg.external_binding_id=b.id AND cfg.external_binding_fingerprint=b.fingerprint
          AND cfg.user_id=a.user_id AND cfg.organization_id=a.organization_id
          AND cfg.portfolio_id=a.portfolio_id AND cfg.environment_id=a.environment_id);
      END IF;
"""
    return replace_once(source, anchor, external+anchor)


def pair_sql():
    source = replace_once(native_schema.helpers()[0], "CREATE FUNCTION ", "CREATE OR REPLACE FUNCTION ")
    for name in ("r", "e"):
        source = replace_once(source, f"{name}.registration_id,{name}.registration_fingerprint",
            f"{name}.registration_id,{name}.external_binding_id,{name}.registration_fingerprint")
    return source


def upgrade_sql():
    table = model_schema.TABLE_AUTH
    local = ",".join(("external_binding_id", *BINDING_KEYS, "registration_fingerprint"))
    remote = ",".join(("id", *BINDING_KEYS, "fingerprint"))
    return [
        f"ALTER TABLE {table} ADD COLUMN external_binding_id VARCHAR",
        f"ALTER TABLE {table} ALTER COLUMN creation_id DROP NOT NULL",
        f"ALTER TABLE {table} ALTER COLUMN registration_id DROP NOT NULL",
        f"ALTER TABLE {table} ADD CONSTRAINT acquisition_model_origin_xor CHECK({ORIGIN_CHECK})",
        f"ALTER TABLE {table} ADD CONSTRAINT fk_acquisition_model_external_binding FOREIGN KEY({local}) "
            f"REFERENCES {TABLE_BINDING}({remote}) ON DELETE RESTRICT",
        current_sql(), pair_sql(),
    ]
