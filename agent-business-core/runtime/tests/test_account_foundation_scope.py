"""Boundary checks and opt-in disposable PostgreSQL acceptance for the main slice."""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from bootstrap import CONTROL_PRIVILEGES, LEGACY_TABLES, bootstrap, configure_grants, provision_role
from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import Settings, settings

RUNTIME = Path(__file__).resolve().parents[1]
PG = pytest.mark.skipif(os.environ.get("PINET_ACCOUNT_FOUNDATION_QA") != "retained-isolated",
                        reason="Explicit owned disposable account-foundation DB required")
EXPECTED = {
    **{t: "SELECT" for t in ("control_business_grants", "control_public_projects")},
    **{t: "SELECT,INSERT,UPDATE" for t in ("control_users", "control_sessions", "control_login_buckets",
        "control_customer_accounts", "control_customer_tokens", "control_task_threads", "control_tasks",
        "control_task_runs")},
    **{t: "SELECT,INSERT" for t in ("control_organizations", "control_memberships", "control_portfolios",
        "control_customer_intakes", "control_task_events")},
}


class Result:
    def __init__(self, values):
        self.values = values

    def first(self):
        return self.values

    def scalars(self):
        return iter(self.values)


class Catalog:
    """No DB: record effects and supply independently controlled catalog state."""
    def __init__(self, *, role=(False, False, False, False), control=None, version="0012_customer_public",
                 protected=None, inherited=False):
        self.role, self.version, self.inherited = role, version, inherited
        self.control = set(EXPECTED if control is None else control)
        self.protected = self.control if protected is None else protected
        self.effects = []

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.effects.append(sql)
        if "FROM pg_roles" in sql:
            return Result(self.role)
        if "FROM pg_tables" in sql:
            return Result(set(LEGACY_TABLES) | self.control | {"alembic_version", "foreign_table"})
        if "FROM pg_class" in sql:
            return Result(self.protected)
        return Result(None)

    async def scalar(self, statement, params=None):
        sql = str(statement)
        self.effects.append(sql)
        if "version_num" in sql:
            return self.version
        if "has_table_privilege" in sql:
            table, privilege = params["t"].removeprefix("public."), params["p"]
            return privilege in EXPECTED[table].split(",") or self.inherited
        if "FROM businesses" in sql:
            return "retained-business-identity"
        raise AssertionError("Unexpected catalog read")


async def test_role_only_is_valid_before_any_migration_without_table_or_customer_effects():
    tx = Catalog(role=None, control=set())
    await bootstrap(tx, password="a" * 48, role_only=True)
    assert len(tx.effects) == 3
    assert "FROM pg_roles" in tx.effects[0]
    assert tx.effects[1].startswith("CREATE ROLE pinet_runtime LOGIN PASSWORD")
    assert tx.effects[1].endswith("NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE")
    assert tx.effects[2] == "GRANT USAGE ON SCHEMA public TO pinet_runtime"


@pytest.mark.parametrize("flag", range(4))
async def test_existing_elevated_runtime_role_is_rejected_without_alter_or_grants(flag):
    role = [False] * 4
    role[flag] = True
    tx = Catalog(role=tuple(role))
    with pytest.raises(RuntimeError, match="not restricted"):
        await provision_role(tx, "b" * 48)
    assert len(tx.effects) == 1


async def test_existing_role_password_and_options_are_never_altered():
    tx = Catalog()
    await provision_role(tx, "c" * 48)
    assert not any("PASSWORD" in sql or "ALTER ROLE" in sql for sql in tx.effects)


async def test_invalid_password_cannot_be_interpolated_into_role_ddl():
    tx = Catalog(role=None)
    with pytest.raises(RuntimeError, match="credential format"):
        await provision_role(tx, "bad'; SELECT 'input")
    assert len(tx.effects) == 1


@pytest.mark.parametrize("control,version", [
    ({"control_users"}, "0010_control"),
    (set(EXPECTED) - {"control_customer_intakes"}, "0012_customer_public"),
    (set(EXPECTED) | {"control_future"}, "0012_customer_public"),
    (set(EXPECTED), "0052_later_schema"),
    (set(), "0010_control"),
])
async def test_partial_or_future_schema_never_reaches_table_grant_mutation(control, version):
    tx = Catalog(control=control, version=version)
    with pytest.raises(RuntimeError, match="partial or unsupported"):
        await configure_grants(tx)
    assert not any(sql.startswith(("GRANT", "REVOKE", "INSERT", "UPDATE")) for sql in tx.effects)


async def test_missing_forced_rls_is_rejected_before_any_grant_mutation():
    tx = Catalog(protected=set(EXPECTED) - {"control_sessions"})
    with pytest.raises(RuntimeError, match="forced RLS"):
        await configure_grants(tx)
    assert not any(sql.startswith(("GRANT", "REVOKE")) for sql in tx.effects)


@pytest.mark.parametrize("version", ["0009_facebook", "0012_customer_public"])
async def test_full_bootstrap_uses_exact_table_allowlist_and_retains_stable_businesses(version):
    tx = Catalog(control=set() if version == "0009_facebook" else None, version=version)
    await bootstrap(tx, password="d" * 48)
    assert CONTROL_PRIVILEGES == EXPECTED
    grants = [sql for sql in tx.effects if sql.startswith("GRANT ") and " ON public." in sql]
    expected = {**{t: "SELECT,INSERT,UPDATE,DELETE" for t in LEGACY_TABLES}, "businesses": "SELECT"}
    if version == "0012_customer_public":
        expected.update(EXPECTED)
    assert set(grants) == {f"GRANT {p} ON public.{t} TO pinet_runtime" for t, p in expected.items()}
    assert not any("ALL TABLES" in sql or "foreign_table" in sql or sql.startswith("INSERT") for sql in tx.effects)


async def test_effective_inherited_privilege_cannot_silently_widen_matrix():
    with pytest.raises(RuntimeError, match="privileges differ"):
        await configure_grants(Catalog(inherited=True))


def test_control_app_import_and_route_surface_exclude_workers_and_legacy_api():
    code = """
import json,sys
from pinet_core.control_api import app
schema=app.openapi()['paths']
paths=sorted(schema)
assert len(paths)==17 and sum(len(operations) for operations in schema.values())==18,paths
assert all(p.startswith(('/operator/v2/','/customer/v1/','/public/v1/projects')) for p in paths)
assert not {'/health','/docs','/openapi.json','/operator/mail-ui'} & set(paths)
assert not any(n in sys.modules for n in ('pinet_core.api','pinet_core.routing','pinet_core.jobs'))
assert not any(n.startswith(('pinet_core.acquisition','pinet_core.tasks','pinet_core.gmail')) for n in sys.modules)
print(json.dumps({'paths':len(paths),'operations':18,'worker_imports':0}))
"""
    result = subprocess.run([sys.executable, "-B", "-c", code], cwd=RUNTIME,
                            capture_output=True, text=True, timeout=20, check=False)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {"paths": 17, "operations": 18, "worker_imports": 0}


def test_new_surfaces_are_opt_in_and_metadata_matches_through0012():
    cfg = Settings(_env_file=None)
    assert not cfg.control_enabled and not cfg.customer_enabled and not cfg.public_projects_enabled
    from pinet_core.control.models import BusinessGrant, Session
    names = {c.name for model in (BusinessGrant, Session) for c in model.__table__.constraints}
    assert "uq_registration_grant_identity" not in names and "uq_registration_session_identity" not in names
    expected = {
        "0010_control.py": "804d218a938671dc95d84354bb43b0dce3bf070738c597107b6619a4d0243815",
        "0011_control_tasks.py": "3f8ba67658e7c65dad94c52393af9519c2f1daab2fe1fca52744de16dbab6aa4",
        "0012_customer_public.py": "ee98a3ce019662274a0ca084ad616069e0fec38f9e32de07691d8457814ddff6",
    }
    assert {n: hashlib.sha256((RUNTIME / "migrations/versions" / n).read_bytes()).hexdigest()
            for n in expected} == expected


@pytest.fixture
async def foundation_db():
    cfg = settings()
    admin, runtime = make_url(cfg.admin_database_url), make_url(cfg.database_url)
    assert admin.host == runtime.host == "127.0.0.1" and admin.database == runtime.database
    assert admin.database.startswith("pinet_account_foundation_") and runtime.username == "pinet_runtime"
    a, r = create_async_engine(cfg.admin_database_url), create_async_engine(cfg.database_url)
    try:
        yield a, r
    finally:
        await a.dispose()
        await r.dispose()


async def projections(engine, tables):
    result = {}
    async with engine.connect() as tx:
        for table in sorted(tables):
            # Table names come only from the maintained literal schema allowlists.
            value = await tx.scalar(text(f"SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb)::text "
                                         f"FROM (SELECT to_jsonb(t) v FROM public.{table} t) s"))
            result[table] = hashlib.sha256(value.encode()).hexdigest()
    return result


@PG
@pytest.mark.skipif(os.environ.get("PINET_FOUNDATION_UPGRADE_FROM_0009") != "1",
                    reason="Run once in the explicitly prepared fresh0009 database before other PG cases")
async def test_pg_upgrade_preserves_legacy_rows(foundation_db):
    admin, _ = foundation_db
    from pinet_core.models import Business, Case, MailMessage, SourceCheckpoint, new_id
    async with AsyncSession(admin) as tx, tx.begin():
        assert await tx.scalar(text("SELECT version_num FROM alembic_version")) == "0009_facebook"
        business = Business(id=new_id(), site_id="foundation-preserved-" + uuid4().hex,
                            canonical_host=uuid4().hex + ".example.test")
        tx.add(business)
        await tx.flush()
        case = Case(id=new_id(), business_id=business.id, environment_id="test-foundation-preserved",
                    payload={"synthetic": True, "stage": "before-account-upgrade"})
        tx.add(case)
        await tx.flush()
        tx.add(MailMessage(business_id=business.id, environment_id=case.environment_id, case_id=case.id,
                          message_id=new_id(), direction="incoming", state="stored", payload={"synthetic": True}))
        tx.add(SourceCheckpoint(business_id=business.id, environment_id=case.environment_id,
                                source_system="foundation-upgrade-fixture", payload={"synthetic": True}))
    before = await projections(admin, LEGACY_TABLES)
    result = subprocess.run([sys.executable, "-B", "-m", "alembic", "upgrade", "0012_customer_public"],
                            cwd=RUNTIME, capture_output=True, text=True, timeout=90, check=False)
    assert result.returncode == 0, result.stderr
    after = await projections(admin, LEGACY_TABLES)
    assert before == after
    output = Path(os.environ["PINET_FOUNDATION_PROOF_DIR"])
    output.mkdir(parents=True, exist_ok=True)
    with (output / "legacy-upgrade.safe.json").open("x", encoding="utf-8") as f:
        json.dump({"state": "LEGACY_PROJECTIONS_PRESERVED", "tables": len(before), "before": before,
                   "after": after, "old_revision": "0009_facebook", "new_revision": "0012_customer_public",
                   "provider_calls": 0}, f, indent=2)


@PG
async def test_pg_exact_forced_rls_grants_and_rows_survive_bootstrap_rerun(foundation_db):
    admin, _ = foundation_db
    before = await projections(admin, LEGACY_TABLES | set(EXPECTED))
    async with admin.begin() as tx:
        assert await tx.scalar(text("SELECT version_num FROM alembic_version")) == "0012_customer_public"
        await bootstrap(tx, password="e" * 48)
        forced = set((await tx.execute(text("SELECT relname FROM pg_class c JOIN pg_namespace n "
            "ON n.oid=c.relnamespace WHERE n.nspname='public' AND relrowsecurity AND relforcerowsecurity"))).scalars())
        assert set(EXPECTED).issubset(forced)
        for table, privileges in EXPECTED.items():
            for privilege in ("SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"):
                actual = await tx.scalar(text("SELECT has_table_privilege('pinet_runtime',:t,:p)"),
                                         {"t": table, "p": privilege})
                assert actual == (privilege in privileges.split(",")), (table, privilege)
    assert await projections(admin, LEGACY_TABLES | set(EXPECTED)) == before


@PG
async def test_pg_current_package_metadata_matches_immutable0012_schema(foundation_db):
    from pinet_core.models import Base
    admin, _ = foundation_db

    def compare(connection):
        catalog = inspect(connection)
        mapped = {name: table for name, table in Base.metadata.tables.items() if name.startswith("control_")}
        assert len(mapped) == 11  # Four inert Task tables deliberately have no runtime ORM here.
        for name, table in mapped.items():
            actual = {c["name"]: c["nullable"] for c in catalog.get_columns(name)}
            assert actual == {c.name: c.nullable for c in table.columns}, name
            unique = {tuple(c["column_names"]) for c in catalog.get_unique_constraints(name)}
            expected = {tuple(c.name for c in constraint.columns) for constraint in table.constraints
                        if constraint.__class__.__name__ == "UniqueConstraint"}
            assert unique == expected, name
    async with admin.connect() as tx:
        await tx.run_sync(compare)


@PG
@pytest.mark.parametrize("statement", [
    "UPDATE control_business_grants SET enabled=enabled WHERE false",
    "DELETE FROM control_business_grants WHERE false",
    "UPDATE control_public_projects SET slug=slug WHERE false",
    "DELETE FROM control_public_projects WHERE false",
    "DELETE FROM control_users WHERE false",
    "UPDATE businesses SET site_id=site_id WHERE false",
])
async def test_pg_runtime_cannot_promote_grants_publications_or_registry(foundation_db, statement):
    _, runtime = foundation_db
    async with runtime.connect() as tx:
        with pytest.raises(DBAPIError):
            await tx.execute(text(statement))
        await tx.rollback()


@PG
async def test_pg_control_app_rejects_admin_role_before_serving(foundation_db, monkeypatch):
    from pinet_core.control_api import app
    from pinet_core.db import db
    admin, _ = foundation_db
    from sqlalchemy.ext.asyncio import async_sessionmaker
    monkeypatch.setattr(db, "engine", admin)
    monkeypatch.setattr(db, "sessions", async_sessionmaker(admin, expire_on_commit=False))
    with pytest.raises(RuntimeError, match="restricted RLS role"):
        async with app.router.lifespan_context(app):
            pytest.fail("Elevated application role reached serving state")
