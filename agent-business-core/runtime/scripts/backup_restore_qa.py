"""Real local pg_dump/pg_restore rehearsal. Never dispatches jobs or sends mail.

The private dump stays in memory. Only a metadata report is saved. Cleanup targets
the exact UUID database and fixture environment created by this invocation.
"""
import asyncio
import json
import re
import subprocess
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, select, text
from sqlalchemy.engine import make_url

from pinet_core.config import settings
from pinet_core.db import Database, db
from pinet_core.models import Artifact, Case, Contact, Conversation, Event, Job, Outbox, new_id, utcnow
from pinet_core.service import business


def docker(*args, content=None):
    result = subprocess.run(["docker", "exec", "-i", "pinet-voice-postgres", *args],
                            input=content, capture_output=True, timeout=60)
    if result.returncode:
        # A failed restore can contain private SQL in stderr; do not print it.
        raise RuntimeError(f"postgres_tool_failed:{args[0]}:{result.returncode}")
    return result.stdout


async def main():
    cfg = settings()
    if cfg.environment != "local" or cfg.smtp_enabled or cfg.voice_enabled:
        raise RuntimeError("isolated local rehearsal requires voice and SMTP off")
    restore_name = "pinet_restore_qa_" + uuid4().hex
    assert re.fullmatch(r"pinet_restore_qa_[a-f0-9]{32}", restore_name)
    fixture_env, case_id, cid = "backup-qa-" + uuid4().hex, new_id(), new_id()
    item = await business("traktoriupadangos")
    restored, created = None, False
    try:
        scope = {"business_id": item.id, "environment_id": fixture_env}
        async with db.transaction(item.id, fixture_env) as tx:
            tx.add(Case(id=case_id, **scope, payload={"test": True, "purpose": "backup-rehearsal"}))
            await tx.flush()
            tx.add(Conversation(id=cid, case_id=case_id, **scope, state="finalized", token_hash="0" * 64,
                                expires_at=utcnow() + timedelta(minutes=5), epoch=7, payload={"test": True}))
            await tx.flush()
            tx.add(Event(conversation_id=cid, **scope, event_key="fixture", kind="client_transcript",
                         sequence=1, payload={"text": "Explicit synthetic backup fixture"}))
            contact_id, artifact_id = new_id(), new_id()
            tx.add(Contact(id=contact_id, conversation_id=cid, **scope, channel="email",
                           value="backup-fixture@example.org", payload={"test": True}))
            tx.add(Artifact(id=artifact_id, conversation_id=cid, **scope, kind="followup", payload={"test": True}))
            tx.add(Job(conversation_id=cid, **scope, kind="analysis", state="running", owner="old-owner",
                       generation=9, lease_until=utcnow() - timedelta(minutes=5), payload={"test": True}))
            tx.add(Outbox(conversation_id=cid, **scope, kind="email", action_key="backup:" + cid,
                          state="prepared", payload={"test": True, "contact_id": contact_id, "artifact_id": artifact_id}))
        dump = await asyncio.to_thread(docker, "pg_dump", "-U", "pinet_admin", "-d", "pinet",
                                       "--format=custom", "--no-owner", "--no-acl")
        await asyncio.to_thread(docker, "psql", "-U", "pinet_admin", "-d", "pinet", "-v", "ON_ERROR_STOP=1",
                                "-c", f'CREATE DATABASE "{restore_name}"')
        created = True
        await asyncio.to_thread(docker, "pg_restore", "-U", "pinet_admin", "-d", restore_name,
                                "--exit-on-error", "--no-owner", "--no-acl", content=dump)
        dump = b""  # Do not write a private database archive into reports or Git.
        await asyncio.to_thread(docker, "psql", "-U", "pinet_admin", "-d", restore_name, "-v", "ON_ERROR_STOP=1",
                                "-c", "GRANT USAGE ON SCHEMA public TO pinet_runtime; "
                                "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pinet_runtime")
        url = make_url(cfg.database_url).set(database=restore_name)
        restored = Database(url)
        async with restored.registry() as tx:
            assert not list(await tx.scalars(select(Conversation).where(Conversation.id == cid)))
            forced = await tx.scalar(text("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                                          "WHERE n.nspname='public' AND c.relrowsecurity AND c.relforcerowsecurity"))
            assert forced >= 12
        async with restored.transaction(item.id, fixture_env) as tx:
            assert (await tx.get(Conversation, cid)).epoch == 7
            assert (await tx.get(Contact, contact_id)).value == "backup-fixture@example.org"
            job = await tx.scalar(select(Job).where(Job.conversation_id == cid))
            assert job.owner == "old-owner" and job.generation == 9 and job.lease_until < utcnow()
            assert (await tx.scalar(select(Outbox).where(Outbox.conversation_id == cid))).state == "prepared"
            assert (await tx.scalar(select(Event).where(Event.conversation_id == cid))).payload["text"].startswith("Explicit synthetic")
        async with restored.transaction(item.id, "different-environment") as tx:
            assert await tx.get(Conversation, cid) is None
        report = {"status": "pass", "actual_pg_dump_restore": True, "restricted_role_rls": True,
                  "scope_isolation": True, "transcript_contact_and_outbox_restored": True,
                  "lease_generation_preserved": True, "jobs_dispatched": False, "mail_sent": False,
                  "private_dump_saved": False, "forced_rls_tables": forced}
    finally:
        if restored:
            await restored.engine.dispose()
        if created:
            await asyncio.to_thread(docker, "psql", "-U", "pinet_admin", "-d", "pinet", "-v", "ON_ERROR_STOP=1",
                                    "-c", f'DROP DATABASE "{restore_name}" WITH (FORCE)')
        async with db.transaction(item.id, fixture_env) as tx:
            await tx.execute(delete(Case).where(Case.id == case_id))
        await db.engine.dispose()
    report["disposable_database_and_fixture_removed"] = True
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/backup-restore-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))


asyncio.run(main())
