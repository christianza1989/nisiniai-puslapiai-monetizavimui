"""Synthetic monitor recovery/deadline/failure boundaries; no database or provider."""
import hashlib
import importlib
import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
try:
    monitor = importlib.import_module("customer_source_monitor")
finally:
    sys.path.pop(0)


def request():
    return dict(creation_id=str(uuid4()), accepted_revision=1, candidate_sha256="a" * 64,
        accepted_source_revision="b" * 40, authorizing_session_id=str(uuid4()), public_core="synthetic",
        public_source_revision="c" * 40, sandbox="synthetic", package_sha256="d" * 64, admit_source=False,
        execution_source_revision="e" * 40, profile_admission_id=str(uuid4()), profile_fingerprint="f" * 64,
        expected_refreshed_at="2026-10-12T13:00:00+00:00", request_key=str(uuid4()))


class Clock:
    def __init__(self):
        self.now = datetime(2026, 10, 12, 13, 0, 1, tzinfo=UTC)

    async def sleep(self, seconds):
        self.now += timedelta(seconds=seconds)


def proof(value, output, refreshed):
    receipt = {"status": "prepared", "profile_admission_id": value["profile_admission_id"],
        "profile_fingerprint": value["profile_fingerprint"], "profile_admission": "preserved",
        "provider_calls": 0, "session_activation": "not_performed", "channel_activation": "not_performed",
        "source_refreshed_at": refreshed.isoformat(),
        "source_expires_at": (refreshed + timedelta(seconds=180)).isoformat()}
    monitor.save(output, receipt)
    monitor.save(Path(str(output) + ".status.json"), {"status": "committed",
        "receipt_sha256": hashlib.sha256(output.read_bytes()).hexdigest()})


async def run(value, directory, clock, executor, **kwargs):
    return await monitor.monitor(value, directory, until="2026-10-12T13:02:01+00:00",
        interval_seconds=60, ttl_seconds=180, clock=lambda: clock.now, sleep=clock.sleep,
        executor=executor, check=lambda: "e" * 40, **kwargs)


async def test_chained_rechecks_have_unique_keys_and_preserve_identity(tmp_path):
    value, clock, calls = request(), Clock(), []
    async def execute(req, output):
        calls.append(req)
        proof(req, output, clock.now)
    result = await run(value, tmp_path / "run", clock, execute)
    assert result["new_rechecks"] == 2 and result["provider_calls"] == 0
    assert calls[0]["request_key"] == value["request_key"] != calls[1]["request_key"]
    assert monitor.stamp(calls[1]["expected_refreshed_at"]) == datetime(2026, 10, 12, 13, 0, 1, tzinfo=UTC)
    assert all(c["profile_admission_id"] == value["profile_admission_id"] for c in calls)
    assert value["expected_refreshed_at"] == "2026-10-12T13:00:00+00:00"


async def test_expired_resume_reads_committed_history_without_database_or_renewal(tmp_path):
    value, clock = request(), Clock()
    async def execute(req, output):
        proof(req, output, clock.now)
    directory = tmp_path / "run"
    await run(value, directory, clock, execute)
    before = {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*.json")}
    async def forbidden(*_):
        pytest.fail("Expired resume may not call canonical executor")
    result = await run(value, directory, clock, forbidden, resume=True)
    assert result["completed_rechecks"] == 2 and result["new_rechecks"] == 0
    assert before == {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*.json")}


@pytest.mark.parametrize("failure", ["missing", "prepared", "corrupt"])
async def test_uncertain_receipt_never_retries_on_resume(tmp_path, failure):
    value, clock, calls = request(), Clock(), []
    async def failed(req, output):
        calls.append(req)
        if failure != "missing":
            proof(req, output, clock.now)
            target = Path(str(output) + ".status.json") if failure == "prepared" else output
            target.write_text('{"status":"prepared"}')
        raise OSError("Synthetic ambiguous failure containing private facts")
    directory = tmp_path / "run"
    with pytest.raises(OSError):
        await run(value, directory, clock, failed)
    with pytest.raises(ValueError, match="inspection_required"):
        await run(value, directory, clock, failed, resume=True)
    assert len(calls) == 1


async def test_restart_after_committed_interruption_waits_then_uses_next_request(tmp_path):
    value, clock, calls = request(), Clock(), []
    async def execute(req, output):
        calls.append(req)
        proof(req, output, clock.now)
    async def interrupted(_):
        raise KeyboardInterrupt()
    directory = tmp_path / "run"
    with pytest.raises(KeyboardInterrupt):
        await monitor.monitor(value, directory, until="2026-10-12T13:02:01+00:00",
            interval_seconds=60, ttl_seconds=180, clock=lambda: clock.now,
            sleep=interrupted, executor=execute, check=lambda: "e" * 40)
    result = await run(value, directory, clock, execute, resume=True)
    assert result["new_rechecks"] == 1 and len(calls) == 2
    assert calls[0]["request_key"] != calls[1]["request_key"]


@pytest.mark.parametrize("change", ["until", "authorizing_session_id", "profile_fingerprint"])
async def test_resume_cannot_extend_deadline_or_replace_authority(tmp_path, change):
    value, clock = request(), Clock()
    async def execute(req, output):
        proof(req, output, clock.now)
    directory = tmp_path / "run"
    await run(value, directory, clock, execute)
    if change == "until":
        path = directory / "manifest.json"
        data = json.loads(path.read_text())
        data["until"] = "2026-10-12T14:00:00+00:00"
        path.write_text(json.dumps(data))
    else:
        value[change] = str(uuid4()) if change == "authorizing_session_id" else "0" * 64
    with pytest.raises(ValueError, match="resume_identity_conflict"):
        await run(value, directory, clock, execute, resume=True)


@pytest.mark.parametrize("interval", [0, -1, 61, 180])
async def test_interval_cannot_consume_existing_ttl(tmp_path, interval):
    with pytest.raises(ValueError, match="bounded_interval"):
        await monitor.monitor(request(), tmp_path / "run", until="2026-10-12T13:02:01+00:00",
            interval_seconds=interval, ttl_seconds=180)
    assert not (tmp_path / "run").exists()


def test_concurrent_same_run_has_one_os_lock(tmp_path):
    with monitor.run_lock(tmp_path):
        with pytest.raises(OSError):
            with monitor.run_lock(tmp_path):
                pytest.fail("Concurrent monitor entered")


async def test_source_change_stops_before_any_recheck(tmp_path):
    clock = Clock()
    async def forbidden(*_):
        pytest.fail("Changed source may not enter canonical executor")
    with pytest.raises(ValueError, match="execution_source_changed"):
        await monitor.monitor(request(), tmp_path / "run", until="2026-10-12T13:02:01+00:00",
            interval_seconds=60, ttl_seconds=180, clock=lambda: clock.now,
            executor=forbidden, check=lambda: "0" * 40)
    assert not (tmp_path / "run/000001").exists()
