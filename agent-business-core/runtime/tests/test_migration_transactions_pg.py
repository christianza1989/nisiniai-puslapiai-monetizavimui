"""Opt-in retained empty QA databases; canonical CLI and failed-step recovery.

PINET_MIGRATION_QA=retained-isolated, PINET_MIGRATION_QA_ADMIN_URL and an
absolute PINET_MIGRATION_QA_ARTIFACTS are explicit. No database is dropped.
"""
import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

RUNTIME = Path(__file__).resolve().parents[1]
ENV = RUNTIME / "migrations/env.py"
pytestmark = pytest.mark.skipif(os.environ.get("PINET_MIGRATION_QA") != "retained-isolated",
    reason="Explicit local retained migration QA database/artifact configuration required")


def sha(value):
    return hashlib.sha256(value).hexdigest()


def installers():
    return {path.name: sha(path.read_bytes()) for path in sorted((RUNTIME / "migrations/versions").iterdir())
        if path.is_file()}


def save(path, value):
    with path.open("x", encoding="utf-8") as output:
        json.dump(value, output, indent=2, sort_keys=True)


@pytest.fixture
async def isolated():
    url = make_url(os.environ["PINET_MIGRATION_QA_ADMIN_URL"])
    assert url.host in {"127.0.0.1", "localhost", "::1"} and url.username != "pinet_runtime"
    artifacts = Path(os.environ["PINET_MIGRATION_QA_ARTIFACTS"])
    assert artifacts.is_absolute() and not any(p.is_symlink() for p in (artifacts, *artifacts.parents))
    name = "migration_tx_qa_" + uuid4().hex
    proof = artifacts / name
    proof.mkdir(parents=True, exist_ok=False)
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    try:
        async with admin.connect() as tx:
            assert await tx.scalar(text("SELECT rolsuper FROM pg_roles WHERE rolname=current_user"))
            assert await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pinet_runtime' "
                "AND NOT rolsuper AND NOT rolbypassrls)"))
            # Generated lowercase UUID name only; never reuse/drop an existing DB.
            await tx.execute(text(f'CREATE DATABASE "{name}"'))
    finally:
        await admin.dispose()
    target = url.set(database=name)
    engine = create_async_engine(target)
    p = {"url": target.render_as_string(hide_password=False), "engine": engine, "proof": proof, "name": name}
    save(proof / "identity.json", {"database": name, "canonical_env_sha256": sha(ENV.read_bytes()),
        "installer_hashes": installers(), "retained": True})
    try:
        async with engine.connect() as tx:
            assert await tx.scalar(text("SELECT count(*) FROM pg_tables WHERE schemaname='public'")) == 0
        yield p
    finally:
        await engine.dispose()


async def upgrade(p, label, config=None):
    child_env = {**os.environ, "PINET_ADMIN_DATABASE_URL": p["url"], "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONPATH": str(RUNTIME / "src"), "PINET_ENVIRONMENT": "test-"+p["name"],
        "PINET_CONTROL_ENABLED": "false", "PINET_CUSTOMER_ENABLED": "false",
        "PINET_VOICE_ENABLED": "false", "PINET_SMTP_ENABLED": "false"}
    command = [sys.executable, "-m", "alembic", "-c", str(config or RUNTIME / "alembic.ini"), "upgrade", "head"]
    process = await asyncio.create_subprocess_exec(*command, cwd=RUNTIME, env=child_env,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=60)
    except BaseException:
        if process.returncode is None:
            process.kill()
            await process.wait()
        raise
    with (p["proof"] / (label+".log")).open("xb") as output:
        output.write(stdout+b"\n"+stderr)
    save(p["proof"] / (label+".json"), {"exit_code": process.returncode,
        "stdout_sha256": sha(stdout), "stderr_sha256": sha(stderr)})
    return process.returncode, stderr.decode("utf-8", errors="replace")


CATALOG = """SELECT 'relation' AS kind,c.relname AS name,jsonb_build_object(
    'kind',c.relkind,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'acl',c.relacl,
    'owner',pg_get_userbyid(c.relowner),'options',c.reloptions)::text AS body
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  UNION ALL SELECT 'column',c.relname||'.'||a.attnum,jsonb_build_object('name',a.attname,
    'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,
    'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid))::text
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
  UNION ALL SELECT 'function',p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid),
    'acl',p.proacl,'owner',pg_get_userbyid(p.proowner))::text FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN('f','p')
  UNION ALL SELECT 'constraint',c.conrelid::regclass::text||'.'||c.conname,
    jsonb_build_object('definition',pg_get_constraintdef(c.oid),'validated',c.convalidated)::text FROM pg_constraint c
    JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'
  UNION ALL SELECT 'index',i.indexrelid::regclass::text,pg_get_indexdef(i.indexrelid)
    FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
  UNION ALL SELECT 'trigger',t.tgrelid::regclass::text||'.'||t.tgname,pg_get_triggerdef(t.oid)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal
  UNION ALL SELECT 'policy',p.polrelid::regclass::text||'.'||p.polname,jsonb_build_object('command',p.polcmd,
    'roles',p.polroles,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),
    'check',pg_get_expr(p.polwithcheck,p.polrelid))::text FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY kind,name,body"""


async def snapshot(p):
    async with p["engine"].connect() as tx:
        catalog = [list(row) for row in (await tx.execute(text(CATALOG))).all()]
        tables = {}
        names = list(await tx.scalars(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")))
        for name in names:
            quoted = tx.dialect.identifier_preparer.quote(name)
            count, fingerprint = (await tx.execute(text(f"""SELECT count(*),encode(sha256(convert_to(
                coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex')
                FROM public.{quoted} t"""))).one()
            tables[name] = {"rows": count, "sha256": fingerprint}
        sequences = [list(row) for row in (await tx.execute(text("SELECT sequencename,last_value FROM pg_sequences "
            "WHERE schemaname='public' ORDER BY sequencename"))).all()]
    return {"catalog_sha256": sha(json.dumps(catalog, ensure_ascii=False).encode()),
        "catalog_objects": len(catalog), "tables": tables, "sequences": sequences}


async def test_canonical_fresh_upgrade_and_repeated_head_are_exact_noop(isolated):
    p = isolated
    before = installers()
    code, _ = await upgrade(p, "fresh-to-head")
    assert code == 0, "Fresh upgrade failed; exact stderr retained in the new QA proof directory"
    config = Config(str(RUNTIME / "alembic.ini"))
    config.set_main_option("script_location", str(RUNTIME / "migrations"))
    head = ScriptDirectory.from_config(config).get_current_head()
    async with p["engine"].connect() as tx:
        assert list(await tx.scalars(text("SELECT version_num FROM alembic_version"))) == [head]
    first = await snapshot(p)
    code, _ = await upgrade(p, "head-noop")
    assert code == 0
    second = await snapshot(p)
    save(p["proof"] / "fresh-head-proof.json", {"head": head, "first": first, "second": second,
        "installers_unchanged": before == installers()})
    assert first == second
    assert before == installers()


FIRST = '''from alembic import op
revision = "qa_first"
down_revision = None
def upgrade():
    op.execute("CREATE TEMP TABLE qa_step_probe(id INTEGER) ON COMMIT DROP")
    op.execute("CREATE TABLE qa_retry_control(id INTEGER PRIMARY KEY,fail_next BOOLEAN NOT NULL)")
    op.execute("INSERT INTO qa_retry_control VALUES(1,true)")
    op.execute("CREATE TABLE qa_log(label TEXT PRIMARY KEY)")
    op.execute("INSERT INTO qa_log VALUES('first')")
'''
SECOND = '''from alembic import op
from sqlalchemy import text
revision = "qa_second"
down_revision = "qa_first"
def upgrade():
    op.execute("CREATE TEMP TABLE qa_step_probe(id INTEGER) ON COMMIT DROP")
    op.execute("CREATE TABLE qa_partial(id INTEGER PRIMARY KEY)")
    op.execute("INSERT INTO qa_partial VALUES(1)")
    op.execute("INSERT INTO qa_log VALUES('second')")
    if op.get_bind().scalar(text("SELECT fail_next FROM qa_retry_control WHERE id=1")):
        raise RuntimeError("deliberate_migration_probe_failure")
'''


async def test_failed_revision_is_atomic_and_retry_keeps_last_committed_version(isolated):
    p = isolated
    fixture = p["proof"] / "fixture"
    versions = fixture / "versions"
    versions.mkdir(parents=True)
    (fixture / "env.py").write_bytes(ENV.read_bytes())  # Exact canonical environment, not a test-specific transaction wrapper.
    (versions / "first.py").write_text(FIRST, encoding="utf-8")
    (versions / "second.py").write_text(SECOND, encoding="utf-8")
    config = p["proof"] / "fixture.ini"
    config.write_text("[alembic]\nscript_location = "+fixture.as_posix()+"\n", encoding="utf-8")
    original = {path.name: sha(path.read_bytes()) for path in versions.iterdir()}
    code, stderr = await upgrade(p, "deliberate-second-failure", config)
    assert code != 0 and "deliberate_migration_probe_failure" in stderr
    async with p["engine"].begin() as tx:
        assert list(await tx.scalars(text("SELECT version_num FROM alembic_version"))) == ["qa_first"]
        assert list(await tx.scalars(text("SELECT label FROM qa_log ORDER BY label"))) == ["first"]
        assert await tx.scalar(text("SELECT to_regclass('public.qa_partial')")) is None
        # Change only fixture control data; retry the same installer bytes.
        await tx.execute(text("UPDATE qa_retry_control SET fail_next=false WHERE id=1"))
    code, _ = await upgrade(p, "unchanged-second-retry", config)
    assert code == 0
    async with p["engine"].connect() as tx:
        assert list(await tx.scalars(text("SELECT version_num FROM alembic_version"))) == ["qa_second"]
        assert list(await tx.scalars(text("SELECT label FROM qa_log ORDER BY label"))) == ["first", "second"]
        assert list(await tx.scalars(text("SELECT id FROM qa_partial"))) == [1]
    assert original == {path.name: sha(path.read_bytes()) for path in versions.iterdir()}
    save(p["proof"] / "atomic-retry-proof.json", {"first_preserved": True, "failed_step_rolled_back": True,
        "retry_completed": True, "installer_hashes": original, "canonical_env_sha256": sha(ENV.read_bytes())})
