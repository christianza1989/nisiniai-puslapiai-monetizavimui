"""Historical source observations are bound claims, never admitted business facts."""
import hashlib
import json
import subprocess
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.business_discovery import source_context
from pinet_core.control.routes import ControlError
from pinet_core.creation.adapter import ROOT
from pinet_core.creation.service import digest


def example(text="Gamintojas teigia: ąžuolas 🧖"):
    owned = {key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id")}
    owned["environment_id"] = "test-source-context"
    creation = SimpleNamespace(id=str(uuid4()), **owned)
    parent = SimpleNamespace(id=str(uuid4()), **owned)
    job = SimpleNamespace(id=str(uuid4()), discovery_id=parent.id, source_revision="a" * 40,
        status="succeeded", usage={source_context.MARKER: source_context.VERSION, "source_reads": {
            "pages": [{"url": "https://example.org/factory", "status": "observed", "http_status": 200,
                "observed_at": "2026-10-15T00:00:00+00:00", "title": "Gamintojo teiginys",
                "body_sha256": "b" * 64, "text_sha256": hashlib.sha256(text.encode()).hexdigest(),
                "response_bytes": 40000, "text": text, "links": []}], "remaining_urls": [], "complete": True,
            "independent_fact_verification": "UNVERIFIED"}}, **owned)
    report = SimpleNamespace(id=str(uuid4()), job_id=job.id, discovery_id=parent.id, revision=1,
        material_hash="c" * 64, source_revision=job.source_revision, **owned)
    return creation, parent, report, job, {"business_name": "Synthetic source plan"}


def test_exact_report_capture_keeps_unicode_and_clipping_honest():
    args = example("ą" * 9000)
    value = source_context.build(*args)
    assert value["creationId"] == args[0].id and value["discoveryJobId"] == args[3].id
    assert value["claimStatus"] == "external_source_claims" and value["independentVerification"] == "UNVERIFIED"
    assert value["excerptLimitChars"] == 9000 and value["sources"][0]["textMayBeClipped"] is True
    assert value["coverage"]["readerReportedComplete"] is True
    assert value["coverage"]["capturedClippedCount"] == 1
    assert value["contextSha256"] == digest({k: v for k, v in value.items() if k != "contextSha256"})
    assert source_context.validate(value, creation_id=args[0].id) == value


def test_legacy_marker_absence_omits_even_existing_capture_without_mutating_it():
    args = example()
    del args[3].usage[source_context.MARKER]
    before = deepcopy(args[3].usage)
    assert source_context.build(*args) is None and args[3].usage == before


@pytest.mark.parametrize("value", [[], ["bad"], "", "bad", 0, 7, False, True])
def test_invalid_usage_is_not_silently_legacy(value):
    args = example()
    args[3].usage = value
    with pytest.raises(ControlError, match="invalid_discovery_source_context"):
        source_context.build(*args)


@pytest.mark.parametrize("field,value", [("id", str(uuid4())), ("discovery_id", str(uuid4())),
    ("user_id", str(uuid4())), ("organization_id", str(uuid4())), ("portfolio_id", str(uuid4())),
    ("environment_id", "test-foreign"), ("source_revision", "f" * 40), ("status", "running")])
def test_foreign_or_unsettled_report_job_cannot_supply_sources(field, value):
    args = example()
    setattr(args[3], field, value)
    with pytest.raises(ControlError):
        source_context.build(*args)


@pytest.mark.parametrize("change", ["missing", "version", "text_sha", "float", "bool", "date", "complete", "key"])
def test_present_malformed_snapshot_is_rejected_not_omitted(change):
    args = example()
    raw = args[3].usage["source_reads"]
    if change == "missing":
        del args[3].usage["source_reads"]
    elif change == "version":
        args[3].usage[source_context.MARKER] = "unsupported"
    elif change == "text_sha":
        raw["pages"][0]["text_sha256"] = "f" * 64
    elif change in {"float", "bool"}:
        raw["pages"][0]["response_bytes"] = 2.0 if change == "float" else True
    elif change == "date":
        raw["pages"][0]["observed_at"] = "2026-02-30T00:00:00Z"
    elif change == "complete":
        raw["remaining_urls"] = ["https://example.org/remaining"]
    else:
        raw["pages"][0]["šaltinis"] = "not a structural key"
    with pytest.raises(ControlError):
        source_context.build(*args)


def test_whole_entries_and_clipped_excerpt_coverage_never_claim_full_text_or_catalogue():
    args = example("🧖" * 9000)
    raw = args[3].usage["source_reads"]
    raw["pages"] = [deepcopy(raw["pages"][0]) for _ in range(7)]
    value = source_context.build(*args)
    assert len(value["sources"]) == 1 and len(source_context.encoded(value)) <= 65536
    assert value["sources"][0]["text"] == "🧖" * 9000 and value["sources"][0]["textChars"] == 9000
    assert value["coverage"]["omittedCount"] == 6 and value["coverage"]["capturedClippedCount"] == 7
    assert value["coverage"]["readerReportedComplete"] is True and value["sources"][0]["textMayBeClipped"]


def test_entry_count_and_unavailable_remaining_coverage_are_explicit():
    args = example()
    raw = args[3].usage["source_reads"]
    raw["pages"] = [{"url": "https://example.org/" + str(i), "status": "unavailable", "error": "TimeoutError"} for i in range(20)]
    raw.update(complete=False, remaining_urls=["https://example.org/remaining"])
    value = source_context.build(*args)
    assert value["coverage"] == {"readerReportedComplete": False, "capturedCount": 20, "includedCount": 12,
        "omittedCount": 8, "remainingUrlCount": 1, "capturedClippedCount": 0, "includedClippedCount": 0}


def test_rehashed_coverage_cannot_hide_clipping_in_nonexistent_omitted_sources():
    value = source_context.build(*example())
    value["coverage"]["capturedClippedCount"] = 1
    value["contextSha256"] = digest({k: v for k, v in value.items() if k != "contextSha256"})
    with pytest.raises(ControlError, match="invalid_discovery_source_context"):
        source_context.validate(value)


@pytest.mark.parametrize("body", ["Gamintojas teigia: ąžuolas 🧖", "🧖" * 9000], ids=["unicode", "clipped-astral"])
def test_python_unicode_context_and_clipping_validate_with_identical_node_hash(body):
    value = source_context.build(*example(body))
    module = (ROOT / "content-studio/src/discovery-source-context.mjs").as_uri()
    code = "const {validateDiscoverySourceContext}=await import(process.argv[1]);let s='';for await(const c of process.stdin)s+=c;process.stdout.write(JSON.stringify(validateDiscoverySourceContext(JSON.parse(s))))"
    result = subprocess.run(["node", "--input-type=module", "-e", code, module], input=json.dumps(value, ensure_ascii=False),
        text=True, capture_output=True, encoding="utf-8", check=True)
    assert json.loads(result.stdout) == value


@pytest.mark.parametrize("change", ["removed", "marker", "text"])
async def test_source_removal_or_drift_stops_heartbeat_preserving_existing_intake_receipt(monkeypatch, change):
    from pinet_core.business_discovery import service
    from pinet_core.creation import execution_profiles, worker

    args = example()
    frozen = source_context.build(*args)
    retained = {"content_intake": {"state": "private-draft-imported", "sourceContextSha256": frozen["contextSha256"]}}
    job = SimpleNamespace(status="running", run_id="inert-run", lease_until=worker.utcnow() + timedelta(seconds=60), usage=deepcopy(retained))

    @asynccontextmanager
    async def scope(**_):
        yield object()

    async def locked(*_):
        return args[0], job

    async def authority(*_):
        return True

    async def profile(*_):
        return "default"

    async def current(*_):
        return {"sourceContext": source_context.build(*args)}

    async def fail(*_):
        job.status = "failed"

    monkeypatch.setattr(worker, "scope", scope)
    monkeypatch.setattr(worker, "locked", locked)
    monkeypatch.setattr(worker, "authority", authority)
    monkeypatch.setattr(worker, "fail", fail)
    monkeypatch.setattr(service, "approved_build_context", current)
    monkeypatch.setattr(execution_profiles, "ensure_current", profile)
    if change == "removed":
        del args[3].usage[source_context.MARKER]
    elif change == "marker":
        args[3].usage[source_context.MARKER] = "changed"
    else:
        args[3].usage["source_reads"]["pages"][0]["text"] = "Changed snapshot without matching hash"
    assert not await worker.heartbeat("inert-job", "inert-owner", "inert-run", expected_source_sha256=frozen["contextSha256"])
    assert job.status == "failed" and job.usage == retained


@pytest.mark.parametrize("moment", ["before", "after"])
async def test_creation_worker_fences_intake_and_keeps_post_write_receipt_when_opt_in_is_removed(monkeypatch, moment):
    from pinet_core.business_discovery import service
    from pinet_core.creation import execution_profiles, language_mode, worker

    args = example()
    frozen = source_context.build(*args)
    creation = args[0]
    job = SimpleNamespace(status="running", run_id="run", usage=None, lease_until=worker.utcnow() + timedelta(seconds=60))
    claimed = {"job_id": "inert-job", "user_id": "inert-owner", "run_id": "run", "creation_id": creation.id,
        "revision": 1, "context": {"canonical_host": "example.org", "approved_business_plan": {"sourceContext": frozen}}}
    calls = []

    @asynccontextmanager
    async def scope(**_):
        yield object()

    async def claim(**_):
        return claimed

    async def locked(*_):
        return creation, job

    async def yes(*_):
        return True

    async def current(*_):
        value = source_context.build(*args)
        return {"sourceContext": value} if value else {}

    async def fail(*_):
        job.status = "failed"

    async def runner(context, authorized):
        assert await authorized()
        if moment == "before":
            del args[3].usage[source_context.MARKER]
        return {}, {"usage": {"input_tokens": 7}}

    async def intake(result, **options):
        calls.append(options["source_context"])
        del args[3].usage[source_context.MARKER]
        return {"state": "private-draft-imported", "sourceContextSha256": frozen["contextSha256"]}

    for key, value in {"scope": scope, "claim": claim, "locked": locked, "authority": yes, "fail": fail}.items():
        monkeypatch.setattr(worker, key, value)
    monkeypatch.setattr(worker.renderer, "normalize", lambda value: value)
    monkeypatch.setattr(language_mode, "draft_observation", lambda _: {"status": "UNVERIFIED"})
    monkeypatch.setattr(service, "approved_build_context", current)
    monkeypatch.setattr(execution_profiles, "ensure_current", yes)
    assert await worker._execute_once(runner=runner, intake_runner=intake)
    assert job.status == "failed" and job.usage["source_context_sha256"] == frozen["contextSha256"]
    assert len(calls) == (moment == "after")
    if moment == "after":
        assert job.usage["content_intake"] == {"state": "private-draft-imported", "sourceContextSha256": frozen["contextSha256"]}
