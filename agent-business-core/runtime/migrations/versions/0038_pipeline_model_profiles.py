"""Sparse server-captured local Sol/high bindings and profile-dependent model fences."""
from alembic import op

from pinet_core.creation.execution_profile_schema import PARENTS, TABLE, statements

revision = "0038_pipeline_model_profiles"
down_revision = "0037_selected_work_candidates"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {TABLE})").scalar():
        raise RuntimeError("Retained pipeline model profiles cannot be downgraded")
    for kind, (parent, attempts, _) in PARENTS.items():
        if kind != "discovery":
            op.execute(f"ALTER TABLE {attempts} ADD CONSTRAINT {attempts}_legacy_profile_check "
                "CHECK(model='gpt-6-luna' OR (model='gpt-6.1-sol' AND role IN('critic','coordinator')))")
            op.execute(f"ALTER TABLE {attempts} DROP CONSTRAINT {attempts}_review_model_check")
            op.execute(f"ALTER TABLE {attempts} RENAME CONSTRAINT {attempts}_legacy_profile_check TO {attempts}_review_model_check")
        op.execute(f"DROP TRIGGER pipeline_model_profile_capture ON {parent}")
        op.execute(f"DROP TRIGGER pipeline_model_attempt_fence ON {attempts}")
        op.execute(f"DROP FUNCTION control_{kind}_model_profile_fence()")
    op.execute("DROP FUNCTION control_pipeline_profile_capture()")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("DROP FUNCTION control_pipeline_profile_immutable()")
