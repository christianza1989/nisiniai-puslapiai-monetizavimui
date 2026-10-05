import hashlib
import runpy
import sqlite3
import time
from pathlib import Path

import pytest

adapter = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/import_d1_sqlite.py"))


def source(path, count=32):
    stamp = int(time.time() * 1000)
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE niche_leads (id TEXT PRIMARY KEY,site_id TEXT,created_at INTEGER,"
                           "source_path TEXT,name TEXT,email TEXT,message TEXT,consent_at INTEGER,status TEXT)")
        connection.executemany("INSERT INTO niche_leads VALUES (?,?,?,?,?,?,?,?,?)", [
            (f"00000000-0000-4000-8000-{i:012}", "traktoriupadangos", stamp, "/kontaktai", "Synthetic reader fixture",
             "fixture@example.org", "Synthetic request, no real client", stamp, "new") for i in range(count)])
        connection.execute("INSERT INTO niche_leads VALUES (?,?,?,?,?,?,?,?,?)",
                           ("foreign", "greitossvetaines", stamp, "/kontaktai", "Other synthetic tenant",
                            "other@example.org", "Never imported into tractor tenant", stamp, "new"))
    return stamp


async def test_read_only_named_export_batches_and_restart_use_durable_checkpoint(client, tmp_path):
    path = tmp_path / "source with spaces.sqlite"
    stamp = source(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    first = await adapter["run"](path, "traktoriupadangos", client)
    assert first["imported"] == 32 and first["batches"] == 2
    resumed = await adapter["run"](path, "traktoriupadangos", client)
    assert resumed["imported"] == resumed["batches"] == 0
    checkpoint = await adapter["transfer"](client, "GET", "traktoriupadangos")
    assert checkpoint["cursor"] == {"created_at": stamp, "id": "00000000-0000-4000-8000-000000000031"}
    other = await adapter["transfer"](client, "GET", "greitossvetaines")
    assert other["cursor"] == {"created_at": 0, "id": ""}
    assert hashlib.sha256(path.read_bytes()).hexdigest() == digest


async def test_source_read_failure_does_not_advance_checkpoint(client, tmp_path):
    with pytest.raises(FileNotFoundError):
        await adapter["run"](tmp_path / "missing.sqlite", "traktoriupadangos", client)
    checkpoint = await adapter["transfer"](client, "GET", "traktoriupadangos")
    assert checkpoint["cursor"] == {"created_at": 0, "id": ""}
    path = tmp_path / "recovered.sqlite"
    source(path, count=1)
    assert (await adapter["run"](path, "traktoriupadangos", client))["imported"] == 1
