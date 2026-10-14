"""HTTP boundary tests; no DB, provider or synthetic quality approval in runtime."""
import importlib.util
import json
from pathlib import Path
from uuid import uuid4

import httpx
import pytest

spec = importlib.util.spec_from_file_location("workspace_pipeline", Path(__file__).resolve().parents[1] / "scripts/workspace_pipeline.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
SOURCE = "a" * 40


def pipeline(tmp_path, handler):
    client = httpx.Client(base_url="http://127.0.0.1:18871", transport=httpx.MockTransport(handler))
    result = runner.Pipeline("http://127.0.0.1:18871", tmp_path, client=client)
    result.current_source = result.expected_source = SOURCE
    return result


def test_uncertain_post_replays_persisted_same_key_after_restart(tmp_path):
    bodies = []
    def handler(request):
        bodies.append(json.loads(request.content))
        if len(bodies) == 1:
            raise httpx.ReadTimeout("synthetic uncertain response")
        return httpx.Response(202, json={"data": {"status": "queued"}})
    first = pipeline(tmp_path, handler)
    with pytest.raises(runner.PipelineError) as error:
        first.mutation("start", "/customer/v2/discoveries", {"message": "synthetic"})
    assert error.value.code == "api_response_unknown"
    second = pipeline(tmp_path, handler)
    assert second.mutation("start", "/customer/v2/discoveries", {"message": "synthetic"}) == {"status": "queued"}
    assert bodies[0] == bodies[1] and bodies[0]["idempotency_key"]
    second.mutation("start", "/customer/v2/discoveries", {"message": "synthetic"})
    assert len(bodies) == 2
    with pytest.raises(runner.PipelineError) as error:
        second.mutation("start", "/customer/v2/discoveries", {"message": "different"})
    assert error.value.code == "saved_request_mismatch" and len(bodies) == 2


def test_source_mismatch_refuses_dispatch(tmp_path):
    requests = []
    value = pipeline(tmp_path, lambda request: requests.append(request))
    value.current_source = "b" * 40
    with pytest.raises(runner.PipelineError) as error:
        value.mutation("start", "/customer/v2/discoveries", {})
    assert error.value.code == "api_source_mismatch" and requests == []


def test_canonical_top_level_api_error_is_retained(tmp_path):
    value = pipeline(tmp_path, lambda request: httpx.Response(409,
        json={"code": "stale_revision", "message": "private message never logged"}))
    with pytest.raises(runner.PipelineError) as error:
        value.request("POST", "/customer/v2/discoveries", {})
    assert error.value.code == "stale_revision"
    assert "private message" not in (tmp_path / "events.private.jsonl").read_text()


def test_oversized_discovery_message_refused_before_http_dispatch(tmp_path):
    value = pipeline(tmp_path, lambda request: pytest.fail("invalid input dispatched"))
    value.state["scope"] = {"portfolio_id": str(uuid4())}
    with pytest.raises(runner.PipelineError) as error:
        value.run(discovery_id=None, message="x"*2501, source=SOURCE, mutate=True, timeout=10, poll=0)
    assert error.value.code == "invalid_discovery_request" and value.state["operations"] == {}


def report_fixture():
    identifier = str(uuid4())
    reply = {"state": "plan_ready", "plan": {"synthetic": True}}
    view = {"discovery_id": identifier, "can_build": True, "status": "plan_ready", "current_revision": 2,
            "latest_report_sha256": "c" * 64}
    report = {"discovery_id": identifier, "revision": 2, "report_sha256": "c" * 64,
        "source_revision": SOURCE, "reply": reply,
        "reviews": [{"approved": True, "candidate_sha256": runner.sha(reply)} for _ in range(2)]}
    return view, report


@pytest.mark.parametrize("tamper", ["missing_review", "not_approved", "candidate", "revision", "source", "plan", "server_gate"])
def test_actual_exact_review_required_before_approval(tamper):
    view, report = report_fixture()
    if tamper == "missing_review":
        report["reviews"].pop()
    elif tamper == "not_approved":
        report["reviews"][0]["approved"] = False
    elif tamper == "candidate":
        report["reviews"][1]["candidate_sha256"] = "d" * 64
    elif tamper == "revision":
        report["revision"] = 1
    elif tamper == "source":
        report["source_revision"] = "b" * 40
    elif tamper == "plan":
        report["reply"]["plan"] = None
    else:
        view["can_build"] = False
    with pytest.raises(runner.PipelineError):
        runner.approved_report(view, report, SOURCE)


def test_approval_uses_server_revision_and_hash():
    view, report = report_fixture()
    assert runner.approved_report(view, report, SOURCE) == {"report_revision": 2, "report_sha256": "c" * 64}


def test_authentication_uses_normal_login_and_never_logs_password_token(tmp_path, capsys):
    account = tmp_path / "credentials.private.json"
    account.write_text(json.dumps({"email": "test@example.test", "password": "private-secret"}))
    requests = []
    def handler(request):
        requests.append(request)
        if request.url.path.endswith("/auth/login"):
            return httpx.Response(200, json={"access_token": "private-token"})
        assert request.headers["authorization"] == "Bearer private-token"
        return httpx.Response(200, json={"source_revision": SOURCE, "data": {"email_verified": True,
            "user_id": str(uuid4()), "portfolios": [{"portfolio_id": str(uuid4())}]}})
    value = pipeline(tmp_path, handler)
    value.authenticate(account)
    public = capsys.readouterr().out
    saved = value.state_file.read_text() + (tmp_path / "events.private.jsonl").read_text()
    assert "private-secret" not in saved + public and "private-token" not in saved + public
    assert len(requests) == 2 and value.current_source == SOURCE


def test_foreign_discovery_stops_before_execution_read(tmp_path):
    calls = []
    identifier = str(uuid4())
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"data": {"discovery_id": identifier, "portfolio_id": str(uuid4())}})
    value = pipeline(tmp_path, handler)
    value.state["scope"] = {"portfolio_id": str(uuid4())}
    with pytest.raises(runner.PipelineError) as error:
        value.discovery_snapshot(identifier)
    assert error.value.code == "discovery_scope_mismatch" and len(calls) == 1


def test_failed_research_is_observed_once_without_retry(tmp_path):
    value = pipeline(tmp_path, lambda request: pytest.fail("unexpected dispatch"))
    identifier = str(uuid4())
    value.discovery_snapshot = lambda _id: ({"status": "failed", "failure_code": "run_timeout"}, None)
    with pytest.raises(runner.PipelineError) as error:
        value.run(discovery_id=identifier, message=None, source=SOURCE, mutate=True, timeout=10, poll=0)
    assert error.value.code == "run_timeout" and value.state["operations"] == {}


@pytest.mark.parametrize("url", ["https://example.test", "http://127.0.0.1@remote.test", "http://127.0.0.1/path", "http://127.0.0.1?token=private"])
def test_nonloopback_or_credential_bearing_url_refused(tmp_path, url):
    with pytest.raises(runner.PipelineError) as error:
        runner.Pipeline(url, tmp_path)
    assert error.value.code == "loopback_api_required"
