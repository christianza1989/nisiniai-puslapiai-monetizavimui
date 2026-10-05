"""Conservative cost admission metadata; estimates do not claim invoice reconciliation."""
from alembic import op

revision = "0006_costs"
down_revision = "0005_knowledge"
STATEMENTS = (
    '''CREATE TABLE cost_reservations (
        id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
        action_key VARCHAR NOT NULL UNIQUE, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        reserved_microusd BIGINT NOT NULL, observed_microusd BIGINT)''',
    "CREATE INDEX ix_cost_reservations_business_id ON cost_reservations (business_id)",
    "CREATE INDEX ix_cost_reservations_environment_id ON cost_reservations (environment_id)",
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("DROP TABLE cost_reservations")
