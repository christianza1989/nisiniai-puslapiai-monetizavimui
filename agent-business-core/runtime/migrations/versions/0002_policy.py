"""Tenant operator policy and revision audit; leave migration 0001 unchanged."""
from alembic import op

revision = "0002_policy"
down_revision = "0001_core"
TABLES = ("business_policies", "policy_revisions")


def statements():
    for name in TABLES:
        yield f'''CREATE TABLE {name} (
            id VARCHAR PRIMARY KEY,
            business_id VARCHAR NOT NULL,
            environment_id VARCHAR NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            payload JSONB NOT NULL,
            revision INTEGER NOT NULL,
            UNIQUE (business_id, environment_id{", revision" if name == "policy_revisions" else ""})
        )'''
        yield f"CREATE INDEX ix_{name}_business_id ON {name} (business_id)"
        yield f"CREATE INDEX ix_{name}_environment_id ON {name} (environment_id)"
        yield f"ALTER TABLE {name} ENABLE ROW LEVEL SECURITY"
        yield f"ALTER TABLE {name} FORCE ROW LEVEL SECURITY"
        yield f'''CREATE POLICY tenant_scope ON {name}
            USING (business_id = current_setting('pinet.business', true)
                AND environment_id = current_setting('pinet.environment', true))
            WITH CHECK (business_id = current_setting('pinet.business', true)
                AND environment_id = current_setting('pinet.environment', true))'''


def upgrade():
    for statement in statements():
        op.execute(statement)


def downgrade():
    for table in reversed(TABLES):
        op.execute(f"DROP TABLE {table}")
