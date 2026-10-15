"""Actual restricted PostgreSQL and injected providers: diagnostic V2 typed reports."""

import hashlib
import json
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select
from test_customer_agent_lab import (  # noqa: F401 - canonical fixture chain
    configured,
    creation,
    customers,
    fake,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_agent_protection import manifest
from test_customer_competence import VALUES, provider
from test_customer_review import rows

from pinet_core import competence
from pinet_core.api import app
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import evaluator, lab, review, typed_checks
from pinet_core.customer_text import adapter
from pinet_core.db import db
from pinet_core.models import Event, Job, Outbox


def write(path, value):
    path.write_text(json.dumps(value), encoding="utf-8")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def typed_manifest(c, tmp_path, monkeypatch, *, invalid=False, mode="fields"):
    messages = ["Synthetic original 100", "Synthetic correction 50"]
    origin_ref, messages = manifest(c, tmp_path, monkeypatch, messages=messages)
    origin_path = Path(origin_ref["manifest_path"])
    origin = json.loads(origin_path.read_text())
    supplement = {
        "version": typed_checks.VERSION,
        "purpose": "diagnostic_seen_regression",
        "origin": {"path": str(origin_path), "sha256": origin_ref["manifest_sha256"]},
        "source_case_corpus_sha256": origin["corpus_sha256"],
        "cases": [
            {
                "case_id": case["case_id"],
                "script_sha256": digest(case["messages"]),
                "expected_contact_channels": [],
                "email_expected": False,
                "checkpoints": [
                    {
                        "after_step": i,
                        "mode": mode,
                        **(
                            {"matches": {"goal": [m, "NEVER_PASS_EXPECTATIONS_TO_MODEL"]}}
                            if mode == "fields"
                            else {}
                        ),
                    }
                    for i, m in enumerate(case["messages"], 1)
                ],
            }
            for case in origin["cases"]
        ],
    }
    if invalid:
        supplement["cases"][0]["checkpoints"][0] = {"after_step": 1, "mode": "fields"}
    supplement_path = tmp_path / "expectations.private.json"
    planned = {
        **origin,
        "contract": typed_checks.MANIFEST,
        "typed_expectations": {"path": str(supplement_path), "sha256": write(supplement_path, supplement)},
    }
    planned_path = tmp_path / "typed-manifest.private.json"
    ref = {**origin_ref, "manifest_path": str(planned_path), "manifest_sha256": write(planned_path, planned)}
    return ref, messages, supplement_path


async def episode(c, tmp_path, monkeypatch, *, mode="fields"):
    calls = []
    fake(monkeypatch, calls)
    ref, messages, path = typed_manifest(c, tmp_path, monkeypatch, mode=mode)
    result = await lab.episode(c["token"], c["frozen"], messages, uuid4(), protected_case=ref)
    rq = review.TypedRequest(
        bearer=c["token"],
        conversation_id=result["conversation"]["conversation_id"],
        request_id=uuid4(),
        episode=result["snapshot"],
        typed_expectations=ref,
    )
    return rq, calls, path


async def test_actual_v2_checkpoints_private_report_and_exact_replay(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    rq, text_calls, _ = await episode(c, tmp_path, monkeypatch)
    quality_calls = []
    provider(monkeypatch, c, quality_calls)
    response = await review.run(rq)
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    artifact = next(a for a in artifacts if a.kind == "quality")
    report = artifact.payload["typed_checks"]
    assert report["version"] == typed_checks.REPORT
    assert response["status"] == "succeeded" and response["typed_report"]["state"] == "PASS", report["checks"]
    assert all(report["checks"].values()) and len(report["checks"]) == 10
    assert len(report["checkpoints"]) == len(text_calls) == 2
    assert len(quality_calls) == 1 and job.payload["typed_report"]["sha256"] == digest(report)
    assert artifact.payload["competence"] == competence.report(VALUES)
    before = deepcopy(
        (job.payload, [(e.id, e.payload) for e in events], [(a.id, a.payload) for a in artifacts])
    )
    assert await review.run(rq) == response and len(quality_calls) == 1
    retained, retained_artifacts, retained_job = await rows(c, str(rq.conversation_id))
    assert before == (
        retained_job.payload,
        [(e.id, e.payload) for e in retained],
        [(a.id, a.payload) for a in retained_artifacts],
    )
    for material in [*text_calls, quality_calls[0][0]]:
        assert all(
            secret not in str(material)
            for secret in (
                "typed_expectations",
                "evaluation_plan_sha256",
                "expected_contact_channels",
                "NEVER_PASS_EXPECTATIONS_TO_MODEL",
                rq.typed_expectations.manifest_path,
            )
        )
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Outbox)))
        assert not list(await tx.scalars(select(Job).where(Job.kind == "learning")))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855"
    ) as client:
        path = f"/customer/v2/creations/{rq.episode.creation_id}/text-sessions/{rq.conversation_id}/events"
        public = await client.get(path, headers=c["auth"])
        assert public.status_code == 200
        assert all(
            secret not in public.text
            for secret in (
                "typed_checks",
                "typed_expectations",
                "checkpoints",
                "evaluation_plan_sha256",
                "NEVER_PASS_EXPECTATIONS_TO_MODEL",
            )
        )


async def test_invalid_other_case_fails_before_first_provider(configured, tmp_path, monkeypatch):  # noqa: F811
    c, calls = configured, []
    fake(monkeypatch, calls)
    ref, messages, _ = typed_manifest(c, tmp_path, monkeypatch, invalid=True)
    with pytest.raises(ValueError, match="nonempty_state"):
        await lab.episode(c["token"], c["frozen"], messages, uuid4(), protected_case=ref)
    assert not calls
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Event).where(Event.kind == "provider_attempt")))


async def test_expectation_change_during_quality_keeps_usage_and_rejects_acceptance(
    configured,  # noqa: F811
    tmp_path,
    monkeypatch,
):
    c = configured
    rq, text_calls, path = await episode(c, tmp_path, monkeypatch)
    calls = []

    async def changed(schema, prompt, wire, authorized):
        assert await authorized()
        calls.append(prompt)
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            event_id = await tx.scalar(
                select(Event.id)
                .where(Event.conversation_id == str(rq.conversation_id), Event.kind == "client_transcript")
                .limit(1)
            )
        path.write_bytes(path.read_bytes() + b" ")
        return schema(
            quality={
                "outcome": "helpful",
                "issues": [],
                "evidence_event_ids": [event_id],
                "improvement_hint": "",
            },
            scores=VALUES,
        ), {"input_tokens": 12, "output_tokens": 6}

    monkeypatch.setattr(evaluator, "run", changed)
    result = await review.run(rq)
    assert result["status"] == "failed" and len(calls) == 1 and len(text_calls) == 2
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed"
    usage = next(e for e in events if e.kind == "quality_provider_usage")
    assert usage.payload["usage"]["tokens"]["input_tokens"] == 12
    assert usage.payload["output_sha256"] and "typed_report" not in job.payload


async def test_future_correction_does_not_repair_first_checkpoint(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    rq, _, _ = await episode(c, tmp_path, monkeypatch, mode="empty")
    quality_calls = []
    provider(monkeypatch, c, quality_calls)
    response = await review.run(rq)
    assert response["status"] == "succeeded" and response["typed_report"]["state"] == "FAIL"
    _, artifacts, _ = await rows(c, str(rq.conversation_id))
    report = next(a for a in artifacts if a.kind == "quality").payload["typed_checks"]
    assert not report["checks"]["corrected_need_saved"] and not any(
        c["passed"] for c in report["checkpoints"]
    )
    assert report["module_admission"] == "not_admitted" and len(quality_calls) == 1


async def test_missing_precommit_cannot_be_added_to_legacy_episode(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    fake(monkeypatch, [])
    ref, messages, _ = typed_manifest(c, tmp_path, monkeypatch)
    result = await lab.episode(c["token"], c["frozen"], messages, uuid4())
    rq = review.TypedRequest(
        bearer=c["token"],
        conversation_id=result["conversation"]["conversation_id"],
        request_id=uuid4(),
        episode=result["snapshot"],
        typed_expectations=ref,
    )
    with pytest.raises(ControlError, match="precommit"):
        await review.prepare(rq)
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert job is None and not artifacts and not any(e.kind.startswith("quality_") for e in events)


async def test_changed_original_structured_score_hash_cannot_create_typed_report(
    configured,  # noqa: F811
    tmp_path,
    monkeypatch,
):
    c = configured
    rq, _, _ = await episode(c, tmp_path, monkeypatch)
    calls = []
    provider(monkeypatch, c, calls)
    original = typed_checks.accounted

    async def corrupt(tx, row, dispatch, result):
        event = await tx.scalar(
            select(Event).where(Event.conversation_id == row.id, Event.kind == "quality_provider_usage")
        )
        event.payload = {**event.payload, "output_sha256": "0" * 64}
        await tx.flush()
        await original(tx, row, dispatch, result)

    monkeypatch.setattr(typed_checks, "accounted", corrupt)
    result = await review.run(rq)
    assert result["status"] == "failed" and len(calls) == 1
    _, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed" and "typed_report" not in job.payload


@pytest.mark.parametrize("change", ["missing_usage", "wrong_run", "unknown_usage"])
async def test_no_patch_actual_receipt_chain_and_unknown_accounting(
    configured,  # noqa: F811
    tmp_path,
    monkeypatch,
    change,
):
    c, text_calls = configured, []

    async def no_patch(context, event_id, revision, authorized):
        assert await authorized()
        text_calls.append(context)
        return adapter.schema(event_id, revision).model_validate(
            {"reply": "Useful synthetic answer", "calls": []}
        ), None

    monkeypatch.setattr(adapter, "run", no_patch)
    ref, messages, _ = typed_manifest(c, tmp_path, monkeypatch, mode="empty")
    result = await lab.episode(c["token"], c["frozen"], messages, uuid4(), protected_case=ref)
    rq = review.TypedRequest(
        bearer=c["token"],
        conversation_id=result["conversation"]["conversation_id"],
        request_id=uuid4(),
        episode=result["snapshot"],
        typed_expectations=ref,
    )
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        usage = await tx.scalar(
            select(Event)
            .where(Event.conversation_id == str(rq.conversation_id), Event.kind == "provider_usage")
            .order_by(Event.sequence)
            .limit(1)
        )
        assert usage.payload["usage"]["known"] is False
        if change == "missing_usage":
            await tx.execute(delete(Event).where(Event.id == usage.id))
        elif change == "wrong_run":
            usage.payload = {**usage.payload, "run_id": "foreign"}
    quality_calls = []
    provider(monkeypatch, c, quality_calls)
    if change == "unknown_usage":
        response = await review.run(rq)
        _, artifacts, _ = await rows(c, str(rq.conversation_id))
        checks = next(a for a in artifacts if a.kind == "quality").payload["typed_checks"]["checks"]
        assert response["status"] == "succeeded" and response["typed_report"]["state"] == "PASS", checks
        assert len(quality_calls) == 1
    else:
        with pytest.raises(ControlError, match="typed_text_receipt_conflict"):
            await review.prepare(rq)
        assert not quality_calls
    assert len(text_calls) == 2


@pytest.mark.parametrize(
    "change",
    [
        "usage_model",
        "usage_key",
        "usage_number",
        "attempt_binding",
        "attempt_input",
        "attempt_evaluator",
        "attempt_profile",
        "request_binding",
    ],
)
async def test_wrong_quality_receipt_identity_cannot_create_typed_report(
    configured, tmp_path, monkeypatch, change  # noqa: F811
):
    c = configured
    rq, _, _ = await episode(c, tmp_path, monkeypatch)
    calls = []
    provider(monkeypatch, c, calls)
    original = typed_checks.accounted

    async def corrupt(tx, row, dispatch, result):
        kind = (
            "quality_provider_usage"
            if change.startswith("usage_")
            else "quality_provider_attempt"
            if change.startswith("attempt_")
            else "quality_request"
        )
        event = await tx.scalar(select(Event).where(Event.conversation_id == row.id, Event.kind == kind))
        if change == "usage_key":
            event.event_key = "quality-usage:foreign:1"
        else:
            field, value = {
                "usage_model": ("model", "gpt-6-luna"),
                "usage_number": ("number", True),
                "attempt_binding": ("binding_sha256", "0" * 64),
                "attempt_input": ("input_sha256", "0" * 64),
                "attempt_evaluator": ("evaluator_sha256", "0" * 64),
                "attempt_profile": ("model_profile", {}),
                "request_binding": ("binding_sha256", "0" * 64),
            }[change]
            event.payload = {**event.payload, field: value}
        await tx.flush()
        await original(tx, row, dispatch, result)

    monkeypatch.setattr(typed_checks, "accounted", corrupt)
    result = await review.run(rq)
    assert result["status"] == "failed" and len(calls) == 1
    _, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed" and "typed_report" not in job.payload
