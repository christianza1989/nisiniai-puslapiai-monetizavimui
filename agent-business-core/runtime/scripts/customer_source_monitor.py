"""Explicit local unchanged-source supervision; no providers, login or channel activation."""
import argparse
import asyncio
import hashlib
import json
import os
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from customer_profile_admin import read_request
from customer_source_maintain import Request, execute, source_check

from pinet_core.config import settings


def stamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("aware_deadline_required")
    return parsed


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def safe(path):
    path = Path(path).absolute()
    if any(p.is_symlink() or (hasattr(p, "is_junction") and p.is_junction())
           for p in (path, *path.parents)):
        raise ValueError("monitor_symlink_rejected")
    return path.resolve()


def save(path, value):
    with safe(path).open("x", encoding="utf-8", newline="\n") as file:
        file.write(json.dumps(value, sort_keys=True))
        file.flush()
        os.fsync(file.fileno())


@contextmanager
def run_lock(directory):
    # OS releases this lock on process exit/crash. Its file is retained history.
    with safe(directory / ".monitor.lock").open("a+b") as file:
        file.seek(0)
        if not file.read(1):
            file.write(b"0")
            file.flush()
        file.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(file.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            file.seek(0)
            if os.name == "nt":
                msvcrt.locking(file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(file, fcntl.LOCK_UN)


def read(path):
    raw = safe(path).read_bytes()
    if len(raw) > 65536:
        raise ValueError("monitor_record_too_large")
    return raw, json.loads(raw)


def committed(step, request):
    # An incomplete/uncertain record stops recovery before any database call.
    try:
        raw, receipt = read(step / "receipt.json")
        _, marker = read(step / "receipt.json.status.json")
        if (receipt["status"] != "prepared" or marker["status"] != "committed"
                or marker["receipt_sha256"] != hashlib.sha256(raw).hexdigest()
                or receipt["profile_admission_id"] != request["profile_admission_id"]
                or receipt["profile_fingerprint"] != request["profile_fingerprint"]
                or receipt["profile_admission"] != "preserved" or receipt["provider_calls"] != 0
                or receipt["session_activation"] != "not_performed"
                or receipt["channel_activation"] != "not_performed"
                or stamp(receipt["source_refreshed_at"]) <= stamp(request["expected_refreshed_at"])
                or stamp(receipt["source_expires_at"]) <= stamp(receipt["source_refreshed_at"])):
            raise ValueError("invalid_commit")
        return receipt["source_refreshed_at"]
    except (OSError, ValueError, KeyError, TypeError):
        raise ValueError("monitor_receipt_inspection_required") from None


async def monitor(request, directory, *, until, interval_seconds, ttl_seconds, resume=False,
                  executor=execute, clock=lambda: datetime.now(UTC), sleep=asyncio.sleep,
                  check=source_check):
    value = Request.model_validate(request).model_dump(mode="json")
    if value["admit_source"] or not 0 < interval_seconds <= ttl_seconds / 3:
        raise ValueError("existing_source_and_bounded_interval_required")
    deadline = stamp(until)
    manifest = {"version": 1, "request_sha256": digest(value), "until": deadline.isoformat(),
                "interval_seconds": interval_seconds, "ttl_seconds": ttl_seconds,
                "execution_source_revision": value["execution_source_revision"]}
    directory = safe(directory)
    if resume:
        if read(directory / "manifest.json")[1] != manifest:
            raise ValueError("monitor_resume_identity_conflict")
    else:
        if deadline <= clock():
            raise ValueError("future_deadline_required")
        directory.mkdir(exist_ok=False)
        save(directory / "manifest.json", manifest)
    completed_count, new_count = 0, 0
    with run_lock(directory):
        steps = sorted(p for p in directory.iterdir() if p.is_dir())
        for number, step in enumerate(steps, 1):
            if step.name != f"{number:06d}":
                raise ValueError("monitor_history_gap")
            _, previous = read(step / "request.json")
            retained = {k: v for k, v in value.items() if k not in {"request_key", "expected_refreshed_at"}}
            if ({k: v for k, v in previous.items() if k not in {"request_key", "expected_refreshed_at"}}
                    != retained or previous["expected_refreshed_at"] != value["expected_refreshed_at"]
                    or (number == 1 and previous["request_key"] != value["request_key"])):
                raise ValueError("monitor_resume_identity_conflict")
            Request.model_validate(previous)
            value["expected_refreshed_at"] = committed(step, previous)
            completed_count += 1
        # Resume waits before a new recheck; it never replays an old request or
        # immediately extends freshness merely because the process restarted.
        if steps and clock() < deadline:
            await sleep(min(interval_seconds, (deadline - clock()).total_seconds()))
        while clock() < deadline:
            if await asyncio.to_thread(check) != value["execution_source_revision"]:
                raise ValueError("execution_source_changed")
            if clock() >= deadline:
                break
            if completed_count:
                value["request_key"] = str(uuid4())
            step = directory / f"{completed_count + 1:06d}"
            step.mkdir()
            save(step / "request.json", value)
            # The existing CLI owns all Session/Grant/source/CAS/receipt gates.
            # Any exception stops this run, with no retry or fallback admission.
            await asyncio.wait_for(executor(dict(value), step / "receipt.json"),
                                   timeout=(deadline - clock()).total_seconds())
            value["expected_refreshed_at"] = committed(step, value)
            completed_count += 1
            new_count += 1
            if clock() < deadline:
                await sleep(min(interval_seconds, (deadline - clock()).total_seconds()))
    return {"status": "deadline_reached", "completed_rechecks": completed_count,
            "new_rechecks": new_count, "provider_calls": 0, "profile_admission": "preserved",
            "session_activation": "not_performed", "channel_activation": "not_performed"}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--run-dir", required=True, help="New owned runtime/artifacts directory")
    parser.add_argument("--until", required=True, help="Fixed timezone-aware operator deadline")
    parser.add_argument("--interval-seconds", type=int, default=60)
    parser.add_argument("--resume", action="store_true", help="Inspect committed history; do not extend deadline")
    args = parser.parse_args()
    cfg = settings()
    if (cfg.control_mode != "local" or cfg.environment == "production"
            or cfg.smtp_enabled or cfg.voice_enabled):
        raise ValueError("local_channels_off_required")
    directory = safe(args.run_dir)
    directory.relative_to(safe(Path(__file__).resolve().parents[1] / "artifacts"))
    result = await monitor(read_request(args.input), directory, until=args.until,
        interval_seconds=args.interval_seconds, ttl_seconds=cfg.knowledge_ttl_seconds, resume=args.resume)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (Exception, KeyboardInterrupt):
        # Never emit exception details containing source facts, paths or IDs.
        raise SystemExit("Source monitor stopped; inspect private receipts and current authority before explicit resume.") from None
