"""Shared current approved knowledge and durable revocations."""
from alembic import op

revision = "0005_knowledge"
down_revision = "0004_memory_indexes"
STATEMENTS = (
    '''CREATE TABLE knowledge_states (
        id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL, payload JSONB NOT NULL,
        revision INTEGER NOT NULL, refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE (business_id, environment_id))''',
    "CREATE INDEX ix_knowledge_states_business_id ON knowledge_states (business_id)",
    "CREATE INDEX ix_knowledge_states_environment_id ON knowledge_states (environment_id)",
    "ALTER TABLE knowledge_states ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE knowledge_states FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY tenant_scope ON knowledge_states
       USING (business_id = current_setting('pinet.business', true)
         AND environment_id = current_setting('pinet.environment', true))
       WITH CHECK (business_id = current_setting('pinet.business', true)
         AND environment_id = current_setting('pinet.environment', true))''',
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("DROP TABLE knowledge_states")
