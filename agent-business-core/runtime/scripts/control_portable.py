"""Preflight and explicit loopback owner API/worker start. No tunnel, service installer or provider probe."""
import argparse
import asyncio
import hashlib
import subprocess
from pathlib import Path
from uuid import UUID

import uvicorn
from sqlalchemy import select, text

from pinet_core.config import settings
from pinet_core.control.models import Session, User
from pinet_core.control.routes import scope
from pinet_core.db import db
from pinet_core.models import utcnow


def source_check():
    root = Path(__file__).resolve().parents[1]
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    dirty = subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True).strip()
    if dirty or settings().control_source_revision != revision:
        raise ValueError("source_pin_mismatch_or_dirty_checkout")
    return revision


def runner_check():
    cfg = settings()
    if not cfg.chat_enabled or not cfg.chat_runner_enabled or cfg.chat_model != "gpt-6-luna":
        raise ValueError("runner_disabled")
    UUID(cfg.chat_operator_user_id)
    binary, workspace = Path(cfg.chat_codex_executable), Path(cfg.chat_workspace)
    if not binary.is_absolute() or not workspace.is_absolute() or not binary.is_file() or not workspace.is_dir():
        raise ValueError("runner_path_invalid")
    if hashlib.sha256(binary.read_bytes()).hexdigest() != cfg.chat_codex_sha256:
        raise ValueError("runner_binary_pin_mismatch")
    # Version/integrity/model support must be checked on the target PC separately; no inference here.


async def preflight(*, worker=False):
    cfg = settings()
    revision = source_check()
    if (not cfg.control_enabled or cfg.control_mode not in {"local", "hosted"}
            or len(cfg.control_cursor_secret) < 32 or not 300 <= cfg.control_session_seconds <= 28800
            or not 1 <= cfg.chat_daily_limit <= 100):
        raise ValueError("control_config_invalid")
    if cfg.control_mode == "local" and cfg.environment != "local":
        raise ValueError("local_environment_required")
    if cfg.control_mode == "hosted" and (cfg.environment != "production" or len(cfg.control_bridge_secret) < 32
            or cfg.control_bridge_host != "control.pinet.internal" or not cfg.control_owner_user_id):
        raise ValueError("hosted_config_incomplete")
    async with db.registry() as tx:
        info = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        if info.rolsuper or info.rolbypassrls:
            raise ValueError("restricted_role_required")
        count = await tx.scalar(text("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace "
            "AND relname IN ('control_users','control_memberships','control_business_grants','control_sessions',"
            "'control_tasks','control_task_threads','control_task_runs','control_task_events') "
            "AND relrowsecurity AND relforcerowsecurity"))
        if count != 8:
            raise ValueError("control_schema_not_ready")
    if cfg.control_mode == "hosted" or worker:
        actor = cfg.chat_operator_user_id if worker else cfg.control_owner_user_id
        async with scope(user=actor) as tx:
            user = await tx.scalar(select(User).where(User.id == actor, User.enabled))
            if not user:
                raise ValueError("owner_mapping_unavailable")
            if worker:
                session = await tx.scalar(select(Session.id).where(Session.user_id == actor,
                    Session.revoked_at.is_(None), Session.expires_at > utcnow()).limit(1))
                if not session:
                    raise ValueError("owner_session_required_before_worker")
    if worker:
        runner_check()
    return {"source_revision": revision, "mode": cfg.control_mode, "environment": cfg.environment,
            "restricted_role": True, "control_schema": True, "worker_started": False, "provider_calls": 0}


async def checked(worker):
    try:
        return await preflight(worker=worker)
    finally:
        await db.engine.dispose()


async def start_worker():
    from pinet_core.tasks.worker import loop
    try:
        await loop()
    finally:
        await db.engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["check", "api", "worker"])
    parser.add_argument("--port", type=int, default=8854)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        raise SystemExit("Invalid loopback port.")
    try:
        receipt = asyncio.run(checked(worker=args.action == "worker"))
    except Exception:
        raise SystemExit("Control preflight failed. Check source pin, private configuration, role/migrations and owner mapping.") from None
    print(receipt)
    if args.action == "api":
        uvicorn.run("pinet_core.control_api:app", host="127.0.0.1", port=args.port,
                    proxy_headers=False, access_log=False)
    elif args.action == "worker":
        asyncio.run(start_worker())


if __name__ == "__main__":
    main()
