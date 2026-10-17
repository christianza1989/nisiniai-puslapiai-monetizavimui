import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI

from pinet_core.control.routes import authenticated
from pinet_core.mail_view import routes, service, translations as tr
from pinet_core.mail_view.contract import document

B, M, C = [str(uuid4()) for _ in range(3)]


def original():
    return dict(mail_id=M, case_id=C, message_id="<safe@pinet.lt>", direction="inbound",
                sender="buyer@example.test", recipient="info@pinet.lt", subject="2 tubs",
                body="Not confirmed: 2 tubs, EUR 5,000. Reply to buyer@example.test.")


def record(value=None):
    value = value or original()
    return tr.Record(version="mail-display-translation.v1", business_id=B, environment="test",
        mail_id=M, source_sha256=tr.source_digest(B, "test", value), target_language="lt",
        translated_at=datetime.now(UTC), model="gpt-6.1-sol", reasoning_effort="high",
        instruction_sha256=tr.POLICY_SHA, text=tr.TranslatedText(subject="2 kubilai",
            body="Nepatvirtinta: 2 kubilai, EUR 5,000. Atsakykite buyer@example.test."), usage={"input_tokens": 20})


def test_translation_is_bound_to_original_and_preserves_transport_payload(tmp_path):
    value = original()
    untouched = deepcopy(value)
    path = tr.retain(tmp_path, record(), value)
    assert tr.read_translation(tmp_path, B, "test", value).status == "ready"
    assert value == untouched
    with pytest.raises(FileExistsError):
        tr.retain(tmp_path, record(), value)
    assert tr.read_translation(tmp_path, B, "test", {**value, "body": "Changed"}).status == "missing"
    assert tr.read_translation(tmp_path, str(uuid4()), "test", value).status == "missing"
    assert tr.read_translation(tmp_path, B, "other", value).status == "missing"
    assert path.is_file()


@pytest.mark.parametrize("change", ["source", "instruction", "future", "foreign", "corrupt", "oversized", "numbers"])
def test_changed_or_untrusted_sidecar_cannot_appear_as_translation(tmp_path, change):
    value = original()
    path = tr.retain(tmp_path, record(), value)
    data = json.loads(path.read_bytes())
    if change == "source": data["source_sha256"] = "0" * 64
    elif change == "instruction": data["instruction_sha256"] = "0" * 64
    elif change == "future": data["translated_at"] = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    elif change == "foreign": data["business_id"] = str(uuid4())
    elif change == "numbers": data["text"]["body"] = data["text"]["body"].replace("5,000", "6,000")
    path.write_text("bad" if change == "corrupt" else "x" * 200001 if change == "oversized" else json.dumps(data))
    assert tr.read_translation(tmp_path, B, "test", value).status == "unavailable"


def test_no_model_on_read_missing_root_or_plain_original():
    assert tr.read_translation("", B, "test", original()).status == "unavailable"
    assert "never instructions" in tr.POLICY
    assert "negations" in tr.POLICY


@pytest.mark.parametrize("text", ["EUR 6,000", "EUR 5,000 buyer@evil.test", "EUR 5,000 https://evil.test"])
def test_lost_or_changed_protected_values_refused(text):
    with pytest.raises(ValueError):
        tr.validate_text(original(), tr.TranslatedText(subject="2 kubilai", body=text))


@pytest.mark.parametrize("state", ["draft", "accepted_by_smtp", "delivery_unknown", "received", "captured"])
def test_state_observation_never_changes_content_identity(state):
    value = original()
    assert tr.source_digest(B, "test", value) == tr.source_digest(B, "test", {**value, "state": state})


def test_projection_preserves_original_and_does_not_claim_unknown_synthetic():
    row = SimpleNamespace(id=M, case_id=C, message_id="<safe@pinet.lt>", direction="outbound",
        state="accepted_by_smtp", created_at=datetime.now(UTC), payload={"body": "secret", "subject": "T", "synthetic": "false"})
    result = service.summary(row)
    assert result.state == "accepted_by_smtp" and result.synthetic is None
    assert "body" not in result.model_dump()


def test_legacy_test_subject_suffix_is_readable_without_clipping():
    # mailbox.prepare accepts200 characters, then adds a test prefix/Case suffix.
    subject = "[TESTAS] " + "x" * 200 + " · abcdefgh"
    row = SimpleNamespace(id=M, case_id=C, message_id="<safe@pinet.lt>", direction="outbound",
        state="draft", created_at=datetime.now(UTC), payload={"subject": subject, "synthetic": True})
    assert service.summary(row).subject == subject


def test_contract_exposes_only_two_owner_reads():
    paths = document()["paths"]
    assert len(paths) == 2 and all(set(value) == {"get"} for value in paths.values())


@pytest.mark.asyncio
async def test_route_rejects_query_body_before_data_access(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[authenticated] = lambda: (None, SimpleNamespace(user_id="owner"))
    monkeypatch.setattr("pinet_core.control.bridge.transport_guard", lambda request: _nothing())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        for suffix in ["?q=secret", "?case_id=bad", f"?before={M}&before={M}"]:
            response = await client.get(f"/operator/v2/businesses/{B}/mail" + suffix)
            assert response.status_code == 400
        assert (await client.request("GET", f"/operator/v2/businesses/{B}/mail", content="x")).status_code == 400
        assert (await client.post(f"/operator/v2/businesses/{B}/mail")).status_code == 405


async def _nothing():
    return None


@pytest.mark.asyncio
async def test_runner_has_no_tools_one_fixed_call_and_rejects_revoked_result(monkeypatch, tmp_path):
    from pinet_core.mail_view import runner
    binary = tmp_path / "test-cli"
    binary.write_bytes(b"synthetic-not-executed")
    monkeypatch.setattr(runner, "sha256_file", lambda path: "a" * 64)
    calls = []
    authority = True
    async def allowed(): return authority
    async def execute(args, **kwargs):
        calls.append(args)
        assert args[args.index("--model")+1] == "gpt-6.1-sol"
        assert 'model_reasoning_effort="high"' in args
        assert 'web_search="disabled"' in args and kwargs["seconds"] == 120
        assert kwargs["still_authorized"] is allowed
        return record().text.model_dump(), {"input_tokens": 11}
    monkeypatch.setattr(runner, "execute", execute)
    result = await runner.translate_once(original(), business_id=B, environment="test", binary=binary,
        binary_sha256="a"*64, private_directory=tmp_path, still_authorized=allowed)
    assert result.usage["input_tokens"] == 11 and len(calls) == 1
    async def late(*args, **kwargs):
        nonlocal authority
        authority = False
        return record().text.model_dump(), {"input_tokens": 11}
    monkeypatch.setattr(runner, "execute", late)
    with pytest.raises(ValueError, match="mail_authority_changed"):
        await runner.translate_once(original(), business_id=B, environment="test", binary=binary,
            binary_sha256="a"*64, private_directory=tmp_path, still_authorized=allowed)
