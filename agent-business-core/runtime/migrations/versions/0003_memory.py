"""Anonymous device continuity, scoped credentials and conversation linkage."""
from alembic import op

revision = "0003_memory"
down_revision = "0002_policy"

STATEMENTS = (
    '''CREATE TABLE visitors (
        id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL, payload JSONB NOT NULL,
        token_hash VARCHAR NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE, UNIQUE (id, business_id, environment_id))''',
    "CREATE INDEX ix_visitors_business_id ON visitors (business_id)",
    "CREATE INDEX ix_visitors_environment_id ON visitors (environment_id)",
    "ALTER TABLE visitors ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE visitors FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY tenant_scope ON visitors
       USING (business_id = current_setting('pinet.business', true)
         AND environment_id = current_setting('pinet.environment', true))
       WITH CHECK (business_id = current_setting('pinet.business', true)
         AND environment_id = current_setting('pinet.environment', true))''',
    "ALTER TABLE conversations ADD COLUMN visitor_id VARCHAR",
    "CREATE INDEX ix_conversations_visitor_id ON conversations (visitor_id)",
    '''ALTER TABLE conversations ADD CONSTRAINT conversations_visitor_scope_fk
       FOREIGN KEY (visitor_id, business_id, environment_id)
       REFERENCES visitors (id, business_id, environment_id)''',
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("ALTER TABLE conversations DROP CONSTRAINT conversations_visitor_scope_fk")
    op.execute("ALTER TABLE conversations DROP COLUMN visitor_id")
    op.execute("DROP TABLE visitors")
