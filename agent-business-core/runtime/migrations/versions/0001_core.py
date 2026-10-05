"""Shared cases, conversations, jobs and tenant isolation."""
import json
from pathlib import Path

from alembic import op

revision = "0001_core"
down_revision = None


def upgrade():
    for statement in json.loads(Path(__file__).with_suffix(".schema.json").read_text(encoding="utf-8"))["statements"]:
        op.execute(statement)


def downgrade():
    for table in reversed(json.loads(Path(__file__).with_suffix(".schema.json").read_text(encoding="utf-8"))["tables"]):
        op.execute(f'DROP TABLE "{table}"')
