"""Index scoped memory lookups without changing previously applied migrations."""
from alembic import op

revision = "0004_memory_indexes"
down_revision = "0003_memory"
STATEMENTS = (
    "CREATE INDEX ix_visitors_token_hash ON visitors (token_hash)",
    "CREATE INDEX conversations_visitor_history ON conversations (visitor_id, created_at)",
    "CREATE INDEX events_memory_order ON conversation_events (conversation_id, created_at, id)",
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    for name in ("events_memory_order", "conversations_visitor_history", "ix_visitors_token_hash"):
        op.execute(f"DROP INDEX {name}")
