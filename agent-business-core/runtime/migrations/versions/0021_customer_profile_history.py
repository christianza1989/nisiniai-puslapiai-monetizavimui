"""Preserve immutable profile history without an arbitrary lifetime admission cap."""
from alembic import op

revision = "0021_customer_profile_history"
down_revision = "0020_native_review_model"


def upgrade():
    op.execute("""ALTER TABLE control_customer_profile_admissions
      ADD CONSTRAINT control_customer_profile_admissions_sequence_history_check CHECK(sequence>=1)""")
    op.execute("""ALTER TABLE control_customer_profile_admissions
      DROP CONSTRAINT control_customer_profile_admissions_sequence_check""")


def downgrade():
    # Validate narrowing first. A failure rolls back the transaction, keeping all
    # rows and the current constraint; never truncate or renumber immutable history.
    op.execute("""ALTER TABLE control_customer_profile_admissions
      ADD CONSTRAINT control_customer_profile_admissions_sequence_check CHECK(sequence BETWEEN 1 AND 20)""")
    op.execute("""ALTER TABLE control_customer_profile_admissions
      DROP CONSTRAINT control_customer_profile_admissions_sequence_history_check""")
