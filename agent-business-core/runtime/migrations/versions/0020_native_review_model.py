"""Calibrate fixed native Sol reviews while preserving immutable Luna history."""
from alembic import op

revision = "0020_native_review_model"
down_revision = "0019_creation_job_history"


def upgrade():
    op.execute("ALTER TABLE control_content_work_attempts DROP CONSTRAINT control_content_work_attempts_model_check")
    op.execute("""ALTER TABLE control_content_work_attempts ADD CONSTRAINT control_content_work_attempts_review_model_check
      CHECK(model='gpt-6-luna' OR (model='gpt-6.1-sol' AND role IN ('critic','coordinator')))""")


def downgrade():
    # Validate the old constraint first: Sol history blocks downgrade atomically.
    # Never rewrite a reserved attempt or its model to make rollback pass.
    op.execute("ALTER TABLE control_content_work_attempts ADD CONSTRAINT control_content_work_attempts_model_check CHECK(model='gpt-6-luna')")
    op.execute("ALTER TABLE control_content_work_attempts DROP CONSTRAINT control_content_work_attempts_review_model_check")
