"""Owned restricted PG current-binding/deadline/reservation checks; zero provider calls."""
import hashlib
import json
from datetime import timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import discovery as discovery_fixture
from test_business_discovery import start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.business_discovery import adapter, worker
from pinet_core.business_discovery.models import Discovery, DiscoveryAttempt, DiscoveryJob
from pinet_core.business_discovery.wire import PlanReview, Reply
from pinet_core.config import settings
from pinet_core.control.routes import scope
from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation.execution_profile_models import PipelineModelProfile
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError

discovery = discovery_fixture


async def admitted(c, monkeypatch, profile=profiles.SOL_HIGH):
    monkeypatch.setattr(settings(), "creation_execution_profile", profile)
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    return row, me


@pytest.mark.parametrize("profile,expected", [(profiles.DEFAULT, 360), (profiles.SOL_HIGH, 600)])
async def test_actual_claim_persists_default_or_high_budget_once(discovery, monkeypatch, profile, expected):
    c = discovery
    monkeypatch.setattr(settings(), "creation_runner_seconds", 180)
    row, me = await admitted(c, monkeypatch, profile)
    claimed = await worker.claim(row["discovery_id"])
    async with scope(user=me["user_id"]) as tx:
        parent, job = await tx.get(Discovery, row["discovery_id"]), await tx.get(DiscoveryJob, claimed["job_id"])
        assert (job.deadline_at-parent.updated_at).total_seconds() == pytest.approx(expected, abs=.05)
        deadline = job.deadline_at
        binding = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.discovery_job_id == job.id))
        assert (binding is not None) == (profile == profiles.SOL_HIGH)
    assert await worker.heartbeat(claimed)
    async with scope(user=me["user_id"]) as tx:
        assert (await tx.get(DiscoveryJob, claimed["job_id"])).deadline_at == deadline


@pytest.mark.parametrize("role,remaining", [("creator", 170), ("critic", 80)])
async def test_reserved_review_budget_refuses_before_a_paid_attempt(discovery, monkeypatch, role, remaining):
    c = discovery
    row, me = await admitted(c, monkeypatch)
    claimed = await worker.claim(row["discovery_id"])
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(DiscoveryJob, claimed["job_id"])
        job.deadline_at = utcnow()+timedelta(seconds=remaining)
        deadline = job.deadline_at
    with pytest.raises(RunnerError, match="run_timeout"):
        await worker.reserve(claimed, role, 1)
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.job_id == claimed["job_id"])) == 0
        assert (await tx.get(DiscoveryJob, claimed["job_id"])).deadline_at == deadline


async def test_time_consumed_by_admission_lock_or_quota_cannot_pay_for_exhausted_creator(discovery, monkeypatch):
    c = discovery
    row, me = await admitted(c, monkeypatch)
    claimed = await worker.claim(row["discovery_id"])
    real_now = utcnow
    def slow_quota(own, total):
        monkeypatch.setattr(worker, "utcnow", lambda: real_now()+timedelta(seconds=500))
        return False
    monkeypatch.setattr(worker, "daily_limit_reached", slow_quota)
    with pytest.raises(RunnerError, match="run_timeout"):
        await worker.reserve(claimed, "creator", 1)
    async with scope(user=me["user_id"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.job_id == claimed["job_id"])) == 0


async def test_current_roles_keep_one_deadline_and_exact_six_reservation_limit(discovery, monkeypatch):
    c = discovery
    row, me = await admitted(c, monkeypatch)
    claimed = await worker.claim(row["discovery_id"])
    async with scope(user=me["user_id"]) as tx:
        before = (await tx.get(DiscoveryJob, claimed["job_id"])).deadline_at
    for round_number in (1, 2):
        for role in ("creator", "critic", "coordinator"):
            sequence, pin, remaining = await worker.reserve(claimed, role, round_number)
            assert 0 < remaining <= 600 and pin == adapter.instructions(role)[1]
            assert adapter.deadlines.role_seconds(profiles.SOL_HIGH, role, remaining) <= {
                "creator": 420, "critic": 90, "coordinator": 90}[role]
    assert sequence == 6
    with pytest.raises(RunnerError, match="attempt_limit"):
        await worker.reserve(claimed, "creator", 2)
    async with scope(user=me["user_id"]) as tx:
        assert (await tx.get(DiscoveryJob, claimed["job_id"])).deadline_at == before
        attempts = list(await tx.scalars(select(DiscoveryAttempt).where(DiscoveryAttempt.job_id == claimed["job_id"])))
        assert len(attempts) == 6 and all(item.model == "gpt-6.1-sol" for item in attempts)


def old_high_fingerprint():
    pins = {}
    for role in ("creator", "critic", "coordinator"):
        material, _ = adapter.instructions(role)
        pins[role] = hashlib.sha256(json.dumps({"role": role, "instructions": material,
            "schema": (Reply if role == "creator" else PlanReview).model_json_schema(),
            "execution": adapter.shared.pipeline_profile(role)}, sort_keys=True).encode()).hexdigest()
    return hashlib.sha256(json.dumps(pins, sort_keys=True).encode()).hexdigest()


async def test_old_high_instruction_identity_keeps_charge_and_refuses_another_reservation(discovery, monkeypatch):
    c = discovery
    row, me = await admitted(c, monkeypatch)
    claimed = await worker.claim(row["discovery_id"])
    await worker.reserve(claimed, "creator", 1)
    legacy = old_high_fingerprint()
    assert legacy != adapter.fingerprint()
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(DiscoveryJob, claimed["job_id"])
        job.instruction_hash = legacy
        source, deadline = job.source_revision, job.deadline_at
    with pytest.raises(RunnerError, match="instructions_changed"):
        await worker.reserve(claimed, "critic", 1)
    async with scope(user=me["user_id"]) as tx:
        job = await tx.get(DiscoveryJob, claimed["job_id"])
        assert (job.instruction_hash, job.source_revision, job.deadline_at) == (legacy, source, deadline)
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.job_id == job.id)) == 1


async def test_old_queued_source_is_refused_without_retagging_the_binding(discovery, monkeypatch):
    c = discovery
    row, me = await admitted(c, monkeypatch)
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(DiscoveryJob).where(DiscoveryJob.discovery_id == row["discovery_id"]))
        identity, source = job.id, job.source_revision
        bound = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.discovery_job_id == job.id))
        before = (bound.profile, bound.session_id, bound.source_revision)
    monkeypatch.setattr(settings(), "control_source_revision", "e"*40 if source != "e"*40 else "f"*40)
    assert await worker.claim(row["discovery_id"]) is None
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.get(DiscoveryJob, identity)
        bound = await tx.scalar(select(PipelineModelProfile).where(PipelineModelProfile.discovery_job_id == identity))
        assert job.source_revision == source and job.instruction_hash is None
        assert (bound.profile, bound.session_id, bound.source_revision) == before
        assert await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.job_id == identity)) == 0
