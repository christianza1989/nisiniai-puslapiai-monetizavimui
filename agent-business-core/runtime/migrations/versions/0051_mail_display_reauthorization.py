"""Explicit zero-dispatch display successors; old rows/attempts are retained."""

from alembic import op
from sqlalchemy import text

from pinet_core.mail_view.task_reauthorization_schema import statements

revision = "0051_mail_display_reauth"
down_revision = "0050_acquisition_agent_roles"


def upgrade():
    tx = op.get_bind()
    owner = tx.scalar(text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"))
    columns = tx.scalar(
        text("""SELECT ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(attnum,n)
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.n)
        FROM pg_constraint c WHERE c.conrelid='control_mail_display_jobs'::regclass AND c.conname='uq_mail_display_source'""")
    )
    if not owner or columns != [
        "business_id",
        "environment_id",
        "mail_id",
        "source_sha256",
        "instruction_sha256",
        "target_language",
    ]:
        raise RuntimeError("Unknown trusted0050 display predecessor")
    for sql in statements():
        op.execute(sql)


def downgrade():
    raise RuntimeError(
        "Retained display reauthorization history; use source/policy containment, never erase successors"
    )
