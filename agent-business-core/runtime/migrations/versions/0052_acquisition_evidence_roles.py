"""Recipient-less research evidence; retain all existing synthetic work/history."""

from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import evidence_schema

revision = "0052_acquisition_evidence_roles"
down_revision = "0051_mail_display_reauth"


def upgrade():
    tx = op.get_bind()
    if not tx.scalar(text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user")):
        raise RuntimeError("trusted_evidence_migration_owner_required")
    old = tx.scalar(
        text("SELECT pg_get_functiondef('acquisition_agent_role_input_current(jsonb,varchar)'::regprocedure)")
    )
    definition = evidence_schema.extend(old)
    op.execute(evidence_schema.input_current_sql())
    op.execute("REVOKE ALL ON FUNCTION acquisition_evidence_role_input_current(JSONB,VARCHAR) FROM PUBLIC")
    op.execute(
        "GRANT EXECUTE ON FUNCTION acquisition_evidence_role_input_current(JSONB,VARCHAR) TO pinet_runtime"
    )
    op.execute(definition)


def downgrade():
    raise RuntimeError("Retain research evidence/Task history; use source and authority containment")
