"""Allow fixed Sol reviews without changing immutable Luna history or GUIDE policy."""
from alembic import op

revision = "0018_creation_review_model"
down_revision = "0017_customer_profile"


def upgrade():
    op.execute("ALTER TABLE control_creation_attempts DROP CONSTRAINT control_creation_attempts_model_check")
    op.execute("""ALTER TABLE control_creation_attempts ADD CONSTRAINT control_creation_attempts_review_model_check
      CHECK(model='gpt-6-luna' OR (model='gpt-6.1-sol' AND role IN ('critic','coordinator')))""")


def downgrade():
    # PostgreSQL checks all existing rows before accepting the restored constraint.
    # Populated Sol history therefore blocks downgrade atomically; never rewrite it.
    op.execute("ALTER TABLE control_creation_attempts ADD CONSTRAINT control_creation_attempts_model_check CHECK(model='gpt-6-luna')")
    op.execute("ALTER TABLE control_creation_attempts DROP CONSTRAINT control_creation_attempts_review_model_check")
