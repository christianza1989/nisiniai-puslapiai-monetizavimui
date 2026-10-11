"""Normal capture ledger and explicitly approved per-business module mapping."""

from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import ledger_schema, module_schema

revision = "0025_acquisition_core"
down_revision = "0024_xbot_module_flow"


def upgrade():
    for sql in (
        *ledger_schema.DDL,
        *ledger_schema.isolation_sql(),
        module_schema.DDL,
        *module_schema.isolation_sql(),
    ):
        op.execute(sql)


def downgrade():
    connection = op.get_bind()
    op.execute("SET LOCAL row_security=off")
    tables = (module_schema.TABLE, *reversed(ledger_schema.TABLES))
    # Preserve captured correspondence/evidence. Only a truly empty rehearsal can roll back.
    if any(connection.scalar(text(f"SELECT EXISTS(SELECT 1 FROM {table} LIMIT 1)")) for table in tables):
        raise RuntimeError("Populated acquisition downgrade refused; preserve capture history")
    op.execute("DROP FUNCTION acquisition_pin_authority(VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    op.execute("DROP FUNCTION acquisition_pin_module(VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    for table in tables:
        op.execute(f"DROP TABLE {table}")
