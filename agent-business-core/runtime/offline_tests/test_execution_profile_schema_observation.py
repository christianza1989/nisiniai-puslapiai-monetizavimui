"""Execute canonical catalog SQL over an in-memory catalog model; no PostgreSQL or providers."""
import sqlite3
from types import SimpleNamespace

import pytest
from test_authority_observation import graph  # noqa: F401
from test_private_parent_checkpoint import count_sql

from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation.execution_profile_schema import PARENTS, TABLE
from pinet_core.tasks.codex_transport import RunnerError


class Catalog:
    """SQLite evaluates the actual SQL predicates; modeled catalogs are not PG/RLS proof."""

    def __init__(self):
        self.db = sqlite3.connect(":memory:")
        self.tables = {TABLE: 10}
        self.tables.update({name: i for i, name in enumerate(
            (name for pair in PARENTS.values() for name in pair[:2]), 20)})
        self.db.create_function("to_regclass", 1, self.tables.get)
        self.db.executescript("""
          CREATE TABLE pg_class(oid INTEGER,relrowsecurity BOOLEAN,relforcerowsecurity BOOLEAN);
          CREATE TABLE pg_trigger(tgrelid INTEGER,tgname TEXT,tgisinternal BOOLEAN,tgenabled TEXT);
          CREATE TABLE pg_constraint(conrelid INTEGER,contype TEXT,convalidated BOOLEAN);
        """)
        self.db.execute("INSERT INTO pg_class VALUES(10,1,1)")
        self.trigger(10, "pipeline_model_profile_immutable")
        for jobs, attempts, _ in PARENTS.values():
            self.trigger(self.tables[jobs], "pipeline_model_profile_capture")
            self.trigger(self.tables[attempts], "pipeline_model_attempt_fence")
        self.db.executemany("INSERT INTO pg_constraint VALUES(10,'f',1)", [()] * 4)
        self.calls, self.profile_reads, self.after_profiles, self.rows = [], 0, None, []

    def close(self):
        self.db.close()

    def trigger(self, relation, name, *, enabled="O", internal=False):
        self.db.execute("INSERT INTO pg_trigger VALUES(?,?,?,?)", (relation, name, internal, enabled))

    def absent(self):
        self.tables.pop(TABLE)
        self.db.execute("DELETE FROM pg_class")
        self.db.execute("DELETE FROM pg_trigger")
        self.db.execute("DELETE FROM pg_constraint")

    async def scalar(self, statement, params=None):
        sql = str(statement)
        assert sql.lstrip().upper().startswith("SELECT")
        if ":table" in sql:
            assert params == {"table": TABLE}
        self.calls.append(sql)
        return self.db.execute(sql, params or {}).fetchone()[0]

    async def scalars(self, statement):
        assert "control_pipeline_model_profiles" in str(statement)
        self.profile_reads += 1
        if self.after_profiles:
            self.after_profiles()
        return self.rows


@pytest.fixture
def catalog():
    value = Catalog()
    try:
        yield value
    finally:
        value.close()


@pytest.mark.parametrize("state", ["ready", "absent", "invalid"])
async def test_one_catalog_statement_per_schema_observation(catalog, state):
    if state == "absent":
        catalog.absent()
    elif state == "invalid":
        catalog.db.execute("UPDATE pg_class SET relforcerowsecurity=0")
    assert await profiles.schema_state(catalog) == state
    assert len(catalog.calls) == 1, "One checkpoint must not pay for two catalog round trips"


@pytest.mark.parametrize("name", ["pipeline_model_profile_capture", "pipeline_model_attempt_fence"])
@pytest.mark.parametrize("enabled", ["O", "D", "R", "A"])
@pytest.mark.parametrize("internal", [False, True])
@pytest.mark.parametrize("relation", [None, 999])
async def test_absent_table_keeps_broad_orphan_trigger_semantics(catalog, name, enabled, internal, relation):
    catalog.absent()
    catalog.trigger(relation, name, enabled=enabled, internal=internal)
    assert await profiles.schema_state(catalog) == ("absent" if internal else "invalid")


async def test_absent_table_ignores_unrelated_trigger_names(catalog):
    catalog.absent()
    catalog.trigger(999, "some_other_trigger")
    assert await profiles.schema_state(catalog) == "absent"


@pytest.mark.parametrize("fault", ["rls", "force", "no-class", "immutable-disabled", "capture-disabled",
    "fence-disabled", "missing-trigger", "extra-trigger", "internal-trigger", "wrong-relation",
    "missing-fk", "extra-fk", "unvalidated-fk", "non-fk"])
async def test_present_schema_retains_every_ready_predicate(catalog, fault):
    statement = {
        "rls": "UPDATE pg_class SET relrowsecurity=0",
        "force": "UPDATE pg_class SET relforcerowsecurity=0",
        "no-class": "DELETE FROM pg_class",
        "immutable-disabled": "UPDATE pg_trigger SET tgenabled='D' WHERE tgname='pipeline_model_profile_immutable'",
        "capture-disabled": "UPDATE pg_trigger SET tgenabled='D' WHERE tgrelid=20",
        "fence-disabled": "UPDATE pg_trigger SET tgenabled='D' WHERE tgrelid=21",
        "missing-trigger": "DELETE FROM pg_trigger WHERE tgrelid=10",
        "extra-trigger": "INSERT INTO pg_trigger VALUES(10,'pipeline_model_profile_immutable',0,'O')",
        "internal-trigger": "UPDATE pg_trigger SET tgisinternal=1 WHERE tgrelid=10",
        "wrong-relation": "UPDATE pg_trigger SET tgrelid=999 WHERE tgrelid=10",
        "missing-fk": "DELETE FROM pg_constraint WHERE rowid=1",
        "extra-fk": "INSERT INTO pg_constraint VALUES(10,'f',1)",
        "unvalidated-fk": "UPDATE pg_constraint SET convalidated=0 WHERE rowid=1",
        "non-fk": "UPDATE pg_constraint SET contype='c' WHERE rowid=1",
    }[fault]
    catalog.db.execute(statement)
    assert await profiles.schema_state(catalog) == "invalid"


@pytest.mark.parametrize("enabled", ["O", "R", "A"])
async def test_ready_trigger_enabled_modes_remain_supported(catalog, enabled):
    catalog.db.execute("UPDATE pg_trigger SET tgenabled=?", (enabled,))
    catalog.trigger(999, "pipeline_model_profile_immutable")
    catalog.trigger(10, "ignored_trigger")
    catalog.db.execute("INSERT INTO pg_constraint VALUES(999,'f',1)")
    assert await profiles.schema_state(catalog) == "ready"


async def test_new_invocation_observes_schema_change_without_completed_cache(catalog):
    assert await profiles.schema_state(catalog) == "ready"
    catalog.db.execute("UPDATE pg_class SET relforcerowsecurity=0")
    assert await profiles.schema_state(catalog) == "invalid"
    catalog.absent()
    assert await profiles.schema_state(catalog) == "absent"
    catalog.trigger(999, "pipeline_model_attempt_fence", enabled="D")
    assert await profiles.schema_state(catalog) == "invalid"
    assert len(catalog.calls) == 4


def job():
    return SimpleNamespace(id="synthetic-job", user_id="u", organization_id="o", portfolio_id="p",
        environment_id="test-schema-catalog", session_id="s", source_revision="a" * 40)


@pytest.mark.parametrize("historical", [profiles.DEFAULT, profiles.SOL_HIGH])
async def test_real_batch_keeps_two_fresh_schema_observations(catalog, historical):
    row = job()
    if historical == profiles.SOL_HIGH:
        catalog.rows = [SimpleNamespace(**vars(row) | {"profile": historical, "creation_job_id": row.id})]
    model = "gpt-6-luna" if historical == profiles.DEFAULT else "gpt-6.1-sol"
    assert await profiles.validate_attempts(catalog, "creation", [(row, "creator", model)]) == {row.id: historical}
    assert len(catalog.calls) == 2 and catalog.profile_reads == 1


@pytest.mark.parametrize("mutation", ["missing", "invalid"])
async def test_schema_loss_during_profile_read_is_still_rejected(catalog, mutation):
    catalog.after_profiles = (catalog.absent if mutation == "missing" else
        lambda: catalog.db.execute("UPDATE pg_class SET relforcerowsecurity=0"))
    with pytest.raises(RunnerError, match="runner_unavailable"):
        await profiles.validate_attempts(catalog, "creation", [(job(), "creator", "gpt-6-luna")])


async def test_legacy_absent_batch_stays_valid_and_never_reads_profile_table(catalog):
    catalog.absent()
    assert await profiles.validate_attempts(catalog, "creation", [(job(), "creator", "gpt-6-luna")]) == {
        "synthetic-job": profiles.DEFAULT}
    assert len(catalog.calls) == 2 and catalog.profile_reads == 0


async def test_empty_batch_adds_no_schema_observation(catalog):
    assert await profiles.validate_attempts(catalog, "creation", []) == {}
    assert catalog.calls == [] and catalog.profile_reads == 0


async def test_catalog_failure_is_never_a_cached_ready_result(catalog):
    assert await profiles.schema_state(catalog) == "ready"
    catalog.db.execute("DROP TABLE pg_class")
    with pytest.raises(sqlite3.OperationalError):
        await profiles.schema_state(catalog)


async def test_full_authority_keeps_ten_checkpoints_and_fewer_same_checkpoint_round_trips(graph, monkeypatch):  # noqa: F811
    from pinet_core.creation import private_preview
    f = graph
    expected = await f.authority.capture()
    calls = count_sql(monkeypatch, f.tx)
    checkpoints = []
    original = private_preview.current
    async def current(*args):
        checkpoints.append(True)
        return await original(*args)
    monkeypatch.setattr(private_preview, "current", current)
    f.counts.clear()
    await f.authority.verify(expected)
    print("FULL_AUTHORITY_SCHEMA_FUSION", len(calls), "CHECKPOINTS", len(checkpoints))
    assert len(checkpoints) == 10 and f.counts["material"] == 2 and f.counts["node"] == 1
    assert len(calls) == 132, "Only four duplicate catalog round trips leave the previous 136-call fixture"
