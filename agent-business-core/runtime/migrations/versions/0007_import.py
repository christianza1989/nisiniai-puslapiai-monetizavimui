"""Independent source replay checkpoints; existing D1 form is not modified."""
from alembic import op

revision = "0007_import"
down_revision = "0006_costs"
STATEMENTS = (
    '''CREATE TABLE source_checkpoints (
       id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE NOT NULL, payload JSONB NOT NULL, source_system VARCHAR NOT NULL,
       UNIQUE(business_id, environment_id, source_system))''',
    "CREATE INDEX ix_source_checkpoints_business_id ON source_checkpoints (business_id)",
    "CREATE INDEX ix_source_checkpoints_environment_id ON source_checkpoints (environment_id)",
    "ALTER TABLE source_checkpoints ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE source_checkpoints FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY tenant_scope ON source_checkpoints
       USING (business_id = current_setting('pinet.business', true)
          AND environment_id = current_setting('pinet.environment', true))
       WITH CHECK (business_id = current_setting('pinet.business', true)
          AND environment_id = current_setting('pinet.environment', true))''',
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("DROP TABLE source_checkpoints")
