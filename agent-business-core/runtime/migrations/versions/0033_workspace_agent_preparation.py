"""Explicit immutable preparation intent on maintained TeamTurn/native Task."""
from alembic import op

from pinet_core.workspace_team.preparation_schema import downgrade_sql, upgrade_sql

revision = "0033_workspace_agent_preparation"
down_revision = "0032_workspace_team"


def upgrade():
    for sql in upgrade_sql():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(
        "SELECT EXISTS(SELECT 1 FROM control_workspace_team_turns WHERE agent_creation_id IS NOT NULL)"
    ).scalar():
        raise RuntimeError("Retained agent preparation intent requires explicit preservation")
    for sql in downgrade_sql():
        op.execute(sql)
