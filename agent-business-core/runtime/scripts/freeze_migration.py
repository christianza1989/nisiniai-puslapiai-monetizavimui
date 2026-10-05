"""Freeze initial DDL now; future model changes cannot silently change migration 0001."""
import json
from pathlib import Path

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

from pinet_core.models import TENANT_TABLES, Base

dialect = postgresql.dialect()
statements = []
for table in Base.metadata.sorted_tables:
    statements.append(str(CreateTable(table).compile(dialect=dialect)))
    for index in sorted(table.indexes, key=lambda item: item.name):
        statements.append(str(CreateIndex(index).compile(dialect=dialect)))
for table in TENANT_TABLES:
    statements += [f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY',
                   f'ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY']
    rule = ("business_id = current_setting('pinet.business', true) AND "
            "environment_id = current_setting('pinet.environment', true)")
    statements.append(f'CREATE POLICY tenant_scope ON "{table}" USING ({rule}) WITH CHECK ({rule})')
target = Path("migrations/versions/0001_core.schema.json")
target.write_text(json.dumps({"statements": statements,
                             "tables": [t.name for t in Base.metadata.sorted_tables]}, indent=2) + "\n", encoding="utf-8")
print(f"Frozen {len(statements)} DDL statements; no runtime or credential data.")
