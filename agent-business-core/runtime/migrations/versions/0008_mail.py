"""Per-business private mail, reusing case scope and default sending account."""
from alembic import op

revision = "0008_mail"
down_revision = "0007_import"
STATEMENTS = (
    '''CREATE TABLE mail_messages (
       id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE NOT NULL, payload JSONB NOT NULL,
       case_id VARCHAR NOT NULL, message_id VARCHAR NOT NULL, direction VARCHAR NOT NULL, state VARCHAR NOT NULL,
       UNIQUE(business_id, environment_id, message_id),
       FOREIGN KEY(case_id,business_id,environment_id) REFERENCES cases(id,business_id,environment_id) ON DELETE CASCADE)''',
    "CREATE INDEX ix_mail_messages_business_id ON mail_messages (business_id)",
    "CREATE INDEX ix_mail_messages_environment_id ON mail_messages (environment_id)",
    "CREATE INDEX ix_mail_messages_case_id ON mail_messages (case_id)",
    "ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE mail_messages FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY tenant_scope ON mail_messages
       USING (business_id = current_setting('pinet.business', true)
          AND environment_id = current_setting('pinet.environment', true))
       WITH CHECK (business_id = current_setting('pinet.business', true)
          AND environment_id = current_setting('pinet.environment', true))''',
    "GRANT SELECT, INSERT, UPDATE, DELETE ON mail_messages TO pinet_runtime",
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("DROP TABLE mail_messages")
