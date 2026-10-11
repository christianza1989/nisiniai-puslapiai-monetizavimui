"""Keep durable trial history without a fixed lifetime job/event ceiling."""
from alembic import op

revision = "0019_creation_job_history"
down_revision = "0018_creation_review_model"

BOUNDS = (
    ("control_creations", "job_sequence", 0, 20),
    ("control_creations", "event_sequence", 0, 200),
    ("control_creation_jobs", "sequence", 1, 20),
    ("control_creation_events", "sequence", 1, 200),
    ("control_creation_team_events", "sequence", 1, 300),
)


def upgrade():
    for table, column, lower, _ in BOUNDS:
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {table}_{column}_history_check CHECK({column}>={lower})")
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT {table}_{column}_check")


def downgrade():
    # Validate every restored bound before dropping any replacement. PostgreSQL
    # transaction rollback preserves all rows and the0019 schema on failure.
    for table, column, lower, upper in BOUNDS:
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {table}_{column}_check CHECK({column} BETWEEN {lower} AND {upper})")
    for table, column, _, _ in BOUNDS:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT {table}_{column}_history_check")
